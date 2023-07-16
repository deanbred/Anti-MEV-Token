const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Token Unit Test", function () {
      let AntiMEV,
        uniswapRouter,
        uniswapV2Pair,
        deployer,
        user1,
        detectMEV,
        mineBlocks,
        gasDelta,
        maxSample,
        averageGasPrice,
        tokensToSend,
        halfToSend
      beforeEach(async function () {
        const accounts = await getNamedAccounts()
        deployer = accounts.deployer
        user1 = accounts.user1
        detectMEV = true
        mineBlocks = 3
        gasDelta = 20
        averageGasPrice = 1e9
        maxSample = 10
        tokensToSend = ethers.utils.parseEther("100")

        await deployments.fixture("all")

        // Deploy AntiMEV
        AntiMEV = await hre.ethers.getContract("AntiMEV", deployer)

        uniswapV2Pair = await AntiMEV.uniswapV2Pair()
        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"

        // add deployer as VIP
        //await AntiMEV.setVIP(deployer, true)
        // add user1 as VIP
        //await AntiMEV.setVIP(user1, true)
      })

      it("Was deployed successfully ", async () => {
        assert(AntiMEV.address)
      })

      describe("* Constructor *", () => {
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
        it("Creates a Uniswap pair for the token ", async () => {
          console.log(`* Pair address from contract: ${uniswapV2Pair}`)
        })
        it("Adds 3 ETH liquidity to the Uniswap pair ", async () => {
          const tokenAmount = await AntiMEV.balanceOf(deployer)
          const ethAmount = ethers.utils.parseEther("3")
          console.log(`* Token amount: ${tokenAmount / 1e18}`)
          console.log(`* Eth amount: ${ethAmount / 1e18}`)
          await AntiMEV.addLiquidity(tokenAmount, ethAmount)
        })
      })

      describe("* BOT *", () => {
        it("Should add to bots if two tranfers in the same block", async () => {
          await AntiMEV.setVIP(deployer, false)
          await AntiMEV.transfer(user1, tokensToSend)
          await expect(
            AntiMEV.transfer(user1, tokensToSend)
          ).to.be.revertedWith("AntiMEV: Detected sandwich attack, BOT added")
        })

        it("Should prevent bots from buying", async () => {
          await AntiMEV.setBOT(user1, true)
          await expect(
            AntiMEV.transfer(user1, tokensToSend)
          ).to.be.revertedWith("AntiMEV: Known MEV Bot")
          await AntiMEV.setBOT(user1, false)
          await expect(AntiMEV.transfer(user1, tokensToSend)).to.not.be.reverted
        })
      })

      describe("* VIP *", () => {
        it("Should allow VIP to do 2 transfers in the same block", async () => {
          await AntiMEV.setVIP(deployer, true)
          await AntiMEV.transfer(user1, tokensToSend)
          expect(await AntiMEV.transfer(user1, tokensToSend)).to.not.be.reverted
        })

        it("Should not allow regular user to do 2 transfers", async () => {
          await AntiMEV.setVIP(deployer, false)
          await AntiMEV.transfer(user1, tokensToSend)
          expect(
            await AntiMEV.transfer(user1, tokensToSend)
          ).to.be.revertedWith("AntiMEV: Detected sandwich attack, BOT added")
        })

        it("Should allow VIP to transfer with a gas bribe", async () => {
          //await AntiMEV.setVIP(deployer, true)
          await AntiMEV.setMEV(mineBlocks, gasDelta, maxSample, averageGasPrice)
          console.log(`* mineBlocks: ${mineBlocks}`)
          console.log(`* gasDelta: ${gasDelta}`)
          console.log(`* maxSample: ${maxSample}`)
          console.log(`* averageGasPrice: ${averageGasPrice}`)
          console.log("---------------------------")

          const transactionResponse = await AntiMEV.transfer(
            user1,
            tokensToSend
          )
          const transactionReceipt = await transactionResponse.wait()
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const transferGasCost = gasUsed.mul(effectiveGasPrice)
          const bribe = effectiveGasPrice.add(
            effectiveGasPrice.mul(gasDelta + 50).div(100)
          )

          console.log(`* gasUsed: ${gasUsed}`)
          console.log(`* effectiveGasPrice(tx.gasprice): ${effectiveGasPrice}`)
          console.log(`* transferGasCost: ${transferGasCost}`)
          console.log(`* bribe-test: ${bribe}`)
          console.log("---------------------------")

          expect(
            await AntiMEV.transfer(user1, tokensToSend, {
              gasPrice: bribe,
            })
          ).to.not.be.reverted
        })
      })

      describe("* GAS *", () => {
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

            console.log(`* gasUsed ${i}: ${gasUsed}`)
            console.log(`* effectiveGasPrice ${i}: ${effectiveGasPrice}`)
            console.log(`* transferGasCost ${i}: ${transferGasCost}`)
            console.log("-------------")
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

          const transactionReceipt = await transactionResponse.wait()
          const { gasUsed, effectiveGasPrice } = transactionReceipt
          const transferGasCost = gasUsed.mul(effectiveGasPrice)
          const bribe = effectiveGasPrice.add(
            effectiveGasPrice.mul(gasDelta + 50).div(100)
          )

          console.log(`gasUsed: ${gasUsed}`)
          console.log(`effectiveGasPrice(tx.gasprice): ${effectiveGasPrice}`)
          console.log(`transferGasCost: ${transferGasCost}`)
          console.log(`bribe-test: ${bribe}`)
          console.log("---------------------------")

          for (let j = 0; j < mineBlocks; j++) {
            await ethers.provider.send("evm_mine")
          }

          await expect(
            AntiMEV.transfer(user1, tokensToSend, {
              gasPrice: bribe,
            })
          ).to.be.revertedWith("AntiMEV: Detected gas bribe")
        })
      })

      describe("* Transfers *", () => {
        const halfToSend = ethers.utils.parseEther("0.5")

        it("Should transfer tokens successfully to an address", async () => {
          const startBalance = await AntiMEV.balanceOf(user1)
          console.log(`startBalance: ${startBalance}`)

          await AntiMEV.transfer(user1, tokensToSend)

          expect(await AntiMEV.balanceOf(user1)).to.equal(tokensToSend)
          const endBalance = await AntiMEV.balanceOf(user1)
          console.log(`endBalance: ${endBalance / 1e18}`)
        })

        it("Should prevent transfers over maxWallet", async () => {
          const maxWallet = await AntiMEV.maxWallet()
          console.log(`maxWallet: ${maxWallet / 1e18}`)

          await expect(
            AntiMEV.transfer(user1, maxWallet.add(1))
          ).to.be.revertedWith("AntiMEV: Max wallet exceeded")
        })

        it("Should prevent 2 transfers in the same block", async () => {
          await AntiMEV.transfer(user1, tokensToSend)

          await expect(
            AntiMEV.transfer(user1, tokensToSend)
          ).to.be.revertedWith("AntiMEV: Detected sandwich attack, BOT added")
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
          await AntiMEV.approve(deployer, tokensToSend)

          await expect(
            AntiMEV.transferFrom(deployer, user1, tokensToSend)
          ).to.be.revertedWith(
            "AntiMEV: Detected sandwich attack, mine more blocks"
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

        it("Should emit transfer event when an transfer occurs", async () => {
          await expect(AntiMEV.transfer(user1, tokensToSend)).to.emit(
            AntiMEV,
            "Transfer"
          )
        })
      })

      describe("* Allowances *", () => {
        const tokensToSpend = ethers.utils.parseEther("1")
        const overDraft = ethers.utils.parseEther("1.1")

        beforeEach(async () => {
          playerToken = await ethers.getContract("AntiMEV", user1)
        })
        it("Should set allowance accurately", async () => {
          await AntiMEV.approve(user1, tokensToSpend)
          const allowance = await AntiMEV.allowance(deployer, user1)
          console.log(`Allowance from contract: ${allowance / 1e18}`)
          assert.equal(allowance.toString(), tokensToSpend)
        })

        it("Should approve other address to spend token", async () => {
          await AntiMEV.approve(user1, tokensToSpend)
          const allowance = await AntiMEV.allowance(deployer, user1)

          await playerToken.transferFrom(deployer, user1, tokensToSpend)

          expect(await playerToken.balanceOf(user1)).to.equal(tokensToSpend)
          console.log(`Tokens approved from contract: ${tokensToSpend}`)
        })

        it("Should not allow unnaproved user to do transfers", async () => {
          await expect(
            playerToken.transferFrom(deployer, user1, tokensToSpend)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("Should not allow user to go over the allowance", async () => {
          await AntiMEV.approve(user1, tokensToSpend)
          await expect(
            playerToken.transferFrom(deployer, user1, overDraft)
          ).to.be.revertedWith("ERC20: insufficient allowance")
        })

        it("Should emit approval event when an approval occurs", async () => {
          await expect(AntiMEV.approve(user1, tokensToSpend)).to.emit(
            AntiMEV,
            "Approval"
          )
        })
      })
    })
