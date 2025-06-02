import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";

task("checkBlockchainTime", "Checks the blockchain time in order to analyze performance")
    .addParam("pls", "The PL (ex: A, B, C, D, BACEN, TREASURY)")
    .addOptionalParam("env", "The Env (ex: dev, qa, sandbox)")
    .setAction(async (taskArgs, hre) => {
        const spinner: Spinner = new Spinner();
        console.log("Analyzing pls...");
        const pls = (taskArgs.pls as string).split(",");
        
        for(let pl of pls){
            console.log(`\nPL ${pl}`);
            spinner.start();
            let rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
            if(taskArgs.env){
                rpcUrl = rpcUrl?.replace("-dev", "-" + taskArgs.env).replace("-qa", "-" + taskArgs.env).replace("-sandbox", "-" + taskArgs.env)
            }
            const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
            provider.pollingInterval = 200;
            const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
            const signer = new hre.ethers.NonceManager(wallet.connect(provider));
            const Erc20 = await hre.ethers.getContractFactory("SimpleErc20", signer);

            const samples = 10;
            let avgDeployPushTime = 0;
            let avgDeployPushMintTime = 0;

            
            let avgTxPushTime = 0;
            let avgTxPushMintTime = 0;

            for(let i=0; i< samples;i++){
                console.log(i);
                // Deploy
                const deployPushTimeStart = performance.now();
                const deployPushMintTimeStart = performance.now();
                const erc20 = await Erc20.deploy();
                const deployPushTimeEnd = performance.now();
                
                await erc20.waitForDeployment();
                const deployPushMintTimeEnd = performance.now();
                avgDeployPushTime += (deployPushTimeEnd - deployPushTimeStart)/samples;
                avgDeployPushMintTime += (deployPushMintTimeEnd - deployPushMintTimeStart)/samples;
                console.log("Deployed!");
                // Tx
                const txPushTimeStart = performance.now();
                const txPushMintTimeStart = performance.now();
                const tx = await erc20.transfer("0x0000000000000000000000000000000000000001", 10);
                const txPushTimeEnd = performance.now();
                
                await tx.wait();
                console.log("Pushed tx!");
                const txPushMintTimeEnd = performance.now();
                avgTxPushTime += (txPushTimeEnd - txPushTimeStart)/samples;
                avgTxPushMintTime += (txPushMintTimeEnd - txPushMintTimeStart)/samples;

            }
            
            spinner.stop();
            
            console.log(`- Deploy avg over ${samples} samples (push)       : ${avgDeployPushTime/1000}s`);
            console.log(`- Deploy avg over ${samples} samples (push & mint): ${avgDeployPushMintTime/1000}s`);
            console.log(`- Tx avg over ${samples} samples (push)       : ${avgTxPushTime/1000}s`);
            console.log(`- Tx avg over ${samples} samples (push & mint): ${avgTxPushMintTime/1000}s`);

        }

    });