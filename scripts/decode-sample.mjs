import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src =
  "/home/ubuntu/workspace/.platform/attachments/tradingview_alerts_log_2026-06-28_1-019f1155-c6b6-755f-a95a-6e55b47fe8ec.csv";
const raw = readFileSync(src, "utf8").trim();
const decoded = Buffer.from(raw, "base64").toString("utf8");
const outDir = "/home/ubuntu/workspace/app/src/frontend/public/assets";
mkdirSync(outDir, { recursive: true });
writeFileSync(
  `${outDir}/tradingview_alerts_log_2026-06-28.csv`,
  decoded,
  "utf8",
);
console.log("decoded bytes:", decoded.length);
console.log("first 200:", decoded.slice(0, 200));
