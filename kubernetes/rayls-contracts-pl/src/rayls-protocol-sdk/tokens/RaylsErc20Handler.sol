// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RaylsApp} from "../RaylsApp.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRaylsEndpoint.sol";
import "../RaylsMessage.sol";
import "../libraries/SharedObjects.sol";
import "../libraries/Utils.sol";

abstract contract RaylsErc20Handler is RaylsApp, ERC20, Initializable, Ownable {
    string tokenName;
    string tokenSymbol;
    bool isCustom;
    uint8 internalDecimals;
    mapping(address => uint256) lockedAmount;
    /**
     * @dev Constructor to initialize the RaylsCore with the provided endpoint and owner.
     * @param _endpoint The address of the Rayls endpoint.
     * @param _owner The address of the owner of the RaylsCore.
     */

    constructor(string memory _name, string memory _symbol, address _endpoint, address _owner, bool _isCustom)
        ERC20(_name, _symbol)
        RaylsApp(_endpoint)
        Ownable(_owner)
    {
        tokenName = _name;
        tokenSymbol = _symbol;
        isCustom = _isCustom;        
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, uint8 _decimals) public virtual initializer {
        address _owner = _getOwnerAddressOnInitialize();
        address _endpoint = _getEndpointAddressOnInitialize();
        resourceId = _getResourceIdOnInitialize();
        // ERC20 initizalization
        tokenName = _name;
        tokenSymbol = _symbol;        
        // RaylsApp Initialization
        _transferOwnership(_owner);
        endpoint = IRaylsEndpoint(_endpoint);
        internalDecimals = _decimals;
    }
    /**
     * @dev Returns the name of the token.
     * Overrided method to allow erc20 to be initializable
     */

    function name() public view override returns (string memory) {
        return tokenName;
    }

    /**
     * @dev Submit a token balance update to the CommitChain.
     * @param updateType The type of update Mint or Burn
     * @param amount The amount of tokens to update.
     */
    function submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 amount) public virtual onlyOwner {
        _submitTokenUpdate(updateType, amount);
    }

    /**
     * @dev Internal function to submit a token balance update to the CommitChain. This function encodes a function call to the TokenRegistry contract.
     * @param updateType The type of update Mint or Burn
     * @param amount The amount of tokens to update.
     */
    function _submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 amount) internal {
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
                abi.encode(amount)
            )
        );
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     * Overrided method to allow erc20 to be initializable
     */
    function symbol() public view override returns (string memory) {
        return tokenSymbol;
    }

    function teleport(address to, uint256 value, uint256 chainId) public virtual returns (bool) {
        _burn(msg.sender, value);

        BridgedTransferMetadata memory transferMetadata = BridgedTransferMetadata({
            assetType: RaylsBridgeableERC.ERC20,
            id: 0,
            from: msg.sender,
            tokenAddress: address(this),
            to: to,
            amount: value
        });

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleport(address,uint256)", to, value),
            bytes(""),
            bytes(""),
            bytes(""),
            transferMetadata
        );
        return true;
    }

    function teleportFrom(address from, address to, uint256 value, uint256 chainId) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _burn(from, value);

        BridgedTransferMetadata memory transferMetadata =
            BridgedTransferMetadata({assetType: RaylsBridgeableERC.ERC20, id: 0, from: from, to: to, amount: value, tokenAddress: address(this)});

        sendTeleport(
            chainId,
            abi.encodeWithSignature("receiveTeleport(address,uint256)", to, value),
            bytes(""),
            bytes(""),
            bytes(""),
            transferMetadata
        );

        return true;
    }

    function teleportAtomic(address to, uint256 value, uint256 destinationChainId) public virtual returns (bool) {
        _burn(msg.sender, value);

        BridgedTransferMetadata memory transferMetadata = BridgedTransferMetadata({
            assetType: RaylsBridgeableERC.ERC20,
            id: 0,
            from: msg.sender,
            to: to,
            tokenAddress: address(this),
            amount: value
        });

        sendTeleport(
            destinationChainId,
            abi.encodeWithSignature("receiveTeleportAtomic(address,uint256)", to, value),
            abi.encodeWithSignature("unlock(address,uint256)", to, value),
            abi.encodeWithSignature("revertTeleportMint(address,uint256)", msg.sender, value),
            abi.encodeWithSignature("revertTeleportBurn(uint256)", value),
            transferMetadata
        );
        return true;
    }

    function teleportAtomicFrom(address from, address to, uint256 value, uint256 destinationChainId)
        public
        virtual
        returns (bool)
    {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _burn(from, value);

        BridgedTransferMetadata memory transferMetadata =
            BridgedTransferMetadata({assetType: RaylsBridgeableERC.ERC20, id: 0, from: from, to: to, amount: value, tokenAddress: address(this)});

        sendTeleport(
            destinationChainId,
            abi.encodeWithSignature("receiveTeleportAtomic(address,uint256)", to, value),
            abi.encodeWithSignature("unlock(address,uint256)", to, value),
            abi.encodeWithSignature("revertTeleportMint(address,uint256)", from, value),
            abi.encodeWithSignature("revertTeleportBurn(uint256)", value),
            transferMetadata
        );
        return true;
    }

    function receiveTeleport(address to, uint256 value) public virtual receiveMethod {
        _mint(to, value);
    }

    function receiveTeleportAtomic(address to, uint256 value) public virtual receiveMethod {
        _mint(owner(), value);
        if (to != owner()) {
            _lock(to, value);
        }
    }

    function revertTeleportMint(address to, uint256 value) public virtual receiveMethod {
        _mint(to, value);
    }

    function revertTeleportBurn(uint256 value) public virtual receiveMethod {
        _burn(owner(), value);
    }

    function receiveResourceId(bytes32 _resourceId) public virtual receiveMethod onlyFromCommitChain {
        resourceId = _resourceId;
        _registerResourceId();
    }

    // here
    function submitTokenRegistration(uint8 _storageSlot) public virtual {
        _raylsSend(
            endpoint.getCommitChainId(),
            endpoint.getCommitChainAddress("TokenRegistry"),
            abi.encodeWithSignature(
                "addToken((string,string,bytes,uint256,bytes,bytes,bool,uint8,bool,uint8))",
                SharedObjects.TokenRegistrationData({
                    name: name(),
                    symbol: symbol(),
                    totalSupply: abi.encode(totalSupply()),
                    issuerChainId: endpoint.getChainId(),
                    bytecode: address(this).code,
                    initializerParams: _generateInitializerParams(),
                    isFungible: true,
                    ercStandard: SharedObjects.ErcStandard.ERC20,
                    isCustom: isCustom,
                    storageSlot: _storageSlot
                })
            )
        );
    }

    function _generateInitializerParams() internal virtual view returns (bytes memory) {
        return abi.encodeWithSignature("initialize(string,string,uint8)", tokenName, tokenSymbol, decimals());
    }

    /**
     * @notice Unlocks the locked funds and calls transfer
     * @param to Address of a "to" account to unlock the funds to
     * @param amount Amount of tokens to unlock
     */
    function unlock(address to, uint256 amount) external returns (bool) {
        if (to != owner()) {
            bool success = _unlock(to, amount);
            require(success, "cannot unlock the assets");
            _transfer(owner(), to, amount);
            return true;
        }
        return true;
    }

    function _lock(address to, uint256 amount) internal {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0));
        lockedAmount[to] += amount;
    }

    function _unlock(address to, uint256 amount) internal returns (bool) {
        require(to != address(0));

        uint256 amountToUnlock = lockedAmount[to];
        require(amount > 0 && amount <= amountToUnlock, "Not enough funds to unlock");

        lockedAmount[to] -= amount;

        return true;
    }

    function getLockedAmount(address account) public view returns (uint256) {
        return lockedAmount[account];
    }

    function sendTeleport(
        uint256 chainId,
        bytes memory _payload,
        bytes memory _lockDataPayload,
        bytes memory _revertDataPayloadSender,
        bytes memory _revertDataPayloadReceiver,
        BridgedTransferMetadata memory transferMetadata
    ) internal {
        require(resourceId != bytes32(0), "Token not registered.");

        _raylsSendToResourceId(
            chainId,
            resourceId,
            _payload,
            _lockDataPayload,
            _revertDataPayloadSender,
            _revertDataPayloadReceiver,
            transferMetadata
        );
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param value The amount of tokens to mint.
     */
    function mint(address to, uint256 value) public virtual onlyOwner {
        _mint(to, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, value);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param from The address from which the tokens will be burned.
     * @param value The amount of tokens to burn.
     */
    function burn(address from, uint256 value) public virtual onlyOwner {
        _burn(from, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, value);
    }

    function decimals() public virtual view override returns (uint8) {
        return internalDecimals;
    }
    
}
