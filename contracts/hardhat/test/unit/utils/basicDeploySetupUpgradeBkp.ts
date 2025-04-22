import hre, { ethers, upgrades } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './RelayerMockEthers';
import { EndpointV1 } from '../../../../typechain-types';
import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';


export async function basicDeploySetupUpgradeBkp2() {
  // Contracts are deployed using the first signer/account by default
  const [owner, otherAccount, account3, account4, account5, account6] = await hre.ethers.getSigners();
  const chainIdPL1 = '123';
  const chainIdPL2 = '456';
  const chainIdPL3 = '789';
  const chainIdPL4 = '101';
  const chainIdCC = '789';

  const ownerAddress = await owner.getAddress();

  const token = await hre.ethers.getContractFactory('TokenExample');

  const raylsMessageExecutorPL1 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL2 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorCC = await deployRaylsMessageExecutor(ownerAddress);

  const raylsMessageExecutorPL1Address = await raylsMessageExecutorPL1.getAddress();
  const raylsMessageExecutorPL2Address = await raylsMessageExecutorPL2.getAddress();
  const raylsMessageExecutorCCAddress = await raylsMessageExecutorCC.getAddress();

  // console.log('raylsMessageExecutorPL1Address', raylsMessageExecutorPL1Address);
  // console.log('raylsMessageExecutorPL2Address', raylsMessageExecutorPL2Address);
  // console.log('raylsMessageExecutorCCAddress', raylsMessageExecutorCCAddress);

  const endpointPL1 = await deployEndpointCC(ownerAddress, chainIdPL1, chainIdCC);
  const endpointPL2 = await deployEndpointCC(ownerAddress, chainIdPL2, chainIdCC);
  const endpointCC = await deployEndpointCC(ownerAddress, chainIdCC, chainIdCC);

  const endpointPL1Addresss = await endpointPL1.getAddress();
  const endpointPL2Addresss = await endpointPL2.getAddress();
  const endpointCCAddresss = await endpointCC.getAddress();

  // console.log('endpointPL1Addresss', endpointPL1Addresss);
  // console.log('endpointPL2Addresss', endpointPL2Addresss);

  const participantStorageReplicaPL1 = await deployRaylsParticipantReplica(ownerAddress, endpointPL1Addresss);
  const participantStorageReplicaPL2 = await deployRaylsParticipantReplica(ownerAddress, endpointPL2Addresss);

  const participantStorageReplicaPL1Address = await participantStorageReplicaPL1.getAddress();
  const participantStorageReplicaPL2Address = await participantStorageReplicaPL2.getAddress();

  // console.log('participantStorageReplicaPL1Addresss', participantStorageReplicaPL1Addresss);
  // console.log('participantStorageReplicaPL2Addresss', participantStorageReplicaPL2Addresss);

  const resourceRegistry = await deployResourceRegistry(ownerAddress);

  const resourceRegistryAddress = await resourceRegistry.getAddress();

  //console.log('resourceRegistryAddress', resourceRegistryAddress);

  const participantStorage = await deployParticipantStorage(ownerAddress, endpointCCAddresss);

  const participantStorageAddress = await participantStorage.getAddress();

  // console.log('participantStorageAddress', participantStorageAddress);

  const tokenRegistry = await deployTokenRegistry(ownerAddress, participantStorageAddress, resourceRegistryAddress, endpointCCAddresss);

  const tokenRegistryAddress = await tokenRegistry.getAddress();

  //console.log('tokenRegistryAddress', tokenRegistryAddress);

  await resourceRegistry.setTokenRegistry(tokenRegistryAddress);

  const messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null } = {};
  const endpointMappings: { [chainId: string]: EndpointV1 | null } = {};
  endpointMappings[chainIdPL1] = endpointPL1;
  endpointMappings[chainIdPL2] = endpointPL2;
  endpointMappings[chainIdCC] = endpointCC;

  await endpointPL1.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL2.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);

  const raylsContractFactoryPL1 = await deployContractFactory(ownerAddress, endpointPL1Addresss);
  const raylsContractFactoryPL2 = await deployContractFactory(otherAccount.address, endpointPL2Addresss);

  const raylsContractFactoryPL1Address = await raylsContractFactoryPL1.getAddress();
  const raylsContractFactoryPL2Address = await raylsContractFactoryPL2.getAddress();

  // console.log('raylsContractFactoryPL1Addresss', raylsContractFactoryPL1Addresss);
  // console.log('raylsContractFactoryPL2Addresss', raylsContractFactoryPL2Addresss);

  await endpointPL1.configureContracts(
    raylsMessageExecutorPL1Address, 
    raylsContractFactoryPL1Address, 
    participantStorageReplicaPL1Address,
  );
  await endpointPL2.configureContracts(
    raylsMessageExecutorPL2Address, 
    raylsContractFactoryPL2Address, 
    participantStorageReplicaPL2Address,
  );
  await endpointCC.configureContracts(
    raylsMessageExecutorCCAddress, 
    '0x0000000000000000000000000000000000000002', 
    participantStorageAddress,
  );

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
    ownerId: account3.address,
    name: 'PL3'
  });
  await participantStorage.updateStatus(chainIdPL3, 1);
  await participantStorage.addParticipant({
    chainId: chainIdPL4,
    role: 1,
    ownerId: account4.address,
    name: 'PL4'
  });
  await participantStorage.updateStatus(chainIdPL4, 1);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  const tokenPL1 = await token.deploy('TokenTest', 'TT', endpointPL1Addresss);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  const enygma = await deployEnygma(ownerAddress, participantStorageAddress);

  const enygmaEvents = await deployEnygmaEvents();

  const enygmaExample = await deployEnygmaExample(ownerAddress, endpointPL1Addresss, await enygmaEvents.getAddress());

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
    messageIdsAlreadyProcessedOnDeploy: { ...messageIdsAlreadyProcessed },
    tokenRegistry,
    resourceRegistry,
    participantStorage,
    participantStorageReplicaPL1,
    participantStorageReplicaPL2,
    raylsMessageExecutorPL1,
    raylsMessageExecutorPL2,
    raylsMessageExecutorCC,
    chainIdPL3,
    chainIdPL4,
    account5,
    account6,
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
  const participantStorageReplicaV1 = await ethers.getContractFactory('ParticipantStorageReplicaV1');

  const implementation = await upgrades.deployProxy(participantStorageReplicaV1, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return ethers.getContractAt('ParticipantStorageReplicaV1', implementation);
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
  const participantStorageFactory = await ethers.getContractFactory('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2');
  const implementation = await upgrades.deployProxy(participantStorageFactory, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', implementation);
}

async function deployTokenRegistry(initialOwner: string, participantStorageAt: string, resourceRegistryAt: string, endpoint: string) {
  const tokenRegistryFactory = await ethers.getContractFactory('TokenRegistryV2');
  const implementation = await upgrades.deployProxy(tokenRegistryFactory, [initialOwner, participantStorageAt, resourceRegistryAt, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address, address, address)'
  });

  return ethers.getContractAt('TokenRegistryV2', implementation);
}

async function deployContractFactory(initialOwner: string, endpoint: string) {
  const raylsContractFactory = await hre.ethers.getContractFactory('RaylsContractFactoryV1');
  const factory: any = await raylsContractFactory.deploy();
  await factory.waitForDeployment();
  await factory.initialize(endpoint, initialOwner)
  return factory;
}

async function deployEnygma(initialOwner: string, participantStorageAt: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaV2');
  const enygma = await enygmaFactory.deploy("enygma", "eny", 18, initialOwner, participantStorageAt);
  await enygma.waitForDeployment();  
  return enygma;
}

async function deployEnygmaExample(initialOwner: string, endpointAt: string, enygmaEventsAt: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaTokenExample');
  const enygma = await enygmaFactory.deploy("enygma", "eny", endpointAt, enygmaEventsAt);
  await enygma.waitForDeployment();  
  await enygma.submitTokenRegistration(0);
  return enygma;
}

async function deployEnygmaEvents() {
  const enygmaFactory = await ethers.getContractFactory('EnygmaEvents');
  const enygma = await enygmaFactory.deploy();
  await enygma.waitForDeployment();  
  return enygma;
}