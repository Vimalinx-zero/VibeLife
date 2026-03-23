import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PROJECT_DIR = "/home/vimalinx/Projects/VibeLifes/VibeLife";
const DIST_INDEX_PATH = path.join(PROJECT_DIR, "frontend/dist/index.html");

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("failed to allocate test port"));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForPort(port, processRef, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (processRef.exitCode !== null) {
      throw new Error(`preview runner exited early with code ${processRef.exitCode}`);
    }

    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      await delay(200);
    }
  }

  throw new Error(`preview server did not listen on ${port} within ${timeoutMs}ms`);
}

test("frontend preview runner execs vite directly so supervisors track the live server", async () => {
  assert.ok(existsSync(DIST_INDEX_PATH), "frontend dist/index.html must exist before running this test");

  const port = await getFreePort();
  const proc = spawn("/usr/bin/bash", ["scripts/run_frontend_preview.sh"], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "43800",
      FRONTEND_HOST: "127.0.0.1",
      FRONTEND_PORT: String(port),
    },
    stdio: "ignore",
  });

  try {
    await waitForPort(port, proc);

    const processInfo = spawnSync("ps", ["-o", "args=", "-p", String(proc.pid)], {
      encoding: "utf8",
    });
    assert.equal(processInfo.status, 0, processInfo.stderr || "failed to inspect preview process");
    assert.match(
      processInfo.stdout,
      /vite preview/,
      `expected runner pid ${proc.pid} to be the Vite preview process, got: ${processInfo.stdout.trim()}`
    );
  } finally {
    proc.kill("SIGTERM");
    await delay(300);
    if (proc.exitCode === null) {
      proc.kill("SIGKILL");
      await delay(300);
    }
  }
});
