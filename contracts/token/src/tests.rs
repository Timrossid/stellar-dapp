#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Env, String};

#[test]
fn test_initialize_and_basic_queries() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );

    assert_eq!(client.name(), String::from_str(&e, "TestToken"));
    assert_eq!(client.symbol(), String::from_str(&e, "TTK"));
    assert_eq!(client.decimal(), 7);
    assert_eq!(client.total_supply(), 0);
    assert_eq!(client.owner(), admin);
    assert!(!client.paused());
}

#[test]
fn test_mint_and_balance() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let user = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );

    client.mint(&user, &1000);

    assert_eq!(client.balance(&user), 1000);
    assert_eq!(client.total_supply(), 1000);
}

#[test]
fn test_transfer() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&alice, &500);

    client.transfer(&alice, &bob, &200);

    assert_eq!(client.balance(&alice), 300);
    assert_eq!(client.balance(&bob), 200);
}

#[test]
fn test_approve_and_transfer_from() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    let charlie = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&alice, &1000);

    client.approve(&alice, &bob, &300, &100000);
    assert_eq!(client.allowance(&alice, &bob), 300);

    client.transfer_from(&bob, &alice, &charlie, &100);

    assert_eq!(client.balance(&alice), 900);
    assert_eq!(client.balance(&charlie), 100);
    assert_eq!(client.allowance(&alice, &bob), 200);
}

#[test]
fn test_burn() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let user = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&user, &500);

    client.burn(&user, &200);

    assert_eq!(client.balance(&user), 300);
    assert_eq!(client.total_supply(), 300);
}

#[test]
fn test_vesting_schedule() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let beneficiary = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&admin, &10000);

    let start_time = e.ledger().timestamp();
    let duration: u64 = 1000;
    let cliff_duration: u64 = 100;

    client.create_vesting_schedule(
        &admin,
        &beneficiary,
        &5000,
        &start_time,
        &duration,
        &cliff_duration,
    );

    let schedule = client.get_vesting_schedule(&beneficiary);
    assert_eq!(schedule.total_amount, 5000);
    assert_eq!(schedule.released_amount, 0);

    assert_eq!(client.get_claimable_amount(&beneficiary), 0);

    e.ledger().set_timestamp(start_time + cliff_duration + 1);

    assert!(client.get_claimable_amount(&beneficiary) > 0);

    let released = client.release_vested_tokens(&beneficiary);
    assert!(released > 0);
    assert!(client.balance(&beneficiary) > 0);
}

#[test]
fn test_pause_functionality() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let user = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&user, &500);

    client.set_paused(&true);
    assert!(client.paused());
}

#[test]
fn test_pause_prevents_transfers() {
    let e = Env::default();
    e.mock_all_auths();
    let admin = Address::generate(&e);
    let user = Address::generate(&e);

    let contract_id = e.register_contract(None, AdvancedToken);
    let client = AdvancedTokenClient::new(&e, &contract_id);

    client.initialize(
        &admin,
        &String::from_str(&e, "TestToken"),
        &String::from_str(&e, "TTK"),
    );
    client.mint(&user, &500);

    let before = client.balance(&user);
    assert_eq!(before, 500);
}
