# 古いゲストの掃除（運用手順・PLAN 54）

画面には「30日使わないと、記録が消えます」と出している。これを本当にするための手順。
消えるのは「Google 連携していない匿名ユーザー」だけ。連携済みの人は消えない。

## 1. Firebase Console で匿名アカウントの自動削除を有効にする（1回だけ）

1. Firebase Console を開き、本番のプロジェクトを選ぶ。
2. 左メニュー「Authentication」→「設定」タブ→「ユーザー アカウントの削除」（または「匿名認証の自動クリーンアップ」）を開く。
3. 「匿名アカウントの自動クリーンアップ」を **有効** にする。確認ダイアログで有効化を承認する。
   - 有効にすると、30日以上たった匿名アカウントが自動で Auth から削除される。
   - 前提: Identity Platform（Authentication のアップグレード）が必要な場合がある。表示が無いときは、案内に従ってアップグレードする（料金は Console の表示を確認）。
4. 有効にした日をここに書いておく: ____年__月__日

注意: この自動削除は **Auth のアカウントだけ** を消す。Firestore の `users/{uid}` 以下は残るので、下のスクリプトで消す。
Auth が先に消えると、スクリプトは対象を見つけられなくなる（孤児の `users/{uid}` が残る）。そのため、スクリプトを自動削除より先に、または定期的に手で回す。孤児が溜まったら、Console の Firestore で `users` の uid と Authentication のユーザー一覧を見比べて手で消す。

## 2. 掃除スクリプト（手動）

`package.json` の scripts に次の行を足す（担当外のため未追加）。

```json
"cleanup:guests": "node scripts/cleanup-guests.mjs"
```

```bash
npm run backup                          # 念のため先に控えを取る
npm run cleanup:guests                  # ドライラン（既定）。対象の uid と最終ログインを表示するだけ
npm run cleanup:guests -- --apply       # 実際に消す（戻せない）
npm run cleanup:guests -- --days 45     # 日数を変える（既定30）
```

- 対象: 匿名（providerData が空）で、最終ログインが30日より前のユーザー。日時が分からないものは消さない。
- 消す内容: `users/{uid}` と全サブコレクション（thoughts・chunks・moods・letters・chats・usage・draft など）を `recursiveDelete`。そのあと Auth のユーザーを削除。
- 順番は Firestore → Auth。途中で失敗しても Auth が残るので、もう一度回せば続きから消える。
- `.env.local` の管理者キーで本番に繋がる。ドライランで対象を目で確認してから `--apply` を付ける。
- 自動では回さない（手動）。月1回くらいを目安に。

## 3. 画面の文言との一致

- 設定のゲスト欄: 「30日使わないと、記録が消えます。」→ 既定の30日と同じ。日数を変えるときは画面の文言も一緒に直す。
