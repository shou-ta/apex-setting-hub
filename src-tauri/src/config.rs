use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

pub const FILES: [&str; 3] = ["settings.cfg", "profile.cfg", "videoconfig.txt"];
pub const SETTING_IDS: &[&str] = &[
    "sensitivity",
    "ads_sensitivity",
    "per_optic",
    "optic_1x",
    "optic_2x",
    "optic_3x",
    "optic_4x",
    "optic_6x",
    "optic_8x",
    "optic_10x",
    "optic_seer_passive",
    "mouse_acceleration",
    "mouse_clamp",
    "lighting_effects",
    "invert_mouse",
    "fov",
    "auto_sprint",
    "hold_sprint",
    "close_deathbox_on_damage",
    "auto_cycle_empty",
    "death_hints",
    "ability_fov_scaling",
    "subtitles",
    "text_to_speech",
    "speech_to_text",
    "anonymous_mode",
    "chain_heal",
    "show_weapon_flyouts",
    "show_offscreen_portrait",
    "show_team_names_map",
    "show_level_up",
    "show_callsigns",
    "show_meter",
    "width",
    "height",
    "vsync",
    "fullscreen",
    "borderless",
    "anisotropic",
    "shadows",
    "disable_shadows",
    "gibs", "ragdoll_self_collision", "fade_distance", "dynamic_streaming_budget",
    "volumetric_lighting",
    "volumetric_fog",
    "adaptive_resolution",
    "adaptive_fps_min", "adaptive_fps_max",
    "hud_minimap_rotate",
    "hud_button_hints",
    "hud_enemy_health",
    "hud_enemy_highlight",
    "hud_hopup",
    "hud_obituary",
    "hud_tips",
    "hud_streamer",
    "hud_ping_double",
    "audio_master",
    "audio_dialogue",
    "audio_music_game",
    "audio_music_lobby",
    "audio_sfx",
    "audio_voice",
    "audio_focus",
    "audio_reduced_music",
    "voice_enabled",
    "controller_invert",
    "controller_rumble",
    "controller_southpaw",
    "controller_toggle_ads",
    "controller_custom_aim",
    "controller_per_optic_ads",
    "controller_button_layout",
    "controller_stick_layout",
    "controller_interact_mode",
    "controller_crouch_hold",
    "controller_survival_slot",
    "controller_adaptive_trigger",
    "controller_trigger_deadzone",
    "controller_cursor_speed",
    "controller_look_sensitivity",
    "controller_ads_sensitivity",
    "controller_response_curve",
    "controller_look_deadzone",
    "controller_move_deadzone",
    "controller_numeric_optic_2x", "controller_numeric_optic_3x", "controller_numeric_optic_4x",
    "controller_numeric_optic_6x", "controller_numeric_optic_8x", "controller_numeric_optic_10x",
    "controller_numeric_optic_seer_passive",
    "controller_alc_deadzone", "controller_alc_outer_threshold", "controller_alc_curve",
    "controller_alc_yaw", "controller_alc_pitch", "controller_alc_extra_yaw", "controller_alc_extra_pitch",
    "controller_alc_ramp_time", "controller_alc_ramp_delay", "controller_alc_ads_yaw",
    "controller_alc_ads_pitch", "controller_alc_ads_extra_yaw", "controller_alc_ads_extra_pitch",
    "controller_alc_ads_ramp_time", "controller_alc_ads_ramp_delay",
    "controller_alc_target_compensation", "controller_alc_melee_compensation",
    "controller_alc_per_optic", "controller_alc_optic_1x", "controller_alc_optic_2x",
    "controller_alc_optic_3x", "controller_alc_optic_4x", "controller_alc_optic_6x",
    "controller_alc_optic_8x", "controller_alc_optic_10x", "controller_alc_optic_seer_passive",
    "auto_run", "jetpack_toggle", "energy_ammo_percent", "arsenal_icons",
    "ping_opacity", "performance_display", "laser_customized", "laser_color", "reticle_color",
    "health_ammo_popups", "share_usage",
    "sprint_view_shake", "anti_aliasing", "dynamic_spot_shadows", "audio_mix",
    "damage_indicator", "crosshair_damage", "damage_text", "information_display", "mantle_input_observed",
    "mantle_ui_observed", "tutorial_observed", "colorblind",
    "voice_lines_observed", "subtitle_size", "auto_mute_observed",
    "ui_layout_observed", "brightness", "texture_budget",
    "ao_quality", "sun_coverage", "sun_detail",
    "spot_detail_observed", "spot_shadow_upres", "model_detail", "map_detail",
    "effects_detail", "impact_marks", "impact_marks_models", "ragdolls",
    "output_config_observed", "voice_mode_observed",
    "open_mic_threshold",
    "reflex_enabled", "reflex_boost",
];

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LineKind {
    Setting,
    Bind,
    Unknown,
    Comment,
    Empty,
}

#[derive(Clone, Debug)]
pub struct Line {
    pub raw: Vec<u8>,
    pub ending: Vec<u8>,
    pub kind: LineKind,
    pub key: Option<String>,
    pub value: Option<String>,
}

#[derive(Clone, Debug)]
pub struct Document {
    pub lines: Vec<Line>,
    pub suffix: Vec<u8>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Edit {
    Setting {
        id: String,
        value: String,
    },
    Bind {
        key: String,
        action: String,
    },
    Special {
        key: String,
        special: String,
        value: String,
    },
    RemoveBind {
        key: String,
    },
    Readonly {
        file: String,
        value: bool,
    },
}

pub fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn parse_quoted(input: &str) -> Option<Vec<(usize, usize, String)>> {
    let mut result = Vec::new();
    let mut start = None;
    let mut escaped = false;
    for (i, ch) in input.char_indices() {
        if let Some(s) = start {
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == '"' {
                result.push((s, i + 1, input[s + 1..i].to_string()));
                start = None;
            }
        } else if ch == '"' {
            start = Some(i);
        }
    }
    if start.is_some() {
        None
    } else {
        Some(result)
    }
}

impl Document {
    pub fn parse(bytes: &[u8]) -> Self {
        let mut end = bytes.len();
        while end > 0 && bytes[end - 1] == 0 {
            end -= 1;
        }
        let mut lines = Vec::new();
        let mut pos = 0;
        while pos < end {
            let e = bytes[pos..end]
                .iter()
                .position(|&b| b == b'\n')
                .map(|n| pos + n + 1)
                .unwrap_or(end);
            let line_end = if e > pos && bytes[e - 1] == b'\n' {
                if e > pos + 1 && bytes[e - 2] == b'\r' {
                    e - 2
                } else {
                    e - 1
                }
            } else {
                e
            };
            let raw = bytes[pos..line_end].to_vec();
            let ending = bytes[line_end..e].to_vec();
            let (kind, key, value) = classify(&raw);
            lines.push(Line {
                raw,
                ending,
                kind,
                key,
                value,
            });
            pos = e;
        }
        Self {
            lines,
            suffix: bytes[end..].to_vec(),
        }
    }

    pub fn bytes(&self) -> Vec<u8> {
        let mut out = Vec::new();
        for line in &self.lines {
            out.extend(&line.raw);
            out.extend(&line.ending);
        }
        out.extend(&self.suffix);
        out
    }

    fn newline(&self) -> Vec<u8> {
        self.lines
            .iter()
            .find(|l| !l.ending.is_empty())
            .map(|l| l.ending.clone())
            .unwrap_or_else(|| b"\r\n".to_vec())
    }

    pub fn setting(&self, key: &str) -> Option<String> {
        self.lines
            .iter()
            .rev()
            .find(|l| l.kind == LineKind::Setting && l.key.as_deref().is_some_and(|saved| saved.eq_ignore_ascii_case(key)))
            .and_then(|l| l.value.clone())
    }

    pub fn binds(&self) -> Vec<(String, String)> {
        self.lines
            .iter()
            .filter(|l| l.kind == LineKind::Bind)
            .filter_map(|l| Some((l.key.clone()?, l.value.clone()?)))
            .collect()
    }

    // The heal-wheel hold is a companion of the selected heal action, not a second menu assignment.
    pub fn menu_binds(&self) -> Vec<(String, String)> {
        self.lines.iter().filter(|line| line.kind == LineKind::Bind).filter(|line| {
            if line.key.as_deref().is_none_or(str::is_empty) { return false; }
            let held = String::from_utf8_lossy(&line.raw).trim_start().starts_with("bind_held_US_standard ");
            !(held && line.value.as_deref() == Some("+scriptCommand2") && self.lines.iter().any(|primary| {
                primary.kind == LineKind::Bind && primary.value.as_deref() == Some("+scriptCommand4")
                    && primary.key.as_deref().zip(line.key.as_deref()).is_some_and(|(a,b)| a.eq_ignore_ascii_case(b))
                    && String::from_utf8_lossy(&primary.raw).trim_start().starts_with("bind_US_standard ")
            }))
        }).filter_map(|line| Some((line.key.clone()?,line.value.clone()?))).collect()
    }

    pub fn fingerprint(&self, edit: &Edit, file: &str) -> String {
        match edit {
            Edit::Setting { id, .. } if setting_file(id) == Some(file) => {
                self.setting(setting_key(id).unwrap()).unwrap_or_default()
            }
            Edit::Bind { key, .. } | Edit::Special { key, .. } | Edit::RemoveBind { key }
                if file == "settings.cfg" =>
            {
                self.lines
                    .iter()
                    .filter(|l| {
                        l.kind == LineKind::Bind
                            && l.key
                                .as_deref()
                                .is_some_and(|k| k.eq_ignore_ascii_case(key))
                    })
                    .map(|l| String::from_utf8_lossy(&l.raw).to_string())
                    .collect::<Vec<_>>()
                    .join("\n")
            }
            _ => String::new(),
        }
    }

    pub fn change_setting(&mut self, key: &str, value: &str, video: bool) {
        let newline = self.newline();
        let mut last = None;
        for (i, line) in self.lines.iter().enumerate() {
            if line.kind == LineKind::Setting && line.key.as_deref().is_some_and(|saved| saved.eq_ignore_ascii_case(key)) {
                last = Some(i);
            }
        }
        if let Some(i) = last {
            let text = String::from_utf8_lossy(&self.lines[i].raw).to_string();
            if let Some(parts) = parse_quoted(&text) {
                if parts.len() >= if video { 2 } else { 1 } {
                    let (start, end, _) = &parts[if video { 1 } else { 0 }];
                    let mut updated = String::new();
                    updated.push_str(&text[..*start]);
                    updated.push('"');
                    updated.push_str(value);
                    updated.push('"');
                    updated.push_str(&text[*end..]);
                    self.lines[i].raw = updated.into_bytes();
                    self.lines[i].value = Some(value.into());
                    return;
                }
            }
        }
        let raw = if video {
            format!("\t\"{}\"\t\t\"{}\"", key, value)
        } else {
            format!("{} \"{}\"", key, value)
        };
        if video {
            if let Some(i) = self.lines.iter().rposition(|l| {
                l.raw
                    .iter()
                    .copied()
                    .filter(|b| !b.is_ascii_whitespace())
                    .collect::<Vec<_>>()
                    == b"}"
            }) {
                let (kind, key, value) = classify(raw.as_bytes());
                self.lines.insert(
                    i,
                    Line {
                        raw: raw.into_bytes(),
                        ending: newline,
                        kind,
                        key,
                        value,
                    },
                );
                return;
            }
        }
        self.append_line(raw.into_bytes(), newline);
    }

    pub fn remove_bind(&mut self, key: &str) {
        self.lines.retain(|l| {
            !(l.kind == LineKind::Bind
                && l.key
                    .as_deref()
                    .is_some_and(|k| k.eq_ignore_ascii_case(key)))
        });
    }

    pub fn add_bind(&mut self, key: &str, command: &str) {
        self.remove_bind(key);
        let alternate = self.binds().iter().any(|(_, c)| c == command);
        let flag = if alternate { 1 } else { 0 };
        let raw = format!("bind_US_standard \"{}\" \"{}\" {}", key, command, flag);
        let newline = self.newline();
        let after = self.lines.iter().rposition(|l| l.kind == LineKind::Bind);
        let line = Line {
            raw: raw.into_bytes(),
            ending: newline.clone(),
            kind: LineKind::Bind,
            key: Some(key.into()),
            value: Some(command.into()),
        };
        if let Some(i) = after {
            self.lines.insert(i + 1, line);
        } else {
            self.append_line(line.raw, newline);
        }
        if command == "+scriptCommand4" {
            let companion = Line {
                raw: format!("bind_held_US_standard \"{key}\" \"+scriptCommand2\" {flag}").into_bytes(),
                ending: self.newline(), kind: LineKind::Bind,
                key: Some(key.into()), value: Some("+scriptCommand2".into()),
            };
            let after = self.lines.iter().rposition(|line| line.kind == LineKind::Bind).unwrap();
            self.lines.insert(after + 1, companion);
        }
    }

    fn append_line(&mut self, raw: Vec<u8>, newline: Vec<u8>) {
        if let Some(last) = self.lines.last_mut() {
            if last.ending.is_empty() {
                last.ending = newline.clone();
            }
        }
        let (kind, key, value) = classify(&raw);
        self.lines.push(Line {
            raw,
            ending: newline,
            kind,
            key,
            value,
        });
    }
}

fn classify(raw: &[u8]) -> (LineKind, Option<String>, Option<String>) {
    let Ok(text) = std::str::from_utf8(raw) else {
        return (LineKind::Unknown, None, None);
    };
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return (LineKind::Empty, None, None);
    }
    if trimmed.starts_with("//") || trimmed.starts_with('#') {
        return (LineKind::Comment, None, None);
    }
    let quotes = parse_quoted(text).unwrap_or_default();
    let first = trimmed.split_whitespace().next().unwrap_or("");
    if first == "bind_US_standard" || first == "bind_held_US_standard" {
        if quotes.len() >= 2 {
            return (
                LineKind::Bind,
                Some(quotes[0].2.clone()),
                Some(quotes[1].2.clone()),
            );
        }
    }
    if first.starts_with("setting.")
        || first.starts_with('"')
        || (!first.is_empty()
            && first
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || "._".contains(c)))
    {
        if quotes.len() >= 2 && first.starts_with('"') {
            return (
                LineKind::Setting,
                Some(quotes[0].2.clone()),
                Some(quotes[1].2.clone()),
            );
        }
        if !first.starts_with('"') && !quotes.is_empty() {
            return (
                LineKind::Setting,
                Some(first.into()),
                Some(quotes[0].2.clone()),
            );
        }
    }
    (LineKind::Unknown, None, None)
}

pub fn setting_key(id: &str) -> Option<&'static str> {
    match id {
        "sensitivity" => Some("mouse_sensitivity"),
        "ads_sensitivity" => Some("mouse_zoomed_sensitivity_scalar"),
        "per_optic" => Some("mouse_use_per_scope_sensitivity_scalars"),
        "optic_1x" => Some("mouse_zoomed_sensitivity_scalar_0"),
        "optic_2x" => Some("mouse_zoomed_sensitivity_scalar_1"),
        "optic_3x" => Some("mouse_zoomed_sensitivity_scalar_2"),
        "optic_4x" => Some("mouse_zoomed_sensitivity_scalar_3"),
        "optic_6x" => Some("mouse_zoomed_sensitivity_scalar_4"),
        "optic_8x" => Some("mouse_zoomed_sensitivity_scalar_5"),
        "optic_10x" => Some("mouse_zoomed_sensitivity_scalar_6"),
        "optic_seer_passive" => Some("mouse_zoomed_sensitivity_scalar_7"),
        "mouse_acceleration" => Some("m_acceleration"),
        "mouse_clamp" => Some("m_clamp_to_window"),
        "lighting_effects" => Some("chroma_enable"),
        "invert_mouse" => Some("m_invert_pitch"),
        "fov" => Some("cl_fovScale"),
        "auto_sprint" => Some("player_setting_autosprint"),
        "hold_sprint" => Some("player_setting_holdtosprint"),
        "close_deathbox_on_damage" => Some("player_setting_damage_closes_deathbox_menu"),
        "auto_cycle_empty" => Some("weapon_setting_autocycle_on_empty"),
        "death_hints" => Some("cl_deathhints_enabled"),
        "ability_fov_scaling" => Some("fov_disableAbilityScaling"),
        "subtitles" => Some("closecaption"),
        "text_to_speech" => Some("hudchat_play_text_to_speech"),
        "speech_to_text" => Some("speechtotext_enabled"),
        "anonymous_mode" => Some("hud_setting_anonymousMode"),
        "chain_heal" => Some("hud_setting_chainHeal"),
        "show_weapon_flyouts" => Some("hud_setting_showWeaponFlyouts"),
        "show_offscreen_portrait" => Some("hud_setting_showOffscreenPortrait"),
        "show_team_names_map" => Some("hud_setting_showTeamNamesOnMap"),
        "show_level_up" => Some("hud_setting_showLevelUp"),
        "show_callsigns" => Some("hud_setting_showCallsigns"),
        "show_meter" => Some("hud_setting_showMeter"),
        "width" => Some("setting.defaultres"),
        "height" => Some("setting.defaultresheight"),
        "vsync" => Some("setting.mat_vsync_mode"),
        "fullscreen" => Some("setting.fullscreen"),
        "borderless" => Some("setting.nowindowborder"),
        "anisotropic" => Some("setting.mat_forceaniso"),
        "shadows" => Some("setting.shadow_enable"),
        "disable_shadows" => Some("setting.csm_enabled"),
        "gibs" => Some("setting.cl_gib_allow"),
        "ragdoll_self_collision" => Some("setting.cl_ragdoll_self_collision"),
        "fade_distance" => Some("setting.fadeDistScale"),
        "dynamic_streaming_budget" => Some("setting.dynamic_streaming_budget"),
        "volumetric_lighting" => Some("setting.volumetric_lighting"),
        "volumetric_fog" => Some("setting.volumetric_fog"),
        "adaptive_resolution" => Some("setting.dvs_enable"),
        "adaptive_fps_min" => Some("setting.dvs_gpuframetime_min"),
        "adaptive_fps_max" => Some("setting.dvs_gpuframetime_max"),
        "hud_minimap_rotate" => Some("hud_setting_minimapRotate"),
        "hud_button_hints" => Some("hud_setting_showButtonHints"),
        "hud_enemy_health" => Some("hud_setting_showEnemyHealthBar"),
        "hud_enemy_highlight" => Some("hud_setting_showEnemyHighlight"),
        "hud_hopup" => Some("hud_setting_showHopUpPopUp"),
        "hud_obituary" => Some("hud_setting_showObituary"),
        "hud_tips" => Some("hud_setting_showTips"),
        "hud_streamer" => Some("hud_setting_streamerMode"),
        "hud_ping_double" => Some("hud_setting_pingDoubleTapEnemy"),
        "audio_master" => Some("setting.sound_volume"),
        "audio_dialogue" => Some("sound_volume_dialogue"),
        "audio_music_game" => Some("sound_volume_music_game"),
        "audio_music_lobby" => Some("sound_volume_music_lobby"),
        "audio_sfx" => Some("sound_volume_sfx"),
        "audio_voice" => Some("voice_scale"),
        "audio_focus" => Some("sound_without_focus"),
        "audio_reduced_music" => Some("sound_musicReduced"),
        "voice_enabled" => Some("voice_enabled"),
        "controller_invert" => Some("joy_inverty"),
        "controller_rumble" => Some("joy_rumble"),
        "controller_southpaw" => Some("gamepad_buttons_are_southpaw"),
        "controller_toggle_ads" => Some("gamepad_toggle_ads"),
        "controller_custom_aim" => Some("gamepad_custom_enabled"),
        "controller_per_optic_ads" => Some("gamepad_use_per_scope_ads_settings"),
        "controller_button_layout" => Some("gamepad_button_layout"),
        "controller_stick_layout" => Some("gamepad_stick_layout"),
        "controller_interact_mode" => Some("gamepad_use_type"),
        "controller_crouch_hold" => Some("gamepad_togglecrouch_hold"),
        "controller_survival_slot" => Some("gamepad_toggle_survivalSlot_to_weaponInspect"),
        "controller_adaptive_trigger" => Some("ps5_trig_enable"),
        "controller_trigger_deadzone" => Some("gamepad_trigger_threshold"),
        "controller_cursor_speed" => Some("gameCursor_Velocity"),
        "controller_look_sensitivity" => Some("gamepad_aim_speed"),
        "controller_ads_sensitivity" => Some("gamepad_aim_speed_ads_0"),
        "controller_response_curve" => Some("gamepad_look_curve"),
        "controller_look_deadzone" => Some("gamepad_deadzone_index_look"),
        "controller_move_deadzone" => Some("gamepad_deadzone_index_move"),
        "controller_numeric_optic_2x" => Some("gamepad_aim_speed_ads_1"),
        "controller_numeric_optic_3x" => Some("gamepad_aim_speed_ads_2"),
        "controller_numeric_optic_4x" => Some("gamepad_aim_speed_ads_3"),
        "controller_numeric_optic_6x" => Some("gamepad_aim_speed_ads_4"),
        "controller_numeric_optic_8x" => Some("gamepad_aim_speed_ads_5"),
        "controller_numeric_optic_10x" => Some("gamepad_aim_speed_ads_6"),
        "controller_numeric_optic_seer_passive" => Some("gamepad_aim_speed_ads_7"),
        "controller_alc_deadzone" => Some("gamepad_custom_deadzone_in"),
        "controller_alc_outer_threshold" => Some("gamepad_custom_deadzone_out"),
        "controller_alc_curve" => Some("gamepad_custom_curve"),
        "controller_alc_yaw" => Some("gamepad_custom_hip_yaw"),
        "controller_alc_pitch" => Some("gamepad_custom_hip_pitch"),
        "controller_alc_extra_yaw" => Some("gamepad_custom_hip_turn_yaw"),
        "controller_alc_extra_pitch" => Some("gamepad_custom_hip_turn_pitch"),
        "controller_alc_ramp_time" => Some("gamepad_custom_hip_turn_time"),
        "controller_alc_ramp_delay" => Some("gamepad_custom_hip_turn_delay"),
        "controller_alc_ads_yaw" => Some("gamepad_custom_ads_yaw"),
        "controller_alc_ads_pitch" => Some("gamepad_custom_ads_pitch"),
        "controller_alc_ads_extra_yaw" => Some("gamepad_custom_ads_turn_yaw"),
        "controller_alc_ads_extra_pitch" => Some("gamepad_custom_ads_turn_pitch"),
        "controller_alc_ads_ramp_time" => Some("gamepad_custom_ads_turn_time"),
        "controller_alc_ads_ramp_delay" => Some("gamepad_custom_ads_turn_delay"),
        "controller_alc_target_compensation" => Some("gamepad_custom_assist_on"),
        "controller_alc_melee_compensation" => Some("gamepad_aim_assist_melee"),
        "controller_alc_per_optic" => Some("gamepad_use_per_scope_sensitivity_scalars"),
        "controller_alc_optic_1x" => Some("gamepad_ads_advanced_sensitivity_scalar_0"),
        "controller_alc_optic_2x" => Some("gamepad_ads_advanced_sensitivity_scalar_1"),
        "controller_alc_optic_3x" => Some("gamepad_ads_advanced_sensitivity_scalar_2"),
        "controller_alc_optic_4x" => Some("gamepad_ads_advanced_sensitivity_scalar_3"),
        "controller_alc_optic_6x" => Some("gamepad_ads_advanced_sensitivity_scalar_4"),
        "controller_alc_optic_8x" => Some("gamepad_ads_advanced_sensitivity_scalar_5"),
        "controller_alc_optic_10x" => Some("gamepad_ads_advanced_sensitivity_scalar_6"),
        "controller_alc_optic_seer_passive" => Some("gamepad_ads_advanced_sensitivity_scalar_7"),
        "auto_run" => Some("player_setting_stickysprintforward"),
        "jetpack_toggle" => Some("toggle_on_jump_to_deactivate"),
        "energy_ammo_percent" => Some("hud_setting_energyAmmoDisplay"),
        "arsenal_icons" => Some("player_setting_arsenals_maphudidentifiers"),
        "ping_opacity" => Some("hud_setting_pingAlpha"),
        "performance_display" => Some("net_netGraph2"),
        "laser_customized" => Some("laserSightColorCustomized"),
        "laser_color" => Some("laserSightColor"),
        "reticle_color" => Some("reticle_color"),
        "health_ammo_popups" => Some("player_setting_lowammo_setting"),
        "share_usage" => Some("pin_opt_in"),
        "sprint_view_shake" => Some("sprint_view_shake_style"),
        "anti_aliasing" => Some("setting.mat_antialias_mode"),
        "dynamic_spot_shadows" => Some("setting.shadow_maxdynamic"),
        "audio_mix" => Some("miles_mix"),
        "damage_indicator" => Some("damage_indicator_style_pilot"),
        "crosshair_damage" => Some("hud_setting_damageIndicatorStyle"),
        "damage_text" => Some("hud_setting_damageTextStyle"),
        "information_display" => Some("hud_setting_showMedals"),
        "mantle_input_observed" => Some("mantle_boost_input_setting"),
        "mantle_ui_observed" => Some("mantle_boost_ui_setting"),
        "tutorial_observed" => Some("player_setting_tutorialization"),
        "colorblind" => Some("colorblind_mode"),
        "voice_lines_observed" => Some("player_setting_gamestateawareness_callouts"),
        "subtitle_size" => Some("cc_text_size"),
        "auto_mute_observed" => Some("cl_comms_filter"),
        "ui_layout_observed" => Some("ui_layout_mode"),
        "brightness" => Some("setting.gamma"),
        "texture_budget" => Some("setting.stream_memory"),
        "ao_quality" => Some("setting.ssao_quality"),
        "sun_coverage" => Some("setting.csm_coverage"),
        "sun_detail" => Some("setting.csm_cascade_res"),
        "spot_shadow_upres" => Some("setting.shadow_depth_upres_factor_max"),
        "spot_detail_observed" => Some("setting.shadow_depth_dimen_min"),
        "model_detail" => Some("setting.r_lod_switch_scale"),
        "map_detail" => Some("setting.map_detail_level"),
        "effects_detail" => Some("setting.particle_cpu_level"),
        "impact_marks" => Some("setting.r_decals"),
        "impact_marks_models" => Some("setting.r_createmodeldecals"),
        "ragdolls" => Some("setting.cl_ragdoll_maxcount"),
        "output_config_observed" => Some("sound_num_speakers"),
        "voice_mode_observed" => Some("VoiceChatMode"),
        "open_mic_threshold" => Some("voice_quiet_threshold"),
        "reflex_enabled" => Some("gfx_nvnUseLowLatency"),
        "reflex_boost" => Some("gfx_nvnUseLowLatencyBoost"),
        _ => None,
    }
}

pub fn setting_file(id: &str) -> Option<&'static str> {
    match id {
        "sensitivity" | "ads_sensitivity" | "per_optic" | "optic_1x" | "optic_2x" | "optic_3x" | "optic_4x"
        | "optic_6x" | "optic_8x" | "optic_10x" | "optic_seer_passive" | "mouse_acceleration"
        | "audio_voice" | "mouse_clamp" | "lighting_effects"
        | "ui_layout_observed" | "output_config_observed" | "voice_mode_observed"
        | "reflex_enabled" | "reflex_boost" => Some(FILES[0]),
        "width"
        | "height"
        | "vsync"
        | "fullscreen"
        | "borderless"
        | "anisotropic"
        | "shadows"
        | "disable_shadows"
        | "gibs" | "ragdoll_self_collision" | "fade_distance" | "dynamic_streaming_budget"
        | "volumetric_lighting"
        | "volumetric_fog"
        | "adaptive_resolution"
        | "adaptive_fps_min" | "adaptive_fps_max"
        | "anti_aliasing" | "dynamic_spot_shadows" | "brightness"
        | "texture_budget" | "ao_quality" | "sun_coverage"
        | "sun_detail" | "spot_detail_observed" | "spot_shadow_upres" | "model_detail"
        | "map_detail" | "effects_detail" | "impact_marks" | "impact_marks_models"
        | "ragdolls"
        | "audio_master" => Some(FILES[2]),
        _ if setting_key(id).is_some() => Some(FILES[1]),
        _ => None,
    }
}

pub fn actions() -> BTreeMap<&'static str, &'static str> {
    BTreeMap::from([
        ("jump", "+jump"),
        ("move_forward", "+forward"),
        ("move_back", "+backward"),
        ("move_left", "+moveleft"),
        ("move_right", "+moveright"),
        ("reload", "+reload"),
        ("ping", "+ping"),
        ("melee", "+melee"),
        ("interact", "+use; +use_long"),
        ("shield_battery", "use_consumable SHIELD_LARGE"),
        ("shield_cell", "use_consumable SHIELD_SMALL"),
        ("med_kit", "use_consumable HEALTH_LARGE"),
        ("syringe", "use_consumable HEALTH_SMALL"),
        ("phoenix_kit", "use_consumable PHOENIX_KIT"),
        ("crouch_toggle", "+toggle_duck"),
        ("crouch_hold", "+duck"),
        ("sprint", "+speed"),
        ("attack", "+attack"),
        ("aim", "+zoom"),
        ("inventory", "toggle_inventory"),
        ("map", "toggle_map"),
        ("grenade", "weaponSelectOrdnance"),
        ("tactical", "+offhand1"),
        ("ultimate", "+offhand4"),
        ("inspect_weapon", "weapon_inspect"),
        ("weapon_cycle", "+weaponCycle"),
        ("equip_weapon_1", "weaponSelectPrimary0"),
        ("equip_weapon_2", "weaponSelectPrimary1"),
        ("holster_weapon", "weaponSelectPrimary2"),
        ("push_to_talk", "+pushtotalk"),
        ("fire_mode", "+scriptCommand3"),
        ("survival_item", "+scriptCommand6"),
        ("character_utility", "+scriptCommand5"),
        ("ping_enemy", "ping_specific_type ENEMY"),
        ("ping_going", "ping_specific_type GOING"),
        ("ping_looting", "ping_specific_type LOOTING"),
        ("ping_defending", "ping_specific_type DEFENDING"),
        ("ping_watching", "ping_specific_type WATCHING"),
        ("ping_visited", "ping_specific_type AREA_VISITED"),
        ("ping_regroup", "ping_specific_type REGROUP"),
        ("ping_avoid", "ping_specific_type AVOID"),
        ("ping_attack", "ping_specific_type ATTACK"),
        ("ping_audio", "ping_specific_type ENEMY_AUDIO"),
        ("selected_health", "+scriptCommand4"),
        ("observer_auto_mapcam", "toggle_obs_auto_mapcam"),
        ("observer_altitude_lock", "in_spec_altitude_lock"),
        ("observer_smoothcam", "in_spec_toggle_smoothcam"),
        ("observer_roll_mode", "roamingcam_togglerollmode"),
        ("observer_roll_clockwise", "+spectatorRollClockwise"),
        ("observer_roll_counterclockwise", "+spectatorRollCounterClockwise"),
        ("message_team", "say_team"),
        ("spectate_player_1", "in_spec_teamplayer1"),
        ("spectate_player_2", "in_spec_teamplayer2"),
        ("spectate_player_3", "in_spec_teamplayer3"),
        ("spectate_next", "in_spec_next"),
        ("spectate_previous", "in_spec_prev"),
        ("spectate_next_team", "in_spec_next_team"),
        ("spectate_previous_team", "in_spec_prev_team"),
        ("spectate_closest_player", "in_spec_closest_player"),
        ("spectate_closest_enemy", "in_spec_closest_enemy"),
        ("spectate_kill_leader", "in_spec_kill_leader"),
        ("spectate_last_attacker", "in_spec_last_attacker"),
        ("observer_highlights", "toggle_observer_highlight"),
        ("observer_tags", "toggle_observer_player_tags"),
        ("observer_freecam", "in_spec_toggle_freecam"),
        ("observer_ui", "in_spec_toggle_ui"),
        ("observer_ring", "toggle_observer_ring_survey"),
        ("observer_kill_feed", "in_spec_toggle_obituary"),
        ("screenshot", "jpeg"),
        ("movement_ability", "+dodge"),
        ("interact_alt", "+use_alt"),
        ("aim_toggle", "+toggle_zoom"),
        ("legend_wheel", "chat_wheel"),
    ])
}

pub fn action_for_command(command: &str) -> Option<&'static str> {
    let normalize = |value: &str| {
        let lower = value.to_ascii_lowercase();
        lower.strip_prefix("toggle_obs_").map(|suffix| format!("toggle_observer_{suffix}")).unwrap_or(lower)
    };
    let normalized = normalize(command);
    actions().into_iter().find_map(|(id, action)| (normalize(action) == normalized).then_some(id))
}

pub fn command_for(edit: &Edit) -> Result<Option<String>, String> {
    match edit {
        Edit::Bind { action, .. } => actions()
            .get(action.as_str())
            .map(|v| Some((*v).into()))
            .ok_or_else(|| "Unsupported action".into()),
        Edit::Special { special, value, .. } if special == "fps" => {
            let fps: u32 = value.parse().map_err(|_| "Invalid FPS value")?;
            if fps > 300 {
                return Err("FPS value must be 1–300 or 0 (unlimited)".into());
            }
            Ok(Some(format!("fps_max {fps}")))
        }
        Edit::Special { special, value, .. } if special == "fov" => {
            let fov: u32 = value.parse().map_err(|_| "Invalid FOV")?;
            if !(70..=120).contains(&fov) || fov % 2 != 0 {
                return Err("Unsupported FOV value".into());
            }
            Ok(Some(format!("cl_fovScale {}", format_fov(fov))))
        }
        Edit::RemoveBind { .. } | Edit::Readonly { .. } | Edit::Setting { .. } => Ok(None),
        _ => Err("Unsupported special bind".into()),
    }
}

pub fn format_fov(fov: u32) -> String {
    let value = 1.0 + (fov as f64 - 70.0) * 0.01375;
    format!("{value:.4}")
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_string()
}

pub fn validate_edit(edit: &Edit) -> Result<(), String> {
    match edit {
        Edit::Setting { id, value } => {
            if setting_key(id).is_none() {
                return Err("Unsupported setting".into());
            }
            match id.as_str() {
                "mantle_input_observed" | "mantle_ui_observed" => {
                    if !["0", "1", "2", "3"].contains(&value.as_str()) {
                        return Err("Invalid mantle boost choice".into());
                    }
                }
                "tutorial_observed" | "arsenal_icons" => {
                    if !["0", "1", "2"].contains(&value.as_str()) {
                        return Err("Invalid HUD choice".into());
                    }
                }
                "spot_detail_observed" | "spot_shadow_upres" => {
                    let allowed: &[&str] = match id.as_str() {
                        "spot_detail_observed" => &["0", "128", "256", "512"],
                        "spot_shadow_upres" => &["0", "2", "3"],
                        _ => &["0", "1"],
                    };
                    if !allowed.contains(&value.as_str()) { return Err("Invalid spot shadow preset".into()); }
                }
                "auto_mute_observed" | "output_config_observed" => {
                    let allowed: &[&str] = if id == "auto_mute_observed" { &["-1", "1", "0"] } else { &["2", "6", "8"] };
                    if !allowed.contains(&value.as_str()) {
                        return Err("Unsupported audio or communication choice".into());
                    }
                }
                "ui_layout_observed" => {
                    if !["0", "2", "1"].contains(&value.as_str()) { return Err("Invalid UI layout mode".into()); }
                }
                id if id.ends_with("_observed") => {
                    return Err("This value is read-only until its in-game choices are verified".into());
                }
                "controller_cursor_speed" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid menu cursor speed")?;
                    if !v.is_finite() || !(1300.0..=4300.0).contains(&v) {
                        return Err("Menu cursor speed out of range".into());
                    }
                }
                "controller_button_layout" | "controller_interact_mode"
                | "controller_stick_layout" | "controller_trigger_deadzone"
                | "controller_response_curve" | "controller_look_deadzone"
                | "controller_move_deadzone" | "controller_look_sensitivity"
                | "controller_ads_sensitivity" | "controller_numeric_optic_2x"
                | "controller_numeric_optic_3x" | "controller_numeric_optic_4x"
                | "controller_numeric_optic_6x" | "controller_numeric_optic_8x"
                | "controller_numeric_optic_10x" | "controller_numeric_optic_seer_passive" => {
                    let allowed: &[&str] = match id.as_str() {
                        "controller_button_layout" => &["0", "1", "2", "3", "4", "5", "6"],
                        "controller_interact_mode" => &["0", "1", "2"],
                        "controller_stick_layout" => &["0", "1", "2", "3"],
                        "controller_trigger_deadzone" => &["0", "30", "64", "128", "255"],
                        "controller_response_curve" => &["0", "1", "2", "3", "4"],
                        "controller_look_deadzone" => &["0", "1", "2"],
                        "controller_move_deadzone" => &["1", "2"],
                        "controller_look_sensitivity" => &["0", "1", "2", "3", "4", "5", "6", "7"],
                        _ => &["-1", "0", "1", "2", "3", "4", "5", "6", "7"],
                    };
                    if !allowed.contains(&value.as_str()) {
                        return Err("Invalid controller choice".into());
                    }
                }
                "sprint_view_shake" | "audio_mix" => {
                    if !["0", "1"].contains(&value.as_str()) { return Err("Invalid choice".into()); }
                }
                "anti_aliasing" => {
                    if !["0", "12"].contains(&value.as_str()) { return Err("Invalid anti-aliasing mode".into()); }
                }
                "dynamic_spot_shadows" => {
                    if !["0", "4"].contains(&value.as_str()) { return Err("Invalid dynamic shadow mode".into()); }
                }
                "fade_distance" => {
                    if !["0.75", "1.0"].contains(&value.as_str()) { return Err("Invalid fade distance".into()); }
                }
                "crosshair_damage" | "subtitle_size" | "damage_indicator" | "hud_streamer" => {
                    if !["0", "1", "2"].contains(&value.as_str()) { return Err("Invalid choice".into()); }
                }
                "health_ammo_popups" => {
                    if !["0", "1", "2"].contains(&value.as_str()) { return Err("Invalid popup mode".into()); }
                }
                "reticle_color" | "laser_color" => {
                    if id == "reticle_color" && (value == " " || value == "2147483648 2147483648 2147483648") { /* default or explicit special value */ }
                    else {
                        let components: Vec<_> = value.split_whitespace().collect();
                        if components.len() != 3 || components.iter().any(|part| part.parse::<u8>().is_err()) {
                            return Err("Color must have three 0-255 components".into());
                        }
                    }
                }
                "colorblind" => {
                    if !["0", "1", "2", "3"].contains(&value.as_str()) { return Err("Invalid color vision mode".into()); }
                }
                "ping_opacity" => {
                    if !["0.5", "1.0"].contains(&value.as_str()) { return Err("Invalid ping opacity".into()); }
                }
                "damage_text" | "ao_quality" => {
                    if !["0", "1", "2", "3", "4"].contains(&value.as_str()) || id == "damage_text" && value == "4" { return Err("Invalid choice".into()); }
                }
                "texture_budget" => {
                    if !["0", "160000", "300000", "600000", "1000000", "2000000", "3000000"].contains(&value.as_str()) { return Err("Invalid texture budget".into()); }
                }
                "impact_marks" => {
                    if !["0", "256"].contains(&value.as_str()) { return Err("Invalid impact mark level".into()); }
                }
                "adaptive_fps_min" | "adaptive_fps_max" => {
                    let frame_time: u32 = value.parse().map_err(|_| "Invalid adaptive frame time")?;
                    let range = if id == "adaptive_fps_min" { 9500..=950000 } else { 9800..=980000 };
                    if !range.contains(&frame_time) { return Err("Adaptive frame time out of range".into()); }
                }
                "brightness" => {
                    let gamma: f64 = value.parse().map_err(|_| "Invalid brightness")?;
                    if !gamma.is_finite() || !(0.25..=1.75).contains(&gamma) { return Err("Brightness out of range".into()); }
                }
                "model_detail" => {
                    if !["0.6", "0.8", "1"].contains(&value.as_str()) { return Err("Invalid model detail".into()); }
                }
                "sun_coverage" | "map_detail" => {
                    if !["1", "2"].contains(&value.as_str()) { return Err("Invalid detail level".into()); }
                }
                "sun_detail" => {
                    if !["512", "1024"].contains(&value.as_str()) { return Err("Invalid shadow detail".into()); }
                }
                "effects_detail" => {
                    if !["0", "1", "2"].contains(&value.as_str()) { return Err("Invalid effect detail".into()); }
                }
                "ragdolls" => {
                    if !["0", "4", "8"].contains(&value.as_str()) { return Err("Invalid ragdoll detail".into()); }
                }
                "open_mic_threshold" => {
                    let v: u32 = value.parse().map_err(|_| "Invalid microphone threshold")?;
                    if v > 10000 || v % 100 != 0 { return Err("Microphone threshold out of range".into()); }
                }
                "sensitivity" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid sensitivity")?;
                    if !(0.01..=20.0).contains(&v) {
                        return Err("Sensitivity out of range".into());
                    }
                }
                "ads_sensitivity" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid ADS sensitivity multiplier")?;
                    if !v.is_finite() || !(0.1..=20.0).contains(&v) {
                        return Err("ADS sensitivity multiplier out of range".into());
                    }
                }
                id if id.starts_with("controller_alc_optic_") => {
                    let v: f64 = value.parse().map_err(|_| "Invalid advanced optic sensitivity")?;
                    if !v.is_finite() || !(0.1..=20.0).contains(&v) {
                        return Err("Advanced optic sensitivity out of range".into());
                    }
                }
                "controller_alc_deadzone" | "controller_alc_outer_threshold"
                | "controller_alc_ramp_time" | "controller_alc_ramp_delay"
                | "controller_alc_ads_ramp_time" | "controller_alc_ads_ramp_delay" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid controller percentage")?;
                    let (min, max) = match id.as_str() {
                        "controller_alc_deadzone" => (0.0, 0.5),
                        "controller_alc_outer_threshold" => (0.01, 0.3),
                        _ => (0.0, 1.0),
                    };
                    if !v.is_finite() || !(min..=max).contains(&v) {
                        return Err("Controller percentage out of range".into());
                    }
                }
                "controller_alc_curve" | "controller_alc_yaw" | "controller_alc_pitch"
                | "controller_alc_extra_yaw" | "controller_alc_extra_pitch"
                | "controller_alc_ads_yaw" | "controller_alc_ads_pitch"
                | "controller_alc_ads_extra_yaw" | "controller_alc_ads_extra_pitch" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid controller speed")?;
                    let max = match id.as_str() {
                        "controller_alc_curve" => 30.0,
                        "controller_alc_extra_yaw" | "controller_alc_extra_pitch"
                        | "controller_alc_ads_extra_yaw" | "controller_alc_ads_extra_pitch" => 250.0,
                        _ => 500.0,
                    };
                    if !v.is_finite() || !(0.0..=max).contains(&v) {
                        return Err("Controller speed out of range".into());
                    }
                }
                id if id.starts_with("optic_") => {
                    let v: f64 = value.parse().map_err(|_| "Invalid optic sensitivity")?;
                    if !(0.1..=20.0).contains(&v) {
                        return Err("Optic sensitivity out of range".into());
                    }
                }
                "audio_master" | "audio_dialogue" | "audio_music_game" | "audio_music_lobby"
                | "audio_sfx" | "audio_voice" => {
                    let v: f64 = value.parse().map_err(|_| "Invalid volume")?;
                    if !(0.0..=1.0).contains(&v) {
                        return Err("Volume out of range".into());
                    }
                }
                "anisotropic" => {
                    if !["0", "1", "2", "4", "8", "16"].contains(&value.as_str()) {
                        return Err("Invalid texture filtering".into());
                    }
                }
                "fov" => {
                    let v: u32 = value.parse().map_err(|_| "Invalid FOV")?;
                    if !(70..=120).contains(&v) || v % 2 != 0 {
                        return Err("FOV out of range".into());
                    }
                }
                "width" | "height" => {
                    let v: u32 = value.parse().map_err(|_| "Invalid resolution")?;
                    if !(640..=16384).contains(&v) {
                        return Err("Resolution out of range".into());
                    }
                }
                _ => {
                    if value != "0" && value != "1" {
                        return Err("Invalid toggle".into());
                    }
                }
            }
        }
        Edit::Bind { key, .. } | Edit::Special { key, .. } | Edit::RemoveBind { key } => {
            validate_key(key)?;
            command_for(edit)?;
        }
        Edit::Readonly { file, .. } => {
            if !FILES.contains(&file.as_str()) {
                return Err("Unknown file".into());
            }
        }
    }
    Ok(())
}

fn validate_key(key: &str) -> Result<(), String> {
    if key.is_empty()
        || key.len() > 24
        || !key.chars().all(|c| c.is_ascii_alphanumeric() || "_`-=[];',./".contains(c))
    {
        Err("Invalid key".into())
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_unmodified_bytes() {
        let b=b"// hello\r\nbind_US_standard \"SPACE\" \"+jump\" 0\r\nunknown $&\r\n\t\"setting.defaultres\"\t\t\"1920\"\r\n\0";
        let d = Document::parse(b);
        assert_eq!(d.bytes(), b);
        assert_eq!(d.lines[0].kind, LineKind::Comment);
        assert_eq!(d.lines[2].kind, LineKind::Unknown);
    }
    #[test]
    fn case_insensitive_settings_keep_spelling_and_effective_last_value() {
        let mut doc = Document::parse(b"gameCursor_velocity \"1300\"\r\ngameCursor_Velocity \"1800\" // keep\r\n\0");
        assert_eq!(doc.setting("GAMECURSOR_VELOCITY").as_deref(), Some("1800"));
        doc.change_setting("gameCursor_velocity", "2000", false);
        assert_eq!(doc.bytes(), b"gameCursor_velocity \"1300\"\r\ngameCursor_Velocity \"2000\" // keep\r\n\0");
    }
    #[test]
    fn ui_layout_modes_change_only_the_effective_setting_and_preserve_bytes() {
        let original = b"// fixture\r\nui_layout_mode \"0\"\r\nunknown keep\r\nui_layout_mode \"1\" // active\r\n\0";
        assert_eq!(setting_file("ui_layout_observed"), Some("settings.cfg"));
        for value in ["0", "2", "1"] {
            let edit = Edit::Setting { id: "ui_layout_observed".into(), value: value.into() };
            assert!(validate_edit(&edit).is_ok());
            let mut doc = Document::parse(original);
            doc.change_setting(setting_key("ui_layout_observed").unwrap(), value, false);
            assert_eq!(doc.setting("ui_layout_mode").as_deref(), Some(value));
            assert_eq!(doc.bytes(), String::from_utf8(original.to_vec()).unwrap().replace("\"1\" // active", &format!("\"{value}\" // active")).as_bytes());
        }
        for value in ["-1", "3", "1.5", "NaN", ""] {
            assert!(validate_edit(&Edit::Setting { id: "ui_layout_observed".into(), value: value.into() }).is_err());
        }
    }
    #[test]
    fn new_audio_and_shadow_choices_are_bounded() {
        for (id, values, invalid) in [
            ("auto_mute_observed", vec!["-1","0","1"], "2"),
            ("output_config_observed", vec!["2","6","8"], "4"),
            ("spot_detail_observed", vec!["0","128","256","512"], "1024"),
            ("spot_shadow_upres", vec!["0","2","3"], "1"),
        ] {
            for value in values { assert!(validate_edit(&Edit::Setting{id:id.into(),value:value.into()}).is_ok()); }
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:invalid.into()}).is_err());
        }
    }
    #[test]
    fn changes_only_target_and_keeps_nul() {
        let b = b"\t\"setting.defaultres\"\t\t\"1920\"\r\nother \"x\"\r\n\0";
        let mut d = Document::parse(b);
        d.change_setting("setting.defaultres", "2560", true);
        assert_eq!(
            d.bytes(),
            b"\t\"setting.defaultres\"\t\t\"2560\"\r\nother \"x\"\r\n\0"
        );
    }
    #[test]
    fn multi_bind_and_special() {
        let mut d = Document::parse(b"bind_US_standard \"SPACE\" \"+jump\" 0\r\n");
        d.add_bind("MWHEELDOWN", "+jump");
        assert!(String::from_utf8(d.bytes())
            .unwrap()
            .contains("MWHEELDOWN\" \"+jump\" 1"));
        assert_eq!(
            command_for(&Edit::Special {
                key: "F9".into(),
                special: "fps".into(),
                value: "240".into()
            })
            .unwrap(),
            Some("fps_max 240".into())
        );
        assert_eq!(format_fov(120), "1.6875");
    }

    #[test]
    fn custom_fps_binds_accept_every_integer_from_one_to_three_hundred_and_unlimited() {
        for fps in 0..=300 {
            let edit = Edit::Special { key: "Q".into(), special: "fps".into(), value: fps.to_string() };
            assert_eq!(command_for(&edit).unwrap(), Some(format!("fps_max {fps}")));
        }
        for value in ["-1", "301", "1000", "1.5", "", "invalid"] {
            assert!(command_for(&Edit::Special { key: "Q".into(), special: "fps".into(), value: value.into() }).is_err());
        }
    }

    #[test]
    fn action_commands_match_observed_apex_bind_syntax() {
        let supported = actions();
        assert_eq!(supported["aim"], "+zoom");
        assert_eq!(supported["weapon_cycle"], "+weaponCycle");
        assert_eq!(supported["move_forward"], "+forward");
        assert_eq!(supported["equip_weapon_1"], "weaponSelectPrimary0");
    }

    #[test]
    fn expanded_actions_and_observer_aliases_load_and_validate() {
        for (id, command) in actions() {
            assert_eq!(action_for_command(command), Some(id));
            assert_eq!(action_for_command(&command.to_ascii_uppercase()), Some(id));
            let edit = Edit::Bind { action: id.into(), key: "KP_UPARROW".into() };
            assert!(validate_edit(&edit).is_ok());
            assert_eq!(command_for(&edit).unwrap(), Some(command.into()));
        }
        assert_eq!(action_for_command("toggle_obs_player_tags"), Some("observer_tags"));
        assert_eq!(action_for_command("toggle_obs_highlight"), Some("observer_highlights"));
        assert_eq!(action_for_command("unverified_command"), None);
        let original = b"// anonymous fixture\r\nunknown $&\r\nbind_US_standard \"J\" \"in_spec_teamplayer1\" 0\r\n\0";
        let mut doc = Document::parse(original);
        doc.add_bind("KP_UPARROW", actions()["spectate_next"]);
        let bytes = doc.bytes();
        assert!(bytes.starts_with(&original[..original.len()-1]));
        assert!(bytes.ends_with(b"\r\n\0"));
        let reparsed = Document::parse(&bytes);
        assert!(reparsed.binds().contains(&("KP_UPARROW".into(), "in_spec_next".into())));
        for key in ["'", ";", "[[", "/", "KP_MULTIPLY", "RCTRL"] { assert!(validate_key(key).is_ok()); }
        for key in ["\"", "\\", "\n", "a\";quit", ""] { assert!(validate_key(key).is_err()); }
    }

    #[test]
    fn observed_heal_pair_moves_together_and_preserves_unrelated_held_binds() {
        let original = b"// fixture\r\nbind_US_standard \"4\" \"+scriptCommand4\" 0\r\nbind_held_US_standard \"4\" \"+scriptCommand2\" 0\r\nbind_US_standard \"G\" \"weaponSelectOrdnance\" 0\r\nbind_held_US_standard \"G\" \"+strafe\" 0\r\nbind_US_standard \"\" \"+dodge\" 0\r\nunknown $&\r\n\0";
        let mut doc = Document::parse(original);
        assert_eq!(doc.bytes(), original);
        let menu = doc.menu_binds();
        assert_eq!(menu.iter().filter(|(key,_)| key == "4").count(), 1);
        assert_eq!(menu.iter().filter(|(key,_)| key == "G").count(), 2);
        assert!(!menu.iter().any(|(key,_)| key.is_empty()));
        doc.remove_bind("4");
        doc.add_bind("H", actions()["selected_health"]);
        assert_eq!(doc.binds().iter().filter(|(key,_)| key == "H").count(), 2);
        assert_eq!(doc.menu_binds().iter().filter(|(key,_)| key == "H").count(), 1);
        let bytes = doc.bytes();
        let text = String::from_utf8(bytes.clone()).unwrap();
        assert!(text.contains("bind_held_US_standard \"H\" \"+scriptCommand2\" 0\r\n"));
        assert!(text.contains("bind_held_US_standard \"G\" \"+strafe\" 0\r\n"));
        assert!(text.contains("bind_US_standard \"\" \"+dodge\" 0\r\n"));
        assert!(bytes.ends_with(b"unknown $&\r\n\0"));
        doc.add_bind("J", actions()["selected_health"]);
        assert!(String::from_utf8(doc.bytes()).unwrap().contains("bind_held_US_standard \"J\" \"+scriptCommand2\" 1\r\n"));
        doc.add_bind("H", "+jump");
        assert_eq!(doc.binds().iter().filter(|(key,_)| key == "H").count(), 1);
        doc.remove_bind("J");
        assert!(!doc.binds().iter().any(|(key,_)| key == "J"));
    }

    #[test]
    fn optic_edit_changes_only_selected_magnification() {
        let original = b"mouse_zoomed_sensitivity_scalar_0 \"0.900000\"\r\nmouse_zoomed_sensitivity_scalar_1 \"1.100000\"\r\n// personal note\r\n";
        let mut document = Document::parse(original);
        document.change_setting(setting_key("optic_2x").unwrap(), "1.25", false);
        assert_eq!(document.bytes(), b"mouse_zoomed_sensitivity_scalar_0 \"0.900000\"\r\nmouse_zoomed_sensitivity_scalar_1 \"1.25\"\r\n// personal note\r\n");
        assert_eq!(setting_file("optic_2x"), Some("settings.cfg"));
        assert_eq!(
            setting_key("optic_seer_passive"),
            Some("mouse_zoomed_sensitivity_scalar_7")
        );
        assert!(validate_edit(&Edit::Setting {
            id: "optic_2x".into(),
            value: "0.09".into()
        })
        .is_err());
        assert!(validate_edit(&Edit::Setting {
            id: "optic_2x".into(),
            value: "1.25".into()
        })
        .is_ok());
    }

    #[test]
    fn every_visible_setting_has_a_unique_source_and_bounded_input() {
        let mut sources = std::collections::HashSet::new();
        for id in SETTING_IDS {
            let source = (setting_file(id).unwrap(), setting_key(id).unwrap());
            assert!(sources.insert(source), "duplicate source for {id}");
        }
        for (id, bad) in [
            ("audio_master", "1.5"),
            ("anisotropic", "3"),
            ("hud_tips", "2"),
        ] {
            assert!(validate_edit(&Edit::Setting {
                id: id.into(),
                value: bad.into()
            })
            .is_err());
        }
    }

    #[test]
    fn controller_choices_are_bounded() {
        assert_eq!(setting_file("controller_look_sensitivity"), Some("profile.cfg"));
        assert_eq!(setting_key("controller_look_sensitivity"), Some("gamepad_aim_speed"));
        assert!(validate_edit(&Edit::Setting { id: "controller_response_curve".into(), value: "4".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "controller_response_curve".into(), value: "5".into() }).is_err());
        assert!(validate_edit(&Edit::Setting { id: "controller_look_sensitivity".into(), value: "7".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "controller_look_sensitivity".into(), value: "8".into() }).is_err());
        assert!(validate_edit(&Edit::Setting { id: "controller_button_layout".into(), value: "0".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "controller_survival_slot".into(), value: "0".into() }).is_ok());
    }

    #[test]
    fn audited_controller_values_roundtrip_without_touching_other_bytes() {
        let original = b"// fixture\r\ngamepad_trigger_threshold \"30\"\r\ngamepad_aim_speed_ads_0 \"-1\"\r\ngamepad_aim_speed_ads_7 \"-1\"\r\nunknown \"keep\"\r\n\0";
        let original_text = String::from_utf8(original.to_vec()).unwrap();
        for (id, before, values) in [
            ("controller_trigger_deadzone", "30", vec!["0", "30", "64", "128", "255"]),
            ("controller_ads_sensitivity", "-1", vec!["-1", "0", "7"]),
            ("controller_numeric_optic_seer_passive", "-1", vec!["-1", "0", "7"]),
        ] {
            let key = setting_key(id).unwrap();
            assert_eq!(setting_file(id), Some("profile.cfg"));
            for value in values {
                assert!(validate_edit(&Edit::Setting { id: id.into(), value: value.into() }).is_ok());
                let mut doc = Document::parse(original);
                doc.change_setting(key, value, false);
                assert_eq!(doc.bytes(), original_text.replace(
                    &format!("{key} \"{before}\""), &format!("{key} \"{value}\""),
                ).as_bytes());
            }
        }
        for value in ["1", "2", "3", "4", "256", "NaN"] {
            assert!(validate_edit(&Edit::Setting { id: "controller_trigger_deadzone".into(), value: value.into() }).is_err());
        }
        assert!(validate_edit(&Edit::Setting { id: "controller_look_sensitivity".into(), value: "-1".into() }).is_err());
    }

    #[test]
    fn alc_validation_matches_each_menu_range() {
        for (id, min, max) in [
            ("controller_alc_deadzone", 0.0, 0.5),
            ("controller_alc_outer_threshold", 0.01, 0.3),
            ("controller_alc_curve", 0.0, 30.0),
            ("controller_alc_extra_yaw", 0.0, 250.0),
            ("controller_alc_extra_pitch", 0.0, 250.0),
            ("controller_alc_ads_extra_yaw", 0.0, 250.0),
            ("controller_alc_ads_extra_pitch", 0.0, 250.0),
        ] {
            for value in [min, max] {
                assert!(validate_edit(&Edit::Setting { id: id.into(), value: value.to_string() }).is_ok(), "{id}: {value}");
            }
            for value in [(min - 0.001).to_string(), (max + 0.001).to_string(), "NaN".into(), "inf".into()] {
                assert!(validate_edit(&Edit::Setting { id: id.into(), value: value.clone() }).is_err(), "{id}: {value}");
            }
        }
    }

    #[test]
    fn survival_slot_and_cursor_speed_are_editable_and_preserve_other_lines() {
        let original = b"// controller\r\ngamepad_toggle_survivalSlot_to_weaponInspect \"0\"\r\ngameCursor_Velocity \"1300.0\"\r\nunknown command\r\n\0";
        for (id, value) in [("controller_survival_slot", "1"), ("controller_cursor_speed", "4300")] {
            let edit = Edit::Setting { id: id.into(), value: value.into() };
            assert!(validate_edit(&edit).is_ok());
            assert_eq!(setting_file(id), Some("profile.cfg"));
            let mut doc = Document::parse(original);
            let key = setting_key(id).unwrap();
            doc.change_setting(key, value, false);
            let before = if id == "controller_survival_slot" { "0" } else { "1300.0" };
            let expected = String::from_utf8(original.to_vec()).unwrap()
                .replace(&format!("{key} \"{before}\""), &format!("{key} \"{value}\""));
            assert_eq!(doc.bytes(), expected.as_bytes());
        }
        for value in ["1300", "1300.0", "1400", "4300.000000"] {
            assert!(validate_edit(&Edit::Setting { id: "controller_cursor_speed".into(), value: value.into() }).is_ok());
        }
        for value in ["1299", "4301", "-1", "NaN", "inf", ""] {
            assert!(validate_edit(&Edit::Setting { id: "controller_cursor_speed".into(), value: value.into() }).is_err());
        }
        for value in ["0", "1"] {
            assert!(validate_edit(&Edit::Setting { id: "controller_survival_slot".into(), value: value.into() }).is_ok());
        }
        assert!(validate_edit(&Edit::Setting { id: "controller_survival_slot".into(), value: "2".into() }).is_err());
    }

    #[test]
    fn controller_layout_and_interaction_preserve_custom_mapping_and_other_lines() {
        let original = b"// keep\r\ngamepad_button_layout \"6\"\r\ngamepad_use_type \"2\"\r\ngamepad_custom_pilot \"0,9,2,3,6,7,4,5,8,1,10,11,12,13,14\"\r\nunknown command\r\n\0";
        for (id, maximum) in [("controller_button_layout", 6), ("controller_interact_mode", 2)] {
            for value in 0..=maximum {
                let edit = Edit::Setting { id: id.into(), value: value.to_string() };
                assert!(validate_edit(&edit).is_ok());
                let mut doc = Document::parse(original);
                let key = setting_key(id).unwrap();
                doc.change_setting(key, &value.to_string(), false);
                let before = if id == "controller_button_layout" { "6" } else { "2" };
                let expected = String::from_utf8(original.to_vec()).unwrap()
                    .replace(&format!("{key} \"{before}\""), &format!("{key} \"{value}\""));
                assert_eq!(doc.bytes(), expected.as_bytes());
            }
            for value in ["-1", "1.5", "invalid", &(maximum + 1).to_string()] {
                assert!(validate_edit(&Edit::Setting { id: id.into(), value: value.into() }).is_err());
            }
        }
    }
    #[test]
    fn controller_advanced_and_both_optic_modes_preserve_other_lines() {
        assert_eq!(setting_key("controller_numeric_optic_seer_passive"), Some("gamepad_aim_speed_ads_7"));
        assert_eq!(setting_key("controller_alc_optic_seer_passive"), Some("gamepad_ads_advanced_sensitivity_scalar_7"));
        let original=b"// keep\r\ngamepad_aim_speed_ads_0 \"1\"\r\ngamepad_aim_speed_ads_7 \"1\"\r\ngamepad_ads_advanced_sensitivity_scalar_7 \"1.0\"\r\nunknown %line\r\n\0";
        let mut doc=Document::parse(original);
        doc.change_setting(setting_key("controller_numeric_optic_seer_passive").unwrap(), "3", false);
        doc.change_setting(setting_key("controller_alc_optic_seer_passive").unwrap(), "2.6", false);
        assert_eq!(doc.bytes(),b"// keep\r\ngamepad_aim_speed_ads_0 \"1\"\r\ngamepad_aim_speed_ads_7 \"3\"\r\ngamepad_ads_advanced_sensitivity_scalar_7 \"2.6\"\r\nunknown %line\r\n\0");
        for (id,good,bad) in [
            ("controller_numeric_optic_8x","3","8"),
            ("controller_alc_optic_8x","2.8","21"),
            ("controller_alc_deadzone","0.15","1.01"),
            ("controller_alc_ads_ramp_time","1.0","-1"),
            ("controller_alc_yaw","160","501"),
            ("controller_alc_curve","10","NaN"),
        ] {
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:good.into()}).is_ok(),"{id}");
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:bad.into()}).is_err(),"{id}");
        }
    }
    #[test]
    fn hud_and_mantle_choices_are_bounded_and_preserve_other_lines() {
        for (id, key, max) in [
            ("mantle_input_observed", "mantle_boost_input_setting", 3),
            ("mantle_ui_observed", "mantle_boost_ui_setting", 3),
            ("tutorial_observed", "player_setting_tutorialization", 2),
            ("arsenal_icons", "player_setting_arsenals_maphudidentifiers", 2),
        ] {
            assert_eq!(setting_key(id), Some(key));
            assert_eq!(setting_file(id), Some("profile.cfg"));
            let original = format!("// preserved\r\n{key} \"0\"\r\nunknown_key \"custom\"\r\n\0");
            for value in 0..=max {
                let edit = Edit::Setting { id: id.into(), value: value.to_string() };
                assert!(validate_edit(&edit).is_ok());
                let mut document = Document::parse(original.as_bytes());
                document.change_setting(key, &value.to_string(), false);
                assert_eq!(document.bytes(), format!("// preserved\r\n{key} \"{value}\"\r\nunknown_key \"custom\"\r\n\0").as_bytes());
            }
            for invalid in ["-1".to_string(), (max+1).to_string(), "1.5".into(), "NaN".into()] {
                assert!(validate_edit(&Edit::Setting{id:id.into(),value:invalid}).is_err());
            }
        }
    }

    #[test]
    fn audited_settings_have_bounded_edits_and_observed_values_stay_read_only() {
        for (id,key,file) in [
            ("auto_run","player_setting_stickysprintforward","profile.cfg"),
            ("energy_ammo_percent","hud_setting_energyAmmoDisplay","profile.cfg"),
            ("performance_display","net_netGraph2","profile.cfg"),
            ("reflex_boost","gfx_nvnUseLowLatencyBoost","settings.cfg"),
            ("anti_aliasing","setting.mat_antialias_mode","videoconfig.txt"),
            ("audio_mix","miles_mix","profile.cfg"),
        ] {
            assert_eq!(setting_key(id),Some(key));
            assert_eq!(setting_file(id),Some(file));
            let good = if id == "anti_aliasing" { "12" } else { "1" };
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:good.into()}).is_ok());
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:"3".into()}).is_err());
        }
        assert!(validate_edit(&Edit::Setting{id:"brightness".into(),value:"1.1".into()}).is_ok());
        assert!(validate_edit(&Edit::Setting{id:"brightness".into(),value:"2".into()}).is_err());
        assert!(validate_edit(&Edit::Setting{id:"ping_opacity".into(),value:"0.5".into()}).is_ok());
        assert!(validate_edit(&Edit::Setting{id:"ping_opacity".into(),value:"0.4".into()}).is_err());
        assert!(validate_edit(&Edit::Setting{id:"ui_layout_observed".into(),value:"3".into()}).is_err());
        assert!(validate_edit(&Edit::Setting{id:"open_mic_threshold".into(),value:"1300".into()}).is_ok());
        assert!(validate_edit(&Edit::Setting{id:"open_mic_threshold".into(),value:"1301".into()}).is_err());
        assert_eq!(actions()["fire_mode"],"+scriptCommand3");
        assert_eq!(actions()["legend_wheel"],"chat_wheel");
    }
    #[test]
    fn researched_choices_reject_unsupported_values() {
        for (id, valid, invalid) in [
            ("anti_aliasing", "12", "1"),
            ("dynamic_spot_shadows", "4", "1"),
            ("texture_budget", "160000", "160001"),
            ("anisotropic", "0", "3"),
            ("sun_coverage", "2", "3"),
            ("sun_detail", "1024", "1000"),
            ("ao_quality", "4", "5"),
            ("map_detail", "2", "3"),
            ("effects_detail", "2", "3"),
            ("ragdolls", "8", "7"),
            ("subtitle_size", "2", "3"),
            ("crosshair_damage", "2", "3"),
            ("damage_text", "3", "4"),
            ("damage_indicator", "2", "3"),
            ("colorblind", "3", "4"),
            ("hud_streamer", "2", "3"),
            ("information_display", "1", "2"),
        ] {
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:valid.into()}).is_ok(), "{id}");
            assert!(validate_edit(&Edit::Setting{id:id.into(),value:invalid.into()}).is_err(), "{id}");
        }
        assert_eq!(setting_key("damage_indicator"), Some("damage_indicator_style_pilot"));
        assert_eq!(setting_key("crosshair_damage"), Some("hud_setting_damageIndicatorStyle"));
    }
    #[test]
    fn disable_shadows_edits_only_csm_enabled() {
        assert_eq!(setting_file("disable_shadows"), Some("videoconfig.txt"));
        assert_eq!(setting_key("disable_shadows"), Some("setting.csm_enabled"));
        assert!(validate_edit(&Edit::Setting { id: "disable_shadows".into(), value: "0".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "disable_shadows".into(), value: "1".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "disable_shadows".into(), value: "2".into() }).is_err());
        let original = b"\"setting.csm_enabled\"\t\"1\"\r\n\"setting.shadow_enable\"\t\"1\"\r\n// keep\r\n\0";
        let mut doc = Document::parse(original);
        doc.change_setting(setting_key("disable_shadows").unwrap(), "0", true);
        assert_eq!(doc.bytes(), b"\"setting.csm_enabled\"\t\"0\"\r\n\"setting.shadow_enable\"\t\"1\"\r\n// keep\r\n\0");
    }
    #[test]
    fn extra_video_options_change_only_selected_lines() {
        for (id, key, good, bad) in [
            ("gibs", "setting.cl_gib_allow", "0", "2"),
            ("ragdoll_self_collision", "setting.cl_ragdoll_self_collision", "1", "-1"),
            ("fade_distance", "setting.fadeDistScale", "0.75", "0.5"),
            ("dynamic_streaming_budget", "setting.dynamic_streaming_budget", "1", "2"),
        ] {
            assert_eq!(setting_file(id), Some("videoconfig.txt"), "{id}");
            assert_eq!(setting_key(id), Some(key), "{id}");
            assert!(validate_edit(&Edit::Setting { id:id.into(), value:good.into() }).is_ok(), "{id}");
            assert!(validate_edit(&Edit::Setting { id:id.into(), value:bad.into() }).is_err(), "{id}");
        }
        let original=b"\"setting.cl_gib_allow\"\t\"1\"\r\n\"setting.cl_ragdoll_maxcount\"\t\"8\"\r\n// keep\r\nunknown x\r\n\0";
        let mut doc=Document::parse(original);
        doc.change_setting("setting.cl_gib_allow", "0", true);
        assert_eq!(doc.bytes(), b"\"setting.cl_gib_allow\"\t\"0\"\r\n\"setting.cl_ragdoll_maxcount\"\t\"8\"\r\n// keep\r\nunknown x\r\n\0");
    }
    #[test]
    fn display_choices_have_distinct_validated_sources() {
        for (id, key, valid, invalid) in [
            ("brightness", "setting.gamma", "0.700000", "NaN"),
            ("adaptive_resolution", "setting.dvs_enable", "1", "2"),
            ("adaptive_fps_min", "setting.dvs_gpuframetime_min", "19000", "0"),
            ("adaptive_fps_max", "setting.dvs_gpuframetime_max", "19600", "999999"),
            ("impact_marks", "setting.r_decals", "256", "1"),
            ("impact_marks_models", "setting.r_createmodeldecals", "1", "2"),
            ("model_detail", "setting.r_lod_switch_scale", "0.8", "0.9"),
        ] {
            assert_eq!(setting_key(id), Some(key));
            assert_eq!(setting_file(id), Some("videoconfig.txt"));
            assert!(validate_edit(&Edit::Setting { id: id.into(), value: valid.into() }).is_ok(), "{id}");
            assert!(validate_edit(&Edit::Setting { id: id.into(), value: invalid.into() }).is_err(), "{id}");
        }
        let mut doc = Document::parse(b"\"setting.r_decals\"\t\"0\"\r\n\"setting.r_createmodeldecals\"\t\"0\"\r\nother line\r\n\0");
        doc.change_setting(setting_key("impact_marks").unwrap(), "256", true);
        doc.change_setting(setting_key("impact_marks_models").unwrap(), "1", true);
        assert_eq!(doc.bytes(), b"\"setting.r_decals\"\t\"256\"\r\n\"setting.r_createmodeldecals\"\t\"1\"\r\nother line\r\n\0");
    }
    #[test]
    fn gameplay_popup_privacy_and_color_edits_preserve_unrelated_lines() {
        for (id, key, good, bad) in [
            ("health_ammo_popups", "player_setting_lowammo_setting", "1", "3"),
            ("share_usage", "pin_opt_in", "0", "2"),
            ("reticle_color", "reticle_color", "0 255 0", "0 256 0"),
            ("laser_color", "laserSightColor", "255 0 255", "255 0"),
            ("laser_customized", "laserSightColorCustomized", "1", "2"),
        ] {
            assert_eq!(setting_key(id), Some(key));
            assert_eq!(setting_file(id), Some("profile.cfg"));
            assert!(validate_edit(&Edit::Setting { id: id.into(), value: good.into() }).is_ok(), "{id}");
            assert!(validate_edit(&Edit::Setting { id: id.into(), value: bad.into() }).is_err(), "{id}");
        }
        assert!(validate_edit(&Edit::Setting { id: "reticle_color".into(), value: " ".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "reticle_color".into(), value: "255 255 255".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "laser_color".into(), value: "0 0 0".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "reticle_color".into(), value: "2147483648 2147483648 2147483648".into() }).is_ok());
        assert!(validate_edit(&Edit::Setting { id: "laser_color".into(), value: "2147483648 2147483648 2147483648".into() }).is_err());
        let source = b"reticle_color \"-2147483648 -2147483648 -2147483648\"\r\nunknown_key \"keep\"\r\n// keep\r\n\0";
        let mut doc = Document::parse(source);
        doc.change_setting("reticle_color", "0 255 0", false);
        assert_eq!(doc.bytes(), b"reticle_color \"0 255 0\"\r\nunknown_key \"keep\"\r\n// keep\r\n\0");
        doc.change_setting("reticle_color", "2147483648 2147483648 2147483648", false);
        assert_eq!(doc.bytes(), b"reticle_color \"2147483648 2147483648 2147483648\"\r\nunknown_key \"keep\"\r\n// keep\r\n\0");
    }
}
