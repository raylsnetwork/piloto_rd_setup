import hre from 'hardhat';
import { ethers } from 'ethers';
import { expect } from 'chai';

import { delay, pollCondition } from '../e2e/Utils';
import * as ERC20Utils from '../e2e/Erc20Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger';
import { EndpointV1, Erc20BatchTeleport, TokenExample } from '../../../typechain-types';
import { TokenExampleEthersContract } from '../../utils/TokenExampleEthersContract';

const ONE_MINUTE_WORTH_OF_ATTEMPTS: [number, number] = [1000, 60];
const THREE_MINUTES_WORTH_OF_ATTEMPTS: [number, number] = [1000, 180];
const FIVE_MINUTES_WORTH_OF_ATTEMPTS: [number, number] = [1000, 300];
const TEN_MINUTES_WORTH_OF_ATTEMPTS: [number, number] = [1000, 600];
const ONE_HOUR_WORTH_OF_ATTEMPTS: [number, number] = [1000, 3600];

const POLLING_TOKEN_SETUP_TIMEOUT = FIVE_MINUTES_WORTH_OF_ATTEMPTS;
const POLLING_BALANCES_TIMEOUT = ONE_HOUR_WORTH_OF_ATTEMPTS;

const NORMAL_TEST_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const STABILITY_TEST_TIMEOUT = 120 * 60 * 1000; // 2 hours

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

const MAX_NUMBER_OF_ERC20_TRANSFERS_IN_BATCH = 300;

describe('Atomic Mesh tests', function () {
  const venPK = process.env['PRIVATE_KEY_SYSTEM'] as string;
  const rpcUrlCC = process.env['RPC_URL_NODE_CC'] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  const privateLedgers = process.env['MESH_PL_PARTICIPANTS'] || 'A,B,C,D';
  const performanceTxCount = parseInt(process.env['MESH_PERF_TX_COUNT'] || '100');
  const stabilityTxCount = parseInt(process.env['MESH_STABILITY_TX_COUNT'] || '50');
  const stabilityDurationMin = parseFloat(process.env['MESH_STABILITY_DURATION_MIN'] || '2');
  const stabiltyTxDelayMs = parseFloat(process.env['MESH_STABILITY_DELAY_SEC'] || '2') * 1000; // 2 seconds default
  const performanceTxDelayMs = parseFloat(process.env['MESH_PERF_DELAY_SEC'] || '1') * 1000; // 1 second default
  const stabilityTxCountPerBatch = Math.min(stabilityTxCount, MAX_NUMBER_OF_ERC20_TRANSFERS_IN_BATCH);
  const performanceTxCountPerBatch = Math.min(performanceTxCount, MAX_NUMBER_OF_ERC20_TRANSFERS_IN_BATCH);
  const minParticipants = 4;

  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC, undefined, { pollingInterval: 200 });
  const signerCC = new ethers.Wallet(venPK).connect(providerCC);

  if (privateLedgers.length < minParticipants) {
    throw new Error(`Minimum ${minParticipants} participants are required for the mesh test`);
  }

  let accounts: string[] = [];

  const participants: NetworkParticipant[] = privateLedgers.split(',').map((plName) => {
    const name = plName.trim();
    const rpcUrl = process.env[`RPC_URL_NODE_${name}`] as string;
    const chainId = process.env[`NODE_${name}_CHAIN_ID`] as string;
    const endpointAddress = process.env[`NODE_${name}_ENDPOINT_ADDRESS`] as string;
    const pk = ethers.Wallet.createRandom().privateKey;

    if (!rpcUrl || !chainId || !endpointAddress) {
      throw new Error(`Missing environment variables for participant ${name}`);
    }

    return setupNetworkParticipant(name, rpcUrl, chainId, endpointAddress, pk);
  });

  before(async function () {
    logger.setTestContext(this);

    this.timeout(NORMAL_TEST_TIMEOUT);

    accounts = [await ethers.Wallet.createRandom().getAddress(), await ethers.Wallet.createRandom().getAddress(), await ethers.Wallet.createRandom().getAddress()];

    // Load the Deployment Registry contract
    const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    tokenRegistryAddress = deployment.tokenRegistryAddress;
    const TokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);

    // Deploy new token to each private ledger
    for (const participant of participants) {
      await participant.init();

      logger.info(`Setup tokens on PL ${participant.name}`);

      const singleToken = await ERC20Utils.setupERC20SingleToken(participant.signer, participant.endpointAddress, TokenRegistry, POLLING_TOKEN_SETUP_TIMEOUT);
      const batchToken = await ERC20Utils.setupERC20BatchToken(participant.signer, participant.endpointAddress, TokenRegistry, POLLING_TOKEN_SETUP_TIMEOUT);
      const mintTx = await batchToken.BatchToken.mint(participant.signer.address, ethers.parseEther('1000000'));
      await mintTx.wait();

      participant.setSingleToken(singleToken.Token, singleToken.tokenAddress);
      participant.setSingleTokenResourceId(singleToken.resourceId);
      participant.setBatchToken(batchToken.BatchToken);
      participant.setBatchTokenResourceId(batchToken.resourceId);

      logger.debug(`Token is ready on PL ${participant.name} at ${singleToken.tokenAddress}`);
      logger.debug(`Batch Token is ready on PL ${participant.name} at ${batchToken.tokenAddress}`);
      logger.info(`Tokens are ready on PL ${participant.name}`);
    }
  });

  describe('Batch Transfer - send tokens between participants', function () {
    function prepareBatchTokenSendTx(source: NetworkParticipant, destination: NetworkParticipant, value: number, to: string): TokenSendTx {
      const resourceId = source.getBatchTokenResourceId();
      const resourceType = 'Erc20BatchTeleport';

      return {
        source,
        destination,
        to,
        value,
        resourceId,
        resourceType
      };
    }

    function createBatchPayload(batch: TokenSendTx[]) {
      return batch.map((batch) => ({
        to: batch.to,
        value: batch.value,
        chainId: batch.destination.chainId
      }));
    }

    function combineBatchTxWithSameDest(batch: TokenSendTx[]) {
      // Sum up the transfered value of transactions with the same receiver accounts
      return batch.reduce((acc, tx) => {
        const existing = acc.find((x: any) => x.source.name === tx.source.name && x.destination.name === tx.destination.name && x.to === tx.to);
        if (!existing) {
          acc.push({ ...tx });
        } else {
          existing.value += tx.value;
        }
        return acc;
      }, [] as TokenSendTx[]);
    }

    async function fetchDestBalancesOfBatch(batch: TokenSendTx[]) {
      const batchWithBalances = await Promise.all(
        batch.map(async (tx) => {
          const receiverBalanceBefore = await getDestinationTokenBalance(tx.destination, tx.resourceId, tx.resourceType, tx.to);

          return { tx, receiverBalanceBefore };
        })
      );

      return batchWithBalances;
    }

    function calcTotalTokenAmountInBatch(batch: TokenSendTx[]) {
      return batch.reduce((acc, tx) => acc + tx.value, 0);
    }

    const createBatchWithSameDest = (source: NetworkParticipant, destination: NetworkParticipant, txCount: number, value: number, to: string) => {
      return new Array(txCount).fill(null).map(() => prepareBatchTokenSendTx(source, destination, value, to));
    };

    async function executeBatchTeleports(batch: TokenSendTx[], token: Erc20BatchTeleport, isAtomic: boolean) {
      let tx;

      if (isAtomic) {
        tx = await token.batchTeleportAtomic(createBatchPayload(batch));
      } else {
        tx = await token.batchTeleport(createBatchPayload(batch));
      }
      const receipt = await tx.wait();

      return receipt;
    }

    it('Deploy external tokens to all participants', async function () {
      const assertTokenDeployedOnDestPLs: Promise<any>[] = [];

      await everyoneToAllParticipants(async (source, destinations) => {
        const token = source.getBatchToken();
        const batch = destinations.map((destination) => prepareBatchTokenSendTx(source, destination, 1, destination.signer.address));

        const batchWithUniqueDest = combineBatchTxWithSameDest(batch);
        const batchWithBalances = await fetchDestBalancesOfBatch(batchWithUniqueDest);

        logger.info(`PL ${source.name} Deploying batch tokens to ${destinations.map((x) => x.name).join(', ')}`);

        await delay(1000);
        await token.batchTeleport(createBatchPayload(batch), { gasLimit: 5000000 });

        assertTokenDeployedOnDestPLs.push(...batchWithBalances.map(async ({ tx, receiverBalanceBefore }) => waitUntilTokensAreTransferred(tx, receiverBalanceBefore, true)));
      });

      await Promise.all(assertTokenDeployedOnDestPLs);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it('Vanila Teleport - PL A sends batch of tokens to PLs: B,C,D', async function () {
      const [sourceA, destB, destC, destD] = participants;
      const [accX, accY, accZ] = accounts;

      const token = sourceA.getBatchToken();

      const batch: TokenSendTx[] = [
        prepareBatchTokenSendTx(sourceA, destB, 100, accX),
        prepareBatchTokenSendTx(sourceA, destB, 100, accX),
        prepareBatchTokenSendTx(sourceA, destC, 50, accY),
        prepareBatchTokenSendTx(sourceA, destC, 30, accZ),
        prepareBatchTokenSendTx(sourceA, destD, 50, accY),
        prepareBatchTokenSendTx(sourceA, destD, 30, accZ)
      ];

      const batchWithUniqueDest = combineBatchTxWithSameDest(batch);
      const batchWithBalances = await fetchDestBalancesOfBatch(batchWithUniqueDest);

      logger.info(`Sending batch teleport`);

      await token.batchTeleport(createBatchPayload(batch));

      await Promise.all(batchWithBalances.map(async ({ tx, receiverBalanceBefore }) => waitUntilTokensAreTransferred(tx, receiverBalanceBefore)));
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Vanila Teleport - Each partcipant transfer batch of ${performanceTxCountPerBatch}txs to other participants`, async function () {
      const teleportTokens: Promise<any>[] = [];

      if (performanceTxCountPerBatch < performanceTxCount) {
        logger.info(`Reducing the number of txs per batch to ${performanceTxCountPerBatch} to avoid exceeding the block gas limit`);
      }

      await everyoneToAllParticipants(async (source, destinations) => {
        const token = source.getBatchToken();
        const tokenAmount = 1;

        let nonce = await source.signer.getNonce();
        let totalTokensSent = 0;

        logger.info(`PL ${source.name} Sending batch tokens to ${destinations.map((x) => x.name).join(', ')}`);

        for (const destination of destinations) {
          // Ensuring the right order of txs
          await delay(performanceTxDelayMs);

          const direction = `${source.name} -> ${destination.name}`;

          const batch = createBatchWithSameDest(source, destination, performanceTxCountPerBatch, tokenAmount, destination.signer.address);
          const batchWithUniqueDest = combineBatchTxWithSameDest(batch);
          const batchWithBalances = await fetchDestBalancesOfBatch(batchWithUniqueDest);
          const executionStartTime = Date.now();

          logger.info(`${direction} Sending batch teleport with ${performanceTxCountPerBatch}txs`);
          const receipt = await executeBatchTeleports(batch, token, false);

          nonce++;

          if (receipt?.status !== 1) {
            logger.info(`${direction} Batch teleport failed. Skipping..`);
            continue;
          }

          totalTokensSent += calcTotalTokenAmountInBatch(batch);
          teleportTokens.push(
            ...batchWithBalances.map(async ({ tx, receiverBalanceBefore }) =>
              waitUntilTokensAreTransferred(tx, receiverBalanceBefore).then(() => createTPSInput(tx, performanceTxCountPerBatch, executionStartTime))
            )
          );
        }
      });

      const tpsInputs = await Promise.all(teleportTokens);

      reportTPS(tpsInputs);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it('Atomic Teleport - Each partcipant transfer batch of tokens to other participants', async function () {
      const teleportTokens: Promise<any>[] = [];

      if (performanceTxCountPerBatch < performanceTxCount) {
        logger.info(`Reducing the number of txs per batch to ${performanceTxCountPerBatch} to avoid exceeding the block gas limit`);
      }

      await everyoneToAllParticipants(async (source, destinations) => {
        const token = source.getBatchToken();
        const tokenAmount = 1;

        let nonce = await source.signer.getNonce();
        let totalTokensSent = 0;

        logger.info(`PL ${source.name} Sending batch tokens to ${destinations.map((x) => x.name).join(', ')}`);

        for (const destination of destinations) {
          // Ensuring the right order of txs
          await delay(performanceTxDelayMs);

          const direction = `${source.name} -> ${destination.name}`;

          const batch = createBatchWithSameDest(source, destination, performanceTxCountPerBatch, tokenAmount, destination.signer.address);
          const batchWithUniqueDest = combineBatchTxWithSameDest(batch);
          const batchWithBalances = await fetchDestBalancesOfBatch(batchWithUniqueDest);
          const executionStartTime = Date.now();

          logger.info(`${direction} Sending batch teleport with ${performanceTxCountPerBatch}txs`);
          const receipt = await executeBatchTeleports(batch, token, true);

          nonce++;

          if (receipt?.status !== 1) {
            logger.info(`${direction} Batch teleport failed. Skipping..`);
            continue;
          }

          totalTokensSent += calcTotalTokenAmountInBatch(batch);
          teleportTokens.push(
            ...batchWithBalances.map(async ({ tx, receiverBalanceBefore }) =>
              waitUntilTokensAreTransferred(tx, receiverBalanceBefore).then(() => createTPSInput(tx, performanceTxCountPerBatch, executionStartTime))
            )
          );
        }
      });

      const tpsInputs = await Promise.all(teleportTokens);

      reportTPS(tpsInputs);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Stability Test - Sending ${stabilityTxCountPerBatch} transactions back and forth between participants for ${stabilityDurationMin} min straight`, async function () {
      logger.setTestContext(this);
      logger.info(`Starting stability test`);

      const tokenAmountPerTx = 1;
      const endTime = stabilityDurationMin * 60 * 1000 + Date.now();

      if (stabilityTxCountPerBatch < stabilityTxCount) {
        logger.info(`Reducing the number of txs per batch to ${stabilityTxCountPerBatch} to avoid exceeding the block gas limit`);
      }

      const [plA, plB, plC, plD] = participants;

      const batchAtoB = createBatchWithSameDest(plA, plB, stabilityTxCountPerBatch, tokenAmountPerTx, plB.signer.address);
      const batchBtoC = createBatchWithSameDest(plB, plC, stabilityTxCountPerBatch, tokenAmountPerTx, plC.signer.address);
      const batchCtoD = createBatchWithSameDest(plC, plD, stabilityTxCountPerBatch, tokenAmountPerTx, plD.signer.address);
      const batchDtoA = createBatchWithSameDest(plD, plA, stabilityTxCountPerBatch, tokenAmountPerTx, plA.signer.address);

      const tokenOnPLA = plA.getBatchToken();
      const tokenOnPLB = plB.getBatchToken();
      const tokenOnPLC = plC.getBatchToken();
      const tokenOnPLD = plD.getBatchToken();

      const batchWithReceiverBalanceAtoB = await fetchDestBalancesOfBatch(combineBatchTxWithSameDest(batchAtoB));
      const batchWithReceiverBalanceBtoC = await fetchDestBalancesOfBatch(combineBatchTxWithSameDest(batchBtoC));
      const batchWithReceiverBalanceCtoD = await fetchDestBalancesOfBatch(combineBatchTxWithSameDest(batchCtoD));
      const batchWithReceiverBalanceDtoA = await fetchDestBalancesOfBatch(combineBatchTxWithSameDest(batchDtoA));

      // We are sending tokens to the same receiver per batch and we already used combineBatchTxWithSameDest, so the batch will have only one element
      const receiverBalanceOnPLA = batchWithReceiverBalanceDtoA[0].receiverBalanceBefore;
      const receiverBalanceOnPLB = batchWithReceiverBalanceAtoB[0].receiverBalanceBefore;
      const receiverBalanceOnPLC = batchWithReceiverBalanceBtoC[0].receiverBalanceBefore;
      const receiverBalanceOnPLD = batchWithReceiverBalanceCtoD[0].receiverBalanceBefore;

      const iterations = {
        [plA.name]: 0,
        [plB.name]: 0,
        [plC.name]: 0,
        [plD.name]: 0
      };

      const executionStartTime = Date.now();

      let now = Date.now();
      let totalIterations = 0;

      while (now < endTime) {
        logger.debug(`Executing batch teleports with ${stabilityTxCountPerBatch}txs`);

        const rA = await executeBatchTeleports(batchAtoB, tokenOnPLA, true);
        const rB = await executeBatchTeleports(batchBtoC, tokenOnPLB, true);
        const rC = await executeBatchTeleports(batchCtoD, tokenOnPLC, true);
        const rD = await executeBatchTeleports(batchDtoA, tokenOnPLD, true);

        await delay(stabiltyTxDelayMs);

        now = Date.now();
        totalIterations++;

        if (rA?.status === 1) iterations[plA.name]++;
        if (rB?.status === 1) iterations[plB.name]++;
        if (rC?.status === 1) iterations[plC.name]++;
        if (rD?.status === 1) iterations[plD.name]++;
      }

      const totalTxSentPerPLA = stabilityTxCountPerBatch * iterations[plA.name];
      const totalTxSentPerPLB = stabilityTxCountPerBatch * iterations[plB.name];
      const totalTxSentPerPLC = stabilityTxCountPerBatch * iterations[plC.name];
      const totalTxSentPerPLD = stabilityTxCountPerBatch * iterations[plD.name];

      logger.info(`Stability test completed. Waiting for balances to be updated`);
      logger.debug(`Sent total of ${totalTxSentPerPLA}txs on PL ${plA.name} in ${iterations[plA.name]}/${totalIterations} cycles`);
      logger.debug(`Sent total of ${totalTxSentPerPLB}txs on PL ${plB.name} in ${iterations[plB.name]}/${totalIterations} cycles`);
      logger.debug(`Sent total of ${totalTxSentPerPLC}txs on PL ${plC.name} in ${iterations[plC.name]}/${totalIterations} cycles`);
      logger.debug(`Sent total of ${totalTxSentPerPLD}txs on PL ${plD.name} in ${iterations[plD.name]}/${totalIterations} cycles`);

      const txFinalAtoB = { ...batchWithReceiverBalanceAtoB[0].tx, value: tokenAmountPerTx * totalTxSentPerPLA };
      const txFinalBtoC = { ...batchWithReceiverBalanceBtoC[0].tx, value: tokenAmountPerTx * totalTxSentPerPLB };
      const txFinalCtoD = { ...batchWithReceiverBalanceCtoD[0].tx, value: tokenAmountPerTx * totalTxSentPerPLC };
      const txFinalDtoA = { ...batchWithReceiverBalanceDtoA[0].tx, value: tokenAmountPerTx * totalTxSentPerPLD };

      const tpsInputs = await Promise.all([
        waitUntilTokensAreTransferred(txFinalAtoB, receiverBalanceOnPLB).then(() => createTPSInput(txFinalAtoB, totalTxSentPerPLA, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalBtoC, receiverBalanceOnPLC).then(() => createTPSInput(txFinalBtoC, totalTxSentPerPLB, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalCtoD, receiverBalanceOnPLD).then(() => createTPSInput(txFinalCtoD, totalTxSentPerPLC, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalDtoA, receiverBalanceOnPLA).then(() => createTPSInput(txFinalDtoA, totalTxSentPerPLD, executionStartTime))
      ]);

      reportTPS(tpsInputs);
    }).timeout(STABILITY_TEST_TIMEOUT);
  });

  describe('Bulk Transfer - send tokens between participants', function () {
    function prepareSingleTokenSendTx(source: NetworkParticipant, destination: NetworkParticipant, value: number, to: string): TokenSendTx {
      const resourceId = source.getSingleTokenResourceId();
      const resourceType = 'TokenExample';

      return {
        source,
        destination,
        to,
        value,
        resourceId,
        resourceType
      };
    }

    const deployExternalTokenTask = async (source: NetworkParticipant, destination: NetworkParticipant, nonce: number) => {
      const tx = prepareSingleTokenSendTx(source, destination, 1, destination.signer.address);

      const token = tx.source.getSingleToken();
      const direction = `${tx.source.name} -> ${tx.destination.name}`;
      const receiverBalanceBefore = await getDestinationTokenBalance(tx.destination, tx.resourceId, tx.resourceType, tx.to);

      logger.info(`${direction} Deploying token`);
      logger.debug(`${direction} Nonce=${nonce}`);

      await token.teleport(tx.to, tx.value, tx.destination.chainId, { nonce });
      await waitUntilTokensAreTransferred(tx, receiverBalanceBefore, true);
    };

    it('Deploy external tokens to all participants', async function () {
      logger.setTestContext(this);

      const deployments: Promise<any>[] = [];

      await everyoneToAllParticipants(async (source, destinations) => {
        let nonce = await source.signer.getNonce();

        for (const destination of destinations) {
          // Ensuring the right order of deployments
          await delay(1000);

          deployments.push(deployExternalTokenTask(source, destination, nonce));

          nonce++;
        }
      });

      await Promise.all(deployments);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Many to One - 3 PLs sends ${performanceTxCount} atomic transactions each to PL A`, async function () {
      logger.setTestContext(this);

      const teleports: Promise<any>[] = [];

      const send = async (source: NetworkParticipant, destination: NetworkParticipant, nonce: number) => {
        const tokenAmountPerTx = 1;
        // Ensuring the right order of transactions
        await delay(performanceTxDelayMs);

        teleports.push(trackExecutionTime(async () => executeBulkTeleports(source, destination, tokenAmountPerTx, destination.signer.address, nonce, performanceTxCount, true)));
      };

      const [plA, plB, plC, plD] = participants;

      const nonceB = await plB.signer.getNonce();
      const nonceC = await plC.signer.getNonce();
      const nonceD = await plD.signer.getNonce();

      await send(plB, plA, nonceB);
      await send(plC, plA, nonceC);
      await send(plD, plA, nonceD);

      const results = await Promise.all(teleports);

      reportTPS(results);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`One to Many - PL A sends ${performanceTxCount} atomic transactions to the others`, async function () {
      logger.setTestContext(this);

      const tokenAmountPerTx = 1;
      const teleportTokens: Promise<any>[] = [];

      const send = async (source: NetworkParticipant, destination: NetworkParticipant, nonce: number, txCount: number) => {
        // Ensuring the right order of transactions
        await delay(1000);

        teleportTokens.push(trackExecutionTime(async () => executeBulkTeleports(source, destination, tokenAmountPerTx, destination.signer.address, nonce, txCount, true)));
      };

      const [plA, plB, plC, plD] = participants;

      const nonceAtoB = await plA.signer.getNonce();
      const nonceAtoC = nonceAtoB + performanceTxCount;
      const nonceAtoD = nonceAtoC + performanceTxCount;

      await send(plA, plB, nonceAtoB, performanceTxCount);
      await send(plA, plC, nonceAtoC, performanceTxCount);
      await send(plA, plD, nonceAtoD, performanceTxCount);

      const results = await Promise.all(teleportTokens);

      reportTPS(results);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Everyone to Everyone - Every participant sends ${performanceTxCount} vanila transactions to every other participant`, async function () {
      logger.setTestContext(this);

      const tokenAmountPerTx = 1;
      const teleportTokens: Promise<any>[] = [];

      await everyoneToAllParticipants(async (source, destinations) => {
        let nonce = await source.signer.getNonce();

        for (const destination of destinations) {
          // Ensuring the right order of transactions
          await delay(performanceTxDelayMs);

          teleportTokens.push(trackExecutionTime(() => executeBulkTeleports(source, destination, tokenAmountPerTx, destination.signer.address, nonce, performanceTxCount, false)));

          nonce += performanceTxCount;
        }
      });

      const results = await Promise.all(teleportTokens);

      reportTPS(results);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Everyone to Everyone - Every participant sends ${performanceTxCount} atomic transactions to every other participant`, async function () {
      logger.setTestContext(this);

      const tokenAmountPerTx = 1;
      const teleportTokens: Promise<any>[] = [];

      await everyoneToAllParticipants(async (source, destinations) => {
        let nonce = await source.signer.getNonce();

        for (const destination of destinations) {
          // Ensuring the right order of transactions
          await delay(performanceTxDelayMs);

          teleportTokens.push(trackExecutionTime(async () => executeBulkTeleports(source, destination, tokenAmountPerTx, destination.signer.address, nonce, performanceTxCount, true)));

          nonce += performanceTxCount;
        }
      });

      const results = await Promise.all(teleportTokens);

      reportTPS(results);
    }).timeout(NORMAL_TEST_TIMEOUT);

    it(`Stability Test - Sending ${stabilityTxCount} transactions back and forth between participants for ${stabilityDurationMin} min straight`, async function () {
      logger.setTestContext(this);
      logger.info(`Starting stability test`);

      const tokenAmountPerTx = 1;
      const endTime = stabilityDurationMin * 60 * 1000 + Date.now();

      const [plA, plB, plC, plD] = participants;
      const plCount = [plA, plB, plC, plD].length;

      let noncePLA = await plA.signer.getNonce();
      let noncePLB = await plB.signer.getNonce();
      let noncePLC = await plC.signer.getNonce();
      let noncePLD = await plD.signer.getNonce();

      const txAtoB = prepareSingleTokenSendTx(plA, plB, tokenAmountPerTx, plB.signer.address);
      const txBtoC = prepareSingleTokenSendTx(plB, plC, tokenAmountPerTx, plC.signer.address);
      const txCtoD = prepareSingleTokenSendTx(plC, plD, tokenAmountPerTx, plD.signer.address);
      const txDtoA = prepareSingleTokenSendTx(plD, plA, tokenAmountPerTx, plA.signer.address);

      const receiverBalanceOnPLB = await getDestinationTokenBalance(txAtoB.destination, txAtoB.resourceId, txAtoB.resourceType, txAtoB.to);
      const receiverBalanceOnPLC = await getDestinationTokenBalance(txBtoC.destination, txBtoC.resourceId, txBtoC.resourceType, txBtoC.to);
      const receiverBalanceOnPLD = await getDestinationTokenBalance(txCtoD.destination, txCtoD.resourceId, txCtoD.resourceType, txCtoD.to);
      const receiverBalanceOnPLA = await getDestinationTokenBalance(txDtoA.destination, txDtoA.resourceId, txDtoA.resourceType, txDtoA.to);

      const executionStartTime = Date.now();

      let now = Date.now();
      let totalIterations = 0;

      while (now < endTime) {
        await transferTokensInBulk(txAtoB, stabilityTxCount, noncePLA, true);
        await transferTokensInBulk(txBtoC, stabilityTxCount, noncePLB, true);
        await transferTokensInBulk(txCtoD, stabilityTxCount, noncePLC, true);
        await transferTokensInBulk(txDtoA, stabilityTxCount, noncePLD, true);

        await delay(stabiltyTxDelayMs);

        noncePLA += stabilityTxCount;
        noncePLB += stabilityTxCount;
        noncePLC += stabilityTxCount;
        noncePLD += stabilityTxCount;

        now = Date.now();
        totalIterations++;
      }

      const totalTxSentPerPL = stabilityTxCount * totalIterations;

      logger.info(`Stability test completed. Sent total of ${totalTxSentPerPL * plCount}txs between ${plCount} PLs in ${totalIterations} cycles. Waiting for balances to be updated`);

      const txFinalAtoB = { ...txAtoB, value: txAtoB.value * totalTxSentPerPL };
      const txFinalBtoC = { ...txBtoC, value: txBtoC.value * totalTxSentPerPL };
      const txFinalCtoD = { ...txCtoD, value: txCtoD.value * totalTxSentPerPL };
      const txFinalDtoA = { ...txDtoA, value: txDtoA.value * totalTxSentPerPL };

      const tpsInputs = await Promise.all([
        waitUntilTokensAreTransferred(txFinalAtoB, receiverBalanceOnPLB).then(() => createTPSInput(txFinalAtoB, totalTxSentPerPL, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalBtoC, receiverBalanceOnPLC).then(() => createTPSInput(txFinalBtoC, totalTxSentPerPL, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalCtoD, receiverBalanceOnPLD).then(() => createTPSInput(txFinalCtoD, totalTxSentPerPL, executionStartTime)),
        waitUntilTokensAreTransferred(txFinalDtoA, receiverBalanceOnPLA).then(() => createTPSInput(txFinalDtoA, totalTxSentPerPL, executionStartTime))
      ]);

      reportTPS(tpsInputs);
    }).timeout(STABILITY_TEST_TIMEOUT);

    async function executeBulkTeleports(source: NetworkParticipant, destination: NetworkParticipant, amount: number, to: string, nonce: number, txCount: number, isAtomic: boolean) {
      const tx = prepareSingleTokenSendTx(source, destination, amount, to);
      const direction = `${tx.source.name} -> ${tx.destination.name}`;
      const receiverBalanceBefore = await getDestinationTokenBalance(tx.destination, tx.resourceId, tx.resourceType, tx.to);

      logger.info(`${direction} Sending ${txCount} transactions to ${tx.to}`);

      const bulkResponse = await transferTokensInBulk(tx, txCount, nonce, isAtomic);
      logger.info(`${direction} Sent ${txCount} transactions to ${tx.to}`);

      // const txHashes = bulkResponse.map((x) => x.result);
      // const receipts = await waitUntilTransactionsMined(txHashes, source.signer.provider!, 1000, 60);
      // const successful = receipts.filter(r => r.status === 1);

      // expect(receipts.length).to.be.equal(txCount, "Not all transactions were mined");
      // expect(successful.length).to.be.equal(txCount, "Not all transactions were successful");

      // logger.info(`${direction} All transactions were mined`);

      // sum up the total amount of tokens sent
      const totalTokensInBatch = txCount * tx.value;
      const finalTx = { ...tx, value: totalTokensInBatch };
      await waitUntilTokensAreTransferred(finalTx, receiverBalanceBefore);

      return { totalTxCount: txCount, direction };
    }

    async function transferTokensInBulk(tx: TokenSendTx, txCount: number, nonce: number, isAtomic: boolean) {
      const direction = `${tx.source.name} -> ${tx.destination.name}`;

      logger.debug(`${direction} Nonce: ${nonce}`);

      return ERC20Utils.sendTokensInBulk(tx.source.getSingleTokenSender(), txCount, tx.value, nonce, isAtomic, tx.source.rpcUrl, tx.to, tx.destination.chainId);
    }
  });

  async function everyoneToAllParticipants(callback: (source: NetworkParticipant, destinations: NetworkParticipant[]) => Promise<void>) {
    for (const source of participants) {
      const destinations = participants.filter((x) => x.name !== source.name);

      await callback(source, destinations);
    }
  }

  async function waitUntilTokensAreTransferred(tx: TokenSendTx, receiverBalanceBefore: bigint, waitForDeployment: boolean = false) {
    const { source, destination, to, value, resourceType, resourceId } = tx;

    const direction = `${source.name} -> ${destination.name}`;
    const receiverBalanceAfter = receiverBalanceBefore + BigInt(value);

    const destEndpoint = destination.getEndpoint();

    // TODO: determine if we need to wait for token deployment by checking if the token is already deployed
    if (waitForDeployment) {
      logger.debug(`${direction} Polling until token is deployed`);

      const deployed = await ERC20Utils.pollUntilTokenDeployed(destEndpoint, resourceId, POLLING_TOKEN_SETUP_TIMEOUT);
      expect(deployed, `${direction} ${resourceType} token deployment failed in the specified timeout`).to.be.true;
    }

    const tokenOnDestPLAddress = await destEndpoint.resourceIdToContractAddress(resourceId);
    const tokenOnDestPL = await hre.ethers.getContractAt(resourceType, tokenOnDestPLAddress, destination.signer);

    const destOwner = await tokenOnDestPL.owner();
    logger.debug(`${direction} Token owner ${destOwner}`);
    logger.debug(`${direction} Polling until receiver balance is updated, initial=${receiverBalanceBefore} expected=${receiverBalanceAfter} token=${await tokenOnDestPL.getAddress()}`);

    const receiverBalanceMatchExpectedAmount = await ERC20Utils.pollUntilBalanceUpdated(tokenOnDestPL as any, to, receiverBalanceAfter, POLLING_BALANCES_TIMEOUT);
    expect(receiverBalanceMatchExpectedAmount, `${direction} Receiver balance were not updated in the specified timeout`).to.be.true;

    logger.info(`${direction} Tokens were transferred successfully`);

    return tx;
  }
});

async function getDestinationTokenBalance(pl: NetworkParticipant, resourceId: string, resourceType: string, account: string) {
  const endpoint = pl.getEndpoint();
  const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);

  if (tokenAddress !== ethers.ZeroAddress) {
    const tokenOnDestPL = await hre.ethers.getContractAt(resourceType, tokenAddress, pl.signer);
    return await tokenOnDestPL.balanceOf(account);
  }

  return BigInt(0);
}

function createTPSInput(txFinal: TokenSendTx, totalTxCount: number, executionStartTime: number) {
  return { result: { totalTxCount, direction: `${txFinal.source.name} -> ${txFinal.destination.name}` }, elapsedTime: (Date.now() - executionStartTime) / 1000 };
}

function reportTPS(
  results: {
    result: { totalTxCount: number; direction: string };
    elapsedTime: number;
  }[]
) {
  let avgTPS = 0;

  logger.info('Results:');

  results.forEach(({ result, elapsedTime }) => {
    const direction = `${result.direction}`;
    const tps = result.totalTxCount / elapsedTime;

    avgTPS += tps / results.length;
    logger.info(`${direction} Total TPS achieved: ${result.totalTxCount}tx / ${elapsedTime}s = ${tps.toFixed(2)}`);
  });

  logger.info(`Average TPS achieved: ${avgTPS.toFixed(2)}`);
}

function setupNetworkParticipant(name: string, rpcUrl: string, chainId: string, endpointAddress: string, pk: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { pollingInterval: 200 });
  const signer = new ethers.Wallet(pk).connect(provider);

  let Endpoint: EndpointV1;
  let Token: TokenExample;
  let TokenSender: TokenExampleEthersContract;
  let BatchToken: Erc20BatchTeleport;
  let tokenResourceId: string;
  let batchTokenResourceId: string;

  return {
    name,
    rpcUrl,
    chainId,
    signer,
    endpointAddress,
    init: async () => {
      Endpoint = await hre.ethers.getContractAt('EndpointV1', endpointAddress, signer);
    },
    setSingleTokenResourceId: (resourceId: string) => {
      tokenResourceId = resourceId;
    },
    getSingleTokenResourceId: () => tokenResourceId,
    setBatchTokenResourceId: (resourceId: string) => {
      batchTokenResourceId = resourceId;
    },
    getBatchTokenResourceId: () => batchTokenResourceId,
    getEndpoint: () => Endpoint,
    setSingleToken: (token: TokenExample, tokenAddress: string) => {
      Token = token;
      TokenSender = new TokenExampleEthersContract(tokenAddress, rpcUrl, signer.privateKey, Number(chainId));
    },
    getSingleToken: () => Token,
    getSingleTokenSender: () => TokenSender,
    getBatchToken: () => BatchToken,
    setBatchToken: (batchToken: Erc20BatchTeleport) => {
      BatchToken = batchToken;
    }
  };
}

type NetworkParticipant = ReturnType<typeof setupNetworkParticipant>;
type TokenSendTx = {
  source: NetworkParticipant;
  destination: NetworkParticipant;
  to: string;
  value: number;
  resourceId: string;
  resourceType: 'Erc20BatchTeleport' | 'TokenExample';
};

/**
 * UTILS
 */
async function trackExecutionTime<T>(callback: () => Promise<T>): Promise<{ result: T; elapsedTime: number }> {
  const startTime = Date.now();
  const result = await callback();
  const endTime = Date.now();
  const elapsedTime = (endTime - startTime) / 1000;

  return { result, elapsedTime };
}

async function waitUntilTransactionsMined(txHashes: string[], provider: ethers.Provider, interval: number, maxAttempts: number): Promise<ethers.TransactionReceipt[]> {
  const chunkSize = 500;
  let pendingTxHashes = [...txHashes];
  let receipts: ethers.TransactionReceipt[] = [];

  await pollCondition(
    async () => {
      console.log(`Pending txs: ${pendingTxHashes.length}/${txHashes.length}`);

      const chunks = [];
      for (let i = 0; i < pendingTxHashes.length; i += chunkSize) {
        chunks.push(pendingTxHashes.slice(i, i + chunkSize));
      }

      const receiptPromises = chunks.flatMap((chunk) => chunk.map((hash) => provider.getTransactionReceipt(hash)));
      const fetchedReceipts = await Promise.all(receiptPromises);

      // Filter out mined transactions and update receipts
      const newlyMined = fetchedReceipts.filter((receipt) => receipt !== null) as ethers.TransactionReceipt[];
      receipts = receipts.concat(newlyMined);
      pendingTxHashes = pendingTxHashes.filter((_, index) => fetchedReceipts[index] === null);

      return pendingTxHashes.length === 0;
    },
    interval,
    maxAttempts
  );

  return receipts;
}
