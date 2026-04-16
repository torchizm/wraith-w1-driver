# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Web UI (Vue 3 + Vite) — `packages/web/`
```bash
cd packages/web
npm install          # First time only
npm run dev          # Dev server at http://localhost:5173
npm run build        # Type-check (vue-tsc) + production build to dist/
npm run preview      # Serve production build locally
```

There are no test or lint scripts configured.

### macOS Daemon (Swift) — `packages/darwin/`
```bash
cd packages/darwin
swift build --target WraithDaemon      # Build only
swift run WraithDaemon                 # Build + run (menu bar agent)
swift build --target WraithController  # Build the SwiftUI PoC app
```

First `swift build` resolves swift-nio dependency (~15s). Subsequent builds are fast (~1-2s).

### Windows Daemon (Rust) — `packages/win32/`
```bash
cd packages/win32
cargo build --release          # Build optimised binary
cargo build                    # Build debug binary (faster compile)
.\target\release\wraith-daemon.exe  # Run
```

Requires Rust + MSVC toolchain (`rustup target add x86_64-pc-windows-msvc`). Set `RUST_LOG=debug` for verbose logging.

### Full Development Setup
```bash
# macOS:
# Terminal 1: daemon
cd packages/darwin && swift run WraithDaemon
# Terminal 2: web UI
cd packages/web && npm run dev

# Windows:
# Terminal 1: daemon
cd packages/win32 && cargo run
# Terminal 2: web UI
cd packages/web && npm run dev
```

Open Chrome at `http://localhost:5173`. WebHID requires Chrome or Edge.

## Architecture

Three packages connected by WebSocket:

**Web app** (`packages/web/`) — Vue 3 SPA that talks to the mouse directly via WebHID API. Works standalone without the daemon. All device reads/writes go through `packages/web/src/transport/webhid.ts`.

**macOS daemon** (`packages/darwin/WraithDaemon/`) — Swift menu bar agent using IOKit for HID. Provides OS-level features that WebHID can't do from the browser sandbox. Serves a WebSocket on port 9876 for the web app.

**Windows daemon** (`packages/win32/`) — Rust system-tray agent using hidapi for HID. Functionally equivalent to the macOS daemon: same WebSocket protocol, same config schema, same action types.

**WraithController** (`packages/darwin/WraithController/`) — Original SwiftUI proof-of-concept app. Kept as reference; not part of the production system.

### Web App Data Flow

```
webhid.ts  →  sendFeatureReport/receiveFeatureReport  →  Device (0xFF05 interface)
           ←  inputreport events (ReportID 9, 33 bytes)
           
websocket.ts  ←→  ws://127.0.0.1:9876  ←→  daemon (macOS or Windows, when running)
```

The Pinia store (`packages/web/src/stores/device.ts`) merges both data sources into one reactive state. Input reports are the primary source of truth for live device state. Feature reports are used for reads (DPI levels) and all writes. Device state is cached in `localStorage` under the key `wraith:lastState` and restored on next connect.

Vue Router maps views to routes: `/` → Dashboard (battery, live state, event log), `/performance` → Performance (DPI, polling rate, sensor params), `/buttons` → ButtonRemap (per-button function mapping), `/macros` → Macros (macro recording/upload), `/profiles` → Profiles (per-profile config). The `/daemon` route (DaemonSettings) is linked only when the daemon is connected.

### macOS Daemon Data Flow

```
HIDManager.swift (IOKit)  →  delegate callbacks  →  main.swift
  ↓                                                    ↓
button presses                              ActionEngine (execute macOS actions)
state changes                               WebSocketServer (broadcast to web)
                                            ProfileSwitcher (auto-switch on app focus)
```

Config persisted at `~/Library/Application Support/WraithController/config.json`.

### Windows Daemon Data Flow

```
hid.rs (hidapi, std::thread)  →  broadcast::Sender<HidEvent>  →  main.rs
  ↓                                                                 ↓
button presses                                        ActionEngine (execute Windows actions)
state updates                                         WebSocket server (tokio, broadcast to web)
                                                      ProfileSwitcher (WinEventHook, std::thread)
```

Config persisted at `%APPDATA%\WraithController\config.json` (same JSON schema as macOS).

**Threading model (Windows):**
- `main` thread — tray-icon event loop (Win32 requires this on the main thread)
- `hid-read` thread — hidapi blocking reads + reconnect loop; communicates via `broadcast::channel`
- `profile-switcher` thread — `SetWinEventHook` + `GetMessage`/`DispatchMessage` pump
- `tokio` runtime (background threads) — WebSocket server + action engine

## HID Protocol

Device: Pixart 8K dongle, VID `0x093A`, PID `0x522C`, vendor interface `0xFF05`.

All commands use **Feature Report ID 9, 8-byte payload**. The `customerCode` flag (detected via identify command `[143,0,...]`, response byte[7]==0x40) shifts all command IDs — getting this wrong means every command is silently ignored.

**Input report byte layout** (parsed in `parser.ts` and `WraithDaemon/HIDManager.swift`):
- `[0]` battery (bit7=charging, bits0-6=level)
- `[1]` high nibble=DPI index, low nibble=polling rate code
- `[2]` bits7-6=profile, bits5-0=debounce ms
- `[3]+[5]` sleep time: `(byte[3]>>4)*256 + byte[5]`
- `[6]` bits7-4=LOD, bit2=ripple, bit1=angleSnap, bit0=motionSync
- `[7]=0x5A` + `[8]` = button press (0x01=START, 0x80=MACRO, 0x08=UP, 0x04=DOWN, 0x10=MUTE)

**Feature report response format**: All read responses have `byte[0] = 0x09` (report ID echoed back), then the echoed command at `byte[1]`, then response data starting at `byte[2]`. For example, a DPI value response: `[0x09, cmdByte, slot, lo, hi, ...]` — so `dpi = ((bytes[4] << 8) | bytes[3] + 1) * 50`.

**WebHID quirks**:
- `receiveFeatureReport` returns stale data after the first read. Must flush with a dummy read before each command (`freshRead` pattern in `webhid.ts`).
- Input reports only arrive on CC button events, not periodically (unlike IOKit which gets 2-second heartbeats).
- After writing settings, a 3-second "write lock" prevents input reports from reverting optimistic UI updates.

## WebSocket Protocol

JSON messages over `ws://127.0.0.1:9876`. Format: `{id, type, payload}`.

**Daemon → Web**: `pong`, `state`, `button`, `connection`
**Web → Daemon**: `ping`, `get_state`, `set_cc_action`, `get_cc_actions`, `set_app_profile`, `get_app_profiles`

The web app auto-detects the daemon on load (retry every 10s). Daemon-only UI (CC action mapping, per-app profiles) is hidden when daemon is not connected.

## Windows Daemon Implementation (`packages/win32/`)

The Windows daemon is implemented in Rust at `packages/win32/`. The web app (`packages/web/`) and WebSocket protocol are identical cross-platform — only the native daemon differs.

### What the Daemon Does (platform-agnostic logic)

1. **HID monitoring** — Open the Wraith W1 device (VID `0x093A`, PID `0x522C`), read continuous input reports (ReportID 9, 33 bytes), parse device state and CC button presses
2. **WebSocket server** — Serve `ws://127.0.0.1:9876`, broadcast state/button events, handle config requests
3. **Action engine** — When a CC button is pressed, execute the configured action (launch app, keyboard shortcut, shell command, open URL, system action)
4. **Profile switcher** — Monitor foreground window changes, auto-switch mouse profile when a configured app gains focus
5. **System tray** — Show battery % in system tray icon, provide menu (Open Web UI, Quit)
6. **Config persistence** — Save/load CC button actions and per-app profile mappings as JSON

### Platform Mapping (macOS → Windows / Rust)

| macOS (Swift) | Windows (Rust) | Location |
|---|---|---|
| IOKit `IOHIDManager` | `hidapi` crate (`hid_read_timeout`, `hid_send_feature_report`) | `hid.rs` |
| IOKit input report callback | `std::thread` + `hidapi::HidDevice::read_timeout()` loop | `hid.rs::read_loop` |
| IOKit feature report write | `hidapi::HidDevice::send_feature_report()` (prepend 0x09) | `hid.rs::send_feature_report` |
| IOKit feature report read | `hidapi::HidDevice::get_feature_report()` | `hid.rs::get_feature_report` |
| AppKit `NSStatusItem` | `tray-icon` crate + `tray_icon::menu` | `main.rs` |
| AppKit `NSWorkspace.openApplication` | `ShellExecuteW(NULL, "open", path, ...)` | `actions.rs::launch_app` |
| CoreGraphics `CGEvent` | `enigo` crate (`Key::Control`, etc.) + `SendInput` for media keys | `actions.rs` |
| `NSWorkspace.didActivateApplicationNotification` | `SetWinEventHook(EVENT_SYSTEM_FOREGROUND)` + message pump | `profile.rs` |
| Config at `~/Library/Application Support/…` | `dirs::data_dir()` → `%APPDATA%\WraithController\config.json` | `config.rs` |
| swift-nio WebSocket | `tokio-tungstenite` async WebSocket | `websocket.rs` |

### HID Access Differences (Critical)

**Report ID handling**: On Windows, the HID API expects the report ID as the **first byte of the buffer** for both reads and writes. On macOS IOKit, the report ID is a separate parameter.

```
// macOS (IOKit):
IOHIDDeviceSetReport(device, kIOHIDReportTypeFeature, 9 /*reportId*/, payload, 8)

// Windows (HID API):
// Buffer must be [0x09, cmd, param1, param2, ...] — 9 bytes total (reportId + 8 payload)
BYTE buf[9] = {0x09, cmd, param1, param2, 0, 0, 0, 0, 0};
HidD_SetFeature(handle, buf, sizeof(buf));

// Windows (hidapi):
// Same: first byte is report ID
unsigned char buf[9] = {0x09, cmd, param1, ...};
hid_send_feature_report(device, buf, sizeof(buf));
```

**Input report reading**: Same difference — Windows prepends report ID.

```
// Windows input report buffer is 34 bytes (1 reportId + 33 data)
// buf[0] = 0x09 (report ID)
// buf[1..33] = same layout as macOS bytes[0..32]
// So battery = buf[1], dpiPoll = buf[2], etc.
```

**Device enumeration**: Find the device by VID/PID, then filter to the vendor interface (usage page `0xFF05`). On Windows with hidapi:

```c
struct hid_device_info *devs = hid_enumerate(0x093A, 0x522C);
for (struct hid_device_info *d = devs; d; d = d->next) {
    if (d->usage_page == 0xFF05) {
        // This is the vendor interface we want
        hid_device *handle = hid_open_path(d->path);
    }
}
```

### Input Report Parsing (identical across platforms)

The byte layout is the same everywhere. On macOS IOKit the callback gives raw bytes directly. On Windows, after stripping the report ID prefix:

```
bytes[0] = battery (bit7=charging, bits0-6=level)
bytes[1] = high nibble=DPI index, low nibble=polling rate code
bytes[2] = bits7-6=profile (0-3), bits5-0=debounce (ms)
bytes[3] = bits7-4=sleep high nibble
bytes[5] = sleep low byte → sleep = (bytes[3]>>4)*256 + bytes[5]
bytes[6] = bits7-4=LOD, bit2=ripple, bit1=angleSnap, bit0=motionSync
bytes[7] = 0x5A if button pressed
bytes[8] = button bitmask (0x01=START, 0x80=MACRO, 0x08=UP, 0x04=DOWN, 0x10=MUTE, 0x00=STOP)
```

Polling rate code map: `{3:125, 2:250, 1:500, 0:1000, 6:2000, 5:4000, 4:8000}`

### Feature Report Commands (identical across platforms)

All commands are 8-byte payloads sent as feature report ID 9. The `customerCode` flag determines command byte[0]:

```
Identify:           [143, 0, 0, 0, 0, 0, 0, 0]  → response byte[7]==0x40 means customerCode=true
Set polling rate:   [cc?1:13, rateCode, 0, 0, 0, 0, 0, 0]
Set DPI:            [cc?2:12, slot, lo, hi, 0, 0, 0, 0]  where encoded = round(dpi/50 - 1), lo=encoded&0xFF, hi=(encoded>>8)&0xFF
Set DPI config:     [cc?3:11, totalLevels, currentIndex, 0, 0, 0, 0, 0]
Set sensor param:   [cc?4:10, paramId, value, 0, 0, 0, 0, 0]  paramIds: 1=LOD, 2=Ripple, 3=AngleSnap, 4=MotionSync, 5=PerfMode
Set debounce:       [cc?5:9, 1, ms, 0, 0, 0, 0, 0]
Set sleep:          [cc?5:9, 3, seconds&0xFF, (seconds>>8)&0xFF, 0, 0, 0, 0]
Set key function:   [6, buttonId, v0, v1, v2, v3, 0, 0]  buttonIds: 0=left,1=right,2=middle,3=back,4=forward,5=dpi
Read polling rate:  [cc?129:141, 0, 0, 0, 0, 0, 0, 0]
Read DPI config:    [cc?131:139, 0, 0, 0, 0, 0, 0, 0]
Read DPI value:     [cc?130:140, slot, 0, 0, 0, 0, 0, 0]
Read sensor param:  [cc?132:138, paramId, 0, 0, 0, 0, 0, 0]
Read debounce:      [cc?133:137, 1, 0, 0, 0, 0, 0, 0]
Read sleep:         [cc?133:137, 3, 0, 0, 0, 0, 0, 0]
Read key function:  [134, buttonId, 0, 0, 0, 0, 0, 0]
Switch profile:     [9, 6, profileIndex, 0, 0, 0, 0, 0]
```

### WebSocket Protocol (identical across platforms)

The web app expects the same JSON messages regardless of daemon platform. Format: `{"id": "uuid", "type": "...", "payload": {...}}`.

**Daemon must handle these incoming messages:**
- `ping` → respond with `{"type": "pong", "payload": {"version": "1.0"}}`
- `get_state` → respond with current device state as `{"type": "state", "payload": {batteryLevel, isCharging, currentDPIIndex, pollingRateHz, currentProfile, debounceTime, sleepTime, lodValue, angleSnap, motionSync, rippleEffect}}`
- `set_cc_action` `{button: "START"|"STOP"|"MACRO"|"ARROW_UP"|"ARROW_DOWN"|"MUTE", action: {type: "launch_app"|"keyboard_shortcut"|"shell_command"|"open_url"|"system", value: "..."}}` → save to config, respond `{"type": "ok"}`
- `get_cc_actions` → respond with all saved actions `{"type": "cc_actions", "payload": {BUTTON: {type, value}, ...}}`
- `set_app_profile` `{bundleId: "...", profile: 0-3}` → save to config (on Windows use exe name or window class instead of bundleId)
- `get_app_profiles` → respond with all saved mappings

**Daemon must broadcast these events:**
- On device state change: `{"type": "state", "payload": {...}}` (same fields as get_state response)
- On CC button press: `{"type": "button", "payload": {"button": "START", "timestamp": 1712764800000}}`
- On device connect/disconnect: `{"type": "connection", "payload": {"connected": true|false}}`

### Action Types (Windows equivalents)

| Action | macOS Implementation | Windows Implementation |
|---|---|---|
| `launch_app` | `NSWorkspace.openApplication(bundleId)` | `ShellExecuteW(NULL, "open", path, ...)` or `Process.Start(path)` |
| `keyboard_shortcut` | `CGEvent` with modifier flags | `SendInput()` with `KEYBDINPUT` — parse "ctrl+shift+4" into VK codes + modifier flags |
| `shell_command` | `Process("/bin/zsh", ["-c", cmd])` | `CreateProcessW` with `cmd.exe /c command` or `Process.Start("cmd.exe", "/c " + command)` |
| `open_url` | `NSWorkspace.open(URL)` | `ShellExecuteW(NULL, "open", url, ...)` |
| `system` (screenshot) | Simulate Cmd+Shift+3 | Simulate PrintScreen via `SendInput` or call `snippingtool` |
| `system` (lock_screen) | Simulate Cmd+Ctrl+Q | `LockWorkStation()` from user32.dll |
| `system` (play_pause) | `NSEvent.otherEvent` media key | `SendInput` with `VK_MEDIA_PLAY_PAUSE` |

### Windows-Specific Notes

- **HID device access** may require running as Administrator, or the device descriptor may need to be in the right mode. hidapi handles this transparently on most systems.
- **System tray** on Windows 11 might require the app to be "promoted" to visible tray area by the user.
- **Foreground window detection**: Use `SetWinEventHook(EVENT_SYSTEM_FOREGROUND, ...)` for event-driven detection. Get exe name via `GetWindowThreadProcessId` → `OpenProcess` → `QueryFullProcessImageNameW`.
- **Config path**: Use `SHGetFolderPathW(CSIDL_APPDATA)` or `%APPDATA%` environment variable → `%APPDATA%\WraithController\config.json`.
- On Windows, unlike macOS, the HID device sends **periodic input reports every ~2 seconds** even without CC button events. So you'll get continuous state updates.
