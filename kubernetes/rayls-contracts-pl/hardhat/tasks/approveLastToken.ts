import { task } from 'hardhat/config';
import { ethers } from 'hardhat';

task('approveLastToken', 'Approve all registered tokens from the TokenRegistry contract').setAction(async (taskArgs, { ethers }) => {
  const commitChainRpcUrl = process.env['RPC_URL_NODE_CC'];
  const provider = new ethers.JsonRpcProvider(commitChainRpcUrl);
  const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const signer = venOperatorWallet.connect(provider);

  // Load the Deployment Registry contract
  const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY']!, signer);
  const deployment = await deploymentRegistry.getDeployment();
  // Load the TokenRegistry contract
  const TokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress as string, signer);
  // Call getAllTokens function
  const tokens = await TokenRegistry.getAllTokens({ gasLimit: 5000000 });
  let lastToken = tokens[tokens.length - 1];
  console.log('Trying to approve token with symbol:', lastToken.symbol, 'and name:', lastToken.name, 'and resourceId:', lastToken.resourceId);
  let tx = await TokenRegistry.updateStatus(lastToken.resourceId, 1, { gasLimit: 5000000 });
  let receipt = await tx.wait(2);
  if (receipt?.status === 0) {
    let err = `The token "${lastToken.name}" (${lastToken.symbol}) failed to be approved`;
    throw new Error(err);
  }
  console.log(`The token "${lastToken.name}" (${lastToken.symbol}) got approved!`);
});
