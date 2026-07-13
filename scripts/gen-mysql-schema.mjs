// Gera prisma/schema.prod.prisma (MySQL) a partir de prisma/schema.prisma (SQLite).
// Assim você mantém o SQLite para desenvolvimento local e usa MySQL em produção,
// sem manter dois schemas na mão.
//
// - Troca o provider "sqlite" -> "mysql"
// - Marca campos de texto longo como @db.Text (evita erro de VARCHAR(191) no MySQL)
//
// Uso: node scripts/gen-mysql-schema.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = join(root, "prisma", "schema.prisma");
const outPath = join(root, "prisma", "schema.prod.prisma");

// Campos String que devem virar TEXT no MySQL (conteúdo potencialmente longo).
const LONG_TEXT_FIELDS = new Set([
  "notes",
  "description",
  "defaultMessage",
  "content",
  "text",
  "value",
  "oldValue",
  "newValue",
  "lostReason",
]);

const src = readFileSync(srcPath, "utf8");

const header =
  "// ⚠️ ARQUIVO GERADO AUTOMATICAMENTE por scripts/gen-mysql-schema.mjs\n" +
  "// Não edite à mão — edite prisma/schema.prisma e rode `npm run schema:mysql`.\n\n";

const out =
  header +
  src
    .replace('provider = "sqlite"', 'provider = "mysql"')
    .split(/\r?\n/)
    .map((line) => {
      // Ex.: "  content        String" | "  notes String?" | "  value String @default(...)"
      const m = line.match(/^(\s+)(\w+)(\s+)String(\??)(.*)$/);
      if (m) {
        const name = m[2];
        if (LONG_TEXT_FIELDS.has(name) && !line.includes("@db.")) {
          return `${line.replace(/\s+$/, "")} @db.Text`;
        }
      }
      return line;
    })
    .join("\n");

writeFileSync(outPath, out, "utf8");
console.log("✅ Gerado prisma/schema.prod.prisma (MySQL).");
