// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import './Interfaces/iSPARTANPROTOCOLPOOL.sol';
import './SPARTANPROTOCOLPOOL.sol';

contract POOLFACTORY  { 
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
        bytes memory bytecode = type(SPARTANPROTOCOLPOOL).creationCode; 
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly { 
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        ISPARTANPROTOCOLPOOL(pool).initialize(token0, token1);
        getPool[token0][token1] = pool; 
        getPool[token1][token0] = pool; // populate mapping in the reverse direction
        _handleTransferIn(tokenA, inputA, pool); // Transfer TOKEN liquidity to new pool
        _handleTransferIn(tokenB, inputB, pool); // Transfer TOKEN liquidity to new pool
        allPools.push(pool);
        isPool[pool] = true;
        emit PoolCreated(token0, token1, pool, allPools.length);
    }

    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal  {
        require(_amount > 0);
        if(_token == address(0)){
            require(_amount == msg.value);
            (bool success, ) = payable(WBNB).call{value: _amount}(""); // Wrap BNB
            require(success);
            iBEP20(WBNB).transfer(_pool, _amount); // Tsf WBNB (PoolFactory -> Pool)
        } else {
            require(iBEP20(_token).transferFrom(msg.sender, _pool, _amount)); // Tsf TOKEN (User -> Pool)
        }
    }


    function allPoolsLength() external view returns (uint) {
        return allPools.length;
    }

   
}