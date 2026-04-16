use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

/// Mirrors macOS ActionConfig enum. Serialises as {"type": "...", "value": "..."}
/// so config.json is portable between macOS and Windows.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ActionConfig {
    #[serde(rename = "type")]
    pub kind: String,
    pub value: String,
}

impl Default for ActionConfig {
    fn default() -> Self {
        ActionConfig {
            kind: "none".to_string(),
            value: String::new(),
        }
    }
}

/// Top-level persisted config. Matches macOS DaemonConfig JSON schema.
///
/// `cc_actions` keys: "START" | "STOP" | "MACRO" | "ARROW_UP" | "ARROW_DOWN" | "MUTE"
/// `app_profiles` keys: exe filename lowercase (e.g. "chrome.exe") → profile index 0-3
///
/// On macOS appProfiles uses bundle IDs; on Windows we use exe filenames.
/// The JSON key names use camelCase to match the macOS schema.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DaemonConfig {
    #[serde(default, rename = "ccActions")]
    pub cc_actions: HashMap<String, ActionConfig>,
    #[serde(default, rename = "appProfiles")]
    pub app_profiles: HashMap<String, u8>,
}

pub struct ConfigStore {
    pub config: DaemonConfig,
    path: PathBuf,
}

impl ConfigStore {
    /// Load from %APPDATA%\WraithController\config.json.
    /// Creates defaults if the file is absent or corrupt.
    pub fn load() -> Arc<Mutex<Self>> {
        let path = config_path();
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let config = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();

        log::info!("[Config] Loaded from {}", path.display());
        Arc::new(Mutex::new(ConfigStore { config, path }))
    }

    pub fn save(&self) {
        match serde_json::to_string_pretty(&self.config) {
            Ok(json) => {
                if let Err(e) = fs::write(&self.path, json) {
                    log::warn!("[Config] Failed to save: {e}");
                }
            }
            Err(e) => log::warn!("[Config] Failed to serialize: {e}"),
        }
    }

    pub fn set_action(&mut self, button: &str, action: ActionConfig) {
        self.config.cc_actions.insert(button.to_string(), action);
        self.save();
    }

    pub fn get_action(&self, button: &str) -> ActionConfig {
        self.config
            .cc_actions
            .get(button)
            .cloned()
            .unwrap_or_default()
    }
}

fn config_path() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("WraithController")
        .join("config.json")
}
