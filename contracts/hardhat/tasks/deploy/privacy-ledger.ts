import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import { task } from 'hardhat/config';
import { Wallet } from 'ethers';

task('deploy:privacy-ledger', 'Deploys the Privacy Ledger contracts')
    .addParam('privateLedger', 'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY, CC)')
    .setAction(async (taskArgs, hre) => {
        const { ethers, upgrades } = hre;
        const version = '2.0';
        const chainId = (await ethers.provider.getNetwork()).chainId;

        const ccDeploymentRegistryAddress = process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY'] as string;
        if (!ccDeploymentRegistryAddress) {
            throw new Error('COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY is not set in the .env file');
        }

        let deploymentRegistryAddress = process.env[`DEPLOYMENT_REGISTRY_ADDRESS_${taskArgs.privateLedger}`];

        const privateKey = process.env.PRIVATE_KEY_SYSTEM;
        if (!privateKey) {
            console.error('Error: PRIVATE_KEY_SYSTEM is not set in the .env file');
            process.exit(1);
        }

        const deployer = new ethers.Wallet(privateKey, ethers.provider);
        console.log('Starting deployment of Private Ledger base contracts...');
        console.log(`Deployer Address: ${deployer.address}`);
        console.log('###########################################');

        const usingExistingRegistry = !!deploymentRegistryAddress;

        if (!usingExistingRegistry) {
            console.log(`🛠️ DEPLOYMENT_REGISTRY_ADDRESS_${taskArgs.privateLedger} not found in .env file. Deploying a new DeploymentRegistry contract...`);
            deploymentRegistryAddress = await deployDeploymentRegistry(deployer, ethers, upgrades);
        } else {
            console.log(`✅ Using existing DeploymentRegistry at ${deploymentRegistryAddress}`);

            const deploymentRecord = await getDeploymentFromBlockchain(version, deploymentRegistryAddress as string, deployer, ethers);
            if (deploymentRecord) {
                console.log(`✅ Deployment for version ${version} already exists. Skipping...`);
                console.log('👉 Existing Deployment Data:', deploymentRecord);
                return;
            }
            console.log(`🛠️ No existing deployment found for version ${version}. Proceeding...`);
        }

        const messageExecutorAddress = await deployRaylsMessageExecutor(deployer, ethers, upgrades);
        const endpointAddress = await deployEndpoint(deployer, ethers, upgrades, chainId.toString());
        const contractFactoryAddress = await deployRaylsContractFactory(deployer, endpointAddress, ethers, upgrades);
        const participantStorageAddress = await deployParticipantStorageReplica(deployer, endpointAddress, ethers, upgrades);
        const tokenRegistryReplicaAddress = await deployTokenRegistryV1Replica(deployer, endpointAddress, ethers, upgrades);
        const enygmaPLEventsAddress = await deployEnygmaPLEvents(deployer, endpointAddress, ethers);

        console.log('✅ Finished deployment of PL base contracts');
        console.log('===========================================');
        console.log('👉 Contract Addresses 👈');
        console.log(`RAYLS_MESSAGE_EXECUTOR: ${messageExecutorAddress}`);
        console.log(`PL_ENDPOINT: ${endpointAddress}`);
        console.log(`RAYLS_CONTRACT_FACTORY: ${contractFactoryAddress}`);
        console.log(`PARTICIPANT_STORAGE_REPLICA: ${participantStorageAddress}`);
        console.log(`ENYGMA_PL_EVENTS: ${enygmaPLEventsAddress}`);
        console.log('-------------------------------------------');
        console.log('Configuring contracts in EndpointV1...');

        const endpointContract = await ethers.getContractAt('EndpointV1', endpointAddress, deployer);
        const configureTx = await endpointContract.configureContracts(messageExecutorAddress, contractFactoryAddress, participantStorageAddress, tokenRegistryReplicaAddress);
        await configureTx.wait(2);

        console.log('✅ Contracts configured successfully in EndpointV1.');

        console.log('Synchronizing participant data from Commit Chain...');
        const psrContract = await ethers.getContractAt('ParticipantStorageReplicaV1', participantStorageAddress, deployer);

        const syncTx = await psrContract.requestAllParticipantsDataFromCommitChain();
        const receipt = await syncTx.wait(2);

        if (!receipt || !receipt.blockNumber) {
            throw new Error('Failed to retrieve the transaction receipt or block number.');
        }
        console.log('✅ Participant data synchronization complete.');

        console.log('Synchronizing frozen tokens from Commit Chain...');
        const trrContract = await ethers.getContractAt('TokenRegistryReplicaV1', tokenRegistryReplicaAddress, deployer);

        const syncTrrTx = await trrContract.requestAllFrozenTokensDataFromCommitChain();
        const receiptTrr = await syncTrrTx.wait(2);

        if (!receiptTrr || !receiptTrr.blockNumber) {
            throw new Error('Failed to retrieve the transaction receipt or block number. from TokenRegistryReplica requestAllFrozenTokensDataFromCommitChain call');
        }
        console.log('✅ Frozen tokens synchronization complete.');

        // use a signer for CC
        const rpcUrlCC = process.env['RPC_URL_NODE_CC'] as string;
        const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
        const signerCC = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string).connect(providerCC);
        const ccDeploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', ccDeploymentRegistryAddress, signerCC);
        const deployment = await ccDeploymentRegistry.getDeployment();
        const tokenRegistryAddress = deployment.tokenRegistryAddress;
        console.log('Registering Token Registry in EndpointV1...');
        const registerCCaddressTx = await endpointContract.registerCommitChainAddress('TokenRegistry', tokenRegistryAddress);
        await registerCCaddressTx.wait(2);
        console.log('✅ Token Registry registered successfully.');

        const listenerBatchBlocks = '50';
        const storageProofBatchMessages = '200';

        await saveDeploymentToBlockchain(
            version,
            {
                messageExecutorAddress,
                endpointAddress,
                contractFactoryAddress,
                participantStorageAddress
            },
            deploymentRegistryAddress as string,
            deployer,
            ethers
        );

        console.log(`✅ Deployment data saved for version ${version}`);

        const startingBlock = receipt.blockNumber;
        const endpointMaxBatchMessages = '500';

        const RaylsNodeConfigsInEnv = `
BLOCKCHAIN_PLSTARTINGBLOCK=${startingBlock}
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=${endpointMaxBatchMessages}
BLOCKCHAIN_PLENDPOINTADDRESS=${endpointAddress}
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=${listenerBatchBlocks}
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=${storageProofBatchMessages}
BLOCKCHAIN_ENYGMA_PL_EVENTS=${enygmaPLEventsAddress}
    `;

        console.log(`
NODE_${taskArgs.privateLedger}_ENDPOINT_ADDRESS=${endpointAddress}
`);
        console.log(`===========================================`);
        console.log(`👉👉👉👉 Relayer Configuration 👈👈👈👈`);
        console.log(`-------------------------------------------`);
        console.log('ENV FORMAT:');
        console.log(RaylsNodeConfigsInEnv);
    });

// Helper functions
async function deployDeploymentRegistry(deployer: Wallet, ethers: any, upgrades: any): Promise<string> {
    console.log('Deploying DeploymentRegistry...');
    const factory = await ethers.getContractFactory('DeploymentRegistry', deployer);

    const contract = await upgrades.deployProxy(factory, [deployer.address], {
        kind: 'uups',
        initializer: 'initialize(address)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ DeploymentRegistry deployed at ${address}`);
    return address;
}

async function getDeploymentFromBlockchain(version: string, registryAddress: string, deployer: Wallet, ethers: any): Promise<any | null> {
    console.log(`Checking existing deployment for version: ${version}`);
    const registry = await ethers.getContractAt('DeploymentRegistry', registryAddress, deployer);
    const deploymentRecord = await registry.getDeployment(version);

    if (deploymentRecord.exists) {
        return {
            messageExecutorAddress: deploymentRecord.messageExecutorAddress,
            endpointAddress: deploymentRecord.endpointAddress,
            contractFactoryAddress: deploymentRecord.contractFactoryAddress,
            participantStorageAddress: deploymentRecord.participantStorageAddress
        };
    }
    return null;
}

async function saveDeploymentToBlockchain(version: string, data: Record<string, any>, registryAddress: string, deployer: Wallet, ethers: any): Promise<void> {
    console.log(`Saving deployment data for version: ${version}`);
    const registry = await ethers.getContractAt('DeploymentRegistry', registryAddress, deployer);
    const tx = await registry.saveDeployment(version, data.messageExecutorAddress, data.endpointAddress, data.contractFactoryAddress, data.participantStorageAddress);
    await tx.wait();

    console.log('⏳ Waiting for transaction to be mined...');
    await tx.wait(2);
    console.log('✅ Deployment data saved on blockchain!');
}

async function deployRaylsMessageExecutor(deployer: Wallet, ethers: any, upgrades: any): Promise<string> {
    console.log('Deploying RaylsMessageExecutorV1...');
    const factory = await ethers.getContractFactory('RaylsMessageExecutorV1', deployer);

    const contract = await upgrades.deployProxy(factory, [deployer.address], {
        kind: 'uups',
        initializer: 'initialize(address)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ RaylsMessageExecutorV1 deployed at ${address}`);
    return address;
}

async function deployEndpoint(deployer: Wallet, ethers: any, upgrades: any, chainId: string): Promise<string> {
    console.log('Deploying EndpointV1...');
    const factory = await ethers.getContractFactory('EndpointV1', deployer);

    const commitChainId = process.env.NODE_CC_CHAIN_ID;
    const maxBatchMessages = '500';

    const contract = await upgrades.deployProxy(factory, [deployer.address, chainId, commitChainId, maxBatchMessages], {
        kind: 'uups',
        initializer: 'initialize(address,uint256,uint256,uint256)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ EndpointV1 deployed at ${address}`);
    return address;
}

async function deployRaylsContractFactory(deployer: Wallet, endpointAddress: string, ethers: any, upgrades: any): Promise<string> {
    console.log('Deploying RaylsContractFactoryV1...');
    const factory = await ethers.getContractFactory('RaylsContractFactoryV1', deployer);

    const contract = await upgrades.deployProxy(factory, [endpointAddress, deployer.address], {
        kind: 'uups',
        initializer: 'initialize(address,address)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ RaylsContractFactoryV1 deployed at ${address}`);
    return address;
}

async function deployParticipantStorageReplica(deployer: Wallet, endpointAddress: string, ethers: any, upgrades: any): Promise<string> {
    console.log('Deploying ParticipantStorageReplicaV1...');
    const factory = await ethers.getContractFactory('ParticipantStorageReplicaV1', deployer);

    const contract = await upgrades.deployProxy(factory, [deployer.address, endpointAddress], {
        kind: 'uups',
        initializer: 'initialize(address,address)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ ParticipantStorageReplicaV2 deployed at ${address}`);
    return address;
}

async function deployEnygmaPLEvents(deployer: Wallet, endpointAddress: string, ethers: any): Promise<string> {
    console.log('Deploying EnygmaPLEvent...');
    const factory = await ethers.getContractFactory('EnygmaPLEvents', deployer);

    const contract = await factory.deploy(endpointAddress);
    await contract.deploymentTransaction().wait();

    await contract.initialize();

    const address = await contract.getAddress();
    console.log(`✅ EnygmaPLEvent deployed at ${address}`);
    return address;
}

async function deployTokenRegistryV1Replica(deployer: Wallet, endpointAddress: string, ethers: any, upgrades: any): Promise<string> {
    console.log('Deploying TokenRegistryReplicaV1...');
    const factory = await ethers.getContractFactory('TokenRegistryReplicaV1', deployer);

    const contract = await upgrades.deployProxy(factory, [deployer.address, endpointAddress], {
        kind: 'uups',
        initializer: 'initialize(address,address)'
    });

    await contract.deploymentTransaction().wait(2);

    const address = await contract.getAddress();
    console.log(`✅ TokenRegistryReplicaV1 deployed at ${address}`);
    return address;
}