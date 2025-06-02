import { run, subcommands } from 'cmd-ts';
import { operatorCli } from '../operator';
import { ledgerCli } from '../ledger';
import { configCli } from '../config';

export const cli = subcommands({
  name: 'dev',
  description: 'Operator CLI for interacting with Ven',
  cmds: {
    config: configCli,
    subnet: operatorCli,
    ledger: ledgerCli({ isDev: true })
  }
});

run(cli, process.argv.slice(2)).then(() => {
  process.exit(0);
});
