-- 受注明細台帳(gym_order_lines)に商品種別(単品/定期)のスナップショットを追加する。
-- 購入明細CSV(商品種別列)を、ライブのordersクエリではなく本台帳から生成できるようにするため。

alter table gym_order_lines add column if not exists order_type text;
alter table gym_order_lines add column if not exists subscription_interval text;
