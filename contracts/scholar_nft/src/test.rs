#![cfg(test)]

extern crate std;

use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Events as _},
    vec, Address, Env, IntoVal, String,
};

use crate::{ScholarNFT, ScholarNFTClient, ScholarNFTError};

fn setup(env: &Env) -> (Address, Address, ScholarNFTClient) {
    let admin = Address::generate(env);
    let contract_id = env.register(ScholarNFT, ());
    env.mock_all_auths();
    let client = ScholarNFTClient::new(env, &contract_id);
    client.initialize(&admin);
    (contract_id, admin, client)
}

fn cid(env: &Env, value: &str) -> String {
    String::from_str(env, value)
}

#[test]
fn mint_returns_sequential_token_ids() {
    let env = Env::default();
    let (_, _, client) = setup(&env);
    let scholar_a = Address::generate(&env);
    let scholar_b = Address::generate(&env);

    assert_eq!(client.mint(&scholar_a, &cid(&env, "ipfs://cid-1")), 1);
    assert_eq!(client.mint(&scholar_b, &cid(&env, "ipfs://cid-2")), 2);
}

#[test]
fn owner_of_returns_minted_owner() {
    let env = Env::default();
    let (_, _, client) = setup(&env);
    let scholar = Address::generate(&env);

    let token_id = client.mint(&scholar, &cid(&env, "ipfs://owner-check"));

    assert_eq!(client.owner_of(&token_id), scholar);
}

#[test]
fn token_uri_returns_metadata_uri() {
    let env = Env::default();
    let (_, _, client) = setup(&env);
    let scholar = Address::generate(&env);
    let metadata_uri = cid(&env, "ipfs://bafybeigdyrzt");

    let token_id = client.mint(&scholar, &metadata_uri);

    assert_eq!(client.token_uri(&token_id), metadata_uri);
}

#[test]
fn revoke_flow_marks_token_revoked() {
    let env = Env::default();
    let (_, admin, client) = setup(&env);
    let scholar = Address::generate(&env);
    let reason = cid(&env, "Plagiarism");

    let token_id = client.mint(&scholar, &cid(&env, "ipfs://revoke"));
    assert!(client.has_credential(&token_id));

    client.revoke(&admin, &token_id, &reason);

    assert!(!client.has_credential(&token_id));
    assert_eq!(client.get_revocation_reason(&token_id), Some(reason));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn owner_of_revoked_panics() {
    let env = Env::default();
    let (_, admin, client) = setup(&env);
    let scholar = Address::generate(&env);
    let reason = cid(&env, "Plagiarism");

    let token_id = client.mint(&scholar, &cid(&env, "ipfs://revoked"));
    client.revoke(&admin, &token_id, &reason);

    client.owner_of(&token_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn revoke_non_existent_token_panics() {
    let env = Env::default();
    let (_, admin, client) = setup(&env);
    let reason = cid(&env, "Testing");

    client.revoke(&admin, &999_u64, &reason);
}

#[test]
fn initialize_emits_event() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(ScholarNFT, ());
    env.mock_all_auths();
    let client = ScholarNFTClient::new(&env, &contract_id);

    client.initialize(&admin);

    let events = env.events().all();
    let found = events.iter().any(|(cid, topics, _data)| {
        cid == contract_id && topics.contains(&symbol_short!("init").into_val(&env))
    });
    assert!(found, "initialized event not found");
}

#[test]
fn mint_emits_event() {
    let env = Env::default();
    let (contract_id, _, client) = setup(&env);
    let scholar = Address::generate(&env);
    let uri = cid(&env, "ipfs://mint-event-test");

    let token_id = client.mint(&scholar, &uri);

    let events = env.events().all();
    let found = events.iter().any(|(cid, topics, _data)| {
        cid == contract_id
            && topics.contains(&symbol_short!("minted").into_val(&env))
            && topics.contains(&token_id.into_val(&env))
    });
    assert!(found, "mint event not found");
}

#[test]
fn transfer_panics_with_soulbound_error() {
    let env = Env::default();
    let (_, _, client) = setup(&env);
    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let token_id = 1_u64;

    let result = client.try_transfer(&from, &to, &token_id);

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            ScholarNFTError::Soulbound as u32
        )))
    );
}

#[test]
#[ignore]
fn transfer_attempt_emits_event() {
    let env = Env::default();
    let (contract_id, _, client) = setup(&env);
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let token_id = client.mint(&from, &cid(&env, "ipfs://transfer-attempt-test"));

    let _ = client.try_transfer(&from, &to, &token_id);

    let events = env.events().all();
    let found = events.iter().any(|(cid, topics, _data)| {
        cid == contract_id
            && topics
                == vec![
                    &env,
                    symbol_short!("xfer_att").into_val(&env),
                ]
    });
    assert!(found, "transfer_attempted event not found");
}
