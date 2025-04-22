import { TokenRegistry } from '../../../typechain-types';

export function tokenRegistryEventLogs(tokenRegistry: TokenRegistry) {
  if (!process.env.DEBUG) return;
  const events = ['Erc20TokenRegistered', 'Erc721TokenRegistered', 'Erc1155TokenRegistered', 'TokenBalanceUpdated'] as const;

  events.forEach((e) => {
    tokenRegistry.on(tokenRegistry.getEvent(e as 'TokenStatusUpdated'), (...args: any[]) => {
      let data: string;

      if (e === 'TokenBalanceUpdated') {
        const [resourceId, chainId, updateType, payload] = args.slice(0, -1);
        const parsedUpdateType = updateType === 0n ? 'Burn' : 'Mint';
        const [amount, ercId] = payload;

        data = `(${chainId}) - ${resourceId} - ${parsedUpdateType}: (ID: ${ercId}) ${amount}`;
      } else {
        const [resourceId, issuerChainId, blockNum, name, initialSupply] = args.slice(0, -1);

        const parsedInitialSupply = Array.isArray(initialSupply) ? initialSupply.map((x) => (Array.isArray(x) ? `(Id:${x[0]}) ${x[1]}` : x)).join(', ') : initialSupply;

        data = `(${issuerChainId}) - ${resourceId} - "${name}" : ${parsedInitialSupply}`;
      }

      console.log(`TokenRegistry(${e}): \n${data}\n`);
    });
  });
  console.log('Watchers registered');
}
