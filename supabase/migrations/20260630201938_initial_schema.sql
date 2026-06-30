-- ============================================================
-- Enums
-- ============================================================

create type bank_type as enum ('traditional', 'fintech');
create type transaction_type as enum ('income', 'expense', 'transfer');

-- ============================================================
-- Tables
-- ============================================================

create table groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid,                          -- back-filled after profiles insert
  created_at timestamptz not null default now()
);

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  group_id     uuid references groups(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table groups
  add constraint groups_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

create table bank_presets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         bank_type not null,
  logo_url     text,
  country_code char(2) not null
);

create table wallets (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups(id) on delete cascade,
  owner_id       uuid references profiles(id) on delete set null,
  name           text not null,
  bank_preset_id uuid references bank_presets(id) on delete set null,
  currency       char(3) not null default 'EUR',
  balance        numeric(14, 2) not null default 0,
  created_at     timestamptz not null default now()
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  group_id   uuid references groups(id) on delete cascade,  -- null = system default
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table transactions (
  id                    uuid primary key default gen_random_uuid(),
  group_id              uuid not null references groups(id) on delete cascade,
  wallet_id             uuid not null references wallets(id) on delete restrict,
  transfer_to_wallet_id uuid references wallets(id) on delete restrict,
  created_by            uuid references profiles(id) on delete set null,
  type                  transaction_type not null,
  amount                numeric(14, 2) not null check (amount > 0),
  category_id           uuid references categories(id) on delete set null,
  date                  date not null,
  note                  text,
  created_at            timestamptz not null default now(),

  constraint transfer_requires_target
    check (type != 'transfer' or transfer_to_wallet_id is not null)
);

-- ============================================================
-- Indexes
-- ============================================================

create index on transactions (group_id, date desc);
create index on transactions (wallet_id, date desc);
create index on transactions (category_id, date desc);
create index on wallets (group_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table profiles     enable row level security;
alter table groups       enable row level security;
alter table bank_presets enable row level security;
alter table wallets      enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;

-- Helper: returns the current user's group_id
create or replace function my_group_id()
returns uuid language sql stable
as $$ select group_id from profiles where id = auth.uid() $$;

create policy "group members only" on profiles
  for all using (group_id = my_group_id());

create policy "own group only" on groups
  for all using (id = my_group_id());

-- bank_presets are public read-only (no group scoping needed)
create policy "public read" on bank_presets
  for select using (true);

create policy "group wallets" on wallets
  for all using (group_id = my_group_id());

create policy "group categories" on categories
  for all using (group_id = my_group_id() or group_id is null);

create policy "group transactions" on transactions
  for all using (group_id = my_group_id());

-- ============================================================
-- Wallet balance trigger
-- ============================================================

create or replace function update_wallet_balance()
returns trigger language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.type = 'income' then
      update wallets set balance = balance + NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'expense' then
      update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'transfer' then
      update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
      update wallets set balance = balance + NEW.amount where id = NEW.transfer_to_wallet_id;
    end if;

  elsif TG_OP = 'DELETE' then
    if OLD.type = 'income' then
      update wallets set balance = balance - OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'expense' then
      update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'transfer' then
      update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
      update wallets set balance = balance - OLD.amount where id = OLD.transfer_to_wallet_id;
    end if;

  elsif TG_OP = 'UPDATE' then
    -- reverse old, apply new
    if OLD.type = 'income' then
      update wallets set balance = balance - OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'expense' then
      update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
    elsif OLD.type = 'transfer' then
      update wallets set balance = balance + OLD.amount where id = OLD.wallet_id;
      update wallets set balance = balance - OLD.amount where id = OLD.transfer_to_wallet_id;
    end if;

    if NEW.type = 'income' then
      update wallets set balance = balance + NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'expense' then
      update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
    elsif NEW.type = 'transfer' then
      update wallets set balance = balance - NEW.amount where id = NEW.wallet_id;
      update wallets set balance = balance + NEW.amount where id = NEW.transfer_to_wallet_id;
    end if;
  end if;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_wallet_balance
  after insert or update or delete on transactions
  for each row execute function update_wallet_balance();

-- ============================================================
-- Seed data — bank presets
-- ============================================================

insert into bank_presets (name, type, logo_url, country_code) values
  ('Sparkasse',  'traditional', null, 'DE'),
  ('Revolut',    'fintech',     null, 'GB'),
  ('Wise',       'fintech',     null, 'GB'),
  ('Monobank',   'fintech',     null, 'UA'),
  ('PrivatBank', 'traditional', null, 'UA'),
  ('PayPal',     'fintech',     null, 'US'),
  ('Klarna',     'fintech',     null, 'SE'),
  ('Cash',       'traditional', null, 'XX'),
  ('Other',      'traditional', null, 'XX');

-- ============================================================
-- Seed data — default categories
-- ============================================================

insert into categories (name, icon, group_id, is_default) values
  ('Food & Groceries',        '🛒', null, true),
  ('Housing & Utilities',     '🏠', null, true),
  ('Transport',               '🚗', null, true),
  ('Health & Pharmacy',       '💊', null, true),
  ('Entertainment & Leisure', '🎬', null, true),
  ('Clothing & Personal Care','👗', null, true),
  ('Education',               '📚', null, true),
  ('Savings & Investments',   '💰', null, true),
  ('Other',                   '📦', null, true);
