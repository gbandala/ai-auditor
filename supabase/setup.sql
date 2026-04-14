-- Tabla de correos autorizados para acceder al AI Auditor
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS authorized_emails (
  email       text        PRIMARY KEY,
  name        text,
  created_at  timestamptz DEFAULT now()
);

-- Ejemplo: agregar un correo autorizado
-- INSERT INTO authorized_emails (email, name) VALUES ('usuario@empresa.com', 'Nombre Usuario');
