import mumbai from "../../deployments/mumbai.json";
import goerli from "../../deployments/goerli.json";

export const RPC_ENDPOINTS = {
  GOERLI:
    "https://eth-goerli.g.alchemy.com/v2/_nNlSds14eTQFEDmXIvWGq_RgqLBU196",
  MUMBAI:
    "https://polygon-mumbai.g.alchemy.com/v2/UMRGB-eJSGwtjt3_dzIuUOZWp0hVkYLT",
  OP_GOERLI:
    "https://opt-goerli.g.alchemy.com/v2/AQSx6niaPNsSPEVkJQMUgal7tqWZf1Yi",
  ETHEREUM: "https://mainnet.infura.io/v3/816df2901a454b18b7df259e61f92cd2",
};

export const ADDRESSES = {
  GOERLI: {
    COUNTER: goerli.counter,
    BRIDGE: goerli.bridge,
  },
  MUMBAI: {
    COUNTER: mumbai.counter,
    BRIDGE: mumbai.bridge,
  },
};

export const bridge_abi = [
  "event RequestForward(address from,address to,uint256 value,uint256 nonce,bytes data,uint256 bond,bytes signature)",
  "event RequestSucceeded(address from,address to,uint256 value,uint256 nonce,bytes data,uint256 bond,bytes signature)",
  "function execute(address from,address to,uint256 value,uint256 nonce,bytes memory data,uint256 bond,bytes memory signature)",
];
