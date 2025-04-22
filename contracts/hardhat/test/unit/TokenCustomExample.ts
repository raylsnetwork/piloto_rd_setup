import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { registerCustomToken, registerToken } from './TokenRegistryV2';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';

describe('Rayls ERC20 Custom Example V1', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  // Deploys 2 relayers, 1 commit chain and 1 token on PL1

  it('Teleport (with local mock)', async function () {
    const {
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
      resourceRegistry,
      tokenCustomPL1
    } = await loadFixture(basicDeploySetupUpgrade);
    const amountToTransfer = 100n;
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference


    const attestationUuid = '0x00000000000000000000000000000000000000000000000000000000686f6c61';
    await tokenCustomPL1.setAttestationUuid(attestationUuid);
    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    const resourceId = (await registerCustomToken(tokenCustomPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry)).resourceId;

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    await tokenCustomPL1.mint(owner.address, 10000n);

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    // cross chain transfer from PL1 to PL2
    await tokenCustomPL1.teleport(otherAccount.address, amountToTransfer, chainIdPL2);

    const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    const deployedContractEvent = await raylsContractFactoryPL2.queryFilter(raylsContractFactoryPL2.filters.DeployedContract);
    const deployedContractAddress = deployedContractEvent[0].args[0];
    const tokenPL2 = await hre.ethers.getContractAt('CustomTokenExample', deployedContractAddress);
    expect(await endpointPL2.getAddressByResourceId(resourceId)).to.be.equal(deployedContractAddress);
    expect(await endpointPL1.getAddressByResourceId(resourceId)).to.be.equal(await tokenCustomPL1.getAddress());

    expect(await tokenCustomPL1.getAddressByResourceId(resourceId)).to.be.equal(await tokenCustomPL1.getAddress());

    expect(await tokenCustomPL1.name()).to.be.equal(await tokenPL2.name());
    expect(await tokenCustomPL1.symbol()).to.be.equal(await tokenPL2.symbol());
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(amountToTransfer);

    // cross chain transfer from PL2 to PL1
    const randomAddress = '0xdafea492d9c6733ae3d56b7ed1adb60692c98bc5';
    await tokenPL2.connect(otherAccount).teleport(randomAddress, amountToTransfer, chainIdPL1);
    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    expect(await tokenCustomPL1.balanceOf(randomAddress)).to.be.equal(amountToTransfer);
    expect(await tokenPL2.balanceOf(otherAccount.address)).to.be.equal(0n);

    const at = await tokenPL2.attestationUid();

    expect(attestationUuid).to.be.equal(at);


  }); 
});
