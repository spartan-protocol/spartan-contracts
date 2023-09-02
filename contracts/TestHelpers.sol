// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/iPool.sol";
// Libraries | Contracts
import "./Pool.sol";

contract TestHelpers {
    address public immutable wrapAddr; // Address of wrapped version of the chain's native coin

    constructor(address newWrapAddr) {
        wrapAddr = newWrapAddr;
    }

    function addLiq(
        address poolAddr,
        uint256 token1Input,
        uint256 token2Input
    ) external payable returns (uint256) {
        address token1Addr = iPool(poolAddr).asset1Addr(); // Cache token1 address
        address token2Addr = iPool(poolAddr).asset2Addr(); // Cache token2 address
        if (token1Input > 0) {
            _handleTransferIn(token1Addr, token1Input, poolAddr); // Transfer token1 liquidity to the pool
        }
        if (token2Input > 0) {
            _handleTransferIn(token2Addr, token2Input, poolAddr); // Transfer token2 liquidity to the pool
        }
        uint256 lpUnits = iPool(poolAddr).addForMemberNewTest(msg.sender); // Perform the liquidity-add for the user
        return lpUnits;
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
