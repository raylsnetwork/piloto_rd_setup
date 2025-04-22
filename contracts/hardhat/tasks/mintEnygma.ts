import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getEnygmaBySymbol, getTokenBySymbol } from './checkTokenAllChains';

task('mintEnygma', 'Mint Enygma token')
  .addParam(
    'pl',
    'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)'
  )
  .addParam('symbol', 'symbol')
  .addParam('to', 'amount')
  .addParam('amount', 'amount')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();
    // const signer = await hre.ethers.getSigners();
    // console.log("🚀 ~ .setAction ~ signer:", signer)
    

    const token = await getEnygmaBySymbol(hre, taskArgs.pl, taskArgs.symbol);
    const tx = await token.mint(taskArgs.to, taskArgs.amount);
    console.log(`Minting token ${taskArgs.symbol} to address ${taskArgs.to}`);
    await tx.wait();
    spinner.stop();
  });
