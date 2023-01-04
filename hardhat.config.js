/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-truffle5");


module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
      },
    ],
  }
};

