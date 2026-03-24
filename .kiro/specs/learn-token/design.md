# Design Document — LearnToken (LRN)

## Overview

LearnToken (LRN) is a soulbound SEP-41 fungible token on the Stellar Soroban blockchain. It is minted to learners upon verified course milestone completion and acts as the core on-chain reputation layer of the LearnVault ecosystem. Because LRN represents real learning effort rather than speculative value, all transfer operations permanently revert. The contract lives at `contracts/learn_token/src/lib.rs` and is written in Rust targeting the Soroban runtime.

The existing skeleton already covers the basic structure. This design completes it by:
- Adding a `course_id` parameter to `mint` and emitting a structured `MilestoneCompleted` event.
- Adding a `reputation_score` view function that mirrors `balance`.
- Enabling and expanding the full test suite (unit + property-based).

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  LearnToken Contract                  │
│                                                      │
│  initialize(admin)                                   │
│  mint(to, amount, course_id)  ◄── admin only         │
│  set_admin(new_admin)         ◄── admin only         │
│                                                      │
│  balance(account)  ──┐                               │
│  reputation_score(a) ┘ same value, two entry points  │
│  total_supply()                                      │
│  name() / symbol() / decimals()                      │
│                                                      │
│  transfer / transfer_from / approve  ── always panic │
│  allowance  ── always returns 0                      │
└──────────────────────────────────────────────────────┘
         │ emits
         ▼
  MilestoneCompleted(learner, amount, course_id)
```

The contract has no external cross-contract calls. It is a pure state machine: balances are stored in persistent storage keyed by `DataKey::Balance(Address)`, and the total supply is stored in instance storage.

---

## Components and Interfaces

### Storage Keys

| Key | Storage type | Type | Description |
|-----|-------------|------|-------------|
| `ADMIN` (symbol_short) | Instance | `Address` | The privileged minter address |
| `NAME` (symbol_short) | Instance | `String` | Token name ("LearnToken") |
| `SYMBOL` (symbol_short) | Instance | `String` | Token symbol ("LRN") |
| `DECIMALS` (symbol_short) | Instance | `u32` | Decimal places (7) |
| `DataKey::TotalSupply` | Instance | `i128` | Sum of all minted LRN |
| `DataKey::Balance(Address)` | Persistent | `i128` | Per-learner balance |

### Public Interface

```rust
// Initialization
fn initialize(env: Env, admin: Address)

// Admin-only minting
fn mint(env: Env, to: Address, amount: i128, course_id: String)

// Admin role transfer
fn set_admin(env: Env, new_admin: Address)

// View functions
fn balance(env: Env, account: Address) -> i128
fn reputation_score(env: Env, account: Address) -> i128   // mirrors balance
fn total_supply(env: Env) -> i128
fn decimals(env: Env) -> u32
fn name(env: Env) -> String
fn symbol(env: Env) -> String

// SEP-41 transfer functions — always revert (soulbound)
fn transfer(env: Env, from: Address, to: Address, amount: i128)
fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128)
fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32)
fn allowance(env: Env, from: Address, spender: Address) -> i128  // always 0
```

### Error Enum

```rust
pub enum LRNError {
    Soulbound      = 1,   // transfer/approve called
    Unauthorized   = 2,   // non-admin called mint/set_admin, or double-init
    ZeroAmount     = 3,   // mint called with amount <= 0
    NotInitialized = 4,   // mint/set_admin called before initialize
}
```

### Event

`MilestoneCompleted` is published via `env.events().publish(topics, data)`:

- **Topics**: `(Symbol("milestone"), learner_address, course_id_string)`
- **Data**: `amount: i128`

This matches the Soroban event model where topics are a tuple and data is the payload.

---

## Data Models

### Balance Storage

Balances are stored in **persistent** storage (survives ledger TTL extensions) keyed by `DataKey::Balance(Address)`. This is appropriate because learner reputation must persist indefinitely.

```rust
#[contracttype]
pub enum DataKey {
    Balance(Address),
    TotalSupply,
}
```

Total supply is stored in **instance** storage alongside admin/name/symbol/decimals, since it is a single global value accessed on every mint.

### Mint Flow

```
mint(to, amount, course_id)
  1. load admin from instance storage (panic NotInitialized if absent)
  2. admin.require_auth()
  3. if amount <= 0 → panic ZeroAmount
  4. load balance for `to` (default 0)
  5. store balance + amount
  6. load total_supply (default 0)
  7. store total_supply + amount
  8. emit MilestoneCompleted event
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Prework Analysis

See prework tool output below. Summary of testable criteria:

- **1.1** (initialize stores state): yes — example
- **1.2** (double-init reverts): yes — example
- **1.3** (pre-init reads return defaults): yes — example
- **2.1** (mint increases balance and total supply): yes — property
- **2.2** (mint emits MilestoneCompleted): yes — property
- **2.3** (non-admin mint reverts): yes — property
- **2.4** (zero-amount mint reverts): yes — property
- **2.5** (pre-init mint reverts): yes — example
- **3.1** (reputation_score mirrors balance): yes — property
- **3.2** (zero balance for new address): yes — example
- **4.1** (transfer reverts): yes — property
- **4.2** (transfer_from reverts): yes — property
- **4.3** (approve reverts): yes — property
- **4.4** (allowance always 0): yes — property
- **5.1** (set_admin updates admin): yes — example
- **5.2** (non-admin set_admin reverts): yes — property
- **6.1** (event per mint): yes — property (covered by 2.2)
- **6.2** (separate event per course): yes — property (covered by 2.2)

After reflection, properties 4.1–4.4 can be combined into one soulbound property. Properties 2.2, 6.1, and 6.2 collapse into one event property. Properties 2.3 and 5.2 collapse into one access-control property.

---

### Property 1: Mint accumulates balance and total supply

*For any* learner address and sequence of positive mint amounts with distinct course IDs, the learner's balance after all mints equals the sum of all minted amounts, and the total supply equals the same sum.

**Validates: Requirements 2.1**

---

### Property 2: MilestoneCompleted event emitted on every mint

*For any* learner address, positive amount, and course ID string, calling `mint` successfully SHALL result in exactly one `MilestoneCompleted` event containing that learner address, amount, and course ID.

**Validates: Requirements 2.2, 6.1, 6.2**

---

### Property 3: Non-admin callers are rejected

*For any* address that is not the current admin, calling `mint` or `set_admin` SHALL revert with an `Unauthorized` error.

**Validates: Requirements 2.3, 5.2**

---

### Property 4: Soulbound — all transfer operations revert

*For any* pair of addresses and any positive amount, calling `transfer`, `transfer_from`, or `approve` SHALL revert with a `Soulbound` error, and `allowance` SHALL return 0 for any address pair.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 5: reputation_score mirrors balance

*For any* learner address and any sequence of mints, `reputation_score(address)` SHALL return the same value as `balance(address)` at all times.

**Validates: Requirements 3.1, 3.2**

---

## Error Handling

| Scenario | Error | Code |
|----------|-------|------|
| `transfer` / `transfer_from` / `approve` called | `Soulbound` | 1 |
| Non-admin calls `mint` or `set_admin` | `Unauthorized` | 2 |
| `initialize` called on already-initialized contract | `Unauthorized` | 2 |
| `mint` called with `amount <= 0` | `ZeroAmount` | 3 |
| `mint` or `set_admin` called before `initialize` | `NotInitialized` | 4 |

All errors use `panic_with_error!` which causes the Soroban host to abort the transaction and surface the error code to the caller.

---

## Testing Strategy

### Framework

The project uses the **Soroban SDK test utilities** (`soroban-sdk` with `features = ["testutils"]`). For property-based testing, we use **[`proptest`](https://github.com/proptest-rs/proptest)** — a mature Rust PBT library that generates random inputs and shrinks failing cases. It is added as a `dev-dependency`.

Each property-based test is configured to run a minimum of **100 iterations** via `proptest`'s default configuration.

### Unit Tests

Unit tests cover specific examples and error conditions:

- `initialize` stores correct name, symbol, decimals, admin
- Double `initialize` reverts with `Unauthorized`
- `mint` before `initialize` reverts with `NotInitialized`
- `mint` with zero amount reverts with `ZeroAmount`
- `balance` and `reputation_score` return 0 for a fresh address
- `set_admin` updates the admin correctly
- `set_admin` before `initialize` reverts with `NotInitialized`

### Property-Based Tests

Each property maps to exactly one `proptest!` test block, annotated with the property number and requirement reference.

| Test | Property | Requirement |
|------|----------|-------------|
| `prop_mint_accumulates` | Property 1 | Req 2.1 |
| `prop_milestone_event_emitted` | Property 2 | Req 2.2, 6.1, 6.2 |
| `prop_non_admin_rejected` | Property 3 | Req 2.3, 5.2 |
| `prop_soulbound_transfers_revert` | Property 4 | Req 4.1–4.4 |
| `prop_reputation_mirrors_balance` | Property 5 | Req 3.1, 3.2 |

Each property-based test MUST be tagged with:
```
// **Feature: learn-token, Property N: <property text>**
// **Validates: Requirements X.Y**
```

Both unit tests and property tests are co-located in `contracts/learn_token/src/test.rs`.
