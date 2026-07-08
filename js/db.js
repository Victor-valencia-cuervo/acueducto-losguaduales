// ================================================================
// OPERACIONES DE BASE DE DATOS
// Todas las consultas a Supabase organizadas por entidad
// ================================================================

const DB = {

  // ──────────────────── ASOCIADOS ────────────────────

  async getAsociados() {
    const { data, error } = await getSupabase()
      .from('asociados')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data || [];
  },

  async getAsociadoByDocumento(documento) {
    const { data, error } = await getSupabase()
      .from('asociados')
      .select('*')
      .eq('documento', documento)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getAsociadoById(id) {
    const { data, error } = await getSupabase()
      .from('asociados')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async createAsociado(data) {
    const { data: result, error } = await getSupabase()
      .from('asociados')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateAsociado(id, data) {
    const { data: result, error } = await getSupabase()
      .from('asociados')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteAsociado(id) {
    const { error } = await getSupabase()
      .from('asociados')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async loginUsuario(documento, password) {
    const { data, error } = await getSupabase()
      .from('asociados')
      .select('*')
      .eq('documento', documento)
      .eq('password', password)
      .in('rol', ['admin', 'tesorero'])
      .eq('activo', true)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // ──────────────────── FACTURAS ────────────────────

  async getFacturas(filters = {}) {
    let query = getSupabase()
      .from('facturas')
      .select(`
        *,
        asociados (id, nombre, documento)
      `)
      .order('created_at', { ascending: false });
    
    if (filters.asociado_id) query = query.eq('asociado_id', filters.asociado_id);
    if (filters.estado) query = query.eq('estado', filters.estado);
    if (filters.anio) query = query.eq('anio', filters.anio);
    if (filters.mes) query = query.eq('mes_facturado', filters.mes);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getFacturaById(id) {
    const { data, error } = await getSupabase()
      .from('facturas')
      .select(`
        *,
        asociados (id, nombre, documento, telefono, email)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getFacturasByAsociado(asociadoId) {
    const { data, error } = await getSupabase()
      .from('facturas')
      .select('*')
      .eq('asociado_id', asociadoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getLastNumeroFactura() {
    const { data } = await getSupabase()
      .from('facturas')
      .select('numero_factura')
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data[0] ? data[0].numero_factura : null;
  },

  async createFactura(data) {
    const { data: result, error } = await getSupabase()
      .from('facturas')
      .insert([data])
      .select(`*, asociados(id, nombre, documento)`)
      .single();
    if (error) throw error;
    return result;
  },

  async updateFactura(id, data) {
    const { data: result, error } = await getSupabase()
      .from('facturas')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, asociados(id, nombre, documento)`)
      .single();
    if (error) throw error;
    return result;
  },

  async updateFacturaEstado(id, estado) {
    const { data: result, error } = await getSupabase()
      .from('facturas')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, asociados(id, nombre, documento)`)
      .single();
    if (error) throw error;
    return result;
  },

  async deleteFactura(id) {
    const { error } = await getSupabase()
      .from('facturas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── RECIBOS ────────────────────

  async getRecibos(filters = {}) {
    let query = getSupabase()
      .from('recibos')
      .select(`
        *,
        asociados (id, nombre, documento)
      `)
      .order('created_at', { ascending: false });
    
    if (filters.asociado_id) query = query.eq('asociado_id', filters.asociado_id);
    if (filters.anio) query = query.eq('anio', filters.anio);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getReciboById(id) {
    const { data, error } = await getSupabase()
      .from('recibos')
      .select(`
        *,
        asociados (id, nombre, documento, telefono)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getLastNumeroRecibo() {
    const { data } = await getSupabase()
      .from('recibos')
      .select('numero_recibo')
      .order('created_at', { ascending: false })
      .limit(1);
    return data && data[0] ? data[0].numero_recibo : null;
  },

  async createRecibo(data) {
    const { data: result, error } = await getSupabase()
      .from('recibos')
      .insert([data])
      .select(`*, asociados(id, nombre, documento)`)
      .single();
    if (error) throw error;
    return result;
  },

  async deleteRecibo(id) {
    const { error } = await getSupabase()
      .from('recibos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── INGRESOS/EGRESOS ────────────────────

  async getIngresosEgresos(anio = null) {
    let query = getSupabase()
      .from('ingresos_egresos')
      .select('*')
      .order('fecha', { ascending: false });
    if (anio) query = query.eq('anio', anio);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createIngresoEgreso(data) {
    const { data: result, error } = await getSupabase()
      .from('ingresos_egresos')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteIngresoEgreso(id) {
    const { error } = await getSupabase()
      .from('ingresos_egresos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── NOTIFICACIONES ────────────────────

  async getNotificaciones() {
    const { data, error } = await getSupabase()
      .from('notificaciones')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createNotificacion(data) {
    const { data: result, error } = await getSupabase()
      .from('notificaciones')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateNotificacion(id, data) {
    const { data: result, error } = await getSupabase()
      .from('notificaciones')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteNotificacion(id) {
    const { error } = await getSupabase()
      .from('notificaciones')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Notificaciones por asociado
  async getNotificacionesAsociado(asociadoId) {
    const { data, error } = await getSupabase()
      .from('notificaciones_asociado')
      .select('*')
      .eq('asociado_id', asociadoId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async countUnreadNotificaciones(asociadoId) {
    const { count, error } = await getSupabase()
      .from('notificaciones_asociado')
      .select('id', { count: 'exact' })
      .eq('asociado_id', asociadoId)
      .eq('leido', false);
    if (error) return 0;
    return count || 0;
  },

  async marcarNotificacionLeida(id) {
    await getSupabase()
      .from('notificaciones_asociado')
      .update({ leido: true })
      .eq('id', id);
  },

  async marcarTodasLeidas(asociadoId) {
    await getSupabase()
      .from('notificaciones_asociado')
      .update({ leido: true })
      .eq('asociado_id', asociadoId);
  },

  async createNotificacionAsociado(data) {
    const { data: result, error } = await getSupabase()
      .from('notificaciones_asociado')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  // ──────────────────── GALERÍA ────────────────────

  async getGaleria() {
    const { data, error } = await getSupabase()
      .from('galeria')
      .select('*')
      .eq('activo', true)
      .order('orden');
    if (error) throw error;
    return data || [];
  },

  async createGaleriaItem(data) {
    const { data: result, error } = await getSupabase()
      .from('galeria')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteGaleriaItem(id) {
    const { error } = await getSupabase()
      .from('galeria')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── VIDEOS ────────────────────

  async getVideos() {
    const { data, error } = await getSupabase()
      .from('videos')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createVideo(data) {
    const { data: result, error } = await getSupabase()
      .from('videos')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async deleteVideo(id) {
    const { error } = await getSupabase()
      .from('videos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── ENCUESTAS ────────────────────

  async getEncuestas() {
    const { data, error } = await getSupabase()
      .from('encuestas')
      .select('*')
      .eq('activo', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async createEncuesta(data) {
    const { data: result, error } = await getSupabase()
      .from('encuestas')
      .insert([data])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getVotosEncuesta(encuestaId) {
    const { data, error } = await getSupabase()
      .from('votos_encuesta')
      .select('opcion')
      .eq('encuesta_id', encuestaId);
    if (error) throw error;
    return data || [];
  },

  async votarEncuesta(encuestaId, documentoVotante, opcion) {
    const { data: result, error } = await getSupabase()
      .from('votos_encuesta')
      .insert([{ encuesta_id: encuestaId, documento_votante: documentoVotante, opcion }])
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async yaVoto(encuestaId, documentoVotante) {
    const { data } = await getSupabase()
      .from('votos_encuesta')
      .select('id')
      .eq('encuesta_id', encuestaId)
      .eq('documento_votante', documentoVotante)
      .single();
    return !!data;
  },

  // ──────────────────── CONFIGURACIÓN ────────────────────

  async updateConfig(clave, valor) {
    const { error } = await getSupabase()
      .from('configuracion')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('clave', clave);
    if (error) throw error;
  },

  async updateCuentaBancaria(id, data) {
    const { error } = await getSupabase()
      .from('cuenta_bancaria')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  },

  // ──────────────────── ESTADÍSTICAS ────────────────────

  async getResumenTesoreria() {
    const sb = getSupabase();
    const [facturas, recibos, ie] = await Promise.all([
      sb.from('facturas').select('estado, valor_total'),
      sb.from('recibos').select('valor_total'),
      sb.from('ingresos_egresos').select('tipo, valor')
    ]);
    
    const facts = facturas.data || [];
    const recs = recibos.data || [];
    const ies = ie.data || [];
    
    return {
      totalFacturas: facts.length,
      facturasPendientes: facts.filter(f => f.estado === 'pendiente').length,
      facturasPagadas: facts.filter(f => f.estado === 'pagada').length,
      facturasVencidas: facts.filter(f => f.estado === 'vencida').length,
      totalCobrado: facts.filter(f => f.estado === 'pagada').reduce((s, f) => s + (f.valor_total || 0), 0),
      totalPendiente: facts.filter(f => f.estado === 'pendiente').reduce((s, f) => s + (f.valor_total || 0), 0),
      totalRecibos: recs.length,
      totalIngresos: ies.filter(i => i.tipo === 'ingreso').reduce((s, i) => s + (i.valor || 0), 0),
      totalEgresos: ies.filter(i => i.tipo === 'egreso').reduce((s, i) => s + (i.valor || 0), 0),
    };
  }
};
