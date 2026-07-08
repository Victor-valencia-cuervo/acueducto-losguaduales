// ================================================================
// UTILIDADES
// Formateo, UI helpers, validaciones
// ================================================================

// Formato de moneda colombiana
function formatCOP(value) {
  const num = parseFloat(value) || 0;
  return '$ ' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Formato de m³
function formatM3(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('es-CO', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' m³';
}

// Formato de fecha
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}

// Fecha actual en formato YYYY-MM-DD
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Obtener número de factura siguiente
function getNextFacturaNumber(facturas) {
  if (!facturas || facturas.length === 0) return 'FAC-0001';
  const nums = facturas.map(f => parseInt(f.numero_factura.replace('FAC-', '')) || 0);
  const next = Math.max(...nums) + 1;
  return `FAC-${String(next).padStart(4, '0')}`;
}

// Obtener número de recibo siguiente
function getNextReciboNumber(recibos) {
  if (!recibos || recibos.length === 0) return 'REC-0001';
  const nums = recibos.map(r => parseInt(r.numero_recibo.replace('REC-', '')) || 0);
  const next = Math.max(...nums) + 1;
  return `REC-${String(next).padStart(4, '0')}`;
}

// Saludo según la hora
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

// Toast / Notificación temporal en pantalla
function showToast(message, type = 'info', duration = 3500) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// Modal de confirmación simple
function showAlert(title, message, type = 'info') {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-alert');
    const modalTitle = document.getElementById('modal-alert-title');
    const modalMessage = document.getElementById('modal-alert-message');
    const modalBtn = document.getElementById('modal-alert-btn');
    const modalIcon = document.getElementById('modal-alert-icon');
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    modalIcon.textContent = icons[type] || 'ℹ️';
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.add('active');
    
    const close = () => {
      modal.classList.remove('active');
      modalBtn.removeEventListener('click', close);
      resolve();
    };
    modalBtn.addEventListener('click', close);
  });
}

// Confirmación tipo GitHub (requiere escribir el texto)
function showGithubConfirm({ title, message, confirmText, dangerLabel = 'Eliminar' }) {
  return new Promise(resolve => {
    const modal = document.getElementById('modal-github-confirm');
    const modalTitle = document.getElementById('mgc-title');
    const modalMsg = document.getElementById('mgc-message');
    const modalConfirmHint = document.getElementById('mgc-confirm-text');
    const inputField = document.getElementById('mgc-input');
    const btnConfirm = document.getElementById('mgc-btn-confirm');
    const btnCancel = document.getElementById('mgc-btn-cancel');
    
    modalTitle.textContent = title;
    modalMsg.textContent = message;
    modalConfirmHint.textContent = confirmText;
    inputField.value = '';
    btnConfirm.disabled = true;
    btnConfirm.textContent = dangerLabel;
    modal.classList.add('active');
    
    const checkInput = () => {
      btnConfirm.disabled = inputField.value.trim() !== confirmText;
    };
    inputField.addEventListener('input', checkInput);
    
    const cleanup = (result) => {
      modal.classList.remove('active');
      inputField.removeEventListener('input', checkInput);
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      resolve(result);
    };
    
    const onConfirm = () => { if (!btnConfirm.disabled) cleanup(true); };
    const onCancel = () => cleanup(false);
    
    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
  });
}

// Loading overlay
function showLoading(show = true) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.toggle('active', show);
}

// Loading screen (transición)
function showTransitionLoading(callback, duration = 1000) {
  const screen = document.getElementById('loading-transition');
  if (screen) {
    screen.classList.add('active');
    setTimeout(() => {
      screen.classList.remove('active');
      if (callback) callback();
    }, duration);
  } else if (callback) {
    callback();
  }
}

// Llenar un select con opciones
function populateSelect(selectId, options, placeholder = 'Seleccionar...') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">— ${placeholder} —</option>` +
    options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
}

// Formato mensaje WhatsApp para factura
function buildWhatsAppMessage(type, data) {
  const { nombre, numeroFactura, fecha, mes, valor, consumo, fechaLimite } = data;
  if (type === 'pago') {
    return encodeURIComponent(
`🌊 *Acueducto Los Guaduales*

Hola, ${nombre}.

Le informamos que se registró correctamente un pago.

📄 Factura: ${numeroFactura}
📅 Fecha: ${fecha}
🗓️ Mes: ${mes}
💰 Valor: ${formatCOP(valor)}
✅ Estado: *Pagado*

Gracias por mantenerse al día con el Acueducto Los Guaduales.`
    );
  }
  return encodeURIComponent(
`🌊 *Acueducto Los Guaduales*

Hola, ${nombre}.

Tiene una nueva factura disponible.

📄 Factura: ${numeroFactura}
💧 Consumo: ${formatM3(consumo)}
💰 Valor a pagar: ${formatCOP(valor)}
📅 Fecha límite: ${fechaLimite}

Gracias por utilizar nuestros servicios.`
  );
}

// Debounce
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Escapar HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
