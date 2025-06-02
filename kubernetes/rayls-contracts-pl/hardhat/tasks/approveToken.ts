import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

task('approveToken', 'Approve token on TokenRegistry')
  .addOptionalParam('rpcUrlNodeCc', 'The url of the json rpc api from the commit chain')
  .addOptionalParam('contractAddress', 'The Deployment Registry contract address')
  .addOptionalParam('resourceId', 'The resource id of the token to be approved')
  .addOptionalParam('privateKeySystem', 'The Private Key')
  .setAction(async (taskArgs, { ethers }) => {
    const rpcUrl = getEnvVariableOrFlag('Commit Chain RPC Url', `RPC_URL_NODE_CC`, 'rpcUrlNodeCc', '--rpc-url', taskArgs);
    const deploymentRegistryAddress = getEnvVariableOrFlag('Deployment Registry Address', `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`, 'contractAddress', '--contract-address', taskArgs);
    const resourceId = getEnvVariableOrFlag('Token ResourceId', `TOKEN_RESOURCE_ID`, 'resourceId', '--resource-id', taskArgs);
    const privateKey = getEnvVariableOrFlag('Private Key', `PRIVATE_KEY_SYSTEM`, 'privateKeySystem', '--private-key-system', taskArgs);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const venOperatorWallet = new ethers.Wallet(privateKey);
    const signer = venOperatorWallet.connect(provider);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
    const deployment = await deploymentRegistry.getDeployment();

    // Load the TokenRegistry contract
    const TokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signer);
    // Call approve token function
    await TokenRegistry.updateStatus(resourceId, 1, { gasLimit: 5000000 });
    console.log(`✅ The token with resourceId ${resourceId} got approved!`);
  });
