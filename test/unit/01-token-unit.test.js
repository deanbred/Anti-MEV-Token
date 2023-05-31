const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
  developmentChains,
  INITIAL_SUPPLY,
  MAX_WALLET,
} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Token Unit Test", function () {
      let ourToken, deployer, user1, user2
      beforeEach(async function () {
        const accounts = await getNamedAccounts()
        deployer = accounts.deployer
        user1 = accounts.user1

        await deployments.fixture("all")
        ourToken = await hre.ethers.getContract("AntiMEV", deployer)
      })
      it("Was deployed successfully ", async () => {
        assert(ourToken.address)
      })
      describe("constructor", () => {
        it("Has correct INITIAL_SUPPLY of tokens ", async () => {
          const totalSupply = await ourToken.totalSupply()
          assert.equal(totalSupply.toString(), INITIAL_SUPPLY)
          console.log(
            `* Supply from contract: ${ethers.utils.commify(
              totalSupply / 1e18
            )}`
          )
          console.log(
            `* Max Wallet: ${ethers.utils.commify(MAX_WALLET / 1e18)}`
          )
        })
        it("Initializes the token with the correct name and symbol ", async () => {
          const name = (await ourToken.name()).toString()
          assert.equal(name, "AntiMEV")
          console.log(`* Name from contract is: ${name}`)

          const symbol = (await ourToken.symbol()).toString()
          assert.equal(symbol, "aMEV")
          console.log(`* Symbol from contract is: $${symbol}`)
        })
      })
      describe("Transfers", () => {
        const tokensToSend = ethers.utils.parseEther("1")
        const halfToSend = ethers.utils.parseEther("0.5")
        // BigNumber.from("50").mul(BigNumber.from("10").pow(18))

        it("Should transfer tokens successfully to an address", async () => {
          const startBalance = await ourToken.balanceOf(user1)
          console.log(`* startBalance: ${startBalance}`)

          await ourToken.transfer(user1, tokensToSend)

          expect(await ourToken.balanceOf(user1)).to.equal(tokensToSend)
          const endBalance = await ourToken.balanceOf(user1)
          console.log(`* endBalance: ${endBalance}`)
        })
        it("Should prevent 2 transfers in the same block", async () => {
          await ourToken.transfer(user1, tokensToSend)
          await expect(
            ourToken.transfer(user1, tokensToSend)
          ).to.be.revertedWith(
            "AntiMEVToken: Cannot transfer twice in the same block"
          )
        })
        it("Should allow 2 transfers after block delay", async () => {
          await ourToken.transfer(user1, tokensToSend)
          for (let i = 0; i < 5; i++) {
            await ethers.provider.send("evm_mine", [])
          }
          await expect(ourToken.transfer(user1, tokensToSend)).to.not.be
            .reverted
        })
        it("Should prevent 2 transferFroms in the same block", async () => {
          await ourToken.approve(deployer, tokensToSend)
          await ourToken.transferFrom(deployer, user1, tokensToSend)
          await network.provider.send("evm_mine", [])
          await expect(
            ourToken.transferFrom(deployer, user1, tokensToSend)
          ).to.be.revertedWith(
            "AntiMEVToken: Cannot transfer twice in the same block"
          )
        })
        it("Should allow 2 transferFroms after block delay", async () => {
          await ourToken.approve(deployer, tokensToSend)
          await ourToken.transferFrom(deployer, user1, halfToSend)
          for (let i = 0; i < 5; i++) {
            await ethers.provider.send("evm_mine", [])
          }
          await expect(ourToken.transferFrom(deployer, user1, halfToSend)).to
            .not.be.reverted
        })
        it("Emits an transfer event when an transfer occurs", async () => {
          await expect(ourToken.transfer(user1, tokensToSend)).to.emit(
            ourToken,
            "Transfer"
          )
        })
      })
      describe("Allowances", () => {
        const tokensToSpend = ethers.utils.parseEther("1")
        const overDraft = ethers.utils.parseEther("1.1")

        beforeEach(async () => {
          playerToken = await ethers.getContract("AntiMEV", user1)
        })
        it("Allowance is accurately being set", async () => {
          await ourToken.approve(user1, tokensToSpend)
          const allowance = await ourToken.allowance(deployer, user1)
          console.log(`* Allowance from contract: ${allowance}`)
          assert.equal(allowance.toString(), tokensToSpend)
        })
        it("Should approve other address to spend token", async () => {
          await ourToken.approve(user1, tokensToSpend)
          const allowance = await ourToken.allowance(deployer, user1)

          await playerToken.transferFrom(deployer, user1, tokensToSpend)

          expect(await playerToken.balanceOf(user1)).to.equal(tokensToSpend)
          console.log(`* Tokens approved from contract: ${tokensToSpend}`)
        })
        it("Doesn't allow an unnaproved member to do transfers", async () => {
          await expect(
            playerToken.transferFrom(deployer, user1, tokensToSpend)
          ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })
        it("Emits an approval event when an approval occurs", async () => {
          await expect(ourToken.approve(user1, tokensToSpend)).to.emit(
            ourToken,
            "Approval"
          )
        })
        it("Won't allow a user to go over the allowance", async () => {
          await ourToken.approve(user1, tokensToSpend)
          await expect(
            playerToken.transferFrom(deployer, user1, overDraft)
          ).to.be.revertedWith("ERC20: transfer amount exceeds allowance")
        })
      })
    })
