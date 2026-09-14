#!/usr/bin/env node
// Ratchet temporário de dívida de E2E (PR #51, 14/09/2026).
// Dados em e2e/known-failures.json. O gate do CI roda o suite INTEIRO exceto os
// títulos listados (--grep-invert), e este script falha o pipeline se qualquer
// 'expiry' passar. Dívida não some: ou é paga, ou é renovada com justificativa
// em PR própria aprovada pelo Samuel. NUNCA engolir exit code de teste aqui.
import { readFileSync } from "node:fs";

const data = JSON.parse(
  readFileSync(new URL("../e2e/known-failures.json", import.meta.url), "utf8")
);
const cmd = process.argv[2];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

if (cmd === "grep-invert") {
  process.stdout.write(data.failures.map((f) => esc(f.title)).join("|"));
} else if (cmd === "count") {
  process.stdout.write(String(data.failures.length));
} else if (cmd === "audit") {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[ratchet e2e] ${data.failures.length} teste(s) fora do gate — dívida declarada (hoje ${today}):`);
  let expired = [];
  for (const f of data.failures) {
    const late = f.expiry < today;
    console.log(`  ${late ? "EXPIRADA" : "ok      "} ${f.spec} :: ${f.title} (expira ${f.expiry}) — ${f.owner}`);
    if (late) expired.push(f);
  }
  if (expired.length) {
    console.error(
      `\n❌ RATCHET EXPIRADO: ${expired.length} entrada(s) vencidas em e2e/known-failures.json.\n` +
      "Pague a dívida (consertar teste + remover a linha) ou renove a 'expiry' com\n" +
      "justificativa em PR própria — aprovação explícita do Samuel. Silenciar não é opção."
    );
    process.exit(1);
  }
} else {
  console.error("uso: e2e-ratchet.mjs <audit|grep-invert|count>");
  process.exit(2);
}
