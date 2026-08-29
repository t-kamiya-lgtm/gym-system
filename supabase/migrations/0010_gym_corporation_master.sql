-- 法人マスタ拡充。運営側「法人登録」メニューを法人マスタ管理として使うための追加項目。
-- 店舗数は既存のgym_storesから都度カウントするため、カラムとしては持たない。

alter table gym_corporations add column if not exists address text;
alter table gym_corporations add column if not exists tel text;
alter table gym_corporations add column if not exists hp_url text;
alter table gym_corporations add column if not exists contact_name text;
alter table gym_corporations add column if not exists contact_tel text;
alter table gym_corporations add column if not exists contact_email text;
