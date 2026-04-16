import Foundation
import NIO
import NIOHTTP1
import NIOWebSocket

class WebSocketServer {
    private var group: EventLoopGroup?
    private var channel: Channel?
    private var clients: [ObjectIdentifier: WebSocketClient] = [:]
    private let port: Int
    private let lock = NSLock()

    init(port: Int = 9876) {
        self.port = port
    }

    func start() throws {
        let group = MultiThreadedEventLoopGroup(numberOfThreads: 1)
        self.group = group
        let server = self

        let bootstrap = ServerBootstrap(group: group)
            .serverChannelOption(.backlog, value: 16)
            .serverChannelOption(.socketOption(.so_reuseaddr), value: 1)
            .childChannelInitializer { channel in
                channel.pipeline.addHandler(ByteToMessageHandler(HTTPRequestDecoder(leftOverBytesStrategy: .forwardBytes))).flatMap {
                    channel.pipeline.addHandler(HTTPResponseEncoder())
                }.flatMap {
                    channel.pipeline.addHandler(HTTPUpgradeHandler(server: server))
                }
            }
            .childChannelOption(.socketOption(.so_reuseaddr), value: 1)

        channel = try bootstrap.bind(host: "127.0.0.1", port: port).wait()
        print("[WS] Listening on ws://127.0.0.1:\(port)")
    }

    func stop() {
        channel?.close(promise: nil)
        try? group?.syncShutdownGracefully()
    }

    func addClient(_ client: WebSocketClient) {
        lock.lock()
        clients[client.id] = client
        let count = clients.count
        lock.unlock()
        print("[WS] Client connected (\(count) total)")
    }

    func removeClient(_ id: ObjectIdentifier) {
        lock.lock()
        clients.removeValue(forKey: id)
        let count = clients.count
        lock.unlock()
        print("[WS] Client disconnected (\(count) total)")
    }

    func broadcast(_ json: String) {
        lock.lock()
        let all = Array(clients.values)
        lock.unlock()
        for c in all { c.send(json) }
    }

    func broadcastJSON(_ dict: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: dict),
              let json = String(data: data, encoding: .utf8) else { return }
        broadcast(json)
    }

    func handleMessage(_ parsed: [String: Any], from clientId: ObjectIdentifier) -> [String: Any]? {
        return nil
    }
}

// Handles initial HTTP request and upgrades to WebSocket
class HTTPUpgradeHandler: ChannelInboundHandler, RemovableChannelHandler {
    typealias InboundIn = HTTPServerRequestPart
    typealias OutboundOut = HTTPServerResponsePart

    let server: WebSocketServer

    init(server: WebSocketServer) {
        self.server = server
    }

    var upgradeRequest: HTTPRequestHead?

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let part = unwrapInboundIn(data)

        switch part {
        case .head(let head):
            if head.headers.contains(name: "Upgrade") {
                upgradeRequest = head
            } else {
                // Non-WebSocket HTTP request — respond with health check
                let headers = HTTPHeaders([("Content-Type", "text/plain"), ("Access-Control-Allow-Origin", "*")])
                let responseHead = HTTPResponseHead(version: .http1_1, status: .ok, headers: headers)
                context.write(wrapOutboundOut(.head(responseHead)), promise: nil)
                let body = context.channel.allocator.buffer(string: "WraithDaemon OK")
                context.write(wrapOutboundOut(.body(.byteBuffer(body))), promise: nil)
                context.writeAndFlush(wrapOutboundOut(.end(nil)), promise: nil)
            }

        case .body:
            break

        case .end:
            guard let request = upgradeRequest else { return }
            upgradeRequest = nil
            performWebSocketUpgrade(context: context, request: request)
        }
    }

    private func performWebSocketUpgrade(context: ChannelHandlerContext, request: HTTPRequestHead) {
        guard let wsKey = request.headers["Sec-WebSocket-Key"].first else {
            print("[WS] Missing Sec-WebSocket-Key")
            context.close(promise: nil)
            return
        }

        // Compute accept key
        let magicString = wsKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        let sha1 = SHA1.hash(magicString)
        let acceptKey = Data(sha1).base64EncodedString()

        // Send 101 Switching Protocols
        var headers = HTTPHeaders()
        headers.add(name: "Upgrade", value: "websocket")
        headers.add(name: "Connection", value: "Upgrade")
        headers.add(name: "Sec-WebSocket-Accept", value: acceptKey)
        let responseHead = HTTPResponseHead(version: .http1_1, status: .switchingProtocols, headers: headers)
        context.write(wrapOutboundOut(.head(responseHead)), promise: nil)
        context.writeAndFlush(wrapOutboundOut(.end(nil)), promise: nil)

        print("[WS] Upgrade complete")

        // Reconfigure pipeline: remove all HTTP handlers, add WebSocket handlers
        let server = self.server
        let ch = context.channel

        // Remove HTTP handlers first, then add WS handlers
        context.pipeline.removeHandler(context: context).flatMap {
            ch.pipeline.handler(type: ByteToMessageHandler<HTTPRequestDecoder>.self)
        }.flatMap { httpDecoder in
            ch.pipeline.removeHandler(httpDecoder)
        }.flatMap {
            ch.pipeline.handler(type: HTTPResponseEncoder.self)
        }.flatMap { httpEncoder in
            ch.pipeline.removeHandler(httpEncoder)
        }.flatMap {
            ch.pipeline.addHandler(ByteToMessageHandler(WebSocketFrameDecoder(maxFrameSize: 1 << 20)))
        }.flatMap {
            ch.pipeline.addHandler(WebSocketFrameEncoder())
        }.flatMap {
            ch.pipeline.addHandler(WebSocketFrameHandler(server: server))
        }.whenComplete { result in
            switch result {
            case .success:
                server.addClient(WebSocketClient(channel: ch, id: ObjectIdentifier(ch)))
            case .failure(let error):
                print("[WS] Pipeline reconfiguration failed: \(error)")
                ch.close(promise: nil)
            }
        }
    }
}

// Simple SHA1 (just enough for WebSocket handshake)
struct SHA1 {
    static func hash(_ string: String) -> [UInt8] {
        let data = Array(string.utf8)
        var h0: UInt32 = 0x67452301
        var h1: UInt32 = 0xEFCDAB89
        var h2: UInt32 = 0x98BADCFE
        var h3: UInt32 = 0x10325476
        var h4: UInt32 = 0xC3D2E1F0

        var message = data
        let origLen = data.count
        message.append(0x80)
        while message.count % 64 != 56 { message.append(0) }
        let bitLen = UInt64(origLen) * 8
        for i in stride(from: 56, through: 0, by: -8) {
            message.append(UInt8((bitLen >> i) & 0xFF))
        }

        for chunk in stride(from: 0, to: message.count, by: 64) {
            var w = [UInt32](repeating: 0, count: 80)
            for i in 0..<16 {
                let offset = chunk + i * 4
                w[i] = UInt32(message[offset]) << 24 | UInt32(message[offset+1]) << 16 | UInt32(message[offset+2]) << 8 | UInt32(message[offset+3])
            }
            for i in 16..<80 {
                w[i] = (w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16])
                w[i] = (w[i] << 1) | (w[i] >> 31)
            }

            var a = h0, b = h1, c = h2, d = h3, e = h4
            for i in 0..<80 {
                let f: UInt32, k: UInt32
                if i < 20 { f = (b & c) | ((~b) & d); k = 0x5A827999 }
                else if i < 40 { f = b ^ c ^ d; k = 0x6ED9EBA1 }
                else if i < 60 { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC }
                else { f = b ^ c ^ d; k = 0xCA62C1D6 }
                let temp = ((a << 5) | (a >> 27)) &+ f &+ e &+ k &+ w[i]
                e = d; d = c; c = (b << 30) | (b >> 2); b = a; a = temp
            }
            h0 = h0 &+ a; h1 = h1 &+ b; h2 = h2 &+ c; h3 = h3 &+ d; h4 = h4 &+ e
        }

        var result = [UInt8]()
        for h in [h0, h1, h2, h3, h4] {
            result.append(UInt8((h >> 24) & 0xFF))
            result.append(UInt8((h >> 16) & 0xFF))
            result.append(UInt8((h >> 8) & 0xFF))
            result.append(UInt8(h & 0xFF))
        }
        return result
    }
}

// WebSocket frame handler
class WebSocketFrameHandler: ChannelInboundHandler {
    typealias InboundIn = WebSocketFrame
    typealias OutboundOut = WebSocketFrame

    let server: WebSocketServer

    init(server: WebSocketServer) {
        self.server = server
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let frame = unwrapInboundIn(data)

        switch frame.opcode {
        case .text:
            var buf = frame.unmaskedData
            guard let text = buf.readString(length: buf.readableBytes) else { return }
            handleText(text, context: context)

        case .binary:
            break

        case .connectionClose:
            server.removeClient(ObjectIdentifier(context.channel))
            let closeFrame = WebSocketFrame(fin: true, opcode: .connectionClose, data: context.channel.allocator.buffer(capacity: 0))
            context.writeAndFlush(wrapOutboundOut(closeFrame)).whenComplete { _ in
                context.close(promise: nil)
            }

        case .ping:
            let pong = WebSocketFrame(fin: true, opcode: .pong, data: frame.data)
            context.writeAndFlush(wrapOutboundOut(pong), promise: nil)

        default:
            break
        }
    }

    func channelInactive(context: ChannelHandlerContext) {
        server.removeClient(ObjectIdentifier(context.channel))
    }

    private func handleText(_ text: String, context: ChannelHandlerContext) {
        guard let data = text.data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            print("[WS] Failed to parse: \(text.prefix(100))")
            return
        }

        let msgType = parsed["type"] as? String ?? "?"
        print("[WS] Recv: \(msgType)")

        guard let response = server.handleMessage(parsed, from: ObjectIdentifier(context.channel)) else { return }

        guard let responseData = try? JSONSerialization.data(withJSONObject: response),
              let json = String(data: responseData, encoding: .utf8) else {
            print("[WS] Failed to serialize response")
            return
        }

        print("[WS] Send: \(response["type"] as? String ?? "?")")
        let buffer = context.channel.allocator.buffer(string: json)
        let responseFrame = WebSocketFrame(fin: true, opcode: .text, data: buffer)
        context.writeAndFlush(wrapOutboundOut(responseFrame), promise: nil)
    }

    func errorCaught(context: ChannelHandlerContext, error: Error) {
        print("[WS] Error: \(error)")
        server.removeClient(ObjectIdentifier(context.channel))
        context.close(promise: nil)
    }
}

// WebSocket client wrapper
class WebSocketClient {
    let channel: Channel
    let id: ObjectIdentifier

    init(channel: Channel, id: ObjectIdentifier) {
        self.channel = channel
        self.id = id
    }

    func send(_ text: String) {
        let buffer = channel.allocator.buffer(string: text)
        let frame = WebSocketFrame(fin: true, opcode: .text, data: buffer)
        channel.writeAndFlush(frame, promise: nil)
    }
}
