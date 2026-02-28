document.addEventListener('DOMContentLoaded', () => {
    const synth = window.speechSynthesis;
    const hasSynth = !!synth;

    // --- Analytics (GA4) ---
    const analyticsState = {
        scroll50Sent: false,
        scroll90Sent: false
    };

    const trackEvent = (eventName, params = {}) => {
        if (typeof window.gtag !== 'function') return;
        window.gtag('event', eventName, params);
    };

    const setupAnalytics = () => {
        // Outbound click tracking
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href]');
            if (!link) return;

            const href = link.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            let url;
            try {
                url = new URL(link.href, window.location.origin);
            } catch {
                return;
            }

            const isOutbound = url.hostname && url.hostname !== window.location.hostname;
            if (isOutbound) {
                trackEvent('outbound_click', {
                    link_url: url.href,
                    link_domain: url.hostname,
                    link_text: (link.textContent || '').trim().slice(0, 120)
                });
            }

            const isGameLink = url.pathname.includes('/games/') && url.pathname.endsWith('.html');
            if (isGameLink) {
                const gameSlug = url.pathname.split('/').pop().replace('.html', '');
                trackEvent('game_start', {
                    game_slug: gameSlug,
                    source_path: window.location.pathname
                });
            }
        });

        // Scroll depth tracking (50% / 90%)
        const onScroll = () => {
            const doc = document.documentElement;
            const maxScroll = doc.scrollHeight - window.innerHeight;
            if (maxScroll <= 0) return;

            const progress = (window.scrollY / maxScroll) * 100;

            if (!analyticsState.scroll50Sent && progress >= 50) {
                analyticsState.scroll50Sent = true;
                trackEvent('scroll_depth', { percent: 50, page_path: window.location.pathname });
            }

            if (!analyticsState.scroll90Sent && progress >= 90) {
                analyticsState.scroll90Sent = true;
                trackEvent('scroll_depth', { percent: 90, page_path: window.location.pathname });
                window.removeEventListener('scroll', onScroll);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });

        // Site search tracking (query params + search forms)
        const queryParams = new URLSearchParams(window.location.search);
        const searchTerm = queryParams.get('q') || queryParams.get('s') || queryParams.get('query') || queryParams.get('search');
        if (searchTerm) {
            trackEvent('site_search', {
                search_term: searchTerm,
                page_path: window.location.pathname
            });
        }

        document.querySelectorAll('form').forEach((form) => {
            form.addEventListener('submit', () => {
                const input = form.querySelector('input[type="search"], input[name="q"], input[name="query"], input[name="s"], input[name="search"]');
                if (!input) return;
                const term = (input.value || '').trim();
                if (!term) return;

                trackEvent('site_search', {
                    search_term: term,
                    page_path: window.location.pathname
                });
            });
        });
    };

    setupAnalytics();

    // State management
    const state = {
        speaking: false,
        currentBtn: null,
        utterance: null,
        resumeTimer: null,
        voices: []
    };

    // Configuration
    const CONFIG = {
        resumeInterval: 10000, // ms
        labels: {
            play: { tr: '<span>▶️</span> Dinle', en: '<span>▶️</span> Listen' },
            stop: { tr: '<span>⏹️</span> Dur', en: '<span>⏹️</span> Stop' }
        }
    };

    if (!hasSynth) {
        console.warn('SpeechSynthesis API not supported.');
        document.querySelectorAll('.tts-btn').forEach(btn => btn.style.display = 'none');
    }

    // --- Voice Management ---

    const loadVoices = () => {
        if (!hasSynth) return;
        state.voices = synth.getVoices();
    };

    // Initial load
    loadVoices();
    
    // Chrome requires this event to load voices asynchronously
    if (hasSynth && synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    }

    const getBestVoice = (lang) => {
        if (!state.voices.length) return null;
        
        // 1. Exact match (e.g., 'en-US')
        const exact = state.voices.find(v => v.lang === lang);
        if (exact) return exact;

        // 2. Language prefix match (e.g., 'en' matches 'en-GB')
        const prefix = lang.split('-')[0];
        const approximate = state.voices.find(v => v.lang.startsWith(prefix));
        
        return approximate || null; // Fallback to null (browser default)
    };

    // --- Chrome Infinite Speech Workaround ---
    
    const startResumeLoop = () => {
        stopResumeLoop();
        state.resumeTimer = setInterval(() => {
            if (synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
            }
        }, CONFIG.resumeInterval);
    };

    const stopResumeLoop = () => {
        if (state.resumeTimer) {
            clearInterval(state.resumeTimer);
            state.resumeTimer = null;
        }
    };

    // --- UI Updates ---

    const updateButtonUI = (btn, isPlaying, lang) => {
        const isTR = lang.startsWith('tr');
        const langKey = isTR ? 'tr' : 'en';
        
        if (isPlaying) {
            btn.innerHTML = CONFIG.labels.stop[langKey];
            btn.classList.add('playing');
        } else {
            // Restore original text based on context or config
            // Note: The original code inferred text from context. 
            // We'll stick to a clean consistent label.
            const suffix = isTR ? '(TR)' : '(EN)'; 
            btn.innerHTML = `${CONFIG.labels.play[langKey]} ${suffix}`;
            btn.classList.remove('playing');
        }
    };

    const stopSpeaking = () => {
        if (!hasSynth) return;

        if (synth.speaking || state.speaking) {
            synth.cancel();
        }
        stopResumeLoop();
        
        if (state.currentBtn) {
            // We need to know the language to reset the button text correctly.
            // Since we might not have it easily, we can infer or store it. 
            // For simplicity, we'll infer from the previous utterance or defaults.
            // But wait, the button element is still there.
            // We'll just reset it to "Play".
            // To do this right, we need the language key. 
            // Let's assume the button still has its click handler or data attributes.
            // Actually, the original code used `resetButton` which inferred from `content-tr` class.
            
            // Re-implementing reset logic to match original behavior safely:
            const parent = state.currentBtn.parentElement;
            const isTR = parent && parent.classList.contains('content-tr');
            updateButtonUI(state.currentBtn, false, isTR ? 'tr' : 'en');
        }

        state.speaking = false;
        state.currentBtn = null;
        state.utterance = null;
    };

    // --- Main Interface ---

    window.toggleSpeech = function(btn, lang) {
        if (!hasSynth) return;

        // 1. If clicking the currently playing button, stop.
        if (state.currentBtn === btn && state.speaking) {
            stopSpeaking();
            return;
        }

        // 2. If something else is playing, stop it first.
        if (state.speaking) {
            stopSpeaking();
        }

        // 3. Prepare new speech
        const container = btn.parentElement;
        // Extract text from paragraphs only
        const text = Array.from(container.querySelectorAll('p'))
            .map(p => p.innerText)
            .join(' ')
            .trim();

        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        
        const voice = getBestVoice(lang);
        if (voice) utterance.voice = voice;

        // Events
        utterance.onend = () => stopSpeaking();
        utterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            stopSpeaking();
        };

        // 4. Start
        state.currentBtn = btn;
        state.speaking = true;
        state.utterance = utterance;
        
        updateButtonUI(btn, true, lang);
        
        synth.speak(utterance);
        startResumeLoop();
    };
});
