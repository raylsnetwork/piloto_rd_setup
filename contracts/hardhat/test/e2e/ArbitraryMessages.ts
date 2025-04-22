import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { genRanHex } from '../../tasks/deployToken';
import { ArbitraryMessage } from '../../../typechain-types';
import { ContractTransactionResponse } from 'ethers';
import { pollCondition } from './Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger'; // Adjust the path as needed

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Arbitrary Messages (arbmsgs)', function () {
  const performanceTimesTest = 60;

  // Environment variables and constants
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlC = process.env[`RPC_URL_NODE_C`];
  const rpcUrlD = process.env[`RPC_URL_NODE_D`];

  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const endpointAddressC = process.env[`NODE_C_ENDPOINT_ADDRESS`] as string;
  const endpointAddressD = process.env[`NODE_D_ENDPOINT_ADDRESS`] as string;

  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;
  const chainIdC = process.env[`NODE_C_CHAIN_ID`] as string;
  const chainIdD = process.env[`NODE_D_CHAIN_ID`] as string;

  const messageA: string = 'Message A';
  const messageB: string = 'Message B';
  const messageC: string = 'Message C';
  const messageD: string = 'Message D';

  // Providers
  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerC = new ethers.JsonRpcProvider(rpcUrlC);
  const providerD = new ethers.JsonRpcProvider(rpcUrlD);

  // Adjust polling intervals
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerC.pollingInterval = 200;
  providerD.pollingInterval = 200;

  // Wallets and signers
  let wallet = ethers.Wallet.createRandom();

  // Wallets and signer
  const signerA = new hre.ethers.NonceManager(wallet.connect(providerA));
  const signerB = new hre.ethers.NonceManager(wallet.connect(providerB));
  const signerC = new hre.ethers.NonceManager(wallet.connect(providerC));
  const signerD = new hre.ethers.NonceManager(wallet.connect(providerD));

  let arbitraryMessageA: ArbitraryMessage & {
    deploymentTransaction(): ContractTransactionResponse;
  };
  let arbitraryMessageB: ArbitraryMessage & {
    deploymentTransaction(): ContractTransactionResponse;
  };
  let arbitraryMessageC: ArbitraryMessage & {
    deploymentTransaction(): ContractTransactionResponse;
  };
  let arbitraryMessageD: ArbitraryMessage & {
    deploymentTransaction(): ContractTransactionResponse;
  };

  before(async function () {
    this.timeout(4 * 60 * 1000);
    logger.debug(`Starting the 'before' method...`);
    try {
      const resourceId = `0x${genRanHex(64)}`;

      // ArbitraryMessage signerA
      logger.debug(`hre.ethers.getContractFactory - ArbitraryMessage signerA`);
      const arbitraryMessageFactoryA = await hre.ethers.getContractFactory('ArbitraryMessage', signerA);

      // ArbitraryMessage signerB
      logger.debug(`hre.ethers.getContractFactory - ArbitraryMessage signerB`);
      const arbitraryMessageFactoryB = await hre.ethers.getContractFactory('ArbitraryMessage', signerB);

      // ArbitraryMessageA.connect(signerA).deploy
      logger.debug(`arbitraryMessageA.connect(signerA).deploy -[endpointAddressA=${endpointAddressA}, resourceId=${resourceId}]`);
      arbitraryMessageA = await arbitraryMessageFactoryA.connect(signerA).deploy(resourceId, endpointAddressA);

      // ArbitraryMessageB.connect(signerB).deploy
      logger.debug(`arbitraryMessageB.connect(signerB).deploy -[endpointAddressB=${endpointAddressB}, resourceId=${resourceId}]`);
      arbitraryMessageB = await arbitraryMessageFactoryB.connect(signerB).deploy(resourceId, endpointAddressB);

      // ArbitraryMessage signerC
      logger.debug(`hre.ethers.getContractFactory - ArbitraryMessage signerC`);
      const arbitraryMessageFactoryC = await hre.ethers.getContractFactory('ArbitraryMessage', signerC);

      // ArbitraryMessageC.connect(signerC).deploy
      logger.debug(`arbitraryMessageC.connect(signerC).deploy -[endpointAddressC=${endpointAddressC}, resourceId=${resourceId}]`);
      arbitraryMessageC = await arbitraryMessageFactoryC.connect(signerC).deploy(resourceId, endpointAddressC);

      // ArbitraryMessage signerD
      logger.debug(`hre.ethers.getContractFactory - ArbitraryMessage signerD'`);
      const arbitraryMessageFactoryD = await hre.ethers.getContractFactory('ArbitraryMessage', signerD);

      // ArbitraryMessageA.connect(signerD).deploy
      logger.debug(`arbitraryMessageD.connect(signerD).deploy - [endpointAddressD=${endpointAddressD}, resourceId=${resourceId}]`);
      arbitraryMessageD = await arbitraryMessageFactoryD.connect(signerD).deploy(resourceId, endpointAddressD);

      // Contracts deployment
      logger.debug(`arbitraryMessageA.waitForDeployment()`);
      await arbitraryMessageA.waitForDeployment();

      logger.debug(`arbitraryMessageB.waitForDeployment()`);
      await arbitraryMessageB.waitForDeployment();

      logger.debug(`arbitraryMessageC.waitForDeployment()`);
      await arbitraryMessageC.waitForDeployment();

      logger.debug(`arbitraryMessageD.waitForDeployment()`);
      await arbitraryMessageD.waitForDeployment();
      logger.debug(`Contracts deployed`);
    } catch (error) {
      logger.error(`ERROR: ${error}`);

      throw error;
    }

    logger.debug(`'before' method ended`);
  });

  describe('Feature check', function () {
    it('1 message in tx', async function () {
      logger.debug(`${new Date().toISOString()} --- Starting the '1 message in tx' test...`);
      try {
        logger.debug(`${new Date().toISOString()} - Calling and awaiting 'abmA.connect'...[signerA=${await signerA.getAddress()}, messageA=${messageA}, chainIdB=${chainIdB}]`);
        const tx = await arbitraryMessageA.connect(signerA).send1Message(messageA, chainIdB, { gasLimit: 5000000 });
        logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              try {
                const msgA = await arbitraryMessageB.connect(signerB).msgA();
                return msgA == messageA;
              } catch (e) {
                return false;
              }
            },
            1000,
            300
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
        // this will prevent the test to be successful
        throw error;
      }
      logger.debug(`${new Date().toISOString()} --- '1 message in tx' test ended.`);
    }).timeout(5 * 60 * 1000);

    it('3 messages in tx', async function () {
      logger.debug(`${new Date().toISOString()} --- Starting the '3 messages in tx' test...`);

      try {
        logger.debug(
          `${new Date().toISOString()} - Calling and awaiting 'arbitraryMessageA.connect'...[signerA=${await signerA.getAddress()}, messageB=${messageB}, messageC=${messageC}, messageD=${messageD}, chainIdB=${chainIdB}]`
        );
        const tx = await arbitraryMessageA.connect(signerA).send3Messages(messageB, messageC, messageD, chainIdB, { gasLimit: 5000000 });
        logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              const msgB = await arbitraryMessageB.connect(signerB).msgB();
              if (msgB != messageB) return false;

              const msgC = await arbitraryMessageB.connect(signerB).msgC();
              if (msgC != messageC) return false;

              const msgD = await arbitraryMessageB.connect(signerB).msgD();
              if (msgD != messageD) return false;

              return true;
            },
            1000,
            300
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
        // this will prevent the test to be successful
        throw error;
      }

      logger.debug(`${new Date().toISOString()} --- '3 message in tx' test ended.`);
    }).timeout(5 * 60 * 1000);

    it('Sending multiple messages in a transaction to different ChainIds', async function () {
      logger.setTestContext(this);
      logger.debug(`arbitraryMessageA.connect -[signerA=${await signerA.getAddress()},
       messageB=${messageB}, messageC=${messageC}, messageD=${messageD}, chainIdB=${chainIdB}]`);

      try {
        logger.debug(`arbitraryMessageA.connect -[signerA=${await signerA.getAddress()},
        messageB=${messageB}, messageC=${messageC}, messageD=${messageD}, chainIdB=${chainIdB}]`);

        // Sending multiple messages to different ChainIds
        const tx = await arbitraryMessageA.connect(signerA).send3MessagesToDifferentChainIds(messageB, messageC, messageD, chainIdB, chainIdC, chainIdD, { gasLimit: 5000000 });

        // Await pollCondition
        logger.debug(`Calling and awaiting - pollCondition:`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              const msgB = await arbitraryMessageB.connect(signerB).msgB();
              if (msgB != messageB) return false;

              const msgC = await arbitraryMessageC.connect(signerC).msgC();
              if (msgC != messageC) return false;

              const msgD = await arbitraryMessageD.connect(signerD).msgD();
              if (msgD != messageD) return false;

              return true;
            },
            1000,
            300
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`ERROR: ${error}`);
        throw error;
      }
      logger.debug(`Multiple messages were sent to different ChainIds`);
    }).timeout(5 * 60 * 1000);

    it('Sends message to multiple participants', async function () {
      const messageForMultiple = 'This is a message for multiple participants';
      const chainIds = [chainIdB, chainIdC, chainIdD];

      logger.debug(`Sending message: ${messageForMultiple} to chain IDs: ${chainIds}`);

      try {
        const tx = await arbitraryMessageA.connect(signerA).sendToMultipleParticipants(messageForMultiple, chainIds, { gasLimit: 5000000 });
        // Await pollCondition
        logger.debug(`Calling and awaiting - pollCondition:`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              const msgB = await arbitraryMessageB.connect(signerB).multiple();
              if (msgB != messageForMultiple) return false;

              const msgC = await arbitraryMessageC.connect(signerC).multiple();
              if (msgC != messageForMultiple) return false;

              const msgD = await arbitraryMessageD.connect(signerD).multiple();
              if (msgD != messageForMultiple) return false;

              return true;
            },
            1000,
            300
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`ERROR: ${error}`);
        throw error;
      }
      logger.info(`Message sent to multiple participants`);
    }).timeout(5 * 60 * 1000);

    it('Sends message to all participants', async function () {
      const messageForAll = 'This is a message for all participants';

      logger.debug(`Sending message to all participants`);

      try {
        const tx = await arbitraryMessageA.connect(signerA).sendToAllParticipants(messageForAll, { gasLimit: 5000000 });
        // Await pollCondition
        logger.debug(`Calling and awaiting - pollCondition:`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              const msgB = await arbitraryMessageB.connect(signerB).all();
              if (msgB != messageForAll) return false;

              const msgC = await arbitraryMessageC.connect(signerC).all();
              if (msgC != messageForAll) return false;

              const msgD = await arbitraryMessageD.connect(signerD).all();
              if (msgD != messageForAll) return false;

              return true;
            },
            1000,
            300
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`ERROR: ${error}`);
        throw error;
      }
      logger.info(`Message sent to multiple participants`);
    }).timeout(5 * 60 * 1000);
  });

  describe('Performance check', function () {
    it(`${performanceTimesTest} messages in ${performanceTimesTest} txs`, async function () {
      logger.debug(`${new Date().toISOString()} --- Starting the 'Performance check - ${performanceTimesTest} messages in ${performanceTimesTest} txs' test...`);
      try {
        logger.debug(`${new Date().toISOString()} - Calling ' arbitraryMessageA.connect' ${performanceTimesTest} times ...`);
        for (let i = 0; i < performanceTimesTest; i++) {
          arbitraryMessageA.connect(signerA).send1IncreaseCount(chainIdB, { gasLimit: 5000000 });
        }
        logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
        expect(
          await pollCondition(
            async (): Promise<boolean> => {
              const count = await arbitraryMessageB.connect(signerB).count();
              return count == BigInt(performanceTimesTest);
            },
            10000,
            3000
          )
        ).to.be.true;
      } catch (error) {
        logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
        // this will prevent the test to be successful
        throw error;
      }
      logger.debug(`${new Date().toISOString()} --- Ended 'Performance check - ${performanceTimesTest} messages in ${performanceTimesTest} txs' test.`);
    }).timeout(10 * 60 * 1000);
  });
}).timeout(25 * 60 * 1000);
