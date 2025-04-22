import { task } from "hardhat/config";
import { Spinner } from "../../utils/spinner";

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');


task("deployErc20BatchToken", "Deploys token on the PL")
    .addParam("pl", "The privacy ledger identification e.g. A, B, ...")
    .addParam("name", "Token Name")
    .addParam("symbol", "symbol")
    .setAction(async (taskArgs, hre) => {

    await hre.run("compile");
    const spinner: Spinner = new Spinner();
    console.log(`Deploying token on ${taskArgs.pl}...`);
    spinner.start();

    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = new hre.ethers.NonceManager(wallet.connect(provider));

    console.log(`Owner address ${await signer.getAddress()}`);

    const token = await hre.ethers.getContractFactory("Erc20BatchTeleport", signer);
    const tokenName = taskArgs.name;
    const tokenSymbol = taskArgs.symbol;
    const endpointAddress = process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string;

    const tokenPL = await token.connect(signer).deploy(tokenName, tokenSymbol, endpointAddress, { gasLimit: 5000000 });
    await tokenPL.waitForDeployment();

    spinner.stop();

    console.log(`Token deployed at address ${await tokenPL.getAddress()}`);
    await tokenPL.submitTokenRegistration(0);
    console.log(`Token registration submitted, don't forget to approve the token`);
    console.log("");
    });