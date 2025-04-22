import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';

require('dotenv').config();

async function main() {

  await GetInfos()

}

async function GetInfos() {
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const tokenRegistryV2 = await hre.ethers.getContractAt("TokenRegistryV2", deployment.tokenRegistryAddress);
  const endpoint = await hre.ethers.getContractAt("EndpointV1", deployment.tokenRegistryAddress);
  const tokens = await tokenRegistryV2.getAllTokens();
  var lastToken = tokens[tokens.length - 1];


  const ownerTokenRegistry = await tokenRegistryV2.owner();
  console.log("🚀 ~ GetInfos ~ ownerTokenRegistry:", ownerTokenRegistry)

  //  // const encodedResourceId = ethers.encodeBytes32String()  

  const token = await tokenRegistryV2.getEnygmaAddressByResourceAndChainId(lastToken[0], 149402);
  console.log("🚀 ~ GetInfos ~ token:", token)


  const enygma = await hre.ethers.getContractAt("EnygmaV2", token);
  const name = await enygma.Name()
  console.log("🚀 ~ GetInfos ~ name:", name)



  //Obter o Enygma da PL

  const tokenPL = await tokenRegistryV2.getEnygmaAddressByResourceAndChainId(lastToken[0], 600002);
  console.log("🚀 ~ GetInfos ~ token:", tokenPL)



  //


  //  const enygmaVerifierAddress = await enygma.VerifierAddress()
  //  console.log("🚀 ~ GetInfos ~ enygmaVerifierAddress:", enygmaVerifierAddress)

  //  const enygmaOwner = await enygma.owner();
  //  console.log("🚀 ~ GetInfos ~ enygmaOwner:", enygmaOwner)





}


main();


