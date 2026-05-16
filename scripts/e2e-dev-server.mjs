import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const localDeploymentConfig = ".convex/local/default/config.json";
const useAnonymousDeployment = process.env.CI === "true" && !existsSync(localDeploymentConfig);
const convexEnv = useAnonymousDeployment
  ? { ...process.env, CONVEX_AGENT_MODE: "anonymous" }
  : process.env;
const childProcesses = new Set();
let isShuttingDown = false;
let shutdownExitCode = 0;

if (useAnonymousDeployment) {
  console.log("Using anonymous local Convex deployment for E2E.");
} else if (!existsSync(localDeploymentConfig)) {
  run("npx", ["convex", "deployment", "create", "local"]);
}

if (!useAnonymousDeployment) {
  run("npx", ["convex", "deployment", "select", "local"]);
}

const convexServer = spawnTracked("npx", ["convex", "dev", "--tail-logs", "disable"], {
  env: convexEnv,
  stdio: ["ignore", "pipe", "pipe"],
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await waitForConvexReady(convexServer);
} catch (error) {
  console.error(error);
  shutdown("SIGTERM", 1);
  await new Promise(() => {});
}

spawnTracked("npm", ["run", "dev:e2e:next"], {
  stdio: "inherit",
});

function spawnTracked(command, args, options) {
  const child = spawn(command, args, options);

  childProcesses.add(child);

  child.on("exit", (code, signal) => {
    childProcesses.delete(child);

    if (isShuttingDown) {
      exitWhenStopped();
      return;
    }

    const exitCode = code ?? (signal ? 1 : 0);
    shutdown("SIGTERM", exitCode);
  });

  return child;
}

function waitForConvexReady(child) {
  return new Promise((resolve, reject) => {
    let isReady = false;

    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for Convex functions to be ready."));
    }, 90_000);

    const handleOutput = (chunk, stream) => {
      stream.write(chunk);

      if (!isReady && chunk.toString().includes("Convex functions ready!")) {
        isReady = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    child.stdout.on("data", (chunk) => handleOutput(chunk, process.stdout));

    child.stderr.on("data", (chunk) => {
      handleOutput(chunk, process.stderr);
    });

    child.once("exit", (code, signal) => {
      if (!isReady) {
        clearTimeout(timeout);
        reject(new Error(`Convex exited before becoming ready: ${code ?? signal ?? "unknown"}`));
      }
    });
  });
}

function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  shutdownExitCode = exitCode;

  for (const child of childProcesses) {
    child.kill(signal);
  }

  setTimeout(() => {
    for (const child of childProcesses) {
      child.kill("SIGKILL");
    }

    process.exit(shutdownExitCode);
  }, 5_000).unref();

  exitWhenStopped();
}

function exitWhenStopped() {
  if (isShuttingDown && childProcesses.size === 0) {
    process.exit(shutdownExitCode);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: convexEnv,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
