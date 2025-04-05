from pyneuphonic import Neuphonic, TTSConfig
from pyneuphonic.player import AudioPlayer
import os

NEUPHONIC_API_KEY = "88bd64f79fa25367199f020688d1223a56b91baf483d069f7d26967754e612a9.2b6121df-5054-4e30-86f9-a3e6d3896b87"

client = Neuphonic(api_key=NEUPHONIC_API_KEY)

sse = client.tts.SSEClient()

# View the TTSConfig object to see all valid options
tts_config = TTSConfig(
    speed=0.85,
    lang_code='en',
    voice_id='e564ba7e-aa8d-46a2-96a8-8dffedade48f'  # use client.voices.list() to view all voice ids
)

# Create an audio player with `pyaudio`
with AudioPlayer() as player:
    response = sse.send('Hi Participant welcome to your interview with the AI Agent! We will give you extensive analysis on your answers, tone, speech and more! All the best!', tts_config=tts_config)
    player.play(response)
    player.save_audio('output.wav')  # save the audio to a .wav file from the player