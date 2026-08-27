-- 新規注文通知(店舗の登録メールアドレスへ「〇〇様の注文が入りました」を送信)を、
-- pm-chat-bot側のコードを変更せずに実現するためのDBトリガー。
-- ordersへのINSERT時、coupon_idが本システムの店舗クーポンに一致する場合のみ、
-- 本プロジェクトのAPI(/api/webhooks/order-created)へpg_net経由でHTTP通知する(fire-and-forget)。
--
-- 事前準備(Supabase側で手動実行が必要):
--   1) pg_net拡張が有効なこと(Supabaseでは通常デフォルトで利用可能)
--   2) 下記2つのデータベース設定値をSupabase側で設定する
--      alter database postgres set app.settings.gym_order_webhook_url = 'https://<本システムのドメイン>/api/webhooks/order-created';
--      alter database postgres set app.settings.gym_order_webhook_secret = '<ランダムな秘密文字列>';
--      (本システム側の環境変数 GYM_ORDER_WEBHOOK_SECRET に同じ値を設定して照合する)
--   3) 設定変更後は新しい接続から反映されるため、必要に応じてSupabaseプロジェクトを再起動する

create extension if not exists pg_net;

create or replace function gym_notify_order_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_webhook_url text := current_setting('app.settings.gym_order_webhook_url', true);
  v_webhook_secret text := current_setting('app.settings.gym_order_webhook_secret', true);
begin
  if v_webhook_url is null or new.coupon_id is null then
    return new;
  end if;

  select store_id into v_store_id from gym_store_coupons where coupon_id = new.coupon_id;
  if v_store_id is null then
    return new;
  end if;

  perform net.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-webhook-secret', coalesce(v_webhook_secret, '')
    ),
    body := jsonb_build_object('order_id', new.id, 'store_id', v_store_id, 'coupon_id', new.coupon_id)
  );

  return new;
end;
$$;

drop trigger if exists gym_order_notify on orders;
create trigger gym_order_notify
  after insert on orders
  for each row
  execute function gym_notify_order_webhook();
