// ================================================================
// CONTROLADOR PRINCIPAL DE LA APLICACIÓN
// Router, navegación, manejo de pantallas
// ================================================================

// ── Navegación ──────────────────────────────────────────────────

function navigateTo(screenId, params = {}) {
  // Ocultar todas las pantallas
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  
  // Mostrar pantalla destino
  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  
  // Actualizar barra de navegación
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-screen="${screenId.split('-')[0]}"]`);
  if (navItem) navItem.classList.add('active');
  
  // Cargar datos de la pantalla
  loadScreen(screenId, params);
  
  // Guardar historial
  AppState.currentScreen = screenId;
}

function loadScreen(screenId, params = {}) {
  switch (screenId) {
    case 'home': loadHomeScreen(); break;
    case 'consultas': loadConsultasScreen(); break;
    case 'asociado-view': loadAsociadoViewScreen(params); break;
    case 'tesoreria': loadTesoreriaScreen(); break;
    case 'tesoreria-asociados': loadAsociadosList(); break;
    case 'tesoreria-facturas': loadFacturasList(); break;
    case 'tesoreria-recibos': loadRecibosList(); break;
    case 'tesoreria-ingresos': loadIngresosEgresos(); break;
    case 'factura-nueva': loadNuevaFactura(params); break;
    case 'factura-ver': loadVerFactura(params.id); break;
    case 'recibo-nuevo': loadNuevoRecibo(params); break;
    case 'recibo-ver': loadVerRecibo(params.id); break;
    case 'medidores': loadMedidores(); break;
    case 'encuesta': loadEncuestas(); break;
    case 'galeria': loadGaleria(); break;
    case 'admin': loadAdmin(); break;
    case 'admin-notificaciones': loadAdminNotificaciones(); break;
    case 'about': break; // Estático
  }
}

// ── Sesión ────────────────────────────────────────────────────

function saveSession(user) {
  AppState.session = user;
  localStorage.setItem('alg_session', JSON.stringify(user));
  updateNavForRole();
}

function loadSession() {
  try {
    const saved = localStorage.getItem('alg_session');
    if (saved) {
      AppState.session = JSON.parse(saved);
      updateNavForRole();
    }
  } catch (e) {}
}

function logout() {
  AppState.session = null;
  AppState.asociado = null;
  localStorage.removeItem('alg_session');
  updateNavForRole();
  navigateTo('home');
  showToast('Sesión cerrada', 'info');
}

function isLoggedIn() { return !!AppState.session; }
function isAdmin() { return AppState.session?.rol === 'admin'; }
function isTesorero() { return AppState.session?.rol === 'tesorero' || isAdmin(); }

function updateNavForRole() {
  const navTesoreria = document.querySelector('.nav-item[data-screen="tesoreria"]');
  const navAdmin = document.querySelector('.nav-item[data-screen="admin"]');
  const headerEditBtn = document.getElementById('btn-edit-home');
  const headerLoginBtn = document.getElementById('btn-header-login');
  const headerLogoutBtn = document.getElementById('btn-header-logout');
  const headerUser = document.getElementById('header-user-name');
  
  if (isTesorero()) {
    navTesoreria?.classList.remove('nav-hidden');
  } else {
    navTesoreria?.classList.add('nav-hidden');
  }
  
  if (isAdmin()) {
    navAdmin?.classList.remove('nav-hidden');
  } else {
    navAdmin?.classList.add('nav-hidden');
  }
  
  if (headerEditBtn) headerEditBtn.style.display = (isTesorero() || isAdmin()) ? 'flex' : 'none';
  if (headerLoginBtn) headerLoginBtn.style.display = isLoggedIn() ? 'none' : 'flex';
  if (headerLogoutBtn) headerLogoutBtn.style.display = isLoggedIn() ? 'flex' : 'none';
  if (headerUser) {
    headerUser.textContent = AppState.session ? AppState.session.nombre : '';
    headerUser.style.display = isLoggedIn() ? 'block' : 'none';
  }
}

// ── Login ──────────────────────────────────────────────────────

function openLoginModal() {
  document.getElementById('modal-login').classList.add('active');
  document.getElementById('login-documento').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').textContent = '';
}

function closeLoginModal() {
  document.getElementById('modal-login').classList.remove('active');
}

async function handleLogin() {
  const doc = document.getElementById('login-documento').value.trim();
  const pass = document.getElementById('login-password').value.trim();
  const errEl = document.getElementById('login-error');
  
  if (!doc || !pass) {
    errEl.textContent = 'Ingrese documento y contraseña';
    return;
  }
  
  showLoading(true);
  try {
    const user = await DB.loginUsuario(doc, pass);
    if (user) {
      saveSession(user);
      closeLoginModal();
      showToast(`Bienvenido, ${user.nombre}`, 'success');
      navigateTo('home');
    } else {
      errEl.textContent = '❌ Documento o contraseña incorrectos';
    }
  } catch (e) {
    errEl.textContent = '❌ Error de conexión';
  } finally {
    showLoading(false);
  }
}

// ── HOME SCREEN ────────────────────────────────────────────────

async function loadHomeScreen() {
  // Saludo
  const greeting = document.getElementById('home-greeting');
  const subGreeting = document.getElementById('home-sub-greeting');
  if (greeting) {
    if (AppState.session) {
      greeting.textContent = `${getGreeting()}, ${AppState.session.nombre}`;
      subGreeting.textContent = `Rol: ${AppState.session.rol.charAt(0).toUpperCase() + AppState.session.rol.slice(1)}`;
    } else if (AppState.asociado) {
      greeting.textContent = `${getGreeting()}, ${AppState.asociado.nombre}`;
      subGreeting.textContent = 'Asociado · Acueducto Los Guaduales';
    } else {
      greeting.textContent = '💧 Acueducto Los Guaduales';
      subGreeting.textContent = '"La semilla del futuro"';
    }
  }
  
  // Notificaciones generales
  await loadHomeNotificaciones();
  // Galería
  await loadHomeGaleria();
  // Videos
  await loadHomeVideo();
}

async function loadHomeNotificaciones() {
  const container = document.getElementById('home-notifications');
  if (!container) return;
  
  try {
    const notifs = await DB.getNotificaciones();
    if (notifs.length === 0) {
      container.innerHTML = '<p class="empty-msg">Sin notificaciones activas</p>';
      return;
    }
    container.innerHTML = notifs.map(n => buildNotifCard(n)).join('');
  } catch (e) {
    container.innerHTML = '<p class="empty-msg">Sin conexión</p>';
  }
}

function buildNotifCard(n) {
  const tipos = {
    general: { icon: '📢', class: 'notif-general', label: 'General' },
    info: { icon: 'ℹ️', class: 'notif-info', label: 'Información' },
    importante: { icon: '⚠️', class: 'notif-importante', label: 'Importante' },
    urgente: { icon: '🚨', class: 'notif-urgente', label: 'Urgente' },
    celebracion: { icon: '🎉', class: 'notif-celebracion', label: 'Celebración' }
  };
  const t = tipos[n.tipo] || tipos.info;
  const imgHtml = n.imagen_url
    ? `<img src="${escapeHtml(n.imagen_url)}" class="notif-image" alt="Imagen" loading="lazy" onerror="this.style.display='none'">`
    : '';
  return `
    <div class="notif-card ${t.class}">
      <div class="notif-header">
        <span class="notif-icon">${t.icon}</span>
        <div class="notif-meta">
          <span class="notif-label">${t.label}</span>
          <span class="notif-date">${formatDate(n.created_at?.split('T')[0])}</span>
        </div>
      </div>
      <h3 class="notif-title">${escapeHtml(n.titulo)}</h3>
      <p class="notif-msg">${escapeHtml(n.mensaje)}</p>
      ${imgHtml}
    </div>`;
}

async function loadHomeGaleria() {
  const container = document.getElementById('home-gallery');
  if (!container) return;
  try {
    const items = await DB.getGaleria();
    if (items.length === 0) {
      container.innerHTML = '';
      container.closest('.home-section')?.style.setProperty('display', 'none');
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="gallery-item" onclick="openImageFullscreen('${escapeHtml(item.url)}', '${escapeHtml(item.descripcion||'')}')">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.descripcion||'Imagen')}" loading="lazy" onerror="this.style.display='none'">
        ${item.descripcion ? `<span class="gallery-caption">${escapeHtml(item.descripcion)}</span>` : ''}
      </div>`).join('');
  } catch (e) { /* ignorar error de galería */ }
}

async function loadHomeVideo() {
  const container = document.getElementById('home-video-container');
  if (!container) return;
  try {
    const videos = await DB.getVideos();
    const featured = videos.find(v => v.destacado) || videos[0];
    if (!featured) {
      container.closest('.home-section')?.style.setProperty('display', 'none');
      return;
    }
    // Convertir URL de YouTube a embed
    let embedUrl = featured.url;
    const ytMatch = featured.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    container.innerHTML = `
      <div class="video-wrapper">
        <iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(featured.titulo||'Video')}"
          frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
      ${featured.titulo ? `<p class="video-title">${escapeHtml(featured.titulo)}</p>` : ''}`;
  } catch (e) { /* ignorar */ }
}

function openImageFullscreen(url, desc) {
  const modal = document.getElementById('modal-image');
  if (!modal) return;
  modal.querySelector('img').src = url;
  modal.querySelector('.image-desc').textContent = desc || '';
  modal.classList.add('active');
}

// ── CONSULTAS SCREEN ────────────────────────────────────────────

function loadConsultasScreen() {
  document.getElementById('consultas-documento').value = '';
  document.getElementById('consultas-error').textContent = '';
}

async function buscarAsociado() {
  const doc = document.getElementById('consultas-documento').value.trim();
  const errEl = document.getElementById('consultas-error');
  
  if (!doc) {
    errEl.textContent = 'Ingrese su número de documento';
    return;
  }
  errEl.textContent = '';
  showLoading(true);
  
  try {
    const asociado = await DB.getAsociadoByDocumento(doc);
    showLoading(false);
    
    if (!asociado) {
      // Modal: No encontrado
      const modal = document.getElementById('modal-not-found');
      modal.classList.add('active');
      return;
    }
    
    // Modal: Encontrado
    AppState.asociado = asociado;
    const modal = document.getElementById('modal-found');
    document.getElementById('found-nombre').textContent = asociado.nombre;
    document.getElementById('found-doc').textContent = asociado.documento;
    modal.classList.add('active');
    
  } catch (e) {
    showLoading(false);
    errEl.textContent = '❌ Error al conectar. Intente nuevamente.';
  }
}

function continueToAsociado() {
  document.getElementById('modal-found').classList.remove('active');
  showTransitionLoading(() => navigateTo('asociado-view'));
}

async function loadAsociadoViewScreen() {
  const asociado = AppState.asociado;
  if (!asociado) { navigateTo('consultas'); return; }
  
  document.getElementById('av-nombre').textContent = asociado.nombre;
  document.getElementById('av-doc').textContent = 'Doc: ' + asociado.documento;
  
  // Cargar facturas del asociado
  showLoading(true);
  try {
    const [facturas, notifs, unread] = await Promise.all([
      DB.getFacturasByAsociado(asociado.id),
      DB.getNotificacionesAsociado(asociado.id),
      DB.countUnreadNotificaciones(asociado.id)
    ]);
    
    // Actualizar badge de notificaciones
    AppState.unreadNotifications = unread;
    updateNotifBadge(unread, 'av-notif-badge');
    
    // Resumen
    const pendientes = facturas.filter(f => f.estado === 'pendiente' || f.estado === 'vencida');
    const pagadas = facturas.filter(f => f.estado === 'pagada');
    document.getElementById('av-pendientes').textContent = pendientes.length;
    document.getElementById('av-pagadas').textContent = pagadas.length;
    document.getElementById('av-total-deuda').textContent = formatCOP(
      pendientes.reduce((s, f) => s + (f.valor_total || 0), 0)
    );
    
    // Lista de facturas
    const list = document.getElementById('av-facturas-list');
    if (facturas.length === 0) {
      list.innerHTML = '<div class="empty-card"><span>📄</span><p>Sin facturas registradas</p></div>';
    } else {
      list.innerHTML = facturas.map(f => buildFacturaCard(f, true)).join('');
    }
    
    // Notificaciones asociado
    renderNotificacionesAsociado(notifs);
    
  } catch (e) {
    showToast('Error al cargar datos', 'error');
  } finally {
    showLoading(false);
  }
}

function renderNotificacionesAsociado(notifs) {
  const panel = document.getElementById('av-notif-panel');
  if (!panel) return;
  panel.innerHTML = notifs.length === 0
    ? '<p class="empty-msg">Sin notificaciones</p>'
    : notifs.map(n => {
        const tipos = {
          pago_realizado: { icon: '✅', class: 'notif-success' },
          factura_cancelada: { icon: '🗑️', class: 'notif-info' },
          servicio_suspendido: { icon: '🚫', class: 'notif-urgente' },
          factura_vencida: { icon: '⏰', class: 'notif-importante' },
          nueva_factura: { icon: '📋', class: 'notif-info' }
        };
        const t = tipos[n.tipo] || { icon: '📢', class: '' };
        return `<div class="notif-card ${t.class} ${n.leido ? 'leida' : 'nueva'}" onclick="marcarNotifLeida('${n.id}', this)">
          <div class="notif-header">
            <span class="notif-icon">${t.icon}</span>
            ${!n.leido ? '<span class="notif-dot"></span>' : ''}
            <span class="notif-date">${formatDate(n.created_at?.split('T')[0])}</span>
          </div>
          <h3 class="notif-title">${escapeHtml(n.titulo)}</h3>
          <p class="notif-msg">${escapeHtml(n.mensaje)}</p>
        </div>`;
      }).join('');
}

async function marcarNotifLeida(id, el) {
  await DB.marcarNotificacionLeida(id);
  el.classList.remove('nueva');
  el.classList.add('leida');
  el.querySelector('.notif-dot')?.remove();
  AppState.unreadNotifications = Math.max(0, AppState.unreadNotifications - 1);
  updateNotifBadge(AppState.unreadNotifications, 'av-notif-badge');
}

function updateNotifBadge(count, badgeId) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = count > 0 ? count : '';
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function toggleNotifPanel() {
  const panel = document.getElementById('av-notif-panel');
  const isOpen = panel.classList.toggle('open');
  if (isOpen && AppState.asociado) {
    DB.marcarTodasLeidas(AppState.asociado.id).then(() => {
      AppState.unreadNotifications = 0;
      updateNotifBadge(0, 'av-notif-badge');
    });
  }
}

function buildFacturaCard(f, readonly = false) {
  const estadoColors = {
    pendiente: 'status-pendiente',
    pagada: 'status-pagada',
    vencida: 'status-vencida',
    suspendida: 'status-suspendida'
  };
  const estadoLabels = {
    pendiente: 'Pendiente', pagada: 'Pagada', vencida: 'Vencida', suspendida: 'Suspendida'
  };
  const actionBtn = readonly
    ? ''
    : `<button class="btn btn-sm btn-outline" onclick="navigateTo('factura-ver', {id: '${f.id}'})">Ver</button>`;
  
  return `
    <div class="factura-card" onclick="${readonly ? `openFacturaPublic('${f.id}')` : `navigateTo('factura-ver', {id:'${f.id}'})`}">
      <div class="fc-header">
        <div>
          <span class="fc-num">${escapeHtml(f.numero_factura)}</span>
          <span class="fc-mes">${escapeHtml(f.mes_facturado)} ${f.anio}</span>
        </div>
        <span class="status-badge ${estadoColors[f.estado] || ''}">${estadoLabels[f.estado] || f.estado}</span>
      </div>
      <div class="fc-body">
        <div class="fc-detail">
          <span>Consumo</span>
          <strong>${formatM3(f.consumo_m3)}</strong>
        </div>
        <div class="fc-detail">
          <span>Total</span>
          <strong class="fc-total">${formatCOP(f.valor_total)}</strong>
        </div>
        <div class="fc-detail">
          <span>Límite</span>
          <strong>${formatDate(f.fecha_limite)}</strong>
        </div>
      </div>
    </div>`;
}

async function openFacturaPublic(id) {
  showLoading(true);
  try {
    const factura = await DB.getFacturaById(id);
    showLoading(false);
    if (factura) renderFacturaPrint(factura, true);
  } catch (e) {
    showLoading(false);
  }
}

// ── TESORERÍA ──────────────────────────────────────────────────

async function loadTesoreriaScreen() {
  if (!isTesorero()) { openLoginModal(); return; }
  try {
    const stats = await DB.getResumenTesoreria();
    document.getElementById('ts-facturas-total').textContent = stats.totalFacturas;
    document.getElementById('ts-facturas-pendientes').textContent = stats.facturasPendientes;
    document.getElementById('ts-facturas-pagadas').textContent = stats.facturasPagadas;
    document.getElementById('ts-cobrado').textContent = formatCOP(stats.totalCobrado);
    document.getElementById('ts-pendiente').textContent = formatCOP(stats.totalPendiente);
    document.getElementById('ts-balance').textContent = formatCOP(stats.totalIngresos - stats.totalEgresos);
  } catch (e) { /* no critical */ }
}

// ── LISTA DE ASOCIADOS ─────────────────────────────────────────

async function loadAsociadosList() {
  if (!isTesorero()) { navigateTo('home'); return; }
  showLoading(true);
  try {
    const asociados = await DB.getAsociados();
    const list = document.getElementById('asociados-list');
    const search = document.getElementById('asociados-search')?.value.toLowerCase() || '';
    const filtered = asociados.filter(a =>
      a.nombre.toLowerCase().includes(search) ||
      a.documento.toLowerCase().includes(search)
    ).filter(a => a.rol === 'asociado');
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty-card"><span>👥</span><p>Sin asociados registrados</p><button class="btn btn-primary" onclick="openFormAsociado()">Agregar primero</button></div>';
    } else {
      list.innerHTML = filtered.map(a => `
        <div class="list-item" onclick="openFormAsociado('${a.id}')">
          <div class="li-icon">${a.nombre.charAt(0).toUpperCase()}</div>
          <div class="li-info">
            <span class="li-name">${escapeHtml(a.nombre)}</span>
            <span class="li-detail">Doc: ${escapeHtml(a.documento)} ${a.telefono ? '· ' + a.telefono : ''}</span>
          </div>
          <span class="li-arrow">›</span>
        </div>`).join('');
    }
  } catch (e) {
    showToast('Error al cargar asociados', 'error');
  } finally {
    showLoading(false);
  }
}

// ── FORM ASOCIADO ───────────────────────────────────────────────

async function openFormAsociado(id = null) {
  const modal = document.getElementById('modal-form-asociado');
  const form = document.getElementById('form-asociado');
  const title = document.getElementById('form-asociado-title');
  const delBtn = document.getElementById('btn-delete-asociado');
  
  form.reset();
  document.getElementById('fa-id').value = '';
  
  if (id) {
    title.textContent = 'Editar Asociado';
    delBtn.style.display = 'block';
    showLoading(true);
    try {
      const a = await DB.getAsociadoById(id);
      document.getElementById('fa-id').value = a.id;
      document.getElementById('fa-nombre').value = a.nombre || '';
      document.getElementById('fa-documento').value = a.documento || '';
      document.getElementById('fa-email').value = a.email || '';
      document.getElementById('fa-telefono').value = a.telefono || '';
      document.getElementById('fa-direccion').value = a.direccion || '';
    } catch (e) { showToast('Error al cargar', 'error'); }
    showLoading(false);
  } else {
    title.textContent = 'Nuevo Asociado';
    delBtn.style.display = 'none';
  }
  modal.classList.add('active');
}

async function saveAsociado() {
  const id = document.getElementById('fa-id').value;
  const data = {
    nombre: document.getElementById('fa-nombre').value.trim().toUpperCase(),
    documento: document.getElementById('fa-documento').value.trim(),
    email: document.getElementById('fa-email').value.trim(),
    telefono: document.getElementById('fa-telefono').value.trim(),
    direccion: document.getElementById('fa-direccion').value.trim(),
    rol: 'asociado'
  };
  
  if (!data.nombre || !data.documento) {
    showToast('Nombre y documento son obligatorios', 'warning');
    return;
  }
  
  showLoading(true);
  try {
    if (id) {
      await DB.updateAsociado(id, data);
      showToast('Asociado actualizado', 'success');
    } else {
      await DB.createAsociado(data);
      showToast('Asociado creado', 'success');
    }
    document.getElementById('modal-form-asociado').classList.remove('active');
    loadAsociadosList();
  } catch (e) {
    showToast(e.message?.includes('unique') ? 'El documento ya existe' : 'Error al guardar', 'error');
  } finally {
    showLoading(false);
  }
}

async function deleteAsociadoConfirm() {
  const id = document.getElementById('fa-id').value;
  if (!id) return;
  const nombre = document.getElementById('fa-nombre').value;
  
  const confirmed = await showGithubConfirm({
    title: '⚠️ Eliminar Asociado',
    message: 'Esta acción es permanente y eliminará todas las facturas y recibos del asociado.',
    confirmText: nombre,
    dangerLabel: 'Eliminar Asociado'
  });
  if (!confirmed) return;
  
  showLoading(true);
  try {
    await DB.deleteAsociado(id);
    showToast('Asociado eliminado', 'success');
    document.getElementById('modal-form-asociado').classList.remove('active');
    loadAsociadosList();
  } catch (e) {
    showToast('Error al eliminar', 'error');
  } finally {
    showLoading(false);
  }
}

// ── FACTURAS ───────────────────────────────────────────────────

async function loadFacturasList() {
  if (!isTesorero()) { navigateTo('home'); return; }
  showLoading(true);
  try {
    const facturas = await DB.getFacturas();
    const list = document.getElementById('facturas-list');
    if (facturas.length === 0) {
      list.innerHTML = '<div class="empty-card"><span>📄</span><p>Sin facturas</p></div>';
    } else {
      list.innerHTML = facturas.map(f => `
        <div class="factura-card" onclick="navigateTo('factura-ver', {id:'${f.id}'})">
          <div class="fc-header">
            <div>
              <span class="fc-num">${escapeHtml(f.numero_factura)}</span>
              <span class="fc-mes">${escapeHtml(f.asociados?.nombre || '-')}</span>
            </div>
            <span class="status-badge ${getEstadoClass(f.estado)}">${getEstadoLabel(f.estado)}</span>
          </div>
          <div class="fc-body">
            <div class="fc-detail"><span>${f.mes_facturado} ${f.anio}</span></div>
            <div class="fc-detail"><span>Total</span><strong>${formatCOP(f.valor_total)}</strong></div>
          </div>
        </div>`).join('');
    }
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

function getEstadoClass(e) {
  const m = {pendiente:'status-pendiente',pagada:'status-pagada',vencida:'status-vencida',suspendida:'status-suspendida'};
  return m[e] || '';
}
function getEstadoLabel(e) {
  const m = {pendiente:'Pendiente',pagada:'Pagada',vencida:'Vencida',suspendida:'Suspendida'};
  return m[e] || e;
}

async function loadNuevaFactura(params = {}) {
  if (!isTesorero()) { navigateTo('home'); return; }
  
  // Cargar asociados para el selector
  showLoading(true);
  try {
    const [asociados, ultimaFactura] = await Promise.all([
      DB.getAsociados(),
      DB.getLastNumeroFactura()
    ]);
    
    // Generar número
    let nextNum = 'FAC-0001';
    if (ultimaFactura) {
      const n = parseInt(ultimaFactura.replace('FAC-', '')) + 1;
      nextNum = `FAC-${String(n).padStart(4, '0')}`;
    }
    document.getElementById('nf-numero').value = nextNum;
    
    // Llenar selector de asociados
    const sel = document.getElementById('nf-asociado');
    const asociadosUsuarios = asociados.filter(a => a.rol === 'asociado');
    sel.innerHTML = '<option value="">— Seleccionar asociado —</option>' +
      asociadosUsuarios.map(a => `<option value="${a.id}" data-nombre="${escapeHtml(a.nombre)}">${escapeHtml(a.nombre)} (Doc: ${a.documento})</option>`).join('');
    
    if (params.asociadoId) sel.value = params.asociadoId;
    
    // Valores por defecto
    document.getElementById('nf-tarifa').value = AppState.config.TARIFA_M3;
    document.getElementById('nf-admin').value = AppState.config.ADMINISTRACION;
    document.getElementById('nf-fecha-emision').value = todayISO();
    document.getElementById('nf-fecha-lectura').value = todayISO();
    document.getElementById('nf-mes').value = MESES[new Date().getMonth()];
    document.getElementById('nf-anio').value = new Date().getFullYear();
    document.getElementById('nf-id').value = '';
    
    // Reset campos calculados
    ['nf-consumo','nf-valor-consumo','nf-valor-total'].forEach(id => {
      document.getElementById(id).textContent = formatCOP(0);
    });
    document.getElementById('nf-consumo-m3').textContent = '0.000 m³';
    
  } catch (e) { showToast('Error al cargar', 'error'); }
  finally { showLoading(false); }
}

function calcularFactura() {
  const anterior = parseFloat(document.getElementById('nf-anterior').value) || 0;
  const actual = parseFloat(document.getElementById('nf-actual').value) || 0;
  const tarifa = parseFloat(document.getElementById('nf-tarifa').value) || AppState.config.TARIFA_M3;
  const admin = parseFloat(document.getElementById('nf-admin').value) || AppState.config.ADMINISTRACION;
  const adicionales = parseFloat(document.getElementById('nf-cobros-adicionales').value) || 0;
  const m3Adicionales = parseFloat(document.getElementById('nf-m3-adicionales').value) || 0;
  
  const consumo = Math.max(0, actual - anterior);
  const valorConsumo = consumo * tarifa;
  const m3Total = consumo + m3Adicionales;
  const valorAdicional = m3Adicionales * tarifa;
  const total = valorConsumo + admin + adicionales + valorAdicional;
  
  document.getElementById('nf-consumo-m3').textContent = formatM3(consumo);
  document.getElementById('nf-consumo').textContent = formatM3(m3Total);
  document.getElementById('nf-valor-consumo').textContent = formatCOP(valorConsumo);
  document.getElementById('nf-valor-total').textContent = formatCOP(total);
}

async function saveFactura() {
  const id = document.getElementById('nf-id').value;
  const anterior = parseFloat(document.getElementById('nf-anterior').value) || 0;
  const actual = parseFloat(document.getElementById('nf-actual').value) || 0;
  const tarifa = parseFloat(document.getElementById('nf-tarifa').value) || AppState.config.TARIFA_M3;
  const admin = parseFloat(document.getElementById('nf-admin').value) || AppState.config.ADMINISTRACION;
  const adicionales = parseFloat(document.getElementById('nf-cobros-adicionales').value) || 0;
  const m3Adicionales = parseFloat(document.getElementById('nf-m3-adicionales').value) || 0;
  
  const consumo = Math.max(0, actual - anterior);
  const valorConsumo = consumo * tarifa;
  const valorAdicional = m3Adicionales * tarifa;
  const total = valorConsumo + admin + adicionales + valorAdicional;
  
  const data = {
    numero_factura: document.getElementById('nf-numero').value.trim(),
    asociado_id: document.getElementById('nf-asociado').value,
    mes_facturado: document.getElementById('nf-mes').value,
    anio: parseInt(document.getElementById('nf-anio').value),
    fecha_lectura: document.getElementById('nf-fecha-lectura').value || todayISO(),
    lectura_anterior: anterior,
    lectura_actual: actual,
    consumo_m3: consumo,
    tarifa_m3: tarifa,
    valor_consumo: valorConsumo,
    administracion: admin,
    cobros_adicionales: adicionales,
    m3_adicionales: m3Adicionales,
    valor_adicional: valorAdicional,
    valor_total: total,
    fecha_emision: document.getElementById('nf-fecha-emision').value || todayISO(),
    fecha_limite: document.getElementById('nf-fecha-limite').value || null,
    notas: document.getElementById('nf-notas').value.trim(),
    estado: 'pendiente',
    created_by: AppState.session?.id
  };
  
  if (!data.asociado_id || !data.mes_facturado) {
    showToast('Asociado y mes son obligatorios', 'warning'); return;
  }
  
  showLoading(true);
  try {
    let factura;
    if (id) {
      factura = await DB.updateFactura(id, data);
      showToast('Factura actualizada', 'success');
    } else {
      factura = await DB.createFactura(data);
      // Notificación automática al asociado
      await DB.createNotificacionAsociado({
        asociado_id: data.asociado_id,
        tipo: 'nueva_factura',
        titulo: '📋 Nueva Factura',
        mensaje: `Hola ${factura.asociados?.nombre || ''}. Tiene una nueva factura. Número: ${data.numero_factura} · Mes: ${data.mes_facturado} ${data.anio} · Valor: ${formatCOP(total)} · Fecha límite: ${formatDate(data.fecha_limite)}`,
        factura_id: factura.id
      });
      showToast('Factura creada y notificación enviada', 'success');
    }
    navigateTo('factura-ver', { id: factura.id });
  } catch (e) {
    showToast(e.message?.includes('unique') ? 'Número de factura ya existe' : 'Error al guardar', 'error');
  } finally { showLoading(false); }
}

async function loadVerFactura(id) {
  if (!id) { navigateTo('tesoreria-facturas'); return; }
  showLoading(true);
  try {
    const factura = await DB.getFacturaById(id);
    if (!factura) { showToast('Factura no encontrada', 'error'); return; }
    renderFacturaPrint(factura, false);
    // Guardar ID para acciones
    document.getElementById('vf-factura-id').value = id;
    document.getElementById('vf-factura-num').textContent = factura.numero_factura;
    document.getElementById('vf-estado').className = `status-badge ${getEstadoClass(factura.estado)}`;
    document.getElementById('vf-estado').textContent = getEstadoLabel(factura.estado);
  } catch (e) { showToast('Error al cargar factura', 'error'); }
  finally { showLoading(false); }
}

function renderFacturaPrint(f, readonly = false) {
  const config = AppState.config;
  const cuenta = AppState.cuentaBancaria;
  const consumo = parseFloat(f.consumo_m3) || 0;
  const m3Total = consumo + (parseFloat(f.m3_adicionales) || 0);
  
  const html = `
    <div class="factura-print" id="factura-print-area">
      <div class="fp-header">
        <div class="fp-empresa">
          <div class="fp-logo">💧</div>
          <div>
            <strong>${config.NOMBRE_ORG}</strong>
            <strong>${config.NOMBRE_ACUEDUCTO}</strong>
            <small>NIT. ${config.NIT}</small>
            <small>${config.VEREDA}</small>
          </div>
        </div>
        <div class="fp-meta">
          <div class="fp-meta-row"><span>N° Factura:</span><strong>${f.numero_factura}</strong></div>
          <div class="fp-meta-row"><span>ID Pago:</span><small>${f.id_pago || f.id?.substring(0,12)+'...'}</small></div>
          <div class="fp-meta-row"><span>Emisión:</span><span>${formatDate(f.fecha_emision)}</span></div>
          <div class="fp-meta-row limit"><span>Límite:</span><strong class="text-danger">${formatDate(f.fecha_limite)}</strong></div>
        </div>
      </div>
      
      <div class="fp-section">
        <div class="fp-section-title">DATOS DEL ASOCIADO</div>
        <div class="fp-row">
          <div class="fp-field"><label>Nombre completo</label><strong>${f.asociados?.nombre || '-'}</strong></div>
          <div class="fp-field"><label>Documento de identidad</label><strong>${f.asociados?.documento || '-'}</strong></div>
        </div>
      </div>
      
      <div class="fp-section">
        <div class="fp-section-title">LECTURA DEL MEDIDOR</div>
        <div class="fp-row-4">
          <div class="fp-field"><label>Fecha lectura</label><span>${formatDate(f.fecha_lectura)}</span></div>
          <div class="fp-field"><label>Anterior</label><span>${formatM3(f.lectura_anterior)}</span></div>
          <div class="fp-field"><label>Actual</label><span>${formatM3(f.lectura_actual)}</span></div>
          <div class="fp-field highlight"><label>Consumido</label><strong>${formatM3(consumo)}</strong></div>
        </div>
      </div>
      
      <div class="fp-section">
        <div class="fp-section-title">DETALLE DEL COBRO</div>
        <div class="fp-row-4">
          <div class="fp-field"><label>Mes facturado</label><span>${f.mes_facturado}</span></div>
          <div class="fp-field"><label>Consumo adicional</label><span>+ ${formatM3(f.m3_adicionales)}</span></div>
          <div class="fp-field"><label>Adm. mensual</label><span>$ ${parseInt(f.administracion).toLocaleString('es-CO')}</span></div>
          <div class="fp-field"><label>Total adicionales</label><span>${formatCOP(f.cobros_adicionales)}</span></div>
        </div>
        <div class="fp-row-3">
          <div class="fp-field"><label>Tarifa por m³</label><span>$ ${parseInt(f.tarifa_m3).toLocaleString('es-CO')}</span></div>
          <div class="fp-field"><label>m³ total</label><span>${formatM3(m3Total)}</span></div>
          <div class="fp-field"><label>Valor a pagar</label><span>${formatCOP(f.valor_consumo)}</span></div>
        </div>
      </div>
      
      ${cuenta ? `
      <div class="fp-section">
        <div class="fp-section-title">CUENTA PARA CONSIGNACIÓN</div>
        <div class="fp-row-3">
          <div class="fp-field"><label>Banco</label><span>${cuenta.banco}</span></div>
          <div class="fp-field"><label>Tipo de cuenta</label><span>${cuenta.tipo_cuenta}</span></div>
          <div class="fp-field"><label>Número de cuenta</label><span>${cuenta.numero_cuenta}</span></div>
        </div>
      </div>` : ''}
      
      <div class="fp-total">
        <span>VALOR TOTAL A PAGAR</span>
        <strong>${formatCOP(f.valor_total)}</strong>
      </div>
      
      ${f.notas ? `<div class="fp-section"><div class="fp-section-title">NOTAS ADICIONALES</div><p class="fp-notas">${escapeHtml(f.notas)}</p></div>` : ''}
      
      <div class="fp-firma">
        <div class="fp-sello"><span>Sello</span></div>
        <div class="fp-firma-admin">
          <strong>${config.NOMBRE_ADMIN}</strong>
          <span>Firma Administrador del Acueducto</span>
        </div>
      </div>
      <div class="fp-footer">${config.NOMBRE_ACUEDUCTO} · NIT. ${config.NIT}</div>
    </div>`;
  
  const container = document.getElementById('factura-print-container');
  if (container) container.innerHTML = html;
  
  if (readonly) {
    document.getElementById('modal-factura-public').classList.add('active');
  }
}

async function marcarFacturaPagada(id) {
  const confirmed = await showGithubConfirm({
    title: '✅ Marcar como Pagada',
    message: 'Esto cambiará el estado de la factura a PAGADA.',
    confirmText: 'PAGADA',
    dangerLabel: 'Confirmar'
  });
  if (!confirmed) return;
  showLoading(true);
  try {
    const factura = await DB.updateFacturaEstado(id, 'pagada');
    await DB.createNotificacionAsociado({
      asociado_id: factura.asociado_id,
      tipo: 'pago_realizado',
      titulo: '✅ Pago Registrado',
      mensaje: `Hola ${factura.asociados?.nombre || ''}. Su pago fue registrado correctamente. Factura: ${factura.numero_factura} · Mes: ${factura.mes_facturado} ${factura.anio} · Valor: ${formatCOP(factura.valor_total)} · Estado: Pagada`,
      factura_id: factura.id
    });
    showToast('Factura marcada como pagada', 'success');
    loadVerFactura(id);
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function cambiarEstadoFactura(id, estado) {
  showLoading(true);
  try {
    const factura = await DB.updateFacturaEstado(id, estado);
    // Notificaciones automáticas
    const tipoNotif = estado === 'vencida' ? 'factura_vencida' :
                      estado === 'suspendida' ? 'servicio_suspendido' :
                      estado === 'pagada' ? 'pago_realizado' : null;
    if (tipoNotif) {
      await DB.createNotificacionAsociado({
        asociado_id: factura.asociado_id,
        tipo: tipoNotif,
        titulo: getEstadoLabel(estado),
        mensaje: `Factura ${factura.numero_factura} · Estado actualizado a: ${getEstadoLabel(estado)}`,
        factura_id: factura.id
      });
    }
    showToast('Estado actualizado', 'success');
    loadVerFactura(id);
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function deleteFactura(id) {
  const num = document.getElementById('vf-factura-num').textContent;
  const confirmed = await showGithubConfirm({
    title: '⚠️ Eliminar Factura',
    message: 'Esta acción eliminará permanentemente la factura.',
    confirmText: num,
    dangerLabel: 'Eliminar Factura'
  });
  if (!confirmed) return;
  showLoading(true);
  try {
    await DB.deleteFactura(id);
    showToast('Factura eliminada', 'success');
    navigateTo('tesoreria-facturas');
  } catch (e) { showToast('Error al eliminar', 'error'); }
  finally { showLoading(false); }
}

// ── RECIBOS ──────────────────────────────────────────────────────

async function loadRecibosList() {
  if (!isTesorero()) { navigateTo('home'); return; }
  showLoading(true);
  try {
    const recibos = await DB.getRecibos();
    const list = document.getElementById('recibos-list');
    if (recibos.length === 0) {
      list.innerHTML = '<div class="empty-card"><span>🧾</span><p>Sin recibos registrados</p></div>';
    } else {
      list.innerHTML = recibos.map(r => `
        <div class="factura-card" onclick="navigateTo('recibo-ver', {id:'${r.id}'})">
          <div class="fc-header">
            <div>
              <span class="fc-num">${escapeHtml(r.numero_recibo)}</span>
              <span class="fc-mes">${escapeHtml(r.asociados?.nombre || '-')}</span>
            </div>
            <span class="status-badge status-pagada">Pagado</span>
          </div>
          <div class="fc-body">
            <div class="fc-detail"><span>${r.mes || '-'} ${r.anio || ''}</span></div>
            <div class="fc-detail"><span>Total</span><strong>${formatCOP(r.valor_total)}</strong></div>
            <div class="fc-detail"><span>${formatDate(r.fecha_pago)}</span></div>
          </div>
        </div>`).join('');
    }
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function loadNuevoRecibo(params = {}) {
  if (!isTesorero()) { navigateTo('home'); return; }
  showLoading(true);
  try {
    const [asociados, ultimoRecibo] = await Promise.all([
      DB.getAsociados(),
      DB.getLastNumeroRecibo()
    ]);
    
    let nextNum = 'REC-0001';
    if (ultimoRecibo) {
      const n = parseInt(ultimoRecibo.replace('REC-', '')) + 1;
      nextNum = `REC-${String(n).padStart(4, '0')}`;
    }
    document.getElementById('nr-numero').value = nextNum;
    
    const sel = document.getElementById('nr-asociado');
    sel.innerHTML = '<option value="">— Seleccionar asociado —</option>' +
      asociados.filter(a => a.rol === 'asociado').map(a =>
        `<option value="${a.id}">${escapeHtml(a.nombre)} (${a.documento})</option>`).join('');
    
    if (params.asociadoId) sel.value = params.asociadoId;
    
    document.getElementById('nr-admin').value = AppState.config.ADMINISTRACION;
    document.getElementById('nr-fecha').value = todayISO();
    document.getElementById('nr-mes').value = MESES[new Date().getMonth()];
    document.getElementById('nr-anio').value = new Date().getFullYear();
    document.getElementById('nr-id').value = '';
    
  } catch (e) { showToast('Error al cargar', 'error'); }
  finally { showLoading(false); }
}

function calcularRecibo() {
  const admin = parseFloat(document.getElementById('nr-admin').value) || 0;
  const multa = parseFloat(document.getElementById('nr-multa').value) || 0;
  const extra = parseFloat(document.getElementById('nr-extra').value) || 0;
  const total = admin + multa + extra;
  document.getElementById('nr-total').textContent = formatCOP(total);
}

async function saveRecibo() {
  const id = document.getElementById('nr-id').value;
  const admin = parseFloat(document.getElementById('nr-admin').value) || 0;
  const multa = parseFloat(document.getElementById('nr-multa').value) || 0;
  const extra = parseFloat(document.getElementById('nr-extra').value) || 0;
  const total = admin + multa + extra;
  
  const data = {
    numero_recibo: document.getElementById('nr-numero').value.trim(),
    asociado_id: document.getElementById('nr-asociado').value,
    concepto: document.getElementById('nr-concepto').value.trim(),
    mes: document.getElementById('nr-mes').value,
    anio: parseInt(document.getElementById('nr-anio').value),
    m3_consumidos: parseFloat(document.getElementById('nr-m3').value) || 0,
    tipo_pago: document.getElementById('nr-tipo-pago').value,
    administracion: admin,
    multa: multa,
    valor_total: total,
    notas: document.getElementById('nr-notas').value.trim(),
    fecha_pago: document.getElementById('nr-fecha').value || todayISO(),
    created_by: AppState.session?.id
  };
  
  if (!data.asociado_id) { showToast('Seleccione un asociado', 'warning'); return; }
  
  showLoading(true);
  try {
    const recibo = await DB.createRecibo(data);
    // Notificación pago realizado
    const asociado = await DB.getAsociadoById(data.asociado_id);
    await DB.createNotificacionAsociado({
      asociado_id: data.asociado_id,
      tipo: 'pago_realizado',
      titulo: '✅ Pago Registrado',
      mensaje: `Hola ${asociado?.nombre || ''}. Se registró correctamente su pago. Recibo: ${data.numero_recibo} · Fecha: ${formatDate(data.fecha_pago)} · Mes: ${data.mes} ${data.anio} · Valor: ${formatCOP(total)} · Estado: Pagado`,
      recibo_id: recibo.id
    });
    showToast('Recibo creado', 'success');
    navigateTo('recibo-ver', { id: recibo.id });
  } catch (e) {
    showToast(e.message?.includes('unique') ? 'Número de recibo ya existe' : 'Error al guardar', 'error');
  } finally { showLoading(false); }
}

async function loadVerRecibo(id) {
  if (!id) { navigateTo('tesoreria-recibos'); return; }
  showLoading(true);
  try {
    const r = await DB.getReciboById(id);
    if (!r) { showToast('Recibo no encontrado', 'error'); return; }
    renderReciboPrint(r);
    document.getElementById('vr-recibo-id').value = id;
    document.getElementById('vr-recibo-num').textContent = r.numero_recibo;
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

function renderReciboPrint(r) {
  const config = AppState.config;
  const html = `
    <div class="recibo-print" id="recibo-print-area">
      <div class="rp-header">
        <div class="rp-empresa">
          <div class="rp-logo">💧</div>
          <div>
            <strong>${config.NOMBRE_ACUEDUCTO}</strong>
            <small>${config.VEREDA}</small>
            <small>${config.MUNICIPIO}</small>
          </div>
        </div>
        <div class="rp-num-box">
          <div class="rp-num-label">RECIBO</div>
          <div class="rp-num">N° ${r.numero_recibo.replace('REC-', '')}</div>
          <div class="rp-fecha-label">Fecha:</div>
          <div class="rp-fecha">${formatDate(r.fecha_pago)}</div>
        </div>
      </div>
      
      <table class="rp-table">
        <tr><td class="rp-key">Asociado</td><td>${r.asociados?.nombre || '-'}</td></tr>
        <tr><td class="rp-key">Identificación</td><td>${r.asociados?.documento || '-'}</td></tr>
        <tr><td class="rp-key">Concepto</td><td>${escapeHtml(r.concepto || '-')}</td></tr>
        <tr><td class="rp-key">Mes</td><td>${r.mes || '-'} ${r.anio || ''}</td></tr>
        <tr><td class="rp-key">m³ consumidos</td><td>${formatM3(r.m3_consumidos)}</td></tr>
        <tr><td class="rp-key">Tipo de pago</td><td>${r.tipo_pago?.charAt(0).toUpperCase() + r.tipo_pago?.slice(1) || '-'}</td></tr>
        <tr><td class="rp-key">Adm. mensual</td><td>$ ${parseInt(r.administracion).toLocaleString('es-CO')}</td></tr>
        <tr><td class="rp-key">Total de multa</td><td>$ ${parseInt(r.multa).toLocaleString('es-CO')}</td></tr>
        <tr class="rp-total"><td>Valor total a pagar</td><td>${formatCOP(r.valor_total)}</td></tr>
        <tr><td class="rp-key">Notas adicionales</td><td>${escapeHtml(r.notas || 'No')}</td></tr>
      </table>
      
      <div class="rp-firma">
        <div class="rp-sello-box">
          <div class="rp-sello-inner">
            <strong>${config.NOMBRE_ORG}</strong>
            <small>${config.NOMBRE_ACUEDUCTO}</small>
            <small>NIT. ${config.NIT}</small>
          </div>
          <span>Sello</span>
        </div>
        <div class="rp-firma-box">
          <strong>${config.NOMBRE_ADMIN}</strong>
          <span>Firma Administrador del Acueducto</span>
        </div>
      </div>
      <div class="rp-footer">${config.NOMBRE_ACUEDUCTO} · ${config.MUNICIPIO}</div>
    </div>`;
  
  document.getElementById('recibo-print-container').innerHTML = html;
}

async function deleteRecibo(id) {
  const num = document.getElementById('vr-recibo-num').textContent;
  const confirmed = await showGithubConfirm({
    title: '⚠️ Eliminar Recibo',
    message: 'Esta acción eliminará permanentemente el recibo.',
    confirmText: num,
    dangerLabel: 'Eliminar Recibo'
  });
  if (!confirmed) return;
  showLoading(true);
  try {
    await DB.deleteRecibo(id);
    showToast('Recibo eliminado', 'success');
    navigateTo('tesoreria-recibos');
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

// ── INGRESOS / EGRESOS ──────────────────────────────────────────

async function loadIngresosEgresos() {
  showLoading(true);
  try {
    const items = await DB.getIngresosEgresos();
    const list = document.getElementById('ie-list');
    const totalI = items.filter(i => i.tipo === 'ingreso').reduce((s, i) => s + (i.valor || 0), 0);
    const totalE = items.filter(i => i.tipo === 'egreso').reduce((s, i) => s + (i.valor || 0), 0);
    document.getElementById('ie-total-ingresos').textContent = formatCOP(totalI);
    document.getElementById('ie-total-egresos').textContent = formatCOP(totalE);
    document.getElementById('ie-balance').textContent = formatCOP(totalI - totalE);
    
    list.innerHTML = items.length === 0
      ? '<div class="empty-card"><span>💰</span><p>Sin registros</p></div>'
      : items.map(i => `
          <div class="list-item">
            <div class="li-icon ${i.tipo === 'ingreso' ? 'li-ingreso' : 'li-egreso'}">
              ${i.tipo === 'ingreso' ? '↑' : '↓'}
            </div>
            <div class="li-info">
              <span class="li-name">${escapeHtml(i.concepto)}</span>
              <span class="li-detail">${formatDate(i.fecha)} ${i.categoria ? '· ' + i.categoria : ''}</span>
            </div>
            <div class="li-right">
              <strong class="${i.tipo === 'ingreso' ? 'text-success' : 'text-danger'}">${formatCOP(i.valor)}</strong>
              <button class="btn-icon" onclick="deleteIE('${i.id}')">🗑️</button>
            </div>
          </div>`).join('');
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function saveIngresoEgreso() {
  const data = {
    tipo: document.getElementById('ie-tipo').value,
    concepto: document.getElementById('ie-concepto').value.trim(),
    valor: parseFloat(document.getElementById('ie-valor').value) || 0,
    descripcion: document.getElementById('ie-descripcion').value.trim(),
    categoria: document.getElementById('ie-categoria').value.trim(),
    fecha: document.getElementById('ie-fecha').value || todayISO(),
    created_by: AppState.session?.id
  };
  if (!data.concepto || !data.valor) { showToast('Concepto y valor son obligatorios', 'warning'); return; }
  showLoading(true);
  try {
    await DB.createIngresoEgreso(data);
    showToast('Registro guardado', 'success');
    document.getElementById('modal-form-ie').classList.remove('active');
    document.getElementById('form-ie').reset();
    document.getElementById('ie-fecha').value = todayISO();
    loadIngresosEgresos();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function deleteIE(id) {
  const ok = await showGithubConfirm({
    title: 'Eliminar registro',
    message: 'Esta acción no se puede deshacer.',
    confirmText: 'ELIMINAR',
    dangerLabel: 'Eliminar'
  });
  if (!ok) return;
  showLoading(true);
  try {
    await DB.deleteIngresoEgreso(id);
    showToast('Eliminado', 'success');
    loadIngresosEgresos();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

// ── MEDIDORES ────────────────────────────────────────────────────

async function loadMedidores() {
  showLoading(true);
  try {
    const facturas = await DB.getFacturas();
    // Agrupar por asociado, tomar la última factura de cada uno
    const byAsociado = {};
    facturas.forEach(f => {
      if (!byAsociado[f.asociado_id] || new Date(f.created_at) > new Date(byAsociado[f.asociado_id].created_at)) {
        byAsociado[f.asociado_id] = f;
      }
    });
    const list = document.getElementById('medidores-list');
    const items = Object.values(byAsociado);
    list.innerHTML = items.length === 0
      ? '<div class="empty-card"><span>💧</span><p>Sin lecturas</p></div>'
      : items.map(f => `
          <div class="list-item" onclick="navigateTo('factura-nueva', {asociadoId:'${f.asociado_id}'})">
            <div class="li-icon">💧</div>
            <div class="li-info">
              <span class="li-name">${escapeHtml(f.asociados?.nombre || '-')}</span>
              <span class="li-detail">Última lectura: ${formatM3(f.lectura_actual)} · ${f.mes_facturado} ${f.anio}</span>
            </div>
            <div class="li-right">
              <span class="status-badge status-pendiente">Nueva lectura</span>
            </div>
          </div>`).join('');
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

// ── ENCUESTAS ──────────────────────────────────────────────────

async function loadEncuestas() {
  showLoading(true);
  try {
    const encuestas = await DB.getEncuestas();
    const list = document.getElementById('encuestas-list');
    if (encuestas.length === 0) {
      list.innerHTML = '<div class="empty-card"><span>📊</span><p>Sin encuestas activas</p></div>';
    } else {
      const items = await Promise.all(encuestas.map(async e => {
        const votos = await DB.getVotosEncuesta(e.id);
        return { ...e, votos };
      }));
      list.innerHTML = items.map(e => buildEncuestaCard(e)).join('');
    }
  } catch (err) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

function buildEncuestaCard(e) {
  const total = e.votos.length;
  const conteo = {};
  e.votos.forEach(v => { conteo[v.opcion] = (conteo[v.opcion] || 0) + 1; });
  const opciones = Array.isArray(e.opciones) ? e.opciones : JSON.parse(e.opciones || '[]');
  
  const votar = AppState.asociado || AppState.session;
  
  return `<div class="encuesta-card">
    <h3 class="encuesta-pregunta">${escapeHtml(e.pregunta)}</h3>
    <div class="encuesta-opciones">
      ${opciones.map(op => {
        const count = conteo[op] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `<div class="encuesta-opcion" onclick="votarEncuesta('${e.id}', '${escapeHtml(op)}')">
          <div class="eo-label"><span>${escapeHtml(op)}</span><span>${pct}% (${count})</span></div>
          <div class="eo-bar"><div class="eo-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')}
    </div>
    <div class="encuesta-meta">${total} votos</div>
  </div>`;
}

async function votarEncuesta(encuestaId, opcion) {
  const quien = AppState.asociado || AppState.session;
  if (!quien) { showToast('Inicia sesión o consulta tu documento para votar', 'warning'); return; }
  showLoading(true);
  try {
    await DB.votarEncuesta(encuestaId, quien.documento, opcion);
    showToast('¡Voto registrado!', 'success');
    loadEncuestas();
  } catch (e) {
    showToast(e.message?.includes('unique') ? 'Ya votaste en esta encuesta' : 'Error al votar', 'warning');
  } finally { showLoading(false); }
}

// ── GALERÍA ────────────────────────────────────────────────────

async function loadGaleria() {
  showLoading(true);
  try {
    const items = await DB.getGaleria();
    const list = document.getElementById('galeria-grid');
    list.innerHTML = items.length === 0
      ? '<div class="empty-card"><span>🖼️</span><p>Sin imágenes</p></div>'
      : items.map(i => `
          <div class="gallery-item" onclick="openImageFullscreen('${escapeHtml(i.url)}', '${escapeHtml(i.descripcion||'')}')">
            <img src="${escapeHtml(i.url)}" alt="${escapeHtml(i.descripcion||'')}" loading="lazy">
            ${i.descripcion ? `<span class="gallery-caption">${escapeHtml(i.descripcion)}</span>` : ''}
            ${isTesorero() ? `<button class="btn-delete-gallery" onclick="event.stopPropagation();deleteGaleriaItem('${i.id}')">✕</button>` : ''}
          </div>`).join('');
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function addGaleriaItem() {
  const url = prompt('URL de la imagen:');
  if (!url) return;
  const desc = prompt('Descripción (opcional):') || '';
  showLoading(true);
  try {
    await DB.createGaleriaItem({ url, descripcion: desc, orden: 0, activo: true });
    showToast('Imagen agregada', 'success');
    loadGaleria();
    loadHomeGaleria();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function deleteGaleriaItem(id) {
  const ok = await showGithubConfirm({
    title: 'Eliminar imagen',
    message: 'Esta imagen se eliminará de la galería.',
    confirmText: 'ELIMINAR',
    dangerLabel: 'Eliminar'
  });
  if (!ok) return;
  showLoading(true);
  try {
    await DB.deleteGaleriaItem(id);
    showToast('Imagen eliminada', 'success');
    loadGaleria();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

// ── ADMIN / NOTIFICACIONES ──────────────────────────────────────

async function loadAdmin() {
  if (!isTesorero()) { navigateTo('home'); return; }
  // Admin dashboard
}

async function loadAdminNotificaciones() {
  if (!isTesorero()) { navigateTo('home'); return; }
  showLoading(true);
  try {
    const notifs = await DB.getNotificaciones();
    const list = document.getElementById('admin-notif-list');
    list.innerHTML = notifs.map(n => `
      <div class="notif-card-admin ${n.tipo ? 'notif-'+n.tipo : ''}">
        <div class="nca-header">
          <span class="notif-label">${n.tipo}</span>
          <div class="nca-actions">
            <button class="btn btn-sm btn-outline" onclick="editNotificacion('${n.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteNotificacion('${n.id}', '${escapeHtml(n.titulo)}')">🗑️</button>
          </div>
        </div>
        <h3>${escapeHtml(n.titulo)}</h3>
        <p>${escapeHtml(n.mensaje)}</p>
      </div>`).join('') || '<p class="empty-msg">Sin notificaciones</p>';
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function editNotificacion(id) {
  showLoading(true);
  try {
    const n = id ? (await DB.getNotificaciones()).find(x => x.id === id) : null;
    document.getElementById('fn-id').value = id || '';
    document.getElementById('fn-tipo').value = n?.tipo || 'info';
    document.getElementById('fn-titulo').value = n?.titulo || '';
    document.getElementById('fn-mensaje').value = n?.mensaje || '';
    document.getElementById('fn-imagen').value = n?.imagen_url || '';
    document.getElementById('fn-orden').value = n?.orden || 0;
    document.getElementById('modal-form-notif').classList.add('active');
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function saveNotificacion() {
  const id = document.getElementById('fn-id').value;
  const data = {
    tipo: document.getElementById('fn-tipo').value,
    titulo: document.getElementById('fn-titulo').value.trim(),
    mensaje: document.getElementById('fn-mensaje').value.trim(),
    imagen_url: document.getElementById('fn-imagen').value.trim() || null,
    orden: parseInt(document.getElementById('fn-orden').value) || 0,
    activo: true,
    created_by: AppState.session?.id
  };
  if (!data.titulo || !data.mensaje) { showToast('Título y mensaje requeridos', 'warning'); return; }
  showLoading(true);
  try {
    if (id) { await DB.updateNotificacion(id, data); showToast('Notificación actualizada', 'success'); }
    else { await DB.createNotificacion(data); showToast('Notificación creada', 'success'); }
    document.getElementById('modal-form-notif').classList.remove('active');
    loadAdminNotificaciones();
    loadHomeNotificaciones();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

async function deleteNotificacion(id, titulo) {
  const ok = await showGithubConfirm({
    title: 'Eliminar notificación',
    message: 'La notificación se eliminará de la pantalla de inicio.',
    confirmText: titulo,
    dangerLabel: 'Eliminar'
  });
  if (!ok) return;
  showLoading(true);
  try {
    await DB.deleteNotificacion(id);
    showToast('Notificación eliminada', 'success');
    loadAdminNotificaciones();
    loadHomeNotificaciones();
  } catch (e) { showToast('Error', 'error'); }
  finally { showLoading(false); }
}

// ── NOTIFICACIONES WHATSAPP ────────────────────────────────────

function openWhatsApp(tipo, facturaId) {
  const f = AppState.currentFactura;
  if (!f) return;
  const msg = buildWhatsAppMessage(tipo, {
    nombre: f.asociados?.nombre,
    numeroFactura: f.numero_factura,
    fecha: formatDate(f.fecha_emision),
    mes: f.mes_facturado + ' ' + f.anio,
    valor: f.valor_total,
    consumo: f.consumo_m3,
    fechaLimite: formatDate(f.fecha_limite)
  });
  const tel = f.asociados?.telefono || '';
  window.open(`https://wa.me/57${tel.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

// ── PRINT ──────────────────────────────────────────────────────

function printFactura() {
  window.print();
}
function printRecibo() {
  window.print();
}

// ── INICIALIZACIÓN ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Cargar librería Supabase
  initSupabase();
  
  // Restaurar sesión
  loadSession();
  
  // Cargar configuración
  await loadConfig();
  
  // Iniciar en home
  navigateTo('home');
  
  // Ocultar splash
  setTimeout(() => {
    document.getElementById('splash-screen')?.classList.add('hidden');
  }, 1800);
  
  // Event listeners de formularios con Enter
  document.getElementById('consultas-documento')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') buscarAsociado();
  });
  
  document.getElementById('login-password')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleLogin();
  });
  
  // Recalcular factura on change
  ['nf-anterior','nf-actual','nf-tarifa','nf-admin','nf-cobros-adicionales','nf-m3-adicionales'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcularFactura);
  });
  
  // Recalcular recibo
  ['nr-admin','nr-multa','nr-extra'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calcularRecibo);
  });
  
  // Búsqueda de asociados
  document.getElementById('asociados-search')?.addEventListener('input', debounce(loadAsociadosList, 300));
  
  console.log('🌊 Acueducto Los Guaduales v1.0 - Iniciado');
});
