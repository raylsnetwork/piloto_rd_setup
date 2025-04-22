import {
  Endpoint,
  MessageExecutor,
  RaylsContractFactory,
} from '../../../typechain-types';
import { CommitChainClient } from '../../utils/cfg/ethers/commitChain';
import { PrivacyLedgerClient } from '../../utils/cfg/ethers/pl';

type EndpointContractsResult = {
  Endpoint: Endpoint;
  MessageExecutor: MessageExecutor;
  RaylsContractFactory: RaylsContractFactory;
};

/**
 * Deploys the Endpoint
 */
export async function deployEndpoint<
  T extends CommitChainClient | PrivacyLedgerClient,
>(
  client: T,
  payload: {
    ccChainId: number;
    ownChainId: number;
  },
): Promise<EndpointContractsResult> {
  const baseContracts = [
    client.getContractFactory('Endpoint').then(async (fact) => {
      const res = await fact.deploy(payload.ownChainId, payload.ccChainId);
      return await res.waitForDeployment();
    }),
    client.getContractFactory('RaylsMessageExecutor').then(async (fact) => {
      const res = await fact.deploy();
      return await res.waitForDeployment();
    }),
  ] as const;

  const [Endpoint, MessageExecutor] = await Promise.all(baseContracts);

  const [owner] = client.signers;
  const RaylsContractFactory = await client
    .getContractFactory('RaylsContractFactory')
    .then(async (fact) => {
      const res = await fact.deploy(Endpoint, owner);
      return await res.waitForDeployment();
    });

  return {
    Endpoint,
    MessageExecutor,
    RaylsContractFactory,
  };
}
