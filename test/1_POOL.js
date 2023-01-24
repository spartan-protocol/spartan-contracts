const assert = require("chai").assert;

const SPARTA = artifacts.require("./Sparta.sol");
const poolFactory = artifacts.require("./PoolFactory.sol");
const SPPOOL = artifacts.require("./SPARTANPROTOCOLPOOL.sol");
const MockERC20 = artifacts.require("./UTILS/MockBEP20.sol");
const WrappedBNB = artifacts.require("./UTILS/WBNB.sol");


contract('SPARTANPROTOCOL_POOL_FUNCTIONS', ([Depp, Paper, Scissors, John, Sumas, Yfirev, Tsrif, ...accounts]) => {
    let poolAB;
    let poolSB;
    let poolBT;
    let spartanPoolFactory;
    let tokenA;
    let tokenB;
    let tokenC;
    let WBNB;
    let SP;

    before(async () => {
        // Deploy Factory
        spartanPoolFactory = await poolFactory.new(Depp, { from: Depp });
    
        // Deploy Wrapped BNB
        WBNB = await WrappedBNB.new(); 
        oldSparta = await MockERC20.new();
        // Deploy New Sparta
        SP = await SPARTA.new(oldSparta)                   // deploy sparta v3
    
        // Deploy mock BEP20s
        tokenA = await MockERC20.new("Token A", "TA", parseEther("10000000"), { from: Depp });
        tokenB = await MockERC20.new("Token B", "TB", parseEther("10000000"), { from: Depp });
        tokenC = await MockERC20.new("Token C", "TC", parseEther("10000000"), { from: Depp });

        // Create three pools
        let result = await poolFactory.createPool(SP.address, WBNB.address, { from: Depp });
        poolAB = await SPPOOL.at(result.logs[0].args[2]);

    
      });

     
  
})




