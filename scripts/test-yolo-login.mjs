/**
 * Testa la Edge Function yolo-login senza browser (utile su Windows dove `curl` è Invoke-WebRequest).
 * Uso: node scripts/test-yolo-login.mjs [email]
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) {
    console.error("Manca .env.local nella radice del progetto.");
    process.exit(1);
  }
  const txt = readFileSync(p, "utf8");
  let url = "";
  let anon = "";
  for (const line of txt.split("\n")) {
    const u = line.match(/^VITE_SUPABASE_URL=(.+)$/);
    if (u) url = u[1].trim();
    const a = line.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/);
    if (a) anon = a[1].trim();
  }
  if (!url || !anon) {
    console.error("In .env.local servono VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
    process.exit(1);
  }
  return { url, anon };
}

const email = process.argv[2] ?? "martabisisi@gmail.com";
const { url, anon } = loadEnvLocal();
const base = url.replace(/\/$/, "");
const endpoint = `${base}/functions/v1/yolo-login`;

let res;
try {
  res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anon}`,
      apikey: anon,
    },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
} catch (e) {
  console.error("Fetch fallito (rete / DNS):", e.message);
  process.exit(1);
}

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 2000));
if (!res.ok) process.exit(1);
