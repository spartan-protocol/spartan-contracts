//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
// Interfaces
import "./bsc-library/interfaces/iBEP20.sol"; // TODO: Replace with OpenZ ERC20 interface
import "./interfaces/iHandler.sol";
import "./interfaces/iTools.sol";
import "./interfaces/iSPARTA.sol";
// Libraries | Contracts
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// TODO: Add in OpenZ SafeERC20 library and use for safeTransfer() etc below
import "./utils/Math.sol";

contract Pool is iBEP20, ReentrancyGuard {
    using SafeMath for uint256;

    uint public constant minLiquidity = 10 ** 3;
    bytes4 private constant _tsfSelector =
        bytes4(keccak256(bytes("transfer(address,uint256)")));

    string private _name;
    string private _symbol;
    uint256 private _asset1Depth;
    uint256 private _asset2Depth;

    uint8 public override decimals;
    uint256 public genesis;
    uint256 public _totalSupply;
    address public asset1Addr; // Settlement Asset
    address public asset2Addr; // Paired Token
    address public immutable factoryAddr;
    address public immutable SPARTA; // Address of SPARTA token contract
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(
        address indexed sender,
        uint amount0,
        uint amount1,
        uint liquidity
    );
    // Event to signal that a token swap has occurred
    event Swap(
        address indexed inputToken,
        address indexed outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 swapFee
    );

    // Restrict access
    modifier onlyPROTOCOL() {
        require(
            msg.sender == _Handler().routerAddr() ||
                msg.sender == _Handler().poolFactoryAddr()
        );
        _;
    }

    constructor(address sparta, address newToken1Addr, address newToken2Addr) {
        factoryAddr = msg.sender;
        SPARTA = sparta;
        asset1Addr = newToken1Addr;
        asset2Addr = newToken2Addr;
        string memory poolFront = string(
            abi.encodePacked(
                iBEP20(newToken1Addr).symbol(),
                ":",
                iBEP20(newToken2Addr).symbol()
            )
        );
        _name = string(abi.encodePacked(poolFront, "-SpartanProtocolPool"));
        _symbol = string(abi.encodePacked(poolFront, "-SPP"));
        decimals = 18;
        genesis = block.timestamp;
    }

    ////// ALTERNATIVE DEPLOY METHOD w/ create2() - called once by the factory at time of deployment
    // function initialize(address newToken1Addr, address newToken2Addr) external {
    //     require(msg.sender == factoryAddr, "SPARTANPROTOCOL: FORBIDDEN"); // sufficient check
    //     asset1Addr = newToken1Addr;
    //     asset2Addr = newToken2Addr;
    //     string memory poolFront = string(
    //         abi.encodePacked(
    //             iBEP20(newToken1Addr).symbol(),
    //             ":",
    //             iBEP20(newToken2Addr).symbol()
    //         )
    //     );
    //     _name = string(abi.encodePacked(poolFront, "-SpartanProtocolPool"));
    //     _symbol = string(abi.encodePacked(poolFront, "-SPP"));
    //     decimals = 18;
    //     genesis = block.timestamp;
    // }

    function _Handler() internal view returns (iHandler) {
        return iSPARTA(SPARTA).handlerAddr(); // Get the Handler address reported by Sparta contract
    }

    //========================================IBEP20=========================================//

    /**
     * @dev Returns the token symbol.
     */
    function symbol() external view returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the DEPLOYER.
     */
    function getOwner() public view returns (address) {
        return factoryAddr;
    }

    /**
     * @dev Returns the token name.
     */
    function name() external view returns (string memory) {
        return _name;
    }

    /**
     * @dev See {BEP20-balanceOf}.
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() public view returns (uint) {
        return _totalSupply;
    }

    /**
     * @dev See {BEP20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(
        address recipient,
        uint256 amount
    ) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /**
     * @dev See {BEP20-allowance}.
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {BEP20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev See {BEP20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {BEP20};
     *
     * Requirements:
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for `sender`'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(
                amount,
                "BEP20: transfer amount exceeds allowance"
            )
        );
        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {BEP20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].add(addedValue)
        );
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {BEP20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender].sub(
                subtractedValue,
                "BEP20: decreased allowance below zero"
            )
        );
        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "BEP20: transfer from the zero address");
        require(recipient != address(0), "BEP20: transfer to the zero address");

        _balances[sender] = _balances[sender].sub(
            amount,
            "BEP20: transfer amount exceeds balance"
        );
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "BEP20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "BEP20: burn from the zero address");

        _balances[account] = _balances[account].sub(
            amount,
            "BEP20: burn amount exceeds balance"
        );
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    // Burn supply
    function burn(uint256 amount) public virtual override {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner`s tokens.
     *
     * This is internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "BEP20: approve from the zero address");
        require(spender != address(0), "BEP20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`.`amount` is then deducted
     * from the caller's allowance.
     *
     * See {_burn} and {_approve}.
     */
    function _burnFrom(address account, uint256 amount) internal {
        _burn(account, amount);
        _approve(
            account,
            msg.sender,
            _allowances[account][msg.sender].sub(
                amount,
                "BEP20: burn amount exceeds allowance"
            )
        );
    }

    //====================================POOL FUNCTIONS =================================//

    function add() external returns (uint256) {
        //  uint256 _actualAsset1Input = _checkAsset1Received(); // Get the received asset1 amount
        //  uint256 _actualAsset2Input = _checkAsset2Received(); // Get the received asset2 amount
    }

    // Contract adds liquidity for user
    function addForMember(
        address to
    ) external nonReentrant returns (uint liquidity) {
        uint current1Balance = iBEP20(asset1Addr).balanceOf(address(this));
        uint current2Balance = iBEP20(asset2Addr).balanceOf(address(this));
        uint256 inputAsset1 = current1Balance - _asset1Depth;
        uint256 inputAsset2 = current2Balance - _asset2Depth;

        require(inputAsset1 > 0 && inputAsset2 > 0, "POOL: INPUT_TOO_LOW");

        if (_totalSupply == 0) {
            liquidity = Math.sqrt(inputAsset1 * inputAsset2) - minLiquidity;
            _mint(SPARTA, minLiquidity); // permanently lock the first minLiquidity tokens
        } else {
            liquidity = iTools(_Handler().toolsAddr()).calcLiquidityUnits(
                inputAsset1,
                _asset1Depth,
                inputAsset2,
                _asset2Depth,
                _totalSupply
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
            iBEP20(asset1Addr).balanceOf(address(this)),
            iBEP20(asset2Addr).balanceOf(address(this))
        );
        uint256 liquidityPercentage = liquidity.mul(1e18).div(totalLiquidity);
        asset1Amount = current1Balance.mul(liquidityPercentage).div(1e18);
        asset2Amount = current2Balance.mul(liquidityPercentage).div(1e18);
        require(asset1Amount > 0 && asset2Amount > 0, "POOL: OUTPUT_TOO_LOW");
        _burn(msg.sender, liquidity);
        unchecked {
            _safeTransfer(asset1Addr, msg.sender, asset1Amount);
            _safeTransfer(asset2Addr, msg.sender, asset2Amount);
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

        uint256 outputTokenBalance = iBEP20(outputToken).balanceOf(
            address(this)
        );
        uint256 inputTokenBalance = iBEP20(inputToken).balanceOf(address(this));

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
            iBEP20(inputToken).safeTransferFrom(
                msg.sender,
                address(this),
                inputAmount
            ); // TODO: Add in OpenZ SafeERC20 library and use here
            iBEP20(outputToken).safeTransfer(msg.sender, outputAmount); // TODO: Add in OpenZ SafeERC20 library and use here
        }

        emit Swap(inputToken, outputToken, inputAmount, outputAmount, swapFee);
    }

    //=======================================INTERNAL LOGIC======================================//
    function getReserves()
        public
        view
        returns (uint256 asset1Depth, uint256 asset2Depth)
    {
        asset1Depth = _asset1Depth;
        asset2Depth = _asset2Depth;
    }

    // Sync internal balances to actual
    function sync() external onlyPROTOCOL {
        _asset1Depth = iBEP20(asset1Addr).balanceOf(address(this));
        _asset2Depth = iBEP20(asset2Addr).balanceOf(address(this));
    }

    function _safeTransfer(address token, address to, uint value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(_tsfSelector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "POOL: TRANSFER_FAILED"
        );
    }
}
