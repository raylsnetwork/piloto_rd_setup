import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { EndpointV1, EnygmaTokenExample, EnygmaV1, ParticipantStorageV1, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition, generateMsgAEnygmaCrossTransferCallablesByAddresses, createEnygmaCrossTransferCallablesByAddresses, generateNoOpEnygmaCrossTransferCallable, createEnygmaCrossTransferCallablesByResourceIds } from './Utils';
import { MongoClient } from 'mongodb';
import { LogForTest } from '../LoggerForTests';
import { AddressLike } from 'ethers';

describe('E2E Tests: Enygma with payload', function () {
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

  const signerA = wallet1.connect(providerA);
  const signerB = wallet1.connect(providerB);
  const signerC = wallet1.connect(providerC);
  const signerD = wallet1.connect(providerD);
  const signerE = wallet1.connect(providerE);
  const signerF = wallet1.connect(providerF);
  const signerCC = venOperatorWallet.connect(providerCC);

  let tokenOnPLA: EnygmaTokenExample;
  let tokenOnPLB: EnygmaTokenExample;
  let tokenRegistry: TokenRegistryV1;
  let endpointCC: EndpointV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  let endpointC: EndpointV1;
  let endpointD: EndpointV1;
  let endpointE: EndpointV1;
  let endpointF: EndpointV1;
  let endpointAddressCC = '' as string;
  let tokenRegistryAddress = '' as string;
  let participantStorageAddress = '' as string;

  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `enygma-${randHex}`;
  const tokenSymbol = `E_${randHex}`;

  let tokenResourceId: string;
  let enygmaAddr: AddressLike;
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

      //  participantStorage = await hre.ethers.getContractAt('ParticipantStorageV1', participantStorageAddress, signerCC);

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

            enygmaAddr = await endpointCC.getAddressByResourceId(tokenResourceId);

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
    const noOpCallables = generateNoOpEnygmaCrossTransferCallable()
    const initialBalanceA = tokenOnPLA.balanceOf(signerA.address);
    //const initialBalanceB = tokenOnPLB.balanceOf(signerB.address);

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [noOpCallables]);
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
            //LogForTest(`balanceOnPlB=${balanceOnPlB}, done?=${balanceOnPlB == BigInt(10)}`)

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

  it('Supports callables', async function () {
    const arbitraryCallableContract = await hre.ethers.getContractFactory('ArbitraryCallable', signerA);
    const contract = await arbitraryCallableContract.deploy();
    await contract.waitForDeployment();

    // 1
    let tx = await contract.test1([]);
    await tx.wait();

    let n = (await contract.getN()).toString();
    expect(n).to.be.eq('0');
    //console.log('n', n)

    // 2
    tx = await contract.test1(['0x', '0x']);
    await tx.wait();

    n = (await contract.getN()).toString();
    expect(n).to.be.eq('2');
    //console.log('n', n)

    // 3
    let c = generateMsgAEnygmaCrossTransferCallablesByAddresses([await contract.getAddress()]);
    tx = await contract.executeStruct(c);
    await tx.wait();

    n = await contract.getMsgA();
    expect(n).to.be.eq('Hello, World!');
    //console.log('n', n)

    // 4
    const functionSignatures = ['receiveMsgA(string)', 'receiveMsgA(string)'];
    const types = [['string'], ['string']];
    const values = [['Hello, World!'], ['Hi there']];

    c = createEnygmaCrossTransferCallablesByAddresses([await contract.getAddress(), await contract.getAddress()], functionSignatures, types, values);
    tx = await contract.executeStruct(c);
    await tx.wait();

    n = await contract.getMsgA();
    expect(n).to.be.eq('Hi there');
    //console.log('n', n)
  });

  it("Supports empty array of callables", async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();
    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    LogForTest(`initialBalanceA=${initialBalanceA.toString()}`)
    const initialBalanceB = await tokenOnPLB.balanceOf(signerB.address);
    LogForTest(`initialBalanceB=${initialBalanceB.toString()}`)

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [[]]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(initialBalanceA - BigInt(10));

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
            //LogForTest(`balanceOnPlB=${balanceOnPlB.toString()}, initialBalanceB=${initialBalanceB.toString()}, done?=${balanceOnPlB == BigInt(50)}`)

            if (balanceOnPlB == BigInt(10) + initialBalanceB) return true;
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
          if (enygmaOnDbA?.balance_finalised !== (initialBalanceA - BigInt(10)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceA - BigInt(10)).toString(), rA);

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
          if (enygmaOnDbB?.balance_finalised !== (initialBalanceB + BigInt(10)).toString()) return false;
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

            const peddersens = await getPeddersenFromEnygma((initialBalanceB + BigInt(10)).toString(), rB);

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

  }).timeout(10 * 60 * 1000);

  it('Cross transfer A -> B, with 2 callables on 2 ArbitraryCallable contracts', async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();
    const arbitratyCallableFactoryB = await hre.ethers.getContractFactory('ArbitraryCallable', signerB);
    const arbitratyCallableB1 = await arbitratyCallableFactoryB.deploy();
    await arbitratyCallableB1.waitForDeployment();
    const arbitratyCallableB2 = await arbitratyCallableFactoryB.deploy();
    await arbitratyCallableB2.waitForDeployment();

    expect(await arbitratyCallableB1.getMsgA()).to.eq('');
    expect(await arbitratyCallableB2.getMsgA()).to.eq('');

    const encodedCallables = createEnygmaCrossTransferCallablesByAddresses(
      [await arbitratyCallableB1.getAddress(), await arbitratyCallableB2.getAddress()],
      ['receiveMsgA(string)', 'receiveMsgA(string)'],
      [['string'], ['string']],
      [['Hey'], ['Howdy']]
    );

    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    const initialBalanceB = await tokenOnPLB.balanceOf(signerB.address);

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [encodedCallables]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(initialBalanceA - BigInt(10));

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

            if (balanceOnPlB == initialBalanceB + BigInt(10)) return true;
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
          if (enygmaOnDbA?.balance_finalised !== (initialBalanceA - BigInt(10)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceA - BigInt(10)).toString(), rA);

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
          if (enygmaOnDbB?.balance_finalised !== (initialBalanceB + BigInt(10)).toString()) return false;
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

            const peddersens = await getPeddersenFromEnygma((initialBalanceB + BigInt(10)).toString(), rB);

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
    const expectedMessageA1 = 'Hey';
    const expectedMessageA2 = 'Howdy';

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            const msgA1 = await arbitratyCallableB1.getMsgA();
            console.log('arbitratyCallableB1.getMsgA()', msgA1);
            const msgA2 = await arbitratyCallableB2.getMsgA();
            console.log('arbitratyCallableB2.getMsgA()', msgA2);

            return msgA1 == expectedMessageA1 && msgA2 == expectedMessageA2;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    LogForTest(`✅ Checking referenceIds Status`);
  }).timeout(5 * 60 * 1000);

  it('Cross transfer with payload A -> all participants, to EnygmaTokenExample and ArbitraryCallable contracts', async function () {
    const tokenEnygmaFactoryB = await hre.ethers.getContractFactory('EnygmaTokenExample', signerB);
    const tokenEnygmaFactoryC = await hre.ethers.getContractFactory('EnygmaTokenExample', signerC);
    const tokenEnygmaFactoryD = await hre.ethers.getContractFactory('EnygmaTokenExample', signerD);
    const tokenEnygmaFactoryE = await hre.ethers.getContractFactory('EnygmaTokenExample', signerE);
    const tokenEnygmaFactoryF = await hre.ethers.getContractFactory('EnygmaTokenExample', signerF);

    // Deploy tokens on all participants
    const myTokenOnPLB = await tokenEnygmaFactoryB.deploy(tokenName, tokenSymbol, endpointAddressB);
    await myTokenOnPLB.waitForDeployment();
    const myTokenOnPLC = await tokenEnygmaFactoryC.deploy(tokenName, tokenSymbol, endpointAddressC);
    await myTokenOnPLC.waitForDeployment();
    const myTokenOnPLD = await tokenEnygmaFactoryD.deploy(tokenName, tokenSymbol, endpointAddressD);
    await myTokenOnPLD.waitForDeployment();
    const myTokenOnPLE = await tokenEnygmaFactoryE.deploy(tokenName, tokenSymbol, endpointAddressE);
    await myTokenOnPLE.waitForDeployment();
    const myTokenOnPLF = await tokenEnygmaFactoryF.deploy(tokenName, tokenSymbol, endpointAddressF);
    await myTokenOnPLF.waitForDeployment();

    expect(await myTokenOnPLB.message()).to.be.eq("test")
    expect(await myTokenOnPLC.message()).to.be.eq("test")
    expect(await myTokenOnPLD.message()).to.be.eq("test")
    expect(await myTokenOnPLE.message()).to.be.eq("test")
    expect(await myTokenOnPLF.message()).to.be.eq("test")

    // prepare ArbitraryCallable contracts
    const arbitraryCallableContractFactoryB = await hre.ethers.getContractFactory('ArbitraryCallable', signerB);
    const arbitraryCallableContractB = await arbitraryCallableContractFactoryB.deploy();
    await arbitraryCallableContractB.waitForDeployment();
    const arbitraryCallableContractFactoryC = await hre.ethers.getContractFactory('ArbitraryCallable', signerC);
    const arbitraryCallableContractC = await arbitraryCallableContractFactoryC.deploy();
    await arbitraryCallableContractC.waitForDeployment();
    const arbitraryCallableContractFactoryD = await hre.ethers.getContractFactory('ArbitraryCallable', signerD);
    const arbitraryCallableContractD = await arbitraryCallableContractFactoryD.deploy();
    await arbitraryCallableContractD.waitForDeployment();
    const arbitraryCallableContractFactoryE = await hre.ethers.getContractFactory('ArbitraryCallable', signerE);
    const arbitraryCallableContractE = await arbitraryCallableContractFactoryE.deploy();
    await arbitraryCallableContractE.waitForDeployment();
    const arbitraryCallableContractFactoryF = await hre.ethers.getContractFactory('ArbitraryCallable', signerF);
    const arbitraryCallableContractF = await arbitraryCallableContractFactoryF.deploy();
    await arbitraryCallableContractF.waitForDeployment();

    expect(await arbitraryCallableContractB.getMsgA()).to.be.eq('');
    expect(await arbitraryCallableContractC.getMsgA()).to.be.eq('');
    expect(await arbitraryCallableContractD.getMsgA()).to.be.eq('');
    expect(await arbitraryCallableContractE.getMsgA()).to.be.eq('');
    expect(await arbitraryCallableContractF.getMsgA()).to.be.eq('');

    const callablesB = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractB.getAddress(), await myTokenOnPLB.getAddress()]);
    const callablesC = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractC.getAddress(), await myTokenOnPLC.getAddress()]);
    const callablesD = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractD.getAddress(), await myTokenOnPLD.getAddress()]);
    const callablesE = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractE.getAddress(), await myTokenOnPLE.getAddress()]);
    const callablesF = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractF.getAddress(), await myTokenOnPLF.getAddress()]);

    // Do cross transfer
    const tx = await tokenOnPLA.crossTransfer(
      [signerB.address, signerC.address, signerD.address, signerE.address, signerF.address],
      [10, 10, 10, 10, 10],
      [chainIdB, chainIdC, chainIdD, chainIdE, chainIdF],
      [callablesB, callablesC, callablesD, callablesE, callablesF]
    );

    const receipt1 = await tx.wait();

    expect(receipt1?.status).to.be.equal(1);

    const expectedMsgA = 'Hello, World!';

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            return (await arbitraryCallableContractB.getMsgA()) == expectedMsgA &&
              (await arbitraryCallableContractC.getMsgA()) == expectedMsgA &&
              (await arbitraryCallableContractD.getMsgA()) == expectedMsgA &&
              (await arbitraryCallableContractE.getMsgA()) == expectedMsgA &&
              (await arbitraryCallableContractF.getMsgA()) == expectedMsgA
              ;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            return (await myTokenOnPLB.message()) == expectedMsgA &&
              (await myTokenOnPLC.message()) == expectedMsgA &&
              (await myTokenOnPLD.message()) == expectedMsgA &&
              (await myTokenOnPLE.message()) == expectedMsgA &&
              (await myTokenOnPLF.message()) == expectedMsgA
              ;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

  }).timeout(10 * 60 * 1000);

  it("Doesn't allow cross transfers with more than 5 payloads", async function () {

    // prepare ArbitraryCallable contracts
    const arbitraryCallableContractFactoryB = await hre.ethers.getContractFactory('ArbitraryCallable', signerB);
    const arbitraryCallableContractB = await arbitraryCallableContractFactoryB.deploy();
    await arbitraryCallableContractB.waitForDeployment();


    expect(await arbitraryCallableContractB.getMsgA()).to.be.eq("")

    const callablesB = generateMsgAEnygmaCrossTransferCallablesByAddresses([
      await arbitraryCallableContractB.getAddress(),
      await arbitraryCallableContractB.getAddress(),
      await arbitraryCallableContractB.getAddress(),
      await arbitraryCallableContractB.getAddress(),
      await arbitraryCallableContractB.getAddress(),
      await arbitraryCallableContractB.getAddress(),
    ]);


    // Do cross transfer
    expect(tokenOnPLA.crossTransfer(
      [signerB.address],
      [10],
      [chainIdB],
      [callablesB]
    )).to.be.revertedWith("Protocol doesn't support more than 5 callables in a transfer")

  }).timeout(10 * 60 * 1000);

  it("Supports mint callables on resourceIds", async function () {
    const initialBlockNumber = await providerCC.getBlockNumber();
    const initialBalanceA = await tokenOnPLA.balanceOf(signerA.address);
    LogForTest(`initialBalanceA=${initialBalanceA.toString()}`)
    const initialBalanceB = await tokenOnPLB.balanceOf(signerB.address);
    LogForTest(`initialBalanceB=${initialBalanceB.toString()}`)
    const resourceId = await tokenOnPLA.resourceId()
    const noOpCallable = generateNoOpEnygmaCrossTransferCallable()

    // this callable will crossMint additional 30 tokens to signerB, using reentrancy
    const callable = createEnygmaCrossTransferCallablesByResourceIds(
      [resourceId],
      ["crossMint(address,uint256,bytes32,(bytes32,address,bytes)[])"],
      [["address", "uint256", "bytes32", "(bytes32 resourceId,address contractAddress,bytes payload)[]"]],
      [[signerB.address, BigInt(30).toString(), ethers.encodeBytes32String(""), noOpCallable]]
    )

    const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [callable]);
    const receipt = await tx.wait();

    expect(receipt?.status).to.be.equal(1);

    const balance = await tokenOnPLA.balanceOf(signerA.address);

    expect(balance).to.be.equal(initialBalanceA - BigInt(10));

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
            //LogForTest(`balanceOnPlB=${balanceOnPlB.toString()}, initialBalanceB=${initialBalanceB.toString()}, done?=${balanceOnPlB == BigInt(50)}`)

            if (balanceOnPlB == BigInt(40) + initialBalanceB) return true;
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
          if (enygmaOnDbA?.balance_finalised !== (initialBalanceA - BigInt(10)).toString()) return false;

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

            const peddersens = await getPeddersenFromEnygma((initialBalanceA - BigInt(10)).toString(), rA);

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
          if (enygmaOnDbB?.balance_finalised !== (initialBalanceB + BigInt(10)).toString()) return false;
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

            const peddersens = await getPeddersenFromEnygma((initialBalanceB + BigInt(10)).toString(), rB);

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

  }).timeout(10 * 60 * 1000);

  it('Supports cross transfer A -> all participants, with some ArbitraryCallables (2 and 3)', async function () {
    const arbitraryCallableContractFactoryD = await hre.ethers.getContractFactory('ArbitraryCallable', signerD);
    const arbitraryCallableContractD = await arbitraryCallableContractFactoryD.deploy();
    await arbitraryCallableContractD.waitForDeployment();
    const arbitraryCallableContractFactoryE = await hre.ethers.getContractFactory('ArbitraryCallable', signerE);
    const arbitraryCallableContractE = await arbitraryCallableContractFactoryE.deploy();
    await arbitraryCallableContractE.waitForDeployment();

    expect(await arbitraryCallableContractD.getMsgA()).to.be.eq('');
    expect(await arbitraryCallableContractE.getMsgA()).to.be.eq('');

    const callablesD = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractD.getAddress()]);
    const callablesE = generateMsgAEnygmaCrossTransferCallablesByAddresses([await arbitraryCallableContractE.getAddress()]);

    // Do cross transfer
    const tx = await tokenOnPLA.crossTransfer(
      [signerB.address, signerC.address, signerD.address, signerE.address, signerF.address],
      [10, 10, 10, 10, 10],
      [chainIdB, chainIdC, chainIdD, chainIdE, chainIdF],
      [[], [], callablesD, callablesE, []]
    );

    const receipt1 = await tx.wait();

    expect(receipt1?.status).to.be.equal(1);

    const expectedMsgA = 'Hello, World!';

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          try {
            return (await arbitraryCallableContractD.getMsgA()) == expectedMsgA &&
              (await arbitraryCallableContractE.getMsgA()) == expectedMsgA
              ;
          } catch (e) {
            return false;
          }
        },
        1000,
        300
      )
    ).to.be.true;

  }).timeout(10 * 60 * 1000);

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
