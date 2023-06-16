import { wbnbAddr } from "./utils/utils";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const wrapAddr = wbnbAddr; // Set the testing-chain's wrapped token here

describe("AMM Contracts Suite", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const poolFactory = await ethers.deployContract("PoolFactory"); // TODO: Add params (newWrapAddr, newBurnAddr)
    await poolFactory.waitForDeployment();
    return { poolFactory, owner, addr1, addr2 };
  }

  describe("Pool Factory Contract", function () {
    describe("createPool()", function () {
      it("Pool deploy should fail if token1 & token2 are the same", async function () {
        const { hardhatToken, owner, addr1 } = await loadFixture(deployFixture);
        // await expect(
        //   hardhatToken.connect(addr1).transfer(owner.address, 1)
        // ).to.be.revertedWith("Not enough tokens");
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
