# Implementation Plan

- [x] 1. Checkout feature branch
  - Run `git checkout -b feat/learn-token` to create the implementation branch
  - _Requirements: all_

- [x] 2. Update LearnToken contract — core mint signature and event
  - Add `course_id: String` parameter to `mint`
  - Emit `MilestoneCompleted` event with topics `(symbol_short!("milestone"), to.clone(), course_id)` and data `amount`
  - Ensure balance and total_supply are updated atomically before the event
  - _Requirements: 2.1, 2.2, 6.1, 6.2_

- [ ]* 2.1 Write property test: mint accumulates balance and total supply
  - **Property 1: Mint accumulates balance and total supply**
  - **Validates: Requirements 2.1**
  - Add `proptest` to `[dev-dependencies]` in `contracts/learn_token/Cargo.toml`
  - Use `proptest!` macro with generated positive `i128` amounts and course ID strings
  - Verify `balance == sum of mints` and `total_supply == sum of mints` after N sequential mints

- [ ]* 2.2 Write property test: MilestoneCompleted event emitted on every mint
  - **Property 2: MilestoneCompleted event emitted on every mint**
  - **Validates: Requirements 2.2, 6.1, 6.2**
  - Generate random learner address, positive amount, and course_id string
  - After mint, inspect `env.events()` and assert the event topics and data match

- [x] 3. Add `reputation_score` view function
  - Add `pub fn reputation_score(env: Env, account: Address) -> i128` that delegates to the same persistent storage read as `balance`
  - _Requirements: 3.1, 3.2_

- [ ]* 3.1 Write property test: reputation_score mirrors balance
  - **Property 5: reputation_score mirrors balance**
  - **Validates: Requirements 3.1, 3.2**
  - Generate random address and sequence of mints
  - Assert `reputation_score(addr) == balance(addr)` after each mint

- [ ] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement and verify access control
  - Confirm `mint` and `set_admin` both call `admin.require_auth()` and panic with `Unauthorized` for non-admin callers
  - Confirm `initialize` panics with `Unauthorized` on double-call
  - Confirm `mint` and `set_admin` panic with `NotInitialized` when called before `initialize`
  - _Requirements: 2.3, 2.5, 5.1, 5.2, 5.3, 1.2_

- [ ]* 5.1 Write property test: non-admin callers are rejected
  - **Property 3: Non-admin callers are rejected**
  - **Validates: Requirements 2.3, 5.2**
  - Generate a random address distinct from the admin
  - Assert `try_mint` and `try_set_admin` both return `Unauthorized` error

- [ ] 6. Verify soulbound enforcement
  - Confirm `transfer`, `transfer_from`, and `approve` all panic with `Soulbound`
  - Confirm `allowance` always returns 0
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 6.1 Write property test: soulbound — all transfer operations revert
  - **Property 4: Soulbound — all transfer operations revert**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  - Generate random from/to address pairs and positive amounts
  - Assert `try_transfer`, `try_transfer_from`, `try_approve` all return `Soulbound` error
  - Assert `allowance` returns 0

- [x] 7. Enable and complete unit tests in test.rs
  - Uncomment and complete the three existing commented-out tests
  - Add unit tests for: `initialize` stores correct metadata, double-init reverts, pre-init mint reverts, zero-amount mint reverts, `set_admin` round-trip, pre-init `set_admin` reverts, fresh address returns 0 for balance and reputation_score
  - _Requirements: 1.1, 1.2, 1.3, 2.4, 2.5, 3.2, 5.1, 5.3_

- [ ] 8. Commit 1 — contract core (mint + event + reputation_score)
  - Stage and commit `contracts/learn_token/src/lib.rs` with message: `feat(learn-token): add course_id to mint, emit MilestoneCompleted, add reputation_score`
  - _Requirements: 2.1, 2.2, 3.1, 6.1_

- [ ] 9. Commit 2 — unit tests
  - Stage and commit `contracts/learn_token/src/test.rs` (unit tests only) with message: `test(learn-token): enable and expand unit test suite`
  - _Requirements: 7.2_

- [ ] 10. Commit 3 — property-based tests
  - Stage and commit updated `Cargo.toml` and property tests in `test.rs` with message: `test(learn-token): add proptest property-based tests for all 5 correctness properties`
  - _Requirements: 7.1_

- [ ] 11. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [-] 12. Commit 4 — docs
  - Create `docs/LearnToken.md` with NatSpec-style documentation covering: contract purpose, initialize, mint (with course_id), set_admin, balance, reputation_score, total_supply, error codes, and event schema
  - Stage and commit with message: `docs(learn-token): add NatSpec + usage docs`
  - _Requirements: all_
