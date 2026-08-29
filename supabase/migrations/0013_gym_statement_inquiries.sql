-- 支払い明細への問い合わせ。パートナーが明細内容に確認事項がある場合に送信する。
-- 通知先メールアドレスの設定は未定(運営側「設定」メニューで別途対応予定)のため、
-- 本テーブルはまず保存・一覧表示のみに対応する。

create table if not exists gym_statement_inquiries (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  year_month date not null,
  store_name text,
  contact_name text not null,
  contact_tel text,
  contact_email text,
  order_number text,
  customer_name text,
  content text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create index if not exists gym_statement_inquiries_corporation_id_idx
  on gym_statement_inquiries (corporation_id);
create index if not exists gym_statement_inquiries_status_idx
  on gym_statement_inquiries (status);

alter table gym_statement_inquiries enable row level security;
