import { Contract, Signer } from "ethers";
import { ethers } from "hardhat";

// Token Addresses
export const zeroAddr = "0x0000000000000000000000000000000000000000"; // Zero Address
export const busdAddr = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56"; // BUSD BEP20 Address on BSC Mainnet
export const usdtAddr = "0x55d398326f99059fF775485246999027B3197955"; // USDT BEP20 Address on BSC Mainnet
export const btcbAddr = "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c"; // BTCB BEP20 Address on BSC Mainnet
export const wbnbAddr = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB BEP20 Address on BSC Mainnet
export const spartaAddr = "0x3910db0600eA925F63C36DdB1351aB6E2c6eb102"; // SPARTAv2 BEP20 Address on BSC Mainnet
// Account Addresses
export const bnbCexHW6 = "0x8894e0a0c962cb723c1976a4421c95949be2d4e3"; // Binance CEX hot wallet #06 on BSC Mainnet
export const bnbCexHW20 = "0xF977814e90dA44bFA03b6295A0616a897441aceC"; // Binance CEX hot wallet #20 on BSC Mainnet

// Amounts
export const halfa = "500000000000000000";
export const one = "1000000000000000000";
export const two = "2000000000000000000";
export const ten = "10000000000000000000";
export const oneHundred = "100000000000000000000";
export const twoHundred = "200000000000000000000";
export const oneThousand = "1000000000000000000000";
export const tenThousand = "10000000000000000000000";
export const oneHundredThousand = "100000000000000000000000";
export const oneMillion = "1000000000000000000000000";

// Contract object helpers
export const connectToContract = async (
  contractIdString: string,
  contractAddress: string,
  signer: Signer
) => {
  const contract = await ethers.getContractAt(
    contractIdString,
    contractAddress,
    signer
  );
  return contract;
};

// Balance check helpers
export const getTokenBal = async (
  tokenContract: Contract,
  addrToCheck: string
) => {
  const busdBalance = (await tokenContract.balanceOf(addrToCheck)).toString();
  return busdBalance;
};
