import { formatUnits, parseEther } from "ethers/lib/utils";
import { artifacts, contract } from "hardhat";
import { assert, expect } from "chai";
import {
  BN,
  constants,
  expectEvent,
  expectRevert,
  time,
} from "@openzeppelin/test-helpers";
const { ethers } = require("hardhat");
var BigNumber = require("bignumber.js");
const _ = require("./utils.js");

const Sparta = artifacts.require("./SPARTA.sol");
const Handler = artifacts.require("./HANDLER.sol");
const Tools = artifacts.require("./TOOLS.sol");
const poolFactory = artifacts.require("./POOLFACTORY.sol");
const pool = artifacts.require("./SPARTANPROTOCOLPOOL.sol");
const MockBEP20 = artifacts.require("./UTILS/MockBEP20.sol");
const WrappedBNB = artifacts.require("./UTILS/WBNB.sol");
const reserve = artifacts.require("./RESERVE.sol");

let poolAB;
let poolSB;
let poolBT;
let tokenA;
let tokenB;
let tokenC;
let WBNB;
let SP;
let spHandler;
let spTools;
let spReserve;
let spFactory;
let oldSparta;

contract(
  "SPARTAN_PROTOCOL_POOL_FUNCTIONS",
  ([Depp, Paper, Scissors, John, Sumas, Yfirev, Tsrif, ...accounts]) => {
    // SET UP CONTRACT FILES

    before(async () => {
      // Deploy Factory
      spFactory = await poolFactory.new(Depp, { from: Depp });
      // Deploy Wrapped BNB
      WBNB = await WrappedBNB.new();
      // Deploy mockSparta token
      oldSparta = await MockBEP20.new(
        "Sparta",
        "SPAARTA",
        parseEther("10000000"),
        { from: Depp }
      );
      // Deploy New Sparta as $SP
      SP = await Sparta.new(oldSparta.address);
      // Deploy HANDLER
      spHandler = await Handler.new(SP.address);
      // Deploy TOOLS
      spTools = await Tools.new();
      // Deploy RESERVE
      spReserve = await reserve.new(SP.address);
      // Deploy mock BEP20s
      tokenA = await MockBEP20.new("Token A", "TA", parseEther("10000000"), {
        from: Depp,
      });
      tokenB = await MockBEP20.new("Token B", "TB", parseEther("10000000"), {
        from: Depp,
      });
      tokenC = await MockBEP20.new("Token C", "TC", parseEther("10"), {
        from: Depp,
      });

      //Initiate Handler's addreses
      await spHandler.setGenesisAddresses(
        spTools.address,
        spReserve.address,
        spFactory.address,
        { from: Depp }
      );
      await SP.changeHANDLER(spHandler.address);

      // Mint tokens
      for (let thisUser of [
        Depp,
        Paper,
        Scissors,
        John,
        Sumas,
        Yfirev,
        Tsrif,
      ]) {
        await tokenA.mintTokens(parseEther("2000000"), { from: thisUser });
        await tokenB.mintTokens(parseEther("2000000"), { from: thisUser });
        await tokenC.mintTokens(parseEther("2000000"), { from: thisUser });
        await oldSparta.mintTokens(parseEther("2000000"), { from: thisUser });
        await oldSparta.approve(SP.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenA.approve(SP.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenB.approve(SP.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenC.approve(SP.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenA.approve(spFactory.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenB.approve(spFactory.address, constants.MAX_UINT256, {
          from: thisUser,
        });
        await tokenC.approve(spFactory.address, constants.MAX_UINT256, {
          from: thisUser,
        });
      }
    });

    // TESTING STARTS HERE
    deploySparta();
    upgradeSparta(Depp);
    createPool(John);
  }
);

async function deploySparta() {
  it("Should deploy SPARTA", async function () {
    expect(await SP.name()).to.equal("Spartan Protocol AGIS");
    expect(await SP.symbol()).to.equal("SP");
    expect(String(await SP.decimals())).to.equal("18");
    expect(String(await SP.totalSupply())).to.equal("0");
    expect(String(await SP.maxSupply())).to.equal(
      parseEther("300000000").toString()
    );
    expect(String(await SP.emissionCurve())).to.equal("2048");
    expect(await SP.emitting()).to.equal(false);
    expect(await SP.HANDLER()).to.equal(spHandler.address);
    expect(String(await SP.getDailyEmission())).to.equal(
      parseEther("0").toString()
    );
  });
}

async function upgradeSparta(acc) {
  it("It should upgrade sparta v2 - v3", async () => {
    let balance = String(await oldSparta.balanceOf(acc));
    let sbalance = String(await SP.balanceOf(acc));
    await SP.migrate({ from: acc });
    let balanceA = String(await oldSparta.balanceOf(acc));
    let sbalanceA = String(await SP.balanceOf(acc));
    assert.equal(String(balanceA), String(sbalance));
    assert.equal(String(balance), String(sbalanceA));
  });
}

async function createPool(acc) {
  it("should create a pool", async function () {
    let inputA = parseEther("100");
    let inputB = parseEther("110");
    var initialLength = _.getBN(await spFactory.allPoolsLength());
    var _pool = await spFactory.createPool.call(
      inputA,
      inputB,
      tokenA.address,
      tokenB.address
    );
    await spFactory.createPool(inputA, inputB, tokenA.address, tokenB.address, {
      from: acc,
    });
    var poolAddress = await pool.at(_pool);
    let values = [tokenA.address, tokenB.address];
    let [token0, token1] = values.sort((a, b) => (a > b ? 1 : -1));
    expect(await poolAddress.ASSET()).to.equal(token0);
    expect(await poolAddress.TOKEN()).to.equal(token1);
    const newLength = await spFactory.allPoolsLength();
    assert.equal(String(newLength), _.BN2Str(initialLength.plus(1)));
  });
}
