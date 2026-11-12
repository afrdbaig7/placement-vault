-- Enable pg_trgm for fuzzy search and duplicate detection
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy search indexes for companies
CREATE INDEX IF NOT EXISTS company_name_trgm_idx ON "Company" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS company_norm_trgm_idx ON "Company" USING gin ("normalizedName" gin_trgm_ops);

-- Trigram search index for problem titles
CREATE INDEX IF NOT EXISTS problem_title_trgm_idx ON "Problem" USING gin (title gin_trgm_ops);

-- Trigram search index for OA questions
CREATE INDEX IF NOT EXISTS oa_question_text_trgm_idx ON "OAQuestion" USING gin ("statementMd" gin_trgm_ops);
