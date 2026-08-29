-- 受注明細台帳(gym_order_lines)。
--
-- 従来は月次集計のたびにpm-chat-bot側のordersテーブルを都度ライブ集計していたが、
-- 「受注後すぐに受注一覧へ取り込み、後から出荷済フラグが同期される」フローに変更するため、
-- 本システム独自の受注明細テーブルを持つ(0009マイグレーションのDBトリガーから自動生成される)。
--
-- ・order_date(受注日)が月次集計の対象月を決めるキーになる(旧: shipped_at基準)。
-- ・shipment_flagは本システム側で独自に持ち、pm-chat-bot側のimport_statusとは別に
--   運営側が手動で上書きできる(受注明細編集画面)。
-- ・月末確定(gym_monthly_statements発行)すると、対象行はstatement_idが設定されlocked=trueになり
--   編集不可になる。ロック後にpm-chat-bot側でキャンセルが発生した場合は、この行を直接変更せず、
--   マイナス受注(is_reversal=true)の新規行を現在オープン中の期間に追加する。
-- ・運営側が手動で追加した行(is_manual=true)はsource_order_idを持たない。

create table if not exists gym_order_lines (
  id uuid primary key default gen_random_uuid(),
  corporation_id uuid not null references gym_corporations (id) on delete cascade,
  store_id uuid not null references gym_stores (id) on delete cascade,

  -- pm-chat-bot側の元注文。Webhookで自動生成された行のみ設定され、手動追加行はnull。
  source_order_id uuid references orders (id),

  order_number text,
  order_date date not null,
  customer_name text not null default '',
  product_name text not null default '',
  quantity integer not null default 0,

  shipment_flag text not null default 'not_shipped'
    check (shipment_flag in ('not_shipped', 'shipped', 'canceled', 'excluded')),

  is_manual boolean not null default false,
  is_reversal boolean not null default false,
  reversal_of_line_id uuid references gym_order_lines (id),

  -- 月末確定後の状態。ロック後は運営側の受注明細編集画面から編集不可。
  statement_id uuid references gym_monthly_statements (id),
  locked boolean not null default false,
  unit_price_snapshot integer,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gym_order_lines_corporation_order_date_idx
  on gym_order_lines (corporation_id, order_date);
create index if not exists gym_order_lines_store_id_idx on gym_order_lines (store_id);
create index if not exists gym_order_lines_statement_id_idx
  on gym_order_lines (statement_id) where statement_id is not null;
create unique index if not exists gym_order_lines_source_order_id_key
  on gym_order_lines (source_order_id) where source_order_id is not null;

alter table gym_order_lines enable row level security;
-- 既存プロジェクトと同様、RLSポリシーは定義せず、アクセスはservice role経由のサーバーAPIに統一する。
