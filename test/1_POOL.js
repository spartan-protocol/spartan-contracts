

const SPARTA = artifacts.require("./Sparta.sol");
const poolFactory = artifacts.require("./PoolFactory.sol");
const SPPOOL = artifacts.require("./SPARTANPROTOCOLPOOL.sol");
const MockERC20 = artifacts.require("./UTILS/MockBEP20.sol");


contract('SPARTANPROTOCOL_POOL_FUNCTIONS', ([DEP, PAPER, SCISSORS, JOHN, sumas, Yfirv, TSIF, ...accounts]) => {
    let poolAB;
    let poolSB;
    let poolBT;
    let poolFactory;
    let tokenA;
    let tokenB;
    let tokenC;
    let WBNB;

    before(async () => {
        // Deploy Factory
        poolFactory = await SPPOOL.new(DEP, { from: DEP });
    
        // Deploy Wrapped BNB
        wbnb = await WBNB.new(); 
        token1 = await MockERC20.new();
        // Deploy New Sparta
        SP = await SPARTA.new(token1)                   // deploy sparta v3
    
        // Deploy mock BEP20s
        tokenA = await MockERC20.new("Token A", "TA", parseEther("10000000"), { from: DEP });
        tokenB = await MockERC20.new("Token B", "TB", parseEther("10000000"), { from: DEP });
        tokenC = await MockERC20.new("Token C", "TC", parseEther("10000000"), { from: DEP });
    
      });


  
})
