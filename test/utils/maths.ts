import { BigNumber } from "bignumber.js";
import { oneHundred, tenThousand } from "./utils";

const one = new BigNumber(1 * 10 ** 18);

const BN = (valueForBigNumber: string | number | BigNumber) => {
  return new BigNumber(valueForBigNumber);
};

// function calcSwapOutput(x, X, Y) {
//   // y = (x * X * Y )/(x + X)^2
//   const _x = new BigNumber(x);
//   const _X = new BigNumber(X);
//   const _Y = new BigNumber(Y);
//   const numerator = _x.times(_X).times(_Y);
//   const denominator = _x.plus(_X).times(_x.plus(_X));
//   const _y = numerator.div(denominator);
//   const y = new BigNumber(_y).integerValue(1);
//   return y;
// }

// function calcSwapFee(x, X, Y) {
//   // y = (x * Y * x) / (x + X)^2
//   const _x = new BigNumber(x);
//   const _X = new BigNumber(X);
//   const _Y = new BigNumber(Y);
//   const numerator = _x.times(_Y.times(_x));
//   const denominator = _x.plus(_X).times(_x.plus(_X));
//   const _y = numerator.div(denominator);
//   const y = new BigNumber(_y).integerValue(1);
//   return y;
// }

// TODO: Trying an adjusted calcUnits without need for slip adjustment hopefully
// TODO: This needs major testing, just an incomplete placehodler for now
export const calcLiquidityUnitsNewTest = (
  token1Input: string,
  token1Depth: string,
  token2Input: string,
  token2Depth: string,
  lpUnitSupply: string
) => {
  const t1In = BN(token1Input);
  const t2In = BN(token2Input);
  const t1Depth = BN(token1Depth);
  const t2Depth = BN(token2Depth);
  const lpUnits = BN(lpUnitSupply);
  if (lpUnits.isEqualTo("0")) {
    return tenThousand;
  } else {
    // SEE: Tools.calcLiquidityUnitsNewTest()
    const part1 = t1In.times(t2Depth).plus(t2In.times(t1Depth));
    const part2 = BN("2").times(token1Input).times(token2Input);
    const denom = part1.plus(BN("2").times(t1Depth).times(t2Depth));
    return lpUnits.times(part1.plus(part2)).div(denom);
  }
};

export const calcLiquidityUnits = (
  token1Input: string,
  token1Depth: string,
  token2Input: string,
  token2Depth: string,
  lpUnitSupply: string
) => {
  const t1In = BN(token1Input);
  const t2In = BN(token2Input);
  const t1Depth = BN(token1Depth);
  const t2Depth = BN(token2Depth);
  const lpUnits = BN(lpUnitSupply);
  if (lpUnits.isEqualTo("0")) {
    return tenThousand;
  } else {
    // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
    // P * (part1 + part2) / (part3) * slipAdjustment
    const slipAdjustment = getSlipAdustment(
      token1Input,
      token1Depth,
      token2Input,
      token2Depth
    );
    const part1 = t1In.times(t2Depth);
    const part2 = t2In.times(t1Depth);
    const part3 = t1Depth.times(t2Depth).times("2");
    const units = lpUnits.times(part1.plus(part2)).div(part3);
    return units.times(slipAdjustment).div(one); // Divide by 10**18;
  }
};

export const getSlipAdustment = (
  token1Input: string,
  token1Depth: string,
  token2Input: string,
  token2Depth: string
) => {
  // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
  // 1 - ABS(part1 - part2)/(part3 * part4))
  const t1In = BN(token1Input);
  const t1Depth = BN(token1Depth);
  const t2In = BN(token2Input);
  const t2Depth = BN(token2Depth);
  const two = BN("2");
  const part1 = t1Depth.times(t2In);
  const part2 = t1In.times(t2Depth);
  const part3 = two.times(t1In).plus(t1Depth);
  const part4 = t2In.plus(t2Depth);
  let numerator;
  if (part1.isGreaterThan(part2)) {
    numerator = part1.minus(part2);
  } else {
    numerator = part2.minus(part1);
  }
  const denominator = part3.times(part4);
  return one.minus(numerator.times(one).div(denominator));
};

// function calcAsymmetricShare(s, T, A) {
//   // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
//   // (part1 * (part2 - part3 + part4)) / part5
//   const part1 = s.times(A);
//   const part2 = T.times(T).times(2);
//   const part3 = T.times(s).times(2);
//   const part4 = s.times(s);
//   const numerator = part1.times(part2.minus(part3).plus(part4));
//   const part5 = T.times(T).times(T);
//   return numerator.div(part5).integerValue(1);
// }

// // share = amount * part/total
// function calcShare(s, T, A) {
//   const _s = new BigNumber(s);
//   const _A = new BigNumber(A);
//   const _T = new BigNumber(T);
//   return _s.times(_A).div(_T);
// }

// function calcValueIn(a, A, V) {
//   const _a = new BigNumber(a);
//   const _A = new BigNumber(A);
//   const _V = new BigNumber(V);
//   const numerator = _a.times(_V);
//   const _v = numerator.div(_A);
//   return new BigNumber(_v).integerValue(1);
// }

// function calcLiquidityUnitsAsym(a, bA, tS) {
//   const _a = new BigNumber(a);
//   const _bA = new BigNumber(bA);
//   const _tS = new BigNumber(tS);
//   const two = new BigNumber(2);
//   return _tS
//     .times(_a)
//     .div(two.times(_a.plus(_bA)))
//     .integerValue(1);
// }

// module.exports = {
//   calcSwapOutput: function (x, X, Y) {
//     return calcSwapOutput(x, X, Y);
//   },
//   calcSwapFee: function (x, X, Y) {
//     return calcSwapFee(x, X, Y);
//   },
//   calcLiquidation: function (x, X, Y) {
//     return calcLiquidation(x, X, Y);
//   },
//   calcLiquidityUnits: function (a, A, v, V, P) {
//     return calcLiquidityUnits(a, A, v, V, P);
//   },
//   getSlipAdustment: function (a, A, v, V) {
//     return getSlipAdustment(a, A, v, V);
//   },
//   calcAsymmetricShare: function (s, T, A) {
//     return calcAsymmetricShare(s, T, A);
//   },
//   calcShare: function (s, T, A) {
//     return calcShare(s, T, A);
//   },
//   calcValueIn: function (a, A, V) {
//     return calcValueIn(a, A, V);
//   },
//   calcLiquidityUnitsAsym: function (a, bA, tS) {
//     return calcLiquidityUnitsAsym(a, bA, tS);
//   },
// };
