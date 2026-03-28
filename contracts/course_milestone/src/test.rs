extern crate std;

use soroban_sdk::{
    Address, Env, IntoVal, String, Val, contract, contractimpl, contracttype, symbol_short, vec,
    testutils::{Address as _, Events as _, MockAuth, MockAuthInvoke},
};

use crate::{
    CourseConfig, CourseMilestone, CourseMilestoneClient, DataKey, Error, MilestoneCompleted,
    MilestoneStatus,
};

#[contracttype]
enum MockTokenDataKey {
    Balance(Address),
}

    Address, Env, String, contract, contractimpl,
    testutils::{Address as _, Ledger, LedgerInfo},
};

use crate::{
    CourseConfig, CourseMilestone, CourseMilestoneClient, DataKey, Error, MilestoneStatus,
};

#[contract]
struct MockLearnToken;

#[contractimpl]
impl MockLearnToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        let key = MockTokenDataKey::Balance(to.clone());
        let balance = env.storage().persistent().get(&key).unwrap_or(0_i128);
        env.storage().persistent().set(&key, &(balance + amount));
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&MockTokenDataKey::Balance(account))
            .unwrap_or(0_i128)
    }
}

fn sid(env: &Env, value: &str) -> String {
    String::from_str(env, value)
}

fn authorize<T>(env: &Env, address: &Address, contract: &Address, fn_name: &'static str, args: T)
where
    T: IntoVal<Env, Val>,
{
    env.mock_auths(&[MockAuth {
        address,
        invoke: &MockAuthInvoke {
            contract,
            fn_name,
            args: args.into_val(env),
            sub_invokes: &[],
        },
    }]);
}

fn setup() -> (
    Env,
    Address,
    Address,
    Address,
    CourseMilestoneClient<'static>,
    MockLearnTokenClient<'static>,
) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let learn_token_id = env.register(MockLearnToken, ());
) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let learn_token = env.register(MockLearnToken, ());
    let contract_id = env.register(CourseMilestone, ());

    let client = CourseMilestoneClient::new(&env, &contract_id);
    let token_client = MockLearnTokenClient::new(&env, &learn_token_id);

    authorize(
        &env,
        &admin,
        &contract_id,
        "initialize",
        (admin.clone(), learn_token_id.clone()),
    );
    client.initialize(&admin, &learn_token_id);

    (env, contract_id, admin, learn_token_id, client, token_client)
}

fn add_course(
    env: &Env,
    contract_id: &Address,
    admin: &Address,
    client: &CourseMilestoneClient<'static>,
    course_id: &String,
    milestone_count: u32,
) {
    authorize(
        env,
        admin,
        contract_id,
        "add_course",
        (admin.clone(), course_id.clone(), milestone_count),
    );
    client.add_course(admin, course_id, &milestone_count);
}

fn enroll(
    env: &Env,
    contract_id: &Address,
    learner: &Address,
    client: &CourseMilestoneClient<'static>,
    course_id: &String,
) {
    authorize(
        env,
        learner,
        contract_id,
        "enroll",
        (learner.clone(), course_id.clone()),
    );
    client.enroll(learner, course_id);
}

fn submit_milestone(
    env: &Env,
    contract_id: &Address,
    learner: &Address,
    client: &CourseMilestoneClient<'static>,
    course_id: &String,
    milestone_id: u32,
    evidence_uri: &String,
) {
    authorize(
        env,
        learner,
        contract_id,
        "submit_milestone",
        (learner.clone(), course_id.clone(), milestone_id, evidence_uri.clone()),
    );
    client.submit_milestone(learner, course_id, &milestone_id, evidence_uri);
    client.initialize(&admin, &learn_token);
    (env, contract_id, admin, learn_token, client)
}

#[test]
fn add_course_and_get_course_work() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 4);

    let course = client
        .get_course(&course_id)
        .expect("course should be stored after add");
    assert_eq!(
        course,
        CourseConfig {
            milestone_count: 4,
            active: true,
        }
    );
}

#[test]
fn enrolls_learner() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);

    assert!(client.is_enrolled(&learner, &course_id));
}

#[test]
fn duplicate_enroll_fails() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    client.add_course(&admin, &course_id, &10);
    client.enroll(&learner, &course_id);

    authorize(
        &env,
        &learner,
        &contract_id,
        "enroll",
        (learner.clone(), course_id.clone()),
    );
    let result = client.try_enroll(&learner, &course_id);

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::AlreadyEnrolled as u32
        )))
    );
}

#[test]
fn submit_milestone_stores_pending_submission() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://proof");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);
    submit_milestone(
        &env,
        &contract_id,
        &learner,
        &client,
        &course_id,
        1,
        &evidence_uri,
    );

    assert_eq!(
        client.get_milestone_state(&learner, &course_id, &1),
        MilestoneStatus::Pending
    );
}

// =======================
// ✅ SUBMIT MILESTONE TESTS
// =======================

#[test]
fn enrolled_learner_can_submit_once_and_submission_is_stored() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://bafy-test-proof");

    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    let state = client.get_milestone_state(&learner, &course_id, &1);
    assert_eq!(state, MilestoneStatus::Pending);

    let submission = client
        .get_milestone_submission(&learner, &course_id, &1)
        .expect("submission should exist");
    assert_eq!(submission.evidence_uri, evidence_uri);
}

#[test]
fn verify_milestone_mints_lrn_and_marks_completion() {
    let (env, contract_id, admin, _token_id, client, token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://proof");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);
    submit_milestone(
        &env,
        &contract_id,
        &learner,
        &client,
        &course_id,
        1,
        &evidence_uri,
    );

    authorize(
        &env,
        &admin,
        &contract_id,
        "verify_milestone",
        (admin.clone(), learner.clone(), course_id.clone(), 1_u32, 125_i128),
    );
    client.verify_milestone(&admin, &learner, &course_id, &1, &125);
#[test]
fn duplicate_submission_is_rejected() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://bafy-test-proof");

    client.add_course(&admin, &course_id, &8);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &7, &evidence_uri);

    let result = client.try_submit_milestone(&learner, &course_id, &7, &evidence_uri);

    assert_eq!(
        client.get_milestone_status(&learner, &course_id, &1),
        MilestoneStatus::Approved
    );
    assert!(client.is_completed(&learner, &course_id, &1));
    assert_eq!(token_client.balance(&learner), 125);
}

// =======================
// ✅ VERIFY MILESTONE TESTS
// =======================

#[test]
fn verify_milestone_happy_path() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    client.verify_milestone(&admin, &learner, &course_id, &1, &100);

    let status = client.get_milestone_status(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Approved);
}

#[test]
fn verify_milestone_fails_for_non_admin() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let attacker = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://proof");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);
    submit_milestone(
        &env,
        &contract_id,
        &learner,
        &client,
        &course_id,
        1,
        &evidence_uri,
    );

    authorize(
        &env,
        &attacker,
        &contract_id,
        "verify_milestone",
        (attacker.clone(), learner.clone(), course_id.clone(), 1_u32, 125_i128),
    );
    let result = client.try_verify_milestone(&attacker, &learner, &course_id, &1, &125);
    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::Unauthorized as u32
        )))
    );
}

#[test]
fn reject_milestone_marks_rejected_and_clears_submission() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://proof");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);
    submit_milestone(
        &env,
        &contract_id,
        &learner,
        &client,
        &course_id,
        1,
        &evidence_uri,
    let evidence_uri = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);
    client.verify_milestone(&admin, &learner, &course_id, &1, &100);

    let result = client.try_verify_milestone(&admin, &learner, &course_id, &1, &100);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::InvalidState as u32
        )))
    );

    authorize(
        &env,
        &admin,
        &contract_id,
        "reject_milestone",
        (admin.clone(), learner.clone(), course_id.clone(), 1_u32),
    );
    client.reject_milestone(&admin, &learner, &course_id, &1);

}

// =======================
// ✅ REJECT MILESTONE TESTS
// =======================

#[test]
fn reject_milestone_happy_path() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    client.reject_milestone(&admin, &learner, &course_id, &1);

    let status = client.get_milestone_status(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Rejected);

    // Submission should be removed
    let submission = client.get_milestone_submission(&learner, &course_id, &1);
    assert!(submission.is_none());
}

#[test]
fn reject_milestone_fails_for_non_admin() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence_uri = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    let result = client.try_reject_milestone(&non_admin, &learner, &course_id, &1);
    assert_eq!(
        client.get_milestone_status(&learner, &course_id, &1),
        MilestoneStatus::Rejected
    );
    assert!(client.get_milestone_submission(&learner, &course_id, &1).is_none());
}

#[test]
fn set_milestone_reward_stores_config() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    client.add_course(&admin, &course_id, &5);
    client.enroll(&learner, &course_id);

    authorize(
        &env,
        &admin,
        &contract_id,
        "set_milestone_reward",
        (course_id.clone(), 1_u32, 75_i128),
    );
    client.set_milestone_reward(&course_id, &1, &75);

    let stored_reward = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get::<_, i128>(&DataKey::MilestoneLrn(course_id.clone(), 1))
            .unwrap_or(0)
    });
}

// =======================
// ✅ GET MILESTONE STATUS TESTS
// =======================

#[test]
fn get_milestone_status_returns_not_started_by_default() {
    let (env, _contract_id, _admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    let status = client.get_milestone_state(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::NotStarted);
}

#[test]
fn get_milestone_status_returns_pending_after_submission() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &4);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);

    let status = client.get_milestone_state(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Pending);
}

#[test]
fn get_milestone_status_returns_approved_after_verification() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &4);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);
    client.verify_milestone(&admin, &learner, &course_id, &1, &100);

    let status = client.get_milestone_status(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Approved);
}

#[test]
fn get_milestone_status_returns_rejected_after_rejection() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &4);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);
    client.reject_milestone(&admin, &learner, &course_id, &1);

    let status = client.get_milestone_status(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Rejected);
}

#[test]
fn get_milestone_status_not_started_for_unsubmitted_milestone() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &4);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);

    assert_eq!(stored_reward, 75);
}

#[test]
fn complete_milestone_marks_completion_and_emits_reward_event() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);

    authorize(
        &env,
        &admin,
        &contract_id,
        "set_milestone_reward",
        (course_id.clone(), 2_u32, 75_i128),
    );
    client.set_milestone_reward(&course_id, &2, &75);

    authorize(
        &env,
        &admin,
        &contract_id,
        "complete_milestone",
        (learner.clone(), course_id.clone(), 2_u32),
    let evidence_uri = sid(&env, "ipfs://bafy-proof");

    client.add_course(&admin, &course_id, &4);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence_uri);

    // This would require a mock learn token contract for full testing
    // For now, we just verify the function call succeeds
    client.verify_milestone(&admin, &learner, &course_id, &1, &100);

    let status = client.get_milestone_status(&learner, &course_id, &1);
    assert_eq!(status, MilestoneStatus::Approved);
}

// =======================
// ✅ ENROLLED COURSES TESTS
// =======================

#[test]
fn get_enrolled_courses_returns_empty_for_new_learner() {
    let (env, _contract_id, _admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);

    let courses = client.get_enrolled_courses(&learner);
    assert_eq!(courses.len(), 0);
}

#[test]
fn get_enrolled_courses_returns_enrolled_courses() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);

    client.add_course(&admin, &sid(&env, "rust-101"), &3);
    client.add_course(&admin, &sid(&env, "defi-201"), &6);
    client.enroll(&learner, &sid(&env, "rust-101"));
    client.enroll(&learner, &sid(&env, "defi-201"));

    let courses = client.get_enrolled_courses(&learner);
    assert_eq!(courses.len(), 2);
    assert_eq!(courses.get(0).unwrap(), sid(&env, "rust-101"));
    assert_eq!(courses.get(1).unwrap(), sid(&env, "defi-201"));
}

#[test]
fn get_enrolled_courses_is_per_learner() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner_a = Address::generate(&env);
    let learner_b = Address::generate(&env);

    client.add_course(&admin, &sid(&env, "rust-101"), &3);
    client.add_course(&admin, &sid(&env, "defi-201"), &6);
    client.enroll(&learner_a, &sid(&env, "rust-101"));
    client.enroll(&learner_a, &sid(&env, "defi-201"));
    client.enroll(&learner_b, &sid(&env, "rust-101"));

    assert_eq!(client.get_enrolled_courses(&learner_a).len(), 2);
    assert_eq!(client.get_enrolled_courses(&learner_b).len(), 1);
}

// =======================
// ✅ VERSION TESTS
// =======================

#[test]
fn get_version_returns_semver() {
    let (env, _contract_id, _admin, _learn_token_address, client) = setup();
    assert_eq!(client.get_version(), String::from_str(&env, "1.0.0"));
}

#[test]
fn add_course_and_get_course_work() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let course_id = sid(&env, "soroban-101");

    client.add_course(&admin, &course_id, &12);

    let course = client
        .get_course(&course_id)
        .expect("course should be stored after add");
    assert_eq!(
        course,
        CourseConfig {
            milestone_count: 12,
            active: true,
        }
    );
}

#[test]
fn list_courses_returns_empty_when_none_exist() {
    let (_env, _contract_id, _admin, _learn_token_address, client) = setup();
    assert_eq!(client.list_courses().len(), 0);
}

#[test]
fn list_courses_returns_only_active_courses() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let course_a = sid(&env, "rust-101");
    let course_b = sid(&env, "defi-201");

    client.add_course(&admin, &course_a, &5);
    client.add_course(&admin, &course_b, &7);
    client.remove_course(&admin, &course_b);

    let courses = client.list_courses();
    assert_eq!(courses.len(), 1);
    assert_eq!(courses.get(0).unwrap(), course_a);
}

#[test]
fn remove_course_marks_course_inactive() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let course_id = sid(&env, "rust-101");
    let learner = Address::generate(&env);

    client.add_course(&admin, &course_id, &4);
    client.remove_course(&admin, &course_id);

    let stored = client
        .get_course(&course_id)
        .expect("course should remain stored");
    assert_eq!(stored.active, false);

    let result = client.try_enroll(&learner, &course_id);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::CourseNotFound as u32
        )))
    );
    client.complete_milestone(&learner, &course_id, &2);

    assert!(client.is_completed(&learner, &course_id, &2));
    assert_eq!(
        client.get_milestone_status(&learner, &course_id, &2),
        MilestoneStatus::Approved
    );

    let events = env.events().all();
    let found = events.iter().any(|(event_contract_id, topics, data)| {
        *event_contract_id == contract_id
            && *topics == vec![&env, symbol_short!("ms_done").into_val(&env)]
            && *data
                == MilestoneCompleted {
                    learner: learner.clone(),
                    course_id: course_id.clone(),
                    milestone_id: 2,
                    lrn_reward: 75,
                }
                .into_val(&env)
    });

    assert!(found, "completion event with reward was not emitted");
}

#[test]
fn complete_milestone_fails_when_already_completed() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://proof");

    client.add_course(&admin, &course_id, &1);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);
    client.pause(&admin);

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);

    authorize(
        &env,
        &admin,
        &contract_id,
        "complete_milestone",
        (learner.clone(), course_id.clone(), 1_u32),
    );
    client.complete_milestone(&learner, &course_id, &1);

    authorize(
        &env,
        &admin,
        &contract_id,
        "complete_milestone",
        (learner.clone(), course_id.clone(), 1_u32),
    );
    let result = client.try_complete_milestone(&learner, &course_id, &1);
}

#[test]
fn pause_blocks_reject_milestone() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    let evidence = sid(&env, "ipfs://proof");

    client.add_course(&admin, &course_id, &1);
    client.enroll(&learner, &course_id);
    client.submit_milestone(&learner, &course_id, &1, &evidence);
    client.pause(&admin);

    let result = client.try_reject_milestone(&admin, &learner, &course_id, &1);

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::AlreadyCompleted as u32
        )))
    );
}

#[test]
fn complete_milestone_fails_for_non_enrolled_learner() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);

    authorize(
        &env,
        &admin,
        &contract_id,
        "complete_milestone",
        (learner.clone(), course_id.clone(), 1_u32),
    client.enroll(&learner, &course_id);

    assert!(client.is_enrolled(&learner, &course_id));
}

#[test]
fn non_admin_cannot_add_course() {
    let (env, _contract_id, _admin, _learn_token_address, client) = setup();
    let attacker = Address::generate(&env);
    let result = client.try_add_course(&attacker, &sid(&env, "rust-101"), &3);

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::Unauthorized as u32
        )))
    );
    let result = client.try_complete_milestone(&learner, &course_id, &1);

#[test]
fn non_admin_cannot_remove_course() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let attacker = Address::generate(&env);
    let course_id = sid(&env, "rust-101");
    client.add_course(&admin, &course_id, &3);

    let result = client.try_remove_course(&attacker, &course_id);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::NotEnrolled as u32
        )))
    );
}

#[test]
fn complete_milestone_fails_without_admin_auth() {
    let (env, contract_id, admin, _token_id, client, _token_client) = setup();
    let learner = Address::generate(&env);
    let attacker = Address::generate(&env);
fn enroll_rejects_unknown_course() {
    let (env, _contract_id, _admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let result = client.try_enroll(&learner, &sid(&env, "missing"));

    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::CourseNotFound as u32
        )))
    );
}

#[test]
fn duplicate_course_id_is_rejected() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let course_id = sid(&env, "rust-101");

    add_course(&env, &contract_id, &admin, &client, &course_id, 3);
    enroll(&env, &contract_id, &learner, &client, &course_id);
    let result = client.try_add_course(&admin, &course_id, &3);
    assert_eq!(
        result.err(),
        Some(Ok(soroban_sdk::Error::from_contract_error(
            Error::CourseAlreadyExists as u32
        )))
    );
}

#[test]
fn zero_milestone_count_is_rejected() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    let result = client.try_add_course(&admin, &sid(&env, "rust-101"), &0);

    authorize(
        &env,
        &attacker,
        &contract_id,
        "complete_milestone",
        (learner.clone(), course_id.clone(), 1_u32),
    );
    let result = client.try_complete_milestone(&learner, &course_id, &1);
}

#[test]
fn multiple_courses_are_stored() {
    let (env, _contract_id, admin, _learn_token_address, client) = setup();
    client.add_course(&admin, &sid(&env, "rust-101"), &3);
    client.add_course(&admin, &sid(&env, "defi-201"), &5);
    client.add_course(&admin, &sid(&env, "soroban-301"), &8);

    assert_eq!(client.list_courses().len(), 3);
}

#[test]
fn progress_persists_beyond_instance_ttl_window() {
    let (env, contract_id, admin, _learn_token_address, client) = setup();
    let learner = Address::generate(&env);
    let course_id = sid(&env, "rust-101");

    set_ledger_sequence(&env, 1);
    client.add_course(&admin, &course_id, &3);
    client.enroll(&learner, &course_id);

    set_ledger_sequence(&env, 400);

    let enrollment_key = DataKey::Enrollment(learner, course_id);
    let still_present = env.as_contract(&contract_id, || {
        env.storage()
            .persistent()
            .get::<_, bool>(&enrollment_key)
            .unwrap_or(false)
    });

    assert!(result.is_err());
}
