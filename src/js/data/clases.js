// ─── Clases ───

const ESPACIOS_COMPLETO = { 1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2] };
const ESPACIOS_MEDIO = { 1: [], 2: [2], 3: [3], 4: [3], 5: [4, 2] };
// Magia de pacto: [cantidad, nivel del espacio]
const ESPACIOS_PACTO = { 1: [1, 1], 2: [2, 1], 3: [2, 2], 4: [2, 2], 5: [2, 3] };

const ESTILOS_COMBATE = {
  defensa: { nombre: 'Defensa', desc: '+1 a la CA mientras lleves armadura.' },
  duelo: { nombre: 'Duelo', desc: '+2 al daño con un arma cuerpo a cuerpo a una mano si no empuñas otra arma.' },
  arqueria: { nombre: 'Arquería', desc: '+2 a las tiradas de ataque con armas a distancia.' },
  gran_arma: { nombre: 'Combate con armas grandes', desc: 'Repites los 1 y 2 en los dados de daño de armas a dos manos.' },
};

const TIPOS_ENEMIGO_PREDILECTO = {
  bestia: 'Bestias', muerto_viviente: 'Muertos vivientes', humanoide: 'Humanoides', monstruosidad: 'Monstruosidades', gigante: 'Gigantes', infernal: 'Infernales', dragon: 'Dragones', cieno: 'Cienos y aberraciones',
};

const INVOCACIONES = {
  descarga_agonizante: { nombre: 'Descarga agonizante', desc: 'Sumas tu modificador de CAR al daño de Descarga sobrenatural.' },
  armadura_sombras: { nombre: 'Armadura de sombras', desc: 'Siempre tienes los efectos de Armadura de mago (CA 13 + DES) sin armadura.' },
  descarga_repulsora: { nombre: 'Descarga repulsora', desc: 'Cada rayo de Descarga sobrenatural que impacta empuja al objetivo 3 m.' },
  vision_diablo: { nombre: 'Visión del diablo', desc: 'Ves con normalidad en la oscuridad mágica y no mágica hasta 36 m.' },
};

const CLASES = {
  guerrero: {
    nombre: 'Guerrero', dado: 10, principal: 'FUE o DES', salvaciones: ['fue', 'con'],
    armaduras: ['ligera', 'media', 'pesada', 'escudo'], armas: ['sencilla', 'marcial'],
    habilidades: { elegir: 2, de: ['acrobacias', 'trato_animales', 'atletismo', 'historia', 'perspicacia', 'intimidacion', 'percepcion', 'supervivencia'] },
    estilos: ['defensa', 'duelo', 'arqueria', 'gran_arma'], estiloNivel: 1,
    reparto: { fue: 15, con: 14, des: 13, sab: 12, car: 10, int: 8 },
    desc: 'Maestro de las armas y las armaduras. Aguanta golpes, devuelve más y nunca se queda sin recursos.',
    rasgos: [
      { id: 'estilo_combate', nivel: 1, nombre: 'Estilo de combate', desc: 'Eliges una especialidad marcial.' },
      { id: 'tomar_aliento', nivel: 1, nombre: 'Tomar aliento', desc: 'Acción adicional: recuperas 1d10 + nivel PG. Una vez por descanso corto.' },
      { id: 'oleada_accion', nivel: 2, nombre: 'Oleada de acción', desc: 'Obtienes una acción adicional en tu turno. Una vez por descanso corto.' },
      { id: 'critico_mejorado', nivel: 3, nombre: 'Crítico mejorado (Campeón)', desc: 'Tus ataques con arma son críticos con 19 o 20.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'ataque_extra', nivel: 5, nombre: 'Ataque extra', desc: 'Atacas dos veces cuando realizas la acción de Atacar.' },
    ],
  },
  barbaro: {
    nombre: 'Bárbaro', dado: 12, principal: 'FUE', salvaciones: ['fue', 'con'],
    armaduras: ['ligera', 'media', 'escudo'], armas: ['sencilla', 'marcial'],
    habilidades: { elegir: 2, de: ['trato_animales', 'atletismo', 'intimidacion', 'naturaleza', 'percepcion', 'supervivencia'] },
    reparto: { fue: 15, con: 14, des: 13, sab: 12, car: 10, int: 8 },
    desc: 'Guerrero primigenio que canaliza su furia. Enorme reserva de vida y golpes devastadores.',
    rasgos: [
      { id: 'furia', nivel: 1, nombre: 'Furia', desc: 'Acción adicional: +2 al daño cuerpo a cuerpo, resistencia al daño físico y ventaja en FUE durante el combate. 2 usos (3 desde nivel 3) por descanso largo.' },
      { id: 'defensa_sin_armadura', nivel: 1, nombre: 'Defensa sin armadura', desc: 'Sin armadura, tu CA es 10 + DES + CON (puedes usar escudo).' },
      { id: 'ataque_temerario', nivel: 2, nombre: 'Ataque temerario', desc: 'Atacas con ventaja este turno, pero los ataques contra ti tienen ventaja hasta tu próximo turno.' },
      { id: 'sentido_peligro', nivel: 2, nombre: 'Sentido del peligro', desc: 'Ventaja en salvaciones de DES.' },
      { id: 'frenesi', nivel: 3, nombre: 'Frenesí (Berserker)', desc: 'Mientras estés en furia, puedes hacer un ataque cuerpo a cuerpo como acción adicional.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'ataque_extra', nivel: 5, nombre: 'Ataque extra', desc: 'Atacas dos veces cuando realizas la acción de Atacar.' },
      { id: 'movimiento_rapido', nivel: 5, nombre: 'Movimiento rápido', desc: '+3 m de velocidad sin armadura pesada.' },
    ],
  },
  picaro: {
    nombre: 'Pícaro', dado: 8, principal: 'DES', salvaciones: ['des', 'int'],
    armaduras: ['ligera'], armas: ['sencilla', 'espada_larga', 'estoque', 'espada_corta', 'ballesta_mano'],
    habilidades: { elegir: 4, de: ['acrobacias', 'atletismo', 'engano', 'perspicacia', 'intimidacion', 'investigacion', 'percepcion', 'interpretacion', 'persuasion', 'juego_manos', 'sigilo'] },
    pericia: 2,
    reparto: { des: 15, con: 14, car: 13, sab: 12, int: 10, fue: 8 },
    desc: 'Experto en sigilo y golpes precisos. Se esconde, ataca con ventaja y remata con el ataque furtivo.',
    rasgos: [
      { id: 'pericia', nivel: 1, nombre: 'Pericia', desc: 'Duplicas tu bono de competencia en dos habilidades.' },
      { id: 'ataque_furtivo', nivel: 1, nombre: 'Ataque furtivo', desc: 'Una vez por turno, +1d6 (2d6 a nivel 3, 3d6 a nivel 5) si atacas con ventaja usando un arma sutil o a distancia.' },
      { id: 'accion_astuta', nivel: 2, nombre: 'Acción astuta', desc: 'Esconderte, Correr o Desengancharte como acción adicional.' },
      { id: 'asesinar', nivel: 3, nombre: 'Asesinar (Asesino)', desc: 'Ventaja contra criaturas que aún no han actuado en el combate; los impactos a criaturas sorprendidas son críticos.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'esquiva_asombrosa', nivel: 5, nombre: 'Esquiva asombrosa', desc: 'Reacción: reduces a la mitad el daño de un ataque que te impacte.' },
    ],
  },
  explorador: {
    nombre: 'Explorador', dado: 10, principal: 'DES y SAB', salvaciones: ['fue', 'des'],
    armaduras: ['ligera', 'media', 'escudo'], armas: ['sencilla', 'marcial'],
    habilidades: { elegir: 3, de: ['trato_animales', 'atletismo', 'perspicacia', 'investigacion', 'naturaleza', 'percepcion', 'sigilo', 'supervivencia'] },
    estilos: ['defensa', 'duelo', 'arqueria'], estiloNivel: 2,
    reparto: { des: 15, sab: 14, con: 13, fue: 12, int: 10, car: 8 },
    lanzamiento: { car: 'sab', tipo: 'conocidos', espacios: 'medio', trucos: [0, 0, 0, 0, 0], conocidos: [0, 2, 3, 3, 4] },
    desc: 'Cazador de las tierras salvajes. Letal con el arco, rastrea a su presa y domina magia natural.',
    rasgos: [
      { id: 'enemigo_predilecto', nivel: 1, nombre: 'Enemigo predilecto', desc: '+2 al daño con armas contra tu tipo de enemigo predilecto y ventaja para rastrearlo.' },
      { id: 'explorador_nato', nivel: 1, nombre: 'Explorador nato', desc: 'No te pierdes en la naturaleza y encuentras el doble de comida.' },
      { id: 'estilo_combate', nivel: 2, nombre: 'Estilo de combate', desc: 'Eliges una especialidad marcial.' },
      { id: 'lanzamiento_conjuros', nivel: 2, nombre: 'Lanzamiento de conjuros', desc: 'Conjuros de explorador basados en SAB.' },
      { id: 'asesino_colosos', nivel: 3, nombre: 'Asesino de colosos (Cazador)', desc: 'Una vez por turno, +1d8 de daño a una criatura que no tenga sus PG al máximo.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'ataque_extra', nivel: 5, nombre: 'Ataque extra', desc: 'Atacas dos veces cuando realizas la acción de Atacar.' },
    ],
  },
  paladin: {
    nombre: 'Paladín', dado: 10, principal: 'FUE y CAR', salvaciones: ['sab', 'car'],
    armaduras: ['ligera', 'media', 'pesada', 'escudo'], armas: ['sencilla', 'marcial'],
    habilidades: { elegir: 2, de: ['atletismo', 'perspicacia', 'intimidacion', 'medicina', 'persuasion', 'religion'] },
    estilos: ['defensa', 'duelo', 'gran_arma'], estiloNivel: 2,
    reparto: { fue: 15, car: 14, con: 13, sab: 12, des: 10, int: 8 },
    lanzamiento: { car: 'car', tipo: 'preparados', espacios: 'medio', trucos: [0, 0, 0, 0, 0] },
    desc: 'Guerrero sagrado ligado a un juramento. Cura con las manos y fulmina con castigos divinos.',
    rasgos: [
      { id: 'sentido_divino', nivel: 1, nombre: 'Sentido divino', desc: 'Percibes celestiales, infernales y muertos vivientes cercanos.' },
      { id: 'imposicion_manos', nivel: 1, nombre: 'Imposición de manos', desc: 'Acción: curas PG de una reserva de 5 × nivel, o eliminas un veneno con 5 puntos. Se recupera con un descanso largo.' },
      { id: 'estilo_combate', nivel: 2, nombre: 'Estilo de combate', desc: 'Eliges una especialidad marcial.' },
      { id: 'castigo_divino', nivel: 2, nombre: 'Castigo divino', desc: 'Al impactar cuerpo a cuerpo, gastas un espacio de conjuro: +2d8 radiante (+1d8 por nivel de espacio superior, +1d8 contra muertos vivientes e infernales).' },
      { id: 'lanzamiento_conjuros', nivel: 2, nombre: 'Lanzamiento de conjuros', desc: 'Conjuros de paladín basados en CAR.' },
      { id: 'salud_divina', nivel: 3, nombre: 'Salud divina', desc: 'Inmunidad a las enfermedades.' },
      { id: 'arma_sagrada', nivel: 3, nombre: 'Arma sagrada (Devoción)', desc: 'Canalizar divinidad (acción): sumas tu mod. de CAR a los ataques con arma durante el combate. Una vez por descanso corto.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'ataque_extra', nivel: 5, nombre: 'Ataque extra', desc: 'Atacas dos veces cuando realizas la acción de Atacar.' },
    ],
  },
  clerigo: {
    nombre: 'Clérigo', dado: 8, principal: 'SAB', salvaciones: ['sab', 'car'],
    armaduras: ['ligera', 'media', 'pesada', 'escudo'], armas: ['sencilla'],
    habilidades: { elegir: 2, de: ['historia', 'perspicacia', 'medicina', 'persuasion', 'religion'] },
    reparto: { sab: 15, con: 14, fue: 13, des: 12, car: 10, int: 8 },
    lanzamiento: { car: 'sab', tipo: 'preparados', espacios: 'completo', trucos: [3, 3, 3, 4, 4] },
    desc: 'Intermediario divino del Dominio de la Vida. Sanador incansable que aguanta en primera línea.',
    rasgos: [
      { id: 'lanzamiento_conjuros', nivel: 1, nombre: 'Lanzamiento de conjuros', desc: 'Conjuros de clérigo basados en SAB. Conoces todos los de tu lista.' },
      { id: 'discipulo_vida', nivel: 1, nombre: 'Discípulo de la vida', desc: 'Tus conjuros de curación con espacio curan 2 + nivel del espacio PG adicionales.' },
      { id: 'canalizar_divinidad', nivel: 2, nombre: 'Canalizar divinidad', desc: 'Expulsar muertos vivientes o Preservar la vida. Una vez por descanso corto.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
      { id: 'destruir_muertos', nivel: 5, nombre: 'Destruir muertos vivientes', desc: 'Los muertos vivientes de VD 1/2 o menos que fallen la salvación contra Expulsar quedan destruidos.' },
    ],
  },
  mago: {
    nombre: 'Mago', dado: 6, principal: 'INT', salvaciones: ['int', 'sab'],
    armaduras: [], armas: ['daga', 'baston', 'ballesta_ligera', 'honda', 'dardo'],
    habilidades: { elegir: 2, de: ['arcanos', 'historia', 'perspicacia', 'investigacion', 'medicina', 'religion'] },
    reparto: { int: 15, con: 14, des: 13, sab: 12, car: 10, fue: 8 },
    lanzamiento: { car: 'int', tipo: 'conocidos', espacios: 'completo', trucos: [3, 3, 3, 4, 4], conocidos: [4, 6, 8, 10, 12] },
    desc: 'Erudito de lo arcano con el repertorio más amplio. Frágil, pero capaz de arrasar salas enteras.',
    rasgos: [
      { id: 'lanzamiento_conjuros', nivel: 1, nombre: 'Lanzamiento de conjuros', desc: 'Conjuros de mago basados en INT, anotados en tu libro de conjuros.' },
      { id: 'recuperacion_arcana', nivel: 1, nombre: 'Recuperación arcana', desc: 'Una vez al día, en un descanso corto, recuperas espacios de conjuro cuya suma de niveles sea la mitad de tu nivel (redondeando arriba).' },
      { id: 'esculpir_conjuros', nivel: 2, nombre: 'Esculpir conjuros (Evocación)', desc: 'Tus conjuros de área no te afectan a ti.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
    ],
  },
  brujo: {
    nombre: 'Brujo', dado: 8, principal: 'CAR', salvaciones: ['sab', 'car'],
    armaduras: ['ligera'], armas: ['sencilla'],
    habilidades: { elegir: 2, de: ['arcanos', 'engano', 'historia', 'intimidacion', 'investigacion', 'naturaleza', 'religion'] },
    reparto: { car: 15, con: 14, des: 13, sab: 12, int: 10, fue: 8 },
    lanzamiento: { car: 'car', tipo: 'conocidos', espacios: 'pacto', trucos: [2, 2, 2, 3, 3], conocidos: [2, 3, 4, 5, 6] },
    desc: 'Pactó con un Infernal a cambio de poder. Pocos espacios que se recuperan rápido y una descarga devastadora.',
    rasgos: [
      { id: 'magia_pacto', nivel: 1, nombre: 'Magia del pacto', desc: 'Pocos espacios de conjuro, siempre del nivel más alto, que se recuperan con un descanso corto.' },
      { id: 'bendicion_oscuro', nivel: 1, nombre: 'Bendición del oscuro (Infernal)', desc: 'Al reducir a 0 PG a un enemigo, ganas PG temporales iguales a CAR + nivel.' },
      { id: 'invocaciones', nivel: 2, nombre: 'Invocaciones sobrenaturales', desc: 'Eliges dos invocaciones.' },
      { id: 'pacto_tomo', nivel: 3, nombre: 'Pacto del tomo', desc: 'Aprendes dos trucos adicionales de cualquier lista.' },
      { id: 'mejora_caracteristica', nivel: 4, nombre: 'Mejora de característica', desc: '+2 a una característica o +1 a dos.' },
    ],
  },
};

// Equipo inicial según clase (y estilo de combate cuando importa)
function equipoInicial(claseId, estilo) {
  switch (claseId) {
    case 'guerrero':
      if (estilo === 'arqueria') return ['cuero_tachonado', 'arco_largo', 'espada_corta', 'pocion_curacion'];
      if (estilo === 'gran_arma') return ['cota_malla', 'gran_espada', 'jabalina', 'pocion_curacion'];
      return ['cota_malla', 'espada_larga', 'escudo', 'ballesta_ligera', 'pocion_curacion'];
    case 'barbaro': return ['hacha_dos_manos', 'hacha_mano', 'jabalina', 'pocion_curacion'];
    case 'picaro': return ['cuero', 'estoque', 'arco_corto', 'daga', 'herramientas_ladron', 'pocion_curacion'];
    case 'explorador': return ['cota_escamas', 'espada_corta', 'arco_largo', 'pocion_curacion'];
    case 'paladin': return ['cota_malla', 'espada_larga', 'escudo', 'jabalina', 'simbolo_sagrado', 'pocion_curacion'];
    case 'clerigo': return ['cota_escamas', 'maza', 'escudo', 'ballesta_ligera', 'simbolo_sagrado', 'pocion_curacion'];
    case 'mago': return ['baston', 'daga', 'libro_conjuros', 'pocion_curacion'];
    case 'brujo': return ['cuero', 'ballesta_ligera', 'daga', 'foco_arcano', 'pocion_curacion'];
    default: return ['daga', 'pocion_curacion'];
  }
}
