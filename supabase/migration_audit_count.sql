-- Agregar columnas de conteo de auditorías
ALTER TABLE authorized_emails
  ADD COLUMN IF NOT EXISTS audit_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_audits  integer DEFAULT 5;

-- Insertar correos autorizados
INSERT INTO authorized_emails (email, name, audit_count, max_audits) VALUES
  ('gabriel.bandala@gmail.com', 'Gabriel Bandala', 0, 5),
  ('bandala@outlook.com',       'Gabriel Bandala', 0, 5)
ON CONFLICT (email) DO UPDATE SET
  max_audits  = EXCLUDED.max_audits,
  audit_count = EXCLUDED.audit_count;

-- Para resetear el contador de un correo:
-- UPDATE authorized_emails SET audit_count = 0 WHERE email = 'correo@ejemplo.com';
