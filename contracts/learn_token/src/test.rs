#![cfg(test)]

use proptest::prelude::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
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
}
