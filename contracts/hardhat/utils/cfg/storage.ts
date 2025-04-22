import path from 'path';
import { loadConfig } from './config';
import { loadDeploymentsConfig, setDeploymentsConfig } from './deployments';
import { DeploymentConfig } from './deployments/schema';
import { Config } from './config/schema';
import { Logger } from '../../cli/utils';

export type ConfigStorage = {
  env: string;
  config: Config;
  deploymentsConfig: DeploymentConfig | null;
  getLatestDeploymentConfig: () => Promise<DeploymentConfig | null>;
  setDeploymentsConfig: (deploymentsConfig: DeploymentConfig) => Promise<void>;
};

export async function loadConfigStorage(
  rawPath: string,
  suppressWarning = false
): Promise<ConfigStorage> {
  const { configPath, deploymentsConfigPath, env } = parseConfigPaths(rawPath);

  const loadDeployments = () =>
    loadDeploymentsConfig(deploymentsConfigPath, suppressWarning).catch(
      (err) => {
        if (!suppressWarning) Logger.warn(err?.message);

        return null;
      }
    );

  const [config, deploymentsConfig] = await Promise.all([
    loadConfig(configPath, suppressWarning),
    loadDeployments()
  ]);

  const getLatestDeploymentConfig = () => {
    Logger.debug(`Reloading deployments config from env "${env}"...`);

    const latestDeploymentsConfig = loadDeployments();

    if (!latestDeploymentsConfig) return deploymentsConfig;

    return latestDeploymentsConfig;
  };

  return {
    env,
    config,
    deploymentsConfig,
    getLatestDeploymentConfig,
    setDeploymentsConfig: (deploymentsConfig: DeploymentConfig) => {
      Logger.info(`Saving deployments config in env "${env}"...`);

      return setDeploymentsConfig(
        deploymentsConfigPath,
        sortObjectByPrimitives(deploymentsConfig)
      );
    }
  };
}

function sortObjectByPrimitives<T extends Record<string, unknown>>(obj: T): T {
  function sorter<T = unknown>(val: T): T {
    if (typeof val === 'object' && val !== null) {
      if (Array.isArray(val)) {
        return val.map(sorter) as T;
      }
      const keys = Object.keys(val).sort();

      return keys.reduce((acc, key) => {
        // @ts-expect-error: Its okay to use val[key] as T
        acc[key] = sorter(val[key]);

        return acc;
      }, {} as T);
    }

    return val;
  }

  return sorter(obj);
}

export function parseConfigPaths(configPath: string) {
  const parsedPath = path.resolve(configPath);

  const filename = path.basename(parsedPath);

  if (!/config\.\w+\.json/.test(filename)) {
    throw new Error(
      `Invalid file extension. 
Should respect the pattern: config.[env].json. Got ${filename}`
    );
  }

  const filenameParts = filename.split('.');

  return {
    env: filenameParts[filenameParts.length - 2],
    configPath: parsedPath,
    deploymentsConfigPath: path.join(
      path.dirname(parsedPath),
      filename.replace(`config`, 'deployments')
    )
  };
}
