import os
import subprocess
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Recording
import json

def index(request):
    recordings = Recording.objects.all()
    return render(request, 'interview/index.html', {'recordings': recordings})

@csrf_exempt
def upload_recording(request):
    if request.method == 'POST' and request.FILES.get('audio'):
        audio_file = request.FILES['audio']
        recording = Recording.objects.create(file=audio_file)
        
        # Start transcription
        subprocess.Popen(['python3', 'transcribe.py', recording.file.name])
        
        return JsonResponse({
            'success': True,
            'message': 'File uploaded successfully',
            'filename': recording.file.name
        })
    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

def get_recordings(request):
    recordings = Recording.objects.all()
    data = [{
        'filename': recording.file.name,
        'url': recording.file.url,
        'timestamp': recording.created_at.strftime('%Y-%m-%dT%H-%M-%S-%f')[:-3] + 'Z'
    } for recording in recordings]
    return JsonResponse(data)

def run_tts(request):
    try:
        print("Starting TTS script execution...")
        tts_script = os.path.join(settings.BASE_DIR, 'tts.py')
        
        if not os.path.exists(tts_script):
            raise Exception(f"TTS script not found at: {tts_script}")
        
        process = subprocess.Popen(
            ['python3', tts_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=settings.BASE_DIR
        )
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr if stderr else "Unknown error occurred"
            print(f"TTS script failed with error: {error_msg}")
            return JsonResponse({'success': False, 'error': error_msg}, status=500)
        
        print("TTS script output:", stdout)
        
        output_wav = os.path.join(settings.BASE_DIR, 'output.wav')
        if not os.path.exists(output_wav):
            return JsonResponse({'success': False, 'error': 'TTS script completed but output.wav was not created'}, status=500)
            
        return JsonResponse({
            'success': True,
            'message': 'TTS script completed successfully',
            'output': stdout
        })
    except Exception as e:
        print(f"Error running TTS script: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)}, status=500) 