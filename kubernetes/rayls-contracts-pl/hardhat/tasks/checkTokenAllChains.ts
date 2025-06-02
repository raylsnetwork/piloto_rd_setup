import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { EnygmaTokenExample, TokenExample } from "../../typechain-types";
import { Spinner } from "../utils/spinner";

task("checkTokenAllChains", "Checks the token in all chains")
    .addParam("pls", `The PL's separated by comma (example: "A,B")`)
    .addParam("token", "The token symbol")
    .addOptionalParam("addressToCheck", "The Address to be checked")
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Checking resource...");
        spinner.start();
        const pls = taskArgs.pls.split(',');
        for (let pl of pls) {
            const token = await getTokenBySymbol(hre, pl, taskArgs.token);
            const tokenAddress = await token.getAddress();
            spinner.stop();
            if (tokenAddress == "0x0000000000000000000000000000000000000000") {
                console.log(`Token not implemented on PL ${pl}`);
                continue;
            }

            console.log(`Found Implemented on PL ${pl} at Address ${tokenAddress}`);
            if (taskArgs.addressToCheck)
                console.log(`  Balance of ${taskArgs.addressToCheck} on ${pl}: ${await token.balanceOf(taskArgs.addressToCheck)}`);
        }
    });

export async function getTokenBySymbol(hre: HardhatRuntimeEnvironment, pl: string, tokenSymbol: string): Promise<TokenExample> {
    const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);
    const resourceId = process.env[`TOKEN_${tokenSymbol}_RESOURCE_ID`] as string;

    const endpoint = await hre.ethers.getContractAt("EndpointV1", process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string, signer);

    const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);

    const token = await hre.ethers.getContractAt("TokenExample", tokenAddress, signer);

    const [owner] = await hre.ethers.getSigners();

    return token;
}

export async function getEnygmaBySymbol(hre: HardhatRuntimeEnvironment, pl: string, tokenSymbol: string): Promise<EnygmaTokenExample> {
    const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    
    const signer = wallet.connect(provider);
    
    const resourceId = process.env[`TOKEN_${tokenSymbol}_RESOURCE_ID`] as string;
    
    const endpoint = await hre.ethers.getContractAt("EndpointV1", process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string, signer);
    
    const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);       

    const token = await hre.ethers.getContractAt("EnygmaTokenExample", tokenAddress, signer);   

    return token;
}