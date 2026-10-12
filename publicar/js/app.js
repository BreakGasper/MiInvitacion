(() => {
  'use strict';

  const C = window.INVITACION || {};

  // Siempre empezar arriba (el navegador no debe recordar dónde se quedó)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo({ top: 0, behavior: 'instant' });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const br = (s) => esc(s).replace(/\n/g, '<br>');
  const activo = (o) => o && o.activo !== false;
  const pad = (n) => String(n).padStart(2, '0');

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function partes(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, dia: DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], mes: MESES[m - 1] };
  }

  const F = partes(C.evento.fecha);
  const OBJETIVO = new Date(`${C.evento.fecha}T${C.evento.hora || '00:00'}:00${C.evento.zonaHoraria || '-06:00'}`);
  const PAREJA = `${C.novios.nombre1} & ${C.novios.nombre2}`;
  const ILUS = { iglesia: 's-iglesia', recepcion: 's-recepcion', civil: 's-civil' };

  /* ============================================================
     SECCIONES
     ============================================================ */
  const S = {};

  S.portada = () => `
    <header class="hero" id="inicio">
      <div class="escena">
        <div class="sobre">
          <div class="sobre-atras"></div>
          <div class="sobre-solapa"></div>
          <div class="tarjeta tex-carta">
            <div class="tarjeta-marco">
              <p class="tarjeta-kicker">Nos casamos</p>
              <h1 class="tarjeta-nombres">${esc(C.novios.nombre1)}<br>&amp; ${esc(C.novios.nombre2)}</h1>
              <p class="tarjeta-fecha">${pad(F.d)} . ${pad(F.m)} . ${String(F.y).slice(-2)}</p>
            </div>
          </div>
          <div class="sobre-frente-sombra"><div class="sobre-frente"></div></div>
          <svg class="sello" aria-hidden="true"><use href="#s-sello-oro"/></svg>
        </div>
        <figure class="polaroid">
          <img src="${esc(C.portada.foto)}" alt="${esc(PAREJA)}" class="${C.portada.blancoYNegro ? 'bn' : ''}">
        </figure>
        <svg class="ramita" aria-hidden="true"><use href="#s-ramita"/></svg>
      </div>
      ${C.portada.leyenda || C.portada.cita ? `
      <div class="hero-leyenda">
        ${C.portada.leyenda ? `<p class="hl-invita">${esc(C.portada.leyenda)}</p>` : ''}
        ${C.portada.cita ? `<blockquote class="hl-cita">&ldquo;${br(C.portada.cita)}&rdquo;</blockquote>` : ''}
        ${C.portada.referencia ? `<p class="hl-ref">${esc(C.portada.referencia)}</p>` : ''}
      </div>` : ''}
      <p class="faltan">Faltan</p>
      <div class="contador" id="contador">
        ${[['dias', 'Días'], ['horas', 'Horas'], ['minutos', 'Minutos'], ['segundos', 'Segundos']]
          .map(([k, l], i) => `${i ? '<span class="sep">:</span>' : ''}<div class="c-item"><span class="c-num" data-k="${k}">00</span><span class="c-lbl">${l}</span></div>`)
          .join('')}
      </div>
      ${activo(C.musica) && C.musica.archivo ? `
      <div class="reproductor" id="reproductor">
        <p class="rep-t">Dale play para escuchar nuestra canción</p>
        <div class="rep-barra" id="rep-barra" role="slider" tabindex="0" aria-label="Avance de la canción"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span class="rep-avance" id="rep-avance"></span>
        </div>
        <div class="rep-controles">
          <button type="button" class="rep-btn" id="rep-ant" aria-label="Volver al inicio de la canción"><i class="fa-solid fa-backward-step"></i></button>
          <button type="button" class="rep-play" id="rep-play" aria-label="Reproducir canción"><i class="fa-solid fa-play"></i></button>
          <button type="button" class="rep-btn" id="rep-sig" aria-label="Adelantar 15 segundos"><i class="fa-solid fa-forward-step"></i></button>
        </div>
      </div>` : ''}
    </header>`;

  // Se llena cuando se conoce al invitado
  S.pase = () => (activo(C.pase) ? '<section class="seccion" id="pase" hidden></section>' : '');

  S.historia = () => !activo(C.historia) ? '' : `
    <section class="seccion">
      <div class="contenido">
        <img class="historia-foto rv" src="${esc(C.historia.foto)}" alt="${esc(PAREJA)}" loading="lazy">
        ${C.historia.cita ? `<blockquote class="historia-cita rv">&ldquo;${br(C.historia.cita)}&rdquo;</blockquote>` : ""}
        ${C.historia.texto ? `<p class="historia-texto rv">${br(C.historia.texto)}</p>` : ''}
      </div>
    </section>`;

  // Sección de tarjetas con nombres (padres, padrinos…)
  const tarjetasNombres = (sec) => !activo(sec) ? '' : `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(sec.titulo)}</h2>
        <div class="padres-grid ${sec.grupos.length === 1 ? 'uno' : ''}">
          ${sec.grupos.map((g) => `
            <div class="padres-card rv">
              ${g.nombres.map((n) => `<p class="padres-nombre">${esc(n)}</p>`).join('')}
              ${g.etiqueta ? `<p class="padres-etq">${esc(g.etiqueta)}</p>` : ''}
              <svg class="ramita-mini" aria-hidden="true"><use href="#s-ramita"/></svg>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  S.padres = () => tarjetasNombres(C.padres);
  S.padrinos = () => tarjetasNombres(C.padrinos);

  S.fecha = () => `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${br(C.frase)}</h2>
        <div class="fecha-grande rv">
          <span class="fecha-lado">${esc(F.dia)}</span>
          <span class="fecha-dia">${F.d}</span>
          <span class="fecha-lado">${esc(F.mes)}</span>
        </div>
        <p class="fecha-anio rv">${F.y}</p>
      </div>
    </section>`;

  S.eventos = () => {
    const lista = (C.eventos || []).filter(activo);
    if (!lista.length) return '';
    return `
    <section class="seccion">
      ${lista.map((e) => `
        <div class="evento">
          <div class="tarjeta-papel rv">
            <h2 class="evento-t t-caps">${esc(e.titulo)}</h2>
            ${e.imagen
              ? `<img class="evento-img" src="${esc(e.imagen)}" alt="${esc(e.lugar)}" loading="lazy">`
              : `<svg class="evento-ilus" aria-hidden="true"><use href="#${ILUS[e.ilustracion] || 's-iglesia'}"/></svg>`}
            ${e.hora ? `<p class="evento-hora">${esc(e.hora)} HRS.</p>` : ''}
            <p class="evento-lugar">${esc(e.lugar)}</p>
            <p class="evento-dir">${br(e.direccion)}</p>
          </div>
          ${e.mapa ? `<a class="btn rv" href="${esc(e.mapa)}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> Ver ubicación</a>` : ''}
        </div>`).join('')}
    </section>`;
  };

  S.itinerario = () => !activo(C.itinerario) ? '' : `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(C.itinerario.titulo)}</h2>
        <ol class="linea">
          ${C.itinerario.items.map((i, n) => `
            <li class="${n % 2 ? 'li-izq' : 'li-der'} rv">
              <svg class="li-ico" aria-hidden="true"><use href="#i-${esc(i.icono || 'musica')}"/></svg>
              <span class="li-txt">
                ${i.hora ? `<span class="li-hora">${esc(i.hora)}</span>` : ''}
                <span class="li-act">${br(i.texto)}</span>
              </span>
            </li>`).join('')}
        </ol>
      </div>
    </section>`;

  S.vestimenta = () => !activo(C.vestimenta) ? '' : `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(C.vestimenta.titulo)}</h2>
        <svg class="vest-ilus rv" aria-hidden="true"><use href="#s-vestimenta"/></svg>
        <p class="vest-tipo t-caps rv">${esc(C.vestimenta.tipo)}</p>
        ${C.vestimenta.descripcion ? `<p class="texto-serif rv">${br(C.vestimenta.descripcion)}</p>` : ''}
        ${C.vestimenta.colores?.length ? `
          <p class="vest-colores-t rv">${esc(C.vestimenta.coloresTitulo || 'Colores sugeridos')}</p>
          <div class="vest-colores rv">
            ${C.vestimenta.colores.map((c) => `<span class="swatch"><span class="swatch-c" style="background:${esc(c.color)}"></span>${esc(c.nombre)}</span>`).join('')}
          </div>` : ''}
        ${C.vestimenta.nota ? `<p class="vest-nota rv">${esc(C.vestimenta.nota)}</p>` : ''}
        ${C.vestimenta.inspiracion?.fotos?.length ? `
          <p class="vest-colores-t rv">${esc(C.vestimenta.inspiracion.titulo || 'Inspiración')}</p>
          <div class="inspiracion">
            ${C.vestimenta.inspiracion.fotos.map((f, i) => `
              <button type="button" class="marco rv" data-album="vestimenta" data-foto="${i}" aria-label="Ver inspiración ${i + 1}">
                <img src="${esc(f)}" alt="Ideas de vestimenta ${i + 1}" loading="lazy">
                <span class="marco-lupa" aria-hidden="true"><i class="fa-solid fa-magnifying-glass-plus"></i></span>
              </button>`).join('')}
          </div>
          <p class="inspiracion-ayuda rv">Toca una imagen para verla completa</p>` : ''}
      </div>
    </section>`;

  S.galeria = () => !activo(C.galeria) || !C.galeria.fotos?.length ? '' : `
    <section class="seccion">
      <div class="contenido"><h2 class="t-script rv">${esc(C.galeria.titulo)}</h2></div>
      <div class="galeria">
        ${C.galeria.fotos.map((f, i) => `
          <button type="button" class="rv" data-foto="${i}" aria-label="Ver foto ${i + 1}">
            <img src="${esc(f)}" alt="" loading="lazy">
          </button>`).join('')}
      </div>
    </section>`;

  S.regalos = () => {
    const R = C.regalos;
    if (!activo(R)) return '';
    const T = R.transferencia;
    return `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(R.titulo)}</h2>
        <p class="texto-serif rv">${br(R.texto)}</p>
        ${R.pasos ? `<p class="regalo-pasos rv">${esc(R.pasos)}</p>` : ''}
        <div class="lista-tarjetas">
          ${(R.mesas || []).map((m) => `
            <div class="item-tarjeta regalo rv">
              ${m.logo
                ? `<h3 class="regalo-logo"><img src="${esc(m.logo)}" alt="${esc(m.tienda)}" loading="lazy"></h3>`
                : `${m.icono ? `<span class="regalo-ico"><i class="${esc(m.icono)}" aria-hidden="true"></i></span>` : ''}<h3>${esc(m.tienda)}</h3>`}
              ${m.detalle ? `<p>${esc(m.detalle)}</p>` : ''}
              ${m.url
                ? `<a class="btn" href="${esc(m.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-gift" aria-hidden="true"></i> Elegir un regalo</a>`
                : '<p class="regalo-pronto">Muy pronto</p>'}
            </div>`).join('')}
          ${activo(T) ? `
            <div class="item-tarjeta rv">
              <h3>Transferencia</h3>
              <p>${esc(T.banco)}</p>
              <p>${esc(T.titular)}</p>
              <p class="clabe">${esc(T.clabe)}</p>
              <button type="button" class="btn btn-sec" data-copiar="${esc(T.clabe)}"><i class="fa-regular fa-copy"></i> Copiar CLABE</button>
            </div>` : ''}
        </div>
        ${R.sobres ? `<p class="texto-serif rv" style="margin-top:26px">${br(R.sobres)}</p>` : ''}
      </div>
    </section>`;
  };

  S.hoteles = () => !activo(C.hoteles) || !C.hoteles.items?.length ? '' : `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(C.hoteles.titulo)}</h2>
        <div class="lista-tarjetas">
          ${C.hoteles.items.map((h) => `
            <div class="item-tarjeta rv">
              <h3>${esc(h.nombre)}</h3>
              ${h.detalle ? `<p>${br(h.detalle)}</p>` : ''}
              ${h.telefono ? `<p><a href="tel:${esc(h.telefono)}">${esc(h.telefono)}</a></p>` : ''}
              ${h.url ? `<a class="btn" href="${esc(h.url)}" target="_blank" rel="noopener">Reservar</a>` : ''}
            </div>`).join('')}
        </div>
      </div>
    </section>`;

  S.instagram = () => {
    const I = C.instagram;
    if (!activo(I)) return '';
    const tag = String(I.hashtag || '').replace(/^#/, '');
    return `
    <section class="foto-fondo" style="background-image:url('${esc(I.foto)}')">
      <div class="contenido">
        <div class="hash-ico rv zoom"><i class="fa-brands fa-instagram"></i></div>
        <p class="hash rv"><a href="https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/" target="_blank" rel="noopener">#${esc(tag)}</a></p>
        <p class="hash-txt rv">${br(I.texto)}</p>
      </div>
    </section>`;
  };

  S.video = () => !activo(C.video) ? '' : `
    <section class="foto-fondo" style="background-image:url('${esc(C.video.foto)}')">
      <div class="contenido">
        <h2 class="t-script rv">${esc(C.video.titulo)}</h2>
        <a class="play rv zoom" href="${esc(C.video.url)}" target="_blank" rel="noopener" aria-label="Ver video"><i class="fa-solid fa-play"></i></a>
        <a class="play-lbl" href="${esc(C.video.url)}" target="_blank" rel="noopener">- Ver Video -</a>
      </div>
    </section>`;

  S.fotoFinal = () => !activo(C.fotoFinal) ? '' : `
    <section class="seccion">
      <figure class="foto-final rv"><img src="${esc(C.fotoFinal.foto)}" alt="${esc(PAREJA)}" loading="lazy"></figure>
    </section>`;

  S.confirmacion = () => `
    <section class="seccion" id="confirmar">
      <div class="contenido">
        <h2 class="t-script confirma-t rv">${esc(C.confirmacion.titulo)}</h2>
        <p class="confirma-frase rv">${br(C.confirmacion.texto)}</p>
        <div class="rsvp rv" id="rsvp"></div>
      </div>
    </section>`;

  S.contacto = () => {
    const K = C.contacto;
    if (!activo(K)) return '';
    const url = `https://wa.me/${encodeURIComponent(K.whatsapp)}?text=${encodeURIComponent(K.mensaje || '')}`;
    return `
    <section class="seccion">
      <div class="contenido">
        <h2 class="t-script rv">${esc(K.titulo)}</h2>
        <p class="texto-serif rv" style="margin-bottom:28px">${br(K.texto)}</p>
        <a class="wsp rv zoom" href="${url}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> ${esc(K.etiqueta)}</a>
      </div>
    </section>`;
  };

  S.pie = () => `
    <footer class="foto-fondo pie" style="background-image:url('${esc(C.pie.foto)}')">
      <p class="pie-nombres rv">${esc(C.novios.nombre1)} &amp; ${esc(C.novios.nombre2)}</p>
      <p class="pie-fecha rv">${pad(F.d)} . ${pad(F.m)} . ${F.y}</p>
      ${C.pie.frase ? `<p class="pie-frase rv">${esc(C.pie.frase)}</p>` : ''}
    </footer>`;

  $('#app').innerHTML = [
    S.portada(), S.pase(), S.historia(), S.padres(), S.padrinos(), S.fecha(), S.itinerario(), S.eventos(),
    S.vestimenta(), S.galeria(), S.regalos(), S.hoteles(), S.instagram(), S.video(),
    S.fotoFinal(), S.confirmacion(), S.contacto(), S.pie(),
  ].join('');

  $('#portal-nombres').innerHTML = `${esc(C.novios.nombre1)}<span class="amp">&amp;</span>${esc(C.novios.nombre2)}`;
  $('#portal-fecha').textContent = `${F.d}-${F.mes.toUpperCase()}-${F.y}`;
  $('#ps-carta-n').innerHTML = `${esc(C.novios.nombre1)} <span class="amp">&amp;</span> ${esc(C.novios.nombre2)}`;
  $('#ps-carta-f').textContent = `${pad(F.d)} · ${pad(F.m)} · ${F.y}`;
  document.title = `${C.titulo} · ${PAREJA}`;

  /* ============================================================
     CUENTA REGRESIVA
     ============================================================ */
  const nums = Object.fromEntries($$('.c-num').map((el) => [el.dataset.k, el]));
  function tic() {
    let ms = OBJETIVO - Date.now();
    if (ms <= 0) {
      $('#contador').outerHTML = '<p class="contador-fin">¡Llegó el gran día!</p>';
      $('.faltan').hidden = true;
      return false;
    }
    const s = Math.floor(ms / 1000);
    nums.dias.textContent = Math.floor(s / 86400);
    nums.horas.textContent = pad(Math.floor((s % 86400) / 3600));
    nums.minutos.textContent = pad(Math.floor((s % 3600) / 60));
    nums.segundos.textContent = pad(s % 60);
    return true;
  }
  if (tic()) { const t = setInterval(() => { if (!tic()) clearInterval(t); }, 1000); }

  /* ============================================================
     ANIMACIÓN AL HACER SCROLL
     ============================================================ */
  let pendientes = [];
  const revisar = () => {
    const limite = innerHeight * .92;
    pendientes = pendientes.filter((el) => {
      if (el.getBoundingClientRect().top < limite) { el.classList.add('visto'); return false; }
      return true;
    });
  };
  const observar = (root = document) => { pendientes.push(...$$('.rv:not(.visto)', root)); revisar(); };
  addEventListener('scroll', revisar, { passive: true });
  addEventListener('resize', revisar);
  observar();

  /* ============================================================
     MÚSICA + PORTAL
     ============================================================ */
  const audio = $('#musica');
  const hayMusica = activo(C.musica) && C.musica.archivo;
  const rep = $('#reproductor');
  if (hayMusica) audio.src = C.musica.archivo;
  audio.addEventListener('error', () => { if (rep) rep.hidden = true; });

  if (rep) {
    const play = $('#rep-play');
    const barra = $('#rep-barra');
    const pintarPlay = () => {
      play.innerHTML = `<i class="fa-solid fa-${audio.paused ? 'play' : 'pause'}"></i>`;
      play.setAttribute('aria-label', audio.paused ? 'Reproducir canción' : 'Pausar canción');
      play.classList.toggle('sonando', !audio.paused);
    };
    const pintarAvance = () => {
      const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      $('#rep-avance').style.width = `${p}%`;
      barra.setAttribute('aria-valuenow', Math.round(p));
    };
    const ir = (seg) => { if (audio.duration) audio.currentTime = Math.max(0, Math.min(audio.duration - .5, seg)); };
    audio.addEventListener('play', pintarPlay);
    audio.addEventListener('pause', pintarPlay);
    audio.addEventListener('timeupdate', pintarAvance);
    play.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      try {
        await audio.play();
      } catch {
        // si el navegador perdió el audio, se recarga y sigue donde iba
        const t = audio.currentTime;
        audio.load();
        audio.addEventListener('loadedmetadata', () => { audio.currentTime = t; audio.play().catch(() => {}); }, { once: true });
      }
    });
    $('#rep-ant').addEventListener('click', () => ir(0));
    $('#rep-sig').addEventListener('click', () => ir(audio.currentTime + 15));
    barra.addEventListener('click', (e) => {
      const r = barra.getBoundingClientRect();
      ir(((e.clientX - r.left) / r.width) * audio.duration);
    });
    barra.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') ir(audio.currentTime + 5);
      if (e.key === 'ArrowLeft') ir(audio.currentTime - 5);
    });
  }

  // Al tocar el sobre: se rompe el sello, se abre la solapa, sube la tarjeta
  // y la pantalla de entrada se desliza hacia arriba mostrando la invitación.
  $('#btn-ingresar').addEventListener('click', () => {
    const portal = $('#portal');
    if (portal.classList.contains('abriendo')) return;
    if (hayMusica && !audio.error) audio.play().catch(() => {});
    const r = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    window.scrollTo({ top: 0, behavior: 'instant' });
    portal.classList.add('abriendo');
    setTimeout(() => portal.classList.add('solapa-atras'), 380 * r);
    setTimeout(() => portal.classList.add('carta-sube'), 750 * r);
    setTimeout(() => { portal.classList.add('cerrado'); document.body.classList.remove('bloqueado'); }, 1900 * r);
    setTimeout(() => { portal.remove(); pintarDock(); }, 1900 * r + 1100);
  });

  /* ============================================================
     GALERÍA
     ============================================================ */
  const visor = $('#visor');
  const albumes = { galeria: C.galeria?.fotos || [], vestimenta: C.vestimenta?.inspiracion?.fotos || [] };
  let fotos = [];
  let actual = 0;
  const mostrar = (i) => { actual = (i + fotos.length) % fotos.length; $('img', visor).src = fotos[actual]; };
  $$('[data-foto]').forEach((b) => b.addEventListener('click', () => {
    fotos = albumes[b.dataset.album || 'galeria'];
    mostrar(+b.dataset.foto);
    visor.hidden = false;
  }));
  $('.visor-x', visor).addEventListener('click', () => { visor.hidden = true; });
  $('.visor-ant', visor).addEventListener('click', () => mostrar(actual - 1));
  $('.visor-sig', visor).addEventListener('click', () => mostrar(actual + 1));
  visor.addEventListener('click', (e) => { if (e.target === visor) visor.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (visor.hidden) return;
    if (e.key === 'Escape') visor.hidden = true;
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
    if (e.key === 'ArrowRight') mostrar(actual + 1);
  });

  /* copiar CLABE */
  $$('[data-copiar]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copiar);
      const antes = b.innerHTML;
      b.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
      setTimeout(() => { b.innerHTML = antes; }, 1800);
    } catch { /* sin permiso de portapapeles */ }
  }));

  /* ============================================================
     PASE + CONFIRMACIÓN
     ============================================================ */
  const params = new URLSearchParams(location.search);
  const ID = (params.get('p') || params.get('pase') || '').trim();
  const SCRIPT = (C.confirmacion.googleScriptUrl || '').trim();
  const estado = { invitado: null, editando: false };

  const fb = () => (C.firebase && window.__fbListo ? window.__fbListo.promesa : null);
  const GENERAL = activo(C.general);
  const api = {
    async guardarGeneral(datos) {
      if (!fb()) throw new Error('La invitación general necesita Firebase');
      return (await fb()).guardarGeneral(datos);
    },
    async obtener(id) {
      if (fb()) return (await fb()).obtener(id);
      if (SCRIPT) {
        const r = await fetch(`${SCRIPT}?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        return j.ok ? j.invitado : null;
      }
      const inv = (window.INVITADOS || []).find((x) => String(x.id) === id);
      if (!inv) return null;
      let respuesta = null;
      try { respuesta = JSON.parse(localStorage.getItem(`rsvp_${id}`) || 'null'); } catch { /* */ }
      return { ...inv, respuesta };
    },
    async guardar(id, datos) {
      if (fb()) {
        const respuesta = await (await fb()).guardar(id, datos);
        return { ...estado.invitado, respuesta };
      }
      if (SCRIPT) {
        const r = await fetch(SCRIPT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ id, ...datos }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'error');
        return j.invitado;
      }
      if (C.confirmacion.netlifyForms && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        const inv = estado.invitado;
        const r = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            'form-name': 'confirmaciones',
            pase: id,
            nombre: inv.nombre,
            mesa: inv.mesa,
            lugares: inv.personas,
            asistencia: datos.asistencia === 'si' ? 'Sí asistirá' : 'No asistirá',
            confirmados: datos.confirmados,
            asistentes: datos.asistentes,
            comentario: datos.comentario,
          }).toString(),
        });
        if (!r.ok) throw new Error('envio');
      }
      const respuesta = { ...datos, fecha: new Date().toISOString() };
      try { localStorage.setItem(`rsvp_${id}`, JSON.stringify(respuesta)); } catch { /* */ }
      return { ...estado.invitado, respuesta };
    },
  };

  const fechaCorta = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const limite = C.confirmacion.fechaLimite ? partes(C.confirmacion.fechaLimite) : null;
  const limiteTxt = limite ? `${limite.d} de ${limite.mes.toLowerCase()}` : '';
  const vencido = limite ? Date.now() > new Date(`${C.confirmacion.fechaLimite}T23:59:59${C.evento.zonaHoraria || '-06:00'}`) : false;
  const habilitado = (inv) => String(inv.estado || 'Habilitado').toLowerCase() === 'habilitado';
  const plural = (n, s, p) => `${n} ${n == 1 ? s : p}`;
  const listaNombres = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

  function pintarPase(inv) {
    const sec = $('#pase');
    if (!sec) return;
    const ok = habilitado(inv);
    sec.innerHTML = `
      <div class="pase rv">
        <h2>${esc(C.pase.titulo)}</h2>
        <div class="pase-grid">
          <div class="pase-qr" id="qr" title="Pase ${esc(inv.id)}"></div>
          <div class="pase-datos">
            <div class="dato-full"><span class="dato-lbl">Nombre</span><span class="dato-val">${esc(inv.nombre)}</span></div>
            <div><span class="dato-lbl">Personas</span><span class="dato-val">${esc(inv.personas)}</span></div>
            ${Number(inv.mesa) > 0 ? `<div><span class="dato-lbl">Mesa</span><span class="dato-val">${esc(inv.mesa)}</span></div>` : ''}
            <div class="dato-full"><span class="dato-lbl">Estado del pase</span><span class="dato-val ${ok ? 'estado-ok' : 'estado-no'}">${esc(inv.estado || 'Habilitado')}</span></div>
            ${inv.mensaje ? `<div class="dato-full"><span class="dato-lbl">Mensaje</span><span class="dato-val">${esc(inv.mensaje)}</span></div>` : ''}
          </div>
        </div>
      </div>`;
    sec.hidden = false;
    if (window.QRCode) {
      const url = `${location.origin}${location.pathname}?p=${encodeURIComponent(inv.id)}`;
      new QRCode($('#qr'), { text: url, width: 170, height: 170, colorDark: '#5d5854', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
    observar(sec);
  }

  function pintarRSVP() {
    const box = $('#rsvp');
    const inv = estado.invitado;
    let html;

    if (!ID && GENERAL) {
      pintarGeneral();
      return;
    }
    if (!ID) {
      html = '<p>Para confirmar tu asistencia abre el enlace personal que te enviamos.</p>';
    } else if (!inv) {
      html = '<p>No encontramos tu pase. Revisa que el enlace esté completo o contáctanos.</p>';
    } else if (!habilitado(inv)) {
      html = '<p>Tu pase no está habilitado. Si crees que es un error, contáctanos.</p>';
    } else {
      const r = inv.respuesta;
      if (r && r.asistencia && !estado.editando) {
        html = r.asistencia === 'si'
          ? `<h3>Confirmaste que asistirás el ${fechaCorta(r.fecha)}</h3>
             <p>Personas confirmadas: ${esc(r.confirmados)}</p>
             ${listaNombres(r.asistentes).length ? `<ul class="rsvp-nombres">${listaNombres(r.asistentes).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`
          : `<h3>Nos avisaste que no podrás asistir</h3>
             ${r.comentario ? `<p>“${esc(r.comentario)}”</p>` : ''}`;
        if (!vencido) html += '<button type="button" class="btn btn-sec" id="rsvp-mod">Modificar confirmación</button>';
      } else if (vencido) {
        html = `<p>La fecha para confirmar terminó el ${esc(limiteTxt)}. Si necesitas ayuda, contáctanos.</p>`;
      } else {
        const max = Math.max(1, Number(inv.personas) || 1);
        const sel = (r && r.confirmados) || max;
        html = `
          <form id="form-rsvp" novalidate>
            <h3>¡Confirma tu asistencia!</h3>
            <p>${esc(inv.nombre)}, tenemos ${plural(max, 'lugar reservado', 'lugares reservados')} para ti.</p>
            ${limite ? `<p class="rsvp-limite">Por favor confirma antes del ${esc(limiteTxt)}.</p>` : ''}
            <div class="opciones" role="radiogroup" aria-label="¿Asistirás?">
              <label class="opcion"><input type="radio" name="asistencia" value="si" ${r?.asistencia !== 'no' ? 'checked' : ''}><span>Asistiré</span></label>
              <label class="opcion"><input type="radio" name="asistencia" value="no" ${r?.asistencia === 'no' ? 'checked' : ''}><span>No podré asistir</span></label>
            </div>
            <label class="campo" id="campo-personas">¿Cuántas personas asistirán?
              <select name="confirmados">
                ${Array.from({ length: max }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n == sel ? 'selected' : ''}>${plural(n, 'persona', 'personas')}</option>`).join('')}
              </select>
            </label>
            <fieldset class="campo campo-nombres" id="campo-nombres">
              <legend>Nombre de quienes asistirán</legend>
              <div id="nombres"></div>
            </fieldset>
            <label class="campo"><span id="lbl-msj">Mensaje para los novios (opcional)</span>
              <textarea name="comentario" maxlength="500">${esc(r?.comentario || '')}</textarea>
            </label>
            <p class="rsvp-error" id="rsvp-error" role="alert"></p>
            <button type="submit" class="btn">Confirmar</button>
          </form>`;
      }
    }

    box.innerHTML = `<div class="rsvp-box">${html}</div>`;
    pintarDock();

    $('#rsvp-mod')?.addEventListener('click', () => { estado.editando = true; pintarRSVP(); });

    const form = $('#form-rsvp');
    if (!form) return;
    const invitadosLista = Array.isArray(estado.invitado.lista)
      ? estado.invitado.lista.filter((p) => p && p.invitado !== false).map((p) => p.nombre)
      : listaNombres(estado.invitado.integrantes);
    const previos = estado.invitado.respuesta?.asistentes ? listaNombres(estado.invitado.respuesta.asistentes) : invitadosLista;
    const pintarNombres = () => {
      const actuales = $$('#nombres input').map((i) => i.value);
      const n = Number(form.confirmados.value);
      $('#nombres').innerHTML = Array.from({ length: n }, (_, i) => `
        <input type="text" name="asistente" maxlength="80" autocomplete="off"
          placeholder="Nombre de la persona ${i + 1}" aria-label="Nombre de la persona ${i + 1}"
          value="${esc(actuales[i] ?? previos[i] ?? '')}">`).join('');
    };
    form.confirmados.addEventListener('change', pintarNombres);
    pintarNombres();

    const sync = () => {
      const va = form.asistencia.value === 'si';
      $('#campo-personas').hidden = !va;
      $('#campo-nombres').hidden = !va;
      $('#lbl-msj').textContent = va
        ? 'Mensaje para los novios (opcional)'
        : 'Lamentamos que no puedas asistir, si lo deseas, déjanos un mensaje';
    };
    form.addEventListener('change', sync);
    sync();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', form);
      const va = form.asistencia.value === 'si';
      const nombres = $$('#nombres input').map((i) => i.value.trim());
      if (va && nombres.some((n) => !n)) {
        $('#rsvp-error').textContent = 'Escribe el nombre de cada persona que asistirá.';
        $$('#nombres input').find((i) => !i.value.trim())?.focus();
        return;
      }
      const datos = {
        asistencia: va ? 'si' : 'no',
        confirmados: va ? Number(form.confirmados.value) : 0,
        asistentes: va ? nombres.join(', ') : '',
        comentario: form.comentario.value.trim(),
      };
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        estado.invitado = await api.guardar(ID, datos);
        estado.editando = false;
        pintarRSVP();
        if (va && window.confetti) {
          confetti({ particleCount: 140, spread: 80, origin: { y: .75 }, colors: ['#ffffff', '#ece6dd', '#c5bfbb', '#ddd7a8'] });
        }
      } catch (err) {
        $('#rsvp-error').textContent = 'No pudimos guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.';
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
    });
  }

  /* ---------- invitación general (sin pase personal) ---------- */
  const leerGeneral = () => { try { return JSON.parse(localStorage.getItem('rsvp_general') || 'null'); } catch { return null; } };

  function pintarGeneral() {
    const box = $('#rsvp');
    const r = leerGeneral();
    const max = Math.max(1, Number(C.general.maxPersonas) || 6);
    let html;
    if (r && !estado.editando) {
      html = r.asistencia === 'si'
        ? `<h3>¡Gracias, ${esc(r.nombre)}!</h3>
           <p>Recibimos tu confirmación para ${plural(r.confirmados, 'persona', 'personas')}.</p>
           ${listaNombres(r.asistentes).length ? `<ul class="rsvp-nombres">${listaNombres(r.asistentes).map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`
        : `<h3>Gracias por avisarnos, ${esc(r.nombre)}</h3><p>Te vamos a extrañar.</p>`;
      if (!vencido) html += '<button type="button" class="btn btn-sec" id="rsvp-otra">Enviar otra respuesta</button>';
    } else if (vencido) {
      html = `<p>La fecha para confirmar terminó el ${esc(limiteTxt)}. Si necesitas ayuda, contáctanos.</p>`;
    } else {
      html = `
        <form id="form-rsvp" novalidate>
          <h3>¡Confirma tu asistencia!</h3>
          ${limite ? `<p class="rsvp-limite">Por favor confirma antes del ${esc(limiteTxt)}.</p>` : ''}
          <label class="campo">Tu nombre (o el de tu familia)
            <input type="text" name="nombre" maxlength="120" autocomplete="name" required>
          </label>
          <label class="campo">Tu teléfono (10 dígitos)
            <input type="tel" name="telefono" maxlength="14" inputmode="numeric" autocomplete="tel" placeholder="3751234567" required>
          </label>
          <div class="opciones" role="radiogroup" aria-label="¿Asistirás?">
            <label class="opcion"><input type="radio" name="asistencia" value="si" checked><span>Asistiré</span></label>
            <label class="opcion"><input type="radio" name="asistencia" value="no"><span>No podré asistir</span></label>
          </div>
          <label class="campo" id="campo-personas">¿Cuántas personas asistirán?
            <select name="confirmados">
              ${Array.from({ length: max }, (_, i) => i + 1).map((n) => `<option value="${n}">${plural(n, 'persona', 'personas')}</option>`).join('')}
            </select>
          </label>
          <fieldset class="campo campo-nombres" id="campo-nombres">
            <legend>Nombre de quienes asistirán</legend>
            <div id="nombres"></div>
          </fieldset>
          <label class="campo"><span id="lbl-msj">Mensaje para los novios (opcional)</span>
            <textarea name="comentario" maxlength="500"></textarea>
          </label>
          <p class="rsvp-error" id="rsvp-error" role="alert"></p>
          <button type="submit" class="btn">Confirmar</button>
        </form>`;
    }
    box.innerHTML = `<div class="rsvp-box">${html}</div>`;
    pintarDock();

    $('#rsvp-otra')?.addEventListener('click', () => { estado.editando = true; pintarGeneral(); });
    const form = $('#form-rsvp');
    if (!form) return;
    const pintarNombres = () => {
      const actuales = $$('#nombres input').map((i) => i.value);
      $('#nombres').innerHTML = Array.from({ length: Number(form.confirmados.value) }, (_, i) => `
        <input type="text" name="asistente" maxlength="80" autocomplete="off"
          placeholder="Nombre de la persona ${i + 1}" aria-label="Nombre de la persona ${i + 1}"
          value="${esc(actuales[i] ?? '')}">`).join('');
    };
    form.confirmados.addEventListener('change', pintarNombres);
    pintarNombres();
    // el primer asistente se llena con el nombre de quien confirma
    form.nombre.addEventListener('input', () => {
      const primero = $('#nombres input');
      if (primero && (!primero.value || primero.dataset.auto)) { primero.value = form.nombre.value; primero.dataset.auto = '1'; }
    });
    const sync = () => {
      const va = form.asistencia.value === 'si';
      $('#campo-personas').hidden = !va;
      $('#campo-nombres').hidden = !va;
      $('#lbl-msj').textContent = va
        ? 'Mensaje para los novios (opcional)'
        : 'Lamentamos que no puedas asistir, si lo deseas, déjanos un mensaje';
    };
    form.addEventListener('change', sync);
    sync();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('button[type=submit]', form);
      const va = form.asistencia.value === 'si';
      const nombre = form.nombre.value.trim();
      const nombres = $$('#nombres input').map((i) => i.value.trim());
      const telefono = form.telefono.value.replace(/\D/g, '').slice(-10);
      if (nombre.length < 2) { $('#rsvp-error').textContent = 'Escribe tu nombre.'; form.nombre.focus(); return; }
      if (telefono.length !== 10) {
        $('#rsvp-error').textContent = 'Escribe tu teléfono a 10 dígitos.';
        form.telefono.focus();
        return;
      }
      if (va && nombres.some((n) => !n)) {
        $('#rsvp-error').textContent = 'Escribe el nombre de cada persona que asistirá.';
        $$('#nombres input').find((i) => !i.value.trim())?.focus();
        return;
      }
      const datos = {
        nombre,
        telefono,
        asistencia: va ? 'si' : 'no',
        confirmados: va ? Number(form.confirmados.value) : 0,
        asistentes: va ? nombres.join(', ') : '',
        comentario: form.comentario.value.trim(),
      };
      btn.disabled = true;
      btn.textContent = 'Enviando...';
      try {
        await api.guardarGeneral(datos);
        try { localStorage.setItem('rsvp_general', JSON.stringify({ ...datos, fecha: new Date().toISOString() })); } catch { /* */ }
        estado.editando = false;
        pintarGeneral();
        if (va && window.confetti) {
          confetti({ particleCount: 140, spread: 80, origin: { y: .75 }, colors: ['#ffffff', '#ece6dd', '#c5bfbb', '#ddd7a8'] });
        }
      } catch (err) {
        $('#rsvp-error').textContent = err.code === 'duplicado'
          ? 'Este teléfono ya está registrado. Si necesitas cambiar algo, escríbenos por WhatsApp (abajo, en Contacto).'
          : 'No pudimos guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.';
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
    });
  }

  function pintarDock() {
    const dock = $('#dock');
    if (!ID && GENERAL) {
      const g = leerGeneral();
      const t = g?.asistencia === 'si' ? 'si' : g?.asistencia === 'no' ? 'no' : 'pendiente';
      dock.className = `dock ${t}`;
      const txt = {
        si: ['fa-check', '¡Asistencia confirmada!', plural(g?.confirmados, 'persona confirmada', 'personas confirmadas'), 'Ver'],
        no: ['fa-xmark', 'No podrás asistir', 'Gracias por avisarnos', 'Ver'],
        pendiente: ['fa-envelope', 'Confirma tu asistencia', limite ? `Antes del ${limiteTxt}` : '¡Te esperamos!', 'Confirmar'],
      }[t];
      $('#dock-ico').innerHTML = `<i class="fa-solid ${txt[0]}"></i>`;
      $('#dock-t').textContent = txt[1];
      $('#dock-s').textContent = txt[2];
      $('#dock-btn-t').textContent = txt[3];
      if (!$('#portal')) dock.hidden = false;
      return;
    }
    const inv = estado.invitado;
    if (!inv || !habilitado(inv)) { dock.hidden = true; return; }
    const r = inv.respuesta;
    const tipo = r?.asistencia === 'si' ? 'si' : r?.asistencia === 'no' ? 'no' : 'pendiente';
    dock.className = `dock ${tipo}`;
    const txt = {
      si: ['fa-check', '¡Asistencia confirmada!', plural(r?.confirmados, 'persona confirmada', 'personas confirmadas'), 'Modificar'],
      no: ['fa-xmark', 'No podrás asistir', 'Gracias por avisarnos', 'Modificar'],
      pendiente: ['fa-envelope', 'Confirma tu asistencia', limite ? `Antes del ${limiteTxt}` : `${plural(inv.personas, 'lugar reservado', 'lugares reservados')}`, 'Confirmar'],
    }[tipo];
    $('#dock-ico').innerHTML = `<i class="fa-solid ${txt[0]}"></i>`;
    $('#dock-t').textContent = txt[1];
    $('#dock-s').textContent = txt[2];
    $('#dock-btn-t').textContent = vencido && tipo === 'pendiente' ? 'Ver' : txt[3];
    if (!$('#portal')) dock.hidden = false;
  }

  $('#dock-btn').addEventListener('click', () => {
    if (estado.invitado?.respuesta?.asistencia && !vencido) { estado.editando = true; pintarRSVP(); }
    $('#confirmar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Redibuja el pase y la confirmación cuando cambian los datos en Firebase
  // (si el invitado está llenando el formulario, espera a que termine).
  let pendiente = false;
  function aplicarCambios(inv) {
    estado.invitado = inv;
    const form = $('#form-rsvp');
    if (form && form.contains(document.activeElement)) {
      if (!pendiente) {
        pendiente = true;
        form.addEventListener('focusout', () => setTimeout(() => {
          if (!form.contains(document.activeElement)) { pendiente = false; aplicarCambios(estado.invitado); }
        }, 0), { once: true });
      }
      return;
    }
    if (inv) pintarPase(inv);
    else if ($('#pase')) $('#pase').hidden = true;
    pintarRSVP();
  }

  (async () => {
    if (ID && fb()) {
      try {
        (await fb()).escuchar(ID, aplicarCambios);
        return;
      } catch { /* si falla, se usa la lectura normal */ }
    }
    if (ID) {
      try { estado.invitado = await api.obtener(ID); } catch { estado.invitado = null; }
      if (estado.invitado) pintarPase(estado.invitado);
    }
    pintarRSVP();
  })();
})();
