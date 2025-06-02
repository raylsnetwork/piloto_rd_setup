import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { EndpointV1, EnygmaTokenExample, EnygmaV1, ParticipantStorageV1, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition } from './Utils';
import { MongoClient } from 'mongodb';
import { LogForTest } from '../LoggerForTests';
import { AddressLike } from 'ethers';

describe('E2E Tests: Enygma 1->1', function () {
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
  const chainIdD = process.env[`NODE_D_CHAIN_ID`] as string;

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

  const signer2A = wallet2.connect(providerA);
  const signer2B = wallet2.connect(providerB);

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
      throw error;
    }
  });

  it('Register Token on PL and Approve on Token Registry in CC', async function () {
    try {
      const txRegistration = await tokenOnPLA.submitTokenRegistration(0);
      const receiptRegistration = await txRegistration.wait()
      expect(receiptRegistration?.status).to.eq(1)

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
          300
        )
      ).to.be.true;

      const tx = await tokenRegistry.updateStatus(tokenResourceId, 1, { gasLimit: 5000000 });
      const rcpt = await tx.wait()

      expect(rcpt?.status).to.eq(1)

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
          300
        )
      ).to.be.true;
    } catch (error) {
      throw error;
    }
  }).timeout(5 * 60 * 1000);

  it('Mint some Enygmas', async function () {
    const tx = await tokenOnPLA.mint(signerA.address, 1000);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(1000);

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
          300
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
          300
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
        return false;
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
      1000,
      300
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
        300
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
        300
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

      LogForTest(`🛠️  Checking balance on Enygma PL A`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            //console.log(`Balance from Enygma:`, balanceFromEnygma);

            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('990', rA);

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

      LogForTest(`🛠️  Checking balance on Enygma PL B`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('10', rB);

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
    LogForTest(`🛠️  Checking referenceIds Status`);

    expect(await tokenOnPLA.referenceIdStatus(referenceId)).to.be.equal(1);

    expect(await tokenOnPLB.referenceIdStatus(referenceId)).to.be.equal(2);

    LogForTest(`✅ Checking referenceIds Status`);
  }).timeout(5 * 60 * 1000);

  it('Cross transfer B -> A', async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();
    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    const initialBalanceB = await tokenOnPLB.balanceOf(signerB.address);

    LogForTest(`🛠️ Sending some enygma from B to A`);

    const tx = await tokenOnPLB.crossTransfer([signerA.address], [5], [chainIdA], [[]]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    LogForTest(`✅ Sending some enygma from B to A`);

    LogForTest(`🛠️ Checking balance on PL B`);

    const balance = await tokenOnPLB.balanceOf(signerB.address);

    expect(balance).to.be.equal(initialBalanceB - BigInt(5));

    LogForTest(`✅ Checking balance on PL B `);

    LogForTest(`🛠️ Finding reference ID of this transfer...`);

    const iface = new ethers.Interface(['event crossTransferReferenceId(bytes32 _referenceId)']);

    const eventLog = receipt?.logs.find((log) => {
      try {
        const parsedLog = iface.parseLog(log);
        return parsedLog?.name === 'crossTransferReferenceId';
      } catch (error) {
        return false;
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

    LogForTest(`✅ Finding reference ID of this transfer`);

    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000,
      300
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️  Checking balance on PL destination`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlA = await tokenOnPLA.balanceOf(signerA.address);

            if (balanceOnPlA == initialBalanceA + BigInt(5)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
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
          if (enygmaOnDbA?.balance_finalised !== (initialBalanceA + BigInt(5)).toString()) return false;
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

            const peddersens = await getPeddersenFromEnygma((initialBalanceA + BigInt(5)).toString(), rA);

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
          if (enygmaOnDbB?.balance_finalised !== (initialBalanceB - BigInt(5)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceB - BigInt(5)).toString(), rB);

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
    LogForTest(`🛠️  Checking referenceIds Status`);

    expect(await tokenOnPLA.referenceIdStatus(referenceId)).to.be.equal(2);

    expect(await tokenOnPLB.referenceIdStatus(referenceId)).to.be.equal(1);

    LogForTest(`✅ Checking referenceIds Status`);
  }).timeout(5 * 60 * 1000);

  it('Freeze Enygma', async function () {
    LogForTest(`🛠️ 🧊  Freezing enygma`);

    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    const txFreeze = await tokenRegistry.freezeEnygmaToken(tokenResourceId, { gasLimit: 5000000 });
    const receiptFromFreeze = await txFreeze.wait();

    expect(receiptFromFreeze?.status).to.be.equal(1);

    LogForTest(`✅ 🧊  Freezing enygma`);

    LogForTest(`🛠️ Transfering some enygma`);

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [100], [chainIdB], [[]]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(initialBalanceA - BigInt(100));

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

    LogForTest(`✅  Transfering some enygma, should give an error`);

    LogForTest(`🛠️ Wait the value to come back to PL`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlA = await tokenOnPLA.balanceOf(signerA.address);

            if (balanceOnPlA == initialBalanceA - BigInt(100)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Wait the value to come back to PL`);

    LogForTest(`🛠️  Checking referenceIds Status`);

    expect(await tokenOnPLA.referenceIdStatus(referenceId)).to.be.equal(1);

    expect(await tokenOnPLB.referenceIdStatus(referenceId)).to.be.equal(0);

    LogForTest(`✅ Checking referenceIds Status`);
  }).timeout(5 * 60 * 1000);

  it('UnFreeze Enygma', async function () {
    LogForTest(`🛠️ 🧊🔥  UnFreezing enygma`);

    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    const initialBalanceB = await tokenOnPLB.balanceOf(signerB.address);

    const txFreeze = await tokenRegistry.unfreezeEnygmaToken(tokenResourceId, { gasLimit: 5000000 });
    const receiptFromFreeze = await txFreeze.wait();

    expect(receiptFromFreeze?.status).to.be.equal(1);

    LogForTest(`✅ 🧊🔥  UnFreezing enygma`);

    LogForTest(`🛠️ Transfering some enygma`);

    const initialBlockNumber = await providerCC.getBlockNumber();

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [100], [chainIdB], [[]]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(initialBalanceA - BigInt(100));

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

    LogForTest(`✅  Transfering some enygma`);

    LogForTest(`🛠️  Waiting for the next block`);
    await pollCondition(
      async (): Promise<boolean> => {
        const currentBlockNumber = await providerCC.getBlockNumber();
        return currentBlockNumber > initialBlockNumber;
      },
      1000, // Polling interval in ms
      300 // Maximum number of attempts
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
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking deploy of token PL destination`);

    if (useMongoDbChecks) {
      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== (initialBalanceA - BigInt(100)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceA - BigInt(100)).toString(), rA);

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
          // here it is +200 instead of +100 because we need to account for the 100 frozen in the previous test
          if (enygmaOnDbB?.balance_finalised !== (initialBalanceB + BigInt(200)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceB + BigInt(200)).toString(), rB);

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

    LogForTest(`🛠️  Checking referenceIds Status`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const refOnPLA = await tokenOnPLA.referenceIdStatus(referenceId);
          const refOnPLB = await tokenOnPLB.referenceIdStatus(referenceId);
          return refOnPLA === BigInt(1) && refOnPLB === BigInt(2);
        },
        1000,
        30
      ),
      'ReferenceIds status not as expected'
    ).to.be.true;

    LogForTest(`✅ Checking referenceIds Status`);
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
