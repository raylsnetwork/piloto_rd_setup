import { task } from 'hardhat/config';
import { ethers } from 'hardhat';
import { Spinner } from '../utils/spinner';

task('tokenDataAndBalance', 'Retrives the token data and all balances')
  .addParam('privateLedger', 'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY, CC)')
  .addParam('endpointAddress', 'The Address of the endpoint contract')
  .addParam('addressToCheck', 'The Address to be checked')
  .addParam('resourceId', 'The resource id in hex string of the token')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    console.log('Checking resource...');
    spinner.start();
    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.privateLedger}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);

    const endpoint = await hre.ethers.getContractAt('EndpointV1', taskArgs.endpointAddress, signer);
    const tokenAddress = await endpoint.connect(signer).resourceIdToContractAddress(taskArgs.resourceId);
    spinner.stop();
    if (tokenAddress == '0x0000000000000000000000000000000000000000') {
      console.log(`Token not implemented on PL ${taskArgs.privateLedger}`);
      return;
    }
    const token = await hre.ethers.getContractAt('TokenExample', tokenAddress, signer);
    console.log(`Found Implemented on PL ${taskArgs.privateLedger} at Address ${tokenAddress}`);
    console.log('');
    console.log('Token Data:');
    console.log(`- Symbol: ${await token.symbol()}`);
    console.log(`- Name: ${await token.name()}`);
    console.log(`- Balance of ${taskArgs.addressToCheck}: ${await token.balanceOf(taskArgs.addressToCheck)}`);
  });
