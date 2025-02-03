-- Step 1: Enable RLS on all tables
alter table public.expenses enable row level security;
alter table public.expense_items enable row level security;
alter table public.settlements enable row level security;
alter table public.expense_shares enable row level security;
alter table public.member_balances enable row level security;

-- Step 2: Create RLS policies
create policy "Users can view expenses from their household"
    on public.expenses for select
    using (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can create expenses for their household"
    on public.expenses for insert
    with check (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can update expenses from their household"
    on public.expenses for update
    using (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can delete their own expenses"
    on public.expenses for delete
    using (created_by = auth.uid());

create policy "Users can view expense items from their household"
    on public.expense_items for select
    using (
        expense_id in (
            select id from public.expenses
            where household_id in (
                select household_id 
                from public.household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can manage expense items from their household"
    on public.expense_items for all
    using (
        expense_id in (
            select id from public.expenses
            where household_id in (
                select household_id 
                from public.household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can view settlements from their household"
    on public.settlements for select
    using (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can create settlements for their household"
    on public.settlements for insert
    with check (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    );

create policy "Users can view expense shares from their household"
    on public.expense_shares for select
    using (
        expense_id in (
            select id from public.expenses
            where household_id in (
                select household_id 
                from public.household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can create expense shares for their household"
    on public.expense_shares for insert
    with check (
        expense_id in (
            select id from public.expenses
            where household_id in (
                select household_id 
                from public.household_members 
                where user_id = auth.uid()
            )
        )
    );

create policy "Users can view balances from their household"
    on public.member_balances for select
    using (
        household_id in (
            select household_id 
            from public.household_members 
            where user_id = auth.uid()
        )
    ); 