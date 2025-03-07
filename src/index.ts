import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createReadStream, watch } from "fs";
import { access } from "fs/promises";
import { dirname, basename } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface NodeError extends Error {
  code?: string;
}

const PIPE_NAME =
  process.platform === "win32"
    ? "\\\\.\\pipe\\stdout_pipe" // Windows named pipe in standard location
    : "/tmp/stdout_pipe"; // Unix pipe in /tmp directory
const MAX_STORED_LOGS = 100;

// Store logs in memory
const logStore: string[] = [];

// Create server instance
const server = new McpServer({
  name: "stdout-mcp-server",
  version: "1.0.0",
});

/**
 * Create a named pipe.
 */
async function createNamedPipe(): Promise<void> {
  try {
    // Check if pipe already exists
    try {
      await access(PIPE_NAME);
      console.info("Named pipe already exists");
      return;
    } catch {
      // Pipe doesn't exist, continue to create it
    }

    if (process.platform === "win32") {
      // Windows named pipe creation using PowerShell
      await execAsync(
        `powershell.exe -Command "New-Item -ItemType NamedPipe -Path '${PIPE_NAME}'"`,
      );
    } else {
      // Unix named pipe creation using mkfifo
      await execAsync(`mkfifo ${PIPE_NAME}`);
    }
    console.info(`Created named pipe at ${PIPE_NAME}`);
  } catch (error) {
    console.error("Failed to create named pipe:", error);
    throw error;
  }
}

/**
 * Start a file watcher that reads from the named pipe and logs the data to the console.
 */
async function startFileWatcher(): Promise<void> {
  try {
    await createNamedPipe();

    let buffer = "";
    let currentStream: ReturnType<typeof createReadStream> | null = null;
    let isReading = false;

    function startReading(): void {
      if (currentStream || isReading) return;

      try {
        isReading = true;
        currentStream = createReadStream(PIPE_NAME, { encoding: "utf8" });
        console.info("Started reading from log pipe");

        currentStream.on("data", (data) => {
          buffer += data;

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              const logEntry = `[${new Date().toISOString()}] ${line}`;
              logStore.push(logEntry);
              console.info("📝 New log entry:", logEntry);

              if (logStore.length > MAX_STORED_LOGS) {
                logStore.shift();
              }
            }
          }
        });

        currentStream.on("error", (error: NodeError) => {
          if (error.code === "ENOENT") {
            console.info("Waiting for named pipe to be created...");
          } else {
            console.error("Error reading from pipe:", error);
          }
          currentStream = null;
          isReading = false;
        });

        currentStream.on("end", () => {
          console.info("Pipe read stream ended");
          currentStream = null;
          isReading = false;

          // Don't automatically reconnect - wait for the next write event
          // The watcher will handle reconnection when new data is available
        });
      } catch (error) {
        console.error("Failed to create read stream:", error);
        currentStream = null;
        isReading = false;
      }
    }

    // Watch for file changes
    const watcher = watch(dirname(PIPE_NAME), (eventType, filename) => {
      if (filename === basename(PIPE_NAME) && !isReading) {
        // Only start reading if we're not already reading
        startReading();
      }
    });

    watcher.on("error", (error) => {
      console.error("Watch error:", error);
    });

    console.info(`Watching for logs at ${PIPE_NAME}`);

    // Initial read
    startReading();
  } catch (error) {
    console.error("Failed to start file watcher:", error);
    process.exit(1);
  }
}

// Register get-logs tool
server.tool(
  "get-logs",
  "Retrieve logs from the named pipe with optional filtering",
  {
    lines: z
      .number()
      .optional()
      .default(50)
      .describe("Number of log lines to return"),
    filter: z.string().optional().describe("Text to filter logs by"),
    since: z.number().optional().describe("Timestamp to get logs after"),
  },
  async ({ lines, filter, since }) => {
    try {
      let logs = [...logStore];

      if (filter) {
        logs = logs.filter((line) =>
          line.toLowerCase().includes(filter.toLowerCase()),
        );
      }

      if (since) {
        logs = logs.filter((line) => {
          const timestamp = new Date(
            line.slice(1, line.indexOf("]")),
          ).getTime();
          return timestamp > since;
        });
      }

      // Take the last N lines and reverse them so oldest is first
      logs = logs.slice(-lines).reverse();

      return {
        content: [
          {
            type: "text",
            text: logs.join("\n"),
          },
        ],
      };
    } catch (error) {
      console.error("Error retrieving logs:", error);
      throw new Error("Failed to retrieve logs");
    }
  },
);

// Main function
async function main(): Promise<void> {
  try {
    await createNamedPipe();
    await startFileWatcher();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.info("Pipe log MCP server started");
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
