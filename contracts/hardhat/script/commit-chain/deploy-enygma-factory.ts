import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers} from 'hardhat';


require('dotenv').config();

async function main() {
 
  await deployEnygmaFactory();


}

async function deployEnygmaFactory() {
  console.log('Deploying Enygma Factory...');

  const enygmaFactory = await ethers.getContractFactory('EnygmaFactory');
  
  const deployment = await enygmaFactory.deploy( { gasLimit: 5000000 });
  const deploymentReceipt = await deployment.waitForDeployment();

  const finalAddress = await deploymentReceipt.getAddress();
  console.log('Enygma Factory', finalAddress);  
}


main();

