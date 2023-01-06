// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./Interfaces/iPOOLFACTORY.sol";
import "./Interfaces/iTOOLS.sol";
import "./Interfaces/iRESERVE.sol";

contract HANDLER {
     address private DEPLOYER;        // Address that deployed contract | can be purged to address(0)
     address public immutable BASE;  // SPARTA base contract address
     address public Handler;

     iPOOLFACTORY private _POOLFACTORY; 
     iTOOLS private _TOOLS;
     iRESERVE private _RESERVE;

     constructor (address _base){
        BASE = _base;
        DEPLOYER = msg.sender;
        Handler = address(this);
    }

    // Restrict access
    modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER);
        _;
    }


    function setGenesisAddresses(address _tools, address _reserve, address _poolFactory) external onlyDEPLOYER {
        _TOOLS = iTOOLS(_tools);
        _RESERVE = iRESERVE(_reserve);
        _POOLFACTORY = iPOOLFACTORY(_poolFactory);
   
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDEPLOYER {
        DEPLOYER = address(0);
    }


    
}