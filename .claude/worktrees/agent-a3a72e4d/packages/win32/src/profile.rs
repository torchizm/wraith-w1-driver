use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::config::ConfigStore;
use crate::hid::{switch_profile, SharedDevice};

pub struct ProfileSwitcher {
    config_store: Arc<Mutex<ConfigStore>>,
    device_arc: SharedDevice,
    customer_code: Arc<Mutex<bool>>,
}

impl ProfileSwitcher {
    pub fn new(
        config_store: Arc<Mutex<ConfigStore>>,
        device_arc: SharedDevice,
        customer_code: Arc<Mutex<bool>>,
    ) -> Self {
        ProfileSwitcher {
            config_store,
            device_arc,
            customer_code,
        }
    }

    /// Spawn a dedicated std::thread that installs SetWinEventHook and runs
    /// a Win32 message pump (required by WinEventHook on the hook owner thread).
    pub fn spawn(self) {
        std::thread::Builder::new()
            .name("profile-switcher".into())
            .spawn(move || self.run_message_loop())
            .expect("failed to spawn profile-switcher thread");
    }

    fn run_message_loop(self) {
        use windows::Win32::UI::Accessibility::SetWinEventHook;
        use windows::Win32::UI::WindowsAndMessaging::{
            DispatchMessageW, GetMessageW, MSG, EVENT_SYSTEM_FOREGROUND, WINEVENT_OUTOFCONTEXT,
        };

        // Store pointer to self in thread-local so the static callback can reach it.
        // Safety: self lives for the entire duration of this thread's message loop.
        SWITCHER_PTR.with(|cell| unsafe {
            *cell.get() = &self as *const ProfileSwitcher as *mut ProfileSwitcher;
        });

        unsafe {
            let _hook = SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND,
                EVENT_SYSTEM_FOREGROUND,
                None,
                Some(win_event_proc),
                0, // all processes
                0, // all threads
                WINEVENT_OUTOFCONTEXT,
            );

            log::info!("[ProfileSwitcher] WinEventHook installed");

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None, 0, 0).as_bool() {
                DispatchMessageW(&msg);
            }
        }
    }

    fn on_foreground_change(&self, exe_name: &str) {
        let profile = {
            self.config_store
                .lock()
                .unwrap()
                .config
                .app_profiles
                .get(exe_name)
                .copied()
        };
        if let Some(idx) = profile {
            let cc = *self.customer_code.lock().unwrap();
            switch_profile(&self.device_arc, cc, idx);
            log::info!("[ProfileSwitcher] → P{} for {exe_name}", idx + 1);
        }
    }
}

// Thread-local pointer to the ProfileSwitcher struct for use in the static callback.
std::thread_local! {
    static SWITCHER_PTR: std::cell::UnsafeCell<*mut ProfileSwitcher> =
        std::cell::UnsafeCell::new(std::ptr::null_mut());
}

/// Win32 WinEvent callback. Invoked on the hook owner thread (from DispatchMessageW).
unsafe extern "system" fn win_event_proc(
    _hook: windows::Win32::UI::Accessibility::HWINEVENTHOOK,
    _event: u32,
    hwnd: windows::Win32::Foundation::HWND,
    _id_object: i32,
    _id_child: i32,
    _id_event_thread: u32,
    _event_time: u32,
) {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::GetWindowThreadProcessId;
    use windows::core::PWSTR;

    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    if pid == 0 {
        return;
    }

    let handle = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
        Ok(h) => h,
        Err(_) => return,
    };

    let mut name_buf = [0u16; 260];
    let mut len: u32 = 260;
    if QueryFullProcessImageNameW(
        handle,
        PROCESS_NAME_WIN32,
        PWSTR(name_buf.as_mut_ptr()),
        &mut len,
    )
    .is_ok()
    {
        let full_path = String::from_utf16_lossy(&name_buf[..len as usize]);
        let exe_name = Path::new(&full_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        SWITCHER_PTR.with(|cell| {
            let ptr = *cell.get();
            if !ptr.is_null() {
                (*ptr).on_foreground_change(&exe_name);
            }
        });
    }

    let _ = CloseHandle(handle);
}
