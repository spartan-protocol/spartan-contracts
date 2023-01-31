// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iPool.sol";
import "./Pool.sol";
import "./bsc-library/interfaces/iBEP20.sol";

contract PoolFactory {
    address private immutable _wbnbAddr; // Address of WBNB

    mapping(address => mapping(address => address)) public getPool;
    mapping(address => bool) public isPool;
    address[] public allPools; // TODO: Handle this unbounded var
    // TODO: Consider using a poolCount var and increment it instead of calling allPools.length

    event PoolCreated(
        address indexed token1Addr,
        address indexed token2Addr,
        address poolAddr,
        uint poolCount // TODO: Handle this unbounded var
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

        // TODO: prevent WBNB:BNB pool (currently the user can input wbnbAddr + bnbAddr and we end up with a BNB:WBNB pool)

        (address token1Addr, address token2Addr) = newToken1Addr < newToken2Addr
            ? (newToken1Addr, newToken2Addr)
            : (newToken2Addr, newToken1Addr); // Order by the token addr hexadecimal value

        // MAKE SURE newToken1Addr, newToken2Addr are not used below this line except for _handleTransferIn()

        if (token1Addr == address(0)) {
            token1Addr = _wbnbAddr; // Handle BNB
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
        allPools.push(poolAddr);
        isPool[poolAddr] = true;
        emit PoolCreated(
            token1Addr,
            token2Addr,
            poolAddr,
            allPools.length // TODO: Handle this unbounded var, consider using a new var that increments instead
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

    function allPoolsLength() external view returns (uint) {
        return allPools.length; // TODO: Handle this unbounded var
    }
}
