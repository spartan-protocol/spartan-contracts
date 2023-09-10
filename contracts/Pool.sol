// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "./interfaces/iHandler.sol"; // TODO: Remove this *if we remove iTools*
import "./interfaces/iSPARTA.sol";
import "./interfaces/iTools.sol"; // TODO: Consider moving this inside pool contract if we want it immutable
// Libraries | Contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

//// TODO: Decide whether we want public burn() & burnFor() functions (probably not?)
//// Gas Increase if included: +0.127KiB (small impact)
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

//// TODO: Decide whether we want to allow for permit functionality
//// Gas Increase if included: +5.8KiB (massive impact)
// import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract Pool is ERC20, ReentrancyGuard {
    // Overrides
    using SafeERC20 for IERC20;

    // Constants
    address public immutable factoryAddr;
    address public immutable protocolTokenAddr; // TODO: Remove this *if we remove iTools* (but keep in mind we need a burn address still)
    address public immutable asset1Addr;
    address public immutable asset2Addr;
    uint256 public immutable genesis;

    // Variables
    uint256 private _asset1Depth; // Doesnt need to be public as we have getReserves() getter
    uint256 private _asset2Depth; // Doesnt need to be public as we have getReserves() getter

    // Mappings

    // Events
    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(
        address indexed sender,
        uint amount0,
        uint amount1,
        uint liquidity
    );
    event Swap(
        address indexed inputToken,
        address indexed outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 swapFee
    );

    // Constructor
    constructor(
        string memory name_,
        string memory symbol_,
        address newProtocolTokenAddr, // TODO: Remove this *if we remove iTools*
        address newToken1Addr,
        address newToken2Addr
    ) ERC20(name_, symbol_) {
        factoryAddr = msg.sender;
        protocolTokenAddr = newProtocolTokenAddr;
        asset1Addr = newToken1Addr;
        asset2Addr = newToken2Addr;
        genesis = block.timestamp;
    }

    // Read Functions
    function _Handler() internal view returns (iHandler) {
        // TODO: Remove this function *if we remove iTools*
        return iSPARTA(protocolTokenAddr).handlerAddr(); // Get the Handler address reported by the protocol token's contract
    }

    function getReserves()
        public
        view
        returns (uint256 asset1Depth, uint256 asset2Depth)
    {
        asset1Depth = _asset1Depth;
        asset2Depth = _asset2Depth;
    }

    // Write Functions
    function add() external returns (uint256) {
        //  uint256 _actualAsset1Input = _checkAsset1Received(); // Get the received asset1 amount
        //  uint256 _actualAsset2Input = _checkAsset2Received(); // Get the received asset2 amount
    }

    // Contract adds liquidity for user
    function addForMember(
        address to
    ) external nonReentrant returns (uint liquidity) {
        uint current1Balance = IERC20(asset1Addr).balanceOf(address(this));
        uint current2Balance = IERC20(asset2Addr).balanceOf(address(this));
        // TODO: Decide whether to cache _asset1Depth && _asset2Depth
        uint256 inputAsset1 = current1Balance - _asset1Depth;
        uint256 inputAsset2 = current2Balance - _asset2Depth;

        require(inputAsset1 > 0 && inputAsset2 > 0, "Input missing");

        uint _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            uint burnLiq = 1 ether; // Burn/lock portion (0.0001%)
            liquidity = 9999 ether; // Pool creator's portion (99.9999%)
            _mint(protocolTokenAddr, burnLiq); // Perma-lock some tokens to resist empty pool || wei rounding issues
        } else {
            // TODO: Consider moving the Tools math into this contract if we want it trustless/immutable
            liquidity = iTools(_Handler().toolsAddr()).calcLiquidityUnits(
                inputAsset1,
                _asset1Depth,
                inputAsset2,
                _asset2Depth,
                _totalSupply
            ); // Calculate liquidity tokens to mint
        }

        require(liquidity > 0, "LiqAdd too small");

        _mint(to, liquidity);

        _asset1Depth = current1Balance; // update reserves
        _asset2Depth = current2Balance; // update reserves

        emit Mint(msg.sender, inputAsset1, inputAsset2);
    }

    // Contract adds liquidity for user
    function addForMemberNewTest(
        address to
    ) external nonReentrant returns (uint liquidity) {
        uint current1Balance = IERC20(asset1Addr).balanceOf(address(this));
        uint current2Balance = IERC20(asset2Addr).balanceOf(address(this));
        // TODO: Decide whether to cache _asset1Depth && _asset2Depth
        uint256 inputAsset1 = current1Balance - _asset1Depth;
        uint256 inputAsset2 = current2Balance - _asset2Depth;

        require(inputAsset1 > 0 || inputAsset2 > 0, "Input missing");

        uint _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            uint burnLiq = 1 ether; // Burn/lock portion (0.0001%)
            liquidity = 9999 ether; // Pool creator's portion (99.9999%)
            _mint(protocolTokenAddr, burnLiq); // Perma-lock some tokens to resist empty pool || wei rounding issues
        } else {
            // TODO: Consider moving the Tools math into this contract if we want it trustless/immutable
            liquidity = iTools(_Handler().toolsAddr())
                .calcLiquidityUnitsNewTest(
                    inputAsset1,
                    _asset1Depth,
                    inputAsset2,
                    _asset2Depth,
                    _totalSupply
                ); // Calculate liquidity tokens to mint
        }

        require(liquidity > 0, "LiqAdd too small");

        _mint(to, liquidity);

        _asset1Depth = current1Balance; // update reserves
        _asset2Depth = current2Balance; // update reserves

        emit Mint(msg.sender, inputAsset1, inputAsset2);
    }

    // Contract removes liquidity for user
    function removeLiquidity(
        uint liquidity
    ) external nonReentrant returns (uint asset1Amount, uint asset2Amount) {
        require(liquidity > 0, "Input LP units must be > 0");
        uint totalLiquidity = totalSupply();
        require(totalLiquidity > liquidity, "Not enough liquidity available");
        uint asset1Bal = IERC20(asset1Addr).balanceOf(address(this));
        uint asset2Bal = IERC20(asset2Addr).balanceOf(address(this));
        uint256 liquidityPercentage = (liquidity * (1 ether)) /
            (totalLiquidity);
        asset1Amount = (asset1Bal * (liquidityPercentage)) / (1 ether);
        asset2Amount = (asset2Bal * (liquidityPercentage)) / (1 ether);
        require(
            asset1Amount > 0 && asset2Amount > 0,
            "Insufficient assets withdrawn"
        );
        _burn(msg.sender, liquidity);
        unchecked {
            IERC20(asset1Addr).safeTransfer(msg.sender, asset1Amount);
            IERC20(asset2Addr).safeTransfer(msg.sender, asset2Amount);
        }
        _sync();
        emit Burn(msg.sender, asset1Amount, asset2Amount, liquidity);
    }

    function swapToken() external nonReentrant returns (uint256 outputAmount) {
        address _asset1Addr = asset1Addr;
        address _asset2Addr = asset2Addr;
        uint256 asset1Depth = _asset1Depth;
        uint256 asset2Depth = _asset2Depth;
        require(asset1Depth > 0 && asset2Depth > 0, "Insufficient liquidity");

        uint256 asset1TokenBal = IERC20(_asset1Addr).balanceOf(address(this));
        uint256 asset2TokenBal = IERC20(_asset2Addr).balanceOf(address(this));

        uint256 asset1Input = asset1TokenBal - asset1Depth;
        uint256 asset2Input = asset2TokenBal - asset2Depth;
        require(
            !(asset1Input > 0 && asset2Input > 0),
            "Two input assets detected"
        ); // TODO: Decide if we want to allow this (LPs absorb the mistake)
        uint256 swapFee;

        if (asset1Input > 0) {
            outputAmount = _performSwap(
                asset1Input,
                asset1Depth,
                asset2Depth,
                asset2Addr
            );
            swapFee = _getSwapFee(asset1Input, asset1Depth, asset2Depth);
        } else {
            outputAmount = _performSwap(
                asset2Input,
                asset2Depth,
                asset1Depth,
                asset1Addr
            );
            swapFee = _getSwapFee(asset2Input, asset2Depth, asset1Depth);
        }

        _sync();
        emit Swap(
            asset1Input > 0 ? asset1Addr : asset2Addr,
            asset1Input > 0 ? asset2Addr : asset1Addr,
            asset1Input > 0 ? asset1Input : asset2Input,
            outputAmount,
            swapFee
        );
    }

    function _performSwap(
        uint256 inputAmount,
        uint256 inputDepth,
        uint256 outputDepth,
        address toAsset
    ) internal returns (uint256) {
        uint256 outputAmount = _getSwapOutput(
            inputAmount,
            inputDepth,
            outputDepth
        );
        require(outputAmount > 0, "Swap too small");
        unchecked {
            IERC20(toAsset).safeTransfer(msg.sender, outputAmount);
        }
        return outputAmount;
    }

    function _squared(uint256 x) internal pure returns (uint256) {
        // --- Readable Version ---
        //// return x ** 2;

        // --- Gas efficient version ---
        return x * x;
    }

    function _getSwapOutput(
        uint256 inputAmount,
        uint256 inputDepth,
        uint256 outputDepth
    ) internal pure returns (uint256) {
        // --- Readable Version ---
        //// uint256 numerator = inputAmount * inputDepth * outputDepth;
        //// uint256 denominator = _squared(inputAmount + inputDepth);
        //// return numerator / denominator;

        // --- Gas efficient version ---
        return
            (inputAmount * inputDepth * outputDepth) /
            (_squared(inputAmount + inputDepth));
    }

    function _getSwapFee(
        uint256 inputAmount,
        uint256 inputDepth,
        uint256 outputDepth
    ) internal pure returns (uint256) {
        // --- Readable Version ---
        //// uint256 numerator = _squared(inputAmount) * outputDepth;
        //// uint256 denominator = _squared(inputAmount + inputDepth);
        //// return numerator / denominator;

        // --- Gas efficient version ---
        return
            (_squared(inputAmount) * outputDepth) /
            (_squared(inputAmount + inputDepth));
    }

    ////// TODO: Decide whether this is needed externally and if so, very carefully permission it
    function _sync() internal {
        _asset1Depth = IERC20(asset1Addr).balanceOf(address(this));
        _asset2Depth = IERC20(asset2Addr).balanceOf(address(this));
    }
}
