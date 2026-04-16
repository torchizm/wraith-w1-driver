# Wraith W1 RGB/LED Protocol Research

## Summary

**The Wraith W1 Freestyle mouse does not appear to have user-controllable RGB or LED lighting.**
No RGB, LED, color, lighting, backlight, animation, or effect commands were found in the
vendor's w1.software JavaScript bundle or in the existing reverse-engineered protocol.

## Methodology

The official vendor software at `https://w1.software` (a Vue.js SPA) was analyzed by
examining the minified JS bundle (`index-DgkCFFvE.js`, ~1.1 MB). The following searches
were performed:

1. **Keyword search** for: `rgb`, `led`, `color`, `backlight`, `lighting`, `illuminat`,
   `light_effect`, `glow`, `breathing`, `rainbow`, `spectrum`, `cycle`, `animation`,
   `setColor`, `setRGB`, `setLED`, `setLight`, `color-picker`, `colorPicker`
2. **i18n string analysis** of all 183 localization messages (msg5 through msg187) in
   English, Chinese, and Turkish translations
3. **HID command analysis** of all `sendFeatureReport` calls and `Uint8Array` patterns
4. **DPI-color association** search for any color mapping to DPI levels
5. **Swift HID driver analysis** of `WraithController/HIDManager.swift` and
   `WraithDaemon/HIDManager.swift`

## Findings

### 1. No RGB/LED Commands Found

The w1.software bundle contains zero references to RGB, LED, or color control in any
hardware-communication context. All `color` references in the bundle are CSS/SVG
`currentColor` attributes and standard web styling, not device commands.

The i18n strings (183 total) cover: button mappings, DPI adjustment, macro recording,
performance modes, polling rates, debounce, sleep, LOD, angle snap, motion sync, and
ripple correction. None mention LEDs, lighting, or colors.

### 2. "Ripple Effect" Is Sensor Smoothing, Not LED

The "Ripple" feature (PARAM.WAVE_CONTROL = 2) is a **sensor-level motion correction**
feature, not an LED effect.

From the i18n strings:
- **English**: "Ripple Correction" / "Eliminate small fluctuations in mouse movement and
  provide smoother pointer movement"
- **Chinese**: "波纹修正" / "消除鼠标移动中的微小波动，提高更平滑的指针移动"
- **Turkish**: "Dalgalanma düzeltme" / "Mouse hareketlerindeki küçük dalgalanmaları
  ortadan kaldırarak daha akıcı imleç hareketi sağlar"

It is toggled via sensor parameter ID 2 (WAVE_CONTROL) using the standard
`cmdSetSensorParam` / `cmdReadSensorParam` commands.

### 3. No DPI-Color Association

Many gaming mice allow setting a color per DPI level. The W1's DPI commands only transmit
slot index and DPI value (encoded as `dpiValue / 50 - 1`). No additional color bytes are
present in the DPI command or response formats.

### 4. Complete Known Command ID Map

All known feature report commands use Report ID 9 with 8-byte payloads:

| Command ID (cc=true) | Command ID (cc=false) | Purpose              |
|-----------------------|-----------------------|----------------------|
| 1                     | 13                    | Set polling rate     |
| 2                     | 12                    | Set DPI value        |
| 3                     | 11                    | Set DPI config       |
| 4                     | 10                    | Set sensor mode      |
| 5                     | 9                     | Set parameter / Switch profile |
| 6                     | 6                     | Set key function     |
| 7                     | 7                     | Send macro chunk     |
| 129                   | 141                   | Read polling rate    |
| 130                   | 140                   | Read DPI value       |
| 131                   | 139                   | Read DPI config      |
| 132                   | 138                   | Read sensor setting  |
| 133                   | 137                   | Read debounce/sleep  |
| 134                   | 134                   | Read key function    |
| 143                   | 143                   | Identify device      |

### 5. Unexplored Command ID Space

The protocol uses command IDs 1-7 (write) and 129-134 + 143 (read/identify) for the
customer-code variant. This leaves large gaps:

- **Write IDs 8**: Unused. Could be reserved for future features.
- **Read IDs 135-136, 142**: Unused. Could correspond to undiscovered read commands.
- **IDs 144-255**: Completely unexplored.

However, the vendor software does not use any of these IDs, suggesting they are either
unused or reserved for firmware updates / factory calibration.

### 6. HID Interface Analysis

The W1 exposes a single vendor-specific HID interface:
- **Vendor ID**: 0x093A (PixArt Imaging)
- **Product IDs**: 0x522C (wireless), 0x622C (wired)
- **Usage Page**: 0xFF05 (vendor-defined)
- **Report ID**: 9 (all feature reports), input reports also on ID 9

Standard HID LED usage page (0x08) is **not** exposed by the device. There are no
additional HID collections or usage pages beyond the vendor-specific 0xFF05 interface
that could contain LED control endpoints.

### 7. Input Report Byte Layout

The 33-byte vendor input reports contain no color or LED state bytes:

```
Byte 0: Battery (bit7=charging, bits0-6=level 0-100)
Byte 1: high nibble=DPI index, low nibble=polling rate code
Byte 2: bits7-6=profile index, bits5-0=debounce time
Byte 3: bits7-4=sleep time high nibble
Byte 4: (padding/unknown)
Byte 5: sleep time low byte
Byte 6: bits7-4=LOD, bit2=ripple, bit1=angleSnap, bit0=motionSync
Byte 7: 0x5A = button press indicator
Byte 8: button bitmask
Bytes 9-32: Unknown / unused (no LED state observed)
```

Bytes 9-32 of the input report are not fully documented but no color data patterns
(repeating RGB triplets, etc.) have been observed in them.

## Conclusion

The Wraith W1 Freestyle is a **performance-focused gaming mouse without software-
controllable lighting**. The hardware likely has only a basic DPI indicator LED (fixed
color per slot, controlled by firmware) and possibly a battery status LED, neither of
which is exposed through the HID vendor interface for software customization.

No RGB control code was added to the driver, as there is no protocol to implement.

## Potential Future Investigation

If a future firmware update adds LED control, the most likely protocol would be:
- A new command ID (possibly 8 for write, 136 for read) on Report ID 9
- Payload format: `[cmdId, mode, r, g, b, speed, brightness, 0]`
- Or a new report ID entirely (e.g., Report ID 10 or 11)

To test for hidden commands, one could systematically probe unused command IDs with
`sendFeatureReport(9, [cmdId, 0, 0, 0, 0, 0, 0, 0])` and check for non-zero responses,
but this risks destabilizing the device firmware.
