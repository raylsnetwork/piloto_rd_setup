import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

require('dotenv').config();

async function main() {
  const initialOwner = (await hre.ethers.provider.getSigner()).address;
  const ccChainId = process.env.NODE_CC_CHAIN_ID!;
  let dhPublic = process.env.DH_PUBLIC!;
  let dhSecret = process.env.DH_PUBLIC!;
  let privateKeySystem = process.env.PRIVATE_KEY_SYSTEM!;
  const operatorChainId = '999';

  if (!privateKeySystem) {
    const randomKey = hre.ethers.Wallet.createRandom().privateKey;
    privateKeySystem = randomKey;
    console.log(`🔑🔒 No Private Key given via env var "PRIVATE_KEY_SYSTEM" or argument "--private-key-system", so a random one will be generated...`);
    console.log(`📝 Take notes of the generated private key: ${privateKeySystem}`);
    console.log('');
  }

  if (!dhPublic) {
    const dhKeyPair = await dhGen();
    dhPublic = dhKeyPair.dhPublic;
    dhSecret = dhKeyPair.dhSecret;
    console.log(`🔑🔒 No DH Public Key given via env var "DH_PUBLIC" or argument "--dh-public", so a random one will be generated...`);
    console.log(`📝 Take notes of the generated DH KeyPair:\n${JSON.stringify(dhKeyPair, null, 4)}`);
    console.log('');
  }

  console.log('ccChainId', ccChainId);

  const atomicTelelportAddress = await deployAtomicTeleport(initialOwner);

  console.log('');
  console.log(`✅ Finished deploy new proxy contract 👽`);
  console.log('');
  
  console.log(`RAYLS_ATOMIC_TELEPORT_PROXY=${atomicTelelportAddress}`);
  
}

async function deployAtomicTeleport(initialOwner: string) {
  console.log('Deploying AtomicTeleport...');

  const atomicTeleportFactory = await ethers.getContractFactory('AtomicTeleportV1');
  const atomicTeleport = await upgrades.deployProxy(atomicTeleportFactory, [initialOwner], {
    kind: 'uups',
    initializer: 'initialize(address)'
  });

  const finalAddress = await atomicTeleport.getAddress();

  console.log('AtomicTeleport', finalAddress);

  return finalAddress;
}



main();

interface KeyPair {
  dhSecret: string;
  dhPublic: string;
}

export async function dhGen(): Promise<KeyPair> {
  const exec = promisify(execCallback);
  try {
    const { stdout, stderr } = await exec('./hardhat/tasks/utils/dhgen/dhgen');

    if (stderr) {
      console.error(`Error on DhGen: ${stderr}`);
    }
    const rawData = fs.readFileSync('./keypair.json', { encoding: 'utf-8' });
    const jsonData: KeyPair = JSON.parse(rawData);
    return jsonData;
  } catch (error: any) {
    console.error(`Error on DhGen: ${error.message}`);
    throw error;
  }
}
