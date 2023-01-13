import { TrustedRelayerConfig, ChainConfig } from "../lib/trusted-relayer";
import { RPC_ENDPOINTS, ADDRESSES } from "./constants";
import { config } from "dotenv";

config();

export const getDefaultConfig = (): TrustedRelayerConfig => {
  const config = {} as TrustedRelayerConfig;

  config.homeConfig = {
    name: "GOERLI",
    bridgeAddress: ADDRESSES.GOERLI.BRIDGE,
    counterAddress: ADDRESSES.GOERLI.COUNTER,
    rpc: RPC_ENDPOINTS.GOERLI,
  } as ChainConfig;

  config.foreignConfig = {
    name: "MUMBAI",
    bridgeAddress: ADDRESSES.MUMBAI.BRIDGE,
    counterAddress: ADDRESSES.MUMBAI.COUNTER,
    rpc: RPC_ENDPOINTS.MUMBAI,
  } as ChainConfig;

  config.pkey = process.env.OWNER_PK || "";

  return config;
};
