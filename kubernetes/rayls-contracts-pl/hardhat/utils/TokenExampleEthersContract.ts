import fs from 'fs';

import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';


export class TokenExampleEthersContract {
  public chainId: number;
  public contract: Contract;
  public wallet: Wallet;

  constructor(tokenAddress: string, rpcUrl: string, pk: string, chainId: number) {
    const jsonFile = fs.readFileSync('artifacts/src/rayls-protocol/test-contracts/TokenExample.sol/TokenExample.json');
    const abi = JSON.parse(jsonFile.toString());

    this.chainId = chainId;
    const wallet = new Wallet(pk);
    this.wallet = wallet;
    this.contract = new Contract(tokenAddress, abi.abi, wallet);
  }

  async populateSignedTeleportAtomic(this: TokenExampleEthersContract, destinationAddress: string, amount: number, destinationChainId: string, currentNonce: number) {
    const tx = await this.contract.populateTransaction.teleportAtomic(destinationAddress, amount, destinationChainId);

    tx.from = this.wallet.address;
    tx.nonce = currentNonce;
    tx.gasPrice = BigNumber.from(0);
    tx.gasLimit = BigNumber.from(5000000);
    tx.chainId = this.chainId;

    const signedTx = await this.wallet.signTransaction(tx);
    return signedTx;
  }

  async populateSignedTeleport(this: TokenExampleEthersContract, destinationAddress: string, amount: number, destinationChainId: string, currentNonce: number) {
    const tx = await this.contract.populateTransaction.teleport(destinationAddress, amount, destinationChainId);

    tx.from = this.wallet.address;
    tx.nonce = currentNonce;
    tx.gasPrice = BigNumber.from(0);
    tx.gasLimit = BigNumber.from(5000000);
    tx.chainId = this.chainId;

    const signedTx = await this.wallet.signTransaction(tx);
    return signedTx;
  }
}
