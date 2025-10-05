Minimal MCP TCP Connectivity Repro (Windows)

This project provides a minimal MCP server and helper scripts to reproduce and diagnose a class of issues where MCP-launched child processes on Windows cannot connect to localhost TCP services.

It is intentionally small and self-contained:

- `src/index.ts` → MCP server exposing one tool `check-tcp-connection`
- `dist/index.js` → Built MCP server (run by Codex)
- `server.cjs` → Minimal TCP listener on localhost (default 127.0.0.1:8700)
- `check.cjs` → Minimal Node client that attempts a TCP connect to HOST:PORT

Requirements
- Windows 10+ (tested on 10.0.26100)
- Node.js 18+ (tested on v22.17.0)
- Codex (for MCP launch), or any MCP client that can run `dist/index.js`

Build
```bash
npm ci
npm run build
# dist/index.js should be created
```

Quick Repro Steps (127.0.0.1:8700 by default)
1) Start a local TCP server (listener)
   - PowerShell:
     ```powershell
     $env:PORT=8700; node .\server.cjs
     ```
   - Alternative one‑liner (no payload):
     ```powershell
     node -e "require('net').createServer(()=>{}).listen(8700,'127.0.0.1')"
     ```

2) Verify from an external shell (should succeed outside the MCP client)
   ```powershell
   $env:PORT=8700; node .\check.cjs
   # EXPECTED: prints "SUCCESS"
   ```

3) Configure your MCP client (Codex) to launch this server
   Example `.codex/config.toml` snippet:
   ```toml
   [mcp_servers.mcpTest]
   command = 'C:\\Program Files\\nodejs\\node.exe'
   args = ["C:\\abs\\to\\mcp-test\\dist\\index.js"]
   env = { "HOST" = "127.0.0.1", "PORT" = "8700", "TIMEOUT_MS" = "1200", "ATTEMPTS" = "3" }
   startup_timeout_ms = 60000
   ```

Full `.codex/config.toml` examples (Windows)
```toml
# (Optional) Trust this project path so Codex will run the MCP server without prompts
[projects.'C:\\abs\\to\\mcp-test']
trust_level = "trusted"

# Minimal MCP server registration
[mcp_servers.mcpTest]
command = 'C:\\Program Files\\nodejs\\node.exe'
args = ["C:\\abs\\to\\mcp-test\\dist\\index.js"]

# Environment overrides for the TCP check tool
# Adjust PORT to match your local listener (default 8700)
env = {
  "HOST" = "127.0.0.1",
  "PORT" = "8700",
  "TIMEOUT_MS" = "1200",
  "ATTEMPTS" = "3",
  "NODE_OPTIONS" = "--enable-source-maps",
}

# Give the MCP process ample time to start
startup_timeout_ms = 60000
```

Notes for Windows config
- Use absolute paths and escape backslashes as `\\` in TOML strings.
- If your Node.js path differs, update `command` accordingly.
- If another process already uses the chosen port (EADDRINUSE), pick a free port
  and update both the listener and `PORT` env here.

4) In your MCP client, run the tool
   - Tool name: `check-tcp-connection`
   - Returns a single line of text:
     - Success: `TCP 127.0.0.1:8700: SUCCESS`
     - Failure: `TCP 127.0.0.1:8700: FAILED (<reason>)`

What This Demonstrates
- Outside the MCP client (plain shell): `check.cjs` reports SUCCESS.
- Inside the MCP client (child process launched by the client): the same connection attempt may report FAILED on affected setups.

Changing Target Host/Port
- The MCP tool reads environment variables:
  - `HOST` (default `127.0.0.1`)
  - `PORT` (default `8700`)
  - `TIMEOUT_MS` (default `1200`)
  - `ATTEMPTS` (default `3`)

Troubleshooting
- Port already in use (EADDRINUSE):
  - Pick a free port (e.g., 8702) and update both the listener and `PORT` env.
  - Check who owns the port:
    ```powershell
    netstat -ano | Select-String ':8700'
    # then
    tasklist /FI "PID eq <PID>"
    ```
- Verify the listener:
  ```powershell
  Test-NetConnection 127.0.0.1 -Port 8700
  ```
- Adjust detection sensitivity:
  - Increase `TIMEOUT_MS` (e.g., `2000`) and/or `ATTEMPTS` (e.g., `5`).

Notes
- The MCP server here exposes a single tool and returns only a one‑line text result to make reproduction and reporting simple.
- Replace 8700 with any port your local target uses. Ensure the listener is actually bound to `127.0.0.1`.


