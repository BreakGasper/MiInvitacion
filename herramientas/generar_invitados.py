"""Genera js/invitados.js, invitados.csv e invitados.xlsx a partir de la lista de pases.

Uso:  python herramientas/generar_invitados.py
Los IDs ya asignados se conservan (se guardan en herramientas/ids.json),
así los enlaces que ya enviaste siguen funcionando.
"""
import csv
import json
import secrets
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
URL_BASE = 'https://miinva-pgkvkj-d01c0.web.app/?p='

# (mesa, nombre que aparece en el pase, integrantes, nota para revisar)
PASES = [
    # MESA 1
    (1, 'Maribel Gaspar Contreras y Chato', ['Maribel Gaspar Contreras', 'Chato'], 'Revisar: ¿Chato va con Maribel?'),
    (1, 'Edwin Mendiola Gaspar y Julissa Arreola Gaspar', ['Edwin Mendiola Gaspar', 'Julissa Arreola Gaspar'], 'Revisar: ¿son pareja?'),
    (1, 'Chon', ['Chon'], ''),
    (1, 'Karol y Oscar Cardoso Arreola', ['Karol Cardoso Arreola', 'Oscar Cardoso Arreola'], ''),
    (1, 'Ángel Mendiola Gaspar y Vero Robles', ['Ángel Mendiola Gaspar', 'Vero Robles', 'Liam Mendiola Robles'], ''),
    (1, 'Nena Robles y Sergio', ['Nena Robles', 'Sergio'], 'Revisar: ¿son pareja?'),
    # MESA 2
    (2, 'Familia Ruelas Michel', ['Juan Ruelas Rodríguez', 'Margarita Marcella Michel Castro', 'Emiliano Ruelas Michel', 'Estefanía Ruelas Michel', 'Juan Ruelas Michel'], 'Padres de la novia y hermanos'),
    (2, 'Familia Michel Campos', ['Eleuterio Michel Castro', 'Graciela Campos Ayala', 'Maggie Michel Campos'], ''),
    (2, 'Catalina Rodríguez González', ['Catalina Rodríguez González'], ''),
    (2, 'Familia Ruelas Guerrero', ['Felipe Ruelas Rodríguez', 'Sandra Ana Guerrero', 'Felipe de Jesús Ruelas Guerrero'], ''),
    # MESA 3
    (3, 'Familia Michel Fernández', ['Antonio Michel Castro', 'Oralia Fernández', 'Hugo Michel Fernández', 'Toño Michel Fernández', 'Maximiliano Michel Fernández', 'Juan Pablo Michel Fernández'], 'Revisar: ¿qué significa el verde en la lista?'),
    (3, 'Familia Aguilar Michel', ['Teresa Fabiola Michel Castro', 'Teresa Margarita Aguilar Michel', 'Juan Diego Aguilar Michel'], ''),
    (3, 'Tío Noé', ['Tío Noé'], ''),
    # MESA 4
    (4, 'Valeria Ramos y novio', ['Valeria Ramos', 'Novio de Valeria'], ''),
    (4, 'Willy y familia', ['Willy', 'Esposa de Willy', 'Hijo de Willy'], ''),
    (4, 'Chuy y Eva', ['Chuy', 'Eva'], 'Revisar: ¿son pareja?'),
    (4, 'Rafael', ['Rafael'], ''),
    (4, 'Abuela Socorro', ['Abuela Socorro'], ''),
    (4, 'Sandra Ramos', ['Sandra Ramos'], ''),
    # MESA 5
    (5, 'Tía Chuy', ['Tía Chuy'], ''),
    (5, 'Dalia y familia', ['Dalia', 'Esposo de Dalia', 'Hija de Dalia'], ''),
    # MESA 6
    (6, 'Tío Jaime y esposa', ['Tío Jaime', 'Esposa de Tío Jaime'], ''),
    (6, 'Carmen Gaspar Contreras', ['Carmen Gaspar Contreras'], ''),
    # MESA 7
    (7, 'Tía Tere y José Luis', ['Tía Tere', 'José Luis'], 'Revisar: ¿son pareja?'),
    (7, 'César y familia', ['César', 'Esposa de César', 'Hija de César', 'Hijo de César'], ''),
    (7, 'David y familia', ['David', 'Esposa de David', 'Hijo de David', 'Hija de David'], ''),
    # MESA 8
    (8, 'Alma y familia', ['Alma (La Gorda)', 'Esposo de Alma', 'Hija 2 de Alma'], ''),
    (8, 'Abril y esposa', ['Abril', 'Esposa de Abril'], ''),
    # MESA 9
    (9, 'Citlaly y familia', ['Citlaly (GDL)', 'Joazin', 'Constanza'], ''),
    (9, 'Paulina Zárate y Juan', ['Paulina Zárate', 'Juan (novio de Paulina)'], ''),
    (9, 'Papá de Paulina', ['Papá de Paulina'], ''),
    # MESA 10
    (10, 'Glenda', ['Glenda'], ''),
    (10, 'Sammy', ['Sammy'], ''),
    (10, 'Emily y familia', ['Emily', 'Esposo de Emily', 'Hija 1 de Emily', 'Hija 2 de Emily'], ''),
    (10, 'Joana y familia', ['Joana', 'Hija de Joana', 'Hijo de Joana'], ''),
    (10, 'Carlos Alberto', ['Carlos Alberto'], ''),
    # MESA 11
    (11, 'Alicia Gaspar', ['Alicia Gaspar'], ''),
    (11, 'Mily Pérez Gaspar y familia', ['Mily Pérez Gaspar', 'Hijo 1 de Mily', 'Hijo 2 de Mily'], ''),
    (11, 'Bibiana Pérez y familia', ['Bibiana Pérez', 'Hijo 1 de Bibiana', 'Hijo 2 de Bibiana'], ''),
    (11, 'Daena', ['Daena'], ''),
    (11, 'Ramsés Ruelas', ['Ramsés Ruelas'], ''),
    (11, 'Moisés Ruelas', ['Moisés Ruelas'], ''),
    # MESA 12
    (12, 'Nicolasa Ruelas Rodríguez y Rubén Vera Nuño', ['Nicolasa Ruelas Rodríguez', 'Rubén Vera Nuño'], ''),
    (12, 'Gris Vera Ruelas y Ainara', ['Gris Vera Ruelas', 'Ainara Yareth Chacón Vera'], ''),
    (12, 'Gildardo Buenrostro y Rosa Elena Ramírez Ruelas', ['Gildardo Buenrostro', 'Rosa Elena Ramírez Ruelas'], 'Revisar: ¿son pareja?'),
    (12, 'Carlos, Natalia y Sofía', ['Carlos', 'Natalia', 'Sofía'], ''),
    # MESA 13
    (13, 'César Gutiérrez', ['César Gutiérrez'], ''),
    (13, 'Pedro Barajas', ['Pedro Barajas'], ''),
    (13, 'Guillermo Ramírez y esposa', ['Guillermo Ramírez', 'Esposa de Guillermo'], ''),
    (13, 'Carina Ramírez Ruelas', ['Carina Ramírez Ruelas'], ''),
    (13, 'Aneth López Carrillo y familia', ['Aneth López Carrillo', 'Novio de Aneth', 'Hermana de Aneth', 'Hermano de Aneth', 'Hermana de Aneth'], ''),
    # MESA 14
    (14, 'Familia Ruelas Ramírez', ['Humberto Ruelas Rodríguez', 'Graciela Ramírez', 'Candelaria Ruelas Ramírez', 'Eduardo Ruelas Ramírez'], ''),
    (14, 'Jacquelin Ruelas Ramírez y familia', ['Jacquelin Ruelas Ramírez', 'Esposo de Jacquelin', 'Hijo 1 de Jacquelin', 'Hijo 2 de Jacquelin'], ''),
    # MESA 15
    (15, 'Rocío Gálvez', ['Rocío Gálvez'], ''),
    (15, 'Concepción y familia', ['Concepción', 'Hijo de Concepción', 'Hija de Concepción'], ''),
    (15, 'Delia Ruelas', ['Delia Ruelas'], ''),
    (15, 'Cecilia Mares de la Cruz y esposo', ['Cecilia Mares de la Cruz', 'Esposo de Cecilia'], ''),
    (15, 'Bessie Aleth Cortez', ['Bessie Aleth Cortez'], ''),
    (15, 'Diana Cruz y novio', ['Diana Cruz', 'Novio de Diana'], ''),
    # MESA 16
    (16, 'Familia Martínez Ruelas', ['Angélica Ruelas Aguilar', 'Moisés Martínez Pacheco', 'Moisés Martínez Ruelas'], ''),
    (16, 'Isis Martínez Ruelas y esposo', ['Isis Martínez Ruelas', 'Esposo de Isis'], ''),
    (16, 'Nataly Martínez Ruelas y esposo', ['Nataly Martínez Ruelas', 'Esposo de Nataly'], ''),
    (16, 'Nefertiti Martínez Ruelas y esposo', ['Nefertiti Martínez Ruelas', 'Esposo de Nefertiti'], ''),
    # MESA 17
    (17, 'María Fernanda Bonifacio y familia', ['María Fernanda Bonifacio', 'Hermana', 'Hermano', 'Cuñada', 'Papá', 'Mamá'], ''),
    # MESA 18
    (18, 'Carlos Robles Ramos y Raquel', ['Carlos Robles Ramos', 'Raquel (madrina)'], ''),
    (18, 'Hijo 1 de Raquel y esposo', ['Hijo 1', 'Esposo de Hijo 1'], 'Revisar: falta el nombre'),
    (18, 'Hija 2 de Raquel y familia', ['Hija 2', 'Esposo de Hija 2', 'Hijo de Hija 2'], 'Revisar: falta el nombre'),
    (18, 'Hija 3 de Raquel y familia', ['Hija 3', 'Esposo de Hija 3', 'Hija de Hija 3'], 'Revisar: falta el nombre'),
    # MESA 19
    (19, 'Yessy Pacheco y familia', ['Yessy Pacheco', 'Paty Pacheco', 'Hermana de Yessy', 'Niño', 'Niño', 'Niño', 'Niño', 'Niño', 'Michel', 'Arleth'], 'Revisar: ¿un solo pase para los 10?'),
    # MESA 20
    (20, 'Esmeralda Sención y familia', ['Esmeralda Sención', 'Juan (esposo)', 'Hijo de Esmeralda'], ''),
    (20, 'Liliana Olmos y acompañante', ['Liliana Olmos', 'Acompañante'], ''),
    # MESA 21
    (21, 'Engracia Larios y Balvino', ['Engracia Larios', 'Balvino'], 'Revisar: ¿son pareja?'),
    (21, 'Laura y familia', ['Laura', 'Esposo de Laura', 'Hijo de Laura', 'Hija de Laura'], ''),
    (21, 'Fátima y familia', ['Fátima', 'Hijo de Fátima', 'Hija de Fátima', 'Hijo de Fátima'], ''),
    # MESA 22
    (22, 'Candy y familia', ['Candy', 'Esposo de Candy', 'Hijo de Candy'], ''),
    (22, 'Toño y familia', ['Toño', 'Esposa de Toño', 'Hijo de Toño'], ''),
    (22, 'Primo y familia', ['Primo', 'Esposa', 'Hija'], 'Revisar: falta el nombre del primo'),
    # MESA 23
    (23, 'Norma y familia', ['Norma', 'Esposo de Norma', 'Hijo 1', 'Hijo 2', 'Hijo 3'], 'Revisar: Norma aparece en mesa 22 y su familia en la 23'),
    (23, 'Vero y familia', ['Vero', 'Esposo de Vero', 'Hijo 1', 'Hijo 2', 'Hijo 3'], ''),
    # MESA 24
    (24, 'Rafael Castrejón Galeana y esposa', ['Rafael Castrejón Galeana', 'Esposa de Rafael'], ''),
    (24, 'Julio Martín del Campo y papás', ['Julio Martín del Campo', 'Papá de Julio', 'Mamá de Julio'], ''),
    (24, 'Pablo Mendoza Arrandidez y esposa', ['Pablo Mendoza Arrandidez', 'Esposa de Pablo'], ''),
    (24, 'Luis Galván y novia', ['Luis Galván', 'Novia de Luis'], ''),
    # MESA 25
    (25, 'Tavito y Juan', ['Tavito', 'Juan'], 'Revisar: ¿el "4" significa 4 personas?'),
    (25, 'Toño', ['Toño'], 'Revisar: ¿el "4" significa 4 personas?'),
    (25, 'Diego', ['Diego'], ''),
]


def generar_xlsx(filas):
    from openpyxl import Workbook
    from openpyxl.formatting.rule import FormulaRule
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.worksheet.datavalidation import DataValidation

    fuente = Font(name='Arial', size=10)
    negrita = Font(name='Arial', size=10, bold=True, color='FFFFFF')
    titulo = Font(name='Arial', size=14, bold=True, color='4A4541')
    relleno_enc = PatternFill('solid', fgColor='8C847D')
    relleno_auto = PatternFill('solid', fgColor='F4F1EC')

    wb = Workbook()
    ws = wb.active
    ws.title = 'Invitados'
    columnas = list(filas[0].keys())
    anchos = {'id': 11, 'nombre': 42, 'personas': 10, 'mesa': 7, 'mensaje': 30, 'estado': 12,
              'asistencia': 11, 'confirmados': 12, 'asistentes': 45, 'comentario': 40,
              'fechaRespuesta': 18, 'integrantes': 70, 'revisar': 45, 'enlace': 45}
    ws.append(columnas)
    for c, nombre in enumerate(columnas, 1):
        celda = ws.cell(row=1, column=c)
        celda.font = negrita
        celda.fill = relleno_enc
        celda.alignment = Alignment(horizontal='center', vertical='center')
        ws.column_dimensions[celda.column_letter].width = anchos.get(nombre, 14)
    for r in filas:
        ws.append([r[k] if r[k] != '' else None for k in columnas])
    ultima = ws.max_row
    for fila in ws.iter_rows(min_row=2, max_row=ultima):
        for celda in fila:
            celda.font = fuente
            celda.alignment = Alignment(vertical='top', wrap_text=columnas[celda.column - 1] in ('integrantes', 'asistentes', 'comentario'))
            if columnas[celda.column - 1] in ('asistencia', 'confirmados', 'asistentes', 'comentario', 'fechaRespuesta'):
                celda.fill = relleno_auto
    ws.freeze_panes = 'C2'
    ws.auto_filter.ref = f'A1:{ws.cell(row=1, column=len(columnas)).column_letter}{ultima}'

    col = {k: ws.cell(row=1, column=i + 1).column_letter for i, k in enumerate(columnas)}
    rango = f'A2:{col["enlace"]}{ultima}'
    ws.conditional_formatting.add(rango, FormulaRule(formula=[f'${col["asistencia"]}2="si"'], fill=PatternFill('solid', fgColor='E3F4E6')))
    ws.conditional_formatting.add(rango, FormulaRule(formula=[f'${col["asistencia"]}2="no"'], fill=PatternFill('solid', fgColor='F6E3E1')))
    dv = DataValidation(type='list', formula1='"Habilitado,Cancelado"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f'{col["estado"]}2:{col["estado"]}{ultima + 200}')

    # ---------- Resumen (fórmulas) ----------
    rs = wb.create_sheet('Resumen', 0)
    N = 1000
    C_ = lambda k: f"Invitados!${col[k]}$2:${col[k]}${N}"
    rs['A1'] = 'Boda Carlos & Monse · Confirmaciones'
    rs['A1'].font = titulo
    datos = [
        ('Pases enviados', f'=COUNTA({C_("id")})'),
        ('Personas invitadas', f'=SUM({C_("personas")})'),
        ('Pases que asistirán', f'=COUNTIF({C_("asistencia")},"si")'),
        ('Pases que no asistirán', f'=COUNTIF({C_("asistencia")},"no")'),
        ('Pases sin respuesta', '=B3-B5-B6'),
        ('Personas confirmadas', f'=SUM({C_("confirmados")})'),
        ('Lugares liberados', f'=SUMIF({C_("asistencia")},"si",{C_("personas")})-B8+SUMIF({C_("asistencia")},"no",{C_("personas")})'),
    ]
    for i, (etq, f) in enumerate(datos, start=3):
        rs.cell(row=i, column=1, value=etq).font = fuente
        c = rs.cell(row=i, column=2, value=f)
        c.font = Font(name='Arial', size=11, bold=True)
        c.alignment = Alignment(horizontal='center')

    rs['D2'] = 'Por mesa'
    rs['D2'].font = Font(name='Arial', size=11, bold=True)
    for j, enc in enumerate(['Mesa', 'Invitados', 'Confirmados', 'Pases sin respuesta'], start=4):
        c = rs.cell(row=3, column=j, value=enc)
        c.font = negrita
        c.fill = relleno_enc
        c.alignment = Alignment(horizontal='center')
    mesas = sorted({r['mesa'] for r in filas})
    for k, m in enumerate(mesas, start=4):
        rs.cell(row=k, column=4, value=m)
        rs.cell(row=k, column=5, value=f'=SUMIF({C_("mesa")},D{k},{C_("personas")})')
        rs.cell(row=k, column=6, value=f'=SUMIF({C_("mesa")},D{k},{C_("confirmados")})')
        rs.cell(row=k, column=7, value=f'=COUNTIFS({C_("mesa")},D{k},{C_("asistencia")},"")')
        for j in range(4, 8):
            rs.cell(row=k, column=j).font = fuente
            rs.cell(row=k, column=j).alignment = Alignment(horizontal='center')

    fila_nota = 12
    notas = [
        'Cómo usar esta hoja:',
        '• En "Invitados" solo edita: nombre, personas, mesa, mensaje y estado.',
        '• Las columnas sombreadas (asistencia, confirmados, asistentes, comentario, fechaRespuesta) las llena la invitación sola.',
        '• No cambies los id: son el enlace personal de cada pase.',
        '• Para cancelar un pase cambia su estado a "Cancelado".',
        '• Verde = asistirá · Rojo = no asistirá · Sin color = sin respuesta.',
    ]
    for i, t in enumerate(notas):
        c = rs.cell(row=fila_nota + i, column=1, value=t)
        c.font = Font(name='Arial', size=10, bold=(i == 0), color='5D5854')
    rs.column_dimensions['A'].width = 26
    rs.column_dimensions['B'].width = 12
    rs.column_dimensions['C'].width = 3
    for letra, ancho in zip('DEFG', (8, 12, 13, 20)):
        rs.column_dimensions[letra].width = ancho

    wb.save(RAIZ / 'invitados.xlsx')


NL = chr(10)


def escribir_gs(filas):
    ruta = RAIZ / 'google-apps-script.gs'
    texto = ruta.read_text(encoding='utf-8')
    ini = texto.index('// === PASES')
    ini = texto.index(NL, ini) + 1
    fin = texto.index('// === FIN PASES ===')
    lineas = (',' + NL).join(
        '  ' + json.dumps([r['id'], r['nombre'], r['personas'], r['mesa'], r['integrantes'], r['revisar']], ensure_ascii=False)
        for r in filas)
    ruta.write_text(texto[:ini] + 'const PASES = [' + NL + lineas + ',' + NL + '];' + NL + texto[fin:], encoding='utf-8')


def main():
    archivo_ids = RAIZ / 'herramientas' / 'ids.json'
    ids = json.loads(archivo_ids.read_text(encoding='utf-8')) if archivo_ids.exists() else {}
    usados = set(ids.values())

    filas = []
    for mesa, nombre, integrantes, nota in PASES:
        clave = f'{mesa}|{nombre}'
        if clave not in ids:
            nuevo = secrets.token_hex(4)
            while nuevo in usados:
                nuevo = secrets.token_hex(4)
            ids[clave] = nuevo
            usados.add(nuevo)
        filas.append({
            'id': ids[clave],
            'nombre': nombre,
            'personas': len(integrantes),
            'mesa': mesa,
            'mensaje': '',
            'estado': 'Habilitado',
            'asistencia': '',
            'confirmados': '',
            'asistentes': '',
            'comentario': '',
            'fechaRespuesta': '',
            'integrantes': ', '.join(integrantes),
            'revisar': nota,
            'enlace': URL_BASE + ids[clave],
        })

    archivo_ids.write_text(json.dumps(ids, ensure_ascii=False, indent=1), encoding='utf-8')

    with open(RAIZ / 'invitados.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    generar_xlsx(filas)
    escribir_gs(filas)

    # Datos para cargar en Firebase Realtime Database (/invitados)
    fb = {r['id']: {k: r[k] for k in ('nombre', 'personas', 'mesa', 'mensaje', 'estado', 'integrantes')}
          for r in filas}
    (RAIZ / 'herramientas' / 'invitados-firebase.json').write_text(
        json.dumps(fb, ensure_ascii=False, indent=1), encoding='utf-8')
    # Notas internas: solo las ven los administradores (/notas)
    notas = {r['id']: r['revisar'] for r in filas if r['revisar']}
    (RAIZ / 'herramientas' / 'notas-firebase.json').write_text(
        json.dumps(notas, ensure_ascii=False, indent=1), encoding='utf-8')

    js = [{k: r[k] for k in ('id', 'nombre', 'personas', 'mesa', 'mensaje', 'estado')} for r in filas]
    (RAIZ / 'js' / 'invitados.js').write_text(
        '/* Generado por herramientas/generar_invitados.py — no editar a mano.\n'
        '   Solo se usa en MODO PRUEBA (sin Google Sheets). */\n'
        'window.INVITADOS = ' + json.dumps(js, ensure_ascii=False, indent=1) + ';\n',
        encoding='utf-8',
    )

    total = sum(r['personas'] for r in filas)
    print(f'{len(filas)} pases, {total} personas')
    print(f'Por revisar: {sum(1 for r in filas if r["revisar"])}')


if __name__ == '__main__':
    main()
