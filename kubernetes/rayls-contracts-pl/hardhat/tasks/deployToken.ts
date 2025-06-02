import { task } from "hardhat/config";
import { ethers } from "hardhat";
import { Spinner } from "../utils/spinner";
import { Logger, LogLevel } from "../test/unit/utils/moca-logger";

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

const logger = new Logger();
const logLevel = Number(process.env['TEST_LOGGING_LEVEL'] || LogLevel.INFO);
logger.setLogLevel(logLevel);

task("deployToken", "Deploys token on the PL")
    .addParam("pl", "The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)")
    .addOptionalParam("name", "Token Name")
    .addOptionalParam("symbol", "symbol")
    .setAction(async (taskArgs, hre) => {
        await hre.run("compile");
        const spinner: Spinner = new Spinner();
        logger.debug(`Deploying token on ${taskArgs.pl}...`);
        spinner.start();
        const randString = genRanHex(6);
        taskArgs.name = taskArgs.name || `Token ${randString}`
        taskArgs.symbol = taskArgs.symbol || `T_${randString}`
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = new hre.ethers.NonceManager(wallet.connect(provider));

        const token = await hre.ethers.getContractFactory("TokenExample", signer);

        const tokenPL = await token.connect(signer).deploy(taskArgs.name, taskArgs.symbol, process.env[`NODE_${taskArgs.pl}_ENDPOINT_ADDRESS`] as string, { gasLimit: 5000000 });
        spinner.stop();
        await tokenPL.waitForDeployment();
        logger.info(`Token Deployed At Address ${await tokenPL.getAddress()}`);
        logger.debug(`Token Deployer Address: ${wallet.address}`);
        // The storage slot for ERC20 is 2
        await tokenPL.submitTokenRegistration(2);
        logger.debug(`Token Registration Submitted, wait until relayer retrieves the generated resource`);
        logger.debug("");
        logger.debug("To check if it's registered, please use the following command:");
        logger.debug(`\$ npx hardhat checkTokenResourceId --pl ${taskArgs.pl} --token-address ${await tokenPL.getAddress()}`)

    });