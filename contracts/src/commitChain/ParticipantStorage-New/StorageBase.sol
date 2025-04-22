// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- StorageBase.sol ---
abstract contract StorageBase {

    bytes32 constant PARTICIPANT_STORAGE_SLOT = 0xf2f3c24b8e62a32f6ff1628f4e6d6d7d9982c2ae42f030429519049d70a537cf;

    uint256[50] emptyGap;
   
    //bytes32 internal constant PARTICIPANT_STORAGE_SLOT = keccak256("3283c8afc043d6e6b7e5b7869cdb2714fe5a6bbfb5aa461f13e6ebacd635c30f");

    function _getStorage() internal pure returns (ParticipantStorageData storage data) {
        assembly {
            data.slot := PARTICIPANT_STORAGE_SLOT
        }
    }

    struct ParticipantStorageData {
        mapping(uint256 => Participant) participants;
        uint256[] registeredChainIds;
    }

    
    struct Participant {
        uint256 chainId;
        string name;
        uint256 createdAt;
        uint256 updatedAt;
        //string description;
        uint256[50] __gap;
    }

    struct AuditInfoData {
        uint256 chainId;
        string publicKey;
        bytes encryptedPrivateKey;
        bytes mac;
        uint256 blockNumber; // Additional field
    }

    struct PrivateLedgerData {
        uint256 chainId;
        string publicKey;
        uint256 blockNumber; // Additional field
    }

    struct PrivateLedgerDataEnygma {
        uint256 babyJubjubX;
        uint256 babyJubjubY;
        address[] plAddresses;
        uint256 chainId;
    }

    mapping(uint256 => Participant) public participants;
    mapping(uint256 => AuditInfoData) public auditInfoData;
    mapping(uint256 => PrivateLedgerData) public privateLedgerData;
    mapping(uint256 => PrivateLedgerDataEnygma) public enygmaData;

    uint256[] public registeredChainIds;
    uint256[] public allPrivateLedgers;
    uint256[] public allEnygmaParticipants;

    address public plEnygmaEvents;


    uint256[50] private __gap;
}