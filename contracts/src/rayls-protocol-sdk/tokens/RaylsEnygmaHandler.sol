// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RaylsApp} from '../RaylsApp.sol';
import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IRaylsEndpoint.sol';
import '../RaylsMessage.sol';

import '../libraries/SharedObjects.sol';
import '../libraries/Utils.sol';
import '../Constants.sol';

import {IEnygmaPLEvents} from '../interfaces/IEnygmaPLEvents.sol';
import '../interfaces/IEnygmaPLEvents.sol';

/*
    1. Check handler properties (name, symbol, decimals, supplies)
    2. Check minting process (from address to bank number)
    3. Check burn process (from address to bank number)
    6. Check events emitions (are all events properly emitted?)
*/

abstract contract RaylsEnygmaHandler is RaylsApp, ERC20, Initializable, Ownable {
    uint8 tokenDecimals;
    mapping(bytes32 => uint256) referenceIdsStatus;
    string tokenName;
    string tokenSymbol;
    bool isCustom;

    enum ReferenceIdStatus {
        NOSTATUS,
        SENT,
        RECEIVED
    }

    event crossTransferReferenceId(bytes32 _referenceId);

    constructor(string memory _name, string memory _symbol, address _endpoint, address _owner, uint8 _decimals, bool _isCustom) ERC20(_name, _symbol) RaylsApp(_endpoint) Ownable(_owner) {
        tokenName = _name;
        tokenSymbol = _symbol;
        tokenDecimals = _decimals;
        isCustom = _isCustom;
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, uint8 _decimals) public initializer {
        address _owner = _getOwnerAddressOnInitialize();
        address _endpoint = _getEndpointAddressOnInitialize();
        resourceId = _getResourceIdOnInitialize();

        tokenName = _name;
        tokenSymbol = _symbol;
        tokenDecimals = _decimals;

        _transferOwnership(_owner);
        endpoint = IRaylsEndpoint(_endpoint);
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param _to The address to which the new tokens will be minted.
     * @param _value The amount of tokens to mint.
     */
    function mint(address _to, uint256 _value) public virtual onlyOwner {
        _mint(_to, _value);
        IEnygmaPLEvents(getEnygmaEventsAdress()).mint(resourceId, _value);
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param _to The address to which the new tokens will be minted.
     * @param _value The amount of tokens to mint.
     * @param _reason The reason for the revert.
     */
    function crossRevertMint(address _to, uint256 _value, string memory _reason) public virtual {
        _mint(_to, _value);
        IEnygmaPLEvents(getEnygmaEventsAdress()).revertMint(resourceId, _value, _to, _reason);
    }

    /**
     * @dev Function for receive mint from Relayer.
     * @param _to The address to which the new tokens will be minted.
     * @param _value The amount of tokens to mint.
     * @param _referenceId The reference id of the mint.
     * @param _callables The callables is an array of payloads to be executed.
     */
    function crossMint(address _to, uint256 _value, bytes32 _referenceId, SharedObjects.EnygmaCrossTransferCallable[] calldata _callables) public virtual {
        referenceIdsStatus[_referenceId] = uint256(ReferenceIdStatus.RECEIVED);

        require(_callables.length < 6, "Protocol doesn't support more than 5 callables in a transfer");

        _mint(_to, _value);

        for (uint256 i = 0; i < _callables.length; ++i) {
            SharedObjects.EnygmaCrossTransferCallable memory callable = _callables[i];

            address contractAddress;

            if (callable.resourceId != bytes32('')) {
                contractAddress = IRaylsEndpoint(endpoint).getAddressByResourceId(callable.resourceId);
            } else {
                contractAddress = callable.contractAddress;
            }

            if (contractAddress != address(0)) {
                // check if contractAddress is a contract
                require(contractAddress.code.length > 0, 'Callable contract address is not a contract');
                (bool _success, ) = contractAddress.call(abi.encodePacked(callable.payload));
                if (!_success) {
                    revert('Cross mint failed while calling callables');
                }
            }
        }
    }

    function getEnygmaEventsAdress() internal virtual returns (address) {
        return endpoint.getAddressByResourceId(Constants.RESOURCE_ID_ENYGMA_PL_EVENTS);
    }

    /**
     * @dev Simplified version of crossTransfer that takes single parameters and builds arrays internally
     * @param _to The address to which tokens will be transferred
     * @param _value The amount of tokens to transfer
     * @param _toChainId The destination chain ID
     * @param _callableResourceId The resource ID for the callable (use bytes32(0) if using contractAddress)
     * @param _callableContractAddress The contract address for the callable (use address(0) if using resourceId)
     * @param _callablePayload The payload to be executed
     * @return bytes32 The reference ID of the transfer
     */
    function linearCrossTransfer(
        address _to,
        uint256 _value,
        uint256 _toChainId,
        bytes32 _callableResourceId,
        address _callableContractAddress,
        bytes calldata _callablePayload
    ) public virtual returns (bytes32) {
        address[] memory toArray = new address[](1);
        uint256[] memory valueArray = new uint256[](1);
        uint256[] memory toChainIdArray = new uint256[](1);
        SharedObjects.EnygmaCrossTransferCallable[][] memory callablesArray = new SharedObjects.EnygmaCrossTransferCallable[][](1);
        SharedObjects.EnygmaCrossTransferCallable[] memory callableArray = new SharedObjects.EnygmaCrossTransferCallable[](1);

        toArray[0] = _to;
        valueArray[0] = _value;
        toChainIdArray[0] = _toChainId;

        callableArray[0] = SharedObjects.EnygmaCrossTransferCallable({resourceId: _callableResourceId, contractAddress: _callableContractAddress, payload: _callablePayload});

        callablesArray[0] = callableArray;

        return _crossTransferFrom(msg.sender, toArray, valueArray, toChainIdArray, callablesArray);
    }

    /**
     * @dev Simplified version of crossTransferFrom that takes single parameters and builds arrays internally
     * @param _from The address from which tokens will be transferred. Requires caller to have allowance
     * @param _to The address to which tokens will be transferred
     * @param _value The amount of tokens to transfer
     * @param _toChainId The destination chain ID
     * @param _callableResourceId The resource ID for the callable (use bytes32(0) if using contractAddress)
     * @param _callableContractAddress The contract address for the callable (use address(0) if using resourceId)
     * @param _callablePayload The payload to be executed
     * @return bytes32 The reference ID of the transfer
     */
    function linearCrossTransferFrom(
        address _from,
        address _to,
        uint256 _value,
        uint256 _toChainId,
        bytes32 _callableResourceId,
        address _callableContractAddress,
        bytes calldata _callablePayload
    ) public virtual returns (bytes32) {
        address[] memory toArray = new address[](1);
        uint256[] memory valueArray = new uint256[](1);
        uint256[] memory toChainIdArray = new uint256[](1);
        SharedObjects.EnygmaCrossTransferCallable[][] memory callablesArray = new SharedObjects.EnygmaCrossTransferCallable[][](1);
        SharedObjects.EnygmaCrossTransferCallable[] memory callableArray = new SharedObjects.EnygmaCrossTransferCallable[](1);

        toArray[0] = _to;
        valueArray[0] = _value;
        toChainIdArray[0] = _toChainId;

        callableArray[0] = SharedObjects.EnygmaCrossTransferCallable({resourceId: _callableResourceId, contractAddress: _callableContractAddress, payload: _callablePayload});

        callablesArray[0] = callableArray;

        _spendAllowance(_from, msg.sender, _value);

        return _crossTransferFrom(_from, toArray, valueArray, toChainIdArray, callablesArray);
    }

    /**
     * @notice Cross transfers tokens to another chain.
     * @param _to The recipient addresses on the destination chain.
     * @param _value The amounts of tokens to transfer.
     * @param _toChainId The destination chain IDs.
     * @param _callables The callable objects to be executed on the destination chain.
     * @return bytes32 The reference ID of the cross transfer.
     * @dev This function is called by the user to initiate a cross transfer. It constructs the callable objects and calls `_crossTransferFrom` to execute the transfer. The callable objects are used to execute specific actions on the destination chain after the tokens have been transferred.
     */
    function crossTransfer(
        address[] memory _to,
        uint256[] memory _value,
        uint256[] memory _toChainId,
        SharedObjects.EnygmaCrossTransferCallable[][] memory _callables
    ) public virtual returns (bytes32) {
        return _crossTransferFrom(msg.sender, _to, _value, _toChainId, _callables);
    }

    /**
     * @notice Cross transfers tokens from a specified address.
     * @param _from The sender's address on the source chain.
     * @param _to The recipient addresses on the destination chain.
     * @param _value The amounts of tokens to transfer.
     * @param _toChainId The destination chain IDs.
     * @param _callables The callable objects for the destination chain.
     * @return bytes32 The reference ID for the cross transfer.
     */
    function _crossTransferFrom(
        address _from,
        address[] memory _to,
        uint256[] memory _value,
        uint256[] memory _toChainId,
        SharedObjects.EnygmaCrossTransferCallable[][] memory _callables
    ) private returns (bytes32) {
        require(_to.length == _value.length && _to.length == _toChainId.length && _to.length == _callables.length, 'Array lengths must match');
        require(_to.length < 6, "Protocol doesn't support transfers to more than 5 participants");
        require(_to.length > 0, 'Minimum length of input arrays is 1.');

        // Validate that there are no more than 5 _callables per transfer
        for (uint256 i = 0; i < _callables.length; ++i) {
            uint256 len = _callables[i].length;
            require(len < 6, "Protocol doesn't support more than 5 callables in a transfer");

            // Validate that each callable either has a contract address or a resourceId.
            for (uint256 j = 0; j < len; ++j) {
                // if (resourceId != 0 && contractAddress != 0) -> revert
                require(_callables[i][j].resourceId == bytes32(0) || _callables[i][j].contractAddress == address(0), 'Cannot specify both a resourceId and a contractAddress for a callable.');
            }
        }

        uint256 totalToSend = 0;
        for (uint256 i = 0; i < _to.length; i++) {
            totalToSend = totalToSend + _value[i];

            BridgedTransferMetadata memory transferMetadata = BridgedTransferMetadata({
                assetType: RaylsBridgeableERC.ERC20,
                id: 0,
                from: _from,
                to: _to[i],
                tokenAddress: address(this),
                amount: _value[i]
            });

            sendCrossTransferCheck(_toChainId[i], abi.encodeWithSignature('crossTransferCheck()'), bytes(''), bytes(''), bytes(''), transferMetadata);
        }

        _burn(_from, totalToSend);

        bytes32 _referenceId = MessageLib.computeEnygmaReferenceId(endpoint.getChainId(), _from, _toChainId, _to, abi.encode(block.number));
        referenceIdsStatus[_referenceId] = uint256(ReferenceIdStatus.SENT);

        CCTransfer memory ccTransfer = CCTransfer(resourceId, _value, _toChainId, _to, _callables, _from, _referenceId);
        IEnygmaPLEvents(getEnygmaEventsAdress()).transferToCC(ccTransfer);

        emit crossTransferReferenceId(_referenceId);

        return _referenceId;
    }

    /**
     * @notice Cross transfer tokens from a specified address to multiple recipients on different chains.
     * @param _from The address sending the tokens. Requires caller to have allowance
     * @param _to The addresses receiving the tokens.
     * @param _value The amounts of tokens being sent.
     * @param _toChainId The chain IDs of the recipients.
     * @param _callables Callables for each recipient.
     * @return bytes32 A reference ID for the cross transfer.
     */
    function crossTransferFrom(
        address _from,
        address[] memory _to,
        uint256[] memory _value,
        uint256[] memory _toChainId,
        SharedObjects.EnygmaCrossTransferCallable[][] memory _callables
    ) public virtual returns (bytes32) {
        address spender = msg.sender;

        for (uint256 i = 0; i < _to.length; ++i) {
            _spendAllowance(_from, spender, _value[i]);
        }

        return _crossTransferFrom(_from, _to, _value, _toChainId, _callables);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param from The address from which the tokens will be burned.
     * @param value The amount of tokens to burn.
     */
    function burn(address from, uint256 value) public virtual onlyOwner {
        _burn(from, value);
        IEnygmaPLEvents(getEnygmaEventsAdress()).burn(resourceId, value);
    }

    function receiveResourceId(bytes32 _resourceId) public virtual receiveMethod onlyFromCommitChain {
        resourceId = _resourceId;
        _registerResourceId();

        IEnygmaPLEvents(getEnygmaEventsAdress()).creation(resourceId);
    }

    function submitTokenRegistration(uint8 _storageSlot) public virtual {
        _raylsSend(
            endpoint.getCommitChainId(),
            endpoint.getCommitChainAddress('TokenRegistry'),
            abi.encodeWithSignature(
                'addToken((string,string,bytes,uint256,bytes,bytes,bool,uint8,bool,uint8))',
                SharedObjects.TokenRegistrationData({
                    name: name(),
                    symbol: symbol(),
                    totalSupply: abi.encode(totalSupply()),
                    issuerChainId: endpoint.getChainId(),
                    bytecode: address(this).code,
                    initializerParams: _generateInitializerParams(),
                    isFungible: true,
                    ercStandard: SharedObjects.ErcStandard.Enygma,
                    isCustom: isCustom,
                    storageSlot: _storageSlot
                })
            )
        );
    }

    function _generateInitializerParams() internal view virtual returns (bytes memory) {
        return abi.encodeWithSignature('initialize(string,string,uint8)', name(), symbol(), tokenDecimals);
    }

    /**
     * @dev Returns the name of the token.
     * Overrided method to allow erc20 to be initializable
     */

    function name() public view virtual override returns (string memory) {
        return tokenName;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     * Overrided method to allow erc20 to be initializable
     */
    function symbol() public view virtual override returns (string memory) {
        return tokenSymbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return tokenDecimals;
    }

    function crossTransferCheck() public virtual receiveMethod {}

    function sendCrossTransferCheck(
        uint256 _chainId,
        bytes memory _payload,
        bytes memory _lockDataPayload,
        bytes memory _revertDataPayloadSender,
        bytes memory _revertDataPayloadReceiver,
        BridgedTransferMetadata memory transferMetadata
    ) internal {
        require(resourceId != bytes32(0), 'Token not registered.');

        _raylsSendToResourceId(_chainId, resourceId, _payload, _lockDataPayload, _revertDataPayloadSender, _revertDataPayloadReceiver, transferMetadata);
    }

    function referenceIdStatusUint(bytes32 _referenceID) public view virtual returns (uint256) {
        return referenceIdsStatus[_referenceID];
    }

    function referenceIdStatus(bytes32 _referenceID) public view virtual returns (ReferenceIdStatus) {
        return ReferenceIdStatus(referenceIdsStatus[_referenceID]);
    }
}
