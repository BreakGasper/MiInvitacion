"""Crea (o cambia la contraseña de) el usuario del panel de invitados.

Uso:  python herramientas/crear_usuario_panel.py
Te pide el teléfono y la contraseña en la terminal (la contraseña no se muestra
mientras la escribes y no se guarda en ningún archivo).
"""
import getpass
import json
import re
import urllib.error
import urllib.request

API_KEY = 'AIzaSyD1m5lpJzbmrMEjQn-PnAM8GXI3TyDNyOI'
DOMINIO = 'boda.example.com'


def llamar(metodo, datos):
    req = urllib.request.Request(
        f'https://identitytoolkit.googleapis.com/v1/accounts:{metodo}?key={API_KEY}',
        data=json.dumps(datos).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r), None
    except urllib.error.HTTPError as e:
        return None, json.load(e).get('error', {}).get('message', str(e))


def main():
    tel = re.sub(r'\D', '', input('Teléfono (10 dígitos) [3751274973]: ') or '3751274973')[-10:]
    if len(tel) != 10:
        print('El teléfono debe tener 10 dígitos.')
        return
    clave = getpass.getpass('Contraseña para el panel (mínimo 6 caracteres): ')
    if len(clave) < 6 or clave != getpass.getpass('Repite la contraseña: '):
        print('Las contraseñas no coinciden o son muy cortas.')
        return
    correo = f'{tel}@{DOMINIO}'

    _, error = llamar('signUp', {'email': correo, 'password': clave, 'returnSecureToken': False})
    if not error:
        print(f'Listo. Usuario creado: entra al panel con el teléfono {tel} y tu contraseña.')
    elif error == 'EMAIL_EXISTS':
        print('Ese teléfono ya tiene usuario. Para cambiar la contraseña, bórralo en')
        print('Firebase → Authentication → Usuarios y vuelve a correr este programa.')
    elif error.startswith('OPERATION_NOT_ALLOWED'):
        print('Falta activar "Correo electrónico/contraseña" en Firebase → Authentication → Método de acceso.')
    else:
        print(f'No se pudo crear el usuario: {error}')


if __name__ == '__main__':
    main()
