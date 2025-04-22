// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './ParticipantStorageReplicaV1.sol';

/**
 * @title ParticipantStorageReplica
 * @dev Smart contract for replicate the participants registered on commit chain into privacy ledgers.
 */
contract ParticipantStorageReplicaV2 is ParticipantStorageReplicaV1 {

    mapping(uint256 => uint256) internal sharedSecrets;
    uint256[] internal sharedSecretsOrderedArray;
    uint256 public plChainId;
    bool public isSetupSharedSecretsFinished;

    function initializeV2() public reinitializer(2) {
        isSetupSharedSecretsFinished = false;
    }

    function _updateSharedSecrets(
        uint256 chainIdSender,
        uint256 value,
        uint256[] memory orderedChainIds
    ) private {
        sharedSecrets[chainIdSender] = value;

        uint256[] memory secretsArray = new uint256[](orderedChainIds.length);
        for (uint256 i = 0; i < orderedChainIds.length; i++) {
            uint256 chainId = orderedChainIds[i];
            secretsArray[i] = sharedSecrets[chainId];
        }
        sharedSecretsOrderedArray = secretsArray;
    }

    function receiveSharedSecret(
        uint256 value,
        uint256[] memory orderedChainIds,
        uint256 chainIdReceiver
    ) public virtual receiveMethod {
        if (plChainId == chainIdReceiver) {
            uint256 chainIdSender = _getFromChainIdOnReceiveMethod();
            _updateSharedSecrets(chainIdSender, value, orderedChainIds);
        }
    }

    function getSharedSecret(uint256 chainId) public view returns (uint256) {
        return sharedSecrets[chainId];
    }

    function getSharedSecrets() public view returns (uint256[] memory) {
        return sharedSecretsOrderedArray;
    }

    function broadcastAndSetSharedSecrets(
        uint256[] memory _sharedSecrets,
        uint256[] memory _orderedChainIds,
        uint256 _PLChainId
    ) public {
        BridgedTransferMetadata memory emptyMetadata;
        require(_sharedSecrets.length == _orderedChainIds.length, "Input arrays must have the same length");
        require(isSetupSharedSecretsFinished == false, "Shared Secret Setup has already been done. This function should run only once at PL startup.");

        plChainId = _PLChainId;

        for (uint256 i = 0; i < _orderedChainIds.length; i++) {
            uint256 chainId = _orderedChainIds[i];
            uint256 secret = _sharedSecrets[i];
            if (chainId == _PLChainId) {
                require(secret == 0, "Own secret should be zero.");
            } else {
                _raylsSendToResourceId(
                    chainId,
                    Constants.RESOURCE_ID_PARTICIPANT_STORAGE,
                    abi.encodeWithSignature(
                        "receiveSharedSecret(uint256,uint256[],uint256)",
                        secret,
                        _orderedChainIds,
                        chainId
                    ),
                    bytes(""),
                    bytes(""),
                    bytes(""),
                    emptyMetadata
                );
            }
        }

        for (uint256 i = 0; i < _orderedChainIds.length; i++) {
            _updateSharedSecrets(_orderedChainIds[i], _sharedSecrets[i], _orderedChainIds);
        }

        isSetupSharedSecretsFinished = true;
    }

    // Synchronization assertion for debugging 
    function _assertSynchronization(uint256[] memory orderedChainIds) private view {
        for (uint256 i = 0; i < orderedChainIds.length; i++) {
            require(
                sharedSecretsOrderedArray[i] == sharedSecrets[orderedChainIds[i]],
                "Mismatch between sharedSecrets and sharedSecretsOrderedArray"
            );
        }
    }

    /// @dev returns the contract version
    function contractVersion() external pure virtual override returns (uint256) {
        return 2;
    }
}

