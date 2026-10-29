// ─── Razas (linajes) ───

const LINAJES_DRACONIDOS = {
  rojo: { nombre: 'Rojo', danio: 'fuego', forma: 'cono', salv: 'des' },
  dorado: { nombre: 'Dorado', danio: 'fuego', forma: 'cono', salv: 'des' },
  laton: { nombre: 'Latón', danio: 'fuego', forma: 'linea', salv: 'des' },
  azul: { nombre: 'Azul', danio: 'rayo', forma: 'linea', salv: 'des' },
  bronce: { nombre: 'Bronce', danio: 'rayo', forma: 'linea', salv: 'des' },
  negro: { nombre: 'Negro', danio: 'ácido', forma: 'linea', salv: 'des' },
  cobre: { nombre: 'Cobre', danio: 'ácido', forma: 'linea', salv: 'des' },
  blanco: { nombre: 'Blanco', danio: 'frío', forma: 'cono', salv: 'con' },
  plata: { nombre: 'Plata', danio: 'frío', forma: 'cono', salv: 'con' },
  verde: { nombre: 'Verde', danio: 'veneno', forma: 'cono', salv: 'con' },
};

const RAZAS = {
  humano: {
    nombre: 'Humano', plural: 'humanos', bonos: { fue: 1, des: 1, con: 1, int: 1, sab: 1, car: 1 }, vel: 6,
    desc: 'Ambiciosos y adaptables, los humanos están en todas partes y destacan en cualquier oficio.',
    rasgos: [{ nombre: 'Versatilidad', desc: '+1 a todas las características.' }],
  },
  elfo: {
    nombre: 'Elfo', plural: 'elfos', bonos: { des: 2, int: 1 }, vel: 6, vision: true, habilidades: ['percepcion'],
    desc: 'Gráciles y longevos, los altos elfos combinan sentidos agudos con un talento innato para la magia.',
    rasgos: [
      { nombre: 'Visión en la oscuridad', desc: 'Ves en la penumbra hasta 18 m.' },
      { nombre: 'Sentidos agudos', desc: 'Competencia en Percepción.' },
      { nombre: 'Ascendencia feérica', desc: 'Ventaja en salvaciones contra ser hechizado; la magia no puede dormirte.' },
    ],
  },
  enano: {
    nombre: 'Enano', plural: 'enanos', bonos: { con: 2, sab: 1 }, vel: 5, vision: true, resist: ['veneno'], pgPorNivel: 1,
    desc: 'Tenaces como la roca de sus montañas, los enanos de las colinas aguantan lo que haga falta.',
    rasgos: [
      { nombre: 'Visión en la oscuridad', desc: 'Ves en la penumbra hasta 18 m.' },
      { nombre: 'Resistencia enana', desc: 'Resistencia al daño de veneno y ventaja en salvaciones contra veneno.' },
      { nombre: 'Dureza enana', desc: '+1 PG máximo por nivel.' },
    ],
  },
  mediano: {
    nombre: 'Mediano', plural: 'medianos', bonos: { des: 2, car: 1 }, vel: 5, afortunado: true, valiente: true,
    desc: 'Pequeños, discretos y con una suerte endiablada. Los medianos piesligeros pasan desapercibidos.',
    rasgos: [
      { nombre: 'Afortunado', desc: 'Si sacas un 1 natural en un d20, vuelves a tirar.' },
      { nombre: 'Valiente', desc: 'Ventaja en salvaciones contra estar asustado.' },
      { nombre: 'Agilidad mediana', desc: 'Te mueves entre criaturas más grandes sin problema.' },
    ],
  },
  draconido: {
    nombre: 'Dracónido', plural: 'dracónidos', bonos: { fue: 2, car: 1 }, vel: 6, aliento: true,
    desc: 'Descendientes de dragones, orgullosos y temibles. Exhalan la energía de su linaje.',
    rasgos: [
      { nombre: 'Arma de aliento', desc: 'Acción: exhalas energía (2d6, salvación para la mitad). Se recupera con un descanso corto.' },
      { nombre: 'Resistencia dracónica', desc: 'Resistencia al tipo de daño de tu linaje.' },
    ],
  },
  gnomo: {
    nombre: 'Gnomo', plural: 'gnomos', bonos: { int: 2, con: 1 }, vel: 5, vision: true, astuciaGnoma: true,
    desc: 'Curiosos e inventivos, los gnomos de las rocas tienen una mente difícil de doblegar.',
    rasgos: [
      { nombre: 'Visión en la oscuridad', desc: 'Ves en la penumbra hasta 18 m.' },
      { nombre: 'Astucia gnoma', desc: 'Ventaja en salvaciones de INT, SAB y CAR contra la magia.' },
    ],
  },
  semiorco: {
    nombre: 'Semiorco', plural: 'semiorcos', bonos: { fue: 2, con: 1 }, vel: 6, vision: true, habilidades: ['intimidacion'], aguante: true, ataquesSalvajes: true,
    desc: 'Fuertes y feroces, los semiorcos se niegan a caer mientras les quede aliento.',
    rasgos: [
      { nombre: 'Visión en la oscuridad', desc: 'Ves en la penumbra hasta 18 m.' },
      { nombre: 'Amenazador', desc: 'Competencia en Intimidación.' },
      { nombre: 'Aguante incansable', desc: 'Una vez por descanso largo, si caes a 0 PG, te quedas a 1 PG.' },
      { nombre: 'Ataques salvajes', desc: 'En un crítico cuerpo a cuerpo tiras un dado de daño del arma adicional.' },
    ],
  },
  tiefling: {
    nombre: 'Tiefling', plural: 'tieflings', bonos: { car: 2, int: 1 }, vel: 6, vision: true, resist: ['fuego'], reprension: true,
    desc: 'Marcados por un pacto infernal ancestral, los tieflings cargan con cuernos, cola y desconfianza ajena.',
    rasgos: [
      { nombre: 'Visión en la oscuridad', desc: 'Ves en la penumbra hasta 18 m.' },
      { nombre: 'Resistencia infernal', desc: 'Resistencia al daño de fuego.' },
      { nombre: 'Legado infernal', desc: 'A nivel 3, puedes lanzar Reprensión infernal una vez por descanso largo.' },
    ],
  },
};
