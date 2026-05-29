from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    # Database
    DATABASE_URL: str = 'postgresql+asyncpg://postgres:postgres@localhost:5432/tattoo_assistant'

    # JWT
    JWT_SECRET_KEY: str = 'change-me-in-production'
    JWT_ALGORITHM: str = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Azure OpenAI — shared endpoint and key
    AZURE_OPENAI_ENDPOINT: str = ''
    AZURE_OPENAI_API_KEY: str = ''

    # Chat / vision deployment (GPT-4o) — has its own API version date
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = 'gpt-4o'
    AZURE_OPENAI_CHAT_API_VERSION: str = '2025-01-01-preview'

    # Image generation deployment (gpt-image-1.5) — may live in a DIFFERENT
    # Azure OpenAI resource than the chat model. Set AZURE_OPENAI_IMAGE_ENDPOINT
    # and optionally AZURE_OPENAI_IMAGE_API_KEY when using a separate resource.
    # If left empty both fall back to the shared AZURE_OPENAI_ENDPOINT / API_KEY.
    AZURE_OPENAI_IMAGE_DEPLOYMENT: str = 'gpt-image-1.5'
    AZURE_OPENAI_IMAGE_API_VERSION: str = '2024-02-01'
    AZURE_OPENAI_IMAGE_ENDPOINT: str = ''   # e.g. https://odlu-mnpspgf4-eastus2.openai.azure.com/
    AZURE_OPENAI_IMAGE_API_KEY: str = ''    # only needed if different from AZURE_OPENAI_API_KEY

    AZURE_OPENAI_MAX_TOKENS: int = 2048  # max output tokens per chat response

    # Azure Speech Services
    AZURE_SPEECH_KEY: str = ''
    # Use EITHER region OR endpoint (endpoint takes priority if both are set).
    # Region format:  eastus  /  westeurope  / etc.
    # Endpoint format: https://<region>.api.cognitive.microsoft.com/
    AZURE_SPEECH_REGION: str = ''
    AZURE_SPEECH_ENDPOINT: str = ''  # optional — custom / private endpoint URL

    # App
    CORS_ORIGINS: list[str] = ['http://localhost:3000']


settings = Settings()
