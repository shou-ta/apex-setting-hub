# ゲーム内項目とローカル保存先の照合（2026-09-27）

## 全設定の横断デバッグ（v0.3.50 / 2026-09-30）

- `SETTING_IDS` 165件すべてに保存キーと保存ファイルの経路があることを検査した。
- 画面に表示される設定90行を、ユーザーの現在の `settings.cfg`、`profile.cfg`、`videoconfig.txt` と照合した。90行すべてが期待するファイルから読み取れ、43件の選択式の現在値が画面の選択肢と一致した。Configに存在しない行や、選択肢外の現在値はなかった。
- 保存値の探索で、`miles_mix` だけが誤ったファイルを参照していた。実データは `profile.cfg` にあるため、読込・保存先を修正し、同ファイルへの保存と他行保持を行う回帰テストを追加した。
- マウス感度、ADS、スコープ倍率、FOV、FPS、動画・音声、コントローラー、特殊動画設定、色設定、ユーザー確認済みBindについて、保存値の形式と既存の入力検証を再照合した。現在値に対する選択肢・ON/OFFの不一致は見つからなかった。
- `npm test` 35件と `cargo test --offline` 37件が成功した。`audio_mix` の保存先誤りを検出する回帰テストも成功した。
- 照合はファイルの読み取りのみで行い、Apexの設定ファイルは変更していない。公開資料やファイル照合はゲーム内での効果確認を代替しない。体力と弾薬のセリフ、ボイスチャット録音モードなど、変更前後のConfigが必要な対応は従来どおり確定扱いにしない。


## 保存値・選択肢の再監査（v0.3.29 / 2026-09-29）

公開UIリソースをアプリの選択肢・Rustの保存時検証と照合した。実際のApexファイルへの書込みは行っていない。

| 項目 | 照合結果・今回の修正 |
|---|---|
| トリガーのデッドゾーン | なし=0、デフォルト=30、中=64、高=128、最大=255。誤って0～4を保存していたため修正。未知の既存値は自動変換しない。 |
| 数字ADS | -1=視点感度と同じ、0～7=画面上の1～8。-1の選択肢・Diff・保存時検証を追加。通常の視点感度に-1は認めない。 |
| 数字スコープ別ADS | 2倍以降の-1=デフォルト。1倍は通常ADSと同じ保存キーを使用。シアのパッシブを含む8値を保持。 |
| ALCデッドゾーン | 0～50%。従来の上限100%を修正。 |
| ALC入力範囲の限界 | 1～30%。従来の0～100%を修正。 |
| ALC反応曲線 | 0～30。Rust側が500まで許可していたためUIと一致させた。 |
| ALC左右・上下の追加加速（通常／ADS） | 0～250。従来の上限500を修正。基本速度0～500、時間・ディレイ0～100%は一致。 |
| スプリント制御 | 0=押す、1=ホールド。オフ／オン表示を修正。 |
| ボタン配置・スティック・使う／リロード・しゃがみ・ADS切替・サバイバル・カーソル速度・反応曲線・通常デッドゾーン | 公開定義と現在の対応が一致。サバイバルの反転対応を維持。 |
| ダメージ表示・情報表示形式・ボタンヒント・ピン透明度・キル通知・ミニマップ・自動武器切替・オートラン・ジェットパック・マントル・配信／匿名・色覚・字幕サイズ | 公開定義と既存の対応が一致。マントルUIの番号2はMARKERSという識別子であり、日本語名の完全な一致は未確定。 |
| マウスの加速・反転・カーソル固定・照明 | オフ=0／オン=1と一致。感度とスコープ倍率は従来のConfig編集範囲を維持。 |
| 映像・音声 | 下記の実測資料・保存キー調査を再確認。公開独自環境の映像値はネイティブ処理で列挙されるため全値を再確定できない。音声録音には独自環境専用キーもあり、現行版のキーへ置き換える根拠にはしない。 |

参照：[controls.res](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/controls.res)、[ads_controls_gamepad.res](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/ads_controls_gamepad.res)、[advanced_look_controls.res](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/advanced_look_controls.res)、[hud_options.res](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/hud_options.res)、[controls_pc.res](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/controls_pc.res)、[panel_video.nut](https://github.com/R5Flowstate/s21-platform/blob/main/scripts/vscripts/ui/panel_video.nut)。S21由来の独自環境の公開資料であり、現行PC版での実機検証・公式の仕様保証ではない。

ALCの通常速度・時間はアプリ従来の細かい操作ステップを維持し、今回範囲のみ修正した。範囲外の既存保存値は数値表示とファイルに保持し、スライダーのつまみ位置だけを範囲に収める。スコープ倍率はゲームのメニュー範囲とConfig編集可能範囲を区別し、従来の0.1～20を維持。アーセナルの推定対応、UIレイアウト、スポットシャドウ詳細、音声録音モードなどの未確定項目は、この再監査で確定扱いにしていない。

匿名Fixtureで、全トリガー値・ADSの-1・シアの値・ALC境界値と範囲外拒否・未知行・CRLF・末尾NULの保持を検証する。

対象はユーザー提供の日本語ゲーム画面と、読み取り専用で調べた `settings.cfg`、`profile.cfg`、`videoconfig.txt`。[EA公式のPC設定一覧](https://help.ea.com/en/articles/apex-legends/best-settings-pc/)と[EA公式のPC仕様・映像設定](https://www.ea.com/en-au/games/apex-legends/about/pc-system-requirements)も項目名と選択肢の確認に使った。EAの説明にCVar対応表はない。値の一致だけで全選択肢の意味は確定しない。下表の「表示のみ」は現在値に対応する保存キーを確認したが、他の選択肢を安全に生成する情報が不足している項目。実ファイルへの書き込みによる調査は行っていない。

| ゲーム内項目 | 結果 | 照合した保存先・理由 |
|---|---|---|
| ダメージ発生表現 | 編集可能 | `damage_indicator_style_pilot`。現在値2=3D、0=2D、1=2D＋3D。[公開された設定と画面表記](https://pastebin.com/hkT9a3Mq)で照合。 |
| Xマークダメージ表現 | 編集可能 | `hud_setting_damageIndicatorStyle`。現在値 0 がオフ。0/1/2 の意味を[実際の設定を公開した利用者](https://github.com/rikarsen/apex-config/blob/main/autoexec.cfg)と照合。 |
| ダメージ値 | 編集可能 | `hud_setting_damageTextStyle`。0=オフ、1=スタック、2=フローティング、3=両方を[設定例](https://github.com/rikarsen/apex-config/blob/main/autoexec.cfg)と照合。 |
| レティクル | RGB 0～255を編集可能 | `reticle_color` はRGBの3値を保存。[利用者が公開した設定例](https://github.com/rikarsen/apex-config/blob/main/autoexec.cfg)と[デフォルト値を含む設定例](https://github.com/V3nilla/Apex-Legends-Config-And-Tweaks/blob/main/reticles.cfg)を照合。プリセット、RGBスライダー、カラーピッカーに対応。現在の特殊な保存値は色を選び直すまで保持。 |
| レーザーサイト | RGB 0～255を編集可能 | `laserSightColorCustomized` でデフォルト／カスタマイズ、`laserSightColor` はRGBの3値を保存でき、実ファイルの数値65280はRGB緑として表示する。[利用者の設定例](https://github.com/rikarsen/apex-config/blob/main/autoexec.cfg)。プリセット、RGBスライダー、カラーピッカーに対応。既存の数値表記は変更するまで保持。 |
| オートラン | 編集可能 | `player_setting_stickysprintforward`。 |
| ジェットパック/滑空操作 | 編集可能 | `toggle_on_jump_to_deactivate`。保存値 0 が画面のホールドと一致。 |
| マントルブーストの操作切り替え | 編集可能 | `mantle_boost_input_setting`。0=オフ、1=ジャンプ、2=しゃがみ、3=移動アビリティ。[利用者が公開したConfigの対応表](https://github.com/johnpac88/apex-legends-autoexec/blob/23ee084f1e702c31f2a8764e41096ad95a1ba663/autoexec.cfg)で照合。R5Flowstateは独自実装なので補助資料としてのみ使用。提供画面の2=しゃがみとも一致。 |
| マントルブーストUI | 編集可能 | `mantle_boost_ui_setting`。0=オフ、1=小、2=プロンプト非表示、3=フル。[公開Configの対応表](https://github.com/johnpac88/apex-legends-autoexec/blob/23ee084f1e702c31f2a8764e41096ad95a1ba663/autoexec.cfg)と提供画面の0=オフを照合。UIの選択順はフル→プロンプト非表示→小→オフとする。 |
| 情報表示形式 | 編集可能 | `hud_setting_showMedals`。現在値0=コンパクト、1=デフォルト。[設定を公開した利用者](https://pastebin.com/hkT9a3Mq)と照合。 |
| チュートリアルシステム | 編集可能 | `player_setting_tutorialization`。0=オフ、1=オート、2=オン。[公開Configの注釈](https://github.com/johnpac88/apex-legends-autoexec/blob/23ee084f1e702c31f2a8764e41096ad95a1ba663/autoexec.cfg)で照合。単純な0/1トグルではない。 |
| エネルギーアモの表示 | 編集可能 | `hud_setting_energyAmmoDisplay`。0 がストック数。 |
| 体力と弾薬のポップアップ | 編集可能 | `player_setting_lowammo_setting`。保存値2と提供された画面の「オン」を照合。0=オフ、1=制限、2=オンとして選択可能。[ゲーム画面での無効化報告](https://www.reddit.com/r/apexlegends/comments/1gn25z3)も参照。1の対応は未実機検証のため、Apply前にDiff確認が必要。 |
| アーセナルマップ+HUDアイコン | 編集可能・一部推定 | `player_setting_arsenals_maphudidentifiers`。2=大は提供画面と実ファイルで確認。0=小、1=中は[公開されたゲーム内選択肢の順序](https://b-gamers.net/apex-settings/)と3段階の表示から推定。オフではなく小・中・大。小・中は実機未検証であることを画面に表示する。[別利用者のConfig](https://github.com/kerubim-code/APEX-SETTINGS/blob/68c8402b0b18ed7b822bf021d097937292a6053c/profile/profile.cfg)にも0の保存例はあるが、これだけでは意味を確定できない。 |
| ピン透明度 | 編集可能 | `hud_setting_pingAlpha`。1.0=デフォルト、0.5=フェード。[設定を公開した利用者](https://pastebin.com/hkT9a3Mq)と照合。 |
| パフォーマンス表示 | 編集可能 | `net_netGraph2`。 |
| 色覚特性モード | 編集可能 | `colorblind_mode`。0=オフ、1=赤、2=緑、3=青の色覚モード。[設定を公開した利用者](https://pastebin.com/hkT9a3Mq)と照合。 |
| 体力と弾薬のセリフ | 表示のみ | `player_setting_gamestateawareness_callouts`。保存値 2 がオンと一致。 |
| 字幕サイズ | 編集可能 | `cc_text_size`。0=普通、1=大、2=特大。[ゲームCVarダンプ](https://gist.github.com/VollRagm/8e56fcc8793f4d9bcbac8811c91c8b8f)の列挙値と照合。 |
| 自動ミュート | 編集可能 | `cl_comms_filter`。保存値 -1 が全員不可と一致。 |
| 動画配信モード | 編集可能 | `hud_setting_streamerMode`。0=オフ、1=キラーのみ、2=全員。[設定を公開した利用者](https://pastebin.com/hkT9a3Mq)と照合。 |
| 使用状況のシェア | 編集可能 | `pin_opt_in` の0/1。ローカル値1と提供画面の「有効」が一致し、[利用者が公開した設定](https://github.com/V3nilla/Apex-Legends-Config-And-Tweaks/blob/main/autoexec.cfg)に0でPINテレメトリーを無効化とある。その他のテレメトリー設定は変更しない。 |
| 縦横比 | 導出表示 | 解像度の幅と高さから計算。独立した保存キーはない。 |
| 明るさ | 編集可能 | `setting.gamma`。実測表の0%=1.75、50%=1.00、100%=0.25から `1.75 - 0.015 × 明るさ%` と換算。[ゲーム内操作とConfigを比較した実測表](https://gebiboulog.blog.fc2.com/blog-entry-185.html)。 |
| スプリント時の視点のゆれ | 編集可能 | `sprint_view_shake_style`。1 が小と一致。 |
| UIレイアウトモード | 3択で編集可（0.3.34） | `ui_layout_mode`。ユーザーのゲーム内切替後に実ファイルを読み取り、オート＝0、フル＝2、コンパクト＝1を確認。詳細は追加調査欄。 |
| NVIDIA Reflex | 編集可能 | `gfx_nvnUseLowLatency` と `gfx_nvnUseLowLatencyBoost`。1/1 が「有効＋ブースト」と一致。 |
| 解像度適応の目標fps | 編集可能 | `setting.dvs_enable` は0 FPSで0、1～100 FPSで1。フレーム時間は `min=round(950000 / FPS)`、`max=round(980000 / FPS)`。0へ戻すと時間値を保持。[50/100 FPSの実測表](https://gebiboulog.blog.fc2.com/blog-entry-185.html)。有効化時はTSAAも有効化。 |
| アンチエイリアス | 編集可能 | `setting.mat_antialias_mode`。0=なし、12=TSAA。旧実装の1は誤り。[2026年の実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)で修正。 |
| テクスチャストリーミング割り当て | 編集可能 | `setting.stream_memory`。0/160000/300000/600000/1000000/2000000/3000000。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と[EAフォーラムでの実測報告](https://forums.ea.com/discussions/apex-legends-feedback-en/texture-streaming-budget-options/12074233)で照合。 |
| テクスチャフィルタリング | 編集可能 | `setting.mat_forceaniso`。0=バイリニア、1=トライリニア、2/4/8/16=異方性。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)で0の欠落を修正。 |
| アンビエントオクルージョン品質 | 編集可能 | `setting.ssao_quality`。0～4を[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| サンシャドウ範囲 | 編集可能 | `setting.csm_coverage`。1=低、2=高。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| サンシャドウディテール | 編集可能 | `setting.csm_cascade_res`。512=低、1024=高。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| スポットシャドウディテール | 編集可能 | `setting.shadow_depth_dimen_min`・`setting.shadow_depth_upres_factor_max`・`setting.shadow_enable`を一組で変更。対応表は下記の再監査を参照。 |
| ダイナミックスポットシャドウ | 編集可能 | `setting.shadow_maxdynamic`。0=無効、4=有効。旧実装の1は誤り。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)で修正。 |
| モデルディテール | 編集可能 | `setting.r_lod_switch_scale`。0.6=低、0.8=中、1=高。[実測表](https://gebiboulog.blog.fc2.com/blog-entry-185.html)。 |
| マップ詳細 | 編集可能 | `setting.map_detail_level`。1=低、2=高。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| エフェクトディテール | 編集可能 | `setting.particle_cpu_level`。0=低、1=中、2=高。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| 衝撃マーク | 編集可能 | `setting.r_decals` と `setting.r_createmodeldecals` の組。無効=(0,0)、低=(256,0)、高=(256,1)。[実測表](https://gebiboulog.blog.fc2.com/blog-entry-185.html)と[ゲーム内切替の報告](https://steamcommunity.com/app/1172470/discussions/0/5916017125834262607/)。 |
| ラグドール | 編集可能 | `setting.cl_ragdoll_maxcount`。0=低、4=中、8=高。[実測表](https://note.com/ebi_suuuuuu/n/nd51daeac3755)と照合。 |
| 出力デバイス | 未確認 | `miles_output_device` は存在する。Windowsの実デバイスとの対応・選択肢取得が未実装。 |
| オーディオミックス | 編集可能 | `profile.cfg` の `miles_mix`。1 がフォーカスと一致。 |
| 出力設定 | 編集可能 | `sound_num_speakers`。2=ステレオ、6=5.1、8=7.1。 |
| オーディオ詳細オプション | 一部編集可能 | サブ画面は未提供。3ファイルで確認できる会話・音楽・効果音の音量、非アクティブ再生、音楽抑制、ボイスチャットを展開して編集。 |
| ボイスチャット入力デバイス | 未確認 | `voice_input_device` は存在する。Windowsの実デバイスとの対応・選択肢取得が未実装。 |
| ボイスチャット録音モード | 表示のみ | `VoiceChatMode` の0がプッシュと一致。`voice_vox` との関係は未検証。 |
| オープン設定時のマイク録音レベル | 編集可能 | `voice_quiet_threshold`。画面の1300と保存値が一致。 |

## キー割当で変更不可だった行

| ゲーム内項目 | 結果 | 理由 |
|---|---|---|
| 射撃モード切り替え | 編集可能 | `+scriptCommand3` を実ファイルのB割当と照合。 |
| サバイバルアイテムを装備 | 編集可能 | `+scriptCommand6` をLALT割当と照合。 |
| キャラクターのユーティリティーアクション | 編集可能 | `+scriptCommand5` をH割当と照合。 |
| レジェンドアップグレード/エモートホイール/ありがとう | 編集可能 | `chat_wheel` をF1割当と照合。 |
| 移動アビリティ | 未確認 | 専用コマンドを一意に特定できない。 |
| アクションボタンの別設定 | 未確認 | 既存のアクション割当が複数コマンドを束ねており、別キー用の構文が未確認。 |
| 照準器エイム（切り替え） | 未確認 | `+zoom` はホールド側に移した。切り替え用コマンドは未確認。 |
| 装備中の回復アイテムを使用 | 未確認 | `+scriptCommand4` と同一キーの長押し `+scriptCommand2` が組になっている。現在のキー置換処理では両方を保つ構文を生成できない。 |
| ピン（敵発見）/（移動）/（アイテム探索）/（防衛） | 未確認 | 通常の `+ping` とは別の各コマンドを特定できない。 |

この監査の「未確認」は、ゲーム内で変更できないという意味ではない。3ファイルを安全に編集するための保存キー・値・コマンドの対応が未確定という意味。

## 特殊機能：透明クロスヘア

特殊機能のボタンは `profile.cfg` の `reticle_color` に `2147483648 2147483648 2147483648` を設定する。既存ファイルにある符号付きの `-2147483648 -2147483648 -2147483648` も同じ特殊設定としてUIに表示する。[2025年の実演](https://www.youtube.com/watch?v=Snhy6CfY7Sk)では黒い照準として紹介されており、[利用者の報告](https://www.reddit.com/r/apexlegends/comments/1t2tz81/finally_this_sight_is_useable/)でもこの値が使われている。完全に透明になるかどうかは照準器やゲームの版で異なる可能性がある。通常RGBの入力範囲からは分離し、Diff・Applyの安全処理を通す。

## PADのALCスコープ倍率と数字感度（2026-09-29）

`controller_custom_aim` (`gamepad_custom_enabled`) と `controller_alc_per_optic` (`gamepad_use_per_scope_sensitivity_scalars`) は別々のフラグとして扱う。ALC本体がオフでも後者がオンなら、DashboardはALCの8つの保存倍率（シアのパッシブを含む）を表示する。Controller画面でも本体をオンにせず倍率の確認・変更が可能。オフ時には倍率を隠すが、保存値は変更しない。

- [自身の設定手順と画面を示す日本語の報告（2024-05-23）](https://note.com/foodkill/n/n4aafe8aeb69c)：ALC内のスコープ設定をオンのままALC本体をオフにし、数字ADSを1にする手順。
- [射撃訓練場で調整した本人の報告（2023）](https://www.reddit.com/r/ApexConsole/comments/17bmqst/if_youre_not_using_the_alc_per_optics_glitch_wyd/)：ALCオフでも1x/2x/3xを個別調整して使用。
- [2026年の本人によるPS5検証](https://www.reddit.com/r/ApexConsole/comments/1uw55bh/possible_alc_bleedthrough_findings_on_ps5/)：ALCオフのスコープ設定についての報告。PCの現行版の実機確認や公式の仕様保証ではない。

表示は保存倍率そのもの。数字ADS × 倍率を別の数字感度と同等とする換算は行わない。元の数字ADS、反応曲線、倍率は独立して残す。他のALCパラメータも全て数字感度へ反映されるとは断定しない。

## コントローラー：ボタン配置とアクション／リロード（2026-09-29）

- `gamepad_use_type`: 0=ホールドで使う／タップでリロード、1=タップで使う／ホールドでリロード、2=タップで使う＆リロード。[抽出されたConVarの説明](https://gist.github.com/VollRagm/8e56fcc8793f4d9bcbac8811c91c8b8f)に明記。
- `gamepad_button_layout`: 0=デフォルト、1=クイックジャンパー、2=ボタンパンチャー、3=エボリューション、4=グレネーダー、5=ニンジャ、6=カスタム。[作者が公開した設定の番号対応](https://pastebin.com/hkT9a3Mq)と、[EAのプリセット一覧](https://help.ea.com/en/articles/apex-legends/pc-and-controller-settings/)を照合。
- 公開されたS21由来の[menu_gamepad_layout.nut](https://github.com/R5Flowstate/s21-platform/blob/main/scripts/vscripts/ui/menu_gamepad_layout.nut)のプリセット列挙およびカスタム番号6、[sh_gamepad_utility.gnut](https://github.com/R5Flowstate/s21-platform/blob/main/scripts/vscripts/sh_gamepad_utility.gnut)の選択番号からのプリセット配列読込とuse/reloadモード分岐も確認。これは独自環境であり、現行PC版の実機検証ではない。

アプリは各保存値を選択式で変更する。カスタム選択は保存済みの個別配置を再利用し、`gamepad_custom_pilot`等を作り替えない。保存値の範囲、未知行、CRLF、末尾NUL、個別配置の保持をFixtureで検証。未知の番号は自動で別のプリセットに置き換えない。

## コントローラー：サバイバルスロットとメニューカーソル（2026-09-29）

[S21由来の設定画面リソース](https://github.com/R5Flowstate/s21-platform/blob/main/resource/ui/menus/panels/controls.res)で以下を確認した。

- `gamepad_toggle_survivalSlot_to_weaponInspect`: 1=武器を見る（サバイバルスロットボタンはオフ）、0=サバイバルスロット（オン）。アプリは左オフ／右オンとして保存値を逆対応する。Diffにも同じオン／オフを表示する。[ゲームパッド処理](https://github.com/R5Flowstate/s21-platform/blob/main/scripts/vscripts/sh_gamepad_utility.gnut)の分岐も一致。
- `gameCursor_velocity`: スライダー最小1300、最大4300、ステップ100。アプリでもこの範囲を採用し、保存値を表示する。ゲーム内で表示されない割合への換算はしない。`profile.cfg`の`gameCursor_Velocity`を編集する。範囲外の既存値は読み取り時に保持し、操作するまで書き換えない。

公開リソースは独自環境のS21由来で、現行PC版のゲーム内動作を実機検証したものではない。Fixtureで両設定の変更、値の検証、未知行・CRLF・末尾NULの保持を確認する。

## 全体デバッグと再監査（v0.3.31 / 2026-09-29）

### 今回編集可能にした項目

- 自動ミュート: -1=ミュートしない、1=フレンド以外、0=全員。ゲームの通信許可フィルターとミュート対象は逆の表現になる。[作者の番号付きConfig](https://pastebin.com/hkT9a3Mq)と[別作者のConfig](https://github.com/johnpac88/apex-legends-autoexec/blob/23ee084f1e702c31f2a8764e41096ad95a1ba663/autoexec.cfg)を照合。-1は提供スクリーンショットと一致。中間項目の日本語は対象を明確にする「フレンド以外」を使用。
- 出力設定: [抽出されたConVarの説明](https://gist.github.com/CasualX/197e6dcffa9a9f28fee9ff50012d9e11)と[別の抽出資料](https://gist.github.com/VollRagm/8e56fcc8793f4d9bcbac8811c91c8b8f)で2=ステレオ、6=5.1、8=7.1と明記。他の値は受け付けない。Windowsのデバイス自体のチャンネル設定は変更しない。
- スポットシャドウ: [作者が公開した中国語の設定表](https://www.bilibili.com/opus/1079915745013399554)では最小解像度と最大解像度倍率の両方を指定している。無効=(0,0,0)、低=(128,2,1)、高=(256,2,1)、最高=(512,3,1)。順番は最小解像度／倍率／描画有効フラグ。既存の組合せが一致しなければ「現在の個別設定」と表示し、操作するまで保持。3フィールドのDiff・取消に対応。公開表に基づく実装で、現行ゲームでの実機検証は未実施。

### 修正と検証

- 1と1.000000、0.6と0.600000のような同じ数値を選択肢・選択バー・PADの有効状態・Diff表示で一致させる。欠損値やRGBを数値に変換しない。
- Configキーの大小文字が異なっても同じ設定として取得・更新。重複は最後の値を読み、既存のキー表記、コメント、改行、NULを保持。
- WindowsのRead-onlyコピーで古いバックアップが削除できない問題を修正。元の属性はmanifestに残し、コピーはWritableにする。既存バックアップのRead-onlyも保持上限処理で解除。同一ミリ秒のバックアップIDも衝突しない。
- バックアップ復元時に古い差分プレビューを閉じる。Replaceの削除失敗時に元の属性を戻し、一時ファイルを片付ける。
- 追加テストは匿名Fixtureだけを使用。実Apexファイルへ書き込まない。

### 変更前後Configの提供待ち

体力と弾薬のセリフ、UIレイアウトモード、ボイスチャット録音モードの3件。英語・日本語・中国語で保存キーを再検索したが、各選択肢との値対応を確定できなかった。VoiceChatModeの検索結果にはWorld of Warcraft用資料が多く、Apexの証拠として採用しない。R5Flowstateの音声設定は独自のTalkIsStreamを使用しており現行ApexのVoiceChatModeへそのまま移せない。ユーザーは後で変更前後Configを提供する予定。対応が未確認の行は表示のみを維持する。

### UIレイアウト追加調査（2026-09-29）

- [EA公式 Ampedパッチノート](https://www.ea.com/games/apex-legends/apex-legends/news/amped-patch-notes): PCのHandheld/Compact UIとFull・Compact・Autoの3択を確認。コンパクトは小画面のPCハンドヘルド端末で遊びやすくする目的。画面全体が小さくなる設定とは説明しない。
- [EA公式 Marked Designer’s Notes](https://forums.ea.com/blog/apex-legends-game-info-hub-en/marked-designer%E2%80%99s-notes/13607666): 武器・アタッチメントの情報表示更新に関して、Compact UIでゲーム内の表示情報量を減らせると説明。
- 現在のローカルsettings.cfgには `ui_layout_mode "0"`。元のゲーム画面のオート選択と一致。Full/Compactの番号は公開資料から確定できず、ユーザーにゲーム内切替・適用後のモードを確認中。数字の順番を推測して実装しない。
- 各レイアウトの見やすさは画面サイズ・解像度・好みに依存する。Compactで省略される情報が必要な場合はFullへ戻す。FPS向上の定量的な根拠は今回の公式資料にはない。
- 2026-09-30、ユーザーがゲーム内でフルへ変更・適用した旨を確認後、ローカルsettings.cfgを再読取。`ui_layout_mode "2"` を確認し、フル＝2を確定。コンパクトは引き続き切替結果の確認待ち。
- 同日、ユーザーがコンパクトへ変更・適用した後に `ui_layout_mode "1"` を確認。オート＝0、フル＝2、コンパクト＝1を確定し、0.3.34でゲーム画面順の3択に対応。表示のみの制限を解除し、既存の差分確認・Applyを使用する。内部IDは互換性のため維持。匿名Fixtureで重複行の有効値だけの変更、未知行・コメント・CRLF・末尾NUL保持、不正値拒否、元に戻すと変更数が0になることを確認。実ファイルは読み取りのみ。

- 同じキーの重複Bindを編集したとき、画面で1行だけ消えて残りが残る問題を修正。保存処理と同じく対象キーの全行を置換する。最初の行だけを比較して変更を取り消さない。
- 検証結果: JavaScript 21件、Rust 27件が成功。TypeScript型検査とWindows NSISビルドが成功。
