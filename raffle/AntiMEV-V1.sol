// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

abstract contract Context {
  function _msgSender() internal view virtual returns (address) {
    return msg.sender;
  }

  function _msgData() internal view virtual returns (bytes calldata) {
    return msg.data;
  }
}

abstract contract Ownable is Context {
  address private _owner;

  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );

  constructor() {
    _transferOwnership(_msgSender());
  }

  modifier onlyOwner() {
    _checkOwner();
    _;
  }

  function owner() public view virtual returns (address) {
    return _owner;
  }

  function _checkOwner() internal view virtual {
    require(owner() == _msgSender(), "Ownable: caller is not the owner");
  }

  function renounceOwnership() public virtual onlyOwner {
    _transferOwnership(address(0));
  }

  function transferOwnership(address newOwner) public virtual onlyOwner {
    require(newOwner != address(0), "Ownable: new owner is the zero address");
    _transferOwnership(newOwner);
  }

  function _transferOwnership(address newOwner) internal virtual {
    address oldOwner = _owner;
    _owner = newOwner;
    emit OwnershipTransferred(oldOwner, newOwner);
  }
}

interface IERC20 {
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  function totalSupply() external view returns (uint256);

  function balanceOf(address account) external view returns (uint256);

  function transfer(address to, uint256 amount) external returns (bool);

  function allowance(
    address owner,
    address spender
  ) external view returns (uint256);

  function approve(address spender, uint256 amount) external returns (bool);

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool);
}

interface IERC20Metadata is IERC20 {
  function name() external view returns (string memory);

  function symbol() external view returns (string memory);

  function decimals() external view returns (uint8);
}

library SafeMath {
  function tryAdd(uint256 a, uint256 b) internal pure returns (bool, uint256) {
    unchecked {
      uint256 c = a + b;
      if (c < a) return (false, 0);
      return (true, c);
    }
  }

  function trySub(uint256 a, uint256 b) internal pure returns (bool, uint256) {
    unchecked {
      if (b > a) return (false, 0);
      return (true, a - b);
    }
  }

  function tryMul(uint256 a, uint256 b) internal pure returns (bool, uint256) {
    unchecked {
      if (a == 0) return (true, 0);
      uint256 c = a * b;
      if (c / a != b) return (false, 0);
      return (true, c);
    }
  }

  function tryDiv(uint256 a, uint256 b) internal pure returns (bool, uint256) {
    unchecked {
      if (b == 0) return (false, 0);
      return (true, a / b);
    }
  }

  function tryMod(uint256 a, uint256 b) internal pure returns (bool, uint256) {
    unchecked {
      if (b == 0) return (false, 0);
      return (true, a % b);
    }
  }

  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    return a + b;
  }

  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    return a - b;
  }

  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    return a * b;
  }

  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    return a / b;
  }

  function mod(uint256 a, uint256 b) internal pure returns (uint256) {
    return a % b;
  }

  function sub(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    unchecked {
      require(b <= a, errorMessage);
      return a - b;
    }
  }

  function div(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    unchecked {
      require(b > 0, errorMessage);
      return a / b;
    }
  }

  function mod(
    uint256 a,
    uint256 b,
    string memory errorMessage
  ) internal pure returns (uint256) {
    unchecked {
      require(b > 0, errorMessage);
      return a % b;
    }
  }
}

interface IUniswapV2Factory {
  event PairCreated(
    address indexed token0,
    address indexed token1,
    address pair,
    uint256
  );

  function createPair(
    address tokenA,
    address tokenB
  ) external returns (address pair);

  function getPair(
    address tokenA,
    address tokenB
  ) external view returns (address pair);
}

interface IUniswapV2Router02 {
  function factory() external pure returns (address);

  function WETH() external pure returns (address);

  function addLiquidityETH(
    address token,
    uint256 amountTokenDesired,
    uint256 amountTokenMin,
    uint256 amountETHMin,
    address to,
    uint256 deadline
  )
    external
    payable
    returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

contract ERC20 is Context, IERC20, IERC20Metadata {
  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;

  uint256 private _totalSupply;
  string private _name;
  string private _symbol;

  constructor(string memory name_, string memory symbol_) {
    _name = name_;
    _symbol = symbol_;
  }

  function name() public view virtual override returns (string memory) {
    return _name;
  }

  function symbol() public view virtual override returns (string memory) {
    return _symbol;
  }

  function decimals() public view virtual override returns (uint8) {
    return 18;
  }

  function totalSupply() public view virtual override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(
    address account
  ) public view virtual override returns (uint256) {
    return _balances[account];
  }

  function transfer(
    address to,
    uint256 amount
  ) public virtual override returns (bool) {
    address owner = _msgSender();
    _transfer(owner, to, amount);
    return true;
  }

  function allowance(
    address owner,
    address spender
  ) public view virtual override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(
    address spender,
    uint256 amount
  ) public virtual override returns (bool) {
    address owner = _msgSender();
    _approve(owner, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public virtual override returns (bool) {
    address spender = _msgSender();
    _spendAllowance(from, spender, amount);
    _transfer(from, to, amount);
    return true;
  }

  function increaseAllowance(
    address spender,
    uint256 addedValue
  ) public virtual returns (bool) {
    address owner = _msgSender();
    _approve(owner, spender, allowance(owner, spender) + addedValue);
    return true;
  }

  function decreaseAllowance(
    address spender,
    uint256 subtractedValue
  ) public virtual returns (bool) {
    address owner = _msgSender();
    uint256 currentAllowance = allowance(owner, spender);
    require(
      currentAllowance >= subtractedValue,
      "ERC20: decreased allowance below zero"
    );
    unchecked {
      _approve(owner, spender, currentAllowance - subtractedValue);
    }

    return true;
  }

  /**
   * @dev Moves `amount` of tokens from `from` to `to`.
   *
   * This internal function is equivalent to {transfer}, and can be used to
   * e.g. implement automatic token fees, slashing mechanisms, etc.
   *
   * Emits a {Transfer} event.
   *
   * Requirements:
   *
   * - `from` cannot be the zero address.
   * - `to` cannot be the zero address.
   * - `from` must have a balance of at least `amount`.
   */
  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    require(from != address(0), "ERC20: transfer from the zero address");
    require(to != address(0), "ERC20: transfer to the zero address");

    _beforeTokenTransfer(from, to, amount);

    uint256 fromBalance = _balances[from];
    require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
    unchecked {
      _balances[from] = fromBalance - amount;
      _balances[to] += amount;
    }

    emit Transfer(from, to, amount);

    _afterTokenTransfer(from, to, amount);
  }

  function _mint(address account, uint256 amount) internal virtual {
    require(account != address(0), "ERC20: mint to the zero address");

    _beforeTokenTransfer(address(0), account, amount);

    _totalSupply += amount;
    unchecked {
      _balances[account] += amount;
    }
    emit Transfer(address(0), account, amount);

    _afterTokenTransfer(address(0), account, amount);
  }

  function _burn(address account, uint256 amount) internal virtual {
    require(account != address(0), "ERC20: burn from the zero address");

    _beforeTokenTransfer(account, address(0), amount);

    uint256 accountBalance = _balances[account];
    require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
    unchecked {
      _balances[account] = accountBalance - amount;
      _totalSupply -= amount;
    }

    emit Transfer(account, address(0), amount);

    _afterTokenTransfer(account, address(0), amount);
  }

  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {
    require(owner != address(0), "ERC20: approve from the zero address");
    require(spender != address(0), "ERC20: approve to the zero address");

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  function _spendAllowance(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual {
    uint256 currentAllowance = allowance(owner, spender);
    if (currentAllowance != type(uint256).max) {
      require(currentAllowance >= amount, "ERC20: insufficient allowance");
      unchecked {
        _approve(owner, spender, currentAllowance - amount);
      }
    }
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}
}

contract AntiMEV is ERC20, Ownable {
  using SafeMath for uint256;

  bool public detectMEV;
  uint256 public maxTx;
  uint256 public maxWallet;
  uint256 public mineBlocks;
  uint256 public gasDelta;
  uint256 public maxSample;
  uint256 public avgGasPrice;
  uint256 public gasCounter;

  mapping(address => bool) public bots;
  mapping(address => bool) public isVIP;
  mapping(address => uint256) public lastTxBlock;

  IUniswapV2Router02 public uniswapV2Router;
  address public uniswapV2Pair;
  address payable private devWallet;
  address payable private burnWallet;
  address payable private airdropWallet;

  event Burned(address indexed user, uint256 amount);
  event VIPAdded(address indexed account, bool isVIP);
  event BotAdded(address indexed account, bool isBot);
  event MEVUpdated(
    uint256 mineBlocks,
    uint256 gasDelta,
    uint256 maxSample,
    uint256 avgGasPrice
  );
  event VarsUpdated(uint256 maxTx, uint256 maxWallet);
  event WalletsUpdated(
    address indexed devWallet,
    address indexed burnWallet,
    address indexed airdropWallet
  );

  constructor() payable ERC20("AntiMEV", "AntiMEV") {
    uint256 _totalSupply = 1123581321 * 10 ** 18;
    maxWallet = _totalSupply.mul(49).div(1000);
    maxTx = _totalSupply.mul(49).div(1000);
    detectMEV = true;
    mineBlocks = 3;
    avgGasPrice = 0;
    gasDelta = 20;
    maxSample = 10;
    gasCounter = 0;

    IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
      0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    );
    uniswapV2Router = _uniswapV2Router;

    uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory()).createPair(
      address(this),
      _uniswapV2Router.WETH()
    );

    devWallet = payable(0xc2657176e213DDF18646eFce08F36D656aBE3396);
    burnWallet = payable(0x8B30998a9492610F074784Aed7aFDd682B23B416);
    airdropWallet = payable(0x5b3eC3A39403202A9C5a9e3496FbB3793B244B44);

    //setVIP(msg.sender, true);
    setVIP(address(this), true);
    setVIP(address(devWallet), true);
    setVIP(address(burnWallet), true);
    setVIP(address(airdropWallet), true);
    setVIP(address(uniswapV2Pair), true);
    setVIP(address(uniswapV2Router), true);

    _mint(msg.sender, _totalSupply.mul(90).div(100));
    _mint(devWallet, _totalSupply.mul(4).div(100));
    _mint(burnWallet, _totalSupply.mul(3).div(100));
    _mint(airdropWallet, _totalSupply.mul(3).div(100));
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    // check if VIP
    if (!isVIP[from] && !isVIP[to]) {
      // check if known MEV bot
      require(!bots[to] && !bots[from], "AntiMEV: Known MEV bot");
      // check if max tx amount exceeded
      require(amount <= maxTx, "Max transaction exceeded!");
      // check if max wallet amount exceeded
      require(super.balanceOf(to) + amount <= maxWallet, "Max wallet exceeded");
    }
  }

  // calculate rolling average of gas price for last maxSample blocks
  function detectGasBribe() public {
    gasCounter += 1;
    avgGasPrice =
      (avgGasPrice * (gasCounter - 1)) /
      gasCounter +
      tx.gasprice /
      gasCounter;

    // reset avgGasPrice if sample size too large
    if (gasCounter > maxSample) {
      avgGasPrice = tx.gasprice;
      gasCounter = 0;
    }

    // detect bribes by checking if gas price is higher than rolling average
    if (
      tx.gasprice >= avgGasPrice.add(avgGasPrice.mul(gasDelta).div(100)) &&
      gasCounter > 1
    ) {
      revert("AntiMEV: Gas bribe detected, possible front-run");
    }
  }

  function detectSandwich(address from, address to) private {
    // handle buys
    //if (from == uniswapV2Pair && to != address(uniswapV2Router)) {
    if (block.number > lastTxBlock[to] + mineBlocks) {
      lastTxBlock[to] = block.number;
    } else if (block.number == lastTxBlock[to]) {
      if (!isVIP[to]) {
        bots[to] = true;
        emit BotAdded(to, true);
      }
    } else {
      revert("AntiMEV: Transfers too frequent, possible sandwich attack");
      // }
    }

    // handle sells
    //if (to == uniswapV2Pair && from != address(uniswapV2Router)) {
    if (block.number > lastTxBlock[from] + mineBlocks) {
      lastTxBlock[from] = block.number;
    } else if (block.number == lastTxBlock[from]) {
      if (!isVIP[from]) {
        bots[from] = true;
        emit BotAdded(from, true);
      }
      revert("AntiMEV: Sandwich attack detected, added to bots");
    } else {
      revert("AntiMEV: Transfers too frequent, possible sandwich attack");
    }
    //}
  }

  function transfer(address to, uint256 amount) public override returns (bool) {
    if (detectMEV) {
      // test for sandwich attack
      detectSandwich(msg.sender, to);
      // test for frontrunner
      detectGasBribe();
    }

    return super.transfer(to, amount);
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public override returns (bool) {
    if (detectMEV) {
      // test for sandwich attack
      detectSandwich(from, to);
      // test for frontrunner
      detectGasBribe();
    }
    return super.transferFrom(from, to, amount);
  }

  function setDetectMEV(bool _detectMEV) external onlyOwner {
    detectMEV = _detectMEV;
  }

  function setUniswapV2Pair(address _uniswapV2Pair) external onlyOwner {
    uniswapV2Pair = _uniswapV2Pair;
  }

  function setMEV(
    uint256 _mineBlocks,
    uint256 _gasDelta,
    uint256 _maxSample,
    uint256 _avgGasPrice
  ) external onlyOwner {
    mineBlocks = _mineBlocks;
    gasDelta = _gasDelta;
    maxSample = _maxSample;
    avgGasPrice = _avgGasPrice;
    emit MEVUpdated(_mineBlocks, _gasDelta, _maxSample, _avgGasPrice);
  }

  function setVars(uint256 _maxTx, uint256 _maxWallet) external onlyOwner {
    maxTx = _maxTx;
    maxWallet = _maxWallet;
    emit VarsUpdated(_maxTx, _maxWallet);
  }

  function getVars() external view returns (uint256, uint256) {
    return (maxTx, maxWallet);
  }

  function setVIP(address _address, bool _isVIP) public onlyOwner {
    isVIP[_address] = _isVIP;
    emit VIPAdded(_address, _isVIP);
  }

  function setBots(
    address[] memory _address,
    bool[] memory _isBot
  ) external onlyOwner {
    for (uint256 i = 0; i < _address.length; i++) {
      require(_address[i] != address(this) && _address[i] != owner());
      bots[_address[i]] = _isBot[i];
      emit BotAdded(_address[i], _isBot[i]);
    }
  }

  function setWallets(
    address _devWallet,
    address _burnWallet,
    address _airdropWallet
  ) external onlyOwner {
    devWallet = payable(_devWallet);
    burnWallet = payable(_burnWallet);
    airdropWallet = payable(_airdropWallet);
    emit WalletsUpdated(devWallet, burnWallet, airdropWallet);
  }

  function burn(uint256 value) external onlyOwner {
    _burn(msg.sender, value);
    emit Burned(msg.sender, value);
  }
}
