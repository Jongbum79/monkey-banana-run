/**
 * Smile Games - 원숭이의 바나나 런
 * Web Audio API 기반 카툰 사운드 효과 엔진 (별도 파일 없이 즉시 작동)
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
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
        this.playTone(280, 'sine', 0.22, 0.16, 620);
    }

    playSlide() {
        this.playTone(420, 'triangle', 0.18, 0.14, 180);
    }

    playLaneMove() {
        this.playTone(340, 'sine', 0.08, 0.09, 440);
    }

    playCoin() {
        this.playTone(880, 'sine', 0.09, 0.14);
        setTimeout(() => this.playTone(1320, 'sine', 0.16, 0.14), 60);
    }

    playCorrect() {
        // 정답 팡파레 화음!
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.22, 0.16), idx * 75);
        });
    }

    playHit() {
        // 장애물 충돌 / 오답 쿵 소리
        this.playTone(160, 'sawtooth', 0.32, 0.20, 55);
    }

    playRoar() {
        this.playTone(130, 'sawtooth', 0.55, 0.18, 48);
    }
}
