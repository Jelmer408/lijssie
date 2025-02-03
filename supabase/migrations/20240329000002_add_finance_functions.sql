-- Step 1: Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Step 2: Create function to update balances when an expense is added
create or replace function update_member_balances_on_expense()
returns trigger as $$
declare
    v_household_id uuid;
    v_share record;
    v_total_amount decimal(10,2);
    v_share_amount decimal(10,2);
    v_paid_by uuid;
begin
    -- Get household_id and paid_by from expense
    select household_id, paid_by into v_household_id, v_paid_by 
    from expenses where id = new.expense_id;
    
    -- Get total amount paid
    select amount into v_total_amount from expenses where id = new.expense_id;
    
    -- For each share, update the balances
    for v_share in 
        select user_id, amount 
        from expense_shares 
        where expense_id = new.expense_id
    loop
        -- If user owes money (their share)
        if v_share.user_id != v_paid_by then
            -- Insert or update balance: user owes money to paid_by
            insert into member_balances (household_id, from_user_id, to_user_id, balance)
            values (v_household_id, v_share.user_id, v_paid_by, v_share.amount)
            on conflict (household_id, from_user_id, to_user_id)
            do update set 
                balance = member_balances.balance + v_share.amount,
                updated_at = now();
                
            -- Also update the reverse balance to maintain symmetry
            insert into member_balances (household_id, from_user_id, to_user_id, balance)
            values (v_household_id, v_paid_by, v_share.user_id, -v_share.amount)
            on conflict (household_id, from_user_id, to_user_id)
            do update set 
                balance = member_balances.balance - v_share.amount,
                updated_at = now();
        end if;
    end loop;
    
    return new;
end;
$$ language plpgsql;

-- Step 3: Create triggers
create trigger update_expenses_updated_at
    before update on public.expenses
    for each row
    execute function update_updated_at_column();

create trigger update_balances_after_expense_share
    after insert on public.expense_shares
    for each row
    execute function update_member_balances_on_expense(); 