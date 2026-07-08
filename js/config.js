// ================================================================
// CONFIGURACIÓN DE SUPABASE
// Acueducto Los Guaduales
// ================================================================

const SUPABASE_URL = 'https://ujgvxqfqtzznonplwiac.supabase.co';
// Clave publicable (anon key) - obtenida del dashboard de Supabase
// Si esta clave no funciona, ve a: Supabase Dashboard > Settings > API > anon public
const SUPABASE_KEY = 'sb_publishable_fK1dhYLRkWq7VzQ64rll-Q_CL4GOPX3';

// Inicializar cliente Supabase
let supabaseClient = null;

function initSupabase() {
  try {
    const { createClient } = window.supabase || supabase;
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase conectado correctamente');
    return supabaseClient;
  } catch (e) {
    console.error('❌ Error al conectar con Supabase:', e);
    showToast('Error al conectar con la base de datos', 'error');
    return null;
  }
}

function getSupabase() {
  if (!supabaseClient) initSupabase();
  return supabaseClient;
}

// Constantes de la aplicación
const APP_CONFIG = {
  TARIFA_M3: 2400,
  ADMINISTRACION: 28000,
  NIT: '890984417-9',
  NOMBRE_ADMIN: 'Laura Valencia C.',
  VEREDA: 'Vereda Loma de Don Santos',
  MUNICIPIO: 'Santa Bárbara, Antioquia',
  NOMBRE_ORG: 'J.A.C. LOMA DE DON SANTOS',
  NOMBRE_ACUEDUCTO: 'ACUEDUCTO LOS GUADUALES',
  VERSION: '1.0.0'
};

// Meses en español
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// Estado de sesión global
const AppState = {
  session: null,       // { id, nombre, documento, rol }
  asociado: null,      // Asociado consultado (queries)
  config: { ...APP_CONFIG },
  cuentaBancaria: null,
  unreadNotifications: 0
};

// Cargar configuración desde BD
async function loadConfig() {
  try {
    const sb = getSupabase();
    const { data } = await sb.from('configuracion').select('clave, valor');
    if (data) {
      data.forEach(({ clave, valor }) => {
        switch (clave) {
          case 'tarifa_m3': AppState.config.TARIFA_M3 = parseFloat(valor); break;
          case 'administracion_mensual': AppState.config.ADMINISTRACION = parseFloat(valor); break;
          case 'nit': AppState.config.NIT = valor; break;
          case 'nombre_administrador': AppState.config.NOMBRE_ADMIN = valor; break;
          case 'vereda': AppState.config.VEREDA = valor; break;
          case 'municipio': AppState.config.MUNICIPIO = valor; break;
          case 'nombre_org': AppState.config.NOMBRE_ORG = valor; break;
          case 'nombre_acueducto': AppState.config.NOMBRE_ACUEDUCTO = valor; break;
        }
      });
    }
    // Cargar cuenta bancaria
    const { data: cuenta } = await sb.from('cuenta_bancaria').select('*').eq('activo', true).single();
    if (cuenta) AppState.cuentaBancaria = cuenta;
  } catch (e) {
    console.warn('No se pudo cargar configuración de BD, usando valores por defecto');
  }
}
