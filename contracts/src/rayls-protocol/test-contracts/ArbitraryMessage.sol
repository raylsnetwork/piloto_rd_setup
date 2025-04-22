// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../rayls-protocol-sdk/RaylsApp.sol';
import '../../rayls-protocol-sdk/Constants.sol';

contract ArbitraryMessage is RaylsApp {
    string public msgA;
    string public msgB;
    string public msgC;
    string public msgD;
    string public multiple;
    string public all;
    uint256 public count = 0;

    BridgedTransferMetadata private emptyMetadata;

    constructor(bytes32 _resourceId, address _endpoint) RaylsApp(_endpoint) {
        resourceId = _resourceId;
        _registerResourceId();
    }

    function send1Message(string memory message, uint256 destChainId) public {
        _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveMsgA.selector, message), '', '', '', emptyMetadata);
    }

    function send1IncreaseCount(uint256 destChainId) public {
        _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveIncreaseCount.selector), '', '', '', emptyMetadata);
    }

    function sendMultipleIncreaseCount(uint256 destChainId, uint256 times) public {
        for (uint256 i = 0; i < times; i++) {
            _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveIncreaseCount.selector), '', '', '', emptyMetadata);
        }
    }

    function send3Messages(string memory messageB, string memory messageC, string memory messageD, uint256 destChainId) public {
        _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveMsgB.selector, messageB), '', '', '', emptyMetadata);
        _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveMsgC.selector, messageC), '', '', '', emptyMetadata);
        _raylsSendToResourceId(destChainId, resourceId, abi.encodeWithSelector(this.receiveMsgD.selector, messageD), '', '', '', emptyMetadata);
    }

    function send3MessagesToDifferentChainIds(string memory messageB, string memory messageC, string memory messageD, uint256 destChainIdB, uint256 destChainIdC, uint256 destChainIdD) public {
        _raylsSendToResourceId(destChainIdB, resourceId, abi.encodeWithSelector(this.receiveMsgB.selector, messageB), '', '', '', emptyMetadata);
        _raylsSendToResourceId(destChainIdC, resourceId, abi.encodeWithSelector(this.receiveMsgC.selector, messageC), '', '', '', emptyMetadata);
        _raylsSendToResourceId(destChainIdD, resourceId, abi.encodeWithSelector(this.receiveMsgD.selector, messageD), '', '', '', emptyMetadata);
    }

    function sendToMultipleParticipants(string calldata message, uint256[] calldata chainIds) public {
        for (uint256 i = 0; i < chainIds.length; i++) {
            _raylsSendToResourceId(chainIds[i], resourceId, abi.encodeWithSelector(this.receiveMsgMultiple.selector, message));
        }
    }

    function sendToAllParticipants(string calldata message) public {
        _raylsSendToResourceId(Constants.CHAIN_ID_ALL_PARTICIPANTS, resourceId, abi.encodeWithSelector(this.receiveMsgAll.selector, message));
    }

    function receiveMsgA(string memory _msgA) public {
        msgA = _msgA;
    }

    function receiveMsgB(string memory _msgB) public {
        msgB = _msgB;
    }

    function receiveMsgC(string memory _msgC) public {
        msgC = _msgC;
    }

    function receiveMsgD(string memory _msgD) public {
        msgD = _msgD;
    }

    function receiveIncreaseCount() public {
        count = count + 1;
    }

    function receiveMsgMultiple(string memory _multiple) public {
        multiple = _multiple;
    }

    function receiveMsgAll(string memory _all) public {
        all = _all;
    }
}
