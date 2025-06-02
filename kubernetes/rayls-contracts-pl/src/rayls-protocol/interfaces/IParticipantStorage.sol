// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IParticipantStorage {
    
    function getEnygmaBabyJubjubKeysByChainId(uint256 chainId) external view returns (string memory, string memory);
    

}
