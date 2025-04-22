import { run } from 'cmd-ts';
import { operatorCli } from '../operator';

run(operatorCli, process.argv.slice(2)).then(() => {
  process.exit(0);
});
