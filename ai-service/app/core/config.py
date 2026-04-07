from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "icms"
    POSTGRES_USER: str = "icms_user"
    POSTGRES_PASSWORD: str = ""

    FACE_MATCH_THRESHOLD: float = 0.45
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
