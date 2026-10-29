# Dados y Dragones

Juego de rol de fantasía en solitario, en español, con reglas inspiradas en la 5.ª edición. **Claude hace de Dungeon Master**: improvisa la historia, interpreta a los personajes y te pide tiradas. El motor del juego resuelve los dados, el combate táctico, los objetos y la experiencia.

Todo el juego es un único archivo HTML sin dependencias: se juega dentro de Claude como artefacto, o en cualquier navegador abriendo `index.html` (en ese caso solo está disponible la Mazmorra clásica, porque el DM necesita Claude).

## Qué incluye

- **Creación de personaje completa**: 8 razas (humano, elfo, enano, mediano, dracónido, gnomo, semiorco, tiefling), 8 clases (guerrero, bárbaro, pícaro, explorador, paladín, clérigo, mago, brujo) y 10 trasfondos. Características por conjunto estándar, 4d6 o compra de puntos. Habilidades, pericia, estilos de combate, enemigo predilecto, linaje dracónico, trucos y conjuros. También hay un botón de héroe aleatorio.
- **Dos modos de juego**
  - **Campaña con Claude como DM**: cuatro campañas preparadas (*La Cripta del Rey Olvidado*, *El Culto de la Llama Hueca*, *La Senda del Wyrm Escarlata* y *El Bosque que Susurra*) o una premisa libre escrita por ti. Puedes elegir el tono (épico, oscuro o desenfadado) y la velocidad del narrador. El DM pide pruebas de habilidad y salvaciones, lanza combates con monstruos del bestiario, da oro, objetos, PX e inspiración, abre tiendas, concede descansos y lleva un diario de campaña.
  - **Mazmorra clásica**: cinco pisos generados al azar, con salas de combate, trampas, 14 tipos de evento, tesoros, santuarios, mercaderes y un jefe por piso. No necesita IA.
- **Combate táctico por turnos** en una cuadrícula de 12 × 8 casillas, con iniciativa, movimiento, cobertura, ataques de oportunidad, ventaja y desventaja, críticos, condiciones (derribado, paralizado, apresado, dormido…), concentración, reacciones (Escudo, Esquiva asombrosa, Reprensión infernal) y salvaciones contra la muerte. Cada monstruo tiene su IA: arqueros que mantienen la distancia, goblins que golpean y huyen, manadas que flanquean, lanzadores de conjuros, alientos con recarga y trols que se regeneran.
- **Más de 50 conjuros** con áreas de efecto (cono, línea, esfera, radio), **31 monstruos** del SRD, casi 80 objetos (armas y armaduras mágicas, pociones, pergaminos y varitas) y progresión del nivel 1 al 5, con subida de PG, nuevos rasgos, mejora de características y nuevos conjuros.
- **Tres dificultades** (Narrativa, Heroica y Despiadada). El motor ajusta los encuentros al presupuesto de PX de un héroe en solitario.
- **Guardado automático** en el navegador, punto de control antes de cada combate y códigos para exportar e importar la partida.

## Cómo jugar

1. **Dentro de Claude**: abre el artefacto publicado. La primera vez que el DM hable, Claude te pedirá permiso para usar tu cuenta.
2. **En local**: abre `index.html` en el navegador y juega la Mazmorra clásica.

En el combate, toca una casilla iluminada para moverte (dos toques: elegir y confirmar) o un enemigo para ver su ficha y atacarlo. Los conjuros de área muestran su alcance antes de confirmar.

## Desarrollo

El código fuente está en `src/` y se compila en un único HTML:

```bash
node build.mjs     # genera index.html y dist/dados-y-dragones.html (contenido para publicar como artefacto)
npm test           # compila y ejecuta todas las pruebas
```

| Archivo | Contenido |
| --- | --- |
| `src/js/data/*.js` | Reglas, razas, clases, conjuros, objetos, bestiario y contenido de la mazmorra |
| `src/js/personaje.js` | Ficha del héroe: estadísticas derivadas, inventario, descansos y subida de nivel |
| `src/js/combate.js` | Motor de combate táctico e IA de los monstruos (no depende del DOM) |
| `src/js/exploracion.js` | Pruebas de característica y efectos fuera de combate |
| `src/js/mazmorra.js` | Generador y lógica de la Mazmorra clásica |
| `src/js/dm.js` | Dungeon Master con IA: prompt, análisis y validación de las respuestas |
| `src/js/ui-*.js`, `combate-ui.js` | Interfaz |
| `src/styles.css`, `src/page.html` | Estilos y plantilla de la página |

Pruebas (`tests/`):

- `motor.test.mjs`: simula cientos de combates con todas las clases, razas y monstruos para detectar errores del motor.
- `e2e.mjs`: crea un héroe en el navegador, explora la mazmorra y juega un combate.
- `e2e-dm.mjs`: juega el modo DM con un Claude simulado (narración, tirada, combate, efectos, tienda y descanso).
- `e2e-magia.mjs`: lanza conjuros de objetivo y de área y prueba la subida de nivel.

Las pruebas de navegador usan Playwright con Chromium.

## Créditos y licencia de las reglas

Este trabajo incluye material tomado del System Reference Document 5.1 («SRD 5.1») de Wizards of the Coast LLC, disponible en https://dnd.wizards.com/resources/systems-reference-document. El SRD 5.1 se publica bajo la licencia Creative Commons Attribution 4.0 International, disponible en https://creativecommons.org/licenses/by/4.0/legalcode.

*Dados y Dragones* es un proyecto de fans y no está afiliado a Wizards of the Coast.
