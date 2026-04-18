from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "cab_ml_platform"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # ML Platform
    model_store_path: str = "/app/model_store"
    surge_push_interval_seconds: int = 30
    surge_redis_ttl: int = 90  # seconds

    class Config:
        env_file = ".env"


settings = Settings()
