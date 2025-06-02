import { task } from 'hardhat/config';
import { ethers } from 'hardhat';

task('approveAllTokens', 'Approve all registered tokens from the TokenRegistry contract').setAction(async (taskArgs, { ethers }) => {
  const commitChainRpcUrl = process.env['RPC_URL_NODE_CC'];
  const provider = new ethers.JsonRpcProvider(commitChainRpcUrl);
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const signer = venOperatorWallet.connect(provider);
  // Load the Deployment Registry contract
  const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY']!, signer);
  const deployment = await deploymentRegistry.getDeployment();
  // Load the TokenRegistry contract
  const TokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress as string, signer);
  // TODO Marcos Lobo: fix all in v1
  // const TokenRegistry = await ethers.getContractAt('TokenRegistryV2', process.env['RAYLS_TOKEN_REGISTRY_PROXY'] as string, signer);
  // Call getAllTokens function
  const tokens = await TokenRegistry.getAllTokens({ gasLimit: 5000000 });
  for (var token of tokens) {

    await TokenRegistry.updateStatus(token.resourceId, 1, { gasLimit: 5000000 });
    console.log(`The token "${token.name}" (${token.symbol}) chainId -> ${token.issuerChainId} issuerImplementationAddress -> ${token.issuerImplementationAddress}  got approved!`);
  }
});
