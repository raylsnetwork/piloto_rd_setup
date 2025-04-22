// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/access/AccessControl.sol";
// import {RaylsErcCustomHandler} from "./dependencies/rayls-protocol-sdk/tokens/RaylsErcCustomHandler.sol";
import "../../rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";
import "../../rayls-protocol-sdk/interfaces/IRaylsEndpoint.sol";
import "../../rayls-protocol/Endpoint/EndpointV1.sol";
// import "./dependencies/IEndpoint.sol";


// contract Fund is AccessControl, RaylsErcCustomHandler {
contract CustomTokenExample is AccessControl, RaylsErc20Handler {
    EndpointV1 private epoint;
    
    bytes32 public attestationUid;

    uint256 public fundManagerFeeChainId;
    address public fundManagerAddr;
    
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _fundManagerChainId,
        address _fundManagerAddr,
        address _endpointAddr
    ) RaylsErc20Handler(name, symbol, _endpointAddr, msg.sender, true) {
    // ) RaylsErcCustomHandler(name, symbol, _endpointAddr, msg.sender) {
        epoint = EndpointV1(_endpointAddr);

        fundManagerFeeChainId = _fundManagerChainId;
        fundManagerAddr = _fundManagerAddr;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, _fundManagerAddr);
        _grantRole(BURNER_ROLE, msg.sender);
    }

    function getVersion() public view returns (uint256) {
        return epoint.contractVersion();
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _fundManagerChainId,
        address _fundManagerAddr,
        bytes32 _attestationUuid
    ) public initializer {
        address _owner = _getOwnerAddressOnInitialize();
        address _endpoint = _getEndpointAddressOnInitialize();
        resourceId = _getResourceIdOnInitialize();
        tokenName = _name;
        tokenSymbol = _symbol;
        attestationUid = _attestationUuid;
        fundManagerFeeChainId = _fundManagerChainId;
        fundManagerAddr = _fundManagerAddr;
        _transferOwnership(_owner);
        endpoint = IRaylsEndpoint(_endpoint);
        _grantRole(MINTER_ROLE, _owner);
        _grantRole(BURNER_ROLE, _owner);
    }

    function _generateInitializerParams()
        internal
        view
        override
        returns (bytes memory)
    {
        return
            abi.encodeWithSignature(
                "initialize(string,string,uint256,address,bytes32)",
                tokenName,
                tokenSymbol,
                fundManagerFeeChainId,
                fundManagerAddr,
                attestationUid
            );
    }

    function setAttestationUuid(bytes32 _uuid) external onlyRole(DEFAULT_ADMIN_ROLE) {
        attestationUid = _uuid;
    }

    function mint(address to, uint256 amount) public override onlyRole(MINTER_ROLE) {
        require(attestationUid != bytes32(0), "No risk analysis attestation emmited yet");
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) public {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    // destinatário da função (que nesse caso já é o quero protocolo faz)
    // 
    function receiveTeleportAtomicToResourceId(bytes32 resourceId, uint256 value) public virtual receiveMethod {
        address to = epoint.resourceIdToContractAddress(resourceId);
        _mint(owner(), value);
        if (to != owner()) {
            _lock(to, value);
        }
    }

    function revertTeleportBurnToResourceId(bytes32 resourceId, uint256 value) public virtual receiveMethod {
        address to = epoint.resourceIdToContractAddress(resourceId);
        _burn(to, value);
    }

    function unlockToResourceId(bytes32 resourceId, uint256 amount) external virtual returns (bool) {
        address to = epoint.resourceIdToContractAddress(resourceId);
        if (to != owner()) {
            bool success = _unlock(to, amount);
            require(success, "cannot unlock the assets");
            _transfer(owner(), to, amount);
            return true;
        }
        return true;
    }
}
