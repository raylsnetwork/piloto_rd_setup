// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";

contract Erc20BatchTeleport is RaylsErc20Handler {

  constructor(
    string memory _name,
    string memory _symbol,
    address _endpoint
  ) RaylsErc20Handler(
    _name,
    _symbol,
    _endpoint,
    msg.sender,
    false
  ) {}

  struct BatchTeleportPayloadRequest {
    address to;
    uint256 value; 
    uint256 chainId;
  }

  function batchTeleport(BatchTeleportPayloadRequest[] calldata _batchTeleportPayloadRequests) public virtual returns (bool) {
    ResourceIdCompletePayloadRequest[] memory _resourceIdPayloadRequests = 
      new ResourceIdCompletePayloadRequest[](_batchTeleportPayloadRequests.length);
    
    for (uint256 i=0;i<_batchTeleportPayloadRequests.length;i++) {
      BatchTeleportPayloadRequest calldata request = _batchTeleportPayloadRequests[i];

      _burn(msg.sender, request.value);

      BridgedTransferMetadata memory transferMetadata = BridgedTransferMetadata({
        assetType: RaylsBridgeableERC.ERC20,
        id: 0,
        from: msg.sender,
        tokenAddress: address(this),
        to: request.to,
        amount: request.value
      });

      _resourceIdPayloadRequests[i] = ResourceIdCompletePayloadRequest({
        _dstChainId: request.chainId,
        _resourceId: resourceId, 
        _payload: abi.encodeWithSignature("receiveTeleport(address,uint256)", request.to, request.value),
        _lockData: bytes(""),
        _revertDataSender: bytes(""),
        _revertDataReceiver: bytes(""),
        transferMetadata: transferMetadata
      });
    }

    sendBatchTeleport(_resourceIdPayloadRequests);

    return true;
  }


  function batchTeleportAtomic(BatchTeleportPayloadRequest[] calldata _batchTeleportPayloadRequests) public virtual returns (bool) {
    ResourceIdCompletePayloadRequest[] memory _resourceIdPayloadRequests = 
      new ResourceIdCompletePayloadRequest[](_batchTeleportPayloadRequests.length);
    
    for (uint256 i=0;i<_batchTeleportPayloadRequests.length;i++) {
      BatchTeleportPayloadRequest calldata request = _batchTeleportPayloadRequests[i];

      _burn(msg.sender, request.value);

      BridgedTransferMetadata memory transferMetadata = BridgedTransferMetadata({
        assetType: RaylsBridgeableERC.ERC20,
        id: 0,
        from: msg.sender,
        to: request.to,
        tokenAddress: address(this),
        amount: request.value
      });

      _resourceIdPayloadRequests[i] = ResourceIdCompletePayloadRequest({
        _dstChainId: request.chainId,
        _resourceId: resourceId, 
        _payload: abi.encodeWithSignature("receiveTeleportAtomic(address,uint256)", request.to, request.value),
        _lockData: abi.encodeWithSignature("unlock(address,uint256)", request.to, request.value),
        _revertDataSender: abi.encodeWithSignature("revertTeleportMint(address,uint256)", msg.sender, request.value),
        _revertDataReceiver: abi.encodeWithSignature("revertTeleportBurn(uint256)", request.value),
        transferMetadata: transferMetadata
      });
    }

    sendBatchTeleport(_resourceIdPayloadRequests);

    return true;
  }
  

    function sendBatchTeleport(
    ResourceIdCompletePayloadRequest[] memory _resourceIdPayloadRequests
  ) internal {
    require(resourceId != bytes32(0), "Token not registered.");

    _raylsSendBatchToResourceId(_resourceIdPayloadRequests);
  }
}
