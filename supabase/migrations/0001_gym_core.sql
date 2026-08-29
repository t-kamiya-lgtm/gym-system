-- ジム向けアフィリエイトプログラム管理システム。
-- 本プロジェクトは既存のチャットボット決済システム(pm-chat-bot)とは別プロジェクトだが、
-- データは同一のSupabaseプロジェクトを参照する。既存テーブル(scenarios/products/coupons/
-- orders/customers/subscriptions/users)との衝突を避けるため、新規テーブルは gym_ プレフィックスを付ける。
-- 既存プロジェクト同様、CIによる自動適用はない。Supabase側で手動実行が必要。

-- 法人(アフィリエイトパートナー)
create table if not exists gym_corporations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- インボイス(適格請求書発行事業者)対応
  invoice_registered boolean not null default false,
  invoice_registration_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gym_corporations_invoice_number_required check (
    (invoice_registered and invoice_registration_number is not null)
    or (not invoice_registered)
  )
);

-- 店舗(法人配下)。初回登録・追加登録とも弊社管理者のみが行う。
create table if not exists gym_stores (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gym_stores_corporation_id_idx on gym_stores (corporation_id);

-- 店舗とクーポン(既存coupons、type='manual_code')の1:1紐付け。
-- クーポン自体はpm-chat-bot側(チャットシステムの管理画面)で発行する。本システムでは
-- 発行済みのクーポンコードを「登録」するだけで、店舗への告知・実績の紐付け(集計キー)として使う
-- (このシステムからcoupons行を新規作成することはしない)。
create table if not exists gym_store_coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references gym_stores (id) on delete cascade,
  coupon_id uuid not null references coupons (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (store_id),
  unique (coupon_id)
);

-- アフィリエイト集計の対象シナリオ(1つのみ)。管理画面から変更できるよう単一行設定として持つ。
create table if not exists gym_settings (
  id boolean primary key default true check (id),
  target_scenario_id uuid references scenarios (id),
  updated_at timestamptz not null default now()
);
insert into gym_settings (id) values (true) on conflict (id) do nothing;

-- 法人側ログインユーザー(メールアドレス+パスワード)。
-- 運営側(社内)は既存pm-chat-bot側のusersテーブル(admin/staff、Google Workspace認証)をそのまま使う想定のため、
-- 法人側は既存ロールモデルと混同しないよう別テーブルとして持つ。
-- auth_user_idはSupabase Auth(auth.users)のemail+passwordサインインに対応する行を指す。
create table if not exists gym_partner_users (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  auth_user_id uuid unique,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create index if not exists gym_partner_users_corporation_id_idx on gym_partner_users (corporation_id);

-- 新規注文の通知先メールアドレス。法人単位・店舗単位のいずれでも複数登録可能。
create table if not exists gym_notification_emails (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid references gym_corporations (id) on delete cascade,
  store_id uuid references gym_stores (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  constraint gym_notification_emails_scope check (
    (corporation_id is not null and store_id is null)
    or (corporation_id is null and store_id is not null)
  )
);

create index if not exists gym_notification_emails_corporation_id_idx
  on gym_notification_emails (corporation_id) where corporation_id is not null;
create index if not exists gym_notification_emails_store_id_idx
  on gym_notification_emails (store_id) where store_id is not null;

alter table gym_corporations enable row level security;
alter table gym_stores enable row level security;
alter table gym_store_coupons enable row level security;
alter table gym_settings enable row level security;
alter table gym_partner_users enable row level security;
alter table gym_notification_emails enable row level security;
-- 既存プロジェクトと同様、RLSポリシーは定義せず、アクセスはservice role経由のサーバーAPIに統一する。
