import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');


task("deployEnygma", "Deploys Enygma on the PL")
    .addParam("pl", "The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)")
    .addOptionalParam("name", "Token Name")
    .addOptionalParam("symbol", "symbol")    
    .setAction(async (taskArgs, hre) => {
        await hre.run("compile");
        const spinner: Spinner = new Spinner();
        console.log(`Deploying token on ${taskArgs.pl}...`);
        spinner.start();
        const randString = genRanHex(6);
        taskArgs.name = taskArgs.name || `Token ${randString}`
        taskArgs.symbol = taskArgs.symbol || `T_${randString}`
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        
        const signer = new hre.ethers.NonceManager(wallet.connect(provider));

        const token = await hre.ethers.getContractFactory("EnygmaTokenExample", signer);        

        const tokenPL = await token.connect(signer).deploy(taskArgs.name, taskArgs.symbol, process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string, { gasLimit: 5000000 });
        const realTokenPl = await tokenPL.waitForDeployment()
        spinner.stop();
        
        console.log(`Token Deployed At Address ${await realTokenPl.getAddress()}`);
        await realTokenPl.submitTokenRegistration(0);
        console.log(`Token Registration Submitted, wait until relayer retrieves the generated resource`);
        console.log("");
        console.log("To check if it's registered, please use the following command:");
        console.log(`\$ npx hardhat checkEnygmaResourceId --pl ${taskArgs.pl} --token-address ${await realTokenPl.getAddress()}`)

    });