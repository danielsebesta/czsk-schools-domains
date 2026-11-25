// The Python, PHP, Go and shell examples must give the same answers as the package for the same input.
// Each example has a batch mode (JSON array of inputs on stdin -> JSON array of [host, match]).
// A runtime that is not installed is skipped, unless REQUIRE_EXAMPLE_RUNTIMES=1 (set in CI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { extractDomain, matchSchoolDomain } from "../dist/esm/index.js";
import { ALL_CASES, CASES, fuzzInputs } from "./cases.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const EXAMPLES = path.join(ROOT, "examples");
const REQUIRE = process.env.REQUIRE_EXAMPLE_RUNTIMES === "1";

function findRuntime(candidates: (string | undefined)[], versionArgs: string[]): string | null {
  for (const bin of candidates) {
    if (!bin) continue;
    const r = spawnSync(bin, versionArgs, { encoding: "utf8", timeout: 60000 });
    if (r.status === 0) return bin;
  }
  return null;
}

const RUNTIMES = {
  python: findRuntime([process.env.PYTHON, "python3", "python"], ["--version"]),
  php: findRuntime([process.env.PHP, "php"], ["--version"]),
  go: findRuntime([process.env.GO, "go"], ["version"]),
  bash: findRuntime([process.env.BASH_BIN, "bash"], ["--version"]),
};
const skip = (name: keyof typeof RUNTIMES) =>
  RUNTIMES[name] ? false : REQUIRE ? false : `${name} is not installed (set REQUIRE_EXAMPLE_RUNTIMES=1 to fail instead)`;

type Result = [string | null, string | null];
const nonAscii = (s: string) => /[^\x00-\x7f]/.test(s);
const loneSurrogate = (s: string) => /\p{Cs}/u.test(s);
const show = (s: string) => (s.length > 80 ? JSON.stringify(s.slice(0, 80)) + `…(${s.length})` : JSON.stringify(s));

function batch(name: keyof typeof RUNTIMES, args: string[], cwd: string, inputs: string[]): Result[] {
  const bin = RUNTIMES[name];
  assert.ok(bin, `${name} is required but not installed`);
  const r = spawnSync(bin, args, { cwd, input: JSON.stringify(inputs), encoding: "utf8", maxBuffer: 256 << 20, timeout: 300000 });
  assert.equal(r.status, 0, `${name} failed: ${r.error ?? ""} ${r.stderr}`);
  const out = JSON.parse(r.stdout) as Result[];
  assert.equal(out.length, inputs.length);
  return out;
}

const ADVERSARIAL = [
  " ".repeat(2046) + "@x", "a" + " ".repeat(2046) + "b", "<".repeat(2048), '"'.repeat(2047) + "<", "a".repeat(2047) + "@",
  "@".repeat(2048), "x@" + "a-".repeat(1023), "x@" + "a.".repeat(1023), "x@" + `${"a".repeat(62)}.`.repeat(32), "https://" + "@".repeat(2040),
  "mailto:" + ",".repeat(2041), "-".repeat(2048), "a".repeat(2047) + ":", '"a" '.repeat(510) + "<x@zcu.cz>", "<a".repeat(1023) + ">",
  "a@".repeat(1021) + "zcu.cz", "zcu.cz" + "/@".repeat(1021), "x".repeat(2045) + ".cz", "a.b-".repeat(511) + "cz",
];

/** Inputs every implementation is compared on: the corpus, deterministic fuzz inputs and adversarial 2 KB inputs. */
const INPUTS = [...new Set([...ALL_CASES.map(([input]) => input), ...fuzzInputs(424242, 6000), ...ADVERSARIAL])];

/**
 * Same [host, match] as the package. Allowed difference: an implementation may return [null, null] for an input
 * with non-ASCII characters (Go handles ASCII only; Python's idna codec is IDNA 2003 / Unicode 3.2; PHP uses STD3
 * rules and counts bytes, not UTF-16 code units). It may never return another host, nor accept what the package refuses.
 */
function compare(name: string, inputs: string[], results: Result[]) {
  const diffs: string[] = [];
  inputs.forEach((input, i) => {
    const want: Result = [extractDomain(input), matchSchoolDomain(input)];
    const got = results[i]!;
    if (got[0] === want[0] && got[1] === want[1]) return;
    if (nonAscii(input) && got[0] === null && got[1] === null) return;
    diffs.push(`${show(input)}: ${name} ${JSON.stringify(got)}, package ${JSON.stringify(want)}`);
  });
  assert.deepEqual(diffs.slice(0, 25), [], `${diffs.length} differences`);
}

/** The Unicode the examples do support must give exactly the package's result, without the tolerance above. */
function compareUnicodeExactly(name: string, run: (inputs: string[]) => Result[]) {
  const inputs = CASES["Unicode that maps to the same host (copy-paste, IME, fullwidth)"]!.map(([input]) => input);
  const results = run(inputs);
  inputs.forEach((input, i) => {
    assert.deepEqual(results[i], [extractDomain(input), matchSchoolDomain(input)], `${name}: ${show(input)}`);
  });
}

function timed<T>(fn: () => T): [T, number] {
  const t0 = performance.now();
  const out = fn();
  return [out, performance.now() - t0];
}

test("Python example gives the same answers as the package", { skip: skip("python") }, () => {
  const run = (inputs: string[]) => batch("python", [path.join(EXAMPLES, "python", "check.py"), "--json"], ROOT, inputs);
  compare("python", INPUTS, run(INPUTS));
  compareUnicodeExactly("python", run);
  const [, ms] = timed(() => run(ADVERSARIAL));
  assert.ok(ms < 10000, `adversarial inputs took ${ms.toFixed(0)} ms`);
});

test("PHP example gives the same answers as the package", { skip: skip("php") }, () => {
  // PHP strings are bytes: a lone UTF-16 surrogate cannot reach a PHP program
  const inputs = INPUTS.filter((s) => !loneSurrogate(s));
  const run = (xs: string[]) => batch("php", [path.join(EXAMPLES, "php", "check.php"), "--json"], ROOT, xs);
  compare("php", inputs, run(inputs));
  const hasIntl = spawnSync(RUNTIMES.php!, ["-r", "echo function_exists('idn_to_ascii') ? 1 : 0;"], { encoding: "utf8" }).stdout === "1";
  if (hasIntl || REQUIRE) compareUnicodeExactly("php", run);
  const [, ms] = timed(() => run(ADVERSARIAL));
  assert.ok(ms < 10000, `adversarial inputs took ${ms.toFixed(0)} ms`);
});

test("Go example gives the same answers as the package (ASCII input)", { skip: skip("go") }, () => {
  const inputs = INPUTS.filter((s) => !loneSurrogate(s));
  const results = batch("go", ["run", ".", "-json"], path.join(EXAMPLES, "go"), inputs);
  compare("go", inputs, results);
  // Go refuses non-ASCII hosts instead of converting them
  inputs.forEach((input, i) => {
    if (results[i]![0] !== null) assert.ok(!nonAscii(results[i]![0]!), show(input));
  });
});

test("shell example: exact matches only, never a false positive, no command or option injection", { skip: skip("bash") }, () => {
  const script = path.join(EXAMPLES, "shell", "check.sh");
  const cwd = mkdtempSync(path.join(os.tmpdir(), "check-sh-"));
  const run = (...args: string[]) => spawnSync(RUNTIMES.bash!, [script, ...args], { cwd, encoding: "utf8", timeout: 60000 });
  try {
    const expect: [string, string][] = [
      ["student@zcu.cz", "school"], ["STUDENT@ZCU.CZ", "school"], ["zcu.cz", "school"], ["zcu.cz.", "school"],
      ["student@muni.cz", "school"], ["someone@seznam.cz", "not a school"], ["someone@gmail.com", "not a school"],
      ["student@student.zcu.cz", "not a school"], // exact match only (documented)
      ["x@zcu.cz.evil.example", "not a school"], ["x@evilzcu.cz", "not a school"], ["x@.", "not a school"],
      ["-e", "not a school"], ["--help", "not a school"], ["-f", "not a school"], ["--", "not a school"], ["-", "not a school"],
    ];
    for (const [input, want] of expect) {
      const r = run(input);
      assert.equal(r.stdout, `${input} -> ${want}\n`, input);
      assert.equal(r.status, 0, input);
    }
    const refused = [
      "$(touch pwned)", "`touch pwned`", "; touch pwned", "x@zcu.cz; touch pwned", "x@zcu.cz && touch pwned", "x@zcu.cz | touch pwned",
      "x@zcu.cz$(touch pwned)", "x@zcu.cz`touch pwned`", "x@zcu.cz\ntouch pwned", "a@evil.example\nzcu.cz", "x@zcu.cz\nzcu.cz", "*", "?",
      "[a-z]*", "x@zcu.cz/../..", "../../etc/passwd", "'", '"', "x@zcu.cz>pwned", "x@zcu.cz<pwned", "", " ", "x@zcu.cz ",
      "a@evil.example@zcu.cz", "zcu.cz/@evil.example", "x@zcu.cz:25", "x@škola.cz", "x@zcu\u3002cz", "Name <x@zcu.cz>",
      "${IFS}", "$HOME", "!!", "x@zcu.cz#", "x@zcu.cz?",
    ];
    for (const input of refused) {
      const r = run(input);
      assert.equal(r.status, 2, `${show(input)} -> ${r.stdout}`);
      assert.match(r.stdout, /-> not a school \(unsupported input\)\n$/, show(input));
    }
    assert.equal(run().status, 2, "no argument");
    assert.equal(run("student@zcu.cz", "x@seznam.cz").status, 2, "two arguments");
    assert.deepEqual(readdirSync(cwd), [], "a payload created a file");

    // never a school where the package says otherwise (the shell example is stricter, never more lenient)
    const sample = INPUTS.filter((s) => !nonAscii(s) && !s.includes("\u0000") && s.length < 300)
      .slice(0, process.platform === "win32" ? 150 : 1500);
    for (const input of sample) {
      const r = run(input);
      if (r.stdout.endsWith("-> school\n")) {
        const host = extractDomain(input);
        assert.ok(host !== null && matchSchoolDomain(input) === host, `${show(input)}: shell says school, package ${host}`);
      }
    }
    assert.deepEqual(readdirSync(cwd), [], "a fuzz input created a file");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
