#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, Address, Env, String, Symbol,
    symbol_short,
};

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct VestingSchedule {
    pub beneficiary: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub start_time: u64,
    pub duration: u64,
    pub cliff_duration: u64,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum DataKey {
    Balance(Address),
    Allowance(Address, Address),
    Vesting(Address),
    TotalSupply,
    Name,
    Symbol,
    Decimal,
    Owner,
    Paused,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

const EVENT_MINT: Symbol = symbol_short!("mint");
const EVENT_BURN: Symbol = symbol_short!("burn");
const EVENT_TRANSFER: Symbol = symbol_short!("xfer");
const EVENT_APPROVE: Symbol = symbol_short!("appr");
const EVENT_VESTING_CREATED: Symbol = symbol_short!("vest_c");
const EVENT_VESTING_RELEASED: Symbol = symbol_short!("vest_r");
const EVENT_PAUSED: Symbol = symbol_short!("pause");
const EVENT_UNPAUSED: Symbol = symbol_short!("unpause");

fn check_not_paused(e: &Env) {
    if e.storage().instance().has(&DataKey::Paused) {
        if e.storage().instance().get(&DataKey::Paused).unwrap_or(false) {
            panic!("contract is paused");
        }
    }
}

fn only_owner(e: &Env) {
    let owner: Address = e.storage().instance().get(&DataKey::Owner).unwrap();
    owner.require_auth();
}

#[contract]
pub struct AdvancedToken;

#[contractimpl]
impl AdvancedToken {
    pub fn initialize(e: Env, admin: Address, name: String, symbol: String) {
        if e.storage().instance().has(&DataKey::Owner) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Owner, &admin);
        e.storage().instance().set(&DataKey::Name, &name);
        e.storage().instance().set(&DataKey::Symbol, &symbol);
        e.storage().instance().set(&DataKey::Decimal, &7u32);
        e.storage().instance().set(&DataKey::TotalSupply, &0i128);
        e.storage().instance().set(&DataKey::Paused, &false);

        log!(&e, "Token initialized: {}", symbol);
    }

    pub fn name(e: Env) -> String {
        e.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(e: Env) -> String {
        e.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    pub fn decimal(e: Env) -> u32 {
        e.storage().instance().get(&DataKey::Decimal).unwrap()
    }

    pub fn total_supply(e: Env) -> i128 {
        e.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage().instance().get(&DataKey::Balance(id)).unwrap_or(0)
    }

    pub fn owner(e: Env) -> Address {
        e.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn paused(e: Env) -> bool {
        e.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    pub fn set_paused(e: Env, paused: bool) {
        only_owner(&e);
        check_not_paused(&e);

        if paused {
            e.storage().instance().set(&DataKey::Paused, &true);
            e.events().publish((EVENT_PAUSED,), ());
        } else {
            e.storage().instance().set(&DataKey::Paused, &false);
            e.events().publish((EVENT_UNPAUSED,), ());
        }
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        only_owner(&e);
        check_not_paused(&e);

        if amount <= 0 {
            panic!("amount must be positive");
        }

        to.require_auth();

        let mut balance = e.storage().instance().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        balance += amount;
        e.storage().instance().set(&DataKey::Balance(to.clone()), &balance);

        let mut supply = e.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        supply += amount;
        e.storage().instance().set(&DataKey::TotalSupply, &supply);

        e.events().publish((EVENT_MINT, to.clone(), amount), ());
        log!(&e, "Minted {} tokens to {}", amount, to);
    }

    pub fn burn(e: Env, from: Address, amount: i128) {
        check_not_paused(&e);
        from.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut balance = e.storage().instance().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if balance < amount {
            panic!("insufficient balance");
        }
        balance -= amount;
        e.storage().instance().set(&DataKey::Balance(from.clone()), &balance);

        let mut supply = e.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        supply -= amount;
        e.storage().instance().set(&DataKey::TotalSupply, &supply);

        e.events().publish((EVENT_BURN, from.clone(), amount), ());
        log!(&e, "Burned {} tokens from {}", amount, from);
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        check_not_paused(&e);
        from.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut from_balance = e.storage().instance().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        from_balance -= amount;
        e.storage().instance().set(&DataKey::Balance(from.clone()), &from_balance);

        let mut to_balance = e.storage().instance().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        to_balance += amount;
        e.storage().instance().set(&DataKey::Balance(to.clone()), &to_balance);

        e.events().publish((EVENT_TRANSFER, from.clone(), to.clone(), amount), ());
        log!(&e, "Transferred {} from {} to {}", amount, from, to);
    }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        check_not_paused(&e);
        from.require_auth();

        if amount < 0 {
            panic!("amount must be non-negative");
        }

        let allowance = AllowanceValue {
            amount,
            expiration_ledger,
        };
        e.storage().instance().set(&DataKey::Allowance(from.clone(), spender.clone()), &allowance);

        e.events().publish((EVENT_APPROVE, from.clone(), spender.clone(), amount), ());
        log!(&e, "Approved {} for spender {} by {}", amount, spender, from);
    }

    pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        let allowance: AllowanceValue = e.storage().instance()
            .get(&DataKey::Allowance(from, spender.clone()))
            .unwrap_or(AllowanceValue { amount: 0, expiration_ledger: 0 });

        if allowance.expiration_ledger > 0 && allowance.expiration_ledger < e.ledger().sequence() {
            return 0;
        }
        allowance.amount
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        check_not_paused(&e);
        spender.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let mut allowed = e.storage().instance()
            .get(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(AllowanceValue { amount: 0, expiration_ledger: 0 });

        if allowed.expiration_ledger > 0 && allowed.expiration_ledger < e.ledger().sequence() {
            panic!("allowance expired");
        }

        if allowed.amount < amount {
            panic!("insufficient allowance");
        }

        allowed.amount -= amount;
        e.storage().instance().set(&DataKey::Allowance(from.clone(), spender.clone()), &allowed);

        let mut from_balance = e.storage().instance().get(&DataKey::Balance(from.clone())).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        from_balance -= amount;
        e.storage().instance().set(&DataKey::Balance(from.clone()), &from_balance);

        let mut to_balance = e.storage().instance().get(&DataKey::Balance(to.clone())).unwrap_or(0);
        to_balance += amount;
        e.storage().instance().set(&DataKey::Balance(to.clone()), &to_balance);

        e.events().publish((EVENT_TRANSFER, from.clone(), to.clone(), amount), ());
        log!(&e, "TransferFrom {} from {} to {} by spender {}", amount, from, to, spender);
    }

    pub fn create_vesting_schedule(
        e: Env,
        admin: Address,
        beneficiary: Address,
        total_amount: i128,
        start_time: u64,
        duration: u64,
        cliff_duration: u64,
    ) {
        admin.require_auth();
        check_not_paused(&e);

        if total_amount <= 0 {
            panic!("total amount must be positive");
        }
        if duration == 0 {
            panic!("duration must be positive");
        }
        if cliff_duration > duration {
            panic!("cliff duration cannot exceed total duration");
        }
        if e.storage().instance().has(&DataKey::Vesting(beneficiary.clone())) {
            panic!("vesting schedule already exists for this beneficiary");
        }

        let mut admin_balance = e.storage().instance()
            .get(&DataKey::Balance(admin.clone()))
            .unwrap_or(0);
        if admin_balance < total_amount {
            panic!("insufficient admin balance for vesting");
        }
        admin_balance -= total_amount;
        e.storage().instance().set(&DataKey::Balance(admin.clone()), &admin_balance);

        let schedule = VestingSchedule {
            beneficiary: beneficiary.clone(),
            total_amount,
            released_amount: 0,
            start_time,
            duration,
            cliff_duration,
        };

        e.storage().instance().set(&DataKey::Vesting(beneficiary.clone()), &schedule);

        e.events().publish((EVENT_VESTING_CREATED, beneficiary.clone(), total_amount, start_time, duration), ());
        log!(&e, "Vesting created for {}: {} tokens over {} seconds", beneficiary, total_amount, duration);
    }

    pub fn release_vested_tokens(e: Env, beneficiary: Address) -> i128 {
        check_not_paused(&e);

        let mut schedule: VestingSchedule = e.storage().instance()
            .get(&DataKey::Vesting(beneficiary.clone()))
            .unwrap_or_else(|| panic!("no vesting schedule found"));

        let current_time = e.ledger().timestamp();

        if current_time < schedule.start_time + schedule.cliff_duration {
            panic!("cliff period not yet passed");
        }

        let elapsed = if current_time >= schedule.start_time + schedule.duration {
            schedule.duration
        } else {
            current_time - schedule.start_time
        };

        let total_releasable = (schedule.total_amount * elapsed as i128) / schedule.duration as i128;
        let available = total_releasable - schedule.released_amount;

        if available <= 0 {
            panic!("no tokens available for release");
        }

        schedule.released_amount += available;
        e.storage().instance().set(&DataKey::Vesting(beneficiary.clone()), &schedule);

        let mut benef_balance = e.storage().instance()
            .get(&DataKey::Balance(beneficiary.clone()))
            .unwrap_or(0);
        benef_balance += available;
        e.storage().instance().set(&DataKey::Balance(beneficiary.clone()), &benef_balance);

        e.events().publish((EVENT_VESTING_RELEASED, beneficiary.clone(), available), ());
        log!(&e, "Released {} vested tokens to {}", available, beneficiary);

        available
    }

    pub fn get_vesting_schedule(e: Env, beneficiary: Address) -> VestingSchedule {
        e.storage().instance()
            .get(&DataKey::Vesting(beneficiary))
            .unwrap_or_else(|| panic!("no vesting schedule found"))
    }

    pub fn get_claimable_amount(e: Env, beneficiary: Address) -> i128 {
        let schedule: VestingSchedule = e.storage().instance()
            .get(&DataKey::Vesting(beneficiary.clone()))
            .unwrap_or_else(|| panic!("no vesting schedule found"));

        let current_time = e.ledger().timestamp();

        if current_time < schedule.start_time + schedule.cliff_duration {
            return 0;
        }

        let elapsed = if current_time >= schedule.start_time + schedule.duration {
            schedule.duration
        } else {
            current_time - schedule.start_time
        };

        let total_releasable = (schedule.total_amount * elapsed as i128) / schedule.duration as i128;
        total_releasable - schedule.released_amount
    }
}

#[cfg(test)]
mod tests;
