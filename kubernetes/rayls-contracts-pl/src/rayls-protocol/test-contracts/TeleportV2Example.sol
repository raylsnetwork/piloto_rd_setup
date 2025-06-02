// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import '../../rayls-protocol-sdk/libraries/Utils.sol';
import '../../commitChain/Teleport/TeleportV1.sol';

/**
 * @title Teleport
 * @dev Contract for storing private ledger data and related operations.
 */
contract TeleportV2Example is TeleportV1 {
    ///@dev returns the contract version
    function contractVersion() external pure override returns (uint256) {
        return 2;
    }
}
