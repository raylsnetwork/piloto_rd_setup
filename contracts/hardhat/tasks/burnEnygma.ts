import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getEnygmaBySymbol, getTokenBySymbol } from './checkTokenAllChains';

task('burnEnygma', 'Burn Enygma token')
  .addParam(
    'pl',
    'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)'
  )
  .addParam('symbol', 'symbol')
  .addParam('from', 'address')
  .addParam('amount', 'amount')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();
    const token = await getEnygmaBySymbol(hre, taskArgs.pl, taskArgs.symbol);
    const tx = await token.burn(taskArgs.from, taskArgs.amount);
    console.log(`Burning token ${taskArgs.symbol} from address ${taskArgs.from}`);
    await tx.wait();
    spinner.stop();
  });
