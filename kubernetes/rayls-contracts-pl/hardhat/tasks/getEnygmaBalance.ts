import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";
import { getEnygmaBySymbol, getTokenBySymbol } from "./checkTokenAllChains";

task("getEnygmaBalance", "Get the balance for Enygma in a PL")
    .addParam("symbol", "The token symbol")   
    .addParam("pl", "The destination PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("address", "The destination Address")    
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Getting infos... 🔎");
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
        if (!rpcUrl) throw new Error(`Missing RPC URL for PL ${taskArgs.pl}.`);
  
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = wallet.connect(provider);
        spinner.start();
        


        const token = await getEnygmaBySymbol(hre, taskArgs.pl, taskArgs.symbol);
        const balance = await token.connect(signer).balanceOf(taskArgs.address as string);        
        
        spinner.stop();
        
        console.log(`balance: ${balance}`);
    });