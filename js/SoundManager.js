/**
 * Smile Games - 원숭이의 바나나 런
 * Web Audio API 기반 시네마틱 액션 어드벤처 BGM & 특수 효과음 엔진
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 신나면서도 가볍지 않은(웅장한 단조 신스웨이브/오케스트라 록 스타일) 고품질 추격전 BGM!
 * - 단계가 올라갈수록(1~5단계) BPM과 베이스 비트가 더욱 박진감 넘치게 가속됨!
 * - 특별 아이템(방패, 슈퍼점프, 손오공 진화) 획득 시 웅장하고 멋있는 시네마틱 파워업 사운드!
 * - 숲(돌 굴러가는 소리), 사막(전갈 위협음), 해저(상어 물살 소리), 도시(자동차 경적/엔진음), 5단계(치지직 글리치음) 완비!
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.step = 0;
        this.currentStage = 1;

        // D 단조(D Minor) 기반의 웅장하고 긴장감 넘치는 액션 어드벤처 리드 멜로디 (64스텝)
        // 가볍지 않고 진지하면서도 질주감이 살아있는 테마 (Dm -> Bb -> C -> A7 진행)
        this.leadNotes = [
            // Bar 1 (Dm): 강렬한 메인 테마 도입
            293.66, 0, 349.23, 0,  440.00, 0, 392.00, 349.23,
            329.63, 0, 293.66, 0,  261.63, 293.66, 329.63, 0,
            // Bar 2 (Bb -> G): 상승하는 영웅적 멜로디
            466.16, 0, 440.00, 0,  392.00, 0, 349.23, 392.00,
            440.00, 0, 523.25, 0,  440.00, 0, 0, 0,
            // Bar 3 (C -> F): 박진감 넘치는 클라이맥스
            587.33, 0, 523.25, 0,  466.16, 0, 440.00, 392.00,
            349.23, 0, 392.00, 440.00, 523.25, 0, 466.16, 440.00,
            // Bar 4 (A7 -> Dm): 비장한 마무리의 턴어라운드
            440.00, 0, 392.00, 0,  349.23, 0, 329.63, 0,
            277.18, 0, 329.63, 0,  293.66, 0, 293.66, 0
        ];

        // 묵직하게 깔리는 화음 패드 (Chord Pads - 16스텝마다 변경)
        this.chordProg = [
            [146.83, 220.00, 293.66, 349.23], // Dm
            [116.54, 174.61, 233.08, 293.66], // Bb Maj7
            [130.81, 196.00, 261.63, 329.63], // C Maj
            [110.00, 164.81, 220.00, 277.18]  // A7
        ];

        // 질주감을 주는 옥타브 드라이빙 베이스라인
        this.bassLine = [
            // Dm
            73.42, 146.83, 73.42, 146.83,  73.42, 146.83, 87.31, 98.00,
            73.42, 146.83, 73.42, 146.83,  65.41, 73.42, 82.41, 87.31,
            // Bb
            58.27, 116.54, 58.27, 116.54,  58.27, 116.54, 65.41, 73.42,
            58.27, 116.54, 58.27, 116.54,  65.41, 130.81, 58.27, 116.54,
            // C
            65.41, 130.81, 65.41, 130.81,  65.41, 130.81, 73.42, 87.31,
            65.41, 130.81, 65.41, 130.81,  73.42, 87.31, 65.41, 58.27,
            // A7
            55.00, 110.00, 55.00, 110.00,  55.00, 110.00, 69.30, 82.41,
            55.00, 110.00, 69.30, 82.41,   73.42, 146.83, 73.42, 73.42
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

        const tick = () => {
            if (!this.bgmPlaying) return;
            if (!this.muted && this.ctx) {
                if (this.ctx.state === 'suspended') this.ctx.resume();

                const s = this.step % 64;
                const pitchShift = this.currentStage === 5 ? (Math.random() < 0.2 ? 1.04 : 1.0) : 1.0;

                // 1. 묵직한 오케스트라/신스 코드 패드 (16스텝마다 풍성한 화음)
                if (s % 16 === 0) {
                    const chord = this.chordProg[Math.floor(s / 16) % 4];
                    chord.forEach(freq => {
                        this.playPadNote(freq * pitchShift, 1.4, 0.032);
                    });
                }

                // 2. 강렬하고 진지한 듀얼 리드 신스 (Sawtooth + Triangle 디튠)
                const mFreq = this.leadNotes[s] * pitchShift;
                if (mFreq > 0) {
                    this.playLeadSynth(mFreq, 0.22, 0.075);
                }

                // 3. 드라이빙 옥타브 베이스 (묵직한 저음 그루브)
                const bFreq = this.bassLine[s];
                if (bFreq > 0) {
                    this.playBassNote(bFreq, 0.13, 0.11);
                }

                // 4. 록/일렉트로닉 드럼 비트 (킥 + 스네어 + 16비트 하이햇)
                if (s % 4 === 0) {
                    // 묵직한 킥 드럼
                    this.playKickDrum();
                } else if (s % 4 === 2) {
                    // 파워 스네어 드럼
                    this.playSnareDrum();
                }
                if (s % 8 === 7) {
                    this.playKickDrum(0.08);
                }
                // 16분음표 질주 하이햇
                this.playHiHat(s % 2 === 0 ? 0.03 : 0.05, s % 2 === 0 ? 0.018 : 0.032);

                // 5단계 글리치 보이드일 때 주기적으로 치지직 노이즈 사운드 발생!
                if (this.currentStage === 5 && s % 8 === 4) {
                    this.playGlitchStatic(0.14, 0.065);
                }

                this.step++;
            }

            // 단계가 올라갈수록 BGM 템포도 함께 빨라져 긴장감 극대화!
            const stageInterval = Math.max(82, 118 - (this.currentStage - 1) * 8);
            this.bgmTimer = setTimeout(tick, stageInterval);
        };

        tick();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (!this.muted && !this.bgmPlaying) this.startBGM();
        return this.muted;
    }

    playLeadSynth(freq, duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 1.004, now); // 살짝 디튠하여 풍성한 사운드

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(650, now + duration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    playPadNote(freq, duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playBassNote(freq, duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    playKickDrum(vol = 0.16) {
        if (this.muted || !this.ctx) return;
        this.playTone(135, 'sine', 0.11, vol, 36);
    }

    playSnareDrum() {
        if (this.muted || !this.ctx) return;
        this.playTone(210, 'triangle', 0.08, 0.09, 110);
        this.playGlitchStatic(0.07, 0.045);
    }

    playHiHat(duration, vol) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(4800 + Math.random() * 1400, now);
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

    // 🌟 특별 아이템(방패, 슈퍼점프, 손오공 진화) 획득 시 웅장하고 멋있는 시네마틱 사운드!
    playSpecialItem() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        // 1) 묵직한 서브베이스 임팩트 + 상승 스위프(Whoosh)
        this.playTone(85, 'sawtooth', 0.45, 0.22, 340);
        this.playTone(110, 'sine', 0.50, 0.24, 55);

        // 2) 영웅적인 브라스/신스 파워 코드 아르페지오
        const epicNotes = [293.66, 440.00, 587.33, 740.00, 880.00, 1174.66, 1480.00];
        epicNotes.forEach((f, idx) => {
            setTimeout(() => {
                this.playLeadSynth(f, 0.38, 0.14);
                this.playTone(f * 1.5, 'sine', 0.30, 0.10, f * 1.52);
            }, idx * 45);
        });
    }

    // 🏍️ 지코 새삥 오토바이 시동 부릉부릉 사운드!
    playMotorcycleRev() {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(115, now + 0.35);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    // 👑 손오공 진화 전용 각성 사운드 (번개 + 금빛 여의봉 공명음!)
    playWukongEvolution() {
        if (this.muted) return;
        this.init();
        this.playSpecialItem();
        setTimeout(() => {
            [587.33, 880.0, 1174.66, 1760.0].forEach(f => {
                this.playTone(f, 'triangle', 0.55, 0.16, f * 1.02);
            });
        }, 260);
    }

    // 🪨 1단계(숲): 움직이는 돌이 굴러올 때 나는 묵직한 바위 마찰음 (우르르르 쿵!)
    playRollingStone() {
        if (this.muted) return;
        this.init();
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playTone(92 - i * 9, 'sawtooth', 0.17, 0.17, 46);
                this.playTone(64, 'triangle', 0.19, 0.22, 38);
            }, i * 85);
        }
    }

    // 🦂 2단계(사막): 거대 전갈 집게발 달그락 & 위협 소리
    playScorpionSound() {
        if (this.muted) return;
        this.init();
        [680, 920, 540, 880].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'square', 0.07, 0.11, f * 0.6), i * 55);
        });
    }

    // 🦈 3단계(해저): 상어가 물살을 가르며 돌진하는 위협음
    playSharkSound() {
        if (this.muted) return;
        this.init();
        this.playTone(130, 'sawtooth', 0.28, 0.18, 95);
        setTimeout(() => this.playTone(145, 'sawtooth', 0.28, 0.20, 85), 160);
    }

    // 🚕 4단계(도시): 달려오는 자동차 클락션(경적 빵빵!) 소리
    playCarHorn() {
        if (this.muted) return;
        this.init();
        [0, 140].forEach(delay => {
            setTimeout(() => {
                this.playTone(440, 'sawtooth', 0.11, 0.14);
                this.playTone(554.37, 'sawtooth', 0.11, 0.14);
            }, delay);
        });
    }

    // ⚡ 5단계 글리치 보이드 '치지직~' 노이즈 사운드
    playGlitchStatic(duration = 0.18, vol = 0.09) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
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

    playJump(isSuper = false) {
        if (isSuper) {
            this.playTone(280, 'triangle', 0.34, 0.20, 980);
            this.playTone(420, 'sine', 0.34, 0.15, 1320);
        } else {
            this.playTone(300, 'sine', 0.22, 0.16, 660);
        }
    }
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
    playHit() {
        this.playTone(150, 'sawtooth', 0.38, 0.28, 38);
        this.playGlitchStatic(0.15, 0.14);
    }
    playRoar() { this.playTone(135, 'sawtooth', 0.65, 0.24, 42); }

    // 🔫 레이저총 아이템 획득 및 발동 사운드
    playLaserGun() {
        if (this.muted) return;
        this.init();
        [440, 660, 880, 1320, 1760].forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'sawtooth', 0.14, 0.18, f * 1.25);
                this.playTone(f * 0.5, 'triangle', 0.14, 0.14);
            }, idx * 45);
        });
    }

    // ⚡ 레이저 빔이 레인의 기물을 파괴할 때 사운드
    playLaserZap() {
        if (this.muted) return;
        this.init();
        this.playTone(1480, 'sawtooth', 0.16, 0.20, 220);
        this.playTone(980, 'square', 0.14, 0.14, 140);
    }

    // 🎰 등수 셔플 룰렛 회전 효과음 (빠른 기계식 딸깍음)
    playShuffleTick() {
        if (this.muted) return;
        this.init();
        this.playTone(1100 + Math.random() * 350, 'square', 0.025, 0.05, 550);
    }

    // 🎺 최종 등수 확정 팡파르 & 축하 환호 사운드
    playFanfareCheer() {
        if (this.muted) return;
        this.init();
        const fanfareNotes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        fanfareNotes.forEach((f, idx) => {
            setTimeout(() => {
                this.playTone(f, 'sawtooth', 0.32, 0.18);
                this.playTone(f * 0.5, 'triangle', 0.32, 0.15);
            }, idx * 65);
        });
        setTimeout(() => {
            // 화려한 피날레 오케스트라 브라스 코드
            [523.25, 659.25, 783.99, 1046.50].forEach(f => {
                this.playTone(f, 'sawtooth', 0.75, 0.16);
            });
            this.playKickDrum(0.25);
        }, 360);
    }

    // 🎉 초신나는 엔딩 댄스 파티 BGM (132 BPM 신스웨이브 & 디스코 펑크 댄스 뮤직)
    startDancePartyBGM() {
        this.stopBGM();
        this.stopDancePartyBGM();
        this.init();
        this.danceBgmPlaying = true;
        this.danceStep = 0;

        // 신나는 댄스 리드 멜로디 (32스텝, C Major & A Minor 축제 테마)
        const danceLead = [
            // Bar 1: 신나는 펑키 멜로디
            523.25, 523.25, 659.25, 0,      783.99, 0, 880.00, 783.99,
            659.25, 0, 587.33, 523.25,      587.33, 0, 659.25, 0,
            // Bar 2: 에너제틱 클라이맥스
            783.99, 880.00, 1046.50, 0,     880.00, 0, 783.99, 0,
            659.25, 783.99, 659.25, 587.33, 523.25, 0, 0, 0
        ];

        // 춤추게 만드는 펑키 슬랩 베이스라인 (32스텝)
        const danceBass = [
            130.81, 261.63, 130.81, 196.00,  146.83, 293.66, 146.83, 220.00,
            164.81, 329.63, 164.81, 246.94,  174.61, 349.23, 196.00, 261.63,
            130.81, 261.63, 130.81, 196.00,  146.83, 293.66, 146.83, 220.00,
            164.81, 329.63, 174.61, 349.23,  196.00, 392.00, 130.81, 261.63
        ];

        // 경쾌한 브라스 신스 코드 (8스텝마다 전환)
        const danceChords = [
            [261.63, 329.63, 392.00, 523.25], // C Maj
            [293.66, 349.23, 440.00, 587.33], // Dm
            [329.63, 392.00, 493.88, 659.25], // Em
            [349.23, 440.00, 523.25, 698.46]  // F Maj
        ];

        const tick = () => {
            if (!this.danceBgmPlaying) return;
            if (!this.muted && this.ctx) {
                if (this.ctx.state === 'suspended') this.ctx.resume();

                const s = this.danceStep % 32;

                // 1. 4온더플로어 묵직한 디스코 킥 (매 4분음표)
                if (s % 4 === 0) {
                    this.playKickDrum(0.20);
                }

                // 2. 파워풀한 백비트 스네어/클랩 (2, 4박)
                if (s % 4 === 2) {
                    this.playSnareDrum(0.16);
                }

                // 3. 댄스 그루브 오프비트 오픈 하이햇
                if (s % 4 === 2 || s % 8 === 6) {
                    this.playHiHat(0.08, 0.05);
                } else {
                    this.playHiHat(0.03, 0.02);
                }

                // 4. 통통 튀는 슬랩 베이스
                const bNote = danceBass[s];
                if (bNote > 0) {
                    this.playBassNote(bNote, 0.11, 0.14);
                }

                // 5. 브라스 신스 화음 (경쾌한 엇박 스타카토)
                if (s % 4 === 1 || s % 4 === 3) {
                    const chord = danceChords[Math.floor(s / 8) % 4];
                    chord.forEach(freq => {
                        this.playTone(freq, 'sawtooth', 0.08, 0.038);
                    });
                }

                // 6. 초신나는 메인 댄스 리드 멜로디
                const mNote = danceLead[s];
                if (mNote > 0) {
                    this.playLeadSynth(mNote, 0.16, 0.09);
                    this.playTone(mNote * 0.5, 'triangle', 0.16, 0.06);
                }

                this.danceStep++;
            }

            // 132 BPM: 약 113.6ms 간격의 초고속 신나는 파티 비트
            this.danceBgmTimer = setTimeout(tick, 114);
        };

        tick();
    }

    stopDancePartyBGM() {
        this.danceBgmPlaying = false;
        if (this.danceBgmTimer) {
            clearTimeout(this.danceBgmTimer);
            this.danceBgmTimer = null;
        }
    }

    // =========================================================================
    // 🐱🎵 전 세계를 휩쓴 OIIA OIIA 올라 캣 (Spinning Cat) 밈 전용 신스 BGM (135 BPM)
    // =========================================================================
    playOiiaOiiaMemeBGM(onBeat) {
        this.stopBGM();
        this.stopDancePartyBGM();
        this.stopOiiaOiiaMemeBGM();
        this.init();
        this.oiiaBgmPlaying = true;
        this.oiiaStep = 0;

        // "Oi-ia Oi-ia Oi-ia Oi-ia O-i-i-a-o-i-i-i-a-i!"
        // 멜로디 시퀀스 (32스텝 루프, 16분음표 단위)
        const oiiaMelody = [
            // Bar 1: Oi-ia (E5, G5), Oi-ia (E5, G5), Oi-ia (E5, A5), O-i-i-a (G5, E5, D5, E5)
            659.25, 783.99, 0, 659.25, 783.99, 0, 659.25, 880.00,
            783.99, 659.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25,
            // Bar 2: Oi-ia (E5, G5), Oi-ia (E5, G5), Oi-ia (A5, B5), O-i-i-a-i (A5, G5, E5, D5, E5, G5, E5)
            659.25, 783.99, 0, 659.25, 783.99, 0, 880.00, 987.77,
            880.00, 783.99, 659.25, 587.33, 659.25, 783.99, 659.25, 0
        ];

        // 베이스라인 (통통 튀는 옥타브 유로댄스 베이스)
        const oiiaBass = [
            110, 220, 110, 220, 110, 220, 110, 220,
            130.81, 261.63, 130.81, 261.63, 98, 196, 98, 196,
            110, 220, 110, 220, 110, 220, 110, 220,
            130.81, 261.63, 130.81, 261.63, 123.47, 246.94, 98, 196
        ];

        const tick = () => {
            if (!this.oiiaBgmPlaying) return;
            if (!this.muted && this.ctx) {
                if (this.ctx.state === 'suspended') this.ctx.resume();

                const s = this.oiiaStep % 32;

                // 1. 4온더플로어 댄스 킥
                if (s % 4 === 0) {
                    this.playKickDrum(0.22);
                    if (typeof onBeat === 'function') onBeat(s);
                }

                // 2. 스네어 & 클랩 (2, 4박)
                if (s % 4 === 2) {
                    this.playSnareDrum(0.18);
                }

                // 3. 디스코 오프비트 오픈 하이햇 (16분음표 엇박)
                if (s % 2 === 1) {
                    this.playHiHat(0.06, 0.04);
                }

                // 4. 통통 튀는 베이스
                const bNote = oiiaBass[s];
                if (bNote > 0) {
                    this.playBassNote(bNote, 0.09, 0.15);
                }

                // 5. 시그니처 OIIA OIIA 보컬로이드 신스 리드!
                const mNote = oiiaMelody[s];
                if (mNote > 0) {
                    this.playOiiaLead(mNote, 0.14, 0.13);
                }

                this.oiiaStep++;
            }

            // 135 BPM: 약 111ms 간격의 초고속 댄스 비트
            this.oiiaBgmTimer = setTimeout(tick, 111);
        };

        tick();
    }

    // 🤖 올라 캣 특유의 콧소리 섞인 포먼트 보컬로이드 신스
    playOiiaLead(freq, duration, volume = 0.12) {
        if (!this.ctx || this.muted) return;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(freq * 1.006, this.ctx.currentTime); // 코러스 디튠

        // 포먼트 대역 강조 (인간 목소리 포먼트 필터링)
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
        filter.Q.setValueAtTime(4.5, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    stopOiiaOiiaMemeBGM() {
        this.oiiaBgmPlaying = false;
        if (this.oiiaBgmTimer) {
            clearTimeout(this.oiiaBgmTimer);
            this.oiiaBgmTimer = null;
        }
    }
}
