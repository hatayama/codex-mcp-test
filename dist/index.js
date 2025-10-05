import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as net from "net";
/**
 * Minimal TCP connectivity check to localhost service.
 * Host/port configurable via env: HOST, PORT. Defaults: 127.0.0.1:8700
 */
async function checkTcpOnce(host, port, timeoutMs) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            resolve({ ok: false, err: "TIMEOUT" });
        }, timeoutMs);
        socket.connect(port, host, () => {
            clearTimeout(timer);
            socket.destroy();
            resolve({ ok: true });
        });
        socket.on("error", (error) => {
            clearTimeout(timer);
            const errMessage = error instanceof Error ? error.message : String(error);
            resolve({ ok: false, err: errMessage });
        });
    });
}
async function checkTcpWithRetry() {
    const host = process.env.HOST ?? "127.0.0.1";
    const port = Number(process.env.PORT ?? "8700");
    const timeoutMs = Number(process.env.TIMEOUT_MS ?? "1200");
    const attempts = Number(process.env.ATTEMPTS ?? "3");
    let lastErr = undefined;
    for (let i = 0; i < attempts; i++) {
        const r = await checkTcpOnce(host, port, timeoutMs);
        if (r.ok) {
            return `TCP ${host}:${port}: SUCCESS`;
        }
        lastErr = r.err;
    }
    return `TCP ${host}:${port}: FAILED${lastErr ? ` (${lastErr})` : ""}`;
}
async function main() {
    const server = new McpServer({
        name: "tcp-checker",
        version: "1.0.0",
    });
    server.tool("check-tcp-connection", "Check TCP connectivity to HOST:PORT (env: HOST, PORT, TIMEOUT_MS, ATTEMPTS).", {}, async () => {
        const text = await checkTcpWithRetry();
        return {
            content: [
                {
                    type: "text",
                    text,
                },
            ],
        };
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
