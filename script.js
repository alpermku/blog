document.addEventListener('DOMContentLoaded', () => {
    const synth = window.speechSynthesis;
    let currentUtterance = null;
    let currentlyPlayingBtn = null;

    window.toggleSpeech = function(btn, lang) {
        // Eğer şu an bu butonun metni okunuyorsa -> DURDUR
        if (currentlyPlayingBtn === btn && synth.speaking) {
            synth.cancel();
            resetButton(btn);
            currentlyPlayingBtn = null;
            return;
        }

        // Başka bir şey okunuyorsa -> ÖNCE ONU DURDUR
        if (synth.speaking) {
            synth.cancel();
            if (currentlyPlayingBtn) resetButton(currentlyPlayingBtn);
        }

        // Metni bul (Butonun olduğu container'ın içindeki paragrafları al)
        const contentDiv = btn.parentElement;
        // Sadece p etiketlerini al, butonu okumasın
        const textToRead = Array.from(contentDiv.querySelectorAll('p'))
                                .map(p => p.innerText).join(' ');

        if (!textToRead) return;

        // Okumayı başlat
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = lang; // 'en-US' veya 'tr-TR'
        
        // Ses ayarları (opsiyonel, cihazın varsayılanı iyidir)
        utterance.rate = 1.0; 
        utterance.pitch = 1.0;

        utterance.onend = () => {
            resetButton(btn);
            currentlyPlayingBtn = null;
        };

        // Buton ikonunu değiştir
        btn.innerHTML = '⏹️ Stop';
        btn.classList.add('playing');
        currentlyPlayingBtn = btn;

        synth.speak(utterance);
    };

    function resetButton(btn) {
        // Dil kontrolü yaparak orijinal ikona dön
        const isTR = btn.parentElement.classList.contains('content-tr');
        btn.innerHTML = isTR ? '▶️ Dinle' : '▶️ Listen';
        btn.classList.remove('playing');
    }
});