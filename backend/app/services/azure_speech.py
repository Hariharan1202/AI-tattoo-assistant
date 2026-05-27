import asyncio
import tempfile
from pathlib import Path


async def transcribe_audio(audio_bytes: bytes, content_type: str) -> str:
    """Transcribe audio using Azure Speech Services SDK."""
    import azure.cognitiveservices.speech as speechsdk
    from app.core.config import settings

    suffix = '.wav' if 'wav' in content_type else '.mp3'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        speech_config = speechsdk.SpeechConfig(
            subscription=settings.AZURE_SPEECH_KEY,
            region=settings.AZURE_SPEECH_REGION,
        )
        speech_config.speech_recognition_language = 'en-US'
        audio_config = speechsdk.audio.AudioConfig(filename=tmp_path)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        result_future: asyncio.Future[str] = asyncio.get_event_loop().create_future()

        def on_recognized(evt: speechsdk.SpeechRecognitionEventArgs) -> None:
            if not result_future.done():
                result_future.set_result(evt.result.text)

        def on_canceled(evt: speechsdk.SpeechRecognitionCanceledEventArgs) -> None:
            if not result_future.done():
                result_future.set_exception(RuntimeError(f'Speech recognition canceled: {evt.result.reason}'))

        recognizer.recognized.connect(on_recognized)
        recognizer.canceled.connect(on_canceled)
        recognizer.start_continuous_recognition()

        try:
            text = await asyncio.wait_for(result_future, timeout=30)
        finally:
            recognizer.stop_continuous_recognition()

        return text
    finally:
        Path(tmp_path).unlink(missing_ok=True)
