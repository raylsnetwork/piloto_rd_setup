import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { EndpointV1, RaylsErc721Example, TokenRegistryV1 } from '../../../typechain-types';
import { genRanHex } from '../../tasks/deployToken';
import { pollCondition } from './Utils';
import { Logger, LogLevel } from '../unit/utils/moca-logger';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Erc721', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
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

  const wallet1 = ethers.Wallet.createRandom();
  const wallet2 = ethers.Wallet.createRandom();

  const signerA = wallet1.connect(providerA);
  const signerB = wallet1.connect(providerB);
  const signerCC = walletCC.connect(providerCC);

  let tokenOnPLA: RaylsErc721Example;
  let tokenOnPLB: RaylsErc721Example;
  let tokenRegistry: TokenRegistryV1;
  let endpointA: EndpointV1;
  let endpointB: EndpointV1;
  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `721Token_${randHex}`;
  let tokenResourceId: string;

  before(async function () {
    const TokenErc721 = await hre.ethers.getContractFactory('RaylsErc721Example', signerA);

    // TODO Marcos Lobo: fix all in v1
    // tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV2', tokenRegistryAddress, signerCC);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    tokenRegistryAddress = deployment.tokenRegistryAddress;

    tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);
    endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);
    endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);
    tokenOnPLA = await TokenErc721.deploy('https://parfin-metadado-test.s3.sa-east-1.amazonaws.com', tokenName, tokenName, endpointAddressA);
    await Promise.all([tokenOnPLA.waitForDeployment()]);
    // console log the deployer and the contract addres
    logger.debug(`Deployer: ${wallet1.address}`);
    logger.debug(`Token deployed at: ${await tokenOnPLA.getAddress()}`);
  });

  it('Register Token on PL and Approve on Token Registry in CC', async function () {
    await tokenOnPLA.submitTokenRegistration(4).then((tx: any) => tx.wait());
    let resourceIdToApprove: string = '';

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const allTokens = await tokenRegistry.getAllTokens();
          const tokenOnCC = allTokens.find((x: any) => x.name == tokenName);

          if (!tokenOnCC) return false;

          resourceIdToApprove = tokenOnCC.resourceId;
          return true;
        },
        1500,
        300
      )
    ).to.be.true;
    const tx = await tokenRegistry.updateStatus(resourceIdToApprove, 1, {
      gasLimit: 5000000
    });

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
  }).timeout(180000);

  it('First Teleport: Vanilla from A to B (automatic contract deploy on B)', async function () {
    await tokenOnPLA.teleport(wallet1.address, 0, chainIdB);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const tokenBAddress = await endpointB.resourceIdToContractAddress(tokenResourceId);
          if (tokenBAddress == '0x0000000000000000000000000000000000000000') return false;
          tokenOnPLB = await hre.ethers.getContractAt('RaylsErc721Example', tokenBAddress, signerB);
          return true;
        },
        1000,
        300
      )
    ).to.be.true;

    expect(await tokenOnPLB.balanceOf(wallet1.address)).to.be.equal(1);
  }).timeout(180000);

  it('Second Teleport: Atomic from B to A', async function () {
    const balanceOnABefore = await tokenOnPLA.balanceOf(wallet1.address);
    const tx = await tokenOnPLB.teleportAtomic(wallet1.address, 0, chainIdA);
    await tx.wait();
    expect(await tokenOnPLB.balanceOf(wallet1.address)).to.be.equal(0);

    expect(
      await pollCondition(
        async (): Promise<boolean> => {
          const balanceOnAAfter = await tokenOnPLA.balanceOf(wallet1.address);
          return balanceOnAAfter === balanceOnABefore + BigInt(1);
        },
        1000,
        300
      )
    ).to.be.true;
  }).timeout(180000);
}).timeout(900000);
