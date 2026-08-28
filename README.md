# ジムアフィリエイト管理システム

ジム(法人・店舗)向けアフィリエイトプログラムの管理画面。既存の「チャットボット決済システム」
(pm-chat-bot)とは別プロジェクトだが、**同一のSupabaseプロジェクトを参照する**。

## セットアップ

1. `.env.local` に以下を設定する(pm-chat-bot側と同じSupabaseプロジェクトの値を使う):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_ALLOWED_GOOGLE_DOMAIN` / `NEXT_PUBLIC_ADMIN_ALLOWED_GOOGLE_DOMAIN`(運営側ログインの許可ドメイン。pm-chat-bot側と同じ値)
   - `GAS_MAIL_WEBHOOK_URL` / `GAS_MAIL_SECRET`(新規注文通知メール送信。pm-chat-bot側と同じGAS Webhookを流用可)
   - `GYM_ORDER_WEBHOOK_SECRET`(注文作成Webhookの検証用。任意のランダム文字列。DB側の設定と一致させる)

2. `supabase/migrations/` を**Supabase側で手動実行**する(CIによる自動適用はない。既存プロジェクトの
   運用と同様の制約)。0003番のマイグレーションは新規注文通知トリガーで、追加の手動設定が必要
   (ファイル内のコメントを参照)。

3. Supabase Authで運営側(Google Workspace)・法人側(メール+パスワード)の両方のプロバイダを有効化する。

## pm-chat-bot側スキーマへの依存関係(重要・要共有)

本システムは同一Supabaseプロジェクト内で、pm-chat-bot側が所有する以下のテーブル・カラムを
直接参照する。pm-chat-bot側は現在も開発・改修が進行中とのことなので、**これらのリネーム・削除を
行う際は本システムへの影響を確認してから行う**必要がある(逆に本システム側からこれらを変更することはない)。

| テーブル | 参照しているカラム |
|---|---|
| `orders` | `customer_id, product_id, coupon_id, scenario_id, type, quantity, billing_cycle_number, shipped_at, status, import_status` |
| `coupons` | `id, type, code`(`gym_store_coupons.coupon_id`が`on delete restrict`で外部キー参照している。**店舗に紐付け済みのクーポンはpm-chat-bot側の管理画面から削除できなくなる**点に注意) |
| `customers` | `id, name` |
| `products` | `id, name` |
| `scenarios` | `id, name`(`gym_settings.target_scenario_id`が外部キー参照) |
| `users` | `auth_user_id, email, role`(運営側ログインの権限判定に使用) |

また、両システムとも「CIによる自動適用なし・Supabase側で手動SQL実行」という同じ運用のため、
マイグレーション実行のタイミングが重ならないよう、実行前に軽く声をかけ合うことを推奨する。

## 権限モデル

- **運営側(社内)**: pm-chat-bot側の既存`users`テーブル(admin/staffロール、Google Workspace認証)を
  そのまま共有する。アカウントの二重管理を避けるため。
- **法人側(パートナー)**: 本システム独自の`gym_partner_users`テーブル + Supabase Authの
  メール+パスワードサインイン。既存の運営側ロールとは別モデル。

## 設計上の主な決定事項(要確認)

以下は今回のヒアリングで確定した事項・実装上の判断。特に★は今回のチャットで明示回答を得ていない
実装上の仮定のため、要件と齟齬がないか確認を推奨する。

- **点数カウントの基準**: 出荷日(`orders.shipped_at`)ベースで当該月に計上する。出荷前キャンセル・
  定期の途中解約分は`import_status='shipped'`のみを対象にすることで自然に除外される。
- **明細のロック方式**: 未同意(draft)の間は都度ライブ計算(画面を開いた時点の最新DB値)を表示する。
  法人側が同意すると、その時点の点数・金額を`gym_monthly_statements`/`gym_monthly_statement_stores`
  にスナップショットとして固定(ロック)し、以後は法人側にはこのスナップショットを表示する
  (都度の再計算はしない)。
- **ロック後の修正は運営側管理画面からのみ**行う。運営側が手動調整を追加する、または
  「ロックを解除して修正する」を押すと、明細はdraft(未承認)に戻り、法人側は最新のライブ計算結果を
  確認して再度同意する必要がある(法人側からの修正操作はできない)。
- **同意の意味**: 上記スナップショットを固定した上で、支払い実行のトリガーとして記録する
  (`gym_monthly_statements.agreed_at`)。
- **店舗追加登録**: 常に弊社管理者のみが行う(`/api/admin/stores`は運営側ロール限定)。
- **通知先メール**: 法人単位・店舗単位ともに複数登録可能。
- **クーポンコードの発行元**: クーポン(`coupons`テーブル)自体はpm-chat-bot側(チャットシステムの
  管理画面)で発行する。本システムの店舗登録では、発行済みのコードを検索して店舗に紐付けるのみで、
  本システムから新規にクーポンを作成することはしない(店舗への告知・実績引用のための登録)。
- ★**単価判定の集計単位**: 「月間合計点数(店舗単位、法人はその配下店舗の合計)」を、法人配下の
  全店舗合計点数で単価を1つ決定し、その単価を各店舗の点数にも一律適用する実装とした
  (店舗ごとに個別の単価区分は判定しない)。単店舗の法人では結果的に店舗単位の判定と一致する。
  複数店舗を持つ法人でこの解釈と異なる場合は要修正。
- ★**インボイス設定はcorporations(法人)単位のみ**で持ち、店舗単位では持たない。
- ★**新規注文通知のトリガー**: pm-chat-bot側のコードを変更せずに実現するため、Supabaseの
  `orders`テーブルにDBトリガー(pg_net経由でのHTTP通知)を追加している
  (`0003_gym_order_notify_trigger.sql`)。既存コードには一切手を入れていない。
- ★**支払い明細のPDFの税額表記**: インボイス登録事業者には登録番号+消費税(10%)内訳+税込合計を、
  非登録事業者には登録番号なし・仕入税額控除は弊社の税務判断による旨の注記のみを出し分けている。
  実際の税務・会計処理として妥当かは税理士等の確認を推奨する。
