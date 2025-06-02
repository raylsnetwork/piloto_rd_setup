import type { JsonRpcProvider } from 'ethers';
import type { ethers } from 'hardhat';

export function getSigner(
  web3: typeof ethers,
  provider: JsonRpcProvider,
  privateKey: string
) {
  const wallet = new web3.Wallet(privateKey).connect(provider);
  const signer = new web3.NonceManager(wallet);

  return signer;
}
