import hre, { ethers, upgrades } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './RelayerMockEthers';
import { EndpointV1 } from '../../../../typechain-types';
import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import { token } from '../../../../typechain-types/@openzeppelin/contracts';

export async function basicDeploySetupUpgrade_Enygma() {
  // Contracts are deployed using the first signer/account by default
  const [owner, otherAccount, account3, account4, account5, account6] = await hre.ethers.getSigners();
  const chainIdPL1 = '00000';
  const chainIdPL2 = '00001';
  const chainIdPL3 = '00002';
  const chainIdPL4 = '00003';
  const chainIdPL5 = '00004';
  const chainIdPL6 = '00005';
  const chainIdCC = '1789';

  const ownerAddress = await owner.getAddress();

  const raylsMessageExecutorPL1 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL2 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL3 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL4 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL5 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorPL6 = await deployRaylsMessageExecutor(ownerAddress);
  const raylsMessageExecutorCC = await deployRaylsMessageExecutor(ownerAddress);

  const raylsMessageExecutorPL1Address = await raylsMessageExecutorPL1.getAddress();
  const raylsMessageExecutorPL2Address = await raylsMessageExecutorPL2.getAddress();
  const raylsMessageExecutorPL3Address = await raylsMessageExecutorPL3.getAddress();
  const raylsMessageExecutorPL4Address = await raylsMessageExecutorPL4.getAddress();
  const raylsMessageExecutorPL5Address = await raylsMessageExecutorPL5.getAddress();
  const raylsMessageExecutorPL6Address = await raylsMessageExecutorPL6.getAddress();
  const raylsMessageExecutorCCAddress = await raylsMessageExecutorCC.getAddress();

  const endpointPL1 = await deployEndpointCC(ownerAddress, chainIdPL1, chainIdCC);
  const endpointPL2 = await deployEndpointCC(ownerAddress, chainIdPL2, chainIdCC);
  const endpointPL3 = await deployEndpointCC(ownerAddress, chainIdPL3, chainIdCC);
  const endpointPL4 = await deployEndpointCC(ownerAddress, chainIdPL4, chainIdCC);
  const endpointPL5 = await deployEndpointCC(ownerAddress, chainIdPL5, chainIdCC);
  const endpointPL6 = await deployEndpointCC(ownerAddress, chainIdPL6, chainIdCC);
  const endpointCC = await deployEndpointCC(ownerAddress, chainIdCC, chainIdCC);

  const endpointPL1Addresss = await endpointPL1.getAddress();
  const endpointPL2Addresss = await endpointPL2.getAddress();
  const endpointPL3Addresss = await endpointPL3.getAddress();
  const endpointPL4Addresss = await endpointPL4.getAddress();
  const endpointPL5Addresss = await endpointPL5.getAddress();
  const endpointPL6Addresss = await endpointPL6.getAddress();
  const endpointCCAddresss = await endpointCC.getAddress();

  const participantStorageReplicaPL1 = await deployRaylsParticipantReplica(ownerAddress, endpointPL1Addresss);
  const participantStorageReplicaPL2 = await deployRaylsParticipantReplica(ownerAddress, endpointPL2Addresss);
  const participantStorageReplicaPL3 = await deployRaylsParticipantReplica(ownerAddress, endpointPL3Addresss);
  const participantStorageReplicaPL4 = await deployRaylsParticipantReplica(ownerAddress, endpointPL4Addresss);
  const participantStorageReplicaPL5 = await deployRaylsParticipantReplica(ownerAddress, endpointPL5Addresss);
  const participantStorageReplicaPL6 = await deployRaylsParticipantReplica(ownerAddress, endpointPL6Addresss);

  const participantStorageReplicaPL1Address = await participantStorageReplicaPL1.getAddress();
  const participantStorageReplicaPL2Address = await participantStorageReplicaPL2.getAddress();
  const participantStorageReplicaPL3Address = await participantStorageReplicaPL3.getAddress();
  const participantStorageReplicaPL4Address = await participantStorageReplicaPL4.getAddress();
  const participantStorageReplicaPL5Address = await participantStorageReplicaPL5.getAddress();
  const participantStorageReplicaPL6Address = await participantStorageReplicaPL6.getAddress();

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
  endpointMappings[chainIdPL5] = endpointPL5;
  endpointMappings[chainIdPL6] = endpointPL6;
  endpointMappings[chainIdCC] = endpointCC;

  await endpointPL1.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL2.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL3.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL4.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL5.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
  await endpointPL6.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);

  const raylsContractFactoryPL1 = await deployContractFactory(ownerAddress, endpointPL1Addresss);
  const raylsContractFactoryPL2 = await deployContractFactory(ownerAddress, endpointPL2Addresss);
  const raylsContractFactoryPL3 = await deployContractFactory(ownerAddress, endpointPL3Addresss);
  const raylsContractFactoryPL4 = await deployContractFactory(ownerAddress, endpointPL4Addresss);
  const raylsContractFactoryPL5 = await deployContractFactory(ownerAddress, endpointPL5Addresss);
  const raylsContractFactoryPL6 = await deployContractFactory(ownerAddress, endpointPL6Addresss);

  const raylsContractFactoryPL1Address = await raylsContractFactoryPL1.getAddress();
  const raylsContractFactoryPL2Address = await raylsContractFactoryPL2.getAddress();
  const raylsContractFactoryPL3Address = await raylsContractFactoryPL3.getAddress();
  const raylsContractFactoryPL4Address = await raylsContractFactoryPL4.getAddress();
  const raylsContractFactoryPL5Address = await raylsContractFactoryPL5.getAddress();
  const raylsContractFactoryPL6Address = await raylsContractFactoryPL6.getAddress();

  await endpointPL1.configureContracts(raylsMessageExecutorPL1Address, raylsContractFactoryPL1Address, participantStorageReplicaPL1Address);
  await endpointPL2.configureContracts(raylsMessageExecutorPL2Address, raylsContractFactoryPL2Address, participantStorageReplicaPL2Address);
  await endpointPL3.configureContracts(raylsMessageExecutorPL3Address, raylsContractFactoryPL3Address, participantStorageReplicaPL3Address);
  await endpointPL4.configureContracts(raylsMessageExecutorPL4Address, raylsContractFactoryPL4Address, participantStorageReplicaPL4Address);
  await endpointPL5.configureContracts(raylsMessageExecutorPL5Address, raylsContractFactoryPL5Address, participantStorageReplicaPL5Address);
  await endpointPL6.configureContracts(raylsMessageExecutorPL6Address, raylsContractFactoryPL6Address, participantStorageReplicaPL6Address);

  await endpointCC.configureContracts(raylsMessageExecutorCCAddress, '0x0000000000000000000000000000000000000002', participantStorageAddress);

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

  await participantStorage.addParticipant({
    chainId: chainIdPL5,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL5'
  });
  await participantStorage.updateStatus(chainIdPL5, 1);

  await participantStorage.addParticipant({
    chainId: chainIdPL6,
    role: 1,
    ownerId: ownerAddress,
    name: 'PL6'
  });
  await participantStorage.updateStatus(chainIdPL6, 1);

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);


  const resourceId = '0x7265736f757263652d6964000000000000000000000000000000000000000000'; // 'resource-id' padded to bytes32

  // Deploy the main Enygma contract
  const enygma = await deployEnygma(
    ownerAddress,
    participantStorageAddress,
    endpointCCAddresss, // Pass the endpoint for the commit chain
    tokenRegistryAddress, // Token Registry contract address
    resourceId, // Resource ID as a string (convert to bytes32 inside the deploy function)
    Number(chainIdPL1) // Owner chain ID
  );

  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  // Deploy the Enygma example contract
  const enygmaExample = await deployEnygmaExample(
    ownerAddress,
    endpointPL1Addresss // Endpoint for PL1
  );

  return {
    owner,
    otherAccount,
    account3,
    account4,
    account5,
    account6,
    endpointPL1,
    endpointPL2,
    endpointPL3,
    endpointPL4,
    endpointPL5,
    endpointPL6,
    raylsContractFactoryPL1,
    raylsContractFactoryPL2,
    raylsContractFactoryPL3,
    raylsContractFactoryPL4,
    raylsContractFactoryPL5,
    raylsContractFactoryPL6,
    chainIdPL1,
    chainIdPL2,
    chainIdPL3,
    chainIdPL4,
    chainIdPL5,
    chainIdPL6,
    endpointMappings,
    messageIdsAlreadyProcessedOnDeploy: { ...messageIdsAlreadyProcessed },
    tokenRegistry,
    resourceRegistry,
    participantStorage,
    participantStorageReplicaPL1,
    participantStorageReplicaPL2,
    participantStorageReplicaPL3,
    participantStorageReplicaPL4,
    participantStorageReplicaPL5,
    participantStorageReplicaPL6,
    raylsMessageExecutorPL1,
    raylsMessageExecutorPL2,
    raylsMessageExecutorPL3,
    raylsMessageExecutorPL4,
    raylsMessageExecutorPL5,
    raylsMessageExecutorPL6,
    raylsMessageExecutorCC,
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
  const participantStorageFactory = await ethers.getContractFactory('ParticipantStorageV2');
  const implementation = await upgrades.deployProxy(participantStorageFactory, [initialOwner, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address)'
  });

  return ethers.getContractAt('ParticipantStorageV2', implementation);
}

async function deployTokenRegistry(
  initialOwner: string,
  participantStorageAt: string,
  resourceRegistryAt: string,
  endpoint: string,
  enygmaFactoryAt: string,
  enygmaVerifierK2At: string,
  enygmaVerifierK6At: string
) {
  const tokenRegistryFactory = await ethers.getContractFactory('TokenRegistryV2');
  const implementation = await upgrades.deployProxy(tokenRegistryFactory, [initialOwner, participantStorageAt, resourceRegistryAt, endpoint], {
    kind: 'uups',
    initializer: 'initialize(address, address, address, address)'
  });

  const tokenRegistry = await ethers.getContractAt('TokenRegistryV2', implementation);

  await tokenRegistry.updateEnygmaFactory(enygmaFactoryAt);
  await tokenRegistry.updateEnygmaVerifierk2(enygmaVerifierK2At);
  await tokenRegistry.updateEnygmaVerifierk6(enygmaVerifierK6At);

  return tokenRegistry;
}

async function deployContractFactory(initialOwner: string, endpoint: string) {
  const raylsContractFactory = await hre.ethers.getContractFactory('RaylsContractFactoryV1');
  const factory: any = await raylsContractFactory.deploy();
  await factory.waitForDeployment();
  await factory.initialize(endpoint, initialOwner);
  return factory;
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

async function deployEnygma(initialOwner: string, participantStorageAt: string, endpointAt: string, tokenRegistryAt: string, resourceId: string, ownerChainId: number) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaV2');
  const enygma = await enygmaFactory.deploy('enygma', 'eny', 18, initialOwner, participantStorageAt, endpointAt, tokenRegistryAt, resourceId, ownerChainId);
  await enygma.waitForDeployment();
  return enygma;
}

async function deployEnygmaExample(initialOwner: string, endpointAt: string) {
  const enygmaFactory = await ethers.getContractFactory('EnygmaTokenExample');
  const enygma = await enygmaFactory.deploy('enygma', 'eny', endpointAt);
  await enygma.waitForDeployment();
  await enygma.submitTokenRegistration();
  return enygma;
}

async function deployEnygmaEvents() {
  const enygmaFactory = await ethers.getContractFactory('EnygmaEvents');
  const enygma = await enygmaFactory.deploy();
  await enygma.waitForDeployment();
  return enygma;
}
