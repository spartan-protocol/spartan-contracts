//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "./BSC-Library/iBEP20.sol";
import "./Interfaces/iHANDLER.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SPARTANPROTCOLPOOL is iBEP20 {  
    using SafeMath for uint256;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    uint128 private tokenDepth;           
    uint128 private assetDepth;           

    string private _name;                                                  //Name of Savers 
    string private _symbol;                                                //Savers Symbol
    uint8 public override immutable decimals;                              //Decimals of Saver's Base
    uint256 public immutable genesis;                                        // Timestamp from when the Savers was first deployed (For UI)                              
    uint256 public override totalSupply;
    address public immutable ASSET;  //Settlement Asset
    address public immutable TOKEN;  //Paired Token
    address public immutable FACTORY;
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    
   
    constructor (address _asset, address _token) {
        ASSET = _asset;
        TOKEN = _token;
        FACTORY = msg.sender;
        string memory poolName = "-SpartanProtocolPool";
        string memory poolSymbol = "-SPP";
        string memory slash = "/";
        _name = string(abi.encodePacked(iBEP20(_asset).name(), slash, iBEP20(_token).name(), poolName));
        _symbol = string(abi.encodePacked(iBEP20(_asset).name(), slash, iBEP20(_token).name(), poolSymbol));
        decimals = 18;
        genesis = block.timestamp;
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
   function getOwner() public view returns(address){
        return FACTORY;
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

  /**
   * @dev See {BEP20-transfer}.
   *
   * Requirements:
   *
   * - `recipient` cannot be the zero address.
   * - the caller must have a balance of at least `amount`.
   */
  function transfer(address recipient, uint256 amount) external returns (bool) {
    _transfer(msg.sender, recipient, amount);
    return true;
  }

  /**
   * @dev See {BEP20-allowance}.
   */
  function allowance(address owner, address spender) external view returns (uint256) {
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
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
    _transfer(sender, recipient, amount);
    _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "BEP20: transfer amount exceeds allowance"));
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
  function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
    _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
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
  function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
    _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "BEP20: decreased allowance below zero"));
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
  function _transfer(address sender, address recipient, uint256 amount) internal {
    require(sender != address(0), "BEP20: transfer from the zero address");
    require(recipient != address(0), "BEP20: transfer to the zero address");

    _balances[sender] = _balances[sender].sub(amount, "BEP20: transfer amount exceeds balance");
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

    totalSupply = totalSupply.add(amount);
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

    _balances[account] = _balances[account].sub(amount, "BEP20: burn amount exceeds balance");
    totalSupply = totalSupply.sub(amount);
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
    _approve(account, msg.sender, _allowances[account][msg.sender].sub(amount, "BEP20: burn amount exceeds allowance"));
  }

  

    //====================================POOL FUNCTIONS =================================//

    function add() external returns(uint256){
      //  uint256 _actualInputAsset = _checkAssetDepth(); // Get the received ASSET amount
        
       
    }

    function remove() external returns (bool) {
    
    }

    function swap() external  returns (uint) {
        
    }

  
    //=======================================INTERNAL LOGIC======================================//

     // Check the ASSET amount received by this Pool
    function _checkAssetDepth() internal view returns(uint256 _actual){
        uint _assetBalance = iBEP20(ASSET).balanceOf(address(this));
        if(_assetBalance > assetDepth){
            _actual = _assetBalance - assetDepth;
        } else {
            _actual = 0;
        }
        return _actual;
    }

      // Check the TOKEN amount received by this Pool
    function _checkTokenDepth() internal view returns(uint256 _actual){
        uint _tokenBalance = iBEP20(TOKEN).balanceOf(address(this)); 
        if(_tokenBalance > tokenDepth){
            _actual = _tokenBalance - tokenDepth;
        } else {
            _actual = 0;
        }
        return _actual;
    }

   

    
 

}