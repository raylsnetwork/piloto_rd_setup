import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { basicDeploySetupUpgrade } from './utils/basicDeploySetupUpgrade';
import { extendConfig } from 'hardhat/config';
import { EnygmaTokenExample, ResourceRegistryV1, TokenRegistryV2 } from '../../../typechain-types';

describe('Enygma', function () {
  it('Enygma shared secrets', async function () {    

    const { participantStorage, chainIdPL1, chainIdPL2, chainIdPL3, chainIdPL4,  owner, otherAccount, account3, account4, account5, account6,  
         endpointMappings, endpointPL1,
      messageIdsAlreadyProcessedOnDeploy,
      resourceRegistry, tokenRegistry, tokenEnygmaPL1, participantStorageReplicaPL1, participantStorageReplicaPL2, participantStorageReplicaPL3, participantStorageReplicaPL4} = await loadFixture(basicDeploySetupUpgrade);

      const messageIdsAlreadyProcessed = {
        ...messageIdsAlreadyProcessedOnDeploy,
      };

      const sharedSecrets1: number[] = [0];
      const orderedChainIds1: number[] = [Number(chainIdPL1)];
      
      await participantStorageReplicaPL1.broadcastAndSetSharedSecrets(sharedSecrets1, orderedChainIds1, Number(chainIdPL1));
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      
      const secretsFromPL1 = await participantStorageReplicaPL1.getSharedSecrets();
      console.log("secrets PL1 ", secretsFromPL1);
      
      const sharedSecrets2: number[] = [14, 0];
      const sharedSecrets1_2: number[] = [0, 14];
      
      const orderedChainIds2: number[] = [Number(chainIdPL1), Number(chainIdPL2)];
      
      await participantStorageReplicaPL2.broadcastAndSetSharedSecrets(sharedSecrets2, orderedChainIds2, Number(chainIdPL2));
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      
      const secretsFromPL2 = await participantStorageReplicaPL2.getSharedSecrets();
      console.log("secrets PL2 ", secretsFromPL2);
      expect(secretsFromPL2).to.deep.equal(sharedSecrets2);

      const secretFromPL201 = await participantStorageReplicaPL2.getSharedSecret(Number(chainIdPL1));
      console.log("secret PL2 ", secretFromPL201);
      
      const secretsFromPL1_2 = await participantStorageReplicaPL1.getSharedSecrets();
      console.log("secrets PL1 ", secretsFromPL1_2);
      expect(secretsFromPL1_2).to.deep.equal(sharedSecrets1_2);
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

      const secretFromPL20 = await participantStorageReplicaPL2.getSharedSecret(Number(chainIdPL1));
      console.log("secret PL2 ", secretFromPL20);
      
      // PL3
      const sharedSecrets1_3: number[] = [0, 14, 21];
      const sharedSecrets2_3: number[] = [14, 0, 10];
      const sharedSecrets3: number[] =   [21, 10, 0];

      const orderedChainIds3: number[] = [Number(chainIdPL1), Number(chainIdPL2), Number(chainIdPL3)];
      
      await participantStorageReplicaPL3.broadcastAndSetSharedSecrets(sharedSecrets3, orderedChainIds3, Number(chainIdPL3));
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
     
      const secretFromPL2 = await participantStorageReplicaPL2.getSharedSecret(Number(chainIdPL1));
      console.log("secret PL2 ", secretFromPL2);

      const secretsFromPL3 = await participantStorageReplicaPL3.getSharedSecrets();
      console.log("secrets PL3 ", secretsFromPL3);
      expect(secretsFromPL3).to.deep.equal(sharedSecrets3);
      
      const secretsFromPL1_3 = await participantStorageReplicaPL1.getSharedSecrets();
      console.log("secrets PL1 ", secretsFromPL1_3);
      expect(secretsFromPL1_3).to.deep.equal(sharedSecrets1_3);
      
      const secretsFromPL2_3 = await participantStorageReplicaPL2.getSharedSecrets();
      console.log("secrets PL2 ", secretsFromPL2_3);
      expect(secretsFromPL2_3).to.deep.equal(sharedSecrets2_3);
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      
      // PL4
      const sharedSecrets1_4: number[] = [0, 14, 21, 32];
      const sharedSecrets2_4: number[] = [14, 0, 10, 79];
      const sharedSecrets3_4: number[] = [21, 10, 0, 84];
      const sharedSecrets4: number[] = [32, 79, 84, 0];

      const orderedChainIds4: number[] = [Number(chainIdPL1), Number(chainIdPL2), Number(chainIdPL3), Number(chainIdPL4)];
      
      await participantStorageReplicaPL4.broadcastAndSetSharedSecrets(sharedSecrets4, orderedChainIds4, Number(chainIdPL4));
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      
      const secretsFromPL4 = await participantStorageReplicaPL4.getSharedSecrets();
      console.log("secrets PL4 ", secretsFromPL4);
      expect(secretsFromPL4).to.deep.equal(sharedSecrets4);
      
      const secretsFromPL1_4 = await participantStorageReplicaPL1.getSharedSecrets();
      console.log("secrets PL1 ", secretsFromPL1_4);
      expect(secretsFromPL1_4).to.deep.equal(sharedSecrets1_4);
      
      const secretsFromPL2_4 = await participantStorageReplicaPL2.getSharedSecrets();
      console.log("secrets PL2 ", secretsFromPL2_4);
      expect(secretsFromPL2_4).to.deep.equal(sharedSecrets2_4);
      
      const secretsFromPL3_4 = await participantStorageReplicaPL3.getSharedSecrets();
      console.log("secrets PL3 ", secretsFromPL3_4);
      expect(secretsFromPL3_4).to.deep.equal(sharedSecrets3_4);
      
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
      
      


  });
});





