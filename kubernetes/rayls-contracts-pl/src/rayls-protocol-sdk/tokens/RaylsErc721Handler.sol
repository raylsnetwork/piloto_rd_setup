// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RaylsApp} from "../RaylsApp.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRaylsEndpoint.sol";
import "../RaylsMessage.sol";
import "../libraries/SharedObjects.sol";
import "../libraries/Utils.sol";

abstract contract RaylsErc721Handler is RaylsApp, ERC721, Initializable, Ownable {
    string private _uri;
    string public _tokenName;
    string public _tokenSymbol;
    bool isCustom;

    mapping(address => mapping(uint256 => bool)) lockedTokens;
    mapping(uint256 => bool) alreadySentDeployInstructions;

    // Supply tracking
    mapping(uint256 => bool) private _exists;
    uint256[] private _allTokens;

    /**
     * @dev Constructor to initialize the RaylsCore with the provided endpoint and owner.
     * @param _endpoint The address of the Rayls endpoint.
     * @param _owner The address of the owner of the RaylsCore.
     */
    constructor(string memory uri, string memory name_, string memory symbol_, address _endpoint, address _owner, bool _isCustom)
        ERC721(name_, symbol_)
        RaylsApp(_endpoint)
        Ownable(_owner)
    {
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _uri = uri;
        isCustom = _isCustom;
        _disableInitializers();
    }

    function initialize(string memory uri, string memory name_, string memory symbol_) public virtual initializer {
        address _owner = _getOwnerAddressOnInitialize();
        address _endpoint = _getEndpointAddressOnInitialize();
        resourceId = _getResourceIdOnInitialize();
        // ERC721 initizalization
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _uri = uri;
        // RaylsApp Initialization
        _transferOwnership(_owner);
        endpoint = IRaylsEndpoint(_endpoint);
    }

    function name() public view virtual override returns (string memory) {
        return _tokenName;
    }

    function symbol() public view virtual override returns (string memory) {
        return _tokenSymbol;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    function teleport(address to, uint256 id, uint256 chainId) public virtual returns (bool) {
        _burn(id);

        BridgedTransferMetadata memory metadata =
            BridgedTransferMetadata({assetType: RaylsBridgeableERC.ERC721, id: id, from: msg.sender, to: to, amount: 1, tokenAddress: address(this)});

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleport(address,uint256)", to, id),
            bytes(""),
            abi.encodeWithSignature("revertTeleportMint(address,uint256)", msg.sender, id),
            abi.encodeWithSignature("revertTeleportBurn(address,uint256)", msg.sender, id),
            metadata
        );
        return true;
    }

    function teleportAtomic(address to, uint256 id, uint256 chainId) public virtual returns (bool) {
        _burn(id);

        BridgedTransferMetadata memory metadata =
            BridgedTransferMetadata({assetType: RaylsBridgeableERC.ERC721, id: id, from: msg.sender, to: to, amount: 1, tokenAddress: address(this)});

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleportAtomic(address,uint256)", to, id),
            abi.encodeWithSignature("unlock(address,uint256)", to, id),
            abi.encodeWithSignature("revertTeleportMint(address,uint256)", msg.sender, id),
            abi.encodeWithSignature("revertTeleportBurn(address,uint256)", msg.sender, id),
            metadata
        );
        return true;
    }

    function receiveTeleport(address to, uint256 id) public virtual {
        _mint(to, id);
    }

    function receiveTeleportAtomic(address to, uint256 id) public virtual {
        _mint(owner(), id);
        if (to != owner()) {
            _lock(to, id);
        }
    }

    function revertTeleportMint(address to, uint256 id) public virtual receiveMethod {
        _mint(to, id);
    }

    function revertTeleportBurn(uint256 id) public virtual receiveMethod {
        _burn(id);
    }

    /**
     * @notice Unlocks the locked funds and calls transfer
     * @param to Address of a "to" account to unlock the funds to
     * @param id Id of the token to unlock
     */
    function unlock(address to, uint256 id) external returns (bool) {
        if (to != owner()) {
            bool success = _unlock(to, id);
            require(success, "cannot unlock the assets");
            _safeTransfer(owner(), to, id);
        }
        return true;
    }

    function _lock(address to, uint256 id) internal {
        require(to != address(0));
        lockedTokens[to][id] = true;
    }

    function _unlock(address to, uint256 id) internal returns (bool) {
        require(to != address(0));
        bool isLocked = lockedTokens[to][id];
        require(isLocked == true, "No funds to unlock");
        lockedTokens[to][id] = false;
        return true;
    }

    function receiveResourceId(bytes32 _resourceId) public virtual receiveMethod onlyFromCommitChain {
        resourceId = _resourceId;
        _registerResourceId();
    }

    //here
    function submitTokenRegistration(uint8 _storageSlot) public virtual {
        _raylsSend(
            endpoint.getCommitChainId(),
            endpoint.getCommitChainAddress("TokenRegistry"),
            abi.encodeWithSignature(
                "addToken((string,string,bytes,uint256,bytes,bytes,bool,uint8,bool,uint8))",
                SharedObjects.TokenRegistrationData({
                    name: _tokenName,
                    symbol: _tokenSymbol,
                    issuerChainId: endpoint.getChainId(),
                    bytecode: address(this).code,
                    initializerParams: _generateInitializerParams(),
                    isFungible: false,
                    ercStandard: SharedObjects.ErcStandard.ERC721,
                    totalSupply: abi.encode(totalSupply()),
                    isCustom: isCustom,
                    storageSlot: _storageSlot
                })
            )
        );
    }

    function _generateInitializerParams() internal view virtual returns (bytes memory) {
        return abi.encodeWithSignature("initialize(string,string,string)", _uri, _tokenName, _tokenSymbol);
    }

    function isTokenLocked(address account, uint256 id) public view returns (bool) {
        return lockedTokens[account][id];
    }

    function sendTeleport(
        uint256 chainId,
        bytes memory _payload,
        bytes memory _lockDataPayload,
        bytes memory _revertDataPayloadSender,
        bytes memory _revertDataPayloadReceiver,
        BridgedTransferMetadata memory metadata
    ) internal {
        require(resourceId != bytes32(0), "Token not registered.");
        _raylsSendToResourceId(
            chainId,
            resourceId,
            _payload,
            _lockDataPayload,
            _revertDataPayloadSender,
            _revertDataPayloadReceiver,
            metadata
        );
    }

    /**
     * @dev Internal function to submit a token balance update to the CommitChain. This function encodes a function call to the TokenRegistry contract.
     * @param updateType The type of update Mint or Burn
     * @param tokenId The amount of tokens to update.
     */
    function _submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 tokenId) internal {
        if (resourceId == bytes32(0)) {
            return;
        }

        _raylsSend(
            endpoint.getCommitChainId(),
            endpoint.getCommitChainAddress("TokenRegistry"),
            abi.encodeWithSignature(
                "updateTokenBalance(uint256,bytes32,uint8,bytes)",
                endpoint.getChainId(),
                resourceId,
                updateType,
                abi.encode(tokenId)
            )
        );
    }

    function submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 tokenId) public virtual onlyOwner {
        _submitTokenUpdate(updateType, tokenId);
    }

    /**
     * Overrides
     */
    function totalSupply() private view returns (uint256[] memory) {
        return _allTokens;
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param id The id of the token to mint.
     */
    function mint(address to, uint256 id) public virtual onlyOwner {
        _mint(to, id);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, id);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param id The id of the token to burn.
     */
    function burn(uint256 id) public virtual onlyOwner {
        _burn(id);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, id);
    }

    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);

        // Minting token
        if (previousOwner == address(0)) {
            if (!_exists[tokenId]) {
                _allTokens.push(tokenId);
                _exists[tokenId] = true;
            }
        }

        // Burning token
        if (to == address(0)) {
            _exists[tokenId] = false;
            // Remove the id from _allTokens array
            for (uint256 i = 0; i < _allTokens.length; i++) {
                if (_allTokens[i] == tokenId) {
                    _allTokens[i] = _allTokens[_allTokens.length - 1];
                    _allTokens.pop();
                    break;
                }
            }
        }

        return previousOwner;
    }
}
