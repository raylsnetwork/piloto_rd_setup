// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import '../../rayls-protocol/utils/RLPEncode.sol';

/**
 * @title PLHeader
 * @dev Contract for storing private ledger headers and verifications across multiple networks.
 */
contract Proofs {
    event NewHeaderEvent(uint256 chainId, uint256 blockNumber);

    mapping(uint256 => Header[]) private headers;

    struct Header {
        bytes32 parentHash;
        bytes32 uncleHash; // ommersHash
        address coinbase; // beneficiary
        bytes32 root;
        bytes32 txHash;
        bytes32 receiptHash;
        bytes bloom;
        uint256 difficulty;
        uint256 number;
        uint256 gasLimit;
        uint256 gasUsed;
        uint256 time;
        bytes extra;
        bytes32 mixDigest;
        uint64 nonce;
    }

    function addBatchHeaders(uint256 chainId, Header[] memory newHeaders) public {
        for(uint i = 0; i < newHeaders.length; i++) {
            if (i != 0) {
                if (newHeaders[i].number != newHeaders[i-1].number + 1) {
                    revert('Batch headers not in sequential order');
                }
            }
            addHeader(chainId, newHeaders[i]);
        }
    }

    struct StorageProofBatch {
        string batchId;
        string fingerprint;
        bytes data;
    }

    event EncryptedStorageProofsBatchReceived(string print, bytes data, uint256 indexed blockNumber);

    function addHeader(uint256 chainId, Header memory header) public {
        require(header.number == (headers[chainId]).length, 'Trying to insert a non-sequential block header');

        if (header.number > 0) {
            checkHeader(chainId, header);
        }

        (headers[chainId]).push(header);
        emit NewHeaderEvent(chainId, header.number);
    }

    function getNextHeaderBlockNumber(uint256 chainId) public view returns (uint256) {
        return (headers[chainId]).length;
    }

    function storeEncryptedStorageProofs(StorageProofBatch calldata batch, uint256 blockNumber) public virtual {
        emit EncryptedStorageProofsBatchReceived(batch.fingerprint, batch.data, blockNumber);
    }

    function checkHeader(uint256 chainId, Header memory currHeader) private {
        Header storage prevHeader = headers[chainId][currHeader.number - 1];

        bytes32 prevBlockHash = keccak256(getBlockRlpData(prevHeader));

        string memory errMsg = string.concat(
            'Block header check failed '
            ' block number ',
            uint2str(currHeader.number - 1),
            ' current header parent hash (previous hash) ',
            bytes32ToLiteralString(currHeader.parentHash),
            ' calculated previous block hash ',
            bytes32ToLiteralString(prevBlockHash)
        );

       require(prevBlockHash == currHeader.parentHash, errMsg);
    }

    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return '0';
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function bytes32ToLiteralString(bytes32 data) public pure returns (string memory result) {
        bytes memory temp = new bytes(65);
        uint256 count;

        for (uint256 i = 0; i < 32; i++) {
            bytes1 currentByte = bytes1(data << (i * 8));

            uint8 c1 = uint8(bytes1((currentByte << 4) >> 4));

            uint8 c2 = uint8(bytes1((currentByte >> 4)));

            if (c2 >= 0 && c2 <= 9) temp[++count] = bytes1(c2 + 48);
            else temp[++count] = bytes1(c2 + 87);

            if (c1 >= 0 && c1 <= 9) temp[++count] = bytes1(c1 + 48);
            else temp[++count] = bytes1(c1 + 87);
        }

        result = string(temp);
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    function getBlockRlpData(Header memory header) internal pure returns (bytes memory data) {
        bytes[] memory list = new bytes[](15);

        list[0] = RLPEncode.encodeBytes(abi.encodePacked(header.parentHash));
        list[1] = RLPEncode.encodeBytes(abi.encodePacked(header.uncleHash));
        list[2] = RLPEncode.encodeAddress(header.coinbase);
        list[3] = RLPEncode.encodeBytes(abi.encodePacked(header.root));
        list[4] = RLPEncode.encodeBytes(abi.encodePacked(header.txHash));
        list[5] = RLPEncode.encodeBytes(abi.encodePacked(header.receiptHash));
        list[6] = RLPEncode.encodeBytes(header.bloom);
        list[7] = RLPEncode.encodeUint(header.difficulty);
        list[8] = RLPEncode.encodeUint(header.number);
        list[9] = RLPEncode.encodeUint(header.gasLimit);
        list[10] = RLPEncode.encodeUint(header.gasUsed);
        list[11] = RLPEncode.encodeUint(header.time);
        list[12] = RLPEncode.encodeBytes(header.extra);
        list[13] = RLPEncode.encodeBytes(abi.encodePacked(header.mixDigest));
        list[14] = RLPEncode.encodeBytes(abi.encodePacked(header.nonce));

        data = RLPEncode.encodeList(list);
    }
}
