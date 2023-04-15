require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY = process.env.PRIVATE_KEY

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC,
      },
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    mainnet: {
      url: process.env.MAINNET_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 1,
    },
    eth_dev: {
      url: process.env.ETH_DEV_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 11155111,
      gasPrice: 5000000000,
    },
    arb_dev: {
      url: process.env.ARB_DEV_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 421613,
    },
    zkevm_dev: {
      url: process.env.ZKEVM_DEV_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 1442,
    },
  },
  etherscan: {
    apiKey: {
      eth_dev: process.env.ETHERSCAN_API_KEY,
      arb_dev: process.env.ARBISCAN_API_KEY,
      zkevm_dev: process.env.POLYGONSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
      1: 0,
    },
    user1: {
      default: 1,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.18",
      },
    ],
  },
  mocha: {
    timeout: 200000,
  },
}
