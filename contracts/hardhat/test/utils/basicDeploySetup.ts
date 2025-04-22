import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './RelayerMockEthers';
import { Endpoint, ParticipantStorage, RaylsContractFactory } from '../../../typechain-types';
import { registerToken } from '../TokenRegistry';
import { TokenRegistryInterface } from '../../../typechain-types/src/commitChain/TokenRegistry';
import { tokenRegistryEventLogs } from './logs';

export async function basicDeploySetup() {
  // Contracts are deployed using the first signer/account by default
  const [owner, otherAccount, account3, account4] = await hre.ethers.getSigners();
  const chainIdPL1 = '123';
  const chainIdPL2 = '456';
  const chainIdCC = '789';

  const balanceCommitment = await hre.ethers.getContractFactory('BalanceCommitment');
  const raylsMessageExecutor = await hre.ethers.getContractFactory('RaylsMessageExecutor');
  const raylsContractFactory = await hre.ethers.getContractFactory('RaylsContractFactory');
  const endpoint = await hre.ethers.getContractFactory('Endpoint');
  const token = await hre.ethers.getContractFactory('TokenExample');
  const participantStorageReplica = await hre.ethers.getContractFactory('ParticipantStorageReplica');

  const balanceCommitmentCC = await balanceCommitment.deploy();
  const raylsMessageExecutorPL1 = await raylsMessageExecutor.deploy();
  const raylsMessageExecutorPL2 = await raylsMessageExecutor.deploy();
  const raylsMessageExecutorCC = await raylsMessageExecutor.deploy();
  const endpointPL1 = await endpoint.deploy(chainIdPL1, chainIdCC);
  const endpointPL2 = await endpoint.deploy(chainIdPL2, chainIdCC);
  const endpointCC = await endpoint.deploy(chainIdCC, chainIdCC);
  const participantStorageReplicaPL1 = await participantStorageReplica.deploy(await endpointPL1.getAddress());
  const participantStorageReplicaPL2 = await participantStorageReplica.deploy(await endpointPL2.getAddress());

  const [ResourceRegistry, TokenRegistry, ParticipantStorage] = await Promise.all([ethers.getContractFactory('ResourceRegistry', owner), ethers.getContractFactory('TokenRegistry', owner), ethers.getContractFactory('ParticipantStorage', owner)]);
  const [resourceRegistry, participantStorage] = await Promise.all([ResourceRegistry.deploy(), ParticipantStorage.deploy(await endpointCC.getAddress())]);
  await Promise.all([resourceRegistry.waitForDeployment(), participantStorage.waitForDeployment()]);
  await resourceRegistry.initialize(await owner.getAddress());
  const tokenRegistry = await TokenRegistry.deploy(await endpointCC.getAddress());
  await tokenRegistry.waitForDeployment();
  await tokenRegistry.initialize(await owner.getAddress(), await participantStorage.getAddress(), await resourceRegistry.getAddress(), await endpointCC.getAddress());
  await resourceRegistry.setTokenRegistry(await tokenRegistry.getAddress());

  const messageIdsAlreadyProcessed: { [messageIdConcatWithChainId: string]: boolean | null } = {};
  const endpointMappings: { [chainId: string]: Endpoint | null } = {};
  endpointMappings[chainIdPL1] = endpointPL1;
  endpointMappings[chainIdPL2] = endpointPL2;
  endpointMappings[chainIdCC] = endpointCC;

  await Promise.all([endpointPL1.waitForDeployment(), endpointPL2.waitForDeployment()]);
  await endpointPL1.registerCommitChainAddress('BalanceCommitment', await balanceCommitmentCC.getAddress());
  await endpointPL2.registerCommitChainAddress('BalanceCommitment', await balanceCommitmentCC.getAddress());
  await endpointPL1.registerCommitChainAddress('TokenRegistry', await tokenRegistry.getAddress());
  await endpointPL2.registerCommitChainAddress('TokenRegistry', await tokenRegistry.getAddress());

  const raylsContractFactoryPL1 = await raylsContractFactory.deploy(await endpointPL1.getAddress(), owner.address);
  const raylsContractFactoryPL2 = await raylsContractFactory.deploy(await endpointPL2.getAddress(), otherAccount.address);

  await endpointPL1.configureContracts(await raylsMessageExecutorPL1.getAddress(), await raylsContractFactoryPL1.getAddress(), await participantStorageReplicaPL1.getAddress());
  await endpointPL2.configureContracts(await raylsMessageExecutorPL2.getAddress(), await raylsContractFactoryPL2.getAddress(), await participantStorageReplicaPL2.getAddress());
  await endpointCC.configureContracts(await raylsMessageExecutorCC.getAddress(), '0x0000000000000000000000000000000000000002', await participantStorage.getAddress());

  await participantStorage.addParticipant({
    chainId: chainIdPL1,
    role: 1,
    ownerId: await owner.getAddress(),
    name: 'PL1'
  });
  await participantStorage.updateStatus(chainIdPL1, 1);
  await participantStorage.addParticipant({
    chainId: chainIdPL2,
    role: 1,
    ownerId: await owner.getAddress(),
    name: 'PL2'
  });
  await participantStorage.updateStatus(chainIdPL2, 1);
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  const tokenPL1 = await token.deploy('TokenTest', 'TT', await endpointPL1.getAddress());
  await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

  tokenRegistryEventLogs(tokenRegistry);

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
    raylsMessageExecutorCC
  };
}
