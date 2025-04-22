// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RaylsApp} from "../RaylsApp.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRaylsEndpoint.sol";
import "../RaylsMessage.sol";
import "../libraries/SharedObjects.sol";
import "../libraries/Utils.sol";

abstract contract RaylsErc1155Handler is RaylsApp, ERC1155, Initializable, Ownable {
    string private _uri;
    string public name;
    bool isCustom;

    mapping(address => mapping(uint256 => uint256)) lockedAmount;
    mapping(uint256 => bool) alreadySentDeployInstructions;

    // Supply tracking
    mapping(uint256 => uint256) private _totalSupply;
    mapping(uint256 => bool) private _exists;
    uint256[] private _allTokens;

    /**
     * @dev Constructor to initialize the RaylsCore with the provided endpoint and owner.
     * @param uri The URI of the token.
     * @param _name The name of the token.
     * @param _endpoint The address of the Rayls endpoint.
     * @param _owner The address of the owner of the RaylsCore.
     */
    constructor(string memory uri, string memory _name, address _endpoint, address _owner, bool _isCustom)
        ERC1155(uri)
        RaylsApp(_endpoint)
        Ownable(_owner)
    {
        _uri = uri;
        name = _name;
        isCustom = _isCustom;
        _disableInitializers();
    }

    function initialize(string memory uri, string memory _name) public virtual initializer {
        address _owner = _getOwnerAddressOnInitialize();
        address _endpoint = _getEndpointAddressOnInitialize();
        resourceId = _getResourceIdOnInitialize();
        // ERC1155 initizalization
        _uri = uri;
        name = _name;
        // RaylsApp Initialization
        _transferOwnership(_owner);
        endpoint = IRaylsEndpoint(_endpoint);
    }

    function uri(uint256 /* id */ ) public view virtual override returns (string memory) {
        return _uri;
    }

    function _setURI(string memory newuri) internal virtual override {
        _uri = newuri;
    }

    function teleport(address to, uint256 id, uint256 value, uint256 chainId, bytes memory data)
        public
        virtual
        returns (bool)
    {
        _burn(msg.sender, id, value);

        BridgedTransferMetadata memory metadata = BridgedTransferMetadata({
            assetType: RaylsBridgeableERC.ERC1155,
            id: id,
            from: msg.sender,
            to: to,
            amount: value,
            tokenAddress: address(this)
        });

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleport(address,uint256,uint256,bytes)", to, id, value, data),
            bytes(""),
            abi.encodeWithSignature("revertTeleportMint(address,uint256,uint256,bytes)", msg.sender, id, value, data),
            abi.encodeWithSignature("revertTeleportBurn(address,uint256,uint256)", msg.sender, id, value),
            metadata
        );
        return true;
    }

    function teleportAtomic(address to, uint256 id, uint256 value, uint256 chainId, bytes memory data)
        public
        virtual
        returns (bool)
    {
        _burn(msg.sender, id, value);

        BridgedTransferMetadata memory metadata = BridgedTransferMetadata({
            assetType: RaylsBridgeableERC.ERC1155,
            id: id,
            from: msg.sender,
            to: to,
            amount: value,
            tokenAddress: address(this)
        });

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleportAtomic(address,uint256,uint256,bytes)", to, id, value, data),
            abi.encodeWithSignature("unlock(address,uint256,uint256,bytes)", to, id, value, data),
            abi.encodeWithSignature("revertTeleportMint(address,uint256,uint256,bytes)", msg.sender, id, value, data),
            abi.encodeWithSignature("revertTeleportBurn(address,uint256,uint256)", msg.sender, id, value),
            metadata
        );
        return true;
    }

    function receiveTeleport(address to, uint256 id, uint256 value, bytes memory data) public virtual {
        _mint(to, id, value, data);
    }

    function receiveTeleportAtomic(address to, uint256 id, uint256 value, bytes memory data) public virtual {
        _mint(owner(), id, value, data);
        if (to != owner()) {
            _lock(to, id, value);
        }
    }

    function revertTeleportMint(address to, uint256 id, uint256 value, bytes memory data)
        public
        virtual
        receiveMethod
    {
        _mint(to, id, value, data);
    }

    function revertTeleportBurn(address to, uint256 id, uint256 value) public virtual receiveMethod {
        _burn(to, id, value);
    }
    /**
     * @notice Unlocks the locked funds and calls transfer
     * @param to Address of a "to" account to unlock the funds to
     * @param amount Amount of tokens to unlock
     */

    function unlock(address to, uint256 id, uint256 amount, bytes memory data) external returns (bool) {
        if (to != owner()) {
            bool success = _unlock(to, id, amount);
            require(success, "cannot unlock the assets");
            _safeTransferFrom(owner(), to, id, amount, data);
        }
        return true;
    }

    function _lock(address to, uint256 id, uint256 amount) internal {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0));
        lockedAmount[to][id] += amount;
    }

    function _unlock(address to, uint256 id, uint256 amount) internal returns (bool) {
        require(to != address(0));
        uint256 amountToUnlock = lockedAmount[to][id];
        require(amount > 0 && amount <= amountToUnlock, "Not enough funds to unlock");
        lockedAmount[to][id] -= amount;
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
                    name: name,
                    symbol: name,
                    issuerChainId: endpoint.getChainId(),
                    bytecode: address(this).code,
                    initializerParams: _generateInitializerParams(),
                    isFungible: false,
                    ercStandard: SharedObjects.ErcStandard.ERC1155,
                    totalSupply: abi.encode(totalSupply()),
                    isCustom: isCustom,
                    storageSlot: _storageSlot
                })
            )
        );
    }

    function _generateInitializerParams() internal view virtual returns (bytes memory) {
        return abi.encodeWithSignature("initialize(string,string)", _uri, name);
    }

    function getLockedAmount(address account, uint256 id) public view returns (uint256) {
        return lockedAmount[account][id];
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
     * @param amount The amount of tokens to update.
     */
    function _submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 id, uint256 amount) internal {
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
                abi.encode(SharedObjects.ERC1155Supply({id: id, amount: amount}))
            )
        );
    }

    function submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 id, uint256 amount)
        public
        virtual
        onlyOwner
    {
        _submitTokenUpdate(updateType, id, amount);
    }

    /**
     * Overrides
     */
    function totalSupply() private view returns (SharedObjects.ERC1155Supply[] memory) {
        SharedObjects.ERC1155Supply[] memory supplies = new SharedObjects.ERC1155Supply[](_allTokens.length);
        for (uint256 i = 0; i < _allTokens.length; i++) {
            supplies[i] = SharedObjects.ERC1155Supply({id: _allTokens[i], amount: _totalSupply[_allTokens[i]]});
        }
        return supplies;
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param id The id of the token to mint.
     * @param value The amount of tokens to mint.
     * @param data Additional data to pass to the minted token.
     */
    function mint(address to, uint256 id, uint256 value, bytes memory data) public virtual onlyOwner {
        _mint(to, id, value, data);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, id, value);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param from The address from which the tokens will be burned.
     * @param id The id of the token to burn.
     * @param value The amount of tokens to burn.
     */
    function burn(address from, uint256 id, uint256 value) public virtual onlyOwner {
        _burn(from, id, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, id, value);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory amounts)
        internal
        virtual
        override
    {
        super._update(from, to, ids, amounts);

        // Minting tokens
        if (from == address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                uint256 amount = amounts[i];

                _totalSupply[id] += amount;
                if (!_exists[id]) {
                    _allTokens.push(id);
                    _exists[id] = true;
                }
            }
        }

        // Burning tokens
        if (to == address(0)) {
            for (uint256 i = 0; i < ids.length; ++i) {
                uint256 id = ids[i];
                uint256 amount = amounts[i];

                _totalSupply[id] -= amount;
                if (_totalSupply[id] == 0) {
                    _exists[id] = false;
                    // Remove the id from _allTokens array
                    for (uint256 j = 0; j < _allTokens.length; j++) {
                        if (_allTokens[j] == id) {
                            _allTokens[j] = _allTokens[_allTokens.length - 1];
                            _allTokens.pop();
                            break;
                        }
                    }
                }
            }
        }
    }
}
