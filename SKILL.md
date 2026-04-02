---
name: ai-auditor
description: Audita un dominio público y genera un reporte HTML de AI-readability con score, checks de robots.txt/llms.txt/sitemap/meta/contenido/performance y recomendaciones priorizadas. Invocar con la URL completa del dominio.
argument-hint: "<url> [--pages N] [--no-verify]"
user-invocable: true
allowed-tools: Bash, Write
---

# AI Readability Auditor

Genera un reporte HTML de legibilidad para IAs del dominio indicado.

## Uso

Cuando el usuario invoca `/ai-auditor <url>`:

1. Asegurarse de que las dependencias están instaladas (cheerio ya está en package.json): `npm install`
2. Ejecutar el auditor:
   ```bash
   npx tsx .claude/skills/ai-auditor/auditor.ts <url>
   # Con límite de páginas:
   npx tsx .claude/skills/ai-auditor/auditor.ts <url> --pages 5
   ```
3. El archivo `audit-report-<dominio>-<fecha>.html` se genera en la raíz del proyecto.
4. Informar al usuario el path del archivo generado y sugerirle abrirlo en el browser.
5. Para exportar a PDF: abrir en Chrome y usar Cmd+P → Guardar como PDF.

## Ejemplos

```bash
npx tsx .claude/skills/ai-auditor/auditor.ts https://clariifica.com
npx tsx .claude/skills/ai-auditor/auditor.ts https://ejemplo.com --pages 3
# Sitio con SSL inválido o certificado no estándar:
npx tsx .claude/skills/ai-auditor/auditor.ts https://sitio-ssl-invalido.com --no-verify
```

## Notas

- Por defecto audita hasta 10 subpáginas del sitemap.xml (además de la home).
- Si el sitemap no existe, audita solo la página principal.
- No ejecuta JavaScript del cliente — audita el HTML del servidor (suficiente para meta tags, headings, JSON-LD).
- `--no-verify`: desactiva la validación SSL. Usar solo cuando el sitio tiene certificado inválido o autofirmado.
