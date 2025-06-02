import Ajv from 'ajv';
import { JTDDataType, ajvHelper } from '../types/ajvTypes';

/**
 * Schemas
 */

const CommitChainSchema = {
  type: 'object',

  properties: {
    chainId: { type: 'number' },
    url: { type: 'string' },
    accounts: { type: 'array', items: { type: 'string' } }
  },

  optionalProperties: {
    dhPublic: { type: 'string' }
  }
} as const;

const PlSchema = {
  type: 'object',

  properties: {
    id: { type: 'string' },
    chainId: { type: 'number' },
    url: { type: 'string' },
    accounts: { type: 'array', items: { type: 'string' } }
  }
} as const;

const cfgSchema = {
  type: 'object',

  properties: {
    CommitChain: CommitChainSchema,
    PLs: {
      type: 'array',
      items: PlSchema
    }
  }
} as const;

/**
 * Validation init
 */

export type Config = JTDDataType<typeof cfgSchema>;

export const validateCfg = new Ajv().compile(ajvHelper(cfgSchema));
