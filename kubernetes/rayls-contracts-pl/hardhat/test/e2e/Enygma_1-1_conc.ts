import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { EndpointV1, EnygmaTokenExample, EnygmaV1, ParticipantStorageV1, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition } from './Utils';
import { MongoClient } from 'mongodb';
import { LogForTest } from '../LoggerForTests';
import { Log } from 'ethers';

describe('E2E Tests: Enygma 1->1 concurrency + mint and burn in pending flow', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  let participantStorageAddress = '' as string;
  let endpointAddressCC = '' as string;
  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const wallet1 = ethers.Wallet.createRandom();
  const wallet2 = ethers.Wallet.createRandom();

  const signerA = wallet1.connect(providerA);
  const signerB = wallet1.connect(providerB);
  const signerCC = venOperatorWallet.connect(providerCC);

  let tokenOnPLA: EnygmaTokenExample;
  let tokenOnPLB: EnygmaTokenExample;
  let tokenRegistry: TokenRegistryV1;
  let participantStorage: ParticipantStorageV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  let endpointCC: EndpointV1;
  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `enygma-${randHex}`;
  const tokenSymbol = `E_${randHex}`;

  let tokenResourceId: string;
  let enygmaContract: EnygmaV1;

  const useMongoDbChecks = process.env['USE_MONGO_DB_CHECKS'] === 'true';

  before(async function () {
    this.timeout(3 * 60 * 1000);

    if (process.env.CLEAN_ENYGMA_DB_BEFORE_TESTS === 'true') {
      console.log("CLEAN_ENYGMA_DB_BEFORE_TESTS is set to 'true'. DB cleaning.");
      for (const node of ['A', 'B']) {
        const cs = process.env[`NODE_${node}_MONGO_CS`];
        const dbName = process.env[`NODE_${node}_MONGO_CS_DBNAME`];
        if (!cs || !dbName) {
          console.warn(`Skipping cleaning for Node ${node} because connection string or db name is missing`);
          continue;
        }
        const client = new MongoClient(cs);
        try {
          await client.connect();
          const database = client.db(dbName);

          // Clean the "enygma" collection
          const enygmaCollection = database.collection('enygma');
          const enygmaResult = await enygmaCollection.deleteMany({});
          LogForTest(`Cleaned ${enygmaResult.deletedCount} documents from enygma collection for Node ${node}`);

          // Clean the "enygma_history" collection
          const enygmaHistoryCollection = database.collection('enygma_history');
          const enygmaHistoryResult = await enygmaHistoryCollection.deleteMany({});
          LogForTest(`Cleaned ${enygmaHistoryResult.deletedCount} documents from enygma_history collection for Node ${node}`);
        } catch (error) {
          console.error(`Error cleaning DB for Node ${node}:`, error);
          throw error;
        } finally {
          await client.close();
        }
      }
    } else {
      console.log("CLEAN_ENYGMA_DB_BEFORE_TESTS is not set to 'true'. Skipping DB cleaning.");
    }

    LogForTest(`Starting Enygma tests with token name: ${tokenName} and token symbol: ${tokenSymbol}`);

    try {
      const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress!, signerCC);
      const deployment = await deploymentRegistry.getDeployment();
      tokenRegistryAddress = deployment.tokenRegistryAddress;
      participantStorageAddress = deployment.participantStorageAddress;
      endpointAddressCC = deployment.endpointAddress;

      const tokenEnygma = await hre.ethers.getContractFactory('EnygmaTokenExample', signerA);

      tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);

      participantStorage = await hre.ethers.getContractAt('ParticipantStorageV1', participantStorageAddress, signerCC);

      endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);
      endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);
      endpointCC = await hre.ethers.getContractAt('EndpointV1', endpointAddressCC, signerCC);

      tokenOnPLA = await tokenEnygma.deploy(tokenName, tokenSymbol, endpointAddressA);

      await Promise.all([tokenOnPLA.waitForDeployment()]);
    } catch (error) {
      LogForTest(`ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
  });

  it('Register Token on PL and Approve on Token Registry in CC', async function () {
    try {
      await tokenOnPLA.submitTokenRegistration(0);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const allTokens = await tokenRegistry.getAllTokens();
            const tokenOnCC = allTokens.find((x) => x.name == tokenName);
            if (!tokenOnCC) return false;

            tokenResourceId = tokenOnCC.resourceId;
            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      const tx = await tokenRegistry.updateStatus(tokenResourceId, 1, { gasLimit: 5000000 });

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            tokenResourceId = await tokenOnPLA.resourceId();
            if (tokenResourceId == '0x0000000000000000000000000000000000000000000000000000000000000000') return false;

            const enygmaAddr = await endpointCC.getAddressByResourceId(tokenResourceId);

            enygmaContract = await hre.ethers.getContractAt('EnygmaV1', enygmaAddr, signerCC);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;
    } catch (error) {
      // this will prevent the test to be successful
      throw error;
    }
  }).timeout(5 * 60 * 1000);

  it('Mint some Enygmas', async function () {
    const tx = await tokenOnPLA.mint(signerA.address, 1000);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(1000);

    //Check balance on Database

    if (useMongoDbChecks) {

      LogForTest(`🛠️  Checking balance on database`);
      let r = '0';
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const enygmaOnDb = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

            if (enygmaOnDb?.balance_finalised != '1000') return false;
            r = enygmaOnDb?.r_finalised;
            return true;
          },
          1000,
          600
        )
      ).to.be.true;
      LogForTest(`✅ Checking balance on database`);

      LogForTest(`🛠️  Checking balance on Enygma`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('1000', r);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma`);
    }
  }).timeout(5 * 60 * 1000);

  it('Cross transfer A -> B', async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [[]]);

    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(990);

    const iface = new ethers.Interface(['event crossTransferReferenceId(bytes32 _referenceId)']);

    const eventLog = receipt?.logs.find((log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch (error) {
        return false; // Skip logs that can't be parsed
      }
    });

    if (!eventLog) {
      throw new Error('crossTransferReferenceId event not found in transaction receipt logs');
    }

    let parsedEvent;
    try {
      parsedEvent = iface.parseLog(eventLog);
    } catch (error) {
      throw new Error('Error parsing the event log');
    }

    const referenceId = parsedEvent?.args?._referenceId;

    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000, // Polling interval in ms
      600 // Maximum number of attempts
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️  Checking deploy of token PL destination`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenBAddress = await endpointB.resourceIdToContractAddress(tokenResourceId);
          if (tokenBAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLB = await hre.ethers.getContractAt('EnygmaTokenExample', tokenBAddress, signerB);
          return true;
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking deploy of token PL destination`);

    LogForTest(`🛠️  Checking balance on PL destination`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlB = await tokenOnPLB.balanceOf(signerB.address);

            if (balanceOnPlB == BigInt(10)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination`);

    if (useMongoDbChecks) {

      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== '990') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousR && previousR === enygmaOnDbA?.r_finalised) {
            rA = enygmaOnDbA?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousR = enygmaOnDbA?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL A, final r: ${rA}`);

      LogForTest(`🛠️  Checking balance on Enygma origin`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('990', rA);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma origin`);


      LogForTest(`🛠️  Checking balance on database PL B`);
      let rB = '0';
      let previousRB: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbB = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'B');

          // Check the balance and block number conditions.
          if (enygmaOnDbB?.balance_finalised !== '10') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRB && previousRB === enygmaOnDbB?.r_finalised) {
            rB = enygmaOnDbB?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRB = enygmaOnDbB?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL B, final r: ${rB}`);

      LogForTest(`🛠️  Checking balance on Enygma destination`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('10', rB);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destination`);
    }

    // Poll for A -> B:
    // On tokenOnPLA the status should be SENT (1)
    // On tokenOnPLB the status should be RECEIVED (2)
    await pollCondition(
      async (): Promise<boolean> => {
        const statusAtoBOnPLA = await tokenOnPLA.referenceIdStatus(referenceId);
        const statusAtoBOnPLB = await tokenOnPLB.referenceIdStatus(referenceId);
        return statusAtoBOnPLA === 1n && statusAtoBOnPLB === 2n;
      },
      1000,
      600
    );
    LogForTest(`✅ ReferenceIds Status for A -> B verified`);
  }).timeout(5 * 60 * 1000);

  it('Cross transfer A -> B and B -> A in the same block', async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();

    const txAtoB = await tokenOnPLA.crossTransfer([signerB.address], [3], [chainIdB], [[]]);
    const txBtoA = await tokenOnPLB.crossTransfer([signerA.address], [2], [chainIdA], [[]]);

    const receiptAtoB = await txAtoB.wait();
    const receiptBtoA = await txBtoA.wait();

    expect(receiptAtoB?.status).to.be.equal(1);
    expect(receiptBtoA?.status).to.be.equal(1);

    const iface = new ethers.Interface(['event crossTransferReferenceId(bytes32 _referenceId)']);

    const eventLogAtoB = receiptAtoB?.logs.find((log: Log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch {
        return false;
      }
    });

    if (!eventLogAtoB) throw new Error('crossTransferReferenceId event not found for A -> B');
    const referenceIdAtoB = iface.parseLog(eventLogAtoB)?.args?._referenceId;

    const eventLogBtoA = receiptBtoA?.logs.find((log: Log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch {
        return false;
      }
    });

    if (!eventLogBtoA) throw new Error('crossTransferReferenceId event not found for B -> A');
    const referenceIdBtoA = iface.parseLog(eventLogBtoA)?.args?._referenceId;

    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️  Checking balance on PL A`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlA = await tokenOnPLA.balanceOf(signerA.address);

            if (balanceOnPlA == BigInt(989)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL A`);
    LogForTest(`🛠️  Checking balance on PL B`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlB = await tokenOnPLB.balanceOf(signerB.address);

            if (balanceOnPlB == BigInt(11)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL B`);

    if (useMongoDbChecks) {
      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== '989') return false;
          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousR && previousR === enygmaOnDbA?.r_finalised) {
            rA = enygmaOnDbA?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousR = enygmaOnDbA?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL A, final r: ${rA}`);




      LogForTest(`🛠️  Checking balance on Enygma PL A`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);

            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('989', rA);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL A`);

      LogForTest(`🛠️  Checking balance on database PL B`);
      let rB = '0';
      let previousRB: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbB = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'B');

          // Check the balance and block number conditions.
          if (enygmaOnDbB?.balance_finalised !== '11') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRB && previousRB === enygmaOnDbB?.r_finalised) {
            rB = enygmaOnDbB?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRB = enygmaOnDbB?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL B, final r: ${rB}`);


      LogForTest(`🛠️  Checking balance on Enygma PL B`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;


            const peddersens = await getPeddersenFromEnygma('11', rB);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL B`);

    }

    // Poll for A -> B:
    // On tokenOnPLA the status should be SENT (1)
    // On tokenOnPLB the status should be RECEIVED (2)
    await pollCondition(
      async (): Promise<boolean> => {
        const statusAtoBOnPLA = await tokenOnPLA.referenceIdStatus(referenceIdAtoB);
        const statusAtoBOnPLB = await tokenOnPLB.referenceIdStatus(referenceIdAtoB);
        return statusAtoBOnPLA === 1n && statusAtoBOnPLB === 2n;
      },
      1000,
      600
    );
    LogForTest(`✅ ReferenceIds Status for A -> B verified`);

    // Poll for B -> A:
    // On tokenOnPLB the status should be SENT (1)
    // On tokenOnPLA the status should be RECEIVED (2)
    await pollCondition(
      async (): Promise<boolean> => {
        const statusBtoAOnPLB = await tokenOnPLB.referenceIdStatus(referenceIdBtoA);
        const statusBtoAOnPLA = await tokenOnPLA.referenceIdStatus(referenceIdBtoA);
        return statusBtoAOnPLB === 1n && statusBtoAOnPLA === 2n;
      },
      1000,
      600
    );
    LogForTest(`✅ ReferenceIds Status for B -> A verified`);
  }).timeout(5 * 60 * 1000);

  // should lead to Edge case blockNumberCC > nextBlockNumberCCToFinalise detected" in relayer
  it('Cross transfer A -> B and B -> A in the same block and send B->A in the next block (should end up in same block as one of the fake tx)', async function () {
    let initialBlockNumber = await providerCC.getBlockNumber();

    const txAtoB = await tokenOnPLA.crossTransfer([signerB.address], [3], [chainIdB], [[]]);
    const txBtoA = await tokenOnPLB.crossTransfer([signerA.address], [2], [chainIdA], [[]]);

    const receiptAtoB = await txAtoB.wait();
    const receiptBtoA = await txBtoA.wait();

    expect(receiptAtoB?.status).to.be.equal(1);
    expect(receiptBtoA?.status).to.be.equal(1);

    const iface = new ethers.Interface(['event crossTransferReferenceId(bytes32 _referenceId)']);

    const eventLogAtoB = receiptAtoB?.logs.find((log: Log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch {
        return false;
      }
    });

    if (!eventLogAtoB) throw new Error('crossTransferReferenceId event not found for A -> B');
    const referenceIdAtoB = iface.parseLog(eventLogAtoB)?.args?._referenceId;

    const eventLogBtoA = receiptBtoA?.logs.find((log: Log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch {
        return false;
      }
    });

    if (!eventLogBtoA) throw new Error('crossTransferReferenceId event not found for B -> A');
    const referenceIdBtoA = iface.parseLog(eventLogBtoA)?.args?._referenceId;

    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    // Poll for A -> B:
    // On tokenOnPLA the status should be SENT (1)
    // On tokenOnPLB the status should be RECEIVED (2)
    await pollCondition(
      async (): Promise<boolean> => {
        const statusAtoBOnPLA = await tokenOnPLA.referenceIdStatus(referenceIdAtoB);
        const statusAtoBOnPLB = await tokenOnPLB.referenceIdStatus(referenceIdAtoB);
        return statusAtoBOnPLA === 1n && statusAtoBOnPLB === 2n;
      },
      1000, // Check every 1 second
      600 // Timeout after 600 seconds (adjust as needed)
    );
    LogForTest(`✅ ReferenceIds Status for A -> B verified`);

    // Poll for B -> A:
    // On tokenOnPLB the status should be SENT (1)
    // On tokenOnPLA the status should be RECEIVED (2)
    await pollCondition(
      async (): Promise<boolean> => {
        const statusBtoAOnPLB = await tokenOnPLB.referenceIdStatus(referenceIdBtoA);
        const statusBtoAOnPLA = await tokenOnPLA.referenceIdStatus(referenceIdBtoA);
        return statusBtoAOnPLB === 1n && statusBtoAOnPLA === 2n;
      },
      1000, // Check every 1 second
      600 // Timeout after 600 seconds (adjust as needed)
    );
    LogForTest(`✅ ReferenceIds Status for B -> A verified`);

    const tx = await tokenOnPLB.crossTransfer([signerA.address], [5], [chainIdA], [[]]);

    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const blockToCheckDb = await providerCC.getBlockNumber();
    console.log('block multi transaction', blockToCheckDb);

    initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️  Checking balance on PL A`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlA = await tokenOnPLA.balanceOf(signerA.address);

            if (balanceOnPlA == BigInt(993)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL A`);
    LogForTest(`🛠️  Checking balance on PL B`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlB = await tokenOnPLB.balanceOf(signerB.address);

            if (balanceOnPlB == BigInt(7)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL B`);

    initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber + 2;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    if (useMongoDbChecks) {

      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== '993') return false;
          if (BigInt(enygmaOnDbA?.last_block_number_cc_finalised) < BigInt(blockToCheckDb + 1)) return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousR && previousR === enygmaOnDbA?.r_finalised) {
            rA = enygmaOnDbA?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousR = enygmaOnDbA?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL A, final r: ${rA}`);


      LogForTest(`🛠️  Checking balance on Enygma PL A`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            //console.log(`Balance from Enygma:`, balanceFromEnygma);

            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('993', rA);

            console.log('r', rA);
            console.log(`Pedersen commitments calculated from Enygma:`, peddersens);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL A`);


      LogForTest(`🛠️  Checking balance on database PL B`);
      let rB = '0';
      let previousRB: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbB = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'B');

          // Check the balance and block number conditions.
          if (enygmaOnDbB?.balance_finalised !== '7') return false;
          if (BigInt(enygmaOnDbB?.last_block_number_cc_finalised) < BigInt(blockToCheckDb + 1)) return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRB && previousRB === enygmaOnDbB?.r_finalised) {
            rB = enygmaOnDbB?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRB = enygmaOnDbB?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL B, final r: ${rB}`);



      LogForTest(`🛠️  Checking balance on Enygma PL B`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('7', rB);

            console.log('r', rB);
            console.log(`Pedersen commitments calculated from Enygma:`, peddersens);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL B`);

    }
  }).timeout(5 * 60 * 1000);

  it('Mint in PL A, Transfer 5 from PL B to PL A, Burn 5 in PL A, Transfer 1 from PL B to PL A', async function () {
    // Mint 10 Enygmas in PL A
    LogForTest(`🛠️ Minting 10 Enygmas in PL A`);
    const mintTx = await tokenOnPLA.mint(signerA.address, 10);
    const mintReceipt = await mintTx.wait();
    expect(mintReceipt?.status).to.be.equal(1);
    LogForTest(`✅ Minted 10 Enygmas in PL A`);

    let initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    // Transfer 5 from PL B to PL A
    LogForTest(`🛠️ Transferring 5 Enygmas from PL B to PL A`);
    const transferTxBtoA = await tokenOnPLB.crossTransfer([signerA.address], [5], [chainIdA], [[]]);
    const transferReceiptBtoA = await transferTxBtoA.wait();
    expect(transferReceiptBtoA?.status).to.be.equal(1);
    LogForTest(`✅ Transferred 5 Enygmas from PL B to PL A`);

    initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️ Waiting for transferred balance to appear in PL A`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const balance = await tokenOnPLA.balanceOf(signerA.address);
          return balance == BigInt(1008); // 993 + 10 (minted) + 5 (transferred)
        },
        1000,
        600
      )
    ).to.be.true;
    LogForTest(`✅ Balance updated after transfer`);

    // Burn 5 in PL A
    LogForTest(`🛠️ Burning 5 Enygmas in PL A`);
    const burnTx = await tokenOnPLA.burn(signerA.address, 5);
    const burnReceipt = await burnTx.wait();
    expect(burnReceipt?.status).to.be.equal(1);
    LogForTest(`✅ Burned 5 Enygmas in PL A`);

    initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    // Transfer 1 from PL B to PL A
    LogForTest(`🛠️ Transferring 1 Enygmas from PL B to PL A`);
    const transferTxBtoA2 = await tokenOnPLB.crossTransfer([signerA.address], [1], [chainIdA], [[]]);
    const transferReceiptBtoA2 = await transferTxBtoA2.wait();
    expect(transferReceiptBtoA2?.status).to.be.equal(1);
    LogForTest(`✅ Transferred 1 Enygmas from PL B to PL A`);

    initialBlockNumber = await providerCC.getBlockNumber();
    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber + 2;
      },
      1000,
      600
    );
    LogForTest(`✅ Next block confirmed`);

    // Validate balances in PL A and PL B
    LogForTest(`🛠️ Checking final balance on PL A`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlA = await tokenOnPLA.balanceOf(signerA.address);
            return balanceOnPlA == BigInt(1004); // 993 + 10 (minted) + 5 (received) - 5 (burned) + 1 (received)
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;
    LogForTest(`✅ Final balance on PL A verified`);

    LogForTest(`🛠️ Checking final balance on PL B`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlB = await tokenOnPLB.balanceOf(signerB.address);
            return balanceOnPlB == BigInt(1); // Initial 7 - 5 (transferred) - 1 (transferred)
          } catch (e) {
            return false;
          }
        },
        1000,
        600
      )
    ).to.be.true;
    LogForTest(`✅ Final balance on PL B verified`);

    if (useMongoDbChecks) {
      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== '1004') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousR && previousR === enygmaOnDbA?.r_finalised) {
            rA = enygmaOnDbA?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousR = enygmaOnDbA?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL A, final r: ${rA}`);

      LogForTest(`🛠️  Checking balance on Enygma PL A`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            //console.log(`Balance from Enygma:`, balanceFromEnygma);

            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('1004', rA);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL A`);

      LogForTest(`🛠️  Checking balance on database PL B`);
      let rB = '0';
      let previousRB: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbB = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'B');

          // Check the balance and block number conditions.
          if (enygmaOnDbB?.balance_finalised !== '1') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRB && previousRB === enygmaOnDbB?.r_finalised) {
            rB = enygmaOnDbB?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRB = enygmaOnDbB?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL B, final r: ${rB}`);


      LogForTest(`🛠️  Checking balance on Enygma PL B`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            //console.log(`Balance from Enygma:`, balanceFromEnygma);

            const peddersens = await getPeddersenFromEnygma('1', rB);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          600
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma PL B`);

    }
  }).timeout(5 * 60 * 1000);

  async function getBalanceFinalisedFromEnygma(bankId: string) {
    const balanceFromBank = await enygmaContract.getBalanceFinalised(BigInt(bankId));
    return balanceFromBank;
  }

  async function getPeddersenFromEnygma(v: string, r: string) {
    const peddersens = await enygmaContract.pedCom(BigInt(v), BigInt(r));

    return peddersens;
  }

  async function getEnygmaRByResourceConnectionString(resourceId: string, node: string) {
    const cs = process.env[`NODE_` + node + `_MONGO_CS`] as string;
    const dbName = process.env[`NODE_` + node + `_MONGO_CS_DBNAME`] as string;

    const client = new MongoClient(cs);

    try {
      await client.connect();
      const database = client.db(dbName);
      const collection = database.collection('enygma');
      const enygma = await collection.findOne({ resource_id: resourceId });
      return enygma;
    } finally {
      await client.close();
    }
  }
});
