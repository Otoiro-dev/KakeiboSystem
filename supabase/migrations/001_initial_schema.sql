-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- accounts テーブル
-- =====================
create type account_type as enum ('cash', 'bank', 'credit_card');

create table accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null default 'bank',
  balance numeric(12, 2) not null default 0,
  credit_limit numeric(12, 2),
  color text not null default '#6366f1',
  icon text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "accounts_owner" on accounts
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================
-- categories テーブル
-- =====================
create type category_type as enum ('income', 'expense', 'transfer');

create table categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,  -- null = system default
  name text not null,
  type category_type not null,
  icon text not null default '',
  color text not null default '#6366f1',
  sort_order int not null default 100
);

alter table categories enable row level security;
create policy "categories_select" on categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_insert" on categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete" on categories
  for delete using (auth.uid() = user_id);

-- =====================
-- transactions テーブル
-- =====================
create type transaction_type as enum ('income', 'expense', 'transfer');

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  type transaction_type not null,
  category_id uuid references categories(id) on delete set null,
  account_id uuid not null references accounts(id) on delete restrict,
  to_account_id uuid references accounts(id) on delete restrict,
  memo text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_transfer_account_check check (
    (type <> 'transfer' and to_account_id is null)
    or (type = 'transfer' and to_account_id is not null and to_account_id <> account_id)
  )
);

create index transactions_user_date on transactions (user_id, date desc);
create index transactions_account on transactions (account_id);

alter table transactions enable row level security;
create policy "transactions_owner" on transactions
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================
-- 残高更新関数
-- =====================
create or replace function increment_balance(p_account_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
as $$
begin
  update accounts
  set balance = balance + p_amount,
      updated_at = now()
  where id = p_account_id
    and user_id = auth.uid();
end;
$$;

-- =====================
-- updated_at 自動更新トリガー
-- =====================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_updated_at
  before update on accounts
  for each row execute function update_updated_at();

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

-- =====================
-- デフォルトカテゴリ（システム共通）
-- =====================
insert into categories (name, type, icon, color, sort_order) values
  -- 支出
  ('食費',       'expense', '🍽️', '#ef4444', 1),
  ('日用品',     'expense', '🛒', '#f59e0b', 2),
  ('交通費',     'expense', '🚃', '#3b82f6', 3),
  ('住居費',     'expense', '🏠', '#8b5cf6', 4),
  ('水道光熱費', 'expense', '💡', '#06b6d4', 5),
  ('医療費',     'expense', '💊', '#10b981', 6),
  ('衣服',       'expense', '👗', '#ec4899', 7),
  ('娯楽・趣味', 'expense', '🎮', '#6366f1', 8),
  ('教育',       'expense', '📚', '#a78bfa', 9),
  ('交際費',     'expense', '🍻', '#f97316', 10),
  ('通信費',     'expense', '📱', '#64748b', 11),
  ('その他支出', 'expense', '💸', '#94a3b8', 12),
  -- 収入
  ('給与',       'income',  '💼', '#10b981', 20),
  ('副収入',     'income',  '💰', '#06b6d4', 21),
  ('その他収入', 'income',  '🎁', '#8b5cf6', 22),
  -- 振替
  ('振替',       'transfer','🔄', '#6366f1', 30);
