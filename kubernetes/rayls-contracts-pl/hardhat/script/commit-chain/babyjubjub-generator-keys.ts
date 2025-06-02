import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';
import crypto from 'crypto'; // Add this line to import the 'crypto' module


require('dotenv').config();

async function main() {
 
  const randomkey = await generateRandomWithChainId();
  await GenerateJubJubKeys(randomkey)

}

async function GenerateJubJubKeys(key: string) { 

  const curveBabyJubJubGenerator = await hre.ethers.getContractAt("CurveBabyJubJubGenerator", process.env.RAYLS_BABYJUBJUB!);

  curveBabyJubJubGenerator.derivePk(key, { gasLimit: 5000000 }).then((keys) => {
    const keysFinal = {  BabyJubjubKey : { V: key.toString(), X: keys[0].toString(), Y: keys[1].toString() } }
    console.log(JSON.stringify(keysFinal, null, 4));    
  })
    

}

async function generateRandomWithChainId() { 

    
  const timestamp = BigInt(Date.now());
  const chainId = Number(process.env.NODE_CC_CHAIN_ID!);
  
  // Create a buffer from the integer and timestamp
  const buffer = Buffer.alloc(12);
  buffer.writeInt32BE(chainId, 0);
  buffer.writeBigInt64BE(timestamp, 4);
  
  // Use the buffer to seed a PRNG
  const seed = crypto.createHash('sha256').update(buffer).digest();
  const prng = crypto.createHmac('sha256', seed);
  
  // Generate random bytes
  const randomBytes = prng.update(crypto.randomBytes(8)).digest();
  
  // Convert random bytes to a BigInt
  const randomBigInt = BigInt(`0x${randomBytes.toString('hex')}`);
  
  // Combine all parts into a single BigInt
  // Format: [randomPart(128 bits)][timestamp(48 bits)][integer(32 bits)]
  const result = (randomBigInt << 80n) | (timestamp << 32n) | BigInt(chainId);  
  
  // Combine all parts and substract to 32 length
  return `${result.toString().substring(0, 32)}`;  
}



main();

