"""Convierte herramientas/familias.txt en pases (uno por familia) para Firebase.

Uso:  python herramientas/familias.py
Genera herramientas/familias-firebase.json y conserva los códigos ya asignados
en herramientas/ids-familias.json (los enlaces enviados siguen funcionando).
"""
import json
import re
import secrets
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PEQUENAS = {'de', 'del', 'la', 'las', 'los', 'y'}
DESCRIPTORES = ('novio', 'novia', 'esposo', 'esposa', 'hijo', 'hija', 'papa', 'mama', 'hermano', 'hermana', 'niño', 'primo ')
# Familias con algo que conviene revisar
NOTAS = {
    52: '¿"4" significa 4 personas? Ajusta los lugares.',
    53: '¿"4" significa 4 personas? Ajusta los lugares.',
    41: 'Varios "Niño" sin nombre.',
    47: 'Falta el nombre del primo.',
}


def bonito(nombre):
    palabras = re.sub(r'\s+', ' ', nombre.strip()).lower().split(' ')
    return ' '.join(p if (i and p in PEQUENAS) else p[:1].upper() + p[1:] for i, p in enumerate(palabras))


def leer():
    familias, actual = {}, None
    for linea in (RAIZ / 'herramientas' / 'familias.txt').read_text(encoding='utf-8').splitlines():
        if not linea.strip() or linea.startswith('#'):
            continue
        m = re.match(r'^(\d+)\s+(.*)$', linea)
        if m:
            actual = int(m.group(1))
            familias[actual] = [bonito(m.group(2))]
        else:
            familias[actual].append(bonito(linea))
    return familias


def titulo(integrantes):
    if len(integrantes) == 1:
        return integrantes[0]
    principal = next((n for n in integrantes if not n.lower().startswith(DESCRIPTORES)), integrantes[0])
    return f'{principal} y familia'


def main():
    archivo_ids = RAIZ / 'herramientas' / 'ids-familias.json'
    ids = json.loads(archivo_ids.read_text(encoding='utf-8')) if archivo_ids.exists() else {}
    usados = set(ids.values())
    pases, notas = {}, {}
    for num, integrantes in leer().items():
        clave = str(num)
        if clave not in ids:
            nuevo = secrets.token_hex(4)
            while nuevo in usados:
                nuevo = secrets.token_hex(4)
            ids[clave] = nuevo
            usados.add(nuevo)
        pases[ids[clave]] = {
            'nombre': titulo(integrantes),
            'personas': len(integrantes),
            'familia': num,
            'mesa': 0,
            'mensaje': '',
            'estado': 'Habilitado',
            'integrantes': ', '.join(integrantes),
        }
        if num in NOTAS:
            notas[ids[clave]] = NOTAS[num]
    archivo_ids.write_text(json.dumps(ids, ensure_ascii=False, indent=1), encoding='utf-8')
    (RAIZ / 'herramientas' / 'familias-firebase.json').write_text(json.dumps(pases, ensure_ascii=False, indent=1), encoding='utf-8')
    (RAIZ / 'herramientas' / 'familias-notas.json').write_text(json.dumps(notas, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(pases)} familias, {sum(p["personas"] for p in pases.values())} personas, {len(notas)} por revisar')


if __name__ == '__main__':
    main()
