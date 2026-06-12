-- ═══════════════════════════════════════════════════════════
-- MYFOOTCV — SCHEMA BDD POSTGRESQL/SUPABASE
-- Version 1.0 — Initial schema with RLS policies
-- ═══════════════════════════════════════════════════════════

-- ─── 1. PROFILES ───────────────────────────────────────────
-- Étend auth.users avec les infos métier + rôle
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  total_earnings_cents int default 0,
  pending_payout_cents int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index profiles_email_idx on public.profiles(email);
create index profiles_role_idx on public.profiles(role);
create index profiles_referral_code_idx on public.profiles(referral_code);

-- ─── 2. CVS ────────────────────────────────────────────────
create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  slug text unique not null,
  type text not null check (type in ('player', 'staff')),
  data jsonb not null default '{}',
  is_published boolean default false,
  is_locked boolean default false,
  view_count int default 0,
  language text default 'fr',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);

create index cvs_user_id_idx on public.cvs(user_id);
create index cvs_slug_idx on public.cvs(slug);
create index cvs_type_idx on public.cvs(type);
create index cvs_published_idx on public.cvs(is_published) where is_published = true;

-- ─── 3. PAYMENTS ───────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  cv_id uuid references public.cvs(id) on delete set null,
  amount_cents int not null,
  currency text default 'usd',
  type text not null check (type in ('edit_unlock', 'pdf_export', 'dna_card', 'subscription')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_payment_id text unique,
  stripe_session_id text,
  promo_code text,
  discount_cents int default 0,
  referrer_id uuid references public.profiles(id),
  commission_cents int default 0,
  created_at timestamptz default now()
);

create index payments_user_id_idx on public.payments(user_id);
create index payments_status_idx on public.payments(status);
create index payments_referrer_idx on public.payments(referrer_id);
create index payments_created_idx on public.payments(created_at desc);

-- ─── 4. PROMO CODES ────────────────────────────────────────
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_percent int not null check (discount_percent between 1 and 100),
  description text,
  max_uses int,
  current_uses int default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index promo_codes_code_idx on public.promo_codes(code) where is_active = true;

-- ─── 5. PROMO REDEMPTIONS ──────────────────────────────────
create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid references public.promo_codes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  payment_id uuid references public.payments(id) on delete set null,
  redeemed_at timestamptz default now(),
  unique(promo_code_id, user_id)
);

-- ─── 6. REFERRALS ──────────────────────────────────────────
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete cascade not null,
  referred_id uuid references public.profiles(id) on delete cascade not null,
  payment_id uuid references public.payments(id) on delete cascade,
  commission_cents int not null default 0,
  commission_percent int default 15,
  status text default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz default now(),
  unique(referrer_id, referred_id, payment_id)
);

create index referrals_referrer_idx on public.referrals(referrer_id);
create index referrals_status_idx on public.referrals(status);

-- ─── 7. AUDIT LOG ──────────────────────────────────────────
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  event_data jsonb default '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index audit_log_user_idx on public.audit_log(user_id);
create index audit_log_type_idx on public.audit_log(event_type);
create index audit_log_created_idx on public.audit_log(created_at desc);

-- ─── 8. FLAGGED CVS (modération) ───────────────────────────
create table public.flagged_cvs (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid references public.cvs(id) on delete cascade not null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  details text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index flagged_cvs_status_idx on public.flagged_cvs(status);

-- ─── 9. CUSTOM CLUBS (ajoutés par users) ───────────────────
create table public.clubs_custom (
  id uuid primary key default gen_random_uuid(),
  added_by uuid references public.profiles(id) on delete set null,
  name text not null,
  country text not null,
  continent text,
  city text,
  founded int,
  logo_url text,
  is_verified boolean default false,
  verified_by uuid references public.profiles(id),
  use_count int default 1,
  created_at timestamptz default now(),
  unique(name, country)
);

create index clubs_custom_name_idx on public.clubs_custom(name);

-- ─── 10. APP SETTINGS ──────────────────────────────────────
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now()
);

-- Settings par défaut
insert into public.app_settings (key, value, description) values
  ('edit_price_cents', '100', 'Prix édition CV (en cents)'),
  ('pdf_export_price_cents', '500', 'Prix export PDF (en cents)'),
  ('referral_commission_percent', '15', 'Commission parrainage (%)'),
  ('maintenance_mode', 'false', 'Mode maintenance'),
  ('available_languages', '["fr","en","es","pt","ar","it","de"]', 'Langues activées');

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════

-- Auto-création profile à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    upper(substr(md5(random()::text), 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger cvs_touch before update on public.cvs
  for each row execute function public.touch_updated_at();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables sensibles
alter table public.profiles enable row level security;
alter table public.cvs enable row level security;
alter table public.payments enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.referrals enable row level security;
alter table public.audit_log enable row level security;
alter table public.flagged_cvs enable row level security;
alter table public.clubs_custom enable row level security;
alter table public.app_settings enable row level security;

-- Helper function : est-ce que l'user actuel est super_admin ?
create or replace function public.is_super_admin()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'));
$$;

-- ─── PROFILES policies ────────────────────────────────────
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id)
  with check (role = (select role from public.profiles where id = auth.uid())); -- empêcher escalade rôle

create policy "Admins can view all profiles"
  on public.profiles for select using (public.is_admin());

create policy "Super admins can update any profile"
  on public.profiles for update using (public.is_super_admin());

-- ─── CVS policies ─────────────────────────────────────────
create policy "Users can view their own CVs"
  on public.cvs for select using (auth.uid() = user_id);

create policy "Anyone can view published CVs"
  on public.cvs for select using (is_published = true);

create policy "Users can insert their own CVs"
  on public.cvs for insert with check (auth.uid() = user_id);

create policy "Users can update their own unlocked CVs"
  on public.cvs for update using (auth.uid() = user_id and is_locked = false);

create policy "Admins can view all CVs"
  on public.cvs for select using (public.is_admin());

create policy "Super admins can update any CV"
  on public.cvs for update using (public.is_super_admin());

-- ─── PAYMENTS policies ────────────────────────────────────
create policy "Users can view their own payments"
  on public.payments for select using (auth.uid() = user_id);

create policy "Admins can view all payments"
  on public.payments for select using (public.is_admin());

-- ─── PROMO CODES policies ─────────────────────────────────
create policy "Anyone can view active promo codes"
  on public.promo_codes for select using (is_active = true);

create policy "Only admins can create promo codes"
  on public.promo_codes for insert with check (public.is_admin());

create policy "Only admins can update promo codes"
  on public.promo_codes for update using (public.is_admin());

-- ─── REFERRALS policies ───────────────────────────────────
create policy "Users can view their own referrals"
  on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy "Admins can view all referrals"
  on public.referrals for select using (public.is_admin());

-- ─── AUDIT LOG policies ───────────────────────────────────
create policy "Users can view their own audit log"
  on public.audit_log for select using (auth.uid() = user_id);

create policy "Admins can view all audit log"
  on public.audit_log for select using (public.is_admin());

create policy "Authenticated users can insert audit events"
  on public.audit_log for insert with check (auth.uid() is not null);

-- ─── FLAGGED CVS policies ─────────────────────────────────
create policy "Anyone authenticated can report a CV"
  on public.flagged_cvs for insert with check (auth.uid() is not null);

create policy "Admins can view all flags"
  on public.flagged_cvs for select using (public.is_admin());

create policy "Admins can update flags"
  on public.flagged_cvs for update using (public.is_admin());

-- ─── CLUBS CUSTOM policies ────────────────────────────────
create policy "Anyone can view custom clubs"
  on public.clubs_custom for select using (true);

create policy "Authenticated users can add clubs"
  on public.clubs_custom for insert with check (auth.uid() is not null);

create policy "Admins can update clubs"
  on public.clubs_custom for update using (public.is_admin());

-- ─── APP SETTINGS policies ────────────────────────────────
create policy "Anyone can read settings"
  on public.app_settings for select using (true);

create policy "Only super admins can modify settings"
  on public.app_settings for update using (public.is_super_admin());

-- ═══════════════════════════════════════════════════════════
-- VIEWS pour le DASHBOARD SUPER-ADMIN
-- ═══════════════════════════════════════════════════════════

create or replace view public.stats_overview as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where created_at >= now() - interval '7 days') as new_users_week,
  (select count(*) from public.cvs) as total_cvs,
  (select count(*) from public.cvs where type = 'player') as total_players,
  (select count(*) from public.cvs where type = 'staff') as total_staff,
  (select count(*) from public.cvs where created_at >= now() - interval '7 days') as new_cvs_week,
  (select coalesce(sum(amount_cents - discount_cents), 0) from public.payments where status = 'succeeded') as total_revenue_cents,
  (select coalesce(sum(amount_cents - discount_cents), 0) from public.payments where status = 'succeeded' and created_at >= date_trunc('month', now())) as monthly_revenue_cents,
  (select coalesce(sum(commission_cents), 0) from public.referrals where status = 'pending') as pending_payouts_cents,
  (select count(*) from public.flagged_cvs where status = 'pending') as pending_flags;

-- Permissions sur la vue
grant select on public.stats_overview to authenticated;

-- ═══════════════════════════════════════════════════════════
-- DONE !
-- 10 tables, 7 langues, RLS partout, super_admin/admin/user
-- ═══════════════════════════════════════════════════════════
