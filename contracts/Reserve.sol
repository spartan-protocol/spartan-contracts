// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract Reserve {
    address public immutable baseAddr; // Address of SPARTA base token contract

    constructor(address newBaseAddr) {
        baseAddr = newBaseAddr;
    }
}
