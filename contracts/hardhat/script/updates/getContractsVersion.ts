import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre from 'hardhat';

require('dotenv').config();

async function main() {
    const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
    const deployment = await deploymentRegistry.getDeployment();

    const endpoint = await hre.ethers.getContractAt('EndpointV1', deployment.endpointAddress!);

    await endpoint
        .getFunction('contractVersion')
        .call({})
        .then((version) => {
            console.log('Endpoint version', version);
        });

    const atomicTeleport = await hre.ethers.getContractAt('TeleportV1', deployment.teleportAddress!);

    await atomicTeleport
        .getFunction('contractVersion')
        .call({})
        .then((version) => {
            console.log('Teleport version', version);
        });

    const resourceRegistry = await hre.ethers.getContractAt('ResourceRegistryV1', deployment.resourceRegistryAddress!);

    await resourceRegistry
        .getFunction('contractVersion')
        .call({})
        .then((version) => {
            console.log('ResourceRegistry version', version);
        });

    const participantStorage = await hre.ethers.getContractAt('ParticipantStorageV1', deployment.participantStorageAddress!);

    await participantStorage
        .getFunction('contractVersion')
        .call({})
        .then((version) => {
            console.log('ParticipantStorage version', version);
        });

    const tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress!);

    await tokenRegistry
        .getFunction('contractVersion')
        .call({})
        .then((version) => {
            console.log('TokenRegistry version', version);
        });
}

main();
