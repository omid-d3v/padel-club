import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A runner's image ID is not a portable lookup key across Docker image stores.
// Our archive preserves this exact tag, even when the receiving engine's ID differs.
export function offlineImageTag(reference) {
  if (/^matchsho-infra:sha256-[a-f0-9]{64}$/.test(reference ?? ""))
    return reference;
  if (/^sha256:[a-f0-9]{64}$/.test(reference ?? ""))
    return `matchsho-infra:sha256-${reference.slice(7)}`;
  throw new Error("Invalid offline image identity");
}

export function portableImageMap(map) {
  if (!map?.services || !Object.keys(map.services).length)
    throw new Error("Missing image services");
  return {
    services: Object.fromEntries(
      Object.entries(map.services).map(([name, service]) => {
        if (
          !/^[a-z][a-z0-9_-]*$/.test(name) ||
          ["web", "scheduler"].includes(name)
        )
          throw new Error("Not an infrastructure service");
        return [
          name,
          { image: offlineImageTag(service.image), pull_policy: "never" },
        ];
      }),
    ),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const map = portableImageMap(JSON.parse(readFileSync(0, "utf8")));
  console.log(
    process.argv[2] === "refs"
      ? [...new Set(Object.values(map.services).map((s) => s.image))].join("\n")
      : JSON.stringify(map, null, 2),
  );
}
