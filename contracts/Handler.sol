// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iPoolFactory.sol";
import "./interfaces/iTools.sol";
import "./interfaces/iReserve.sol";

contract Handler {
    address private _deployerAddr; // Address that deployed contract | can be purged to address(0)
    address public immutable baseAddr; // SPARTA base contract address
    address public handlerAddr;

    address public toolsAddr; 
    address public reserveAddr; 
    address public poolFactoryAddr; 

    constructor(address newBaseAddr) {
        baseAddr = newBaseAddr;
        _deployerAddr = msg.sender;
        handlerAddr = address(this);
    }

    // Restrict access
    modifier isDeployer() {
        require(msg.sender == _deployerAddr);
        _;
    }

    function setGenesisAddresses(
        address newToolsAddr,
        address newReserveAddr,
        address newPoolFactoryAddr
    ) external isDeployer {
        toolsAddr = newToolsAddr;
        reserveAddr = newReserveAddr;
        poolFactoryAddr = newPoolFactoryAddr;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external isDeployer {
        _deployerAddr = address(0);
    }
}
