// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./bsc-library/interfaces/iBEP20.sol";
import "./interfaces/iHandler.sol";
import "hardhat/console.sol";

// TODO: Consider making this token have no mint() possible after deploy...
// ... with full max supply known upfront, zero ongoing emissions etc etc

//======================================SPARTA=========================================//
contract Sparta is iBEP20 {
    // BEP-20 Parameters
    string public constant override name = "Spartan Protocol Ecosystem Token";
    string public constant override symbol = "SP";
    uint8 public constant override decimals = 18;
    uint256 public override totalSupply;

    // BEP-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

   
    uint256 public maxSupply;

    uint256 public secondsPerEra;
    uint256 public nextEraTime;

    address public deployerAddr;
    address public baseV2Addr;
    address public handlerAddr;

    // Only DAO can execute
    modifier isDeployer() {
        require(msg.sender == deployerAddr, "!DEPLOYER");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address newBaseV2Addr) {
        maxSupply = 300 * 10 ** 6 * 10 ** decimals; // 300m
        baseV2Addr = newBaseV2Addr;

        deployerAddr = msg.sender;
        //  _balances[msg.sender] = 1 * 10**7 * 10**decimals;     // TestHelper Only!!!
        //  totalSupply = 1 * 10**6 * 10**decimals;               // TestHelper Only!!!
        // emit Transfer(address(0), msg.sender, totalSupply);    // TestHelper Only!!!
    }

    //========================================iBEP20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function getOwner() public view returns (address) {
        return deployerAddr;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    // iBEP20 Transfer function
    function transfer(
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    // iBEP20 Approve, change allowance functions
    function approve(
        address spender,
        uint256 amount
    ) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    ) public virtual returns (bool) {
        _approve(
            msg.sender,
            spender,
            _allowances[msg.sender][spender] + (addedValue)
        );
        return true;
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    ) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "allowance err");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "sender");
        require(spender != address(0), "spender");
        if (_allowances[owner][spender] < type(uint256).max) {
            // No need to re-approve if already max
            _allowances[owner][spender] = amount;
            emit Approval(owner, spender, amount);
        }
    }

    // iBEP20 TransferFrom function
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        // Unlimited approval (saves an SSTORE)
        if (_allowances[sender][msg.sender] < type(uint256).max) {
            uint256 currentAllowance = _allowances[sender][msg.sender];
            require(currentAllowance >= amount, "allowance err");
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    // Internal transfer function
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual {
        require(sender != address(0), "transfer err");
        require(recipient != address(this), "recipient"); // Don't allow transfers here
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "balance err");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "address err");
        totalSupply += amount;
        require(totalSupply <= maxSupply, "Maxxed");
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    // Burn supply
    function burn(uint256 amount) public virtual override {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public virtual {
        uint256 decreasedAllowance = allowance(account, msg.sender) - (amount);
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "address err");
        require(_balances[account] >= amount, "balance err");
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    //=========================================CORE FUNCTIONS=========================================//
    // Can change handler address
    function changeHandler(address newHandlerAddr) external isDeployer {
        require(newHandlerAddr != address(0), "address err");
        handlerAddr = newHandlerAddr;
    }

    // Can purge deployer address
    function purgeDeployer() public isDeployer {
        deployerAddr = address(0);
    }

    // Can purge handler address
    function purgeHandler() external isDeployer {
        handlerAddr = address(0);
    }

    
    //==========================================Minting============================================//
    function migrate() external {
        uint amount = iBEP20(baseV2Addr).balanceOf(msg.sender); // Get balance of sender
        require(
            iBEP20(baseV2Addr).allowance(msg.sender, address(this)) >= amount,
            "ALLOWANCE"
        ); // Check allowance
        require(
            iBEP20(baseV2Addr).transferFrom(msg.sender, address(this), amount)
        ); // Transfer balance from sender
        iBEP20(baseV2Addr).burn(amount); // burn balance
        _mint(msg.sender, amount); // 1:1
    }

    //=========================================Helpers================================================//
    function getReserve() internal view returns (address) {
        return iHandler(handlerAddr).reserveAddr();
    }
}
