"""Genera gastos-firebase.json con la tabla inicial de proveedores y padrinos.
El anticipo se guarda como un primer pago al proveedor y el abono como un primer
abono del padrino. Subir con:
  firebase database:set /gastos herramientas/gastos-firebase.json --project newagent-pgkvkj
"""
import json
import os

# Proveedor, Total, Anticipo, Padrino, Presupuesto, Abono, Quién lo consigue, Descripción
TABLA = [
    ('Mirna', 20500, 6150, 'M&C', 20500, 6150, 'novios', ''),
    ('Toño Sonido', 25000, 0, 'M&C', 25000, 0, 'novios', ''),
    ('Vestido', 20000, 0, 'M&C', 20000, 0, 'novios', ''),
    ('Decorador Alejandro', 26000, 13000, 'Carmelita', 39326, 39326, 'novios', ''),
    ('Centros de C&M', 6000, 6000, 'M&C', 7000, 6000, 'novios', ''),
    ('Pastel Chavarin', 4800, 1000, 'July', 9500, 0, 'novios', ''),
    ('Banda', 60000, 20000, 'Secretarios', 60000, 0, 'novios', ''),
    ('Postresitos Chavarin', 18000, 2500, 'Jhoana', 20250, 4057, 'novios', ''),
    ('Local', 25000, 5000, 'Glenda', 25000, 17024, 'novios', ''),
    ('Muebles', 22000, 7500, 'Marcella', 22000, 3000, 'novios', ''),
    ('Fotógrafo', 17900, 3000, 'Cesar', 20900, 4000, 'novios', ''),
    ('Cerveza', 20000, 0, 'Emili', 20000, 0, 'novios', ''),
    ('Tequila', 0, 0, 'Maribel', 0, 0, 'ellos', ''),
    ('Comida', 0, 0, 'Juan', 0, 0, 'ellos', ''),
    ('Biblia y rosario', 1500, 0, 'Sammy', 1500, 0, 'novios', ''),
    ('Anillos', 0, 0, 'Angelica', 0, 0, 'ellos', ''),
    ('Violín', 3000, 500, 'Ana y Felipe', 6500, 3000, 'novios', 'El sobrante del dinero se destina al mariachi'),
    ('Mariachi', 9000, 0, 'Rafa', 6500, 0, 'novios', ''),
    ('Invitación', 1500, 0, 'Paulina', 3000, 3000, 'novios', ''),
    ('Hielo', 1300, 0, 'Rosy y Carlos', 1400, 0, 'novios', '25 bolsas de hielo y 10 barras'),
]

# Cotización de cerveza: caja de 24
CERVEZA = [('Modelo', 430), ('Barrilito', 245), ('Corona', 375)]

datos = {'proveedores': {}, 'pagos': {}, 'aportes': {}, 'cotizaciones': {}}
for i, (nombre, total, anticipo, padrino, presupuesto, abono, consigue, desc) in enumerate(TABLA, 1):
    pid = f'p{i:02d}'
    datos['proveedores'][pid] = {
        'nombre': nombre, 'total': total, 'padrino': padrino, 'presupuesto': presupuesto,
        'consigue': consigue, 'descripcion': desc, 'orden': i,
    }
    if anticipo:
        datos['pagos'][f'{pid}-anticipo'] = {'proveedor': pid, 'monto': anticipo, 'fecha': '', 'nota': 'Anticipo', 'creado': 0}
    if abono:
        datos['aportes'][f'{pid}-inicial'] = {'proveedor': pid, 'monto': abono, 'fecha': '', 'nota': 'Abonos anteriores', 'creado': 0}
    if nombre == 'Cerveza':
        for j, (marca, precio) in enumerate(CERVEZA, 1):
            datos['cotizaciones'][f'{pid}-c{j}'] = {
                'proveedor': pid, 'opcion': marca, 'precio': precio, 'piezas': 24, 'cantidad': 0, 'elegida': False, 'creado': j,
            }

salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gastos-firebase.json')
with open(salida, 'w', encoding='utf-8') as f:
    json.dump(datos, f, ensure_ascii=False, indent=1)

# Comprobación contra la hoja: sobra = presupuesto - total ; falta = presupuesto - abono
for nombre, total, anticipo, padrino, presupuesto, abono, *_ in TABLA:
    print(f'{nombre:22} faltante {total - anticipo:>8} sobra {presupuesto - total:>8} falta {presupuesto - abono:>8}')
print('->', salida)
