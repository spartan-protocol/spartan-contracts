// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./BSC-Library/iBEP20.sol";
import "./Interfaces/iHANDLER.sol";
import "hardhat/console.sol";

    //======================================SPARTA=========================================//
contract SPARTA is iBEP20 {
    // BEP-20 Parameters
    string public constant override name = 'Spartan Protocol AGIS';
    string public constant override symbol = 'SP';
    uint8 public constant override decimals = 18;
    uint256 public override totalSupply;

    // BEP-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Parameters
    bool public minting;
    bool public emitting;    
    uint256 public emissionCurve;
    uint256 private _100m;
    uint256 public maxSupply;

    uint256 public secondsPerEra;
    uint256 public nextEraTime;

    address public DEPLOYER;
    address public BASEv2;
    address public HANDLER;

    event NewEra(uint256 nextEraTime, uint256 emission);

    // Only DAO can execute
    modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER, "!DEPLOYER");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _baseV2) {
        _100m = 100 * 10**6 * 10**decimals; // 100m
        maxSupply = 300 * 10**6 * 10**decimals; // 300m
        emissionCurve = 2048;
        BASEv2 = _baseV2;
        secondsPerEra =  86400; // 1 day
        nextEraTime = block.timestamp + secondsPerEra;
        DEPLOYER = msg.sender;
        //  _balances[msg.sender] = 1 * 10**7 * 10**decimals;     // TestHelper Only!!!
        //  totalSupply = 1 * 10**6 * 10**decimals;               // TestHelper Only!!!
        // emit Transfer(address(0), msg.sender, totalSupply);    // TestHelper Only!!!
    }

    //========================================iBEP20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function getOwner() public view returns(address){
        return DEPLOYER;
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iBEP20 Transfer function
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // iBEP20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "allowance err");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

     function _approve( address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "sender");
        require(spender != address(0), "spender");
        if (_allowances[owner][spender] < type(uint256).max) { // No need to re-approve if already max
            _allowances[owner][spender] = amount;
            emit Approval(owner, spender, amount);
        }
    }
    
    // iBEP20 TransferFrom function
     function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
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
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "transfer err");
        require(recipient != address(this), "recipient"); // Don't allow transfers here
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "balance err");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        _checkEmission();
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
    // Can start
    function flipEmissions() external onlyDEPLOYER {
        emitting = !emitting;
    }
     // Can stop
    function flipMinting() external onlyDEPLOYER {
        minting = !minting;
    }
    // Can set params
    function setParams(uint256 newTime, uint256 newCurve) external onlyDEPLOYER {
        secondsPerEra = newTime;
        emissionCurve = newCurve;
    }
    // Can change HANDLER
    function changeHANDLER(address newHANDLER) external onlyDEPLOYER {
        require(newHANDLER != address(0), "address err");
        HANDLER = newHANDLER;
    }
    // Can purge DEPLOYER
    function purgeDeployer() public onlyDEPLOYER {
        DEPLOYER = address(0);
    }
     // Can purge HANDLER
    function purgeHANDLER() external onlyDEPLOYER {
        HANDLER = address(0);
    }

   //======================================EMISSION========================================//
    // Internal - Update emission function
    function _checkEmission() private {
        if ((block.timestamp >= nextEraTime) && emitting) {    // If new Era and allowed to emit                      
            nextEraTime = block.timestamp + secondsPerEra; // Set next Era time
            uint256 _emission = getDailyEmission(); // Get Daily Dmission
            _mint(RESERVE(), _emission); // Mint to the RESERVE Address
            emit NewEra(nextEraTime, _emission); // Emit Event
        }
    }
    // Calculate Daily Emission
    function getDailyEmission() public view returns (uint256) {
        uint _adjustedCap;
        if(totalSupply <= _100m){ // If less than 100m, then adjust cap down
            _adjustedCap = (maxSupply * totalSupply)/(_100m); // 300m * 50m / 100m = 300m * 50% = 150m
        } else {
            _adjustedCap = maxSupply;  // 300m
        }
        return (_adjustedCap - totalSupply) / (emissionCurve); // outstanding / 2048 
    }

    //==========================================Minting============================================//
    function migrate() external {
        uint amount = iBEP20(BASEv2).balanceOf(msg.sender); //Get balance of sender
        require(iBEP20(BASEv2).allowance(msg.sender, address(this)) >= amount, "ALLOWANCE");  //Check allowance 
        require(iBEP20(BASEv2).transferFrom(msg.sender, address(this), amount)); //Transfer balance from sender
        iBEP20(BASEv2).burn(amount); //burn balance 
        _mint(msg.sender, amount); // 1:1
    }


    //=========================================Heler================================================//
     function RESERVE() internal view returns(address){
        return iHANDLER(HANDLER).RESERVE(); 
    }


}