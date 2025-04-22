import hre from 'hardhat';
import { RaylsClient, getEthers } from '../../utils/cfg/ethers';
import { command, subcommands } from 'cmd-ts';
import { envOption, plOption, resourceIdOption } from '../params';
import { ercStandardToContractType } from '../operator/utils/tokenRegistry';
import { DeploymentConfig } from '../../utils/cfg/deployments';
import { TokenRegistryV1 } from '../../../typechain-types';
import { Logger, Spinner } from '../utils';
/**
 * Commands
 */

const importVenTokenCommand = command({
  name: 'importVenToken',
  description: 'Imports a VEN token to the local configuration',
  args: {
    env: envOption,
    resourceId: resourceIdOption,
    pl: plOption({
      defaultValue: () => null,
      description: 'The PL identification (by default, issuer PL is used)'
    })
  },
  handler: async ({ env, pl, resourceId }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner(`Importing VEN token ${resourceId}...`);

    const tokenData = await importToken(web3, {
      resourceId,
      pl
    });

    if (!tokenData) {
      spinner.fail('Token not imported');

      return;
    }

    const { token, plName } = tokenData;

    Logger.info(
      `Importing token to PL ${plName} - ${token.name} (${token.resourceId})`
    );

    await web3.setPlConfig(plName, (plCfg) => {
      if (!plCfg) {
        throw new Error('No PL config found, could not save');
      }

      return {
        ...plCfg,
        tokens: [...plCfg.tokens, token]
      };
    });
  }
});

const importAllVenTokensCommand = command({
  name: 'importAllVenTokens',
  description: 'Imports all VEN tokens to the local configuration',
  args: {
    env: envOption,
    pl: plOption({
      defaultValue: () => null,
      description: 'The PL identification (by default, issuer PL is used)'
    })
  },
  handler: async ({ env, pl }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Importing all VEN tokens...');

    const TokenRegistry = await web3.CommitChain.getContract('TokenRegistry');
    const allTokens = await TokenRegistry.getAllTokens();

    const parsedTokens = (
      await Promise.all(
        allTokens.map(async (tokenData) => {
          return await importToken(web3, {
            allTokens,
            resourceId: tokenData.resourceId,
            pl
          }).catch((err) => {
            Logger.warn(err?.message);

            return null;
          });
        })
      )
    ).flatMap((x) => (x?.plName ? x : []));

    spinner.succeed('Tokens fetched');

    parsedTokens.forEach(({ plName, token }) => {
      Logger.info(
        `Importing token to PL ${plName} - ${token.name} (${token.resourceId})`
      );
    });

    await web3.setPlsConfig((plsCfg) => {
      if (!plsCfg) throw new Error('No PLs config found, could not save');

      return Object.entries(plsCfg).reduce<typeof plsCfg>(
        (acc, [plName, plCfg]) => {
          const plCfgTokens = plCfg.tokens.map(({ name }) => name);

          const tokens = parsedTokens
            .filter((t) => {
              if (t.plName !== plName) return false;

              if (plCfgTokens.includes(t.token.name)) {
                throw new Error(
                  "Token already imported on this PL, can't import again"
                );
              }

              return true;
            })
            .map(({ token }) => token);

          acc[plName] = {
            ...plCfg,
            tokens: [...plCfg.tokens, ...tokens]
          };

          return acc;
        },
        {}
      );
    });
  }
});

async function importToken(
  web3: RaylsClient,
  args: {
    resourceId: string;
    pl?: string;
    /**
     * If allTokens is provided, the token data will be fetched from it instead of the TokenRegistry
     */
    allTokens?: TokenRegistryV1.TokenStructOutput[];
  }
) {
  // Gets the token data from the TokenRegistry OR from the allTokens array
  const getTokenData = async () => {
    if (args.allTokens) {
      return args.allTokens?.find(
        ({ resourceId }) => resourceId === args.resourceId
      );
    }
    const TokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

    return await TokenRegistry.getTokenByResourceId(args.resourceId).catch(
      () => null
    );
  };

  const tokenData = await getTokenData();

  if (!tokenData) {
    throw new Error(
      `Token with resourceId ${args.resourceId} not found in the TokenRegistry`
    );
  }

  // Check if token is already imported
  for (const [pl, { tokens }] of Object.entries(
    web3.configs.deployments?.PLs || {}
  )) {
    const existentToken = tokens.find(({ name }) => name === tokenData.name);

    if (existentToken) {
      Logger.debug(
        `Token ${existentToken.name} (${existentToken.resourceId}) already imported on Pl ${pl}`
      );

      return null;
    }
  }

  // Gets the PL to use by args OR issuerChainId OR first PL in the config
  const getPlToUse = () => {
    const issuerChainId = tokenData.issuerChainId;

    const plName =
      args.pl ||
      web3.configs.cfg.PLs.find(
        ({ chainId }) => BigInt(chainId) === issuerChainId
      )?.id;

    return plName || web3.configs.cfg.PLs[0]?.id || null;
  };

  const plName = getPlToUse();

  if (!plName) {
    throw new Error('No PL found to import the token to!');
  }

  const Pl = web3.Pls.getPl(plName);

  const Endpoint = await Pl.getContract('Endpoint');

  const address = await Endpoint.getAddressByResourceId(args.resourceId);

  if (!address || !(await web3.isAddressValid(address))) {
    Logger.error(
      `Token ${tokenData.name} is not deployed on PL ${plName}! You need to receive a teleport of the token first!`
    );

    return null;
  }

  const contractType = ercStandardToContractType(tokenData.ercStandard);

  return {
    plName: plName,
    token: {
      address,
      name: tokenData.name,
      type: contractType,
      resourceId: tokenData.resourceId
    }
  } satisfies {
    plName: string;
    token: DeploymentConfig['PLs'][string]['tokens'][number];
  };
}

export const utilsCli = subcommands({
  name: 'utils',
  description: 'Utils CLI for interacting with the PL',
  cmds: {
    importVenToken: importVenTokenCommand,
    importAllVenTokens: importAllVenTokensCommand
  }
});
