//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iSPARTA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/iHandler.sol";

// TODO: Change math to simple/symbol style (newer solidity version)
contract Tools {
    using SafeMath for uint256;
    address public immutable SPARTA; // SPARTA  contract address
    uint256 private constant ONE = 10 ** 18;

    constructor(address _base) {
        SPARTA = _base;
    }

    function HandlerAddr() internal view returns (iHandler) {
        return iSPARTA(SPARTA).handlerAddr();
    }

    function calcLiquidityUnits(
        uint256 token1Input,
        uint256 token1Depth,
        uint256 token2Input,
        uint256 token2Depth,
        uint256 totalSupply
    ) external pure returns (uint256 liquidityUnits) {
        if (totalSupply == 0) {
            return token1Input; // If pool is empty; use token1Input as initial units
        } else {
            // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
            // P * (part1 + part2) / (part3) * slipAdjustment
            uint256 slipAdjustment = getSlipAdjustment(
                token1Input,
                token1Depth,
                token2Input,
                token2Depth
            );
            require(slipAdjustment > ONE, "Slip adjustment too small");
            uint256 part1 = token1Input.mul(token2Depth);
            uint256 part2 = token2Input.mul(token1Depth);
            uint256 part3 = token2Depth.mul(2).add(token2Input);
            require(part3 > 0, "Division by zero");
            uint256 units = totalSupply.mul(part1.add(part2)).div(part3);
            return units.mul(slipAdjustment).div(ONE);
        }
    }

    function getSlipAdjustment(
        uint256 token1Input,
        uint256 token1Depth,
        uint256 token2Input,
        uint256 token2Depth
    ) public pure returns (uint256 slipAdjustment) {
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        uint256 part1 = token1Depth.mul(token2Input);
        uint256 part2 = token2Depth.mul(token1Input);
        uint256 numerator;
        if (part1 > part2) {
            numerator = part1.sub(part2);
        } else {
            numerator = part2.sub(part1);
        }
        uint256 denominator = token2Depth.mul(2).add(token2Input).mul(
            token1Depth.add(token2Depth)
        );
        if (denominator == 0) {
            return ONE;
        }
        return ONE.sub(numerator.mul(ONE).div(denominator));
    }
}
