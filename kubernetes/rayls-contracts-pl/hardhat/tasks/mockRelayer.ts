import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";
import { EndpointV1, ResourceRegistryV1 } from "../../typechain-types";
import { mockRelayerEthersLastTransaction } from "../test/unit/utils/RelayerMockEthers";
import * as fs from "fs";

task("mockRelayer", "Mocks relayer call by getting the logs from last block on PL1 and send to PL2 endpoint")
    .addParam("pls", `The private Ledgers Separated by commas (ex: "A,B") (options: A, B, C, D, BACEN, TREASURY)`)
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Running mock relayer...");
        spinner.start();
        const pls = (taskArgs.pls as string).split(',');
        pls.push('CC');
        let messageIdsAlreadyProcessed = {};
        try {
            messageIdsAlreadyProcessed = JSON.parse(await fs.readFileSync('./messageIdsAlreadyProcessedOnMockRelayer.json', { encoding: 'utf-8' }));
        } catch (error) { } //ignores
        const endpointMappings: { [chainId: string]: EndpointV1 | null } = {};
        let resourceRegistry: ResourceRegistryV1 | undefined = undefined;
        for (var pl of pls) {
            const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
            const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
            const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
            const signer = wallet.connect(provider);
            const chainId = process.env[`NODE_${pl}_CHAIN_ID`] as string
            const endpoint = await hre.ethers.getContractAt("EndpointV1", process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string, signer);

            endpointMappings[chainId] = endpoint;

            if (pl == 'CC') {
                resourceRegistry = await hre.ethers.getContractAt("ResourceRegistryV1", process.env[`RESOURCE_REGISTRY_ADDRESS`] as string, signer);
            }
        }
        if (!resourceRegistry) {
            console.log("No resource registry defined");
            return;
        }
        const txs = await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
        spinner.stop();
        console.log(`Found ${txs.length} transactions to be pushed`);
        for (let tx of txs) {
            console.log(`From: ${tx.originChainId} | To: ${tx.destinationChainId} | Tx Hash: ${tx.tx.hash} | Success: ${(await tx.tx.wait())?.status == 1}`);
        }
        fs.writeFileSync('./messageIdsAlreadyProcessedOnMockRelayer.json', JSON.stringify(messageIdsAlreadyProcessed, null, 4), { flag: 'w' });
    });