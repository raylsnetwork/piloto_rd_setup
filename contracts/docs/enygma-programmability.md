# Programmability with Enygma

The Enygma stack allows for some programmability on the transfers, granting flexibility to users to execute blockchain logic atomically.

This document outlines the relevant parts of this feature, provides supporting code to assist users who intend to use this, and provides examples.

## The Solidity part
To execute arbritrary code in a destination Privacy Ledger, users can specify a list of up to 5 callables per cross transfer. This is what the `crossTransfer` function signature looks like for an Enygma token contract:

```solidity
function crossTransfer(
    address[] memory _to,
    uint256[] memory _value,
    uint256[] memory _toChainId,
    SharedObjects.EnygmaCrossTransferCallable[][] memory _callables
) public virtual returns (bytes32)
```

In the signature above, note the `SharedObjects.EnygmaCrossTransferCallable` struct. This struct is what enables users to execute on the destination chains, on the same transaction - providing atomicity. For reference, this is what the struct looks like:

```solidity
struct EnygmaCrossTransferCallable {
    bytes32 resourceId;
    address contractAddress;
    bytes payload;
}
```

Notice how the struct allows users to specify a `resourceId` and a `contractAddress`. When using this feature, users are expected to specify either the `resourceId` or `contractAddress`, where the `resourceId` will be translated to a contract address automatically, so the user won't have to know beforehand the desired token contract address at the destination chain. The `payload` field must always be specified.

## Constructing a callable payload

At the core of this feature, users are able to call functions in existing contracts, and are expected to encode the `payload` so that it can be executed like so:

```solidity
// assume that `contractAddress` is already resolved from callable.resourceId or callable.contractAddress
(bool _success, ) = contractAddress.call(abi.encodePacked(callable.payload));
```

To encode the payload, users can use functions like `createEnygmaCrossTransferCallablesByAddresses` or `createEnygmaCrossTransferCallablesByAddresses` available in [Utils.ts](../hardhat/test/e2e/Utils.ts), and copied here for reference:

```typescript
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

    // Encode the parameters
    const encodedParameters = abiCoder.encode(types[i], values[i]);

    // Concatenate the function selector with the encoded parameters
    const encodedFunctionCall = functionSelector + encodedParameters.slice(2); // Remove '0x' from the start of encodedParameters

    callables.push({
      resourceId: ethers.encodeBytes32String(""),
      contractAddress: contractAddresses[i],
      payload: encodedFunctionCall,
    })
  }

  return callables;
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

    // Encode the parameters
    const encodedParameters = abiCoder.encode(types[i], values[i]);

    // Concatenate the function selector with the encoded parameters
    const encodedFunctionCall = functionSelector + encodedParameters.slice(2); // Remove '0x' from the start of encodedParameters

    callables.push({
      resourceId: resourceIds[i],
      contractAddress: ethers.ZeroAddress,
      payload: encodedFunctionCall,
    })
  }

  return callables;
}
```

Here's how users can encode a call to a `mint` function, using a contract address:

```typescript
// 1 callable to mint to 1 target address
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [['0xTargetAddress1', '100']]
);

// 2 callables to mint to 2 target addresses.
// These 2 calls will be executed in the same blockchain transaction, providing atomicity.
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234", "0xTokenContractAddress1234"],
    ['mint(address,uint256)', 'mint(address,uint256)'],
    [['address', 'uint256'], ['address', 'uint256']],
    [['0xTargetAddress1', '100'], ['0xTargetAddress2', '200']]
);
```

Here's how users can encode a call to a `mint` function, using a `resourceId`:

```typescript
// 1 callable to mint to 1 target address
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByResourceIds(
    ["0xTokenResourceId1234"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [['0xTargetAddress1', '100']]
);

// 2 callables to mint to 2 target addresses.
// These 2 calls will be executed in the same blockchain transaction, providing atomicity.
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByResourceIds(
    ["0xTokenResourceId1234", "0xTokenResourceId1234"],
    ['mint(address,uint256)', 'mint(address,uint256)'],
    [['address', 'uint256'], ['address', 'uint256']],
    [['0xTargetAddress1', '100'], ['0xTargetAddress2', '200']]
);
```

## Putting it all together (Typescript examples)

So far we've seen how Enygma enables users to specify callables to execute arbitrary logic atomically and how to encode the callable payloads. In this section, we'll be using encoded callables to make cross transfers using this programmability feature. You can find more examples in the [EnygmaWithPayload.ts](../hardhat/test/e2e/EnygmaWithPayload.ts) test file.

### Cross transfer without callables

In this example, we do an Enygma cross transfer without any callables:

```typescript
const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [[]]);
const receipt = await tx.wait();
```

Notice the empty array of callables (`[[]]`) in the last parameter. Since we have 1 transfer, we need to specify 1 callables array, and in this case it is empty.

### Cross transfer with 1 callable

In this example, we do an Enygma cross transfer with 1 callable to mint some token using a contract address. This example assumes the contract's `mint` function has no guardrails and everyone can call it:

```typescript
// 1 callable to mint to a target address
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [[signerB.address, '100']]
);

const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [encodedCallables]);
const receipt = await tx.wait();
```

Notice that the array of callables only has 1 callable on the last parameter. Since we have 1 transfer, we need to specify 1 callables array, and in this case it has 1 callable to a `mint` function.

### Cross transfer with 2 callables

In this example, we do an Enygma cross transfer with 2 callables to mint some token using a contract address. This example assumes the contract's `mint` function has no guardrails and everyone can call it:

```typescript
// 2 callables to mint to 2 target addresses.
// These 2 calls will be executed in the same blockchain transaction, providing atomicity.
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234", "0xTokenContractAddress1234"],
    ['mint(address,uint256)', 'mint(address,uint256)'],
    [['address', 'uint256'], ['address', 'uint256']],
    [[signerC.address, '100'], [signerD.address, '200']]
);

const tx = await tokenOnPLA.crossTransfer([signerB.address], [10], [chainIdB], [encodedCallables]);
const receipt = await tx.wait();
```

Notice that the array of callables has 2 callables on the last parameter. Since we have 1 transfer, we need to specify 1 callables array, and in this case it has 2 callables to a `mint` function.

### Two cross transfers without callables

In this example, we do two Enygma cross transfers without any callables:

```typescript
const tx = await tokenOnPLA.crossTransfer([signerB.address, signerC.address], [10, 20], [chainIdB, chainIdC], [[], []]);
const receipt = await tx.wait();
```

Notice the empty array of callables (`[[], []]`) in the last parameter. Since we have 2 transfers, we need to specify 2 callable arrays, and in this case they are empty.


### Two cross transfers with 1 callable per transfer

In this example, we do two Enygma cross transfers with 1 callable each to mint some token using a contract address. This example assumes the contract's `mint` function has no guardrails and everyone can call it:

```typescript
// a callable to mint to a target address
const encodedCallables1: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [[signerB.address, '100']]
);

// another callable to mint to a target address
const encodedCallables2: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress5678"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [[signerC.address, '200']]
);

const tx = await tokenOnPLA.crossTransfer([signerB.address, signerC.address], [10, 20], [chainIdB, chainIdC], [encodedCallables1, encodedCallables2]);
const receipt = await tx.wait();
```

Notice that the array of callables has 2 callable arrays, with 1 callable each, on the last parameter. Since we have 2 transfers, we need to specify 2 callables arrays, and in this case it has 1 callable each to a `mint` function.

### Two cross transfers with 1 callable on the first transfer, and no callables on the second transfer

In this example, we do two Enygma cross transfers with 1 callable on the first transfer to mint some token using a contract address. This example assumes the contract's `mint` function has no guardrails and everyone can call it:

```typescript
// a callable to mint to a target address
const encodedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = createEnygmaCrossTransferCallablesByAddresses(
    ["0xTokenContractAddress1234"],
    ['mint(address,uint256)'],
    [['address', 'uint256']],
    [[signerB.address, '100']]
);

const tx = await tokenOnPLA.crossTransfer([signerB.address, signerC.address], [10, 20], [chainIdB, chainIdC], [encodedCallables, []]);
const receipt = await tx.wait();
```

Notice that the array of callables has 2 callable arrays, with 1 callable on the first transfer, and no callables on the second transfer. Since we have 2 transfers, we need to specify 2 callables arrays, and in this case the first transfer has 1 callable, and the second transfer has none.

## Using the sendEnygmaCross hardhat task

Users can also use a Json file with callables. Consider the following json named `c1.json`:

```json
[
  {
    "resourceId": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "contractAddress": "0x9AB72C5357b1E0319036Cddd70D0d636f9104910",
    "payload": "0xf26352a90000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000d48656c6c6f2c20576f726c642100000000000000000000000000000000000000"
  }
]
```

You can use this Json file to pass in callables:
```bash
npx hardhat sendEnygmaCross --symbol E_0xb635d4 --plorigin A --pldest B --to 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --amount 1 --callables-path c1.json
```

And for multiple transfers:
```bash
npx hardhat sendEnygmaCross --symbol E_0xb635d4 --plorigin A --pldest B --to 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --amount 1 --callables-path c1.json --pldest1 C --to1 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9 --amount1 1 --callables-path1 c2.json
```
