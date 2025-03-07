# stdout-mcp-server

A Model Context Protocol (MCP) server that captures and manages stdout logs through a named pipe system. This server is particularly useful for:
- Capturing logs from multiple processes or applications and making them available for debugging in Cursor IDE.
- Monitoring application output in real-time and providing a MCP interface to query, filter, and analyze logs

## How It Works

1. The server creates a named pipe at a specific location (`/tmp/stdout_pipe` on Unix/MacOS or `\\.\pipe\stdout_pipe` on Windows)

2. Any application can write logs to this pipe using standard output redirection. For example:
```bash
your_application | tee /tmp/stdout_pipe # or
your_application > /tmp/stdout_pipe
```
3. The server monitors the pipe, captures all incoming logs, and maintains a history of the last 100 entries

4. Through MCP tools, you can query, filter, and analyze these logs

## System Requirements

Before installing, please ensure you have:

* Node.js v18 or newer

## Installation Options

### Option 1: Installation in Cursor

1. Open Cursor and navigate to `Cursor > Settings > MCP Servers`
2. Click on "Add new MCP Server"
3. Update your MCP settings file with the following configuration:

```sh
name: stdout-mcp-server
type: command
command: npx stdout-mcp-server
```

### Option 2: Installation in other MCP clients

## Installation in other MCP clients
For macOS/Linux:
```json
{
  "mcpServers": {
    "stdio-mcp-server": {
      "command": "npx",
      "args": [
        "stdio-mcp-server"
      ]
    }
  }
}
```

For Windows:
```json
{
  "mcpServers": {
    "mcp-installer": {
      "command": "cmd.exe",
      "args": ["/c", "npx", "stdio-mcp-server"]
    }
  }
}
```

## Usage Examples

### Redirecting Application Logs

To send your application's output to the pipe:

```bash
# Unix/MacOS
your_application > /tmp/stdout_pipe

# Windows (PowerShell)
your_application > \\.\pipe\stdout_pipe
```

### Monitoring Multiple Applications

You can redirect logs from multiple sources:

```bash
# Application 1
app1 > /tmp/stdout_pipe &

# Application 2
app2 > /tmp/stdout_pipe &
```

### Querying Logs

Your AI will use the `get-logs` tool in your MCP client to retrieve and filter logs:

```typescript
// Get last 50 logs
get-logs()

// Get last 100 logs containing "error"
get-logs({ lines: 100, filter: "error" })

// Get logs since a specific timestamp
get-logs({ since: 1648675200000 }) // Unix timestamp in milliseconds
```

## Features

- Named pipe creation and monitoring
- Real-time log capture and storage
- Log filtering and retrieval through MCP tools
- Configurable log history (default: 100 entries)
- Cross-platform support (Windows and Unix-based systems)

## Named Pipe Locations

- Windows: `\\.\pipe\stdout_pipe`
- Unix/MacOS: `/tmp/stdout_pipe`

## Available Tools

### get-logs

Retrieve logs from the named pipe with optional filtering:

Parameters:
- `lines` (optional, default: 50): Number of log lines to return
- `filter` (optional): Text to filter logs by
- `since` (optional): Timestamp to get logs after

Example responses:
```typescript
// Response format
{
  content: [{
    type: "text",
    text: "[2024-03-20T10:15:30.123Z] Application started\n[2024-03-20T10:15:31.456Z] Connected to database"
  }]
}
```

## License

MIT License
