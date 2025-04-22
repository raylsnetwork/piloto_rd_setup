import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';

require('dotenv').config();

async function main() {

  await updateParticipantStorageToV2();

  await updateTokenRegistryToV2();

  const enygmaFactoryAddress = await deployEnygmaFactory();

  const enygmaVerifierk2Address = await deployEnygmaVerifierk2();

  const enygmaVerifierk6Address = await deployEnygmaVerifierk6();


  await configureContracts(
    enygmaFactoryAddress,
    enygmaVerifierk2Address,
    enygmaVerifierk6Address
  );



  console.log('Deploy to 2.1 is Ok! ✅');

}


async function updateTokenRegistryToV2() {

  const tokenRegistry = await ethers.getContractFactory('TokenRegistryV2');

  console.log('Upgrading TokenRegistry...');

  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  await upgrades.upgradeProxy(deployment.tokenRegistryAddress, tokenRegistry);

  console.log('TokenRegistry upgraded successfully');
}



async function updateParticipantStorageToV2() {

  const participantStorage = await ethers.getContractFactory('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2');

  console.log('Upgrading ParticipantStorage...');

  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  await upgrades.upgradeProxy(deployment.participantStorageAddress, participantStorage);

  console.log('ParticipantStorage upgraded successfully');
}



async function configureContracts(
  enygmaFactory: string,
  enygmaVerifierk2: string,
  enygmaVerifierk6: string
) {

  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const tokenRegistyContract = await hre.ethers.getContractAt('TokenRegistryV2', deployment.tokenRegistryAddress!);

  await tokenRegistyContract.updateEnygmaFactory(enygmaFactory);
  console.log('Enygma factory on TokenRegistry updated');

  await tokenRegistyContract.updateEnygmaVerifierk2(enygmaVerifierk2);
  console.log('Enygma Verifier k=2 on TokenRegistry updated');

  await tokenRegistyContract.updateEnygmaVerifierk6(enygmaVerifierk6);
  console.log('Enygma Verifier k=6 on TokenRegistry updated');

  console.log('configuring contracts OK!');
}

async function deployEnygmaFactory() {
  console.log('Deploying Enygma Factory...');

  const enygmaFactory = await ethers.getContractFactory('EnygmaFactory');

  const deployment = await enygmaFactory.deploy({ gasLimit: 5000000 });
  const deploymentReceipt = await deployment.waitForDeployment();

  const finalAddress = await deploymentReceipt.getAddress();
  console.log('EnygmaFactory', finalAddress);

  return finalAddress;
}

async function deployEnygmaVerifierk2() {

  const enygmaValidatorFactory = await ethers.getContractFactory('EnygmaVerifierk2');

  const txDeploy = await enygmaValidatorFactory.deploy();
  txDeploy.waitForDeployment();

  var implementationAddress = await txDeploy.getAddress();

  console.log('Deploying Enygma Verifier Proxy k=2...');

  const enygmaValidatorProxyFactory = await ethers.getContractFactory('EnygmaVerifierk2Proxy');

  const txDeployProxy = await enygmaValidatorProxyFactory.deploy(implementationAddress);
  txDeployProxy.waitForDeployment();

  var proxyAddress = await txDeployProxy.getAddress();

  console.log('Enygma Verifier k=2 Proxy', proxyAddress);

  console.log('Setting up Enygma Verifier k=2 Proxy', proxyAddress);

  const enygmaValidatorProxy = await ethers.getContractAt('EnygmaVerifierk2Proxy', proxyAddress);

  await enygmaValidatorProxy.setVerifierAddress(implementationAddress);

  console.log('Enygma Verifier k=2 deploy & configuration OK');

  return proxyAddress;
}

async function deployEnygmaVerifierk6() {
  console.log('Deploying Enygma Verifier for k=6...');

  const enygmaValidatorFactory = await ethers.getContractFactory('EnygmaVerifierk6');

  const txDeploy = await enygmaValidatorFactory.deploy();
  txDeploy.waitForDeployment();

  var implementationAddress = await txDeploy.getAddress();

  console.log('Deploying Enygma Verifier Proxy k=6...');

  const enygmaValidatorProxyFactory = await ethers.getContractFactory('EnygmaVerifierk6Proxy');

  const txDeployProxy = await enygmaValidatorProxyFactory.deploy(implementationAddress);
  txDeployProxy.waitForDeployment();

  var proxyAddress = await txDeployProxy.getAddress();

  console.log('Enygma Verifier k=6 Proxy', proxyAddress);

  console.log('Setting up Enygma Verifier k=6 Proxy', proxyAddress);

  const enygmaValidatorProxy = await ethers.getContractAt('EnygmaVerifierk6Proxy', proxyAddress);

  await enygmaValidatorProxy.setVerifierAddress(implementationAddress);

  console.log('Enygma Verifier k=6 deploy & configuration OK');

  return proxyAddress;
}


main();

interface KeyPair {
  dhSecret: string;
  dhPublic: string;
}

