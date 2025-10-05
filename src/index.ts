import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as net from "net";

/**
 * Minimal TCP connectivity check to localhost service.
 * Host/port configurable via env: HOST, PORT. Defaults: 127.0.0.1:8700
 */
async function checkTcpOnce(
  host: string,
  port: number,
  timeoutMs: number
): Promise<{ ok: boolean; err?: string }> {
  return new Promise((resolve) => {
    const socket: net.Socket = new net.Socket();
    const timer: NodeJS.Timeout = setTimeout(() => {
      socket.destroy();
      resolve({ ok: false, err: "TIMEOUT" });
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true });
    });

    socket.on("error", (error: unknown) => {
      clearTimeout(timer);
      const errMessage: string =
        error instanceof Error ? error.message : String(error);
      resolve({ ok: false, err: errMessage });
    });
  });
}

async function checkTcpWithRetry(): Promise<string> {
  const host: string = process.env.HOST ?? "127.0.0.1";
  const port: number = Number(process.env.PORT ?? "8700");
  const timeoutMs: number = Number(process.env.TIMEOUT_MS ?? "1200");
  const attempts: number = Number(process.env.ATTEMPTS ?? "3");

  let lastErr: string | undefined = undefined;
  for (let i: number = 0; i < attempts; i++) {
    const r = await checkTcpOnce(host, port, timeoutMs);
    if (r.ok) {
      return `TCP ${host}:${port}: SUCCESS`;
    }
    lastErr = r.err;
  }
  return `TCP ${host}:${port}: FAILED${lastErr ? ` (${lastErr})` : ""}`;
}

async function main(): Promise<void> {
  const server: McpServer = new McpServer({
    name: "tcp-checker",
    version: "1.0.0",
  });

  server.tool(
    "check-tcp-connection",
    "Check TCP connectivity to HOST:PORT (env: HOST, PORT, TIMEOUT_MS, ATTEMPTS).",
    {},
    async () => {
      const text: string = await checkTcpWithRetry();
      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    }
  );

  const transport: StdioServerTransport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});


