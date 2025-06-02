import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { RaylsErc721Example, ResourceRegistryV1, TokenRegistryV1 } from '../../../typechain-types';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';

describe('Rayls Erc721 Example', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // Deploys 2 relayers, 1 commit chain and 1 token on PL1
  describe('Send Message', function () {
    let tokenPL1: RaylsErc721Example;
    let tokenPL2: RaylsErc721Example;
    let resourceId: string;
    const tokenId = 0;

    it('Teleport (e2e, with local mock)', async function () {
      const { otherAccount, endpointPL2, raylsContractFactoryPL2, endpointPL1, chainIdPL1, chainIdPL2, endpointMappings, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, resourceRegistry } =
        await loadFixture(basicDeploySetupUpgrade);

      tokenPL1 = await tokenSetup({
        name: 'RaylsErc721Example',
        plEndpointAddress: await endpointPL1.getAddress()
      });

      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy
      }; // should copy because fixture does not update the values of a object reference

      resourceId = (await registerToken(tokenPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry)).resourceId;

      // cross chain transfer from PL1 to PL2
      await tokenPL1.teleport(otherAccount.address, tokenId, chainIdPL2);

      const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(raylsContractFactoryPL2.filters.DeployedContract);
      const deployedContractAddress = deployedContractEvent[0].args[0];

      tokenPL2 = await hre.ethers.getContractAt('RaylsErc721Example', deployedContractAddress);

      expect(await endpointPL2.resourceIdToContractAddress(resourceId)).to.be.equal(deployedContractAddress);
      expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
      expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
      expect(await tokenPL2.ownerOf(tokenId)).to.be.equal(otherAccount.address);

      // cross chain transfer from PL2 to PL1
      const randomAddress = '0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5';
      await tokenPL2.connect(otherAccount).teleport(randomAddress, tokenId, chainIdPL1);

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      expect(await tokenPL1.ownerOf(tokenId)).to.be.equal(randomAddress);

      // Expect tokenId not to exist and throw
      expect(await tokenPL2.ownerOf(tokenId).catch(() => null)).to.be.equal(null);
    });

    it('Teleport Atomic (e2e, with local mock)', async function () {
      const { endpointPL1, chainIdPL1, chainIdPL2, endpointMappings, account3, account4, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, resourceRegistry } =
        await loadFixture(basicDeploySetupUpgrade);
      const amountToTransfer = 100n;
      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy
      }; // should copy because fixture does not update the values of a object reference

      tokenPL1 = await tokenSetup({
        name: 'RaylsErc721Example',
        plEndpointAddress: await endpointPL1.getAddress()
      });

      await registerToken(tokenPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      // cross chain transfer from PL1 to PL2
      await tokenPL1.teleportAtomic(account3.address, tokenId, chainIdPL2);

      const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      expect(await tokenPL2.isTokenLocked(account3.address, tokenId)).to.be.equal(true);

      await tokenPL2.unlock(account3.address, tokenId); // run the unlock call

      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry); // run commit chain events on pl2

      expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
      expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
      expect(await tokenPL2.ownerOf(tokenId)).to.be.equal(account3.address);

      // cross chain transfer from PL2 to PL1
      await tokenPL2.connect(account3).teleportAtomic(account4.address, tokenId, chainIdPL1);
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      await (await tokenPL1.unlock(account4.address, tokenId)).wait(); // run the unlock call

      expect(await tokenPL1.ownerOf(tokenId)).to.be.equal(account4.address);

      // Expect tokenId not to exist and throw
      expect(await tokenPL2.ownerOf(tokenId).catch(() => null)).to.be.equal(null);
    });
  });
});

async function tokenSetup(payload: { name: string; plEndpointAddress: string }) {
  const { name, plEndpointAddress } = payload;
  const tokenFactory = await hre.ethers.getContractFactory('RaylsErc721Example');

  const token = await tokenFactory.deploy('url/', name, name, plEndpointAddress);

  const res = await token.waitForDeployment();

  return res;
}

async function registerToken(tokenPL: RaylsErc721Example, tokenRegistry: TokenRegistryV1, endpointMappings: any, messageIdsAlreadyProcessed: any, resourceRegistry: ResourceRegistryV1) {
  await tokenPL.submitTokenRegistration(0);
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  const token = (await tokenRegistry.getAllTokens())[0];

  await tokenRegistry.updateStatus(token.resourceId, 1); // approve token
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  return token;
}
