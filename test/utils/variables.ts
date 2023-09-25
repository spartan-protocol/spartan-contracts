import {
  btcbAddr,
  usdcAddr,
  one,
  oneHundred,
  oneHundredThousand,
  oneMillion,
  usdtAddr,
  wbnbAddr,
  zeroAddr,
} from "./utils";

export const wrapAddr = wbnbAddr; // Set the testing-chain's wrapped token here
export const stablePoolToken1 = usdcAddr;
export const stablePoolToken2 = usdtAddr;
export const stablePoolInput1 = oneHundredThousand; // Make sure these two are at least 100k ether units and equal to each other
export const stablePoolInput2 = oneHundredThousand; // Make sure these two are at least 100k ether units and equal to each other
export const nativePoolToken1 = zeroAddr;
export const nativePoolToken2 = btcbAddr;
export const nativePoolInput1 = oneHundred; // BTC -> BNB === 100x
export const nativePoolInput2 = one; // BTC -> BNB === 100x
export const startBalanceStables = oneMillion;
export const startBalanceBtc = oneHundred;
