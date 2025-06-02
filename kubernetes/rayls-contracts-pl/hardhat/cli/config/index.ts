import hre from 'hardhat';
import fs from 'fs/promises';
import { loadConfigStorage, parseConfigPaths } from '../../utils/cfg/storage';
import { getConfigPathByEnv, getEthers } from '../../utils/cfg/ethers';
import { getConfigFromEnv, getDeploymentsConfigFromEnv } from './utils';
import { command, flag, subcommands } from 'cmd-ts';
import { envOption } from '../params';
import { Logger } from '../utils';

const listAccountsCommand = command({
  name: 'list-accounts',
  description: 'Lists all accounts in the config',
  args: {
    env: envOption
  },
  handler: async (args) => {
    const { env } = args;
    const web3 = await getEthers({ env, ethers: hre.ethers });
    const wallets = web3.getAllWallets();

    const parsedWallets = await Promise.all(
      wallets.map(async ({ plName, signer }) => ({
        Pl: plName,
        Address: await signer.getAddress()
      }))
    );

    Logger.info('Accounts:');
    console.table(parsedWallets);
  }
});

const generateCommand = command({
  name: 'generate',
  description: 'Generates config files based on env',
  args: {
    env: envOption,
    overwrite: flag({
      long: 'overwrite',
      description: 'Overwrite existing config files'
    })
  },
  handler: async (args) => {
    const cfgPath = getConfigPathByEnv(args.env);
    const cfgStorage = await loadConfigStorage(cfgPath, true).catch(() => null);

    if (cfgStorage && !args.overwrite) {
      throw new Error(
        'Config files already exist, use --overwrite to overwrite'
      );
    }

    const config = getConfigFromEnv();
    const deploymentsConfig = await getDeploymentsConfigFromEnv();

    const { configPath, deploymentsConfigPath } = parseConfigPaths(cfgPath);

    Logger.info(`Generating config files for env "${args.env}"...`);

    await Promise.all([
      fs.writeFile(configPath, JSON.stringify(config, null, 2)),
      fs.writeFile(
        deploymentsConfigPath,
        JSON.stringify(deploymentsConfig, null, 2)
      )
    ]);

    Logger.info('Config files generated');
  }
});

export const configCli = subcommands({
  name: 'config',
  description: 'Config commands',
  cmds: {
    generate: generateCommand,
    listAccounts: listAccountsCommand
  }
});
