import { expect } from "chai";
import {
  getPoolAssetRatio,
  getTokenBal,
  oneHundred,
  oneHundredThousand,
  oneMillion,
  oneThousand,
} from "./utils/utils";
import { createPoolsFixture } from "./0-Fixtures";
import BigNumber from "bignumber.js";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🏊‍♀️ Pool Contract", function () {
  describe("addForMember() checks", function () {
    it("LiqAdd should fail if either input is !> 0", async function () {
      // require(inputAsset1 > 0 && inputAsset2 > 0, "Input missing");
      const {
        addr2,
        stablePoolAsAddr2,
        nativePoolAsAddr2,
        usdcAsAddr2,
        usdtAsAddr2,
        btcbAsAddr2,
      } = await loadFixture(createPoolsFixture);

      // Get approvals
      await usdcAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await btcbAsAddr2.approve(nativePoolAsAddr2.target, oneMillion);

      // Check stable pool
      await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
        "Input missing"
      );
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, oneHundred);
      await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
        "Input missing"
      );

      // Check native pool
      await expect(nativePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
        "Input missing"
      );
      await btcbAsAddr2.transfer(nativePoolAsAddr2.target, oneHundred);
      await expect(nativePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
        "Input missing"
      );
    });

    it("LiqAdd should fail if resulting liq units !> 0", async function () {
      // require(liquidity > 0, "LiqAdd too small");
      const {
        addr2,
        stablePoolAsAddr2,
        nativePoolAsAddr2,
        usdcAsAddr2,
        usdtAsAddr2,
        btcbAsAddr2,
      } = await loadFixture(createPoolsFixture);

      // Get approvals
      await usdcAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await btcbAsAddr2.approve(nativePoolAsAddr2.target, oneMillion);

      // Check stable pool (1 wei vs 100k ether is the friction point for this test)
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, "1"); // (1 / 100000000000000000000000) = < 1 wei in LPs
      await usdtAsAddr2.transfer(stablePoolAsAddr2.target, "1"); // (1 / 100000000000000000000000) = < 1 wei in LPs
      await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
        "LiqAdd too small"
      );

      // Hard to check native pool as the underflow is hard to reach without a larger TVL than we have available in sumlated whale wallets
    });

    // it("Pool deploy should fail if token1 & token2 are the same", async function () {
    //   const { poolFactory, addr1 } = await loadFixture(deployFixture);
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(oneThousand, oneHundred, usdcAddr, usdcAddr)
    //   ).to.be.revertedWith("!Valid");
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(oneThousand, oneHundred, zeroAddr, zeroAddr)
    //   ).to.be.revertedWith("!Valid");
    // });
    // it("Pool deploy should fail if native<>wrapped pool is attempted", async function () {
    //   const { poolFactory, addr1 } = await loadFixture(deployFixture);
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(oneThousand, oneHundred, wrapAddr, zeroAddr)
    //   ).to.be.revertedWith("!Valid");
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(oneThousand, oneHundred, zeroAddr, wrapAddr)
    //   ).to.be.revertedWith("!Valid");
    // });
    // it("Pool deploy should fail if duplicate configuration of paired tokens ", async function () {
    //   const { poolFactory, addr1 } = await loadFixture(createPoolsFixture);
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(
    //         stablePoolInput1,
    //         stablePoolInput2,
    //         stablePoolToken1,
    //         stablePoolToken2
    //       )
    //   ).to.be.revertedWith("Exists");
    //   await expect(
    //     poolFactory
    //       .connect(addr1)
    //       .createPool(
    //         stablePoolInput2,
    //         stablePoolInput1,
    //         stablePoolToken2,
    //         stablePoolToken1
    //       )
    //   ).to.be.revertedWith("Exists");
    // });
  });

  describe("() balances", function () {
    it("Both calcLiqUnits formulas should return the same LP Units for symmetrical adds", async function () {
      const {
        addr2,
        stablePoolAsAddr2,
        nativePoolAsAddr2,
        usdcAsAddr2,
        usdtAsAddr2,
        btcbAsAddr2,
      } = await loadFixture(createPoolsFixture);

      // Get approvals
      await usdcAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await btcbAsAddr2.approve(nativePoolAsAddr2.target, oneMillion);

      // #1
      const poolRatio1 = await getPoolAssetRatio(stablePoolAsAddr2);
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, oneHundred);
      await usdtAsAddr2.transfer(stablePoolAsAddr2.target, oneHundred);
      // StaticCall symmetrical addForMember() --- Cache returned LP units
      const lpUnitsRecOld1 = await stablePoolAsAddr2.addForMember.staticCall(
        addr2
      );
      // StaticCall symmetrical addForMemberNewTest() --- Cache returned LP units
      const lpUnitsRecNew1 =
        await stablePoolAsAddr2.addForMemberNewTest.staticCall(addr2);
      // Ensure the amounts are equal
      expect(lpUnitsRecOld1).to.equal(lpUnitsRecNew1);
      // Write-txn symmetrical add
      await stablePoolAsAddr2.addForMemberNewTest(addr2);

      // #2
      // Do some swaps to change asset ratio in pool
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, oneThousand);
      await stablePoolAsAddr2.swapToken();
      const poolRatio2 = await getPoolAssetRatio(stablePoolAsAddr2);

      // #3
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, oneHundred);
      await usdtAsAddr2.transfer(
        stablePoolAsAddr2.target,
        BigNumber(oneHundred).times(poolRatio2).toString()
      );
      // StaticCall symmetrical addForMember() --- Cache returned LP units
      const lpUnitsRecOld2 = await stablePoolAsAddr2.addForMember.staticCall(
        addr2
      );
      // StaticCall symmetrical addForMemberNewTest() --- Cache returned LP units
      const lpUnitsRecNew2 =
        await stablePoolAsAddr2.addForMemberNewTest.staticCall(addr2);
      // Ensure the amounts are equal
      expect(lpUnitsRecOld2).to.equal(lpUnitsRecNew2);
      // Write-txn symmetrical add
      await stablePoolAsAddr2.addForMemberNewTest(addr2);

      // #4
      // Do some swaps to re-balance pools to same rate as pre-#2
      await usdtAsAddr2.transfer(
        stablePoolAsAddr2.target,
        BigNumber(oneThousand).times("0.99132").toString()
      );
      await stablePoolAsAddr2.swapToken();
      const poolRatio3 = await getPoolAssetRatio(stablePoolAsAddr2);

      // #5
      // Write-txn removeLiquidity(LP units === #1 received)
      // Cache returned assets
      // Ensure the returned units are === units deposited in #1

      // #6
      // StaticCall asymmetric addForMember()
      // Cache returned LP units
      // Write-txn asymmetric addForMemberNewTest()
      // Cache returned LP units
      // Ensure the amounts are equal

      // #7
      // Do some swaps to misbalance pools

      // #8
      // StaticCall asymmetric addForMember()
      // Cache returned LP units
      // Write-txn asymmetric addForMemberNewTest()
      // Cache returned LP units
      // Ensure the amounts are equal

      // #9
      // Do some swaps to re-balance pools to same rate as pre-#7

      // #10
      // Write-txn removeLiquidity(LP units === #6 received)
      // Cache returned assets
      // Ensure the returned units are === units deposited in #6
    });

    it("Should get equal or less for asym add vs swap+add", async function () {
      const {
        addr2,
        testHelpers,
        stablePoolAsAddr2,
        nativePoolAsAddr2,
        usdcAsAddr2,
        usdtAsAddr2,
        btcbAsAddr2,
      } = await loadFixture(createPoolsFixture);

      const testHelperAsAddr2 = testHelpers.connect(addr2);

      // Get approvals
      await usdcAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
      await usdcAsAddr2.approve(testHelpers.target, oneMillion);
      await usdtAsAddr2.approve(testHelpers.target, oneMillion);

      // #1 Cache staticCall result of asymAdd LP units
      const token1Input = oneHundredThousand;
      const qtrInput = BigNumber(token1Input).times("0.25").toString();
      const halfInput = BigNumber(token1Input).times("0.5").toString();
      const token2Input = "0";
      const asymAddLps = await testHelperAsAddr2.addLiq.staticCall(
        stablePoolAsAddr2.target,
        token1Input,
        token2Input
      );

      // #2 Swap half of asym-add to other asset then add roughly-Symmetrically
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, qtrInput);
      const swapOutput1 = await stablePoolAsAddr2.swapToken.staticCall(); // cache swap1 result
      await stablePoolAsAddr2.swapToken(); // perform swap
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, qtrInput);
      const swapOutput2 = await stablePoolAsAddr2.swapToken.staticCall(); // cache swap2 result
      await stablePoolAsAddr2.swapToken(); // perform swap
      const totalSwapOutput = BigNumber(swapOutput1)
        .plus(swapOutput2)
        .toString();
      // transfer both assets to pool
      await usdcAsAddr2.transfer(stablePoolAsAddr2.target, halfInput);
      await usdtAsAddr2.transfer(stablePoolAsAddr2.target, totalSwapOutput);
      const swapAddLps = await stablePoolAsAddr2.addForMemberNewTest.staticCall(
        addr2
      ); // cache add roughly ~symmetrically
      await stablePoolAsAddr2.addForMemberNewTest(addr2); // perform add roughly ~symmetrically

      // #3 Resulting LP units from #1 should be less-than or equal to #2
      console.log("asymAddLps", asymAddLps);
      console.log("swapAddLps", swapAddLps);
      expect(asymAddLps).to.lessThanOrEqual(swapAddLps);
    });

    // it("Pool and user balances must change by correct amounts", async function () {
    //   const {
    //     addr1,
    //     usdcAsAddr1,
    //     usdtAsAddr1,
    //     btcbAsAddr1,
    //     stablePoolAddr,
    //     nativePoolAddr,
    //   } = await loadFixture(createPoolsFixture);
    //   // Get user balances after txn
    //   const addr1usdcBal = await getTokenBal(usdcAsAddr1, addr1);
    //   const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
    //   // TODO: Add 'get' BNB addr1 balance
    //   const addr1BtcbBal = await getTokenBal(btcbAsAddr1, addr1);
    //   // Get pool balances after txn
    //   const poolusdcBal = await getTokenBal(usdcAsAddr1, stablePoolAddr);
    //   const poolUsdtBal = await getTokenBal(usdtAsAddr1, stablePoolAddr);
    //   // TODO: Add 'get' BNB Pool balance
    //   const poolBtcbBal = await getTokenBal(btcbAsAddr1, nativePoolAddr);
    //   // Expected user & pool balances after txn
    //   const addr1usdcExp =
    //     BigNumber(startBalanceStables).minus(stablePoolInput1);
    //   const addr1UsdtExp =
    //     BigNumber(startBalanceStables).minus(stablePoolInput2);
    //   // TODO: Add BNB balance change expectations
    //   const addr1BtcbExp = BigNumber(startBalanceBtc).minus(nativePoolInput2);
    //   // console.log("DEBUG:", addr1usdcBal, addr1usdcExp.toFixed(0));
    //   // Run addr1 balance checks
    //   expect(addr1usdcBal).to.equal(addr1usdcExp.toFixed(0));
    //   expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
    //   // TODO: Add BNB addr1 balance change expectations
    //   expect(addr1BtcbBal).to.equal(addr1BtcbExp.toFixed(0));
    //   // Run pool balance checks
    //   expect(poolusdcBal).to.equal(stablePoolInput1);
    //   expect(poolUsdtBal).to.equal(stablePoolInput2);
    //   // TODO: Add BNB pool balance change expectations
    //   expect(poolBtcbBal).to.equal(nativePoolInput2);
    // });
    // it("User & burn address should receive the correct share of initial LP units", async function () {
    //   const { addr1, stablePoolAddr, nativePoolAddr, protocolToken } =
    //     await loadFixture(createPoolsFixture);
    //   const burnAddr = protocolToken.target;
    //   const stablePoolAsAddr1 = await connectToContract(
    //     "ERC20",
    //     stablePoolAddr,
    //     addr1
    //   );
    //   const nativePoolAsAddr1 = await connectToContract(
    //     "ERC20",
    //     nativePoolAddr,
    //     addr1
    //   );
    //   // Get user balances after txn
    //   const addr1StableLpBal = await getTokenBal(stablePoolAsAddr1, addr1);
    //   const addr1NativeLpBal = await getTokenBal(nativePoolAsAddr1, addr1);
    //   // Get burnAddr balances after txn
    //   const burnedStableLpBal = await getTokenBal(
    //     stablePoolAsAddr1,
    //     burnAddr
    //   );
    //   const burnedNativeLpBal = await getTokenBal(
    //     nativePoolAsAddr1,
    //     burnAddr
    //   );
    //   // Total LP units minted
    //   const totalStableLps = calcLiquidityUnits(
    //     stablePoolInput1,
    //     "0",
    //     stablePoolInput2,
    //     "0",
    //     "0"
    //   );
    //   const totalNativeLps = calcLiquidityUnits(
    //     nativePoolInput1,
    //     "0",
    //     nativePoolInput2,
    //     "0",
    //     "0"
    //   );
    //   // Expected locked/burned balances after txn are === burnLiq
    //   const burnedStableLpExp = burnLiq;
    //   const burnedNativeLpExp = burnLiq;
    //   // Expected user balances after txn
    //   const addr1StableLpExp =
    //     BigNumber(totalStableLps).minus(burnedStableLpExp);
    //   const addr1NativeLpExp =
    //     BigNumber(totalNativeLps).minus(burnedNativeLpExp);
    //   // Run burned balance checks
    //   expect(burnedStableLpBal).to.equal(burnedStableLpExp);
    //   expect(burnedNativeLpBal).to.equal(burnedNativeLpExp);
    //   // Run addr1 balance checks
    //   expect(addr1StableLpBal).to.equal(addr1StableLpExp.toFixed(0));
    //   expect(addr1NativeLpBal).to.equal(addr1NativeLpExp.toFixed(0));
    // });
  });

  describe("() events", function () {
    // it("Should emit PoolCreated event", async function () {
    //   const { poolFactory, addr1, usdcAsAddr1, usdtAsAddr1, btcbAsAddr1 } =
    //     await loadFixture(deployFixture);
    //   await usdcAsAddr1.approve(poolFactory.target, oneMillion);
    //   await usdtAsAddr1.approve(poolFactory.target, oneMillion);
    //   await btcbAsAddr1.approve(poolFactory.target, oneMillion);
    //   let _token1Addr = stablePoolToken1;
    //   let _token2Addr = stablePoolToken2;
    //   if (stablePoolToken1 == ZeroAddress) {
    //     _token1Addr = wrapAddr; // Translate token1 native->wrapped address
    //   }
    //   if (stablePoolToken2 == ZeroAddress) {
    //     _token2Addr = wrapAddr; // Translate token2 native->wrapped address
    //   }
    //   if (_token1Addr > _token2Addr) {
    //     const _addr1 = _token1Addr; // Cache address
    //     _token1Addr = _token2Addr; // Swap token1<>token2 addresses ...
    //     _token2Addr = _addr1; // ... into hexadecimal value order
    //   }
    //   let tx1 = await poolFactory
    //     .connect(addr1)
    //     .createPool(
    //       stablePoolInput1,
    //       stablePoolInput2,
    //       stablePoolToken1,
    //       stablePoolToken2
    //     );
    //   tx1 = await tx1.wait();
    //   tx1 = tx1.logs.filter(
    //     (x: any) => x.fragment && x.fragment.name === "PoolCreated"
    //   )[0];
    //   // console.log(tx1);
    //   const stablePoolAddr = await poolFactory.getPool(
    //     stablePoolToken1,
    //     stablePoolToken2
    //   );
    //   expect(tx1.args[0]).to.equal(_token1Addr);
    //   expect(tx1.args[1]).to.equal(_token2Addr);
    //   expect(tx1.args[2]).to.equal(stablePoolAddr);
    //   let _token3Addr = nativePoolToken1;
    //   let _token4Addr = nativePoolToken2;
    //   if (nativePoolToken1 == ZeroAddress) {
    //     _token3Addr = wrapAddr; // Translate token1 native->wrapped address
    //   }
    //   if (nativePoolToken2 == ZeroAddress) {
    //     _token4Addr = wrapAddr; // Translate token2 native->wrapped address
    //   }
    //   if (_token3Addr > _token4Addr) {
    //     const _addr3 = _token3Addr; // Cache address
    //     _token3Addr = _token4Addr; // Swap token1<>token2 addresses ...
    //     _token4Addr = _addr3; // ... into hexadecimal value order
    //   }
    //   let tx2 = await poolFactory
    //     .connect(addr1)
    //     .createPool(
    //       nativePoolInput1,
    //       nativePoolInput2,
    //       nativePoolToken1,
    //       nativePoolToken2,
    //       { value: nativePoolInput1 }
    //     );
    //   tx2 = await tx2.wait();
    //   tx2 = tx2.logs.filter(
    //     (x: any) => x.fragment && x.fragment.name === "PoolCreated"
    //   )[0];
    //   // console.log(tx2);
    //   const nativePoolAddr = await poolFactory.getPool(
    //     wrapAddr,
    //     nativePoolToken2
    //   );
    //   expect(tx2.args[0]).to.equal(_token3Addr);
    //   expect(tx2.args[1]).to.equal(_token4Addr);
    //   expect(tx2.args[2]).to.equal(nativePoolAddr);
    // });
  });
});
