import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

task('updateParticipant', 'Update participant on the VEN')
  .addParam('chainid', 'ChainID of the participant')
  .addParam('status', 'New status of the participant')
  .setAction(async (taskArgs, { ethers }) => {
    const rpcUrl = process.env['RPC_URL_NODE_CC'] as string;
    const deploymentRegistryAddress = process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY'] as string;
    const privateKey = process.env['PRIVATE_KEY_SYSTEM'] as string;

    const newParticipantChainId = taskArgs.chainid;
    const newParticipantStatus = taskArgs.status;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const venOperatorWallet = new ethers.Wallet(privateKey);
    const signer = venOperatorWallet.connect(provider);

    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
    const deployment = await deploymentRegistry.getDeployment();
    const participantStorage = await ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress, signer);

    let tx = await participantStorage.updateStatus(newParticipantChainId, newParticipantStatus);

    console.log(`Participant ${newParticipantChainId} status updated to ${newParticipantStatus}`);
  });
