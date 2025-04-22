import { task } from "hardhat/config";
import { Spinner } from "../utils/spinner";

task("checkNonceParity", "Checks the nonce parity between two PLs")
    .addParam("pl1", "The PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("pl2", "The PL (ex: A, B, C, D, BACEN, TREASURY)")
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Checking contracts...");
        spinner.start();
        const rpcUrl1 = process.env[`RPC_URL_NODE_${taskArgs.pl1}`];
        const rpcUrl2 = process.env[`RPC_URL_NODE_${taskArgs.pl2}`];
        const provider1 = new hre.ethers.JsonRpcProvider(rpcUrl1);
        const provider2 = new hre.ethers.JsonRpcProvider(rpcUrl2);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer1 = wallet.connect(provider1);
        const signer2 = wallet.connect(provider2);
        const chainIdPl1 = process.env[`NODE_${taskArgs.pl1}_CHAIN_ID`] as string
        const chainIdPl2 = process.env[`NODE_${taskArgs.pl2}_CHAIN_ID`] as string

        const endpoint1 = await hre.ethers.getContractAt("EndpointV1", process.env[`NODE_${taskArgs.pl1}_ENDPOINT_ADDRESS`] as string, signer1);
        const endpoint2 = await hre.ethers.getContractAt("EndpointV1", process.env[`NODE_${taskArgs.pl2}_ENDPOINT_ADDRESS`] as string, signer2);

        const inboundOf1InPl2 = await endpoint2.inboundNonce(chainIdPl1);
        const outboundOf1InPl2 = await endpoint2.outboundNonce(chainIdPl1);

        const inboundOf2InPl1 = await endpoint1.inboundNonce(chainIdPl2);
        const outboundOf2InPl1 = await endpoint1.outboundNonce(chainIdPl2);

        console.log(`Inbound of PL ${taskArgs.pl1} on PL ${taskArgs.pl2}: ${inboundOf1InPl2}`);
        console.log(`Outbound of PL ${taskArgs.pl2} on PL ${taskArgs.pl1}: ${outboundOf2InPl1}`);
        console.log(`Sucess: ${inboundOf1InPl2 == outboundOf2InPl1}`)
        console.log("\n")
        console.log(`Inbound of PL ${taskArgs.pl2} on PL ${taskArgs.pl1}: ${inboundOf2InPl1}`);
        console.log(`Outbound of PL ${taskArgs.pl1} on PL ${taskArgs.pl2}: ${outboundOf1InPl2}`);
        console.log(`Sucess: ${inboundOf2InPl1 == outboundOf1InPl2}`)

    });