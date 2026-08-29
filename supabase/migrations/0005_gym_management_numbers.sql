-- 法人・店舗の管理番号(法人3桁+店舗3桁、例: 001-001)。
-- 法人番号は登録順の通し番号(重複なし、欠番可)。店舗番号は法人ごとに001から採番する。

create sequence if not exists gym_corp_no_seq;

alter table gym_corporations add column if not exists corp_no integer;
update gym_corporations set corp_no = nextval('gym_corp_no_seq') where corp_no is null;
alter table gym_corporations alter column corp_no set default nextval('gym_corp_no_seq');
alter table gym_corporations alter column corp_no set not null;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_corporations_corp_no_key'
  ) then
    alter table gym_corporations add constraint gym_corporations_corp_no_key unique (corp_no);
  end if;
end $$;

alter table gym_stores add column if not exists store_no integer;
-- 既存店舗(あれば)に、法人内の登録順で連番を振る。
with numbered as (
  select id, row_number() over (partition by corporation_id order by created_at) as rn
  from gym_stores
  where store_no is null
)
update gym_stores s set store_no = numbered.rn
from numbered
where s.id = numbered.id;
alter table gym_stores alter column store_no set not null;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_stores_corporation_id_store_no_key'
  ) then
    alter table gym_stores add constraint gym_stores_corporation_id_store_no_key unique (corporation_id, store_no);
  end if;
end $$;
