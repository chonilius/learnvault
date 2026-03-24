# Requirements Document

## Introduction

LearnToken (LRN) is a soulbound (non-transferable) SEP-41 fungible token on the Stellar Soroban blockchain. It is minted to learners upon verified course milestone completion and serves as the core on-chain reputation layer of the LearnVault ecosystem. A learner's LRN balance is their academic reputation score, which gates scholarship eligibility and governance participation. Because LRN represents real learning effort rather than speculative value, all transfer operations are permanently disabled.

This spec covers the full implementation of the `LearnToken` Soroban contract, including minting access control, the `MilestoneCompleted` event, a reputation score view function, and a comprehensive property-based test suite.

## Glossary

- **LearnToken (LRN)**: The soulbound SEP-41 fungible token representing a learner's on-chain reputation score.
- **Soulbound**: A token that is permanently non-transferable; it is bound to the wallet that received it.
- **SEP-41**: The Stellar Ecosystem Proposal defining the fungible token interface for Soroban smart contracts.
- **Soroban**: The smart contract platform on the Stellar blockchain.
- **Admin**: The privileged address authorized to call `mint`. Initially set by the deployer; intended to be transferred to the `CourseMilestone` contract.
- **CourseMilestone**: The Soroban contract that tracks learner progress and triggers LRN minting upon verified checkpoint completion.
- **Learner**: A user wallet address that receives LRN tokens upon completing course milestones.
- **Reputation Score**: The LRN balance of a learner's address, representing their cumulative verified learning effort.
- **MilestoneCompleted**: The contract event emitted each time LRN is minted to a learner.
- **Total Supply**: The sum of all LRN tokens minted across all learner addresses.
- **Decimals**: The number of decimal places for LRN token amounts (7, matching Stellar convention).

---

## Requirements

### Requirement 1

**User Story:** As a contract deployer, I want to initialize the LearnToken contract with an admin address, so that minting authority is established from the start.

#### Acceptance Criteria

1. WHEN the deployer calls `initialize` with a valid admin address, THE LearnToken contract SHALL store the admin address, set the token name to "LearnToken", set the symbol to "LRN", and set decimals to 7.
2. WHEN `initialize` is called on a contract that has already been initialized, THE LearnToken contract SHALL revert with an `Unauthorized` error.
3. WHEN `balance`, `name`, `symbol`, or `decimals` are queried before `initialize` is called, THE LearnToken contract SHALL return safe default values without panicking.

---

### Requirement 2

**User Story:** As the CourseMilestone contract (admin), I want to mint LRN tokens to a learner upon verified milestone completion, so that the learner's on-chain reputation score increases.

#### Acceptance Criteria

1. WHEN the admin calls `mint` with a valid learner address and a positive amount, THE LearnToken contract SHALL increase the learner's balance by that amount and increase the total supply by that amount.
2. WHEN the admin calls `mint`, THE LearnToken contract SHALL emit a `MilestoneCompleted` event containing the learner address, the minted amount, and the course ID string.
3. WHEN a non-admin address calls `mint`, THE LearnToken contract SHALL revert with an `Unauthorized` error.
4. WHEN the admin calls `mint` with an amount of zero or less, THE LearnToken contract SHALL revert with a `ZeroAmount` error.
5. WHEN `mint` is called before `initialize`, THE LearnToken contract SHALL revert with a `NotInitialized` error.

---

### Requirement 3

**User Story:** As a learner or external observer, I want to query a learner's reputation score, so that I can verify their on-chain academic standing.

#### Acceptance Criteria

1. THE LearnToken contract SHALL expose a `reputation_score` view function that returns the same value as `balance` for any given address.
2. WHEN a learner has never received any LRN tokens, THE LearnToken contract SHALL return 0 for both `balance` and `reputation_score`.

---

### Requirement 4

**User Story:** As a learner, I want LRN tokens to be permanently non-transferable, so that my reputation score cannot be bought, sold, or delegated.

#### Acceptance Criteria

1. WHEN any address calls `transfer` on the LearnToken contract, THE LearnToken contract SHALL revert with a `Soulbound` error.
2. WHEN any address calls `transfer_from` on the LearnToken contract, THE LearnToken contract SHALL revert with a `Soulbound` error.
3. WHEN any address calls `approve` on the LearnToken contract, THE LearnToken contract SHALL revert with a `Soulbound` error.
4. THE LearnToken contract SHALL return 0 for `allowance` for any address pair.

---

### Requirement 5

**User Story:** As the contract owner, I want to transfer the admin (minter) role to a new address, so that I can hand off minting authority to the CourseMilestone contract after deployment.

#### Acceptance Criteria

1. WHEN the current admin calls `set_admin` with a new address, THE LearnToken contract SHALL update the stored admin to the new address.
2. WHEN a non-admin address calls `set_admin`, THE LearnToken contract SHALL revert with an `Unauthorized` error.
3. WHEN `set_admin` is called before `initialize`, THE LearnToken contract SHALL revert with a `NotInitialized` error.

---

### Requirement 6

**User Story:** As a developer, I want the LearnToken contract to emit a structured `MilestoneCompleted` event on every mint, so that off-chain indexers and the frontend can track learner progress.

#### Acceptance Criteria

1. WHEN `mint` is called successfully, THE LearnToken contract SHALL emit an event with topic `MilestoneCompleted` containing the learner address, the minted amount, and the course ID.
2. WHEN multiple `mint` calls are made for the same learner across different courses, THE LearnToken contract SHALL emit a separate `MilestoneCompleted` event for each call.

---

### Requirement 7

**User Story:** As a developer, I want comprehensive property-based tests for the LearnToken contract, so that correctness is verified across a wide range of inputs.

#### Acceptance Criteria

1. WHEN the test suite runs, THE LearnToken contract SHALL have property-based tests covering minting balance accumulation, soulbound transfer rejection, admin access control, and the reputation score mirror property.
2. WHEN the test suite runs, THE LearnToken contract SHALL have unit tests covering initialization, zero-amount rejection, double-initialization rejection, and event emission.
