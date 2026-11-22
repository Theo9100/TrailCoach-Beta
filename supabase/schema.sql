-- TrailCoach : sauvegarde en ligne des données de chaque coureur.
-- À coller une seule fois dans Supabase → SQL Editor → New query → Run.

-- Une ligne par bloc de données (profil, séances validées, sorties…) et par utilisateur.
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) <= 64),
  data       jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Accès à la table pour les utilisateurs connectés (les nouveaux projets Supabase ne le donnent plus
-- automatiquement). Ce que chacun peut voir est ensuite limité par les règles ci-dessous.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.user_data to authenticated;
revoke all on table public.user_data from anon;

-- Chacun ne peut lire et modifier que ses propres données.
alter table public.user_data enable row level security;

drop policy if exists "Lire ses données" on public.user_data;
create policy "Lire ses données" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Ajouter ses données" on public.user_data;
create policy "Ajouter ses données" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Modifier ses données" on public.user_data;
create policy "Modifier ses données" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Supprimer ses données" on public.user_data;
create policy "Supprimer ses données" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Suppression du compte par l'utilisateur lui-même (ses données partent avec, grâce au « on delete cascade »).
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
