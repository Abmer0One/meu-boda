-- Drop old all-in-one policies
drop policy if exists "Users can CRUD own events" on public.events;
drop policy if exists "Users can CRUD tables of own events" on public.tables;
drop policy if exists "Users can CRUD guests of own events" on public.guests;
drop policy if exists "Users can CRUD checkins of own events" on public.checkins;
drop policy if exists "Users can CRUD tasks of own events" on public.tasks;
drop policy if exists "Users can CRUD budgets of own events" on public.budgets;
drop policy if exists "Users can CRUD vendors of own events" on public.vendors;
drop policy if exists "Users can CRUD documents of own events" on public.documents;

-- Re-establish Events policies
create policy "Allow auth select own events" on public.events
    for select to authenticated using (auth.uid() = user_id);

create policy "Allow auth insert own events" on public.events
    for insert to authenticated with check (auth.uid() = user_id);

create policy "Allow auth update own events" on public.events
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Allow auth delete own events" on public.events
    for delete to authenticated using (auth.uid() = user_id);

-- Re-establish Tables policies
create policy "Allow auth select tables" on public.tables
    for select to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert tables" on public.tables
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update tables" on public.tables
    for update to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete tables" on public.tables
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = tables.event_id and events.user_id = auth.uid())
    );

-- Re-establish Guests policies
create policy "Allow auth select guests" on public.guests
    for select using (true); -- Public select permitted for RSVP tokens

create policy "Allow auth insert guests" on public.guests
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid())
    );

create policy "Allow update guests" on public.guests
    for update using (true); -- Public update permitted for RSVP confirmations

create policy "Allow auth delete guests" on public.guests
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = guests.event_id and events.user_id = auth.uid())
    );

-- Re-establish Check-ins policies
create policy "Allow auth select checkins" on public.checkins
    for select to authenticated using (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

create policy "Allow auth insert checkins" on public.checkins
    for insert to authenticated with check (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

create policy "Allow auth delete checkins" on public.checkins
    for delete to authenticated using (
        exists (
            select 1 from public.guests
            join public.events on events.id = guests.event_id
            where guests.id = checkins.guest_id and events.user_id = auth.uid()
        )
    );

-- Re-establish Tasks policies
create policy "Allow auth select tasks" on public.tasks
    for select to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert tasks" on public.tasks
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update tasks" on public.tasks
    for update to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete tasks" on public.tasks
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = tasks.event_id and events.user_id = auth.uid())
    );

-- Re-establish Budgets policies
create policy "Allow auth select budgets" on public.budgets
    for select to authenticated using (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert budgets" on public.budgets
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update budgets" on public.budgets
    for update to authenticated using (
        exists (select 1 from public.events where events.id = budgets.event_id and events.user_id = auth.uid())
    );

-- Re-establish Vendors policies
create policy "Allow auth select vendors" on public.vendors
    for select to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert vendors" on public.vendors
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth update vendors" on public.vendors
    for update to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete vendors" on public.vendors
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = vendors.event_id and events.user_id = auth.uid())
    );

-- Re-establish Documents policies
create policy "Allow auth select docs" on public.documents
    for select to authenticated using (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth insert docs" on public.documents
    for insert to authenticated with check (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );

create policy "Allow auth delete docs" on public.documents
    for delete to authenticated using (
        exists (select 1 from public.events where events.id = documents.event_id and events.user_id = auth.uid())
    );
