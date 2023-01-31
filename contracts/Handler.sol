// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iPoolFactory.sol";
import "./interfaces/iTools.sol";
import "./interfaces/iReserve.sol";

contract Handler {
    address private _deployerAddr; // Address that deployed contract | can be purged to address(0)
    address public immutable baseAddr; // SPARTA base contract address
    address public handlerAddr;

    iTools private _tools; // TODO: These should probably be addresses rather than interfaced objects?
    iReserve public reserve; // TODO: These should probably be addresses rather than interfaced objects?
    iPoolFactory private _poolFactory; // TODO: These should probably be addresses rather than interfaced objects?

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
        address toolsAddr,
        address reserveAddr,
        address poolFactoryAddr
    ) external isDeployer {
        _tools = iTools(toolsAddr);
        reserve = iReserve(reserveAddr);
        _poolFactory = iPoolFactory(poolFactoryAddr);
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external isDeployer {
        _deployerAddr = address(0);
    }
}
