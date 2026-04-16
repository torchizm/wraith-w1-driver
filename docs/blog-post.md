## 🎯 The Problem

The Wraith W1 is a wireless gaming mouse with a physical control center — a standalone USB device with 9 buttons, a slider/dial, and an LCD display. It lets you change DPI, polling rate, macros, profiles, and more without touching any software.

The mouse ships with an official Windows driver and a web-based driver at [w1.software](https://w1.software) using the WebHID API — but **neither goes far enough.** Both let you tweak DPI, polling rate, and sensor settings, but they don't let you remap the control center buttons to custom actions. Those 6 CC buttons (START, STOP, MACRO, Arrow Up, Arrow Down, Mute) that send HID events? The official software gives you no way to map them to launching apps, firing keyboard shortcuts, running shell commands, controlling media playback, or any other system action. The hardware is capable — the software just doesn't expose it.

On macOS, the situation is even worse: there's no native driver at all. No menu bar battery indicator, no per-app profile switching, no system integration of any kind.

So we set out to build something that goes beyond what the official software offers on **any** platform:

1. **Reverse engineer the full USB HID protocol** from scratch
2. **Build a cross-platform web driver** (Vue 3 + WebHID)
3. **Build native daemons** (Swift on macOS, Rust on Windows) that unlock OS-level features the browser can't touch — including full control center button remapping
4. **Connect them** via WebSocket for the best of both worlds

This is the full story of how we did it.

* * *

## 🔌 Step 1: USB Device Discovery

The first step was figuring out what the dongle looks like to macOS. We used `ioreg` to enumerate USB devices:

```bash
ioreg -p IOUSB -l -w 0 | grep -E "class IOUSBHostDevice|\"USB Product Name\""
```

This revealed the dongle:

| Property | Value |
|---|---|
| Product Name | W1 Freestyle |
| Serial Number | Pixart 8K DONGLE |
| Manufacturer | Pixart Imaging, Inc. |
| Vendor ID | `0x093A` (2362) |
| Product ID | `0x522C` (21036) |
| USB Version | 2.0 |

The "Pixart 8K" tells us it's using a Pixart sensor with 8000Hz polling rate support. Pixart is the dominant sensor manufacturer in the gaming mouse space.

* * *

## 🔍 Step 2: HID Interface Enumeration

Next, we needed to understand what HID interfaces the dongle exposes. Using `hidutil list`:

```bash
hidutil list | grep -i "W1\|Freestyle\|Pixart"
```

The device registers **4 HID interfaces**:

| Interface | Usage Page | Usage | Description |
|---|---|---|---|
| Mouse | Generic Desktop (0x01) | Mouse (2) | 5 buttons, X/Y axes, scroll wheel |
| Keyboard | Generic Desktop (0x01) | Keyboard (6) | Full keyboard emulation |
| Consumer | Consumer (0x0C) | Consumer Control (1) | Media keys (volume, mute) |
| Vendor | **Vendor Defined (0xFF05)** | 1 | Proprietary protocol |

The vendor interface `0xFF05` is where all the interesting stuff happens — device configuration, button events, and the proprietary protocol.

* * *

## 🎮 Step 3: Raw HID Event Monitoring

We wrote a Swift command-line tool using IOKit to capture raw input reports from all interfaces:

```swift
import IOKit.hid

let manager = IOHIDManagerCreate(kCFAllocatorDefault, 0)
let match: [String: Any] = [
    kIOHIDVendorIDKey: 0x093a,
    kIOHIDProductIDKey: 0x522c
]
IOHIDManagerSetDeviceMatching(manager, match as CFDictionary)
IOHIDManagerOpen(manager, 0)

// Register for raw input reports
for device in deviceSet {
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: 256)
    IOHIDDeviceRegisterInputReportCallback(device, buffer, 256, 
        reportCallback, nil)
}
```

The callback dumps every raw HID report with timestamps, report IDs, and full hex payloads.

### First Discovery: Button Mapping

We pressed each control center button one at a time and captured the output:

```
[325.009] INPUT ReportID:9 Len:33 | 09 39 30 08 00 3f 78 01 5a 01 00...
[328.113] INPUT ReportID:9 Len:33 | 09 39 30 08 00 3f 78 01 5a 80 00...
[346.913] INPUT ReportID:9 Len:33 | 09 39 30 08 00 3f 78 01 5a 08 00...
```

The pattern was clear:

- **Byte 8** = `0x5A` → button press indicator
- **Byte 9** = bitmask identifying which button

| Byte 9 | Control Center Button | Also Sends |
|---|---|---|
| `0x01` | START | — |
| `0x80` | MACRO | — |
| `0x08` | Arrow Up | Volume Up (Consumer) |
| `0x04` | Arrow Down | Volume Down (Consumer) |
| `0x10` | Mute | Mute Toggle (Consumer) |
| `0x00` | STOP | — |

### Second Discovery: Only 6 of ~15 Buttons Send HID Events

Buttons like EDIT, DPI, SAVE, WRAITH, P1-P4, HZ, LOD, SLEEP produced **no HID output** — they change settings internally on the device's firmware. This is crucial: it means those buttons can only be configured via the proprietary vendor protocol.

* * *

## 📊 Step 4: Decoding the Input Report Structure

The vendor interface (`0xFF05`) sends continuous input reports (ReportID 9, 33 bytes). By correlating byte values with known device settings, we decoded the full structure:

```
Byte layout (ReportID 9, 33 bytes):
  [0]  = 0x09 (Report ID)
  [1]  = Battery (bit7=charging, bits0-6=level 0-100%)
  [2]  = DPI index (high nibble) | Polling rate code (low nibble)
  [3]  = Profile index (bits 7-6) | Debounce time in ms (bits 5-0)
  [4]  = Sleep time high nibble (bits 7-4)
  [5]  = (padding)
  [6]  = Sleep time low byte → sleep = (byte[4]>>4)*256 + byte[6]
  [7]  = LOD (bits 7-4) | Ripple (bit 2) | Angle Snap (bit 1) | Motion Sync (bit 0)
  [8]  = 0x5A if button pressed, 0x00 otherwise
  [9]  = Button bitmask (see table above)
```

**Polling rate code mapping** (reverse-engineered by changing the rate on the physical control center and observing byte changes):

```javascript
const POLLING_RATE_MAP = {
  3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000
}
```

Note the non-sequential mapping — `0` = 1000Hz (default), and higher rates use codes 4-6. This is a common pattern in Pixart-based firmware.

* * *

## 🌐 Step 5: Reverse Engineering the Web Driver

The official web driver at [w1.software](https://w1.software) is a Vue 3 single-page app that uses the WebHID API. We downloaded and analyzed the JavaScript bundle:

```bash
curl -sL "https://w1.software/assets/index-DgkCFFvE.js" > w1_bundle.js
wc -c w1_bundle.js  # 1,132,579 bytes
```

### Tech Stack Identification

```bash
grep -oE 'requestDevice|sendFeatureReport|navigator\.hid' w1_bundle.js | sort | uniq -c
```

Results: Vue 3.5 + Vue Router 4.5 + Pinia 3.0 + Element Plus (UI library). All device communication uses `sendFeatureReport(9, Uint8Array[8])` — 8-byte payloads with report ID 9.

### The customerCode Flag

The most critical discovery: the device has **two firmware variants** identified by a `customerCode` flag. This flag is detected during device identification and changes ALL command byte offsets:

```javascript
// Identify command: [143, 0, 0, 0, 0, 0, 0, 0]
// Response byte[7] === 64 (0x40) → customerCode = true

// Command IDs depend on customerCode:
//                        customerCode=true  |  customerCode=false
// Set polling rate:           1              |       13
// Set DPI value:              2              |       12
// Set DPI config:             3              |       11
// Read polling rate:         129             |      141
// Read DPI value:            130             |      140
```

Getting this wrong means **every command is silently ignored** by the device. This was the single most important piece of the puzzle.

### Full Command Protocol

We extracted every command from the minified JS:

**Write commands** (change device settings):

```javascript
// Set polling rate
sendFeatureReport(9, [cmd.setPollingRate, rateCode, 0, 0, 0, 0, 0, 0])

// Set DPI for a slot (50 DPI steps)
const encoded = Math.round(dpiValue / 50 - 1)
sendFeatureReport(9, [cmd.setDPIValue, slot, encoded & 0xFF, (encoded >> 8) & 0xFF, 0, 0, 0, 0])

// Set sensor parameter (LOD=1, Ripple=2, AngleSnap=3, MotionSync=4, PerfMode=5)
sendFeatureReport(9, [cmd.setSensorMode, paramId, value, 0, 0, 0, 0, 0])

// Set sleep time (seconds, 16-bit LE)
sendFeatureReport(9, [cmd.setParameter, 3, seconds & 0xFF, (seconds >> 8) & 0xFF, 0, 0, 0, 0])

// Remap a mouse button (32-bit function value, LE)
sendFeatureReport(9, [6, buttonId, v & 0xFF, (v>>8) & 0xFF, (v>>16) & 0xFF, (v>>24) & 0xFF, 0, 0])
```

**Read commands** (query device state):

```javascript
// Read polling rate
sendFeatureReport(9, [cmd.readPollingRate, 0, 0, 0, 0, 0, 0, 0])
// Response: [9, cmdId, pollingRateCode, 0, 0, 0, 0, 0, 0]

// Read DPI value for slot
sendFeatureReport(9, [cmd.readDPIValue, slot, 0, 0, 0, 0, 0, 0])
// Response: [9, cmdId, slot, lowByte, highByte, 0, 0, 0, 0]
// DPI = ((highByte << 8 | lowByte) + 1) * 50
```

**Button function values** (what each button can be mapped to):

```javascript
const KEY_FUNCTIONS = {
  'left-click':     0x00F00001,
  'right-click':    0x00F10001,
  'middle-click':   0x00F20001,
  'back':           0x00F30001,
  'forward':        0x00F40001,
  'dpi-cycle':      0x00030007,
  'dpi-plus':       0x00010007,
  'dpi-minus':      0x00020007,
  'disable':        0x00000000,
  'profile-switch': 0x0000F10A,
}
```

* * *

## 🏗️ Step 6: Building the Native macOS App (Proof of Concept)

Before building the full hybrid driver, we created a quick native SwiftUI app to validate our protocol understanding:

```swift
// HIDManager.swift — Parse vendor input reports
private func handleReport(reportID: Int32, bytes: [UInt8]) {
    guard reportID == 9, bytes.count >= 10 else { return }
    
    let batteryByte = bytes[1]
    let dpiPollByte = bytes[2]
    
    let batteryLevel = Int(batteryByte & 0x7F)
    let isCharging = (batteryByte & 0x80) != 0
    let dpiIndex = Int((dpiPollByte >> 4) & 0x0F)
    let pollCode = dpiPollByte & 0x0F
    let pollingHz = pollingRateMap[pollCode] ?? 0
    
    // Button press detection
    if bytes[8] == 0x5A {
        if let button = CCButton.from(byte: bytes[9]) {
            delegate?.hidManagerDidPressButton(button)
        }
    }
}
```

This SwiftUI app showed a live dashboard with battery, DPI, polling rate, profile indicators, and a control center button visualizer that lit up red when buttons were pressed. It validated that our protocol decoding was correct.

* * *

## 🌍 Step 7: The Hybrid Architecture

We chose a hybrid approach: a **web app** for device configuration (works in any Chrome browser) plus a **native macOS daemon** for OS-level features.

```
Browser (Chrome/Edge)                    Native Daemon (Swift)
┌──────────────────────┐                ┌─────────────────────┐
│  Vue 3 + Vite Web UI │                │  Menu Bar Agent     │
│                      │   WebSocket    │  - IOKit HID        │
│  WebHID ←→ Mouse     │◄─────────────►│  - Action Engine    │
│  (reads + writes)    │  ws://9876     │  - Profile Switcher │
│                      │                │  - Battery Icon     │
│  Daemon features UI  │                │  - Config Store     │
└──────────────────────┘                └─────────────────────┘
```

**Why hybrid?**

- **WebHID** gives us cross-platform device access with zero installation — but it's sandboxed in the browser. You can read/write the mouse but can't launch apps, simulate keystrokes, or show menu bar icons.
- **Native daemon** gives us full OS integration — but building a nice config UI in Swift is slower than HTML/CSS.
- **WebSocket bridge** connects them — the web app detects the daemon automatically and unlocks extra features.

### What WebHID Can Do (Standalone)

| Feature | Works? |
|---|---|
| Read battery, DPI, polling rate, profile | ✅ |
| Change DPI, polling rate, LOD, sleep, debounce | ✅ |
| Toggle angle snap, motion sync, ripple | ✅ |
| Remap mouse buttons | ✅ |
| Record and upload macros | ✅ |
| Switch profiles P1-P4 | ✅ |

### What Requires the Native Daemon

| Feature | Why |
|---|---|
| Map CC buttons to macOS actions | Browser sandbox prevents OS interaction |
| Menu bar battery indicator | Requires NSStatusItem |
| Per-app profile switching | Requires NSWorkspace app monitoring |
| Launch at login | Requires SMAppService |
| Low battery notifications | Requires UserNotifications |

* * *

## 💻 Step 8: Building the Web Driver

### Tech Stack

- **Vue 3** + TypeScript + Vite (matches the original w1.software)
- **Tailwind CSS** (dark monospaced aesthetic)
- **Pinia** for state management
- **WebHID API** for device communication

### Protocol Layer

We ported the entire protocol to TypeScript:

```typescript
// protocol/constants.ts
export const VENDOR_ID = 0x093a
export const PRODUCT_ID_WIRELESS = 0x522c
export const USAGE_PAGE_VENDOR = 0xff05
export const REPORT_ID = 9

export function getCommandIDs(isCustomer: boolean) {
  return {
    setPollingRate: isCustomer ? 1 : 13,
    setDPIValue: isCustomer ? 2 : 12,
    readPollingRate: isCustomer ? 129 : 141,
    readDPIValue: isCustomer ? 130 : 140,
    identify: 143,
    // ... full command table
  }
}
```

### The Buffer Clearing Discovery

Our first attempt at reading device config via `receiveFeatureReport` produced garbage after the first read:

```
PollRate:  [81,0,...] -> [9,0,0,0,0,0,0,0,0]  ✅ (first read works)
DPIConfig: [83,0,...] -> [a1,1,9,3,3,0,9,0,0]  ❌ (garbage!)
LOD:       [84,1,...] -> [a1,1,9,3,3,0,9,0,0]  ❌ (same garbage!)
```

The `0xA1` bytes are HID descriptor data, not actual responses. WebHID's `receiveFeatureReport` was returning stale buffer data.

**The fix**: flush the buffer before each read, mimicking a pattern found in the w1.software source:

```typescript
async freshRead(label: string, cmd: Uint8Array, delayMs = 200) {
  // Step 1: Clear stale buffer
  try { await device.receiveFeatureReport(REPORT_ID) } catch {}
  await delay(10)
  
  // Step 2: Send command
  await device.sendFeatureReport(REPORT_ID, cmd)
  
  // Step 3: Wait for device to process
  await delay(delayMs)
  
  // Step 4: Read fresh response
  return await device.receiveFeatureReport(REPORT_ID)
}
```

This fixed all reads — the buffer-clear-before-read pattern is apparently required by the Pixart firmware.

### Write Lock Pattern

Another issue: after writing a setting (e.g., changing polling rate), the UI would show the new value optimistically, but then an incoming input report with the **old value** would overwrite it within seconds.

The fix is a "write lock" — after any write, ignore input report state updates for 3 seconds:

```typescript
let writeLockUntil = 0

// In the input report handler:
if (Date.now() < writeLockUntil) return // Skip state overwrite

// When writing:
function updateStateField(partial: Partial<DeviceState>) {
  writeLockUntil = Date.now() + 3000 // Lock for 3 seconds
  state.value = { ...state.value, ...partial }
}
```

* * *

## 🖥️ Step 9: Building the Native Daemon

The daemon is a Swift menu bar agent using:
- **IOKit** for HID communication (same report parsing as the SwiftUI PoC)
- **swift-nio** for the WebSocket server
- **AppKit** for the menu bar status item

### Menu Bar Agent Setup

```swift
let nsApp = NSApplication.shared
nsApp.setActivationPolicy(.accessory) // No dock icon
let daemon = WraithDaemonApp()
nsApp.delegate = daemon
nsApp.run()
```

### Action Engine

The action engine maps control center buttons to macOS actions:

```swift
func executeAction(for button: CCButton) {
    let action = configStore.getAction(for: button.rawValue)
    switch action {
    case .launchApp(let bundleId):
        NSWorkspace.shared.openApplication(at: url, configuration: .init())
    case .keyboardShortcut(let shortcut):
        // Parse "cmd+shift+4" → CGEvent with flags
        simulateKeyboardShortcut(shortcut)
    case .shellCommand(let command):
        Process().run("/bin/zsh", ["-c", command])
    case .openURL(let url):
        NSWorkspace.shared.open(URL(string: url)!)
    case .system(let action):
        performSystemAction(action) // screenshot, lock, mission control
    }
}
```

### WebSocket Protocol

The daemon serves `ws://127.0.0.1:9876` and speaks JSON:

```json
// Web → Daemon
{"type": "ping"}
{"type": "set_cc_action", "payload": {"button": "START", "action": {"type": "launch_app", "value": "com.apple.calculator"}}}
{"type": "set_app_profile", "payload": {"bundleId": "com.valvesoftware.cs2", "profile": 1}}

// Daemon → Web
{"type": "pong", "payload": {"version": "1.0"}}
{"type": "button", "payload": {"button": "START", "timestamp": 1712764800000}}
{"type": "state", "payload": {"batteryLevel": 57, "pollingRateHz": 1000, ...}}
```

### Per-App Profile Switching

```swift
// Observe app focus changes
NSWorkspace.shared.notificationCenter.addObserver(
    forName: NSWorkspace.didActivateApplicationNotification, ...
) { notification in
    let bundleId = app.bundleIdentifier
    if let profile = config.appProfiles[bundleId] {
        switchProfile(to: profile) // Send feature report to device
    }
}
```

* * *

## 🧪 Step 10: Debugging Challenges

### Challenge 1: Input Reports Only on Events

In IOKit, the device sends periodic heartbeat reports every ~2 seconds. But in WebHID, input reports only arrive when a control center button is pressed. This means the web app can't get initial state without either:
- Using feature report reads (unreliable, needs buffer clearing)
- Waiting for the user to press a button
- Caching the last known state in localStorage

We use all three as fallbacks.

### Challenge 2: The customerCode Discovery

Our first attempts at writing settings all failed silently. The device just ignored every command. It took hours of comparing our commands to the w1.software bundle before we noticed the `customerCode` flag — a single byte in the identify response that shifts ALL command IDs by ~10 positions. Getting this wrong means every command hits a non-existent handler in the firmware.

### Challenge 3: Sleep Time Encoding

The sleep time encoding was initially wrong. The input report encodes it across two non-adjacent bytes:

```
sleepTime = ((byte[4] >> 4) & 0x0F) * 256 + byte[6]
```

Byte 5 is padding/unknown — we initially included it in the calculation, which produced wrong values.

* * *

## 📁 Project Structure (after Phase 1)

```
wraith-w1-driver/
├── packages/
│   ├── darwin/                      # macOS daemon (Swift)
│   │   ├── Package.swift
│   │   ├── WraithDaemon/
│   │   │   ├── main.swift           # Menu bar agent entry point
│   │   │   ├── HIDManager.swift     # IOKit HID connection + parsing
│   │   │   ├── WebSocketServer.swift# NIO WebSocket on port 9876
│   │   │   ├── ActionEngine.swift   # CC button → macOS action
│   │   │   ├── ProfileSwitcher.swift# Per-app profile auto-switching
│   │   │   ├── Config.swift         # Persistent JSON config
│   │   │   └── WraithProtocol.swift # Shared data models
│   │   └── WraithController/        # Original SwiftUI PoC (reference)
│   │
│   └── web/                         # Vue 3 web driver
│       ├── src/
│       │   ├── protocol/
│       │   │   ├── constants.ts     # IDs, maps, command tables
│       │   │   ├── parser.ts        # Input report parser
│       │   │   └── commands.ts      # Feature report builders
│       │   ├── transport/
│       │   │   ├── webhid.ts        # WebHID connection layer
│       │   │   └── websocket.ts     # Daemon WebSocket client
│       │   ├── stores/device.ts     # Pinia reactive state
│       │   └── views/
│       │       ├── Dashboard.vue    # Live status + CC button monitor
│       │       ├── Performance.vue  # DPI, poll rate, sensor settings
│       │       ├── ButtonRemap.vue  # Mouse button remapping
│       │       ├── Macros.vue       # Keystroke recorder
│       │       ├── Profiles.vue     # P1-P4 management
│       │       └── DaemonSettings.vue # CC→action mapping (daemon only)
│       └── ...
└── CLAUDE.md
```

* * *

## 🪟 Step 11: Porting the Daemon to Windows (Rust)

After the macOS version was working, the natural next step was Windows. The official driver already runs on Windows, but our web-first approach needed a native daemon there too for the same OS-level features: CC button actions, per-app profiles, and tray battery indicator.

We chose **Rust** for the Windows daemon for two reasons: it has excellent `hidapi` and `tray-icon` crates, and the resulting binary is a single 2.4 MB self-contained executable with no runtime dependencies.

### HID Access Differences

The single biggest platform difference is **report ID handling**. On macOS IOKit, the report ID is a separate parameter:

```swift
// macOS: report ID is a separate argument
IOHIDDeviceSetReport(device, kIOHIDReportTypeFeature, 9, payload, 8)
```

On Windows, every HID buffer must be **prefixed with the report ID as byte[0]**:

```rust
// Windows: first byte of the buffer IS the report ID
let mut buf = [0u8; 9]; // 1 (reportId) + 8 (payload)
buf[0] = 0x09;
buf[1..].copy_from_slice(&payload);
device.send_feature_report(&buf)?;
```

The same applies to input reports. The Windows read buffer is 34 bytes — `[reportId, ...33 data bytes]` — while on macOS the callback gives you the 33 data bytes directly. Every byte index in the parser shifts by +1 on Windows.

### Threading Model

Windows has a constraint macOS doesn't: the system tray event loop **must run on the main thread**. This forced a specific threading architecture:

```
main thread         ── Win32 tray icon message loop (required on main)
hid-read thread     ── hidapi blocking read loop + reconnect
profile-switcher    ── SetWinEventHook + GetMessage/DispatchMessage pump
tokio runtime       ── WebSocket server + action handler (background threads)
```

All threads communicate via a `broadcast::channel<HidEvent>` from tokio. The HID thread publishes `StateUpdate` and `ButtonPress` events; the WebSocket broadcaster and action engine subscribe to them.

### Foreground Window Detection

On macOS we used `NSWorkspace.didActivateApplicationNotification`. On Windows the equivalent is `SetWinEventHook`:

```rust
// profile.rs
extern "system" fn winevent_proc(
    _hook: HWINEVENTHOOK, _event: u32, hwnd: HWND, ...) {
    let mut pid: u32 = 0;
    GetWindowThreadProcessId(hwnd, Some(&mut pid));
    let exe = get_exe_name(pid); // OpenProcess → QueryFullProcessImageNameW
    // look up exe in config, send profile switch command if mapped
}

SetWinEventHook(
    EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND,
    None, Some(winevent_proc), 0, 0, WINEVENT_OUTOFCONTEXT,
);
```

### Action Engine Platform Mapping

| Action | macOS | Windows |
|---|---|---|
| Launch app | `NSWorkspace.openApplication(bundleId)` | `ShellExecuteW("open", path)` |
| Keyboard shortcut | `CGEvent` + modifier flags | `SendInput` with `KEYBDINPUT` + VK codes |
| Shell command | `Process("/bin/zsh", ["-c", cmd])` | `CreateProcess("cmd.exe /c …")` |
| Volume up/down/mute | `NX_KEYTYPE_SOUND_UP/DOWN/MUTE` CGEvent | `SendInput(VK_VOLUME_UP/DOWN/MUTE)` |
| Play/pause/next/prev | Media key CGEvent | `SendInput(VK_MEDIA_PLAY_PAUSE/…)` |
| Show desktop | `cmd+f3` shortcut | `SendInput(win+d)` |
| Task manager | Launch `Activity Monitor.app` | `SendInput(ctrl+shift+escape)` |
| Lock screen | `cmd+ctrl+q` shortcut | `LockWorkStation()` |

The WebSocket protocol is **identical** between daemons — the web app can't tell whether it's talking to Swift on macOS or Rust on Windows.

### Final Monorepo Structure

With both daemons complete, the project became a proper monorepo:

```
wraith-w1-driver/
├── packages/
│   ├── darwin/     # Swift daemon (macOS 13+)
│   ├── win32/      # Rust daemon (Windows 10+)
│   └── web/        # Vue 3 SPA (Chrome/Edge, any OS)
```

* * *

## 🐛 Step 12: Bug Hunting After Initial Release

Once real-world testing began, several subtle bugs surfaced. This section covers the ones that were hardest to diagnose.

### Bug 1: The customerCode Byte Offset

The most impactful bug: the identify response was being parsed at the wrong byte index. The original code checked `bytes[7]` for the `0x40` customerCode marker:

```typescript
// ❌ Wrong — this is the macOS IOKit byte offset
const customerCode = bytes[7] === 64
```

But in WebHID, `receiveFeatureReport` returns a DataView **including** the report ID as `bytes[0]`. The response layout is:

```
bytes[0] = 0x09  (report ID — added by WebHID)
bytes[1] = 0x8F  (echoed command: 143)
bytes[2] = firmware
bytes[3] = mouse type
bytes[4] = connection mode
bytes[5] = unknown
bytes[6] = sensor type
bytes[7] = unknown
bytes[8] = 0x40  ← customerCode  (macOS "byte[7]" + 1 for the report ID prefix)
```

The fix was a one-character change — `bytes[7]` → `bytes[8]` — but the consequence of getting it wrong was total: **every single HID command used the wrong command ID**, all silently ignored by the firmware.

```typescript
// ✅ Correct — account for report ID at bytes[0]
const customerCode = bytes[8] === 64
```

### Bug 2: Profile Switching Had No Feedback

After sending `cmdSwitchProfile`, the UI didn't update which profile was highlighted. The root cause: `store.currentProfile` only updated via input reports, which the W1 only sends when a CC button is physically pressed. Switching profiles from software never triggered one.

The fix was simple — optimistically update the UI immediately after the command is sent, without waiting for the device to confirm:

```typescript
async function switchProfile(index: number) {
  await store.sendFeatureReport(cmdSwitchProfile(store.customerCode, index))
  store.updateState({ currentProfile: index })  // immediate visual feedback
  await store.readDPIConfig()                   // reload DPI for new profile
}
```

The second line — `readDPIConfig()` — matters too. Each hardware profile has its own independent DPI slot values. Without re-reading after a profile switch, the UI would show stale DPI values from the previous profile.

### Bug 3: DPI Slots Not Reactive

`Performance.vue` originally loaded DPI values in `onMounted`:

```typescript
onMounted(() => loadDPIFromStore())  // ❌ runs once, misses async reads
```

But `readFullConfig()` is asynchronous and completes well after mount. The UI would always show default values until the user refreshed.

The fix was replacing the one-shot `onMounted` call with a reactive `watch`:

```typescript
watch(
  () => store.dpiLevels,
  (levels) => {
    if (levels.length > 0) {
      const arr = [...levels]
      while (arr.length < 4) arr.push(800)
      dpiSlots.value = arr.slice(0, 4)
      currentDPISlot.value = store.currentDPIIndex
    }
  },
  { immediate: true }  // also runs once synchronously on mount
)
```

Now the UI reacts to DPI changes from any source: initial connect, profile switch, or direct read.

### Bug 4: LOD Values Were Swapped

The Lift-Off Distance options in `Performance.vue` had Low and Medium swapped. The device encodes LOD as:

```
2 → 0.7 mm (Low)
0 → 1.0 mm (Medium)
1 → 2.0 mm (High)
```

The original code had `{ v: 0, label: 'Low' }` — mapping the 1mm value to "Low". The fix simply corrects the value-label pairs:

```typescript
const lodOptions = [
  { v: 2, label: 'Low' },    // 0.7 mm
  { v: 0, label: 'Medium' }, // 1.0 mm
  { v: 1, label: 'High' },   // 2.0 mm
]
```

### Bug 5: Performance Mode Needs Time to Apply

Switching the sensor performance mode (Power Saving / Standard / Gaming) appeared to work — the device acknowledged the command — but the internal sensor state didn't immediately match. Reading it back within a second would return the old value.

The device firmware needs approximately **1.5 seconds** to reinitialize the sensor after a mode change. We added a delay and a visual "applying" state so the UI doesn't show a false confirmation:

```typescript
async function setPerfMode(mode: number) {
  perfModeApplying.value = mode         // show pulsing animation
  await store.sendFeatureReport(cmdSetPerfMode(store.customerCode, mode))
  await new Promise(resolve => setTimeout(resolve, 1500))  // wait for sensor
  store.updateState({ performanceMode: mode })
  perfModeApplying.value = null
}
```

* * *

## 🎵 Step 13: Extending Daemon Actions

The initial daemon only supported launching apps, keyboard shortcuts, shell commands, and URL opens. After using it daily, two categories of missing actions became obvious: **media controls** and **common system tasks**.

### Media Controls

On macOS, media key events are sent via private CoreGraphics APIs — they're not normal keyboard events:

```swift
func sendMediaKey(_ keyCode: Int32) {
    let down = NSEvent.otherEvent(
        with: .systemDefined, location: .zero,
        modifierFlags: [0x0b << 16], timestamp: 0, windowNumber: 0,
        context: nil, subtype: 8,
        data1: (keyCode << 16) | (0xa << 8),  // key down
        data2: -1)
    down?.cgEvent?.post(tap: .cgSessionEventTap)
    // repeat with key up event...
}

// NX_KEYTYPE_SOUND_UP = 0, SOUND_DOWN = 1, MUTE = 7
// NX_KEYTYPE_PLAY = 16, NEXT = 17, PREVIOUS = 18
```

On Windows, the same effect uses `SendInput` with virtual key codes:

```rust
fn send_media_key(vk: u16) {
    let inputs = [
        make_key_input(vk, 0),                      // key down
        make_key_input(vk, KEYEVENTF_KEYUP.0),      // key up
    ];
    unsafe { SendInput(&inputs, size_of::<INPUT>() as i32); }
}

// VK_MEDIA_PLAY_PAUSE = 0xB3, VK_MEDIA_NEXT_TRACK = 0xB0
// VK_VOLUME_UP = 0xAF, VK_VOLUME_DOWN = 0xAE, VK_VOLUME_MUTE = 0xAD
```

### System Task Actions

| Action | macOS Implementation | Windows Implementation |
|---|---|---|
| `show_desktop` | `cmd+f3` (Mission Control shortcut) | `win+d` |
| `task_manager` | Launch `com.apple.ActivityMonitor` | `ctrl+shift+escape` |
| `lock_screen` | `cmd+ctrl+q` | `LockWorkStation()` |
| `mission_control` | `ctrl+up` | — |
| `screenshot` | `cmd+shift+3` | PrintScreen via `SendInput` |

* * *

## 🚀 Step 14: CI/CD Pipeline

With the project stabilized, we set up a proper CI/CD pipeline using GitHub Actions.

### Workflow 1: Build Check on Pull Requests

Every PR to `main` triggers three parallel build jobs across all three platforms. A PR cannot be merged if any build fails:

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main]

jobs:
  build-web:     # ubuntu-latest, Node 22, npm run build
  build-win32:   # windows-latest, Rust stable MSVC, cargo build --release
  build-darwin:  # macos-latest, Swift built-in, swift build --target WraithDaemon -c release
```

Each job uploads its build output as a downloadable artifact (retained 7 days), so reviewers can test binaries directly from a PR before merging.

### Workflow 2: Release on Tag Push

Pushing a version tag (e.g. `git tag v1.0.0 && git push --tags`) triggers:

1. Build `wraith-daemon.exe` on Windows
2. Build `WraithDaemon` on macOS
3. Create a **GitHub Release** with both binaries attached as downloadable assets
4. Build a **Docker image** of the web app and push it to Docker Hub

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']

jobs:
  build-win32:   # → artifact: wraith-daemon.exe
  build-darwin:  # → artifact: WraithDaemon
  release-and-docker:
    needs: [build-win32, build-darwin]
    steps:
      - uses: softprops/action-gh-release@v2    # create GitHub Release
        with:
          files: |
            artifacts/windows/wraith-daemon.exe
            artifacts/macos/WraithDaemon
      - uses: docker/build-push-action@v5       # push to Docker Hub
        with:
          tags: torchizm/w1-driver:latest,torchizm/w1-driver:${{ github.ref_name }}
```

### Dockerizing the Web App

The web app is a pure static SPA — the ideal candidate for a minimal Docker image. We use a multi-stage build: Node 22 Alpine to compile the TypeScript and bundle the assets, then nginx Alpine as the runtime:

```dockerfile
# packages/web/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build       # vue-tsc + vite → dist/

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

The nginx config adds one critical line for Vue Router: `try_files $uri $uri/ /index.html`. Without it, refreshing any route other than `/` returns a 404 from nginx.

The final image is ~45 MB (nginx:alpine base) vs ~1.1 GB for a Node-based server. The web app is now live at [w1.xn--tea.app](https://w1.xn--tea.app) — any Chrome or Edge user can configure their W1 Freestyle from the browser with zero installation.

* * *

## 📁 Final Project Structure

```
wraith-w1-driver/
├── .github/
│   └── workflows/
│       ├── ci.yml          # PR build check (web + win32 + darwin)
│       └── release.yml     # Tag push → GitHub Release + Docker push
├── packages/
│   ├── darwin/             # Swift daemon (macOS 13+)
│   │   ├── Package.swift
│   │   ├── WraithDaemon/
│   │   │   ├── main.swift
│   │   │   ├── HIDManager.swift
│   │   │   ├── WebSocketServer.swift
│   │   │   ├── ActionEngine.swift
│   │   │   ├── ProfileSwitcher.swift
│   │   │   ├── Config.swift
│   │   │   └── WraithProtocol.swift
│   │   └── WraithController/   # Original SwiftUI PoC (reference)
│   │
│   ├── win32/              # Rust daemon (Windows 10+)
│   │   ├── Cargo.toml
│   │   ├── build.rs        # Windows manifest + DPI awareness
│   │   └── src/
│   │       ├── main.rs     # Tray icon event loop
│   │       ├── hid.rs      # hidapi read loop + report parsing
│   │       ├── actions.rs  # CC button → Windows action
│   │       ├── profile.rs  # SetWinEventHook per-app switching
│   │       ├── websocket.rs# tokio-tungstenite WebSocket server
│   │       └── config.rs   # %APPDATA% JSON config
│   │
│   └── web/                # Vue 3 SPA (Chrome/Edge, any OS)
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
│           ├── protocol/
│           │   ├── constants.ts
│           │   ├── parser.ts
│           │   └── commands.ts
│           ├── transport/
│           │   ├── webhid.ts
│           │   └── websocket.ts
│           ├── stores/device.ts
│           └── views/
│               ├── Dashboard.vue
│               ├── Performance.vue
│               ├── ButtonRemap.vue
│               ├── Macros.vue
│               ├── Profiles.vue
│               └── DaemonSettings.vue
└── CLAUDE.md
```

* * *

## 📋 Key Takeaways

1. **`ioreg` and `hidutil` are your friends.** They reveal everything about a USB device's HID topology without writing any code.

2. **Raw report monitoring is essential.** Writing a simple IOKit callback that dumps hex is the fastest way to map buttons and decode protocols.

3. **Reverse engineering web drivers is effective.** If the manufacturer has a web-based tool using WebHID, the minified JavaScript contains the entire protocol. `sendFeatureReport` calls with their byte patterns are a goldmine.

4. **Watch for firmware variant flags.** The `customerCode` flag that shifts all command IDs is a pattern seen in many Pixart-based mice. Always check for conditional command routing.

5. **WebHID `receiveFeatureReport` is unreliable for sequential reads.** Clear the buffer before each read. This isn't documented anywhere — we found it by trial and error.

6. **Hybrid web + native is the sweet spot.** WebHID handles 90% of the use case. A lightweight native daemon fills the remaining 10% (system integration) without the overhead of Electron.

7. **Input reports are the source of truth.** Feature report reads can be flaky. Trust the input report stream for live device state, use feature reports only for data not present in input reports (like DPI level values).

8. **Platform port differences are in the details.** The core protocol logic is identical across macOS (IOKit/Swift) and Windows (hidapi/Rust). The differences live in buffer layout (report ID prefix on Windows), threading constraints (tray must run on main thread), and OS API mappings for actions.

9. **Optimistic UI updates need write locks.** After writing a setting, the device's next input report will carry the *old* value for a few seconds while firmware catches up. A short write lock that suppresses incoming state during that window prevents flickering.

10. **Off-by-one byte bugs are silent killers.** The customerCode byte offset error (`bytes[7]` vs `bytes[8]`) caused 100% of device commands to silently fail with no error, for days. When reverse engineering protocols, always verify the exact byte layout for each platform's API — the same logical byte can be at different positions depending on whether the transport includes the report ID in-band.

* * *

## 🔗 References

- [WebHID API Specification](https://wicg.github.io/webhid/)
- [USB HID Usage Tables](https://usb.org/document-library/hid-usage-tables-15)
- [IOKit HID Documentation (Apple)](https://developer.apple.com/documentation/iokit/iohidmanager_h)
- [swift-nio (Apple)](https://github.com/apple/swift-nio)
- [hidapi (Rust crate)](https://crates.io/crates/hidapi)
- [w1.software](https://w1.software) — Official Wraith W1 web driver
- [Live driver](https://w1.xn--tea.app) — Our open-source web driver
- [GitHub repository](https://github.com/torchizm/wraith-w1-driver) — Full source code

* * *

*This project was built with Claude Code (Sonnet 4.6). The initial reverse engineering and hybrid driver — from USB discovery to working macOS daemon — was completed in a single conversation. The Windows daemon, bug fixes, action extensions, and CI/CD pipeline followed in subsequent sessions.*
