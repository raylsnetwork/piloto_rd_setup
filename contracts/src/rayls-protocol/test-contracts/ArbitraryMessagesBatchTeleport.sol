// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";

contract ArbitraryMessagesBatchTeleport is RaylsApp {
  string[] messages;
  uint8 messagesCount;

  constructor(bytes32 _resourceId, address _endpoint) RaylsApp(_endpoint) {
    resourceId = _resourceId;
    _registerResourceId();
  }

  function getMessages() public view returns (string[] memory) {
    return messages;
  }

  function getMessagesCount() public view returns (uint8) {
    return messagesCount;
  }
  
  function addMessage(string calldata message) public {
    messages.push(message);
    messagesCount++;
  }

  struct BatchTeleportPayloadRequest {
    bytes32 resourceId;
    string message; 
    uint256 chainId;
  }

  function batchTeleport(BatchTeleportPayloadRequest[] calldata _batchTeleportPayloadRequests) public virtual returns (bool) {
    ResourceIdPayloadRequest[] memory _resourceIdPayloadRequests = 
      new ResourceIdPayloadRequest[](_batchTeleportPayloadRequests.length);
    
    for (uint256 i=0;i<_batchTeleportPayloadRequests.length;i++) {
      BatchTeleportPayloadRequest calldata request = _batchTeleportPayloadRequests[i];

      _resourceIdPayloadRequests[i] = ResourceIdPayloadRequest({
        _dstChainId: request.chainId,
        _resourceId: request.resourceId, 
        _payload: abi.encodeWithSignature("addMessage(string)", request.message)
      });
    }

    _raylsSendBatchToResourceId(_resourceIdPayloadRequests);

    return true;
  }
}
