#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Env, String};

fn create_token(e: &Env, admin: &Address) -> Address {
    let stellar_token = stellar_token::AdvancedTokenClient::new(
        e,
        &e.register_contract(None, stellar_token::AdvancedToken),
    );
    stellar_token.initialize(
        admin,
        &String::from_str(e, "EscrowToken"),
        &String::from_str(e, "ESC"),
    );
    stellar_token.contract_id.clone()
}

fn create_escrow(
    e: &Env,
    fee_collector: &Address,
    token_contract: &Address,
) -> (Address, EscrowClient) {
    let escrow_id = e.register_contract(None, Escrow);
    let escrow_client = EscrowClient::new(e, &escrow_id);
    escrow_client.initialize(fee_collector, &25u32, token_contract);
    (escrow_id, escrow_client)
}

fn mint_tokens(e: &Env, token_id: &Address, to: &Address, amount: i128) {
    let token = stellar_token::AdvancedTokenClient::new(e, token_id);
    token.mint(to, &amount);
}

fn approve_tokens(e: &Env, token_id: &Address, owner: &Address, spender: &Address, amount: i128) {
    let token = stellar_token::AdvancedTokenClient::new(e, token_id);
    token.approve(owner, spender, &amount, &100000);
}

#[test]
fn test_create_deal() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let fee_collector = Address::generate(&e);

    let token_id = create_token(&e, &admin);
    let (_, escrow_client) = create_escrow(&e, &fee_collector, &token_id);

    mint_tokens(&e, &token_id, &seller, 1000);

    let deal_id = escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &100,
        &500,
        &(e.ledger().timestamp() + 10000),
    );

    assert_eq!(deal_id, 1);

    let deal = escrow_client.get_deal(&deal_id);
    assert_eq!(deal.seller, seller);
    assert_eq!(deal.buyer, buyer);
    assert_eq!(deal.token_amount, 100);
    assert_eq!(deal.price, 500);
    assert_eq!(deal.state, DealState::Pending);
}

#[test]
fn test_fund_and_release_deal() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let fee_collector = Address::generate(&e);

    let token_id = create_token(&e, &admin);
    let (escrow_id, escrow_client) = create_escrow(&e, &fee_collector, &token_id);

    mint_tokens(&e, &token_id, &seller, 1000);
    mint_tokens(&e, &token_id, &buyer, 5000);

    let deal_id = escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &100,
        &500,
        &(e.ledger().timestamp() + 10000),
    );

    approve_tokens(&e, &token_id, &seller, &escrow_id, 100);
    approve_tokens(&e, &token_id, &buyer, &escrow_id, 500);

    escrow_client.fund_deal(&deal_id, &buyer);

    let deal = escrow_client.get_deal(&deal_id);
    assert_eq!(deal.state, DealState::Funded);

    let token = stellar_token::AdvancedTokenClient::new(&e, &token_id);
    let escrow_token_balance = token.balance(&escrow_id);
    assert_eq!(escrow_token_balance, 100);

    escrow_client.release_deal(&deal_id, &seller);

    let deal = escrow_client.get_deal(&deal_id);
    assert_eq!(deal.state, DealState::Released);

    let fee = (500 * 25) / 10000;
    let seller_payout = 500 - fee;

    assert_eq!(token.balance(&seller), 1000 - 100 + seller_payout);
    assert_eq!(token.balance(&buyer), 5000 - 500 + 100);
    assert_eq!(token.balance(&fee_collector), fee);
}

#[test]
fn test_cancel_pending_deal() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let fee_collector = Address::generate(&e);

    let token_id = create_token(&e, &admin);
    let (_, escrow_client) = create_escrow(&e, &fee_collector, &token_id);

    mint_tokens(&e, &token_id, &seller, 1000);

    let deal_id = escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &100,
        &500,
        &(e.ledger().timestamp() + 10000),
    );

    escrow_client.cancel_deal(&deal_id, &seller);

    let deal = escrow_client.get_deal(&deal_id);
    assert_eq!(deal.state, DealState::Cancelled);
}

#[test]
fn test_dispute_deal() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let fee_collector = Address::generate(&e);

    let token_id = create_token(&e, &admin);
    let (escrow_id, escrow_client) = create_escrow(&e, &fee_collector, &token_id);

    mint_tokens(&e, &token_id, &seller, 1000);
    mint_tokens(&e, &token_id, &buyer, 5000);

    let deal_id = escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &100,
        &500,
        &(e.ledger().timestamp() + 10000),
    );

    approve_tokens(&e, &token_id, &seller, &escrow_id, 100);
    approve_tokens(&e, &token_id, &buyer, &escrow_id, 500);
    escrow_client.fund_deal(&deal_id, &buyer);

    escrow_client.dispute_deal(&deal_id, &buyer);

    let deal = escrow_client.get_deal(&deal_id);
    assert_eq!(deal.state, DealState::Disputed);
}

#[test]
fn test_multiple_deals_per_user() {
    let e = Env::default();
    let admin = Address::generate(&e);
    let seller = Address::generate(&e);
    let buyer = Address::generate(&e);
    let fee_collector = Address::generate(&e);

    let token_id = create_token(&e, &admin);
    let (_, escrow_client) = create_escrow(&e, &fee_collector, &token_id);

    mint_tokens(&e, &token_id, &seller, 2000);

    escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &100,
        &500,
        &(e.ledger().timestamp() + 10000),
    );

    escrow_client.create_deal(
        &seller,
        &buyer,
        &token_id,
        &200,
        &1000,
        &(e.ledger().timestamp() + 10000),
    );

    let seller_deals = escrow_client.get_user_deals(&seller);
    assert_eq!(seller_deals.len(), 2);

    let buyer_deals = escrow_client.get_user_deals(&buyer);
    assert_eq!(buyer_deals.len(), 2);
}
