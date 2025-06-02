import { task } from 'hardhat/config';

task('protocol-testing:malicious-bytecode', 'Mint ERC20 token')
  .addParam('pl', 'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)')
  .setAction(async (taskArgs, hre) => {
    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);
    const tokenAddress = '0xDF91DEa79b08F207cf45A7FAc0A66b21B7c7a971';
    const token = await hre.ethers.getContractAt('TokenExample', tokenAddress, signer);

    // Steps:
    // deploy a token which contains malicious code on A
    // send some amount to B in order for the bytecode to be deployed
    // call the malicious function - this function may contain an infinite loop etc

    const mintTx = await token.mintToAttacker('0xf9260c378ea6e428a79eafe443bd24ea09af8bc9');
    console.log(await mintTx.wait());
  });
