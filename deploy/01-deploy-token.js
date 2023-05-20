const { network, deployments, ethers } = require("hardhat")
const {
  developmentChains,
  INITIAL_SUPPLY,
  maxWallet,
  blockDelay,
} = require("../helper-hardhat-config")
const { verify } = require("../helper-functions")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const ourToken = await deploy("AntiMEV", {
    from: deployer,
    args: [INITIAL_SUPPLY],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
    gasPrice: 500000000000,
    gasLimit: 30000000,
  })
  log(`Initial Supply: ${INITIAL_SUPPLY}`)

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(ourToken.address, [INITIAL_SUPPLY])
  }
}

module.exports.tags = ["all", "token"]
