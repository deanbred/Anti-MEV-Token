require("@nomicfoundation/hardhat-toolbox")
require("@nomiclabs/hardhat-etherscan")
require("@nomiclabs/hardhat-ethers")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("hardhat-deploy")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
const PRIVATE_KEY = process.env.PRIVATE_KEY

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
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
    sepolia: {
      url: process.env.SEPOLIA_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 11155111,
    },
    goerli: {
      url: process.env.GOERLI_RPC,
      accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [],
      saveDeployments: true,
      chainId: 5,
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
    enabled: process.env.REPORT_GAS ? true : false,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    runOnCompile: false,
    strict: true,
    only: [],
    outputFile: "contract-sizer.txt",
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
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  mocha: {
    timeout: 200000,
  },
}
