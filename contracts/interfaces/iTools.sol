// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

interface iTools {
    function calcLiquidityUnits(
        uint _actualInputBase,
        uint baseAmount,
        uint _actualInputToken,
        uint tokenAmount,
        uint totalSupply
    ) external returns (uint256);

    function calcLiquidityUnitsNewTest(
        uint _actualInputBase,
        uint baseAmount,
        uint _actualInputToken,
        uint tokenAmount,
        uint totalSupply
    ) external returns (uint256);
}
