// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iPool.sol";
import "./Pool.sol";
import "./bsc-library/interfaces/iBEP20.sol";
import "hardhat/console.sol";

contract PoolFactory {
    address private immutable _wbnbAddr; // Address of WBNB

    mapping(address => mapping(address => address)) public getPool;
    mapping(address => bool) public isPool;
    uint public poolCount;
    event PoolCreated(
        address indexed token1Addr,
        address indexed token2Addr,
        address poolAddr
    );

    constructor(address newWbnbAddr) {
        _wbnbAddr = newWbnbAddr;
    }

    function createPool(
        uint256 newToken1Input,
        uint256 newToken2Input,
        address newToken1Addr,
        address newToken2Addr
    ) external payable returns (address poolAddr) {
        require(
            newToken1Addr != newToken2Addr,
            "SpartanProtocolPool: IDENTICAL_ADDRESSES"
        ); // Prevent same pairing

        (address token1Addr, address token2Addr) = newToken1Addr < newToken2Addr
            ? (newToken1Addr, newToken2Addr)
            : (newToken2Addr, newToken1Addr); // Order by the token addr hexadecimal value

        if (token1Addr == address(0)) {
            token1Addr = _wbnbAddr; // Handle BNB
            require(token2Addr != _wbnbAddr,'SpartanProtocol : NICE TRY');
        }

        require(
            getPool[token1Addr][token2Addr] == address(0),
            "SpartanProtocalPool: POOL_EXISTS"
        );
        bytes memory bytecode = type(Pool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token1Addr, token2Addr));
        assembly {
            poolAddr := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        iPool(poolAddr).initialize(token1Addr, token2Addr);
        getPool[token1Addr][token2Addr] = poolAddr;
        getPool[token2Addr][token1Addr] = poolAddr; // populate mapping in the reverse direction
        _handleTransferIn(newToken1Addr, newToken1Input, poolAddr); // Transfer token1 liquidity to the new pool (respect user's choice of WBNB or BNB by using the input addresses/amounts)
        _handleTransferIn(newToken2Addr, newToken2Input, poolAddr); // Transfer token2 liquidity to the new pool (respect user's choice of WBNB or BNB by using the input addresses/amounts)
        isPool[poolAddr] = true;
        poolCount ++;
        emit PoolCreated(
            token1Addr,
            token2Addr,
            poolAddr
        );
    }

    function _handleTransferIn(
        address tokenAddr,
        uint256 tokenUnits,
        address poolAddr
    ) internal {
        require(tokenUnits > 0);
        if (tokenAddr == address(0)) {
            require(tokenUnits == msg.value);
            (bool success, ) = payable(_wbnbAddr).call{value: tokenUnits}(""); // Wrap BNB
            require(success);
            iBEP20(_wbnbAddr).transfer(poolAddr, tokenUnits); // Tsf WBNB (PoolFactory -> Pool)
        } else {
            require(
                iBEP20(tokenAddr).transferFrom(msg.sender, poolAddr, tokenUnits)
            ); // Tsf TOKEN (User -> Pool)
        }
    }

}
