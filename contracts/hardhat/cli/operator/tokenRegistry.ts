import hre from 'hardhat';
import { getEthers } from '../../utils/cfg/ethers';
import { command, number, option, optional, subcommands } from 'cmd-ts';
import {
  envOption,
  optionalResourceIdsOption,
  resourceIdsOption
} from '../params';
import { Logger, Spinner, createEnumType } from '../utils';
import { TokenStatus, mapTokenRegistryData } from './utils/tokenRegistry';

/**
 * Params
 */
const statusOption = option({
  type: createEnumType(TokenStatus, 'status', 'The token status'),
  long: 'status'
});

const limitOption = option({
  type: optional(number),
  long: 'limit',
  description: 'The number of tokens to fetch by latest'
});

/**
 * Commands
 */

const listCommand = command({
  name: 'list',
  description: 'Lists all participants registered on the Commit Chain',
  args: {
    env: envOption,
    limit: limitOption
  },
  handler: async ({ env, limit }) => {
    const { CommitChain } = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Fetching tokens...');

    const tokenRegistry = await CommitChain.getContract('TokenRegistry');

    const resourceRegistry = await CommitChain.getContract('ResourceRegistry');

    const tokens = await tokenRegistry.getAllTokens();

    const filteredTokens = limit ? tokens.slice(tokens.length - limit) : tokens;

    const parsedTokens = await Promise.all(
      filteredTokens.map(async (token) =>
        mapTokenRegistryData(
          token,
          await resourceRegistry.getResourceById(token.resourceId)
        )
      )
    );

    spinner.succeed('Tokens fetched');

    Logger.info('Tokens:');
    console.table(parsedTokens);
  }
});

const updateCommand = command({
  name: 'update',
  description: 'Updates a token on the Commit Chain',
  args: {
    env: envOption,
    resourceIds: resourceIdsOption,
    status: statusOption
  },
  handler: async ({ env, resourceIds, status }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Updating tokens...');

    const tokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

    const resourceIdsList = resourceIds.split(',');

    const parsedTokens = (
      await Promise.all(
        resourceIdsList.map(async (resourceId) => {
          try {
            const res = await tokenRegistry.updateStatus(resourceId, status);

            Logger.info(
              'Token Updated, waiting for transaction to be mined...'
            );
            await res.wait();

            const token = await tokenRegistry.getTokenByResourceId(resourceId);

            return mapTokenRegistryData(token);
          } catch (error) {
            Logger.error(error, `Error updating token ${resourceId}`);

            return null;
          }
        })
      )
    ).filter(Boolean) as ReturnType<typeof mapTokenRegistryData>[];

    spinner.succeed('Tokens Updated');

    Logger.info('Tokens:');
    console.table(parsedTokens.length === 1 ? parsedTokens[0] : parsedTokens);
  }
});

const checkTokenDeploymentCommand = command({
  name: 'check-deployment',
  description: 'Checks where a token is deployed (DEV ONLY!)',
  args: {
    env: envOption,
    resourceIds: optionalResourceIdsOption
  },
  handler: async ({ env, resourceIds }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const spinner = await Spinner('Checking token deployments...');

    try {
      const tokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

      const tokens = await tokenRegistry.getAllTokens();

      const resourceIdsList = resourceIds?.split(',');

      const filteredTokens = !resourceIdsList?.length
        ? tokens
        : tokens.filter((token) => resourceIdsList.includes(token.resourceId));

      const allPls = web3.Pls.getPlNames();

      const res = await Promise.all(
        filteredTokens.map(async (token) => {
          const pls = await Promise.all(
            allPls.map<Promise<{ pl: string; result: boolean }>>(async (pl) => {
              const PL = web3.Pls.getPl(pl);
              const Endpoint = await PL.getContract('Endpoint').catch(
                () => null
              );

              if (!Endpoint) {
                return { pl, result: false };
              }

              const address = await Endpoint.resourceIdToContractAddress(
                token.resourceId
              );

              const result = await web3.isAddressValid(address);

              return { pl, result };
            })
          );

          return { token, pls };
        })
      );

      const result = res.map((r) => ({
        token: r.token.name,
        ...r.pls.reduce(
          (acc, curr) => ({ ...acc, [curr.pl]: curr.result ? '✅' : '❌' }),
          {}
        )
      }));

      spinner.succeed('Token deployments checked');

      Logger.info('Token deployments:');
      console.table(result);
    } catch (error) {
      spinner.fail('Error checking token deployments');
      throw error;
    }
  }
});

/**
 * --------------------- CLI ---------------------
 */

export const tokensCli = subcommands({
  name: 'tokens',
  description: 'Manage TokenRegistry in the Commit Chain',
  cmds: {
    list: listCommand,
    update: updateCommand,
    checkDeployment: checkTokenDeploymentCommand
  }
});
