// ─── Bestiario (estadísticas basadas en el SRD 5.1, CC-BY-4.0) ───
// vel en casillas de 1,5 m; distancia [normal, larga] en casillas; pp = percepción pasiva.

const TIPOS_CRIATURA = {
  humanoide: 'Humanoide', muerto_viviente: 'Muerto viviente', bestia: 'Bestia', monstruosidad: 'Monstruosidad',
  gigante: 'Gigante', cieno: 'Cieno', dragon: 'Dragón', elemental: 'Elemental', infernal: 'Infernal',
};

const MONSTRUOS = {
  rata_gigante: {
    nombre: 'Rata gigante', tipo: 'bestia', vd: '1/8', px: 25, ca: 12, pg: '2d6', vel: 6, pp: 10,
    car: { fue: 7, des: 15, con: 11, int: 2, sab: 10, car: 4 },
    ataques: [{ id: 'mordisco', nombre: 'Mordisco', bono: 4, danio: '1d4+2', tipo: 'perforante' }],
    rasgos: ['tactica_manada'], comportamiento: 'cuerpo',
    desc: 'Roedores del tamaño de un perro, siempre en manada.',
  },
  kobold: {
    nombre: 'Kobold', tipo: 'humanoide', vd: '1/8', px: 25, ca: 12, pg: '2d6-2', vel: 6, pp: 8,
    car: { fue: 7, des: 15, con: 9, int: 8, sab: 7, car: 8 },
    ataques: [
      { id: 'daga', nombre: 'Daga', bono: 4, danio: '1d4+2', tipo: 'perforante' },
      { id: 'honda', nombre: 'Honda', bono: 4, danio: '1d4+2', tipo: 'contundente', distancia: [6, 24] },
    ],
    rasgos: ['tactica_manada'], comportamiento: 'distancia',
    desc: 'Pequeños reptiloides cobardes que adoran a los dragones y luchan en grupo.',
  },
  bandido: {
    nombre: 'Bandido', tipo: 'humanoide', vd: '1/8', px: 25, ca: 12, pg: '2d8+2', vel: 6, pp: 10,
    car: { fue: 11, des: 12, con: 12, int: 10, sab: 10, car: 10 },
    ataques: [
      { id: 'cimitarra', nombre: 'Cimitarra', bono: 3, danio: '1d6+1', tipo: 'cortante' },
      { id: 'ballesta', nombre: 'Ballesta ligera', bono: 3, danio: '1d8+1', tipo: 'perforante', distancia: [16, 64] },
    ],
    comportamiento: 'mixto',
    desc: 'Salteadores de caminos sin escrúpulos.',
  },
  cultista: {
    nombre: 'Cultista', tipo: 'humanoide', vd: '1/8', px: 25, ca: 12, pg: '2d8', vel: 6, pp: 10,
    car: { fue: 11, des: 12, con: 10, int: 10, sab: 11, car: 10 },
    ataques: [{ id: 'cimitarra', nombre: 'Cimitarra', bono: 3, danio: '1d6+1', tipo: 'cortante' }],
    comportamiento: 'cuerpo',
    desc: 'Fanáticos encapuchados al servicio de poderes oscuros.',
  },
  goblin: {
    nombre: 'Goblin', tipo: 'humanoide', vd: '1/4', px: 50, ca: 15, pg: '2d6', vel: 6, pp: 9,
    car: { fue: 8, des: 14, con: 10, int: 10, sab: 8, car: 8 },
    ataques: [
      { id: 'cimitarra', nombre: 'Cimitarra', bono: 4, danio: '1d6+2', tipo: 'cortante' },
      { id: 'arco', nombre: 'Arco corto', bono: 4, danio: '1d6+2', tipo: 'perforante', distancia: [16, 64] },
    ],
    rasgos: ['huida_agil'], comportamiento: 'mixto',
    desc: 'Pequeños, rencorosos y escurridizos. Atacan y se esconden.',
  },
  lobo: {
    nombre: 'Lobo', tipo: 'bestia', vd: '1/4', px: 50, ca: 13, pg: '2d8+2', vel: 8, pp: 13,
    car: { fue: 12, des: 15, con: 12, int: 3, sab: 12, car: 6 },
    ataques: [{ id: 'mordisco', nombre: 'Mordisco', bono: 4, danio: '2d4+2', tipo: 'perforante', alImpactar: { salv: 'fue', cd: 11, condicion: 'derribado' } }],
    rasgos: ['tactica_manada'], comportamiento: 'cuerpo',
    desc: 'Cazadores en manada que derriban a su presa.',
  },
  esqueleto: {
    nombre: 'Esqueleto', tipo: 'muerto_viviente', vd: '1/4', px: 50, ca: 13, pg: '2d8+4', vel: 6, pp: 9,
    car: { fue: 10, des: 14, con: 15, int: 6, sab: 8, car: 5 },
    ataques: [
      { id: 'espada', nombre: 'Espada corta', bono: 4, danio: '1d6+2', tipo: 'perforante' },
      { id: 'arco', nombre: 'Arco corto', bono: 4, danio: '1d6+2', tipo: 'perforante', distancia: [16, 64] },
    ],
    vulnerable: ['contundente'], inmune: ['veneno'], inmuneCond: ['envenenado', 'asustado'], comportamiento: 'mixto',
    desc: 'Huesos animados por nigromancia. Frágiles ante los golpes contundentes.',
  },
  zombi: {
    nombre: 'Zombi', tipo: 'muerto_viviente', vd: '1/4', px: 50, ca: 8, pg: '3d8+9', vel: 4, pp: 8,
    car: { fue: 13, des: 6, con: 16, int: 3, sab: 6, car: 5 },
    ataques: [{ id: 'golpe', nombre: 'Golpe', bono: 3, danio: '1d6+1', tipo: 'contundente' }],
    rasgos: ['fortaleza_no_muerto'], inmune: ['veneno'], inmuneCond: ['envenenado'], comportamiento: 'cuerpo',
    desc: 'Cadáveres lentos e incansables que se niegan a caer.',
  },
  cieno_gris: {
    nombre: 'Cieno gris', tipo: 'cieno', vd: '1/2', px: 100, ca: 8, pg: '3d8+9', vel: 2, pp: 8,
    car: { fue: 12, des: 6, con: 16, int: 1, sab: 6, car: 2 },
    ataques: [{ id: 'pseudopodo', nombre: 'Pseudópodo', bono: 3, danio: '1d6+1', tipo: 'contundente', alImpactar: { extra: '2d6', tipoExtra: 'ácido' } }],
    resist: ['ácido', 'frío', 'fuego'], inmuneCond: ['asustado', 'derribado'], comportamiento: 'cuerpo',
    desc: 'Una charca de lodo ácido que acecha inmóvil.',
  },
  orco: {
    nombre: 'Orco', tipo: 'humanoide', vd: '1/2', px: 100, ca: 13, pg: '2d8+6', vel: 6, pp: 10,
    car: { fue: 16, des: 12, con: 16, int: 7, sab: 11, car: 10 },
    ataques: [
      { id: 'gran_hacha', nombre: 'Gran hacha', bono: 5, danio: '1d12+3', tipo: 'cortante' },
      { id: 'jabalina', nombre: 'Jabalina', bono: 5, danio: '1d6+3', tipo: 'perforante', distancia: [6, 24] },
    ],
    rasgos: ['agresivo'], comportamiento: 'cuerpo',
    desc: 'Saqueadores brutales que cargan sin pensar.',
  },
  hobgoblin: {
    nombre: 'Hobgoblin', tipo: 'humanoide', vd: '1/2', px: 100, ca: 18, pg: '2d8+2', vel: 6, pp: 10,
    car: { fue: 13, des: 12, con: 12, int: 10, sab: 10, car: 9 },
    ataques: [
      { id: 'espada', nombre: 'Espada larga', bono: 3, danio: '1d8+1', tipo: 'cortante' },
      { id: 'arco', nombre: 'Arco largo', bono: 3, danio: '1d8+1', tipo: 'perforante', distancia: [30, 120] },
    ],
    rasgos: ['ventaja_marcial'], comportamiento: 'mixto',
    desc: 'Soldados disciplinados que luchan en formación.',
  },
  gnoll: {
    nombre: 'Gnoll', tipo: 'humanoide', vd: '1/2', px: 100, ca: 15, pg: '5d8', vel: 6, pp: 10,
    car: { fue: 14, des: 12, con: 11, int: 6, sab: 10, car: 7 },
    ataques: [
      { id: 'lanza', nombre: 'Lanza', bono: 4, danio: '1d8+2', tipo: 'perforante' },
      { id: 'arco', nombre: 'Arco largo', bono: 3, danio: '1d8+1', tipo: 'perforante', distancia: [30, 120] },
    ],
    comportamiento: 'mixto',
    desc: 'Hienas humanoides con un hambre insaciable.',
  },
  arana_gigante: {
    nombre: 'Araña gigante', tipo: 'bestia', vd: '1', px: 200, ca: 14, pg: '4d10+4', vel: 6, pp: 10,
    car: { fue: 14, des: 16, con: 12, int: 2, sab: 11, car: 4 },
    ataques: [{ id: 'mordisco', nombre: 'Mordisco', bono: 5, danio: '1d8+3', tipo: 'perforante', alImpactar: { salv: 'con', cd: 11, danio: '2d8', tipo: 'veneno', mitad: true } }],
    especiales: [{ id: 'telarana', nombre: 'Telaraña', recarga: 5, tipo: 'ataque', bono: 5, distancia: 6, condicion: 'apresado', escape: 12 }],
    comportamiento: 'cuerpo', trepa: true,
    desc: 'Teje redes en la oscuridad y envenena a sus presas.',
  },
  necrofago: {
    nombre: 'Necrófago', tipo: 'muerto_viviente', vd: '1', px: 200, ca: 12, pg: '5d8', vel: 6, pp: 10,
    car: { fue: 13, des: 15, con: 10, int: 7, sab: 10, car: 6 },
    ataques: [
      { id: 'garras', nombre: 'Garras', bono: 4, danio: '2d4+2', tipo: 'cortante', alImpactar: { salv: 'con', cd: 10, condicion: 'paralizado', repetir: true, noElfos: true } },
      { id: 'mordisco', nombre: 'Mordisco', bono: 2, danio: '2d6+2', tipo: 'perforante' },
    ],
    inmune: ['veneno'], inmuneCond: ['envenenado'], comportamiento: 'cuerpo',
    desc: 'Devoradores de cadáveres cuyas garras paralizan (los elfos son inmunes).',
  },
  osgo: {
    nombre: 'Osgo', tipo: 'humanoide', vd: '1', px: 200, ca: 16, pg: '5d8+5', vel: 6, pp: 10,
    car: { fue: 15, des: 14, con: 13, int: 8, sab: 11, car: 9 },
    ataques: [
      { id: 'lucero', nombre: 'Lucero del alba', bono: 4, danio: '2d8+2', tipo: 'perforante' },
      { id: 'jabalina', nombre: 'Jabalina', bono: 4, danio: '1d6+2', tipo: 'perforante', distancia: [6, 24] },
    ],
    rasgos: ['ataque_sorpresa'], comportamiento: 'cuerpo',
    desc: 'Goblinoides enormes y peludos que emboscan desde las sombras.',
  },
  huargo: {
    nombre: 'Huargo', tipo: 'bestia', vd: '1', px: 200, ca: 14, pg: '5d10+10', vel: 10, pp: 13,
    car: { fue: 17, des: 15, con: 15, int: 3, sab: 12, car: 7 },
    ataques: [{ id: 'mordisco', nombre: 'Mordisco', bono: 5, danio: '2d6+3', tipo: 'perforante', alImpactar: { salv: 'fue', cd: 13, condicion: 'derribado' } }],
    rasgos: ['tactica_manada'], comportamiento: 'cuerpo',
    desc: 'Lobos gigantescos, monturas favoritas de orcos y goblins.',
  },
  espectro: {
    nombre: 'Espectro', tipo: 'muerto_viviente', vd: '1', px: 200, ca: 12, pg: '5d8', vel: 10, pp: 10, vuela: true,
    car: { fue: 1, des: 14, con: 11, int: 10, sab: 10, car: 11 },
    ataques: [{ id: 'toque', nombre: 'Toque vital', bono: 4, danio: '3d6', tipo: 'necrótico' }],
    resist: ['ácido', 'frío', 'fuego', 'rayo', 'trueno', 'fisico_no_magico'], inmune: ['necrótico', 'veneno'], inmuneCond: ['envenenado', 'derribado', 'apresado', 'paralizado'], comportamiento: 'cuerpo',
    desc: 'Alma en pena que odia a los vivos. Atraviesa paredes.',
  },
  jefe_goblin: {
    nombre: 'Jefe goblin', tipo: 'humanoide', vd: '1', px: 200, ca: 17, pg: '6d6', vel: 6, pp: 9,
    car: { fue: 10, des: 14, con: 10, int: 10, sab: 8, car: 10 },
    ataques: [
      { id: 'cimitarra', nombre: 'Cimitarra', bono: 4, danio: '1d6+2', tipo: 'cortante' },
      { id: 'jabalina', nombre: 'Jabalina', bono: 2, danio: '1d6', tipo: 'perforante', distancia: [6, 24] },
    ],
    multi: { cuerpo: ['cimitarra', 'cimitarra'] }, rasgos: ['huida_agil'], comportamiento: 'cuerpo',
    desc: 'El goblin más grande, cruel y astuto de la madriguera.',
  },
  capitan_bandido: {
    nombre: 'Capitán bandido', tipo: 'humanoide', vd: '2', px: 450, ca: 15, pg: '10d8+20', vel: 6, pp: 10,
    car: { fue: 15, des: 16, con: 14, int: 14, sab: 11, car: 14 }, salvaciones: { fue: 4, des: 5, sab: 2 },
    ataques: [
      { id: 'cimitarra', nombre: 'Cimitarra', bono: 5, danio: '1d6+3', tipo: 'cortante' },
      { id: 'daga', nombre: 'Daga', bono: 5, danio: '1d4+3', tipo: 'perforante', distancia: [4, 12] },
    ],
    multi: { cuerpo: ['cimitarra', 'cimitarra', 'daga'], distancia: ['daga', 'daga'] }, rasgos: ['parada'], comportamiento: 'cuerpo',
    desc: 'Líder carismático y diestro con la espada.',
  },
  ogro: {
    nombre: 'Ogro', tipo: 'gigante', vd: '2', px: 450, ca: 11, pg: '7d10+21', vel: 8, pp: 8,
    car: { fue: 19, des: 8, con: 16, int: 5, sab: 7, car: 7 },
    ataques: [
      { id: 'clava', nombre: 'Gran clava', bono: 6, danio: '2d8+4', tipo: 'contundente' },
      { id: 'jabalina', nombre: 'Jabalina', bono: 6, danio: '2d6+4', tipo: 'perforante', distancia: [6, 24] },
    ],
    comportamiento: 'cuerpo', grande: true,
    desc: 'Tres metros de músculo, hambre y mal genio.',
  },
  fanatico: {
    nombre: 'Fanático del culto', tipo: 'humanoide', vd: '2', px: 450, ca: 13, pg: '6d8+6', vel: 6, pp: 11,
    car: { fue: 11, des: 14, con: 12, int: 10, sab: 13, car: 14 },
    ataques: [{ id: 'daga', nombre: 'Daga', bono: 4, danio: '1d4+2', tipo: 'perforante' }],
    multi: { cuerpo: ['daga', 'daga'] },
    especiales: [
      { id: 'inmovilizar', nombre: 'Inmovilizar persona', usos: 1, tipo: 'salvacion', distancia: 12, salv: 'sab', cd: 11, condicion: 'paralizado', repetir: true, soloHumanoides: true },
      { id: 'infligir', nombre: 'Infligir heridas', usos: 2, tipo: 'ataque', bono: 4, distancia: 1, danio: '3d10', tipoDanio: 'necrótico' },
      { id: 'llama', nombre: 'Llama sagrada', tipo: 'salvacion', distancia: 12, salv: 'des', cd: 11, danio: '1d8', tipoDanio: 'radiante', aDistancia: true },
    ],
    comportamiento: 'lanzador',
    desc: 'Sacerdote de un culto oscuro con conjuros de dolor y control.',
  },
  cubo_gelatinoso: {
    nombre: 'Cubo gelatinoso', tipo: 'cieno', vd: '2', px: 450, ca: 6, pg: '8d10+40', vel: 3, pp: 8,
    car: { fue: 14, des: 3, con: 20, int: 1, sab: 6, car: 1 },
    ataques: [{ id: 'pseudopodo', nombre: 'Pseudópodo', bono: 4, danio: '3d6', tipo: 'ácido' }],
    especiales: [{ id: 'engullir', nombre: 'Engullir', recarga: 5, tipo: 'salvacion', distancia: 1, salv: 'des', cd: 12, danio: '3d6', tipoDanio: 'ácido', condicion: 'apresado', escape: 12 }],
    inmuneCond: ['asustado', 'derribado'], comportamiento: 'cuerpo', grande: true,
    desc: 'Un bloque transparente de gelatina ácida que limpia las mazmorras.',
  },
  gargola: {
    nombre: 'Gárgola', tipo: 'elemental', vd: '2', px: 450, ca: 15, pg: '7d8+21', vel: 6, pp: 10, vuela: true,
    car: { fue: 15, des: 11, con: 16, int: 6, sab: 11, car: 7 },
    ataques: [
      { id: 'mordisco', nombre: 'Mordisco', bono: 4, danio: '1d6+2', tipo: 'perforante' },
      { id: 'garras', nombre: 'Garras', bono: 4, danio: '1d6+2', tipo: 'cortante' },
    ],
    multi: { cuerpo: ['mordisco', 'garras'] }, resist: ['fisico_no_magico'], inmune: ['veneno'], inmuneCond: ['envenenado', 'paralizado'], comportamiento: 'cuerpo',
    desc: 'Estatuas de piedra que cobran vida para cazar.',
  },
  mimeto: {
    nombre: 'Mimeto', tipo: 'monstruosidad', vd: '2', px: 450, ca: 12, pg: '9d8+18', vel: 3, pp: 11,
    car: { fue: 17, des: 12, con: 15, int: 5, sab: 13, car: 8 },
    ataques: [
      { id: 'pseudopodo', nombre: 'Pseudópodo', bono: 5, danio: '1d8+3', tipo: 'contundente', alImpactar: { condicion: 'apresado', escape: 13 } },
      { id: 'mordisco', nombre: 'Mordisco', bono: 5, danio: '1d8+3', tipo: 'perforante', alImpactar: { extra: '1d8', tipoExtra: 'ácido' } },
    ],
    multi: { cuerpo: ['pseudopodo', 'mordisco'] }, inmune: ['ácido'], inmuneCond: ['derribado'], comportamiento: 'cuerpo',
    desc: 'Se hace pasar por un cofre... hasta que abre la boca.',
  },
  oso_lechuza: {
    nombre: 'Oso lechuza', tipo: 'monstruosidad', vd: '3', px: 700, ca: 13, pg: '7d10+21', vel: 8, pp: 13,
    car: { fue: 20, des: 12, con: 17, int: 3, sab: 12, car: 7 },
    ataques: [
      { id: 'pico', nombre: 'Pico', bono: 7, danio: '1d10+5', tipo: 'perforante' },
      { id: 'garras', nombre: 'Garras', bono: 7, danio: '2d8+5', tipo: 'cortante' },
    ],
    multi: { cuerpo: ['pico', 'garras'] }, comportamiento: 'cuerpo', grande: true,
    desc: 'Fusión monstruosa de oso y búho, territorial y furiosa.',
  },
  tumulario: {
    nombre: 'Tumulario', tipo: 'muerto_viviente', vd: '3', px: 700, ca: 14, pg: '6d8+18', vel: 6, pp: 13,
    car: { fue: 15, des: 14, con: 16, int: 10, sab: 13, car: 15 },
    ataques: [
      { id: 'espada', nombre: 'Espada larga', bono: 4, danio: '1d8+2', tipo: 'cortante' },
      { id: 'drenar', nombre: 'Drenar vida', bono: 4, danio: '1d6+2', tipo: 'necrótico' },
      { id: 'arco', nombre: 'Arco largo', bono: 4, danio: '1d8+2', tipo: 'perforante', distancia: [30, 120] },
    ],
    multi: { cuerpo: ['espada', 'drenar'], distancia: ['arco', 'arco'] },
    resist: ['necrótico', 'fisico_no_magico'], inmune: ['veneno'], inmuneCond: ['envenenado'], comportamiento: 'mixto',
    desc: 'Un guerrero muerto que odia a los vivos y les roba el aliento.',
  },
  minotauro: {
    nombre: 'Minotauro', tipo: 'monstruosidad', vd: '3', px: 700, ca: 14, pg: '9d10+27', vel: 8, pp: 17,
    car: { fue: 18, des: 11, con: 16, int: 6, sab: 16, car: 9 },
    ataques: [
      { id: 'gran_hacha', nombre: 'Gran hacha', bono: 6, danio: '2d12+4', tipo: 'cortante' },
      { id: 'cornada', nombre: 'Cornada', bono: 6, danio: '2d8+4', tipo: 'perforante' },
    ],
    rasgos: ['carga'], comportamiento: 'cuerpo', grande: true,
    desc: 'Señor de los laberintos. Su embestida derriba muros y héroes.',
  },
  ettin: {
    nombre: 'Ettin', tipo: 'gigante', vd: '4', px: 1100, ca: 12, pg: '10d10+30', vel: 8, pp: 14,
    car: { fue: 21, des: 8, con: 17, int: 6, sab: 10, car: 8 },
    ataques: [
      { id: 'hacha', nombre: 'Hacha de batalla', bono: 7, danio: '2d8+5', tipo: 'cortante' },
      { id: 'lucero', nombre: 'Lucero del alba', bono: 7, danio: '2d8+5', tipo: 'perforante' },
    ],
    multi: { cuerpo: ['hacha', 'lucero'] }, comportamiento: 'cuerpo', grande: true,
    desc: 'Gigante de dos cabezas que nunca se pone de acuerdo consigo mismo, salvo para aplastar.',
  },
  dragon_rojo_joven: {
    nombre: 'Cría de dragón rojo', tipo: 'dragon', vd: '4', px: 1100, ca: 17, pg: '10d8+30', vel: 6, pp: 14, vuela: true,
    car: { fue: 19, des: 10, con: 17, int: 12, sab: 11, car: 15 }, salvaciones: { des: 2, con: 5, sab: 2, car: 4 },
    ataques: [{ id: 'mordisco', nombre: 'Mordisco', bono: 6, danio: '1d10+4', tipo: 'perforante', alImpactar: { extra: '1d6', tipoExtra: 'fuego' } }],
    especiales: [{ id: 'aliento', nombre: 'Aliento de fuego', recarga: 5, tipo: 'area', area: { forma: 'cono', tam: 3 }, salv: 'des', cd: 13, danio: '7d6', tipoDanio: 'fuego', mitad: true }],
    inmune: ['fuego'], comportamiento: 'cuerpo',
    desc: 'Un dragón joven, arrogante y codicioso, que ya escupe fuego mortal.',
  },
  jefe_orco: {
    nombre: 'Caudillo orco', tipo: 'humanoide', vd: '4', px: 1100, ca: 16, pg: '11d8+44', vel: 6, pp: 10,
    car: { fue: 18, des: 12, con: 18, int: 11, sab: 11, car: 16 }, salvaciones: { fue: 6, con: 6, sab: 2 },
    ataques: [
      { id: 'gran_hacha', nombre: 'Gran hacha', bono: 6, danio: '1d12+4', tipo: 'cortante', alImpactar: { extra: '1d8', tipoExtra: 'cortante' } },
      { id: 'lanza', nombre: 'Lanza', bono: 6, danio: '1d6+4', tipo: 'perforante', distancia: [4, 12] },
    ],
    multi: { cuerpo: ['gran_hacha', 'gran_hacha'] }, rasgos: ['agresivo'], comportamiento: 'cuerpo',
    desc: 'Señor de la guerra orco, bendecido por la furia de su dios tuerto.',
  },
  troll: {
    nombre: 'Trol', tipo: 'gigante', vd: '5', px: 1800, ca: 15, pg: '8d10+40', vel: 6, pp: 12,
    car: { fue: 18, des: 13, con: 20, int: 7, sab: 9, car: 7 },
    ataques: [
      { id: 'mordisco', nombre: 'Mordisco', bono: 7, danio: '1d6+4', tipo: 'perforante' },
      { id: 'garras', nombre: 'Garras', bono: 7, danio: '2d6+4', tipo: 'cortante' },
    ],
    multi: { cuerpo: ['mordisco', 'garras', 'garras'] }, rasgos: ['regeneracion'], comportamiento: 'cuerpo', grande: true,
    desc: 'Se regenera de cualquier herida salvo del fuego y el ácido.',
  },
};

function vdNumerico(vd) { return vd.includes('/') ? 1 / parseInt(vd.split('/')[1], 10) : parseFloat(vd); }
