# 特殊描画設定の調査（2026-09-27）

参照した[2026年の記事](https://note.com/ebi_suuuuuu/n/nd51daeac3755)の候補を、既存の通常設定と照合した。キーと値は[公開された利用者の videoconfig.txt](https://github.com/Shagakusha/Apex-Legends-Configs/blob/main/videoconfig.txt)および[別の利用者の設定](https://github.com/Natram1zh/Apex-Legends-Config/blob/main/videoconfig.txt)でも確認した。これらは保存形式の根拠であり、現在のゲームで効果が出る証明ではない。

| 追加した機能 | 保存キー | 選択肢 | 確認状況 |
|---|---|---|---|
| 破片の描画 | `setting.cl_gib_allow` | 0/1 | 複数の公開Configで存在を確認。現行版の描画効果は未検証。 |
| ラグドールの自己衝突 | `setting.cl_ragdoll_self_collision` | 0/1 | 複数の公開Configで存在を確認。通常設定の「ラグドール」は最大数を変える別キー。現行版の物理効果は未検証。 |
| 小物の表示距離 | `setting.fadeDistScale` | 0.75/1.0 | 複数の公開Configで存在を確認。通常設定のモデル詳細とは別キー。視認性やFPSへの影響は未検証。 |
| 動的ストリーミング | `setting.dynamic_streaming_budget` | 0/1 | 2023年にゲーム内へ追加。2025年1月にゲーム内の切替のみ廃止。`videoconfig.txt` では変更可能とEAが明記。VRAM不足時以外は通常効果がなく、有効維持が推奨される。 |

## 動的ストリーミングの表示履歴と動作

- [Respawn開発者の2023年2月の説明](https://www.reddit.com/r/apexlegends/comments/112bna9/dev_team_update_dx12_beta_revelry_updates/)では、Season 16のDX12版にゲーム内設定として追加したと明記されている。ユーザーがゲーム内で見た記憶は正しい。
- 有効時は、普段は指定したテクスチャストリーミング割り当て・モデル詳細を目標にする。VRAMが満杯に近づいたときだけ両者の使用量を一時的に下げる。したがって、通常画面にある「テクスチャストリーミング割り当て」とは別の制御である。
- [EAの2025年1月6日のパッチノート](https://www.ea.com/games/apex-legends/apex-legends/news/astral-anomaly-event)は、この切替をゲーム内のビデオ設定から削除したと説明する。ほぼすべてのプレイヤーでオンが望ましく、VRAM不足時以外は通常効果がないことが理由。設定ファイルでは引き続き無効化できる。
- ユーザーが提供した現行ビデオ設定のスクリーンショットでも、この項目は表示されていない。2025年以降に再追加されたことを示す公式資料は今回見つからなかった。ただし、全ビルド・全環境で非表示であることを実機で証明したわけではない。

追加を見送った候補：`cl_particle_fallback_base`・`cl_particle_fallback_multiplier` は[利用者の設定対応表](https://gebiboulog.blog.fc2.com/blog-entry-185.html)でゲーム内の「エフェクトディテール」と同一の選択肢に含まれ、既存画面と重なる。`mat_mip_linear`・`mat_picmip` はテクスチャ品質系、`mat_backbuffer_count` はVSync系の連動値。`shadow_depth_upres_factor_max`・`new_shadow_settings` は影の通常設定と重なり、記事自体も現行版の効果に疑問を示す。`configversion`・`last_display_width/height` はユーザーが直接調整する画質設定として扱わない。

この調査では実際のApexファイルへの書込みやゲーム中の画質比較を行っていない。アプリの表示も、保存形式が確認済みであることと、効果が確認済みであることを区別する。
