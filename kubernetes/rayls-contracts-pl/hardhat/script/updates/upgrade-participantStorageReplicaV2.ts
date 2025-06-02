import "@nomicfoundation/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import hre, { ethers, upgrades } from "hardhat";

require("dotenv").config();

async function main() {

   //await updateParticipantStorageReplica();
   await getParticipantStorageReplica();
}


async function getParticipantStorageReplica() {
   const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
   const deployment = await deploymentRegistry.getDeployment();


   const participantStorageReplica = await hre.ethers.getContractAt("ParticipantStorageReplicaV2", deployment.participantStorageAddress);
   const version = await participantStorageReplica.contractVersion();
   const address = await participantStorageReplica.owner();
   console.log("version ", version);
   console.log("owner", address)


}

async function updateParticipantStorageReplica() {
   const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
   const deployment = await deploymentRegistry.getDeployment();

   /*    const ParticipantStorageReplicaV2 = await ethers.getContractFactory("ParticipantStorageReplicaV2");
   
      console.log("Upgrading ParticipantStorageReplica...");
   
      await upgrades.upgradeProxy(deployment.participantStorageAddress, ParticipantStorageReplicaV2);
   
      console.log("ParticipantStorageReplica upgraded successfully"); */



   const currentVersionFactory = await ethers.getContractFactory('ParticipantStorageReplicaV1');
   const currentVersion = await ethers.getContractAt('ParticipantStorageReplicaV1', deployment.participantStorageAddress);

   const nextVersionFactory = await ethers.getContractFactory('ParticipantStorageReplicaV2');

   console.log('Upgrading ParticipantStorageReplica...');

   await upgrades.forceImport(deployment.participantStorageAddress, currentVersionFactory);
   await upgrades.upgradeProxy(currentVersion, nextVersionFactory);

}


main();