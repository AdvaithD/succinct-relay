// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15;

import { IMessageBridge } from "./interfaces/interfaces.sol";
import { Owned } from "./Owned.sol";

contract Counter is Owned {
  /// @notice bridge to send
  address public immutable bridge;

  /// @notice counter
  uint256 public count;

  /// @notice event emitted when counter is called
  event CounterLatest(uint256 counter);

  /// @notice constructor sets the bridge on current chain
  constructor(address _bridge) Owned(_bridge) {
    bridge = _bridge;
  }

  /// @notice Increment the counter
  function increment() public onlyOwner {
    count += 1;
    emit CounterLatest(count);
  }

  /// @notice Send message to another chain
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the transaction
  function send(
    address to,
    uint256 value,
    bytes memory data,
    bytes memory signature
  ) public payable {
    IMessageBridge(bridge).send(
      msg.sender, // user requesting this cross-chain txn
      to,
      value,
      data,
      signature
    );
  }
}
