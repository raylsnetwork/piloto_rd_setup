import { task } from "hardhat/config";
import { Spinner } from "../utils/spinner";

task("checkResourceId", "Deploys all the PL's contracts and retrieve contracts addresses")
    .addParam("privateLedger", "The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("endpointAddress", "The Address of the endpoint contract")
    .addParam("resourceId", "The resource id in hex string")
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Checking contract...");
        spinner.start();
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.privateLedger}`];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = wallet.connect(provider);

        const endpoint = await hre.ethers.getContractAt("EndpointV1", taskArgs.endpointAddress, signer);
        console.log(`Mapped Address on PL ${taskArgs.privateLedger}: ${await endpoint.connect(signer).resourceIdToContractAddress(taskArgs.resourceId)}`);
    });