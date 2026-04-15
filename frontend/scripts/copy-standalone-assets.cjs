/**
 * Next.js standalone: server.js does process.chdir(__dirname) to .next/standalone,
 * so assets must exist at .next/standalone/.next/static (and public beside server).
 * See https://nextjs.org/docs/app/api-reference/next-config-js/output
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standaloneRoot = path.join(root, ".next", "standalone");

function rm(dest) {
  fs.rmSync(dest, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("copy-standalone-assets: skip (missing):", src);
    return;
  }
  rm(dest);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneRoot, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneRoot, "public");

if (!fs.existsSync(standaloneRoot)) {
  console.warn("copy-standalone-assets: .next/standalone missing — run next build first");
  process.exit(0);
}

copyDir(staticSrc, staticDest);
copyDir(publicSrc, publicDest);
console.log("copy-standalone-assets: copied .next/static and public into standalone output");
