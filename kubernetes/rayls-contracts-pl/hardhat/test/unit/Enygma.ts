import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';
import { extendConfig } from 'hardhat/config';
import { EnygmaTokenExample, ResourceRegistryV1, TokenRegistryV1 } from '../../../typechain-types';

describe('Enygma', function () {
  it('Enygma mint', async function () {    

    const { participantStorage, chainIdPL1, chainIdPL2, /* chainIdPL3, chainIdPL4, */ owner, otherAccount, account3, account4, account5, account6,  
         endpointMappings, endpointPL1,
      messageIdsAlreadyProcessedOnDeploy,
      resourceRegistry, tokenRegistry, tokenEnygmaPL1, participantStorageReplicaPL1, participantStorageReplicaPL2} = await loadFixture(basicDeploySetupUpgrade);

      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

    const addr = await owner.getAddress();
    let resourceId: string;

    const babyjubjubinits = await participantStorage.getEnygmaBabyJubjubKeysByChainId(chainIdPL1);

    const addressesPl1 = [addr];
    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL1, 123123123, 54654654654, addressesPl1);

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    const babyJubjubKeys = await participantStorage.getEnygmaBabyJubjubKeysByChainId(chainIdPL1);
    console.log('🚀 ~ babyJubjubKeys:', babyJubjubKeys);

    expect(babyJubjubKeys[0]).to.be.equal(123123123);
    expect(babyJubjubKeys[1]).to.be.equal(54654654654);

    await expect(participantStorage.setEnygmaBabyJubjubKeys(chainIdPL1, 123123123, 54654654654, addressesPl1)).to.be.rejectedWith('Enygma Data for this chainId is already set!');

    const babyJujubAllData = await participantStorage.getEnygmaAllBabyJubjubKeys();

    expect(babyJujubAllData[0][0]).to.be.equal(123123123);
    expect(babyJujubAllData[0][1]).to.be.equal(54654654654);
    //expect(babyJujubAllData[0][2]).to.be.equal(addr);
    expect(babyJujubAllData[0][3]).to.be.equal(chainIdPL1);

    const addressesPl2 = [otherAccount];
    const addressesPl3 = [account3];
    const addressesPL4 = [account4, account5];
    
    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL2, 2222, 22223, addressesPl2)
 /*    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL3, 3333, 22224, addressesPl3)
    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL4, 4444, 22225, addressesPL4); */

    const sharedSecrets1: number[] = [0];
    const orderedChainIds1: number[] = [Number(chainIdPL1)]

    await participantStorageReplicaPL1.broadcastAndSetSharedSecrets(sharedSecrets1, orderedChainIds1, Number(chainIdPL1))

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    const secretsFromPL1 = await participantStorageReplicaPL1.getSharedSecrets();
    console.log("secrets PL1 ", secretsFromPL1)

    const sharedSecrets2: number[] = [14, 0];
    const sharedSecrets1_2: number[] = [0, 14];

    const orderedChainIds: number[] = [Number(chainIdPL1), Number(chainIdPL2)].sort((a, b) => a - b);


    await participantStorageReplicaPL2.broadcastAndSetSharedSecrets(sharedSecrets2, orderedChainIds, Number(chainIdPL2))

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    const secretsFromPL2 = await participantStorageReplicaPL2.getSharedSecrets();
    console.log("secrets PL2 ", secretsFromPL2)
    expect(secretsFromPL2).to.deep.equal(sharedSecrets2);

    const secretsFromPL1_2 = await participantStorageReplicaPL1.getSharedSecrets();
    console.log("secrets PL1 ", secretsFromPL1_2)
    expect(secretsFromPL1_2).to.deep.equal(sharedSecrets1_2);

    resourceId = (await registerToken(tokenEnygmaPL1, tokenRegistry, endpointMappings, messageIdsAlreadyProcessed, resourceRegistry)).resourceId;

    await tokenEnygmaPL1.mint(owner, 1000);
    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    await tokenEnygmaPL1.crossTransfer(account3, 100, chainIdPL2);

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    const balanceAccountOwner = await tokenEnygmaPL1.balanceOf(owner);

    expect(balanceAccountOwner).to.be.equal(900);

/*     const enygmaCCAdress = await tokenRegistry.getEnygmaAddressByResourceAndChainId(resourceId, chainIdCC);
    console.log('🚀 ~ enygmaCCAdress:', enygmaCCAdress);


    const enygmaTokenCC = await hre.ethers.getContractAt("EnygmaV2", enygmaCCAdress);

    const nameFromenygmaTokenCC = await enygmaTokenCC.Name();
    console.log("🚀 ~ nameFromenygmaTokenCC:", nameFromenygmaTokenCC)     */

    //await enygmaTokenCC.transfer([], [0], chainIdPL2, await owner.getAddress(), 1, await enygmaTokenCC.resourceId());

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    //pegar o proprio enygma na CC
  });
});

// async function tokenSetup(enygmaEventsAt: string, plEndpointAddress: string) {
//   const enygmaFactory = await ethers.getContractFactory('EnygmaTokenExample');
//   const enygma = await enygmaFactory.deploy('enygma', 'eny', plEndpointAddress, enygmaEventsAt);
//   await enygma.waitForDeployment();

//   return enygma;
// }

export async function registerToken(tokenPL: EnygmaTokenExample, tokenRegistry: TokenRegistryV1, endpointMappings: any, messageIdsAlreadyProcessed: any, resourceRegistry: ResourceRegistryV1) {
 
  await tokenPL.submitTokenRegistration(0);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
  const token = (await tokenRegistry.getAllTokens())[0];

  await tokenRegistry.updateStatus(token.resourceId, 1); // approve token

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  return token;
}
