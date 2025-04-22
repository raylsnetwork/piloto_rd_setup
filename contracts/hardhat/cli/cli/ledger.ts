import { run } from 'cmd-ts';
import { ledgerCli } from '../ledger/index';

run(ledgerCli(), process.argv.slice(2)).then(() => {
  process.exit(0);
});
