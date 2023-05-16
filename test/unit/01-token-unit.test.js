const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const {
  developmentChains,
  INITIAL_SUPPLY,
} = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Token Unit Test", function () {
      let ourToken, deployer, user1, teamWallet
      beforeEach(async function () {
        const accounts = await getNamedAccounts()
        deployer = accounts.deployer
        user1 = accounts.user1
        teamWallet = "0x4e2B8AaF09caF834afd36b02eCA4c2939910dD6a"

        await deployments.fixture("all")
        ourToken = await hre.ethers.getContract("GMUSSY", deployer)
      })
      it("Was deployed successfully ", async () => {
        assert(ourToken.address)
      })
      describe("constructor", () => {
        it("Has correct INITIAL_SUPPLY of tokens ", async () => {
          const totalSupply = await ourToken.totalSupply()
          assert.equal(totalSupply.toString(), INITIAL_SUPPLY)
          console.log(
            `* Supply from contract is: ${ethers.utils.commify(
              totalSupply / 1e18
            )}`
          )
        })
        it("Initializes the token with the correct name and symbol ", async () => {
          const name = (await ourToken.name()).toString()
          assert.equal(name, "GMUSSY")
          console.log(`* Name from contract is: ${name}`)

          const symbol = (await ourToken.symbol()).toString()
          assert.equal(symbol, "GMUSSY")
          console.log(`* Symbol from contract is: $${symbol}`)
        })
      })
      describe("Transfers", () => {
        const tokensToSend = ethers.utils.parseEther("0.5")

        it("Should be able to transfer tokens successfully to an address", async () => {
          const startBalance = await ourToken.balanceOf(user1)
          console.log(`* startBalance: ${startBalance}`)

          await ourToken.transfer(user1, tokensToSend)
        //  await network.provider.send("evm_mine", [])
          await ourToken.transfer(user1, tokensToSend)

          /*           await expect(
            ourToken.transfer(user1, tokensToSend)
          ).to.be.revertedWith("Token__TwoTransfers") */

          const endBalance = await ourToken.balanceOf(user1)
          console.log(`* endBalance: ${endBalance}`)

          //  expect(await ourToken.balanceOf(user1)).to.equal(tokensToSend)
          //  console.log(`* tokensToSend: ${tokensToSend}`)
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
          playerToken = await ethers.getContract("GMUSSY", user1)
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
          console.log(`* Allowance from contract: ${allowance}`)

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

/* describe("Transactions with tax", function () {
        it("Should apply tax and transfer the taxed amount to the development wallet", async function () {
          const initialDeployerBalance = await ourToken.balanceOf(deployer)
          const initialDevelopmentWalletBalance = await ourToken.balanceOf(
            teamWallet
          )

          // Transfer 1000 tokens from deployer to user1
          const transferAmount = ethers.utils.parseUnits("100", 18)
          await ourToken
            .connect(deployer)
            .transfer(user1.address, transferAmount)

          const taxAmount = transferAmount.mul(5).div(100)
          const remainingAmount = transferAmount.sub(taxAmount)

          // Check developmentWallet balance
          expect(await ourToken.balanceOf(teamWallet)).to.equal(
            initialDevelopmentWalletBalance.add(taxAmount)
          )

          // Check deployer balance
          expect(await ourToken.balanceOf(deployer)).to.equal(
            initialDeployerBalance.sub(transferAmount)
          )

          // Check user1 balance
          expect(await ourToken.balanceOf(user1)).to.equal(remainingAmount)
        })

        it("Should fail if the sender does not have enough balance", async function () {
          const transferAmount = ethers.utils.parseUnits("1", 18)

          await expect(
            ourToken.transfer(user2, transferAmount)
          ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
        }) */
