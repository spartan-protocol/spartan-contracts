// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

contract RESERVE {
   address public immutable BASE;  // Address of SPARTA base token contract
    constructor (address _base) {
        BASE = _base;
    }

}