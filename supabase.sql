-- Crear tablas para Gestión de Costura
-- Pegar en Supabase SQL Editor y ejecutar

CREATE TABLE IF NOT EXISTS clients (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  phone text DEFAULT '',
  address text DEFAULT '',
  notes text DEFAULT '',
  created_at bigint DEFAULT 0
);

CREATE TABLE IF NOT EXISTS measurements (
  id bigint PRIMARY KEY,
  "clientId" bigint DEFAULT 0,
  label text DEFAULT '',
  value text DEFAULT '',
  date bigint DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id bigint PRIMARY KEY,
  "clientId" bigint DEFAULT 0,
  description text DEFAULT '',
  deadline bigint DEFAULT 0,
  status text DEFAULT 'pending',
  deposit double precision DEFAULT 0,
  total double precision DEFAULT 0,
  notes text DEFAULT '',
  "createdAt" bigint DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigint PRIMARY KEY,
  "orderId" bigint DEFAULT 0,
  name text DEFAULT '',
  quantity double precision DEFAULT 0,
  "unitPrice" double precision DEFAULT 0,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS transactions (
  id bigint PRIMARY KEY,
  "orderId" bigint DEFAULT 0,
  amount double precision DEFAULT 0,
  type text DEFAULT '',
  date bigint DEFAULT 0,
  description text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS inventory (
  id bigint PRIMARY KEY,
  name text DEFAULT '',
  quantity double precision DEFAULT 0,
  unit text DEFAULT 'unidad',
  price double precision DEFAULT 0,
  category text DEFAULT 'General',
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS appointments (
  id bigint PRIMARY KEY,
  "clientId" bigint DEFAULT 0,
  title text DEFAULT '',
  date bigint DEFAULT 0,
  notes text DEFAULT ''
);
