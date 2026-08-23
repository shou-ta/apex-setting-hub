# apex-setting-hub

Apexの起動オプションやcfgファイル（settings.cfg / videoconfig.txt）をブラウザ上でまとめて作成・編集できるツール
すべての処理はブラウザ内で完結するため、設定ファイルが外部サーバーに送信されません

[![GitHub stars](https://img.shields.io/github/stars/ユーザー名/リポジトリ名?style=social)](https://github.com/ユーザー名/リポジトリ名)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-yellow.svg)](https://buymeacoffee.com/ユーザー名)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-orange.svg)](https://ko-fi.com/ユーザー名)


## 機能一覧・予定

### 起動オプション

- よく使う起動オプションの一括生成（FPS上限、DX12、-novidなど）
- 現在使っているオプションの重複・不要コマンドチェック
```
+reticle_color "2147483648 2147483648 2147483648"
```


### cfgファイル編集 (settings.cfg / videoconfig.txt)
- ファイルをドラッグ＆ドロップして中身を直接編集
- 影の削除（軽量化）、カスタム解像度の設定
- ホイールジャンプ／ホイール前進の簡単バインド設定
- ワンキー回復（バッテリー・セルの直接割り当て）の追加
- 感度・DPIからの振り向き計算（cm表示）
```
bind_US_standard "F2" "fps_max 30" 0
bind_US_standard "F3" "fps_max 60" 0
bind_US_standard "F4" "fps_max 90" 0
bind_US_standard "F5" "fps_max 120" 0
bind_US_standard "F6" "fps_max 150" 0
bind_US_standard "F7" "fps_max 180" 0
bind_US_standard "F8" "fps_max 210" 0
bind_US_standard "F9" "fps_max 240" 0
bind_US_standard "F11" "cl_fovScale 1.55" 0
bind_US_standard "F12" "cl_fovScale 1.7" 0
```


### プリセット・共有
- 「軽量化」「競技向け」などの一括設定プリセット
- 設定のURL共有、SNS用まとめ画像の書き出し

## サポート・寄付
もしこのツールが役に立ったら、GitHubの Star やサポートをいただけると励みになります！

[GitHubで Star をつける](https://github.com/ユーザー名/リポジトリ名)
[Buy Me a Coffee で支援する](https://buymeacoffee.com/ユーザー名)
[Ko-fi で支援する](https://ko-fi.com/ユーザー名)

## 免責事項・権利表記
本ツールはファンメイドの非公式ツールです。
『Apex Legends』およびそのロゴ、アセット等の著作権および商標権は、Electronic Arts Inc. または Respawn Entertainment に帰属します。
