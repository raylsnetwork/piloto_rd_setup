import { task } from 'hardhat/config';
import { ethers } from 'hardhat';
import { Spinner } from '../utils/spinner';

task(
  'checkTokenResourceId',
  'Sends a token from one private ledger to the other one',
)
  .addParam(
    'tokenAddress',
    'The address of token contract on origin private ledger',
  )
  .addParam('pl', 'The PL (ex: A, B, C, D, BACEN, TREASURY)')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    console.log('Checking token information...');
    spinner.start();
    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];

    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(
      process.env['PRIVATE_KEY_SYSTEM'] as string,
    );
    const signer = wallet.connect(provider);

    const token = await hre.ethers.getContractAt(
      'TokenExample',
      taskArgs.tokenAddress,
      signer,
    );
    const resourceId = await token.resourceId();
    const symbol =
      (await token.symbol().catch(() => null)) || (await token.name());
    spinner.stop();
    if (
      resourceId !=
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      console.log(
        `The token got successfully registered with the resourceId ${resourceId}`,
      );
      console.log(``);
      console.log(
        `👉 Add the variable below in .env to interact with this token. Always mention by symbol with flag --token ${symbol} `,
      );
      console.log(`TOKEN_${symbol}_RESOURCE_ID=${resourceId}`);
    } else {
      console.log(
        `No resource id generated! Wait until Ven Operator approves the token. If so, check if relayer is working properly`,
      );
    }
  });
