# Succinct Relay - Arbitrary Message Bridge Contracts

Set of contracts and a trusted relayer that allows users to send arbitrary messages from one evm chain to another. 


## Project Structure

```bash
/contracts - Contracts directory (contains GenericBridge, BridgeLib, and Counter)
/relayer - Relayer that watches and fulfills execution requests between two chains
/deployments - Latest deployment addresses (currently mumbai.json and goerli.json)
/prisma - Stores the prisma schema for the database (ArbitraryMessage)
/scripts
  /deploy.ts - Script to deploy contracts
  /send
    /goerli.ts - Manually queue a message for execution from goerli -> mumbai
    /mumbai.ts - Manually queue a message for execution from mumbai -> goerli
/test - Has two simple tests that go over emitting execution requests and executing them
```
## Setup

Setup involves preparing necessary artifacts for the relay, running a docker postgres container and 

### Relay Setuup

1. Run a postgres docker cAntainer: 
`docker run --name relayer-db -p 5455:5432 -e POSTGRES_USER=postgresUser -e POSTGRES_PASSWORD=postgresPW -e POSTGRES_DB=postgresDB -d postgres`

2. Populate your `.env` file with the following variables

```bash
# format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
OWNER_PK=""
BRIDGE_USER_PK=""
ETHERSCAN_MAINNET="" # contract verifications
ETHERSCAN_MUMBAI=""  # contract verification
```

3. Install dependencies, compile hardhat contracts
```bash
npm install # install dependencies
npx hardhat compile # compile contracts, generate bindings (used by relay)

4. Run the relay
### Run Relay (watches and relays transaction)
npm run relay
```

### Deploy contracts locally

```bash
npm run deploy:goerli
npm run deploy:mumbai
```
This should also popular `mumbai.json` and `goerli.json` in the `/deployments` folder

### Interact With Testnet (Polygon Mumbai <-> Goerli)

You can test out interactions that begin either on goerli, or mumbai
```
# send txn on goerli that queues counter being incremented on matic
npm run send:goerli 

# send txn on matic that queues counter being incremented on goerli
npm run send:matic 
```

NOTE: You will need to update the `nonce` variable when calling the send functions in the respective script (increment it after every successful send txn is sent out via the script)

## Modify ./relayer/constants file with new addresses for the chains
## SOURCE and TARGET

npm run deploy:target # deploy contracts on source
## Gas Report

```bash
·-----------------------------|----------------------------|-------------|-----------------------------·
|    Solc version: 0.8.15     ·  Optimizer enabled: false  ·  Runs: 200  ·  Block limit: 30000000 gas  │
······························|····························|·············|······························
|  Methods                                                                                             │
··················|···········|··············|·············|·············|···············|··············
|  Contract       ·  Method   ·  Min         ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
··················|···········|··············|·············|·············|···············|··············
|  Counter        ·  send     ·           -  ·          -  ·      43303  ·            2  ·          -  │
··················|···········|··············|·············|·············|···············|··············
|  GenericBridge  ·  execute  ·           -  ·          -  ·      42692  ·            2  ·          -  │
··················|···········|··············|·············|·············|···············|··············
|  Deployments                ·                                          ·  % of limit   ·             │
······························|··············|·············|·············|···············|··············
|  Counter                    ·           -  ·          -  ·     653598  ·        2.2 %  ·          -  │
······························|··············|·············|·············|···············|··············
|  GenericBridge              ·           -  ·          -  ·    1214018  ·          4 %  ·          -  │

```

## Notes

### Smart Contract Architecture

Considering two chains, `ChainX` and `ChainY`, we have 4 smart contracts deployed:
1. `ChainX`: `CounterX` and `BridgeX`
1. `ChainY`: `CounterY` and `BridgeY`


```
     ┌────┐          ┌────────┐          ┌───────┐          ┌──────────────┐          ┌───────┐          ┌────────┐
     │User│          │CounterX│          │BridgeX│          │TrustedRelayer│          │BridgeY│          │CounterY│
     └─┬──┘          └───┬────┘          └───┬───┘          └──────┬───────┘          └───┬───┘          └───┬────┘
       │ send(increment) │                   │                     │                      │                  │     
       │ ────────────────>                   │                     │                      │                  │     
       │                 │                   │                     │                      │                  │     
       │                 │      send()       │                     │                      │                  │     
       │                 │ ─────────────────>│                     │                      │                  │     
       │                 │                   │                     │                      │                  │     
       │                 │                   │  RequestForward()   │                      │                  │     
       │                 │                   │────────────────────>│                      │                  │     
       │                 │                   │                     │                      │                  │     
       │                 │                   │                     │      execute()       │                  │     
       │                 │                   │                     │ ────────────────────>│                  │     
       │                 │                   │                     │                      │                  │     
       │                 │                   │                     │                      │    increment     │     
       │                 │                   │                     │                      │─────────────────>│     
     ┌─┴──┐          ┌───┴────┐          ┌───┴───┐          ┌──────┴───────┐          ┌───┴───┐          ┌───┴────┐
     │User│          │CounterX│          │BridgeX│          │TrustedRelayer│          │BridgeY│          │CounterY│
     └────┘          └────────┘          └───────┘          └──────────────┘          └───────┘          └────────┘
```

These contracts implement a few checks to ensure security and integrity of relayed messages between two EVM chains:

1. Verify the authenticity of the signed transaction: The relayer should check that the signature on the transaction is valid and corresponds to the expected sender.

2. Check the nonce: The relayer should ensure that the nonce of the transaction matches the current nonce of the sender's account on the source chain.

3. Verify the destination chain: The relayer should ensure that the transaction is being sent to the correct destination chain, and that the smart contract address on the destination chain is valid.

4. Check the gas limit and gas price: The relayer should ensure that the gas limit and gas price of the transaction are reasonable and do not exceed the maximum allowed by the destination chain.

5. Verify the smart contract code: The relayer should check that the smart contract code on the destination chain matches the expected code and has not been tampered with.

6. Monitor the transaction receipt: The relayer should monitor the transaction receipt to ensure that the transaction was mined successfully on the destination chain.

### Relayer Architecture

## License

[MIT](https://choosealicense.com/licenses/mit/)
