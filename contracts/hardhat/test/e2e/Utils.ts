import hre, { ethers } from 'hardhat';
import { AddressLike } from 'ethers';
import { SharedObjects } from '../../../typechain-types/src/rayls-protocol-sdk/tokens/RaylsEnygmaHandler';


// Function to perform polling
export async function pollCondition(checkCondition: () => Promise<boolean>, interval: number, maxAttempts: number): Promise<boolean> {
  let attempts = 0;

  const executePoll = async (): Promise<boolean> => {
    const result = await checkCondition();
    attempts++;

    if (result) {
      return true;
    } else if (attempts < maxAttempts) {
      await delay(interval);
      return executePoll();
    } else {
      return false;
    }
  };

  return executePoll();
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateNoOpEnygmaCrossTransferCallable(): SharedObjects.EnygmaCrossTransferCallableStruct[] {
  const callables = [{
    resourceId: ethers.encodeBytes32String(""),
    contractAddress: ethers.ZeroAddress,
    payload: "0x",
  }]

  return callables
}

/**
 * Function to generate dummy EnygmaCrossTransferCallablesStruct objects with a specific payload for calling receiveMsgA(string) function on given addresses.
 * 
 * @param addresses The addresses of contracts with a receiveMsgA(string) method.
 * @returns A list of callables, like so: [{contractAddress: 0xa..., payload: 0xac2...}, ...]
 */
export function generateMsgAEnygmaCrossTransferCallablesByAddresses(addresses: AddressLike[]): SharedObjects.EnygmaCrossTransferCallableStruct[] {
  const functionSignatures = addresses.map(_ => "receiveMsgA(string)")
  const types = addresses.map(_ => ["string"])
  const values = addresses.map(_ => ["Hello, World!"])

  return createEnygmaCrossTransferCallablesByAddresses(addresses, functionSignatures, types, values)
}

/**
 * Encodes a series of callables. Each record in each input array matches one function call, and this allows the user to setup a call sequence.
 * 
 * @param contractAddresses The addresses of contracts to call
 * @param functionSignatures The function signature to call
 * @param types The type specifications
 * @param values The values to call the functions with
 * @returns an array of callables, like this [{contractAddress: address, payload:bytes}]
 */
export function createEnygmaCrossTransferCallablesByAddresses(contractAddresses: AddressLike[], functionSignatures: string[], types: string[][], values: any[][]): SharedObjects.EnygmaCrossTransferCallableStruct[] {
  let callables: SharedObjects.EnygmaCrossTransferCallableStruct[] = []
  const abiCoder = new ethers.AbiCoder();

  for (let i = 0; i < contractAddresses.length; i++) {
    // Get the function selector (first 4 bytes (8 hex characters) of the  Keccak-256 hash, with "0x" prefix)
    const functionSelector = ethers.id(functionSignatures[i]).slice(0, 10);
    //console.log('functionSelector', functionSelector)

    // Encode the parameters
    const encodedParameters = abiCoder.encode(types[i], values[i]);

    // Concatenate the function selector with the encoded parameters
    const encodedFunctionCall = functionSelector + encodedParameters.slice(2); // Remove '0x' from the start of encodedParameters
    //console.log('encodedFunctionCall', encodedFunctionCall)
    callables.push({
      resourceId: ethers.encodeBytes32String(""),
      contractAddress: contractAddresses[i],
      payload: encodedFunctionCall,
    })
  }

  return callables;
}

/**
 * Function to generate dummy EnygmaCrossTransferCallablesStruct objects with a specific payload for calling receiveMsgA(string) function on given resource id.
 * 
 * @param resourceIds The resource ids of contracts with a receiveMsgA(string) method.
 * @returns A list of callables, like so: [{resourceId: 0xa..., payload: 0xac2...}, ...]
 */
export function generateMsgAEnygmaCrossTransferCallablesByResourceIds(resourceIds: string[]): SharedObjects.EnygmaCrossTransferCallableStruct[] {
  const functionSignatures = resourceIds.map(_ => "receiveMsgA(string)")
  const types = resourceIds.map(_ => ["string"])
  const values = resourceIds.map(_ => ["Hello, World!"])

  return createEnygmaCrossTransferCallablesByResourceIds(resourceIds, functionSignatures, types, values)
}

/**
 * Encodes a series of callables. Each record in each input array matches one function call, and this allows the user to setup a call sequence.
 * 
 * @param resourceIds The resource ids of contracts to call
 * @param functionSignatures The function signature to call
 * @param types The type specifications
 * @param values The values to call the functions with
 * @returns an array of callables, like this [{resourceId: address, payload:bytes}]
 */
export function createEnygmaCrossTransferCallablesByResourceIds(resourceIds: string[], functionSignatures: string[], types: string[][], values: any[][]): SharedObjects.EnygmaCrossTransferCallableStruct[] {
  let callables: SharedObjects.EnygmaCrossTransferCallableStruct[] = []
  const abiCoder = new ethers.AbiCoder();

  for (let i = 0; i < resourceIds.length; i++) {
    // Get the function selector (first 4 bytes (8 hex characters) of the  Keccak-256 hash, with "0x" prefix)
    const functionSelector = ethers.id(functionSignatures[i]).slice(0, 10);
    //console.log('functionSelector', functionSelector)

    // Encode the parameters
    const encodedParameters = abiCoder.encode(types[i], values[i]);

    // Concatenate the function selector with the encoded parameters
    const encodedFunctionCall = functionSelector + encodedParameters.slice(2); // Remove '0x' from the start of encodedParameters
    //console.log('encodedFunctionCall', encodedFunctionCall)
    callables.push({
      resourceId: resourceIds[i],
      contractAddress: ethers.ZeroAddress,
      payload: encodedFunctionCall,
    })
  }

  return callables;
}