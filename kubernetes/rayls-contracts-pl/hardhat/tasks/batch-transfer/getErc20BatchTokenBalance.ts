import { task } from 'hardhat/config';
import { Spinner } from '../../utils/spinner';

task('getErc20BatchTokenBalance', 'Retrieves the token balance')
  .addParam('pl', 'The privacy ledger to check the balance in e.g.: A, B, ...')
  .addParam('address', 'The address to check the balance')
  .addParam('resourceId', 'The resourceId of the token')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();

    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);
    
    const endpointAddress = process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string;
    const endpoint = await hre.ethers.getContractAt('EndpointV1', endpointAddress, signer);
    const tokenAddress = await endpoint.connect(signer).resourceIdToContractAddress(taskArgs.resourceId);
    
    spinner.stop();
    
    if (tokenAddress == '0x0000000000000000000000000000000000000000') {
      console.log(`Token not implemented on PL ${taskArgs.pl}`);
      return;
    }

    const token = await hre.ethers.getContractAt('Erc20BatchTeleport', tokenAddress, signer);

    console.log(`Found Implemented on PL ${taskArgs.pl} at address ${tokenAddress}`);
    console.log('');
    console.log('Token Data:');
    console.log(`- Symbol: ${await token.symbol()}`);
    console.log(`- Name: ${await token.name()}`);
    console.log(`- Balance of ${taskArgs.address}: ${await token.balanceOf(taskArgs.address)}`);
  });
