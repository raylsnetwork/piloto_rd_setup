import { types } from 'hardhat/config';
import { getEthers } from '../../../../utils/cfg/ethers';
import { Spinner } from '../../../../utils/spinner';
import {
  envParamArgs,
  plParamArgs,
  tokenParamArgs,
} from '../../../../utils/params';
import { Rayls1155Scope } from '../../config';

type DeployArgs = {
  env: string;
  pl: string;
  name: string;
  submit: boolean;
};

Rayls1155Scope.task('deploy', 'Deploys a Rayls ERC1155 contract')
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam('name', 'Token Name', `RaylsErc1155_${Date.now()}`, types.string)
  .addParam('submit', 'Submit Token to Ven', true, types.boolean)
  .setAction(async (taskArgs: DeployArgs, hre) => {
    await hre.run('compile');

    const spinner = new Spinner();
    console.log(`Deploying token on ${taskArgs.pl}...`);
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getContractFactory('RaylsErc1155Example');

    const endpointAddress = pl.deploymentsCfg?.Endpoint;

    if (!endpointAddress) {
      throw new Error('Endpoint not deployed on PL');
    }

    const res = await token.deploy('url', taskArgs.name, endpointAddress, {
      gasLimit: 5000000,
    });

    const tokenPL = await res.waitForDeployment();

    const tokenAddress = await tokenPL.getAddress();

    console.log(`Token Deployed At Address ${tokenAddress}`);

    web3.setPlConfig(taskArgs.pl, (plCfg) => {
      if (!plCfg) {
        throw new Error('No PL config found, could not save');
      }

      return {
        ...plCfg,
        tokens: [
          ...plCfg.tokens,
          {
            address: tokenAddress,
            name: taskArgs.name,
            type: 'RaylsErc1155Example',
          },
        ],
      };
    });

    console.log('Token saved on PL config');

    if (!taskArgs.submit) {
      spinner.stop();
      return;
    }

    console.log('Submitting Token Registration to Ven...');

    await (await tokenPL.submitTokenRegistration(0)).wait();

    spinner.stop();

    console.log(
      `Token Registration Submitted, wait until relayer retrieves the generated resourceId`,
    );

    console.log('You can check this with the metadata task');
  });

type SubmitArgs = {
  env: string;
  pl: string;
  token: string;
};

Rayls1155Scope.task('submit', 'Submit a Rayls ERC1155 contract to Ven')
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam(...tokenParamArgs)
  .setAction(async (taskArgs: SubmitArgs, hre) => {
    const spinner: Spinner = new Spinner();

    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getTokenByType(
      'RaylsErc1155Example',
      taskArgs.token,
    );

    const resourceId = await token.resourceId();

    if (resourceId && (await web3.isAddressValid(resourceId))) {
      throw new Error('Token already submitted');
    }

    const tx = await token.submitTokenRegistration(0);

    await tx.wait();

    spinner.stop();

    console.log(`Token Registration Submitted`);
  });

type MetadataArgs = {
  env: string;
  pl: string;
  token: string;
};

Rayls1155Scope.task(
  'metadata',
  'Get the metadata of a Rayls ERC1155 contract (name, resourceId)',
)
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam(...tokenParamArgs)
  .setAction(async (taskArgs: MetadataArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();

    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getTokenByType(
      'RaylsErc1155Example',
      taskArgs.token,
    );

    // const metadata = await token.getMetadata();
    const [name, resourceId] = await Promise.all([
      token.name(),
      token.resourceId(),
    ]);

    const metadata = {
      name,
      resourceId,
    };

    spinner.stop();

    console.log(`Metadata of ${taskArgs.token}:`);
    console.log(metadata);
  });

type BalancesArgs = {
  env: string;
  pls?: string;
  token: string;
  tokenId: number;
  addressToCheck: string;
};

Rayls1155Scope.task(
  'balances',
  'Check the balance of an Erc1155 token by Id on multiple PLs',
)
  .addParam(...envParamArgs)
  .addParam(
    'pls',
    `The PL's separated by comma (example: "A,B")`,
    undefined,
    types.string,
  )
  .addParam(...tokenParamArgs)
  .addParam('tokenId', 'The token id', undefined, types.int)
  .addParam(
    'addressToCheck',
    'The Address to be checked',
    undefined,
    types.string,
  )
  .setAction(async (taskArgs: BalancesArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();

    spinner.start();

    const pls = taskArgs.pls?.split?.(',');

    if (!pls) {
      throw new Error('No PLs provided');
    }

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const result = await Promise.all(
      pls.map(async (plName) => {
        try {
          const pl = web3.Pls.getPl(plName);

          const token = await pl.getTokenByType(
            'RaylsErc1155Example',
            taskArgs.token,
          );

          return {
            plName,
            balance: await token.balanceOf(
              taskArgs.addressToCheck,
              taskArgs.tokenId,
            ),
          };
        } catch (error) {
          return {
            plName,
            error,
          };
        }
      }),
    );

    const balances = result.reduce(
      (acc, res) => {
        return res.balance !== undefined
          ? {
              data: [...acc.data, { plName: res.plName, balance: res.balance }],
              failed: acc.failed,
            }
          : {
              data: acc.data,
              failed: [...acc.failed, { plName: res.plName, error: res.error }],
            };
      },
      {
        data: [] as { plName: string; balance: bigint }[],
        failed: [] as { plName: string; error: unknown }[],
      },
    );

    spinner.stop();

    balances.failed.forEach((err) => {
      console.error(`Error on ${err.plName}:`, err.error);
    });

    console.log(`\n\tBalance of ${taskArgs.addressToCheck}`);
    balances.data.forEach((balance) => {
      console.log(`\t${balance.plName}: ${balance.balance}`);
    });
  });

type SendArgs = {
  env: string;
  token: string;
  plOrigin: string;
  plDest: string;
  destinationAddress: string;
  tokenId: number;
  amount: number;
};

Rayls1155Scope.task(
  'send',
  'Sends a token from one private ledger to the other one',
)
  .addParam(...envParamArgs)
  .addParam(...tokenParamArgs)
  .addParam('tokenId', 'The token id', undefined, types.int)
  .addParam('amount', 'The amount to be transferred', undefined, types.int)
  .addParam(
    'plOrigin',
    'The origin PL (ex: A, B, C, D, BACEN, TREASURY)',
    undefined,
    types.string,
  )
  .addParam(
    'plDest',
    'The destination PL (ex: A, B, C, D, BACEN, TREASURY)',
    undefined,
    types.string,
  )
  .addParam(
    'destinationAddress',
    'The destination Address',
    undefined,
    types.string,
  )
  .setAction(async (taskArgs: SendArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();

    console.log('Sending transaction...');

    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const originPl = web3.Pls.getPl(taskArgs.plOrigin);
    const dstPl = web3.Pls.getPl(taskArgs.plDest);

    const destinationChainId = dstPl.cfg.chainId;

    const token = await originPl.getTokenByType(
      'RaylsErc1155Example',
      taskArgs.token,
    );

    const tx = await token.teleportAtomic(
      taskArgs.destinationAddress as string,
      taskArgs.tokenId,
      taskArgs.amount,
      destinationChainId,
      Buffer.from(taskArgs.tokenId.toString()),
    );

    await tx.wait();

    spinner.stop();

    console.log(`Transaction pushed on ${taskArgs.plOrigin}'s PL`);
    console.log(`Hash: ${tx.hash}`);
  });
