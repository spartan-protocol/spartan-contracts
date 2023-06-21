import hre, { ethers } from "hardhat";
import { expect } from "chai";
import {
  bnbCexHW6,
  busdAddr,
  connectToContract,
  getTokenBal,
  oneHundred,
  oneThousand,
  spartaAddr,
  tenThousand,
  usdtAddr,
  wbnbAddr,
  zeroAddr,
} from "./utils/utils";
import BigNumber from "bignumber.js";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const wrapAddr = wbnbAddr; // Set the testing-chain's wrapped token here

describe("AMM Contracts Suite", function () {
  async function deployFixture() {
    /* Contracts are deployed using the first signer/account (ie. 'owner') by default */
    const [owner, addr1, addr2] = await ethers.getSigners();

    /* Open whale impersonation request */
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [bnbCexHW6],
    });

    /* Impersonate a whale to gain BUSD balances in the test accounts */
    const bnbCexSigner = await ethers.provider.getSigner(bnbCexHW6);
    const _busdAsBnbCex = await hre.ethers.getContractAt(
      "iBEP20",
      busdAddr,
      bnbCexSigner
    ); // Get BUSD contract
    const busdAsBnbCex = _busdAsBnbCex.connect(bnbCexSigner); // Get BUSD contract with BinanceCex signer
    await busdAsBnbCex.transfer(addr1.address, tenThousand); // Give client1 initial BUSD balance

    /* Impersonate a whale to gain USDT balances in the test accounts */
    const _usdtAsBnbCex = await hre.ethers.getContractAt(
      "iBEP20",
      usdtAddr,
      bnbCexSigner
    ); // Get USDT contract
    const usdtAsBnbCex = _usdtAsBnbCex.connect(bnbCexSigner); // Get USDT contract with BinanceCex signer
    await usdtAsBnbCex.transfer(addr1.address, tenThousand); // Give client1 initial USDT balance

    /* Close the impersonation request */
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [bnbCexHW6],
    });

    /* Deploy Contracts */
    const protocolToken = await ethers.deployContract("Sparta", [spartaAddr]);
    await protocolToken.waitForDeployment();
    const poolFactory = await ethers.deployContract("PoolFactory", [
      wrapAddr,
      protocolToken.target,
    ]);
    await poolFactory.waitForDeployment();
    const tools = await ethers.deployContract("Tools", [protocolToken.target]);
    await tools.waitForDeployment();
    const reserve = await ethers.deployContract("Reserve", [
      protocolToken.target,
    ]);
    await reserve.waitForDeployment();
    const handler = await ethers.deployContract("Handler", [
      protocolToken.target,
    ]);
    await handler.waitForDeployment();

    /* Set Genesis Addresses */
    await handler.setGenesisAddresses(
      tools.target,
      reserve.target,
      poolFactory.target
    );

    /* Get token contract objects */
    const busdAsAddr1 = await connectToContract("iBEP20", busdAddr, addr1); // Get BUSD contract object with addr1 signer
    const usdtAsAddr1 = await connectToContract("iBEP20", usdtAddr, addr1); // Get USDT contract object with addr1 signer

    // Uncomment to: test a mock pool contract size/gas
    // const poolToken = await ethers.deployContract("Pool", [
    //   "NAME",
    //   "SYMBOL",
    //   protocolToken.target,
    //   busdAddr,
    //   wbnbAddr,
    // ]);

    return { poolFactory, owner, addr1, addr2, busdAsAddr1, usdtAsAddr1 };
  }

  describe("🏭 Pool Factory Contract", function () {
    describe("createPool() checks", function () {
      it("Pool deploy should fail if token1 & token2 are the same", async function () {
        const { poolFactory, addr1 } = await loadFixture(deployFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, busdAddr, busdAddr)
        ).to.be.revertedWith("!Valid1");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, zeroAddr, zeroAddr)
        ).to.be.revertedWith("!Valid1");
      });

      it("Pool deploy should fail if native<>wrapped pool is attempted", async function () {
        const { poolFactory, addr1 } = await loadFixture(deployFixture);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, wrapAddr, zeroAddr)
        ).to.be.revertedWith("!Valid2");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, zeroAddr, wrapAddr)
        ).to.be.revertedWith("!Valid2");
      });

      it("Pool deploy should fail if duplicate configuration of paired tokens ", async function () {
        const { poolFactory, addr1, busdAsAddr1, usdtAsAddr1 } =
          await loadFixture(deployFixture);
        await busdAsAddr1.approve(poolFactory.target, tenThousand); // approve BUSD tsf: addr1 -> poolFactory (enough for 2x pool creations)
        await usdtAsAddr1.approve(poolFactory.target, tenThousand); // approve USDT tsf: addr1 -> poolFactory (enough for 2x pool creations)
        await poolFactory
          .connect(addr1)
          .createPool(oneThousand, oneHundred, busdAddr, usdtAddr);
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, busdAddr, usdtAddr)
        ).to.be.revertedWith("Exists");
        await expect(
          poolFactory
            .connect(addr1)
            .createPool(oneThousand, oneHundred, usdtAddr, busdAddr)
        ).to.be.revertedWith("Exists");
      });
    });

    describe("createPool() balances", function () {
      it("Pool and user balances must change by correct amounts", async function () {
        const input1 = oneThousand;
        const input2 = oneHundred;
        const { poolFactory, addr1, busdAsAddr1, usdtAsAddr1 } =
          await loadFixture(deployFixture);
        // Get user balances before txn
        const addr1BusdBalBefore = await getTokenBal(busdAsAddr1, addr1);
        const addr1UsdtBalBefore = await getTokenBal(usdtAsAddr1, addr1);
        // Perform approvals
        await busdAsAddr1.approve(poolFactory.target, tenThousand);
        await usdtAsAddr1.approve(poolFactory.target, tenThousand);
        // Deploy the pool & get it's address
        await poolFactory
          .connect(addr1)
          .createPool(input1, input2, busdAddr, usdtAddr);
        const poolAddr = await poolFactory.getPool(busdAddr, usdtAddr);
        // Get user & pool balances after txn
        const addr1BusdBal = await getTokenBal(busdAsAddr1, addr1);
        const poolBusdBal = await getTokenBal(busdAsAddr1, poolAddr);
        const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
        const poolUsdtBal = await getTokenBal(usdtAsAddr1, poolAddr);
        // Expected user & pool balances after txn
        const addr1BusdExp = BigNumber(addr1BusdBalBefore).minus(input1);
        const addr1UsdtExp = BigNumber(addr1UsdtBalBefore).minus(input2);
        // console.log("DEBUG:", addr1BusdBal, addr1BusdExp.toFixed(0));
        expect(addr1BusdBal).to.equal(addr1BusdExp.toFixed(0));
        expect(poolBusdBal).to.equal(input1);
        expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
        expect(poolUsdtBal).to.equal(input2);
      });

      it("User & burn address should receive the correct share of initial LP units", async function () {
        // const input1 = oneThousand;
        // const input2 = oneHundred;
        // const { poolFactory, addr1, busdAsAddr1, usdtAsAddr1 } =
        //   await loadFixture(deployFixture);
        // // Get user balances before txn
        // const addr1BusdBalBefore = await getTokenBal(busdAsAddr1, addr1);
        // const addr1UsdtBalBefore = await getTokenBal(usdtAsAddr1, addr1);
        // // Perform approvals
        // await busdAsAddr1.approve(poolFactory.target, tenThousand);
        // await usdtAsAddr1.approve(poolFactory.target, tenThousand);
        // // Deploy the pool & get it's address
        // await poolFactory
        //   .connect(addr1)
        //   .createPool(input1, input2, busdAddr, usdtAddr);
        // const poolAddr = await poolFactory.getPool(busdAddr, usdtAddr);
        // // Get user & pool balances after txn
        // const addr1BusdBal = await getTokenBal(busdAsAddr1, addr1);
        // const poolBusdBal = await getTokenBal(busdAsAddr1, poolAddr);
        // const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
        // const poolUsdtBal = await getTokenBal(usdtAsAddr1, poolAddr);
        // // Expected user & pool balances after txn
        // const addr1BusdExp = BigNumber(addr1BusdBalBefore).minus(input1);
        // const addr1UsdtExp = BigNumber(addr1UsdtBalBefore).minus(input2);
        // // console.log("DEBUG:", addr1BusdBal, addr1BusdExp.toFixed(0));
        // expect(addr1BusdBal).to.equal(addr1BusdExp.toFixed(0));
        // expect(poolBusdBal).to.equal(input1);
        // expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
        // expect(poolUsdtBal).to.equal(input2);
      });
    });

    describe("Checks", function () {
      // it("Should fail if sender doesn't have enough tokens", async function () {
      //   const { hardhatToken, owner, addr1 } = await loadFixture(
      //     deployTokenFixture
      //   );
      //   const initialOwnerBalance = await hardhatToken.balanceOf(owner.address);
      //   // Try to send 1 token from addr1 (0 tokens) to owner.
      //   // `require` will evaluate false and revert the transaction.
      //   await expect(
      //     hardhatToken.connect(addr1).transfer(owner.address, 1)
      //   ).to.be.revertedWith("Not enough tokens");
      //   // Owner balance shouldn't have changed.
      //   expect(await hardhatToken.balanceOf(owner.address)).to.equal(
      //     initialOwnerBalance
      //   );
      // });
    });
    describe("Events", function () {
      // it("Should emit Transfer events", async function () {
      //   const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
      //     deployTokenFixture
      //   );
      //   // Transfer 50 tokens from owner to addr1
      //   await expect(hardhatToken.transfer(addr1.address, 50))
      //     .to.emit(hardhatToken, "Transfer")
      //     .withArgs(owner.address, addr1.address, 50);
      //   // Transfer 50 tokens from addr1 to addr2
      //   // We use .connect(signer) to send a transaction from another account
      //   await expect(hardhatToken.connect(addr1).transfer(addr2.address, 50))
      //     .to.emit(hardhatToken, "Transfer")
      //     .withArgs(addr1.address, addr2.address, 50);
      // });
    });
    describe("Logic", function () {
      // it("Should emit Transfer events", async function () {
      //   const { hardhatToken, owner, addr1, addr2 } = await loadFixture(
      //     deployTokenFixture
      //   );
      //   // Transfer 50 tokens from owner to addr1
      //   await expect(hardhatToken.transfer(addr1.address, 50))
      //     .to.emit(hardhatToken, "Transfer")
      //     .withArgs(owner.address, addr1.address, 50);
      //   // Transfer 50 tokens from addr1 to addr2
      //   // We use .connect(signer) to send a transaction from another account
      //   await expect(hardhatToken.connect(addr1).transfer(addr2.address, 50))
      //     .to.emit(hardhatToken, "Transfer")
      //     .withArgs(addr1.address, addr2.address, 50);
      // });
    });
  });

  describe("Pool Contract", function () {
    // TODO: Clone the above testing structure and create tests for the Pool contract
  });
});
