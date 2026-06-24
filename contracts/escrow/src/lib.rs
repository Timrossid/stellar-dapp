#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, Address, Env, Symbol,
    symbol_short, Vec,
};

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct Deal {
    pub id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub token_contract: Address,
    pub token_amount: i128,
    pub price: i128,
    pub state: DealState,
    pub created_at: u64,
    pub expires_at: u64,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum DealState {
    Pending,
    Funded,
    Released,
    Cancelled,
    Disputed,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum DataKey {
    Deal(u64),
    DealCount,
    UserDeals(Address),
    EscrowBalance,
    FeeBps,
    FeeCollector,
    TokenContract,
}

const EVENT_DEAL_CREATED: Symbol = symbol_short!("dl_cre8");
const EVENT_DEAL_FUNDED: Symbol = symbol_short!("dl_fund");
const EVENT_DEAL_RELEASED: Symbol = symbol_short!("dl_rel");
const EVENT_DEAL_CANCELLED: Symbol = symbol_short!("dl_can");
const EVENT_DEAL_DISPUTED: Symbol = symbol_short!("dl_disp");

fn get_next_deal_id(e: &Env) -> u64 {
    let count: u64 = e.storage().instance().get(&DataKey::DealCount).unwrap_or(0);
    let new_id = count + 1;
    e.storage().instance().set(&DataKey::DealCount, &new_id);
    new_id
}

fn save_user_deal(e: &Env, user: &Address, deal_id: u64) {
    let mut deals: Vec<u64> = e.storage().instance()
        .get(&DataKey::UserDeals(user.clone()))
        .unwrap_or(Vec::new(e));
    deals.push_back(deal_id);
    e.storage().instance().set(&DataKey::UserDeals(user.clone()), &deals);
}

fn emit_deal_event(e: &Env, topic: Symbol, deal: &Deal, extra: Option<i128>) {
    match extra {
        Some(val) => e.events().publish((topic, deal.id, deal.seller.clone(), deal.buyer.clone(), val), (deal.clone(),)),
        None => e.events().publish((topic, deal.id, deal.seller.clone(), deal.buyer.clone()), (deal.clone(),)),
    };
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    pub fn initialize(e: Env, fee_collector: Address, fee_bps: u32, token_contract: Address) {
        if e.storage().instance().has(&DataKey::FeeCollector) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::FeeCollector, &fee_collector);
        e.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        e.storage().instance().set(&DataKey::TokenContract, &token_contract);
        e.storage().instance().set(&DataKey::DealCount, &0u64);
    }

    pub fn create_deal(
        e: Env,
        seller: Address,
        buyer: Address,
        token_contract: Address,
        token_amount: i128,
        price: i128,
        expires_at: u64,
    ) -> u64 {
        seller.require_auth();

        if token_amount <= 0 || price <= 0 {
            panic!("token amount and price must be positive");
        }
        if expires_at <= e.ledger().timestamp() {
            panic!("expiration must be in the future");
        }

        let deal_id = get_next_deal_id(&e);
        let deal = Deal {
            id: deal_id,
            seller: seller.clone(),
            buyer: buyer.clone(),
            token_contract,
            token_amount,
            price,
            state: DealState::Pending,
            created_at: e.ledger().timestamp(),
            expires_at,
        };

        e.storage().instance().set(&DataKey::Deal(deal_id), &deal);
        save_user_deal(&e, &seller, deal_id);
        save_user_deal(&e, &buyer, deal_id);

        emit_deal_event(&e, EVENT_DEAL_CREATED, &deal, None);
        log!(&e, "Deal {} created: {} selling {} tokens to {}",
            deal_id, seller, token_amount, buyer);

        deal_id
    }

    pub fn fund_deal(e: Env, deal_id: u64, buyer: Address) {
        buyer.require_auth();

        let mut deal: Deal = e.storage().instance()
            .get(&DataKey::Deal(deal_id))
            .unwrap_or_else(|| panic!("deal not found"));

        if deal.state != DealState::Pending {
            panic!("deal is not in pending state");
        }
        if deal.buyer != buyer {
            panic!("only the buyer can fund this deal");
        }
        if e.ledger().timestamp() > deal.expires_at {
            panic!("deal has expired");
        }

        let token_client = crate::token::TokenClient::new(deal.token_contract.clone());
        let contract_addr = e.current_contract_address();

        token_client.transfer_from(&e, &buyer, &buyer, &contract_addr, deal.price);
        token_client.transfer_from(&e, &deal.seller, &deal.seller, &contract_addr, deal.token_amount);

        deal.state = DealState::Funded;
        e.storage().instance().set(&DataKey::Deal(deal_id), &deal);

        emit_deal_event(&e, EVENT_DEAL_FUNDED, &deal, None);
        log!(&e, "Deal {} funded by buyer {}", deal_id, buyer);
    }

    pub fn release_deal(e: Env, deal_id: u64, caller: Address) {
        caller.require_auth();

        let mut deal: Deal = e.storage().instance()
            .get(&DataKey::Deal(deal_id))
            .unwrap_or_else(|| panic!("deal not found"));

        if deal.state != DealState::Funded {
            panic!("deal is not funded");
        }
        if caller != deal.seller && caller != deal.buyer {
            panic!("only seller or buyer can release");
        }

        let token_client = crate::token::TokenClient::new(deal.token_contract.clone());
        let fee_collector: Address = e.storage().instance().get(&DataKey::FeeCollector).unwrap();
        let fee_bps: u32 = e.storage().instance().get(&DataKey::FeeBps).unwrap();
        let contract_addr = e.current_contract_address();

        let fee_amount = (deal.price * fee_bps as i128) / 10000;
        let seller_payout = deal.price - fee_amount;

        if seller_payout > 0 {
            token_client.transfer(&e, &contract_addr, &deal.seller, seller_payout);
        }
        if fee_amount > 0 {
            token_client.transfer(&e, &contract_addr, &fee_collector, fee_amount);
        }

        token_client.transfer(&e, &contract_addr, &deal.buyer, deal.token_amount);

        deal.state = DealState::Released;
        e.storage().instance().set(&DataKey::Deal(deal_id), &deal);

        emit_deal_event(&e, EVENT_DEAL_RELEASED, &deal, Some(seller_payout));
        log!(&e, "Deal {} released. Seller paid {}, fee {}", deal_id, seller_payout, fee_amount);
    }

    pub fn cancel_deal(e: Env, deal_id: u64, caller: Address) {
        caller.require_auth();

        let mut deal: Deal = e.storage().instance()
            .get(&DataKey::Deal(deal_id))
            .unwrap_or_else(|| panic!("deal not found"));

        if caller != deal.seller && caller != deal.buyer {
            panic!("only seller or buyer can cancel");
        }

        let was_funded = deal.state == DealState::Funded;

        match deal.state {
            DealState::Pending => {
                if e.ledger().timestamp() <= deal.expires_at && caller == deal.buyer {
                    panic!("buyer cannot cancel an active pending deal");
                }
                deal.state = DealState::Cancelled;
            }
            DealState::Funded => {
                deal.state = DealState::Cancelled;
            }
            _ => {
                panic!("deal cannot be cancelled in current state");
            }
        }

        if was_funded {
            let token_client = crate::token::TokenClient::new(deal.token_contract.clone());
            let contract_addr = e.current_contract_address();

            token_client.transfer(&e, &contract_addr, &deal.buyer, deal.price);
            token_client.transfer(&e, &contract_addr, &deal.seller, deal.token_amount);
        }

        e.storage().instance().set(&DataKey::Deal(deal_id), &deal);

        emit_deal_event(&e, EVENT_DEAL_CANCELLED, &deal, None);
        log!(&e, "Deal {} cancelled by {}", deal_id, caller);
    }

    pub fn dispute_deal(e: Env, deal_id: u64, caller: Address) {
        caller.require_auth();

        let mut deal: Deal = e.storage().instance()
            .get(&DataKey::Deal(deal_id))
            .unwrap_or_else(|| panic!("deal not found"));

        if deal.state != DealState::Funded {
            panic!("only funded deals can be disputed");
        }
        if caller != deal.seller && caller != deal.buyer {
            panic!("only seller or buyer can dispute");
        }

        deal.state = DealState::Disputed;
        e.storage().instance().set(&DataKey::Deal(deal_id), &deal);

        emit_deal_event(&e, EVENT_DEAL_DISPUTED, &deal, None);
        log!(&e, "Deal {} disputed by {}", deal_id, caller);
    }

    pub fn get_deal(e: Env, deal_id: u64) -> Deal {
        e.storage().instance()
            .get(&DataKey::Deal(deal_id))
            .unwrap_or_else(|| panic!("deal not found"))
    }

    pub fn get_user_deals(e: Env, user: Address) -> Vec<Deal> {
        let deal_ids: Vec<u64> = e.storage().instance()
            .get(&DataKey::UserDeals(user))
            .unwrap_or(Vec::new(&e));

        let mut deals: Vec<Deal> = Vec::new(&e);
        for i in 0..deal_ids.len() {
            if let Some(deal) = e.storage().instance().get::<_, Deal>(&DataKey::Deal(deal_ids.get(i).unwrap())) {
                deals.push_back(deal);
            }
        }
        deals
    }

    pub fn get_deal_count(e: Env) -> u64 {
        e.storage().instance().get(&DataKey::DealCount).unwrap_or(0)
    }

    pub fn get_fee(e: Env) -> u32 {
        e.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
    }

    pub fn get_token_contract(e: Env) -> Address {
        e.storage().instance().get(&DataKey::TokenContract).unwrap()
    }

    pub fn get_escrow_balance(e: Env, token_contract: Address) -> i128 {
        let token_client = crate::token::TokenClient::new(token_contract);
        token_client.balance(&e, &e.current_contract_address())
    }
}

mod token {
    use soroban_sdk::{Address, Env, IntoVal, Symbol};

    fn call_transfer(e: &Env, contract_id: &Address, from: &Address, to: &Address, amount: i128) {
        let args: (Address, Address, i128) = (from.clone(), to.clone(), amount);
        let _: () = e.invoke_contract(
            contract_id,
            &Symbol::new(e, "transfer"),
            args.into_val(e),
        );
    }

    fn call_transfer_from(
        e: &Env,
        contract_id: &Address,
        spender: &Address,
        from: &Address,
        to: &Address,
        amount: i128,
    ) {
        let args: (Address, Address, Address, i128) =
            (spender.clone(), from.clone(), to.clone(), amount);
        let _: () = e.invoke_contract(
            contract_id,
            &Symbol::new(e, "transfer_from"),
            args.into_val(e),
        );
    }

    fn call_balance(e: &Env, contract_id: &Address, id: &Address) -> i128 {
        let args: (Address,) = (id.clone(),);
        e.invoke_contract(
            contract_id,
            &Symbol::new(e, "balance"),
            args.into_val(e),
        )
    }

    pub struct TokenClient {
        pub contract_id: Address,
    }

    impl TokenClient {
        pub fn new(contract_id: Address) -> Self {
            TokenClient { contract_id }
        }

        pub fn balance(&self, e: &Env, id: &Address) -> i128 {
            call_balance(e, &self.contract_id, id)
        }

        pub fn transfer(&self, e: &Env, from: &Address, to: &Address, amount: i128) {
            call_transfer(e, &self.contract_id, from, to, amount)
        }

        pub fn transfer_from(
            &self,
            e: &Env,
            spender: &Address,
            from: &Address,
            to: &Address,
            amount: i128,
        ) {
            call_transfer_from(e, &self.contract_id, spender, from, to, amount)
        }
    }
}

#[cfg(test)]
mod tests;
