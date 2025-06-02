import type { ethers } from 'hardhat';
import path from 'path';
import { loadConfigStorage } from './storage';
import type { Signer } from 'ethers';
import { Config } from './config';
import { DeploymentConfig } from './deployments';
import { CommitChainClient, mapCommitChain } from './ethers/commitChain';
import { PrivacyLedgerClient, mapPl } from './ethers/pl';
import { Logger } from '../../cli/utils';

type EthersOptions = {
  ethers: typeof ethers;
  configPath?: string;
  env?: string;
};

type SetFn<T, IsNullable = false> = (
  callback: IsNullable extends true ? (data?: T | null) => T : (data: T) => T
) => Promise<void>;

export type RaylsClient = {
  isFullyDeployed: boolean;
  ethers: typeof ethers;

  isAddressValid: (
    address: string,
    options?: { filterZeroAddress?: false }
  ) => Promise<boolean>;

  getAllWallets: () => {
    plName: string;
    signer: Signer;
  }[];
  getAllTokens: () => (DeploymentConfig['PLs'][string]['tokens'][number] & {
    plName: string;
  })[];

  configs: {
    cfg: Config;
    deployments: DeploymentConfig | null;
  };

  CommitChain: CommitChainClient;
  Pls: PlClient;

  setDeploymentsConfig: SetFn<DeploymentConfig, true>;
  setCommitChainConfig: SetFn<DeploymentConfig['CommitChain'], true>;
  setPlsConfig: SetFn<DeploymentConfig['PLs'], true>;
  setPlConfig: (
    plName: string,
    callback: (
      data?: DeploymentConfig['PLs'][string] | null
    ) => DeploymentConfig['PLs'][string]
  ) => Promise<void>;
};

type PlClient = {
  getPl: (name: string) => PrivacyLedgerClient;
  getPlNames: () => string[];
};

export const getConfigPathByEnv = (env: string) =>
  path.resolve(`./cfg/config.${env}.json`);

export async function getEthers<T extends boolean>(
  options: EthersOptions
): Promise<RaylsClient> {
  const { ethers } = options;

  const {
    config,
    deploymentsConfig,
    env,
    setDeploymentsConfig,
    getLatestDeploymentConfig
  } = await loadConfigStorage(
    options.configPath
      ? options.configPath
      : getConfigPathByEnv(options.env || 'local')
  );

  Logger.info(`Ethers initialized in env: ${env}!`);

  const { CommitChain, PLs } = config;

  const plNames = PLs.map(({ id }) => id);

  const allPlsDeployed = plNames.every(
    (plName) => !!deploymentsConfig?.PLs?.[plName]
  );

  const isFullyDeployed = (!!deploymentsConfig && allPlsDeployed) as T;

  const parsedCommitChain = mapCommitChain(
    options.ethers,
    CommitChain,
    deploymentsConfig?.CommitChain
  );

  const parsedPls = {
    getPlNames: () => plNames,
    getPl: (name: string) => {
      const deploymentCfg = deploymentsConfig?.PLs?.[name];

      const cfg = PLs.find((pl) => pl.id === name);

      if (!cfg) {
        throw new Error(`No PL config found with name ${name}`);
      }

      return mapPl(options.ethers, cfg, deploymentCfg);
    }
  } satisfies PlClient;

  const getAllWallets = () =>
    [
      ...parsedCommitChain.signers.map((signer, i) => ({
        plName: `Cc[${i}]`,
        signer
      })),
      ...parsedPls.getPlNames().flatMap((plName) =>
        parsedPls.getPl(plName).signers.map((signer, i) => ({
          plName: `${plName}[${i}]`,
          signer
        }))
      )
    ] satisfies {
      plName: string;
      signer: Signer;
    }[];

  const getAllTokens = () => {
    if (!deploymentsConfig?.PLs) {
      return [];
    }

    return Object.entries(deploymentsConfig.PLs).flatMap(([k, v]) =>
      v.tokens.map((x) => ({ ...x, plName: k }))
    );
  };

  return {
    isFullyDeployed,
    ethers,

    getAllWallets,
    getAllTokens,

    isAddressValid: (address: string, opt?: IsValidAddressOptions) =>
      isAddressValid(ethers, address, opt),

    setDeploymentsConfig: async (callback) => {
      const deploymentsConfig = await getLatestDeploymentConfig();
      const data = callback(deploymentsConfig);

      return await setDeploymentsConfig(data);
    },

    setCommitChainConfig: async (callback) => {
      const deploymentsConfig = await getLatestDeploymentConfig();

      const commitChainCfg = callback(deploymentsConfig?.CommitChain);

      return await setDeploymentsConfig({
        PLs: deploymentsConfig?.PLs || {},
        CommitChain: commitChainCfg
      });
    },

    setPlsConfig: async (callback) => {
      const deploymentsConfig = await getLatestDeploymentConfig();

      const newPlsCfg = callback(deploymentsConfig?.PLs);

      if (!deploymentsConfig?.CommitChain) {
        throw new Error('No CommitChain config found');
      }

      return await setDeploymentsConfig({
        CommitChain: deploymentsConfig?.CommitChain,
        PLs: newPlsCfg
      });
    },

    setPlConfig: async (plName, callback) => {
      const deploymentsConfig = await getLatestDeploymentConfig();

      const currentPlCfg = deploymentsConfig?.PLs[plName];

      const newPlCfg = callback(currentPlCfg);

      if (!deploymentsConfig?.CommitChain) {
        throw new Error('No CommitChain config found');
      }

      const sortedPlConfig = {
        ...newPlCfg,
        tokens: newPlCfg.tokens
      };

      return await setDeploymentsConfig({
        CommitChain: deploymentsConfig?.CommitChain,
        PLs: {
          ...deploymentsConfig?.PLs,
          [plName]: sortedPlConfig
        }
      });
    },

    configs: {
      cfg: config,
      deployments: deploymentsConfig as T extends true
        ? DeploymentConfig
        : DeploymentConfig | null
    },

    CommitChain: parsedCommitChain,

    Pls: parsedPls
  };
}

type IsValidAddressOptions = {
  filterZeroAddress?: false;
};

export async function isAddressValid(
  web3: typeof ethers,
  address: string,
  options?: IsValidAddressOptions
) {
  const { filterZeroAddress = true } = options || {};

  try {
    if (!web3.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    if (filterZeroAddress) {
      await web3.resolveAddress(address);

      return /^0x0+$/.test(address) ? false : true;
    }

    return true;
  } catch (_) {
    return false;
  }
}
