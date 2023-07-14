//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iSPARTA.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/iHandler.sol";

// TODO: Change math to simple/symbol style (newer solidity version)
contract Tools {
    using SafeMath for uint256;
    address public immutable SPARTA; // SPARTA  contract address

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
            return 10000; // If pool is empty; use 10000 as initial units
        } else {
            // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
            // P * (part1 + part2) / (part3) * slipAdjustment
            uint256 slipAdjustment = getSlipAdjustment(
                token1Input,
                token1Depth,
                token2Input,
                token2Depth
            );
            // Prevent asym-adds that manipulate the pool by more than ~1%
            require(slipAdjustment > (0.98 ether), "!Asym");
            uint256 part1 = token1Input * token2Depth;
            uint256 part2 = token2Input * token1Depth;
            uint256 part3 = token2Depth * token1Depth * 2;
            require(part3 > 0, "!DivBy0");
            uint256 units = (totalSupply * (part1 + part2)) / (part3);
            return (units * slipAdjustment) / 1 ether;
        }
    }

    function getSlipAdjustment(
        uint256 token1Input,
        uint256 token1Depth,
        uint256 token2Input,
        uint256 token2Depth
    ) public pure returns (uint256 slipAdjustment) {
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        uint256 numPart1 = token1Depth * token2Input;
        uint256 numPart2 = token2Depth * token1Input;
        uint256 numerator;
        if (numPart1 > numPart2) {
            numerator = numPart1 - numPart2;
        } else {
            numerator = numPart2 - numPart1;
        }

        uint256 denomPart1 = 2 * token1Input + token1Depth;
        uint256 denomPart2 = token2Input + token2Depth;
        uint256 denominator = denomPart1 * denomPart2;
        require(denominator > 0, "!Div0");
        return 1 ether - ((numerator * 1 ether) / denominator);
    }
}
