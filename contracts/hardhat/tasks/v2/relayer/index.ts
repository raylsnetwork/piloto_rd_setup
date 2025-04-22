import fs from 'fs/promises';
import path from 'path';
import { loadConfigStorage } from '../../../utils/cfg/storage';
import { Config } from '../../../utils/cfg/config';
import { DeploymentConfig } from '../../../utils/cfg/deployments';
import { RelayerScope } from '../config';
import { envParamArgs, plParamArgs } from '../../../utils/params';
import { getConfigPathByEnv, getEthers } from '../../../utils/cfg/ethers';

type GenerateCfgTaskParams = {
  env: string;
  pl: string;
};

const InitialBlockTolerance = 20;

RelayerScope.task(
  'generate-cfg',
  'Generates a relayer config based on deployments',
)
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .setAction(async (args: GenerateCfgTaskParams, { ethers }) => {
    const cfgPath = getConfigPathByEnv(args.env);
    const relayerCfgFolder = path.resolve('./cfg/relayer');

    await fs.mkdir(relayerCfgFolder).catch(() => null);

    const { config, deploymentsConfig, env } = await loadConfigStorage(cfgPath);

    const outputPath = path.resolve(
      relayerCfgFolder,
      `./config-${args.pl}.${env}.json`,
    );

    if (!deploymentsConfig) {
      throw new Error('No deployment config found');
    }

    const plCfg = config.PLs.find((pl) => pl.id === args.pl);
    const plDeploymentCfg = deploymentsConfig.PLs[args.pl] as
      | DeploymentConfig['PLs']['string']
      | undefined;

    if (!plCfg) {
      throw new Error(`No PL found in config with id "${args.pl}"`);
    }

    console.log(`Generating relayer config for env "${env}"...`);

    const cfg = {
      CommitChain: config.CommitChain,
      Pl: plCfg,
    };

    const deploymentCfg = {
      CommitChain: deploymentsConfig.CommitChain,
      Pl: plDeploymentCfg,
    };

    const web3 = await getEthers({ ethers, env });

    const [PlStartingBlock, CcStartingBlock] = await Promise.all([
      web3.CommitChain.provider.getBlockNumber(),
      web3.Pls.getPl(plCfg.id).provider.getBlockNumber(),
    ]);

    const relayerCfg = mapConfigAndDeploymentToRelayerConfig(
      {
        CcStartingBlock: (CcStartingBlock - InitialBlockTolerance).toString(),
        PlStartingBlock: (PlStartingBlock - InitialBlockTolerance).toString(),
      },
      cfg,
      deploymentCfg,
    );

    await fs.writeFile(
      path.resolve(outputPath),
      JSON.stringify(relayerCfg, null, 2),
    );

    console.log(`Relayer config generated and saved to "${outputPath}"`);
  });

export type RelayerConfig = {
  Database: {
    ConnectionString: string;
    Type: 'mongodb' | 'postgres';
    Name: string;
  };
  Blockchain: Blockchain;
  CommitChain: CommitChain;
};

export type Blockchain = {
  ChainID: string;

  ChainURL: string;
  ChainWSURL: string;

  BatchSize: string;
  PlStartingBlock: string;

  DhSecret: string;
  DhPublic: string;
  PrivateKey: string;

  PlEndpointAddress?: string;
  SignatureStorageAddress?: string;
};

export type CommitChain = {
  Version: string;
  ChainId: string;
  OperatorChainId: string;

  ChainURL: string;
  ChainWSUrl: string;

  ParticipantStorageContract: string;

  CcStartingBlock: string;

  // AtomicTeleportContract: string;
  CommitChainPLStorageContract: string;
  CcEndpointAddress: string;
  ResourceRegistryContract: string;
};

type PartialRelayerConfig = Partial<{
  Database: Partial<RelayerConfig['Database']>;
  Blockchain: Partial<Blockchain>;
  CommitChain: Partial<CommitChain>;
}>;

const BaseConfig = {
  Database: {
    ConnectionString: 'mongodb://root:root@mongodb:27017',
    Type: 'mongodb',
    Name: 'RelayerA',
  },
  Blockchain: {
    BatchSize: '1000',
  },
  CommitChain: {
    Version: '1.9',
    OperatorChainId: '999',
  },
} satisfies PartialRelayerConfig;

function mapConfigAndDeploymentToRelayerConfig(
  metadata: {
    PlStartingBlock: string;
    CcStartingBlock: string;
  },
  cfg: {
    CommitChain: Config['CommitChain'];
    Pl: Config['PLs'][number];
  },
  deployment: {
    CommitChain: DeploymentConfig['CommitChain'];
    Pl?: DeploymentConfig['PLs']['string'];
  },
): RelayerConfig {
  return {
    ...BaseConfig,
    Database: {
      ...BaseConfig.Database,
      Name: `Relayer${cfg.Pl.id}`,
    },
    Blockchain: {
      ...BaseConfig.Blockchain,

      ChainID: cfg.Pl.chainId.toString(),
      PlStartingBlock: metadata.PlStartingBlock,

      ChainURL: cfg.Pl.url,
      ChainWSURL: cfg.Pl.wsUrl,

      DhPublic: cfg.CommitChain.dhPublic,
      DhSecret: cfg.CommitChain.dhSecret,
      PrivateKey: cfg.Pl.accounts[0].replace(/^0x/, ''),

      PlEndpointAddress: deployment?.Pl?.Endpoint,
      SignatureStorageAddress: deployment?.Pl?.SignatureStorage,
    },
    CommitChain: {
      ...BaseConfig.CommitChain,

      ChainId: cfg.CommitChain.chainId.toString(),
      CcStartingBlock: metadata.CcStartingBlock,

      ChainURL: cfg.CommitChain.url,
      ChainWSUrl: cfg.CommitChain.wsUrl,

      ParticipantStorageContract: deployment.CommitChain.ParticipantStorage,
      // AtomicTeleportContract: deployment.CommitChain.AtomicTeleport,
      CommitChainPLStorageContract: deployment.CommitChain.Teleport,
      CcEndpointAddress: deployment.CommitChain.Endpoint,
      ResourceRegistryContract: deployment.CommitChain.ResourceRegistry,
    },
  };
}
