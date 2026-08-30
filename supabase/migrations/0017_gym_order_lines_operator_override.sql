-- 運営側が受注明細の出荷フラグを手動で変更した行を区別するためのフラグ。
-- 手動で変更した後にチャットシステム側の出荷状態が変わっても、運営側の判断を上書きしない
-- ようにするために使う。

alter table gym_order_lines add column if not exists flag_overridden_by_operator boolean not null default false;
