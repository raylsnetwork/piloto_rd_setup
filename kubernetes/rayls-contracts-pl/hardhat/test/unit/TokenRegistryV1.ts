import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ResourceRegistryV1, TokenExample, TokenRegistryV1, CustomTokenExample } from '../../../typechain-types';
import { ContractMethodArgs } from '../../../typechain-types/common';
import { SharedObjects } from '../../../typechain-types/src/commitChain/TokenRegistry/TokenRegistryV1';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';

const TokenData = {
  name: 'TestToken',
  symbol: 'TT',
  issuerChainId: 123,
  bytecode: '0x0000000000000000000000000000000000000000000000000000000000000000',
  initializerParams: '0x0000000000000000000000000000000000000000000000000000000000000000',
  isFungible: true,  
  ercStandard: 0,
  totalSupply: '0x0f4240', // 1000000 in hexadecimal
  storageSlot: 0,
  isCustom: false,
} satisfies ContractMethodArgs<[tokenData: SharedObjects.TokenRegistrationDataStruct], 'nonpayable'>[0];

export async function registerToken(tokenPL: TokenExample, tokenRegistry: TokenRegistryV2, endpointMappings: any, messageIdsAlreadyProcessed: any, resourceRegistry: ResourceRegistryV1) {
  await tokenPL.submitTokenRegistration(TokenData.storageSlot);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  const token = (await tokenRegistry.getAllTokens())[0];

  await tokenRegistry.updateStatus(token.resourceId, 1); // approve token

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  return token;
}

export async function registerCustomToken(tokenPL: CustomTokenExample, tokenRegistry: TokenRegistryV2, endpointMappings: any, messageIdsAlreadyProcessed: any, resourceRegistry: ResourceRegistryV1) {
  
  await tokenPL.submitTokenRegistration(TokenData.storageSlot);  

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  
  const token = (await tokenRegistry.getAllTokens())[0];

  await tokenRegistry.updateStatus(token.resourceId, 1); // approve token

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);


  return token;
}

describe('TokenRegistry V1', function () {
  // it('Should fail when add token without being message executor', async function () {
  //   const { owner, tokenRegistry, participantStorage, resourceRegistry } = await loadFixture(basicDeploySetupUpgrade);

  //   expect(
  //     tokenRegistry.addToken(TokenData, {
  //       from: await owner.getAddress(),        
         
  //     })
  //   ).to.be.rejectedWith("This is a receive method. Only endpoint's executor can call this method");
  // });

  it('Should register a token on commit chain from a request made on token contract in private ledger', async function () {
    const { tokenPL1, endpointMappings, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, owner, resourceRegistry, endpointPL1 } = await loadFixture(basicDeploySetupUpgrade);
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference
    await tokenPL1.submitTokenRegistration(TokenData.storageSlot);
    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    const token = (await tokenRegistry.getAllTokens())[0];

    const resource = await resourceRegistry.getResourceById(token.resourceId);

    expect(token.name).to.equal(await tokenPL1.name());
    expect(token.symbol).to.equal(await tokenPL1.symbol());
    expect(resource.bytecode).to.equal(await tokenPL1.getDeployedCode());
    expect(token.issuerImplementationAddress).to.equal(await tokenPL1.getAddress());
    expect(token.ercStandard).to.equal(0);
  });

  it('Should generate a resource it on commit chain and retrieve it when approved', async function () {
    const { tokenPL1, endpointMappings, messageIdsAlreadyProcessedOnDeploy, tokenRegistry, owner, resourceRegistry, endpointPL1 } = await loadFixture(basicDeploySetupUpgrade);
    const messageIdsAlreadyProcessed = {
      ...messageIdsAlreadyProcessedOnDeploy
    }; // should copy because fixture does not update the values of a object reference
    const token = await registerToken(tokenPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    expect(token.resourceId).to.be.equal(await tokenPL1.resourceId());

    const endpointResourceId = await endpointPL1.getAddressByResourceId(token.resourceId);

    expect(endpointResourceId).to.equal(await tokenPL1.getAddress());
  });


});
