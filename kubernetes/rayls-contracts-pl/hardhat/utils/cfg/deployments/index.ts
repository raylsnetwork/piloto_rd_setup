import fs from 'fs/promises';
import {
  type DeploymentConfig,
  validateDeploymentCfg,
  validateDuplicateTokenNamesPerPl
} from './schema';
import { Logger } from '../../../cli/utils';

export { DeploymentConfig };

export async function loadDeploymentsConfig(
  configPath: string,
  suppressWarning = false
): Promise<DeploymentConfig> {
  const configStr = (
    await fs.readFile(configPath).catch((_) => null)
  )?.toString();

  if (!configStr) {
    throw new Error('Deployments Config file not found');
  }

  const config = JSON.parse(configStr) as DeploymentConfig;

  const result = validateDeploymentCfg(config);

  if (!result) {
    if (!suppressWarning) Logger.error(validateDeploymentCfg.errors);
    throw new Error('Invalid Deployment config');
  }

  validateDuplicateTokenNamesPerPl(config);

  return config;
}

export async function setDeploymentsConfig(
  deploymentsConfigPath: string,
  deploymentsConfig: DeploymentConfig
) {
  try {
    const result = validateDeploymentCfg(deploymentsConfig);

    if (!result) {
      Logger.error(validateDeploymentCfg.errors);
      throw new Error('Invalid Deployment config');
    }
  } catch (error) {
    const message = (error as Error)?.message || 'Unknown';

    throw new Error(
      `Aborting save due to invalid deployments config. "${message}"`
    );
  }

  validateDuplicateTokenNamesPerPl(deploymentsConfig);

  await fs.writeFile(
    deploymentsConfigPath,
    JSON.stringify(deploymentsConfig, null, 2) || ''
  );
}
