import { types } from 'hardhat/config';

export function enumToList(enumObj: Record<number, string>) {
  return Object.entries(enumObj)
    .flatMap(([key, val]) =>
      Number.isNaN(Number(key)) ? [] : `${key} => ${val}`,
    )
    .join(', ');
}

export const envParamArgs = [
  'env',
  'Specify the env to run against, inferring its config.',
  'local',
  types.string,
] as const;

export const plParamArgs = [
  'pl',
  'The Pl identification (ex: A, B, C, D, BACEN, TREASURY)',
  undefined,
  types.string,
] as const;

export const tokenParamArgs = [
  'token',
  'The token name',
  undefined,
  types.string,
] as const;
