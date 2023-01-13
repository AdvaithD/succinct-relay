import { Counter__factory } from "./../../typechain-types/factories/contracts/Counter__factory";
import { getDefaultConfig } from "./../utils/config";
import { bridge_abi } from "./../utils/constants";
import { ethers, utils } from "ethers";
import winston from "winston";
import { JsonRpcProvider } from "@ethersproject/providers";
import { Counter } from "../../typechain-types";
import { LogDescription } from "ethers/lib/utils";
import { createArbitraryMessage, prisma } from "../utils/db";
import { ArbitraryMessage } from "@prisma/client";

const getAddress = utils.getAddress;

export type ChainConfig = {
  name: string;
  rpc: string;
  bridgeAddress: string;
  counterAddress: string;
};

enum ChainType {
  HOME = "HOME",
  FOREIGN = "FOREIGN",
}

export type TrustedRelayerConfig = {
  homeConfig: ChainConfig;
  foreignConfig: ChainConfig;
  pkey: string;
};

export type Chain = {
  // metadata
  name: string;
  type: ChainType;

  // provider and signer
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Wallet;

  // contract instances
  bridge: ethers.Contract;
  counter: ethers.Contract;

  bridgeAddress: string;
  counterAddress: string;
};

interface IRelayer {
  config: TrustedRelayerConfig;

  // objects with signers, providers and contract instances
  chainA: Chain;
  chainB: Chain;

  // logger
  logger: winston.Logger;

  initializeChain(chain: Chain, config: ChainConfig, type: ChainType): void;
  startPollingNewBlocks(): Promise<void>;
  processIndividualBlock(blockNumber: number, chain: Chain): Promise<void>;
  processBlocksFor(chain: Chain): Promise<void>;
  info(msg: string): void;
  error(msg: string): void;
  processLog(log: ethers.providers.Log, chain: Chain): Promise<void>;
  relayTxnFor(chain: Chain, {}: any): Promise<void>;
  checkIfLogIsFromBridge(log: ethers.providers.Log, chain: Chain): boolean;
  writeDb(payload: Record<any, any>): Promise<void>;
}

export class TrustedRelayer implements IRelayer {
  config: TrustedRelayerConfig;

  // objects with signers, providers and contract instances
  chainA: Chain;
  chainB: Chain;

  // logger
  logger: winston.Logger;

  constructor(params?: TrustedRelayerConfig) {
    // set config and logger
    if (!params) {
      this.config = getDefaultConfig();
    } else {
      this.config = params;
    }

    this.logger = winston.createLogger({
      format: winston.format.simple(),
      transports: [new winston.transports.Console()],
    });

    // initialize chainA
    this.chainA = {} as Chain;
    this.initializeChain(this.chainA, this.config.homeConfig, ChainType.HOME);

    // initialize chainB
    this.chainB = {} as Chain;
    this.initializeChain(
      this.chainB,
      this.config.foreignConfig,
      ChainType.FOREIGN
    );
  }

  writeDb = async ({
    from,
    to,
    value,
    data,
    signature,
    source,
    target,
  }: any) => {
    await createArbitraryMessage({
      fromAddress: from,
      toAddress: to,
      value,
      data,
      signature,
      sourceNetwork: source,
      targetNetwork: target,
    });
    this.info(`ArbitraryMessage: Finished writing to DB`);
  };

  initializeChain = (chain: Chain, config: ChainConfig, type: ChainType) => {
    try {
      this.info(`Initializing chain: ${config.name}`);
      chain.name = config.name;
      chain.type = type;
      chain.provider = new JsonRpcProvider(config.rpc);
      chain.bridgeAddress = config.bridgeAddress;
      chain.counterAddress = config.counterAddress;
      chain.bridge = new ethers.Contract(
        config.bridgeAddress,
        bridge_abi,
        chain.provider
      );
      chain.counter = Counter__factory.connect(
        config.counterAddress,
        chain.provider
      ) as Counter;
      chain.signer = new ethers.Wallet(this.config.pkey, chain.provider);

      this.info(`Finished Initializing chain: ${config.name}`);
    } catch (error) {
      this.error(`Error initializing chain: ${config.name}`);
      throw error;
    }
  };

  // start processingnew blocks and process
  startPollingNewBlocks = async () => {
    const { chainA, chainB, processBlocksFor } = this;
    await processBlocksFor(chainA);
    await processBlocksFor(chainB);
  };

  checkIfLogIsFromBridge = (
    log: ethers.providers.Log,
    chain: Chain
  ): boolean => {
    if (getAddress(log.address) == getAddress(chain.bridgeAddress)) {
      return true;
    } else {
      return false;
    }
  };

  processIndividualBlock = async (blockNumber: number, chain: Chain) => {
    const { transactions } = await chain.provider.getBlockWithTransactions(
      blockNumber
    );
    this.info(
      `${chain.name}: Processing block: ${blockNumber}, txnCount: ${transactions.length}`
    );

    const promises = transactions.map(async ({ from, to, hash }) => {
      if (to == null) {
        return;
      } else if (
        getAddress(to) == getAddress(chain.bridgeAddress) ||
        getAddress(to) == getAddress(chain.counterAddress)
      ) {
        console.log("found txn that matters", { from, to, hash });
        const { logs, blockNumber } =
          await chain.provider.getTransactionReceipt(hash);
        if (logs.length > 0) {
          this.info(
            `${chain.name}: Found ${logs.length} logs at height: ${blockNumber}`
          );
          logs.map((log) => this.processLog(log, chain));
        }
      }
    });
    await Promise.all(promises);
  };

  relayTxnFor = async (
    chain: Chain,
    { from, to, value, nonce, data, bond, signature }: any
  ) => {
    if (chain.type === ChainType.HOME) {
      const txn = await this.chainB.bridge
        .connect(this.chainB.signer)
        .execute(from, to, value, nonce, data, bond, signature);
      this.info(`Waiting to mine relayed msg on foreign network: ${txn.hash}`);
      await txn.wait();
      this.info(`Relayed msg mined on foreign network!: ${txn.hash}`);
      await this.writeDb({
        from,
        to,
        value,
        data,
        signature,
        source: "HOME",
        target: "FOREIGN",
      });
    } else if (chain.type === ChainType.FOREIGN) {
      const txn = await this.chainA.bridge
        .connect(this.chainA.signer)
        .execute(from, to, value, nonce, data, bond, signature);
      this.info(`Waiting to mine relayed msg on home network: ${txn.hash}`);
      await txn.wait();
      this.info(`Relayed msg mined on home network!: ${txn.hash}`);
      await this.writeDb({
        from,
        to,
        value,
        data,
        signature,
        source: "FOREIGN",
        target: "HOME",
      });
    }
  };

  processLog = async (log: ethers.providers.Log, chain: Chain) => {
    try {
      if (!this.checkIfLogIsFromBridge(log, chain)) {
        return;
      }
      const parsedLog: LogDescription = chain.bridge.interface.parseLog(log);
      // todo: doesnt work
      if (!parsedLog) {
        console.log("No log found");
        return;
      }

      if (parsedLog.name === "RequestForward") {
        console.log("Received request to forward");
        const { from, to, value, nonce, data, bond, signature } =
          parsedLog.args;
        console.log(
          `Parsed req: from: ${from}, to: ${to}, value: ${value}, data: ${data}`
        );
        this.info(
          `Need to forward request: \n${from}, \n${to}, \n${value}, \n${data}`
        );
        // await newForwardedRequest({ from, to, value, data})
        await this.relayTxnFor(chain, {
          from,
          to,
          value,
          nonce,
          data,
          bond,
          signature,
        });
      }
      if (parsedLog.name === "RequestSucceeded") {
        console.log("RequestSucceeded::SUCCESS");
        const { from, to, value, nonce, data, bond, signature } =
          parsedLog.args;
        console.log(`from: ${from}, to: ${to}, value: ${value}, data: ${data}`);
      }
    } catch (error) {
      console.log("ERROR:93", error);
    }
  };

  processBlocksFor = async (chain: Chain = {} as Chain) => {
    const { processIndividualBlock } = this;
    // chainA
    chain.provider.on("block", async (blockNumber: number) => {
      await processIndividualBlock(blockNumber, chain);
    });
  };

  info = (msg: string) => {
    this.logger.info(msg);
  };

  error = (msg: string) => {
    this.logger.error(msg);
  };
}
