from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/upload/', views.upload_recording, name='upload_recording'),
    path('api/recordings/', views.get_recordings, name='get_recordings'),
    path('runtts/', views.run_tts, name='run_tts'),
] 