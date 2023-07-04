const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../helper-functions")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const ourToken = await deploy("AntiMEV", {
    from: deployer,
    args: [
      "0xc2657176e213ddf18646efce08f36d656abe3396",
      "0x8b30998a9492610f074784aed7afdd682b23b416",
      "0xe276d3ea57c5af859e52d51c2c11f5decb4c4838",
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
    gasPrice: 500000000000,
    gasLimit: 30000000,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(ourToken.address, [])
  }
}

module.exports.tags = ["all", "token"]
