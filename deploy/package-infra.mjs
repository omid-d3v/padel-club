// Run only on the GitHub runner after setup.sh. Its random .env files stay there.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { offlineImageTag } from "./offline-images.mjs";
export function imageMap(services, ids) {
  const result = {};
  for (const [name, service] of Object.entries(services)) {
    if (["web", "scheduler"].includes(name)) continue;
    const id = ids[service.image];
    if (!/^sha256:[a-f0-9]{64}$/.test(id ?? ""))
      throw new Error("Invalid image identity");
    result[name] = { image: offlineImageTag(id), pull_policy: "never" };
  }
  return { services: result };
}
if (process.argv[1]?.endsWith("package-infra.mjs")) {
  const { services } = JSON.parse(
    execFileSync(
      "bash",
      ["deploy/stack.sh", "--profile", "tools", "config", "--format", "json"],
      { encoding: "utf8" },
    ),
  );
  const images = [
    ...new Set(
      Object.entries(services)
        .filter(([n]) => !["web", "scheduler"].includes(n))
        .map(([, s]) => s.image),
    ),
  ];
  const ids = {};
  const offlineTags = [];
  for (const image of images) {
    execFileSync("docker", ["pull", "--platform", "linux/amd64", image], {
      stdio: "inherit",
    });
    ids[image] = execFileSync(
      "docker",
      ["image", "inspect", "--format", "{{.Id}}", image],
      { encoding: "utf8" },
    ).trim();
    const tag = offlineImageTag(ids[image]);
    execFileSync("docker", ["image", "tag", image, tag], { stdio: "inherit" });
    offlineTags.push(tag);
  }
  writeFileSync(
    "bundle/infra-images.json",
    JSON.stringify(imageMap(services, ids), null, 2),
  );
  writeFileSync(
    "bundle/node-image.txt",
    `${offlineImageTag(ids[services.tools.image])}\n`,
  );
  // Archive tags survive load; raw .Id values can change across image stores.
  execFileSync(
    "bash",
    [
      "-c",
      'set -o pipefail; docker image save "$@" | gzip -1 > bundle/infra-images.tar.gz',
      "bundle",
      ...new Set(offlineTags),
    ],
    { stdio: "inherit" },
  );
}
