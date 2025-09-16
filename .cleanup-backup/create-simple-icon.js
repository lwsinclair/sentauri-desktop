const fs = require('fs');

// Create a simple HTML file to generate a high-contrast icon
const htmlIcon = `
<!DOCTYPE html>
<html>
<head><title>Voice Orb Icon</title></head>
<body style="margin:0; background:#000;">
<canvas id="canvas" width="512" height="512"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Black background
ctx.fillStyle = '#000000';
ctx.fillRect(0, 0, 512, 512);

// Create the orb with high contrast
const centerX = 256;
const centerY = 256;
const radius = 200;

// Main orb - bright blue/cyan
const gradient = ctx.createRadialGradient(
    centerX - 60, centerY - 60, 0,
    centerX, centerY, radius
);
gradient.addColorStop(0, '#e8f0ff');
gradient.addColorStop(0.5, '#3B82F6');
gradient.addColorStop(1, '#1e3a8a');

ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
ctx.fill();

// Bright white/cyan eyes
ctx.fillStyle = '#00CEC8';
ctx.fillRect(206, 220, 20, 72); // Left eye
ctx.fillRect(286, 220, 20, 72); // Right eye

// White highlights on eyes
ctx.fillStyle = '#ffffff';
ctx.fillRect(208, 222, 6, 20); // Left eye highlight
ctx.fillRect(288, 222, 6, 20); // Right eye highlight

// Outer glow
ctx.strokeStyle = '#3B82F6';
ctx.lineWidth = 8;
ctx.beginPath();
ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
ctx.stroke();

// Download the result
setTimeout(() => {
    const link = document.createElement('a');
    link.download = 'voice-orb-icon-hq.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}, 100);
</script>
</body>
</html>
`;

fs.writeFileSync('/Users/hhh/Desktop/Copilot/icon-generator.html', htmlIcon);
console.log('Icon generator created! Open /Users/hhh/Desktop/Copilot/icon-generator.html in your browser and click download.');