import hre from "hardhat";
import { expect } from "chai";
import {
  bnbCexHW6,
  btcbAddr,
  burnLiq,
  busdAddr,
  connectToContract,
  getTokenBal,
  one,
  oneHundred,
  oneHundredThousand,
  oneMillion,
  oneThousand,
  spartaAddr,
  usdtAddr,
  wbnbAddr,
  zeroAddr,
} from "./utils/utils";
import BigNumber from "bignumber.js";
import { calcLiquidityUnits } from "./utils/maths";
import { ZeroAddress } from "ethers";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const wrapAddr = wbnbAddr; // Set the testing-chain's wrapped token here
const stablePoolToken1 = busdAddr;
const stablePoolToken2 = usdtAddr;
const stablePoolInput1 = oneHundredThousand; // Make sure these two are at least 100k ether units and equal to each other
const stablePoolInput2 = oneHundredThousand; // Make sure these two are at least 100k ether units and equal to each other
const nativePoolToken1 = zeroAddr;
const nativePoolToken2 = btcbAddr;
const nativePoolInput1 = oneHundred; // BTC -> BNB === 100x
const nativePoolInput2 = one; // BTC -> BNB === 100x
const startBalanceStables = oneMillion;
const startBalanceBtc = oneHundred;

describe("AMM Contracts Suite", function () {
  async function deployFixture() {
    /* Contracts are deployed using the first signer/account (ie. 'owner') by default */
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    /* Open whale impersonation request */
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [bnbCexHW6],
    });

    /* Impersonate a whale to gain BUSD balances in the test accounts */
    const bnbCexSigner = await hre.ethers.provider.getSigner(bnbCexHW6);
    const _busdAsBnbCex = await hre.ethers.getContractAt(
      "ERC20",
      busdAddr,
      bnbCexSigner
    ); // Get BUSD contract
    const busdAsBnbCex = _busdAsBnbCex.connect(bnbCexSigner); // Get BUSD contract with BinanceCex signer
    await busdAsBnbCex.transfer(addr1.address, startBalanceStables); // Give addr1 initial BUSD balance
    await busdAsBnbCex.transfer(addr2.address, startBalanceStables); // Give addr2 initial BUSD balance

    /* Impersonate a whale to gain USDT balances in the test accounts */
    const _usdtAsBnbCex = await hre.ethers.getContractAt(
      "ERC20",
      usdtAddr,
      bnbCexSigner
    ); // Get USDT contract
    const usdtAsBnbCex = _usdtAsBnbCex.connect(bnbCexSigner); // Get USDT contract with BinanceCex signer
    await usdtAsBnbCex.transfer(addr1.address, startBalanceStables); // Give addr1 initial USDT balance
    await usdtAsBnbCex.transfer(addr2.address, startBalanceStables); // Give addr2 initial USDT balance

    /* Impersonate a whale to gain BTCB balances in the test accounts */
    const _btcbAsBnbCex = await hre.ethers.getContractAt(
      "ERC20",
      btcbAddr,
      bnbCexSigner
    ); // Get BTCB contract
    const btcbAsBinCex = _btcbAsBnbCex.connect(bnbCexSigner); // Get BTCB contract with BinanceCex signer
    await btcbAsBinCex.transfer(addr1.address, startBalanceBtc); // Give addr1 initial BTCB balance
    await btcbAsBinCex.transfer(addr2.address, startBalanceBtc); // Give addr1 initial BTCB balance

    /* Close the impersonation request */
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [bnbCexHW6],
    });

    /* Deploy Contracts */
    const protocolToken = await hre.ethers.deployContract("Sparta", [
      spartaAddr,
    ]);
    await protocolToken.waitForDeployment();
    const poolFactory = await hre.ethers.deployContract("PoolFactory", [
      wrapAddr,
      protocolToken.target,
    ]);
    await poolFactory.waitForDeployment();
    const tools = await hre.ethers.deployContract("Tools", [
      protocolToken.target,
    ]);
    await tools.waitForDeployment();
    const reserve = await hre.ethers.deployContract("Reserve", [
      protocolToken.target,
    ]);
    await reserve.waitForDeployment();
    const handler = await hre.ethers.deployContract("Handler", [
      protocolToken.target,
    ]);
    await handler.waitForDeployment();

    /* Set Genesis Addresses */
    await handler.setGenesisAddresses(
      tools.target,
      reserve.target,
      poolFactory.target
    );
    await protocolToken.changeHandler(handler.target);

    /* Get token contract objects */
    const busdAsAddr1 = await connectToContract("ERC20", busdAddr, addr1); // Get BUSD contract object with addr1 signer
    const usdtAsAddr1 = await connectToContract("ERC20", usdtAddr, addr1); // Get USDT contract object with addr1 signer
    const btcbAsAddr1 = await connectToContract("ERC20", btcbAddr, addr1); // Get BTCB contract object with addr1 signer
    const busdAsAddr2 = await connectToContract("ERC20", busdAddr, addr2); // Get BUSD contract object with addr1 signer
    const usdtAsAddr2 = await connectToContract("ERC20", usdtAddr, addr2); // Get USDT contract object with addr1 signer
    const btcbAsAddr2 = await connectToContract("ERC20", btcbAddr, addr2); // Get BTCB contract object with addr1 signer

    // Uncomment to: test a mock pool contract size/gas
    // const poolToken = await ethers.deployContract("Pool", [
    //   "NAME",
    //   "SYMBOL",
    //   protocolToken.target,
    //   busdAddr,
    //   wbnbAddr,
    // ]);

    return {
      poolFactory,
      owner,
      addr1,
      addr2,
      busdAsAddr1,
      usdtAsAddr1,
      btcbAsAddr1,
      busdAsAddr2,
      usdtAsAddr2,
      btcbAsAddr2,
      protocolToken,
    };
  }

  async function createPoolsFixture() {
    const {
      poolFactory,
      owner,
      addr1,
      addr2,
      busdAsAddr1,
      usdtAsAddr1,
      btcbAsAddr1,
      busdAsAddr2,
      usdtAsAddr2,
      btcbAsAddr2,
      protocolToken,
    } = await loadFixture(deployFixture);

    /* Deploy Contracts */
    await busdAsAddr1.approve(poolFactory.target, oneMillion);
    await usdtAsAddr1.approve(poolFactory.target, oneMillion);
    await poolFactory
      .connect(addr1)
      .createPool(
        stablePoolInput1,
        stablePoolInput2,
        stablePoolToken1,
        stablePoolToken2
      );
    await btcbAsAddr1.approve(poolFactory.target, oneMillion);
    await poolFactory
      .connect(addr1)
      .createPool(
        nativePoolInput1,
        nativePoolInput2,
        nativePoolToken1,
        nativePoolToken2,
        { value: nativePoolInput1 }
      );

    /* Get pool contract addresses */
    const stablePoolAddr = await poolFactory.getPool(
      stablePoolToken1,
      stablePoolToken2
    );
    const nativePoolAddr = await poolFactory.getPool(
      wrapAddr,
      nativePoolToken2
    );

    /* Get pool contract objects */
    const stablePoolAsAddr1 = await connectToContract(
      "Pool",
      stablePoolAddr,
      addr1
    );
    const stablePoolAsAddr2 = await connectToContract(
      "Pool",
      stablePoolAddr,
      addr2
    );
    const nativePoolAsAddr1 = await connectToContract(
      "Pool",
      nativePoolAddr,
      addr1
    );
    const nativePoolAsAddr2 = await connectToContract(
      "Pool",
      nativePoolAddr,
      addr2
    );

    return {
      poolFactory,
      owner,
      addr1,
      addr2,
      busdAsAddr1,
      usdtAsAddr1,
      btcbAsAddr1,
      busdAsAddr2,
      usdtAsAddr2,
      btcbAsAddr2,
      stablePoolAddr,
      nativePoolAddr,
      protocolToken,
      stablePoolAsAddr1,
      nativePoolAsAddr1,
      stablePoolAsAddr2,
      nativePoolAsAddr2,
    };
  }

  describe("🏭 Pool Factory Contract", function () {
    describe("createPool() checks", function () {
      it("Pool deploy should fail if either inputs are !> 100k wei", async function () {
        const { poolFactory, addr1 } = await loadFixture(deployFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool("100000", oneHundred, busdAddr, zeroAddr)
        ).to.be.revertedWith("Input1!>100000");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneHundred, "100000", busdAddr, zeroAddr)
        ).to.be.revertedWith("Input2!>100000");
      });

      it("Pool deploy should fail if token1 & token2 are the same", async function () {
        const { poolFactory, addr1 } = await loadFixture(deployFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, busdAddr, busdAddr)
        ).to.be.revertedWith("!Valid");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, zeroAddr, zeroAddr)
        ).to.be.revertedWith("!Valid");
      });

      it("Pool deploy should fail if native<>wrapped pool is attempted", async function () {
        const { poolFactory, addr1 } = await loadFixture(deployFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, wrapAddr, zeroAddr)
        ).to.be.revertedWith("!Valid");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, zeroAddr, wrapAddr)
        ).to.be.revertedWith("!Valid");
      });

      it("Pool deploy should fail if duplicate configuration of paired tokens ", async function () {
        const { poolFactory, addr1 } = await loadFixture(createPoolsFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(
              stablePoolInput1,
              stablePoolInput2,
              stablePoolToken1,
              stablePoolToken2
            )
        ).to.be.revertedWith("Exists");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(
              stablePoolInput2,
              stablePoolInput1,
              stablePoolToken2,
              stablePoolToken1
            )
        ).to.be.revertedWith("Exists");
      });
    });

    describe("createPool() balances", function () {
      it("Pool and user balances must change by correct amounts", async function () {
        const {
          addr1,
          busdAsAddr1,
          usdtAsAddr1,
          btcbAsAddr1,
          stablePoolAddr,
          nativePoolAddr,
        } = await loadFixture(createPoolsFixture);
        // Get user balances after txn
        const addr1BusdBal = await getTokenBal(busdAsAddr1, addr1);
        const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
        // TODO: Add 'get' BNB addr1 balance
        const addr1BtcbBal = await getTokenBal(btcbAsAddr1, addr1);

        // Get pool balances after txn
        const poolBusdBal = await getTokenBal(busdAsAddr1, stablePoolAddr);
        const poolUsdtBal = await getTokenBal(usdtAsAddr1, stablePoolAddr);
        // TODO: Add 'get' BNB Pool balance
        const poolBtcbBal = await getTokenBal(btcbAsAddr1, nativePoolAddr);

        // Expected user & pool balances after txn
        const addr1BusdExp =
          BigNumber(startBalanceStables).minus(stablePoolInput1);
        const addr1UsdtExp =
          BigNumber(startBalanceStables).minus(stablePoolInput2);
        // TODO: Add BNB balance change expectations
        const addr1BtcbExp = BigNumber(startBalanceBtc).minus(nativePoolInput2);
        // console.log("DEBUG:", addr1BusdBal, addr1BusdExp.toFixed(0));

        // Run addr1 balance checks
        expect(addr1BusdBal).to.equal(addr1BusdExp.toFixed(0));
        expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
        // TODO: Add BNB addr1 balance change expectations
        expect(addr1BtcbBal).to.equal(addr1BtcbExp.toFixed(0));

        // Run pool balance checks
        expect(poolBusdBal).to.equal(stablePoolInput1);
        expect(poolUsdtBal).to.equal(stablePoolInput2);
        // TODO: Add BNB pool balance change expectations
        expect(poolBtcbBal).to.equal(nativePoolInput2);
      });

      it("User & burn address should receive the correct share of initial LP units", async function () {
        const { addr1, protocolToken, stablePoolAsAddr1, nativePoolAsAddr1 } =
          await loadFixture(createPoolsFixture);
        const burnAddr = protocolToken.target;

        // Get user balances after txn
        const addr1StableLpBal = await getTokenBal(stablePoolAsAddr1, addr1);
        const addr1NativeLpBal = await getTokenBal(nativePoolAsAddr1, addr1);

        // Get burnAddr balances after txn
        const burnedStableLpBal = await getTokenBal(
          stablePoolAsAddr1,
          burnAddr
        );
        const burnedNativeLpBal = await getTokenBal(
          nativePoolAsAddr1,
          burnAddr
        );

        // Total LP units minted
        const totalStableLps = calcLiquidityUnits(
          stablePoolInput1,
          "0",
          stablePoolInput2,
          "0",
          "0"
        );
        const totalNativeLps = calcLiquidityUnits(
          nativePoolInput1,
          "0",
          nativePoolInput2,
          "0",
          "0"
        );

        // Expected locked/burned balances after txn are === burnLiq
        const burnedStableLpExp = burnLiq;
        const burnedNativeLpExp = burnLiq;

        // Expected user balances after txn
        const addr1StableLpExp =
          BigNumber(totalStableLps).minus(burnedStableLpExp);
        const addr1NativeLpExp =
          BigNumber(totalNativeLps).minus(burnedNativeLpExp);

        // Run burned balance checks
        expect(burnedStableLpBal).to.equal(burnedStableLpExp);
        expect(burnedNativeLpBal).to.equal(burnedNativeLpExp);

        // Run addr1 balance checks
        expect(addr1StableLpBal).to.equal(addr1StableLpExp.toFixed(0));
        expect(addr1NativeLpBal).to.equal(addr1NativeLpExp.toFixed(0));
      });
    });

    describe("createPool() events", function () {
      it("Should emit PoolCreated event", async function () {
        const { poolFactory, addr1, busdAsAddr1, usdtAsAddr1, btcbAsAddr1 } =
          await loadFixture(deployFixture);

        await busdAsAddr1.approve(poolFactory.target, oneMillion);
        await usdtAsAddr1.approve(poolFactory.target, oneMillion);
        await btcbAsAddr1.approve(poolFactory.target, oneMillion);

        let _token1Addr = stablePoolToken1;
        let _token2Addr = stablePoolToken2;
        if (stablePoolToken1 == ZeroAddress) {
          _token1Addr = wrapAddr; // Translate token1 native->wrapped address
        }
        if (stablePoolToken2 == ZeroAddress) {
          _token2Addr = wrapAddr; // Translate token2 native->wrapped address
        }

        if (_token1Addr > _token2Addr) {
          const _addr1 = _token1Addr; // Cache address
          _token1Addr = _token2Addr; // Swap token1<>token2 addresses ...
          _token2Addr = _addr1; // ... into hexadecimal value order
        }

        let tx1 = await poolFactory
          .connect(addr1)
          .createPool(
            stablePoolInput1,
            stablePoolInput2,
            stablePoolToken1,
            stablePoolToken2
          );
        tx1 = await tx1.wait();
        tx1 = tx1.logs.filter(
          (x: any) => x.fragment && x.fragment.name === "PoolCreated"
        )[0];
        // console.log(tx1);

        const stablePoolAddr = await poolFactory.getPool(
          stablePoolToken1,
          stablePoolToken2
        );

        expect(tx1.args[0]).to.equal(_token1Addr);
        expect(tx1.args[1]).to.equal(_token2Addr);
        expect(tx1.args[2]).to.equal(stablePoolAddr);

        let _token3Addr = nativePoolToken1;
        let _token4Addr = nativePoolToken2;
        if (nativePoolToken1 == ZeroAddress) {
          _token3Addr = wrapAddr; // Translate token1 native->wrapped address
        }
        if (nativePoolToken2 == ZeroAddress) {
          _token4Addr = wrapAddr; // Translate token2 native->wrapped address
        }

        if (_token3Addr > _token4Addr) {
          const _addr3 = _token3Addr; // Cache address
          _token3Addr = _token4Addr; // Swap token1<>token2 addresses ...
          _token4Addr = _addr3; // ... into hexadecimal value order
        }

        let tx2 = await poolFactory
          .connect(addr1)
          .createPool(
            nativePoolInput1,
            nativePoolInput2,
            nativePoolToken1,
            nativePoolToken2,
            { value: nativePoolInput1 }
          );
        tx2 = await tx2.wait();
        tx2 = tx2.logs.filter(
          (x: any) => x.fragment && x.fragment.name === "PoolCreated"
        )[0];
        // console.log(tx2);

        const nativePoolAddr = await poolFactory.getPool(
          wrapAddr,
          nativePoolToken2
        );

        expect(tx2.args[0]).to.equal(_token3Addr);
        expect(tx2.args[1]).to.equal(_token4Addr);
        expect(tx2.args[2]).to.equal(nativePoolAddr);
      });
    });
  });

  describe("🏊‍♀️ Pool Contract", function () {
    describe("addForMember() checks", function () {
      it("LiqAdd should fail if either input is !> 0", async function () {
        // require(inputAsset1 > 0 && inputAsset2 > 0, "!In1");
        const {
          addr2,
          stablePoolAsAddr2,
          nativePoolAsAddr2,
          busdAsAddr2,
          usdtAsAddr2,
          btcbAsAddr2,
        } = await loadFixture(createPoolsFixture);

        // Get approvals
        await busdAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
        await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
        await btcbAsAddr2.approve(nativePoolAsAddr2.target, oneMillion);

        // Check stable pool
        await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
          "!In1"
        );
        await busdAsAddr2.transfer(stablePoolAsAddr2.target, oneHundred);
        await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
          "!In1"
        );

        // Check native pool
        await expect(nativePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
          "!In1"
        );
        await btcbAsAddr2.transfer(nativePoolAsAddr2.target, oneHundred);
        await expect(nativePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
          "!In1"
        );
      });

      it("LiqAdd should fail if resulting liq units !> 0", async function () {
        // require(liquidity > 0, "!Liq1");
        const {
          addr2,
          stablePoolAsAddr2,
          nativePoolAsAddr2,
          busdAsAddr2,
          usdtAsAddr2,
          btcbAsAddr2,
        } = await loadFixture(createPoolsFixture);

        // Get approvals
        await busdAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
        await usdtAsAddr2.approve(stablePoolAsAddr2.target, oneMillion);
        await btcbAsAddr2.approve(nativePoolAsAddr2.target, oneMillion);

        // Check stable pool (1 wei vs 100k ether is the friction point for this test)
        await busdAsAddr2.transfer(stablePoolAsAddr2.target, "1"); // (1 / 100000000000000000000000) = < 1 wei in LPs
        await usdtAsAddr2.transfer(stablePoolAsAddr2.target, "1"); // (1 / 100000000000000000000000) = < 1 wei in LPs
        await expect(stablePoolAsAddr2.addForMember(addr2)).to.be.revertedWith(
          "!Liq1"
        );

        // Hard to check native pool as the underflow is hard to reach without a larger TVL than we can easily simulate using whale wallets
      });
      // it("Pool deploy should fail if token1 & token2 are the same", async function () {
      //   const { poolFactory, addr1 } = await loadFixture(deployFixture);
      //   await expect(
      //     poolFactory
      //       .connect(addr1)
      //       .createPool(oneThousand, oneHundred, busdAddr, busdAddr)
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
      // it("Pool and user balances must change by correct amounts", async function () {
      //   const {
      //     addr1,
      //     busdAsAddr1,
      //     usdtAsAddr1,
      //     btcbAsAddr1,
      //     stablePoolAddr,
      //     nativePoolAddr,
      //   } = await loadFixture(createPoolsFixture);
      //   // Get user balances after txn
      //   const addr1BusdBal = await getTokenBal(busdAsAddr1, addr1);
      //   const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
      //   // TODO: Add 'get' BNB addr1 balance
      //   const addr1BtcbBal = await getTokenBal(btcbAsAddr1, addr1);
      //   // Get pool balances after txn
      //   const poolBusdBal = await getTokenBal(busdAsAddr1, stablePoolAddr);
      //   const poolUsdtBal = await getTokenBal(usdtAsAddr1, stablePoolAddr);
      //   // TODO: Add 'get' BNB Pool balance
      //   const poolBtcbBal = await getTokenBal(btcbAsAddr1, nativePoolAddr);
      //   // Expected user & pool balances after txn
      //   const addr1BusdExp =
      //     BigNumber(startBalanceStables).minus(stablePoolInput1);
      //   const addr1UsdtExp =
      //     BigNumber(startBalanceStables).minus(stablePoolInput2);
      //   // TODO: Add BNB balance change expectations
      //   const addr1BtcbExp = BigNumber(startBalanceBtc).minus(nativePoolInput2);
      //   // console.log("DEBUG:", addr1BusdBal, addr1BusdExp.toFixed(0));
      //   // Run addr1 balance checks
      //   expect(addr1BusdBal).to.equal(addr1BusdExp.toFixed(0));
      //   expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
      //   // TODO: Add BNB addr1 balance change expectations
      //   expect(addr1BtcbBal).to.equal(addr1BtcbExp.toFixed(0));
      //   // Run pool balance checks
      //   expect(poolBusdBal).to.equal(stablePoolInput1);
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
      //   const { poolFactory, addr1, busdAsAddr1, usdtAsAddr1, btcbAsAddr1 } =
      //     await loadFixture(deployFixture);
      //   await busdAsAddr1.approve(poolFactory.target, oneMillion);
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
});
