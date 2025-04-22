import hardhat from 'hardhat';
import fs from 'fs';
import path from 'path';

const ContractsPath = './hardhat/utils/cfg/types/_contracts.ts';

const hardHatRelativePath = path.relative(path.dirname(ContractsPath), './typechain-types');

async function saveTokenTypes() {
  const contractPaths = await hardhat.artifacts.getAllFullyQualifiedNames();

  const contracts = contractPaths.flatMap((path) => {
    const isOpenZeppelin =
      path.startsWith('@openzeppelin') && !path.includes('utils');

    const isProjectContract = path.startsWith('src');

    if (!isOpenZeppelin && !isProjectContract) return [];

    const contractName = path.match(/(\\|\/)(\w+).sol:(.*)/)?.[3];

    if (!contractName) return [];
    return contractName;
  });

  const parsedContracts = [...new Set(contracts)];

  const dataStr = `//@ts-nocheck
import * as TypeChainTypes from '${hardHatRelativePath}';

export type TokenContractTypes = keyof TokenContracts;

export type TokenContracts = {
${parsedContracts
  .map(
    (c) => `  ${c}: {
    contract: TypeChainTypes.${c},
    factory: TypeChainTypes.${c}__factory
}`,
  )
  .join(',\n')}
}
  
export const TokenTypes = ${JSON.stringify(parsedContracts, null, 2)} as const;
  
export type ContractResolver<T> = T extends TokenContractTypes
  ? TokenContracts[T]['contract']
  : never;

export type ContractFactoryResolver<T> = T extends TokenContractTypes
  ? TokenContracts[T]['factory']
  : never;
`;

  fs.writeFileSync(path.resolve(ContractsPath), dataStr);
}

saveTokenTypes().catch((err) => {
  console.error(err);
  throw new Error('Error saving token types!');
});
