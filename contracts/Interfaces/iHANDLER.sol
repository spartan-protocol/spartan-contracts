// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface iHANDLER {
    function BASE() external view returns(address);
    function TOOLS() external view returns(address);
    function RESERVE() external view returns(address);
    function POOLFACTORY() external view returns(address);
}