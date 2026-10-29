// ─── Contenido de la Mazmorra clásica (modo sin IA) ───

const PISOS = [
  {
    nombre: 'Catacumbas de Valdren', terreno: 'cripta',
    intro: 'Bajas por una escalera de caracol hasta las catacumbas del viejo rey Valdren. El aire huele a cera rancia y tierra removida. Desde que unos saqueadores profanaron su tumba, los muertos no descansan.',
    monstruos: ['rata_gigante', 'esqueleto', 'zombi', 'cieno_gris'],
    jefe: { nombre: 'Valdren, el Rey sin Carne', grupos: [{ id: 'esqueleto', jefe: true, nombre: 'Valdren, el Rey sin Carne' }, { id: 'esqueleto', cantidad: 1 }], texto: 'Sobre un trono de fémures, una figura coronada de hueso gira la cabeza hacia ti. Sus cuencas vacías se encienden con un fulgor azul.' },
  },
  {
    nombre: 'Madrigueras de Colmillo Roto', terreno: 'cueva',
    intro: 'Bajo las catacumbas se abren túneles excavados a zarpazos. Huele a humo, a perro mojado y a carne asada. Los goblins de la tribu Colmillo Roto han convertido estas cuevas en su hogar.',
    monstruos: ['goblin', 'lobo', 'kobold', 'rata_gigante', 'hobgoblin'],
    jefe: { nombre: 'Grutz, Rey de la Madriguera', grupos: [{ id: 'jefe_goblin', nombre: 'Grutz, Rey de la Madriguera' }, { id: 'goblin', cantidad: 2 }], texto: 'Una caverna llena de trofeos robados. Sobre un montón de pieles, un goblin enorme con una corona de latón golpea dos cimitarras entre sí. «¡Otro aventurero para la olla!»' },
  },
  {
    nombre: 'Templo de la Llama Hueca', terreno: 'templo',
    intro: 'Las cuevas desembocan en un templo subterráneo de piedra negra. Braseros de fuego frío iluminan columnas talladas con llamas que no dan calor. Se oyen cánticos a lo lejos.',
    monstruos: ['cultista', 'esqueleto', 'arana_gigante', 'gargola', 'necrofago'],
    jefe: { nombre: 'Morvath, Sumo Sacerdote', grupos: [{ id: 'fanatico', nombre: 'Morvath, Sumo Sacerdote' }, { id: 'cultista', cantidad: 2 }], texto: 'Ante un altar de obsidiana, un sacerdote con la cara cubierta de ceniza alza una daga. «La Llama Hueca reclama tu alma, intruso.»' },
  },
  {
    nombre: 'Fortaleza de Colmillo Negro', terreno: 'ruinas',
    intro: 'Más abajo, una fortaleza enana en ruinas ha sido ocupada por un ejército de orcos. Tambores de guerra resuenan entre los muros derruidos.',
    monstruos: ['orco', 'hobgoblin', 'osgo', 'huargo', 'gnoll'],
    jefe: { nombre: 'Gorlag Colmillo Negro', grupos: [{ id: 'ogro', jefe: true, nombre: 'Gorlag Colmillo Negro' }, { id: 'orco', cantidad: 1 }], texto: 'En el salón del trono, un ogro cubierto de placas oxidadas se levanta con un rugido. Lleva la corona del antiguo rey enano clavada en el casco.' },
  },
  {
    nombre: 'Cubil de Ignaxar', terreno: 'volcan',
    intro: 'El último descenso te lleva a cavernas de roca volcánica. El calor es asfixiante y ríos de lava iluminan montones de oro fundido. Algo enorme respira en la oscuridad.',
    monstruos: ['kobold', 'gargola', 'tumulario', 'oso_lechuza', 'minotauro', 'huargo'],
    jefe: { nombre: 'Ignaxar el Joven', grupos: [{ id: 'dragon_rojo_joven', nombre: 'Ignaxar el Joven' }, { id: 'kobold', cantidad: 2 }], texto: 'Sobre un lecho de monedas, un dragón rojo del tamaño de un caballo despliega las alas. «Un ladronzuelo. Qué divertido. Arderás despacio.»' },
  },
];

const DESCRIPCIONES_SALA = {
  cripta: ['Nichos funerarios se alinean en las paredes, muchos vacíos.', 'Una sala de embalsamamiento con mesas de piedra manchadas.', 'Un osario: cráneos apilados forman arcos sobre tu cabeza.', 'Un pasillo de sarcófagos con tapas rotas desde dentro.', 'Una capilla funeraria con velas que alguien encendió hace poco.'],
  cueva: ['Una gruta húmeda con huesos roídos por el suelo.', 'Una cueva con hogueras apagadas y jergones de paja.', 'Un túnel estrecho con marcas de garras en las paredes.', 'Un almacén de botín: barriles abiertos y sacos rasgados.', 'Una caverna con estalactitas que gotean sin parar.'],
  templo: ['Una nave de columnas negras con frescos de llamas.', 'Un dormitorio de acólitos con camastros vacíos.', 'Una sala de ofrendas con cuencos de ceniza.', 'Un claustro con un jardín de hongos pálidos.', 'Una biblioteca con estanterías quemadas a medias.'],
  ruinas: ['Un patio de armas cubierto de escombros.', 'Una forja enana fría, con yunques volcados.', 'Un cuartel orco con pieles y armas oxidadas.', 'Un salón con estandartes enanos pisoteados.', 'Una galería con estatuas enanas decapitadas.'],
  volcan: ['Una caverna de basalto partida por una grieta de lava.', 'Un túnel de obsidiana que refleja tu silueta.', 'Una cámara con huevos de piedra calientes al tacto.', 'Un puente natural sobre un lago de magma.', 'Una sala con monedas fundidas pegadas al suelo.'],
};

const INTROS_COMBATE = [
  'Algo se mueve entre las sombras. ¡No estás solo!',
  'Un chillido rompe el silencio y varias figuras se lanzan hacia ti.',
  'Has hecho demasiado ruido. Tus enemigos ya te esperan.',
  'Unos ojos brillan en la oscuridad. Desenvainas justo a tiempo.',
  'Te topas de frente con una patrulla.',
];

// Eventos: cada opción puede tener prueba {tipo, id, cd(+piso)}, y efectos de exito/fallo
// Efectos de evento: {oro:'2d10'}, {objeto:'comun'|'medio'|'raro'|id}, {danio:'2d6', tipo}, {curar:'2d8'}, {px:n}, {condicion}, {inspiracion:true}, {combate:[{id,cantidad}]}, {mapa:true}
const EVENTOS = [
  {
    id: 'altar', titulo: 'Altar olvidado',
    texto: 'Un altar de piedra cubierto de musgo sostiene la estatuilla de un dios que nadie recuerda. A sus pies hay ofrendas: monedas verdosas y flores secas.',
    opciones: [
      { texto: 'Rezar con respeto', prueba: { tipo: 'habilidad', id: 'religion', cd: 11 }, exito: { texto: 'Reconoces los ritos de un antiguo dios protector. Una calidez recorre tu cuerpo.', efectos: [{ curar: '2d8' }, { inspiracion: true }] }, fallo: { texto: 'Equivocas la plegaria. La estatuilla parece fruncir el ceño, pero nada más ocurre.', efectos: [] } },
      { texto: 'Coger las ofrendas', exito: { texto: 'Recoges las monedas. Al darte la vuelta, un escalofrío te recorre la espalda.', efectos: [{ oro: '3d10' }, { danio: '1d6', tipo: 'necrótico' }] } },
      { texto: 'Seguir adelante', exito: { texto: 'Dejas el altar en paz.', efectos: [] } },
    ],
  },
  {
    id: 'cofre', titulo: 'Un cofre cerrado',
    texto: 'En un rincón hay un cofre de hierro con una cerradura oxidada. Parece pesado.',
    opciones: [
      { texto: 'Forzar la cerradura con cuidado', prueba: { tipo: 'habilidad', id: 'juego_manos', cd: 12 }, mimeto: true, exito: { texto: 'La cerradura cede con un clic.', efectos: [{ oro: '4d10' }, { objeto: 'comun' }] }, fallo: { texto: 'Una aguja salta de la cerradura y te pincha.', efectos: [{ danio: '1d6', tipo: 'veneno' }, { condicion: 'envenenado' }] } },
      { texto: 'Reventarlo a golpes', prueba: { tipo: 'habilidad', id: 'atletismo', cd: 13 }, mimeto: true, exito: { texto: 'Arrancas la tapa de cuajo.', efectos: [{ oro: '3d10' }, { objeto: 'comun' }] }, fallo: { texto: 'El estruendo resuena por los pasillos... algo viene.', efectos: [{ combate: 'aleatorio' }] } },
      { texto: 'Examinarlo antes de tocarlo', prueba: { tipo: 'habilidad', id: 'investigacion', cd: 12 }, exito: { texto: 'Descubres una trampa de aguja y la desactivas antes de abrirlo.', efectos: [{ oro: '4d10' }, { objeto: 'comun' }, { px: 25 }] }, fallo: { texto: 'No ves nada raro... y lo abres de todos modos. Una aguja te pincha.', efectos: [{ danio: '1d4', tipo: 'veneno' }, { oro: '2d10' }] } },
    ],
  },
  {
    id: 'puente', titulo: 'La sima',
    texto: 'Una grieta profunda corta la sala. Un puente de cuerdas podridas cruza al otro lado. Abajo solo hay oscuridad.',
    opciones: [
      { texto: 'Cruzar con agilidad', prueba: { tipo: 'habilidad', id: 'acrobacias', cd: 12 }, exito: { texto: 'Cruzas de un salto en el último tramo justo cuando una cuerda se parte.', efectos: [{ px: 30 }] }, fallo: { texto: 'Una tabla se rompe y caes contra la pared de la sima antes de trepar.', efectos: [{ danio: '2d6', tipo: 'contundente' }] } },
      { texto: 'Trepar por la pared', prueba: { tipo: 'habilidad', id: 'atletismo', cd: 13 }, exito: { texto: 'Bajas y subes por la roca con firmeza.', efectos: [{ px: 30 }] }, fallo: { texto: 'Resbalas y te golpeas antes de lograrlo.', efectos: [{ danio: '2d6', tipo: 'contundente' }] } },
    ],
  },
  {
    id: 'fuente', titulo: 'La fuente luminosa',
    texto: 'De una grieta brota agua que brilla con una luz azulada. Forma un pequeño estanque perfectamente quieto.',
    opciones: [
      { texto: 'Estudiar su magia', prueba: { tipo: 'habilidad', id: 'arcanos', cd: 13 }, exito: { texto: 'Es un manantial de curación. Bebes sin miedo y llenas un frasco.', efectos: [{ curar: '4d4+4' }, { objeto: 'pocion_curacion' }] }, fallo: { texto: 'No logras entender su naturaleza. Prefieres no arriesgarte.', efectos: [] } },
      { texto: 'Beber sin más', azar: [{ peso: 2, texto: 'El agua te llena de vigor.', efectos: [{ curar: '2d8' }] }, { peso: 1, texto: 'El agua sabe a metal y se te revuelve el estómago.', efectos: [{ condicion: 'envenenado' }] }, { peso: 1, texto: 'Visiones de héroes pasados te llenan de determinación.', efectos: [{ inspiracion: true }] }] },
      { texto: 'No tocarla', exito: { texto: 'La dejas atrás.', efectos: [] } },
    ],
  },
  {
    id: 'prisionero', titulo: 'El prisionero',
    texto: 'Un hombre demacrado cuelga de unos grilletes. «¡Por favor! Llevo días aquí. Sácame y te diré dónde esconden el tesoro.»',
    opciones: [
      { texto: 'Observarlo con atención', prueba: { tipo: 'habilidad', id: 'perspicacia', cd: 12 }, exito: { texto: 'Su miedo es real. Lo liberas y, agradecido, te da su anillo y te describe la ruta hasta el jefe.', efectos: [{ oro: '2d10' }, { px: 40 }, { mapa: true }] }, fallo: { texto: 'No sabes qué pensar. Lo liberas... y saca un cuchillo oculto. ¡Era una trampa!', efectos: [{ combate: [{ id: 'bandido', cantidad: 2 }] }] } },
      { texto: 'Liberarlo sin más', azar: [{ peso: 3, texto: 'Te abraza llorando y te cuenta lo que sabe de este lugar.', efectos: [{ px: 40 }, { mapa: true }] }, { peso: 1, texto: 'En cuanto se ve libre, silba. Sus compinches salen de las sombras.', efectos: [{ combate: [{ id: 'bandido', cantidad: 2 }] }] }] },
      { texto: 'Ignorar sus súplicas', exito: { texto: 'Sus gritos te persiguen por el pasillo.', efectos: [] } },
    ],
  },
  {
    id: 'hongos', titulo: 'Jardín de hongos',
    texto: 'Hongos luminiscentes de todos los colores cubren el suelo y las paredes. Algunos huelen dulce; otros, a podrido.',
    opciones: [
      { texto: 'Recolectar los útiles', prueba: { tipo: 'habilidad', id: 'naturaleza', cd: 12 }, exito: { texto: 'Reconoces la seta de la vida y preparas dos remedios.', efectos: [{ objeto: 'pocion_curacion', cantidad: 2 }] }, fallo: { texto: 'Una nube de esporas te hace toser.', efectos: [{ condicion: 'envenenado' }, { danio: '1d6', tipo: 'veneno' }] } },
      { texto: 'Pasar de largo con cuidado', prueba: { tipo: 'salvacion', id: 'con', cd: 11 }, exito: { texto: 'Contienes la respiración y cruzas sin problemas.', efectos: [] }, fallo: { texto: 'Las esporas te marean.', efectos: [{ condicion: 'envenenado' }] } },
    ],
  },
  {
    id: 'runas', titulo: 'Runas en el muro',
    texto: 'Un círculo de runas brilla débilmente en la pared. Al acercarte, notas un zumbido de energía contenida.',
    opciones: [
      { texto: 'Descifrarlas', prueba: { tipo: 'habilidad', id: 'arcanos', cd: 14 }, exito: { texto: 'Las runas guardan un conjuro. Lo copias en un pergamino antes de que se apaguen.', efectos: [{ objeto: 'pergamino' }, { px: 50 }] }, fallo: { texto: 'Tocas la runa equivocada y una descarga te recorre el brazo.', efectos: [{ danio: '2d8', tipo: 'rayo' }] } },
      { texto: 'Tocarlas sin pensar', azar: [{ peso: 1, texto: 'La energía se descarga sobre ti.', efectos: [{ danio: '2d8', tipo: 'rayo' }] }, { peso: 1, texto: 'Las runas se apagan y dejan caer unas gemas.', efectos: [{ oro: '5d10' }] }] },
      { texto: 'Dejarlas en paz', exito: { texto: 'Sabia decisión, probablemente.', efectos: [] } },
    ],
  },
  {
    id: 'cadaver', titulo: 'Un aventurero caído',
    texto: 'El cuerpo de un aventurero yace contra la pared, con la armadura abollada y la mano aún aferrada a una bolsa.',
    opciones: [
      { texto: 'Examinar sus heridas', prueba: { tipo: 'habilidad', id: 'medicina', cd: 10 }, exito: { texto: 'Murió hace poco, por garras. Sabes qué te espera. Registras su bolsa con calma.', efectos: [{ inspiracion: true }, { oro: '3d10' }, { objeto: 'comun' }] }, fallo: { texto: 'No sacas nada en claro, pero registras sus cosas.', efectos: [{ oro: '2d10' }] } },
      { texto: 'Registrarlo deprisa', azar: [{ peso: 3, texto: 'Encuentras algo útil.', efectos: [{ oro: '3d10' }, { objeto: 'comun' }] }, { peso: 1, texto: '¡El cadáver abre los ojos y te agarra!', efectos: [{ combate: [{ id: 'zombi', cantidad: 1 }] }] }] },
    ],
  },
  {
    id: 'estatua', titulo: 'La estatua de los ojos rojos',
    texto: 'Una estatua de un guerrero sostiene una espada de piedra. En sus cuencas brillan dos rubíes del tamaño de un huevo.',
    opciones: [
      { texto: 'Arrancar los rubíes con sigilo', prueba: { tipo: 'habilidad', id: 'juego_manos', cd: 14 }, exito: { texto: 'Los extraes sin activar nada.', efectos: [{ oro: '8d10' }, { px: 40 }] }, fallo: { texto: 'La espada de piedra cae sobre ti.', efectos: [{ danio: '3d6', tipo: 'contundente' }, { oro: '3d10' }] } },
      { texto: 'Buscar trampas primero', prueba: { tipo: 'habilidad', id: 'percepcion', cd: 13 }, exito: { texto: 'Ves la placa de presión y la bloqueas. Los rubíes son tuyos.', efectos: [{ oro: '8d10' }, { px: 40 }] }, fallo: { texto: 'No ves nada. Prefieres no arriesgarte.', efectos: [] } },
      { texto: 'Ignorarla', exito: { texto: 'Sigues tu camino.', efectos: [] } },
    ],
  },
  {
    id: 'biblioteca', titulo: 'Estanterías polvorientas',
    texto: 'Restos de una pequeña biblioteca: libros mohosos, mapas roídos y un atril con un tomo encadenado.',
    opciones: [
      { texto: 'Buscar algo útil', prueba: { tipo: 'habilidad', id: 'investigacion', cd: 12 }, exito: { texto: 'Entre los libros hay un pergamino mágico intacto.', efectos: [{ objeto: 'pergamino' }] }, fallo: { texto: 'Solo encuentras polvo y polillas.', efectos: [] } },
      { texto: 'Estudiar los mapas', prueba: { tipo: 'habilidad', id: 'historia', cd: 12 }, exito: { texto: 'Los mapas muestran la distribución de este nivel.', efectos: [{ mapa: true }, { px: 30 }] }, fallo: { texto: 'Están demasiado dañados.', efectos: [] } },
    ],
  },
  {
    id: 'lobo_herido', titulo: 'Bestia atrapada',
    texto: 'Un lobo gris tiene la pata atrapada en un cepo. Gruñe al verte, pero tiembla de dolor.',
    opciones: [
      { texto: 'Calmarlo y liberarlo', prueba: { tipo: 'habilidad', id: 'trato_animales', cd: 12 }, exito: { texto: 'Te deja abrir el cepo. Te lame la mano y desaparece. Te sientes bien contigo mismo.', efectos: [{ inspiracion: true }, { px: 40 }] }, fallo: { texto: 'Te muerde al acercarte y huye cojeando.', efectos: [{ danio: '1d6', tipo: 'perforante' }] } },
      { texto: 'Dejarlo', exito: { texto: 'Sus aullidos te acompañan un buen rato.', efectos: [] } },
    ],
  },
  {
    id: 'tahur', titulo: 'El goblin tahúr',
    texto: 'Un goblin con un parche en el ojo te saluda desde una mesa improvisada. «¡Eh, grandullón! ¿Una partidita de dados? Si ganas, doblo tu apuesta.»',
    opciones: [
      { texto: 'Apostar 20 po (y hacer trampa)', prueba: { tipo: 'habilidad', id: 'juego_manos', cd: 13 }, coste: 20, exito: { texto: 'Cambias los dados sin que se dé cuenta. «¡Imposible!»', efectos: [{ oro: '40' }] }, fallo: { texto: 'Te pilla. «¡Tramposo!» Se queda tu apuesta y huye riéndose.', efectos: [] } },
      { texto: 'Apostar 20 po (jugar limpio)', coste: 20, azar: [{ peso: 1, texto: 'Ganas la tirada.', efectos: [{ oro: '40' }] }, { peso: 1, texto: 'Pierdes. El goblin se ríe a carcajadas.', efectos: [] }] },
      { texto: 'Intimidarlo para que suelte su bolsa', prueba: { tipo: 'habilidad', id: 'intimidacion', cd: 13 }, exito: { texto: 'Te tira la bolsa y sale corriendo.', efectos: [{ oro: '2d10' }] }, fallo: { texto: 'Silba, y sus amigos aparecen.', efectos: [{ combate: [{ id: 'goblin', cantidad: 2 }] }] } },
    ],
  },
  {
    id: 'derrumbe', titulo: 'Techo inestable',
    texto: 'Las vigas crujen sobre tu cabeza. Caen pequeñas piedras con cada paso.',
    opciones: [
      { texto: 'Cruzar a la carrera', prueba: { tipo: 'salvacion', id: 'des', cd: 12 }, exito: { texto: 'El techo se viene abajo justo detrás de ti.', efectos: [] }, fallo: { texto: 'Las piedras te alcanzan.', efectos: [{ danio: '3d6', tipo: 'contundente' }] } },
      { texto: 'Buscar el paso más seguro', prueba: { tipo: 'habilidad', id: 'percepcion', cd: 12 }, exito: { texto: 'Encuentras un camino sólido junto a la pared.', efectos: [{ px: 25 }] }, fallo: { texto: 'Eliges mal y una viga te golpea.', efectos: [{ danio: '2d6', tipo: 'contundente' }] } },
    ],
  },
  {
    id: 'espejo', titulo: 'El espejo oscuro',
    texto: 'Un espejo de marco dorado muestra tu reflejo... pero tu reflejo sonríe cuando tú no lo haces.',
    opciones: [
      { texto: 'Sostener la mirada', prueba: { tipo: 'salvacion', id: 'sab', cd: 13 }, exito: { texto: 'Tu reflejo baja la vista. El espejo se agrieta y sientes que has vencido a algo.', efectos: [{ inspiracion: true }, { px: 50 }] }, fallo: { texto: 'Tu reflejo susurra tus miedos. Te tiemblan las manos.', efectos: [{ danio: '2d6', tipo: 'psíquico' }] } },
      { texto: 'Romperlo', azar: [{ peso: 1, texto: 'Se hace añicos. Detrás hay un hueco con monedas.', efectos: [{ oro: '4d10' }] }, { peso: 1, texto: 'Los fragmentos te cortan.', efectos: [{ danio: '1d8', tipo: 'cortante' }] }] },
      { texto: 'Taparlo y seguir', exito: { texto: 'Mejor no saber.', efectos: [] } },
    ],
  },
];

const TRAMPAS = [
  { titulo: 'Losa de presión', texto: 'El suelo está formado por losas irregulares. Una de ellas parece algo más alta que las demás.', salv: 'des', tipo: 'perforante', danio: '2d6', resultado: 'Unos dardos salen disparados de las paredes.' },
  { titulo: 'Cuchilla pendular', texto: 'Hay marcas de cortes recientes en las paredes del pasillo, a la altura del pecho.', salv: 'des', tipo: 'cortante', danio: '2d8', resultado: 'Una cuchilla enorme barre el pasillo.' },
  { titulo: 'Gas venenoso', texto: 'Un olor dulzón flota en el aire y hay pequeños agujeros en el techo.', salv: 'con', tipo: 'veneno', danio: '2d6', condicion: 'envenenado', resultado: 'Una nube verdosa llena la sala.' },
  { titulo: 'Foso oculto', texto: 'El polvo del suelo dibuja un rectángulo perfecto en el centro de la sala.', salv: 'des', tipo: 'contundente', danio: '2d6', resultado: 'El suelo se abre bajo tus pies.' },
  { titulo: 'Runa de fuego', texto: 'Ves restos de hollín alrededor de una inscripción en el umbral.', salv: 'des', tipo: 'fuego', danio: '3d6', resultado: 'Una explosión de llamas te envuelve.' },
];
