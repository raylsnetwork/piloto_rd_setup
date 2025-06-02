// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/RaylsApp.sol";

contract BatchTransfer is RaylsApp {
  event LogSend2MessagesPayload(bytes payloadA, bytes payloadB);

  string public messageA;
  string public messageB;
  string[] public messages;
  uint256 public messagesAmount;

  constructor(bytes32 _resourceId, address _endpoint) RaylsApp(_endpoint) {
    resourceId = _resourceId;
    _registerResourceId();
    messagesAmount = 0;
  }
  
  function generateSend2MessagesPayloads(string memory msgA, string memory msgB) public {
    bytes memory payloadA = abi.encodeWithSelector(this.receiveMessageA.selector, msgA);
    bytes memory payloadB = abi.encodeWithSelector(this.receiveMessageB.selector, msgB);

    emit LogSend2MessagesPayload(payloadA, payloadB);
  }

  function send2MessagesV1(string memory msgA, string memory msgB, uint256 destChainId, bytes32 _resourceId) public {
    _raylsSendToResourceId(
      destChainId,
      _resourceId,
      abi.encodeWithSelector(this.receiveMessageA.selector, msgA)
    );

    _raylsSendToResourceId(
      destChainId,
      _resourceId,
      abi.encodeWithSelector(this.receiveMessageB.selector, msgB)
    );
  }

  function send2MessagesV2(string memory msgA, string memory msgB, ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) public {
    _raylsSendToResourceId(
      _resourceIdPayloadRequests[0]._dstChainId,
      _resourceIdPayloadRequests[0]._resourceId,
      abi.encodeWithSelector(this.receiveMessageA.selector, msgA)
    );

    _raylsSendToResourceId(
      _resourceIdPayloadRequests[1]._dstChainId,
      _resourceIdPayloadRequests[1]._resourceId,
      abi.encodeWithSelector(this.receiveMessageB.selector, msgB)
    );
  }

  function send2MessagesV3(string memory msgA, string memory msgB, ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) public {
    _raylsSendToResourceId(
      _resourceIdPayloadRequests[0]._dstChainId,
      _resourceIdPayloadRequests[0]._resourceId,
      abi.encodeWithSignature("receiveMessageA(string)", msgA)
    );

    _raylsSendToResourceId(
      _resourceIdPayloadRequests[1]._dstChainId,
      _resourceIdPayloadRequests[1]._resourceId,
      abi.encodeWithSignature("receiveMessageB(string)", msgB)
    );
  }

  function send2MessagesV4(ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) public {
    _raylsSendToResourceId(
      _resourceIdPayloadRequests[0]._dstChainId,
      _resourceIdPayloadRequests[0]._resourceId,
      _resourceIdPayloadRequests[0]._payload
    );

    _raylsSendToResourceId(
      _resourceIdPayloadRequests[1]._dstChainId,
      _resourceIdPayloadRequests[1]._resourceId,
      _resourceIdPayloadRequests[1]._payload
    );
  }

  function send2MessagesV5(ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) public {
    _raylsSendBatchToResourceId(
      _resourceIdPayloadRequests
    );
  }

  function sendManyMessages(ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) public {
    _raylsSendBatchToResourceId(
      _resourceIdPayloadRequests
    );
  }

  function receiveMessageA(string memory _messageA) public {
    messageA = _messageA;
  }

  function receiveMessageB(string memory _messageB) public {
    messageB = _messageB;
  }

  function receiveMessage(string memory _message) public {
    messages.push(_message);
    messagesAmount++;
  }

  function getMessages() public view returns (string[] memory) {
    return messages;
  }
}
