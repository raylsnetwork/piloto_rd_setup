import '@nomicfoundation/hardhat-ethers';

import { ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  await deployEnygmaEvents();
}

async function deployEnygmaEvents() {
  const enygmaEventsFactory = await ethers.getContractFactory('EnygmaPLEvents');
  const enygmaEventsResult = await enygmaEventsFactory.deploy();
  const finalAddress = await enygmaEventsResult.getAddress();

  console.log('Enygma PL Events deployed successfully', finalAddress);
}

main();
