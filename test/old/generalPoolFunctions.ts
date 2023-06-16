import { formatUnits, parseEther } from "ethers/lib/utils";
import { artifacts, contract } from "hardhat";
import { assert, expect  } from "chai";
import {
  BN,
  constants,
  expectEvent,
  time,
} from "@openzeppelin/test-helpers";
const { ethers } = require("hardhat");
var BigNumber = require("bignumber.js");
const _ = require("./utils.js");
const truffleAssert = require('truffle-assertions');


const Sparta = artifacts.require("./Sparta.sol");
const Handler = artifacts.require("./Handler.sol");
const Tools = artifacts.require("./Tools.sol");
const PoolFactory = artifacts.require("./PoolFactory.sol");
const Pool = artifacts.require("./Pool.sol");
const MockBEP20 = artifacts.require("./UTILS/MockBEP20.sol");
const WrappedBNB = artifacts.require("./UTILS/WBNB.sol");
const Reserve = artifacts.require("./Reserve.sol");

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
  "General Pool Functions",
  ([Depp, Paper, Scissors, John, Sumas, Yfirev, Tsrif, ...accounts]) => {
    // SET UP CONTRACT FILES

    before(async () => {
      
      // Deploy Wrapped BNB
      WBNB = await WrappedBNB.new();
      // Deploy Factory
      spFactory = await PoolFactory.new(WBNB.address, { from: Depp });
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
      spTools = await Tools.new(SP.address);
      // Deploy RESERVE
      spReserve = await Reserve.new(SP.address);
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
      await SP.changeHandler(spHandler.address);

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
    expect(await SP.name()).to.equal("Spartan Protocol Ecosystem Token");
    expect(await SP.symbol()).to.equal("SP");
    expect(String(await SP.decimals())).to.equal("18");
    expect(String(await SP.totalSupply())).to.equal("0");
    expect(String(await SP.maxSupply())).to.equal(
      parseEther("300000000").toString()
    );
    expect(await SP.handlerAddr()).to.equal(spHandler.address);
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
  it("should create a pool", async () => {
    let inputA = String(parseEther("102"));
    let inputB = String(parseEther("111"));
    var initialLength = _.getBN(await spFactory.poolCount());
    
    var _pool = await spFactory.createPool.call(
      inputA,
      inputB,
      tokenA.address,
      tokenB.address
    ,{from:acc});
    
    let initUsrBalTokenA = _.getBN(await tokenA.balanceOf(acc));
    let initUsrBalTokenB = _.getBN(await tokenB.balanceOf(acc));

   
    await spFactory.createPool(inputA, inputB, tokenA.address, tokenB.address, {
      from: acc,
    });
    var poolAddress = await Pool.at(_pool);


    let values = [tokenA.address, tokenB.address];
    let [token0, token1] = values.sort((a, b) => (a > b ? 1 : -1));
    expect(await poolAddress.asset1Addr()).to.equal(token0);
    expect(await poolAddress.asset2Addr()).to.equal(token1);
    const newLength = await spFactory.poolCount();
    let endUsrBalTokenA = _.getBN(await tokenA.balanceOf(acc));
    let endUsrBalTokenB = _.getBN(await tokenB.balanceOf(acc));
    let endPoolBalTokenA = _.getBN(await tokenA.balanceOf(poolAddress.address));
    let endPoolBalTokenB = _.getBN(await tokenB.balanceOf(poolAddress.address));

    const  {0:endPoolAssetDepthA,1:endPoolAssetDepthB,2: _blockTimestampLast} = await poolAddress.getReserves();
    assert.equal(String(newLength), _.BN2Str(initialLength.plus(1)));
    assert.equal(_.BN2Str(endUsrBalTokenA), _.BN2Str(initUsrBalTokenA.minus(inputA)));
    assert.equal(_.BN2Str(endUsrBalTokenB), _.BN2Str(initUsrBalTokenB.minus(inputB)));
    assert.equal(_.BN2Str(endPoolBalTokenA), _.BN2Str(inputA));
    assert.equal(_.BN2Str(endPoolBalTokenB), _.BN2Str(inputB));
    assert.equal(_.BN2Str(endPoolAssetDepthA), _.BN2Str(_.getBN(inputB)));
    assert.equal(_.BN2Str(endPoolAssetDepthB), _.BN2Str(_.getBN(inputA)));
    
    await truffleAssert.reverts(spFactory.createPool(inputA, inputB, tokenB.address, tokenB.address, {
      from: acc,
    }), "SpartanProtocolPool: IDENTICAL_ADDRESSES");
    
    await truffleAssert.reverts(spFactory.createPool(inputB, inputB,  "0x0000000000000000000000000000000000000000", WBNB.address, {
      from: acc,
    }), "SpartanProtocol : NICE TRY");

    await truffleAssert.reverts(spFactory.createPool(inputB, inputB,  tokenB.address, tokenA.address, {
      from: acc,
    }), "SpartanProtocalPool: POOL_EXISTS");
    
  });



}
