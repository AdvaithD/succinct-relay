// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library BridgeLib {
  using ECDSA for bytes32;

  /// ============================ Arbitrary Message Struct ============================
  /// @notice BridgeTransaction struct
  /// @param to address of the contract to be called
  /// @param value value to be sent to the contract
  /// @param data data to be sent to the contract
  /// @param signature signature of the transaction
  struct BridgeTransaction {
    address to;
    uint256 value;
    uint256 nonce;
    bytes data;
    uint256 bond;
    bytes signature;
  }

  /// ============================ EXECUTION ============================
  /// @notice Execute a cross-chain transaction
  /// @param transaction BridgeTransaction to be executed
  /// @return success bool indicating if the transaction was successful
  function executeTransaction(
    BridgeTransaction memory transaction
  ) internal returns (bool success, bytes memory result) {
    (success, result) = transaction.to.call{
      value: transaction.value,
      gas: gasleft()
    }(bytes(transaction.data));
  }

  /// ============================ SIGNING UTILS =========================
  /// @notice Recover the sender of a BridgeTransaction
  /// @param transaction BridgeTransaction to recover the sender from
  /// @return sender address of the sender
  /// @dev This function is used to recover the sender of a BridgeTransaction request
  function recoverSender(
    BridgeTransaction memory transaction
  ) internal pure returns (address sender) {
    sender = ECDSA.recover(
      ECDSA.toEthSignedMessageHash(toTransactionHash(transaction)),
      transaction.signature
    );
  }

  /// ============================ HASHING UTILS =========================
  /// @notice Hash a BridgeTransaction
  /// @param transaction BridgeTransaction to be hashed
  /// @return result bytes32 hash of the BridgeTransaction
  /// @dev This function is used to hash a BridgeTransaction request
  /// @dev Its okay to pass `signature: bytes(0)` since it isnt being used in the hashing logic
  function toTransactionHash(
    BridgeTransaction memory transaction
  ) internal pure returns (bytes32 result) {
    return
      keccak256(
        abi.encodePacked(
          transaction.to,
          transaction.value,
          transaction.nonce,
          transaction.data,
          transaction.bond
        )
      );
  }
}
