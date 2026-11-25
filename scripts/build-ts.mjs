import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TS_PKG = path.join(ROOT, "packages", "ts");
const SRC = path.join(TS_PKG, "src");

const domains = JSON.parse(fs.readFileSync(path.join(SRC, "domains.json"), "utf8"));
fs.writeFileSync(
  path.join(SRC, "domains-data.ts"),
  `// Auto-generated from data/domains.json — do not edit manually.\nexport const DOMAINS: readonly string[] = ${JSON.stringify(domains)};\n`,
  "utf8",
);

const runTsc = (cfg) => {
  if (process.platform === "win32") {
    execSync(`.\\node_modules\\.bin\\tsc.cmd -p ${cfg}`, { cwd: TS_PKG, stdio: "inherit" });
  } else {
    execFileSync(path.join(TS_PKG, "node_modules", ".bin", "tsc"), ["-p", cfg], { cwd: TS_PKG, stdio: "inherit" });
  }
};

runTsc("tsconfig.json");
runTsc("tsconfig.cjs.json");

fs.writeFileSync(path.join(TS_PKG, "dist", "esm", "package.json"), JSON.stringify({ type: "module" }) + "\n", "utf8");
fs.writeFileSync(path.join(TS_PKG, "dist", "cjs", "package.json"), JSON.stringify({ type: "commonjs" }) + "\n", "utf8");
console.log("Built ESM + CJS + .d.ts into packages/ts/dist");
