-- Professional Services Template: Initial Schema
-- This migration creates the core tables for consultation management

-- Consultations table: stores consultation requests
CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    service TEXT NOT NULL,
    message TEXT,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    assigned_to TEXT,
    meeting_link TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    confirmed_at TEXT,
    completed_at TEXT
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_consultations_email ON consultations(email);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(preferred_date);

-- Clients table: stores client information
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    company TEXT,
    phone TEXT,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'client', 'inactive')),
    source TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Create index for client email lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Workflow logs table: tracks workflow executions
CREATE TABLE IF NOT EXISTS workflow_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    input_data TEXT, -- JSON
    output_data TEXT, -- JSON
    error_message TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

-- Create index for workflow status
CREATE INDEX IF NOT EXISTS idx_workflow_logs_status ON workflow_logs(status);

-- Create index for workflow name
CREATE INDEX IF NOT EXISTS idx_workflow_logs_name ON workflow_logs(workflow_name);
