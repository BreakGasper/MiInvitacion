/* ================================================================
   Backend de confirmaciones en Google Sheets — Boda Carlos & Monse
   1. Pega TODO este código en Extensiones > Apps Script y guarda.
   2. Elige la función "crearHoja" arriba y pulsa ▶ Ejecutar (una sola vez):
      crea las pestañas "Invitados" y "Resumen" con todos los pases.
   3. Implementar > Aplicación web (Ejecutar como: Yo · Acceso: Cualquier usuario).
   ================================================================ */
const HOJA = 'Invitados';
const ENCABEZADOS = ['id', 'nombre', 'personas', 'mesa', 'mensaje', 'estado', 'asistencia', 'confirmados',
  'asistentes', 'comentario', 'fechaRespuesta', 'integrantes', 'revisar'];

function doGet(e) {
  const id = String((e && e.parameter && e.parameter.id) || '').trim();
  const fila = buscar_(id);
  if (!fila) return json_({ ok: false, error: 'no_encontrado' });
  return json_({ ok: true, invitado: aInvitado_(fila.datos) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const fila = buscar_(String(d.id || '').trim());
    if (!fila) return json_({ ok: false, error: 'no_encontrado' });
    const inv = fila.datos;
    if (String(inv.estado || 'Habilitado').toLowerCase() !== 'habilitado') {
      return json_({ ok: false, error: 'pase_no_habilitado' });
    }
    const asistencia = d.asistencia === 'si' ? 'si' : 'no';
    const max = Number(inv.personas) || 1;
    const confirmados = asistencia === 'si' ? Math.min(Math.max(1, Number(d.confirmados) || 1), max) : 0;
    const asistentes = asistencia === 'si' ? String(d.asistentes || '').slice(0, 1000) : '';
    const comentario = String(d.comentario || '').slice(0, 500);
    const fecha = new Date();

    const col = fila.columnas;
    const hoja = fila.hoja;
    hoja.getRange(fila.num, col.asistencia + 1).setValue(asistencia);
    hoja.getRange(fila.num, col.confirmados + 1).setValue(confirmados);
    hoja.getRange(fila.num, col.asistentes + 1).setValue(asistentes);
    hoja.getRange(fila.num, col.comentario + 1).setValue(comentario);
    hoja.getRange(fila.num, col.fechaRespuesta + 1).setValue(fecha);

    Object.assign(inv, { asistencia, confirmados, asistentes, comentario, fechaRespuesta: fecha });
    return json_({ ok: true, invitado: aInvitado_(inv) });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function buscar_(id) {
  if (!id) return null;
  const hoja = SpreadsheetApp.getActive().getSheetByName(HOJA);
  if (!hoja) return null;
  const valores = hoja.getDataRange().getValues();
  const encabezados = valores[0].map((h) => String(h).trim());
  const columnas = {};
  encabezados.forEach((h, i) => { columnas[h] = i; });
  for (let r = 1; r < valores.length; r++) {
    if (String(valores[r][columnas.id]).trim() === id) {
      const datos = {};
      encabezados.forEach((h, i) => { datos[h] = valores[r][i]; });
      return { hoja, num: r + 1, columnas, datos };
    }
  }
  return null;
}

function aInvitado_(f) {
  const resp = f.asistencia
    ? {
        asistencia: f.asistencia,
        confirmados: Number(f.confirmados) || 0,
        asistentes: f.asistentes || '',
        comentario: f.comentario || '',
        fecha: f.fechaRespuesta ? new Date(f.fechaRespuesta).toISOString() : new Date().toISOString(),
      }
    : null;
  return {
    id: String(f.id),
    nombre: f.nombre,
    personas: Number(f.personas) || 1,
    mesa: f.mesa,
    mensaje: f.mensaje || '',
    estado: f.estado || 'Habilitado',
    respuesta: resp,
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ================================================================
   crearHoja: ejecútala UNA vez desde el editor (▶ Ejecutar).
   No borra nada si la pestaña Invitados ya tiene datos.
   ================================================================ */
function crearHoja() {
  const ss = SpreadsheetApp.getActive();
  let hoja = ss.getSheetByName(HOJA);
  if (hoja && hoja.getLastRow() > 1) {
    throw new Error('La pestaña "Invitados" ya tiene datos. No se modificó nada.');
  }
  if (!hoja) hoja = ss.insertSheet(HOJA);
  hoja.clear();

  const n = PASES.length;
  const ancho = ENCABEZADOS.length;
  hoja.getRange(2, 1, n, 1).setNumberFormat('@'); // los id siempre como texto
  hoja.getRange(1, 1, 1, ancho).setValues([ENCABEZADOS])
    .setFontWeight('bold').setBackground('#8c847d').setFontColor('#ffffff').setHorizontalAlignment('center');
  hoja.getRange(2, 1, n, ancho).setValues(PASES.map((p) => [p[0], p[1], p[2], p[3], '', 'Habilitado', '', '', '', '', '', p[4], p[5]]));
  hoja.getRange(2, 7, n, 5).setBackground('#f4f1ec'); // columnas que llena la invitación
  hoja.setFrozenRows(1);
  hoja.setFrozenColumns(2);
  [10, 40, 9, 6, 25, 12, 11, 12, 40, 35, 16, 60, 40].forEach((w, i) => hoja.setColumnWidth(i + 1, w * 7));

  const datos = hoja.getRange(2, 1, n + 200, ancho);
  hoja.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="si"').setBackground('#e3f4e6').setRanges([datos]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="no"').setBackground('#f6e3e1').setRanges([datos]).build(),
  ]);
  hoja.getRange(2, 6, n + 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Habilitado', 'Cancelado'], true).build());
  hoja.getRange(1, 1, n + 1, ancho).createFilter();

  crearResumen_(ss);

  ss.getSheets().forEach((s) => {
    if (s.getName() !== HOJA && s.getName() !== 'Resumen' && s.getLastRow() === 0) ss.deleteSheet(s);
  });
  ss.toast(`Listo: ${n} pases cargados.`, 'Invitación');
}

function crearResumen_(ss) {
  const rs = ss.getSheetByName('Resumen') || ss.insertSheet('Resumen', 0);
  rs.clear();
  const R = (c) => `Invitados!$${c}$2:$${c}$1000`;
  rs.getRange('A1').setValue('Boda Carlos & Monse · Confirmaciones').setFontSize(14).setFontWeight('bold');
  rs.getRange('A3:A9').setValues([['Pases enviados'], ['Personas invitadas'], ['Pases que asistirán'],
    ['Pases que no asistirán'], ['Pases sin respuesta'], ['Personas confirmadas'], ['Lugares liberados']]);
  rs.getRange('B3:B9').setFormulas([
    [`=COUNTA(${R('A')})`],
    [`=SUM(${R('C')})`],
    [`=COUNTIF(${R('G')},"si")`],
    [`=COUNTIF(${R('G')},"no")`],
    ['=B3-B5-B6'],
    [`=SUM(${R('H')})`],
    [`=SUMIF(${R('G')},"si",${R('C')})-B8+SUMIF(${R('G')},"no",${R('C')})`],
  ]);
  rs.getRange('B3:B9').setFontWeight('bold').setHorizontalAlignment('center');

  rs.getRange('D2').setValue('Por mesa').setFontWeight('bold');
  rs.getRange('D3:G3').setValues([['Mesa', 'Invitados', 'Confirmados', 'Pases sin respuesta']])
    .setFontWeight('bold').setBackground('#8c847d').setFontColor('#ffffff').setHorizontalAlignment('center');
  const mesas = [...new Set(PASES.map((p) => p[3]))].sort((a, b) => a - b);
  rs.getRange(4, 4, mesas.length, 1).setValues(mesas.map((m) => [m]));
  rs.getRange(4, 5, mesas.length, 3).setFormulas(mesas.map((m, i) => {
    const f = i + 4;
    return [`=SUMIF(${R('D')},D${f},${R('C')})`, `=SUMIF(${R('D')},D${f},${R('H')})`,
      `=COUNTIFS(${R('D')},D${f},${R('G')},"")`];
  }));
  rs.getRange(4, 4, mesas.length, 4).setHorizontalAlignment('center');

  rs.getRange('A12:A17').setValues([
    ['Cómo usar esta hoja:'],
    ['• En "Invitados" solo edita: nombre, personas, mesa, mensaje y estado.'],
    ['• Las columnas sombreadas las llena la invitación sola.'],
    ['• No cambies los id: son el enlace personal de cada pase.'],
    ['• Para cancelar un pase cambia su estado a "Cancelado".'],
    ['• Verde = asistirá · Rojo = no asistirá · Sin color = sin respuesta.'],
  ]).setFontColor('#5d5854');
  rs.getRange('A12').setFontWeight('bold');
  rs.setColumnWidth(1, 190);
}

// [id, nombre del pase, personas, mesa, integrantes, revisar]
// === PASES (generado por herramientas/generar_invitados.py) ===
const PASES = [
  ["baf576fa", "Maribel Gaspar Contreras y Chato", 2, 1, "Maribel Gaspar Contreras, Chato", "Revisar: ¿Chato va con Maribel?"],
  ["8ac8ee85", "Edwin Mendiola Gaspar y Julissa Arreola Gaspar", 2, 1, "Edwin Mendiola Gaspar, Julissa Arreola Gaspar", "Revisar: ¿son pareja?"],
  ["ba1a26b7", "Chon", 1, 1, "Chon", ""],
  ["b2c195aa", "Karol y Oscar Cardoso Arreola", 2, 1, "Karol Cardoso Arreola, Oscar Cardoso Arreola", ""],
  ["c8cdeba7", "Ángel Mendiola Gaspar y Vero Robles", 3, 1, "Ángel Mendiola Gaspar, Vero Robles, Liam Mendiola Robles", ""],
  ["58591522", "Nena Robles y Sergio", 2, 1, "Nena Robles, Sergio", "Revisar: ¿son pareja?"],
  ["ece4ef1d", "Familia Ruelas Michel", 5, 2, "Juan Ruelas Rodríguez, Margarita Marcella Michel Castro, Emiliano Ruelas Michel, Estefanía Ruelas Michel, Juan Ruelas Michel", "Padres de la novia y hermanos"],
  ["6dae60ef", "Familia Michel Campos", 3, 2, "Eleuterio Michel Castro, Graciela Campos Ayala, Maggie Michel Campos", ""],
  ["00309f4c", "Catalina Rodríguez González", 1, 2, "Catalina Rodríguez González", ""],
  ["91ba188a", "Familia Ruelas Guerrero", 3, 2, "Felipe Ruelas Rodríguez, Sandra Ana Guerrero, Felipe de Jesús Ruelas Guerrero", ""],
  ["6c5195b1", "Familia Michel Fernández", 6, 3, "Antonio Michel Castro, Oralia Fernández, Hugo Michel Fernández, Toño Michel Fernández, Maximiliano Michel Fernández, Juan Pablo Michel Fernández", "Revisar: ¿qué significa el verde en la lista?"],
  ["142d5330", "Familia Aguilar Michel", 3, 3, "Teresa Fabiola Michel Castro, Teresa Margarita Aguilar Michel, Juan Diego Aguilar Michel", ""],
  ["ff2582c2", "Tío Noé", 1, 3, "Tío Noé", ""],
  ["294cbfb9", "Valeria Ramos y novio", 2, 4, "Valeria Ramos, Novio de Valeria", ""],
  ["73563673", "Willy y familia", 3, 4, "Willy, Esposa de Willy, Hijo de Willy", ""],
  ["206a9492", "Chuy y Eva", 2, 4, "Chuy, Eva", "Revisar: ¿son pareja?"],
  ["49e4a54c", "Rafael", 1, 4, "Rafael", ""],
  ["6fe1798f", "Abuela Socorro", 1, 4, "Abuela Socorro", ""],
  ["10df38b8", "Sandra Ramos", 1, 4, "Sandra Ramos", ""],
  ["7ef60a7a", "Tía Chuy", 1, 5, "Tía Chuy", ""],
  ["9f2880df", "Dalia y familia", 3, 5, "Dalia, Esposo de Dalia, Hija de Dalia", ""],
  ["f7752785", "Tío Jaime y esposa", 2, 6, "Tío Jaime, Esposa de Tío Jaime", ""],
  ["62ad531d", "Carmen Gaspar Contreras", 1, 6, "Carmen Gaspar Contreras", ""],
  ["6ed42069", "Tía Tere y José Luis", 2, 7, "Tía Tere, José Luis", "Revisar: ¿son pareja?"],
  ["93a9bed0", "César y familia", 4, 7, "César, Esposa de César, Hija de César, Hijo de César", ""],
  ["3a1837ae", "David y familia", 4, 7, "David, Esposa de David, Hijo de David, Hija de David", ""],
  ["d6b958a0", "Alma y familia", 3, 8, "Alma (La Gorda), Esposo de Alma, Hija 2 de Alma", ""],
  ["31b74ee7", "Abril y esposa", 2, 8, "Abril, Esposa de Abril", ""],
  ["791444e3", "Citlaly y familia", 3, 9, "Citlaly (GDL), Joazin, Constanza", ""],
  ["524e1332", "Paulina Zárate y Juan", 2, 9, "Paulina Zárate, Juan (novio de Paulina)", ""],
  ["798578a3", "Papá de Paulina", 1, 9, "Papá de Paulina", ""],
  ["dc166d62", "Glenda", 1, 10, "Glenda", ""],
  ["54331660", "Sammy", 1, 10, "Sammy", ""],
  ["c281fb13", "Emily y familia", 4, 10, "Emily, Esposo de Emily, Hija 1 de Emily, Hija 2 de Emily", ""],
  ["cb671509", "Joana y familia", 3, 10, "Joana, Hija de Joana, Hijo de Joana", ""],
  ["e788f663", "Carlos Alberto", 1, 10, "Carlos Alberto", ""],
  ["2458db5d", "Alicia Gaspar", 1, 11, "Alicia Gaspar", ""],
  ["1788952e", "Mily Pérez Gaspar y familia", 3, 11, "Mily Pérez Gaspar, Hijo 1 de Mily, Hijo 2 de Mily", ""],
  ["f4eee17f", "Bibiana Pérez y familia", 3, 11, "Bibiana Pérez, Hijo 1 de Bibiana, Hijo 2 de Bibiana", ""],
  ["7f4acf52", "Daena", 1, 11, "Daena", ""],
  ["960608cd", "Ramsés Ruelas", 1, 11, "Ramsés Ruelas", ""],
  ["8240a563", "Moisés Ruelas", 1, 11, "Moisés Ruelas", ""],
  ["d778857f", "Nicolasa Ruelas Rodríguez y Rubén Vera Nuño", 2, 12, "Nicolasa Ruelas Rodríguez, Rubén Vera Nuño", ""],
  ["0d8f0c47", "Gris Vera Ruelas y Ainara", 2, 12, "Gris Vera Ruelas, Ainara Yareth Chacón Vera", ""],
  ["746282fa", "Gildardo Buenrostro y Rosa Elena Ramírez Ruelas", 2, 12, "Gildardo Buenrostro, Rosa Elena Ramírez Ruelas", "Revisar: ¿son pareja?"],
  ["4f6e5c7c", "Carlos, Natalia y Sofía", 3, 12, "Carlos, Natalia, Sofía", ""],
  ["24b2f32b", "César Gutiérrez", 1, 13, "César Gutiérrez", ""],
  ["3f1c7ca3", "Pedro Barajas", 1, 13, "Pedro Barajas", ""],
  ["066cc13c", "Guillermo Ramírez y esposa", 2, 13, "Guillermo Ramírez, Esposa de Guillermo", ""],
  ["dbc33175", "Carina Ramírez Ruelas", 1, 13, "Carina Ramírez Ruelas", ""],
  ["e19a1cb6", "Aneth López Carrillo y familia", 5, 13, "Aneth López Carrillo, Novio de Aneth, Hermana de Aneth, Hermano de Aneth, Hermana de Aneth", ""],
  ["d29f7356", "Familia Ruelas Ramírez", 4, 14, "Humberto Ruelas Rodríguez, Graciela Ramírez, Candelaria Ruelas Ramírez, Eduardo Ruelas Ramírez", ""],
  ["f219a0dd", "Jacquelin Ruelas Ramírez y familia", 4, 14, "Jacquelin Ruelas Ramírez, Esposo de Jacquelin, Hijo 1 de Jacquelin, Hijo 2 de Jacquelin", ""],
  ["0feb7340", "Rocío Gálvez", 1, 15, "Rocío Gálvez", ""],
  ["86675020", "Concepción y familia", 3, 15, "Concepción, Hijo de Concepción, Hija de Concepción", ""],
  ["81e7b5d7", "Delia Ruelas", 1, 15, "Delia Ruelas", ""],
  ["7644d471", "Cecilia Mares de la Cruz y esposo", 2, 15, "Cecilia Mares de la Cruz, Esposo de Cecilia", ""],
  ["1132d036", "Bessie Aleth Cortez", 1, 15, "Bessie Aleth Cortez", ""],
  ["07e1d4e8", "Diana Cruz y novio", 2, 15, "Diana Cruz, Novio de Diana", ""],
  ["04490936", "Familia Martínez Ruelas", 3, 16, "Angélica Ruelas Aguilar, Moisés Martínez Pacheco, Moisés Martínez Ruelas", ""],
  ["6d84b091", "Isis Martínez Ruelas y esposo", 2, 16, "Isis Martínez Ruelas, Esposo de Isis", ""],
  ["bd625987", "Nataly Martínez Ruelas y esposo", 2, 16, "Nataly Martínez Ruelas, Esposo de Nataly", ""],
  ["79f75318", "Nefertiti Martínez Ruelas y esposo", 2, 16, "Nefertiti Martínez Ruelas, Esposo de Nefertiti", ""],
  ["ada6bddc", "María Fernanda Bonifacio y familia", 6, 17, "María Fernanda Bonifacio, Hermana, Hermano, Cuñada, Papá, Mamá", ""],
  ["1ac3ebb5", "Carlos Robles Ramos y Raquel", 2, 18, "Carlos Robles Ramos, Raquel (madrina)", ""],
  ["f08727f8", "Hijo 1 de Raquel y esposo", 2, 18, "Hijo 1, Esposo de Hijo 1", "Revisar: falta el nombre"],
  ["6b66ffea", "Hija 2 de Raquel y familia", 3, 18, "Hija 2, Esposo de Hija 2, Hijo de Hija 2", "Revisar: falta el nombre"],
  ["90d224e7", "Hija 3 de Raquel y familia", 3, 18, "Hija 3, Esposo de Hija 3, Hija de Hija 3", "Revisar: falta el nombre"],
  ["646cb352", "Yessy Pacheco y familia", 10, 19, "Yessy Pacheco, Paty Pacheco, Hermana de Yessy, Niño, Niño, Niño, Niño, Niño, Michel, Arleth", "Revisar: ¿un solo pase para los 10?"],
  ["3035528b", "Esmeralda Sención y familia", 3, 20, "Esmeralda Sención, Juan (esposo), Hijo de Esmeralda", ""],
  ["110293e1", "Liliana Olmos y acompañante", 2, 20, "Liliana Olmos, Acompañante", ""],
  ["f185e2f3", "Engracia Larios y Balvino", 2, 21, "Engracia Larios, Balvino", "Revisar: ¿son pareja?"],
  ["0f304d19", "Laura y familia", 4, 21, "Laura, Esposo de Laura, Hijo de Laura, Hija de Laura", ""],
  ["fb9d2028", "Fátima y familia", 4, 21, "Fátima, Hijo de Fátima, Hija de Fátima, Hijo de Fátima", ""],
  ["a6caac17", "Candy y familia", 3, 22, "Candy, Esposo de Candy, Hijo de Candy", ""],
  ["e20170af", "Toño y familia", 3, 22, "Toño, Esposa de Toño, Hijo de Toño", ""],
  ["2092d08b", "Primo y familia", 3, 22, "Primo, Esposa, Hija", "Revisar: falta el nombre del primo"],
  ["72641ddb", "Norma y familia", 5, 23, "Norma, Esposo de Norma, Hijo 1, Hijo 2, Hijo 3", "Revisar: Norma aparece en mesa 22 y su familia en la 23"],
  ["0e75b3fb", "Vero y familia", 5, 23, "Vero, Esposo de Vero, Hijo 1, Hijo 2, Hijo 3", ""],
  ["3ad7c6b4", "Rafael Castrejón Galeana y esposa", 2, 24, "Rafael Castrejón Galeana, Esposa de Rafael", ""],
  ["6a3fa57c", "Julio Martín del Campo y papás", 3, 24, "Julio Martín del Campo, Papá de Julio, Mamá de Julio", ""],
  ["bfb59c77", "Pablo Mendoza Arrandidez y esposa", 2, 24, "Pablo Mendoza Arrandidez, Esposa de Pablo", ""],
  ["9cd2898d", "Luis Galván y novia", 2, 24, "Luis Galván, Novia de Luis", ""],
  ["7d209599", "Tavito y Juan", 2, 25, "Tavito, Juan", "Revisar: ¿el \"4\" significa 4 personas?"],
  ["a1eaa422", "Toño", 1, 25, "Toño", "Revisar: ¿el \"4\" significa 4 personas?"],
  ["971d86ca", "Diego", 1, 25, "Diego", ""],
];
// === FIN PASES ===
