import { CommitChainScope, PlScope } from '../config';
import { task, types } from 'hardhat/config';
import {
  deployAtomicTeleport,
  deployBalanceCommitment,
  deployStorages,
} from '../../../script/commit-chain';
import { deployEndpoint } from '../../../script/cross-chain/endpoint';
import { DeploymentConfig } from '../../../utils/cfg/deployments';
import { RailsClient, getEthers } from '../../../utils/cfg/ethers';
import { Spinner } from '../../../utils/spinner';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Config } from '../../../utils/cfg/config';
import { deploySignatureStorage } from '../../../script/privacy-ledger/signature-storage';
import { envParamArgs, plParamArgs } from '../../../utils/params';

type DeployPlParams = {
  env: string;
  pl: string;
  overwrite: boolean;
};

PlScope.task(
  'deploy',
  'Deploys the required contracts on a Privacy Ledger to integrate with the VEN',
)
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam(
    'overwrite',
    'Allows overwriting an existing deployments file for the given environment.',
    false,
    types.boolean,
  )
  .setAction(async (taskArgs: DeployPlParams, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const { env, pl } = taskArgs;
    const web3 = await getEthers({ env, ethers });

    const plDeployments = web3.configs.deployments?.PLs[pl];

    if ((web3.isFullyDeployed || plDeployments) && !taskArgs.overwrite) {
      throw new Error(
        `Pl ${pl} is already deployed in env ${env}. Use --overwrite if needed...`,
      );
    }

    const plCfg = await deployPl({ ...taskArgs, web3 });

    await web3.setPlConfig(pl, (_oldConfig) => plCfg);

    spinner.stop();
    console.log(`PrivacyLedger "${pl}" config saved!`, plCfg);
    console.log(`Check deployments.${env}.json for the full configuration.`);
  });

PlScope.task('deploy:all', 'Deploys all Privacy Ledgers')
  .addParam(...envParamArgs)
  .addParam(
    'overwrite',
    'Allows overwriting an existing deployments file for the given environment.',
    false,
    types.boolean,
  )
  .setAction(async (taskArgs: Omit<DeployPlParams, 'pl'>, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const { env } = taskArgs;

    const web3 = await getEthers({ env, ethers });

    const isPartiallyDeployed = Object.values(
      web3.configs.deployments?.PLs || {},
    ).some(Boolean);

    if ((web3.isFullyDeployed || isPartiallyDeployed) && !taskArgs.overwrite) {
      throw new Error(
        `${web3.isFullyDeployed ? 'All' : 'Some'
        } Privacy Ledgers are already deployed in env ${env}. Use --overwrite if needed..`,
      );
    }

    const pls = web3.Pls.getPlNames();

    const plConfigs = await Promise.all(
      pls.map(async (pl) => {
        const cfg = await deployPl({ ...taskArgs, pl, web3 });
        return { cfg, pl };
      }),
    );

    const parsedCfg = plConfigs.reduce(
      (acc, { cfg, pl }) => ({ ...acc, [pl]: cfg }),
      {} satisfies DeploymentConfig['PLs'],
    );

    await web3.setPlsConfig((_oldConfig) => parsedCfg);

    console.log('Pls config saved!', plConfigs);
    console.log(`Check deployments.${env}.json for the full configuration.`);

    spinner.stop();
  });

async function deployPl(args: { env: string; pl: string; web3: RailsClient }) {
  const { pl, env, web3 } = args;
  const { Pls, configs } = web3;

  const PrivacyLedger = Pls.getPl(pl);

  const { chainId } = PrivacyLedger.cfg;

  if (!configs.deployments) {
    throw new Error(
      `No CommitChain config found for env ${env}. Please deploy CommitChain first...`,
    );
  }

  const { BalanceCommitment, TokenRegistry } = configs.deployments?.CommitChain;

  console.log(`Deploying contracts to PL ${pl}...`);

  const [
    SignatureStorage,
    { Endpoint, MessageExecutor, RaylsContractFactory },
  ] = await Promise.all([
    deploySignatureStorage(PrivacyLedger),
    deployEndpoint(PrivacyLedger, {
      ccChainId: configs.cfg.CommitChain.chainId,
      ownChainId: chainId,
    }),
  ]);

  const StorageReplica = await (
    await PrivacyLedger.getContractFactory('ParticipantStorageReplica')
  ).deploy(Endpoint);

  console.log('Configuring Endpoint contract for PL');

  await Promise.all([
    Endpoint.configureContracts(
      MessageExecutor,
      RaylsContractFactory,
      StorageReplica,
      TokenRegistry
    ),
    Endpoint.registerCommitChainAddress('BalanceCommitment', BalanceCommitment),
    Endpoint.registerCommitChainAddress('TokenRegistry', TokenRegistry),
  ]);

  const newCfg: DeploymentConfig['PLs'][string] = {
    Endpoint: await Endpoint.getAddress(),
    SignatureStorage: await SignatureStorage.getAddress(),
    tokens: [],
  };

  return newCfg;
}
