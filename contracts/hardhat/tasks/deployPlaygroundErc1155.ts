import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');


task("deployPlaygroundErc1155", "Deploys Playground Erc1155 on the PL")
    .addParam("pl", "The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)")
    .addOptionalParam("uri", "uri")
    .addOptionalParam("name", "name")
    .setAction(async (taskArgs, hre) => {
        await hre.run("compile");
        const spinner: Spinner = new Spinner();
        console.log(`Deploying token on ${taskArgs.pl}...`);
        spinner.start();
        const randString = genRanHex(6);
        taskArgs.uri = taskArgs.uri || `${randString}`
        taskArgs.name = taskArgs.name || `Playground Erc1155 ${randString}`
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = new hre.ethers.NonceManager(wallet.connect(provider));

        const token = await hre.ethers.getContractFactory("PlaygroundErc1155", signer);

        const tokenPL = await token.connect(signer).deploy(taskArgs.uri, taskArgs.name, process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string, { gasLimit: 5000000 });
        spinner.stop();

        let tx = await tokenPL.mint(wallet.address, 0, 100, "0x", { gasLimit: 5000000 });
        await tx.wait();
        console.log(`Minted token with id 0, balance 100 to ${wallet.address}`);

        console.log(`Token Deployed At Address ${await tokenPL.getAddress()}`);
        await tokenPL.submitTokenRegistration(2);
        console.log(`Token Registration Submitted, wait until relayer retrieves the generated resource`);
        console.log("");
        console.log("To check if it's registered, please use the following command:");
        console.log(`\$ npx hardhat checkTokenResourceId --pl ${taskArgs.pl} --token-address ${await tokenPL.getAddress()}`)

    });