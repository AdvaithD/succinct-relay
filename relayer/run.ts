import { TrustedRelayer } from "./lib/trusted-relayer";

const main = async (): Promise<void> => {
  const relayer = new TrustedRelayer();
  await relayer.startPollingNewBlocks();
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
