"""Servidor local para probar la invitación (con soporte de Range para la música).

Uso:  python herramientas/servidor.py      y abre http://127.0.0.1:5510/index.html?p=ID
"""
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUERTO = 5510


class Manejador(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_head(self):
        rango = self.headers.get('Range')
        ruta = self.translate_path(self.path)
        if not rango or not os.path.isfile(ruta):
            return super().send_head()
        m = re.match(r'bytes=(\d*)-(\d*)', rango)
        tamano = os.path.getsize(ruta)
        inicio = int(m.group(1)) if m and m.group(1) else 0
        fin = int(m.group(2)) if m and m.group(2) else tamano - 1
        fin = min(fin, tamano - 1)
        if inicio > fin:
            self.send_error(416)
            return None
        f = open(ruta, 'rb')
        f.seek(inicio)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(ruta))
        self.send_header('Content-Range', f'bytes {inicio}-{fin}/{tamano}')
        self.send_header('Content-Length', str(fin - inicio + 1))
        self.end_headers()
        self._restante = fin - inicio + 1
        return f

    def copyfile(self, source, outputfile):
        restante = getattr(self, '_restante', None)
        if restante is None:
            return super().copyfile(source, outputfile)
        while restante > 0:
            bloque = source.read(min(64 * 1024, restante))
            if not bloque:
                break
            outputfile.write(bloque)
            restante -= len(bloque)


if __name__ == '__main__':
    print(f'Invitación en http://127.0.0.1:{PUERTO}/index.html')
    ThreadingHTTPServer(('127.0.0.1', PUERTO), Manejador).serve_forever()
