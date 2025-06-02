import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";
import { getTokenBySymbol } from "./checkTokenAllChains";

task("getTokenBalance", "Sends a token from one private ledger to the other one")
    .addParam("token", "The token symbol")   
    .addParam("pl", "The destination PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("address", "The destination Address")    
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Getting infos... 🔎");
        spinner.start();
        const destinationChainId = process.env[`NODE_${taskArgs.pl}_CHAIN_ID`] as string;

        const token = await getTokenBySymbol(hre, taskArgs.pl, taskArgs.token);
        const balance = await token.balanceOf(taskArgs.address as string);        
        
        spinner.stop();
        
        console.log(`balance: ${balance}`);
    });