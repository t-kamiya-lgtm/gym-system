-- 1つのログイン(メールアドレス)で複数法人に紐付けられるようにする。
-- (例: ある法人の代表者が、自身個人のフランチャイズ店舗を別法人として持つケース)
-- 従来はemail・auth_user_idをテーブル全体でuniqueにしていたが、
-- 「同じ法人に同じログインを二重登録できない」という粒度の制約に緩める。
-- Supabase Auth側のauth.usersは引き続きメールアドレスで一意(同じ認証情報を複数法人で共有する)。

alter table gym_partner_users drop constraint if exists gym_partner_users_email_key;
alter table gym_partner_users drop constraint if exists gym_partner_users_auth_user_id_key;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_partner_users_corporation_id_email_key'
  ) then
    alter table gym_partner_users
      add constraint gym_partner_users_corporation_id_email_key unique (corporation_id, email);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'gym_partner_users_corporation_id_auth_user_id_key'
  ) then
    alter table gym_partner_users
      add constraint gym_partner_users_corporation_id_auth_user_id_key unique (corporation_id, auth_user_id);
  end if;
end $$;
