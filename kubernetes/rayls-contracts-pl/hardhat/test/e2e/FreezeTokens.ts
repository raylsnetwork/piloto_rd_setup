import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { Logger, LogLevel } from '../unit/utils/moca-logger'; // Adjust the path as needed
import { ArbitraryMessagesBatchTeleport, DeploymentProxyRegistry, TokenRegistryV1 } from '../../../typechain-types';
import { DeploymentStructOutput } from '../../../typechain-types/src/commitChain/DeploymentProxyRegistry/DeploymentProxyRegistry';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('E2E Tests: Arbitrary Messages (arbmsgs)', function () {
  const performanceTimesTest = 60;

  // Environment variables and constants
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlC = process.env[`RPC_URL_NODE_C`];
  const rpcUrlD = process.env[`RPC_URL_NODE_D`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];

  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const endpointAddressC = process.env[`NODE_C_ENDPOINT_ADDRESS`] as string;
  const endpointAddressD = process.env[`NODE_D_ENDPOINT_ADDRESS`] as string;

  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;
  const chainIdC = process.env[`NODE_C_CHAIN_ID`] as string;
  const chainIdD = process.env[`NODE_D_CHAIN_ID`] as string;

  // Providers
  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerC = new ethers.JsonRpcProvider(rpcUrlC);
  const providerD = new ethers.JsonRpcProvider(rpcUrlD);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);

  // Adjust polling intervals
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerC.pollingInterval = 200;
  providerD.pollingInterval = 200;

  // Wallets and signers
  let wallet = ethers.Wallet.createRandom();
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);

  // Wallets and signer
  const signerA = new hre.ethers.NonceManager(wallet.connect(providerA));
  const signerB = new hre.ethers.NonceManager(wallet.connect(providerB));
  const signerC = new hre.ethers.NonceManager(wallet.connect(providerC));
  const signerD = new hre.ethers.NonceManager(wallet.connect(providerD));
  const signerCC = new hre.ethers.NonceManager(venOperatorWallet.connect(providerCC));
  const signerCCNonOp = new hre.ethers.NonceManager(wallet.connect(providerCC));

  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;

  let deployedTokenErc20: TokenRegistryV1.TokenStructOutput;
  let deployedTokenErc721: TokenRegistryV1.TokenStructOutput;
  let deployedTokenErc1155: TokenRegistryV1.TokenStructOutput;
  let tokenRegistry: TokenRegistryV1;
  let arbitraryMessagesPlA: ArbitraryMessagesBatchTeleport;
  let arbitraryMessagesPlB: ArbitraryMessagesBatchTeleport;
  let arbitraryMessagesPlC: ArbitraryMessagesBatchTeleport;
  let deployment: DeploymentStructOutput;

  before(async function () {
    this.timeout(4 * 60 * 1000);
    logger.debug(`'before' method started`);
    logger.debug(`First deploy a token and get the token object with the resourceId...`);

    const tokenNameErc20 = `ERC20 Token to be frozen ${new Date().getTime()}`;
    const tokenNameErc721 = `ERC721 Token to be frozen ${new Date().getTime()}`;
    const tokenNameErc1155 = `ERC1155 Token to be frozen ${new Date().getTime()}`;
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress!, signerCC);
    deployment = await deploymentRegistry.getDeployment();

    tokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signerCC);

    // ERC20
    logger.info(`Deploying ERC20 Token...`);
    await hre.run('deployToken', { pl: 'A', name: tokenNameErc20 });
    await sleep(7500);
    let allTokens = await tokenRegistry.getAllTokens();
    deployedTokenErc20 = allTokens[allTokens.length - 1];

    if (deployedTokenErc20.name !== tokenNameErc20) {
      logger.error(`Warning: deployed token is not being used. Tests may still be valid.`);
    }
    logger.debug(`ERC20 Token deployed with resourceId ${deployedTokenErc20.resourceId}`);

    // ERC721
    await hre.run('deployPlaygroundErc721', { pl: 'B', name: tokenNameErc721 });
    await sleep(10000);
    allTokens = await tokenRegistry.getAllTokens();
    deployedTokenErc721 = allTokens[allTokens.length - 1];

    if (deployedTokenErc721.name !== tokenNameErc721) {
      logger.error(`Warning: deployed token is not being used. Tests may still be valid.`);
    }
    logger.debug(`ERC1155 Token deployed with resourceId ${deployedTokenErc721.resourceId}`);

    // ERC1155
    await hre.run('deployPlaygroundErc1155', { pl: 'C', name: tokenNameErc1155 });
    await sleep(10000);
    allTokens = await tokenRegistry.getAllTokens();
    deployedTokenErc1155 = allTokens[allTokens.length - 1];

    if (deployedTokenErc1155.name !== tokenNameErc1155) {
      logger.error(`Warning: deployed token is not being used. Tests may still be valid.`);
    }
    logger.debug(`ERC1155 Token deployed with resourceId ${deployedTokenErc1155.resourceId}`);

    logger.debug(`Deploy the arbitrary message batch teleport contracts...`);
    const arbitraryMessagesContractPlA = await hre.ethers.getContractFactory('ArbitraryMessagesBatchTeleport', signerA);
    arbitraryMessagesPlA = await arbitraryMessagesContractPlA.deploy(deployedTokenErc20.resourceId, endpointAddressA);
    await arbitraryMessagesPlA.waitForDeployment();
    const arbitraryMessagesContractPlB = await hre.ethers.getContractFactory('ArbitraryMessagesBatchTeleport', signerB);
    arbitraryMessagesPlB = await arbitraryMessagesContractPlB.deploy(deployedTokenErc721.resourceId, endpointAddressB);
    await arbitraryMessagesPlB.waitForDeployment();
    const arbitraryMessagesContractPlC = await hre.ethers.getContractFactory('ArbitraryMessagesBatchTeleport', signerC);
    arbitraryMessagesPlC = await arbitraryMessagesContractPlC.deploy(deployedTokenErc1155.resourceId, endpointAddressC);
    await arbitraryMessagesPlC.waitForDeployment();

    logger.debug(`'before' method ended`);
  });

  describe('Feature check', function () {
    it("Freezing ERC20 token doesn't work if non Operator", async function () {
      const tokenRegistryNonOp = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signerCCNonOp);
      const tx = await tokenRegistryNonOp.connect(signerCCNonOp).freezeToken(deployedTokenErc20.resourceId, [chainIdA], { gasLimit: 5000000 });
      await expect(tx.wait()).to.be.rejected;
    });

    it('Freeze ERC20 token for participant A and expect a revert as participant A cant use this token', async function () {
      const txFreezeErc20 = await tokenRegistry.connect(signerCC).freezeToken(deployedTokenErc20.resourceId, [+chainIdA], { gasLimit: 5000000 });
      await txFreezeErc20.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc20.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);

      try {
        await providerA.estimateGas(await arbitraryMessagesPlA.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 }));
        throw new Error(`Shouldn't get here.`);
      } catch (error: any) {
        const iface = new ethers.Interface(['error TokenIsFrozenForParticipant()']);
        const decodedError = iface.parseError(error.data);
        expect(decodedError?.name).to.equal('TokenIsFrozenForParticipant');
      }
    }).timeout(5 * 60 * 1000);

    it('Unfreeze ERC20 token for participant A and manage to send the message', async function () {
      const txUnfreezeErc20 = await tokenRegistry.unfreezeToken(deployedTokenErc20.resourceId, [chainIdA], { gasLimit: 5000000 });
      await txUnfreezeErc20.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc20.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);
      const tx = await arbitraryMessagesPlA.connect(signerA).batchTeleport([batchTeleportPayloadRequest]);
      await tx.wait();
    }).timeout(5 * 60 * 1000);

    it('Freeze ERC721 token for participant A and expect a revert as participant A cant use this token', async function () {
      const txFreezeERC721 = await tokenRegistry.freezeToken(deployedTokenErc721.resourceId, [chainIdA], { gasLimit: 5000000 });
      await txFreezeERC721.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc721.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);

      try {
        await providerA.estimateGas(await arbitraryMessagesPlA.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 }));
        throw new Error(`Shouldn't get here.`);
      } catch (error: any) {
        const iface = new ethers.Interface(['error TokenIsFrozenForParticipant()']);
        const decodedError = iface.parseError(error.data);
        expect(decodedError?.name).to.equal('TokenIsFrozenForParticipant');
      }
    }).timeout(5 * 60 * 1000);

    it('Unfreeze ERC721 token for participant A and manage to send the message', async function () {
      const txUnfreezeERC721 = await tokenRegistry.unfreezeToken(deployedTokenErc721.resourceId, [chainIdA], { gasLimit: 5000000 });
      await txUnfreezeERC721.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc721.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);
      const tx = await arbitraryMessagesPlA.connect(signerA).batchTeleport([batchTeleportPayloadRequest]);
      await tx.wait();
    }).timeout(5 * 60 * 1000);

    it('Freeze ERC1155 token for participant B and expect a revert as participant A cant use this token', async function () {
      const txFreezeERC1155 = await tokenRegistry.freezeToken(deployedTokenErc1155.resourceId, [chainIdB], { gasLimit: 5000000 });
      await txFreezeERC1155.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc1155.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);

      try {
        await providerA.estimateGas(await arbitraryMessagesPlA.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 }));
        throw new Error(`Shouldn't get here.`);
      } catch (error: any) {
        const iface = new ethers.Interface(['error TokenIsFrozenForParticipant()']);
        const decodedError = iface.parseError(error.data);
        expect(decodedError?.name).to.equal('TokenIsFrozenForParticipant');
      }
    }).timeout(5 * 60 * 1000);

    it('Unfreeze ERC1155 token for participant B and manage to send the message', async function () {
      const txUnfreezeERC1155 = await tokenRegistry.unfreezeToken(deployedTokenErc1155.resourceId, [chainIdB], { gasLimit: 5000000 });
      await txUnfreezeERC1155.wait();

      const batchTeleportPayloadRequest = {
        resourceId: deployedTokenErc1155.resourceId,
        message: 'some message',
        chainId: chainIdB
      };

      await sleep(5000);
      const tx = await arbitraryMessagesPlA.connect(signerA).batchTeleport([batchTeleportPayloadRequest]);
      await tx.wait();
    }).timeout(5 * 60 * 1000);

    it('Freeze ERC20 token for all participants, no PL can use it', async function () {
      const participantStorage = await ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress, signerCC);
      let participantChainIds = await participantStorage.getAllParticipantsChainIds();
      participantChainIds = participantChainIds.filter((item) => item !== BigInt(999));

      // Freeze for all
      const txFreezeAll = await tokenRegistry.freezeToken(deployedTokenErc20.resourceId, [...participantChainIds], { gasLimit: 5000000 });
      await txFreezeAll.wait();
      await sleep(10000);

      // Try to send to each participant
      for (let i = 0; i < participantChainIds.length; i++) {
        const batchTeleportPayloadRequest = {
          resourceId: deployedTokenErc20.resourceId,
          message: 'some message',
          chainId: participantChainIds[i]
        };
        const txA = await arbitraryMessagesPlA.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 });
        await expect(txA.wait()).to.be.rejected;
        const txB = await arbitraryMessagesPlB.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 });
        await expect(txB.wait()).to.be.rejected;
        const txC = await arbitraryMessagesPlC.batchTeleport([batchTeleportPayloadRequest], { gasLimit: 5000000 });
        await expect(txC.wait()).to.be.rejected;
      }
    }).timeout(5 * 60 * 1000);
  });

}).timeout(25 * 60 * 1000);
