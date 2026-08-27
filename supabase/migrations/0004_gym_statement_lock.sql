-- 支払い明細のロック方式への変更。
-- ・法人側が同意すると、その時点の点数・金額をスナップショットとして固定(ロック)する。
--   ロック後は法人側の画面には都度再計算した値ではなく、このスナップショットを表示する。
-- ・ロック後に誤り(キャンセルの反映漏れ等)が見つかった場合の修正は、運営側(弊社)の管理画面からのみ行う。
--   運営側が再計算・調整を行うと、スナップショットを更新した上でステータスをdraft(未承認)に戻す。
--   法人側は再度「同意」をやり直す必要がある。
-- ・draft(未同意)の間は、従来通りorders等から都度ライブ計算した値を表示する
--   (「画面を開いた時点で最新のDBの値を参照する」要件のため)。

alter table gym_monthly_statements add column if not exists total_points integer;
alter table gym_monthly_statements add column if not exists unit_price integer;
alter table gym_monthly_statements add column if not exists base_amount integer;
alter table gym_monthly_statements add column if not exists adjustment_total integer;
alter table gym_monthly_statements add column if not exists final_amount integer;
alter table gym_monthly_statements add column if not exists computed_at timestamptz;

-- 同意時点の店舗別内訳スナップショット。運営側が再計算するたびに作り直す。
create table if not exists gym_monthly_statement_stores (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references gym_monthly_statements (id) on delete cascade,
  store_id uuid not null references gym_stores (id) on delete cascade,
  points integer not null,
  reward_amount integer not null,
  adjustment_total integer not null default 0,
  final_amount integer not null,
  created_at timestamptz not null default now(),
  unique (statement_id, store_id)
);

alter table gym_monthly_statement_stores enable row level security;
