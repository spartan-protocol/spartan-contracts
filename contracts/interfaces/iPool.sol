// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;

interface iPool {
    function initialize(address, address) external;

    function addForMember(address) external returns (uint);

    function addForMemberNewTest(address) external returns (uint);

    function asset1Addr() external view returns (address);

    function asset2Addr() external view returns (address);
}
