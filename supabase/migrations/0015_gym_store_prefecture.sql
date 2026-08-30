-- 店舗マスタに都道府県を追加する。運営側の店舗・クーポン管理タブで表示・編集する。

alter table gym_stores add column if not exists prefecture text;
