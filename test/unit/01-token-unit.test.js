const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Token Unit Test", function () {
      let AntiMEV,
        deployer,
        user1,
        mineBlocks,
        gasDelta,
        maxSample,
        averageGasPrice,
        tokensToSend
      beforeEach(async function () {
        const accounts = await getNamedAccounts()
        deployer = accounts.deployer
        user1 = accounts.user1
        mineBlocks = 3
        gasDelta = 20
        averageGasPrice = 0
        maxSample = 10
        tokensToSend = ethers.utils.parseEther("100")

        await deployments.fixture("all")
        AntiMEV = await hre.ethers.getContract("AntiMEV", deployer)
      })
      it("Was deployed successfully ", async () => {
        assert(AntiMEV.address)
      })
      describe("constructor", () => {
        it("Has correct supply of tokens ", async () => {
          const totalSupply = await AntiMEV.totalSupply()
          console.log(
            `* Supply from contract: ${ethers.utils.commify(
              totalSupply / 1e18
            )}`
          )
        })
        it("Initializes the token with the correct name and symbol ", async () => {
          const name = (await AntiMEV.name()).toString()
          assert.equal(name, "AntiMEV")
          console.log(`* Name from contract is: ${name}`)

          const symbol = (await AntiMEV.symbol()).toString()
          assert.equal(symbol, "AntiMEV")
          console.log(`* Symbol from contract is: $${symbol}`)
        })
      })
      describe("* Gas Bribes *", () => {
        beforeEach(async () => {
          await AntiMEV.approve(deployer, tokensToSend)
          await AntiMEV.approve(user1, tokensToSend)
        })

        it("Should calculate the average gas price of 10 transfers", async () => {
          for (let i = 1; i < 11; i++) {
            for (let j = 0; j < mineBlocks; j++) {
              await ethers.provider.send("evm_mine")
            }

            const transactionResponse = await AntiMEV.transfer(
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
          await AntiMEV.setMEV(mineBlocks, gasDelta, maxSample, averageGasPrice)
          console.log(`* mineBlocks: ${mineBlocks}`)
          console.log(`* gasDelta: ${gasDelta}`)
          console.log(`* maxSample: ${maxSample}`)
          console.log(`* averageGasPrice: ${averageGasPrice}`)

          const transactionResponse = await AntiMEV.transfer(
            user1,
            tokensToSend
          )

          for (let j = 0; j < mineBlocks; j++) {
            await ethers.provider.send("evm_mine")
          }

          const transactionReceipt = await transactionResponse.wait()
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const transferGasCost = gasUsed.mul(effectiveGasPrice)
          const bribe = effectiveGasPrice.add(
            effectiveGasPrice.mul(gasDelta + 40).div(100)
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
            AntiMEV.transfer(user1, tokensToSend, {
              gasPrice: bribe,
            })
          ).to.be.revertedWith(
            "AntiMEV: Gas bribe detected, possible front-run"
          )
        })
      })

      describe("Transfers", () => {
        const halfToSend = ethers.utils.parseEther("0.5")
        //const overMaxWallet = ethers.utils.parseEther("12000000000")

        it("Should transfer tokens successfully to an address", async () => {
          const startBalance = await AntiMEV.balanceOf(user1)
          console.log(`* startBalance: ${startBalance}`)

          await AntiMEV.transfer(user1, tokensToSend)

          expect(await AntiMEV.balanceOf(user1)).to.equal(tokensToSend)
          const endBalance = await AntiMEV.balanceOf(user1)
          console.log(`* endBalance: ${endBalance}`)
        })

        it("Should prevent transfers over maxTx", async () => {
          const maxTx = await AntiMEV.maxTx()
          console.log(`* maxTx: ${maxTx}`)
          await expect(
            AntiMEV.transfer(user1, maxTx.add(1))
          ).to.be.revertedWith("Max transaction exceeded!")
        })

        it("Should prevent transfers over maxWallet", async () => {
          const maxWallet = await AntiMEV.maxWallet()
          console.log(`* maxWallet: ${maxWallet}`)

          await AntiMEV.setVars(maxWallet.add(2), maxWallet)
          await expect(
            AntiMEV.transfer(user1, maxWallet.add(1))
          ).to.be.revertedWith("Max wallet exceeded!")
        })

        it("Should prevent 2 transfers in the same block", async () => {
          await AntiMEV.transfer(user1, tokensToSend)

          await expect(
            AntiMEV.transfer(user1, tokensToSend)
          ).to.be.revertedWith(
            "AntiMEV: Transfers too frequent, possible sandwich attack"
          )
        })

        it("Should allow 2 transfers after block delay", async () => {
          await AntiMEV.transfer(user1, tokensToSend)

          for (let i = 0; i < mineBlocks; i++) {
            await ethers.provider.send("evm_mine", [])
          }

          await expect(AntiMEV.transfer(user1, tokensToSend)).to.not.be.reverted
        })

        it("Should prevent 2 transferFroms in the same block", async () => {
          await AntiMEV.approve(deployer, tokensToSend)
          await AntiMEV.transferFrom(deployer, user1, tokensToSend)

          await expect(
            AntiMEV.transferFrom(deployer, user1, tokensToSend)
          ).to.be.revertedWith(
            "AntiMEV: Transfers too frequent, possible sandwich attack"
          )
        })

        it("Should allow 2 transferFroms after block delay", async () => {
          await AntiMEV.approve(deployer, tokensToSend)
          await AntiMEV.transferFrom(deployer, user1, halfToSend)

          for (let j = 0; j < mineBlocks; j++) {
            await ethers.provider.send("evm_mine")
          }

          await expect(AntiMEV.transferFrom(deployer, user1, halfToSend)).to.not
            .be.reverted
        })

        it("Emits an transfer event when an transfer occurs", async () => {
          await expect(AntiMEV.transfer(user1, tokensToSend)).to.emit(
            AntiMEV,
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
          await AntiMEV.approve(user1, tokensToSpend)
          const allowance = await AntiMEV.allowance(deployer, user1)
          console.log(`* Allowance from contract: ${allowance}`)
          assert.equal(allowance.toString(), tokensToSpend)
        })

        it("Should approve other address to spend token", async () => {
          await AntiMEV.approve(user1, tokensToSpend)
          const allowance = await AntiMEV.allowance(deployer, user1)

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
          await AntiMEV.approve(user1, tokensToSpend)
          await expect(
            playerToken.transferFrom(deployer, user1, overDraft)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("Emits an approval event when an approval occurs", async () => {
          await expect(AntiMEV.approve(user1, tokensToSpend)).to.emit(
            AntiMEV,
            "Approval"
          )
        })
      })
    })
