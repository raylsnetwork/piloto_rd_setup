import { subcommands } from 'cmd-ts';
import * as ERC20 from './erc20';
import * as ERC721 from './erc721';
import * as ERC1155 from './erc1155';
import { utilsCli } from './utils';
import { CliOptions } from '../cli/types';

/**
 * Token implementations mapped to their CLI commands
 */
const TOKEN_IMPLEMENTATIONS = {
  erc20: ERC20,
  erc721: ERC721,
  erc1155: ERC1155
} as const;

/**
 * Creates the CLI commands for a given token implementation
 *
 * To maintain a clean CLI, we use this function to create a common set of
 * commands for each token implementation
 */
const createCommands = <O extends CliOptions>(
  tokenType: keyof typeof TOKEN_IMPLEMENTATIONS,
  options: O
) => {
  const { isDev } = options;
  const ErcLib = TOKEN_IMPLEMENTATIONS[tokenType];

  const baseCommands = {
    deploy: ErcLib.deployCommand,
    submit: ErcLib.submitCommand,
    mint: ErcLib.mintCommand,
    burn: ErcLib.burnCommand,
    metadata: ErcLib.metadataCommand,
    balance: ErcLib.balanceCommand,
    transfer: ErcLib.transferCommand,
    teleportAtomic: ErcLib.teleportAtomicCommand
  } as const;

  if (!isDev) return baseCommands;

  const devCommands = {
    balances: ErcLib.balancesCommand
  };

  return { ...baseCommands, ...devCommands };
};

/**
 * Creates the CLI for the Ledger
 */
//TODO change isDev default to false
export const ledgerCli = (options: CliOptions = { isDev: true }) => {
  const commands = Object.fromEntries(
    Object.keys(TOKEN_IMPLEMENTATIONS).map((type) => [
      type,
      subcommands({
        name: type,
        description: `Rayls ${type.toUpperCase()} Token Commands`,
        cmds: createCommands(
          type as unknown as keyof typeof TOKEN_IMPLEMENTATIONS,
          options
        )
      })
    ])
  );

  return subcommands({
    name: 'ledger',
    description: 'Ledger CLI for interacting with the PL',
    cmds: {
      ...commands,
      utils: utilsCli
    }
  });
};
