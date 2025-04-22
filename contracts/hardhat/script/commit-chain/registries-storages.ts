import {
  Teleport,
  ParticipantStorage,
  ResourceRegistry,
  TokenRegistry,
} from '../../../typechain-types';
import { CommitChainClient } from '../../utils/cfg/ethers/commitChain';
import type { AddressLike } from 'ethers';

type StorageContractsResult = {
  Teleport: Teleport;
  ParticipantStorage: ParticipantStorage;
  ResourceRegistry: ResourceRegistry;
  TokenRegistry: TokenRegistry;
};

const OperatorChainId = '999';

export async function deployStorages(
  client: CommitChainClient,
  payload: { endpointAddress: AddressLike },
): Promise<StorageContractsResult> {
  const [owner] = client.signers;

  const baseContracts = [
    client.getContractFactory('Teleport').then(async (fact) => {
      const res = await fact.deploy();
      return await res.waitForDeployment();
    }),
    client.getContractFactory('ParticipantStorage').then(async (fact) => {
      const res = await fact.deploy(payload.endpointAddress);
      return await res.waitForDeployment();
    }),
    client.getContractFactory('ResourceRegistry').then(async (fact) => {
      const res = await fact.deploy();
      const contract = await res.waitForDeployment();

      await contract.initialize(owner);

      return contract;
    }),
    client.getContractFactory('TokenRegistry').then(async (fact) => {
      const res = await fact.deploy(payload.endpointAddress);
      return await res.waitForDeployment();
    }),
  ] as const;

  const [Teleport, ParticipantStorage, ResourceRegistry, TokenRegistry] =
    await Promise.all(baseContracts);

  // Required contract initialization
  const currBlockNumber = await client.provider.getBlockNumber();
  await Promise.all([
    ParticipantStorage.setChainInfo(OperatorChainId, client.cfg.dhPublic),
    ResourceRegistry.setTokenRegistry(await TokenRegistry.getAddress()),
    TokenRegistry.initialize(
      owner,
      await ParticipantStorage.getAddress(),
      await ResourceRegistry.getAddress(),
      payload.endpointAddress,
    ),
  ]);

  return { Teleport, ParticipantStorage, ResourceRegistry, TokenRegistry };
}
