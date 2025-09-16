#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter
import math

def create_voice_orb_icon():
    # Create a larger canvas for the glow effect
    canvas_size = 600
    orb_size = 400
    img = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = canvas_size // 2
    orb_radius = orb_size // 2
    
    # Create the outer glow effect (multiple layers)
    glow_layers = [
        (orb_radius + 60, (173, 216, 230, 30)),  # Very light blue, very transparent
        (orb_radius + 40, (173, 216, 230, 50)),  # Light blue, more visible
        (orb_radius + 20, (173, 216, 230, 80)),  # Closer to orb, more intense
    ]
    
    for radius, color in glow_layers:
        draw.ellipse([center - radius, center - radius, center + radius, center + radius], 
                    fill=color, outline=None)
    
    # Create the main orb with radial gradient effect
    # We'll simulate the gradient by drawing multiple concentric circles
    gradient_steps = 50
    for i in range(gradient_steps):
        # Calculate radius for this step
        step_radius = orb_radius * (1 - i / gradient_steps)
        
        # Calculate color for this step (from white center to blue edge)
        progress = i / gradient_steps
        
        if progress < 0.3:
            # Center: bright white to very light blue
            r = int(255 * (1 - progress * 2))
            g = int(255 * (1 - progress * 0.5))
            b = 255
            alpha = 255
        elif progress < 0.7:
            # Middle: light blue to medium blue
            r = int(200 - progress * 100)
            g = int(220 - progress * 80)
            b = int(255 - progress * 50)
            alpha = 255
        else:
            # Outer: medium blue to darker blue
            r = int(150 - progress * 80)
            g = int(170 - progress * 100)
            b = int(220 - progress * 80)
            alpha = 255
        
        color = (max(0, r), max(0, g), max(0, b), alpha)
        
        draw.ellipse([center - step_radius, center - step_radius, 
                     center + step_radius, center + step_radius], 
                    fill=color, outline=None)
    
    # Add the eyes - bright cyan rectangles
    eye_width = 12
    eye_height = 60
    eye_offset = 35
    eye_y = center - eye_height // 2
    eye_color = (0, 206, 209, 255)  # Bright cyan like in the image
    
    # Left eye
    left_eye_x = center - eye_offset - eye_width // 2
    draw.rectangle([left_eye_x, eye_y, left_eye_x + eye_width, eye_y + eye_height],
                  fill=eye_color)
    
    # Right eye  
    right_eye_x = center + eye_offset - eye_width // 2
    draw.rectangle([right_eye_x, eye_y, right_eye_x + eye_width, eye_y + eye_height],
                  fill=eye_color)
    
    # Add subtle inner highlight
    highlight_radius = orb_radius * 0.8
    highlight_color = (255, 255, 255, 40)
    draw.ellipse([center - highlight_radius, center - highlight_radius,
                 center + highlight_radius, center + highlight_radius],
                fill=None, outline=highlight_color, width=2)
    
    # Resize to 512x512 for the final icon
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    
    return img

# Create the icon
icon = create_voice_orb_icon()
icon.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon.png')

# Also create smaller versions
icon_256 = icon.resize((256, 256), Image.Resampling.LANCZOS)
icon_256.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon-256.png')

icon_128 = icon.resize((128, 128), Image.Resampling.LANCZOS)
icon_128.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon-128.png')

icon_64 = icon.resize((64, 64), Image.Resampling.LANCZOS)
icon_64.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon-64.png')

icon_32 = icon.resize((32, 32), Image.Resampling.LANCZOS)
icon_32.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon-32.png')
icon_32.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/tray-icon.png')

icon_16 = icon.resize((16, 16), Image.Resampling.LANCZOS)
icon_16.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon-16.png')

print("✅ Perfect voice orb icon created based on your image!")