# APEX SETTING HUB

Windows向けのApex Legends設定管理アプリです。`settings.cfg`、`profile.cfg`、`videoconfig.txt`を読み込み、設定の確認・編集・バックアップを行えます。

## ダウンロード

最新のインストーラーは[GitHub Releases](https://github.com/shou-ta/apex-setting-hub/releases)から取得してください。

## 主な機能

- ゲームプレイ、マウス・キーボード、コントローラー、ビデオ、音声の設定を表示・編集
- キー割り当てとFPS／FOVのキー切り替え設定
- レティクルとレーザーサイトの色調整
- 設定ファイルのバックアップ、プリセット、ZIP書き出し
- 設定変更の差分確認後にゲームファイルへ適用

## 対象ファイル

- `%USERPROFILE%\Saved Games\Respawn\Apex\local\settings.cfg`
- `%USERPROFILE%\Saved Games\Respawn\Apex\profile\profile.cfg`
- `%USERPROFILE%\Saved Games\Respawn\Apex\local\videoconfig.txt`

標準フォルダが見つからない場合は、アプリ内の「フォルダを選択」からApexの設定フォルダを指定してください。OneDrive配下のSaved Gamesも検出します。

## 適用時の注意

- 設定ファイルを変更する前にバックアップを作成します。
- 差分を確認してから適用します。
- Apex起動中は設定の適用とバックアップの復元を行えません。
- 手動編集された未対応の設定行は維持します。
- 「影を消す」は`videoconfig.txt`の`setting.csm_enabled`を変更します。ゲームのアップデート後に動作が変わる可能性があります。

## 開発

必要な環境はNode.js、Rust MSVC toolchain、Tauri 2の[Windows前提環境](https://v2.tauri.app/start/prerequisites/)です。

```powershell
npm install
npm run tauri dev
npm run build
npm run tauri build
```

テストは`npm test`および`cargo test --manifest-path src-tauri/Cargo.toml`で実行できます。
