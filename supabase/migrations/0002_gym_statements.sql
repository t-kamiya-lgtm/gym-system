-- 月次支払い明細の同意状態、および手動調整(エラー時の加算・減算)。
--
-- 未同意(draft)の間はorders/coupons等の最新値から都度ライブ計算する。
-- 法人側が同意すると、その時点の値をスナップショットとして固定(ロック)する
-- (スナップショット列は0004マイグレーションで追加)。ロック後の修正は運営側管理画面からのみ行い、
-- 修正するとdraftに戻って法人側の再同意が必要になる。
-- 明細確定後に生じた誤差は、このテーブルの手動調整行で加算・減算して吸収する。

-- 単価の一律適用ルール(月間合計点数は法人配下の店舗合計)。
-- 1〜9点: 300円/点、10〜99点: 450円/点、100点以上: 600円/点。
create table if not exists gym_reward_tiers (
  id uuid primary key default gen_random_uuid(),
  min_points integer not null check (min_points >= 0),
  max_points integer, -- null = 上限なし
  unit_price integer not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

insert into gym_reward_tiers (min_points, max_points, unit_price)
select * from (values
  (1, 9, 300),
  (10, 99, 450),
  (100, null, 600)
) as v(min_points, max_points, unit_price)
where not exists (select 1 from gym_reward_tiers);

-- 法人単位・月単位の同意記録。
create table if not exists gym_monthly_statements (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  year_month date not null, -- その月の1日(例: 2026-08-01)
  status text not null default 'draft' check (status in ('draft', 'agreed')),
  agreed_at timestamptz,
  agreed_by uuid references gym_partner_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (corporation_id, year_month)
);

-- 手動調整(明細確定後のキャンセル反映漏れ・計算エラー等を吸収するための加算/減算)。
-- store_idがnullの場合は法人全体に対する調整。
create table if not exists gym_statement_adjustments (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  store_id uuid references gym_stores (id) on delete cascade,
  year_month date not null,
  amount integer not null, -- 円。マイナス可
  reason text not null,
  created_by text not null, -- 操作した弊社管理者のメールアドレス
  created_at timestamptz not null default now()
);

create index if not exists gym_monthly_statements_corporation_id_idx
  on gym_monthly_statements (corporation_id);
create index if not exists gym_statement_adjustments_corporation_id_ym_idx
  on gym_statement_adjustments (corporation_id, year_month);

alter table gym_reward_tiers enable row level security;
alter table gym_monthly_statements enable row level security;
alter table gym_statement_adjustments enable row level security;
