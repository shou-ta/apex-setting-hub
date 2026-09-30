# APEX SETTING HUB

Apex Legendsの設定を、ファイルを直接編集せずに確認・管理するWindowsアプリです。設定変更の前後を見比べてから適用できるので、値の探し間違いや戻し忘れを減らせます。

## このツールを使うメリット

- **設定を探しやすい** — `settings.cfg`、`profile.cfg`、`videoconfig.txt`の値を、ゲーム内の設定名に近い表示でまとめて確認できます。
- **変更内容を確認してから適用できる** — どの値が変わるかを差分画面で見て、納得してから保存できます。
- **元に戻しやすい** — 保存前の自動バックアップに加えて、手動バックアップ、プリセット、ZIP書き出しを利用できます。
- **細かな設定も扱いやすい** — キー割り当て、スコープ感度、コントローラー感度、解像度、レティクル色などを画面から編集できます。
- **関係ない設定を保つ** — アプリが扱わない行や手動編集された値を残して、必要な項目だけを更新します。

## ダウンロード

最新のWindowsインストーラーは[GitHub Releases](https://github.com/shou-ta/apex-setting-hub/releases)からダウンロードできます。

## 使い方

1. アプリを起動し、Apexの設定フォルダを選びます。
2. 設定を確認・編集します。
3. 差分を確認してから適用します。Apex起動中は適用できません。

設定ファイルの標準的な場所は次のとおりです。

- `%USERPROFILE%\Saved Games\Respawn\Apex\local\settings.cfg`
- `%USERPROFILE%\Saved Games\Respawn\Apex\profile\profile.cfg`
- `%USERPROFILE%\Saved Games\Respawn\Apex\local\videoconfig.txt`

標準の場所が見つからない場合は、アプリの「フォルダを選択」から指定できます。OneDrive配下のSaved Gamesも検出します。

## 注意事項

- 設定を保存する前にバックアップを作成します。復元前にもApexを終了してください。
- 「影を消す」などゲーム内にない特殊設定は、ゲームの更新で動作が変わる場合があります。
- Apex Legendsの設定変更は自己責任で行ってください。

## 開発

Node.js、Rust MSVC toolchain、Tauri 2の[Windows前提環境](https://v2.tauri.app/start/prerequisites/)が必要です。

```powershell
npm install
npm run tauri dev
npm run build
npm run tauri build
```

テストは`npm test`と`cargo test --manifest-path src-tauri/Cargo.toml`で実行できます。

## 権利表記

Apex Legends、EAおよび関連する名称・商標はElectronic Arts Inc.または各権利者に帰属します。本アプリは非公式のコミュニティ製ツールであり、EAまたはRespawn Entertainmentによる提携・承認・推奨を受けていません。EAの[コンテンツポリシー](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/)も参照してください。
