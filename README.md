# Smart Contract Arbitrary Message Bridge

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```

# Arbitrary Message Bridge Smart Contracts

Foobar is a simple implementation of a smart contract AMB (arbitrary message bridge).

## Installation

Use the package manager [pip](https://pip.pypa.io/en/stable/) to install foobar.

```bash
npm install # install dependencies

npm run chain:source # run source chain
npm run chain:target # run target chain

npm run deploy:source # deploy contracts on source

## Modify ./relayer/constants file with new addresses for the chains
## SOURCE and TARGET

npm run deploy:target # deploy contracts on source

```

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
