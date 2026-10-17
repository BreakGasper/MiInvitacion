/* ================================================================
   DATOS DE LA INVITACIÓN
   Todo el texto de la página sale de aquí. Cambia solo los valores
   entre comillas. Para ocultar una sección pon  activo: false
   ================================================================ */
window.INVITACION = {
  // Firebase (proyecto newagent-pgkvkj). Estos datos son públicos por diseño;
  // la seguridad está en database.rules.json.
  firebase: {
    apiKey: 'AIzaSyD1m5lpJzbmrMEjQn-PnAM8GXI3TyDNyOI',
    authDomain: 'newagent-pgkvkj.firebaseapp.com',
    databaseURL: 'https://newagent-pgkvkj.firebaseio.com',
    projectId: 'newagent-pgkvkj',
    storageBucket: 'newagent-pgkvkj.firebasestorage.app',
    messagingSenderId: '691343180255',
    appId: '1:691343180255:web:96b31862f0e69d4f65446a',
  },

  novios: {
    nombre1: 'Carlos',
    nombre2: 'Monse',
  },

  titulo: 'Nuestra Boda',

  // Fecha y hora de inicio (la cuenta regresiva apunta aquí).
  // fecha: AAAA-MM-DD   hora: HH:MM (24 h)   zona: -06:00 = Jalisco
  evento: {
    fecha: '2026-12-19',
    hora: '16:00',
    zonaHoraria: '-06:00',
  },

  // Canción de fondo: Virlán García - MMXX's (solo instrumental, sin voz, volumen -5 dB)
  musica: {
    activo: true,
    archivo: 'musica/mmxx-instrumental-suave.mp3',
  },

  portada: {
    foto: 'img/portada.jpg', // foto en el cuadrito (polaroid) junto al sobre
    blancoYNegro: true,
    // Texto arriba de la cuenta regresiva
    leyenda: 'Tenemos el honor de invitarte a nuestra boda',
    cita: 'Así que ya no son dos, sino una sola carne.\nPor lo tanto, lo que Dios ha unido, que no lo separe nadie.',
    referencia: 'Mateo 19:6',
  },

  // Invitación general (enlace sin ?p=): cualquiera confirma escribiendo su nombre
  general: {
    activo: false, // confirmación solo por familia (enlace personal)
    maxPersonas: 6, // máximo de personas por respuesta
  },

  pase: {
    activo: true,
    titulo: 'Estás cordialmente invitado',
  },

  historia: {
    activo: true,
    foto: 'img/historia-puente.jpg', // a color, con marco vintage: los novios de la mano en el puente
    cita: 'Entre tantos caminos en el mundo,\nel mejor siempre fue encontrarnos.',
    texto: '',
  },

  padres: {
    activo: true,
    titulo: 'Con la bendición de nuestros padres',
    grupos: [
      { etiqueta: 'Padres de la novia', nombres: ['Juan Ruelas Rodríguez', 'Marcella Michel Castro'] },
      { etiqueta: 'Padres del novio', nombres: ['Maribel Gaspar Contreras', 'Ángel Mendiola Ramos'] },
    ],
  },

  padrinos: {
    activo: true,
    titulo: 'Padrinos de velación',
    grupos: [
      { etiqueta: '', nombres: ['María Elena Fajardo Franco', '&', 'Jorge Armando García Urdiano'] },
    ],
  },

  frase: 'Acompáñanos a dar\nel "Sí" y luego\na celebrar nuestro amor',

  // ilustracion: 'iglesia' | 'recepcion' | 'civil'
  eventos: [
    {
      activo: true,
      titulo: 'Ceremonia religiosa',
      ilustracion: 'iglesia',
      imagen: 'img/parroquia.png', // logo de la parroquia (en lugar del dibujo)
      hora: '16:00',
      lugar: 'Parroquia Nuestra Señora de Guadalupe',
      direccion: 'Independencia y C. Gabriela Mistral, Centro,\n46798 El Crucero de Santa María, Jal.',
      mapa: 'https://www.google.com/maps/search/?api=1&query=Parroquia%20Nuestra%20Se%C3%B1ora%20de%20Guadalupe%2C%20Independencia%2C%20C.%20Gabriela%20Mistral%2C%20Centro%2C%2046798%20El%20Crucero%20de%20Santa%20Mar%C3%ADa%2C%20Jal.',
    },
    {
      activo: true,
      titulo: 'Recepción',
      ilustracion: 'recepcion',
      hora: '19:00',
      lugar: 'Salón de Eventos Isla Event’s',
      direccion: 'Referencia: Carretera, salida a Santa Cruz.\nSan Martín Hidalgo, Jal.',
      mapa: 'https://maps.app.goo.gl/8jzYtQt7BmXneg3J9',
    },
  ],

  // icono: iglesia | camara | arco | mesa | copas | baile | musica | luna
  itinerario: {
    activo: true,
    titulo: 'Itinerario',
    items: [
      { hora: '4:00 PM', texto: 'Ceremonia', icono: 'iglesia' },
      { texto: 'Fotos', icono: 'camara' },
      { hora: '7:00 PM', texto: 'Recepción', icono: 'arco' },
      { texto: 'Cena y\nbanquete', icono: 'mesa' },
      { texto: 'Fotos', icono: 'camara' },
      { texto: 'Brindis', icono: 'copas' },
      { texto: 'Baile\nVals', icono: 'baile' },
      { texto: 'Música', icono: 'musica' },
      { hora: '2:00 AM', texto: 'Fin de la\ncelebración', icono: 'luna' },
    ],
  },

  vestimenta: {
    activo: true,
    titulo: 'Código de vestimenta',
    tipo: 'Casual / formal',
    descripcion: '',
    coloresTitulo: 'Colorimetría sugerida:',
    colores: [
      { nombre: 'Chocolate', color: '#4b2a1f' },
      { nombre: 'Café moka', color: '#7b4a32' },
      { nombre: 'Terracota', color: '#a6452a' },
      { nombre: 'Naranja quemado', color: '#c0621f' },
      { nombre: 'Mostaza', color: '#c99a2e' },
      { nombre: 'Rosa', color: '#c9577a' },
      { nombre: 'Vino', color: '#7a1f2e' },
      { nombre: 'Ciruela', color: '#5b2352' },
      { nombre: 'Azul marino', color: '#1d2f4f' },
      { nombre: 'Azul petróleo', color: '#0e5a5f' },
      { nombre: 'Verde esmeralda', color: '#1e5b3c' },
      { nombre: 'Verde olivo', color: '#7f9152' },
      { nombre: 'Gris oxford', color: '#55585e' },
      { nombre: 'Negro', color: '#1b1b1b' },
    ],
    nota: 'Color blanco, beige y crema son exclusivos para la novia',
  },

  // PENDIENTE: fotos
  galeria: {
    activo: true,
    titulo: 'Nuestros momentos',
    fotos: ['img/galeria-cargada-2.jpg', 'img/galeria-atardecer.jpg', 'img/galeria-baile.jpg'],
  },

  regalos: {
    activo: true,
    titulo: 'Mesa de regalos',
    texto: 'Tu presencia es nuestro mejor regalo.\nSi deseas obsequiarnos algo para nuestro nuevo hogar,\nelige un regalo en cualquiera de nuestras mesas:',
    pasos: 'Elige el regalo, cómpralo en línea y llega directo a nosotros.',
    mesas: [
      {
        tienda: 'Amazon',
        logo: 'img/logo-amazon.png',
        detalle: 'Lista de bodas de Carlos & Monse',
        url: 'https://www.amazon.com.mx/wedding/guest-view/2WTG0L0MHRP7U',
      },
      {
        tienda: 'Liverpool',
        logo: 'img/logo-liverpool.png',
        detalle: 'Número de evento: 60052489',
        url: 'https://mesaderegalos.liverpool.com.mx/milistaderegalos/60052489',
      },
    ],
    transferencia: {
      activo: false,
      banco: '',
      titular: '',
      clabe: '',
    },
    sobres: 'Si lo prefieres, también puedes darnos\ntu obsequio el día de la boda.',
  },

  // PENDIENTE
  hoteles: {
    activo: false,
    titulo: 'Hospedaje',
    items: [],
  },

  // PENDIENTE
  instagram: {
    activo: false,
    hashtag: '',
    foto: 'img/foto-ejemplo.svg',
    texto: '¡Súmate a la fiesta!\nComparte tus recuerdos\nde ese día usando nuestro Hashtag',
  },

  // PENDIENTE
  video: {
    activo: false,
    titulo: 'Nuestra Historia',
    url: '',
    foto: 'img/foto-ejemplo.svg',
  },

  fotoFinal: {
    activo: true,
    foto: 'img/foto-final.jpg', // foto vertical de los novios frente a la capilla
  },

  confirmacion: {
    titulo: 'Confirmar Asistencia',
    texto: 'Celebrar nuestro amor es\nun sueño hecho realidad y\nnos encantaría contar contigo.',
    fechaLimite: '2026-11-29', // 20 días antes de la boda
    // URL de Google Apps Script (ver LEEME.md). Vacío = modo prueba.
    // true = cada confirmación llega a Netlify (Forms) y te avisa por correo.
    netlifyForms: false,
    // Google Sheets (se activa cuando la hoja tenga la pestaña "Invitados" con datos):
    // https://script.google.com/macros/s/AKfycbwc8JB-o3cKrVBtHjQFdVtvhy0-Zpl4g822rKfv-7f7DMnG8YctjnIexT2y31aC9QvMDw/exec
    googleScriptUrl: '',
  },

  contacto: {
    activo: true,
    titulo: 'Contacto',
    texto: 'Para cualquier duda sobre\nhorarios, ubicación o accesos,\nescríbenos por WhatsApp.',
    whatsapp: '523751274973',
    etiqueta: 'WhatsApp',
    mensaje: 'Hola, tengo una duda sobre la boda de Carlos y Monse',
  },

  pie: {
    foto: 'img/pie-anillos-hd.jpg',
    frase: '¡Te esperamos!',
  },
};
