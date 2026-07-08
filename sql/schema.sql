-- ================================================================
-- ACUEDUCTO LOS GUADUALES - Esquema de Base de Datos
-- Proyecto: acueducto-los-guaduales
-- Ejecutar en el SQL Editor de Supabase
-- ================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLA: asociados
-- Usuarios del sistema (admin, tesorero, asociados)
-- ================================================================
CREATE TABLE IF NOT EXISTS asociados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  documento TEXT UNIQUE NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  rol TEXT DEFAULT 'asociado' CHECK (rol IN ('admin', 'tesorero', 'asociado')),
  password TEXT,
  activo BOOLEAN DEFAULT true,
  fecha_registro DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: cuenta_bancaria
-- Información bancaria para consignaciones
-- ================================================================
CREATE TABLE IF NOT EXISTS cuenta_bancaria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  banco TEXT NOT NULL,
  tipo_cuenta TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  titular TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: facturas
-- Facturas de cobro por consumo de agua
-- ================================================================
CREATE TABLE IF NOT EXISTS facturas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_factura TEXT UNIQUE NOT NULL,
  asociado_id UUID REFERENCES asociados(id) ON DELETE CASCADE NOT NULL,
  mes_facturado TEXT NOT NULL,
  anio INTEGER NOT NULL,
  fecha_lectura DATE DEFAULT CURRENT_DATE,
  lectura_anterior DECIMAL(12,3) DEFAULT 0,
  lectura_actual DECIMAL(12,3) DEFAULT 0,
  consumo_m3 DECIMAL(12,3) DEFAULT 0,
  tarifa_m3 DECIMAL(12,2) DEFAULT 2400,
  valor_consumo DECIMAL(12,2) DEFAULT 0,
  administracion DECIMAL(12,2) DEFAULT 28000,
  cobros_adicionales DECIMAL(12,2) DEFAULT 0,
  m3_adicionales DECIMAL(12,3) DEFAULT 0,
  valor_adicional DECIMAL(12,2) DEFAULT 0,
  valor_total DECIMAL(12,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida', 'suspendida')),
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_limite DATE,
  notas TEXT,
  id_pago TEXT DEFAULT '',
  created_by UUID REFERENCES asociados(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: recibos
-- Recibos de pago
-- ================================================================
CREATE TABLE IF NOT EXISTS recibos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_recibo TEXT UNIQUE NOT NULL,
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
  asociado_id UUID REFERENCES asociados(id) ON DELETE CASCADE NOT NULL,
  concepto TEXT,
  mes TEXT,
  anio INTEGER,
  m3_consumidos DECIMAL(12,3) DEFAULT 0,
  tipo_pago TEXT DEFAULT 'efectivo' CHECK (tipo_pago IN ('efectivo', 'transferencia', 'consignacion', 'otro')),
  administracion DECIMAL(12,2) DEFAULT 28000,
  multa DECIMAL(12,2) DEFAULT 0,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notas TEXT,
  fecha_pago DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES asociados(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: ingresos_egresos
-- Control de ingresos y egresos del acueducto
-- ================================================================
CREATE TABLE IF NOT EXISTS ingresos_egresos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('ingreso', 'egreso')) NOT NULL,
  concepto TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  fecha DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES asociados(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: notificaciones
-- Notificaciones generales para la pantalla de inicio
-- ================================================================
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo TEXT DEFAULT 'info' CHECK (tipo IN ('general', 'info', 'importante', 'urgente', 'celebracion')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  imagen_url TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES asociados(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: notificaciones_asociado
-- Notificaciones automáticas por asociado
-- ================================================================
CREATE TABLE IF NOT EXISTS notificaciones_asociado (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asociado_id UUID REFERENCES asociados(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pago_realizado', 'factura_cancelada', 'servicio_suspendido', 'factura_vencida', 'nueva_factura')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  factura_id UUID REFERENCES facturas(id) ON DELETE SET NULL,
  recibo_id UUID REFERENCES recibos(id) ON DELETE SET NULL,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: galeria
-- Galería de imágenes (URLs externas, no archivos)
-- ================================================================
CREATE TABLE IF NOT EXISTS galeria (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: videos
-- Videos (URLs de YouTube u otros)
-- ================================================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL,
  titulo TEXT,
  descripcion TEXT,
  destacado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: encuestas
-- Sistema de encuestas
-- ================================================================
CREATE TABLE IF NOT EXISTS encuestas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]',
  activo BOOLEAN DEFAULT true,
  fecha_inicio DATE,
  fecha_fin DATE,
  created_by UUID REFERENCES asociados(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABLA: votos_encuesta
-- Votos de encuestas (un voto por asociado por encuesta)
-- ================================================================
CREATE TABLE IF NOT EXISTS votos_encuesta (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  encuesta_id UUID REFERENCES encuestas(id) ON DELETE CASCADE NOT NULL,
  documento_votante TEXT NOT NULL,
  opcion TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(encuesta_id, documento_votante)
);

-- ================================================================
-- TABLA: configuracion
-- Configuración del sistema
-- ================================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- ROW LEVEL SECURITY
-- Permitir acceso anónimo (simplificado para uso interno)
-- ================================================================
ALTER TABLE asociados ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_asociado ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_encuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuenta_bancaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos_egresos ENABLE ROW LEVEL SECURITY;

-- Política: acceso completo para anon (app interna, sin autenticación Supabase)
DO $$ 
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'asociados', 'facturas', 'recibos', 'ingresos_egresos',
    'notificaciones', 'notificaciones_asociado', 'galeria', 'videos',
    'encuestas', 'votos_encuesta', 'configuracion', 'cuenta_bancaria'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "anon_all" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ================================================================
-- ÍNDICES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_facturas_asociado ON facturas(asociado_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_anio_mes ON facturas(anio, mes_facturado);
CREATE INDEX IF NOT EXISTS idx_recibos_asociado ON recibos(asociado_id);
CREATE INDEX IF NOT EXISTS idx_notif_asociado ON notificaciones_asociado(asociado_id, leido);
CREATE INDEX IF NOT EXISTS idx_asociados_doc ON asociados(documento);
CREATE INDEX IF NOT EXISTS idx_ie_tipo ON ingresos_egresos(tipo, fecha);

-- ================================================================
-- DATOS INICIALES
-- ================================================================

-- Configuración del sistema
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('tarifa_m3', '2400', 'Tarifa por metro cúbico en COP'),
  ('administracion_mensual', '28000', 'Administración mensual en COP'),
  ('nit', '890984417-9', 'NIT del acueducto'),
  ('nombre_administrador', 'Laura Valencia C.', 'Nombre del administrador'),
  ('vereda', 'Vereda Loma de Don Santos', 'Vereda'),
  ('municipio', 'Santa Bárbara, Antioquia', 'Municipio'),
  ('nombre_org', 'J.A.C. LOMA DE DON SANTOS', 'Nombre de la organización'),
  ('nombre_acueducto', 'ACUEDUCTO LOS GUADUALES', 'Nombre del acueducto')
ON CONFLICT (clave) DO NOTHING;

-- Cuenta bancaria por defecto
INSERT INTO cuenta_bancaria (banco, tipo_cuenta, numero_cuenta, titular)
VALUES ('Ejemplo Banco', 'Cuenta de ejemplo', '123456', 'Acueducto Los Guaduales')
ON CONFLICT DO NOTHING;

-- Usuario administrador por defecto
INSERT INTO asociados (nombre, documento, rol, password, activo) VALUES
  ('Administrador', 'admin', 'admin', 'admin123', true),
  ('Tesorero', 'tesorero', 'tesorero', 'tesorero123', true)
ON CONFLICT (documento) DO NOTHING;

-- Notificación de bienvenida
INSERT INTO notificaciones (tipo, titulo, mensaje, orden, activo) VALUES
  ('celebracion', '¡Bienvenidos!', 'Bienvenidos al sistema de gestión del Acueducto Los Guaduales. Aquí podrán consultar sus facturas, recibos y más.', 1, true),
  ('info', 'Horario de atención', 'Nuestras oficinas atienden de lunes a viernes de 8:00 AM a 5:00 PM. Para emergencias llame al 310-000-0000.', 2, true)
ON CONFLICT DO NOTHING;

-- ================================================================
-- TABLA ADICIONAL: destacados
-- Contenido destacado / texto enriquecido para la pantalla de inicio
-- Ejecutar en Supabase después del schema principal
-- ================================================================
CREATE TABLE IF NOT EXISTS destacados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  titulo TEXT,
  contenido TEXT,
  imagen_url TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE destacados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_dest" ON destacados;
CREATE POLICY "anon_all_dest" ON destacados FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_destacados_orden ON destacados(orden, activo);
