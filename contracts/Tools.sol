//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./interfaces/iSPARTA.sol"; 
contract Tools {
    
address public immutable SPARTA; // SPARTA  contract address
uint256 private constant one = 1*10**18;

constructor (address _base) {
        SPARTA = _base;
    }

 function HandlerAddr() internal view returns(address) {
        return iSPARTA(SPARTA).handlerAddr(); 
    }

    // Calculate liquidity units
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units){
        if(P == 0){
            return b; // If pool is empty; use b as initial units
        } else {
            // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
            // P * (part1 + part2) / (part3) * slipAdjustment
            uint slipAdjustment = getSlipAdjustment(b, B, t, T);
            require(slipAdjustment > (9.8 * 10**17)); // Resist asym liqAdds
            uint part1 = t * B;     // tokenInput * token2Depth
            uint part2 = T * b;     // tokenDepth * token2Input
            uint part3 = T * B * 2; // tokenDepth * token2Depth * 2
            require(part3 > 0, '!DIVISION');
            uint _units = (P * (part1 + part2)) / part3;  // P == totalSupply
            return _units * slipAdjustment / one;  // Divide by 10**18
        }
    }

    // Get slip adjustment (Protects capital erosion from asymAdds)
    function getSlipAdjustment(uint b, uint B, uint t, uint T) public pure returns (uint slipAdjustment){
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        // 1 - ABS(part1 - part2)/(part3 * part4))
        uint part1 = B * t;     // token2Depth * tokenInput
        uint part2 = b * T;     // token2Input * tokenDepth
        uint part3 = 2 * b + B; // 2 * token2Input + token2Depth (Modified to reduce slip adjustment)
        uint part4 = t + T;     // tokenInput + tokenDepth
        uint numerator;
        if(part1 > part2){
            numerator = part1 - part2;
        } else {
            numerator = part2 - part1;
        }
        uint denominator = part3 * part4;
        require(denominator > 0, '!DIVISION');
        return one - ((numerator * one) / denominator); // Multiply by 10**18
    }

}
