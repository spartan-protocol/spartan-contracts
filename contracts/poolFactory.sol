// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


contract PoolFactory  { 
    address private immutable WBNB;  // Address of WBNB
    
    mapping(address=> mapping(address => address)) private mapAssetToken_Pool;
    mapping(address=>bool) public isSettlementAsset;
    mapping(address=>bool) public isPool;
    address[] public allPoolPairs;

    constructor (address _wbnb) {
        WBNB = _wbnb;
    }

    function createPool(uint256 inputA, uint256 inputB, address tokenA, address tokenB) external payable returns(address pool){
        require(tokenA != tokenB, 'SpartanProtocalPool: IDENTICAL_ADDRESSES'); // Preventing same pairing
        
        
        return pool;
    }

     function getPoolPair(address tokenA, address tokenB) public view returns(address poolPair){
        address token0; address token1;
        if(tokenA == address(0)){
            tokenA = WBNB;
             (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA); //order by their hexadecimal value
             poolPair = mapAssetToken_Pool[token0][token1];
        } else if(tokenB == address(0)){
            tokenB = WBNB;
             (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA); //order by their hexadecimal value
             poolPair = mapAssetToken_Pool[token0][token1];
        } else{
            (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA); //order by their hexadecimal value
             poolPair = mapAssetToken_Pool[token0][token1];
        }
        return poolPair;
    }

   
}