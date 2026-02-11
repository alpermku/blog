import os
import math
import struct
import wave
import random

REPO_PATH = "."
OUTPUT_FILE = "assets/code_song.wav"

def get_file_counts(path):
    counts = {'html': 0, 'js': 0, 'css': 0, 'json': 0, 'md': 0}
    for root, dirs, files in os.walk(path):
        if '.git' in root: continue
        for file in files:
            ext = file.split('.')[-1]
            if ext in counts:
                counts[ext] += 1
    return counts

def generate_sine_wave(freq, duration, rate=44100):
    frames = []
    for i in range(int(rate * duration)):
        value = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * freq * i / rate))
        frames.append(struct.pack('h', value))
    return b''.join(frames)

def generate_noise(duration, rate=44100):
    frames = []
    for i in range(int(rate * duration)):
        value = int(random.uniform(-10000, 10000))
        frames.append(struct.pack('h', value))
    return b''.join(frames)

counts = get_file_counts(REPO_PATH)
print(f"Stats: {counts}")

# Algorithm:
# HTML count defines the base drone frequency (scaled)
# JS count defines number of staccato beeps
# CSS count defines noise bursts

base_freq = 100 + (counts['html'] * 10) # HTML = Drone
rhythm_count = counts['js'] + counts['json'] # JS/JSON = Melody notes
noise_count = counts['css'] # CSS = Percussion

audio_data = b''

# 1. Intro Drone
audio_data += generate_sine_wave(base_freq, 2.0)

# 2. Rhythmic Section
for i in range(rhythm_count):
    note_freq = base_freq * (1 + (i % 5) * 0.5) # Harmony?
    audio_data += generate_sine_wave(note_freq, 0.2)
    audio_data += generate_noise(0.05) # CSS Hi-hat
    audio_data += generate_sine_wave(0, 0.1) # Pause

# 3. Outro Drone
audio_data += generate_sine_wave(base_freq / 2, 2.0)

with wave.open(OUTPUT_FILE, 'w') as f:
    f.setnchannels(1)
    f.setsampwidth(2)
    f.setframerate(44100)
    f.writeframes(audio_data)

print(f"Generated {OUTPUT_FILE}")