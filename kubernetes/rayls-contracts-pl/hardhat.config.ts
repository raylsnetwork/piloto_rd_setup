// import config before anything else
import '@nomicfoundation/hardhat-foundry';
import '@nomicfoundation/hardhat-toolbox';
import '@openzeppelin/hardhat-upgrades';
import '@solarity/hardhat-gobind';
import { config as dotEnvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
// require("hardhat-contract-sizer");
import 'hardhat-contract-sizer';

dotEnvConfig();

import './hardhat/tasks/index';
import './hardhat/tasks/v2';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 50
      },
      evmVersion: 'paris'
    }
  },
  paths: {
    tests: './hardhat/test'
  },
  networks: {
    custom_cc: {
      url: process.env['RPC_URL_NODE_CC']!,
      accounts: [process.env['PRIVATE_KEY_SYSTEM']!],
      timeout: 80000
    },
    custom_pl: {
      url: process.env['RPC_URL_NODE_PL']!,
      accounts: [process.env['PRIVATE_KEY_SYSTEM']!],
      timeout: 80000
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false
  },
  gobind: {
    outdir: './bindings',
    deployable: true,
    runOnCompile: false,
    verbose: true,
    onlyFiles: ['src/commitChain/', 'src/rayls-protocol/', 'src/rayls-protocol-sdk/'],
    skipFiles: [
      'src/commitChain/Pedersen/Curve.sol',
      'src/commitChain/Pedersen/Ecc.sol',
      'src/rayls-protocol/Constants.sol',
      'src/rayls-protocol/interfaces/',
      'src/rayls-protocol/utils/RaylsReentrancyGuardV1.sol',
      '@openzeppelin',
      '@solarity'
    ]
  }
};

export default config;
