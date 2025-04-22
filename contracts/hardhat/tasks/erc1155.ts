import { scope, types } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { ethers as Ethers } from 'hardhat';
import { RaylsErc1155Example } from '../../typechain-types';

const Scope = scope('erc1155', 'Interactions with Rayls ERC1155 contracts');

type DeployArgs = {
  pl: string;
  name: string;
};

Scope.task('deploy', 'Deploys a Rayls ERC1155 contract')
  .addParam(
    'pl',
    'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)',
    undefined,
    types.string,
  )
  .addParam('name', 'Token Name', `RaylsErc1155_${Date.now()}`, types.string)
  .setAction(async (taskArgs: DeployArgs, hre) => {
    const { ethers } = hre;
    await hre.run('compile');
    const spinner: Spinner = new Spinner();
    console.log(`Deploying token on ${taskArgs.pl}...`);
    spinner.start();

    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(
      process.env['PRIVATE_KEY_SYSTEM'] as string,
    );

    const signer = new ethers.NonceManager(wallet.connect(provider));

    const token = await ethers.getContractFactory(
      'RaylsErc1155Example',
      signer,
    );

    const tokenPL = await token
      .connect(signer)
      .deploy(
        'url',
        taskArgs.name,
        process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string,
        { gasLimit: 5000000 },
      );

    spinner.stop();

    console.log(`Token Deployed At Address ${await tokenPL.getAddress()}`);
    await tokenPL.submitTokenRegistration(0);
    console.log(
      `Token Registration Submitted, wait until relayer retrieves the generated resource`,
    );
    console.log('');
    console.log(
      "To check if it's registered, please use the following command:",
    );
    console.log(
      `\$ npx hardhat checkTokenResourceId --pl ${
        taskArgs.pl
      } --token-address ${await tokenPL.getAddress()}`,
    );
  });

type BalancesArgs = {
  pls: string;
  token: string;
  tokenId: number;
  addressToCheck?: string;
};

Scope.task(
  'balances',
  'Check the balance of an Erc1155 token by Id on a private ledger',
)
  .addParam(
    'pls',
    `The PL's separated by comma (example: "A,B")`,
    undefined,
    types.string,
  )
  .addParam('token', 'The token name', undefined, types.string)
  .addParam('tokenId', 'The token id', undefined, types.int)
  .addOptionalParam(
    'addressToCheck',
    'The Address to be checked',
    undefined,
    types.string,
  )
  .setAction(async (taskArgs: BalancesArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();
    console.log('Checking resource...');
    spinner.start();
    const pls = taskArgs.pls.split(',');
    for (let pl of pls) {
      const token = await getTokenBySymbol(ethers, pl, taskArgs.token);
      const tokenAddress = await token.getAddress();
      spinner.stop();

      if (tokenAddress == '0x0000000000000000000000000000000000000000') {
        console.log(`Token not implemented on PL ${pl}`);
        continue;
      }

      console.log(`Found Implemented on PL ${pl} at Address ${tokenAddress}`);
      if (taskArgs.addressToCheck)
        console.log(
          `  Balance of ${
            taskArgs.addressToCheck
          } on ${pl}: ${await token.balanceOf(
            taskArgs.addressToCheck,
            taskArgs.tokenId,
          )}`,
        );
    }
  });

type SendArgs = {
  token: string;
  plOrigin: string;
  plDest: string;
  destinationAddress: string;
  tokenId: number;
  amount: number;
};

Scope.task('send', 'Sends a token from one private ledger to the other one')
  .addParam('token', 'The token name')
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
  .addParam('tokenId', 'The token id', undefined, types.int)
  .addParam('amount', 'The amount to be transferred', undefined, types.int)
  .setAction(async (taskArgs: SendArgs, { ethers }) => {
    const spinner: Spinner = new Spinner();
    console.log('Sending transaction...');
    spinner.start();
    const destinationChainId = process.env[
      `NODE_${taskArgs.plDest}_CHAIN_ID`
    ] as string;

    const token = await getTokenBySymbol(
      ethers,
      taskArgs.plOrigin,
      taskArgs.token,
    );

    const tx = await token.teleportAtomic(
      taskArgs.destinationAddress as string,
      taskArgs.tokenId,
      taskArgs.amount,
      destinationChainId,
      Buffer.from(taskArgs.tokenId.toString()),
    );
    spinner.stop();
    console.log(`Transaction pushed on ${taskArgs.plOrigin}'s PL`);
    console.log(`Hash: ${tx.hash}`);
  });

async function getTokenBySymbol(
  ethers: typeof Ethers,
  pl: string,
  tokenSymbol: string,
): Promise<RaylsErc1155Example> {
  const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const signer = wallet.connect(provider);
  const resourceId = process.env[`TOKEN_${tokenSymbol}_RESOURCE_ID`] as string;

  const endpoint = await ethers.getContractAt(
    'Endpoint',
    process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string,
    signer,
  );
  const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);
  const token = await ethers.getContractAt(
    'RaylsErc1155Example',
    tokenAddress,
    signer,
  );

  return token;
}
