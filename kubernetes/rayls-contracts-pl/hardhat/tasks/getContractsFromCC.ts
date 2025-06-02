import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

task('getContractsFromCC', 'List all registered contracts from CC').setAction(async (taskArgs, { ethers }) => {
  const rpcUrl = getEnvVariableOrFlag('Commit Chain RPC Url', `RPC_URL_NODE_CC`, 'rpcUrlNodeCc', '--rpc-url', taskArgs);
  const deploymentRegistryAddress = getEnvVariableOrFlag('Deployment Registry Address', `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`, 'contractAddress', '--contract-address', taskArgs);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const signer = venOperatorWallet.connect(provider);

  const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
  const deployment = await deploymentRegistry.getDeployment();

  console.log(
    `Resource Address: ${deployment.resourceRegistryAddress} / Teleport Address: ${deployment.teleportAddress} / Endpoint Address: ${deployment.endpointAddress} / Token Address: ${deployment.tokenRegistryAddress} / Proofs Address: ${deployment.proofsAddress} / Participant Address: ${deployment.participantStorageAddress}`
  );
});
