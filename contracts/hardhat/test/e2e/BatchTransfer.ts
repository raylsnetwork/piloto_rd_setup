import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { pollCondition } from './Utils';
import { genRanHex } from '../../tasks/deployToken';
import { EndpointV1, TokenRegistryV1 } from '../../../typechain-types';
import { Logger, LogLevel } from '../unit/utils/moca-logger';

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

describe('E2E Tests: Batch Transfers', function () {
  // const performanceTimesTest = 2;
  const rpcUrlA = process.env[`RPC_URL_NODE_A`];
  const rpcUrlB = process.env[`RPC_URL_NODE_B`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
  const endpointAddressB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;
  const chainIdA = process.env[`NODE_A_CHAIN_ID`] as string;
  const chainIdB = process.env[`NODE_B_CHAIN_ID`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerB = new ethers.JsonRpcProvider(rpcUrlB);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerB.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  let wallet = ethers.Wallet.createRandom();
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);

  const signerA = new hre.ethers.NonceManager(wallet.connect(providerA));
  const signerB = new hre.ethers.NonceManager(wallet.connect(providerB));
  const signerCC = venOperatorWallet.connect(providerCC);

  let endpointA: EndpointV1;
  let endpointB: EndpointV1;

  let batchTransferA: any;
  let batchTransferB: any;

  let tokenRegistry: TokenRegistryV1;

  const resourceIdA = `0x${genRanHex(64)}`;
  const resourceIdB = `0x${genRanHex(64)}`;

  before(async function () {
    this.timeout(120000);

    logger.debug(`${new Date().toISOString()} --- Starting the 'before' method...`);
    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractFactory - BatchTransfer signerA'...`);
    const batchTransferFactoryA = await hre.ethers.getContractFactory('BatchTransfer', signerA);
    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractFactory - BatchTransfer signerB'...`);
    const batchTransferFactoryB = await hre.ethers.getContractFactory('BatchTransfer', signerB);

    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint A'...[endpointAddressA=${endpointAddressA}, signerA=${await signerA.getAddress()}]`);
    endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);

    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - Endpoint B'...[endpointAddressB=${endpointAddressB}, signerB=${await signerB.getAddress()}]`);
    endpointB = await hre.ethers.getContractAt('EndpointV1', endpointAddressB, signerB);

    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'batchTransferFactoryA.connect(signerA).deploy'...[endpointAddressA=${endpointAddressA}, resourceId=${resourceIdA}]`);
    batchTransferA = await batchTransferFactoryA.connect(signerA).deploy(resourceIdA, endpointAddressA);
    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'batchTransferFactoryB.connect(signerA).deploy'...[endpointAddressA=${endpointAddressB}, resourceId=${resourceIdB}]`);
    batchTransferB = await batchTransferFactoryB.connect(signerB).deploy(resourceIdB, endpointAddressB);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    tokenRegistryAddress = deployment.tokenRegistryAddress;

    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`);
    tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);
    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'hre.ethers.getContractAt - TokenRegistry'...[tokenRegistryAddress=${tokenRegistryAddress}, signerCC=${signerCC.address}]`);
    // TODO Marcos Lobo: fix all in v1
    // tokenRegistry = await hre.ethers.getContractAt("TokenRegistryV2", tokenRegistryAddress, signerCC);

    // await abmB.waitForDeployment();
    logger.debug(`${new Date().toISOString()} - Calling and awaiting 'waitForDeployment()'...`);
    await Promise.all([batchTransferA.waitForDeployment(), batchTransferB.waitForDeployment()]);

    logger.debug(`${new Date().toISOString()} - Contracts deployed`);
  });

  describe('Arbitrary Messages', function () {
    it('Two Messages V1', async function () {
      const messageA: string = 'Message AV1';
      const messageB: string = 'Message BV1';
      logger.debug(`${new Date().toISOString()} --- Starting the 'Two Messages V1' test...`);
      await batchTransferA.send2MessagesV1(messageA, messageB, chainIdB, resourceIdB, { gasLimit: 5000000 });

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const msgA = await batchTransferB.connect(signerB).messageA();
              const msgB = await batchTransferB.connect(signerB).messageB();
              return msgA == messageA && msgB == messageB;
            } catch (e) {
              return false;
            }
          },
          200,
          300
        )
      ).to.be.true;
    }).timeout(180000);

    it('Two Messages V2', async function () {
      const messageA: string = 'Message AV2';
      const messageB: string = 'Message BV2';
      logger.debug(`${new Date().toISOString()} --- Starting the 'Two Messages V2' test...`);
      await batchTransferA.send2MessagesV2(messageA, messageB, [
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: ethers.id('')
        },
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: ethers.id('')
        }
      ]);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const msgA = await batchTransferB.connect(signerB).messageA();
              const msgB = await batchTransferB.connect(signerB).messageB();
              return msgA == messageA && msgB == messageB;
            } catch (e) {
              return false;
            }
          },
          200,
          300
        )
      ).to.be.true;
    }).timeout(180000);

    it('Two Messages V3', async function () {
      const messageA: string = 'Message AV3';
      const messageB: string = 'Message BV3';
      logger.debug(`${new Date().toISOString()} --- Starting the 'Two Messages V3' test...`);
      await batchTransferA.send2MessagesV3(messageA, messageB, [
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: ethers.id('')
        },
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: ethers.id('')
        }
      ]);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const msgA = await batchTransferB.connect(signerB).messageA();
              const msgB = await batchTransferB.connect(signerB).messageB();
              return msgA == messageA && msgB == messageB;
            } catch (e) {
              return false;
            }
          },
          200,
          300
        )
      ).to.be.true;
    }).timeout(180000);

    it('Two Messages V4', async function () {
      const messageA: string = 'Message AV4';
      const messageB: string = 'Message BV4';
      const hardhatPayloadA = ethers.id('receiveMessageA(string)').slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [messageA]).slice(2);

      const hardhatPayloadB = ethers.id('receiveMessageB(string)').slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [messageB]).slice(2);

      logger.debug(`${new Date().toISOString()} --- Starting the 'Two Messages V4' test...`);
      await batchTransferA.send2MessagesV4([
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: hardhatPayloadA
        },
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: hardhatPayloadB
        }
      ]);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const msgA = await batchTransferB.connect(signerB).messageA();
              const msgB = await batchTransferB.connect(signerB).messageB();
              return msgA == messageA && msgB == messageB;
            } catch (e) {
              return false;
            }
          },
          200,
          300
        )
      ).to.be.true;
    }).timeout(180000);

    it('Two Messages V5', async function () {
      const messageA: string = 'Message AV5';
      const messageB: string = 'Message BV5';
      const hardhatPayloadA = ethers.id('receiveMessageA(string)').slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [messageA]).slice(2);

      const hardhatPayloadB = ethers.id('receiveMessageB(string)').slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [messageB]).slice(2);

      logger.debug(`${new Date().toISOString()} --- Starting the 'Two Messages V5' test...`);
      await batchTransferA.send2MessagesV5([
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: hardhatPayloadA
        },
        {
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: hardhatPayloadB
        }
      ]);

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const msgA = await batchTransferB.connect(signerB).messageA();
              const msgB = await batchTransferB.connect(signerB).messageB();
              return msgA == messageA && msgB == messageB;
            } catch (e) {
              return false;
            }
          },
          1000,
          180
        )
      ).to.be.true;
    }).timeout(180000);

    it('Many Messages', async function () {
      const messagesAmount = 50;
      const messages = [...new Array(messagesAmount)].map(() => genRanHex(50));

      const selector = ethers.id('receiveMessage(string)').slice(0, 10);
      const payloads = messages.map((message) => selector + ethers.AbiCoder.defaultAbiCoder().encode(['string'], [message]).slice(2));

      await batchTransferA.sendManyMessages(
        payloads.map((payload) => ({
          _dstChainId: chainIdB,
          _resourceId: resourceIdB,
          _payload: payload
        }))
      );

      logger.debug(`${new Date().toISOString()} - Calling and awaiting 'pollCondition'...`);
      expect(
        await pollCondition(
          async (): Promise<boolean> => {
            try {
              const messagesPL2 = await batchTransferB.connect(signerB).getMessages();
              return JSON.stringify([...messages].sort()) === JSON.stringify([...messagesPL2].sort());
            } catch (e) {
              return false;
            }
          },
          1000,
          180
        )
      ).to.be.true;
    }).timeout(180000);

    // it("Too Many Messages", async function () {
    //   const messagesAmount = 600;
    //   const messages = [...new Array(messagesAmount)].map(() => genRanHex(50));

    //   const resourceId = `0x${genRanHex(64)}`;

    //   const selector = ethers.id("receiveMessage(string)").substring(0, 10);
    //   const payloads = messages.map((message) => selector + ethers.AbiCoder.defaultAbiCoder().encode(
    //     ["string"],
    //     [message]
    //   ).substring(2));

    //   await endpointA.connect(signerA).setMaxBatchMessages(20);
    //   const maxBatchMessages = await endpointA.getMaxBatchMessages();

    //   try {
    //     await batchTransferA.sendManyMessages(payloads.map((payload) => ({
    //       _dstChainId: chainIdB,
    //       _resourceId: resourceId,
    //       _payload: payload
    //     })));
    //   } catch (error: any) {

    //     expect(error.message).to.include('The max number of transactions allowed in a batch has been exceeded');
    //     return;
    //   }

    //   expect.fail('Expected transaction to revert with a specific error, but it did not');

    // }).timeout(180000);
  });

  // describe('ERC20 Batch Teleport', async function () {
  //   it("Two Teleports to same destination (back and forth)", async function () {
  //     const randHex = `0x${genRanHex(6)}`;
  //     const tokenName = `BatchToken ${randHex}`;
  //     const tokenSymbol = `BT_${randHex}`;

  //     const erc20BatchTeleport = await hre.ethers.getContractFactory("Erc20BatchTeleport");

  //     const erc20BatchTeleportPL1: any = await erc20BatchTeleport.connect(signerA).deploy(tokenName, tokenSymbol, endpointAddressA);
  //     await erc20BatchTeleportPL1.submitTokenRegistration(4);
  // const erc20BatchTeleportPL1: any = await erc20BatchTeleport.connect(signerA).deploy(tokenName, tokenSymbol, endpointAddressA);
  // await erc20BatchTeleportPL1.submitTokenRegistration(0);

  //     await Promise.all([erc20BatchTeleportPL1.waitForDeployment()]);
  //     let erc20BatchTeleportPL2: any;

  //     let resourceId: string = "";
  //     logger.debug(`${(new Date()).toISOString()} - Calling and awaiting first 'pollCondition'...`);
  //     expect(await pollCondition(async (): Promise<boolean> => {
  //       const allTokens = await tokenRegistry.getAllTokens();
  //       const tokenOnCC = allTokens.find(x => x.name == tokenName);
  //       if (!tokenOnCC) return false;
  //       resourceId = tokenOnCC.resourceId;
  //       return true;
  //     }, 1000, 300)).to.be.true;

  //     logger.debug(`${(new Date()).toISOString()} - Calling and awaiting 'tokenRegistry'...[resourceId=${resourceId}]`);
  //     await tokenRegistry.updateStatus(resourceId, 1, { gasLimit: 5000000 });

  //     await erc20BatchTeleportPL1.batchTeleport([
  //       {
  //         to: signerB,
  //         value: 100,
  //         chainId: chainIdB
  //       },
  //       {
  //         to: signerB,
  //         value: 200,
  //         chainId: chainIdB
  //       }
  //     ]);

  //     logger.debug(`${(new Date()).toISOString()} - Calling and awaiting second 'pollCondition'...`);
  //     expect(await pollCondition(async (): Promise<boolean> => {
  //       const erc20BatchTeleportBAddress = await endpointB.resourceIdToContractAddress(resourceId);
  //       if (erc20BatchTeleportBAddress == "0x0000000000000000000000000000000000000000") return false;
  //       erc20BatchTeleportPL2 = await hre.ethers.getContractAt("Erc20BatchTeleport", erc20BatchTeleportBAddress, signerB);
  //       return true;
  //     }, 1000, 300)).to.be.true;

  //     expect(await endpointA.getAddressByResourceId(resourceId)).to.be.equal(
  //       await erc20BatchTeleportPL1.getAddress(),
  //     );
  //     expect(await endpointB.getAddressByResourceId(resourceId)).to.be.equal(
  //       await erc20BatchTeleportPL2.getAddress(),
  //     );
  //     expect(await erc20BatchTeleportPL1.name()).to.be.equal(await erc20BatchTeleportPL2.name());
  //     expect(await erc20BatchTeleportPL1.symbol()).to.be.equal(await erc20BatchTeleportPL2.symbol());
  //     expect(await erc20BatchTeleportPL2.balanceOf(signerB)).to.be.equal(300);

  //     await erc20BatchTeleportPL2
  //       .connect(signerB)
  //       .batchTeleport([
  //         {
  //           to: signerA,
  //           value: 100,
  //           chainId: chainIdA
  //         },
  //         {
  //           to: signerA,
  //           value: 200,
  //           chainId: chainIdA
  //         }
  //       ]);

  //     expect(await erc20BatchTeleportPL1.balanceOf(signerA)).to.be.equal(1000000);
  //     expect(await erc20BatchTeleportPL2.balanceOf(signerB)).to.be.equal(0n);
  //   }).timeout(180000);
  // });
}).timeout(36000000);
