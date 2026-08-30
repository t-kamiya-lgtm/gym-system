-- 不具合修正: gym_order_lines.source_order_id への一意インデックスが部分インデックス
-- (where source_order_id is not null)だったため、アプリ側のupsert(on conflict指定)が
-- 対応する制約を見つけられず、INSERTのたびにエラーになっていた(受注明細台帳への書き込みが
-- 常に失敗し、エラーはアプリ側で握りつぶされていたため気づかれなかった)。
--
-- NULL同士は一意制約違反にならない(標準SQLの仕様)ため、部分インデックスにする必要はそもそもなく、
-- 通常の(WHERE句なしの)一意インデックスに変更する。

drop index if exists gym_order_lines_source_order_id_key;
create unique index if not exists gym_order_lines_source_order_id_key
  on gym_order_lines (source_order_id);
