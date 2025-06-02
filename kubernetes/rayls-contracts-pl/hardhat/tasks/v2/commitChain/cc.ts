import { CommitChainScope } from '../config';
import { task, types } from 'hardhat/config';
import {
  // deployAtomicTeleport,
  deployBalanceCommitment,
  deployStorages,
} from '../../../script/commit-chain';
import { deployEndpoint } from '../../../script/cross-chain/endpoint';
import { DeploymentConfig } from '../../../utils/cfg/deployments';
import { getEthers } from '../../../utils/cfg/ethers';
import { Spinner } from '../../../utils/spinner';
import { envParamArgs } from '../../../utils/params';

type DeployCommitChainTaskParams = {
  env: string; // Allows selecting a specific environment if multiple configs are present.
  overwrite: boolean; // Allows overwriting existing deployment configs.
};

CommitChainScope.task(
  'deploy',
  'Deploys the required contracts for a Commit Chain on the configured VEN.',
)
  .addParam(...envParamArgs)
  .addParam(
    'overwrite',
    'Allows overwriting an existing deployments file for the given environment.',
    false,
    types.boolean,
  )
  .setAction(async (taskArgs: DeployCommitChainTaskParams, { ethers }) => {
    const spinner = new Spinner();
    const { env, overwrite } = taskArgs;
    const web3 = await getEthers({ env, ethers });
    const { CommitChain, isFullyDeployed, configs } = web3;

    const { chainId } = configs.cfg.CommitChain;

    if (isFullyDeployed && !overwrite) {
      throw new Error(
        `Environment ${env} is already deployed. Use --overwrite if needed...`,
      );
    }

    console.log(`Deploying CommitChain contracts...`);
    spinner.start();

    const [BalanceCommitment, { Endpoint, MessageExecutor }] =
      await Promise.all([
        // deployAtomicTeleport(CommitChain),
        deployBalanceCommitment(CommitChain),
        deployEndpoint(CommitChain, {
          ccChainId: chainId,
          ownChainId: chainId,
        }),

      ]);

    const { Teleport, ParticipantStorage, ResourceRegistry, TokenRegistry } =
      await deployStorages(CommitChain, {
        endpointAddress: Endpoint,
      });

    await Endpoint.configureContracts(
      MessageExecutor,
      '0x0000000000000000000000000000000000000002', // no factory necessary to CC
      ParticipantStorage,
      TokenRegistry
    );

    console.log('Configuring Endpoint contract for CC');

    const newCfg: DeploymentConfig['CommitChain'] = {
      Endpoint: await Endpoint.getAddress(),
      Teleport: await Teleport.getAddress(),
      ParticipantStorage: await ParticipantStorage.getAddress(),
      ResourceRegistry: await ResourceRegistry.getAddress(),
      TokenRegistry: await TokenRegistry.getAddress(),
    };

    await web3.setCommitChainConfig((_oldConfig) => newCfg);
    console.log(`New CommitChain config saved!`, newCfg);
    console.log(`Check deployments.${env}.json for the full configuration.`);

    console.log('Registering Participants of the Ven...');

    for (const pl of configs.cfg.PLs) {
      try {
        const Pl = web3.Pls.getPl(pl.id);

        const owner = await Pl.signers[0].getAddress();
        console.log(`Registering Pl ${pl.id}...`);

        await ParticipantStorage.addParticipant({
          chainId: pl.chainId,
          role: 1,
          ownerId: owner,
          name: `PL ${pl.id}`,
        });

        console.log('Approving PL Status...');

        await ParticipantStorage.updateStatus(pl.chainId, 1);

        console.log(`PL ${pl.id} registered!`);
      } catch (error) {
        console.error(`Could not register PL ${pl.id}`, error);
      }
    }

    spinner.stop();
  });
