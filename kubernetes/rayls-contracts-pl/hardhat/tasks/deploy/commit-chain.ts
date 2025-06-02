import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import { task } from 'hardhat/config';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeploymentProxyRegistry, ParticipantStorageV1 } from '../../../typechain-types';

// require('dotenv').config();

task('deploy:commit-chain', 'Deploys CC contracts').setAction(async (_, hre) => {
  const initialOwner = (await hre.ethers.provider.getSigner()).address;
  const ccChainId = process.env.NODE_CC_CHAIN_ID!;
  const endpointMaxBatchMessages = process.env.ENDPOINT_MAX_BATCH_MESSAGES || '500';
  let dhPublic = process.env.DH_PUBLIC!;
  let dhSecret = process.env.DH_PUBLIC!;
  let privateKeySystem = process.env.PRIVATE_KEY_SYSTEM!;
  const operatorChainId = '999';

  if (!privateKeySystem) {
    const randomKey = hre.ethers.Wallet.createRandom().privateKey;
    privateKeySystem = randomKey;
    console.log(`🔑🔒 No Private Key given via env var "PRIVATE_KEY_SYSTEM", so a random one will be generated...`);
    console.log(`📝 Take notes of the generated private key: ${privateKeySystem}`);
    console.log('');
  }

  if (!dhPublic) {
    const dhKeyPair = await dhGen();
    dhPublic = dhKeyPair.dhPublic;
    dhSecret = dhKeyPair.dhSecret;
    console.log(`🔑🔒 No DH Public Key given via env var "DH_PUBLIC", so a random one will be generated...`);
    console.log(`📝 Take notes of the generated DH KeyPair:\n${JSON.stringify(dhKeyPair, null, 4)}`);
    console.log('');
  }

  console.log('ccChainId', ccChainId);

  const { deploymentProxyRegistryCC, deploymentProxyRegistryAddress } = await deployDeploymentProxyRegistryCC(hre);
  const messageExecutorAddress = await deployRaylsMessageExecutor(initialOwner, hre);
  const teleportAddress = await deployTeleport(initialOwner, hre);
  const resourceRegistryAddress = await deployResourceRegistry(initialOwner, hre);
  const endpointAddress = await deployEndpointCC(initialOwner, ccChainId, ccChainId, endpointMaxBatchMessages, hre);

  const participantStorageAddress = await deployParticipantStorage(initialOwner, endpointAddress, hre);

  const tokenRegistryAddress = await deployTokenRegistry(initialOwner, participantStorageAddress, resourceRegistryAddress, endpointAddress, hre);

  const proofsAddress = await deployProofs(hre);

  await registerProxyAddresses(deploymentProxyRegistryCC, endpointAddress, participantStorageAddress, resourceRegistryAddress, tokenRegistryAddress, teleportAddress, proofsAddress, hre);

  const enygmaFactoryAddress = await deployEnygmaFactory(hre);

  const enygmaVerifierk2Address = await deployEnygmaVerifierk2(hre);

  const enygmaVerifierk6Address = await deployEnygmaVerifierk6(hre);

  await configureContracts(
    endpointAddress,
    messageExecutorAddress,
    participantStorageAddress,
    resourceRegistryAddress,
    tokenRegistryAddress,
    initialOwner,
    dhPublic,
    operatorChainId,
    hre,
    enygmaFactoryAddress,
    enygmaVerifierk2Address,
    enygmaVerifierk6Address,
    tokenRegistryAddress
  );

  const ccStartingBlock = await hre.ethers.provider.getBlockNumber();

  const govApiListenerAndFlaggerConfigsInJson = {
    ParticipantStorageContract: participantStorageAddress,
    Teleport: teleportAddress,
    TokenRegistry: tokenRegistryAddress,
    PrivateKey: privateKeySystem,
    ChainId: ccChainId,
    DHPublic: dhPublic,
    DHSecret: dhSecret,
    StartingBlock: ccStartingBlock,
    ProofsAddress: proofsAddress,
    OperatorChainId: '999',
    BatchSize: '20',
    Endpoint: endpointAddress
  };

  const relayerConfigsInEnv = `
COMMITCHAIN_CHAINID=${ccChainId}
COMMITCHAIN_CCSTARTINGBLOCK=${ccStartingBlock}
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=${ccStartingBlock}
COMMITCHAIN_OPERATORCHAINID=999
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=${deploymentProxyRegistryAddress}
COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES=${endpointMaxBatchMessages}
COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES=30


`;

  const contractsConfigsInEnv = `
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=${deploymentProxyRegistryAddress}
`;

  console.log('');
  console.log(`✅ Finished deploy of CC PROXY contracts 👽`);
  console.log('');
  console.log(`===========================================`);
  console.log(`👉👉👉👉 Relayer Configuration 👈👈👈👈`);
  console.log(`-------------------------------------------`);
  console.log('ENV FORMAT:');
  console.log(relayerConfigsInEnv);
  console.log('');
  console.log(`===========================================`);
  console.log(`👉 Governance, Listener & Flagger Configuration 👈`);
  console.log(`-------------------------------------------`);
  console.log('JSON FORMAT:');
  console.log(JSON.stringify(govApiListenerAndFlaggerConfigsInJson, null, 4));
  console.log(`===========================================`);
  console.log(`👉 Contracts Configuration 👈`);
  console.log(`-------------------------------------------`);
  console.log('ENV FORMAT:');
  console.log(contractsConfigsInEnv);
  console.log(`===========================================`);
});

async function deployDeploymentProxyRegistryCC(hre: HardhatRuntimeEnvironment) {
  console.log('Deploying Deployment Proxy Registry...');

  const deploymentProxyRegistryFactory = await hre.ethers.getContractFactory('DeploymentProxyRegistry');
  const deploymentProxyRegistryCC = await deploymentProxyRegistryFactory.deploy();

  await deploymentProxyRegistryCC.waitForDeployment();
  const finalAddress = await deploymentProxyRegistryCC.getAddress();
  console.log('DeploymentProxyRegistry', finalAddress);

  return { deploymentProxyRegistryCC, deploymentProxyRegistryAddress: finalAddress };
}

async function deployEndpointCC(initialOwner: string, chainId: string, ccChainId: string, endpointMaxBatchMessages: string, hre: HardhatRuntimeEnvironment) {
  console.log('Deploying EndpointV1...');

  const maxBatchMessages = parseInt(endpointMaxBatchMessages);

  const endpointFactory = await hre.ethers.getContractFactory('EndpointV1');
  const endpointCC = await hre.upgrades.deployProxy(endpointFactory, [initialOwner, chainId, ccChainId, maxBatchMessages], {
    kind: 'uups',
    initializer: 'initialize(address,uint256,uint256,uint256)'
  });

  return endpointCC.getAddress();
}

async function deployRaylsMessageExecutor(initialOwner: string, hre: HardhatRuntimeEnvironment) {
  const raylsMessageExecutorV1Factory = await hre.ethers.getContractFactory('RaylsMessageExecutorV1');

  console.log('Deploying RaylsMessageExecutorV1...');

  const raylsMessageExecutorV1DeployProxy = await hre.upgrades.deployProxy(raylsMessageExecutorV1Factory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });

  return raylsMessageExecutorV1DeployProxy.getAddress();
}

async function deployTeleport(initialOwner: string, hre: HardhatRuntimeEnvironment) {
  console.log('Deploying Teleport...');

  const teleportFactory = await hre.ethers.getContractFactory('TeleportV1');
  const teleport = await hre.upgrades.deployProxy(teleportFactory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });

  return teleport.getAddress();
}

async function deployResourceRegistry(initialOwner: string, hre: HardhatRuntimeEnvironment) {
  console.log('Deploying ResourceRegistry...');

  const registryFactory = await hre.ethers.getContractFactory('ResourceRegistryV1');
  const resourceRegistry = await hre.upgrades.deployProxy(registryFactory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });

  return resourceRegistry.getAddress();
}

async function deployParticipantStorage(initialOwner: string, endpoint: string, hre: HardhatRuntimeEnvironment) {
  console.log('Deploying ParticipantStorage...');

  const participantStorageFactory = await hre.ethers.getContractFactory('ParticipantStorageV1');
  const participantStorage = await hre.upgrades.deployProxy(participantStorageFactory, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return participantStorage.getAddress();
}

async function deployTokenRegistry(initialOwner: string, participantStorageAt: string, resourceRegistryAt: string, endpoint: string, hre: HardhatRuntimeEnvironment) {
  console.log('Deploying TokenRegistry...');

  const tokenRegistryFactory = await hre.ethers.getContractFactory('TokenRegistryV1');
  const tokenRegistry = await hre.upgrades.deployProxy(tokenRegistryFactory, [initialOwner, participantStorageAt, resourceRegistryAt, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address, address, address)'
  });

  return tokenRegistry.getAddress();
}

async function deployProofs(hre: HardhatRuntimeEnvironment) {
  console.log('Deploying Proofs...');

  const proofsFactory = await hre.ethers.getContractFactory('Proofs');
  const proofsTx = await proofsFactory.deploy();
  const proofsContract = await proofsTx.waitForDeployment();

  return proofsContract.getAddress();
}

async function registerProxyAddresses(
  deploymentProxyRegistryCC: DeploymentProxyRegistry,
  endpointAddress: string,
  participantStorageAddress: string,
  resourceRegistryAddress: string,
  tokenRegistryAddress: string,
  teleportAddress: string,
  proofsAddress: string,
  hre: HardhatRuntimeEnvironment
) {
  console.log('Registering Deployment contracts addresses...');

  return deploymentProxyRegistryCC.setDeployment(resourceRegistryAddress, teleportAddress, endpointAddress, tokenRegistryAddress, proofsAddress, participantStorageAddress);
}

async function addAndUpdateParticipant(participantStorageContract: ParticipantStorageV1, participant: number, role: number, ownerId: string, name: string) {
  console.log('Adding', name);
  const tx = await participantStorageContract.addParticipant({
    chainId: participant,
    role,
    ownerId,
    name
  });

  await tx.wait();

  const txStatus = await participantStorageContract.updateStatus(participant, 1, {
    gasLimit: 5000000
  });
  await txStatus.wait();

  const txBroadcastPermissions = await participantStorageContract.updateBroadcastMessagesPermission(participant, true, {
    gasLimit: 5000000
  });

  await txBroadcastPermissions.wait();

  return;
}

async function configureContracts(
  endpoint: string,
  messageExecutor: string,
  participantStorage: string,
  resourceRegitry: string,
  tokenRegistry: string,
  initialOwner: string,
  dhPublic: string,
  operatorChainId: string,
  hre: HardhatRuntimeEnvironment,
  enygmaFactory: string,
  enygmaVerifierk2: string,
  enygmaVerifierk6: string,
  tokenRegistryAddress: string
) {
  const endpointCC = await hre.ethers.getContractAt('EndpointV1', endpoint);
  console.log('configuring contracts...');

  await endpointCC.getFunction('configureContracts').send(messageExecutor, '0x0000000000000000000000000000000000099999', participantStorage, tokenRegistryAddress);

  const resourceRegistry = await hre.ethers.getContractAt('ResourceRegistryV1', resourceRegitry);
  var txResourceRegistry = await resourceRegistry.setTokenRegistry(tokenRegistry);
  await txResourceRegistry.wait();

  const participantsToAdd = process.env.PARTICIPANTS?.split(',') || [];

  const participantStorageContract = await hre.ethers.getContractAt('ParticipantStorageV1', participantStorage);

  // Note: Coudn't make a Promise.all of all participants+auditor work on Dev CC, so running sequentially
  for (let participant of participantsToAdd) {
    await addAndUpdateParticipant(participantStorageContract, parseInt(participant), 1, '0x0000000000000000000000000000000000000000', `PL of chainId ${participant}`);
  }

  await addAndUpdateParticipant(participantStorageContract, 999, 2, initialOwner, `Auditor`);

  const currBlockNumber = await hre.ethers.provider.getBlockNumber();
  const txSetChainInfo = await participantStorageContract.setChainInfo(operatorChainId, dhPublic, currBlockNumber);
  await txSetChainInfo.wait();

  const tokenRegistyContract = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistry);

  await tokenRegistyContract.updateEnygmaFactory(enygmaFactory);
  console.log('Enygma factory on TokenRegistry updated');

  await tokenRegistyContract.updateEnygmaVerifierk2(enygmaVerifierk2);
  console.log('Enygma Verifier k=2 on TokenRegistry updated');

  await tokenRegistyContract.updateEnygmaVerifierk6(enygmaVerifierk6);
  console.log('Enygma Verifier k=6 on TokenRegistry updated');

  console.log('configuring contracts OK!');
}
async function deployEnygmaFactory(hre: HardhatRuntimeEnvironment) {
  console.log('Deploying Enygma Factory...');

  const enygmaFactory = await hre.ethers.getContractFactory('EnygmaFactory');

  const deployment = await enygmaFactory.deploy({ gasLimit: 5000000 });
  const deploymentReceipt = await deployment.waitForDeployment();

  const finalAddress = await deploymentReceipt.getAddress();
  console.log('EnygmaFactory', finalAddress);

  return finalAddress;
}

async function deployEnygmaVerifierk2(hre: HardhatRuntimeEnvironment) {
  const enygmaValidatorFactory = await hre.ethers.getContractFactory('EnygmaVerifierk2');

  const txDeploy = await enygmaValidatorFactory.deploy();
  txDeploy.waitForDeployment();

  var implementationAddress = await txDeploy.getAddress();

  console.log('Deploying Enygma Verifier Proxy k=2...');

  const enygmaValidatorProxyFactory = await hre.ethers.getContractFactory('EnygmaVerifierk2Proxy');

  const txDeployProxy = await enygmaValidatorProxyFactory.deploy(implementationAddress);
  txDeployProxy.waitForDeployment();

  var proxyAddress = await txDeployProxy.getAddress();

  console.log('Enygma Verifier k=2 Proxy', proxyAddress);

  console.log('Setting up Enygma Verifier k=2 Proxy', proxyAddress);

  const enygmaValidatorProxy = await hre.ethers.getContractAt('EnygmaVerifierk2Proxy', proxyAddress);

  await enygmaValidatorProxy.setVerifierAddress(implementationAddress);

  console.log('Enygma Verifier k=2 deploy & configuration OK');

  return proxyAddress;
}

async function deployEnygmaVerifierk6(hre: HardhatRuntimeEnvironment) {
  console.log('Deploying Enygma Verifier for k=6...');

  const enygmaValidatorFactory = await hre.ethers.getContractFactory('EnygmaVerifierk6');

  const txDeploy = await enygmaValidatorFactory.deploy();
  txDeploy.waitForDeployment();

  var implementationAddress = await txDeploy.getAddress();

  console.log('Deploying Enygma Verifier Proxy k=6...');

  const enygmaValidatorProxyFactory = await hre.ethers.getContractFactory('EnygmaVerifierk6Proxy');

  const txDeployProxy = await enygmaValidatorProxyFactory.deploy(implementationAddress);
  txDeployProxy.waitForDeployment();

  var proxyAddress = await txDeployProxy.getAddress();

  console.log('Enygma Verifier k=6 Proxy', proxyAddress);

  console.log('Setting up Enygma Verifier k=6 Proxy', proxyAddress);

  const enygmaValidatorProxy = await hre.ethers.getContractAt('EnygmaVerifierk6Proxy', proxyAddress);

  await enygmaValidatorProxy.setVerifierAddress(implementationAddress);

  console.log('Enygma Verifier k=6 deploy & configuration OK');

  return proxyAddress;
}
async function dhGen() {
  const exec = promisify(execCallback);
  try {
    const { stdout, stderr } = await exec('./hardhat/tasks/utils/dhgen/dhgen');

    if (stderr) {
      console.error(`Error on DhGen: ${stderr}`);
    }
    const rawData = fs.readFileSync('./keypair.json', { encoding: 'utf-8' });
    const jsonData = JSON.parse(rawData);
    return jsonData;
  } catch (error: any) {
    console.error(`Error on DhGen: ${error.message}`);
    throw error;
  }
}
