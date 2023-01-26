
import { formatUnits, parseEther } from "ethers/lib/utils";
import { artifacts, contract } from "hardhat";
import { assert, expect } from "chai";
import { BN, constants, expectEvent, expectRevert, time } from "@openzeppelin/test-helpers";

const Sparta = artifacts.require("./SPARTA.sol");
const Handler = artifacts.require("./HANDLER.sol");
const Tools = artifacts.require("./TOOLS.sol");
const poolFactory = artifacts.require("./POOLFACTORY.sol");
const pool = artifacts.require("./SPARTANPROTOCOLPOOL.sol");
const MockERC20 = artifacts.require("./UTILS/MockBEP20.sol");
const WrappedBNB = artifacts.require("./UTILS/WBNB.sol");
const reserve = artifacts.require("./RESERVE.sol");

let poolAB;let poolSB;let poolBT;
let tokenA;let tokenB;let tokenC;
let WBNB;
let SP;let spHandler;let spTools;let spReserve;let spFactory; let oldSparta;

contract('SPARTAN_PROTOCOL_POOL_FUNCTIONS', ([Depp, Paper, Scissors, John, Sumas, Yfirev, Tsrif, ...accounts]) => {
    // SET UP CONTRACT FILES

    before(async () => {
        // Deploy Factory
        spFactory = await poolFactory.new(Depp, { from: Depp });
        // Deploy Wrapped BNB
        WBNB = await WrappedBNB.new();
        // Deploy mockSparta token 
        oldSparta = await MockERC20.new("Sparta", "SPAARTA", parseEther("10000000"), { from: Depp });
        // Deploy New Sparta as $SP
        SP = await Sparta.new(oldSparta.address)
        // Deploy HANDLER 
        spHandler = await Handler.new(SP.address) 
        // Deploy TOOLS 
        spTools = await Tools.new()
        // Deploy RESERVE 
        spReserve = await reserve.new(SP.address)     
        // Deploy mock BEP20s
        tokenA = await MockERC20.new("Token A", "TA", parseEther("10000000"), { from: Depp });
        tokenB = await MockERC20.new("Token B", "TB", parseEther("10000000"), { from: Depp });
        tokenC = await MockERC20.new("Token C", "TC", parseEther("10000000"), { from: Depp });

        //Initiate Handler's addreses
        await spHandler.setGenesisAddresses(spTools.address, spReserve.address, spFactory.address, {from:Depp});
        await SP.changeHANDLER(spHandler.address)

        // Mint tokens
        for (let thisUser of [Depp, Paper, Scissors, John, Sumas, Yfirev, Tsrif]) {
            await tokenA.mintTokens(parseEther("2000000"), { from: thisUser });
            await tokenB.mintTokens(parseEther("2000000"), { from: thisUser });
            await tokenC.mintTokens(parseEther("2000000"), { from: thisUser });
           }
      });



      // TESTING STARTS HERE 
      baseParams()

})

async function baseParams(){
  it("Should deploy SPARTA", async function() {
      expect(await SP.name()).to.equal("Spartan Protocol AGIS");
      expect(await SP.symbol()).to.equal("SP");
      expect(String(await SP.decimals())).to.equal('18');
      expect(String(await SP.totalSupply())).to.equal('0');
      expect(String(await SP.maxSupply())).to.equal(parseEther("300000000").toString());
      expect(String(await SP.emissionCurve())).to.equal('2048');
      expect(await SP.emitting()).to.equal(false);
      expect(await SP.HANDLER()).to.equal(spHandler.address);
      expect(String(await SP.getDailyEmission())).to.equal(parseEther('0').toString());
    });
}




