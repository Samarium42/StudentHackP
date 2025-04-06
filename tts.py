from pyneuphonic import Neuphonic, TTSConfig
from pyneuphonic.player import AudioPlayer
import os
import json
from python_backend.check_and_generate import check_and_generate

NEUPHONIC_API_KEY = "88bd64f79fa25367199f020688d1223a56b91baf483d069f7d26967754e612a9.2b6121df-5054-4e30-86f9-a3e6d3896b87"  # Use environment variable in production
QUESTIONS_FILE = "questions/main_questions.txt"
STATE_FILE = "questions/tts_state.json"

# Initialize Neuphonic
client = Neuphonic(api_key=NEUPHONIC_API_KEY)
sse = client.tts.SSEClient()

tts_config = TTSConfig(
    speed= 0.85,
    lang_code='en',
    voice_id='e564ba7e-aa8d-46a2-96a8-8dffedade48f'
)

def load_questions():
    with open(QUESTIONS_FILE, "r") as f:
        return [line.strip() for line in f if line.strip()]

def get_current_index():
    if not os.path.exists(STATE_FILE):
        return 0
    with open(STATE_FILE, "r") as f:
        state = json.load(f)
        return state.get("index", 0)

def update_index(index):
    with open(STATE_FILE, "w") as f:
        json.dump({"index": index}, f)

def speak_next_question():
    questions = load_questions()
    index = get_current_index()
    check_and_generate()

    if index >= len(questions):
        print("All questions have been spoken.")
        return "DONE"
    if index == 0 :
        with AudioPlayer() as player:
            response = sse.send("Hello, I am the interviewer. Let's start the interview.", tts_config=tts_config)
            player.play(response)

    if (index%2 == 1):
        
        with open(os.path.abspath('questions/follow_up_questions.txt'), 'r') as f:
            questions = f.readlines()
            question = questions[index-1]

            with AudioPlayer() as player:
                response = sse.send(question, tts_config=tts_config)
                player.play(response)

    else:
    
        question = questions[index]
        print(f"Speaking question {index}: {question}")

        

        with AudioPlayer() as player:
            response = sse.send(question, tts_config=tts_config)
            player.play(response)


    update_index(index + 1)
    return question

if __name__ == "__main__":
    speak_next_question()