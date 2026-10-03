<div align="center">

# ✦ Preact Dev Data Masker

**A local-first CSV and JSON privacy workbench for PII detection, deterministic masking rules, preview, and safe export.**

![Preact](https://img.shields.io/badge/Preact-10-673ab8?style=for-the-badge&logo=preact&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![Privacy](https://img.shields.io/badge/Privacy-PII_Masking-047857?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

</div>

---

## ✨ Highlights

- **CSV and JSON Import:** Parses header-based CSV through Papa Parse and accepts non-empty arrays of flat JSON objects.
- **PII Detection:** Combines field-name heuristics with value patterns for emails, phones, payment identifiers, names, addresses, IPs, and persistent IDs.
- **Confidence Context:** Explains each sensitive-field match and reports a practical confidence score.
- **Masking Strategies:** Supports redaction, stable hashing, deterministic tokens, email aliases, last-four preservation, and column removal.
- **Rule Editor:** Enables, disables, changes, adds, and removes one explicit protection rule per field.
- **Safe Preview:** Shows the masked export by default and requires an explicit action to reveal original values.
- **Privacy Readiness:** Calculates detected-field coverage and identifies sensitive columns that remain exposed.
- **Format-Preserving Export:** Downloads masked CSV or JSON while removing fields configured with the drop strategy.
- **Validated Persistence:** Uses Zod and IndexedDB with malformed-state recovery and sample reset.
- **Responsive Workflow:** Provides Preview, Fields, and Rules views on compact screens with a dense three-pane desktop layout.

## 🧱 Project Structure

```text
public/
|-- favicon.svg
|-- sample-customers.csv
`-- sample-masking-workspace.json
src/
|-- app.tsx
|-- main.tsx
|-- index.css
|-- components/
|   |-- data-preview.tsx
|   |-- field-inventory.tsx
|   |-- privacy-summary.tsx
|   |-- rule-editor.tsx
|   `-- workspace-state.tsx
|-- domain/
|   `-- masking.ts
`-- services/
    `-- masking-store.ts
```

## 🛠️ Tech Stack

- Preact 10 with Vite 8
- TypeScript 6
- Tailwind CSS 4
- `papaparse`, `nanoid`, `zod`, `idb-keyval`, and `lucide-preact`

## 📦 Included Sample Data

`public/sample-customers.csv` is ready for testing CSV import. `public/sample-masking-workspace.json` provides the same fictional customer dataset with suggested protection rules already configured.

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## 🔌 Extension Notes & Nuances

- The detector is deliberately explainable and heuristic. It is not a legal classification engine or a substitute for organizational data governance.
- JSON import expects flat objects; nested values are stringified by JavaScript when normalized for this table-oriented workflow.
- Hashing and tokenization use a deterministic non-cryptographic local hash so repeated values remain joinable in fixtures. Replace it with keyed cryptography for sensitive production data.
- Last-four masking preserves the final four source characters and replaces the leading portion with asterisks.
- Original values remain in the local workspace so rules can be changed. Export contains only the current masked result.
- All parsing and masking happen in the browser; no dataset is uploaded.

## 🧪 Build & Checks

```bash
npm run format:check
npm run build
npm run preview
```

## 🌐 Vercel Deployment

The repository includes a Vite-ready `vercel.json` with SPA rewrites.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 📄 License

MIT License. See [LICENSE](./LICENSE).
