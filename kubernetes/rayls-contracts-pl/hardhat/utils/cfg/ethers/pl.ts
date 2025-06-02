import type { BaseContract, Contract, JsonRpcProvider, Signer } from 'ethers';
import type { ethers } from 'hardhat';
import type { Libraries } from 'hardhat/types';
import { Config } from '../config';
import { DeploymentConfig } from '../deployments';
import {
  ContractFactoryResolver,
  ContractResolver,
  TokenContractTypes
} from '../types/_contracts';
import { isAddressValid } from '../ethers';
import { Logger } from '../../../cli/utils';
import { getSigner } from './utils';

type ContractType = BaseContract | Contract;

/**
 * ContractsMap for mapping the name with the Contract Version
 */
const ContractsMap = {
  // Endpoint: 'EndpointV1'
  Endpoint: 'EndpointV1',
  SignatureStorage: 'SignatureStorage'
} as const satisfies { [key in PlContracts]?: TokenContractTypes };

/**
 * PrivacyLedgerClient
 */

export type PrivacyLedgerClient = {
  deploymentsCfg: DeploymentConfig['PLs'][string] | null;
  cfg: Config['PLs'][number];

  provider: JsonRpcProvider;
  signers: Signer[];

  getSigner: (privateKey: string) => Signer;

  getContract: <T extends PlContracts>(
    name: T,
    signer?: Signer
  ) => Promise<ContractResolver<(typeof ContractsMap)[T]>>;
  getContractFactory: <T extends TokenContractTypes>(
    name: T,
    signer?: Signer,
    libraries?: Libraries
  ) => Promise<ContractFactoryResolver<T>>;

  getToken: <T extends ContractType>(
    name: string,
    signer?: Signer
  ) => Promise<T>;
  getTokenAt: <T extends TokenContractTypes>(
    type: T,
    address: string,
    signer?: Signer
  ) => Promise<ContractResolver<T>>;
  getTokenByType: <T extends TokenContractTypes>(
    type: T,
    name: string,
    signer?: Signer
  ) => Promise<ContractResolver<T>>;
  /**
   * Get token by resourceId by querying the **Endpoint Contract** for the token address
   */
  getTokenByResourceId: <T extends TokenContractTypes>(
    type: T,
    resourceId: string,
    signer?: Signer
  ) => Promise<ContractResolver<T>>;

  getTokenNames: () => string[];
};

type PlContracts = keyof Omit<DeploymentConfig['PLs'][string], 'tokens'>;

export function mapPl(
  web3: typeof ethers,
  cfg: Config['PLs'][number],
  deploymentConfig: DeploymentConfig['PLs'][string] | undefined
): PrivacyLedgerClient {
  const provider = new web3.JsonRpcProvider(cfg.url);

  // WORKAROUND FOR PLs UNTIL GAS ESTIMATION WORKS
  provider.estimateGas = async () => BigInt(5000000);

  const signers = cfg.accounts.map((privateKey) =>
    getSigner(web3, provider, privateKey)
  );

  const [defaultSigner] = signers;

  /**
   * Functions to get contracts and contract factories
   */
  const getContract = async <T extends PlContracts>(
    name: T,
    signer: Signer = defaultSigner
  ): Promise<ContractResolver<(typeof ContractsMap)[T]>> => {
    if (!deploymentConfig) {
      throw new Error(
        `No deployment config found for token ${name} in PL ${cfg.id} `
      );
    }

    const address = deploymentConfig[name];

    if (!address) {
      throw new Error(`No address found for contract ${name}!`);
    }

    const contractName = ContractsMap[name] || name;

    const contract = await web3.getContractAt(contractName, address, signer);

    contract.connect(provider);

    return contract as unknown as Promise<
      ContractResolver<(typeof ContractsMap)[T]>
    >;
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

  const _getTokenFromDeployment = (name: string) => {
    if (!deploymentConfig) {
      throw new Error(
        `No deployment config found for token ${name} in PL ${cfg.id} `
      );
    }

    const pl = deploymentConfig.tokens.find((t) => t.name === name);

    if (!pl) {
      throw new Error(`No token found with name ${name}!`);
    }

    return pl;
  };

  const getToken = async (
    token: DeploymentConfig['PLs'][string]['tokens'][number],
    signer: Signer = defaultSigner
  ) => {
    try {
      const contract = await web3.getContractAt(
        token.type,
        token.address,
        signer
      );

      contract.connect(provider);

      return await web3.getContractAt(token.type, token.address, signer);
    } catch (error) {
      Logger.error(error);
      throw new Error(
        `Error getting token contract for "${name}" using "${token.type}"!`
      );
    }
  };

  const getTokenAt = async <T extends TokenContractTypes>(
    type: T,
    address: string,
    signer: Signer = defaultSigner
  ) => {
    if (!deploymentConfig) {
      throw new Error(
        `No deployment config found for token type ${type} in PL ${cfg.id} `
      );
    }

    if (!web3.isAddress(address)) {
      throw new Error(`Invalid address ${address}`);
    }

    if (!(await web3.resolveAddress(address))) {
      throw new Error(`Invalid address ${address}`);
    }

    const contract = await web3.getContractAt(type, address, signer);

    contract.connect(provider);

    return contract as unknown as ContractResolver<T>;
  };

  const getTokenByResourceId = async <T extends TokenContractTypes>(
    type: T,
    resourceId: string,
    signer?: Signer
  ) => {
    const Endpoint = await getContract('Endpoint').catch(() => null);

    if (!Endpoint) {
      throw `No Endpoint contract found on PL ${cfg.id}`;
    }

    const tokenAddress = await Endpoint.getAddressByResourceId(resourceId);

    if (!(await isAddressValid(web3, tokenAddress))) {
      throw new Error(`Token not deployed on PL ${cfg.id}!`);
    }

    return await getTokenAt(type, tokenAddress, signer);
  };

  return {
    deploymentsCfg: deploymentConfig || null,
    cfg,

    provider,
    signers,

    getSigner: (privateKey: string) => getSigner(web3, provider, privateKey),

    getContract,
    getContractFactory,

    getToken: <T extends ContractType>(name: string, signer?: Signer) =>
      getToken(_getTokenFromDeployment(name), signer) as Promise<T>,

    getTokenAt,
    getTokenByResourceId,

    getTokenByType: async <T extends TokenContractTypes>(
      type: T,
      name: string,
      signer?: Signer
    ) => {
      const t = _getTokenFromDeployment(name);

      if (t.type !== type) {
        throw new Error(
          `Token "${name}" is not of type "${type}"! It is of type "${t.type}"!`
        );
      }

      const token = await getToken(t, signer);

      return token as unknown as ContractResolver<T>;
    },
    getTokenNames: () => deploymentConfig?.tokens.map((t) => t.name) || []
  };
}
