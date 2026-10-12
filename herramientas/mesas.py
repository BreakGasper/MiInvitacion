"""Convierte herramientas/mesas.txt en mesas + acomodo para Firebase (/mesas y /acomodo).

Uso:  python herramientas/mesas.py   → herramientas/mesas-firebase.json
Las mesas y su lista de invitados son independientes de las invitaciones.
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PEQUENAS = {'de', 'del', 'la', 'las', 'los', 'y'}


def bonito(nombre):
    palabras = re.sub(r'\s+', ' ', nombre.strip()).lower().split(' ')
    return ' '.join(p if (i and p in PEQUENAS) else p[:1].upper() + p[1:] for i, p in enumerate(palabras))


def tipo_de(n):
    if n <= 2:
        return 'rect', 12
    if n <= 14:
        return 'cuad', 12
    return 'red', 10


def posicion(n):
    """Acomodo inicial (centro de la mesa, en % del salón)."""
    if n <= 2:
        return (36 if n == 1 else 64), 9
    if n <= 14:
        i = n - 3
        return 9 + (i % 6) * 16.4, 30 + (i // 6) * 19
    i = n - 15
    fila, col = divmod(i, 6)
    return (9 if fila == 0 else 17.2) + col * 16.4, 70 + fila * 19


def main():
    columnas = None
    invitados = {}
    for linea in (RAIZ / 'herramientas' / 'mesas.txt').read_text(encoding='utf-8').splitlines():
        celdas = linea.split('\t')
        if any(c.strip().upper().startswith('MESA') for c in celdas):
            columnas = [int(re.sub(r'\D', '', c)) for c in celdas if c.strip()]
            continue
        for i, celda in enumerate(celdas):
            if celda.strip() and columnas and i < len(columnas):
                invitados.setdefault(columnas[i], []).append(bonito(celda))

    mesas, acomodo = {}, {}
    for n in range(1, 26):
        tipo, cap = tipo_de(n)
        x, y = posicion(n)
        mid = f'm{n:02d}'
        mesas[mid] = {'numero': n, 'tipo': tipo, 'capacidad': cap, 'x': round(x, 1), 'y': round(y, 1)}
        for orden, nombre in enumerate(invitados.get(n, [])):
            acomodo[f'g{n:02d}{orden:02d}'] = {'nombre': nombre, 'mesa': mid, 'orden': orden}

    salida = RAIZ / 'herramientas' / 'mesas-firebase.json'
    salida.write_text(json.dumps({'mesas': mesas, 'acomodo': acomodo}, ensure_ascii=False, indent=1), encoding='utf-8')
    total = len(acomodo)
    print(f'{len(mesas)} mesas, {total} invitados')
    for n in range(1, 26):
        cap = tipo_de(n)[1]
        c = len(invitados.get(n, []))
        if c > cap:
            print(f'  ¡Mesa {n} tiene {c} y su capacidad es {cap}!')


if __name__ == '__main__':
    main()
