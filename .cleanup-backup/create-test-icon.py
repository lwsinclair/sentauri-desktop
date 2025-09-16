#!/usr/bin/env python3
from PIL import Image, ImageDraw

def create_test_icon():
    # Create a 512x512 image with bright colors for testing
    img = Image.new('RGBA', (512, 512), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Bright cyan background circle
    draw.ellipse([50, 50, 462, 462], fill=(0, 206, 200, 255), outline=(59, 130, 246, 255), width=10)
    
    # Big white eyes that are unmistakable
    draw.rectangle([180, 200, 210, 312], fill=(255, 255, 255, 255))
    draw.rectangle([302, 200, 332, 312], fill=(255, 255, 255, 255))
    
    # Blue pupils
    draw.rectangle([185, 220, 205, 280], fill=(59, 130, 246, 255))
    draw.rectangle([307, 220, 327, 280], fill=(59, 130, 246, 255))
    
    return img

# Create the test icon
icon = create_test_icon()
icon.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/icon.png')
icon.save('/Users/hhh/Desktop/Copilot/desktop-app/assets/tray-icon.png')

print("✅ High-contrast test icon created!")