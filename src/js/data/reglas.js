// ─── Reglas básicas (inspiradas en el SRD 5.1, CC-BY-4.0) ───

const CARACTERISTICAS = [
  { id: 'fue', nombre: 'Fuerza', abrev: 'FUE' },
  { id: 'des', nombre: 'Destreza', abrev: 'DES' },
  { id: 'con', nombre: 'Constitución', abrev: 'CON' },
  { id: 'int', nombre: 'Inteligencia', abrev: 'INT' },
  { id: 'sab', nombre: 'Sabiduría', abrev: 'SAB' },
  { id: 'car', nombre: 'Carisma', abrev: 'CAR' },
];
const NOMBRE_CAR = Object.fromEntries(CARACTERISTICAS.map(c => [c.id, c.nombre]));
const ABREV_CAR = Object.fromEntries(CARACTERISTICAS.map(c => [c.id, c.abrev]));

const HABILIDADES = {
  acrobacias: { nombre: 'Acrobacias', car: 'des' },
  atletismo: { nombre: 'Atletismo', car: 'fue' },
  arcanos: { nombre: 'Arcanos', car: 'int' },
  engano: { nombre: 'Engaño', car: 'car' },
  historia: { nombre: 'Historia', car: 'int' },
  interpretacion: { nombre: 'Interpretación', car: 'car' },
  intimidacion: { nombre: 'Intimidación', car: 'car' },
  investigacion: { nombre: 'Investigación', car: 'int' },
  juego_manos: { nombre: 'Juego de manos', car: 'des' },
  medicina: { nombre: 'Medicina', car: 'sab' },
  naturaleza: { nombre: 'Naturaleza', car: 'int' },
  percepcion: { nombre: 'Percepción', car: 'sab' },
  perspicacia: { nombre: 'Perspicacia', car: 'sab' },
  persuasion: { nombre: 'Persuasión', car: 'car' },
  religion: { nombre: 'Religión', car: 'int' },
  sigilo: { nombre: 'Sigilo', car: 'des' },
  supervivencia: { nombre: 'Supervivencia', car: 'sab' },
  trato_animales: { nombre: 'Trato con animales', car: 'sab' },
};

const CONDICIONES = {
  derribado: { nombre: 'Derribado', desc: 'Tus ataques tienen desventaja. Los ataques cuerpo a cuerpo contra ti tienen ventaja; los de distancia, desventaja. Levantarte cuesta la mitad de tu movimiento.' },
  envenenado: { nombre: 'Envenenado', desc: 'Desventaja en tiradas de ataque y pruebas de característica.' },
  paralizado: { nombre: 'Paralizado', desc: 'No puedes moverte ni actuar. Fallas las salvaciones de FUE y DES. Los ataques contra ti tienen ventaja y los cuerpo a cuerpo son críticos.' },
  apresado: { nombre: 'Apresado', desc: 'Velocidad 0. Tus ataques tienen desventaja y los ataques contra ti, ventaja. Puedes usar tu acción para escapar.' },
  asustado: { nombre: 'Asustado', desc: 'Desventaja en ataques y pruebas mientras veas a la fuente de tu miedo.' },
  dormido: { nombre: 'Dormido', desc: 'Inconsciente: no actúa. Los ataques contra él tienen ventaja y los cuerpo a cuerpo son críticos. Despierta al recibir daño.' },
  oculto: { nombre: 'Oculto', desc: 'Tu próximo ataque tiene ventaja y los ataques contra ti tienen desventaja. Atacar te revela.' },
  invisible: { nombre: 'Invisible', desc: 'Tus ataques tienen ventaja y los ataques contra ti, desventaja. Termina si atacas o lanzas un conjuro.' },
  esquivando: { nombre: 'Esquivando', desc: 'Los ataques contra ti tienen desventaja y tienes ventaja en salvaciones de DES.' },
  expulsado: { nombre: 'Expulsado', desc: 'Huye de quien lo expulsó y no puede acercarse. Termina si recibe daño.' },
  ralentizado: { nombre: 'Ralentizado', desc: 'Velocidad reducida hasta el final de su próximo turno.' },
  sin_reacciones: { nombre: 'Sin reacciones', desc: 'No puede usar reacciones hasta su próximo turno.' },
  inconsciente: { nombre: 'Inconsciente', desc: 'Estás a 0 PG y haces tiradas de salvación contra la muerte.' },
  furia: { nombre: 'En furia', desc: '+daño cuerpo a cuerpo, resistencia a daño contundente, cortante y perforante, ventaja en FUE.' },
  temerario: { nombre: 'Temerario', desc: 'Atacas con ventaja, pero los ataques contra ti también tienen ventaja.' },
  bendecido: { nombre: 'Bendecido', desc: '+1d4 a tiradas de ataque y salvaciones.' },
  marcado: { nombre: 'Marcado', desc: 'Recibe daño adicional de quien lo marcó.' },
  iluminado: { nombre: 'Señalado por la luz', desc: 'El próximo ataque contra él tiene ventaja.' },
};

const TIPOS_DANIO = ['cortante', 'perforante', 'contundente', 'fuego', 'frío', 'rayo', 'trueno', 'ácido', 'veneno', 'necrótico', 'radiante', 'fuerza', 'psíquico'];
const DANIO_FISICO = ['cortante', 'perforante', 'contundente'];

// Puntos de experiencia necesarios para alcanzar cada nivel
const UMBRAL_PX = [0, 0, 300, 900, 2700, 6500];
const NIVEL_MAXIMO = 5;

// Umbrales de PX por héroe (fácil, normal, difícil, mortal)
const PRESUPUESTO_ENCUENTRO = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
};
function multiplicadorGrupo(n) {
  if (n <= 1) return 1;
  if (n === 2) return 1.5;
  if (n <= 6) return 2;
  if (n <= 10) return 2.5;
  return 3;
}

const DIFICULTADES = {
  facil: { nombre: 'Narrativa', desc: 'Para disfrutar de la historia. Enemigos con menos vida y encuentros moderados.', pgEnemigos: 0.75, tope: 1, pgExtraNivel: 2, muerteMasiva: false },
  normal: { nombre: 'Heroica', desc: 'Equilibrada para un héroe en solitario. Los combates duros pueden tumbarte.', pgEnemigos: 0.9, tope: 2, pgExtraNivel: 1, muerteMasiva: false },
  dificil: { nombre: 'Despiadada', desc: 'Reglas de 5ª edición sin red. Encuentros mortales y daño masivo.', pgEnemigos: 1, tope: 3, pgExtraNivel: 0, muerteMasiva: true },
};

function modificador(valor) { return Math.floor((valor - 10) / 2); }
function bonoCompetencia(nivel) { return 2 + Math.floor((nivel - 1) / 4); }

const TRASFONDOS = {
  acolito: { nombre: 'Acólito', habilidades: ['perspicacia', 'religion'], oro: 15, desc: 'Serviste en un templo; conoces ritos, plegarias y a los sacerdotes de la región.' },
  criminal: { nombre: 'Criminal', habilidades: ['engano', 'sigilo'], oro: 15, desc: 'Tienes contactos en los bajos fondos y sabes cómo mover objetos robados.' },
  erudito: { nombre: 'Erudito', habilidades: ['arcanos', 'historia'], oro: 10, desc: 'Pasaste años entre libros. Sabes dónde buscar información y a quién preguntar.' },
  soldado: { nombre: 'Soldado', habilidades: ['atletismo', 'intimidacion'], oro: 10, desc: 'Serviste en un ejército. Los soldados de tu antiguo rango aún te reconocen.' },
  forastero: { nombre: 'Forastero', habilidades: ['atletismo', 'supervivencia'], oro: 10, desc: 'Creciste lejos de la civilización. Siempre encuentras comida y agua en la naturaleza.' },
  heroe_pueblo: { nombre: 'Héroe del pueblo', habilidades: ['trato_animales', 'supervivencia'], oro: 10, desc: 'Plantaste cara a un tirano. La gente humilde te ofrece cobijo.' },
  noble: { nombre: 'Noble', habilidades: ['historia', 'persuasion'], oro: 25, desc: 'Tu apellido abre puertas en la alta sociedad, y también genera enemigos.' },
  artista: { nombre: 'Artista', habilidades: ['acrobacias', 'interpretacion'], oro: 15, desc: 'Vives de tu talento. En cualquier taberna encuentras un escenario y una cama.' },
  pilluelo: { nombre: 'Pilluelo', habilidades: ['juego_manos', 'sigilo'], oro: 10, desc: 'Creciste en la calle. Conoces los atajos y pasadizos de cualquier ciudad.' },
  charlatan: { nombre: 'Charlatán', habilidades: ['engano', 'juego_manos'], oro: 15, desc: 'Vives de engaños y estafas. Tienes una identidad falsa bien documentada.' },
};

const NOMBRES_SUGERIDOS = ['Aldric', 'Brienne', 'Caelia', 'Doran', 'Elowen', 'Fenrik', 'Gwendra', 'Halvar', 'Isolda', 'Jorvik', 'Kestrel', 'Lyra', 'Morwen', 'Nerys', 'Orsik', 'Perrin', 'Quillon', 'Rhoswen', 'Sorrel', 'Tamsin', 'Ulfgar', 'Vesna', 'Wren', 'Yvaine', 'Zarek', 'Ximena', 'Rodrigo', 'Urraca', 'Tristán', 'Leonor'];
