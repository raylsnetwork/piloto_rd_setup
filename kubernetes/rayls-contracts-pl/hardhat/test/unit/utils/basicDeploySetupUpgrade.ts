import hre, { ethers, upgrades } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './RelayerMockEthers';
import { EndpointV1 } from '../../../../typechain-types';
import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import { token } from '../../../../typechain-types/@openzeppelin/contracts';

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

export async function basicDeploySetupUpgrade() {
  // Contracts are deployed using the first signer/account by default
  const [owner, otherAccount, account3, account4, account5, account6] = await hre.ethers.getSigners();
  const chainIdPL1 = '123';
  const chainIdPL2 = '456';
  const chainIdPL3 = '789';
  const chainIdPL4 = '901';
  const chainIdCC = '1789';

  const ownerAddress = await owner.getAddress();

  const token = await hre.ethers.getContractFactory('TokenExample');
  const tokenCustom = await hre.ethers.getContractFactory('CustomTokenExample');

  const raylsMessageExecutorPL1 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL2 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL3 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL4 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorCC = await deployRaylsMessageExecutor(ownerAddress);

  const raylsMessageExecutorPL1Address = await raylsMessageExecutorPL1.getAddress();
  const raylsMessageExecutorPL2Address = await raylsMessageExecutorPL2.getAddress();
  const raylsMessageExecutorPL3Address = await raylsMessageExecutorPL3.getAddress();
  const raylsMessageExecutorPL4Address = await raylsMessageExecutorPL4.getAddress();
  const raylsMessageExecutorCCAddress = await raylsMessageExecutorCC.getAddress();

  const endpointPL1 = await deployEndpointCC(ownerAddress, chainIdPL1, chainIdCC);
  const endpointPL2 = await deployEndpointCC(ownerAddress, chainIdPL2, chainIdCC);
  const endpointPL3 = await deployEndpointCC(ownerAddress, chainIdPL3, chainIdCC);
  const endpointPL4 = await deployEndpointCC(ownerAddress, chainIdPL4, chainIdCC);
  const endpointCC = await deployEndpointCC(ownerAddress, chainIdCC, chainIdCC);

  const endpointPL1Addresss = await endpointPL1.getAddress();
  const endpointPL2Addresss = await endpointPL2.getAddress();
  const endpointPL3Addresss = await endpointPL3.getAddress();
  const endpointPL4Addresss = await endpointPL4.getAddress();
  const endpointCCAddresss = await endpointCC.getAddress();

  const participantStorageReplicaPL1 = await deployRaylsParticipantReplica(ownerAddress, endpointPL1Addresss);
  const participantStorageReplicaPL2 = await deployRaylsParticipantReplica(ownerAddress, endpointPL2Addresss);
  const tokenRegistryReplicaPL1 = await deployTokenRegistryV1Replica(ownerAddress, endpointPL1Addresss);
  const tokenRegistryReplicaPL2 = await deployTokenRegistryV1Replica(ownerAddress, endpointPL2Addresss);
  const tokenRegistryReplicaPL3 = await deployTokenRegistryV1Replica(ownerAddress, endpointPL3Addresss);
  const tokenRegistryReplicaPL4 = await deployTokenRegistryV1Replica(ownerAddress, endpointPL4Addresss);

  const tokenRegistryReplicaPL1Address = await tokenRegistryReplicaPL1.getAddress();
  const tokenRegistryReplicaPL2Address = await tokenRegistryReplicaPL2.getAddress();
  const tokenRegistryReplicaPL3Address = await tokenRegistryReplicaPL3.getAddress();
  const tokenRegistryReplicaPL4Address = await tokenRegistryReplicaPL4.getAddress();

  const participantStorageReplicaPL3 = await deployRaylsParticipantReplica(ownerAddress, endpointPL3Addresss);
  const participantStorageReplicaPL4 = await deployRaylsParticipantReplica(ownerAddress, endpointPL4Addresss);

  const participantStorageReplicaPL1Address = await participantStorageReplicaPL1.getAddress();
  const participantStorageReplicaPL2Address = await participantStorageReplicaPL2.getAddress();
  const participantStorageReplicaPL3Address = await participantStorageReplicaPL3.getAddress();
  const participantStorageReplicaPL4Address = await participantStorageReplicaPL4.getAddress();

  const resourceRegistry = await deployResourceRegistry(ownerAddress);
  const resourceRegistryAddress = await resourceRegistry.getAddress();

  const participantStorage = await deployParticipantStorage(ownerAddress, endpointCCAddresss);
  const participantStorageAddress = await participantStorage.getAddress();

  var enygmaFactory = await deployEnygmaFactory();
  var enygmaVerifierk2 = await deployEnygmaVerifierk2();
  var enygmaVerifierk6 = await deployEnygmaVerifierk6();

  const tokenRegistry = await deployTokenRegistry(
    ownerAddress,
    participantStorageAddress,
    resourceRegistryAddress,
    endpointCCAddresss,
    await enygmaFactory.getAddress(),
    await enygmaVerifierk2.getAddress(),
    await enygmaVerifierk6.getAddress()
  );

  const tokenRegistryAddress = await tokenRegistry.getAddress();
  await resourceRegistry.setTokenRegistry(tokenRegistryAddress);

  const messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null } = {};
  const endpointMappings: { [chainId: string]: EndpointV1 | null } = {};
  endpointMappings[chainIdPL1] = endpointPL1;
  endpointMappings[chainIdPL2] = endpointPL2;
  endpointMappings[chainIdPL3] = endpointPL3;
  endpointMappings[chainIdPL4] = endpointPL4;
  endpointMappings[chainIdCC] = endpointCC;

  await endpointPL1.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL2.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL3.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL4.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);

  const raylsContractFactoryPL1 = await deployContractFactory(ownerAddress, endpointPL1Addresss);
  const raylsContractFactoryPL2 = await deployContractFactory(ownerAddress, endpointPL2Addresss);
  const raylsContractFactoryPL3 = await deployContractFactory(ownerAddress, endpointPL3Addresss);
  const raylsContractFactoryPL4 = await deployContractFactory(ownerAddress, endpointPL4Addresss);

  const raylsContractFactoryPL1Address = await raylsContractFactoryPL1.getAddress();
  const raylsContractFactoryPL2Address = await raylsContractFactoryPL2.getAddress();
  const raylsContractFactoryPL3Address = await raylsContractFactoryPL3.getAddress();
  const raylsContractFactoryPL4Address = await raylsContractFactoryPL4.getAddress();

  // console.log('raylsContractFactoryPL1Addresss', raylsContractFactoryPL1Addresss);
  // console.log('raylsContractFactoryPL2Addresss', raylsContractFactoryPL2Addresss);

  await endpointPL1.configureContracts(
    raylsMessageExecutorPL1Address,
    raylsContractFactoryPL1Address,
    participantStorageReplicaPL1Address,
    tokenRegistryReplicaPL1Address
  );
  await endpointPL2.configureContracts(
    raylsMessageExecutorPL2Address,
    raylsContractFactoryPL2Address,
    participantStorageReplicaPL2Address,
    tokenRegistryReplicaPL2Address
  );
  await endpointCC.configureContracts(
    raylsMessageExecutorCCAddress,
    '0x0000000000000000000000000000000000000002',
    participantStorageAddress,
    tokenRegistryAddress
  );

  await endpointPL3.configureContracts(raylsMessageExecutorPL3Address, raylsContractFactoryPL3Address, participantStorageReplicaPL3Address, tokenRegistryReplicaPL3Address);
  await endpointPL4.configureContracts(raylsMessageExecutorPL4Address, raylsContractFactoryPL4Address, participantStorageReplicaPL4Address, tokenRegistryReplicaPL4Address);


  await participantStorage.addParticipant({
    chainId: chainIdPL1,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL1'
  });
  await participantStorage.updateStatus(chainIdPL1, 1);

  await participantStorage.addParticipant({
    chainId: chainIdPL2,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL2'
  });
  await participantStorage.updateStatus(chainIdPL2, 1);

  await participantStorage.addParticipant({
    chainId: chainIdPL3,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL3'
  });
  await participantStorage.updateStatus(chainIdPL3, 1);

  await participantStorage.addParticipant({
    chainId: chainIdPL4,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL4'
  });
  await participantStorage.updateStatus(chainIdPL4, 1);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  const tokenPL1 = await token.deploy('TokenTest', 'TT', endpointPL1Addresss);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  const tokenCustomPL1 = await tokenCustom.deploy('TokenCustomTest', 'TCT', endpointPL1Addresss, endpointPL1Addresss, endpointPL1Addresss);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);


  const enygma = await deployEnygma(ownerAddress, participantStorageAddress, endpointCCAddresss, tokenRegistryAddress);

  //const enygmaEvents = await deployEnygmaEvents();

  const enygmaExample = await deployEnygmaExample(ownerAddress, endpointPL1Addresss);

  return {
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
    account5,
    account6,
    messageIdsAlreadyProcessedOnDeploy: { ...messageIdsAlreadyProcessed },
    tokenRegistry,
    resourceRegistry,
    participantStorage,
    participantStorageReplicaPL1,
    participantStorageReplicaPL2,
    participantStorageReplicaPL3,
    participantStorageReplicaPL4,
    raylsMessageExecutorPL1,
    raylsMessageExecutorPL2,
    raylsMessageExecutorPL3,
    raylsMessageExecutorPL4,
    raylsMessageExecutorCC,
    tokenCustomPL1,
    enygma,
    enygmaExample
  };
}

async function deployEndpointCC(initialOwner: string, chainId: string, ccChainId: string) {
  const maxBatchMessages = 200;
  const endpointFactory = await ethers.getContractFactory('EndpointV1');
  const implementation = await upgrades.deployProxy(endpointFactory, [initialOwner, chainId, ccChainId, maxBatchMessages], {
    kind: 'uups',
    initializer: 'initialize(address,uint256,uint256,uint256)'
  });

  return ethers.getContractAt('EndpointV1', implementation);
}

async function deployRaylsMessageExecutor(initialOwner: string) {
  const raylsMessageExecutorV1Factory = await ethers.getContractFactory('RaylsMessageExecutorV1');
  const implementation = await upgrades.deployProxy(raylsMessageExecutorV1Factory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });
  return ethers.getContractAt('RaylsMessageExecutorV1', implementation);
}

async function deployRaylsParticipantReplica(initialOwner: string, endpoint: string) {
  const participantStorageReplicaV2 = await ethers.getContractFactory('ParticipantStorageReplicaV2');

  const implementation = await upgrades.deployProxy(participantStorageReplicaV2, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return ethers.getContractAt('ParticipantStorageReplicaV2', implementation);
}

async function deployResourceRegistry(initialOwner: string) {
  const registryFactory = await ethers.getContractFactory('ResourceRegistryV1');
  const implementation = await upgrades.deployProxy(registryFactory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });

  return ethers.getContractAt('ResourceRegistryV1', implementation);
}

async function deployParticipantStorage(initialOwner: string, endpoint: string) {
  const participantStorageFactory = await ethers.getContractFactory('ParticipantStorageV1');
  const implementation = await upgrades.deployProxy(participantStorageFactory, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return ethers.getContractAt('ParticipantStorageV1', implementation);
}

async function deployTokenRegistry(initialOwner: string, participantStorageAt: string, resourceRegistryAt: string, endpoint: string, enygmaFactoryAt: string, enygmaVerifierK2At: string , enygmaVerifierK6At: string) { 
  const tokenRegistryFactory = await ethers.getContractFactory('TokenRegistryV1');
  const implementation = await upgrades.deployProxy(tokenRegistryFactory, [initialOwner, participantStorageAt, resourceRegistryAt, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address, address, address)'
  });

  const tokenRegistry = await ethers.getContractAt('TokenRegistryV1', implementation);
  
  await tokenRegistry.updateEnygmaFactory(enygmaFactoryAt);
  await tokenRegistry.updateEnygmaVerifierk2(enygmaVerifierK2At);
  await tokenRegistry.updateEnygmaVerifierk6(enygmaVerifierK6At);

  return tokenRegistry;
}

async function deployContractFactory(initialOwner: string, endpoint: string) {
  const raylsContractFactory = await hre.ethers.getContractFactory('RaylsContractFactoryV1');
  const factory: any = await raylsContractFactory.deploy();
  await factory.waitForDeployment();
  await factory.initialize(endpoint, initialOwner)
  return factory;
}

async function deployTokenRegistryV1Replica(initialOwner: string, endpointAddress: string) {
  const factory = await ethers.getContractFactory('TokenRegistryReplicaV1');

  const implementation = await upgrades.deployProxy(factory, [initialOwner, endpointAddress], {
    kind: 'uups',
    initializer: 'initialize(address,address)'
  });

  return ethers.getContractAt('TokenRegistryReplicaV1', implementation);
}

async function deployEnygmaFactory() {
  const enygmaFactory = await ethers.getContractFactory('EnygmaFactory');
  const enygma = await enygmaFactory.deploy();
  await enygma.waitForDeployment();
  return enygma;
}

async function deployEnygmaPLEvents(endpointPlAddress: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaPLEvents');
  const enygma = await enygmaFactory.deploy(endpointPlAddress);
  await enygma.waitForDeployment();
  return enygma;
}

// async function deployEnygmaCCEvents() {
//   const enygmaFactory = await ethers.getContractFactory('EnygmaCCEvents');
//   const enygma = await enygmaFactory.deploy();
//   await enygma.waitForDeployment();
//   return enygma;
// }

async function deployEnygmaVerifierk2() {
  const enygmaVerifierFactory = await ethers.getContractFactory('EnygmaVerifierk2');
  const enygmaVerifier = await enygmaVerifierFactory.deploy();
  await enygmaVerifier.waitForDeployment();
  return enygmaVerifier;
}

async function deployEnygmaVerifierk6() {
  const enygmaVerifierFactory = await ethers.getContractFactory('EnygmaVerifierk6');
  const enygmaVerifier = await enygmaVerifierFactory.deploy();
  await enygmaVerifier.waitForDeployment();
  return enygmaVerifier;
}
async function deployEnygma(initialOwner: string, participantStorageAt: string, endpointAt: string, tokenRegistryAt: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaV1');
  const resourceId = `0x${genRanHex(64)}`;  
  const enygma = await enygmaFactory.deploy("enygma", "eny", 18, initialOwner, participantStorageAt, endpointAt, tokenRegistryAt, resourceId, initialOwner);
  await enygma.waitForDeployment();  
  return enygma;
}

async function deployEnygmaExample(initialOwner: string, endpointAt: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaTokenExample');
  const enygma = await enygmaFactory.deploy("enygma", "eny", endpointAt);
  await enygma.waitForDeployment();  
  await enygma.submitTokenRegistration(0);
  return enygma;
}

// async function deployEnygmaEvents() {
//   const enygmaFactory = await ethers.getContractFactory('EnygmaEvents');
//   const enygma = await enygmaFactory.deploy();
//   await enygma.waitForDeployment();  
//   return enygma;
// }