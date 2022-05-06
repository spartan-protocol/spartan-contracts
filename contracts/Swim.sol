pragma solidity ^0.8.0;
import "./Utilities.sol"; 

contract Swim {
    uint256 initOnce;

mapping(address => PoolData) public mapToken_poolData;
    
address[] public pools;
struct PoolData {
        bool listed;
        uint balanceBase;
        uint balanceToken;
        address[] spartans;
        uint256 totalUnits;
        mapping(address => uint) spartanUnits;
}


function initialize() private {
    require(initOnce !=  1);
    //do something
    initOnce = 1;
}

function add() private {

}

function remove() private {
    
}

function swap() private {
    
}

function listToken() private {

}

}