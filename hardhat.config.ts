import { HardhatUserConfig } from "hardhat/config";
import "hardhat-tracer";
import "@nomicfoundation/hardhat-toolbox";
import path from "path";
import "hardhat-abi-exporter";
import "hardhat-gas-reporter";
import { RPC_ENDPOINTS } from "./relayer/utils/constants";
import { config as dotEnvConfig } from "dotenv";

const configPath: string = process.env.DOTENV_CONFIG_PATH || ".env";
dotEnvConfig({ path: configPath });

const config: HardhatUserConfig = {
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_MAINET || "",
      polygonMumbai: process.env.ETHERSCAN_MUMBAI || "",
      goerli: process.env.ETHERSCAN_MAINNET || "",
    },
  },
  solidity: {
    version: "0.8.15",
    settings: {
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "metadata", // <-- add this
          ],
        },
      },
    },
  },
  gasReporter: {
    enabled: true,
  },
  abiExporter: {
    path: path.join(".", "./abi"),
    clear: false,
    flat: true,
  },
  networks: {
    local: {
      url: "http://localhost:8545",
    },
    targetchain: {
      url: "http://localhost:8546",
      chainId: 1600,
    },
    mumbai: {
      url: RPC_ENDPOINTS.MUMBAI,
      accounts: [process.env.OWNER_PK || ""],
    },
    opgoerli: {
      url: RPC_ENDPOINTS.OP_GOERLI,
      accounts: [process.env.OWNER_PK || ""],
    },
    goerli: {
      url: RPC_ENDPOINTS.GOERLI,
      accounts: [process.env.OWNER_PK || ""],
    },
  },
};

export default config;
