from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.api.routes import auth, chat, images, voice, user

UPLOAD_DIR = Path(__file__).parent.parent / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title='Ink AI', version='1.0.0')

# Expose /metrics — excluded from its own instrumentation
Instrumentator(
    should_group_status_codes=True,
    excluded_handlers=['/metrics', '/health'],
).instrument(app).expose(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(images.router)
app.include_router(voice.router)
app.include_router(user.router)

app.mount('/uploads', StaticFiles(directory=str(UPLOAD_DIR)), name='uploads')


@app.get('/health')
async def health():
    return {'status': 'ok'}
