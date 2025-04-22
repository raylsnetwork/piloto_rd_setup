import { expect } from 'chai';
import hre, { ethers, upgrades } from 'hardhat';
import { EndpointV1, ParticipantStorageV1, TokenExample, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition } from './Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Erc20 (erc20)', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;
  let participantStorageAddress = '' as string;
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
      tokenRegistryAddress = deployment.tokenRegistryAddress;
      participantStorageAddress = deployment.participantStorageAddress;

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractFactory - TokenExample'...[signerA=${signerA.address}]`);
      const TokenErc20 = await hre.ethers.getContractFactory('TokenExample', signerA);
      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`);

      // TODO Marcos Lobo: fix all in v1
      // tokenRegistry = await hre.ethers.getContractAt("TokenRegistryV2", tokenRegistryAddress, signerCC);
      // logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`);

      tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);
      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - ParticipantStorage'...[participantStorageAddress=${participantStorageAddress}, signerCC=${signerCC.address}]`
      );

      // TODO Marcos Lobo: fix all in v1
      // participantStorage = await hre.ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', participantStorageAddress, signerCC,);
      // logger.debug(
      //   `${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - ParticipantStorage'...[participantStorageAddress=${participantStorageAddress}, signerCC=${signerCC.address}]`
      // );
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

  it('Register Token on PL and Approve on Token Registry in CC', async function () {
    logger.debug(`${new Date().toISOString()} --- Starting the 'Register Token on PL and Approve on Token Registry in CC' test...`);
    try {
      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'submitTokenRegistration'...[tokenOnPLA=${await tokenOnPLA.getAddress()}]`);
      await tokenOnPLA.submitTokenRegistration(2);
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

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenRegistry'...[resourceIdToApprove=${resourceIdToApprove}]`);
      const tx = await tokenRegistry.updateStatus(resourceIdToApprove, 1, { gasLimit: 5000000 });

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
      const amount = 30;
      logger.debug(
        `${new Date().toISOString()} - Calling and awaiting 'teleport'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, signerA.address=${signerA.address}, amount=${amount}, chainIdB=${chainIdB}]`
      );
      await tokenOnPLA.teleport(signerA.address, amount, chainIdB);

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
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(`${new Date().toISOString()} --- 'First Teleport: Vanilla from A to B (automatic contract deploy on B)' test ended.`);
  }).timeout(5 * 60 * 1000);

  // it('Upgrade: Upgrade Teleport to V2Example', async function () {
  //   const currentVersionFactory = await ethers.getContractFactory('TeleportV1');
  //   const currentVersion = await ethers.getContractAt('TeleportV1', teleportAddress);

  //   const nextVersionFactory = await ethers.getContractFactory('TeleportV2Example');

  //   logger.debug('Upgrading Teleport...');

  //   await upgrades.forceImport(process.env.RAYLS_TELEPORT_PROXY!, currentVersionFactory);
  //   await upgrades.upgradeProxy(currentVersion, nextVersionFactory);

  //   const upgradedTeleport = await hre.ethers.getContractAt('TeleportV2Example', teleportAddress, signerCC);

  //   logger.debug('Teleport upgraded successfully');

  //   expect(
  //     await pollCondition(
  //       async (): Promise<boolean> => {
  //         const version = await upgradedTeleport.contractVersion();
  //         if (BigInt(version) !== BigInt(2)) return false;
  //         return true;
  //       },
  //       5000,
  //       120
  //     )
  //   ).to.be.true;
  // }).timeout(30 * 60 * 1000);

  it('Second Teleport: Atomic from B to A', async function () {
    logger.debug(`${new Date().toISOString()} --- Starting the 'Second Teleport: Atomic from B to A' test...`);
    try {
      const amount = 30;
      logger.debug(`${new Date().toISOString()} - Calling and awaiting first 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}, signerA.address=${signerA.address}]`);
      const balanceOnBBefore = await tokenOnPLB.balanceOf(signerA.address);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenOnPLA.balanceOf'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, signerA.address=${signerA.address}]`);
      const balanceOnABefore = await tokenOnPLA.balanceOf(signerA.address);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'teleportAtomic'...[signerA.address=${signerA.address}, amount=${amount}, chainIdA=${chainIdA}]`);
      const tx = await tokenOnPLB.teleportAtomic(signerA.address, amount, chainIdA);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tx.wait'...`);
      await tx.wait();

      logger.debug(`${new Date().toISOString()} - Calling and awaiting second 'tokenOnPLB.balanceOf'...[signerA.address=${signerA.address}]`);
      expect(await tokenOnPLB.balanceOf(signerA.address)).to.be.equal(balanceOnBBefore - BigInt(amount));

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceOnAAfter = await tokenOnPLA.balanceOf(signerA.address);
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
    logger.debug(`${new Date().toISOString()} --- 'Second Teleport: Atomic from B to A' test ended.`);
  }).timeout(5 * 60 * 1000);

  it('Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A', async function () {
    logger.debug(`${new Date().toISOString()} --- Starting the 'Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A' test...`);
    try {
      const amount = 30;
      logger.debug(`${new Date().toISOString()} - Calling and awaiting first 'tokenOnPLA.balanceOf'...[tokenOnPLA=${await tokenOnPLA.getAddress()}, signerA.address=${signerA.address}]`);
      const balanceOnABefore = await tokenOnPLA.balanceOf(signerA.address);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenOnPLA.addressToFail'...`);
      const destinationAddressToFail = await tokenOnPLA.addressToFail();

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'teleportAtomic'...[destinationAddressToFail=${destinationAddressToFail}, amount=${amount}, chainIdB=${chainIdB}]`);
      const tx = await tokenOnPLA.teleportAtomic(destinationAddressToFail, amount, chainIdB);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tx.wait'...`);
      await tx.wait();

      logger.debug(`${new Date().toISOString()} - Calling and awaiting second 'tokenOnPLA.balanceOf'...[signerA.address=${signerA.address}]`);
      expect(await tokenOnPLA.balanceOf(signerA.address)).to.not.be.equal(balanceOnABefore); // balance should be different right after push

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            const balanceOnAAfter = await tokenOnPLA.balanceOf(signerA.address);
            if (balanceOnAAfter != balanceOnABefore) return false;
            return true;
          },
          5000,
          120
        )
      ).to.be.true;

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'tokenOnPLB.balanceOf'...[tokenOnPLB=${await tokenOnPLB.getAddress()}, destinationAddressToFail=${destinationAddressToFail}]`);
      expect(await tokenOnPLB.balanceOf(destinationAddressToFail)).to.be.equal(BigInt(0));
    } catch (error) {
      logger.error(`${new Date().toISOString()} - ERROR: ${error}`);
      // this will prevent the test to be successful
      throw error;
    }
    logger.debug(`${new Date().toISOString()} --- 'Third Teleport: Atomic from A to B, should fail when reach B and should mint the balance back on A' test ended.`);
  }).timeout(10 * 60 * 1000);

  it('Forth Teleport: Vanilla and Atomic as a 3rd Party from A to B (automatic contract deploy on B)', async function () {
    const amount = 30n;
    const balanceOnABefore = await tokenOnPLA.balanceOf(wallet1);
    const approvalOnPLA = await tokenOnPLA.approve(wallet2, amount);
    await approvalOnPLA.wait();

    await tokenOnPLA.connect(signer2A).teleportFrom(wallet1, wallet2, amount, chainIdB);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const balanceOnAAfter = await tokenOnPLA.balanceOf(wallet1);
          const wallet2Balance = await tokenOnPLB.balanceOf(wallet2);

          if (balanceOnABefore === balanceOnAAfter || wallet2Balance === 0n) return false;
          return true;
        },
        1000,
        300
      )
    ).to.be.true;

    expect(await tokenOnPLB.balanceOf(wallet2)).to.be.equal(amount);

    const approvalOnPLB = await tokenOnPLB.connect(signer2B).approve(signerB, amount);
    await approvalOnPLB.wait();

    const balanceOnBBefore = await tokenOnPLB.balanceOf(wallet2);

    await tokenOnPLB.connect(signerB).teleportAtomicFrom(signer2B, signerB, amount, chainIdA);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const balanceOnAAfter = await tokenOnPLA.balanceOf(wallet1);
          const balanceOnBAfter = await tokenOnPLB.balanceOf(wallet2);

          if (balanceOnBBefore === balanceOnBAfter || balanceOnAAfter !== balanceOnABefore) return false;
          return true;
        },
        2000,
        300
      )
    ).to.be.true;

    expect(await tokenOnPLA.balanceOf(wallet1)).to.be.equal(balanceOnABefore);
  }).timeout(180000);

  // TODO Marcos Lobo: this was marked as skip?

  it('No Teleport: Atomic from A to D, but D is FROZEN (should revert)', async function () {
    const amount = 30;
    const balanceOnABefore = await tokenOnPLA.balanceOf(signerA.address);
    // Freeze D
    const freezeTx = await participantStorage.updateStatus(chainIdD, 3);
    await freezeTx.wait(10);

    const tx = tokenOnPLA.teleportAtomic(signerB.address, amount, chainIdD);

    await expect(tx).to.be.revertedWith('Participant not in an active status');

    expect(await tokenOnPLA.balanceOf(signerA.address)).to.be.equal(balanceOnABefore);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const balanceOnAAfter = await tokenOnPLA.balanceOf(signerA.address);
          if (balanceOnAAfter != balanceOnABefore) return false;
          return true;
        },
        1000,
        300
      )
    ).to.be.true;

    // Unfreeze
    const unfreezeTx = await participantStorage.updateStatus(chainIdD, 1);
  }).timeout(180000);

  // it('Downgrade: Downgrade Teleport to V1', async function () {
  //   const currentVersionFactory = await ethers.getContractFactory('TeleportV2Example');
  //   const currentVersion = await ethers.getContractAt('TeleportV2Example', teleportAddress);
  //   const nextVersionFactory = await ethers.getContractFactory('TeleportV1');

  //   await upgrades.forceImport(process.env.RAYLS_TELEPORT_PROXY!, currentVersionFactory);
  //   await upgrades.upgradeProxy(currentVersion, nextVersionFactory);

  //   const upgradedTeleport = await hre.ethers.getContractAt('TeleportV1', teleportAddress, signerCC);

  //   expect(
  //     await pollCondition(
  //       async (): Promise<boolean> => {
  //         const version = await upgradedTeleport.contractVersion();
  //         if (BigInt(version) !== BigInt(1)) return false;
  //         return true;
  //       },
  //       5000,
  //       120
  //     )
  //   ).to.be.true;
  // }).timeout(30 * 60 * 1000);
});
