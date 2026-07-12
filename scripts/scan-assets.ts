import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const required = [
  "public/brand/institutionlens-mark.svg",
  "public/brand/fonts/manrope-400.woff2",
  "public/brand/fonts/manrope-500.woff2",
  "public/brand/fonts/manrope-600.woff2",
  "public/brand/fonts/newsreader-400.woff2",
  "public/brand/fonts/newsreader-500.woff2",
  "src/styles/tokens.css",
  "assets/institutionlens/BRAND-KIT.md",
];

const missing = required.filter((relative) => !fs.existsSync(path.join(root, relative)));

if (missing.length > 0) {
  console.error("Asset/font scan failed. Missing:");
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}

const tokens = fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
for (const token of [
  "--paper",
  "--ink",
  "--blue",
  "--serif",
  "--sans",
  "--il-ledger-ivory",
  "--il-signal-blue",
  "--il-font-serif",
  "--il-font-sans",
]) {
  if (!tokens.includes(token)) {
    console.error(`Asset/font scan failed: tokens.css missing ${token}`);
    process.exit(1);
  }
}

const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
for (const fontPath of ["/brand/fonts/manrope-400.woff2", "/brand/fonts/newsreader-400.woff2"]) {
  if (!css.includes(fontPath)) {
    console.error(`Asset/font scan failed: globals.css missing reference ${fontPath}`);
    process.exit(1);
  }
}

console.log("Asset/font scan passed.");
