// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.9;
import "./iHandler.sol";
interface iSPARTA {

    function handlerAddr() external view returns (iHandler);
}
