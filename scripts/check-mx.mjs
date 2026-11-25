#!/usr/bin/env node
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const opts = {
    input: path.join(ROOT, "data", "domains.json"),
    out: null,
    jsonOut: null,
    concurrency: 40,
    timeoutMs: 5000,
    limit: 0,
    failOnDead: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") opts.input = path.resolve(argv[++i]);
    else if (a === "--out") opts.out = path.resolve(argv[++i]);
    else if (a === "--json-out") opts.jsonOut = path.resolve(argv[++i]);
    else if (a === "--concurrency") opts.concurrency = Number(argv[++i]);
    else if (a === "--timeout") opts.timeoutMs = Number(argv[++i]);
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--fail-on-dead") opts.failOnDead = true;
  }
  return opts;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("DNS timeout"), { code: "ETIMEOUT" })), ms)),
  ]);
}

export async function checkDomainDns(domain, timeoutMs = 5000) {
  let mx = [];
  let mxErr = null;
  try {
    mx = await withTimeout(dns.resolveMx(domain), timeoutMs);
  } catch (err) {
    mxErr = err?.code || err?.message || "ERR";
  }
  if (Array.isArray(mx) && mx.length > 0) {
    return { domain, status: "mx_ok", mxCount: mx.length, aCount: null, error: null };
  }

  // Fallback to A / AAAA records (apex, then www. for web-only school domains)
  let addrs = [];
  let aErr = null;
  for (const host of [domain, `www.${domain}`]) {
    for (const fn of [dns.resolve4, dns.resolve6]) {
      try {
        const res = await withTimeout(fn(host), timeoutMs);
        if (Array.isArray(res)) addrs.push(...res);
      } catch (err) {
        aErr = aErr || err?.code || err?.message || "ERR";
      }
    }
    if (addrs.length > 0) {
      return { domain, status: "a_fallback", mxCount: 0, aCount: addrs.length, error: mxErr };
    }
  }
  return { domain, status: "dead_no_dns", mxCount: 0, aCount: 0, error: aErr || mxErr || "NO_RECORDS" };
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await worker(items[cur], cur);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let domains = JSON.parse(fs.readFileSync(opts.input, "utf8"));
  if (opts.limit > 0) domains = domains.slice(0, opts.limit);

  const t0 = Date.now();
  let done = 0;
  const results = await runPool(domains, opts.concurrency, async (domain) => {
    const r = await checkDomainDns(domain, opts.timeoutMs);
    done++;
    if (done % 500 === 0 || done === domains.length) {
      console.error(`Checked ${done}/${domains.length}...`);
    }
    return r;
  });

  const mxOk = results.filter((r) => r.status === "mx_ok");
  const aFallback = results.filter((r) => r.status === "a_fallback");
  const dead = results.filter((r) => r.status === "dead_no_dns");
  const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`DNS Audit complete in ${elapsedSec}s: total=${results.length}, mx_ok=${mxOk.length}, a_fallback=${aFallback.length}, dead_no_dns=${dead.length}`);

  if (opts.jsonOut) {
    fs.writeFileSync(
      opts.jsonOut,
      JSON.stringify({ generatedAt: new Date().toISOString(), total: results.length, mxOk: mxOk.length, aFallback: aFallback.length, dead }, null, 2) + "\n",
      "utf8",
    );
  }

  if (opts.out) {
    const lines = [
      `# DNS / MX Audit Report (${new Date().toISOString().slice(0, 10)})`,
      "",
      `- **Total checked:** ${results.length}`,
      `- **Valid MX:** ${mxOk.length}`,
      `- **A/AAAA fallback only (no MX):** ${aFallback.length}`,
      `- **Dead (no MX, A, or AAAA):** ${dead.length}`,
      "",
    ];
    if (dead.length > 0) {
      lines.push("## Domains without MX/A/AAAA records", "", "| Domain | Error |", "|---|---|");
      for (const r of dead) lines.push(`| \`${r.domain}\` | \`${r.error}\` |`);
      lines.push("");
    }
    if (aFallback.length > 0) {
      lines.push("## Domains with A/AAAA only (no MX)", "", `Count: ${aFallback.length}`, "");
      for (const r of aFallback.slice(0, 100)) lines.push(`- \`${r.domain}\` (${r.error ?? "no MX"})`);
      if (aFallback.length > 100) lines.push(`- ... and ${aFallback.length - 100} more`);
      lines.push("");
    }
    fs.writeFileSync(opts.out, lines.join("\n"), "utf8");
  }

  if (opts.failOnDead && dead.length > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
