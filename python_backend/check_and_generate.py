import json
#from python_backend.app import generate_follow_up_question
import time


def check_and_generate():
    print("CHECKING AND GENERATING")
    with open('questions/tts_state.json', 'r') as f:
        state = json.load(f)
        index = state.get('index', 0)

        print("Index: ", index)

    if index % 2 == 1:
        generate_follow_up_question()


if __name__ == '__main__':
    check_and_generate()