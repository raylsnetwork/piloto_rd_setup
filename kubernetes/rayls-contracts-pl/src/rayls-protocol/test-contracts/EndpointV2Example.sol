// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import '../Endpoint/EndpointV1.sol';

contract EndpointV2Example is EndpointV1 {
    function contractVersion() external pure virtual override returns (uint256) {
        return 2;
    }
}
