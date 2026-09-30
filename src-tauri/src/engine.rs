use crate::config::{
    command_for, digest, format_fov, setting_file, setting_key, validate_edit, Document,
    Edit, FILES,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};

#[derive(Clone)]
pub struct Loaded {
    pub root: PathBuf,
    pub docs: BTreeMap<String, Document>,
    pub attributes: BTreeMap<String, bool>,
}

pub struct AppState(pub Mutex<Option<Loaded>>);

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub readonly: bool,
    pub hash: String,
}

#[derive(Serialize)]
pub struct BindInfo {
    pub key: String,
    pub action: String,
    pub special: Option<String>,
    pub value: Option<String>,
}

#[derive(Serialize)]
pub struct Snapshot {
    pub root: String,
    pub files: Vec<FileInfo>,
    pub settings: BTreeMap<String, String>,
    pub binds: Vec<BindInfo>,
}

#[derive(Serialize)]
pub struct DiffItem {
    pub label: String,
    pub file: String,
    pub before: String,
    pub after: String,
}

#[derive(Serialize)]
pub struct Preview {
    pub changes: Vec<DiffItem>,
    pub conflict: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub id: String,
    pub created: u64,
    pub root: String,
    pub readonly: BTreeMap<String, bool>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub locked: bool,
}

fn file_path(root: &Path, file: &str) -> PathBuf {
    if file == "profile.cfg" {
        root.join("profile").join(file)
    } else {
        root.join("local").join(file)
    }
}

fn canonical_root(path: &Path) -> Result<PathBuf, String> {
    let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    let root = if path
        .file_name()
        .is_some_and(|n| n.eq_ignore_ascii_case("local") || n.eq_ignore_ascii_case("profile"))
    {
        path.parent().unwrap().to_path_buf()
    } else {
        path
    };
    for file in FILES {
        if !file_path(&root, file).is_file() {
            return Err(format!("Missing {file}"));
        }
    }
    Ok(root)
}

pub fn detect_roots() -> Vec<String> {
    let mut candidates = Vec::new();
    for key in [
        "USERPROFILE",
        "OneDrive",
        "OneDriveConsumer",
        "OneDriveCommercial",
    ] {
        if let Some(home) = std::env::var_os(key) {
            candidates.push(
                PathBuf::from(home)
                    .join("Saved Games")
                    .join("Respawn")
                    .join("Apex"),
            );
        }
    }
    let mut roots = Vec::new();
    for path in candidates {
        if let Ok(root) = canonical_root(&path) {
            let text = root.to_string_lossy().to_string();
            if !roots.contains(&text) {
                roots.push(text);
            }
        }
    }
    roots
}

pub fn load_root(path: &Path) -> Result<Loaded, String> {
    let root = canonical_root(path)?;
    let mut docs = BTreeMap::new();
    let mut attributes = BTreeMap::new();
    for file in FILES {
        let path = file_path(&root, file);
        let bytes = fs::read(&path).map_err(|e| format!("{file}: {e}"))?;
        attributes.insert(
            file.into(),
            fs::metadata(&path)
                .map_err(|e| e.to_string())?
                .permissions()
                .readonly(),
        );
        docs.insert(file.into(), Document::parse(&bytes));
    }
    Ok(Loaded {
        root,
        docs,
        attributes,
    })
}

pub fn snapshot(loaded: &Loaded) -> Snapshot {
    let files = FILES
        .iter()
        .map(|f| FileInfo {
            name: (*f).into(),
            readonly: loaded.attributes[*f],
            hash: digest(&loaded.docs[*f].bytes()),
        })
        .collect();
    let mut settings = BTreeMap::new();
    for id in crate::config::SETTING_IDS {
        if let Some(raw) = loaded.docs[setting_file(id).unwrap()].setting(setting_key(id).unwrap())
        {
            let value = if *id == "fov" {
                display_value(id, &raw)
            } else {
                raw
            };
            settings.insert((*id).into(), value);
        }
    }
    let mut binds = Vec::new();
    for (key, command) in loaded.docs["settings.cfg"].menu_binds() {
        let mut action = crate::config::action_for_command(&command).unwrap_or("other").to_string();
        let mut special = None;
        let mut value = None;
        if let Some(v) = command.strip_prefix("fps_max ") {
            action = "fps".into();
            special = Some("fps".into());
            value = Some(v.into());
        }
        if let Some(v) = command.strip_prefix("cl_fovScale ") {
            action = "fov_special".into();
            special = Some("fov".into());
            value = v
                .parse::<f64>()
                .ok()
                .map(|n| (((70.0 + (n - 1.0) / 0.01375) / 2.0).round() as u32 * 2).to_string());
        }
        binds.push(BindInfo {
            key,
            action,
            special,
            value,
        });
    }
    Snapshot {
        root: loaded.root.to_string_lossy().to_string(),
        files,
        settings,
        binds,
    }
}

fn display_value(id: &str, raw: &str) -> String {
    if id == "fov" {
        raw.parse::<f64>()
            .ok()
            .map(|v| (((70.0 + (v - 1.0) / 0.01375) / 2.0).round() as u32 * 2).to_string())
            .unwrap_or_else(|| raw.into())
    } else {
        raw.into()
    }
}

fn describe_bind(doc: &Document, key: &str) -> String {
    let names: Vec<String> = doc
        .menu_binds()
        .into_iter()
        .filter(|(k, _)| k.eq_ignore_ascii_case(key))
        .map(|(_, command)| {
            if let Some(id) = crate::config::action_for_command(&command) {
                return id.into();
            }
            if let Some(v) = command.strip_prefix("fps_max ") {
                return format!("fps {v}");
            }
            if let Some(v) = command.strip_prefix("cl_fovScale ") {
                return format!("fov {}", display_value("fov", v));
            }
            "other".into()
        })
        .collect();
    if names.is_empty() {
        "—".into()
    } else {
        names.join(" / ")
    }
}

fn apply_to(loaded: &mut Loaded, edits: &[Edit]) -> Result<(), String> {
    for edit in edits {
        validate_edit(edit)?;
        match edit {
            Edit::Setting { id, value } => {
                let file = setting_file(id).unwrap();
                let key = setting_key(id).unwrap();
                let raw = if id == "fov" {
                    format_fov(value.parse().unwrap())
                } else {
                    value.clone()
                };
                loaded.docs.get_mut(file).unwrap().change_setting(
                    key,
                    &raw,
                    file == "videoconfig.txt",
                );
            }
            Edit::Bind { key, .. } | Edit::Special { key, .. } => loaded
                .docs
                .get_mut("settings.cfg")
                .unwrap()
                .add_bind(key, &command_for(edit)?.unwrap()),
            Edit::RemoveBind { key } => loaded
                .docs
                .get_mut("settings.cfg")
                .unwrap()
                .remove_bind(key),
            Edit::Readonly { file, value } => {
                loaded.attributes.insert(file.clone(), *value);
            }
        }
    }
    Ok(())
}

fn check_conflicts(base: &Loaded, live: &Loaded, edits: &[Edit]) -> Result<Option<String>, String> {
    for edit in edits {
        validate_edit(edit)?;
        match edit {
            Edit::Readonly { file, .. } => {
                if base.attributes[file] != live.attributes[file] {
                    return Ok(Some(format!("{file}: file protection changed externally")));
                }
            }
            _ => {
                let file = match edit {
                    Edit::Setting { id, .. } => setting_file(id).unwrap(),
                    _ => "settings.cfg",
                };
                if base.docs[file].fingerprint(edit, file)
                    != live.docs[file].fingerprint(edit, file)
                {
                    return Ok(Some(format!("{file}: edited value changed externally")));
                }
            }
        }
    }
    Ok(None)
}

fn live_with_merge(base: &Loaded, edits: &[Edit]) -> Result<(Loaded, Option<String>), String> {
    let mut live = load_root(&base.root)?;
    let conflict = check_conflicts(base, &live, edits)?;
    if conflict.is_some() {
        return Ok((live, conflict));
    }
    apply_to(&mut live, edits)?;
    Ok((live, None))
}

pub fn preview(base: &Loaded, edits: &[Edit]) -> Result<Preview, String> {
    let (_updated, conflict) = live_with_merge(base, edits)?;
    let current = load_root(&base.root)?;
    let mut changes = Vec::new();
    for edit in edits {
        let file = match edit {
            Edit::Setting { id, .. } => setting_file(id).unwrap(),
            Edit::Readonly { file, .. } => file.as_str(),
            _ => "settings.cfg",
        };
        let (before, after) = match edit {
            Edit::Setting { id, value } => (
                current.docs[file]
                    .setting(setting_key(id).unwrap())
                    .map(|s| display_value(id, &s))
                    .unwrap_or_else(|| "—".into()),
                value.clone(),
            ),
            Edit::Readonly { file, value } => (
                if current.attributes[file] {
                    "Read-only"
                } else {
                    "Writable"
                }
                .into(),
                if *value { "Read-only" } else { "Writable" }.into(),
            ),
            Edit::Bind { key, action } => (describe_bind(&current.docs[file], key), action.clone()),
            Edit::Special {
                key,
                special,
                value,
            } => (
                describe_bind(&current.docs[file], key),
                format!("{special} {value}"),
            ),
            Edit::RemoveBind { key } => (describe_bind(&current.docs[file], key), "—".into()),
        };
        if before != after {
            changes.push(DiffItem {
                label: match edit {
                    Edit::Setting { id, .. } => id.clone(),
                    Edit::Readonly { file, .. } => format!("{file} protection"),
                    Edit::Bind { key, .. }
                    | Edit::Special { key, .. }
                    | Edit::RemoveBind { key } => format!("Key {key}"),
                },
                file: file.into(),
                before,
                after,
            });
        }
    }
    Ok(Preview { changes, conflict })
}

pub fn apex_running() -> bool {
    let mut system = sysinfo::System::new();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    system.processes().values().any(|p| {
        let n = p.name().to_string_lossy().to_ascii_lowercase();
        n == "r5apex.exe" || n == "r5apex_dx12.exe" || n == "r5apex" || n == "r5apex_dx12"
    })
}

fn backups_dir() -> Result<PathBuf, String> {
    Ok(
        PathBuf::from(std::env::var_os("APPDATA").ok_or("APPDATA is unavailable")?)
            .join("ApexSettingHub")
            .join("backups"),
    )
}

pub fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let dir = backups_dir()?;
    prune_dir(&dir)?;
    read_backup_list(&dir)
}

fn read_backup_list(dir: &Path) -> Result<Vec<BackupInfo>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut result = Vec::new();
    for item in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let Ok(item) = item else { continue };
        if !item.path().is_dir() {
            continue;
        }
        if let Ok(bytes) = fs::read(item.path().join("manifest.json")) {
            if let Ok(info) = serde_json::from_slice::<BackupInfo>(&bytes) {
                result.push(info);
            }
        }
    }
    result.sort_by_key(|b| std::cmp::Reverse(b.created));
    Ok(result)
}

fn backup_current(base: &Loaded) -> Result<BackupInfo, String> {
    let dir = backups_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    backup_into(base, &dir)
}

pub fn create_manual_backup(base: &Loaded) -> Result<BackupInfo, String> {
    manual_backup_into(base, &backups_dir()?)
}

fn manual_backup_into(base: &Loaded, dir: &Path) -> Result<BackupInfo, String> {
    // Back up files currently on disk, including changes made since loading.
    let current = load_root(&base.root)?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let info = backup_into(&current, dir)?;
    prune_dir(dir)?;
    Ok(info)
}

fn backup_into(base: &Loaded, dir: &Path) -> Result<BackupInfo, String> {
    let created = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;
    let mut serial = 0u64;
    let (id, dest) = loop {
        let id = format!("{created}-{}-{serial}", std::process::id());
        let dest = dir.join(&id);
        match fs::create_dir(&dest) {
            Ok(()) => break (id, dest),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => serial += 1,
            Err(e) => return Err(e.to_string()),
        }
    };
    let info = BackupInfo {
        id,
        created,
        root: base.root.to_string_lossy().to_string(),
        readonly: base.attributes.clone(),
        name: String::new(),
        locked: false,
    };
    for file in FILES {
        if let Err(e) = fs::copy(file_path(&base.root, file), dest.join(file)) {
            let _ = fs::remove_dir_all(&dest);
            return Err(e.to_string());
        }
        // Keep the original attribute in the manifest, not on backup copies.
        // Windows cannot prune read-only files with remove_dir_all.
        set_readonly(&dest.join(file), false)?;
        if fs::read(dest.join(file)).map_err(|e| e.to_string())? != base.docs[file].bytes() {
            let _ = fs::remove_dir_all(&dest);
            return Err(format!("{file} changed during backup"));
        }
    }
    let manifest = serde_json::to_vec_pretty(&info).map_err(|e| e.to_string())?;
    fs::write(dest.join("manifest.json"), manifest).map_err(|e| e.to_string())?;
    Ok(info)
}

fn prune_backups() -> Result<(), String> {
    prune_dir(&backups_dir()?)
}
fn prune_dir(dir: &Path) -> Result<(), String> {
    for info in read_backup_list(dir)?.into_iter().filter(|info| !info.locked).skip(10) {
        safe_backup_id(&info.id)?;
        let path = dir.join(info.id);
        // Older versions copied the source read-only flag into the backup.
        for file in FILES {
            let copy = path.join(file);
            if copy.is_file() { set_readonly(&copy, false)?; }
        }
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn set_readonly(path: &Path, value: bool) -> Result<(), String> {
    let mut p = fs::metadata(path).map_err(|e| e.to_string())?.permissions();
    p.set_readonly(value);
    fs::set_permissions(path, p).map_err(|e| e.to_string())
}

fn write_one(path: &Path, bytes: &[u8], readonly: bool, replace: bool) -> Result<(), String> {
    let original_readonly = fs::metadata(path)
        .map_err(|e| e.to_string())?
        .permissions()
        .readonly();
    if replace {
        let temp = path.with_extension(format!("ash-{}.tmp", std::process::id()));
        fs::write(&temp, bytes).map_err(|e| e.to_string())?;
        if fs::read(&temp).map_err(|e| e.to_string())? != bytes {
            let _ = fs::remove_file(&temp);
            return Err("Staged file verification failed".into());
        }
        if original_readonly {
            set_readonly(path, false)?;
        }
        if let Err(e) = fs::remove_file(path) {
            let _ = set_readonly(path, original_readonly);
            let _ = fs::remove_file(&temp);
            return Err(e.to_string());
        }
        if let Err(e) = fs::rename(&temp, path) {
            let _ = fs::remove_file(&temp);
            return Err(e.to_string());
        }
    } else {
        if original_readonly {
            set_readonly(path, false)?;
        }
        if let Err(e) = fs::write(path, bytes) {
            let _ = set_readonly(path, original_readonly);
            return Err(e.to_string());
        }
    }
    set_readonly(path, readonly)?;
    if fs::read(path).map_err(|e| e.to_string())? != bytes {
        return Err("Written file verification failed".into());
    }
    Ok(())
}

fn restore_files(root: &Path, backup: &BackupInfo) -> Result<(), String> {
    let dir = backups_dir()?.join(&backup.id);
    for file in FILES {
        let path = file_path(root, file);
        let bytes = fs::read(dir.join(file)).map_err(|e| e.to_string())?;
        if path.exists()
            && fs::metadata(&path)
                .map_err(|e| e.to_string())?
                .permissions()
                .readonly()
        {
            set_readonly(&path, false)?;
        }
        fs::write(&path, bytes).map_err(|e| e.to_string())?;
        set_readonly(&path, backup.readonly[file])?;
    }
    Ok(())
}

pub fn apply(base: &Loaded, edits: &[Edit], mode: &str) -> Result<Loaded, String> {
    if edits.is_empty() {
        return Err("No changes".into());
    }
    if mode != "normal" && mode != "replace" {
        return Err("Invalid write mode".into());
    }
    if apex_running() {
        return Err("Apex Legends is running. Close the game before applying changes.".into());
    }
    let before = load_root(&base.root)?;
    if let Some(c) = check_conflicts(base, &before, edits)? {
        return Err(format!("Conflict: {c}"));
    }
    let mut updated = before.clone();
    apply_to(&mut updated, edits)?;
    let backup = backup_current(&before)?;
    for file in FILES {
        let path = file_path(&base.root, file);
        let bytes = updated.docs[file].bytes();
        let old = before.docs[file].bytes();
        let attr = updated.attributes[file];
        if bytes != old || attr != before.attributes[file] {
            if apex_running() {
                return Err("Apex Legends started during Apply; no further files were written. Restore the latest backup before continuing.".into());
            }
            if fs::read(&path).map_err(|e| e.to_string())? != old {
                return Err(format!(
                    "{file} changed during Apply; restore backup {} if needed",
                    backup.id
                ));
            }
            if fs::metadata(&path)
                .map_err(|e| e.to_string())?
                .permissions()
                .readonly()
                != before.attributes[file]
            {
                return Err(format!("{file} protection changed during Apply"));
            }
            let write_result = if bytes == old {
                set_readonly(&path, attr)
            } else {
                write_one(&path, &bytes, attr, mode == "replace")
            };
            if let Err(e) = write_result {
                return match restore_files(&base.root, &backup) {
                    Ok(()) => Err(format!("Apply failed and backup restored: {e}")),
                    Err(rollback) => Err(format!(
                        "Apply failed: {e}; rollback failed: {rollback}; backup {} remains",
                        backup.id
                    )),
                };
            }
        }
    }
    let _ = prune_backups();
    load_root(&base.root)
}

const LOW_VIDEO_PRESET: [(&str, &str); 17] = [
    ("anti_aliasing", "0"),
    ("texture_budget", "0"),
    ("anisotropic", "0"),
    ("ao_quality", "0"),
    ("sun_coverage", "1"),
    ("sun_detail", "512"),
    ("spot_detail_observed", "0"),
    ("spot_shadow_upres", "0"),
    ("shadows", "0"),
    ("volumetric_lighting", "0"),
    ("dynamic_spot_shadows", "0"),
    ("model_detail", "0.6"),
    ("map_detail", "1"),
    ("effects_detail", "0"),
    ("impact_marks", "0"),
    ("impact_marks_models", "0"),
    ("ragdolls", "0"),
];

fn low_video_preset_edits() -> Vec<Edit> {
    LOW_VIDEO_PRESET.iter().map(|(id, value)| Edit::Setting {
        id: (*id).into(),
        value: (*value).into(),
    }).collect()
}

pub fn apply_low_video_preset(base: &Loaded, mode: &str) -> Result<Loaded, String> {
    if mode != "normal" && mode != "replace" {
        return Err("Invalid write mode".into());
    }
    let current = load_root(&base.root)?;
    let video = &current.docs["videoconfig.txt"];
    if LOW_VIDEO_PRESET.iter().all(|(id, value)| {
        video.setting(setting_key(id).unwrap()).as_deref() == Some(*value)
    }) {
        return Ok(current);
    }
    apply(base, &low_video_preset_edits(), mode)
}

fn safe_backup_id(id: &str) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_digit() || c == '-') {
        Err("Invalid backup id".into())
    } else {
        Ok(())
    }
}

pub fn restore_backup(base: &Loaded, id: &str) -> Result<Loaded, String> {
    safe_backup_id(id)?;
    if apex_running() {
        return Err("Apex Legends is running".into());
    }
    restore_backup_from_dir(base, id, &backups_dir()?)
}

fn restore_backup_from_dir(base: &Loaded, id: &str, dir: &Path) -> Result<Loaded, String> {
    safe_backup_id(id)?;
    let info = read_backup_list(dir)?
        .into_iter()
        .find(|b| b.id == id)
        .ok_or("Backup not found")?;
    if info.root != base.root.to_string_lossy() {
        return Err("Backup belongs to another Apex folder".into());
    }
    let current = load_root(&base.root)?;
    // Read every source before writing. Recovery uses memory, not a new backup.
    let mut contents = Vec::new();
    for file in FILES {
        let bytes = fs::read(dir.join(id).join(file)).map_err(|e| e.to_string())?;
        let readonly = *info.readonly.get(file).ok_or("Backup attributes missing")?;
        contents.push((file, bytes, readonly));
    }
    let result = (|| {
        for (file, bytes, readonly) in &contents {
            write_one(&file_path(&base.root, file), bytes, *readonly, false)?;
        }
        load_root(&base.root)
    })();
    if let Err(e) = result {
        let recovery = (|| {
            for file in FILES {
                write_one(&file_path(&base.root, file), &current.docs[file].bytes(), current.attributes[file], false)?;
            }
            Ok::<(), String>(())
        })();
        return match recovery {
            Ok(()) => Err(format!("Restore failed and current files recovered: {e}")),
            Err(r) => Err(format!("Restore failed: {e}; recovery failed: {r}")),
        };
    }
    result
}

pub fn update_backup(base: &Loaded, id: &str, name: Option<String>, locked: Option<bool>) -> Result<BackupInfo, String> {
    update_backup_in_dir(base, id, name, locked, &backups_dir()?)
}

fn update_backup_in_dir(base: &Loaded, id: &str, name: Option<String>, locked: Option<bool>, dir: &Path) -> Result<BackupInfo, String> {
    safe_backup_id(id)?;
    let mut info = read_backup_list(dir)?.into_iter().find(|b| b.id == id).ok_or("Backup not found")?;
    if info.root != base.root.to_string_lossy() { return Err("Backup belongs to another Apex folder".into()); }
    if let Some(name) = name {
        let name = name.trim();
        if name.chars().count() > 100 || name.chars().any(char::is_control) { return Err("Backup name must be at most 100 characters without control characters".into()); }
        info.name = name.to_string();
    }
    if let Some(locked) = locked { info.locked = locked; }
    fs::write(dir.join(id).join("manifest.json"), serde_json::to_vec_pretty(&info).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(info)
}

pub fn backup_snapshot(base: &Loaded, id: &str) -> Result<Snapshot, String> {
    safe_backup_id(id)?;
    let info = list_backups()?
        .into_iter()
        .find(|b| b.id == id)
        .ok_or("Backup not found")?;
    if info.root != base.root.to_string_lossy() {
        return Err("Backup belongs to another Apex folder".into());
    }
    let mut docs = BTreeMap::new();
    for file in FILES {
        docs.insert(
            file.into(),
            Document::parse(
                &fs::read(backups_dir()?.join(id).join(file)).map_err(|e| e.to_string())?,
            ),
        );
    }
    Ok(snapshot(&Loaded {
        root: base.root.clone(),
        docs,
        attributes: info.readonly,
    }))
}

pub fn export_zip(
    base: &Loaded,
    edits: &[Edit],
    source: &str,
    backup_id: Option<&str>,
    destination: &Path,
    saved_at: &str,
) -> Result<(), String> {
    let current = load_root(&base.root)?;
    let content = match source {
        "current" => current
            .docs
            .iter()
            .map(|(n, d)| (n.clone(), d.bytes()))
            .collect::<BTreeMap<_, _>>(),
        "edited" => {
            let (updated, conflict) = live_with_merge(base, edits)?;
            if let Some(c) = conflict {
                return Err(format!("Conflict: {c}"));
            }
            updated
                .docs
                .iter()
                .map(|(n, d)| (n.clone(), d.bytes()))
                .collect()
        }
        "backup" => backup_zip_content(base, backup_id.ok_or("Select a backup")?, &backups_dir()?)?,
        _ => return Err("Invalid export source".into()),
    };
    let file = fs::File::create(destination).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    for file in FILES {
        zip.start_file(file, options).map_err(|e| e.to_string())?;
        zip.write_all(&content[file]).map_err(|e| e.to_string())?;
    }
    zip.start_file("README.txt", options).map_err(|e| e.to_string())?;
    zip.write_all(zip_readme(base, saved_at).as_bytes()).map_err(|e| e.to_string())?;
    zip.start_file("apply.bat", options).map_err(|e| e.to_string())?;
    let batch = include_str!("../assets/apply.bat")
        .replace("\r\n", "\n")
        .replace('\n', "\r\n");
    zip.write_all(batch.as_bytes()).map_err(|e| e.to_string())?;
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn zip_readme(base: &Loaded, saved_at: &str) -> String {
    let stored_root = base.root.to_string_lossy();
    let root = stored_root.strip_prefix(r"\\?\").unwrap_or(stored_root.as_ref());
    format!(
        "APEX SETTING HUB\n\n\
         保存日時 {saved_at}\n\n\
         ファイルの配置先\n\
         - settings.cfg -> {root}\\local\\settings.cfg\n\
         - videoconfig.txt -> {root}\\local\\videoconfig.txt\n\
         - profile.cfg -> {root}\\profile\\profile.cfg\n\n\
         使い方\n\
         1. Apex Legendsを完全に終了してください。\n\
         2. 各ファイルを上記の場所にコピーし、既存ファイルを置き換えてください。\n\
         3. Apexを起動して設定を確認してください。\n"
    )
}

fn backup_zip_content(base: &Loaded, id: &str, dir: &Path) -> Result<BTreeMap<String, Vec<u8>>, String> {
    safe_backup_id(id)?;
    prune_dir(dir)?;
    if !read_backup_list(dir)?
        .iter()
        .any(|backup| backup.id == id && backup.root == base.root.to_string_lossy())
    {
        return Err("Backup not found for this folder".into());
    }
    FILES
        .iter()
        .map(|file| {
            fs::read(dir.join(id).join(file))
                .map(|bytes| ((*file).to_string(), bytes))
                .map_err(|error| error.to_string())
        })
        .collect()
}

#[cfg(target_os = "windows")]
pub fn display_modes() -> Vec<String> {
    use windows::Win32::Graphics::Gdi::{
        EnumDisplaySettingsW, DEVMODEW, ENUM_DISPLAY_SETTINGS_MODE,
    };
    let mut modes = Vec::new();
    let mut i = 0;
    loop {
        let mut mode = DEVMODEW::default();
        mode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;
        let ok = unsafe { EnumDisplaySettingsW(None, ENUM_DISPLAY_SETTINGS_MODE(i), &mut mode) }
            .as_bool();
        if !ok {
            break;
        }
        let text = format!("{}x{}", mode.dmPelsWidth, mode.dmPelsHeight);
        if !modes.contains(&text) {
            modes.push(text);
        }
        i += 1;
    }
    modes.sort_by_key(|s| {
        let mut n = s.split('x').filter_map(|v| v.parse::<u32>().ok());
        (n.next().unwrap_or(0), n.next().unwrap_or(0))
    });
    modes
}

#[cfg(not(target_os = "windows"))]
pub fn display_modes() -> Vec<String> {
    vec!["1920x1080".into()]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    #[test]
    fn lowest_graphics_preset_changes_only_video_quality_settings() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        let settings = b"mouse_sensitivity \"1.5\"\r\n\0";
        let profile = b"gamepad_aim_speed \"3\"\r\n\0";
        let video = b"\"setting.defaultres\" \"1728\"\r\n\"setting.gamma\" \"1.0\"\r\n\"setting.fullscreen\" \"1\"\r\n\"setting.mat_antialias_mode\" \"12\"\r\nunknown keep\r\n\0";
        fs::write(root.join("local/settings.cfg"), settings).unwrap();
        fs::write(root.join("profile/profile.cfg"), profile).unwrap();
        fs::write(root.join("local/videoconfig.txt"), video).unwrap();
        let mut loaded = load_root(root).unwrap();
        let edits = low_video_preset_edits();
        assert_eq!(edits.len(), LOW_VIDEO_PRESET.len());
        for edit in &edits {
            let Edit::Setting { id, .. } = edit else { panic!("Preset must contain settings only") };
            assert_eq!(setting_file(id), Some("videoconfig.txt"));
            validate_edit(edit).unwrap();
        }
        apply_to(&mut loaded, &edits).unwrap();
        assert_eq!(loaded.docs["settings.cfg"].bytes(), settings);
        assert_eq!(loaded.docs["profile.cfg"].bytes(), profile);
        let result = &loaded.docs["videoconfig.txt"];
        for (id, value) in LOW_VIDEO_PRESET {
            assert_eq!(result.setting(setting_key(id).unwrap()).as_deref(), Some(value), "{id}");
        }
        for (key, value) in [("setting.defaultres", "1728"), ("setting.gamma", "1.0"), ("setting.fullscreen", "1")] {
            assert_eq!(result.setting(key).as_deref(), Some(value));
        }
        assert!(result.bytes().windows(b"unknown keep".len()).any(|part| part == b"unknown keep"));
        assert_eq!(result.bytes().last(), Some(&0));
    }
    #[test]
    fn user_confirmed_binds_load_as_menu_actions_and_heal_companion_is_not_a_conflict() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"\0").unwrap();
        fs::write(root.join("profile/profile.cfg"), b"").unwrap();
        let observed = [
            ("0", "ping_specific_type ATTACK", "ping_attack"),
            ("9", "ping_specific_type ENEMY_AUDIO", "ping_audio"),
            ("=", "ping_specific_type REGROUP", "ping_regroup"),
            ("-", "ping_specific_type AVOID", "ping_avoid"),
            ("8", "toggle_obs_auto_mapcam", "observer_auto_mapcam"),
            ("7", "in_spec_altitude_lock", "observer_altitude_lock"),
            ("]", "in_spec_toggle_smoothcam", "observer_smoothcam"),
            ("p", "roamingcam_togglerollmode", "observer_roll_mode"),
            ("l", "+spectatorRollClockwise", "observer_roll_clockwise"),
            ("k", "+spectatorRollCounterClockwise", "observer_roll_counterclockwise"),
            ("4", "+scriptCommand4", "selected_health"),
        ];
        let mut fixture = observed.iter().map(|(key,command,_)| format!("bind_US_standard \"{key}\" \"{command}\" 0\r\n")).collect::<String>();
        fixture.push_str("bind_held_US_standard \"4\" \"+scriptCommand2\" 0\r\nbind_US_standard \"\" \"+dodge\" 0\r\nunknown keep\r\n\0");
        fs::write(root.join("local/settings.cfg"), fixture.as_bytes()).unwrap();
        let mut loaded = load_root(root).unwrap();
        let snap = snapshot(&loaded);
        for (key,_,action) in observed { assert!(snap.binds.iter().any(|bind| bind.key == key && bind.action == action)); }
        assert_eq!(snap.binds.len(), observed.len());
        assert_eq!(describe_bind(&loaded.docs["settings.cfg"], "4"), "selected_health");
        apply_to(&mut loaded, &[Edit::RemoveBind{key:"4".into()},Edit::Bind{key:"H".into(),action:"selected_health".into()}]).unwrap();
        assert_eq!(describe_bind(&loaded.docs["settings.cfg"], "H"), "selected_health");
        assert_eq!(loaded.docs["settings.cfg"].binds().iter().filter(|(key,_)| key == "H").count(), 2);
        assert_eq!(fs::read(root.join("local/settings.cfg")).unwrap(), fixture.as_bytes());
    }
    #[test]
    fn controller_values_are_loaded_from_profile_without_editing_it() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(root.join("local/settings.cfg"), b"").unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"\0").unwrap();
        let profile = b"gamepad_aim_speed \"3\"\r\ngamepad_aim_speed_ads_0 \"1\"\r\ngamepad_look_curve \"4\"\r\ngamepad_stick_layout \"0\"\r\ngamepad_button_layout \"6\"\r\n";
        fs::write(root.join("profile/profile.cfg"), profile).unwrap();
        let snap = snapshot(&load_root(root).unwrap());
        assert_eq!(snap.settings["controller_look_sensitivity"], "3");
        assert_eq!(snap.settings["controller_ads_sensitivity"], "1");
        assert_eq!(snap.settings["controller_response_curve"], "4");
        assert_eq!(snap.settings["controller_stick_layout"], "0");
        assert_eq!(snap.settings["controller_button_layout"], "6");
        assert_eq!(fs::read(root.join("profile/profile.cfg")).unwrap(), profile);
    }
    #[test]
    fn audio_mix_is_loaded_and_written_in_profile() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(root.join("local/settings.cfg"), b"").unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"\0").unwrap();
        let profile = b"miles_mix \"1\"\r\nother \"keep\"\r\n";
        fs::write(root.join("profile/profile.cfg"), profile).unwrap();

        let mut loaded = load_root(root).unwrap();
        assert_eq!(snapshot(&loaded).settings["audio_mix"], "1");
        apply_to(&mut loaded, &[Edit::Setting { id: "audio_mix".into(), value: "0".into() }]).unwrap();
        assert_eq!(loaded.docs["profile.cfg"].setting("miles_mix").as_deref(), Some("0"));
        assert_eq!(loaded.docs["profile.cfg"].setting("other").as_deref(), Some("keep"));
        assert_eq!(loaded.docs["settings.cfg"].setting("miles_mix"), None);
    }
    #[test]
    fn fps_and_fov_display_snapshot_roundtrips_without_touching_bindings_on_other_edits() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        let settings = b"// keep\r\nbind_US_standard \"Q\" \"fps_max 120\" 0\r\nbind_US_standard \"R\" \"fps_max 120\" 1\r\nbind_US_standard \"F9\" \"fps_max 165\" 0\r\nbind_US_standard \"F10\" \"cl_fovScale 1.44\" 0\r\nbind_US_standard \"F11\" \"cl_fovScale 1.6875\" 0\r\nbind_US_standard \"SPACE\" \"+jump\" 0\r\nunknown keep-me\r\n\0";
        let profile = b"miles_mix \"1\"\r\ncontroller_look_sensitivity \"4\"\r\n\0";
        fs::write(root.join("local/settings.cfg"), settings).unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"\0").unwrap();
        fs::write(root.join("profile/profile.cfg"), profile).unwrap();

        let mut loaded = load_root(root).unwrap();
        let initial = snapshot(&loaded);
        let special: Vec<_> = initial.binds.iter()
            .filter(|bind| bind.special.is_some())
            .map(|bind| (bind.key.as_str(), bind.special.as_deref().unwrap(), bind.value.as_deref().unwrap()))
            .collect();
        assert_eq!(special, [
            ("Q", "fps", "120"), ("R", "fps", "120"), ("F9", "fps", "165"),
            ("F10", "fov", "102"), ("F11", "fov", "120"),
        ]);
        assert_eq!(fs::read(root.join("local/settings.cfg")).unwrap(), settings);

        apply_to(&mut loaded, &[Edit::Setting { id: "audio_mix".into(), value: "0".into() }]).unwrap();
        assert_eq!(loaded.docs["settings.cfg"].bytes(), settings);
        assert_eq!(loaded.docs["profile.cfg"].setting("miles_mix").as_deref(), Some("0"));
        assert_eq!(loaded.docs["profile.cfg"].setting("controller_look_sensitivity").as_deref(), Some("4"));
        fs::write(root.join("profile/profile.cfg"), loaded.docs["profile.cfg"].bytes()).unwrap();

        let reloaded = load_root(root).unwrap();
        let after = snapshot(&reloaded);
        let special_after: Vec<_> = after.binds.iter()
            .filter(|bind| bind.special.is_some())
            .map(|bind| (bind.key.as_str(), bind.special.as_deref().unwrap(), bind.value.as_deref().unwrap()))
            .collect();
        assert_eq!(special_after, special);
        assert!(after.binds.iter().any(|bind| bind.key == "SPACE" && bind.action == "jump"));
        assert!(String::from_utf8(fs::read(root.join("local/settings.cfg")).unwrap()).unwrap().contains("unknown keep-me"));
    }
    #[test]
    fn every_even_fov_preset_roundtrips_through_the_saved_command_value() {
        for fov in (70..=120).step_by(2) {
            let command = command_for(&Edit::Special {
                key: "F9".into(), special: "fov".into(), value: fov.to_string(),
            }).unwrap().unwrap();
            let raw = command.strip_prefix("cl_fovScale ").unwrap();
            assert_eq!(display_value("fov", raw), fov.to_string(), "FOV preset {fov}: {raw}");
        }
    }
    #[test]
    fn mouse_ads_and_one_x_sensitivity_pair_writes_and_reloads_both_saved_values() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        let settings = b"mouse_use_per_scope_sensitivity_scalars \"0\"\r\nmouse_zoomed_sensitivity_scalar \"0.2\"\r\nmouse_zoomed_sensitivity_scalar_0 \"1.35\"\r\nother_setting \"keep\"\r\n\0";
        fs::write(root.join("local/settings.cfg"), settings).unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"\0").unwrap();
        fs::write(root.join("profile/profile.cfg"), b"\0").unwrap();

        let mut loaded = load_root(root).unwrap();
        assert_eq!(snapshot(&loaded).settings["ads_sensitivity"], "0.2");
        assert_eq!(snapshot(&loaded).settings["optic_1x"], "1.35");
        apply_to(&mut loaded, &[
            Edit::Setting { id: "ads_sensitivity".into(), value: "0.7".into() },
            Edit::Setting { id: "optic_1x".into(), value: "0.7".into() },
        ]).unwrap();
        assert_eq!(loaded.docs["settings.cfg"].setting("mouse_zoomed_sensitivity_scalar").as_deref(), Some("0.7"));
        assert_eq!(loaded.docs["settings.cfg"].setting("mouse_zoomed_sensitivity_scalar_0").as_deref(), Some("0.7"));
        assert_eq!(loaded.docs["settings.cfg"].setting("other_setting").as_deref(), Some("keep"));
        fs::write(root.join("local/settings.cfg"), loaded.docs["settings.cfg"].bytes()).unwrap();
        let reloaded = snapshot(&load_root(root).unwrap());
        assert_eq!(reloaded.settings["ads_sensitivity"], reloaded.settings["optic_1x"]);
        assert_eq!(fs::read(root.join("local/settings.cfg")).unwrap().last(), Some(&0));
    }
    #[test]
    fn detects_conflicting_edit_and_merges_unrelated_line() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        fs::create_dir(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(
            root.join("local/settings.cfg"),
            b"mouse_sensitivity \"1\"\r\nother \"a\"\r\n",
        )
        .unwrap();
        fs::write(
            root.join("profile/profile.cfg"),
            b"cl_fovScale \"1.55\"\r\n",
        )
        .unwrap();
        fs::write(
            root.join("local/videoconfig.txt"),
            b"\"setting.defaultres\" \"1920\"\r\n\0",
        )
        .unwrap();
        let base = load_root(root).unwrap();
        fs::write(
            root.join("local/settings.cfg"),
            b"mouse_sensitivity \"1\"\r\nother \"b\"\r\n",
        )
        .unwrap();
        let edit = Edit::Setting {
            id: "sensitivity".into(),
            value: "2".into(),
        };
        let (merged, conflict) = live_with_merge(&base, &[edit.clone()]).unwrap();
        assert!(conflict.is_none());
        assert!(String::from_utf8(merged.docs["settings.cfg"].bytes())
            .unwrap()
            .contains("other \"b\""));
        fs::write(
            root.join("local/settings.cfg"),
            b"mouse_sensitivity \"3\"\r\nother \"b\"\r\n",
        )
        .unwrap();
        assert!(live_with_merge(&base, &[edit]).unwrap().1.is_some());
    }
    #[test]
    fn normal_and_replace_keep_requested_attributes_and_recover_from_stage_error() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("config.cfg");
        fs::write(&file, b"old\r\n").unwrap();
        set_readonly(&file, true).unwrap();
        write_one(&file, b"normal\r\n", true, false).unwrap();
        assert_eq!(fs::read(&file).unwrap(), b"normal\r\n");
        assert!(fs::metadata(&file).unwrap().permissions().readonly());
        write_one(&file, b"replace\r\n", false, true).unwrap();
        assert_eq!(fs::read(&file).unwrap(), b"replace\r\n");
        assert!(!fs::metadata(&file).unwrap().permissions().readonly());
        let stage = file.with_extension(format!("ash-{}.tmp", std::process::id()));
        fs::create_dir(&stage).unwrap();
        assert!(write_one(&file, b"broken", false, true).is_err());
        assert_eq!(fs::read(&file).unwrap(), b"replace\r\n");
    }
    #[test]
    fn zip_sources_match_fixture_bytes() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("Apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(
            root.join("local/settings.cfg"),
            b"mouse_sensitivity \"1\"\r\n",
        )
        .unwrap();
        fs::write(
            root.join("profile/profile.cfg"),
            b"cl_fovScale \"1.55\"\r\n",
        )
        .unwrap();
        fs::write(
            root.join("local/videoconfig.txt"),
            b"\"setting.defaultres\" \"1920\"\r\n\0",
        )
        .unwrap();
        let base = load_root(&root).unwrap();
        let zip_path = temp.path().join("out.zip");
        export_zip(&base, &[], "current", None, &zip_path, "2000-01-01 10:10").unwrap();
        let mut archive = zip::ZipArchive::new(fs::File::open(&zip_path).unwrap()).unwrap();
        let mut video = Vec::new();
        archive
            .by_name("videoconfig.txt")
            .unwrap()
            .read_to_end(&mut video)
            .unwrap();
        assert_eq!(video, b"\"setting.defaultres\" \"1920\"\r\n\0");
        let mut readme = String::new();
        archive
            .by_name("README.txt")
            .unwrap()
            .read_to_string(&mut readme)
            .unwrap();
        let stored_root = base.root.to_string_lossy();
        let root = stored_root.strip_prefix(r"\\?\").unwrap_or(stored_root.as_ref());
        assert!(readme.contains("保存日時 2000-01-01 10:10"));
        assert!(readme.contains(&format!("- settings.cfg -> {root}\\local\\settings.cfg")));
        assert!(readme.contains(&format!("- videoconfig.txt -> {root}\\local\\videoconfig.txt")));
        assert!(readme.contains(&format!("- profile.cfg -> {root}\\profile\\profile.cfg")));
        assert_eq!(readme.lines().count(), 13);
        let mut batch = String::new();
        archive
            .by_name("apply.bat")
            .unwrap()
            .read_to_string(&mut batch)
            .unwrap();
        assert!(batch.contains("APEX_SETTING_HUB_TARGET"));
        assert!(batch.contains("ApexSettingHub_backup_"));
        assert!(batch.contains("r5apex_dx12.exe"));
        assert!(batch.contains("\r\n"));
        drop(archive);
        export_zip(
            &base,
            &[Edit::Setting {
                id: "sensitivity".into(),
                value: "2".into(),
            }],
            "edited",
            None,
            &zip_path,
            "2000-01-01 10:10",
        )
        .unwrap();
        let mut archive = zip::ZipArchive::new(fs::File::open(zip_path).unwrap()).unwrap();
        let mut settings = String::new();
        archive
            .by_name("settings.cfg")
            .unwrap()
            .read_to_string(&mut settings)
            .unwrap();
        assert_eq!(settings, "mouse_sensitivity \"2\"\r\n");
    }
    #[test]
    fn zip_backup_source_includes_locked_backup_bytes_and_checks_folder_ownership() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("Apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        fs::write(root.join("local/settings.cfg"), b"current settings\n").unwrap();
        fs::write(root.join("profile/profile.cfg"), b"current profile\n").unwrap();
        fs::write(root.join("local/videoconfig.txt"), b"current video\n").unwrap();
        let base = load_root(&root).unwrap();
        let backup_dir = temp.path().join("backups");
        let backup_path = backup_dir.join("10-20-0");
        fs::create_dir_all(&backup_path).unwrap();
        let info = BackupInfo {
            id: "10-20-0".into(),
            created: 10,
            root: base.root.to_string_lossy().to_string(),
            readonly: BTreeMap::new(),
            name: "locked preset".into(),
            locked: true,
        };
        fs::write(backup_path.join("manifest.json"), serde_json::to_vec(&info).unwrap()).unwrap();
        for file in FILES {
            fs::write(backup_path.join(file), format!("backup {file}").as_bytes()).unwrap();
        }

        let content = backup_zip_content(&base, "10-20-0", &backup_dir).unwrap();
        assert_eq!(content.len(), FILES.len());
        for file in FILES {
            assert_eq!(content[file], format!("backup {file}").as_bytes());
        }
        assert!(backup_zip_content(&base, "../10-20-0", &backup_dir).is_err());

        let foreign_root = temp.path().join("OtherApex");
        fs::create_dir_all(foreign_root.join("local")).unwrap();
        fs::create_dir(foreign_root.join("profile")).unwrap();
        for file in FILES {
            fs::write(file_path(&foreign_root, file), b"foreign").unwrap();
        }
        let foreign = load_root(&foreign_root).unwrap();
        assert!(backup_zip_content(&foreign, "10-20-0", &backup_dir).is_err());
    }
    #[test]
    fn readonly_backups_remain_prunable_and_preserve_restore_attributes() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        for file in FILES {
            let path = file_path(&root, file);
            fs::write(&path, b"// fixture\r\n\0").unwrap();
            set_readonly(&path, true).unwrap();
        }
        let loaded = load_root(&root).unwrap();
        let backups = temp.path().join("backups");
        fs::create_dir(&backups).unwrap();
        let first = backup_into(&loaded, &backups).unwrap();
        let second = backup_into(&loaded, &backups).unwrap();
        assert_ne!(first.id, second.id);
        for file in FILES {
            assert!(first.readonly[file]);
            assert!(!fs::metadata(backups.join(&first.id).join(file)).unwrap().permissions().readonly());
            assert_eq!(fs::read(backups.join(&first.id).join(file)).unwrap(), loaded.docs[file].bytes());
            // Simulate an older backup created with read-only copies.
            set_readonly(&backups.join(&first.id).join(file), true).unwrap();
            set_readonly(&file_path(&root, file), false).unwrap();
        }
        for n in 0..21 {
            let mut info = backup_into(&loaded, &backups).unwrap();
            info.created = first.created + n + 100;
            fs::write(backups.join(&info.id).join("manifest.json"), serde_json::to_vec(&info).unwrap()).unwrap();
        }
        prune_dir(&backups).unwrap();
        assert_eq!(read_backup_list(&backups).unwrap().len(), 10);
        assert!(!backups.join(first.id).exists());
    }
    #[test]
    fn retains_only_latest_ten_unlocked_backups() {
        let temp = tempfile::tempdir().unwrap();
        for n in 0..23 {
            let id = format!("{n}-1");
            let dir = temp.path().join(&id);
            fs::create_dir(&dir).unwrap();
            let info = BackupInfo {
                id,
                created: n,
                root: "fixture".into(),
                readonly: BTreeMap::new(),
                name: String::new(),
                locked: false,
            };
            fs::write(
                dir.join("manifest.json"),
                serde_json::to_vec(&info).unwrap(),
            )
            .unwrap();
        }
        prune_dir(temp.path()).unwrap();
        let list = read_backup_list(temp.path()).unwrap();
        assert_eq!(list.len(), 10);
        assert_eq!(list[0].created, 22);
        assert_eq!(list.last().unwrap().created, 13);
    }

    #[test]
    fn manual_backup_reads_current_disk_files_without_applying_pending_edits() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        for file in FILES {
            fs::write(file_path(&root, file), b"// original\r\n\0").unwrap();
        }
        let mut loaded = load_root(&root).unwrap();
        apply_to(&mut loaded, &[Edit::Setting { id: "sensitivity".into(), value: "5".into() }]).unwrap();
        let current = b"mouse_sensitivity \"2\"\r\nunknown keep\r\n\0";
        fs::write(file_path(&root, "settings.cfg"), current).unwrap();
        set_readonly(&file_path(&root, "profile.cfg"), true).unwrap();
        let dir = temp.path().join("backups");
        let info = manual_backup_into(&loaded, &dir).unwrap();
        assert_eq!(fs::read(dir.join(&info.id).join("settings.cfg")).unwrap(), current);
        assert!(info.readonly["profile.cfg"]);
        for file in FILES {
            assert_eq!(fs::read(dir.join(&info.id).join(file)).unwrap(), fs::read(file_path(&root, file)).unwrap());
        }
        assert_eq!(fs::read(file_path(&root, "settings.cfg")).unwrap(), current);
        assert!(fs::metadata(file_path(&root, "profile.cfg")).unwrap().permissions().readonly());
        set_readonly(&file_path(&root, "profile.cfg"), false).unwrap();
    }

    #[test]
    fn restoring_does_not_create_backups_and_missing_sources_leave_current_files_intact() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        for file in FILES { fs::write(file_path(&root, file), b"// original\r\n\0").unwrap(); }
        let base = load_root(&root).unwrap();
        let dir = temp.path().join("backups");
        fs::create_dir(&dir).unwrap();
        let info = backup_into(&base, &dir).unwrap();
        for _ in 0..2 {
            for file in FILES { fs::write(file_path(&root, file), b"// changed\r\n\0").unwrap(); }
            restore_backup_from_dir(&base, &info.id, &dir).unwrap();
            for file in FILES { assert_eq!(fs::read(file_path(&root, file)).unwrap(), b"// original\r\n\0"); }
            assert_eq!(read_backup_list(&dir).unwrap().len(), 1);
        }
        fs::remove_file(dir.join(&info.id).join("profile.cfg")).unwrap();
        for file in FILES { fs::write(file_path(&root, file), b"// current\r\n\0").unwrap(); }
        assert!(restore_backup_from_dir(&base, &info.id, &dir).is_err());
        for file in FILES { assert_eq!(fs::read(file_path(&root, file)).unwrap(), b"// current\r\n\0"); }
    }

    #[test]
    fn backup_names_and_locks_persist_and_locked_backups_are_excluded_from_retention_limit() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path().join("apex");
        fs::create_dir_all(root.join("local")).unwrap();
        fs::create_dir(root.join("profile")).unwrap();
        for file in FILES { fs::write(file_path(&root, file), b"// fixture\r\n\0").unwrap(); }
        let base = load_root(&root).unwrap();
        let dir = temp.path().join("backups");
        fs::create_dir(&dir).unwrap();
        let mut ids = Vec::new();
        for n in 0..24 {
            let mut info = backup_into(&base, &dir).unwrap();
            info.created = n;
            fs::write(dir.join(&info.id).join("manifest.json"), serde_json::to_vec(&info).unwrap()).unwrap();
            ids.push(info.id);
        }
        update_backup_in_dir(&base, &ids[0], Some("  大会用  ".into()), Some(true), &dir).unwrap();
        update_backup_in_dir(&base, &ids[1], None, Some(true), &dir).unwrap();
        prune_dir(&dir).unwrap();
        let list = read_backup_list(&dir).unwrap();
        assert_eq!(list.len(), 12);
        assert_eq!(list.iter().filter(|b| !b.locked).count(), 10);
        assert_eq!(list.iter().find(|b| b.id == ids[0]).unwrap().name, "大会用");
        assert!(dir.join(&ids[0]).exists());
        assert!(!dir.join(&ids[2]).exists());
        let unlocked = update_backup_in_dir(&base, &ids[0], None, Some(false), &dir).unwrap();
        assert_eq!(unlocked.name, "大会用");
        assert!(update_backup_in_dir(&base, "../outside", None, Some(true), &dir).is_err());
        assert!(update_backup_in_dir(&base, &ids[0], Some("bad\nname".into()), None, &dir).is_err());
        prune_dir(&dir).unwrap();
        assert!(!dir.join(&ids[0]).exists());
        assert!(dir.join(&ids[1]).exists());
    }

    #[test]
    fn legacy_backup_manifest_defaults_to_unlocked_and_unnamed() {
        let info: BackupInfo = serde_json::from_str(r#"{"id":"1-1","created":1,"root":"fixture","readonly":{}}"#).unwrap();
        assert!(!info.locked);
        assert!(info.name.is_empty());
    }
}
