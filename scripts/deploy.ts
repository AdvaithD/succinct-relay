import { ethers } from "hardhat";
import * as fs from "fs";
const hre = require("hardhat");

const deployBridge = async () => {
  const [signer] = await ethers.getSigners();
  console.log("Deploying bridge with signer: ", signer.address);
  console.log("Deploying bridge");
  const Bridge = await hre.ethers.getContractFactory("GenericBridge");
  const bridge = await Bridge.deploy();
  await bridge.deployed();
  console.log(`Bridge Address: ${bridge.address}`);
  return { address: bridge.address };
};

const deployCounter = async (bridgeAddress: string) => {
  console.log("Deploying counter");
  const Counter = await hre.ethers.getContractFactory("Counter");
  const counter = await Counter.deploy(bridgeAddress);
  await counter.deployed();
  console.log(`Counter Address: ${counter.address}`);
  return { address: counter.address };
};

async function main() {
  console.log("network", hre.network.name);
  // deploy bridge
  const { address: bridgeAddress } = await deployBridge();
  // deploy coutner
  const { address: counterAddress } = await deployCounter(bridgeAddress);

  const info = {
    network: hre.network.name,
    bridge: bridgeAddress,
    counter: counterAddress,
  };

  fs.writeFileSync(
    `${__dirname}/../deployments/${hre.network.name}.json`,
    JSON.stringify(info, null, 2)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
