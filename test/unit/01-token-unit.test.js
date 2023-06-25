const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Token Unit Test", function () {
      let ourToken, deployer, user1
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
        it("Has correct supply of tokens ", async () => {
          const totalSupply = await ourToken.totalSupply()
          console.log(
            `* Supply from contract: ${ethers.utils.commify(
              totalSupply / 1e18
            )}`
          )
        })
        it("Initializes the token with the correct name and symbol ", async () => {
          const name = (await ourToken.name()).toString()
          assert.equal(name, "AntiMEV")
          console.log(`* Name from contract is: ${name}`)

          const symbol = (await ourToken.symbol()).toString()
          assert.equal(symbol, "AntiMEV")
          console.log(`* Symbol from contract is: $${symbol}`)
        })
      })
      describe("* Gas Bribes *", () => {
        const tokensToSend = ethers.utils.parseEther("1")

        beforeEach(async () => {
          await ourToken.approve(deployer, tokensToSend)
          await ourToken.approve(user1, tokensToSend)
        })

        it("Should calculate the average gas price of 10 transfers", async () => {
          for (let i = 2; i < 21; i++) {
            await ethers.provider.send("evm_mine", [])
            await ethers.provider.send("evm_mine", [])
            await ethers.provider.send("evm_mine", [])

            const transactionResponse = await ourToken.transfer(
              user1,
              tokensToSend
            )

            const transactionReceipt = await transactionResponse.wait()
            const { gasUsed, effectiveGasPrice } = transactionReceipt
            const transferGasCost = gasUsed.mul(effectiveGasPrice)

            console.log(`gasUsed ${i}: ${ethers.utils.commify(gasUsed)}`)
            console.log(
              `effectiveGasPrice ${i}: ${ethers.utils.commify(
                effectiveGasPrice
              )}`
            )
            console.log(
              `transferGasCost ${i}: ${ethers.utils.commify(transferGasCost)}`
            )
            console.log("---------------------------")
          }
        })

        it("Should revert if gas bribe is detected", async () => {
          const mineBlocks = 3
          const gasDelta = 20
          const maxSample = 10
          await ourToken.setMEV(mineBlocks, gasDelta, maxSample)
          console.log(`* mineBlocks: ${mineBlocks}`)
          console.log(`* gasDelta: ${gasDelta}`)
          console.log(`* maxSample: ${maxSample}`)

          const transactionResponse = await ourToken.transfer(
            user1,
            tokensToSend
          )
          await ethers.provider.send("evm_mine", [])
          await ethers.provider.send("evm_mine", [])
          await ethers.provider.send("evm_mine", [])

          const transactionReceipt = await transactionResponse.wait()
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const transferGasCost = gasUsed.mul(effectiveGasPrice)
          const bribe = effectiveGasPrice.add(
            effectiveGasPrice.mul(gasDelta + 33).div(100)
          )

          console.log(`gasUsed: ${ethers.utils.commify(gasUsed)}`)
          console.log(
            `effectiveGasPrice: ${ethers.utils.commify(effectiveGasPrice)}`
          )
          console.log(
            `transferGasCost: ${ethers.utils.commify(transferGasCost)}`
          )
          console.log(`bribe-test: ${ethers.utils.commify(bribe)}`)
          console.log("---------------------------")

          await expect(
            ourToken.transfer(user1, tokensToSend, {
              gasPrice: bribe,
            })
          ).to.be.revertedWith(
            "AntiMEV: Gas bribe detected, possible front-run"
          )
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
            "AntiMEV: Transfers too frequent, possible sandwich attack"
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
            "AntiMEV: Transfers too frequent, possible sandwich attack"
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
        it("Does not allow an unnaproved member to do transfers", async () => {
          await expect(
            playerToken.transferFrom(deployer, user1, tokensToSpend)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("Does not allow a user to go over the allowance", async () => {
          await ourToken.approve(user1, tokensToSpend)
          await expect(
            playerToken.transferFrom(deployer, user1, overDraft)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })
        it("Emits an approval event when an approval occurs", async () => {
          await expect(ourToken.approve(user1, tokensToSpend)).to.emit(
            ourToken,
            "Approval"
          )
        })
      })
    })
