import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers, upgrades } from 'hardhat';
import { enygma } from '../../../typechain-types/src/rayls-protocol';

require('dotenv').config();

async function main() {
  //await GetVerifierAddressFromEnygma();
  await SendTx()
  //await GetPublicValuesFromEnygma();

  //await getEnymaAddress();
  // await getBalanceInPL()
  //await verifyTx();
  //await deployEnygmaVerifier();
  // await freezeEnygma()
  // await verifyFrozenByResourceId()
  // await unfreezeEnygma();
  //await getReferenceIdStatus();
}


/* async function getEnymaAddress() {
  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();   

  const tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV2', deployment.tokenRegistryAddress);  

  // const endpoint = await hre.ethers.getContractAt('EndpointV1', '0x8ABB06d039B23c97C9D015AC071C1cbE42BA9507');
  
  const enygmaAddr = await tokenRegistry.getEnygmaAddressByResourceAndChainId('0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6', process.env.NODE_CC_CHAIN_ID!);

  console.log("🚀 ~ enygmaAddr:", enygmaAddr)

  //const enygmaToken = await hre.ethers.getContractAt('EnygmaTokenExample', enygmaAddrOnPl);
  
} */

async function getBalanceInPL() {
  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();

  const endpoint = await hre.ethers.getContractAt('EndpointV1', '0xCf79269fbF5C57cED071E4D474A6Db9233E788e0');

  // const endpoint = await hre.ethers.getContractAt('EndpointV1', '0x8ABB06d039B23c97C9D015AC071C1cbE42BA9507');

  const enygmaAddrOnPl = await endpoint.getAddressByResourceId('0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6');

  console.log("🚀 ~ getBalanceInPL ~ enygmaAddrOnPl:", enygmaAddrOnPl)

  const enygmaToken = await hre.ethers.getContractAt('EnygmaTokenExample', enygmaAddrOnPl);
  var symbol = await enygmaToken.symbol();
  console.log('🚀 ~ GetBalanceInPL ~ symbol:', symbol);
  const qnt = await enygmaToken.balanceOf(owner);
  console.log('🚀 ~ GetInfos ~ qnt:', qnt);
}

async function SendTx() {
  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();

  const enygmaToken = await hre.ethers.getContractAt('EnygmaTokenExample', '0x38708704c34e8941fA25D33594B71D14b71d0161');

  //const txSend = await enygmaToken.crossTransfer([owner, owner, owner, owner, owner], [2, 3, 5 ,6, 7], [600002, 600001, 600003, 600004, 600005]);

  const txSend = await enygmaToken.crossTransfer([owner], [2], [600001]);

  const receipt = await txSend.wait();

  console.log(receipt);

  // const plEvents = await hre.ethers.getContractAt("EnygmaPLEvents", process.env.RAYLS_PL_ENYGMA_EVENTS!);
  // const accounts = await hre.ethers.getSigners();
  // const owner = accounts[0].getAddress()
  // console.log("🚀 ~ GetInfos ~ owner:", owner)

  //await plEvents.transfer("0x00000000000000000000000000000000000000000000000000000000686f6c61", 100, 600003, owner)

  // const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  // const deployment = await deploymentRegistry.getDeployment();

  //   const tokenRegistryV2 = await hre.ethers.getContractAt("TokenRegistryV2", deployment.tokenRegistryAddress);
  //   const tokens = await tokenRegistryV2.getAllTokens();
  //   var lastToken = tokens[tokens.length -1];

  //   const ownerTokenRegistry = await tokenRegistryV2.owner();
  //   console.log("🚀 ~ GetInfos ~ ownerTokenRegistry:", ownerTokenRegistry)

  // //  // const encodedResourceId = ethers.encodeBytes32String()

  //  const token = await tokenRegistryV2.getEnygmaAddressByResourceAndChainId(lastToken[0], 149402);
  //  console.log("🚀 ~ GetInfos ~ token:", token)

  //   const enygma = await hre.ethers.getContractAt("EnygmaV2", token);
  //   const name = await enygma.Name()
  //   console.log("🚀 ~ GetInfos ~ name:", name)

  //   //Obter o Enygma da PL

  //   const tokenPL = await tokenRegistryV2.getEnygmaAddressByResourceAndChainId(lastToken[0], 600002);
  //   console.log("🚀 ~ GetInfos ~ token:", tokenPL)

  //

  //  const enygmaVerifierAddress = await enygma.VerifierAddress()
  //  console.log("🚀 ~ GetInfos ~ enygmaVerifierAddress:", enygmaVerifierAddress)

  //  const enygmaOwner = await enygma.owner();
  //  console.log("🚀 ~ GetInfos ~ enygmaOwner:", enygmaOwner)
}

async function verifyTx() {
  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();

  const enygmaVerfierProxy = await hre.ethers.getContractAt('EnygmaVerifier', '0xaFdeB68DfDf76e38354e8eB448be19cD9FE065b0');

  const tx = await enygmaVerfierProxy.verifyProof(
    [1344364123824388097035064691931770009819848405021840065672414824839336226028n, 19140537974763114518876946103784687026776418892114594332610221614614147239189n], // _pA
    [
      [2925403165766150156603127493288394094013274089710873640628278131750942309560n, 13933926575628096249041780690727526191063518146440852863112112294091064760973n],
      [13033897600413967032023781883349215903290071252947170992739247893459616372061n, 21479803170922557770114551636166230875106064981071880021114828010872463882232n]
    ], // _pB
    [8857236669207221009514005003377015588852577646856490514827790584208781947058n, 10989538869869076680064670455200266508373267637975760316925665953237717872292n], // _pC
    [
      14451884419057915020949137947175018945872519670169407793608135659769648883648n,
      11861258390635889138782044752155218456002117300834103877722242652223366366839n,
      20840505685431146977850407137161692258823879228025361320686260555053168795323n,
      20375734505301527379794653617110251713572025966186265180780402200279119615209n,
      7401134651089868351209442024913507555152476601058046162898701420461498142972n,
      3104464501993729856483186354865428970288395964499231091718087841090592579838n,
      0n,
      1n,
      1633733n,
      600002n,
      600003n
    ] // _pubSignals
  );
  console.log('🚀 ~ VerifyTx ~ tx:', tx);
  // const enygmaAddrOnPl = await endpoint.getAddressByResourceId("0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6")

  // const enygmaToken = await hre.ethers.getContractAt("EnygmaTokenExample", enygmaAddrOnPl);
  // var symbol = await enygmaToken.symbol()
  // console.log("🚀 ~ GetBalanceInPL ~ symbol:", symbol)
  // const qnt = await enygmaToken.balanceOf(owner);
  // console.log("🚀 ~ GetInfos ~ qnt:", qnt)
}


async function GetVerifierAddressFromEnygma() {
  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();

  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV2', '0x4c8e057225422A99E481Cd52ac61E1EedF775CcD');
  const k = 2
  const verifierAddress = await enygmaV2.verifiers(k)
  //const verifierAddress = await enygmaV2.VerifierAddress();
  //const verifierAddress = await enygmaV2.GetTotalSupply();
  console.log("Verifier Address:", verifierAddress);

}
async function GetPublicValuesFromEnygma() {
  const accounts = await hre.ethers.getSigners();
  const owner = await accounts[0].getAddress();

  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV2', '0x7c764F092e13c135C0B7Ce72fcbD19f741F07442');

  // Call getPublicValues and retrieve the data
  const [balances, publicKeys] = await enygmaV2.getPublicValues();

  // Parse the returned values
  const parsedBalances = balances.map((balance) => ({
    c1: balance.c1.toString(),
    c2: balance.c2.toString(),
    chainId: balance.chainId.toString(),
  }));

  const parsedPublicKeys = publicKeys.map((key) => ({
    c1: key.c1.toString(),
    c2: key.c2.toString(),
    chainId: key.chainId.toString(),
  }));

  // Fetch additional public variables directly from the contract
  const totalSupplyX = (await enygmaV2.totalSupplyX()).toString();
  const totalSupplyY = (await enygmaV2.totalSupplyY()).toString();
  const totalSupply = (await enygmaV2.totalSupply()).toString();
  const ownerChainId = (await enygmaV2.ownerChainId()).toString();
  const lastblockNum = (await enygmaV2.lastblockNum()).toString();
  const participantStorageContract = await enygmaV2.participantStorageContract();
  const tokenRegistryContract = await enygmaV2.tokenRegistryContract();

  console.log('Balances:', parsedBalances);
  console.log('Public Keys:', parsedPublicKeys);
  console.log('Total Supply X:', totalSupplyX);
  console.log('Total Supply Y:', totalSupplyY);
  console.log('Total Supply:', totalSupply);
  console.log('Owner Chain ID:', ownerChainId);
  console.log('Last Block Number:', lastblockNum);
  console.log('Participant Storage Contract:', participantStorageContract);
  console.log('Token Registry Contract:', tokenRegistryContract);

  return {
    parsedBalances,
    parsedPublicKeys,
    totalSupplyX,
    totalSupplyY,
    totalSupply,
    ownerChainId,
    lastblockNum,
    participantStorageContract,
    tokenRegistryContract
  };
}





async function deployEnygmaVerifier() {
  console.log('Deploying Enygma Validator...');

  const enygmaValidatorFactory = await ethers.getContractFactory('EnygmaVerifier');

  const txDeploy = await enygmaValidatorFactory.deploy();
  txDeploy.waitForDeployment();

  var implementationAddress = await txDeploy.getAddress();
  console.log('🚀 ~ deployEnygmaVerifier ~ implementationAddress:', implementationAddress);
}

async function verifyFrozenByResourceId() {
  console.log('Checking freeze...');
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV2', deployment.tokenRegistryAddress);
  const isFrozen = await tokenRegistry.tokenIsFreeze('0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563');
  console.log("🚀 ~ verifyFrozenByResourceId ~ isFrozen:", isFrozen)

  const tokenInfos = await tokenRegistry.getTokenByResourceId('0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563');
  console.log("🚀 ~ verifyFrozenByResourceId ~ tokenInfos:", tokenInfos)



}
async function freezeEnygma() {
  console.log('freezing 🧊 ...');
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV2', deployment.tokenRegistryAddress);
  const freeze = await tokenRegistry.freezeToken('0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563', { gasLimit: 5000000 });
  const recept = await freeze.wait();
  console.log("🚀 ~ verifyFrozenByResourceId ~ isFrozen:", recept)
}

async function unfreezeEnygma() {
  console.log('unfreezing 🧊🔥 ...');
  const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env.COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY!);
  const deployment = await deploymentRegistry.getDeployment();

  const tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV2', deployment.tokenRegistryAddress);
  const freeze = await tokenRegistry.unfreezeToken('0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563', { gasLimit: 5000000 });
  const recept = await freeze.wait();
  console.log("🚀 ~ verifyFrozenByResourceId ~ isFrozen:", recept)
}

async function getReferenceIdStatus() {

  const accounts = await hre.ethers.getSigners();
  const owner = accounts[0].getAddress();

  const enygmaToken = await hre.ethers.getContractAt('EnygmaTokenExample', '0x39ce22079d0b72cCC230494584F4151eA5ff1823');

  const referenceIdFromIndex = await enygmaToken.referenceIdStatusByIndex(0);
  console.log("🚀 ~ getReferenceIdStatus ~ referenceIdFromIndex:", referenceIdFromIndex)

  // const result = await enygmaToken.referenceIdStatus('0xdfec2b60a893d5c577f4de88fb21d55c5473a0b7f4809da5b743a4de8b1683ab');
  // console.log("🚀 ~ getReferenceIdStatus ~ result:", result)


}

main();
