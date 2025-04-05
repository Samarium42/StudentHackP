from pyneuphonic import Neuphonic, TTSConfig
from pyneuphonic.player import AudioPlayer
import os
import sys

def main():
    try:
        print("Starting TTS script...")
        
        # Check if API key exists
        NEUPHONIC_API_KEY = "88bd64f79fa25367199f020688d1223a56b91baf483d069f7d26967754e612a9.2b6121df-5054-4e30-86f9-a3e6d3896b87"
        if not NEUPHONIC_API_KEY:
            print("Error: NEUPHONIC_API_KEY is not set")
            return

        print("Initializing Neuphonic client...")
        client = Neuphonic(api_key=NEUPHONIC_API_KEY)
        sse = client.tts.SSEClient()

        print("Configuring TTS settings...")
        tts_config = TTSConfig(
            speed=0.85,
            lang_code='en',
            voice_id='e564ba7e-aa8d-46a2-96a8-8dffedade48f'
        )

        print("Creating audio player...")
        with AudioPlayer() as player:
            print("Generating speech...")
            response = sse.send('Hi Participant welcome to your interview with the AI Agent! We will give you extensive analysis on your answers, tone, speech and more! All the best!', tts_config=tts_config)
            
            print("Playing audio...")
            player.play(response)
            
            print("Saving audio to output.wav...")
            player.save_audio('output.wav')
            print("TTS script completed successfully!")

    except Exception as e:
        print(f"Error in TTS script: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()