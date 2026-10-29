// ─── Objetos: armas, armaduras, consumibles y objetos mágicos ───
// Precios en piezas de oro (po). Distancias en casillas [normal, larga].

const OBJETOS = {
  // ── Armas sencillas ──
  daga: { nombre: 'Daga', tipo: 'arma', categoria: 'sencilla', precio: 2, danio: '1d4', tipoDanio: 'perforante', props: ['sutil', 'ligera', 'arrojadiza'], distancia: [4, 12] },
  baston: { nombre: 'Bastón', tipo: 'arma', categoria: 'sencilla', precio: 1, danio: '1d6', versatil: '1d8', tipoDanio: 'contundente', props: ['versatil'] },
  maza: { nombre: 'Maza', tipo: 'arma', categoria: 'sencilla', precio: 5, danio: '1d6', tipoDanio: 'contundente', props: [] },
  hacha_mano: { nombre: 'Hacha de mano', tipo: 'arma', categoria: 'sencilla', precio: 5, danio: '1d6', tipoDanio: 'cortante', props: ['ligera', 'arrojadiza'], distancia: [4, 12] },
  lanza: { nombre: 'Lanza', tipo: 'arma', categoria: 'sencilla', precio: 1, danio: '1d6', versatil: '1d8', tipoDanio: 'perforante', props: ['arrojadiza', 'versatil'], distancia: [4, 12] },
  jabalina: { nombre: 'Jabalina', tipo: 'arma', categoria: 'sencilla', precio: 1, danio: '1d6', tipoDanio: 'perforante', props: ['arrojadiza'], distancia: [6, 24] },
  ballesta_ligera: { nombre: 'Ballesta ligera', tipo: 'arma', categoria: 'sencilla', precio: 25, danio: '1d8', tipoDanio: 'perforante', props: ['a_distancia', 'dos_manos'], distancia: [16, 64] },
  arco_corto: { nombre: 'Arco corto', tipo: 'arma', categoria: 'sencilla', precio: 25, danio: '1d6', tipoDanio: 'perforante', props: ['a_distancia', 'dos_manos'], distancia: [16, 64] },
  // ── Armas marciales ──
  espada_corta: { nombre: 'Espada corta', tipo: 'arma', categoria: 'marcial', precio: 10, danio: '1d6', tipoDanio: 'perforante', props: ['sutil', 'ligera'] },
  estoque: { nombre: 'Estoque', tipo: 'arma', categoria: 'marcial', precio: 25, danio: '1d8', tipoDanio: 'perforante', props: ['sutil'] },
  cimitarra: { nombre: 'Cimitarra', tipo: 'arma', categoria: 'marcial', precio: 25, danio: '1d6', tipoDanio: 'cortante', props: ['sutil', 'ligera'] },
  espada_larga: { nombre: 'Espada larga', tipo: 'arma', categoria: 'marcial', precio: 15, danio: '1d8', versatil: '1d10', tipoDanio: 'cortante', props: ['versatil'] },
  hacha_batalla: { nombre: 'Hacha de batalla', tipo: 'arma', categoria: 'marcial', precio: 10, danio: '1d8', versatil: '1d10', tipoDanio: 'cortante', props: ['versatil'] },
  martillo_guerra: { nombre: 'Martillo de guerra', tipo: 'arma', categoria: 'marcial', precio: 15, danio: '1d8', versatil: '1d10', tipoDanio: 'contundente', props: ['versatil'] },
  lucero_alba: { nombre: 'Lucero del alba', tipo: 'arma', categoria: 'marcial', precio: 15, danio: '1d8', tipoDanio: 'perforante', props: [] },
  gran_espada: { nombre: 'Espadón', tipo: 'arma', categoria: 'marcial', precio: 50, danio: '2d6', tipoDanio: 'cortante', props: ['pesada', 'dos_manos'] },
  hacha_dos_manos: { nombre: 'Gran hacha', tipo: 'arma', categoria: 'marcial', precio: 30, danio: '1d12', tipoDanio: 'cortante', props: ['pesada', 'dos_manos'] },
  mazo: { nombre: 'Mazo', tipo: 'arma', categoria: 'marcial', precio: 10, danio: '2d6', tipoDanio: 'contundente', props: ['pesada', 'dos_manos'] },
  arco_largo: { nombre: 'Arco largo', tipo: 'arma', categoria: 'marcial', precio: 50, danio: '1d8', tipoDanio: 'perforante', props: ['a_distancia', 'pesada', 'dos_manos'], distancia: [30, 120] },
  ballesta_mano: { nombre: 'Ballesta de mano', tipo: 'arma', categoria: 'marcial', precio: 75, danio: '1d6', tipoDanio: 'perforante', props: ['a_distancia', 'ligera'], distancia: [6, 24] },
  // ── Armas mágicas ──
  espada_larga_1: { nombre: 'Espada larga +1', base: 'espada_larga', tipo: 'arma', categoria: 'marcial', precio: 500, danio: '1d8', versatil: '1d10', tipoDanio: 'cortante', props: ['versatil'], magico: 1, raro: true },
  daga_1: { nombre: 'Daga +1', base: 'daga', tipo: 'arma', categoria: 'sencilla', precio: 400, danio: '1d4', tipoDanio: 'perforante', props: ['sutil', 'ligera', 'arrojadiza'], distancia: [4, 12], magico: 1, raro: true },
  estoque_1: { nombre: 'Estoque +1', base: 'estoque', tipo: 'arma', categoria: 'marcial', precio: 500, danio: '1d8', tipoDanio: 'perforante', props: ['sutil'], magico: 1, raro: true },
  arco_largo_1: { nombre: 'Arco largo +1', base: 'arco_largo', tipo: 'arma', categoria: 'marcial', precio: 550, danio: '1d8', tipoDanio: 'perforante', props: ['a_distancia', 'pesada', 'dos_manos'], distancia: [30, 120], magico: 1, raro: true },
  hacha_dos_manos_1: { nombre: 'Gran hacha +1', base: 'hacha_dos_manos', tipo: 'arma', categoria: 'marcial', precio: 550, danio: '1d12', tipoDanio: 'cortante', props: ['pesada', 'dos_manos'], magico: 1, raro: true },
  maza_1: { nombre: 'Maza +1', base: 'maza', tipo: 'arma', categoria: 'sencilla', precio: 400, danio: '1d6', tipoDanio: 'contundente', props: [], magico: 1, raro: true },
  baston_1: { nombre: 'Bastón del adepto (+1)', base: 'baston', tipo: 'arma', categoria: 'sencilla', precio: 500, danio: '1d6', versatil: '1d8', tipoDanio: 'contundente', props: ['versatil'], magico: 1, bonoConjuro: 1, raro: true, desc: '+1 a las tiradas de ataque de conjuro.' },
  lengua_llama: { nombre: 'Lengua de llama', base: 'espada_larga', tipo: 'arma', categoria: 'marcial', precio: 1500, danio: '1d8', versatil: '1d10', tipoDanio: 'cortante', props: ['versatil'], magico: 0, danioExtra: '2d6', tipoExtra: 'fuego', raro: true, desc: 'La hoja arde: +2d6 de fuego en cada impacto.' },
  matagigantes: { nombre: 'Martillo de los ancestros', base: 'martillo_guerra', tipo: 'arma', categoria: 'marcial', precio: 1200, danio: '1d8', versatil: '1d10', tipoDanio: 'contundente', props: ['versatil'], magico: 2, raro: true, desc: 'Arma +2 forjada por clérigos enanos.' },

  // ── Armaduras ──
  acolchada: { nombre: 'Armadura acolchada', tipo: 'armadura', armadura: 'ligera', precio: 5, ca: 11, desMax: 99, sigiloDesv: true },
  cuero: { nombre: 'Armadura de cuero', tipo: 'armadura', armadura: 'ligera', precio: 10, ca: 11, desMax: 99 },
  cuero_tachonado: { nombre: 'Cuero tachonado', tipo: 'armadura', armadura: 'ligera', precio: 45, ca: 12, desMax: 99 },
  camisote_mallas: { nombre: 'Camisote de mallas', tipo: 'armadura', armadura: 'media', precio: 50, ca: 13, desMax: 2 },
  cota_escamas: { nombre: 'Cota de escamas', tipo: 'armadura', armadura: 'media', precio: 50, ca: 14, desMax: 2, sigiloDesv: true },
  coraza: { nombre: 'Coraza', tipo: 'armadura', armadura: 'media', precio: 400, ca: 14, desMax: 2 },
  media_armadura: { nombre: 'Media armadura', tipo: 'armadura', armadura: 'media', precio: 750, ca: 15, desMax: 2, sigiloDesv: true },
  cota_anillas: { nombre: 'Cota de anillas', tipo: 'armadura', armadura: 'pesada', precio: 30, ca: 14, desMax: 0, sigiloDesv: true },
  cota_malla: { nombre: 'Cota de malla', tipo: 'armadura', armadura: 'pesada', precio: 75, ca: 16, desMax: 0, fuerzaMin: 13, sigiloDesv: true },
  armadura_bandas: { nombre: 'Armadura de bandas', tipo: 'armadura', armadura: 'pesada', precio: 200, ca: 17, desMax: 0, fuerzaMin: 15, sigiloDesv: true },
  placas: { nombre: 'Armadura de placas', tipo: 'armadura', armadura: 'pesada', precio: 1500, ca: 18, desMax: 0, fuerzaMin: 15, sigiloDesv: true },
  escudo: { nombre: 'Escudo', tipo: 'escudo', precio: 10, ca: 2 },
  cuero_tachonado_1: { nombre: 'Cuero tachonado +1', tipo: 'armadura', armadura: 'ligera', precio: 600, ca: 13, desMax: 99, raro: true },
  coraza_1: { nombre: 'Coraza +1', tipo: 'armadura', armadura: 'media', precio: 900, ca: 15, desMax: 2, raro: true },
  cota_malla_1: { nombre: 'Cota de malla +1', tipo: 'armadura', armadura: 'pesada', precio: 800, ca: 17, desMax: 0, fuerzaMin: 13, sigiloDesv: true, raro: true },
  escudo_1: { nombre: 'Escudo +1', tipo: 'escudo', precio: 500, ca: 3, raro: true },

  // ── Consumibles ──
  pocion_curacion: { nombre: 'Poción de curación', tipo: 'consumible', precio: 50, efecto: 'curar', dados: '2d4+2', uso: 'adicional', desc: 'Recuperas 2d4 + 2 PG. Beberla es una acción adicional.' },
  pocion_curacion_mayor: { nombre: 'Poción de curación mayor', tipo: 'consumible', precio: 150, efecto: 'curar', dados: '4d4+4', uso: 'adicional', desc: 'Recuperas 4d4 + 4 PG.' },
  pocion_curacion_superior: { nombre: 'Poción de curación superior', tipo: 'consumible', precio: 450, efecto: 'curar', dados: '8d4+8', uso: 'adicional', raro: true, desc: 'Recuperas 8d4 + 8 PG.' },
  antidoto: { nombre: 'Antídoto', tipo: 'consumible', precio: 50, efecto: 'antidoto', uso: 'accion', desc: 'Elimina la condición envenenado y da ventaja contra veneno durante una hora.' },
  pocion_fuerza_gigante: { nombre: 'Poción de fuerza de gigante', tipo: 'consumible', precio: 300, efecto: 'fuerza_gigante', uso: 'accion', raro: true, desc: 'Tu FUE pasa a ser 21 hasta el final del próximo combate.' },
  pocion_heroismo: { nombre: 'Poción de heroísmo', tipo: 'consumible', precio: 180, efecto: 'heroismo', uso: 'accion', desc: 'Ganas 10 PG temporales y quedas bendecido (+1d4 a ataques y salvaciones) durante el próximo combate.' },
  pocion_resistencia_fuego: { nombre: 'Poción de resistencia al fuego', tipo: 'consumible', precio: 150, efecto: 'resist_fuego', uso: 'accion', desc: 'Resistencia al fuego hasta tu próximo descanso largo.' },
  fuego_alquimista: { nombre: 'Fuego de alquimista', tipo: 'consumible', precio: 50, efecto: 'arrojar', dados: '2d6', tipoDanio: 'fuego', uso: 'accion', alcance: 4, desc: 'Arrojas el frasco (ataque a distancia, 6 m): 2d6 de fuego.' },
  agua_bendita: { nombre: 'Agua bendita', tipo: 'consumible', precio: 25, efecto: 'arrojar', dados: '2d6', tipoDanio: 'radiante', soloContra: ['muerto_viviente', 'infernal'], uso: 'accion', alcance: 4, desc: 'Arrojas el vial (6 m): 2d6 radiante a muertos vivientes e infernales.' },
  baya: { nombre: 'Baya nutritiva', tipo: 'consumible', precio: 0, efecto: 'curar', dados: '1', uso: 'accion', desc: 'Una baya mágica: recuperas 1 PG.' },
  pergamino_proyectil: { nombre: 'Pergamino de Proyectil mágico', tipo: 'pergamino', conjuro: 'proyectil_magico', nivelConjuro: 1, precio: 75, desc: 'Lanza Proyectil mágico sin gastar espacio. Cualquier personaje puede leerlo.' },
  pergamino_curar: { nombre: 'Pergamino de Curar heridas', tipo: 'pergamino', conjuro: 'curar_heridas', nivelConjuro: 1, precio: 75, desc: 'Lanza Curar heridas sin gastar espacio.' },
  pergamino_bola_fuego: { nombre: 'Pergamino de Bola de fuego', tipo: 'pergamino', conjuro: 'bola_fuego', nivelConjuro: 3, precio: 300, raro: true, desc: 'Lanza Bola de fuego (CD 13) sin gastar espacio.' },
  pergamino_rayo: { nombre: 'Pergamino de Rayo abrasador', tipo: 'pergamino', conjuro: 'rayo_abrasador', nivelConjuro: 2, precio: 150, desc: 'Lanza Rayo abrasador sin gastar espacio.' },
  pergamino_paso: { nombre: 'Pergamino de Paso brumoso', tipo: 'pergamino', conjuro: 'paso_brumoso', nivelConjuro: 2, precio: 150, desc: 'Lanza Paso brumoso sin gastar espacio.' },

  // ── Objetos mágicos equipables ──
  anillo_proteccion: { nombre: 'Anillo de protección', tipo: 'magico', ranura: 'anillo', precio: 1500, bonoCA: 1, bonoSalv: 1, raro: true, desc: '+1 a la CA y a todas las salvaciones.' },
  capa_proteccion: { nombre: 'Capa de protección', tipo: 'magico', ranura: 'capa', precio: 1200, bonoCA: 1, bonoSalv: 1, raro: true, desc: '+1 a la CA y a todas las salvaciones.' },
  amuleto_salud: { nombre: 'Amuleto de salud', tipo: 'magico', ranura: 'cuello', precio: 2000, fijaCar: { con: 19 }, raro: true, desc: 'Tu CON pasa a ser 19.' },
  guanteletes_ogro: { nombre: 'Guanteletes de poder de ogro', tipo: 'magico', ranura: 'manos', precio: 2000, fijaCar: { fue: 19 }, raro: true, desc: 'Tu FUE pasa a ser 19.' },
  brazales_defensa: { nombre: 'Brazales de defensa', tipo: 'magico', ranura: 'brazos', precio: 1500, bonoCASinArmadura: 2, raro: true, desc: '+2 a la CA si no llevas armadura ni escudo.' },
  botas_elficas: { nombre: 'Botas élficas', tipo: 'magico', ranura: 'pies', precio: 800, ventajaHab: 'sigilo', raro: true, desc: 'Ventaja en pruebas de Sigilo.' },
  capa_elfica: { nombre: 'Capa élfica', tipo: 'magico', ranura: 'capa', precio: 800, ventajaHab: 'sigilo', raro: true, desc: 'Ventaja en pruebas de Sigilo.' },
  botas_velocidad: { nombre: 'Botas aladas', tipo: 'magico', ranura: 'pies', precio: 1500, bonoVel: 2, raro: true, desc: '+3 m de velocidad.' },
  perla_poder: { nombre: 'Perla de poder', tipo: 'magico', ranura: 'cuello', precio: 1000, recuperaEspacio: true, raro: true, desc: 'Una vez por descanso largo, recuperas un espacio de conjuro de nivel 3 o inferior (desde el inventario).' },
  varita_proyectiles: { nombre: 'Varita de proyectiles mágicos', tipo: 'varita', conjuro: 'proyectil_magico', cargas: 7, precio: 800, raro: true, desc: 'Gasta una carga para lanzar Proyectil mágico. 7 cargas.' },

  // ── Útiles y equipo narrativo ──
  herramientas_ladron: { nombre: 'Herramientas de ladrón', tipo: 'util', precio: 25, desc: 'Ganzúas y limas para abrir cerraduras.' },
  simbolo_sagrado: { nombre: 'Símbolo sagrado', tipo: 'util', precio: 5, desc: 'Foco divino para tus conjuros.' },
  libro_conjuros: { nombre: 'Libro de conjuros', tipo: 'util', precio: 50, desc: 'Tus fórmulas arcanas. Sin él no podrías preparar conjuros.' },
  foco_arcano: { nombre: 'Foco arcano', tipo: 'util', precio: 10, desc: 'Un orbe de cristal oscuro que canaliza tu pacto.' },
  cuerda: { nombre: 'Cuerda de cáñamo (15 m)', tipo: 'util', precio: 1, desc: 'Útil para trepar, atar o descender.' },
  antorchas: { nombre: 'Antorchas', tipo: 'util', precio: 1, desc: 'Iluminan 6 m durante una hora.' },
  raciones: { nombre: 'Raciones de viaje', tipo: 'util', precio: 1, desc: 'Comida seca para varios días.' },
  kit_sanador: { nombre: 'Kit de sanador', tipo: 'util', precio: 5, desc: 'Vendas y ungüentos. Ventaja en pruebas de Medicina.' },
};

// Recompensas por rareza para botines aleatorios
const BOTIN_COMUN = ['pocion_curacion', 'pocion_curacion', 'pocion_curacion', 'antidoto', 'fuego_alquimista', 'agua_bendita', 'pergamino_proyectil', 'pergamino_curar'];
const BOTIN_MEDIO = ['pocion_curacion_mayor', 'pocion_heroismo', 'pergamino_rayo', 'pergamino_paso', 'pocion_resistencia_fuego', 'cuero_tachonado_1', 'escudo_1', 'daga_1', 'maza_1'];
const BOTIN_RARO = ['espada_larga_1', 'estoque_1', 'arco_largo_1', 'hacha_dos_manos_1', 'baston_1', 'anillo_proteccion', 'capa_proteccion', 'botas_elficas', 'capa_elfica', 'brazales_defensa', 'varita_proyectiles', 'pocion_curacion_superior', 'pergamino_bola_fuego', 'coraza_1', 'cota_malla_1', 'perla_poder', 'pocion_fuerza_gigante', 'botas_velocidad'];
const BOTIN_LEGENDARIO = ['lengua_llama', 'matagigantes', 'amuleto_salud', 'guanteletes_ogro'];

const INVENTARIO_TIENDA = ['pocion_curacion', 'pocion_curacion_mayor', 'antidoto', 'fuego_alquimista', 'agua_bendita', 'pergamino_proyectil', 'pergamino_curar', 'cuero_tachonado', 'camisote_mallas', 'coraza', 'cota_malla', 'escudo', 'espada_larga', 'estoque', 'arco_largo', 'hacha_dos_manos', 'kit_sanador', 'cuerda', 'antorchas'];

function precioVenta(objId) { const o = OBJETOS[objId]; return o ? Math.floor((o.precio || 0) / 2) : 0; }
