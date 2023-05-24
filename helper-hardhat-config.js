const { ethers } = require("hardhat")

const networkConfig = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30",
  },
  31337: {
    name: "localhost",
    subscriptionId: "588",
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
  },
  11155111: {
    name: "sepolia",
    subscriptionId: "2229",
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
  },
  5: {
    name: "goerli",
    subscriptionId: "8853",
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    keepersUpdateInterval: "30",
    raffleEntranceFee: ethers.utils.parseEther("0.01"), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
  },
  1: {
    name: "mainnet",
    keepersUpdateInterval: "30",
  },
}

// Fibonacci Sequence 1.12 Billion tokens
const INITIAL_SUPPLY = ethers.BigNumber.from("1123581321000000000000000000")

const VERIFICATION_BLOCK_CONFIRMATIONS = 6

const developmentChains = [
  "hardhat",
  "localhost",
  "sepolia",
  "goerli",
  "arb_dev",
  "zkevm_dev",
]

module.exports = {
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  developmentChains,
  INITIAL_SUPPLY,
}
