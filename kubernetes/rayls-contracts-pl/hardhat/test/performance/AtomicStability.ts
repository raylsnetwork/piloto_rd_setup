import { expect } from 'chai';
import hre from 'hardhat';
import { ethers } from 'ethers';

import axios from 'axios';
import { genRanHex } from '../../tasks/deployToken';
import { EndpointV1, TokenExample, TokenRegistryV1 } from '../../../typechain-types';
import { pollCondition } from '../e2e/Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger'; // Adjust the path as needed
import { TokenExampleEthersContract } from '../../utils/TokenExampleEthersContract';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_TIMEOUT = 120 * 60 * 1000;

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);
Math.floor(Date.now() / 1000);
describe('Atomic Performance tests', function () {
  const THREE_MINUTES_WORTH_OF_ATTEMPTS: [number, number] = [1000, 180];
  const FIVE_MINUTES_WORTH_OF_ATTEMPTS: [number, number] = [1000, 7200];

  // Environment variables and constants
  const rpcUrlA = process.env['RPC_URL_NODE_A'] as string;
  const rpcUrlB = process.env['RPC_URL_NODE_B'] as string;
  const rpcUrlCC = process.env['RPC_URL_NODE_CC'] as string;
  const endpointAddressA = process.env['NODE_A_ENDPOINT_ADDRESS'] as string;
  const endpointAddressB = process.env['NODE_B_ENDPOINT_ADDRESS'] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  const chainIdA = process.env['NODE_A_CHAIN_ID'] as string;
  const chainIdB = process.env['NODE_B_CHAIN_ID'] as string;
  const totalTransactions = process.env['TRANSACTIONS_COUNT'] || '500';

  const TEST_DURATION_MINUTES = Number(process.env['TEST_DURATION_MINUTES'] || '60');
  const TEST_DURATION = TEST_DURATION_MINUTES * 60 * 1000; // 60 minutes

  // Providers
  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);

  // Adjust polling intervals
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  // Wallets and signers
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const wallet1 = ethers.Wallet.createRandom();
  const wallet2 = ethers.Wallet.createRandom();

  const signerA = wallet1.connect(providerA);
  const signerB = wallet2.connect(providerB);
  const signerCC = venOperatorWallet.connect(providerCC);

  // Contracts and variables
  let tokenOnPLA: TokenExample;
  let tokenOnPLB: TokenExample;
  let tokenRegistry: TokenRegistryV1;
  let endpointB: EndpointV1;
  let tokenResourceId: string;
  let balanceOnB: bigint;
  let initialBalanceOnB: bigint;
  let initialBalanceOnA: bigint;

  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `Token ${randHex}`;
  const tokenSymbol = `T_${randHex}`;

  let ethersContractSender: TokenExampleEthersContract;

  async function pollUntilTokenDeployed(endpoint: EndpointV1, resourceId: string, signer: any) {
    return await pollCondition(
      async (): Promise<boolean> => {
        const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);
        if (tokenAddress !== ethers.ZeroAddress) {
          tokenOnPLB = await hre.ethers.getContractAt('TokenExample', tokenAddress, signer);
          return true;
        }
        return false;
      },
      ...THREE_MINUTES_WORTH_OF_ATTEMPTS
    );
  }

  async function pollUntilBalanceUpdated(token: TokenExample, address: string, expectedBalance: bigint) {
    return await pollCondition(
      async (): Promise<boolean> => {
        const balance = await token.balanceOf(address);
        logger.debug(`Current balance on B: ${balance}`);
        return balance === expectedBalance;
      },
      ...FIVE_MINUTES_WORTH_OF_ATTEMPTS
    );
  }

  async function sendBatchTransactions(totalTxCount: number, amount: number, currentNonce: number, isAtomic: boolean) {
    // Generate batch transactions
    const transactions: string[] = [];
    for (let i = 0; i < totalTxCount; i++) {
      if (!ethersContractSender) {
        throw new Error('ethersContractSender is not initialized inside before()');
      }

      let signedTx;
      if (isAtomic) {
        signedTx = await ethersContractSender.populateSignedTeleportAtomic(signerB.address, amount, chainIdB, currentNonce);
      } else {
        signedTx = await ethersContractSender.populateSignedTeleport(signerB.address, amount, chainIdB, currentNonce);
      }

      transactions.push(signedTx);
      currentNonce++;
    }
    logger.debug(`Generated ${transactions.length} signed transactions`);

    // Prepare and send batch request
    const batchRequest = `[${transactions
      .map((tx, index) =>
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [tx],
          id: index + 1
        })
      )
      .join(',')}]`;

    logger.debug(`Sending batch of ${transactions.length} transactions...`);
    try {
      const response = await axios.post(rpcUrlA, batchRequest, {
        headers: { 'Content-Type': 'application/json' }
      });
      expect(response.status).to.equal(200);
      logger.debug(`Batch transactions sent successfully`);
    } catch (error) {
      logger.error(`Error sending batch transactions: ${error}`);
      throw error;
    }
  }

  before(async function () {
    logger.setTestContext(this);
    this.timeout(3 * 60 * 1000);

    // Deploy token and get contract instances
    const TokenErc20 = await hre.ethers.getContractFactory('TokenExample', signerA);

    // Load the Deployment Registry contract
    const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    tokenRegistryAddress = deployment.tokenRegistryAddress;

    tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);
    endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);
    tokenOnPLA = await TokenErc20.deploy(tokenName, tokenSymbol, endpointAddressA);
    await tokenOnPLA.waitForDeployment();
    const tokenAddress = await tokenOnPLA.getAddress();
    ethersContractSender = new TokenExampleEthersContract(tokenAddress, rpcUrlA, signerA.privateKey, Number(chainIdA));

    logger.info(`Token deployed on PL A at address: ${tokenOnPLA.target}`);
  });

  describe('Setup a token for testing', function () {
    it('Registers Token on PL and Approve on Token Registry in CC', async function () {
      logger.setTestContext(this);
      // Submit token registration
      await tokenOnPLA.submitTokenRegistration(2);
      logger.debug(`Submitted token registration for ${tokenName}`);

      // Poll until token appears on TokenRegistry
      const tokenRegistered = await pollCondition(
        async (): Promise<boolean> => {
          const allTokens = await tokenRegistry.getAllTokens();
          const tokenOnCC = allTokens.find((x) => x.name === tokenName);
          if (tokenOnCC) {
            tokenResourceId = tokenOnCC.resourceId;
            return true;
          }
          return false;
        },
        ...THREE_MINUTES_WORTH_OF_ATTEMPTS
      );
      expect(tokenRegistered).to.be.true;
      logger.debug(`Token appeared on TokenRegistry with resourceId: ${tokenResourceId}`);
      logger.debug(`Signer A address: ${signerA.address}`);
      logger.debug(`Signer B address: ${signerB.address}`);

      // Approve token on TokenRegistry
      const tx = await tokenRegistry.updateStatus(tokenResourceId, 1, { gasLimit: 5000000 });
      await tx.wait();
      const txReceipt = await providerCC.getTransactionReceipt(tx.hash);
      expect(txReceipt?.status).to.equal(1);
      logger.debug(`Token status updated to 'approved' on TokenRegistry`);

      // Poll until token resourceId is updated on PL A
      const resourceIdUpdated = await pollCondition(
        async (): Promise<boolean> => {
          const resourceId = await tokenOnPLA.resourceId();
          if (resourceId !== ethers.ZeroHash) {
            tokenResourceId = resourceId;
            return true;
          }
          return false;
        },
        ...THREE_MINUTES_WORTH_OF_ATTEMPTS
      );
      expect(resourceIdUpdated).to.be.true;
      logger.debug(`Token resourceId updated on PL A: ${tokenResourceId}`);
    }).timeout(TEST_TIMEOUT);

    it('Deploys ERC20 Contract', async function () {
      logger.setTestContext(this);
      const totalTxCount = 1;
      const amount = 1;

      // Get current nonce
      let currentNonce = await signerA.getNonce();
      logger.debug(`Current nonce for signerA: ${currentNonce}`);
      initialBalanceOnA = await tokenOnPLA.balanceOf(signerA.address);

      // await sendBatchTransactions(totalTxCount, amount, currentNonce, tokenOnPLA.teleport);
      await sendBatchTransactions(totalTxCount, amount, currentNonce, false);

      const tokenDeployedOnB = await pollUntilTokenDeployed(endpointB, tokenResourceId, signerB);
      expect(tokenDeployedOnB).to.be.true;

      const tokenBAddress = await endpointB.resourceIdToContractAddress(tokenResourceId);
      tokenOnPLB = await hre.ethers.getContractAt('TokenExample', tokenBAddress, signerB);
      logger.debug(`Token deployed on PL B at address: ${tokenOnPLB.target}`);

      const balanceUpdated = await pollUntilBalanceUpdated(tokenOnPLB, signerB.address, BigInt(amount * totalTxCount));
      expect(balanceUpdated).to.be.true;

      // also assert the balance on A
      const balanceOnA = await tokenOnPLA.balanceOf(signerA.address);
      expect(balanceOnA).to.equal(initialBalanceOnA - BigInt(amount));
    }).timeout(TEST_TIMEOUT);
  });

  describe(`AtomicTeleport from A to B ${TEST_DURATION_MINUTES} minutes of transactions`, function () {
    it('AtomicTeleport from A to B multiple batches', async function () {
      logger.setTestContext(this);
      let totalTxCount = Number(totalTransactions);
      const amount = 1;
      let multipleBatches = 0;
      let startTime: number;

      const endTimestamp = Math.floor(Date.now()) + TEST_DURATION;

      // Get current nonce
      let currentNonce = await signerA.getNonce();
      logger.debug(`Current nonce for signerA: ${currentNonce}`);

      initialBalanceOnA = await tokenOnPLA.balanceOf(signerA.address);
      initialBalanceOnB = await tokenOnPLB.balanceOf(signerB.address);
      logger.debug(`Initial token balance on B: ${initialBalanceOnB}`);

      startTime = Date.now();

      while (true) {
        await sendBatchTransactions(totalTxCount, amount, currentNonce, true);
        currentNonce += totalTxCount;
        multipleBatches++;
        logger.debug(`Current nonce for signerA: ${currentNonce}`);
        logger.debug(`Total transactions sent: ${totalTxCount * multipleBatches}`);
        await sleep(1000);

        // Check if we reached the end timestamp
        if (Math.floor(Date.now()) >= endTimestamp) {
          break;
        }
      }

      const balanceUpdated = await pollUntilBalanceUpdated(tokenOnPLB, signerB.address, BigInt(amount * totalTxCount * multipleBatches) + initialBalanceOnB);
      expect(balanceUpdated).to.be.true;

      // Calculate finality time and TPS
      const endTime = Date.now();
      const totalSeconds = (endTime - startTime) / 1000;
      let totalTxInSpan = totalTxCount * multipleBatches;
      const tps = totalTxInSpan / totalSeconds;

      balanceOnB = await tokenOnPLB.balanceOf(signerB.address);
      logger.debug(`Balance on PL B for Address B: ${balanceOnB.toString()}`);
      logger.info(`AtomicTeleport finality time accross ${multipleBatches} PL A blocks pushes: ${totalSeconds.toFixed(2)} seconds`);
      logger.info(`Total TPS achieved: ${totalTxInSpan}tx / ${totalSeconds}s = ${tps.toFixed(2)}`);

      // also assert the balance on A
      const balanceOnA = await tokenOnPLA.balanceOf(signerA.address);
      expect(balanceOnA).to.equal(initialBalanceOnA - BigInt(amount * totalTxCount * multipleBatches));
    }).timeout(TEST_TIMEOUT);
  });
});
