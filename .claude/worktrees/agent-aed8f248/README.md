# Wraith W1 Driver

Open-source driver for the **Wraith W1** gaming mouse and its physical control center, reverse-engineered from scratch. Supports **macOS** and **Windows**.

## Features

### Web Driver (Chrome/Edge — no install needed)
- Live dashboard: battery, DPI, polling rate, profile, sensor settings
- Change DPI (up to 30,000), polling rate (125–8000 Hz), LOD, debounce, sleep
- Toggle angle snap, motion sync, ripple effect
- Remap mouse buttons (left/right/middle/back/forward/DPI)
- Macro recorder
- Profile switching (P1–P4)

### Native Daemon (optional, unlocks OS features)
- System tray / menu bar battery indicator
- Map control center buttons to actions: launch apps, keyboard shortcuts, shell commands, URLs, system actions (play/pause, screenshot, lock screen)
- Per-app profile auto-switching (foreground window detection)
- WebSocket bridge to web UI

## Repository Layout

```
packages/
├── darwin/     macOS Swift daemon (IOKit + swift-nio)
├── win32/      Windows Rust daemon (hidapi + tokio-tungstenite)
└── web/        Vue 3 web app (WebHID, works standalone)
```

## Installation

### Web UI (no install needed)

Visit **[w1.xn--tea.app](https://w1.xn--tea.app)** or run locally — connect your Wraith W1 via USB and click **Connect Device**. Works out of the box in Chrome or Edge via WebHID, no daemon required.

### Native Daemon (optional)

The daemon unlocks OS-level features: menu bar / system tray battery indicator, control center button remapping, and per-app profile auto-switching.

Download the latest binary from the **[Releases page](https://github.com/torchizm/wraith-w1-driver/releases)**.

#### macOS

1. Download `WraithDaemon` from the latest release
2. Move it somewhere permanent, e.g. `~/Applications/WraithDaemon`
3. Remove the quarantine attribute: `xattr -d com.apple.quarantine ~/Applications/WraithDaemon`
4. Make it executable: `chmod +x ~/Applications/WraithDaemon`
5. Run it: `./WraithDaemon` — it appears in the menu bar
6. *(Optional)* Add it to Login Items in **System Settings → General → Login Items**

#### Windows

1. Download `wraith-daemon.exe` from the latest release
2. Run it — it appears in the system tray
3. *(Optional)* Create a shortcut in `shell:startup` to run it automatically on login

---

## Quick Start (build from source)

### Web Driver Only (all platforms)
```bash
cd packages/web
npm install
npm run dev
```
Open **Chrome or Edge** at `http://localhost:5173` and click **Connect Device**.

### With macOS Daemon
```bash
# Terminal 1
cd packages/darwin && swift run WraithDaemon

# Terminal 2
cd packages/web && npm run dev
```

### With Windows Daemon

**Prerequisites:** [Install Rust](https://rustup.rs/) and the MSVC toolchain (`rustup target add x86_64-pc-windows-msvc`).

```powershell
# Build
cd packages\win32
cargo build --release

# Run
.\target\release\wraith-daemon.exe
```

Then start the web app: `cd packages\web && npm run dev`

The daemon runs in the system tray. Right-click the tray icon to open the Web UI or quit.

> **Tip:** Set `RUST_LOG=debug` for verbose HID and WebSocket logging.

## Architecture

```
Browser (Chrome / Edge)               Native Daemon (macOS or Windows)
┌───────────────────────┐             ┌──────────────────────────────┐
│  Vue 3 + Vite Web UI  │             │  System Tray / Menu Bar      │
│                       │  WebSocket  │  ┌─────────────────────────┐ │
│  WebHID ←→ Mouse      │◄───────────►│  │ HID Manager (IOKit /    │ │
│  (reads + writes)     │  ws://9876  │  │   hidapi)               │ │
└───────────────────────┘             │  │ Action Engine           │ │
                                      │  │ Profile Switcher        │ │
                                      │  └─────────────────────────┘ │
                                      └──────────────────────────────┘
```

The web app works standalone (no daemon needed). The daemon adds OS-level features the browser sandbox cannot provide.

## Device Info

| | |
|---|---|
| **Vendor ID** | `0x093A` (Pixart Imaging) |
| **Product ID** | `0x522C` (wireless dongle) |
| **HID Interface** | Vendor Defined `0xFF05` |
| **Protocol** | Feature Reports, Report ID 9, 8-byte payload |

## Tech Stack

| Package | Technologies |
|---|---|
| `packages/web` | Vue 3, TypeScript, Vite, Tailwind CSS 4, Pinia, WebHID API |
| `packages/darwin` | Swift, IOKit, swift-nio (WebSocket), AppKit, CoreGraphics |
| `packages/win32` | Rust, hidapi, tokio + tokio-tungstenite, enigo, tray-icon, windows-rs |

## How It Works

Full technical deep-dive — reverse engineering the HID protocol, building the macOS/Windows daemons, and wiring it all together:

**[Reverse Engineering a Gaming Mouse: Building a macOS Driver for the Wraith W1 From Scratch](https://blog.xn--tea.app/blog/reverse-engineering-a-gaming-mouse-building-a-macos-driver-for-the-wraith-w1-from-scratch)**

Also available as [BLOG.md](./BLOG.md) in this repo.

## License

MIT
