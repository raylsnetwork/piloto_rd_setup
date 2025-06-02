import { task } from 'hardhat/config';
import { ethers } from 'hardhat';
import { Spinner } from '../utils/spinner';

task(
  'checkEnygmaResourceId',
  'Checks the resource Id of a token on the private ledger',
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
      'EnygmaTokenExample',
      taskArgs.tokenAddress,
      signer,
    );
    const resourceId = await token.resourceId();
    console.log("🚀 ~ .setAction ~ resourceId:", resourceId)

    
    const symbol = await token.symbol();

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
