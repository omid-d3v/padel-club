import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  offlineImageTag,
  portableImageMap,
} from "../deploy/offline-images.mjs";

describe("portable offline images", () => {
  const id = `sha256:${"a".repeat(64)}`;
  const tag = `matchsho-infra:sha256-${"a".repeat(64)}`;
  it("uses the saved tag independently of the receiving engine ID", () => {
    expect(offlineImageTag(id)).toBe(tag);
    expect(offlineImageTag(tag)).toBe(tag);
    const loadedImages = new Map([[tag, `sha256:${"b".repeat(64)}`]]);
    expect(loadedImages.has(id)).toBe(false);
    expect(loadedImages.has(offlineImageTag(id))).toBe(true);
  });
  it("upgrades legacy maps and enforces never-pull for every service", () => {
    expect(
      portableImageMap({
        services: {
          db: { image: id },
          tools: { image: tag, pull_policy: "always" },
        },
      }),
    ).toEqual({
      services: {
        db: { image: tag, pull_policy: "never" },
        tools: { image: tag, pull_policy: "never" },
      },
    });
  });
  it("rejects mutable or external image references and application overrides", () => {
    for (const ref of [
      undefined,
      "latest",
      "node:24",
      "sha256:bad",
      `${tag};bad`,
      "other:sha256-" + "a".repeat(64),
    ])
      expect(() => offlineImageTag(ref)).toThrow();
    for (const map of [
      {},
      { services: {} },
      { services: { web: { image: id } } },
      { services: { scheduler: { image: id } } },
    ])
      expect(() => portableImageMap(map)).toThrow();
  });
  it("recovery refuses existing credentials, databases or active services", () => {
    const script = readFileSync(
      new URL("../deploy/recover-prepare.sh", import.meta.url),
      "utf8",
    );
    expect(script).toContain("flock -w 1800 9");
    expect(script).toContain(
      '"$state/app.env" "$root/deploy/.env.app" "$vendor/docker/.env"',
    );
    expect(script).toContain("PG_VERSION");
    expect(script).toContain(
      "docker ps -aq --filter label=com.docker.compose.project=matchsho",
    );
    expect(script).toContain(
      'diff -qr --no-dereference "$backup/upstream" "$vendor"',
    );
    expect(script.indexOf("Existing credentials/data found")).toBeLessThan(
      script.indexOf("node deploy/configure.mjs"),
    );
    expect(script).toContain("--pull=never --network=none");
    expect(script).not.toMatch(
      /docker (?:pull|load|compose)|stack\.sh" (?:up|start)|rm -rf|down -v/,
    );
  });
});
