import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = [
  {
    name: "user-web",
    i18nPath: join(root, "apps/user-web/src/app/lib/i18n.ts"),
    sourceDirs: [join(root, "apps/user-web/src")],
  },
  {
    name: "admin-web",
    i18nPath: join(root, "apps/admin-web/src/lib/i18n.ts"),
    sourceDirs: [join(root, "apps/admin-web/src")],
  },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(entry)) continue;
      walk(path, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

const missing = [];
let checkedKeyCount = 0;

for (const target of targets) {
  const i18nSource = readFileSync(target.i18nPath, "utf8");
  const knownKeys = new Set([...i18nSource.matchAll(/"([^"]+)":\s*"/g)].map((match) => match[1]));
  checkedKeyCount += knownKeys.size;

  for (const file of target.sourceDirs.flatMap((dir) => walk(dir))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
      const key = match[1];
      if (!knownKeys.has(key)) {
        missing.push(`${target.name}:${file.replace(`${root}\\`, "").replaceAll("\\", "/")}: missing i18n key "${key}"`);
      }
    }
  }
}

if (missing.length > 0) {
  console.error(missing.join("\n"));
  process.exit(1);
}

console.log(`i18n key coverage ok (${checkedKeyCount} known keys checked across ${targets.length} apps)`);
