use std::sync::{Arc, Mutex};
use windows::core::PCWSTR;
use windows::Win32::UI::Shell::ShellExecuteW;
use windows::Win32::UI::WindowsAndMessaging::SW_SHOW;

use crate::config::ConfigStore;

pub struct ActionEngine {
    config_store: Arc<Mutex<ConfigStore>>,
}

impl ActionEngine {
    pub fn new(config_store: Arc<Mutex<ConfigStore>>) -> Self {
        ActionEngine { config_store }
    }

    /// Execute the configured action for the given CC button name.
    pub fn execute(&self, button: &str) {
        let action = self.config_store.lock().unwrap().get_action(button);
        log::info!("[Action] Button={button} type={} value={}", action.kind, action.value);
        match action.kind.as_str() {
            "launch_app" => launch_app(&action.value),
            "keyboard_shortcut" => simulate_keyboard_shortcut(&action.value),
            "shell_command" => run_shell_command(&action.value),
            "open_url" => open_url(&action.value),
            "system" => perform_system_action(&action.value),
            "none" | "" => {}
            other => log::warn!("[Action] Unknown action type: {other}"),
        }
    }
}

// ── launch_app ───────────────────────────────────────────────────────────────

fn launch_app(path_or_name: &str) {
    shell_execute("open", path_or_name);
}

// ── open_url ─────────────────────────────────────────────────────────────────

fn open_url(url: &str) {
    shell_execute("open", url);
}

// ── shell_command ────────────────────────────────────────────────────────────

fn run_shell_command(cmd: &str) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    if let Err(e) = std::process::Command::new("cmd.exe")
        .args(["/C", cmd])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
    {
        log::warn!("[Action] shell_command failed: {e}");
    }
}

// ── keyboard_shortcut ────────────────────────────────────────────────────────

fn simulate_keyboard_shortcut(shortcut: &str) {
    use enigo::{Direction, Enigo, Key, Keyboard, Settings};

    let lower = shortcut.to_lowercase();
    let parts: Vec<&str> = lower.split('+').collect();
    let mut modifiers: Vec<Key> = Vec::new();
    let mut main_key: Option<Key> = None;

    for part in &parts {
        match *part {
            "ctrl" | "control" => modifiers.push(Key::Control),
            "shift" => modifiers.push(Key::Shift),
            "alt" => modifiers.push(Key::Alt),
            "win" | "meta" | "super" => modifiers.push(Key::Meta),
            other => {
                if let Some(k) = parse_key(other) {
                    main_key = Some(k);
                } else {
                    log::warn!("[Action] Unknown key token: {other}");
                }
            }
        }
    }

    let mut enigo = match Enigo::new(&Settings::default()) {
        Ok(e) => e,
        Err(err) => {
            log::warn!("[Action] Failed to init enigo: {err}");
            return;
        }
    };

    for m in &modifiers {
        let _ = enigo.key(*m, Direction::Press);
    }
    if let Some(k) = main_key {
        let _ = enigo.key(k, Direction::Click);
    }
    for m in modifiers.iter().rev() {
        let _ = enigo.key(*m, Direction::Release);
    }
}

fn parse_key(s: &str) -> Option<enigo::Key> {
    use enigo::Key;
    match s {
        "space" => Some(Key::Space),
        "return" | "enter" => Some(Key::Return),
        "tab" => Some(Key::Tab),
        "escape" | "esc" => Some(Key::Escape),
        "delete" | "del" => Some(Key::Delete),
        "backspace" => Some(Key::Backspace),
        "up" => Some(Key::UpArrow),
        "down" => Some(Key::DownArrow),
        "left" => Some(Key::LeftArrow),
        "right" => Some(Key::RightArrow),
        "home" => Some(Key::Home),
        "end" => Some(Key::End),
        "pageup" => Some(Key::PageUp),
        "pagedown" => Some(Key::PageDown),
        "f1" => Some(Key::F1),
        "f2" => Some(Key::F2),
        "f3" => Some(Key::F3),
        "f4" => Some(Key::F4),
        "f5" => Some(Key::F5),
        "f6" => Some(Key::F6),
        "f7" => Some(Key::F7),
        "f8" => Some(Key::F8),
        "f9" => Some(Key::F9),
        "f10" => Some(Key::F10),
        "f11" => Some(Key::F11),
        "f12" => Some(Key::F12),
        s if s.len() == 1 => s.chars().next().map(Key::Unicode),
        _ => None,
    }
}

// ── system actions ───────────────────────────────────────────────────────────

fn perform_system_action(action: &str) {
    use windows::Win32::System::Shutdown::LockWorkStation;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE, VK_MEDIA_PREV_TRACK, VK_SNAPSHOT,
        VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
    };

    match action {
        "play_pause"   => send_media_key(VK_MEDIA_PLAY_PAUSE.0),
        "next_track"   => send_media_key(VK_MEDIA_NEXT_TRACK.0),
        "prev_track"   => send_media_key(VK_MEDIA_PREV_TRACK.0),
        "volume_up"    => send_media_key(VK_VOLUME_UP.0),
        "volume_down"  => send_media_key(VK_VOLUME_DOWN.0),
        "volume_mute"  => send_media_key(VK_VOLUME_MUTE.0),
        "screenshot"   => send_media_key(VK_SNAPSHOT.0),
        "lock_screen"  => unsafe { let _ = LockWorkStation(); },
        "show_desktop" => simulate_keyboard_shortcut("win+d"),
        "task_manager" => simulate_keyboard_shortcut("ctrl+shift+escape"),
        other => log::warn!("[Action] Unknown system action: {other}"),
    }
}

fn send_media_key(vk: u16) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_EXTENDEDKEY,
        KEYEVENTF_KEYUP, VIRTUAL_KEY,
    };

    let key_down = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                wScan: 0,
                dwFlags: KEYEVENTF_EXTENDEDKEY,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };
    let key_up = INPUT {
        r#type: INPUT_KEYBOARD,
        Anonymous: INPUT_0 {
            ki: KEYBDINPUT {
                wVk: VIRTUAL_KEY(vk),
                wScan: 0,
                dwFlags: KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    unsafe {
        SendInput(
            &[key_down, key_up],
            std::mem::size_of::<INPUT>() as i32,
        );
    }
}

// ── ShellExecuteW helper ─────────────────────────────────────────────────────

fn shell_execute(verb: &str, target: &str) {
    let verb_w: Vec<u16> = verb.encode_utf16().chain([0]).collect();
    let target_w: Vec<u16> = target.encode_utf16().chain([0]).collect();
    unsafe {
        ShellExecuteW(
            None,
            PCWSTR(verb_w.as_ptr()),
            PCWSTR(target_w.as_ptr()),
            None,
            None,
            SW_SHOW,
        );
    }
}
