import type { JsonRpcProvider, Signer } from 'ethers';
import type { ethers } from 'hardhat';
import type { Libraries } from 'hardhat/types';
import { Config } from '../config';
import { DeploymentConfig } from '../deployments';
import {
  ContractFactoryResolver,
  ContractResolver,
  TokenContractTypes
} from '../types/_contracts';
import { getSigner } from './utils';

/**
 * ContractsMap for mapping the name with the Contract Version
 */
const ContractsMap = {
  Endpoint: 'EndpointV1',
  ParticipantStorage: 'ParticipantStorageV1',
  ResourceRegistry: 'ResourceRegistryV1',
  Teleport: 'TeleportV1',
  TokenRegistry: 'TokenRegistryV1'
} as const satisfies {
  [key in keyof DeploymentConfig['CommitChain']]?: TokenContractTypes;
};

/**
 * CommitChainClient
 */

export type CommitChainClient = {
  deploymentsCfg: DeploymentConfig['CommitChain'] | null;
  cfg: Config['CommitChain'];
  provider: JsonRpcProvider;
  signers: Signer[];

  getSigner: (privateKey: string) => Signer;

  getContract: <T extends keyof DeploymentConfig['CommitChain']>(
    name: T,
    signer?: Signer
  ) => Promise<ContractResolver<(typeof ContractsMap)[T]>>;

  getContractFactory: <T extends TokenContractTypes>(
    name: T,
    signer?: Signer,
    libraries?: Libraries
  ) => Promise<ContractFactoryResolver<T>>;
};

export function mapCommitChain(
  web3: typeof ethers,
  cfg: Config['CommitChain'],
  deploymentConfig: DeploymentConfig['CommitChain'] | undefined
): CommitChainClient {
  const provider = new web3.JsonRpcProvider(cfg.url);

  provider.estimateGas = async () => BigInt(5000000);

  const signers = cfg.accounts.map((privateKey) =>
    getSigner(web3, provider, privateKey)
  );

  const [defaultSigner] = signers;

  const getContract = async <T extends keyof DeploymentConfig['CommitChain']>(
    name: T,
    signer: Signer = defaultSigner
  ) => {
    if (!deploymentConfig) {
      throw new Error('No deployment config found');
    }

    const address = deploymentConfig[name];

    if (!address) {
      throw new Error(`No address found for ${name}!`);
    }

    const contractName = ContractsMap[name] || name;

    const contract = await web3.getContractAt(contractName, address, signer);

    contract.connect(provider);

    return contract as unknown as ContractResolver<T>;
  };

  const getContractFactory = async <T extends TokenContractTypes>(
    name: T,
    signer: Signer = defaultSigner,
    libraries?: Libraries
  ) => {
    const contract = await web3.getContractFactory(name, {
      signer,
      libraries
    });

    contract.connect(provider);

    return contract as ContractFactoryResolver<T>;
  };

  return {
    deploymentsCfg: deploymentConfig || null,
    cfg,
    provider,
    signers,

    getSigner: (privateKey: string) => getSigner(web3, provider, privateKey),

    getContract,
    getContractFactory
  };
}
