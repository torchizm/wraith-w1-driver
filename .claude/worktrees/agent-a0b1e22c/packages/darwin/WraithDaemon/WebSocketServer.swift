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

        let upgrader = NIOWebSocketServerUpgrader(
            shouldUpgrade: { channel, head in
                channel.eventLoop.makeSucceededFuture(HTTPHeaders())
            },
            upgradePipelineHandler: { channel, req in
                let id = ObjectIdentifier(channel)
                let client = WebSocketClient(channel: channel)
                server.lock.lock()
                server.clients[id] = client
                let count = server.clients.count
                server.lock.unlock()
                print("[WS] Client connected (\(count) total)")

                channel.closeFuture.whenComplete { _ in
                    server.lock.lock()
                    server.clients.removeValue(forKey: id)
                    let remaining = server.clients.count
                    server.lock.unlock()
                    print("[WS] Client disconnected (\(remaining) total)")
                }

                return channel.pipeline.addHandler(WebSocketHandler(server: server, clientId: id))
            }
        )

        let bootstrap = ServerBootstrap(group: group)
            .serverChannelOption(.backlog, value: 8)
            .serverChannelOption(.socketOption(.so_reuseaddr), value: 1)
            .childChannelInitializer { channel in
                let config: NIOHTTPServerUpgradeConfiguration = (
                    upgraders: [upgrader],
                    completionHandler: { ctx in
                        // Remove HTTP handler after upgrade completes
                        ctx.pipeline.removeHandler(name: "http-response-handler", promise: nil)
                    }
                )
                return channel.pipeline.configureHTTPServerPipeline(
                    withServerUpgrade: config
                ).flatMap {
                    channel.pipeline.addHandler(HTTPResponseHandler(), name: "http-response-handler")
                }
            }
            .childChannelOption(.socketOption(.so_reuseaddr), value: 1)

        channel = try bootstrap.bind(host: "127.0.0.1", port: port).wait()
        print("[WS] WebSocket server listening on ws://127.0.0.1:\(port)")
    }

    func stop() {
        channel?.close(promise: nil)
        try? group?.syncShutdownGracefully()
    }

    func broadcast(_ message: WSMessage) {
        guard let data = try? JSONEncoder().encode(message),
              let json = String(data: data, encoding: .utf8) else { return }
        lock.lock()
        let allClients = Array(clients.values)
        lock.unlock()
        for client in allClients {
            client.send(json)
        }
    }

    func handleMessage(_ message: WSMessage, from clientId: ObjectIdentifier) -> WSMessage? {
        return nil
    }
}

// WebSocket message format
struct WSMessage: Codable {
    let id: String?
    let type: String
    let payload: [String: AnyCodable]?

    init(type: String, payload: [String: AnyCodable]? = nil) {
        self.id = UUID().uuidString
        self.type = type
        self.payload = payload
    }
}

// Type-erased Codable
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) { self.value = value }

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(Int.self) { value = v }
        else if let v = try? c.decode(Double.self) { value = v }
        else if let v = try? c.decode(Bool.self) { value = v }
        else if let v = try? c.decode(String.self) { value = v }
        else if let v = try? c.decode([String: AnyCodable].self) { value = v }
        else if let v = try? c.decode([AnyCodable].self) { value = v }
        else { value = "" }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch value {
        case let v as Int: try c.encode(v)
        case let v as Double: try c.encode(v)
        case let v as Bool: try c.encode(v)
        case let v as String: try c.encode(v)
        case let v as [String: AnyCodable]: try c.encode(v)
        case let v as [AnyCodable]: try c.encode(v)
        default: try c.encode("")
        }
    }
}

// WebSocket client wrapper
class WebSocketClient {
    let channel: Channel

    init(channel: Channel) { self.channel = channel }

    func send(_ text: String) {
        let buffer = channel.allocator.buffer(string: text)
        let frame = WebSocketFrame(fin: true, opcode: .text, data: buffer)
        channel.writeAndFlush(frame, promise: nil)
    }
}

// NIO WebSocket handler
class WebSocketHandler: ChannelInboundHandler {
    typealias InboundIn = WebSocketFrame
    typealias OutboundOut = WebSocketFrame

    let server: WebSocketServer
    let clientId: ObjectIdentifier

    init(server: WebSocketServer, clientId: ObjectIdentifier) {
        self.server = server
        self.clientId = clientId
    }

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let frame = unwrapInboundIn(data)
        switch frame.opcode {
        case .text:
            var buf = frame.data
            guard let text = buf.readString(length: buf.readableBytes) else { return }
            handleText(text, context: context)
        case .connectionClose:
            context.close(promise: nil)
        case .ping:
            let pong = WebSocketFrame(fin: true, opcode: .pong, data: frame.data)
            context.writeAndFlush(wrapOutboundOut(pong), promise: nil)
        default:
            break
        }
    }

    private func handleText(_ text: String, context: ChannelHandlerContext) {
        guard let data = text.data(using: .utf8),
              let message = try? JSONDecoder().decode(WSMessage.self, from: data) else { return }

        if let response = server.handleMessage(message, from: clientId) {
            if let responseData = try? JSONEncoder().encode(response),
               let json = String(data: responseData, encoding: .utf8) {
                let buffer = context.channel.allocator.buffer(string: json)
                let frame = WebSocketFrame(fin: true, opcode: .text, data: buffer)
                context.writeAndFlush(wrapOutboundOut(frame), promise: nil)
            }
        }
    }

    func errorCaught(context: ChannelHandlerContext, error: Error) {
        context.close(promise: nil)
    }
}

// HTTP handler for non-WebSocket requests
class HTTPResponseHandler: ChannelInboundHandler, RemovableChannelHandler {
    typealias InboundIn = HTTPServerRequestPart
    typealias OutboundOut = HTTPServerResponsePart

    func channelRead(context: ChannelHandlerContext, data: NIOAny) {
        let reqPart = unwrapInboundIn(data)
        guard case .head = reqPart else { return }

        let headers = HTTPHeaders([
            ("Content-Type", "text/plain"),
            ("Access-Control-Allow-Origin", "*"),
        ])
        let head = HTTPResponseHead(version: .http1_1, status: .ok, headers: headers)
        context.write(wrapOutboundOut(.head(head)), promise: nil)
        let body = context.channel.allocator.buffer(string: "WraithDaemon OK")
        context.write(wrapOutboundOut(.body(.byteBuffer(body))), promise: nil)
        context.writeAndFlush(wrapOutboundOut(.end(nil)), promise: nil)
    }
}
