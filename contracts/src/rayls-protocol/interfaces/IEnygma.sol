// SPDX-License-Identifier: GPL3
pragma solidity ^0.8.20;

interface IEnygma {
    struct Point {
        uint256 c1;
        uint256 c2;
    }
    // Encoding of field elements is: X[0] * z + X[1]

    //change proof
    struct Proof {
        uint256[2] pi_a;
        uint256[2][2] pi_b;
        uint256[2] pi_c;
        uint256[31] public_signal;
    }

    event TokenInitialized(uint maxBankCount);

    event AccountRegistered(
        address indexed addedBank,
        uint totalRegisteredParties
    );

    event SupplyMinted(uint indexed lastblockNum, uint amount, uint to);

    event VerifierRegistered(
        address indexed verifierAddress,
        uint totalRegisteredVerifiers
    );

    event TransactionSuccessful(address indexed senderAddress);

    event BurnSuccessful(uint256 bankIndex, uint256 burnValue);

    function Name() external view returns (string memory);
    function Symbol() external view returns (string memory);
    function TotalRegisteredBanks() external view returns (uint256);
    function GetTotalSupply() external view returns (uint256);
    function VerifierAddress() external view returns (address);

    function registerAccount(
        address addr,
        uint256 accountNum,
        uint256 k1,
        uint256 k2,
        uint256 r
    ) external returns (bool);

    function initialize() external returns (bool);

    function mintSupply(uint256 amount, uint256 to) external returns (bool);
    function check() external view returns (bool);
    function addVerifier(address verifier) external returns (bool);

    function getBalance(
        uint256 account
    ) external view returns (uint256 x, uint256 y);

    function getPublicValues(
        uint256 size
    ) external view returns (Point[] memory, Point[] memory);

    function transfer(
        Point[] memory commitments,
        Proof memory proof,
        uint256[] memory k
    ) external returns (bool);

    function burn(uint256 bankIndex, uint256 burnValue) external returns (bool);

    function derivePk(uint256 v) external view returns (uint256 x2, uint256 y2);
    function derivePkH(
        uint256 r
    ) external view returns (uint256 x2, uint256 y2);

    function addPedComm(
        uint256 p1,
        uint256 p2,
        uint256 x2,
        uint256 y2
    ) external view returns (uint256, uint256);

    function pedCom(
        uint256 v,
        uint256 r
    ) external view returns (uint256, uint256);
}