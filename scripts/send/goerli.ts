import { RPC_ENDPOINTS } from "../../relayer/utils/constants";
import { Counter__factory } from "../../typechain-types/factories/contracts/Counter__factory";
import { ethers } from "hardhat";
import {
  Counter,
  GenericBridge,
  GenericBridge__factory,
} from "../../typechain-types";
import { config } from "dotenv";

config();
const BRIDGE_USER_PK = process.env.BRIDGE_USER_PK || "";

import { ADDRESSES } from "../../relayer/utils/constants";

let provider: any;
let signer: any, bridge: GenericBridge, counter: Counter;

async function main(): Promise<void> {
  // owner of these contracts
  provider = new ethers.providers.JsonRpcProvider(RPC_ENDPOINTS.GOERLI);
  signer = new ethers.Wallet(BRIDGE_USER_PK, provider);

  bridge = GenericBridge__factory.connect(
    ADDRESSES.GOERLI.BRIDGE,
    signer
  ) as GenericBridge;

  counter = Counter__factory.connect(
    ADDRESSES.GOERLI.COUNTER,
    signer
  ) as Counter;

  // selector and hash
  const sigHash = counter.interface.getSighash("increment()");
  const hash = await bridge.getMessageHash(
    ethers.utils.getAddress(ADDRESSES.MUMBAI.COUNTER), // i want to execute on contract deployed on matic mumbai
    0, // value,
    0, //nonce
    sigHash, // sighash
    0 // bond
  );

  // sign message as owner.
  const signature = await signer.signMessage(ethers.utils.arrayify(hash));

  // counter send functionality -> which then calls the bridger on goerli
  // we're telling the bridge to execute the increment() function on
  // the counter contract on mumbai
  const data = await counter.send(
    ADDRESSES.MUMBAI.COUNTER,
    0,
    sigHash,
    signature
  );
  const receipt = await data.wait();
  console.log(
    `Mined @ height: ${receipt.blockNumber} ${receipt.transactionHash}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
