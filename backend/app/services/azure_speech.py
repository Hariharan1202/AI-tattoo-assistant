import asyncio
import os
import subprocess
import tempfile
from pathlib import Path


# Map MIME types to file extensions so we write the temp file with the correct
# container format (ffmpeg uses the extension to pick the right demuxer).
_MIME_TO_EXT: dict[str, str] = {
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/mp4': '.mp4',
    'audio/m4a': '.m4a',
}


def _convert_to_wav(audio_bytes: bytes, content_type: str) -> str:
    """Write audio_bytes to a temp file and convert to 16kHz mono WAV.

    Returns the path to the WAV temp file. The caller is responsible for
    deleting it with Path(path).unlink(missing_ok=True).
    """
    in_ext = _MIME_TO_EXT.get(content_type, '.audio')

    # Write the original audio to a named temp file
    with tempfile.NamedTemporaryFile(suffix=in_ext, delete=False) as tmp_in:
        tmp_in.write(audio_bytes)
        in_path = tmp_in.name

    # If it's already WAV we can hand it straight to the SDK
    if in_ext == '.wav':
        return in_path

    # Convert to 16kHz 16-bit mono WAV (what Azure Speech SDK expects)
    out_path = in_path.rsplit('.', 1)[0] + '_out.wav'
    try:
        subprocess.run(
            [
                'ffmpeg', '-y',
                '-i', in_path,
                '-ar', '16000',   # 16 kHz sample rate
                '-ac', '1',       # mono
                '-sample_fmt', 's16',  # 16-bit PCM
                '-f', 'wav',
                out_path,
            ],
            check=True,
            capture_output=True,
        )
    finally:
        os.unlink(in_path)

    return out_path


async def transcribe_audio(audio_bytes: bytes, content_type: str) -> str:
    """Transcribe audio using Azure Speech Services SDK.

    Accepts any audio format supported by ffmpeg (webm, ogg, mp3, wav …).
    The audio is first converted to a 16kHz mono WAV because that is what
    the Azure Speech SDK requires when reading from a file.
    """
    import azure.cognitiveservices.speech as speechsdk
    from app.core.config import settings

    # Run the blocking ffmpeg conversion in a thread pool so we don't block
    # the event loop.
    loop = asyncio.get_event_loop()
    wav_path = await loop.run_in_executor(None, _convert_to_wav, audio_bytes, content_type)

    try:
        if settings.AZURE_SPEECH_ENDPOINT:
            speech_config = speechsdk.SpeechConfig(
                subscription=settings.AZURE_SPEECH_KEY,
                endpoint=settings.AZURE_SPEECH_ENDPOINT,
            )
        else:
            speech_config = speechsdk.SpeechConfig(
                subscription=settings.AZURE_SPEECH_KEY,
                region=settings.AZURE_SPEECH_REGION,
            )
        speech_config.speech_recognition_language = 'en-US'
        audio_config = speechsdk.audio.AudioConfig(filename=wav_path)
        recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)

        result_future: asyncio.Future[str] = asyncio.get_event_loop().create_future()

        def on_recognized(evt: speechsdk.SpeechRecognitionEventArgs) -> None:
            if not result_future.done():
                result_future.set_result(evt.result.text)

        def on_canceled(evt: speechsdk.SpeechRecognitionCanceledEventArgs) -> None:
            if not result_future.done():
                result_future.set_exception(
                    RuntimeError(f'Speech recognition canceled: {evt.result.reason}')
                )

        recognizer.recognized.connect(on_recognized)
        recognizer.canceled.connect(on_canceled)
        recognizer.start_continuous_recognition()

        try:
            text = await asyncio.wait_for(result_future, timeout=30)
        finally:
            recognizer.stop_continuous_recognition()

        return text
    finally:
        Path(wav_path).unlink(missing_ok=True)
