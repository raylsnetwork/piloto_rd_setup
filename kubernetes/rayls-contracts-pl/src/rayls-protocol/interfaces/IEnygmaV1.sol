// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IEnygmaV1 {
    struct EnygmaPointWithChainId {
        uint256 c1;
        uint256 c2;
        uint256 chainId;
    }

    struct Point {
        uint256 c1;
        uint256 c2;        
    }
    
    struct Proof {
        uint256[2] pi_a;
        uint256[2][2] pi_b;
        uint256[2] pi_c;
        uint256[] public_signal;
    }

    struct PendingTransaction {
        EnygmaPointWithChainId[] pointsToAddToBalance;
        uint256 nullifier;
    }

    struct PendingMintOrBurn {
        EnygmaPointWithChainId pointToAddToBalance;
        uint256 amount;
        uint256 blockNumber;
        uint8 transactionType; // 1 = mint, 2 = burn
    }

    event SupplyMinted(uint256 indexed lastblockNum, uint256 amount, uint256 toChainId);

    event VerifierRegistered(address indexed verifierAddress, uint8 k);

    event TransactionSuccessful(address indexed senderAddress);

    event BurnSuccessful(uint256 indexed chainId, uint256 burnValue);

    event BalancesFinalised(uint256 indexed blockNumber);


    function mintSupply(uint256 amount, uint256 toChainId, uint256 blockNumber) external returns (bool);

    function burn(uint256 chainId, uint256 burnValue, uint256 blockNumber) external returns (bool);

    function checkTotalSumOfBalances(uint256 blockNumber) external view returns (bool);

    function addVerifier(address verifier, uint8 k) external returns (bool);

    function getBalanceFinalised(uint256 chainId) external view returns (uint256 x, uint256 y);

    function getBalancePending(uint256 chainId) external view returns (uint256 x, uint256 y);

    function getBalanceByBlockNumber(uint256 chainId, uint256 blockNumber) external view returns (uint256 x, uint256 y);

    function getPublicValuesByBlockNumber(uint256 blockNumber)
        external
        view
        returns (EnygmaPointWithChainId[] memory refBalances, EnygmaPointWithChainId[] memory publicKeys);

    function getPublicValuesFinalised()
        external
        view
        returns (EnygmaPointWithChainId[] memory refBalances, EnygmaPointWithChainId[] memory publicKeys);

    function getPublicValuesPending()
        external
        view
        returns (EnygmaPointWithChainId[] memory refBalances, EnygmaPointWithChainId[] memory publicKeys);

    function transfer(
        uint8 k,
        Point[] memory commitments,
        Proof memory proof,
        uint256[] memory chainIds,
        bytes[] memory encryptedMessages
    ) external returns (bool);

    function derivePk(uint256 v) external view returns (uint256 x2, uint256 y2);

    function derivePkH(uint256 r) external view returns (uint256 x2, uint256 y2);

    function pedCom(uint256 v, uint256 r) external view returns (uint256 pedComX, uint256 pedComY);

    function Name() external view returns (string memory);

    function Symbol() external view returns (string memory);

    function getTotalRegisteredBanks() external view returns (uint256);

    function getTotalSupply() external view returns (uint256);

    function getVerifierAddress(uint8 k) external view returns (address);

    function getPendingTransactions() external view returns (PendingTransaction[] memory);

    function getPendingMintsAndBurns() external view returns (PendingMintOrBurn[] memory);

    function getLastblockNumAtCurrentBlockNumber(uint256 currentBlockNumber) external view returns (uint256);
}
