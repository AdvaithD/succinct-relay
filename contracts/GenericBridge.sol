// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15;

import { Owned } from "./Owned.sol";
import { BridgeLib } from "./BridgeLib.sol";

/// @notice GenericBridge contract
/// @dev This contract is used to send messages to other chains
/// @dev This is based on a 'trusted relayer' assumption
contract GenericBridge is Owned {
  using BridgeLib for *;

  /// @notice Mapping of user address to nonce (prevents replaying messages)
  mapping(address => uint256) public nonces;

  /// @notice Total amount of ETH bonded (payment to the trusted relayer for executing transactions on foreign chain)
  uint256 public totalBonded;

  constructor() Owned(msg.sender) {}

  /// =================== EVENTS =================== //

  /// @notice event emitted when a cross-chain transaction is requested
  /// @param from address of the user who signed the transaction
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the transaction
  event RequestForward(
    address from,
    address to,
    uint256 value,
    uint256 nonce,
    bytes data,
    uint256 bond,
    bytes signature
  );

  /// @notice event emitted when a cross-chain transaction is executed
  /// @param from address of the user who signed the transaction
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the transaction
  event RequestSucceeded(
    address from,
    address to,
    uint256 value,
    uint256 nonce,
    bytes data,
    uint256 bond,
    bytes signature
  );

  /// @notice event emitted when the relayer owner harvests ETH
  event RelayerPayment(uint256 value);

  /// =================== SEND -> ANOTHER CHAIN =================== //

  /// @notice Send message to another chain
  /// @param user address of the user who signed the transaction
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the transaction
  function send(
    address user,
    address to,
    uint256 value,
    bytes memory data,
    bytes memory signature
  ) public payable {
    require(
      msg.value >= value,
      "Not enough ETH supplied for this BridgeTransaction"
    );

    /// @dev bond is the remaining ETH after deducting the tx value
    uint256 bond = msg.value - value;

    /// @dev construct a bridge transaction
    BridgeLib.BridgeTransaction memory transaction = BridgeLib
      .BridgeTransaction({
        to: to,
        value: value,
        data: data,
        nonce: nonces[msg.sender]++,
        bond: bond,
        signature: signature
      });

    // require(verify(user, to, value, data, signature) == true, "Signature verification failed");
    require(
      transaction.recoverSender() == user,
      "BridgeTransaction signature invalid"
    );

    totalBonded += bond;

    emitForward(transaction, user);
  }

  /// @notice Harvest all ETH payments
  /// @dev Contract holding ETH implies what users have paid
  /// @dev the relayer for execution
  function harvest() public onlyOwner {
    address payable sender = payable(msg.sender);
    sender.transfer(totalBonded);
    totalBonded = 0;
    emit RelayerPayment(totalBonded);
  }

  /// @notice Withdraw a specific amount of user payments
  /// @param value Amount to withdraw
  function withdrawValue(uint256 value) public onlyOwner {
    address payable sender = payable(msg.sender);
    require(
      value <= address(this).balance + totalBonded,
      "must reserve ETH for bonds to be reclaimed"
    );
    totalBonded -= value;
    sender.transfer(value);
    emit RelayerPayment(totalBonded);
  }

  /// =================== RECEIVE -> THIS CHAIN -> EXECUTE =================== //
  /// @notice Execute a cross-chain transaction
  /// @dev The `onlyOwner` modifier is used to allow a single
  /// @dev trusted entity to relay and execute messafes
  /// @param from address of the user who signed the transaction
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the user signing this request
  function execute(
    address from,
    address to,
    uint256 value,
    uint256 nonce,
    bytes memory data,
    uint256 bond,
    bytes memory signature
  ) public onlyOwner {
    BridgeLib.BridgeTransaction memory transaction = BridgeLib
      .BridgeTransaction({
        to: to,
        value: value,
        nonce: nonce,
        data: data,
        bond: bond,
        signature: signature
      });

    require(
      transaction.recoverSender() == from,
      "BridgeTransaction signature invalid"
    );

    (bool success, ) = BridgeLib.executeTransaction(transaction);
    require(success, "BridgeTransaction failed");
    emitSuccess(transaction, from);
  }

  // ============= SIGNATURE UTILS ================= //

  /// @notice Get hash to be signed by the user
  /// @dev signature is set to bytes(0) because it isnt being used here
  /// @param _to address of the contract to be called
  /// @param _value value to be sent to the contract
  /// @param _data data to be sent to the contract
  /// @return bytes32 hash to be signed
  function getMessageHash(
    address _to,
    uint _value,
    uint256 _nonce,
    bytes memory _data,
    uint256 _bond
  ) public pure returns (bytes32) {
    BridgeLib.BridgeTransaction memory transaction = BridgeLib
      .BridgeTransaction({
        to: _to,
        value: _value,
        nonce: _nonce,
        data: _data,
        bond: _bond,
        signature: new bytes(0)
      });
    return BridgeLib.toTransactionHash(transaction);
  }

  /// ============================ EMIT EVENTS ON SOURCE CHAIN =====================
  /// @notice Emit a RequestForward event
  /// @param transaction BridgeTransaction to be emitted
  /// @param sender address of the sender
  function emitForward(
    BridgeLib.BridgeTransaction memory transaction,
    address sender
  ) internal {
    emit RequestForward(
      sender,
      transaction.to,
      transaction.value,
      transaction.nonce,
      transaction.data,
      transaction.bond,
      transaction.signature
    );
  }

  /// ============================ EMIT EVENTS ON TARGET CHAIN =====================
  /// @notice Emit a RequestForward event
  /// @param transaction BridgeTransaction to be emitted
  /// @param sender address of the sender
  function emitSuccess(
    BridgeLib.BridgeTransaction memory transaction,
    address sender
  ) internal {
    emit RequestSucceeded(
      sender,
      transaction.to,
      transaction.value,
      transaction.nonce,
      transaction.data,
      transaction.bond,
      transaction.signature
    );
  }
}
