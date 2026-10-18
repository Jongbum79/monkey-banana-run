/**
 * Smile Games - 원숭이의 바나나 런
 * Web Audio API 기반 밝고 흥미진진한 어드벤처 BGM 시퀀서 & 효과음 엔진
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 외부 오디오 파일 없이도 모든 브라우저에서 즉시 재생되는 경쾌한 정글/피너츠 재즈-어드벤처 BGM!
 * - 멜로디(밝은 실로폰/피아노 톤) + 워킹 베이스(흥미진진한 추격 리듬) + 드럼 퍼커션 3트랙 합주
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.step = 0;

        // 밝고 흥미진진한 C장조-A단조-F장조-G7 어드벤처 멜로디 시퀀스 (32스텝 = 2마디 루프)
        this.melodyNotes = [
            523.25, 659.25, 783.99, 659.25,  880.00, 0,      783.99, 659.25, // C64: 도 미 솔 미 라 - 솔 미
            587.33, 659.25, 783.99, 880.00,  783.99, 0,      659.25, 523.25, // 레 미 솔 라 솔 - 미 도
            698.46, 880.00, 1046.5, 880.00,  783.99, 659.25, 587.33, 523.25, // 파 라 높은도 라 솔 미 레 도
            587.33, 659.25, 698.46, 783.99,  880.00, 987.77, 1046.5, 0       // 레 미 파 솔 라 시 높은도!
        ];

        // 흥미진진하게 통통 튀는 워킹 베이스 시퀀스
        this.bassNotes = [
            130.81, 0, 164.81, 0,  196.00, 0, 164.81, 0, // C3 - E3 - G3 - E3
            110.00, 0, 130.81, 0,  164.81, 0, 130.81, 0, // A2 - C3 - E3 - C3
            174.61, 0, 220.00, 0,  261.63, 0, 220.00, 0, // F3 - A3 - C4 - A3
            196.00, 0, 246.94, 0,  293.66, 0, 246.94, 196.00 // G3 - B3 - D4 - B3 - G3
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    startBGM() {
        this.init();
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.step = 0;

        // 140 BPM의 16분음표 간격 (약 110ms)
        this.bgmInterval = setInterval(() => {
            if (this.muted || !this.bgmPlaying || !this.ctx) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const s = this.step % 32;

            // 1. 밝고 경쾌한 마림바/피아노 멜로디
            const mFreq = this.melodyNotes[s];
            if (mFreq > 0) {
                this.playNote(mFreq, 'triangle', 0.14, 0.075);
                // 옥타브 위 은은한 하모니 추가
                this.playNote(mFreq * 2, 'sine', 0.08, 0.025);
            }

            // 2. 흥미진진한 워킹 베이스
            const bFreq = this.bassNotes[s];
            if (bFreq > 0) {
                this.playNote(bFreq, 'sine', 0.18, 0.09);
                this.playNote(bFreq * 1.5, 'triangle', 0.12, 0.03);
            }

            // 3. 경쾌한 러닝 드럼 비트 (킥 & 하이햇)
            if (s % 4 === 0) {
                // 쿵! (Kick)
                this.playTone(110, 'sine', 0.09, 0.10, 42);
            } else if (s % 2 === 1) {
                // 칙! (Hi-hat / Shaker 느낌)
                this.playHiHat(0.035, 0.025);
            }

            this.step++;
        }, 115);
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (!this.muted && !this.bgmPlaying) {
            this.startBGM();
        }
        return this.muted;
    }

    playNote(freq, type, duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playHiHat(duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(3200 + Math.random() * 1200, now);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playTone(freq, type, duration, vol = 0.15, slideFreq = null) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
        }

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playJump() {
        this.playTone(300, 'sine', 0.22, 0.16, 660);
    }

    playSlide() {
        this.playTone(440, 'triangle', 0.18, 0.14, 190);
    }

    playLaneMove() {
        this.playTone(360, 'sine', 0.08, 0.09, 460);
    }

    playCoin() {
        this.playTone(987.77, 'sine', 0.08, 0.14);
        setTimeout(() => this.playTone(1318.5, 'sine', 0.15, 0.14), 55);
    }

    playCorrect() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.22, 0.18), idx * 70);
        });
    }

    playHeal() {
        [440, 554.37, 659.25, 880].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'sine', 0.18, 0.15), idx * 60);
        });
    }

    playHit() {
        this.playTone(165, 'sawtooth', 0.32, 0.22, 52);
    }

    playRoar() {
        this.playTone(135, 'sawtooth', 0.65, 0.22, 42);
    }
}
