// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import './../utils/RaylsReentrancyGuardV1.sol';
import '../../rayls-protocol-sdk/libraries/MessageLib.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

contract RaylsMessageExecutorV1 is Initializable, IRaylsMessageExecutor, RaylsReentrancyGuardV1, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public chainId;

    /**
     * @notice Mapping to uniquely identify the messages that were executed
     *         messageId => boolean
     * @dev Ensure that messages cannot be replayed once they have been executed.
     */
    mapping(bytes32 => bool) public executed;

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        RaylsReentrancyGuardV1.initialize();
        chainId = block.chainid;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function executeMessage(address to, bytes calldata data, bytes32 messageId, uint256 fromChainId, address from) external virtual override {
        bool _executedMessageId = executed[messageId];
        executed[messageId] = true;
            
        MessageLib.executeMessage(to, data, messageId, fromChainId, from, _executedMessageId);
         
        emit MessageIdExecuted(fromChainId, messageId);
    }

    function executeMessageBatch(MessageLib.Message[] calldata messages, bytes32 messageId, uint256 fromChainId, address from) external virtual override {
        bool _executedMessageId = executed[messageId];
        executed[messageId] = true;

        MessageLib.executeMessageBatch(messages, messageId, fromChainId, from, _executedMessageId);

        emit MessageIdExecuted(fromChainId, messageId);
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
