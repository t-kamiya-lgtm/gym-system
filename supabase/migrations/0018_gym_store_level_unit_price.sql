-- 報酬単価の算定基準を「法人配下の店舗合計」から「店舗単位の月間合計」に変更する。
-- 店舗ごとの月間合計点数に応じて、店舗ごとに単価(300円/450円/600円)を適用する。
-- gym_monthly_statement_stores に、確定時点の店舗ごとの適用単価を保存する列を追加する。

alter table gym_monthly_statement_stores add column if not exists unit_price integer;
