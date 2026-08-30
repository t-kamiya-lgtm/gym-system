-- 法人マスタに振込先銀行口座情報を追加する。支払い明細書(インボイス)の下部に
-- 振込先として記載するために使用する。

alter table gym_corporations add column if not exists bank_name text;
alter table gym_corporations add column if not exists bank_branch_name text;
alter table gym_corporations add column if not exists bank_account_type text
  check (bank_account_type in ('ordinary', 'checking') or bank_account_type is null);
alter table gym_corporations add column if not exists bank_account_number text;
alter table gym_corporations add column if not exists bank_account_holder text;
