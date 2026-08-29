-- 支払い明細フローの変更:「いつでも同意できるライブ計算のdraft」を廃止し、
-- 運営側の月末確定(締め)処理を経て初めて明細行(gym_monthly_statements)が作られる方式にする。
--
-- 新フローでは、行が存在しない = 未確定(月末確定処理待ち)を意味するため、
-- 既存の'draft'(ライブ計算中、の意味合いが強い)を'closed'にリネームする。
-- 'closed' = 運営側が月末確定処理を行い、数値が固定された状態(法人側の同意待ち)。
-- 'agreed' = 法人側が同意済み(従来通り)。

update gym_monthly_statements set status = 'closed' where status = 'draft';

alter table gym_monthly_statements drop constraint if exists gym_monthly_statements_status_check;
alter table gym_monthly_statements add constraint gym_monthly_statements_status_check
  check (status in ('closed', 'agreed'));

alter table gym_monthly_statements alter column status set default 'closed';

-- 月末確定処理を行った運営側担当者(監査用)。
alter table gym_monthly_statements add column if not exists closed_by text;
