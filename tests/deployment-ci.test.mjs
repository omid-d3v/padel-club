import { describe, it, expect } from "vitest";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { imageMap } from "../deploy/package-infra.mjs";
const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
describe("production delivery safety", () => {
  it("actually exports only public allow-listed values and rejects interpolation", () => {
    const temp = mkdtempSync(join(tmpdir(), "matchsho-public-env-"));
    const shell =
      process.platform === "win32"
        ? "C:/Program Files/Git/bin/bash.exe"
        : "bash";
    expect(process.platform !== "win32" || existsSync(shell)).toBe(true);
    try {
      mkdirSync(join(temp, "deploy"));
      writeFileSync(
        join(temp, "deploy/public-env.sh"),
        read("deploy/public-env.sh"),
      );
      const envPath = join(temp, "deploy/.env.app");
      writeFileSync(
        envPath,
        "MATCHSHO_SUPABASE_SECRET_KEY=never-export-this\nNEXT_PUBLIC_UNKNOWN=not-allowed\nNEXT_PUBLIC_SITE_URL=https://match-sho.com\nNEXT_PUBLIC_FIREBASE_API_KEY=\n",
      );
      let result = spawnSync(shell, [join(temp, "deploy/public-env.sh")], {
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe(
        "NEXT_PUBLIC_SITE_URL=https://match-sho.com\nNEXT_PUBLIC_FIREBASE_API_KEY=\n",
      );
      writeFileSync(envPath, "NEXT_PUBLIC_SITE_URL=$(echo unsafe)\n");
      result = spawnSync(shell, [join(temp, "deploy/public-env.sh")], {
        encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
  it("maps infrastructure to offline content IDs, never overriding application images", () => {
    const id = `sha256:${"a".repeat(64)}`;
    expect(
      imageMap(
        {
          db: { image: "postgres:fixed" },
          web: { image: "app" },
          scheduler: { image: "app" },
        },
        { "postgres:fixed": id },
      ),
    ).toEqual({ services: { db: { image: id, pull_policy: "never" } } });
    expect(() => imageMap({ db: { image: "postgres:fixed" } }, {})).toThrow();
    expect(() =>
      imageMap(
        { db: { image: "postgres:fixed" } },
        { "postgres:fixed": "latest" },
      ),
    ).toThrow();
  });
  it("does not export service credentials or evaluate dotenv as shell code", () => {
    const script = read("deploy/public-env.sh");
    const patterns = [...script.matchAll(/(NEXT_PUBLIC_[A-Z_]+)=\*/g)].map(
      (m) => m[1],
    );
    expect(patterns).toHaveLength(9);
    expect(patterns).not.toContain("MATCHSHO_SUPABASE_SECRET_KEY");
    expect(script).not.toMatch(/\b(?:eval|source)\s+["$]/);
    expect(script).toContain("Invalid public build configuration");
  });
  it("gates releases behind tests, explicit activation, pinned SSH and serialized deployment", () => {
    const workflow = read(".github/workflows/production.yml");
    expect(workflow).toContain("needs: checks");
    expect(workflow).toContain("vars.AUTO_DEPLOY == 'true'");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("Refuse a superseded main commit");
    expect(read("deploy/verify-ssh.sh")).toContain("StrictHostKeyChecking yes");
    expect(workflow).not.toMatch(
      /ssh-keyscan|StrictHostKeyChecking no|pull_request_target/,
    );
    expect(workflow).toContain("npm test");
    expect(workflow).toContain("docker build --platform linux/amd64");
    expect(workflow).toContain(
      "Verify Docker image before server configuration",
    );
    expect(read("deploy/smoke-image.sh")).toContain("/api/health");
    expect(workflow).not.toMatch(
      /--build-arg.*(?:SERVICE_ROLE|POSTGRES_PASSWORD|SECRET_KEY)/,
    );
    const release = read("deploy/release.sh");
    expect(release).toContain("flock -w 1800 9");
    expect(release.indexOf('[[ -f "$state/production-ready" ]]')).toBeLessThan(
      release.indexOf('migrate.sh" apply'),
    );
    expect(release.indexOf('backup.sh"')).toBeLessThan(
      release.indexOf('migrate.sh" apply'),
    );
    expect(release).toContain("EXPECTED_PREVIOUS_SHA");
    expect(release).not.toMatch(
      /down -v|volume prune|system prune|reset --hard/,
    );
    expect(release).toContain("--no-build --pull never --no-deps");
    expect(
      release.indexOf('mv "$state/runtime/app-image.env.next"'),
    ).toBeGreaterThan(release.indexOf("if ! bash"));
  });
  it("offers a connection-only check and keeps host verification after IP changes", () => {
    const workflow = read(".github/workflows/production.yml");
    const script = read("deploy/verify-ssh.sh");
    expect(workflow).toContain("default: check-connection");
    expect(workflow).toContain("inputs.task != 'check-connection'");
    expect(workflow).toContain("inputs.task == 'check-connection'");
    expect(workflow.match(/run: bash deploy\/verify-ssh.sh/g)).toHaveLength(2);
    expect(script).toContain('ssh-keygen -F "$host"');
    expect(script).toContain("ConnectTimeout 15");
    expect(script).toContain("ConnectionAttempts 2");
    expect(script).not.toMatch(
      /ssh-keyscan|accept-new|StrictHostKeyChecking no|docker (?:run|pull|load|build|compose)/,
    );
    expect(script).not.toContain("85.198.55.121");
    expect(script.indexOf('ssh-keygen -F "$host"')).toBeLessThan(
      script.indexOf("ssh matchsho"),
    );
  });
  it("keeps TLS and package signing enabled when configuring mirrors", () => {
    expect(read("deploy/stack.sh")).toContain(
      'vendor="$(cd -- "$vendor" && pwd -P)"',
    );
    const bootstrap = read("deploy/bootstrap-ubuntu.sh");
    expect(bootstrap).toContain("https://docker.arvancloud.ir");
    expect(bootstrap).not.toMatch(
      /insecure-registries|allow-unauthenticated|trusted=yes|curl -k/,
    );
    expect(bootstrap).toContain("Signed-By: /etc/apt/keyrings/docker.asc");
  });
});
