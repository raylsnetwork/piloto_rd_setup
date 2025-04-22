import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { genRanHex } from '../../tasks/deployToken';
import { EndpointV1, RaylsErc1155Example, TokenRegistryV1 } from '../../../typechain-types';
import { pollCondition } from './Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Erc1155 (erc1155)', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[
    `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`
  ] as string;
  let tokenRegistryAddress = '' as string;
  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  const walletCC = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const walletRandom = ethers.Wallet.createRandom();

  const signerA = walletRandom.connect(providerA);
  const signerB = walletRandom.connect(providerB);
  const signerCC = walletCC.connect(providerCC);
  let tokenOnPLA: RaylsErc1155Example;
  let tokenOnPLB: RaylsErc1155Example;
  let tokenRegistry: TokenRegistryV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `Token ${randHex}`;
  let tokenResourceId: string;

  before(async function () {
    this.timeout(3 * 60 * 1000);
    logger.debug(`${new Date().toISOString()} --- Starting the 'before' method...`);
    try {
      // Load the Deployment Registry contract
      const deploymentRegistry = await ethers.getContractAt(
        'DeploymentProxyRegistry',
        deploymentProxyRegistryAddress,
        signerCC
      );
      const deployment = await deploymentRegistry.getDeployment();
      tokenRegistryAddress = deployment.tokenRegistryAddress;

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractFactory - RaylsErc1155Example'...[signerA=${signerA.address}]`
      );
      const TokenErc1155 = await hre.ethers.getContractFactory('RaylsErc1155Example', signerA);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`
      );
      tokenRegistry = await hre.ethers.getContractAt(
        'TokenRegistryV1',
        tokenRegistryAddress,
        signerCC
      );

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint A'...[endpointAddressA=${endpointAddressA}, signerA=${signerA.address}]`
      );
      endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint B'...[endpointAddressB=${endpointAddressB}, signerB=${signerB.address}]`
      );
      endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'TokenErc1155.deploy'...[tokenName=${tokenName}, endpointAddressA=${endpointAddressA}]`
      );
      tokenOnPLA = await TokenErc1155.deploy(
        'https://parfin-metadado-test.s3.sa-east-1.amazonaws.com',
        tokenName,
        endpointAddressA
      );

      await Promise.all([tokenOnPLA.waitForDeployment()]);
      logger.debug(`Deployer: ${signerA.address}`);
      logger.debug(`Token deployed at: ${await tokenOnPLA.getAddress()}`);
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(`${new Date().toISOString()} --- 'before' method ended.`);
  });

  it('Register Token on PL and Approve on Token Registry in CC', async function () {
    logger.debug(
      `${new Date().toISOString()} --- Starting the 'Register Token on PL and Approve on Token Registry in CC' test...`
    );
    try {
      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'submitTokenRegistration'...[tokenOnPLA=${await tokenOnPLA.getAddress()}]`
      );
      await tokenOnPLA.submitTokenRegistration(2);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting first 'pollCondition'...`);
      let resourceIdToApprove: string = '';
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

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'tokenRegistry'...[resourceIdToApprove=${resourceIdToApprove}]`
      );
      const tx = await tokenRegistry.updateStatus(resourceIdToApprove, 1, { gasLimit: 5000000 });

      logger.debug(`${new Date().toISOString()} - Calling and awaiting second 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const resourceId = await tokenOnPLA.resourceId();
            if (resourceId == '0x0000000000000000000000000000000000000000000000000000000000000000')
              return false;
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
    logger.debug(
      `${new Date().toISOString()} --- 'Register Token on PL and Approve on Token Registry in CC' test ended.`
    );
  }).timeout(5 * 60 * 1000);

  it('First Teleport: Vanilla from A to B (automatic contract deploy on B)', async function () {
    logger.debug(
      `${new Date().toISOString()} --- Starting the 'First Teleport: Vanilla from A to B (automatic contract deploy on B)' test...`
    );
    try {
      const amount = 30;

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'teleport'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, walletRandom.address=${walletRandom.address}, amount=${amount}, chainIdB=${chainIdB}]`
      );
      await tokenOnPLA.teleport(walletRandom.address, 0, amount, chainIdB, Buffer.from(''));

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const tokenBAddress = await endpointB.resourceIdToContractAddress(tokenResourceId);
            if (tokenBAddress == '0x0000000000000000000000000000000000000000') return false;
            tokenOnPLB = await hre.ethers.getContractAt(
              'RaylsErc1155Example',
              tokenBAddress,
              signerB
            );
            return true;
          },
          1000,
          300
        )
      ).to.be.true;

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}]`
      );
      expect(await tokenOnPLB.balanceOf(walletRandom.address, 0)).to.be.equal(amount);
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(
      `${new Date().toISOString()} --- 'First Teleport: Vanilla from A to B (automatic contract deploy on B)' test ended.`
    );
  }).timeout(5 * 60 * 1000);

  it('Second Teleport: Atomic from B to A', async function () {
    logger.debug(
      `${new Date().toISOString()} --- Starting the 'Second Teleport: Atomic from B to A' test...`
    );
    try {
      const amount = 30;

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting first 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}, walletRandom.address=${walletRandom.address}]`
      );
      const balanceOnBBefore = await tokenOnPLB.balanceOf(walletRandom.address, 0);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'tokenOnPLA.balanceOf'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, walletRandom.address=${walletRandom.address}]`
      );
      const balanceOnABefore = await tokenOnPLA.balanceOf(walletRandom.address, 0);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'teleportAtomic'...[walletRandom.address=${walletRandom.address}, amount=${amount}, chainIdA=${chainIdA}]`
      );
      const tx = await tokenOnPLB.teleportAtomic(
        walletRandom.address,
        0,
        amount,
        chainIdA,
        Buffer.from('')
      );

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tx.wait'...`);
      await tx.wait();

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting second 'tokenOnPLB.balanceOf'...[walletRandom.address=${walletRandom.address}]`
      );
      expect(await tokenOnPLB.balanceOf(walletRandom.address, 0)).to.be.equal(
        balanceOnBBefore - BigInt(amount)
      );

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceOnAAfter = await tokenOnPLA.balanceOf(walletRandom.address, 0);
            if (balanceOnAAfter - balanceOnABefore != BigInt(amount)) return false;
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
    logger.debug(
      `${new Date().toISOString()} --- 'Second Teleport: Atomic from B to A' test ended.`
    );
  }).timeout(5 * 60 * 1000);

  it('Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A', async function () {
    logger.debug(
      `${new Date().toISOString()} --- Starting the 'Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A' test...`
    );
    try {
      const amount = 30;
      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting first 'tokenOnPLA.balanceOf'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, walletRandom.address=${walletRandom.address}]`
      );
      const balanceOnABefore = await tokenOnPLA.balanceOf(walletRandom.address, 0);

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'tokenOnPLA.addressToFail'...`
      );
      const destinationAddressToFail = await tokenOnPLA.addressToFail();

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'teleportAtomic'...[destinationAddressToFail=${destinationAddressToFail}, amount=${amount}, chainIdB=${chainIdB}]`
      );
      const tx = await tokenOnPLA.teleportAtomic(
        destinationAddressToFail,
        0,
        amount,
        chainIdB,
        Buffer.from('')
      );

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tx.wait'...`);
      await tx.wait();

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting second 'tokenOnPLA.balanceOf'...[walletRandom.address=${walletRandom.address}]`
      );
      expect(await tokenOnPLA.balanceOf(walletRandom.address, 0)).to.not.be.equal(balanceOnABefore); // balance should be different right after push

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceOnAAfter = await tokenOnPLA.balanceOf(walletRandom.address, 0);
            if (balanceOnAAfter != balanceOnABefore) return false;
            return true;
          },
          5000,
          120
        )
      ).to.be.true;

      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}, destinationAddressToFail=${destinationAddressToFail}]`
      );
      expect(await tokenOnPLB.balanceOf(destinationAddressToFail, 0)).to.be.equal(BigInt(0));
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(
      `${new Date().toISOString()} --- 'Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A' test ended.`
    );
  }).timeout(10 * 60 * 1000);
}).timeout(30 * 60 * 1000);
