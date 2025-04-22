import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getTokenBySymbol } from './checkTokenAllChains';

task('mintERC20', 'Mint ERC20 token')
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
    const token = await getTokenBySymbol(hre, taskArgs.pl, taskArgs.symbol);
    const tx = await token.mint(taskArgs.to, taskArgs.amount);
    console.log(`Minting token ${taskArgs.symbol} to address ${taskArgs.to}`);
    await tx.wait();
    spinner.stop();
  });
