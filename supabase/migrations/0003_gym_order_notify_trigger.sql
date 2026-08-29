-- 新規注文通知(店舗の登録メールアドレスへ「〇〇様の注文が入りました」を送信)を、
-- pm-chat-bot側のコードを変更せずに実現するためのDBトリガー。
-- ordersへのINSERT時、coupon_idが本システムの店舗クーポンに一致する場合のみ、
-- 本プロジェクトのAPI(/api/webhooks/order-created)へpg_net経由でHTTP通知する(fire-and-forget)。
--
-- 実行前に、下の v_webhook_url / v_webhook_secret を実際の値に書き換えてから実行すること。
--   v_webhook_url    : 'https://<本システムのVercelドメイン>/api/webhooks/order-created'
--   v_webhook_secret : 本システム側の環境変数 GYM_ORDER_WEBHOOK_SECRET と同じ値
--
-- 補足: 当初 `alter database ... set app.settings.xxx` でDB設定として持たせる案を採用していたが、
-- Supabaseのホスティング環境ではSQL Editorの実行ロールに ALTER DATABASE の権限がなく
-- (permission denied to set parameter)、この方式は使えなかった。そのため関数本体に直接埋め込む
-- 方式に変更している。値を変更する場合(ドメイン変更・シークレットのローテーション等)は、
-- この関数を create or replace function で実行し直すこと。

create extension if not exists pg_net;

create or replace function gym_notify_order_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_webhook_url text := 'https://<本システムのVercelドメイン>/api/webhooks/order-created';
  v_webhook_secret text := '<GYM_ORDER_WEBHOOK_SECRETと同じ値>';
begin
  if new.coupon_id is null then
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
      'x-webhook-secret', v_webhook_secret
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
