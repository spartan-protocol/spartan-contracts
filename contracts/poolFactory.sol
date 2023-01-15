// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import './Interfaces/iSPARTANPROTCOLPOOL.sol';
import './SPARTANPROTCOLPOOL.sol';

contract PoolFactory  { 
    address private immutable WBNB;  // Address of WBNB
    
    mapping(address=> mapping(address => address)) public getPool;
    mapping(address=>bool) public isPool;
    address[] public allPools;

    event PoolCreated(address indexed tokenA, address indexed tokenB, address pool, uint);

    constructor (address _wbnb) {
        WBNB = _wbnb;
    }

    function createPool(uint256 inputA, uint256 inputB, address tokenA, address tokenB) external payable returns (address pool) {
        require(tokenA != tokenB, 'SpartanProtocalPool: IDENTICAL_ADDRESSES'); // Prevent same pairing
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA); //Order by their hexadecimal value
        if(token0 == address(0)){
            token0 = WBNB; //Handle BNB
        }
        require(getPool[token0][token1] == address(0), "SpartanProtocalPool: POOL_EXISTS");
        SPARTANPROTCOLPOOL newPool;
        newPool = new SPARTANPROTCOLPOOL(token0, token1); // Deploy new pool 
        pool = address(newPool); // Get address of new pool
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool; // populate mapping in the reverse direction
        allPools.push(pool);
        emit PoolCreated(token0, token1, pool, allPools.length);
        return pool;
    }


    function allPoolsLength() external view returns (uint) {
        return allPools.length;
    }

   
}