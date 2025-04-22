// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//import '../../rayls-protocol-sdk/RaylsApp.sol';
//import '../../rayls-protocol-sdk/Constants.sol';
import '../../rayls-protocol-sdk/libraries/SharedObjects.sol';

contract ArbitraryCallable {
    //bytes[] _callables;
    uint256 _n = 0;
    string _msgA = '';
    event ArbitraryCallableEvent(bytes[] payload);
    event ArbitraryCallableEvent2(SharedObjects.EnygmaCrossTransferCallable[][] payload);

    constructor() {}

    function test1(bytes[] calldata callables_) public {
        // //_callables = callables;
        // for (uint256 i = 0; i < callables.length; ++i) {
        //     emit ArbitraryCallableEvent(callables[i]);
        // }
        emit ArbitraryCallableEvent(callables_);
        SharedObjects.EnygmaCrossTransferCallable[][] memory callables;
        emit ArbitraryCallableEvent2(callables);

        _n = callables_.length;
    }

    function execute(bytes[] calldata callables_) public {
        for (uint256 j = 0; j < callables_.length; ++j) {
            // Decode bytes into an array of EnygmaCrossTransferCallable
            SharedObjects.EnygmaCrossTransferCallable[] memory callables = abi.decode(callables_[j], (SharedObjects.EnygmaCrossTransferCallable[]));

            //if (callables.lenght() > 0) {
            for (uint256 i = 0; i < callables.length; ++i) {
                SharedObjects.EnygmaCrossTransferCallable memory callable = callables[i];

                if (callable.contractAddress != address(0)) {
                    (bool _success, ) = callable.contractAddress.call(abi.encodePacked(callable.payload));
                    if (!_success) {
                        revert('Cross mint failed while calling callables');
                    }
                }
            }
        }
    }

    function executeStruct(SharedObjects.EnygmaCrossTransferCallable[] calldata callables_) public {
        for (uint256 i = 0; i < callables_.length; ++i) {
            SharedObjects.EnygmaCrossTransferCallable memory callable = callables_[i];

            address contractAddress;

            if (callable.resourceId != bytes32(0)) {
                contractAddress = address(this);
            } else {
                contractAddress = callable.contractAddress;
            }

            if (callable.contractAddress != address(0)) {
                (bool _success, ) = callable.contractAddress.call(abi.encodePacked(callable.payload));
                if (!_success) {
                    revert('Cross mint failed while calling callables');
                }
            }
        }
    }

    function receiveMsgA(string calldata a_) public {
        _msgA = a_;
    }

    function getN() public view returns (uint256) {
        return _n;
    }

    function getMsgA() public view returns (string memory) {
        return _msgA;
    }

    function buildReceiveMsgAPayload(bytes32 _destContractRId, address contractAddress, string memory msgA) public pure returns (SharedObjects.EnygmaCrossTransferCallable[] memory) {
        // instantiate array with 1 callable
        uint256 groupSize = 1;
        SharedObjects.EnygmaCrossTransferCallable[] memory group = new SharedObjects.EnygmaCrossTransferCallable[](groupSize);

        // Encoda a assinatura
        string memory funcionSignature = 'receiveMsgA(string)';
        bytes4 selector = bytes4(keccak256(bytes(funcionSignature)));

        // Encoda os parâmetros
        bytes memory payload = abi.encodeWithSelector(selector, msgA);

        // Monta o payload/callable
        SharedObjects.EnygmaCrossTransferCallable memory payloadStruct = SharedObjects.EnygmaCrossTransferCallable({resourceId: _destContractRId, contractAddress: contractAddress, payload: payload});
        group[0] = payloadStruct;
        return group;
    }

    function doCrossTransfer(bytes32 rtResourceId, address[] memory _to, uint256[] memory _value, uint256[] memory _toChainId) public {
        // in this example, only the first transfer will have a callable
        SharedObjects.EnygmaCrossTransferCallable[] memory callablePayload = buildReceiveMsgAPayload(rtResourceId, address(this), 'testing');

        SharedObjects.EnygmaCrossTransferCallable[][] memory callables = new SharedObjects.EnygmaCrossTransferCallable[][](1);

        callables[0] = callablePayload;

        // RaylsEnygmaHandler contractAddress = RaylsEnygmaHandler(_to);
        // crossTransfer(_to, _value, _toChainId, callablePayload);
    }
}
