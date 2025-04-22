import { JTDDataType, ajvHelper } from '../types/ajvTypes';
import Ajv from 'ajv';
import { TokenTypes } from '../types/_contracts';

/**
 * Schemas
 */

const tokensSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: TokenTypes },
      address: { type: 'string' },
      name: { type: 'string' }
    },
    optionalProperties: {
      resourceId: { type: 'string' }
    }
  }
} as const;

const plSchema = {
  type: 'object',
  optionalProperties: {
    SignatureStorage: { type: 'string' }
  },
  properties: {
    Endpoint: { type: 'string' },

    tokens: tokensSchema
  }
} as const;

const CommitChainSchema = {
  type: 'object',
  optionalProperties: {},
  properties: {
    Endpoint: { type: 'string' },
    Teleport: { type: 'string' },
    ParticipantStorage: { type: 'string' },
    ResourceRegistry: { type: 'string' },
    TokenRegistry: { type: 'string' }
  }
} as const;

const deploymentCfgSchema = {
  type: 'object',

  properties: {
    CommitChain: CommitChainSchema,
    PLs: {
      type: 'object',

      patternProperties: {
        '.*': plSchema
      }
    }
  }
} as const;

/**
 * Validation init
 */

// Omit workaround due to type inference using "patternProperties"
export type DeploymentConfig = Omit<
  JTDDataType<typeof deploymentCfgSchema>,
  'PLs'
> & { PLs: Record<string, JTDDataType<typeof plSchema>> };

export const validateDeploymentCfg = new Ajv().compile<DeploymentConfig>(
  ajvHelper(deploymentCfgSchema)
);

/**
 * Util Functions
 */

export const validateDuplicateTokenNamesPerPl = (config: DeploymentConfig) => {
  Object.entries(config.PLs).forEach(([plName, pl]) => {
    const tokenNames = new Set(pl.tokens.map((t) => t.name));

    if (tokenNames.size !== pl.tokens.length) {
      throw new Error(
        `Duplicated token names found in PL "${plName}" deployments config!`
      );
    }
  });
};
