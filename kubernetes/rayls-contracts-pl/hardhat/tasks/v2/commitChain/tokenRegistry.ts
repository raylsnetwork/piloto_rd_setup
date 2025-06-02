import { CcTokenRegistryScope } from '../config';
import { enumToList, envParamArgs } from '../../../utils/params';
import { Spinner } from '../../../utils/spinner';
import { getEthers } from '../../../utils/cfg/ethers';
import {
  TokenStatus,
  mapTokenRegistryData,
} from '../../../script/commit-chain/token-registry';
import { types } from 'hardhat/config';

type ListParams = {
  env: string;
};

CcTokenRegistryScope.task(
  'list',
  'Lists all participants registered on the Commit Chain',
)
  .addParam(...envParamArgs)
  .setAction(async (taskArgs: ListParams, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const { CommitChain } = await getEthers({ env: taskArgs.env, ethers });

    const tokenRegistry = await CommitChain.getContract('TokenRegistry');

    const resourceRegistry = await CommitChain.getContract('ResourceRegistry');

    const tokens = await tokenRegistry.getAllTokens();

    spinner.stop();

    const parsedTokens = await Promise.all(
      tokens.map(async (token) =>
        mapTokenRegistryData(
          token,
          await resourceRegistry.getResourceById(token.resourceId),
        ),
      ),
    );

    console.log('Tokens:');
    console.table(parsedTokens);
  });

type UpdateTokenParams = {
  env: string;
  resourceId: string;
  status: number;
};

CcTokenRegistryScope.task('update', 'Updates a token on the Commit Chain')
  .addParam(...envParamArgs)
  .addParam('resourceId', 'The token resourceId', undefined, types.string)
  .addParam(
    'status',
    `The token status (${enumToList(TokenStatus)})`,
    undefined,
    types.int,
  )
  .setAction(async (taskArgs: UpdateTokenParams, { ethers }) => {
    const spinner = new Spinner();
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const tokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

    const res = await tokenRegistry.updateStatus(
      taskArgs.resourceId,
      taskArgs.status,
    );

    console.log('Token Updated, waiting for transaction to be mined...');
    await res.wait();

    const token = await tokenRegistry.getTokenByResourceId(taskArgs.resourceId);

    const parsedToken = mapTokenRegistryData(token);
    spinner.stop();

    console.log('Token Updated');
    console.table(parsedToken);
  });
