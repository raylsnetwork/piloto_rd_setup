import hre from 'hardhat';
import { Config } from '../../utils/cfg/config';
import { DeploymentConfig } from '../../utils/cfg/deployments';

export function getSafeEnvs<T extends string, B = false>(
  envs: T[],
  suppressThrow?: B
): B extends true ? Record<T, string | undefined> : Record<T, string> {
  const missingEnvs: T[] = [];

  const parsedEnvs = envs.reduce(
    (acc, env) => {
      const value = process.env[env];

      if (!value) {
        missingEnvs.push(env);
      }

      return { ...acc, [env]: value };
    },
    {} as Record<T, string>
  );

  if (missingEnvs.length && !suppressThrow) {
    throw new Error(`Missing envs: ${missingEnvs.join(', ')}`);
  }

  return parsedEnvs;
}

export function getConfigFromEnv(): Config {
  const envs = {
    ...getSafeEnvs([
      'PRIVATE_KEY_SYSTEM',
      'RPC_URL_NODE_CC',
      'RPC_URL_NODE_A',
      'NODE_CC_CHAIN_ID',
      'NODE_A_CHAIN_ID'
    ]),
    ...getSafeEnvs(
      [
        'DH_PUBLIC',
        'RPC_URL_NODE_B',
        'RPC_URL_NODE_C',
        'RPC_URL_NODE_D',
        'RPC_URL_NODE_BACEN',
        'RPC_URL_NODE_TREASURY',
        'NODE_B_CHAIN_ID',
        'NODE_C_CHAIN_ID',
        'NODE_D_CHAIN_ID',
        'NODE_BACEN_CHAIN_ID',
        'NODE_TREASURY_CHAIN_ID'
      ],
      true
    )
  };

  const Pls: Config['PLs'] = [];

  if (envs.NODE_A_CHAIN_ID) {
    Pls.push({
      id: 'A',
      chainId: parseInt(envs.NODE_A_CHAIN_ID),
      url: envs.RPC_URL_NODE_A,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  if (envs.NODE_B_CHAIN_ID && envs.RPC_URL_NODE_B) {
    Pls.push({
      id: 'B',
      chainId: parseInt(envs.NODE_B_CHAIN_ID),
      url: envs.RPC_URL_NODE_B,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  if (envs.NODE_C_CHAIN_ID && envs.RPC_URL_NODE_C) {
    Pls.push({
      id: 'C',
      chainId: parseInt(envs.NODE_C_CHAIN_ID),
      url: envs.RPC_URL_NODE_C,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  if (envs.NODE_D_CHAIN_ID && envs.RPC_URL_NODE_D) {
    Pls.push({
      id: 'D',
      chainId: parseInt(envs.NODE_D_CHAIN_ID),
      url: envs.RPC_URL_NODE_D,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  if (envs.NODE_BACEN_CHAIN_ID && envs.RPC_URL_NODE_BACEN) {
    Pls.push({
      id: 'BACEN',
      chainId: parseInt(envs.NODE_BACEN_CHAIN_ID),
      url: envs.RPC_URL_NODE_BACEN,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  if (envs.NODE_TREASURY_CHAIN_ID && envs.RPC_URL_NODE_TREASURY) {
    Pls.push({
      id: 'TREASURY',
      chainId: parseInt(envs.NODE_TREASURY_CHAIN_ID),
      url: envs.RPC_URL_NODE_TREASURY,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    });
  }

  return {
    CommitChain: {
      chainId: parseInt(envs.NODE_CC_CHAIN_ID),
      url: envs.RPC_URL_NODE_CC,
      dhPublic: envs.DH_PUBLIC,
      accounts: [envs.PRIVATE_KEY_SYSTEM]
    },
    PLs: Pls
  };
}

export async function getDeploymentsConfigFromEnv(): Promise<DeploymentConfig> {
  const envs = {
    ...getSafeEnvs(
      [
        'NODE_A_ENDPOINT_ADDRESS',
        'NODE_B_ENDPOINT_ADDRESS',
        'NODE_C_ENDPOINT_ADDRESS',
        'NODE_D_ENDPOINT_ADDRESS',
        'NODE_BACEN_ENDPOINT_ADDRESS',
        'NODE_TREASURY_ENDPOINT_ADDRESS',
        'COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY'
      ],
      true
    )
  };

  const PLs: DeploymentConfig['PLs'] = {};

  if (envs.NODE_A_ENDPOINT_ADDRESS) {
    PLs.A = {
      Endpoint: envs.NODE_A_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  if (envs.NODE_B_ENDPOINT_ADDRESS) {
    PLs.B = {
      Endpoint: envs.NODE_B_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  if (envs.NODE_C_ENDPOINT_ADDRESS) {
    PLs.C = {
      Endpoint: envs.NODE_C_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  if (envs.NODE_D_ENDPOINT_ADDRESS) {
    PLs.D = {
      Endpoint: envs.NODE_D_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  if (envs.NODE_BACEN_ENDPOINT_ADDRESS) {
    PLs.BACEN = {
      Endpoint: envs.NODE_BACEN_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  if (envs.NODE_TREASURY_ENDPOINT_ADDRESS) {
    PLs.TREASURY = {
      Endpoint: envs.NODE_TREASURY_ENDPOINT_ADDRESS,
      tokens: []
    };
  }

  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  return {
    CommitChain: {
      Endpoint: deployment.endpointAddress,
      ParticipantStorage: deployment.participantStorageAddress,
      ResourceRegistry: deployment.resourceRegistryAddress,
      Teleport: deployment.teleportAddress,
      TokenRegistry: deployment.tokenRegistryAddress
    },
    PLs
  };
}
