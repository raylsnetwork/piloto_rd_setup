import { types } from 'hardhat/config';
import { getEthers } from '../../../../utils/cfg/ethers';
import { Spinner } from '../../../../utils/spinner';
import {
  envParamArgs,
  plParamArgs,
  tokenParamArgs,
} from '../../../../utils/params';
import { RaylsErc20Scope } from '../../config';

type DeployArgs = {
  env: string;
  pl: string;
  name: string;
  symbol: string;
  submit: boolean;
};

RaylsErc20Scope.task('deploy', 'Deploys a Rayls ERC20 contract')
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam('name', 'Token Name', `RaylsErc20_${Date.now()}`, types.string)
  .addParam('symbol', 'Token Symbol', undefined, types.string)
  .addParam('submit', 'Submit Token to Ven', true, types.boolean)
  .setAction(async (taskArgs: DeployArgs, hre) => {
    await hre.run('compile');

    const spinner: Spinner = new Spinner();
    console.log(`Deploying token on ${taskArgs.pl}...`);
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getContractFactory('TokenExample');

    const endpointAddress = pl.deploymentsCfg?.Endpoint;

    if (!endpointAddress) {
      throw new Error('Endpoint not deployed on PL');
    }

    const res = await token.deploy(
      taskArgs.name,
      taskArgs.symbol,
      endpointAddress,
    );

    console.log('Waiting for deployment...');

    const tokenPL = await res.waitForDeployment();

    const tokenAddress = await tokenPL.getAddress();

    console.log(`Token Deployed At Address ${tokenAddress}`);

    await web3.setPlConfig(taskArgs.pl, (plCfg) => {
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
            type: 'TokenExample',
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

RaylsErc20Scope.task('submit', 'Submits a token registration')
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam(...tokenParamArgs)
  .setAction(async (taskArgs: SubmitArgs, hre) => {
    const spinner: Spinner = new Spinner();
    console.log(`Submitting token registration on ${taskArgs.pl}...`);
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getTokenByType('TokenExample', taskArgs.token);

    const resourceId = await token.resourceId();

    if (resourceId) {
      throw new Error('Token already submitted');
    }

    const tx = await token.submitTokenRegistration(0);

    await tx.wait();

    spinner.stop();

    console.log(
      `Token Registration Submitted, wait until relayer retrieves the generated resource`,
    );
  });

type MetadataArgs = {
  env: string;
  pl: string;
  token: string;
};

RaylsErc20Scope.task(
  'metadata',
  'Retrieves the metadata of an ERC20 token (name, symbol, resourceId)',
)
  .addParam(...envParamArgs)
  .addParam(...plParamArgs)
  .addParam(...tokenParamArgs)
  .setAction(async (taskArgs: MetadataArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();

    const web3 = await getEthers({ env: taskArgs.env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(taskArgs.pl);

    const token = await pl.getTokenByType('TokenExample', taskArgs.token);

    if (!(await token.owner())) {
      throw new Error('Token not deployed');
    }

    const [name, symbol, resourceId] = await Promise.all([
      token.name(),
      token.symbol(),
      token.resourceId(),
    ]);

    const metadata = {
      name,
      symbol,
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
  addressesToCheck: string;
};

RaylsErc20Scope.task(
  'balances',
  'Check the balance of an ERC20 token on multiple Pls',
)
  .addParam(...envParamArgs)
  .addParam(
    'pls',
    'The Pls identification (ex: A, B, C, D, BACEN, TREASURY)',
    undefined,
    types.string,
  )
  .addParam(...tokenParamArgs)
  .addParam(
    'addressesToCheck',
    'The Address to be checked',
    undefined,
    types.string,
  )
  .setAction(async (taskArgs: BalancesArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();

    spinner.start();

    const pls = taskArgs.pls?.split?.(',');
    const addresses = taskArgs.addressesToCheck.split(',');

    if (!pls?.length) {
      throw new Error('No PLs provided');
    }

    if (!addresses.length) {
      throw new Error('No addresses provided');
    }

    const web3 = await getEthers({ env: taskArgs.env, ethers });

    const result = await Promise.all(
      pls.map(async (plName) => {
        try {
          const pl = web3.Pls.getPl(plName);

          const token = await pl.getTokenByType('TokenExample', taskArgs.token);

          return {
            plName,
            balances: await Promise.all(
              addresses.map(async (address) => {
                return {
                  address,
                  balance: await token.balanceOf(address),
                };
              }),
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
        return res.balances !== undefined
          ? {
              data: [
                ...acc.data,
                ...res.balances.map(({ address, balance }) => ({
                  plName: res.plName,
                  address,
                  balance,
                })),
              ],
              failed: acc.failed,
            }
          : {
              data: acc.data,
              failed: [...acc.failed, { plName: res.plName, error: res.error }],
            };
      },
      {
        data: [] as { plName: string; address: string; balance: bigint }[],
        failed: [] as { plName: string; error: unknown }[],
      },
    );

    spinner.stop();

    balances.failed.forEach((err) => {
      console.error(`Error on ${err.plName}:`, err.error);
    });

    console.log(`\nToken "${taskArgs.token}" balances!`);
    console.table(balances.data);
  });

type SendArgs = {
  env: string;
  token: string;
  plOrigin: string;
  plDest: string;
  destinationAddress: string;
  amount: number;
};

RaylsErc20Scope.task(
  'send',
  'Sends a token from one private ledger to the other one',
)
  .addParam(...envParamArgs)
  .addParam(...tokenParamArgs)
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

    const token = await originPl.getTokenByType('TokenExample', taskArgs.token);

    const tx = await token.teleportAtomic(
      taskArgs.destinationAddress,
      taskArgs.amount,
      destinationChainId,
    );

    await tx.wait();

    spinner.stop();

    console.log(`Transaction pushed on ${taskArgs.plOrigin}'s PL`);
    console.log(`Hash: ${tx.hash}`);
  });
