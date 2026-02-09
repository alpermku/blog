document.addEventListener('DOMContentLoaded', () => {
    const synth = window.speechSynthesis;
    let currentUtterance = null;
    let currentlyPlayingBtn = null;
    let resumeTimer = null;
    let voices = [];

    // Hide TTS buttons if speechSynthesis is not supported
    if (!synth) {
        document.querySelectorAll('.tts-btn').forEach(btn => {
            btn.style.display = 'none';
        });
        return;
    }

    // Load available voices and update when they change
    function loadVoices() {
        voices = synth.getVoices();
    }
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }

    // Pick the best voice for a given language code
    function pickVoice(lang) {
        if (!voices.length) return null;
        // Exact match first (e.g. 'en-US' for 'en-US')
        let voice = voices.find(v => v.lang === lang);
        if (voice) return voice;
        // Prefix match (e.g. 'en' for 'en-US')
        const prefix = lang.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(prefix));
        return voice || null;
    }

    // Chrome workaround: Chrome pauses speechSynthesis after ~15s of continuous speech.
    // Periodically calling pause()/resume() keeps it alive.
    function startResumeTimer() {
        clearResumeTimer();
        resumeTimer = setInterval(() => {
            if (synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
            }
        }, 10000);
    }

    function clearResumeTimer() {
        if (resumeTimer) {
            clearInterval(resumeTimer);
            resumeTimer = null;
        }
    }

    window.toggleSpeech = function(btn, lang) {
        // If this button's text is currently being read -> STOP
        if (currentlyPlayingBtn === btn && synth.speaking) {
            synth.cancel();
            clearResumeTimer();
            resetButton(btn);
            currentlyPlayingBtn = null;
            return;
        }

        // If something else is playing -> stop it first
        if (synth.speaking) {
            synth.cancel();
            clearResumeTimer();
            if (currentlyPlayingBtn) resetButton(currentlyPlayingBtn);
        }

        // Find the text to read (paragraphs inside the content container)
        const contentDiv = btn.parentElement;
        const textToRead = Array.from(contentDiv.querySelectorAll('p'))
                                .map(p => p.innerText).join(' ');

        if (!textToRead) return;

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Set the best available voice for this language
        const voice = pickVoice(lang);
        if (voice) {
            utterance.voice = voice;
        }

        utterance.onend = () => {
            clearResumeTimer();
            resetButton(btn);
            currentlyPlayingBtn = null;
        };

        utterance.onerror = () => {
            clearResumeTimer();
            resetButton(btn);
            currentlyPlayingBtn = null;
        };

        // Update button to playing state
        const isTR = lang.startsWith('tr');
        btn.innerHTML = isTR ? '<span>⏹️</span> Dur' : '<span>⏹️</span> Stop';
        btn.classList.add('playing');
        currentlyPlayingBtn = btn;
        currentUtterance = utterance;

        synth.speak(utterance);
        startResumeTimer();
    };

    function resetButton(btn) {
        const isTR = btn.parentElement.classList.contains('content-tr');
        btn.innerHTML = isTR ? '<span>▶️</span> Dinle (TR)' : '<span>▶️</span> Listen (EN)';
        btn.classList.remove('playing');
    }
});
