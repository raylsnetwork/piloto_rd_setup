import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  await deployEnygmaWithFactory();
}

async function deployEnygmaWithFactory() {
  console.log('Deploying Enygma Factory...');

  const enygmaFactory = await hre.ethers.getContractAt('EnygmaFactory', '0x2D91B972FE4ccAcf09b309513E721D0e0873cDdF');

  //const owner = (await hre.ethers.provider.getSigner()).address;

  const newTx = await enygmaFactory.createEnygma('RONALDO-ENYGMA-99', 'ENY-RON-99', 18, 5, '0xb8c23364de1c9F9A629De2e7423C70b54eB9c7A4', { gasLimit: 5000000 });
  const receipt = await newTx.wait();

  console.log("🚀 ~ deployEnygmaWithFactory ~ receipt:", receipt?.logs)

  const newAddr = await enygmaFactory.getEnygmaAddress("0xb8c23364de1c9F9A629De2e7423C70b54eB9c7A4");


  const enygma = await hre.ethers.getContractAt('Enygma', newAddr);
  
  console.log("🚀 ~ deployEnygmaWithFactory ~ enygmaName:", (await enygma.Name()))
  

}

main();
