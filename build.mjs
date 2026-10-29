// Compila el juego en un único HTML autocontenido.
//   node build.mjs  →  index.html (página completa) y dist/dados-y-dragones.html (contenido para publicar como artefacto)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(raiz, 'src');

export const ORDEN_JS = [
  'util.js',
  'data/reglas.js', 'data/razas.js', 'data/clases.js', 'data/conjuros.js', 'data/objetos.js', 'data/monstruos.js', 'data/mazmorra.js',
  'personaje.js', 'exploracion.js', 'combate.js', 'mazmorra.js', 'dm.js',
  'ui-base.js', 'ui-creacion.js', 'ui-panel.js', 'ui-aventura.js', 'combate-ui.js',
  'main.js',
];

const codigo = ORDEN_JS.map(f => `// ── ${f} ──\n` + fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
const js = `(function () {\n'use strict';\n${codigo}\n})();`.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
const plantilla = fs.readFileSync(path.join(src, 'page.html'), 'utf8');
const contenido = plantilla.replace('/*ESTILOS*/', () => css).replace('/*CODIGO*/', () => js);

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist', 'dados-y-dragones.html'), contenido);

const completo = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${contenido}
</body>
</html>
`;
fs.writeFileSync(path.join(raiz, 'index.html'), completo);
console.log(`Compilado: index.html (${(completo.length / 1024).toFixed(0)} KB) y dist/dados-y-dragones.html`);
