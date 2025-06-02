import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { RaylsErc1155Example, ResourceRegistryV1, TokenRegistryV1 } from '../../../typechain-types';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';

describe('Rayls ERC1155 Example V2', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // Deploys 2 relayers, 1 commit chain and 1 token on PL1

  describe('Send Message', function () {
    let tokenPL1: RaylsErc1155Example;
    let tokenPL2: RaylsErc1155Example;
    let resourceId: string;
    const tokenId = 0;

    it('Teleport (e2e, with local mock)', async function () {
      const { otherAccount, endpointPL2, raylsContractFactoryPL2, endpointPL1, chainIdPL1, chainIdPL2, endpointMappings, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, resourceRegistry } =
        await loadFixture(basicDeploySetupUpgrade);

      tokenPL1 = await tokenSetup({
        name: 'RaylsErc1155Example',
        plEndpointAddress: await endpointPL1.getAddress()
      });

      const amountToTransfer = 100n;
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy
      }; // should copy because fixture does not update the values of a object reference

      resourceId = (await registerToken(tokenPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry)).resourceId;

      // cross chain transfer from PL1 to PL2
      await tokenPL1.teleport(otherAccount.address, tokenId, amountToTransfer, chainIdPL2, Buffer.from(tokenId.toString()));

      const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(raylsContractFactoryPL2.filters.DeployedContract);
      const deployedContractAddress = deployedContractEvent[0].args[0];

      tokenPL2 = await hre.ethers.getContractAt('RaylsErc1155Example', deployedContractAddress);

      expect(await endpointPL2.resourceIdToContractAddress(resourceId)).to.be.equal(deployedContractAddress);
      expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
      expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
      expect(await tokenPL2.balanceOf(otherAccount.address, tokenId)).to.be.equal(amountToTransfer);

      // cross chain transfer from PL2 to PL1
      const randomAddress = '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5';
      await tokenPL2.connect(otherAccount).teleport(randomAddress, tokenId, amountToTransfer, chainIdPL1, Buffer.from(tokenId.toString()));

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      expect(await tokenPL1.balanceOf(randomAddress, tokenId)).to.be.equal(amountToTransfer);
      expect(await tokenPL2.balanceOf(otherAccount.address, tokenId)).to.be.equal(0n);
    });

    it('Teleport Atomic (e2e, with local mock)', async function () {
      const { otherAccount, endpointPL1, chainIdPL1, chainIdPL2, endpointMappings, account3, account4, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, resourceRegistry } =
        await loadFixture(basicDeploySetupUpgrade);
      const amountToTransfer = 100n;
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy
      }; // should copy because fixture does not update the values of a object reference

      tokenPL1 = await tokenSetup({
        name: 'RaylsErc1155Example',
        plEndpointAddress: await endpointPL1.getAddress()
      });

      await registerToken(tokenPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      // cross chain transfer from PL1 to PL2
      await tokenPL1.teleportAtomic(account3.address, tokenId, amountToTransfer, chainIdPL2, Buffer.from(tokenId.toString()));

      const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await tokenPL2.getLockedAmount(account3.address, tokenId)).to.be.equal(amountToTransfer);

      await tokenPL2.unlock(account3.address, tokenId, amountToTransfer, Buffer.from(tokenId.toString())); // run the unlock call

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry); // run commit chain events on pl2

      expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
      expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
      expect(await tokenPL2.balanceOf(account3.address, tokenId)).to.be.equal(amountToTransfer);

      // cross chain transfer from PL2 to PL1
      await tokenPL2.connect(account3).teleportAtomic(account4.address, tokenId, amountToTransfer, chainIdPL1, Buffer.from(tokenId.toString()));
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      await (await tokenPL1.unlock(account4.address, tokenId, amountToTransfer, Buffer.from(tokenId.toString()))).wait(); // run the unlock call

      expect(await tokenPL1.balanceOf(account4.address, tokenId)).to.be.equal(amountToTransfer);
      expect(await tokenPL2.balanceOf(otherAccount.address, tokenId)).to.be.equal(0n);
    });
  });
});

async function tokenSetup(payload: { name: string; plEndpointAddress: string }) {
  const { name, plEndpointAddress } = payload;
  const tokenFactory = await hre.ethers.getContractFactory('RaylsErc1155Example');

  const token = await tokenFactory.deploy('url', name, plEndpointAddress);

  const res = await token.waitForDeployment();

  return res;
}

async function registerToken(tokenPL: RaylsErc1155Example, tokenRegistry: TokenRegistryV1, endpointMappings: any, messageIdsAlreadyProcessed: any, resourceRegistry: ResourceRegistryV1) {
  await tokenPL.submitTokenRegistration(0);
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  const token = (await tokenRegistry.getAllTokens())[0];

  await tokenRegistry.updateStatus(token.resourceId, 1); // approve token
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  return token;
}
