import time
import random
import math

# Seed based on current time (millisecond precision)
seed = int(time.time() * 1000)
random.seed(seed)

WIDTH = 800
HEIGHT = 400

def random_color():
    h = random.randint(0, 360)
    s = random.randint(50, 100)
    l = random.randint(30, 70)
    a = random.random() * 0.5 + 0.2
    return f"hsla({h}, {s}%, {l}%, {a})"

svg = [f'<svg width="{WIDTH}" height="{HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#111">']

# Generate chaos
# 1. Background geometric primitives
for _ in range(50):
    x = random.randint(0, WIDTH)
    y = random.randint(0, HEIGHT)
    size = random.randint(10, 100)
    color = random_color()
    shape = random.choice(['circle', 'rect'])
    
    if shape == 'circle':
        svg.append(f'<circle cx="{x}" cy="{y}" r="{size}" fill="{color}" />')
    else:
        svg.append(f'<rect x="{x}" y="{y}" width="{size}" height="{size}" fill="{color}" transform="rotate({random.randint(0,90)} {x+size/2} {y+size/2})" />')

# 2. Connecting lines (Network)
for _ in range(20):
    x1, y1 = random.randint(0, WIDTH), random.randint(0, HEIGHT)
    x2, y2 = random.randint(0, WIDTH), random.randint(0, HEIGHT)
    stroke = random_color()
    width = random.randint(1, 5)
    svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{width}" />')

# 3. Time signature (The Seed)
svg.append(f'<text x="20" y="{HEIGHT-20}" fill="#fff" font-family="monospace" font-size="12" opacity="0.5">Entropy Seed: {seed}</text>')

svg.append('</svg>')

# Output file
output_path = "assets/entropy_garden.svg"
with open(output_path, "w") as f:
    f.write("".join(svg))

print(f"Generated {output_path} with seed {seed}")