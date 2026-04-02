# AI Readability Auditor

Audita dominios públicos y genera un reporte HTML de legibilidad para LLMs (AI-readability).

## ¿Qué audita?

**Nivel dominio (35 pts)**
- `robots.txt` (10): existe, tiene User-agent, no bloquea GPTBot/Claude-Web/Bard
- `llms.txt` (15): existe, tiene `# título` + `## secciones` + links https://
- `sitemap.xml` (10): existe, URLs con `<lastmod>`

**Nivel página, promediado (65 pts)**
- `<title>` (8): presente, <60 chars
- `<meta description>` (8): presente, <160 chars
- Open Graph (10): og:title + og:description + og:image
- JSON-LD (12): presente y válido
- Headings (10): 1 h1, jerarquía h1→h2→h3 sin saltos
- Alt text (7): todas las imágenes con alt
- Texto/HTML ratio (5): >15%
- Tiempo de respuesta (3): <2000ms
- Tamaño de página (2): <500KB

## Instalación

```bash
npm install
```

## Uso

```bash
# Auditar un dominio
npx tsx auditor.ts https://ejemplo.com

# Limitar páginas auditadas
npx tsx auditor.ts https://ejemplo.com --pages 5

# Sitios con SSL inválido o autofirmado
npx tsx auditor.ts https://sitio.com --no-verify
```

Genera `audit-report-<dominio>-<fecha>.html` en el directorio actual.  
Abre en Chrome → `Cmd+P` → Guardar como PDF.

## Tests

```bash
npm test
```

21 tests unitarios cubriendo los 6 módulos de checks.
