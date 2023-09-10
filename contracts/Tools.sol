//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "./interfaces/iHandler.sol";
import "./interfaces/iSPARTA.sol";
// Libraries | Contracts
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Tools {
    using SafeMath for uint256;
    address public immutable SPARTA; // SPARTA contract address

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
        // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
        // P * (part1 + part2) / (part3) * slipAdjustment
        uint256 slipAdjustment = getSlipAdjustment(
            token1Input,
            token1Depth,
            token2Input,
            token2Depth
        );
        require(slipAdjustment > (0.98 ether), "!Asym"); // Resist asym-adds
        uint256 part1 = token1Input * token2Depth;
        uint256 part2 = token2Input * token1Depth;
        uint256 part3 = token2Depth * token1Depth * 2;
        require(part3 > 0, "!DivBy0");
        uint256 units = (totalSupply * (part1 + part2)) / (part3);
        return (units * slipAdjustment) / 1 ether;
    }

    // TODO: Trying an adjusted calcUnits without need for slip adjustment hopefully
    // TODO: This needs major testing, just an incomplete placehodler for now
    function calcLiquidityUnitsNewTest(
        uint256 token1Input,
        uint256 token1Depth,
        uint256 token2Input,
        uint256 token2Depth,
        uint256 totalSupply
    ) external pure returns (uint256 liquidityUnits) {
        // numer = tB + Tb + 2tb
        // denom = tB + Tb + 2TB
        // units = P * (numer / denom)

        // Make division last (solidity woes) adapts to:
        // units = (P * numer) / denom

        // --- Readable Version ---
        //// uint256 part1 = (token1Input * token2Depth) + (token2Input * token1Depth);
        //// uint256 part2 = 2 * token1Input * token2Input;
        //// uint256 denom = part1 + (2 * token1Depth * token2Depth);
        //// require(denom > 0, "!DivBy0");
        //// return (totalSupply * (part1 + part2)) / denom;

        // --- Gas Efficient Version ---
        uint256 part1 = (token1Input * token2Depth) +
            (token2Input * token1Depth);
        uint256 denom = part1 + (2 * token1Depth * token2Depth);
        require(denom > 0, "!DivBy0");
        return
            (totalSupply * (part1 + (2 * token1Input * token2Input))) / denom;
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
        uint256 numerator = numPart1 > numPart2
            ? numPart1 - numPart2
            : numPart2 - numPart1;

        // --- Readable Denominator Version ---
        //// uint256 denomPart1 = 2 * token1Input + token1Depth;
        //// uint256 denomPart2 = token2Input + token2Depth;
        //// uint256 denominator = denomPart1 * denomPart2;

        // --- Gas Efficient Denominator Version ---
        uint256 denominator = (2 * token1Input + token1Depth) *
            (token2Input + token2Depth);
        require(denominator > 0, "!Div0");

        return 1 ether - ((numerator * 1 ether) / denominator);
    }
}
