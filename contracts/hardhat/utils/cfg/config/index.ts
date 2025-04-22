import fs from 'fs/promises';
import { type Config, validateCfg } from './schema';
import { Logger } from '../../../cli/utils';

export { Config };

export async function loadConfig(
  configPath: string,
  suppressWarning = false
): Promise<Config> {
  const configStr = (
    await fs.readFile(configPath).catch((_) => null)
  )?.toString();

  if (!configStr) {
    throw new Error('Config file not found');
  }

  const config = JSON.parse(configStr) as Config;

  const result = validateCfg(config);

  if (!result) {
    if (!suppressWarning) Logger.error(validateCfg.errors);
    throw new Error('Invalid config');
  }

  return config;
}
