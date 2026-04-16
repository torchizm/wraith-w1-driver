import Foundation
import AppKit
import IOKit
import IOKit.hid

class ProfileSwitcher {
    private let configStore: ConfigStore
    private var observation: NSObjectProtocol?
    private var vendorDevice: IOHIDDevice?
    private var currentBundleId: String = ""

    init(configStore: ConfigStore) {
        self.configStore = configStore
    }

    func start() {
        observation = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self,
                  let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
                  let bundleId = app.bundleIdentifier else { return }

            if bundleId != self.currentBundleId {
                self.currentBundleId = bundleId
                self.checkProfileSwitch(for: bundleId)
            }
        }
        print("[ProfileSwitcher] Watching app focus changes")
    }

    func stop() {
        if let observation = observation {
            NSWorkspace.shared.notificationCenter.removeObserver(observation)
        }
        observation = nil
    }

    func setVendorDevice(_ device: IOHIDDevice?) {
        self.vendorDevice = device
    }

    private func checkProfileSwitch(for bundleId: String) {
        guard let profileIndex = configStore.config.appProfiles[bundleId] else { return }
        switchProfile(to: profileIndex)
    }

    private func switchProfile(to index: Int) {
        guard let device = vendorDevice else { return }
        let payload: [UInt8] = [9, 6, UInt8(index & 0xff), UInt8((index >> 8) & 0xff), 0, 0, 0, 0]
        let result = IOHIDDeviceSetReport(device, kIOHIDReportTypeFeature, 9, payload, payload.count)
        if result == kIOReturnSuccess {
            print("[ProfileSwitcher] Switched to profile P\(index + 1) for app \(currentBundleId)")
        }
    }
}
