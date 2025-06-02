import {
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';
import hre, { ethers } from "hardhat";
import { genRanHex } from '../../tasks/deployToken';
import { mockRelayerEthersLastTransaction, mockRelayerEthersLastTransactionBatch } from './utils/RelayerMockEthers';
import { expect } from 'chai';
import { registerToken } from './TokenRegistryV1';


describe('Batch Transfers', async function () {
  describe('Arbitrary Messages', async function () {
    it("Two Messages V1", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messageA = "V1 A";
      const messageB = "V1 B";
  
      const resourceIdA = `0x${genRanHex(64)}`;
      const resourceIdB = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceIdA, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceIdB, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      await batchTransferPL1.send2MessagesV1(messageA, messageB, chainIdPL2, resourceIdB);
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await batchTransferPL2.messageA()).to.be.equal(messageA);
      expect(await batchTransferPL2.messageB()).to.be.equal(messageB);
    }).timeout(180000);

    it("Two Messages V2", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messageA = "V2 A";
      const messageB = "V2 B";
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      await batchTransferPL1.send2MessagesV2(
        messageA,
        messageB,
        [
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: ethers.id("")
          },
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: ethers.id("")
          },
        ]
      );

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await batchTransferPL2.messageA()).to.be.equal(messageA);
      expect(await batchTransferPL2.messageB()).to.be.equal(messageB);
    }).timeout(180000);

    it("Two Messages V3", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messageA = "V3 A";
      const messageB = "V3 B";
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      await batchTransferPL1.send2MessagesV3(
        messageA,
        messageB,
        [
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: ethers.id("")
          },
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: ethers.id("")
          },
        ]
      );

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await batchTransferPL2.messageA()).to.be.equal(messageA);
      expect(await batchTransferPL2.messageB()).to.be.equal(messageB);
    }).timeout(180000);

    it("Two Messages V4", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messageA = "V4 A";
      const messageB = "V4 B";
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      /*
        Obtaining the payloads was a pain. So I came up with two methods.
      */

      // Method 1: Using solidity encoding, and getting it through a event emittion
      const tx = await batchTransferPL1.generateSend2MessagesPayloads(messageA, messageB);
      const receipt = await tx.wait();
      const payloadEvent = receipt!.logs[0];
      const [solidityPayloadA, solidityPayloadB] = ethers.AbiCoder.defaultAbiCoder().decode(["bytes", "bytes"], payloadEvent.data);

      // Method 2: Using hardhat ethers encoding, but with some bytes manipulation
      const hardhatPayloadA = ethers.id("receiveMessageA(string)").slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [messageA]
      ).slice(2);
      const hardhatPayloadB = ethers.id("receiveMessageB(string)").slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [messageB]
      ).slice(2);

      // Of course, Methods 1 and 2 should result in the same
      expect(solidityPayloadA).to.be.equal(hardhatPayloadA);
      expect(solidityPayloadB).to.be.equal(hardhatPayloadB);

      await batchTransferPL1.send2MessagesV4(
        [
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: hardhatPayloadA
          },
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: solidityPayloadB
          },
        ]
      );

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await batchTransferPL2.messageA()).to.be.equal(messageA);
      expect(await batchTransferPL2.messageB()).to.be.equal(messageB);
    }).timeout(180000);

    it("Two Messages V5", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messageA = "V5 A";
      const messageB = "V5 B";
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      /*
        Obtaining the payloads was a pain. So I came up with two methods.
      */

      // Method 1: Using solidity encoding, and getting it through a event emittion
      const tx = await batchTransferPL1.generateSend2MessagesPayloads(messageA, messageB);
      const receipt = await tx.wait();
      const payloadEvent = receipt!.logs[0];
      const [solidityPayloadA, solidityPayloadB] = ethers.AbiCoder.defaultAbiCoder().decode(["bytes", "bytes"], payloadEvent.data);

      // Method 2: Using hardhat ethers encoding, but with some bytes manipulation
      const hardhatPayloadA = ethers.id("receiveMessageA(string)").slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [messageA]
      ).slice(2);
      const hardhatPayloadB = ethers.id("receiveMessageB(string)").slice(0, 10) + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [messageB]
      ).slice(2);

      // Of course, Methods 1 and 2 should result in the same
      expect(solidityPayloadA).to.be.equal(hardhatPayloadA);
      expect(solidityPayloadB).to.be.equal(hardhatPayloadB);

      await batchTransferPL1.send2MessagesV5(
        [
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: solidityPayloadA
          },
          {
            _dstChainId: chainIdPL2,
            _resourceId: resourceId,
            _payload: hardhatPayloadB
          },
        ]
      );

      await mockRelayerEthersLastTransactionBatch(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await batchTransferPL2.messageA()).to.be.equal(messageA);
      expect(await batchTransferPL2.messageB()).to.be.equal(messageB);
    }).timeout(180000);

    it("Many Messages", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messagesAmount = 100;
      const messages = [...new Array(messagesAmount)].map(() => genRanHex(50));
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const selector = ethers.id("receiveMessage(string)").slice(0, 10);
      const payloads = messages.map((message) => selector + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [message]
      ).slice(2));

      await batchTransferPL1.sendManyMessages(payloads.map((payload) => ({
        _dstChainId: chainIdPL2,
        _resourceId: resourceId,
        _payload: payload
      })));

      await mockRelayerEthersLastTransactionBatch(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const messagesPL2 = await batchTransferPL2.getMessages();

      messagesPL2.forEach((message: string) => 
        expect(messages).to.include(message)
      );
    }).timeout(180000);

    it("Too Many Messages", async function () {
      const {
        owner,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const messagesAmount = 300;
      const messages = [...new Array(messagesAmount)].map(() => genRanHex(50));
  
      const resourceId = `0x${genRanHex(64)}`;
  
      const batchTransfer = await hre.ethers.getContractFactory("BatchTransfer");
  
      const batchTransferPL1 = await batchTransfer.deploy(resourceId, await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
      const batchTransferPL2 = await batchTransfer.deploy(resourceId, await endpointPL2.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const selector = ethers.id("receiveMessage(string)").substring(0, 10);
      const payloads = messages.map((message) => selector + ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        [message]
      ).substring(2));

      try {
        await batchTransferPL1.sendManyMessages(payloads.map((payload) => ({
          _dstChainId: chainIdPL2,
          _resourceId: resourceId,
          _payload: payload
        })));
      } catch (error: any) {
        expect(error.message).to.include('The max number of transactions allowed in a batch has been exceeded');
        return;
      }

      expect.fail('Expected transaction to revert with a specific error, but it did not');

    }).timeout(180000);
  });

  describe('ERC20 Batch Teleport', async function () {
    it("Two Teleports to same destination (back and forth)", async function () {
      const {
        owner,
        otherAccount,
        account3,
        endpointPL1,
        endpointPL2,
        chainIdPL1,
        chainIdPL2,
        raylsContractFactoryPL2,
        endpointMappings,
        messageIdsAlreadyProcessedOnDeploy,
        tokenRegistry,
        resourceRegistry,
      } = await loadFixture(basicDeploySetupUpgrade);
  
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };
  
      const erc20BatchTeleport = await hre.ethers.getContractFactory("Erc20BatchTeleport");
  
      const erc20BatchTeleportPL1: any = await erc20BatchTeleport.connect(owner).deploy("Luan Token", "LTk", await endpointPL1.getAddress());
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const resourceId = (
        await registerToken(
          erc20BatchTeleportPL1,
          tokenRegistry,
          endpointMappings,
          messageIdsAlreadyProcessed,
          resourceRegistry,
        )
      ).resourceId;

      await erc20BatchTeleportPL1.connect(owner).mint(owner, 1000);
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      await erc20BatchTeleportPL1.batchTeleport([
        {
          to: otherAccount.address, 
          value: 100, 
          chainId: chainIdPL2
        },
        {
          to: otherAccount.address, 
          value: 200, 
          chainId: chainIdPL2
        }
      ]);

      await mockRelayerEthersLastTransactionBatch(
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      );

      const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(
        raylsContractFactoryPL2.filters.DeployedContract,
      );
      const deployedContractAddress = deployedContractEvent[0].args[0];
      const erc20BatchTeleportPL2 = await hre.ethers.getContractAt(
        'Erc20BatchTeleport',
        deployedContractAddress,
      );

      expect(await endpointPL1.getAddressByResourceId(resourceId)).to.be.equal(
        await erc20BatchTeleportPL1.getAddress(),
      );
      expect(await endpointPL2.getAddressByResourceId(resourceId)).to.be.equal(
        deployedContractAddress,
      );
      expect(await erc20BatchTeleportPL1.getAddressByResourceId(resourceId)).to.be.equal(
        await erc20BatchTeleportPL1.getAddress(),
      );
      expect(await erc20BatchTeleportPL1.name()).to.be.equal(await erc20BatchTeleportPL2.name());
      expect(await erc20BatchTeleportPL1.symbol()).to.be.equal(await erc20BatchTeleportPL2.symbol());
      expect(await erc20BatchTeleportPL2.balanceOf(otherAccount.address)).to.be.equal(300);

      await erc20BatchTeleportPL2
        .connect(otherAccount)
        .batchTeleport([
          {
            to: account3.address, 
            value: 100, 
            chainId: chainIdPL1
          },
          {
            to: account3.address, 
            value: 200, 
            chainId: chainIdPL1
          }
        ]);
      await mockRelayerEthersLastTransactionBatch(
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      );

      expect(await erc20BatchTeleportPL1.balanceOf(account3.address)).to.be.equal(300);
      expect(await erc20BatchTeleportPL2.balanceOf(otherAccount.address)).to.be.equal(0n);
    });
  });
});