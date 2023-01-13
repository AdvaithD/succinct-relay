import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, tracer } from "hardhat";

const {
  utils: { hexZeroPad, hexlify, hashMessage, zeroPad, getAddress, arrayify },
  BigNumber,
} = ethers;

const events_abi = [
  "event RequestForward(address from, address to, uint256 value, bytes data, bytes signature)",
  "event RequestSucceeded(address from, address to, uint256 value, bytes data, bytes signature)",
  "event CounterLatest(uint256 counter);",
];

describe("Bridge + Counter", function () {
  async function deployBridgeAndCounter() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, randomRecipient] = await ethers.getSigners();

    tracer.nameTags[getAddress(owner.address)] = "OWNER";
    tracer.nameTags[getAddress(otherAccount.address)] = "OTHER_ACCOUNT";
    tracer.nameTags[getAddress(randomRecipient.address)] = "RANDOM_RECIPIENT";

    const GenericBridge = await ethers.getContractFactory("GenericBridge");
    const genericBridge = await GenericBridge.deploy();
    await genericBridge.deployed();

    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy(genericBridge.address);
    await counter.deployed();

    // return the bridge, counter and a few signers (deploy + 2 extra signers for testing purposes)
    return { genericBridge, counter, owner, otherAccount, randomRecipient };
  }

  describe("[Requsting Crosschain Execution]", function () {
    it("deploy", async function () {
      const { genericBridge, counter, owner, otherAccount } = await loadFixture(
        deployBridgeAndCounter
      );
      console.log("Bridge address", genericBridge.address);
      console.log("Counter address", counter.address);
      console.log("Owner address", owner.address);
      console.log("OtherAccount address", otherAccount.address);
    });

    it("should emit event when Counter.send() is called [broadcasting -> relayer]", async () => {
      const { genericBridge, counter, owner, otherAccount, randomRecipient } =
        await loadFixture(deployBridgeAndCounter);

      // get increment() function selector
      const selector = counter.interface.getSighash("increment()");

      // get hash and sign it
      const hash = await genericBridge.getMessageHash(
        getAddress(randomRecipient.address), // to
        0, // value
        0, // nonce
        selector, // data
        0
      );
      const signature = await otherAccount.signMessage(arrayify(hash));

      // call .send() on Counter from otherAccount as signer
      // and expect an event to be emitted
      await expect(
        counter
          .connect(otherAccount)
          .send(
            getAddress(randomRecipient.address),
            BigNumber.from(0),
            selector,
            signature,
            {
              // set bond here
              value: 0,
            }
          )
      )
        .to.emit(genericBridge, "RequestForward")
        .withArgs(
          otherAccount.address,
          randomRecipient.address,
          0,
          0,
          selector,
          0,
          signature
        );
    });

    it("should properly run executeMessage() [relayer -> target chain interaction]", async () => {
      const {
        genericBridge,
        counter,
        owner,
        otherAccount: accountSendingMessage,
        randomRecipient,
      } = await loadFixture(deployBridgeAndCounter);

      // get increment() function selector
      const selector = counter.interface.getSighash("increment()");

      // get hash and sign it (as )
      const hash = await genericBridge.getMessageHash(
        getAddress(randomRecipient.address),
        0,
        0,
        selector,
        0
      );
      const signature = await accountSendingMessage.signMessage(arrayify(hash));

      await expect(
        genericBridge
          .connect(owner)
          .execute(
            accountSendingMessage.address,
            randomRecipient.address,
            0,
            0,
            selector,
            0,
            signature
          )
      )
        .to.emit(genericBridge, "RequestSucceeded")
        .withArgs(
          accountSendingMessage.address,
          randomRecipient.address,
          0,
          0,
          selector,
          0,
          signature
        );
    });
  });
});
