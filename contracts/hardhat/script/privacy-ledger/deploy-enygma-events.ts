import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers} from 'hardhat';
import { endpoint } from '../../../typechain-types/src/rayls-protocol';

require('dotenv').config();

async function main() {
 
  await deployEnygmaEvents();


}

async function deployEnygmaEvents() {
  console.log('Deploying Enygma Events...');


  const endpointFromPLAddress = "0x5203399D165287F442744f772169582941f67Aa4"

  const enygmaEventsFactory = await ethers.getContractFactory('EnygmaPLEvents');  
  
  const deployment = await enygmaEventsFactory.deploy(endpointFromPLAddress, { gasLimit: 5000000 });
  
  const deploymentReceipt = await deployment.waitForDeployment();

  const finalAddress = await deploymentReceipt.getAddress();

  const enygmaPlEvents = await ethers.getContractAt('EnygmaPLEvents', finalAddress);  

  await enygmaPlEvents.initialize();

  console.log('Enygma Events', finalAddress);  
}


main();

