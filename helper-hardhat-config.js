const networkConfig = {
  31337: {
    name: "localhost",
  },
  // Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
  11155111: {
    name: "goerli",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  },
}
// Fibonacci Sequence 1.12 Billion tokens
const INITIAL_SUPPLY = ethers.BigNumber.from("1123581321000000000000000000")

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
  developmentChains,
  INITIAL_SUPPLY,
}
