from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # Database
    DATABASE_URL: str = 'postgresql+asyncpg://postgres:postgres@localhost:5432/tattoo_assistant'

    # JWT
    JWT_SECRET_KEY: str = 'change-me-in-production'
    JWT_ALGORITHM: str = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str = ''
    AZURE_OPENAI_API_KEY: str = ''
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = 'gpt-4o'
    AZURE_OPENAI_IMAGE_DEPLOYMENT: str = 'gpt-image-1'
    AZURE_OPENAI_API_VERSION: str = '2024-12-01-preview'

    # Azure Speech
    AZURE_SPEECH_KEY: str = ''
    AZURE_SPEECH_REGION: str = ''

    # App
    CORS_ORIGINS: list[str] = ['http://localhost:3000']


settings = Settings()
