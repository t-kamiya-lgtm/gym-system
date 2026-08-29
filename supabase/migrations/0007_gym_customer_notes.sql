-- 法人側の「会員別実績」画面で、店舗担当者がその場でメモできる欄(担当インストラクター名・
-- 店舗側の会員番号など、店舗ごとに自由記述するための2つのメモ欄)。
-- 同じ会員(customer)が複数店舗に出現するケースを考慮し、店舗単位で保持する。
create table if not exists gym_customer_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references gym_stores (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  memo1 text,
  memo2 text,
  updated_at timestamptz not null default now(),
  unique (store_id, customer_id)
);

alter table gym_customer_notes enable row level security;
