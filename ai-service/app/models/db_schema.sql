-- AI Service Schema (shared with backend PostgreSQL)
-- These tables are read/written by the AI service

CREATE TABLE IF NOT EXISTS student_face_embeddings (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL,
    embedding   FLOAT[] NOT NULL,
    photo_index INTEGER DEFAULT 1,
    embed_type  VARCHAR(20) DEFAULT 'stored',
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, photo_index, embed_type)
);

CREATE INDEX IF NOT EXISTS idx_face_emb_student ON student_face_embeddings(student_id);
CREATE INDEX IF NOT EXISTS idx_face_emb_type ON student_face_embeddings(embed_type);
