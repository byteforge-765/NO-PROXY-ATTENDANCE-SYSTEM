"""
Database — psycopg2 connection pool
One pool shared across all FastAPI workers.
psycopg2.extras.register_default_jsonb handles type casting automatically.
"""
import psycopg2
import psycopg2.extras
from psycopg2 import pool as pg_pool
from app.core.config import settings

_pool: pg_pool.SimpleConnectionPool | None = None


def init_db_pool():
    global _pool
    _pool = pg_pool.SimpleConnectionPool(
        minconn=2,
        maxconn=10,
        host=settings.POSTGRES_HOST,
        port=int(settings.POSTGRES_PORT),
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
    )
    print("[DB] Connection pool initialised ✓")


class DBConn:
    """
    Context manager — borrow a connection from pool, auto-return when done.
    Usage:
        with DBConn() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
            conn.commit()
    """
    def __enter__(self):
        if _pool is None:
            raise RuntimeError("DB pool not initialised.")
        self.conn = _pool.getconn()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        if _pool:
            _pool.putconn(self.conn)
        return False
