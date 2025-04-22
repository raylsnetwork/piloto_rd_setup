// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./rayls-protocol-sdk/libraries/Utils.sol";

/**
 * @title SignatureStorage
 * @dev This contract handles the function signatures per message id. Signature/s would be executed
 * in the relayer once message is marked as executed.
 */
contract SignatureStorage {
    struct Signature {
        Utils.MessageStatus status; // denotes the msg status that is related with the signature
        bytes signature;
        bytes32 resourceId;
        uint256 signatureExecuteChainId; // the chain id where the signature should be executed
        uint256 destinationChainId; // the destination chain id when the transaction is formed
    }

    mapping(string => Signature) private signatures;

    function addSignature(string memory signatureKey, Signature calldata sig) external {
        signatures[signatureKey] = sig;
    }

    function deleteSignature(string memory signatureKey) external {
        delete signatures[signatureKey];
    }

    function getSignature(string memory signatureKey) external view returns (Signature memory) {
        return signatures[signatureKey];
    }
}
