from django.db import models
from django.utils import timezone

class Recording(models.Model):
    file = models.FileField(upload_to='recordings/')
    created_at = models.DateTimeField(default=timezone.now)
    transcript = models.TextField(blank=True)
    
    def __str__(self):
        return f"Recording {self.created_at}"
    
    class Meta:
        ordering = ['-created_at'] 