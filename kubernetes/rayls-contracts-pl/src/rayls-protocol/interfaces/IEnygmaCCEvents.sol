//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEnygmaCCEvents {       
    function transfer(bytes32 resourceId,  uint256 value, uint256 toChainId) external;
}