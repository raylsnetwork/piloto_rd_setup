import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getTokenBySymbol } from './checkTokenAllChains';

task('burnERC20', 'Burn ERC20 token')
  .addParam(
    'pl',
    'The private Ledger identification (ex: A, B, C, D, BACEN, TREASURY)'
  )
  .addParam('symbol', 'symbol')
  .addParam('from', 'amount')
  .addParam('amount', 'amount')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();
    const token = await getTokenBySymbol(hre, taskArgs.pl, taskArgs.symbol);
    const tx = await token.burn(taskArgs.from, taskArgs.amount);
    console.log(
      `Burning token ${taskArgs.symbol} from address ${taskArgs.from}`
    );
    await tx.wait();
    spinner.stop();
  });
