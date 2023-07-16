// SPDX-License-Identifier: MIT
/*
  The Anti-MEV token: https://antimev.io

  Twitter: https://twitter.com/Anti_MEV

  Telegram: https://t.me/antimev
*/
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

library SafeMath {
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

interface IUniswapV2Factory {
  function createPair(
    address tokenA,
    address tokenB
  ) external returns (address pair);
}

interface IUniswapV2Router02 {
  function factory() external pure returns (address);

  function WETH() external pure returns (address);

  function addLiquidityETH(
    address token,
    uint amountTokenDesired,
    uint amountTokenMin,
    uint amountETHMin,
    address to,
    uint deadline
  ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

import "hardhat/console.sol";

contract AntiMEV is Context, IERC20, Ownable {
  using SafeMath for uint256;

  mapping(address => uint256) private _balances;
  mapping(address => mapping(address => uint256)) private _allowances;
  mapping(address => bool) public isBOT; // MEV bots
  mapping(address => bool) public isVIP; // VIP addresses
  mapping(address => uint256) public lastTxBlock; // block number for address's last tx

  uint256 private _totalSupply;
  string private _name;
  string private _symbol;

  bool public detectMEV;
  uint256 public maxWallet;
  uint256 public mineBlocks;
  uint256 public gasDelta;
  uint256 public maxSample;
  uint256 public avgGasPrice;
  uint256 public txCounter;

  IUniswapV2Router02 private immutable uniswapV2Router;
  address public uniswapV2Pair;

  address private dev;
  address private burns;
  address private airdrop;

  event Burned(address indexed user, uint256 amount);
  event VIPAdded(address indexed account, bool isVIP);
  event BotAdded(address indexed account, bool isBot);
  event MEVUpdated(
    uint256 mineBlocks,
    uint256 gasDelta,
    uint256 maxSample,
    uint256 avgGasPrice
  );

  constructor(address _dev, address _burns, address _airdrop) {
    _name = "AntiMEV";
    _symbol = "AntiMEV";
    _totalSupply = 1123581321 * 10 ** 18; // 1.12 Billion Fibonacci

    maxWallet = _totalSupply.mul(49).div(1000); // 4.9% of total supply
    detectMEV = true; // enable MEV detection
    mineBlocks = 3; // blocks to mine before 2nd tx
    avgGasPrice = 1e9; // initial rolling average gas price
    gasDelta = 25; // increase in gas price to be considered bribe
    maxSample = 10; // number of blocks to calculate average gas price
    txCounter = 0; // counter used to calculate average gas price

    IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(
      0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    );
    uniswapV2Router = _uniswapV2Router;

    uniswapV2Pair = IUniswapV2Factory(_uniswapV2Router.factory()).createPair(
      address(this),
      _uniswapV2Router.WETH()
    );

    dev = address(_dev);
    burns = address(_burns);
    airdrop = address(_airdrop);

    setVIP(msg.sender, true);
    setVIP(address(this), true);
    setVIP(dev, true);
    setVIP(burns, true);
    setVIP(airdrop, true);
    setVIP(uniswapV2Pair, true);
    setVIP(address(_uniswapV2Router), true);

    _mint(msg.sender, _totalSupply.mul(91).div(100));
    _mint(dev, _totalSupply.mul(2).div(100));
    _mint(burns, _totalSupply.mul(3).div(100));
    _mint(airdrop, _totalSupply.mul(4).div(100));
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    require(!isBOT[from] && !isBOT[to], "AntiMEV: Known MEV Bot");
    require(amount > 0, "AntiMEV: Amount must be greater than zero");
  }

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {}

  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual {
    require(from != address(0), "ERC20: transfer from the zero address");
    require(to != address(0), "ERC20: transfer to the zero address");

    _beforeTokenTransfer(from, to, amount);
    console.log("AntiMEV: from %s to %s", from, to);

    if (!isVIP[to]) {
      require(
        balanceOf(to) + amount <= maxWallet,
        "AntiMEV: Max wallet exceeded"
      );
    }

    if (detectMEV) {
      if (to != address(uniswapV2Router) && to != address(uniswapV2Pair)) {
        console.log("lastTxBlock: %s", lastTxBlock[tx.origin]);
        console.log("block.number: %s", block.number);

        // test for sandwich attack
        if (lastTxBlock[tx.origin] == block.number - 1) {
          setBOT(tx.origin, true);
          console.log("BOT added: %s", tx.origin);
          revert("AntiMEV: Detected sandwich attack, BOT added");
        }
        require(
          lastTxBlock[tx.origin] + mineBlocks < block.number,
          "AntiMEV: Detected sandwich attack, mine more blocks"
        );
        lastTxBlock[tx.origin] = block.number;

        // test for gas bribe
        txCounter += 1;
        avgGasPrice =
          (avgGasPrice * (txCounter - 1)) /
          txCounter +
          tx.gasprice /
          txCounter;
        require(
          tx.gasprice <= avgGasPrice.add(avgGasPrice.mul(gasDelta).div(100)),
          "AntiMEV: Detected gas bribe"
        );
      }
    }

    uint256 fromBalance = _balances[from];
    require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
    unchecked {
      _balances[from] = fromBalance - amount;
      _balances[to] += amount;
    }

    emit Transfer(from, to, amount);
  }

  function enableMEV(bool _detectMEV) external onlyOwner {
    detectMEV = _detectMEV;
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

  function setVIP(address _address, bool _isVIP) public onlyOwner {
    // require that _address is not a BOT
    require(!isBOT[_address], "AntiMEV: Cannot set BOT to VIP");
    isVIP[_address] = _isVIP;
    console.log("AntiMEV: VIP added successfully", _address, _isVIP);
    emit VIPAdded(_address, _isVIP);
  }

  function setBOT(address _address, bool _isBot) public onlyOwner {
    // require that _address is not a VIP
    //require(!isVIP[_address], "AntiMEV: Cannot set VIP to BOT");
    isBOT[_address] = _isBot;
    console.log("AntiMEV: BOT added successfully", _address, _isBot);
    emit BotAdded(_address, _isBot);
  }

  function setMaxWallet(uint256 _maxWallet) external onlyOwner {
    maxWallet = _maxWallet;
  }

  function setUniswapV2Pair(address _uniswapV2Pair) external onlyOwner {
    uniswapV2Pair = _uniswapV2Pair;
  }

  function addLiquidity(
    uint256 tokenAmount,
    uint256 ethAmount
  ) external onlyOwner {
    // Approve the Uniswap router to spend the token amount
    _approve(address(this), address(uniswapV2Router), tokenAmount);

    // Add the liquidity
    uniswapV2Router.addLiquidityETH{value: ethAmount}(
      address(this),
      tokenAmount,
      0,
      0,
      owner(), // Liquidity tokens are sent to the owner
      block.timestamp // deadline
    );
  }

  function name() public view virtual returns (string memory) {
    return _name;
  }

  function symbol() public view virtual returns (string memory) {
    return _symbol;
  }

  function decimals() public view virtual returns (uint8) {
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

  function approve(
    address spender,
    uint256 amount
  ) public virtual override returns (bool) {
    address owner = _msgSender();
    _approve(owner, spender, amount);
    return true;
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

  function allowance(
    address owner,
    address spender
  ) public view virtual override returns (uint256) {
    return _allowances[owner][spender];
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

  function setWallets(
    address _dev,
    address _burns,
    address _airdrop
  ) external onlyOwner {
    dev = _dev;
    burns = _burns;
    airdrop = _airdrop;
  }

  function _mint(address account, uint256 amount) internal virtual {
    require(account != address(0), "ERC20: mint to the zero address");

    _beforeTokenTransfer(account, address(0), amount);

    _totalSupply += amount;
    unchecked {
      _balances[account] += amount;
    }
    emit Transfer(address(0), account, amount);

    _afterTokenTransfer(account, address(0), amount);
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

  function burn(uint256 value) external onlyOwner {
    _burn(msg.sender, value);
    emit Burned(msg.sender, value);
  }
}
