import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { generateConfig } from "../deploy/configure.mjs";
import { publicConfig } from "../deploy/offline-config.mjs";
const read = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const config = generateConfig(
  "match-sho.com",
  "api.match-sho.com",
  "ops@example.com",
);
const input = `NEXT_PUBLIC_SITE_URL=https://match-sho.com\nNEXT_PUBLIC_SUPABASE_URL=https://api.match-sho.com\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${config.app.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}\n`;
const bash =
  process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
describe("offline deployment", () => {
  it("accepts only the generated manifest filename format in real Bash", () => {
    const installer = read("deploy/install-offline.sh");
    const allowed = installer.match(/^allowed=.*$/m)[0];
    const guard = installer.match(/^  \[\[ "\$line" =~ .*? \]\]/m)[0].trim();
    for (const [name, accepted] of [
      ["RELEASE", true],
      ["source.tar.gz", true],
      ["./RELEASE", false],
      ["../RELEASE", false],
      ["sourceXtarXgz", false],
    ]) {
      const run = spawnSync(
        bash,
        [
          "-c",
          `${allowed}\nline="$1"\n${guard}`,
          "test",
          `${"a".repeat(64)}  ${name}`,
        ],
        { encoding: "utf8" },
      );
      expect(run.error).toBeUndefined();
      expect(run.status === 0).toBe(accepted);
    }
  });
  it("allows the tracked env example but rejects private env and unsafe archive names", () => {
    const installer = read("deploy/install-offline.sh");
    const filter = installer.match(/^tar -tzf source.tar.gz \| (awk .*)$/m)[1];
    for (const [name, accepted] of [
      [".env.example", true],
      ["deploy/app.env.example", true],
      ["src/app/page.tsx", true],
      [".env", false],
      ["deploy/.env.app", false],
      ["../escape", false],
      ["/absolute", false],
      ["backups/db.sql", false],
    ]) {
      const run = spawnSync(bash, ["-c", filter], {
        input: `${name}\n`,
        encoding: "utf8",
      });
      expect(run.error).toBeUndefined();
      expect(run.status === 0).toBe(accepted);
    }
  });
  it("normalizes only public build values with defaults for optional Firebase", () => {
    const result = publicConfig(input.replaceAll("\n", "\r\n"));
    expect(result.split("\n").filter(Boolean)).toHaveLength(9);
    expect(result).toContain("NEXT_PUBLIC_FIREBASE_VAPID_KEY=\n");
    expect(result).not.toContain(config.app.MATCHSHO_SUPABASE_SECRET_KEY);
  });
  it("rejects private credentials, shell interpolation, bad origins and non-anon JWTs", () => {
    for (const text of [
      input + "CRON_SECRET=private",
      input + "NEXT_PUBLIC_SITE_URL=$(bad)",
      input.replace("https://match-sho.com", "http://match-sho.com"),
      input.replace(
        config.app.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        config.app.MATCHSHO_SUPABASE_SECRET_KEY,
      ),
      input.replace(
        config.app.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "sb_secret_bad",
      ),
      input.replace(
        config.app.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "not-a-key",
      ),
      "",
    ]) {
      expect(() => publicConfig(text)).toThrow();
    }
  });
  it("packages without any SSH credentials, guarded by tests", () => {
    const workflow = read(".github/workflows/offline.yml");
    expect(workflow).not.toMatch(/secrets\.|\bssh\b|\bscp\b/);
    expect(workflow.indexOf("npm test")).toBeLessThan(
      workflow.indexOf("node deploy/package-infra.mjs"),
    );
    expect(workflow).toContain("path: bundle/");
    expect(workflow).toContain("retention-days: 7");
    expect(workflow).toContain("vars.OFFLINE_PUBLIC_ENV");
  });
  it("checks package and config before touching a release and gates first activation", () => {
    const installer = read("deploy/install-offline.sh");
    expect(installer).toContain("sha256sum --strict -c SHA256SUMS");
    expect(installer.indexOf('[[ "$actual" == "$expected" ]]')).toBeLessThan(
      installer.indexOf('mkdir "$target"'),
    );
    expect(
      installer.indexOf('[[ ! -f "$state/production-ready" ]]'),
    ).toBeLessThan(installer.indexOf("tar -xzf source.tar.gz"));
    expect(installer).toContain(
      "First prepare and site bundle must use the same commit",
    );
    expect(installer).not.toMatch(
      /docker (?:pull|build)|curl |wget |down -v|volume prune/,
    );
    expect(installer).toContain("--no-same-owner --no-same-permissions");
  });
});
