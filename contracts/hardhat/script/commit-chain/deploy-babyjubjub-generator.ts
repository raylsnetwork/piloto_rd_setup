import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';


require('dotenv').config();

async function main() {
 
  await deployBabyJubjub();


}

async function deployBabyJubjub() {
  console.log('Deploying BabyJubjub...');

  const babyjubjubFactory = await ethers.getContractFactory('CurveBabyJubJubGenerator');
  
  const deployment = await babyjubjubFactory.deploy( { gasLimit: 5000000 });
  const deploymentReceipt = await deployment.waitForDeployment();

  const finalAddress = await deploymentReceipt.getAddress();
  console.log('BabyJubjub', finalAddress);  
}


main();

