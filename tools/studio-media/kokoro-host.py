"""Offline PCM host for the Studio Kokoro adapter."""

import importlib.metadata
import json
import sys
import wave
import zipfile
from pathlib import Path


RATE = 24_000
PAUSE = int(RATE * 0.085)


def check(model, voices, selected):
    if importlib.metadata.version('kokoro-onnx') != '0.6.1':
        raise RuntimeError('Expected kokoro-onnx 0.6.1')
    for module in ('onnxruntime', 'espeakng-loader', 'numpy', 'phonemizer'):
        importlib.metadata.version(module)
    if not model.is_file():
        raise RuntimeError('Expected an installed ONNX model')
    with zipfile.ZipFile(voices) as archive:
        entries = set(archive.namelist())
        if any(f'{name}.npy' not in entries for name in selected):
            raise RuntimeError('Requested voice is absent')


def synthesize(model, voices, request, directory):
    check(model, voices, [request['voice']])
    import numpy as np
    import onnxruntime as ort
    from kokoro_onnx import Kokoro

    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider'])
    session.disable_fallback()
    tts = Kokoro.from_session(session, str(voices))
    voice = request['voice']
    lang = 'en-us' if voice.startswith('a') else 'en-gb'

    try:
        for line, phrases in enumerate(request['phrases']):
            frames = 0
            bookmarks = []
            with wave.open(str(directory / f'line-{line}.wav'), 'wb') as output:
                output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
                for index, phrase in enumerate(phrases):
                    if index:
                        output.writeframesraw(bytes(PAUSE * 2))
                        frames += PAUSE
                    samples, rate = tts.create(phrase, voice=voice, speed=request['speed'], lang=lang)
                    samples = np.asarray(samples, dtype=np.float32)
                    if (rate != RATE or samples.ndim != 1 or not 0 < samples.size <= RATE * 60 or
                            not np.isfinite(samples).all() or np.max(np.abs(samples)) < 0.001):
                        raise RuntimeError('Invalid neural audio')
                    peak = float(np.max(np.abs(samples)))
                    pcm = np.rint(samples * min(1, 0.97 / peak) * 32767).astype('<i2')
                    bookmarks.append({'index': index, 'seconds': frames / RATE})
                    output.writeframesraw(pcm.tobytes())
                    frames += pcm.size
                    if frames > RATE * 120:
                        raise RuntimeError('The line exceeds the audio duration limit')
            with (directory / f'line-{line}.json').open('x', encoding='utf-8') as target:
                json.dump(bookmarks, target)
    finally:
        tts.voices.close()


def main():
    mode, model, voices, *args = sys.argv[1:]
    model, voices = Path(model), Path(voices)
    if mode == 'check':
        check(model, voices, args)
    elif mode == 'render' and len(args) == 1:
        input_file = Path(args[0])
        request = json.loads(input_file.read_text(encoding='utf-8'))
        synthesize(model, voices, request, input_file.parent)
    else:
        raise ValueError('Unsupported Kokoro host operation')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Kokoro host failed ({type(error).__name__}).', file=sys.stderr)
        sys.exit(1)
