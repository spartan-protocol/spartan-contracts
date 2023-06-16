// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "./interfaces/iHandler.sol";
import "./interfaces/iSPARTA.sol";
import "./interfaces/iTools.sol"; // TODO: Consider moving this inside pool contract if we want it immutable
// Libraries | Contracts
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol"; // TODO: Decide whether we want public burn() & burnFor() functions (probably not?)
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol"; // TODO: Decide whether we want to allow for permit functionality

contract Pool is ERC20, ERC20Burnable, ERC20Permit, ReentrancyGuard {
    // Overrides
    using SafeERC20 for IERC20;

    // Constant/Immutable Vars
    address public immutable factoryAddr;
    address public immutable protocolTokenAddr;
    address public immutable asset1Addr;
    address public immutable asset2Addr;
    uint256 public immutable genesis;

    // Other Vars
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
        address newProtocolTokenAddr,
        address newToken1Addr,
        address newToken2Addr
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        factoryAddr = msg.sender;
        protocolTokenAddr = newProtocolTokenAddr;
        asset1Addr = newToken1Addr;
        asset2Addr = newToken2Addr;
        genesis = block.timestamp;
    }

    // Read Functions
    function _Handler() internal view returns (iHandler) {
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
        uint256 inputAsset1 = current1Balance - _asset1Depth;
        uint256 inputAsset2 = current2Balance - _asset2Depth;

        require(inputAsset1 > 0 && inputAsset2 > 0, "POOL: INPUT_TOO_LOW");

        if (totalSupply() == 0) {
            uint minLiquidity = 10 ** 3;
            liquidity = Math.sqrt(inputAsset1 * inputAsset2) - minLiquidity;
            _mint(protocolTokenAddr, minLiquidity); // permanently lock the first minLiquidity tokens
        } else {
            liquidity = iTools(_Handler().toolsAddr()).calcLiquidityUnits(
                inputAsset1,
                _asset1Depth,
                inputAsset2,
                _asset2Depth,
                totalSupply()
            ); // Calculate liquidity tokens to mint
        }

        require(liquidity > 0, "POOL: MINTED_TOO_LOW");

        _mint(to, liquidity);

        _asset1Depth = current1Balance; // update reserves
        _asset2Depth = current2Balance; // update reserves

        emit Mint(msg.sender, inputAsset1, inputAsset2);
    }

    // Contract removes liquidity for user
    function removeLiquidity(
        uint liquidity
    ) external nonReentrant returns (uint asset1Amount, uint asset2Amount) {
        require(liquidity > 0, "POOL: INPUT_TOO_LOW");
        uint totalLiquidity = totalSupply();
        require(totalLiquidity > 0, "POOL: SUPPLY_TOO_LOW");
        (uint current1Balance, uint current2Balance) = (
            IERC20(asset1Addr).balanceOf(address(this)),
            IERC20(asset2Addr).balanceOf(address(this))
        );
        uint256 liquidityPercentage = liquidity.mul(1e18).div(totalLiquidity);
        asset1Amount = current1Balance.mul(liquidityPercentage).div(1e18);
        asset2Amount = current2Balance.mul(liquidityPercentage).div(1e18);
        require(asset1Amount > 0 && asset2Amount > 0, "POOL: OUTPUT_TOO_LOW");
        _burn(msg.sender, liquidity);

        unchecked {
            IERC20(asset1Addr).safeTransfer(msg.sender, asset1Amount);
            IERC20(asset2Addr).safeTransfer(msg.sender, asset2Amount);
        }
        emit Burn(msg.sender, asset1Amount, asset2Amount, liquidity);
    }

    function swapToken(
        address inputToken,
        address outputToken,
        uint256 inputAmount
    ) external nonReentrant returns (uint256 outputAmount) {
        require(inputToken != outputToken, "POOL: TOKEN_ADDR_SAME");

        (uint256 inputTokenDepth, uint256 outputTokenDepth) = getReserves();
        require(
            inputTokenDepth > 0 && outputTokenDepth > 0,
            "POOL: RESERVES_TOO_LOW"
        );

        uint256 outputTokenBalance = IERC20(outputToken).balanceOf(
            address(this)
        );
        uint256 inputTokenBalance = IERC20(inputToken).balanceOf(address(this));

        uint256 numerator = inputAmount.mul(inputTokenDepth).mul(
            outputTokenBalance
        );
        uint256 denominator = (inputAmount.add(inputTokenBalance)).mul(
            inputAmount.add(inputTokenDepth)
        );
        outputAmount = numerator.div(denominator);
        uint256 swapFee = outputAmount
            .mul(outputAmount)
            .mul(outputTokenDepth)
            .div(
                (inputAmount.add(inputTokenDepth)).mul(
                    inputAmount.add(inputTokenDepth)
                )
            );
        require(outputAmount > 0, "POOL: OUTPUT_TOO_LOW");
        unchecked {
            IERC20(inputToken).safeTransferFrom(
                msg.sender,
                address(this),
                inputAmount
            );
            IERC20(outputToken).safeTransfer(msg.sender, outputAmount);
        }

        emit Swap(inputToken, outputToken, inputAmount, outputAmount, swapFee);
    }

    ////// TODO: Decide whether this is needed
    // function sync() external onlyPROTOCOL {
    //     _asset1Depth = iBEP20(asset1Addr).balanceOf(address(this));
    //     _asset2Depth = iBEP20(asset2Addr).balanceOf(address(this));
    // }
}
