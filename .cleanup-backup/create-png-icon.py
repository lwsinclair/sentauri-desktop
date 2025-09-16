#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

def create_voice_orb_icon(size=512):
    # Create a new image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size // 2
    radius = int(size * 0.4)
    
    # Draw the main orb circle with gradient effect (simplified)
    # We'll create multiple circles with varying opacity to simulate gradient
    for i in range(radius, 0, -5):
        alpha = int(255 * (1 - (radius - i) / radius * 0.7))
        if i > radius * 0.7:
            color = (232, 240, 255, alpha)  # #e8f0ff
        elif i > radius * 0.3:
            color = (197, 209, 224, alpha)  # #C5D1E0
        else:
            color = (160, 184, 208, alpha)  # #a0b8d0
            
        draw.ellipse([center - i, center - i, center + i, center + i], 
                    fill=color, outline=None)
    
    # Draw the eyes
    eye_width = int(size * 0.025)
    eye_height = int(size * 0.15)
    eye_offset = int(size * 0.06)
    eye_y = center - eye_height // 2
    
    # Left eye
    left_eye_x = center - eye_offset - eye_width // 2
    draw.rectangle([left_eye_x, eye_y, left_eye_x + eye_width, eye_y + eye_height],
                  fill=(59, 130, 246, 255))  # #3B82F6
    
    # Right eye  
    right_eye_x = center + eye_offset - eye_width // 2
    draw.rectangle([right_eye_x, eye_y, right_eye_x + eye_width, eye_y + eye_height],
                  fill=(59, 130, 246, 255))  # #3B82F6
    
    return img

# Create different sizes
sizes = [16, 32, 64, 128, 256, 512]
base_path = '/Users/hhh/Desktop/Copilot/desktop-app/assets'

for size in sizes:
    icon = create_voice_orb_icon(size)
    if size == 512:
        icon.save(f'{base_path}/icon.png')
    if size == 32:
        icon.save(f'{base_path}/tray-icon.png')
    icon.save(f'{base_path}/icon-{size}.png')

print("✅ Voice orb PNG icons created in multiple sizes!")