import math
import struct
import wave
import random

OUTPUT_FILE = "assets/lorenz_symphony.wav"

# Lorenz System Parameters
sigma = 10.0
rho = 28.0
beta = 8.0 / 3.0
dt = 0.01

# Initial State
x, y, z = 0.1, 0.0, 0.0

# Audio Parameters
SAMPLE_RATE = 44100
DURATION = 30 # seconds

def generate_tone(freq, duration, volume=0.5, type='sine'):
    n_samples = int(SAMPLE_RATE * duration)
    audio = []
    for i in range(n_samples):
        t = float(i) / SAMPLE_RATE
        if type == 'sine':
            val = math.sin(2.0 * math.pi * freq * t)
        elif type == 'square':
            val = 1.0 if math.sin(2.0 * math.pi * freq * t) > 0 else -1.0
        elif type == 'saw':
            val = 2.0 * (freq * t - math.floor(freq * t + 0.5))
        
        # Envelope (Attack/Decay)
        env = 1.0
        if i < 500: env = i / 500.0
        if i > n_samples - 500: env = (n_samples - i) / 500.0
        
        audio.append(int(val * volume * env * 32767.0))
    return audio

audio_data = []

# Generate Music from Chaos
steps = int(DURATION / 0.15) # ~6 notes per second
for _ in range(steps):
    # Lorenz Integration
    dx = (sigma * (y - x)) * dt
    dy = (x * (rho - z) - y) * dt
    dz = (x * y - beta * z) * dt
    x += dx
    y += dy
    z += dz

    # Mapping
    # X -> Frequency (Pitch)
    # Y -> Volume (Velocity)
    # Z -> Note Duration
    
    # Scale X (-20 to 20) to MIDI notes or Freq
    # Let's map to a pentatonic scale or just frequency range
    base_freq = 220
    freq = base_freq + (abs(x) * 20)
    
    # Quantize to scale (A Minor Pentatonic approx)
    # A, C, D, E, G
    scale_ratios = [1.0, 1.2, 1.33, 1.5, 1.66, 2.0]
    ratio = min(scale_ratios, key=lambda r: abs(r - (freq/base_freq) % 1))
    # freq = base_freq * math.floor(freq/base_freq) * ratio 
    
    vol = min(1.0, max(0.1, abs(y) / 30.0))
    note_dur = 0.1 + (abs(z) / 100.0)
    
    # Generate Note
    tone_type = 'sine' if z < 20 else 'square' # Change timbre based on Z
    
    samples = generate_tone(freq, note_dur, vol, tone_type)
    audio_data.extend(samples)

# Save WAV
with wave.open(OUTPUT_FILE, 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(SAMPLE_RATE)
    f.writeframes(struct.pack('<' + 'h' * len(audio_data), *audio_data))

print(f"Generated {OUTPUT_FILE}")