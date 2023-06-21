import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 10,
    token: "BNB",
  },
  contractSizer: {
    // runOnCompile: true, // Uncomment this if you want to see table of contract sizes on compile/test/etc
  },

  //////////// LOCAL FRESH NETWORK
  // networks: {
  //   hardhat: {
  //     gas: 12000000,
  //     blockGasLimit: 0x1fffffffffffff,
  //     allowUnlimitedContractSize: true,
  //   },
  // },
  //

  //////////// FORK BSC MAINNET THEN RUN FROM THERE LOCALLY
  networks: {
    hardhat: {
      // allowUnlimitedContractSize: true,
      forking: {
        //// IDEALLY USE A PRIVATE ARCHIVE NODE RPC, BUT BELOW ARE
        //// PUBLIC RPCs YOU CAN CYCLE THRU, ONLY UNCOMMENT 1 AT A TIME
        //// IF YOU ARE GETTING TESTS FAIL (THAT SHOULDNT BE FAILING)
        //// OR TIMEOUTS, TRY A DIFFERENT RPC
        // url: "https://endpoints.omniatech.io/v1/bsc/mainnet/public", // 01
        url: "https://bsc-dataseed.binance.org", // 02
        // url: "https://bsc-dataseed1.defibit.io", // 03
        // url: "https://bsc-dataseed1.ninicoin.io", // 04
        // url: "https://bsc-dataseed2.defibit.io", // 05
        // url: "https://bsc-dataseed3.defibit.io", // 06
        // url: "https://bsc-dataseed4.defibit.io", // 07
        // url: "https://bsc-dataseed2.ninicoin.io", // 08
        // url: "https://bsc-dataseed3.ninicoin.io", // 09
        // url: "https://bsc-dataseed4.ninicoin.io", // 10
      },
    },
  },
};

export default config;
