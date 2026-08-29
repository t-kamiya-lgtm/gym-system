-- 出荷済・キャンセル同期用のDBトリガー(0003と同じくpm-chat-bot側のコードは変更しない)。
--
-- pm-chat-bot側でordersのimport_statusが 'shipped' / 'canceled' に変わったタイミングで、
-- 本システムのWebhookへpg_net経由でHTTP通知する(fire-and-forget)。
--
-- 実行前に、下の v_webhook_url の各値を実際のVercelドメインに、v_webhook_secret を
-- 本システム側の環境変数 GYM_ORDER_WEBHOOK_SECRET と同じ値に書き換えてから実行すること。

create or replace function gym_notify_order_shipped_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_webhook_url text := 'https://<本システムのVercelドメイン>/api/webhooks/order-shipped';
  v_webhook_secret text := '<GYM_ORDER_WEBHOOK_SECRETと同じ値>';
begin
  if new.import_status is distinct from 'shipped' or old.import_status is not distinct from 'shipped' then
    return new;
  end if;
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
    body := jsonb_build_object('order_id', new.id, 'store_id', v_store_id)
  );

  return new;
end;
$$;

drop trigger if exists gym_order_shipped_sync on orders;
create trigger gym_order_shipped_sync
  after update on orders
  for each row
  execute function gym_notify_order_shipped_webhook();

create or replace function gym_notify_order_canceled_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_webhook_url text := 'https://<本システムのVercelドメイン>/api/webhooks/order-canceled';
  v_webhook_secret text := '<GYM_ORDER_WEBHOOK_SECRETと同じ値>';
begin
  if new.import_status is distinct from 'canceled' or old.import_status is not distinct from 'canceled' then
    return new;
  end if;
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
    body := jsonb_build_object('order_id', new.id, 'store_id', v_store_id)
  );

  return new;
end;
$$;

drop trigger if exists gym_order_canceled_sync on orders;
create trigger gym_order_canceled_sync
  after update on orders
  for each row
  execute function gym_notify_order_canceled_webhook();
