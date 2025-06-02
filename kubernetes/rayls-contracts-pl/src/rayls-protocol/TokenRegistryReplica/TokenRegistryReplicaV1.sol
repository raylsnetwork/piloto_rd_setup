// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../../commitChain/ParticipantStorage/ParticipantStorageV1.sol";
import "../../commitChain/ResourceRegistry/ResourceRegistryV1.sol";
import "../../commitChain/TokenRegistry/TokenRegistryV1.sol";
import "../../rayls-protocol-sdk/RaylsAppV1.sol";
import "../../rayls-protocol-sdk/libraries/SharedObjects.sol";

contract TokenRegistryReplicaV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable, RaylsAppV1 {

    error TokenIsFrozenForParticipant();

    mapping(bytes32 => mapping(uint256 => bool)) internal frozenParticipantsByResourceId;

    function initialize(address initialOwner, address _endpoint) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        RaylsAppV1.initialize(_endpoint);
        endpoint = IRaylsEndpoint(_endpoint);
        resourceId = Constants.RESOURCE_ID_TOKEN_REGISTRY;
        endpoint.registerResourceId(Constants.RESOURCE_ID_TOKEN_REGISTRY, address(this)); // resource registration to receive calls from commitchain
    }

    /**
     * @dev Add multiple Frozen tokens
     * @param _frozenTokens Array of frozen tokens
     */
    function syncFrozenTokens(TokenRegistryV1.FrozenToken[] calldata _frozenTokens)
    external
    virtual
    receiveMethod
    onlyFromCommitChain
    {
        for (uint256 i = 0; i < _frozenTokens.length; i++) {
            bytes32 resourceId = _frozenTokens[i].resourceId;
            for (uint256 j = 0; j < _frozenTokens[i].frozenParticipants.length; j++) {
                uint256 chainId = _frozenTokens[i].frozenParticipants[j];
                frozenParticipantsByResourceId[resourceId][chainId] = true;
            }
        }
    }

    function updateFrozenToken(TokenRegistryV1.FrozenToken calldata _frozenToken)
    external
    virtual
    receiveMethod
    onlyFromCommitChain
    {
        bytes32 resourceId = _frozenToken.resourceId;

        for (uint256 i = 0; i < _frozenToken.frozenParticipants.length; i++) {
            uint256 chainId = _frozenToken.frozenParticipants[i];
            if (!frozenParticipantsByResourceId[resourceId][chainId]) {
                frozenParticipantsByResourceId[resourceId][chainId] = true;
            }
        }
    }

    function removeFrozenToken(TokenRegistryV1.FrozenToken calldata _unfrozenToken)
    external
    virtual
    receiveMethod
    onlyFromCommitChain
    {
        bytes32 resourceId = _unfrozenToken.resourceId;

        for (uint256 i = 0; i < _unfrozenToken.frozenParticipants.length; i++) {
            uint256 chainId = _unfrozenToken.frozenParticipants[i];
            if (frozenParticipantsByResourceId[resourceId][chainId]) {
                frozenParticipantsByResourceId[resourceId][chainId] = false;
            }
        }
    }
    /**
     * @dev Validates and reverts if a token is frozen for a certain participant
     * @param resourceId resource ID of the token
     * @param chainId The unique identifier for the participant.
     */
    function validateTokenForParticipant(bytes32 resourceId, uint256 chainId) external view {
        if (frozenParticipantsByResourceId[resourceId][chainId]) {
            revert TokenIsFrozenForParticipant();
        }
    }

    /**
     * @dev Sends a message to commit chain requesting all participant data
     */
    function requestAllFrozenTokensDataFromCommitChain() public virtual {
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            endpoint.getCommitChainId(),
            resourceId,
            abi.encodeWithSelector(TokenRegistryV1.broadcastCurrentFrozenResourcesForNewParticipant.selector),
            bytes(""),
            bytes(""),
            bytes(""),
            emptyMetadata
        );
    }

    /**
     * @dev Returns the list of tokens
            * @param resourceId resource ID of the token
            * @param chainId The unique identifier for the participant.
        */
    function getFrozenTokenForParticipant(bytes32 resourceId, uint256 chainId) external view returns (bool) {
        return frozenParticipantsByResourceId[resourceId][chainId];
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
