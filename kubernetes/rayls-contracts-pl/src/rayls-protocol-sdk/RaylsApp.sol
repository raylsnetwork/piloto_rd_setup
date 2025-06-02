// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRaylsEndpoint.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./RaylsMessage.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./libraries/MessageLib.sol";

abstract contract RaylsApp {
    //The Rayls endpoint associated the given RaylsApp
    IRaylsEndpoint internal endpoint;
    bytes32 public resourceId;

    /**
     * @dev Constructor to initialize the RaylsCore with the provided endpoint and owner.
     * @param _endpoint The address of the Rayls endpoint.
     */
    constructor(address _endpoint) {
        endpoint = IRaylsEndpoint(_endpoint);
    }

    /**
     * @dev Get the address of the implementation of the resource.
     * @param _resourceId The resourceId of the RaylsApp.
     */
    function getAddressByResourceId(
        bytes32 _resourceId
    ) external view returns (address) {
        return endpoint.getAddressByResourceId(_resourceId);
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.send() for sending a message.
     * @param _dstChainId The destination endpoint ID.
     * @param _destination The destination address.
     * @param _payload payload of message.
     */
    function _raylsSend(
        uint256 _dstChainId,
        address _destination,
        bytes memory _payload
    ) internal virtual {
        endpoint.send(_dstChainId, _destination, _payload);
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.sendBatch() for sending multiple messages.
     * @param _destinationPayloadRequests The payloads to send to the destination contract.
     */
    function _raylsSendBatch(
        DestinationPayloadRequest[] calldata _destinationPayloadRequests
    ) internal virtual {
        endpoint.sendBatch(_destinationPayloadRequests);
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.send() for sending a message.
     * @param _dstChainId The destination endpoint ID.
     * @param _resourceId The id of the resource.
     * @param _payload payload of message.
     */
    function _raylsSendToResourceId(
        uint256 _dstChainId,
        bytes32 _resourceId,
        bytes memory _payload
    ) internal virtual {
        endpoint.sendToResourceId(
            _dstChainId,
            _resourceId,
            _payload
        );
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.sendBatchToResourceId() for sending multiple messages.
     * @param _resourceIdPayloadRequests The verified payloads to send to the destination contract.
     */
    function _raylsSendBatchToResourceId(
        ResourceIdPayloadRequest[] memory _resourceIdPayloadRequests
    ) internal virtual {
        endpoint.sendBatchToResourceId(
            _resourceIdPayloadRequests
        );
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.send() for sending a message.
     * @param _dstChainId The destination endpoint ID.
     * @param _resourceId The id of the resource.
     * @param _payload payload of message.
     * @param _lockData The lockData
     * @param _revertDataPayloadSender The revertData for the sender chainId
     * @param _revertDataPayloadReceiver The revertData for the receiver chainId
     */
    function _raylsSendToResourceId(
        uint256 _dstChainId,
        bytes32 _resourceId,
        bytes memory _payload,
        bytes memory _lockData,
        bytes memory _revertDataPayloadSender,
        bytes memory _revertDataPayloadReceiver,
        BridgedTransferMetadata memory transferMetadata
    ) internal virtual {
        endpoint.sendToResourceId(
            _dstChainId,
            _resourceId,
            _payload,
            _lockData,
            _revertDataPayloadSender,
            _revertDataPayloadReceiver,
            transferMetadata
        );
    }

    /**
     * @dev Internal function to interact with the Rayls Endpoint.sendBatchToResourceId() for sending multiple messages.
     * @param _resourceIdPayloadRequests The verified payloads to send to the destination contract.
    */
    function _raylsSendBatchToResourceId(
        ResourceIdCompletePayloadRequest[] memory _resourceIdPayloadRequests
    ) internal virtual {
        endpoint.sendBatchToResourceId(
            _resourceIdPayloadRequests
        );
    }

    /**
     * @dev Internal function to associate the resourceId with the contracts address
     */
    function _registerResourceId() internal virtual {
        require(
            resourceId != bytes32(0),
            "Only register resource when it's approved"
        );
        endpoint.registerResourceId(resourceId, address(this));
    }

    /**
     * @dev Extracts the resourceId, a 32 bytes type, from the call data during contract initialization.
     * Only works on contract initialization method when a resource is deploying.
     * This method assumes the resourceId is located at the end of the call data.
     *
     * @return _resourceId The extracted resourceId from the initialization call data. Returns
     * a zero value if the call data is not long enough to include this information.
     */
    function _getResourceIdOnInitialize()
        internal
        pure
        returns (bytes32 _resourceId)
    {
        if (msg.data.length >= 32) {
            assembly {
                _resourceId := calldataload(sub(calldatasize(), 32))
            }
        }
    }

    /**
     * @dev Extracts the owner's address from the call data during contract initialization.
     * Only works on contract initialization method when endpoint is deploying the resource.
     *
     * @return _owner The extracted owner address from the initialization call data. Returns the
     * zero address if the call data is not long enough to include an address.
     */
    function _getOwnerAddressOnInitialize()
        internal
        pure
        returns (address _owner)
    {
        if (msg.data.length >= 52) {
            assembly {
                _owner := shr(96, calldataload(sub(calldatasize(), 52)))
            }
        }
    }

    /**
     * @dev Extracts the Endpoint's address from the call data during contract initialization.
     * Only works on contract initialization method when endpoint is deploying the resource.
     *
     * @return _endpoint The extracted Endpoint address from the initialization call data. Returns
     * the zero address if the call data is not long enough to include this information.
     */
    function _getEndpointAddressOnInitialize()
        internal
        pure
        returns (address _endpoint)
    {
        if (msg.data.length >= 72) {
            assembly {
                _endpoint := shr(96, calldataload(sub(calldatasize(), 72)))
            }
        }
    }

    modifier receiveMethod() {
        require(
            endpoint.isTrustedExecutor(msg.sender),
            "This is a receive method. Only endpoint's executor can call this method."
        );
        _;
    }

    modifier onlyFromCommitChain() {
        require(
            _getFromChainIdOnReceiveMethod() == endpoint.getCommitChainId(),
            "This method only receive calls from commit chain."
        );
        _;
    }

    /**
     * @notice Retrieve messageId from message data. Only works on receive methods being called by
     * Endpoint when receiving cross-chain call.
     * @return _msgDataMessageId ID uniquely identifying the message that was executed
     */
    function _getMessageIdOnReceiveMethod()
        internal
        pure
        returns (bytes32 _msgDataMessageId)
    {
        _msgDataMessageId;

        if (msg.data.length >= 84) {
            assembly {
                _msgDataMessageId := calldataload(sub(calldatasize(), 84))
            }
        }
    }

    /**
     * @notice Retrieve fromChainId from message data. Only works on receive methods being called by
     * Endpoint when receiving cross-chain call.
     * @return _msgDataFromChainId ID of the chain that dispatched the messages
     */
    function _getFromChainIdOnReceiveMethod()
        internal
        pure
        returns (uint256 _msgDataFromChainId)
    {
        _msgDataFromChainId;

        if (msg.data.length >= 52) {
            assembly {
                _msgDataFromChainId := calldataload(sub(calldatasize(), 52))
            }
        }
    }

    /**
     * @notice Retrieve signer address from message data. Only works on receive methods being called by
     * Endpoint when receiving cross-chain call.
     * @return _signer Address of the signer
     */
    function _getMsgSenderOnReceiveMethod()
        internal
        view
        returns (address payable _signer)
    {
        _signer = payable(msg.sender);

        if (msg.data.length >= 20) {
            assembly {
                _signer := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        }
    }

    /**
     * @dev Update the endpoint.
     *
     */
    function _updateEndpoint(address _endpoint) public virtual {
        endpoint = IRaylsEndpoint(_endpoint);
    }

    /**
     * @dev Get the endpoint address.
     * @return _endpoint Address of the endpoint.
     *
     */
    function _getEndpointAddress() public view virtual returns (address) {
        return address(endpoint);
    }
}
