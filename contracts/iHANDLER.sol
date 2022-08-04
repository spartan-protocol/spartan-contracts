// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

interface iHANDLER {
    function ROUTER() external view returns(address);
    function BASE() external view returns(address);
    function TOOLS() external view returns(address);
    function RESERVE() external view returns(address);
    function POOLFACTORY() external view returns(address);
}