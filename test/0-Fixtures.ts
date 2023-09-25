import hre from "hardhat";
import {
  bnbCexHW6,
  btcbAddr,
  usdcAddr,
  connectToContract,
  oneMillion,
  spartaAddr,
  usdtAddr,
} from "./utils/utils";
import {
  nativePoolInput1,
  nativePoolInput2,
  nativePoolToken1,
  nativePoolToken2,
  stablePoolInput1,
  stablePoolInput2,
  stablePoolToken1,
  stablePoolToken2,
  startBalanceBtc,
  startBalanceStables,
  wrapAddr,
} from "./utils/variables";
import BigNumber from "bignumber.js";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export const deployFixture = async () => {
  /* Contracts are deployed using the first signer/account (ie. 'owner') by default */
  const [owner, addr1, addr2] = await hre.ethers.getSigners();

  /* Open whale impersonation request */
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [bnbCexHW6],
  });

  /* Impersonate a whale to gain usdc balances in the test accounts */
  const bnbCexSigner = await hre.ethers.provider.getSigner(bnbCexHW6);
  const _usdcAsBnbCex = await hre.ethers.getContractAt(
    "ERC20",
    usdcAddr,
    bnbCexSigner
  ); // Get usdc contract
  const usdcAsBnbCex = _usdcAsBnbCex.connect(bnbCexSigner); // Get usdc contract with BinanceCex signer
  await usdcAsBnbCex.transfer(addr1.address, startBalanceStables); // Give addr1 initial usdc balance
  await usdcAsBnbCex.transfer(addr2.address, startBalanceStables); // Give addr2 initial usdc balance

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
  const protocolToken = await hre.ethers.deployContract("Sparta", [spartaAddr]);
  await protocolToken.waitForDeployment();
  const poolFactory = await hre.ethers.deployContract("PoolFactory", [
    wrapAddr,
    protocolToken.target,
  ]);
  await poolFactory.waitForDeployment();
  const testHelpers = await hre.ethers.deployContract("TestHelpers", [
    wrapAddr,
  ]);
  await testHelpers.waitForDeployment();
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
  const usdcAsAddr1 = await connectToContract("ERC20", usdcAddr, addr1); // Get usdc contract object with addr1 signer
  const usdtAsAddr1 = await connectToContract("ERC20", usdtAddr, addr1); // Get USDT contract object with addr1 signer
  const btcbAsAddr1 = await connectToContract("ERC20", btcbAddr, addr1); // Get BTCB contract object with addr1 signer
  const usdcAsAddr2 = await connectToContract("ERC20", usdcAddr, addr2); // Get usdc contract object with addr1 signer
  const usdtAsAddr2 = await connectToContract("ERC20", usdtAddr, addr2); // Get USDT contract object with addr1 signer
  const btcbAsAddr2 = await connectToContract("ERC20", btcbAddr, addr2); // Get BTCB contract object with addr1 signer

  // Uncomment to: test a mock pool contract size/gas
  // const poolToken = await ethers.deployContract("Pool", [
  //   "NAME",
  //   "SYMBOL",
  //   protocolToken.target,
  //   usdcAddr,
  //   wbnbAddr,
  // ]);

  return {
    poolFactory,
    testHelpers,
    owner,
    addr1,
    addr2,
    usdcAsAddr1,
    usdtAsAddr1,
    btcbAsAddr1,
    usdcAsAddr2,
    usdtAsAddr2,
    btcbAsAddr2,
    protocolToken,
  };
};

export const createPoolsFixture = async () => {
  const {
    poolFactory,
    testHelpers,
    owner,
    addr1,
    addr2,
    usdcAsAddr1,
    usdtAsAddr1,
    btcbAsAddr1,
    usdcAsAddr2,
    usdtAsAddr2,
    btcbAsAddr2,
    protocolToken,
  } = await loadFixture(deployFixture);

  /* Deploy Contracts */
  await usdcAsAddr1.approve(poolFactory.target, oneMillion);
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
  const nativePoolAddr = await poolFactory.getPool(wrapAddr, nativePoolToken2);

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
    testHelpers,
    owner,
    addr1,
    addr2,
    usdcAsAddr1,
    usdtAsAddr1,
    btcbAsAddr1,
    usdcAsAddr2,
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
};
