// WebHID API type declarations

interface HIDDevice {
  opened: boolean
  vendorId: number
  productId: number
  productName: string
  collections: any[]
  open(): Promise<void>
  close(): Promise<void>
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>
  receiveFeatureReport(reportId: number): Promise<DataView>
  sendReport(reportId: number, data: BufferSource): Promise<void>
  addEventListener(type: string, listener: (event: any) => void): void
  removeEventListener(type: string, listener: (event: any) => void): void
  oninputreport: ((event: HIDInputReportEvent) => void) | null
}

interface HIDInputReportEvent extends Event {
  device: HIDDevice
  reportId: number
  data: DataView
}

interface HID extends EventTarget {
  requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number; usagePage?: number }> }): Promise<HIDDevice[]>
  getDevices(): Promise<HIDDevice[]>
  addEventListener(type: string, listener: (event: any) => void): void
}

interface Navigator {
  hid: HID
}
