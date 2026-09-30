export type GameChoice = { value: string; ja: string; en: string };
export type GameRow = { ja: string; en: string; id?: string; control?: 'toggle' | 'inverse-toggle' | 'step' | 'volume' | 'fov' | 'resolution' | 'display' | 'optic' | 'mouse-ads' | 'controller-optic' | 'controller-alc' | 'select' | 'choice' | 'spot-shadow' | 'observed' | 'bind' | 'audio-details' | 'derived-aspect' | 'threshold' | 'reflex' | 'brightness' | 'adaptive-fps' | 'impact-marks' | 'color'; options?: string[]; choices?: GameChoice[] };
export type GameGroup = { ja: string; en: string; rows: GameRow[] };
const row = (ja: string, en: string, id?: string, control?: GameRow['control'], options?: string[], choices?: GameChoice[]): GameRow => ({ ja, en, id, control, options, choices });
const choice = (value: string, ja: string, en: string): GameChoice => ({ value, ja, en });
const numbered = Array.from({ length: 8 }, (_, index) => choice(String(index), String(index + 1), String(index + 1)));
export const controllerAdsChoices = [choice('-1','視点感度と同じ','Same as Look Sensitivity'), ...numbered];
export const controllerOpticChoices = [choice('-1','デフォルト','Default'), ...numbered];

// Order and Japanese names were transcribed from the user's current in-game screenshots.
// Rows without a verified local-file mapping remain visible but cannot stage an edit.
export const gameCatalog: Record<string, GameGroup[]> = {
  gameplay: [
    { ja: '戦闘', en: 'Combat', rows: [
      row('ダメージ発生表現','Damage Indicator','damage_indicator','choice',undefined,[choice('0','2D','2D'),choice('1','2D＋3D','2D + 3D'),choice('2','3D','3D')]), row('Xマークダメージ表現','Crosshair Damage Feedback','crosshair_damage','choice',undefined,[choice('0','オフ','Off'),choice('1','Xマーク','X Mark'),choice('2','Xマーク＋シールド','X Mark + Shield')]),
      row('ダメージ値','Damage Numbers Format','damage_text','choice',undefined,[choice('0','オフ','Off'),choice('1','スタック','Stacking'),choice('2','フローティング','Floating'),choice('3','両方','Both')]), row('レティクル','Reticle','reticle_color','color'), row('レーザーサイト','Laser Sight','laser_customized','color'),
      row('敵の体力ゲージ','Enemy Health Bar','hud_enemy_health','toggle'), row('敵のハイライト','Enemy Highlight','hud_enemy_highlight','toggle'),
      row('弾薬切れ時の武器自動切り替え','Auto Cycle Weapon on Empty','auto_cycle_empty','toggle'),
      row('被ダメージ時にデスボックスまたはクラフトメニューを閉じる','Close Menus on Damage','close_deathbox_on_damage','toggle'),
      row('チェーンヒーリング','Chain Healing','chain_heal','toggle'),
    ]},
    { ja: '移動', en: 'Movement', rows: [
      row('常時スプリント','Always Sprint','auto_sprint','toggle'), row('スプリント制御','Sprint Control','hold_sprint','choice',undefined,[choice('0','押す','Press'),choice('1','ホールド','Hold')]),
      row('オートラン','Auto Run','auto_run','toggle'), row('ジェットパック/滑空操作','Jetpack / Glide Control','jetpack_toggle','choice',undefined,[choice('0','ホールド','Hold'),choice('1','切り替え','Toggle')]),
      row('マントルブーストの操作切り替え','Mantle Boost Input','mantle_input_observed','choice',undefined,[choice('1','ジャンプ','Jump'),choice('2','しゃがみ','Crouch'),choice('3','移動アビリティ','Movement Ability'),choice('0','オフ','Off')]), row('マントルブーストUI','Mantle Boost UI','mantle_ui_observed','choice',undefined,[choice('3','フル','Full'),choice('2','プロンプト非表示','Hide Prompts'),choice('1','小','Minimal'),choice('0','オフ','Off')]),
    ]},
    { ja: 'HUD UI', en: 'HUD UI', rows: [
      row('情報表示形式','Information Display','information_display','choice',undefined,[choice('0','コンパクト','Compact'),choice('1','デフォルト','Default')]), row('チュートリアルシステム','Tutorial System','tutorial_observed','choice',undefined,[choice('0','オフ','Off'),choice('1','オート','Auto'),choice('2','オン','On')]),
      row('ボタンヒント','Button Hints','hud_button_hints','toggle'), row('エネルギーアモの表示','Energy Ammo Display','energy_ammo_percent','choice',undefined,[choice('0','ストック数','Stack Count'),choice('1','パーセンテージ','Percentage')]),
      row('体力と弾薬のポップアップ','Health and Ammo Popups','health_ammo_popups','choice',undefined,[choice('0','オフ','Off'),choice('1','制限','Limited'),choice('2','オン','On')]), row('ホップアップのポップアップ表示','Hop-up Popup','hud_hopup','toggle'),
      row('キル通知','Kill Feed','hud_obituary','toggle'), row('ミニマップ回転','Minimap Rotation','hud_minimap_rotate','toggle'),
      row('アーセナルマップ+HUDアイコン','Arsenal Map and HUD Icons','arsenal_icons','choice',undefined,[choice('0','小','Small'),choice('1','中','Medium'),choice('2','大','Large')]), row('ピン透明度','Ping Transparency','ping_opacity','choice',undefined,[choice('1.0','デフォルト','Default'),choice('0.5','フェード','Faded')]),
      row('オフスクリーン時のポートレート','Offscreen Portraits','show_offscreen_portrait','toggle'),
      row('パフォーマンス表示','Performance Display','performance_display','toggle'),
    ]},
    { ja: 'アクセシビリティ', en: 'Accessibility', rows: [
      row('色覚特性モード','Color Blind Mode','colorblind','choice',undefined,[choice('0','オフ','Off'),choice('1','赤色覚異常','Protanopia'),choice('2','緑色覚異常','Deuteranopia'),choice('3','青色覚異常','Tritanopia')]), row('体力と弾薬のセリフ','Health and Ammo Voice Lines','voice_lines_observed','observed',undefined,[choice('2','オン','On')]),
      row('字幕','Subtitles','subtitles','toggle'), row('字幕サイズ','Subtitle Size','subtitle_size','choice',undefined,[choice('0','普通','Normal'),choice('1','大','Large'),choice('2','特大','Huge')]),
    ]},
    { ja: 'プライバシー', en: 'Privacy', rows: [
      row('自動ミュート','Auto Mute','auto_mute_observed','choice',undefined,[choice('-1','全員不可（ミュートしない）','Nobody'),choice('1','フレンド以外','Non-friends'),choice('0','全員','Everybody')]), row('動画配信モード','Streamer Mode','hud_streamer','choice',undefined,[choice('0','オフ','Off'),choice('1','キラーのみ','Killer Only'),choice('2','全員','All')]),
      row('匿名モード','Anonymous Mode','anonymous_mode','toggle'), row('使用状況のシェア','Share Usage Data','share_usage','toggle'),
    ]},
  ],
  input: [
    { ja: 'マウス', en: 'Mouse', rows: [
      row('マウス感度','Mouse Sensitivity','sensitivity','step'), row('エイム時マウス感度倍率','ADS Mouse Sensitivity Multiplier','ads_sensitivity','mouse-ads'), row('スコープ別エイム感度','Per Optic ADS Sensitivity','per_optic','optic'),
      row('マウス加速','Mouse Acceleration','mouse_acceleration','toggle'), row('マウス反転','Invert Mouse','invert_mouse','toggle'),
      row('マウスカーソルをゲーム画面に固定','Constrain Mouse Cursor to Game','mouse_clamp','toggle'),
      row('ライティングエフェクト','Lighting Effects','lighting_effects','toggle'),
    ]},
    { ja: '移動', en: 'Movement', rows: [
      row('前進','Move Forward','move_forward','bind'), row('後退','Move Back','move_back','bind'),
      row('左へ移動','Move Left','move_left','bind'), row('右へ移動','Move Right','move_right','bind'),
      row('スプリント/ズーム切り替え','Sprint / Toggle Zoom','sprint','bind'), row('ジャンプ','Jump','jump','bind'),
      row('しゃがみ（切り替え）','Crouch (Toggle)','crouch_toggle','bind'), row('しゃがみ（ホールド）','Crouch (Hold)','crouch_hold','bind'),
      row('移動アビリティ（ダブルジャンプ/ダッシュ/滑空/ジェットパック）','Movement Ability','movement_ability','bind'),
    ]},
    { ja: '武器・アビリティ', en: 'Weapons and Abilities', rows: [
      row('戦術アビリティ','Tactical Ability','tactical','bind'), row('アルティメットアビリティ','Ultimate Ability','ultimate','bind'),
      row('アクション/拾う','Interact / Pick Up','interact','bind'), row('アクションボタンの別設定','Alternate Interact','interact_alt','bind'),
      row('インベントリ（切り替え）','Inventory','inventory','bind'), row('マップ（切り替え）','Map','map','bind'),
      row('攻撃','Fire','attack','bind'), row('射撃モード切り替え','Toggle Fire Mode','fire_mode','bind'),
      row('照準器エイム（切り替え）','Aim (Toggle)','aim_toggle','bind'), row('照準器エイム（ホールド）','Aim (Hold)','aim','bind'),
      row('格闘','Melee','melee','bind'), row('リロード','Reload','reload','bind'),
      row('武器切り替え','Cycle Weapons','weapon_cycle','bind'), row('武器1を装備','Equip Weapon 1','equip_weapon_1','bind'),
      row('武器2を装備','Equip Weapon 2','equip_weapon_2','bind'), row('武器を収める','Holster Weapons','holster_weapon','bind'),
      row('グレネード装備','Equip Grenade','grenade','bind'), row('サバイバルアイテムを装備','Equip Survival Item','survival_item','bind'),
      row('装備中の回復アイテムを使用','Use Selected Health Item','selected_health','bind'), row('注射器を使用','Use Syringe','syringe','bind'),
      row('医療キットを使用','Use Med Kit','med_kit','bind'), row('シールドセルを使用','Use Shield Cell','shield_cell','bind'),
      row('シールドバッテリーを使用','Use Shield Battery','shield_battery','bind'), row('フェニックスキットを使用','Use Phoenix Kit','phoenix_kit','bind'),
      row('キャラクターのユーティリティーアクション','Character Utility Action','character_utility','bind'), row('武器を見る','Inspect Weapon','inspect_weapon','bind'),
    ]},
    { ja: '通信', en: 'Communication', rows: [
      row("レジェンドアップグレード/エモートホイール/ありがとう","Legend Upgrade / Emote Wheel / Thank You","legend_wheel",'bind'),
      row("ピン","Ping","ping",'bind'),
      row("ピン（敵発見）","Ping (Enemy)","ping_enemy",'bind'),
      row("ピン（移動）","Ping (Going)","ping_going",'bind'),
      row("ピン（アイテム探索）","Ping (Looting)","ping_looting",'bind'),
      row("ピン（防衛）","Ping (Defending)","ping_defending",'bind'),
      row("ピン（監視）","Ping (Watching)","ping_watching",'bind'),
      row("ピン（何者かの痕跡）","Ping (Someone Has Been Here)","ping_visited",'bind'),
      row("ピン（合流）","Ping (Regroup)","ping_regroup",'bind'),
      row("ピン（エリア回避）","Ping (Avoid Area)","ping_avoid",'bind'),
      row("ピン（攻撃）","Ping (Attack)","ping_attack",'bind'),
      row("ピン（敵の音）","Ping (Enemy Audio)","ping_audio",'bind'),
      row("プッシュ（ホールド）/マイクの切り替え","Push (Hold) / Toggle Microphone","push_to_talk",'bind'),
      row("チームにメッセージ（マッチ中）","Message Team (In Match)","message_team",'bind'),
    ]},
    { ja: 'その他', en: 'Other', rows: [
      row('スクリーンショット','Screenshot','screenshot','bind'),
    ]},
    { ja: 'プライベートマッチ・オブザーバー', en: 'Private Match Observer', rows: [
      row("プレイヤー1を観戦","Spectate Player 1","spectate_player_1",'bind'),
      row("プレイヤー2を観戦","Spectate Player 2","spectate_player_2",'bind'),
      row("プレイヤー3を観戦","Spectate Player 3","spectate_player_3",'bind'),
      row("次のプレイヤーを観戦","Spectate Next Player","spectate_next",'bind'),
      row("前のプレイヤーを観戦","Spectate Previous Player","spectate_previous",'bind'),
      row("次のチームを観戦","Spectate Next Team","spectate_next_team",'bind'),
      row("前のチームを観戦","Spectate Previous Team","spectate_previous_team",'bind'),
      row("最も近いプレイヤーを観戦","Spectate Closest Player","spectate_closest_player",'bind'),
      row("最も近い敵を観戦","Spectate Closest Enemy","spectate_closest_enemy",'bind'),
      row("キルリーダーを観戦","Spectate Kill Leader","spectate_kill_leader",'bind'),
      row("最後のアタッカーを観戦","Spectate Last Attacker","spectate_last_attacker",'bind'),
      row("プレイヤーハイライト切り替え","Toggle Player Highlights","observer_highlights",'bind'),
      row("自動マップカメラ切り替え","Toggle Auto Map Camera","observer_auto_mapcam",'bind'),
      row("プレイヤータグ切り替え","Toggle Player Tags","observer_tags",'bind'),
      row("フリーカメラ切り替え","Toggle Free Camera","observer_freecam",'bind'),
      row("高度ロック切り替え","Toggle Height Lock","observer_altitude_lock",'bind'),
      row("Smoothcam切り替え","Toggle Smoothcam","observer_smoothcam",'bind'),
      row("UI切り替え","Toggle UI","observer_ui",'bind'),
      row("次のリングの表示切り替え","Toggle Next Ring","observer_ring",'bind'),
      row("キル通知の表示切り替え","Toggle Kill Feed","observer_kill_feed",'bind'),
      row("回転モード切り替え","Toggle Rotation Mode","observer_roll_mode",'bind'),
      row("時計回りに回転","Rotate Clockwise","observer_roll_clockwise",'bind'),
      row("反時計回りに回転","Rotate Counterclockwise","observer_roll_counterclockwise",'bind'),
    ]},
  ],
  controller: [
    { ja: 'コントローラー', en: 'Controller', rows: [
      row('ボタン配置','Button Layout','controller_button_layout','choice',undefined,[choice('0','デフォルト','Default'),choice('1','クイックジャンパー','Bumper Jumper'),choice('2','ボタンパンチャー','Button Puncher'),choice('3','エボリューション','Evolved'),choice('4','グレネーダー','Grenadier'),choice('5','ニンジャ','Ninja'),choice('6','カスタム（保存済み配置）','Custom (saved layout)')]),
      row('スティック配置','Stick Layout','controller_stick_layout','choice',undefined,[choice('0','デフォルト','Default'),choice('1','サウスポー','Southpaw'),choice('2','レガシー','Legacy'),choice('3','レガシーサウスポー','Legacy Southpaw')]),
      row('アクション/リロードボタン','Interact / Reload Button','controller_interact_mode','choice',undefined,[choice('0','ホールドで使う／タップでリロード','Hold to use / Tap to reload'),choice('1','タップで使う／ホールドでリロード','Tap to use / Hold to reload'),choice('2','タップで使う＆リロード','Tap to use and reload')]),
      row('しゃがみボタン','Crouch Button','controller_crouch_hold','choice',undefined,[choice('0','切り替え','Toggle'),choice('1','ホールド','Hold')]),
      row('エイムボタン','Aim Button','controller_toggle_ads','choice',undefined,[choice('0','ホールド','Hold'),choice('1','切り替え','Toggle')]),
      row('サバイバルスロットボタン','Survival Slot Button','controller_survival_slot','inverse-toggle'),
      row('振動','Vibration','controller_rumble','toggle'),
      row('アダプティブトリガー','Adaptive Trigger','controller_adaptive_trigger','toggle'),
      row('トリガーのデッドゾーン','Trigger Deadzone','controller_trigger_deadzone','choice',undefined,[choice('0','なし','None'),choice('30','デフォルト','Default'),choice('64','中','Moderate'),choice('128','高','High'),choice('255','最大','Max')]),
      row('メニューカーソルの速度','Menu Cursor Speed','controller_cursor_speed','step'),
    ]},
    { ja: '移動 / エイム', en: 'Movement / Aim', rows: [
      row('視点感度','Look Sensitivity','controller_look_sensitivity','choice',undefined,numbered),
      row('視点感度（エイム時）','Look Sensitivity (ADS)','controller_ads_sensitivity','choice',undefined,controllerAdsChoices),
      row('スコープ設定…','Per Optic Settings…','controller_per_optic_ads','controller-optic'),
      row('反応曲線','Response Curve','controller_response_curve','choice',undefined,[choice('0','クラシック','Classic'),choice('1','安定','Steady'),choice('2','精密','Fine Aim'),choice('3','高速度','High Velocity'),choice('4','リニア','Linear')]),
      row('視点操作デッドゾーン','Look Deadzone','controller_look_deadzone','choice',undefined,[choice('0','なし','None'),choice('1','小','Small'),choice('2','大','Large')]),
      row('移動スティックのデッドゾーン','Movement Deadzone','controller_move_deadzone','choice',undefined,[choice('1','小','Small'),choice('2','大','Large')]),
      row('視点の反転','Invert Look','controller_invert','toggle'), row('詳細な視点操作…','Advanced Look Controls…','controller_custom_aim','controller-alc'),
    ]},
  ],
  video: [
    { ja: 'ビデオ', en: 'Video', rows: [
      row('画面モード','Display Mode','fullscreen','display'), row('縦横比','Aspect Ratio',undefined,'derived-aspect'),
      row('解像度','Resolution','width','resolution'), row('明るさ','Brightness','brightness','brightness'), row('視野（FOV）','Field of View','fov','fov'),
      row('FOVアビリティ・スケーリング','FOV Ability Scaling','ability_fov_scaling','inverse-toggle'),
      row('スプリント時の視点のゆれ','Sprint View Shake','sprint_view_shake','choice',undefined,[choice('0','普通','Normal'),choice('1','小','Minimal')]), row('UIレイアウトモード','UI Layout Mode','ui_layout_observed','choice',undefined,[choice('0','オート','Auto'),choice('2','フル','Full'),choice('1','コンパクト','Compact')]),
    ]},
    { ja: 'アドバンス', en: 'Advanced', rows: [
      row('垂直同期','V-Sync','vsync','toggle'), row('NVIDIA Reflex','NVIDIA Reflex',undefined,'reflex'),
      row('解像度適応の目標fps','Adaptive Resolution FPS Target','adaptive_resolution','adaptive-fps'), row('アンチエイリアス','Anti-aliasing','anti_aliasing','choice',undefined,[choice('0','なし','None'),choice('12','TSAA','TSAA')]),
      row('テクスチャストリーミング割り当て','Texture Streaming Budget','texture_budget','choice',undefined,[choice('0','なし','None'),choice('160000','最低（VRAM:2GB）','Very Low (2GB VRAM)'),choice('300000','低（VRAM:2～3GB）','Low (2–3GB VRAM)'),choice('600000','中（VRAM:3GB）','Medium (3GB VRAM)'),choice('1000000','高（VRAM:4GB）','High (4GB VRAM)'),choice('2000000','最高（VRAM:6GB）','Very High (6GB VRAM)'),choice('3000000','最高（VRAM:8GB以上）','Very High (8GB+ VRAM)')]),
      row('テクスチャフィルタリング','Texture Filtering','anisotropic','choice',undefined,[choice('0','バイリニア','Bilinear'),choice('1','トライリニア','Trilinear'),choice('2','異方性2倍','Anisotropic 2×'),choice('4','異方性4倍','Anisotropic 4×'),choice('8','異方性8倍','Anisotropic 8×'),choice('16','異方性16倍','Anisotropic 16×')]),
      row('アンビエントオクルージョン品質','Ambient Occlusion Quality','ao_quality','choice',undefined,[choice('0','無効','Disabled'),choice('1','低','Low'),choice('2','高','High'),choice('3','最高','Very High'),choice('4','極','Extreme')]),
      row('サンシャドウ範囲','Sun Shadow Coverage','sun_coverage','choice',undefined,[choice('1','低','Low'),choice('2','高','High')]), row('サンシャドウディテール','Sun Shadow Detail','sun_detail','choice',undefined,[choice('512','低','Low'),choice('1024','高','High')]),
      row('スポットシャドウディテール','Spot Shadow Detail','spot_detail_observed','spot-shadow',undefined,[choice('0','無効','Disabled'),choice('128','低','Low'),choice('256','高','High'),choice('512','最高','Very High')]), row('空間光','Volumetric Lighting','volumetric_lighting','toggle'),
      row('ダイナミックスポットシャドウ','Dynamic Spot Shadows','dynamic_spot_shadows','choice',undefined,[choice('0','無効','Disabled'),choice('4','有効','Enabled')]), row('モデルディテール','Model Detail','model_detail','choice',undefined,[choice('0.6','低','Low'),choice('0.8','中','Medium'),choice('1','高','High')]),
      row('マップ詳細','Map Detail','map_detail','choice',undefined,[choice('1','低','Low'),choice('2','高','High')]), row('エフェクトディテール','Effects Detail','effects_detail','choice',undefined,[choice('0','低','Low'),choice('1','中','Medium'),choice('2','高','High')]),
      row('衝撃マーク','Impact Marks','impact_marks','impact-marks'), row('ラグドール','Ragdolls','ragdolls','choice',undefined,[choice('0','低','Low'),choice('4','中','Medium'),choice('8','高','High')]),
    ]},
  ],
  audio: [
    { ja: 'オーディオ', en: 'Audio', rows: [
      row('マスターボリューム','Master Volume','audio_master','volume'), row('出力デバイス','Output Device'),
      row('オーディオミックス','Audio Mix','audio_mix','choice',undefined,[choice('0','オリジナル','Original'),choice('1','フォーカス','Focus')]), row('出力設定','Output Configuration','output_config_observed','choice',undefined,[choice('2','ステレオ','Stereo'),choice('6','5.1サラウンド','5.1 Surround'),choice('8','7.1サラウンド','7.1 Surround')]), row('オーディオ詳細オプション…','Advanced Audio Options…',undefined,'audio-details'),
    ]},
    { ja: 'ボイスチャット', en: 'Voice Chat', rows: [
      row('ボイスチャット入力デバイス','Voice Chat Input Device'), row('ボイスチャット録音モード','Voice Chat Record Mode','voice_mode_observed','observed',undefined,[choice('0','プッシュ','Push to Talk')]),
      row('オープン設定時のマイク録音レベル','Open Mic Threshold','open_mic_threshold','threshold'), row('受信ボイスチャットの音量','Incoming Voice Chat Volume','audio_voice','volume'),
    ]},
  ],
};
