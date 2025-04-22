import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

task('getAllTokens', 'List all registered tokens from the TokenRegistry contract')
  .addOptionalParam('rpcUrlNodeCc', 'The url of the json rpc api from the commit chain')
  .addOptionalParam('contractAddress', 'The Deployment Registry contract address')
  .setAction(async (taskArgs, { ethers }) => {
    const rpcUrl = getEnvVariableOrFlag('Commit Chain RPC Url', `RPC_URL_NODE_CC`, 'rpcUrlNodeCc', '--rpc-url', taskArgs);
    const deploymentRegistryAddress = getEnvVariableOrFlag('Deployment Registry Address', `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`, 'contractAddress', '--contract-address', taskArgs);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = venOperatorWallet.connect(provider);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
    const deployment = await deploymentRegistry.getDeployment();

    // Load the TokenRegistry contract
    const TokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signer);
    // Call getAllTokens function
    const tokens = await TokenRegistry.getAllTokens({ gasLimit: 5000000 });
    for (var token of tokens) {
      console.log(`ResourceId: ${token.resourceId} | Name: "${token.name}" | Symbol: "${token.symbol}" | Status: ${token.status == BigInt(1) ? 'Approved' : 'Not Approved'}`);
    }
  });
