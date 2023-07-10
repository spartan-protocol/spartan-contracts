// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/iPool.sol";
// Libraries | Contracts
import "./Pool.sol";

contract PoolFactory {
    address public immutable wrapAddr; // Address of wrapped version of the chain's native coin
    address public immutable protocolTokenAddr; // Address of the protocol's token. For deriving contract addresses and also to send the burned LPs to
    uint256 public poolCount;

    // TODO: Consider whether we need to translate address(0) into wrapAddr ...
    // ... if we do, make the getPool mapping internal and create an ...
    // ... external getter of the same name: 'getPool()'
    mapping(address => mapping(address => address)) public getPool;
    mapping(address => bool) public isPool;

    event PoolCreated(
        address indexed token1Addr,
        address indexed token2Addr,
        address poolAddr
    );

    constructor(address newWrapAddr, address newProtocolTokenAddr) {
        wrapAddr = newWrapAddr;
        protocolTokenAddr = newProtocolTokenAddr;
    }

    function createPool(
        uint256 newToken1Input,
        uint256 newToken2Input,
        address newToken1Addr,
        address newToken2Addr
    ) external payable returns (address newPoolAddr) {
        require(newToken1Input > 10 ** 5, "Input1!>100000"); // Enforce a minimum initial balance (resist wei rounding attacks)
        require(newToken2Input > 10 ** 5, "Input2!>100000"); // Enforce a minimum initial balance (resist wei rounding attacks)
        address token1Addr = newToken1Addr; // Cache selected token1 address
        address token2Addr = newToken2Addr; // Cache selected token2 address
        if (token1Addr == address(0)) {
            token1Addr = wrapAddr; // Translate token1 native->wrapped address
        }
        if (token2Addr == address(0)) {
            token2Addr = wrapAddr; // Translate token2 native->wrapped address
        }
        require(token1Addr != token2Addr, "!Valid"); // Prevent same pairing

        if (token1Addr > token2Addr) {
            address _addr1 = token1Addr; // Cache address
            token1Addr = token2Addr; // Swap token1<>token2 addresses ...
            token2Addr = _addr1; // ... into hexadecimal value order
        }

        require(getPool[token1Addr][token2Addr] == address(0), "Exists");

        /////////////// NORMAL DEPLOY METHOD
        string memory poolFront = string(
            abi.encodePacked(
                ERC20(token1Addr).symbol(),
                ":",
                ERC20(token2Addr).symbol()
            )
        );
        string memory _name = string(abi.encodePacked(poolFront, "-SP-Pool"));
        string memory _symbol = string(abi.encodePacked(poolFront, "-SPP"));
        newPoolAddr = address(
            new Pool(_name, _symbol, protocolTokenAddr, token1Addr, token2Addr)
        );

        /////////////// ALTERNATIVE DEPLOY METHOD - Create2()
        // address newPoolAddr;
        // bytes memory bytecode = type(Pool).creationCode;
        // bytes32 salt = keccak256(abi.encodePacked(token1Addr, token2Addr));
        // assembly {
        //     newPoolAddr := create2(0, add(bytecode, 32), mload(bytecode), salt)
        // }
        // iPool(newPoolAddr).initialize(token1Addr, token2Addr);

        getPool[token1Addr][token2Addr] = newPoolAddr;
        getPool[token2Addr][token1Addr] = newPoolAddr; // populate mapping in the reverse direction
        _handleTransferIn(newToken1Addr, newToken1Input, newPoolAddr); // Transfer token1 liquidity to the new pool (respect user's choice of WBNB or BNB by using the input addresses/amounts)
        _handleTransferIn(newToken2Addr, newToken2Input, newPoolAddr); // Transfer token2 liquidity to the new pool (respect user's choice of WBNB or BNB by using the input addresses/amounts)
        isPool[newPoolAddr] = true;
        poolCount++;
        emit PoolCreated(token1Addr, token2Addr, newPoolAddr);
        iPool(newPoolAddr).addForMember(msg.sender); // Perform the liquidity-add for the user
    }

    function _handleTransferIn(
        address tokenAddr,
        uint256 tokenUnits,
        address poolAddr
    ) internal {
        require(tokenUnits > 0);
        if (tokenAddr == address(0)) {
            require(tokenUnits == msg.value);
            (bool success, ) = payable(wrapAddr).call{value: tokenUnits}(""); // Wrap BNB
            require(success);
            IERC20(wrapAddr).transfer(poolAddr, tokenUnits); // Tsf WBNB (PoolFactory -> Pool)
        } else {
            require(
                IERC20(tokenAddr).transferFrom(msg.sender, poolAddr, tokenUnits)
            ); // Tsf TOKEN (User -> Pool)
        }
    }
}
