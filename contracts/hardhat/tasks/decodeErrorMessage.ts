import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";

task("decodeErrorMessage", "Decodes error messages in hex format")
    .addParam("hex", "The hex string")
    .setAction(async (taskArgs, hre) => {
        const decodedError = hre.ethers.AbiCoder.defaultAbiCoder().decode(['string'], hre.ethers.dataSlice(taskArgs.hex, 4));
        console.log(`Decoded Error: ${decodedError}`);
    });