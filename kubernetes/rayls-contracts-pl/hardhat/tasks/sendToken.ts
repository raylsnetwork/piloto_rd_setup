import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";
import { getTokenBySymbol } from "./checkTokenAllChains";

task("sendToken", "Sends a token from one private ledger to the other one")
    .addParam("token", "The token symbol")
    .addParam("plOrigin", "The origin PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("plDest", "The destination PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addParam("destinationAddress", "The destination Address")
    .addParam("amount", "The amount to be transfered")
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Sending transaction...");
        spinner.start();
        const destinationChainId = process.env[`NODE_${taskArgs.plDest}_CHAIN_ID`] as string;

        const token = await getTokenBySymbol(hre, taskArgs.plOrigin, taskArgs.token);
        const tx = await token.teleportAtomic(taskArgs.destinationAddress as string, taskArgs.amount, destinationChainId);        
        
        let receipt = await tx.wait(2);
        if (receipt?.status === 0) {
          let err = `The token "${token.name}" (${token.symbol}) failed to be approved`;
          throw new Error(err);
        }

        spinner.stop();
        console.log(`Transaction pushed on ${taskArgs.plOrigin}'s PL`);
        console.log(`Hash: ${tx.hash}`);
    });