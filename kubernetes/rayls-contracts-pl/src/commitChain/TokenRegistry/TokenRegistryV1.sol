// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./../ParticipantStorage/ParticipantStorageV1.sol";
import "./../ResourceRegistry/ResourceRegistryV1.sol";
import "../../rayls-protocol-sdk/RaylsAppV1.sol";
import "../../rayls-protocol-sdk/libraries/SharedObjects.sol";
import "../../rayls-protocol/TokenRegistryReplica/TokenRegistryReplicaV1.sol";

import '../../rayls-protocol/Enygma/EnygmaFactory.sol';
import '../../rayls-protocol/Enygma/EnygmaV1.sol';

/**
 * @title TokenRegistry
 * @dev Smart contract for handling the Tokens registered to the VEN
 */
contract TokenRegistryV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable, RaylsAppV1 {
    /**
     * @dev Internal contract storage for TokenRegistry
     *
     * @custom:storage-location erc7201:rayls.commitchain.TokenRegistry
     */
    struct TokenRegistryStorage {
        address participantStorage;
        address resourceRegistry;
        mapping(bytes32 => uint256) tokenIndexByResourceId;
        mapping(string => bool) isTokenNameRegistered;
        Token[] registeredTokensList;
        FrozenToken[] frozenParticipants; //TODO: data duplication (resourceId) ?
    }

    // keccak256(abi.encode(uint256(keccak256("rayls.commitchain.TokenRegistry")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant TOKEN_REGISTRY_STORAGE = 0x935fd693b8de0a9e4162b9723bbbccf5a1174c5f90a7fd1a24c16111cba69d00;

    /**
     * @dev A token already exists with the same name;
     */
    error TokenNameDuplicate();
    /**
     * @dev The requested token is not registered;
     */
    error TokenNotFound();
    /**
     * @dev The token already has the requested status;
     */
    error TokenStatusAlreadySet();
    /**
     * @dev The specified PL is not an issuer;
     */

    uint256 lastIndexUsedFromTokenListV2;
    address enygmaFactory;
    address enygmaVerifierk2;
    address enygmaVerifierk6;

    mapping(bytes32 => bool) internal resourcesIdsFrozen;

    error UnauthorizedParticipant();

    event Erc20TokenRegistered(bytes32 resourceId, uint256 indexed issuerChainId, uint256 blockNumber, string name, uint256 initialSupply);
    event Erc721TokenRegistered(bytes32 resourceId, uint256 indexed issuerChainId, uint256 blockNumber, string name, uint256[] initialSupply);
    event Erc1155TokenRegistered(bytes32 resourceId, uint256 indexed issuerChainId, uint256 blockNumber, string name, SharedObjects.ERC1155Supply[] initialSupply);
    event TokenStatusUpdated(uint256 issuerChainId, string name, TokenStatus status);
    event EnygmaTokenFreezed(bytes32 resourceId);
    event EnygmaTokenUnfreezed(bytes32 resourceId);
    event EnygmaTokenRegistered(bytes32 resourceId, uint256 indexed issuerChainId, uint256 blockNumber, string name, uint256 initialSupply);

    struct BalanceUpdate {
        uint256 amount;
        uint256 ercId;
    }

    event TokenBalanceUpdated(
        bytes32 resourceId, uint256 issuerChainId, SharedObjects.BalanceUpdateType updateType, BalanceUpdate payload
    );

    enum TokenStatus {
        NEW,
        ACTIVE,
        INACTIVE
    }
    /**
     * @dev Represents a token registered to the VEN
     */

    struct Token {
        bytes32 resourceId;
        string name;
        string symbol;
        uint256 issuerChainId;
        address issuerImplementationAddress; // used to reply the resourceId to issuer
        bool isFungible;
        TokenStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        TokenMetadata metadata;
        SharedObjects.ErcStandard ercStandard;
        uint8 storageSlot;
    }

    struct FrozenToken {
        bytes32 resourceId;
        uint256[] frozenParticipants;
    }

    struct TokenMetadata {
        string url;
        uint8 decimals;
    }

    function initialize(
        address initialOwner,
        address participantStorageAt,
        address resourceRegistryAt,
        address _endpoint
    ) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        RaylsAppV1.initialize(_endpoint);
        TokenRegistryStorage storage $ = _getStorage();
        $.participantStorage = participantStorageAt;
        $.resourceRegistry = resourceRegistryAt;
        endpoint = IRaylsEndpoint(_endpoint);
        resourceId = Constants.RESOURCE_ID_TOKEN_REGISTRY;
        endpoint.registerResourceId(Constants.RESOURCE_ID_TOKEN_REGISTRY, address(this)); // resource registration to receive calls from commitchain
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Adds a participant with the given issuerChainId to the list.
     * @param tokenData The unique identifier for the participant.
     */
    function addToken(SharedObjects.TokenRegistrationData calldata tokenData)
        external
        virtual
        receiveMethod
        returns (bytes32)
    {
        if (!_isActiveIssuerParticipant(tokenData.issuerChainId)) {
            revert UnauthorizedParticipant();
        }

        TokenRegistryStorage storage $ = _getStorage();
        if ($.isTokenNameRegistered[tokenData.name] != false) {
            revert TokenNameDuplicate();
        }
        ResourceRegistryV1 resourceRegistry = ResourceRegistryV1($.resourceRegistry);
        bytes32 resourceId =
            resourceRegistry.registerResource(tokenData.ercStandard, tokenData.bytecode, tokenData.initializerParams);

        _initializeTokenData(tokenData, resourceId, $);
        _finalizeTokenRegistration(tokenData, resourceId, $);

        return resourceId;
    }

    function _initializeTokenData(SharedObjects.TokenRegistrationData calldata tokenData, bytes32 resourceId, TokenRegistryStorage storage $) virtual internal {
        string memory url = '';
        uint8 decimals = 0;

     
        if (!tokenData.isCustom) {
            if (tokenData.ercStandard == SharedObjects.ErcStandard.ERC1155 || tokenData.ercStandard == SharedObjects.ErcStandard.ERC721) {
                (string memory urlFrominitializerParams, ) = abi.decode(tokenData.initializerParams[4:], (string, string));
                url = urlFrominitializerParams;
            } else if (tokenData.ercStandard == SharedObjects.ErcStandard.ERC20 || tokenData.ercStandard == SharedObjects.ErcStandard.Enygma) {
                (, , uint8 tokenDecimals) = abi.decode(tokenData.initializerParams[4:], (string, string, uint8));
                decimals = tokenDecimals;
            }
        }
       
        $.registeredTokensList.push(
            Token({
                resourceId: resourceId,
                status: TokenStatus.NEW,
                name: tokenData.name,
                issuerChainId: tokenData.issuerChainId,
                symbol: tokenData.symbol,
                isFungible: tokenData.isFungible,
                issuerImplementationAddress: _getMsgSenderOnReceiveMethod(),
                createdAt: block.timestamp,
                updatedAt: block.timestamp,
                metadata: TokenMetadata({url: url, decimals: decimals}),
                ercStandard: tokenData.ercStandard,
                storageSlot: tokenData.storageSlot
            })
        );
        $.isTokenNameRegistered[tokenData.name] = true;
        $.tokenIndexByResourceId[resourceId] = $.registeredTokensList.length;
    }

    function _finalizeTokenRegistration(SharedObjects.TokenRegistrationData calldata tokenData, bytes32 resourceId, TokenRegistryStorage storage $) virtual internal {
        if (tokenData.ercStandard == SharedObjects.ErcStandard.ERC20) {
            emit Erc20TokenRegistered(
                resourceId,
                tokenData.issuerChainId,
                block.number,
                tokenData.name,
                abi.decode(tokenData.totalSupply, (uint256))
            );
        } else if (tokenData.ercStandard == SharedObjects.ErcStandard.ERC721) {
            emit Erc721TokenRegistered(
                resourceId,
                tokenData.issuerChainId,
                block.number,
                tokenData.name,
                abi.decode(tokenData.totalSupply, (uint256[]))
            );
        } else if (tokenData.ercStandard == SharedObjects.ErcStandard.ERC1155) {
            emit Erc1155TokenRegistered(resourceId, tokenData.issuerChainId, block.number, tokenData.name, abi.decode(tokenData.totalSupply, (SharedObjects.ERC1155Supply[])));
        } else if (tokenData.ercStandard == SharedObjects.ErcStandard.Enygma) {
            EnygmaFactory enygmaFactoryInstance = EnygmaFactory(enygmaFactory);
            enygmaFactoryInstance.createEnygma(
                tokenData.name,
                tokenData.symbol,
                abi.decode(tokenData.initializerParams[4:], (uint8)),
                resourceId,
                _getMsgSenderOnReceiveMethod(),
                tokenData.issuerChainId,
                $.participantStorage,
                address(endpoint),
                address(this)
            );
            address enygmaAddress = enygmaFactoryInstance.getEnygmaAddress(resourceId);
            EnygmaV1 enygmaInstance = EnygmaV1(enygmaAddress);
            enygmaInstance.addVerifier(enygmaVerifierk2, 2);
            enygmaInstance.addVerifier(enygmaVerifierk6, 6);
            endpoint.registerResourceId(resourceId, enygmaAddress);
            emit EnygmaTokenRegistered(resourceId, tokenData.issuerChainId, block.number, tokenData.name, abi.decode(tokenData.totalSupply, (uint256)));
        } else {
            revert("Unsupported ERC standard");
        }
    }

    function updateTokenBalance(
        uint256 issuerChainId,
        bytes32 resourceId,
        SharedObjects.BalanceUpdateType updateType,
        bytes memory metadata
    ) external virtual receiveMethod {
        Token storage token = _getTokenByResourceId(resourceId);

        uint256 amount;
        uint256 ercId = 0;

        if (token.ercStandard == SharedObjects.ErcStandard.ERC20) {
            amount = abi.decode(metadata, (uint256));
        } else if (token.ercStandard == SharedObjects.ErcStandard.ERC721) {
            ercId = abi.decode(metadata, (uint256));
            amount = 1;
        } else if (token.ercStandard == SharedObjects.ErcStandard.ERC1155) {
            SharedObjects.ERC1155Supply memory supply = abi.decode(metadata, (SharedObjects.ERC1155Supply));
            amount = supply.amount;
            ercId = supply.id;
        } else {
            revert("Unsupported ERC standard");
        }

        BalanceUpdate memory payload = BalanceUpdate({amount: amount, ercId: ercId});

        emit TokenBalanceUpdated(resourceId, issuerChainId, updateType, payload);
    }

    /**
     * @dev Retrieves the token with the given resourceId.
     * @return The token with the given resourceId.
     */
    function getTokenByResourceId(bytes32 resourceId) external view virtual returns (Token memory) {
        return _getTokenByResourceId(resourceId);
    }

    /**
     * @dev Updates the status of a given existing token if the same status is not set.
     */
    function updateStatus(bytes32 resourceId, TokenStatus status) external virtual onlyOwner {
        Token storage token = _getTokenByResourceId(resourceId);
        if (token.status == status) {
            revert TokenStatusAlreadySet();
        }
        token.status = status;
        token.updatedAt = block.timestamp;
        emit TokenStatusUpdated(token.issuerChainId, token.name, status);
        if (token.status == TokenStatus.ACTIVE) {
            _raylsSend(
                token.issuerChainId,
                token.issuerImplementationAddress,
                abi.encodeWithSignature("receiveResourceId(bytes32)", token.resourceId)
            );
        }
    }

    /**
     * @dev Freezes a token for a certain participant
     * @param resourceId resource ID of the token
     * @param chainIds The unique identifier for the participants.
     */
    function freezeToken(bytes32 resourceId, uint256[] calldata chainIds) external virtual onlyOwner {
        TokenRegistryStorage storage $ = _getStorage();
        uint256 frozenTokenIndex;
        bool found = false;

        // Check if the token already exists
        for (uint256 i = 0; i < $.frozenParticipants.length; i++) {
            if ($.frozenParticipants[i].resourceId == resourceId) {
                frozenTokenIndex = i;
                found = true;
                break;
            }
        }

        if (found) {
            FrozenToken storage frozenToken = $.frozenParticipants[frozenTokenIndex];
            // If it exists - add the frozen participants
            for (uint256 i = 0; i < chainIds.length; i++) {
                bool alreadyFrozen = false;
                for (uint256 j = 0; j < frozenToken.frozenParticipants.length; j++) {
                    if (frozenToken.frozenParticipants[j] == chainIds[i]) {
                        alreadyFrozen = true;
                    }
                }
                if (!alreadyFrozen) {
                    frozenToken.frozenParticipants.push(chainIds[i]);
                }
            }
            _broadcastFrozenToken(frozenToken);
        } else {
            // If not - create it and add the frozen participants
            FrozenToken memory newFrozenToken;
            newFrozenToken.resourceId = resourceId;
            newFrozenToken.frozenParticipants = new uint256[](chainIds.length);

            for (uint256 i = 0; i < chainIds.length; i++) {
                newFrozenToken.frozenParticipants[i] = chainIds[i];
            }
            $.frozenParticipants.push(newFrozenToken);
            _broadcastFrozenToken(newFrozenToken);
        }
    }

    /**
     * @dev Unfreezes a token for a certain participant
     * @param resourceId resource ID of the token
     * @param chainIds The unique identifier for the participants.
     */
    function unfreezeToken(bytes32 resourceId, uint256[] memory chainIds) external virtual onlyOwner {
        TokenRegistryStorage storage $ = _getStorage();

        // Find the index of the frozen token
        uint256 tokenIndex;
        bool found = false;
        for (uint256 i = 0; i < $.frozenParticipants.length; i++) {
            if ($.frozenParticipants[i].resourceId == resourceId) {
                tokenIndex = i;
                found = true;
                break;
            }
        }
        require(found, "Token not found");

        FrozenToken storage frozenToken = $.frozenParticipants[tokenIndex];
        uint256[] storage frozenParticipants = frozenToken.frozenParticipants;

        // Remove the frozen participant chainIds
        for (uint256 i = 0; i < chainIds.length; i++) {
            for (uint256 j = 0; j < frozenParticipants.length; j++) {
                if (frozenParticipants[j] == chainIds[i]) {
                    frozenParticipants[j] = frozenParticipants[frozenParticipants.length - 1];
                    frozenParticipants.pop();
                    break;
                }
            }
        }

        // If no frozen participants remain, remove the frozen token entry
        if (frozenParticipants.length == 0) {
            $.frozenParticipants[tokenIndex] = $.frozenParticipants[$.frozenParticipants.length - 1];
            $.frozenParticipants.pop();
        }

        _broadcastUnfrozenToken(FrozenToken({resourceId: resourceId, frozenParticipants: chainIds}));
    }

    function _broadcastFrozenToken(FrozenToken memory frozenToken) internal virtual {
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            Constants.CHAIN_ID_ALL_PARTICIPANTS,
            resourceId,
            abi.encodeWithSelector(TokenRegistryReplicaV1.updateFrozenToken.selector, frozenToken),
            bytes(""),
            bytes(""),
            bytes(""),
            emptyMetadata
        );
    }

    function _broadcastUnfrozenToken(FrozenToken memory unfrozenToken) internal virtual {
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            Constants.CHAIN_ID_ALL_PARTICIPANTS,
            resourceId,
            abi.encodeWithSelector(TokenRegistryReplicaV1.removeFrozenToken.selector, unfrozenToken),
            bytes(""),
            bytes(""),
            bytes(""),
            emptyMetadata
        );
    }

    /**
     * @dev Broadcast all current participants to the request chain
     */
    function broadcastCurrentFrozenResourcesForNewParticipant() public virtual receiveMethod {
        TokenRegistryStorage storage $ = _getStorage();
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            _getFromChainIdOnReceiveMethod(),
            resourceId,
            abi.encodeWithSelector(TokenRegistryReplicaV1.syncFrozenTokens.selector, $.frozenParticipants),
            bytes(""),
            bytes(""),
            bytes(""),
            emptyMetadata
        );
    }

    /**
     * @dev Retrieves the array of all registered tokens.
     * @return An array containing the unique identifiers of all registered participants.
     */
    function getAllTokens() external view virtual returns (Token[] memory) {
        return _getStorage().registeredTokensList;
    }

    /**
     * @dev Calls ParticipantStorage at the configured address during initialization
     * to retrieve a Participant and assert if its an ISSUER with status ACTIVE.
     */
    function _isActiveIssuerParticipant(uint256 chainId) internal view virtual returns (bool) {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(_getStorage().participantStorage);

        ParticipantStorageV1.Participant memory participant = participantStorage.getParticipant(chainId);

        return participant.role == ParticipantStorageV1.Role.ISSUER
            && participant.status == ParticipantStorageV1.Status.ACTIVE;
    }

    /**
     * @dev Used to retrieve a pointer to the contract storage.
     * @return $ A pointer to the contract storage.
     */
    function _getTokenByResourceId(bytes32 resourceId) internal view virtual returns (Token storage) {
        TokenRegistryStorage storage $ = _getStorage();
        uint256 index = $.tokenIndexByResourceId[resourceId];
        if (index == 0) {
            revert TokenNotFound();
        }
        return $.registeredTokensList[index - 1];
    }

    /**
     * @dev Used to retrieve a pointer to the contract storage.
     */
    function _getStorage() internal pure virtual returns (TokenRegistryStorage storage $) {
        assembly {
            $.slot := TOKEN_REGISTRY_STORAGE
        }
    }

    function updateEnygmaFactory(address _enygmaFactory) public virtual onlyOwner {
        enygmaFactory = _enygmaFactory;
    }

    function updateEnygmaVerifierk2(address _enygmaVerifierk2) public virtual onlyOwner {
        enygmaVerifierk2 = _enygmaVerifierk2;
    }

    function updateEnygmaVerifierk6(address _enygmaVerifierk6) public virtual onlyOwner {
        enygmaVerifierk6 = _enygmaVerifierk6;
    }

    function freezeEnygmaToken(bytes32 resourceId) external virtual onlyOwner {
        resourcesIdsFrozen[resourceId] = true;

        emit EnygmaTokenFreezed(resourceId);
    }

    function unfreezeEnygmaToken(bytes32 resourceId) external virtual onlyOwner {
        resourcesIdsFrozen[resourceId] = false;

        emit EnygmaTokenUnfreezed(resourceId);
    }

    function tokenEnygmaIsFreeze(bytes32 resourceId) external view virtual returns (bool) {
        return resourcesIdsFrozen[resourceId];
    }
    
    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
