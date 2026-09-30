mod config;
mod engine;

use config::Edit;
use engine::{AppState, BackupInfo, Preview, Snapshot};
use std::{path::Path, sync::Mutex};
use tauri::{Manager, State};

fn open_github_url(url: windows::core::PCWSTR) -> Result<(), String> {
    use windows::core::w;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let result = unsafe {
        ShellExecuteW(
            None,
            w!("open"),
            url,
            None,
            None,
            SW_SHOWNORMAL,
        )
    };
    if (result.0 as isize) <= 32 {
        return Err("Could not open the GitHub page".to_string());
    }
    Ok(())
}

#[tauri::command]
fn open_github() -> Result<(), String> {
    open_github_url(windows::core::w!("https://github.com/shou-ta/apex-setting-hub"))
}

#[tauri::command]
fn open_github_releases() -> Result<(), String> {
    open_github_url(windows::core::w!("https://github.com/shou-ta/apex-setting-hub/releases"))
}

#[tauri::command]
fn detect() -> Vec<String> {
    engine::detect_roots()
}

#[tauri::command]
fn load(path: String, state: State<'_, AppState>) -> Result<Snapshot, String> {
    let loaded = engine::load_root(Path::new(&path))?;
    let snap = engine::snapshot(&loaded);
    *state.0.lock().map_err(|e| e.to_string())? = Some(loaded);
    Ok(snap)
}

#[tauri::command]
fn get_preview(edits: Vec<Edit>, state: State<'_, AppState>) -> Result<Preview, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    engine::preview(guard.as_ref().ok_or("Load a config folder first")?, &edits)
}

#[tauri::command]
fn apply_edits(
    edits: Vec<Edit>,
    mode: String,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let updated = engine::apply(
        guard.as_ref().ok_or("Load a config folder first")?,
        &edits,
        &mode,
    )?;
    let snap = engine::snapshot(&updated);
    *guard = Some(updated);
    Ok(snap)
}

#[tauri::command]
fn apply_low_video_preset(mode: String, state: State<'_, AppState>) -> Result<Snapshot, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let updated = engine::apply_low_video_preset(
        guard.as_ref().ok_or("Load a config folder first")?,
        &mode,
    )?;
    let snap = engine::snapshot(&updated);
    *guard = Some(updated);
    Ok(snap)
}

#[tauri::command]
fn backups() -> Result<Vec<BackupInfo>, String> {
    engine::list_backups()
}

#[tauri::command]
fn create_backup(state: State<'_, AppState>) -> Result<BackupInfo, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    engine::create_manual_backup(guard.as_ref().ok_or("Load a config folder first")?)
}

#[tauri::command]
fn update_backup(id: String, name: Option<String>, locked: Option<bool>, state: State<'_, AppState>) -> Result<BackupInfo, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    engine::update_backup(guard.as_ref().ok_or("Load a config folder first")?, &id, name, locked)
}

#[tauri::command]
fn inspect_backup(id: String, state: State<'_, AppState>) -> Result<Snapshot, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    engine::backup_snapshot(guard.as_ref().ok_or("Load a config folder first")?, &id)
}

#[tauri::command]
fn restore(id: String, state: State<'_, AppState>) -> Result<Snapshot, String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let updated = engine::restore_backup(guard.as_ref().ok_or("Load a config folder first")?, &id)?;
    let snap = engine::snapshot(&updated);
    *guard = Some(updated);
    Ok(snap)
}

#[tauri::command]
fn export(
    source: String,
    backup_id: Option<String>,
    destination: String,
    edits: Vec<Edit>,
    saved_at: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    engine::export_zip(
        guard.as_ref().ok_or("Load a config folder first")?,
        &edits,
        &source,
        backup_id.as_deref(),
        Path::new(&destination),
        &saved_at,
    )
}

#[tauri::command]
fn resolutions() -> Vec<String> {
    engine::display_modes()
}

#[tauri::command]
fn game_running() -> bool {
    engine::apex_running()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.get_webview_window("main")
                .ok_or("Main window was not created")?
                .set_icon(tauri::include_image!("./icons/icon.ico"))?;
            Ok(())
        })
        .manage(AppState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            detect,
            load,
            get_preview,
            apply_edits,
            apply_low_video_preset,
            backups,
            create_backup,
            update_backup,
            inspect_backup,
            restore,
            export,
            resolutions,
            game_running,
            open_github,
            open_github_releases
        ])
        .run(tauri::generate_context!())
        .expect("error while running Apex Setting Hub");
}
