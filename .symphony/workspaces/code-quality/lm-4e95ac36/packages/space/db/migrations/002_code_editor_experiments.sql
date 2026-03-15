-- Migration: Add Code Editor Experiment Support
-- Date: 2025-11-16
-- Description: Adds fields to support interactive code editor experiments with lessons

-- Add code editor experiment fields to papers table
ALTER TABLE papers ADD COLUMN code_lessons TEXT;
ALTER TABLE papers ADD COLUMN starter_code TEXT;
ALTER TABLE papers ADD COLUMN solution_code TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_papers_code_lessons ON papers(is_executable) WHERE code_lessons IS NOT NULL;
