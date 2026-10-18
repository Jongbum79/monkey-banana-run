/**
 * Smile Games - 원숭이의 바나나 런
 * Web Audio API 기반 BGM & 특수 효과음 엔진
 * (멋진 특별 아이템 사운드, 굴러오는 돌 소리, 5단계 치지직 글리치 소리, 학교 종소리 포함)
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmPlaying = false;
        this.bgmInterval = null;
        this.step = 0;
        this.currentStage = 1;

        this.melodyNotes = [
            523.25, 659.25, 783.99, 659.25,  880.00, 0,      783.99, 659.25,
            587.33, 659.25, 783.99, 880.00,  783.99, 0,      659.25, 523.25,
            698.46, 880.00, 1046.5, 880.00,  783.99, 659.25, 587.33, 523.25,
            587.33, 659.25, 698.46, 783.99,  880.00, 987.77, 1046.5, 0
        ];

        this.bassNotes = [
            130.81, 0, 164.81, 0,  196.00, 0, 164.81, 0,
            110.00, 0, 130.81, 0,  164.81, 0, 130.81, 0,
            174.61, 0, 220.00, 0,  261.63, 0, 220.00, 0,
            196.00, 0, 246.94, 0,  293.66, 0, 246.94, 196.00
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

        this.bgmInterval = setInterval(() => {
            if (this.muted || !this.bgmPlaying || !this.ctx) return;
            if (this.ctx.state === 'suspended') this.ctx.resume();

            const s = this.step % 32;
            const pitchShift = this.currentStage === 5 ? (Math.random() < 0.25 ? 1.06 : 1.0) : 1.0;

            const mFreq = this.melodyNotes[s] * pitchShift;
            if (mFreq > 0) {
                const wave = this.currentStage === 5 ? 'sawtooth' : 'triangle';
                this.playNote(mFreq, wave, 0.14, 0.07);
                this.playNote(mFreq * 2, 'sine', 0.08, 0.025);
            }

            const bFreq = this.bassNotes[s];
            if (bFreq > 0) {
                this.playNote(bFreq, 'sine', 0.18, 0.09);
            }

            if (s % 4 === 0) {
                this.playTone(110, 'sine', 0.09, 0.10, 42);
            } else if (s % 2 === 1) {
                this.playHiHat(0.035, 0.025);
            }

            // 5단계 글리치 보이드일 때 주기적으로 치지직 노이즈 사운드 발생!
            if (this.currentStage === 5 && s % 8 === 3) {
                this.playGlitchStatic(0.12, 0.06);
            }

            this.step++;
        }, 112);
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
        if (!this.muted && !this.bgmPlaying) this.startBGM();
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
        gain.gain.linearRampToValueAtTime(vol, now + 0.01);
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
        osc.frequency.setValueAtTime(3400 + Math.random() * 1200, now);
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
        if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, now + duration);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    // 🛡️ 특별 아이템(무적 방패 / 황금 부스트) 획득 시 웅장하고 멋있는 파워업 사운드!
    playSpecialItem() {
        if (this.muted) return;
        this.init();
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
        chord.forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'triangle', 0.35, 0.20, f * 1.05);
                this.playTone(f * 0.5, 'sine', 0.35, 0.15);
            }, idx * 55);
        });
    }

    // 🪨 움직이는 돌이 나를 향해 굴러올 때 나는 묵직한 돌 구르는 소리 (우르르르 쿵!)
    playRollingStone() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playTone(95 - i * 10, 'sawtooth', 0.16, 0.16, 52);
                this.playTone(68, 'triangle', 0.18, 0.20, 40);
            }, i * 90);
        }
    }

    // ⚡ 5단계 글리치 보이드 '치지직~' 노이즈 사운드
    playGlitchStatic(duration = 0.18, vol = 0.09) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (i % 40 < 20 ? 1 : 0.2);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    // 🏫 5단계 클리어 후 학교 도착 시 정겨운 학교 종소리 & 축하 팡파레!
    playSchoolBellAndFanfare() {
        if (this.muted) return;
        this.init();
        // 학교 종이 땡땡땡 (솔솔 라라 솔솔 미~)
        const notes = [
            { f: 783.99, t: 0 },
            { f: 783.99, t: 220 },
            { f: 880.00, t: 440 },
            { f: 880.00, t: 660 },
            { f: 783.99, t: 880 },
            { f: 783.99, t: 1100 },
            { f: 659.25, t: 1320 }
        ];
        notes.forEach(n => {
            setTimeout(() => this.playTone(n.f, 'triangle', 0.25, 0.20), n.t);
        });
    }

    playJump() { this.playTone(300, 'sine', 0.22, 0.16, 660); }
    playSlide() { this.playTone(440, 'triangle', 0.18, 0.14, 190); }
    playLaneMove() { this.playTone(360, 'sine', 0.08, 0.09, 460); }
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
    playHit() { this.playTone(165, 'sawtooth', 0.32, 0.22, 52); }
    playRoar() { this.playTone(135, 'sawtooth', 0.65, 0.22, 42); }
}
