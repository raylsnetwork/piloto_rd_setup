import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { EndpointV1, EnygmaTokenExample, EnygmaV1, ParticipantStorageV1, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition } from './Utils';
import { MongoClient } from 'mongodb';
import { LogForTest } from '../LoggerForTests';

describe('E2E Tests: Enygma 1->5', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlC = process.env[`RPC_URL_NODE_C`];
  const rpcUrlD = process.env[`RPC_URL_NODE_D`];
  const rpcUrlE = process.env[`RPC_URL_NODE_E`];
  const rpcUrlF = process.env[`RPC_URL_NODE_F`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const endpointAddressC = process.env[`NODE_C_ENDPOINT_ADDRESS`] as string;
  const endpointAddressD = process.env[`NODE_D_ENDPOINT_ADDRESS`] as string;
  const endpointAddressE = process.env[`NODE_E_ENDPOINT_ADDRESS`] as string;
  const endpointAddressF = process.env[`NODE_F_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  let participantStorageAddress = '' as string;
  let endpointAddressCC = '' as string;
  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;
  const chainIdC = process.env[`NODE_C_CHAIN_ID`] as string;
  const chainIdD = process.env[`NODE_D_CHAIN_ID`] as string;
  const chainIdE = process.env[`NODE_E_CHAIN_ID`] as string;
  const chainIdF = process.env[`NODE_F_CHAIN_ID`] as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerC = new ethers.JsonRpcProvider(rpcUrlC);
  const providerD = new ethers.JsonRpcProvider(rpcUrlD);
  const providerE = new ethers.JsonRpcProvider(rpcUrlE);
  const providerF = new ethers.JsonRpcProvider(rpcUrlF);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerC.pollingInterval = 200;
  providerD.pollingInterval = 200;
  providerE.pollingInterval = 200;
  providerF.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const wallet1 = ethers.Wallet.createRandom();
  const wallet2 = ethers.Wallet.createRandom();

  const signerA = wallet1.connect(providerA);
  const signerB = wallet1.connect(providerB);
  const signerC = wallet1.connect(providerC);
  const signerD = wallet1.connect(providerD);
  const signerE = wallet1.connect(providerE);
  const signerF = wallet1.connect(providerF);

  const signerCC = venOperatorWallet.connect(providerCC);

  const signer2A = wallet2.connect(providerA);
  const signer2B = wallet2.connect(providerB);

  let tokenOnPLA: EnygmaTokenExample;
  let tokenOnPLB: EnygmaTokenExample;
  let tokenOnPLC: EnygmaTokenExample;
  let tokenOnPLD: EnygmaTokenExample;
  let tokenOnPLE: EnygmaTokenExample;
  let tokenOnPLF: EnygmaTokenExample;

  let tokenRegistry: TokenRegistryV1;
  let participantStorage: ParticipantStorageV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  let endpointC: EndpointV1;
  let endpointD: EndpointV1;
  let endpointE: EndpointV1;
  let endpointF: EndpointV1;

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
      for (const node of ['A', 'B', 'C', 'D', 'E', 'F']) {
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
      endpointC = await hre.ethers.getContractAt('EndpointV1', endpointAddressC, signerC);
      endpointD = await hre.ethers.getContractAt('EndpointV1', endpointAddressD, signerD);
      endpointE = await hre.ethers.getContractAt('EndpointV1', endpointAddressE, signerE);
      endpointF = await hre.ethers.getContractAt('EndpointV1', endpointAddressF, signerF);

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
          300
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
          300
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

  it('Cross transfer A -> B, C, D, E, F', async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();

    const tx = await tokenOnPLA.crossTransfer(
      [signerB.address, signerC.address, signerD.address, signerE.address, signerF.address],
      [1, 2, 3, 4, 5],
      [chainIdB, chainIdC, chainIdD, chainIdE, chainIdF],
      [[], [], [], [], []]
    );

    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(985);

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
      300 // Maximum number of attempts
    );
    LogForTest(`✅ Next block confirmed`);

    LogForTest(`🛠️  Checking deploy of token PL destination B`);

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

    LogForTest(`✅ Checking deploy of token PL destination B`);

    LogForTest(`🛠️  Checking deploy of token PL destination C`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenCAddress = await endpointC.resourceIdToContractAddress(tokenResourceId);
          if (tokenCAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLC = await hre.ethers.getContractAt('EnygmaTokenExample', tokenCAddress, signerC);
          return true;
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking deploy of token PL destination C`);

    LogForTest(`🛠️  Checking deploy of token PL destination D`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenDAddress = await endpointD.resourceIdToContractAddress(tokenResourceId);
          if (tokenDAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLD = await hre.ethers.getContractAt('EnygmaTokenExample', tokenDAddress, signerD);
          return true;
        },
        1000,
        300
      )
    ).to.be.true;
    LogForTest(`✅ Checking deploy of token PL destination D`);

    LogForTest(`🛠️  Checking deploy of token PL destination E`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenEAddress = await endpointE.resourceIdToContractAddress(tokenResourceId);
          if (tokenEAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLE = await hre.ethers.getContractAt('EnygmaTokenExample', tokenEAddress, signerE);
          return true;
        },
        1000,
        300
      )
    ).to.be.true;
    LogForTest(`✅ Checking deploy of token PL destination E`);

    LogForTest(`🛠️  Checking deploy of token PL destination F`);
    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenFAddress = await endpointF.resourceIdToContractAddress(tokenResourceId);
          if (tokenFAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLF = await hre.ethers.getContractAt('EnygmaTokenExample', tokenFAddress, signerF);
          return true;
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`🛠️  Checking balance on PL destination B`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlB = await tokenOnPLB.balanceOf(signerB.address);

            if (balanceOnPlB == BigInt(1)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination B`);

    LogForTest(`🛠️  Checking balance on PL destination C`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlC = await tokenOnPLC.balanceOf(signerC.address);

            if (balanceOnPlC == BigInt(2)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination C`);

    LogForTest(`🛠️  Checking balance on PL destination D`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlD = await tokenOnPLD.balanceOf(signerD.address);

            if (balanceOnPlD == BigInt(3)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination D`);

    LogForTest(`🛠️  Checking balance on PL destination E`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlE = await tokenOnPLE.balanceOf(signerE.address);

            if (balanceOnPlE == BigInt(4)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination E`);

    LogForTest(`🛠️  Checking balance on PL destination F`);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const balanceOnPlF = await tokenOnPLF.balanceOf(signerF.address);

            if (balanceOnPlF == BigInt(5)) return true;
            return false;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking balance on PL destination F`);
    if (useMongoDbChecks) {
      LogForTest(`🛠️  Checking balance on database PL A`);
      let rA = '0';
      let previousR: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbA = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'A');

          // Check the balance and block number conditions.
          if (enygmaOnDbA?.balance_finalised !== '985') return false;

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

      LogForTest(`🛠️  Checking balance on Enygma origin A`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_A_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('985', rA);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma origin A`);

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

      LogForTest(`🛠️  Checking balance on Enygma destination B`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_B_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('1', rB);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destinantion B`);
      LogForTest(`🛠️  Checking balance on database PL C`);
      let rC = '0';
      let previousRC: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbC = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'C');

          // Check the balance and block number conditions.
          if (enygmaOnDbC?.balance_finalised !== '2') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRC && previousRC === enygmaOnDbC?.r_finalised) {
            rC = enygmaOnDbC?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRC = enygmaOnDbC?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL C, final r: ${rC}`);

      LogForTest(`🛠️  Checking balance on Enygma destination C`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_C_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('2', rC);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destination C`);

      LogForTest(`🛠️  Checking balance on database PL D`);
      let rD = '0';
      let previousRD: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbD = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'D');

          // Check the balance and block number conditions.
          if (enygmaOnDbD?.balance_finalised !== '3') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRD && previousRD === enygmaOnDbD?.r_finalised) {
            rD = enygmaOnDbD?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRD = enygmaOnDbD?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL D, final r: ${rD}`);

      LogForTest(`🛠️  Checking balance on Enygma destination D`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_D_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('3', rD);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destination D`);

      LogForTest(`🛠️  Checking balance on database PL E`);
      let rE = '0';
      let previousRE: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbE = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'E');

          // Check the balance and block number conditions.
          if (enygmaOnDbE?.balance_finalised !== '4') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRE && previousRE === enygmaOnDbE?.r_finalised) {
            rE = enygmaOnDbE?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRE = enygmaOnDbE?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL E, final r: ${rE}`);

      LogForTest(`🛠️  Checking balance on Enygma destination E`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_E_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('4', rE);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destination E`);

      LogForTest(`🛠️  Checking balance on database PL F`);
      let rF = '0';
      let previousRF: null = null;

      await pollCondition(
        async (): Promise<boolean> => {
          const enygmaOnDbF = await getEnygmaRByResourceConnectionString(tokenResourceId.substring(2), 'F');

          // Check the balance and block number conditions.
          if (enygmaOnDbF?.balance_finalised !== '5') return false;

          // If the r value is the same as in the previous poll, we assume it has stabilized.
          if (previousRF && previousRF === enygmaOnDbF?.r_finalised) {
            rF = enygmaOnDbF?.r_finalised;
            return true;
          }

          // Otherwise, update previousR and wait for the next poll.
          previousRF = enygmaOnDbF?.r_finalised;
          return false;
        },
        15000,
        3000
      );

      LogForTest(`✅ Checking balance on database PL F, final r: ${rF}`);

      LogForTest(`🛠️  Checking balance on Enygma destination F`);

      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceFromEnygma = await getBalanceFinalisedFromEnygma(process.env[`NODE_F_CHAIN_ID`] as string);
            if (balanceFromEnygma[0] == BigInt(0)) return false;

            const peddersens = await getPeddersenFromEnygma('5', rF);

            expect(balanceFromEnygma[0]).to.be.equal(peddersens[0]);
            expect(balanceFromEnygma[1]).to.be.equal(peddersens[1]);

            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      LogForTest(`✅ Checking balance on Enygma destination F`);
    }
    LogForTest(`🛠️  Checking referenceIds Status`);

    expect(await tokenOnPLA.referenceIdStatus(referenceId)).to.be.equal(1);

    expect(await tokenOnPLB.referenceIdStatus(referenceId)).to.be.equal(2);
    expect(await tokenOnPLC.referenceIdStatus(referenceId)).to.be.equal(2);
    expect(await tokenOnPLD.referenceIdStatus(referenceId)).to.be.equal(2);
    expect(await tokenOnPLE.referenceIdStatus(referenceId)).to.be.equal(2);
    expect(await tokenOnPLF.referenceIdStatus(referenceId)).to.be.equal(2);

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
