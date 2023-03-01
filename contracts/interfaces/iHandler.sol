// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface iHandler {
    function baseAddr() external view returns (address);

    function handlerAddr() external view returns (address);

    function reserveAddr() external view returns (address);

    function toolsAddr() external view returns (address);

    function routerAddr() external returns (address);

    function poolFactoryAddr() external returns (address);
    
}
