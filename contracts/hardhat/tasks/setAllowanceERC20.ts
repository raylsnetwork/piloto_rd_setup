import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getTokenBySymbol } from './checkTokenAllChains';

task('setAllowanceERC20', 'Set allowance to a spender on a ERC-20 token')
  .addParam(
    'pl',
    'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)'
  )
  .addParam('symbol', 'The ERC-20 token symbol')
  .addParam('to', 'The spender address')
  .addParam('amount', 'The amount of allowance to grant')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();
    const token = await getTokenBySymbol(hre, taskArgs.pl, taskArgs.symbol);
    const tx = await token.approve(taskArgs.to, taskArgs.amount);
    await tx.wait();
    console.log(`Set allowance of ${taskArgs.amount} in token ${taskArgs.symbol} to spender ${taskArgs.to}`);
    spinner.stop();
  });
