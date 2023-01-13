// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMessageBridge {
  function send(
    address user,
    address to,
    uint256 value,
    bytes memory data,
    bytes memory signature
  ) external payable;

  function execute(
    address from,
    address to,
    uint256 value,
    uint256 nonce,
    bytes memory data,
    uint256 bond,
    bytes memory signature
  ) external;
}
