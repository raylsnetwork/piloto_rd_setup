import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

task('addParticipant', 'Add participant on the VEN')
  .addOptionalParam('rpcUrlNodeCc', 'The url of the json rpc api from the commit chain')
  .addOptionalParam('contractAddress', 'The Deployment Registry contract address')
  .addOptionalParam('privateKeySystem', 'The Private Key')
  .addOptionalParam('participantChainId', 'The Participant Chain Id')
  .addOptionalParam('participantName', 'The Participant Name')
  .addOptionalParam('participantOwnerAddress', 'The Participant Owner Address')
  .addOptionalParam('participantRole', 'The Participant Role (0 for Participant, 1 for Issuer)')
  .setAction(async (taskArgs, { ethers }) => {
    const rpcUrl = getEnvVariableOrFlag('Commit Chain RPC Url', `RPC_URL_NODE_CC`, 'rpcUrlNodeCc', '--rpc-url', taskArgs);
    const deploymentRegistryAddress = getEnvVariableOrFlag('Deployment Registry Address', `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`, 'contractAddress', '--contract-address', taskArgs);
    const privateKey = getEnvVariableOrFlag('Private Key', `PRIVATE_KEY_SYSTEM`, 'privateKeySystem', '--private-key-system', taskArgs);

    const participantChainId = getEnvVariableOrFlag('Participant ChainId', `PARTICIPANT_CHAIN_ID`, 'participantChainId', '--participant-chain-id', taskArgs);
    const participantName = getEnvVariableOrFlag('Participant Name', `PARTICIPANT_NAME`, 'participantName', '--participant-name', taskArgs);
    const participantRole = getEnvVariableOrFlag('Participant Role', `PARTICIPANT_ROLE`, 'participantRole', '--participant-role', taskArgs);
    const participantOwnerAddress = getEnvVariableOrFlag('Participant OwnerAddress', `PARTICIPANT_OWNER_ADDRESS`, 'participantOwnerAddress', 'PARTICIPANT_OWNER_ADDRESS', taskArgs);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const venOperatorWallet = new ethers.Wallet(privateKey);
    const signer = venOperatorWallet.connect(provider);

    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
    const deployment = await deploymentRegistry.getDeployment();
    const participantStorage = await ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress, signer);

    let tx = await participantStorage.addParticipant({
      chainId: participantChainId,
      role: participantRole,
      ownerId: participantOwnerAddress,
      name: participantName
    });
    let receipt = await tx.wait(2);
    if (receipt?.status === 0) {
      let err = `The Participant "${participantChainId}" failed to be added`;
      throw new Error(err);
    }
    // Automatically approves all added participants (set status as ACTIVE)
    tx = await participantStorage.updateStatus(participantChainId, 1);
    receipt = await tx.wait(2);
    if (receipt?.status === 0) {
      let err = `The Participant "${participantChainId}" failed to be updated with status ACTIVE`;
      throw new Error(err);
    }

    console.log('Participant Successfully added!');
  });
