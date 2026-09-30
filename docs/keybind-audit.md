# キー割当の追加・確認記録（0.3.32）

ユーザー提供の日本語ゲーム画面を表示順の基準にした。通信14行、その他1行、プライベートマッチ・オブザーバー23行を表示する。既存3項目を含む31項目について保存コマンドを実装し、今回の追加は28項目。

## 参照資料

- [R5Flowstate kb_act.lst](https://github.com/R5Flowstate/s21-platform/blob/main/scripts/kb_act.lst): 基本操作、6種類のピン、チームチャット、スクリーンショットのコマンド。
- [公開PC設定](https://github.com/reDpz/apexcfg/blob/master/config_default_pc.cfg): 観戦操作の保存コマンドとテンキー名。
- [公開ユーザー設定](https://github.com/SeeminglyScience/dotfiles/blob/main/AppData/Roaming/apex-config/apex-config.cfg): ピン、テンキー、旧observer別名。
- [コマンド一覧](https://gist.github.com/VollRagm/8e56fcc8793f4d9bcbac8811c91c8b8f): observer highlight / player tagsのコマンド存在を照合。
- [R5Flowstate通信定義](https://github.com/R5Flowstate/s21-platform/blob/main/datatable/comms_actions.csv): 新しいピンのゲーム内部の種類を確認。ただしこのenum名とsettings.cfgの引数の同一性は確認できていない。
- [EAフォーラムのピン割当報告](https://forums.ea.com/discussions/apex-legends-technical-issues-en/bind-button-settings-cfg-issue/5646443): ATTACK/ATTACKINGで動作しないという報告。

公開設定・旧バージョンのスクリプトは保存構文の根拠であり、現在のゲームでの実動作確認ではない。実際のApex設定ファイルには書き込んでいない。

## 0.3.32時点で未確認だった10項目

合流、エリア回避、攻撃、敵の音の4種類のピンと、自動マップカメラ、高度ロック、Smoothcam、回転モード、時計回り、反時計回りの6項目。画面には指定順で残し、変更は無効にした。ゲーム内で割り当てたsettings.cfgとの照合待ち。内部enumから保存コマンドを推測して生成しない。

## 0.3.33: ユーザーのゲーム内割当結果を照合

2026-09-29、ユーザーが各項目をゲーム内で割り当てた後のローカルsettings.cfgを読み取って確認した。上記10項目をすべて編集可能にし、装備中の回復アイテムと移動アビリティの画面対応を追加・修正した。

| 項目 | 実ファイルのキー名 | 保存コマンド |
|---|---|---|
| 合流 | = | ping_specific_type REGROUP |
| エリア回避 | - | ping_specific_type AVOID |
| 攻撃 | 0 | ping_specific_type ATTACK |
| 敵の音 | 9 | ping_specific_type ENEMY_AUDIO |
| 自動マップカメラ | 8 | toggle_obs_auto_mapcam |
| 高度ロック | 7 | in_spec_altitude_lock |
| Smoothcam | ] | in_spec_toggle_smoothcam |
| 回転モード | p | roamingcam_togglerollmode |
| 時計回り | l | +spectatorRollClockwise |
| 反時計回り | k | +spectatorRollCounterClockwise |
| 装備中の回復アイテム | 4 | +scriptCommand4（押す） / +scriptCommand2（長押し） |
| 移動アビリティ | 空文字 | +dodge |

記号のキー表記はユーザーの日本語キーボード上の表記と異なる。実ファイルの保存名を根拠にし、キー名の置換は行わない。移動アビリティの空キー行は元の内容を保持して未割当として扱う。アプリから有効なキーを新規割当可能。

回復アイテムの押す・長押しの2行は1項目として表示し、追加・移動・解除時には両方を更新する。未知の長押しBindは保持し、単独の長押し回復コマンドは非表示にしない。外部変更の検出には両方の生の行を用いる。

テストでは匿名の最小Fixtureで全10項目の読込、回復アイテムの2行生成・移動・解除、2つ目のキー、未知行・CRLF・末尾NUL保持を確認。実ファイルへの書込みは行っていない。

## 入力と検証

ESCは取消専用。左右のShift/Ctrl/Alt、テンキー、記号、マウスボタン、ホイールを識別し、キー表示は大文字。NumLockによるテンキーの意味の変化に影響されないようphysical codeで判定する。ダイアログは操作名と「割り当てたいキーを押してください（ESCでキャンセル）」を表示。

JavaScript: 順序、テンキー、左右修飾キー、記号、ESC取消、リピート抑止、単一イベント採用、リスナー解除。Rust: コマンド対応、大文字読込、旧observer別名、新規Bind追加時の未知行・CRLF・末尾NUL保持、不正キー拒否。

ブラウザーで割当画面を目視確認し、ESCで元のキーが保持され、Aキーで割当・閉じることを確認した。
