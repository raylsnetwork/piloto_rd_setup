import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { genRanHex } from '../../tasks/deployToken';
import { EndpointV1, ParticipantStorageV1, TokenExample, TokenRegistryV1 } from '../../../typechain-types';
import { pollCondition } from './Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Faulty Erc20 for flagged transaction', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  let participantStorageAddress = '' as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const wallet1 = ethers.Wallet.createRandom();

  const signerA = wallet1.connect(providerA);
  const signerB = wallet1.connect(providerB);
  const signerCC = venOperatorWallet.connect(providerCC);

  let tokenOnPLA: TokenExample;
  let tokenOnPLB: TokenExample;
  let tokenRegistry: TokenRegistryV1;
  let participantStorage: ParticipantStorageV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `Token ${randHex}`;
  const tokenSymbol = `T_${randHex}`;
  let tokenResourceId: string;

  before(async function () {
    this.timeout(3 * 60 * 1000);
    logger.debug(`${new Date().toISOString()} --- Starting the 'before' method...`);
    try {
      const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress!, signerCC);
      const deployment = await deploymentRegistry.getDeployment();
      participantStorageAddress = deployment.participantStorageAddress;
      tokenRegistryAddress = deployment.tokenRegistryAddress;

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractFactory - TokenExample'...[signerA=${signerA.address}]`);
      const TokenErc20 = await hre.ethers.getContractFactory('TokenExample', signerA);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`);
      tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - ParticipantStorage'...[participantStorageAddress=${participantStorageAddress}, signerCC=${signerCC.address}]`
      );
      participantStorage = await hre.ethers.getContractAt('ParticipantStorageV1', participantStorageAddress, signerCC);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint A'...[endpointAddressA=${endpointAddressA}, signerA=${signerA.address}]`);
      endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint B'...[endpointAddressB=${endpointAddressB}, signerB=${signerB.address}]`);
      endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'TokenErc20.deploy'...[tokenName=${tokenName}, tokenSymbol=${tokenSymbol}, endpointAddressA=${endpointAddressA}]`);
      tokenOnPLA = await TokenErc20.deploy(tokenName, tokenSymbol, endpointAddressA);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'Promise.all([tokenOnPLA.waitForDeployment()]'...`);
      await Promise.all([tokenOnPLA.waitForDeployment()]);
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(`${new Date().toISOString()} --- 'before' method ended.`);
  });

  it("Register Token on PL & mint more (won't be tracked by the Ven) and Approve on Token Registry in CC", async function () {
    logger.debug(`${new Date().toISOString()} --- Starting the 'Register Token on PL and Approve on Token Registry in CC' test...`);
    try {
      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'submitTokenRegistration'...[tokenOnPLA=${await tokenOnPLA.getAddress()}]`);
      await tokenOnPLA.submitTokenRegistration(0);
      let resourceIdToApprove: string = '';
      logger.debug(`${new Date().toISOString()} - Calling and awaiting first 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const allTokens = await tokenRegistry.getAllTokens();
            const tokenOnCC = allTokens.find((x) => x.name == tokenName);
            if (!tokenOnCC) return false;
            resourceIdToApprove = tokenOnCC.resourceId;
            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      logger.debug(`${new Date().toISOString()} - Minting more tokens before approving...[signerA.address=${signerA.address}]`);
      await tokenOnPLA.mint(signerA.address, 2000000).then((tx) => tx.wait());

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenRegistry'...[resourceIdToApprove=${resourceIdToApprove}]`);
      const tx = await tokenRegistry.updateStatus(resourceIdToApprove, 1, { gasLimit: 5000000 });
      await tx.wait();

      logger.debug(`${new Date().toISOString()} - Calling and awaiting second 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const resourceId = await tokenOnPLA.resourceId();
            if (resourceId == '0x0000000000000000000000000000000000000000000000000000000000000000') return false;
            tokenResourceId = resourceId;
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
    logger.debug(`${new Date().toISOString()} --- 'Register Token on PL and Approve on Token Registry in CC' test ended.`);
  }).timeout(5 * 60 * 1000);

  it('First Teleport: Vanilla from A to B (automatic contract deploy on B)', async function () {
    logger.debug(`${new Date().toISOString()} --- Starting the 'First Teleport: Vanilla from A to B (automatic contract deploy on B)' test...`);
    try {
      const amount = await tokenOnPLA.totalSupply();
      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'teleport'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, signerA.address=${signerA.address}, amount=${amount}, chainIdB=${chainIdB}]`
      );
      const teleportTx = await tokenOnPLA.teleport(signerA.address, amount, chainIdB);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const tokenBAddress = await endpointB.resourceIdToContractAddress(tokenResourceId);
            if (tokenBAddress == '0x0000000000000000000000000000000000000000') return false;
            tokenOnPLB = await hre.ethers.getContractAt('TokenExample', tokenBAddress, signerB);
            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}]`);
      expect(await tokenOnPLB.balanceOf(signerA.address)).to.be.equal(amount);

      logger.debug(`Transaction should be flagged: "${teleportTx.hash}"`);
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(`${new Date().toISOString()} --- 'First Teleport: Vanilla from A to B (automatic contract deploy on B)' test ended.`);
  }).timeout(5 * 60 * 1000);
}).timeout(30 * 60 * 1000);
