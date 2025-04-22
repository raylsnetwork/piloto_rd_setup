//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import './CurveBabyJubJub.sol';
import '../../rayls-protocol-sdk/RaylsApp.sol';
import '../../rayls-protocol-sdk/Constants.sol';
import '../../rayls-protocol-sdk/libraries/SharedObjects.sol';
import '../../rayls-protocol-sdk/interfaces/IEnygmaPLEvents.sol';

contract EnygmaPLEvents is RaylsApp {
    constructor(address _endpointAddress) RaylsApp(_endpointAddress) {}

    function initialize() public {
        resourceId = Constants.RESOURCE_ID_ENYGMA_PL_EVENTS;
        endpoint.registerResourceId(resourceId, address(this)); // resource registration to receive calls from commitchain
    }

    event EnygmaMint(bytes32 _resourceId, uint256 _amount);
    event EnygmaBurn(bytes32 _resourceId, uint256 _amount);
    event EnygmaCreation(bytes32 _resourceId);
    event EnygmaTransferCC(bytes32 _resourceId, uint256[] _value, uint256[] _toChainId, address[] _to, SharedObjects.EnygmaCrossTransferCallable[][] _callables, address _from, bytes32 _referenceId);
    event EnygmaTransferPL(bytes encryptedMessage);
    event EnygmaRevertMint(bytes32 _resourceId, uint256 _amount, address _to, string _reason);

    function mint(bytes32 _resourceId, uint256 _amount) external {
        emit EnygmaMint(_resourceId, _amount);
    }

    function burn(bytes32 _resourceId, uint256 _amount) external {
        emit EnygmaBurn(_resourceId, _amount);
    }

    function creation(bytes32 _resourceId) public {
        emit EnygmaCreation(_resourceId);
    }

    function transferToCC(CCTransfer memory _ccTransfer) public {
        emit EnygmaTransferCC(_ccTransfer.resourceId, _ccTransfer.value, _ccTransfer.toChainId, _ccTransfer.to, _ccTransfer.callables, _ccTransfer.from, _ccTransfer.referenceId);
    }

    function transferToPL(bytes memory encryptedMessage) public {
        emit EnygmaTransferPL(encryptedMessage);
    }

    function transferExecuted(bytes memory encryptedMessage) public virtual receiveMethod {
        transferToPL(encryptedMessage);
    }

    function revertMint(bytes32 _resourceId, uint256 _amount, address _to, string memory _reason) public {
        emit EnygmaRevertMint(_resourceId, _amount, _to, _reason);
    }
}
