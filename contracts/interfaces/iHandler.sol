// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface iHandler {
    function baseAddr() external view returns (address);

    function handlerAddr() external view returns (address);

    function reserve() external view returns (address);
}
