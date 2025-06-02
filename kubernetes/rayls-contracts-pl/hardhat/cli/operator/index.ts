import { subcommands } from 'cmd-ts';
import { participantsCli } from './participantStorage';
import { tokensCli } from './tokenRegistry';

export const operatorCli = subcommands({
  name: 'operator',
  description: 'Operator CLI for interacting with CommitChain',
  cmds: {
    participants: participantsCli,
    tokens: tokensCli
  }
});
