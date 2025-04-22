import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';

require('dotenv').config();

async function main() {
  // await updateParticipantStorage();
  //await getContractVersion();

  //await getInfosFromV1();
  //await getInfosFromV2();
  //await getInfosFromV3();

  await getPubKeys();
  // await getPubKeysPL();
  //await generateKeys();
}

async function updateParticipantStorage() {
  const participantStorage = await ethers.getContractFactory('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2');

  console.log('Upgrading ParticipantStorage...');

  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  await upgrades.upgradeProxy(deployment.participantStorageAddress, participantStorage);

  console.log('ParticipantStorage upgraded successfully');
}

async function getInfosFromV1() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const participantStorageV2 = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', deployment.participantStorageAddress);

  //gets a function from V1
  const accounts = await participantStorageV2.getAllParticipants();
  console.log('🚀 ~ getInfosFromV1 ~ accounts:', accounts);
}

async function getInfosFromV2() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const participantStorageV2 = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', deployment.participantStorageAddress);

  //gets a function from V1
  const babyJubjubKeys = await participantStorageV2.getEnygmaAllBabyJubjubKeys();
  console.log('🚀 ~ getInfosFromV2 ~ babyJubjubKeys:', babyJubjubKeys);
}

async function getInfosFromV3() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const participantStorageV2 = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', deployment.participantStorageAddress);

  //gets a function from V1
  const getNewInfosFromV3 = await participantStorageV2.getNewInfosFromV3();
  console.log('🚀 ~ getInfosFromV2 ~ getNewInfosFromV3:', getNewInfosFromV3);
}

async function getContractVersion() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const participantStorageV2 = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', deployment.participantStorageAddress);

  //gets a function from V1
  const contractVersion = await participantStorageV2.contractVersion();
  console.log('🚀 ~ contract version:', contractVersion);
}

async function getPubKeys() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const participantStorageV2 = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', deployment.participantStorageAddress);

  //gets a function from V1
  const allJujub = await participantStorageV2.getEnygmaAllBabyJubjubKeys();
  console.log('🚀 ~ contract version:', allJujub);
}

async function getPubKeysPL() {
  const participantStorageReplicaV2 = await ethers.getContractAt('ParticipantStorageReplicaV2', '0x56d4683032062e8784c7b144e1f9e05155c6d70c');

  //gets a function from V1
  const allJujub = await participantStorageReplicaV2.getSharedSecrets();
  console.log('🚀 ~ contract version:', allJujub);
}

async function generateKeys() {
  const babyJubjub = await ethers.getContractAt('CurveBabyJubJubGenerator', '0x58c1cEaDc0859790c480432d042709c6213A1d3f');

  //gets a function from V1
  const allJujub = await babyJubjub.derivePk(10);
  console.log('🚀 ~ contract version:', allJujub);
}

main();
