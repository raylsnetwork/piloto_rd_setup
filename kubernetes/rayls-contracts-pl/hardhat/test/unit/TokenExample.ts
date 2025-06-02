import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { registerToken } from './TokenRegistryV1';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';

describe('Rayls ERC20 Example V1', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // Deploys 2 relayers, 1 commit chain and 1 token on PL1

  it('Teleport (with local mock)', async function () {
    const {
      tokenPL1,
      owner,
      otherAccount,
      endpointPL2,
      raylsContractFactoryPL2,
      endpointPL1,
      chainIdPL1,
      chainIdPL2,
      endpointMappings,
      messageIdsAlreadyProcessedOnDeploy,
      tokenRegistry,
      resourceRegistry
    } = await loadFixture(basicDeploySetupUpgrade);
    const amountToTransfer = 100n;
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference

    const resourceId = (
      await registerToken(
        tokenPL1,
        tokenRegistry,
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      )
    ).resourceId;

    // cross chain transfer from PL1 to PL2
    await tokenPL1.teleport(otherAccount.address, amountToTransfer, chainIdPL2);

    const txs = await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(
      raylsContractFactoryPL2.filters.DeployedContract,
    );
    const deployedContractAddress = deployedContractEvent[0].args[0];
    const tokenPL2 = await hre.ethers.getContractAt('TokenExample', deployedContractAddress);
    expect(await endpointPL2.getAddressByResourceId(resourceId)).to.be.equal(deployedContractAddress);
    expect(await endpointPL1.getAddressByResourceId(resourceId)).to.be.equal(await tokenPL1.getAddress());

    expect(await tokenPL1.getAddressByResourceId(resourceId)).to.be.equal(await tokenPL1.getAddress());

    expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
    expect(await tokenPL1.symbol()).to.be.equal(await tokenPL2.symbol());
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(amountToTransfer);

    // cross chain transfer from PL2 to PL1
    const randomAddress = '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5';
    await tokenPL2
      .connect(otherAccount)
      .teleport(randomAddress, amountToTransfer, chainIdPL1);
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    expect(await tokenPL1.balanceOf(randomAddress)).to.be.equal(
      amountToTransfer,
    );
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(0n);
  });

  it('Teleport Atomic (with local mock)', async function () {
    const {
      tokenPL1,
      owner,
      otherAccount,
      endpointPL2,
      raylsContractFactoryPL2,
      endpointPL1,
      chainIdPL1,
      chainIdPL2,
      endpointMappings,
      account3,
      account4,
      messageIdsAlreadyProcessedOnDeploy,
      tokenRegistry,
      resourceRegistry
    } = await loadFixture(basicDeploySetupUpgrade);
    const amountToTransfer = 100n;
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference

    const resourceId = (
      await registerToken(
        tokenPL1,
        tokenRegistry,
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      )
    ).resourceId;
    // cross chain transfer from PL1 to PL2
    await tokenPL1.teleportAtomic(
      account3.address,
      amountToTransfer,
      chainIdPL2,
    );
    const txs = await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(
      raylsContractFactoryPL2.filters.DeployedContract,
    );
    const deployedContractAddress = deployedContractEvent[0].args[0];
    const tokenPL2 = await hre.ethers.getContractAt('TokenExample', deployedContractAddress);
    expect(await tokenPL2.getLockedAmount(account3.address)).to.be.equal(amountToTransfer);

    await tokenPL2.unlock(account3.address, amountToTransfer); // run the unlock call
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    ); // run commit chain events on pl2

    expect(await endpointPL2.resourceIdToContractAddress(resourceId)).to.be.equal(deployedContractAddress);

    expect(await tokenPL2.getAddressByResourceId(resourceId)).to.be.equal(deployedContractAddress);

    expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
    expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
    expect(await tokenPL1.symbol()).to.be.equal(await tokenPL2.symbol());
    expect(await tokenPL2.balanceOf(account3.address)).to.be.equal(amountToTransfer);

    // cross chain transfer from PL2 to PL1
    await tokenPL2
      .connect(account3)
      .teleportAtomic(account4.address, amountToTransfer, chainIdPL1);
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    await (await tokenPL1.unlock(account4.address, amountToTransfer)).wait(); // run the unlock call

    expect(await tokenPL1.balanceOf(account4.address)).to.be.equal(amountToTransfer);
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(0n);
  });

  it('Teleport from (with local mock)', async function () {
    const {
      tokenPL1,
      owner,
      otherAccount,
      endpointPL2,
      raylsContractFactoryPL2,
      endpointPL1,
      chainIdPL1,
      chainIdPL2,
      endpointMappings,
      messageIdsAlreadyProcessedOnDeploy,
      tokenRegistry,
      resourceRegistry
    } = await loadFixture(basicDeploySetupUpgrade);
    const amountToTransfer = 100n;
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference

    const resourceId = (
      await registerToken(
        tokenPL1,
        tokenRegistry,
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      )
    ).resourceId;

    const res = await tokenPL1
      .connect(otherAccount)
      .teleportFrom(owner, otherAccount, amountToTransfer, chainIdPL2)
      .catch(() => null);

    // Expect failure
    expect(res).to.be.equal(null);

    await tokenPL1.approve(otherAccount, amountToTransfer);

    const allowance = await tokenPL1.allowance(owner, otherAccount);

    expect(allowance).to.be.equal(amountToTransfer);

    // cross chain transfer from PL1 to PL2
    await tokenPL1.connect(otherAccount).teleportFrom(owner, otherAccount, amountToTransfer, chainIdPL2);

    const txs = await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(
      raylsContractFactoryPL2.filters.DeployedContract,
    );
    const deployedContractAddress = deployedContractEvent[0].args[0];
    const tokenPL2 = await hre.ethers.getContractAt('TokenExample', deployedContractAddress);
    expect(await endpointPL2.resourceIdToContractAddress(resourceId)).to.be.equal(deployedContractAddress);
    expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
    expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
    expect(await tokenPL1.symbol()).to.be.equal(await tokenPL2.symbol());
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(amountToTransfer);

    // cross chain transfer from PL2 to PL1
    const randomAddress = '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5';

    await tokenPL2.connect(otherAccount).approve(owner, amountToTransfer);

    await tokenPL2
      .connect(owner)
      .teleportFrom(otherAccount, randomAddress, amountToTransfer, chainIdPL1);
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    expect(await tokenPL1.balanceOf(randomAddress)).to.be.equal(
      amountToTransfer,
    );
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(0n);
  });

  it('Teleport Atomic From (with local mock)', async function () {
    const {
      tokenPL1,
      owner,
      otherAccount,
      endpointPL2,
      raylsContractFactoryPL2,
      endpointPL1,
      chainIdPL1,
      chainIdPL2,
      endpointMappings,
      account3,
      account4,
      messageIdsAlreadyProcessedOnDeploy,
      tokenRegistry,
      resourceRegistry
    } = await loadFixture(basicDeploySetupUpgrade);
    const amountToTransfer = 100n;
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference

    const resourceId = (
      await registerToken(
        tokenPL1,
        tokenRegistry,
        endpointMappings,
        messageIdsAlreadyProcessed,
        resourceRegistry,
      )
    ).resourceId;

    const res = await tokenPL1
      .connect(account3)
      .teleportAtomicFrom(owner, account3, amountToTransfer, chainIdPL2)
      .catch(() => null);

    // Expect failure
    expect(res).to.be.equal(null);

    await tokenPL1.connect(owner).approve(account3, amountToTransfer);

    const allowance = await tokenPL1.allowance(owner, account3);

    expect(allowance).to.be.equal(amountToTransfer);

    // cross chain transfer from PL1 to PL2
    await tokenPL1.connect(account3).teleportAtomicFrom(owner, account3, amountToTransfer, chainIdPL2);

    const txs = await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(
      raylsContractFactoryPL2.filters.DeployedContract,
    );
    const deployedContractAddress = deployedContractEvent[0].args[0];
    const tokenPL2 = await hre.ethers.getContractAt('TokenExample', deployedContractAddress);
    expect(await tokenPL2.getLockedAmount(account3.address)).to.be.equal(amountToTransfer);

    await tokenPL2.unlock(account3.address, amountToTransfer); // run the unlock call
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    ); // run commit chain events on pl2

    expect(await endpointPL2.resourceIdToContractAddress(resourceId)).to.be.equal(deployedContractAddress);
    expect(await endpointPL1.resourceIdToContractAddress(resourceId)).to.be.equal(await tokenPL1.getAddress());
    expect(await tokenPL1.name()).to.be.equal(await tokenPL2.name());
    expect(await tokenPL1.symbol()).to.be.equal(await tokenPL2.symbol());
    expect(await tokenPL2.balanceOf(account3.address)).to.be.equal(amountToTransfer);

    // cross chain transfer from PL2 to PL1
    await tokenPL2.connect(account3).approve(account4, amountToTransfer);

    await tokenPL2
      .connect(account4)
      .teleportAtomicFrom(account3, account4, amountToTransfer, chainIdPL1);
    await mockRelayerEthersLastTransaction(
      endpointMappings,
      messageIdsAlreadyProcessed,
      resourceRegistry,
    );
    await (await tokenPL1.unlock(account4.address, amountToTransfer)).wait(); // run the unlock call

    expect(await tokenPL1.balanceOf(account4.address)).to.be.equal(amountToTransfer);
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(0n);
  });

  it('Change the Endpoint Address', async function () {
    const { tokenPL1, otherAccount } = await loadFixture(basicDeploySetupUpgrade);

    const oldEndpointAddress = await tokenPL1._getEndpointAddress();
    const newEndpointAddress = otherAccount.address;
    await tokenPL1._updateEndpoint(newEndpointAddress);

    const updatedEndpointAddress = await tokenPL1._getEndpointAddress();

    expect(updatedEndpointAddress).to.be.equal(newEndpointAddress);
    expect(updatedEndpointAddress).not.be.equal(oldEndpointAddress);
  });
});
