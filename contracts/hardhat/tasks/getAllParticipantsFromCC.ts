import { task } from 'hardhat/config';

task('getAllParticipantsFromCC', 'Get all participants on the VEN').setAction(async (taskArgs, { ethers }) => {
  const rpcUrl = process.env['RPC_URL_NODE_CC'] as string;
  const deploymentRegistryAddress = process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY'] as string;
  const privateKey = process.env['PRIVATE_KEY_SYSTEM'] as string;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const venOperatorWallet = new ethers.Wallet(privateKey);
  const signer = venOperatorWallet.connect(provider);

  const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentRegistryAddress!, signer);
  const deployment = await deploymentRegistry.getDeployment();
  const participantStorage = await ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress, signer);

  let participants = await participantStorage.getAllParticipants();

  const statusEnum = ['NEW', 'ACTIVE', 'INACTIVE', 'FROZEN'];
  const roleEnum = ['PARTICIPANT', 'ISSUER', 'AUDITOR'];

  for (const participant of participants) {
    const statusName = statusEnum[Number(participant.status)];
    const roleName = roleEnum[Number(participant.role)];

    console.log(`---`);
    console.log(`ChainID: ${participant.chainId}`);
    console.log(`Role: ${roleName}`);
    console.log(`Status: ${statusName}`);
    console.log(`Owner ID: ${participant.ownerId}`);
    console.log(`Name: ${participant.name}`);
    console.log(`Created At: ${new Date(Number(participant.createdAt) * 1000).toISOString()}`);
    console.log(`Updated At: ${new Date(Number(participant.updatedAt) * 1000).toISOString()}`);
    console.log(`Allowed to Broadcast: ${participant.allowedToBroadcast}`);
  }

  console.log(`\nTotal participants: ${participants.length}`);
});
