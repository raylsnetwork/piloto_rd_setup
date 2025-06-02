import { task } from 'hardhat/config';
import { getEnvVariableOrFlag } from '../utils/getEnvOrFlag';

/*
# Flag a participant
npx hardhat flagUnflagParticipant \
    --flag-action "flag" \
    --reason "Suspicious activity" \
    --initiator "Subnet_Auditor" \
    --entity-type "Participant" \
    --entity-id "YourEntitiIdGoseHere" \
    --participant-chain-id "12345"

    # Optional parameters
    --rpc-url-node-cc "https://your.rpc.url" \
    --contract-address "0xYourContractAddress" \
    --private-key-system "0xYourPrivateKey" \
    --participant-chain-id "12345"

# Unflag a participant
npx hardhat flagUnflagParticipant \
    --flag-action "unflag" \
    --reason "Issue resolved" \
    --initiator "Subnet_Auditor" \
    --entity-type "Participant" \
    --entity-id "YourEntitiIdGoseHere" \
    --participant-chain-id "12345"


*/

task('flagUnflagParticipant', 'Flags or unflags a participant')
  .addParam('flagAction', 'The action to perform: "flag" or "unflag"') // Mandatory
  .addParam('reason', 'The reason for the action') // Mandatory
  .addParam('initiator', 'The initiator of the action') // Mandatory
  .addParam('entityType', 'Entity ( Participant/transaction )') // Mandatory
  .addParam('entityId', 'The entity ID to flag or unflag') // Mandatory
  .addParam('participantChainId', 'The Participant Chain ID to flag or unflag') // Optional
  .addOptionalParam('rpcUrlNodeCc', 'The URL of the JSON RPC API from the commit chain') // Optional
  .addOptionalParam('contractAddress', 'The Deployment Registry contract address') // Optional
  .addOptionalParam('privateKeySystem', 'The private key to sign the transaction') // Optional
  .setAction(async (taskArgs, { ethers }) => {
    // Mandatory parameters
    const { flagAction, reason, initiator } = taskArgs;

    // Optional parameters with fallback
    const rpcUrl = getEnvVariableOrFlag('Commit Chain RPC URL', `RPC_URL_NODE_CC`, 'rpcUrlNodeCc', '--rpc-url', taskArgs);
    const deploymentRegistryAddress = getEnvVariableOrFlag('Deployment Registry Address', `COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`, 'contractAddress', '--contract-address', taskArgs);
    const privateKey = getEnvVariableOrFlag('Private Key', `PRIVATE_KEY_SYSTEM`, 'privateKeySystem', '--private-key-system', taskArgs);
    const participantChainId = taskArgs.participantChainId;

    // ensure participantChainId
    if (!participantChainId) {
      throw new Error('Participant Chain ID is required.');
    }

    // Validate the mandatory `flagAction`
    const fevent = flagAction.toLowerCase() === 'flag' ? 0 : flagAction.toLowerCase() === 'unflag' ? 1 : null;
    if (fevent === null) {
      throw new Error('Invalid flag action. Use "flag" or "unflag".');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey);
    const signer = wallet.connect(provider);

    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
    const deployment = await deploymentRegistry.getDeployment();
    const participantStorage = await ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress, signer);

      // TODO Marcos Lobo: fix all in v1
      // const participantStorage = await ethers.getContractAt('src/commitChain/ParticipantStorage/ParticipantStorageV2.sol:ParticipantStorageV2', participantStorageAddress, signer);
    // chech entity type
    if (taskArgs.entityType !== 'Participant' && taskArgs.entityType !== 'Transaction') {
      throw new Error('Invalid entity type. Use "Participant" or "Transaction".');
    }

    const flagEventLog = {
      fevent,
      entityId: taskArgs.entityId,
      entityType: taskArgs.entityType,
      reason,
      initiator,
      timestamp: Math.floor(Date.now() / 1000) // Current timestamp
    };

      // TODO Marcos Lobo: fix all in v1 and uncomment
      // const tx = await participantStorage.flagUnflagEntities(participantChainId, flagEventLog);
    // const receipt = await tx.wait(2);

    // if (receipt?.status === 0) {
    //   throw new Error(`Failed to ${flagAction} participant "${participantChainId}".`);
    // }

    // const lastFlagged = await participantStorage.getFlaggedStatus(participantChainId);
    // console.log(`Participant ${flagAction}ed successfully. Last flagged: ${lastFlagged}`);
    //
    // const flaggedEvents = await participantStorage.getFlagEvents(participantChainId);
    //
    // console.log(`Flagged event for participant ${participantChainId}:`);
    // console.log(flaggedEvents[flaggedEvents.length - 1]);
  });
