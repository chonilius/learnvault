#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::{
    Address, Env,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
};

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]
    #[test]
    #[ignore]
    fn test_fuzz_mint_random_amounts(amount in 0..u128::MAX) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        env.mock_all_auths();

        // Register the standard generic Soroban token (LearnToken equivalent)
        let token_contract_id = env.register_stellar_asset_contract_v2(admin.clone());
        let token_id = token_contract_id.address();

        let client = StellarAssetClient::new(&env, &token_id);
        let token_client = TokenClient::new(&env, &token_id);

        let safe_amount = if amount > i128::MAX as u128 {
            i128::MAX
        } else {
            amount as i128
        };

        // Execute mint
        client.mint(&user, &safe_amount);

        // Verify balance and no panic
        let balance = token_client.balance(&user);
        assert_eq!(balance, safe_amount);
    }
} // close proptest!

extern crate std;

use soroban_sdk::{
    IntoVal,
    testutils::Events as _,
};

use crate::{LRNError, LearnToken, LearnTokenClient};

fn setup(e: &Env) -> (Address, Address, LearnTokenClient) {
    let admin = Address::generate(e);
    let id = e.register(LearnToken, ());
    e.mock_all_auths();
    let client = LearnTokenClient::new(e, &id);
    client.initialize(&admin);
    (id, admin, client)
}

// --- mint: happy path ---

#[test]
fn mint_increases_balance_and_supply() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);

    client.mint(&learner, &100);

    assert_eq!(client.balance(&learner), 100);
    assert_eq!(client.total_supply(), 100);
}

#[test]
fn mint_accumulates_on_repeated_calls() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);

    client.mint(&learner, &200);
    client.mint(&learner, &300);

    assert_eq!(client.balance(&learner), 500);
    assert_eq!(client.total_supply(), 500);
}

#[test]
fn mint_to_multiple_accounts_tracks_supply() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    client.mint(&alice, &100);
    client.mint(&bob, &250);

    assert_eq!(client.balance(&alice), 100);
    assert_eq!(client.balance(&bob), 250);
    assert_eq!(client.total_supply(), 350);
}

// --- mint: event emission ---

#[test]
fn mint_emits_event() {
    let e = Env::default();
    let (contract_id, _, client) = setup(&e);
    let learner = Address::generate(&e);

    client.mint(&learner, &42);

    let events = e.events().all();
    // Find the lrn_mint event — check contract id and that the topic tuple
    // contains the "lrn_mint" symbol and the recipient address.
    use soroban_sdk::{symbol_short, vec};
    let found = events.iter().any(|(cid, topics, _data)| {
        cid == contract_id
            && topics
                == vec![
                    &e,
                    symbol_short!("lrn_mint").into_val(&e),
                    learner.clone().into_val(&e),
                ]
    });
    assert!(found, "lrn_mint event not found");
}

// --- mint: non-admin panics ---

#[test]
fn non_admin_mint_panics() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let id = e.register(LearnToken, ());

    // Only mock auth for initialize, not for mint
    e.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &admin,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &id,
            fn_name: "initialize",
            args: (admin.clone(),).into_val(&e),
            sub_invokes: &[],
        },
    }]);

    let client = LearnTokenClient::new(&e, &id);
    client.initialize(&admin);

    let learner = Address::generate(&e);
    let result = client.try_mint(&learner, &100);
    assert!(result.is_err());
}

// --- mint: zero amount panics ---

#[test]
fn zero_amount_mint_panics() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);

    let result = client.try_mint(&learner, &0);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::ZeroAmount as u32
        )))
    );
}

#[test]
fn negative_amount_mint_panics() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);

    let result = client.try_mint(&learner, &-1);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::ZeroAmount as u32
        )))
    );
}

// --- misc ---

#[test]
fn balance_of_unknown_account_is_zero() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    assert_eq!(client.balance(&Address::generate(&e)), 0);
}

#[test]
fn total_supply_starts_at_zero() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn get_version_returns_semver() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let version = client.get_version();
    assert_eq!(version, soroban_sdk::String::from_str(&e, "1.0.0"));
}

// --- initialize: comprehensive tests ---

#[test]
fn initialize_sets_admin_correctly() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let id = e.register(LearnToken, ());
    e.mock_all_auths();
    let client = LearnTokenClient::new(&e, &id);
    client.initialize(&admin);
    
    // Verify admin can mint (only admin can mint)
    let learner = Address::generate(&e);
    client.mint(&learner, &100);
    assert_eq!(client.balance(&learner), 100);
}

#[test]
fn initialize_sets_name_symbol_decimals() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    
    use soroban_sdk::String;
    assert_eq!(client.name(), String::from_str(&e, "LearnVault Learn Token"));
    assert_eq!(client.symbol(), String::from_str(&e, "LRN"));
    assert_eq!(client.decimals(), 7);
}

#[test]
fn double_initialize_rejected() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let id = e.register(LearnToken, ());
    e.mock_all_auths();
    let client = LearnTokenClient::new(&e, &id);
    
    client.initialize(&admin);
    
    // Try to initialize again
    let new_admin = Address::generate(&e);
    let result = client.try_initialize(&new_admin);
    
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::Unauthorized as u32
        )))
    );
}

// --- transfer: soulbound tests ---

#[test]
fn transfer_panics_with_soulbound_error() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    
    client.mint(&alice, &100);
    
    let result = client.try_transfer(&alice, &bob, &50);
    
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::Soulbound as u32
        )))
    );
    
    // Verify balance unchanged
    assert_eq!(client.balance(&alice), 100);
    assert_eq!(client.balance(&bob), 0);
}

#[test]
fn transfer_always_panics_even_with_zero_amount() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    
    let result = client.try_transfer(&alice, &bob, &0);
    
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::Soulbound as u32
        )))
    );
}

// --- reputation_score tests ---

#[test]
fn reputation_score_increases_with_balance() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);
    
    // No balance = 0 reputation
    assert_eq!(client.reputation_score(&learner), 0);
    
    // 100 LRN = 1 reputation
    client.mint(&learner, &100);
    assert_eq!(client.reputation_score(&learner), 1);
    
    // 500 LRN = 5 reputation
    client.mint(&learner, &400);
    assert_eq!(client.reputation_score(&learner), 5);
    
    // 999 LRN = 9 reputation (integer division)
    client.mint(&learner, &499);
    assert_eq!(client.reputation_score(&learner), 9);
    
    // 1000 LRN = 10 reputation
    client.mint(&learner, &1);
    assert_eq!(client.reputation_score(&learner), 10);
}

#[test]
fn reputation_score_proportional_to_balance() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let learner = Address::generate(&e);
    
    client.mint(&learner, &12345);
    assert_eq!(client.reputation_score(&learner), 123);
}

#[test]
fn reputation_score_zero_for_unknown_address() {
    let e = Env::default();
    let (_, _, client) = setup(&e);
    let unknown = Address::generate(&e);
    
    assert_eq!(client.reputation_score(&unknown), 0);
}

// --- set_admin tests ---

#[test]
fn set_admin_transfers_admin_rights() {
    let e = Env::default();
    let old_admin = Address::generate(&e);
    let new_admin = Address::generate(&e);
    let id = e.register(LearnToken, ());
    e.mock_all_auths();
    
    let client = LearnTokenClient::new(&e, &id);
    client.initialize(&old_admin);
    
    // Transfer admin
    client.set_admin(&new_admin);
    
    // New admin can mint
    let learner = Address::generate(&e);
    client.mint(&learner, &100);
    assert_eq!(client.balance(&learner), 100);
}

#[test]
fn set_admin_only_callable_by_current_admin() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let attacker = Address::generate(&e);
    let id = e.register(LearnToken, ());
    
    // Only mock auth for initialize
    e.mock_auths(&[soroban_sdk::testutils::MockAuth {
        address: &admin,
        invoke: &soroban_sdk::testutils::MockAuthInvoke {
            contract: &id,
            fn_name: "initialize",
            args: (admin.clone(),).into_val(&e),
            sub_invokes: &[],
        },
    }]);
    
    let client = LearnTokenClient::new(&e, &id);
    client.initialize(&admin);
    
    // Attacker tries to set themselves as admin
    let result = client.try_set_admin(&attacker);
    assert!(result.is_err());
}

#[test]
fn set_admin_emits_event() {
    let e = Env::default();
    let (contract_id, _, client) = setup(&e);
    let new_admin = Address::generate(&e);
    
    client.set_admin(&new_admin);
    
    let events = e.events().all();
    use soroban_sdk::{symbol_short, vec};
    let found = events.iter().any(|(cid, topics, _data)| {
        cid == contract_id
            && topics == vec![&e, symbol_short!("set_admin").into_val(&e)]
    });
    assert!(found, "set_admin event not found");
}

// --- mint: additional edge case tests ---

#[test]
fn mint_before_initialize_panics() {
    let e = Env::default();
    let id = e.register(LearnToken, ());
    e.mock_all_auths();
    let client = LearnTokenClient::new(&e, &id);
    
    let learner = Address::generate(&e);
    let result = client.try_mint(&learner, &100);
    
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            LRNError::NotInitialized as u32
        )))
    );
}
