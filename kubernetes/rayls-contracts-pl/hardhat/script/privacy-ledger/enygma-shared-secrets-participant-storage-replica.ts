import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import { Addressable } from 'ethers';
import hre, { ethers, upgrades } from 'hardhat';

require('dotenv').config();

async function main() {
    //await SetupPl1();
    //await SendPl2ToPl1();
    //await GetSecrets(replicaPL1Address);
    await GetSecrets(replicaPL2Address);
    //await GetSecrets(replicaPL3Address);
    //await GetSecrets(replicaPL4Address);
    //await SendPl1ToPl2();

}

const replicaPL1Address ="0x50a9A194CAbD60B2AaCffF75778229D1969c7106" 
const replicaPL2Address ="0xd127BBd840dFA8078643eA41530000dE30d535cC" 
const replicaPL3Address ="0xE718409392b337bea0c840c18A7230A21042e498"

const replicaPL4Address ="0xd944cC0D49158418A243D1508dA0F75b42571c8d" 
const replicaPL5Address ="0x99ba3f4D4abD46828D6CAB275b7B239447a8d88e" 
const replicaPL6Address ="0x72817f557BcB1ca2dBCf54f979974470B7f6EEA6" 




async function GetSecrets(address: string) {



    const participantStorageReplicaPL1 = await hre.ethers.getContractAt('ParticipantStorageReplicaV2', address);


     const sharedSecretsAfter = await participantStorageReplicaPL1.getSharedSecrets();
        console.log("🚀 ~ GetInfos ~ sharedSecretsAfter:", sharedSecretsAfter)


}


async function SetupPl1() {



    const participantStorageReplicaPL1 = await hre.ethers.getContractAt('ParticipantStorageReplicaV2', replicaPL1Address);
   const sharedSecretsPL1 = await participantStorageReplicaPL1.getSharedSecrets();
   console.log("🚀 ~ GetInfos ~ sharedSecrets:", sharedSecretsPL1) 

   const chainIdPL1 = 600002;
   const sharedSecrets2: number[] = [0];

   const orderedChainIds: number[] = [Number(chainIdPL1)]
   console.log("🚀 ~ GetInfos ~ orderedChainIds:", orderedChainIds)
   try {
       // Broadcast and set shared secrets
       const txBroadcast = await participantStorageReplicaPL1.broadcastAndSetSharedSecrets(sharedSecrets2, orderedChainIds, chainIdPL1);
       //const txBroadcast = await participantStorageReplicaPL2.broadcastTest(chainIdPL1);
  
       // Wait for the transaction to be mined
       const receipt = await txBroadcast.wait();

       // Check if the receipt is not null
       if (receipt) {
           // Log the transaction receipt
           console.log("Transaction Receipt:", receipt);

           // Check the status of the transaction
           if (receipt.status === 1) {
               console.log("Transaction was successful");
           } else {
               console.log("Transaction failed");
           }
       } else {
           console.error("Transaction receipt is null.");
       } 

  
   } catch (error) {
       console.error("Error during transaction broadcast:", error);
   } 



     const sharedSecretsAfter = await participantStorageReplicaPL1.getSharedSecrets();
        console.log("🚀 ~ GetInfos ~ sharedSecretsAfter:", sharedSecretsAfter)


}

async function SendPl1ToPl2() {



     const participantStorageReplicaPL1 = await hre.ethers.getContractAt('ParticipantStorageReplicaV2', replicaPL1Address);
    const sharedSecretsPL1 = await participantStorageReplicaPL1.getSharedSecrets();
    console.log("🚀 ~ GetInfos ~ sharedSecrets:", sharedSecretsPL1) 

    const chainIdPL1 = 600002; //deu errado
    const chainIdPL2 = 600003; //primeiro, deu certo
    const sharedSecrets2: number[] = [0, 14];
    const sharedSecrets1_2: number[] = [14, 0];

    const orderedChainIds: number[] = [Number(chainIdPL1), Number(chainIdPL2)].sort((a, b) => a - b);
    console.log("🚀 ~ GetInfos ~ orderedChainIds:", orderedChainIds)
    try {
        // Broadcast and set shared secrets
        const txBroadcast = await participantStorageReplicaPL1.broadcastAndSetSharedSecrets(sharedSecrets2, orderedChainIds, chainIdPL1);
        //const txBroadcast = await participantStorageReplicaPL2.broadcastTest(chainIdPL1);
   
        // Wait for the transaction to be mined
        const receipt = await txBroadcast.wait();

        // Check if the receipt is not null
        if (receipt) {
            // Log the transaction receipt
            console.log("Transaction Receipt:", receipt);

            // Check the status of the transaction
            if (receipt.status === 1) {
                console.log("Transaction was successful");
            } else {
                console.log("Transaction failed");
            }
        } else {
            console.error("Transaction receipt is null.");
        } 

   
    } catch (error) {
        console.error("Error during transaction broadcast:", error);
    } 

 

      const sharedSecretsAfter = await participantStorageReplicaPL1.getSharedSecrets();
         console.log("🚀 ~ GetInfos ~ sharedSecretsAfter:", sharedSecretsAfter)

 
}

async function SendPl2ToPl1() {
    const participantStorageReplicaPL2 = await hre.ethers.getContractAt('ParticipantStorageReplicaV2', replicaPL2Address);
    const sharedSecretsPL2 = await participantStorageReplicaPL2.getSharedSecrets();
   console.log("🚀 ~ GetInfos ~ sharedSecrets:", sharedSecretsPL2)   

   const chainIdPL1 = 600002; //deu errado
   const chainIdPL2 = 600003; //primeiro, deu certo
   const sharedSecrets2: number[] = [0, 14];
   const sharedSecrets1_2: number[] = [14, 0];

   const orderedChainIds: number[] = [Number(chainIdPL1), Number(chainIdPL2)].sort((a, b) => a - b);
   console.log("🚀 ~ GetInfos ~ orderedChainIds:", orderedChainIds)
   try {
       // Broadcast and set shared secrets
       
       //const txBroadcast = await participantStorageReplicaPL2.broadcastTest(chainIdPL1);
       const txBroadcast = await participantStorageReplicaPL2.broadcastAndSetSharedSecrets(sharedSecrets1_2, orderedChainIds, chainIdPL2);

       // Wait for the transaction to be mined
       const receipt = await txBroadcast.wait();

       // Check if the receipt is not null
       if (receipt) {
           // Log the transaction receipt
           console.log("Transaction Receipt:", receipt);

           // Check the status of the transaction
           if (receipt.status === 1) {
               console.log("Transaction was successful");
           } else {
               console.log("Transaction failed");
           }
       } else {
           console.error("Transaction receipt is null.");
       } 

  
   } catch (error) {
       console.error("Error during transaction broadcast:", error);
   } 





    const sharedSecretsAfter = await participantStorageReplicaPL2.getSharedSecrets();
        console.log("🚀 ~ GetInfos ~ sharedSecretsAfter:", sharedSecretsAfter)   

}

main();
