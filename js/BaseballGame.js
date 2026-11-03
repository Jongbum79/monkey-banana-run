/**
 * Smile Games - 2인용 스마일 프로야구 3D (Smile Pro Baseball 3D: 2-Player Duel)
 * 
 * 주요 특징:
 * 1. ⚾ 투수 뒤 시점 (Behind-the-Pitcher View): 일반 프로야구 중계/콘솔 게임 스타일의 실감나는 3D 시점
 * 2. 👥 2인용 실시간 대전 (1P vs 2P) & 🤖 1인용 (vs AI 컴퓨터) 완벽 지원
 * 3. 🐾 4종 캐릭터별 고유 투구폼 & 타격폼 & 스탯:
 *    - 🐯 호걸이: 오버핸드 (Overhand) | 초강속구 (155~162km/h), 단 조준 편차 커서 공이 몰림 | 거포 어퍼스윙
 *    - 🐸 개구리: 쓰리쿼터 (Three-Quarter) | 변화구 낙폭 극대화, 구속은 130km/h대 | 컴팩트 컨택트 레벨스윙
 *    - 🐧 펭귄: 사이드암 (Sidearm) | 횡으로 대폭 꺾이는 마구 슬라이더, 구속 138~144km/h | 다운블로 오픈스탠스
 *    - 🐵 원숭이: 밸런스 정통파 | 제구력, 구속(144km/h), 변화구 모두 완벽한 올라운더 | 스탠다드 스퀘어스윙
 * 4. 🌀 5대 구종 (모든 캐릭터 투구 가능):
 *    - [1] 직구 (Fastball) / [2] 커브 (Curve) / [3] 슬라이더 (Slider) / [4] 체인지업 (Changeup) / [5] 🔥 황금 불꽃볼 (Fireball)
 * 5. 👔 캐릭터별 3종 야구 유니폼 스킨 시스템 (총 12개 스킨)
 * 6. 🏟️ 3아웃 공수교대 정식 경기 시스템 (1회초 1P투수 vs 2P타자 ➔ 1회말 2P투수 vs 1P타자 ➔ 승자 시상식)
 * 7. 3D 스트라이크존 투영 & 볼/스트라이크/아웃(B-S-O) 전광판 카운트
 */

class BaseballGame {
    constructor(soundManager) {
        this.sound = soundManager;
        this.audioCtx = null;
        this.canvas = null;
        this.ctx = null;
        this.containerEl = null;
        this.isRunning = false;
        this.animFrameId = null;

        // 화면 크기 & 레티나
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2);

        // 👥 게임 모드: '2p' (2인용 대전) 또는 '1p' (vs AI 컴퓨터)
        this.gameMode = localStorage.getItem('smilegames_baseball_mode') || '2p';

        // 🐾 4종 캐릭터 스펙 & 투구폼/타격폼 정보
        this.characters = {
            tiger: {
                id: 'tiger',
                name: '호걸이',
                role: 'KIA 출신 4번 거포 & 파이어볼러',
                emoji: '🐯',
                pitchStyle: 'overhand',
                pitchStyleName: '오버핸드 (강속구 특화)',
                batStyleName: '풀히터 거포 어퍼스윙',
                fastballSpeed: 158, // 초강속구
                controlSpread: 26,  // 공이 몰리거나 빠질 확률 높음
                curveBonus: 1.0,
                sliderBonus: 1.0,
                power: 99,
                contact: 84,
                skins: {
                    classic: { id: 'classic', name: '타이거즈 홈 화이트', jersey: '#ea580c', cap: '#1e293b', stripe: '#f8fafc', icon: '🐅' },
                    away: { id: 'away', name: '타이거즈 원정 레드', jersey: '#dc2626', cap: '#0f172a', stripe: '#fca5a5', icon: '🔴' },
                    gold: { id: 'gold', name: '골든 챔피언 유니폼', jersey: '#ca8a04', cap: '#1c1917', stripe: '#fef08a', icon: '👑' }
                }
            },
            frog: {
                id: 'frog',
                name: '개구리',
                role: '정밀 제구사 & 안타 제조기',
                emoji: '🐸',
                pitchStyle: 'threequarter',
                pitchStyleName: '쓰리쿼터 (변화구 특화)',
                batStyleName: '컴팩트 컨택 레벨스윙',
                fastballSpeed: 133, // 구속은 느림
                controlSpread: 8,   // 칼제구
                curveBonus: 1.85,   // 커브 낙폭 1.85배!
                sliderBonus: 1.2,
                power: 76,
                contact: 99,
                skins: {
                    classic: { id: 'classic', name: '에메랄드 핀스트라이프', jersey: '#16a34a', cap: '#14532d', stripe: '#bbf7d0', icon: '🟢' },
                    cyber: { id: 'cyber', name: '네온 사이버 유니폼', jersey: '#06b6d4', cap: '#0e7490', stripe: '#a5f3fc', icon: '⚡' },
                    retro: { id: 'retro', name: '포레스트 올드스쿨', jersey: '#15803d', cap: '#052e16', stripe: '#fef08a', icon: '🌲' }
                }
            },
            penguin: {
                id: 'penguin',
                name: '펭귄',
                role: '마구 사이드암 & 클러치 마스터',
                emoji: '🐧',
                pitchStyle: 'sidearm',
                pitchStyleName: '사이드암 (슬라이더 특화)',
                batStyleName: '다운블로 오픈스탠스',
                fastballSpeed: 140,
                controlSpread: 12,
                curveBonus: 1.1,
                sliderBonus: 2.1,   // 슬라이더 횡변화 2.1배!
                power: 90,
                contact: 89,
                skins: {
                    classic: { id: 'classic', name: '호스 딥 네이비', jersey: '#1e3a8a', cap: '#0f172a', stripe: '#60a5fa', icon: '🔵' },
                    frost: { id: 'frost', name: '프로스트 실버 아이스', jersey: '#475569', cap: '#1e293b', stripe: '#e2e8f0', icon: '❄️' },
                    marine: { id: 'marine', name: '마린 로열 블루', jersey: '#2563eb', cap: '#1e1b4b', stripe: '#facc15', icon: '⚓' }
                }
            },
            monkey: {
                id: 'monkey',
                name: '원숭이',
                role: '올라운드 에이스 & 타격왕',
                emoji: '🐵',
                pitchStyle: 'windup',
                pitchStyleName: '클래식 윈드업 (완전 육각형)',
                batStyleName: '스탠다드 스퀘어스윙',
                fastballSpeed: 145, // 균형
                controlSpread: 14,  // 안정적
                curveBonus: 1.25,
                sliderBonus: 1.25,
                power: 88,
                contact: 93,
                skins: {
                    classic: { id: 'classic', name: '골든 바나나 스트라이프', jersey: '#facc15', cap: '#854d0e', stripe: '#1a1612', icon: '🍌' },
                    stealth: { id: 'stealth', name: '블랙 옵스 스텔스', jersey: '#1e293b', cap: '#020617', stripe: '#ea580c', icon: '⚫' },
                    vintage: { id: 'vintage', name: '1982 레트로 빈티지', jersey: '#f1f5f9', cap: '#b91c1c', stripe: '#dc2626', icon: '🧢' }
                }
            }
        };

        // 1P & 2P 팀 선택
        this.p1 = {
            name: '1P 플레이어',
            char: localStorage.getItem('smilegames_bb_p1_char') || 'tiger',
            skin: localStorage.getItem('smilegames_bb_p1_skin') || 'classic',
            score: 0,
            hits: 0,
            homeRuns: 0
        };

        this.p2 = {
            name: '2P 플레이어',
            char: localStorage.getItem('smilegames_bb_p2_char') || 'monkey',
            skin: localStorage.getItem('smilegames_bb_p2_skin') || 'classic',
            score: 0,
            hits: 0,
            homeRuns: 0
        };

        // ⚾ 경기 진행 상태 (1이닝 공수교대)
        // inningHalf: 'top' (1회초: 1P투수 vs 2P타자) | 'bottom' (1회말: 2P투수 vs 1P타자)
        this.inningHalf = 'top';
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.maxDistance = 0;

        // 투수 조준 & 구종
        this.selectedPitchType = 'fastball'; // 'fastball' | 'curve' | 'slider' | 'changeup' | 'fireball'
        // 투구 목표 위치 (스트라이크존 기준 -30 ~ +30)
        this.pitchAimX = 0;
        this.pitchAimY = 44;

        // 3D 투수 뒤 시점 카메라 (투수 마운드와 타석, 스트라이크존이 모두 완벽하게 보이는 정통 야구 중계 뷰)
        this.camera = {
            x: 0,
            y: 76,   // 높이
            z: -70,  // 거리
            targetX: 0,
            targetY: 76,
            targetZ: -70,
            fov: 360,
            shake: 0
        };

        // 투수 모델 (마운드 x=-52, y=14, z=80, 홈플레이트 z=380을 마주봄)
        this.pitcher = {
            x: -52,
            y: 14,
            z: 80,
            phase: 'ready', // 'ready' | 'windup' | 'release' | 'follow'
            phaseTimer: 0,
            animTimer: 0,
            armAngle: 0,
            legLift: 0
        };

        // 타자 모델 (홈플레이트 z=380 옆 우타자석 x=65에서 투수를 정면으로 마주봄)
        this.batter = {
            x: 65, // 우타자 타석 (투수 시점 기준 우측)
            y: 0,
            z: 380,
            isSwinging: false,
            swingTime: 0,
            swingDuration: 0.22,
            swingAngle: 0,
            idleTimer: 0
        };

        // 포수 (Catcher) & 심판 (Umpire)
        this.catcher = { x: 0, y: 0, z: 415 };
        this.umpire = { x: 0, y: 10, z: 445 };

        // 날아가는 야구공
        this.ball = {
            active: false,
            x: -38,
            y: 46,
            z: 85, // 투수 손에서 릴리즈
            vx: 0,
            vy: 0,
            vz: 0,
            radius: 8.5,
            rot: 0,
            type: 'fastball',
            speedKmh: 148,
            isHit: false,
            hitType: null, // 'homerun' | 'hit' | 'foul' | 'ground' | 'strike'
            flightTimer: 0,
            hitDist: 0
        };

        // 게임 상태 머신:
        // 'aiming' -> 'windup' -> 'in_flight' -> 'hit_flight' (or 'catcher_catch') -> 'result_pause' -> 'next' -> 'game_over'
        this.gameState = 'aiming';
        this.stateTimer = 0;

        // 이펙트 & 파티클
        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerSub = '';
        this.bannerColor = '#facc15';
        this.bannerAlpha = 0;

        this.STORAGE_KEY = 'smilegames_baseball_2p_ranks';
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.containerEl = document.getElementById('baseball-game-container');
        if (!this.containerEl) return;

        this.canvas = document.getElementById('baseball-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.bindEvents();
        this.updateHUD();
        this.isInitialized = true;
        this.render(); // 초기 캔버스 즉시 렌더링 (대기 화면에서도 투수 & 타자 시각화)
    }

    resize() {
        if (!this.canvas || !this.containerEl) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    ensureAudio() {
        try {
            if (this.sound) {
                this.sound.init();
                if (this.sound.ctx && this.sound.ctx.state === 'suspended') {
                    this.sound.ctx.resume();
                }
            }
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.audioCtx = (this.sound && this.sound.ctx) ? this.sound.ctx : new AudioCtx();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {}
    }

    getAudioCtx() {
        this.ensureAudio();
        return (this.sound && this.sound.ctx) || this.audioCtx || null;
    }

    bindEvents() {
        window.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });

        // ⌨️ 키보드 2인용 조작 매핑:
        // 1P (투수): WASD(코스 조준) + 1~5(구종 선택) + F 키 또는 Space(투구)
        // 2P (타자): 방향키 ↑/↓/←/→(스윙 조준) + Enter 또는 L 키(타격 스윙)
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            this.ensureAudio();

            // --- 1P 투수 조작 ---
            if (this.gameState === 'aiming') {
                if (e.key === '1') this.selectPitchType('fastball');
                if (e.key === '2') this.selectPitchType('curve');
                if (e.key === '3') this.selectPitchType('slider');
                if (e.key === '4') this.selectPitchType('changeup');
                if (e.key === '5') this.selectPitchType('fireball');

                // WASD 코스 조준
                if (e.key === 'a' || e.key === 'A') this.pitchAimX = Math.max(-28, this.pitchAimX - 7);
                if (e.key === 'd' || e.key === 'D') this.pitchAimX = Math.min(28, this.pitchAimX + 7);
                if (e.key === 'w' || e.key === 'W') this.pitchAimY = Math.min(68, this.pitchAimY + 7);
                if (e.key === 's' || e.key === 'S') this.pitchAimY = Math.max(20, this.pitchAimY - 7);

                // 투구 발사 (F 키 또는 1인용일 때 Space)
                if (e.code === 'KeyF' || (this.gameMode === '1p' && e.code === 'Space')) {
                    e.preventDefault();
                    this.startPitchWindup();
                }
            }

            // --- 2P 타자 조작 (타격 스윙) ---
            if (e.code === 'Enter' || e.code === 'KeyL' || (this.gameMode === '2p' && e.code === 'Space')) {
                e.preventDefault();
                this.triggerBatterSwing();
            }
        });

        // 캔버스 클릭 시: 상황에 따라 투구 또는 스윙
        if (this.canvas) {
            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                this.ensureAudio();
                if (this.gameState === 'aiming') {
                    this.startPitchWindup();
                } else if (this.gameState === 'in_flight') {
                    this.triggerBatterSwing();
                }
            });
        }

        // 모바일/태블릿 대형 스윙 버튼
        const swingBtn = document.getElementById('btn-baseball-swing');
        if (swingBtn) {
            swingBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                this.ensureAudio();
                this.triggerBatterSwing();
            });
        }

        // 2P / 1P 모드 전환 버튼
        const modeToggleBtn = document.getElementById('btn-baseball-mode-toggle');
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.toggleGameMode();
            });
        }

        // 구종 선택 버튼 바인딩 (1~5)
        const pitchBtns = document.querySelectorAll('.pitch-select-btn');
        pitchBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pType = btn.getAttribute('data-pitch');
                if (pType) {
                    this.selectPitchType(pType);
                    this.ensureAudio();
                }
            });
        });

        // 투구 던지기 전용 버튼 (모바일/마우스용)
        const pitchThrowBtn = document.getElementById('btn-pitch-throw');
        if (pitchThrowBtn) {
            pitchThrowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ensureAudio();
                if (this.gameState === 'aiming') this.startPitchWindup();
            });
        }

        // 캐릭터 & 스킨 설정 버튼
        const charModalBtn = document.getElementById('btn-baseball-batter');
        if (charModalBtn) {
            charModalBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.showCharModal();
            });
        }

        // 다시 시작 버튼
        const restartBtn = document.getElementById('btn-baseball-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.start();
            });
        }

        // 허브 복귀 버튼
        const hubBtn = document.getElementById('btn-baseball-hub');
        if (hubBtn) hubBtn.addEventListener('click', () => this.openHubModal());

        // 게임오버 모달 버튼들
        const goRestartBtn = document.getElementById('btn-baseball-go-restart');
        if (goRestartBtn) {
            goRestartBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                this.start();
            });
        }

        const goHubBtn = document.getElementById('btn-baseball-go-hub');
        if (goHubBtn) {
            goHubBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                this.openHubModal();
            });
        }

        const goBananaBtn = document.getElementById('btn-baseball-go-banana');
        if (goBananaBtn) {
            goBananaBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                if (window.switchToBananaGame) window.switchToBananaGame();
            });
        }

        const goSpaceBtn = document.getElementById('btn-baseball-go-space');
        if (goSpaceBtn) {
            goSpaceBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                if (window.switchToSpaceGame) window.switchToSpaceGame();
            });
        }

        // 캐릭터 선택 모달 내 1P / 2P 탭 및 선택 버튼
        this.bindCharModalEvents();
    }

    start(p1Name = null, p2Name = null) {
        this.init();
        this.resize();
        this.ensureAudio();

        if (p1Name) this.p1.name = p1Name;
        if (p2Name) this.p2.name = p2Name;

        // 점수 및 카운트 초기화 (3아웃 공수교대)
        this.p1.score = 0;
        this.p1.hits = 0;
        this.p1.homeRuns = 0;

        this.p2.score = 0;
        this.p2.hits = 0;
        this.p2.homeRuns = 0;

        this.inningHalf = 'top'; // 1회초 (1P 투수 vs 2P 타자)
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.maxDistance = 0;

        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerAlpha = 0;

        this.resetCamera();
        this.hideGameOverModal();
        this.hideCharModal();
        this.updateHUD();

        this.isRunning = true;
        this.prepareNextPitch(1.0);

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        let lastTime = performance.now();

        const loop = (now) => {
            if (!this.isRunning) return;
            const dt = Math.min((now - lastTime) / 1000, 0.08);
            lastTime = now;

            this.update(dt);
            this.render();

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);

        this.showResultBanner(
            '⚾ 1회초 경기 시작! ⚾',
            `수비(투수): 1P ${this.getCurrentPitcher().name} | 공격(타자): 2P ${this.getCurrentBatter().name}`,
            '#38bdf8'
        );
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    toggleGameMode() {
        this.gameMode = (this.gameMode === '2p') ? '1p' : '2p';
        localStorage.setItem('smilegames_baseball_mode', this.gameMode);
        this.updateHUD();
        this.showResultBanner(
            (this.gameMode === '2p') ? '👥 2인용 대전 모드 ON' : '🤖 1인용 (vs AI 컴퓨터) ON',
            (this.gameMode === '2p') ? '1P 투수 [WASD+F] vs 2P 타자 [Enter/Space]' : '컴퓨터가 자동으로 대결합니다!',
            '#facc15'
        );
    }

    /**
     * 현재 수비 중인 투수 캐릭터 정보 반환
     */
    getCurrentPitcher() {
        // 1회초: 1P가 투수 / 1회말: 2P가 투수
        const pKey = (this.inningHalf === 'top') ? this.p1.char : this.p2.char;
        return this.characters[pKey] || this.characters.tiger;
    }

    /**
     * 현재 공격 중인 타자 캐릭터 정보 반환
     */
    getCurrentBatter() {
        // 1회초: 2P가 타자 / 1회말: 1P가 타자
        const bKey = (this.inningHalf === 'top') ? this.p2.char : this.p1.char;
        return this.characters[bKey] || this.characters.monkey;
    }

    getCurrentPitcherSkin() {
        const pData = this.getCurrentPitcher();
        const skinKey = (this.inningHalf === 'top') ? this.p1.skin : this.p2.skin;
        return pData.skins[skinKey] || pData.skins.classic;
    }

    getCurrentBatterSkin() {
        const bData = this.getCurrentBatter();
        const skinKey = (this.inningHalf === 'top') ? this.p2.skin : this.p1.skin;
        return bData.skins[skinKey] || bData.skins.classic;
    }

    selectPitchType(type) {
        this.selectedPitchType = type;
        this.updateHUD();
        this.playUmpireWhistle(800, 0.08); // 가벼운 선택 클릭 비프음
    }

    resetCamera() {
        this.camera.x = 0;
        this.camera.y = 76;
        this.camera.z = -70;
        this.camera.targetX = 0;
        this.camera.targetY = 76;
        this.camera.targetZ = -70;
        this.camera.shake = 0;
    }

    prepareNextPitch(delay = 1.0) {
        this.gameState = 'aiming';
        this.stateTimer = delay;
        this.ball.active = false;
        this.ball.isHit = false;
        this.pitcher.phase = 'ready';
        this.pitcher.phaseTimer = 0;
        this.resetCamera();

        // 1인용 AI 모드일 때: 컴퓨터가 투수면 자동으로 구종 및 코스를 정하고 투구!
        if (this.gameMode === '1p' && this.inningHalf === 'bottom') {
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'aiming') {
                    const types = ['fastball', 'curve', 'slider', 'changeup', 'fireball'];
                    this.selectedPitchType = types[Math.floor(Math.random() * types.length)];
                    this.pitchAimX = (Math.random() - 0.5) * 40;
                    this.pitchAimY = 30 + Math.random() * 30;
                    this.startPitchWindup();
                }
            }, 800);
        }
    }

    /**
     * 투구 와인드업 시작
     */
    startPitchWindup() {
        if (this.gameState !== 'aiming') return;

        this.gameState = 'windup';
        this.pitcher.phase = 'windup';
        this.pitcher.phaseTimer = 0;
        this.playPitchWindupSound();
    }

    /**
     * 와인드업 완료 후 손에서 공 릴리즈 (투수 뒤에서 홈플레이트를 향해 전방 투구!)
     */
    releasePitch() {
        const pitcherChar = this.getCurrentPitcher();
        const pType = this.selectedPitchType;

        // 구종별 기준 속도 계산
        let baseSpeed = pitcherChar.fastballSpeed;
        if (pType === 'curve') baseSpeed *= 0.86;
        if (pType === 'slider') baseSpeed *= 0.92;
        if (pType === 'changeup') baseSpeed *= 0.76;
        if (pType === 'fireball') baseSpeed = 162; // 초고속 불꽃볼

        // 구속 오차 (+- 3km/h)
        const finalSpeed = Math.round(baseSpeed + (Math.random() - 0.5) * 6);

        // 호랑이는 파워가 강한 대신 컨트롤 편차(조준 오차)가 큼!
        const spread = pitcherChar.controlSpread;
        const actualTargetX = this.pitchAimX + (Math.random() - 0.5) * spread;
        const actualTargetY = this.pitchAimY + (Math.random() - 0.5) * spread;

        // 홈플레이트(z=380)까지 도달 시간 계산
        // 150km/h = 약 0.52초
        const flightDuration = (150 / finalSpeed) * 0.52;
        const releaseX = -38;
        const releaseY = 46;
        const releaseZ = 85;
        const targetZ = 380;
        const vz = (targetZ - releaseZ) / flightDuration; // z=85에서 z=380까지 전방 투구!
        const vx = (actualTargetX - releaseX) / flightDuration;
        const vy = (actualTargetY - releaseY) / flightDuration;

        this.ball = {
            active: true,
            x: releaseX,
            y: releaseY,
            z: releaseZ,
            vx: vx,
            vy: vy,
            vz: vz,
            radius: 8.5,
            rot: 0,
            type: pType,
            speedKmh: finalSpeed,
            targetX: actualTargetX,
            targetY: actualTargetY,
            isHit: false,
            hitType: null,
            flightTimer: 0,
            hitDist: 0
        };

        this.pitcher.phase = 'release';
        this.gameState = 'in_flight';
        this.playPitchThrowSound(pType);

        // 1인용 AI 모드일 때: 컴퓨터가 타자면 자동으로 타이밍 맞춰 스윙!
        if (this.gameMode === '1p' && this.inningHalf === 'top') {
            const aiSwingDelay = flightDuration * (0.88 + (Math.random() - 0.5) * 0.22);
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'in_flight') {
                    this.triggerBatterSwing();
                }
            }, aiSwingDelay * 1000);
        }
    }

    /**
     * 타자 배트 스윙 트리거 (2P 타자 또는 1P 타자)
     */
    triggerBatterSwing() {
        if (this.batter.isSwinging) return;

        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // 날아오는 공 타격 판정
        if (this.gameState === 'in_flight' && this.ball.active && !this.ball.isHit) {
            this.checkBatContact();
        }
    }

    /**
     * 타격 순간 물리 판정
     */
    checkBatContact() {
        const b = this.ball;
        // 홈플레이트(z=380) 부근이 스위트 스팟 (z: 355 ~ 405)
        const z = b.z;
        const batterChar = this.getCurrentBatter();

        // 원숭이는 컨택 범위가 넓음 (+12)
        const contactRange = (batterChar.id === 'monkey') ? 36 : 26;
        const sweetSpotZ = 380;
        const diffZ = Math.abs(z - sweetSpotZ);

        if (diffZ <= contactRange) {
            // 배트 중심에 맞음!
            b.isHit = true;
            this.gameState = 'hit_flight';

            // 1. 💥 PERFECT CONTACT: 초대형 장외 홈런! (오차 10 이하)
            if (diffZ <= 10) {
                b.hitType = 'homerun';
                let dist = Math.round(126 + (batterChar.power - 75) * 0.9 + Math.random() * 20);
                if (b.type === 'fireball') dist += 20; // 불꽃볼 홈런 보너스
                if (batterChar.id === 'tiger') dist += 18; // 호걸이 슬러거 보너스

                b.hitDist = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                // 득점 계산
                const pts = (b.type === 'fireball') ? 4 : 2; // 홈런 점수
                if (this.inningHalf === 'top') {
                    this.p2.score += pts;
                    this.p2.homeRuns++;
                } else {
                    this.p1.score += pts;
                    this.p1.homeRuns++;
                }

                // 타구 물리: 카메라 뒤 외야/장외를 향해 고각도로 역발사!
                b.vz = -560 - Math.random() * 80; // 투수 뒤쪽으로 날아감
                b.vy = 320 + Math.random() * 60;  // 하늘 높이 발사각
                b.vx = (Math.random() - 0.5) * 140;

                this.camera.shake = 18;
                this.playBatHitSound('homerun');
                this.triggerHomeRunCelebration(dist, pts);
            }
            // 2. 🎯 GREAT CONTACT: 날카로운 라이너성 안타 / 2루타 (오차 11 ~ 22)
            else if (diffZ <= 22) {
                b.hitType = 'hit';
                const dist = Math.round(75 + Math.random() * 38);
                b.hitDist = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                const pts = (dist >= 95) ? 2 : 1;
                if (this.inningHalf === 'top') {
                    this.p2.score += pts;
                    this.p2.hits++;
                } else {
                    this.p1.score += pts;
                    this.p1.hits++;
                }

                // 타구 물리: 낮고 빠른 라인드라이브 안타
                b.vz = -400 - Math.random() * 70;
                b.vy = 120 + Math.random() * 40;
                b.vx = (Math.random() - 0.5) * 220;

                this.camera.shake = 9;
                this.playBatHitSound('hit');
                this.showResultBanner(
                    (dist >= 95) ? '🎯 2루타! 총알같은 라인드라이브!' : '⚾ 날카로운 1루타 안타 성공!',
                    `비거리 ${dist}m (+${pts}점)`,
                    '#38bdf8'
                );
            }
            // 3. ⚠️ EARLY / LATE: 파울 플라이
            else {
                b.hitType = 'foul';
                b.vz = -120;
                b.vy = 220;
                b.vx = (z > sweetSpotZ) ? -320 : 320; // 3루/1루 관중석 파울

                if (this.strikes < 2) this.strikes++;
                this.playBatHitSound('foul');
                this.showResultBanner('⚠️ 관중석 파울볼!', `2스트라이크 이전 파울 (+1 스트라이크)`, '#f59e0b');
            }

            this.createHitSparks(b.x, b.y, b.z);
            this.updateHUD();
        }
    }

    update(dt) {
        const pitcherChar = this.getCurrentPitcher();

        // 타자 스윙 애니메이션
        if (this.batter.isSwinging) {
            this.batter.swingTime += dt;
            const progress = Math.min(1, this.batter.swingTime / this.batter.swingDuration);
            // 180도 회전 배트 스윙 아크
            this.batter.swingAngle = -0.5 + progress * 3.1;
            if (progress >= 1) {
                this.batter.isSwinging = false;
                this.batter.swingAngle = 0;
            }
        } else {
            this.batter.idleTimer += dt * 4;
        }

        // 카메라 쉐이크 감쇠
        if (this.camera.shake > 0) {
            this.camera.shake -= dt * 32;
            if (this.camera.shake < 0) this.camera.shake = 0;
        }

        // 상태 머신 업데이트
        if (this.gameState === 'aiming') {
            // 투수 셋포지션 호흡 모션
            this.pitcher.phaseTimer += dt * 3;
        } else if (this.gameState === 'windup') {
            this.pitcher.phaseTimer += dt;
            // 0.72초 와인드업 후 전방 릴리즈
            if (this.pitcher.phaseTimer >= 0.72) {
                this.releasePitch();
            }
        } else if (this.gameState === 'in_flight') {
            const b = this.ball;
            b.flightTimer += dt;

            // 구종별 3D 비행 궤적 역학:
            if (b.type === 'curve') {
                // 개구리 특화 커브: 홈플레이트 앞에서 아래로 뚝 떨어지며 휨
                const cMult = pitcherChar.curveBonus || 1.0;
                b.vy -= 42 * cMult * dt;
                b.vx += Math.sin(b.flightTimer * 9) * 22 * cMult * dt;
            } else if (b.type === 'slider') {
                // 펭귄 특화 슬라이더: 횡으로 날카롭게 휘어짐
                const sMult = pitcherChar.sliderBonus || 1.0;
                b.vx -= 48 * sMult * dt;
                b.vy -= 14 * dt;
            } else if (b.type === 'changeup') {
                // 체인지업: 타자 앞에서 급격한 감속
                if (b.z > 200) b.vz *= 0.985;
            } else if (b.type === 'fireball') {
                // 황금 불꽃볼 파티클 방출
                this.createFireballTrail(b.x, b.y, b.z);
            }

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            b.rot += dt * 28;

            // 공이 홈플레이트(z=380)를 지나 포수 미트에 꽂힘 (미타격 시)
            if (b.z >= 405 && !b.isHit) {
                b.active = false;
                this.handlePitchMissResult(b.targetX, b.targetY);
            }
        } else if (this.gameState === 'hit_flight') {
            const b = this.ball;
            b.flightTimer += dt;

            // 타구 중력 및 공기 저항
            b.vy -= 160 * dt;
            b.vx *= 0.995;
            b.vz *= 0.995;

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;

            // 카메라가 날아가는 타구를 다이내믹하게 추적
            this.camera.targetX = b.x * 0.35;
            this.camera.targetY = 84 + Math.max(0, (b.y - 60) * 0.4);
            this.camera.x += (this.camera.targetX - this.camera.x) * 6 * dt;
            this.camera.y += (this.camera.targetY - this.camera.y) * 6 * dt;

            // 타구 착지 판정
            if (b.y <= 0 || b.z <= -350) {
                b.active = false;
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
            }
        } else if (this.gameState === 'result_pause') {
            this.stateTimer -= dt;
            this.camera.x += (0 - this.camera.x) * 4 * dt;
            this.camera.y += (84 - this.camera.y) * 4 * dt;
            this.camera.z += (-110 - this.camera.z) * 4 * dt;

            if (this.stateTimer <= 0) {
                this.prepareNextPitch(0.8);
            }
        }

        // 파티클 갱신
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 폭죽 갱신
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const f = this.fireworks[i];
            f.life -= dt;
            f.particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy -= 80 * dt;
            });
            if (f.life <= 0) this.fireworks.splice(i, 1);
        }

        // 배너 페이드
        if (this.bannerAlpha > 0) {
            this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.42);
        }
    }

    /**
     * 포수 미트 포구 시 스트라이크 / 볼 판정
     */
    handlePitchMissResult(tx, ty) {
        // 스트라이크 존 규격: x [-24, 24], y [22, 66]
        const inZone = (Math.abs(tx) <= 24 && ty >= 22 && ty <= 66);

        if (inZone) {
            // 스트라이크!
            this.strikes++;
            this.playCatchSound();
            this.playUmpireWhistle(1400, 0.2);

            if (this.strikes >= 3) {
                // 삼진 아웃!
                this.recordOut('💨 3구 삼진 아웃! (STRIKE OUT!)');
            } else {
                this.showResultBanner('⚡ 스트라이크! (STRIKE)', `카운트: ${this.balls}B - ${this.strikes}S`, '#facc15');
                this.gameState = 'result_pause';
                this.stateTimer = 1.4;
            }
        } else {
            // 볼!
            this.balls++;
            this.playCatchSound();

            if (this.balls >= 4) {
                // 4구 볼넷 출루!
                const pts = 1;
                if (this.inningHalf === 'top') this.p2.score += pts;
                else this.p1.score += pts;

                this.showResultBanner('🚶 4구 볼넷 출루! (+1점)', '정밀한 선구안으로 밀어내기 득점!', '#38bdf8');
                this.balls = 0;
                this.strikes = 0;
                this.gameState = 'result_pause';
                this.stateTimer = 1.6;
            } else {
                this.showResultBanner('⚪ 볼! (BALL)', `카운트: ${this.balls}B - ${this.strikes}S`, '#94a3b8');
                this.gameState = 'result_pause';
                this.stateTimer = 1.2;
            }
        }
        this.updateHUD();
    }

    /**
     * 아웃 카운트 증가 & 3아웃 시 공수 교대
     */
    recordOut(reason = '아웃!') {
        this.outs++;
        this.strikes = 0;
        this.balls = 0;
        this.updateHUD();

        if (this.outs >= 3) {
            // 3아웃! 공수 교대 (또는 경기 종료)
            if (this.inningHalf === 'top') {
                // 1회초 종료 -> 1회말로 공수 교대!
                this.inningHalf = 'bottom';
                this.outs = 0;
                this.showResultBanner(
                    '🔄 3아웃 공수 교대! (1회말 시작)',
                    `공격: 1P ${this.p1.name} | 수비: 2P ${this.p2.name}`,
                    '#4ade80'
                );
                this.gameState = 'result_pause';
                this.stateTimer = 2.6;
            } else {
                // 1회말 종료 -> 경기 최종 종료!
                this.gameOver();
            }
        } else {
            this.showResultBanner(reason, `아웃 카운트: [${this.outs} / 3 아웃]`, '#ef4444');
            this.gameState = 'result_pause';
            this.stateTimer = 1.6;
        }
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.width, this.height);

        let shakeX = 0;
        let shakeY = 0;
        if (this.camera.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.camera.shake;
            shakeY = (Math.random() - 0.5) * this.camera.shake;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 1. 경기장 백스탑 & 백네트 & 그랜드스탠드 관중석 배경 (홈플레이트 뒤 전경)
        this.renderBackstopAndStands(ctx);

        // 2. 홈플레이트 & 타석 흙 & 3D 스트라이크 존 박스
        this.renderHomePlateAndStrikeZone(ctx);

        // 3. 포수(Catcher) & 주심(Umpire) 렌더링 (z=415, z=445)
        this.renderCatcherAndUmpire(ctx);

        // 4. 타자(Batter) 렌더링 (z=380, x=65 우타석에서 투수와 정면 맞대결)
        this.renderBatter(ctx);

        // 5. 날아가는 야구공 (3D 구체)
        if (this.ball.active) {
            this.renderBall(ctx);
        }

        // 6. 투수(Pitcher) 렌더링 (마운드 x=-52, z=80에서 역동적 투구 폼)
        this.renderPitcher(ctx);

        // 7. 파티클 & 불꽃놀이
        this.renderEffects(ctx);

        // 8. 팝업 배너
        this.renderResultBanner(ctx);

        ctx.restore();
    }

    /**
     * 3D 좌표 -> 2D 투수 뒤 시점 화면 투영
     */
    project(x, y, z) {
        const cam = this.camera;
        const relZ = Math.max(15, z - cam.z);
        const scale = cam.fov / relZ;
        const screenX = this.width / 2 + (x - cam.x) * scale;
        // Y축: 위쪽이 양수
        const screenY = this.height * 0.55 - (y - cam.y) * scale;
        return { x: screenX, y: screenY, scale: scale };
    }

    renderBackstopAndStands(ctx) {
        // [1] 백네트 뒤 거대 스타디움 관중석 벽면 (z=520)
        const pTL = this.project(-380, 240, 520);
        const pTR = this.project(380, 240, 520);
        const pBL = this.project(-380, 0, 520);
        const pBR = this.project(380, 0, 520);

        // 상단 푸른 하늘
        const skyGrad = ctx.createLinearGradient(0, 0, 0, pTL.y);
        skyGrad.addColorStop(0, '#0369a1');
        skyGrad.addColorStop(1, '#38bdf8');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, pTL.y);

        // 백스탑 그랜드스탠드 벽돌 벽 (Brick Wall behind Catcher)
        ctx.fillStyle = '#78350f'; // 붉은 벽돌
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();
        ctx.fill();

        // 중앙 LED 스타디움 전광판 스폰서 보드
        const sbTL = this.project(-140, 190, 510);
        const sbTR = this.project(140, 190, 510);
        const sbBL = this.project(-140, 110, 510);
        const sbW = sbTR.x - sbTL.x;
        const sbH = sbBL.y - sbTL.y;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sbTL.x, sbTL.y, sbW, sbH);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(sbTL.x, sbTL.y, sbW, sbH);

        // 전광판 B-S-O 및 스코어 표시
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚾ SMILE PRO BASEBALL 2P ARENA ⚾', sbTL.x + sbW / 2, sbTL.y + 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        const p1Score = `1P [${this.p1.name}]: ${this.p1.score}점`;
        const p2Score = `2P [${this.p2.name}]: ${this.p2.score}점`;
        ctx.fillText(`${p1Score}   VS   ${p2Score}`, sbTL.x + sbW / 2, sbTL.y + 46);

        // B-S-O 라이트 박스
        const bsoText = `B: ${'●'.repeat(this.balls)}${'○'.repeat(Math.max(0, 3 - this.balls))}   S: ${'●'.repeat(this.strikes)}${'○'.repeat(Math.max(0, 2 - this.strikes))}   O: ${'●'.repeat(this.outs)}${'○'.repeat(Math.max(0, 2 - this.outs))}`;
        ctx.fillStyle = '#4ade80';
        ctx.fillText(bsoText, sbTL.x + sbW / 2, sbTL.y + 68);

        // 관중석 칠색 도트 관중
        for (let r = 0; r < 4; r++) {
            const gy = sbTL.y - 12 - r * 14;
            for (let c = 0; c < 36; c++) {
                const gx = pTL.x + (pTR.x - pTL.x) * (c / 36);
                ctx.fillStyle = (c + r) % 3 === 0 ? '#ef4444' : ((c + r) % 3 === 1 ? '#38bdf8' : '#facc15');
                ctx.fillRect(gx, gy, 6, 6);
            }
        }

        // 그라운드 잔디 (투수 마운드부터 홈플레이트까지)
        const pG_TL = this.project(-380, 0, 520);
        const pG_TR = this.project(380, 0, 520);
        const pG_BL = this.project(-380, 0, -100);
        const pG_BR = this.project(380, 0, -100);

        ctx.fillStyle = '#15803d'; // 천연 잔디
        ctx.beginPath();
        ctx.moveTo(pG_TL.x, pG_TL.y);
        ctx.lineTo(pG_TR.x, pG_TR.y);
        ctx.lineTo(pG_BR.x, this.height);
        ctx.lineTo(pG_BL.x, this.height);
        ctx.closePath();
        ctx.fill();

        // 홈플레이트 주변 부채꼴 흙 (Dirt Circle)
        const pDirtCenter = this.project(0, 0, 370);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(pDirtCenter.x, pDirtCenter.y, 110 * pDirtCenter.scale, 48 * pDirtCenter.scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderHomePlateAndStrikeZone(ctx) {
        // [1] 홈플레이트 오각형 (z=380)
        const hp = this.project(0, 0, 380);
        const s = hp.scale;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(hp.x, hp.y);
        ctx.lineTo(hp.x - 14 * s, hp.y + 7 * s);
        ctx.lineTo(hp.x - 14 * s, hp.y + 18 * s);
        ctx.lineTo(hp.x + 14 * s, hp.y + 18 * s);
        ctx.lineTo(hp.x + 14 * s, hp.y + 7 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 좌타석 분필 박스 (x = -65, z = 380)
        const lbPt = this.project(-65, 0, 380);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(lbPt.x - 18 * s, lbPt.y - 6 * s, 36 * s, 32 * s);

        // [2] 3D 스트라이크 존 박스 (Strike Zone Grid)
        // x: -24 ~ 24, y: 22 ~ 66, z: 380
        const szTL = this.project(-24, 66, 380);
        const szTR = this.project(24, 66, 380);
        const szBL = this.project(-24, 22, 380);
        const szBR = this.project(24, 22, 380);
        const szW = szTR.x - szTL.x;
        const szH = szBL.y - szTL.y;

        // 반투명 네온 스트라이크 존 테두리
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.strokeRect(szTL.x, szTL.y, szW, szH);

        // 3x3 격자선 (9분할 스트라이크 존)
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
        ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

        // [3] 투수 조준선 과녁 (Aim Target Crosshair)
        if (this.gameState === 'aiming') {
            const aimPt = this.project(this.pitchAimX, this.pitchAimY, 380);
            ctx.strokeStyle = '#ef4444';
            ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(aimPt.x, aimPt.y, 9 * aimPt.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 십자선
            ctx.beginPath();
            ctx.moveTo(aimPt.x - 14 * aimPt.scale, aimPt.y);
            ctx.lineTo(aimPt.x + 14 * aimPt.scale, aimPt.y);
            ctx.moveTo(aimPt.x, aimPt.y - 14 * aimPt.scale);
            ctx.lineTo(aimPt.x, aimPt.y + 14 * aimPt.scale);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderCatcherAndUmpire(ctx) {
        // [1] 포수 (Catcher crouching at z=415)
        const cp = this.project(this.catcher.x, this.catcher.y, this.catcher.z);
        const cs = cp.scale;
        const ch = 52 * cs;
        const cw = 36 * cs;

        // 포수 프로텍터 장비 & 유니폼
        ctx.fillStyle = '#334155';
        ctx.fillRect(cp.x - cw / 2, cp.y - ch * 0.75, cw, ch * 0.65);
        ctx.fillStyle = '#64748b'; // 가슴 보호대
        ctx.fillRect(cp.x - cw * 0.35, cp.y - ch * 0.65, cw * 0.7, ch * 0.45);

        // 포수 마스크 헬멧
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y - ch * 0.88, 12 * cs, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 포수 미트 (Catcher's Mitt) - 투수 조준 위치를 향해 추적
        const mittOffsetX = (this.pitchAimX * 0.35) * cs;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(cp.x + mittOffsetX, cp.y - ch * 0.52, 10 * cs, 12 * cs, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // [2] 심판 (Umpire standing behind catcher at z=445)
        const up = this.project(this.umpire.x, this.umpire.y, this.umpire.z);
        const us = up.scale;
        const uh = 66 * us;
        const uw = 32 * us;

        ctx.fillStyle = '#0f172a'; // 심판 정장 블랙
        ctx.fillRect(up.x - uw / 2, up.y - uh * 0.85, uw, uh * 0.8);
        ctx.fillStyle = '#38bdf8'; // 심판 캡 블루
        ctx.beginPath();
        ctx.arc(up.x, up.y - uh * 0.98, 10 * us, 0, Math.PI * 2);
        ctx.fill();
    }

    // =========================================================================
    // 🐾 4대 캐릭터(호랑이, 개구리, 펭귄, 원숭이) 고유 얼굴 렌더링 헬퍼
    // =========================================================================
    drawTigerFace(ctx, s, isPitcher, skin) {
        // 귀
        [-15 * s, 15 * s].forEach(ex => {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(ex, -16 * s, 9 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f472b6'; // 핑크 귓속
            ctx.beginPath();
            ctx.arc(ex, -16 * s, 5 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 얼굴 기본 구체
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
        ctx.fill();
        // 흰색 볼털
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.ellipse(-7 * s, 5 * s, 8 * s, 6 * s, 0.2, 0, Math.PI * 2);
        ctx.ellipse(7 * s, 5 * s, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // 호랑이 줄무늬 (이마 & 뺨)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2 * s, -14 * s, 4 * s, 6 * s);
        ctx.fillRect(-8 * s, -12 * s, 3 * s, 4 * s);
        ctx.fillRect(5 * s, -12 * s, 3 * s, 4 * s);
        // 수염
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.moveTo(-10 * s, 5 * s); ctx.lineTo(-18 * s, 4 * s);
        ctx.moveTo(-10 * s, 8 * s); ctx.lineTo(-17 * s, 9 * s);
        ctx.moveTo(10 * s, 5 * s); ctx.lineTo(18 * s, 4 * s);
        ctx.moveTo(10 * s, 8 * s); ctx.lineTo(17 * s, 9 * s);
        ctx.stroke();
        // 눈
        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex, -2 * s, 4 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1.5 * s : -1.5 * s), -2 * s, 2.4 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1.5 * s : -1.5 * s) - 0.7 * s, -2.7 * s, 1 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 빨간 코 & 미소
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 3 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.arc(0, 6 * s, 4 * s, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
    }

    drawFrogFace(ctx, s, isPitcher, skin) {
        // 헬멧/머리 위에 솟은 큰 개구리 눈 2개
        [-13 * s, 13 * s].forEach(ex => {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(ex, -15 * s, 9 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex, -15 * s, 6.5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 2 * s : -2 * s), -15 * s, 3.5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1.2 * s : -2.8 * s), -16.5 * s, 1.5 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 얼굴
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
        ctx.fill();
        // 핑크 볼터치
        ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.beginPath();
        ctx.arc(-10 * s, 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.arc(10 * s, 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();
        // 턱밑 밝은 연두
        ctx.fillStyle = '#bbf7d0';
        ctx.beginPath();
        ctx.ellipse(0, 8 * s, 10 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 개구리 미소
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 2 * s, 8 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
    }

    drawPenguinFace(ctx, s, isPitcher, skin) {
        // 펭귄 얼굴: 둥근 남색 머리 + 흰색 페이스 + 주황 부리 + 초롱초롱 눈
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
        ctx.fill();
        // 흰색 페이스 마스크
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-6 * s, 1 * s, 8 * s, 11 * s, 0.1, 0, Math.PI * 2);
        ctx.ellipse(6 * s, 1 * s, 8 * s, 11 * s, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // 초롱초롱 눈
        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1.5 * s : -1.5 * s), -2 * s, 3.8 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1 * s : -2 * s), -3.5 * s, 1.6 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 주황색 부리
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        if (isPitcher) {
            ctx.moveTo(-1 * s, 2 * s);
            ctx.lineTo(8 * s, 5 * s);
            ctx.lineTo(-1 * s, 8 * s);
        } else {
            ctx.moveTo(1 * s, 2 * s);
            ctx.lineTo(-8 * s, 5 * s);
            ctx.lineTo(1 * s, 8 * s);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c2410c';
        ctx.lineWidth = 1 * s;
        ctx.stroke();
    }

    drawMonkeyFace(ctx, s, isPitcher, skin) {
        // 원숭이: 갈색 머리 + 큰 귀 2개 + 살구색 주둥이 + 장난기 가득한 미소
        [-17 * s, 17 * s].forEach(ex => {
            ctx.fillStyle = '#854d0e';
            ctx.beginPath();
            ctx.arc(ex, -2 * s, 8 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fed7aa'; // 살구색 귓속
            ctx.beginPath();
            ctx.arc(ex, -2 * s, 4.5 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 머리통
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
        ctx.fill();
        // 살구색 주둥이
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.ellipse(0, 5 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // 눈
        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1.5 * s : -1.5 * s), -3 * s, 3.2 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex + (isPitcher ? 1 * s : -2 * s), -4.5 * s, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();
        });
        // 작은 코 & 미소
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 3 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.4 * s;
        ctx.beginPath();
        ctx.arc(0, 6 * s, 6 * s, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
    }

    /**
     * 투수 3D 렌더링 (마운드 x=-52, y=14, z=80에서 3/4 뷰로 홈플레이트를 향해 투구)
     */
    renderPitcher(ctx) {
        const pit = this.pitcher;
        const pChar = this.getCurrentPitcher();
        const pSkin = this.getCurrentPitcherSkin();

        // 투수 마운드 좌표 (-52, 14, 80)
        const pp = this.project(pit.x, pit.y, pit.z);
        const s = pp.scale;
        const h = 100 * s;
        const w = 46 * s;

        ctx.save();
        ctx.translate(pp.x, pp.y);

        // 1. 투수 마운드 흙 언덕 & 고무 투수판
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, 6 * s, 62 * s, 22 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(0, 3 * s, 48 * s, 16 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 투수 플레이트 (고무판)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-14 * s, -1 * s, 28 * s, 4 * s);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(-14 * s, -1 * s, 28 * s, 4 * s);

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 6 * s, 24 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 다리 & 야구 유니폼 바지 (화이트 + 팀컬러 줄무늬 & 양말)
        let legKickY = 0;
        let legKickX = 0;
        if (pit.phase === 'windup') {
            const windupProg = Math.min(1, pit.phaseTimer / 0.72);
            const kickAmount = Math.sin(windupProg * Math.PI);
            if (pChar.pitchStyle === 'overhand') legKickY = -h * 0.36 * kickAmount; // 호랑이 폭풍 하이킥
            else if (pChar.pitchStyle === 'threequarter') legKickY = -h * 0.22 * kickAmount;
            else if (pChar.pitchStyle === 'sidearm') { legKickX = -12 * s * kickAmount; legKickY = -h * 0.18 * kickAmount; }
            else legKickY = -h * 0.28 * kickAmount; // 원숭이
        }

        // 축이 되는 뒷다리 (오른다리 - 마운드 지지)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(w * 0.05, -h * 0.42, w * 0.36, h * 0.42);
        ctx.fillStyle = pSkin.jersey; // 양말
        ctx.fillRect(w * 0.05, -h * 0.2, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b'; // 스파이크화
        ctx.fillRect(w * 0.02, -h * 0.06, w * 0.42, h * 0.06);

        // 들어올리는 앞다리 (왼다리 - 킥 모션)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.45 + legKickX, -h * 0.42 + legKickY, w * 0.36, h * 0.42 - legKickY);
        ctx.fillStyle = pSkin.jersey;
        ctx.fillRect(-w * 0.45 + legKickX, -h * 0.2 + legKickY, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.48 + legKickX, -h * 0.06 + legKickY, w * 0.42, h * 0.06);

        // 3. 상체 유니폼 (저지 - 3/4 홈플레이트 방향 회전)
        ctx.fillStyle = pSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 저지 세로 스트라이프
        ctx.strokeStyle = pSkin.stripe;
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.moveTo(-w * 0.15, -h * 0.82); ctx.lineTo(-w * 0.15, -h * 0.38);
        ctx.moveTo(w * 0.15, -h * 0.82); ctx.lineTo(w * 0.15, -h * 0.38);
        ctx.stroke();

        // 선수 이름 & 등번호
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(11 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(pChar.name, 0, -h * 0.65);
        ctx.font = `900 ${Math.round(16 * s)}px sans-serif`;
        ctx.fillText('1', 0, -h * 0.48);

        // 4. 왼쪽 글러브 낀 팔 (포수 방향으로 균형)
        ctx.fillStyle = '#78350f'; // 가죽 글러브
        ctx.beginPath();
        ctx.ellipse(w * 0.48, -h * 0.68, 7 * s, 9 * s, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 5. 오른쪽 투구 팔 & 투구폼 모션
        let armEndX = -w * 0.25;
        let armEndY = -h * 0.75;
        let showBallInHand = (pit.phase === 'ready' || pit.phase === 'windup');

        if (pit.phase === 'windup') {
            if (pChar.pitchStyle === 'overhand') {
                armEndX = 4 * s;
                armEndY = -h * 1.35; // 머리 훨씬 위로 치솟는 오버핸드
            } else if (pChar.pitchStyle === 'threequarter') {
                armEndX = 26 * s;
                armEndY = -h * 1.08;
            } else if (pChar.pitchStyle === 'sidearm') {
                armEndX = 38 * s;
                armEndY = -h * 0.62;
            } else {
                armEndX = 8 * s;
                armEndY = -h * 1.22;
            }
        } else if (pit.phase === 'release') {
            armEndX = 22 * s;
            armEndY = -h * 0.68;
        }

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * 0.2, -h * 0.78);
        ctx.lineTo(armEndX, armEndY);
        ctx.stroke();

        if (showBallInHand) {
            // 손에 쥔 야구공
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(armEndX, armEndY, 5 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1 * s;
            ctx.stroke();
        }

        // 6. 캐릭터 머리 & 귀 & 얼굴 (홈플레이트 방향 응시)
        const headY = -h * 0.94;
        ctx.save();
        ctx.translate(0, headY);

        if (pChar.id === 'tiger') this.drawTigerFace(ctx, s, true, pSkin);
        else if (pChar.id === 'frog') this.drawFrogFace(ctx, s, true, pSkin);
        else if (pChar.id === 'penguin') this.drawPenguinFace(ctx, s, true, pSkin);
        else this.drawMonkeyFace(ctx, s, true, pSkin);

        // 야구 모자 (홈플레이트를 향해 챙이 뻗은 형태)
        ctx.fillStyle = pSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -7 * s, 18 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        // 모자 챙
        ctx.fillStyle = pSkin.cap;
        ctx.beginPath();
        ctx.ellipse(10 * s, -6 * s, 14 * s, 4 * s, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    /**
     * 타자 3D 렌더링 (홈플레이트 우측 타석 x=65, z=380에서 투수와 정면 맞대결)
     */
    renderBatter(ctx) {
        const b = this.batter;
        const bChar = this.getCurrentBatter();
        const bSkin = this.getCurrentBatterSkin();

        // 타자 위치 투영 (z=380, x=65 우타석)
        const bp = this.project(b.x, b.y, b.z);
        const s = bp.scale;
        const h = 92 * s;
        const w = 38 * s;

        ctx.save();
        ctx.translate(bp.x, bp.y);

        // 1. 타자석 분필 박스
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(-w * 0.7, -6 * s, w * 1.4, 32 * s);

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, w * 0.6, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 야구 바지 (화이트 + 팀 양말)
        let strideX = 0;
        if (b.isSwinging) strideX = -6 * s; // 투수를 향해 스트라이드 스텝

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.45 + strideX, -h * 0.42, w * 0.38, h * 0.42);
        ctx.fillRect(w * 0.05, -h * 0.42, w * 0.38, h * 0.42);
        ctx.fillStyle = bSkin.jersey;
        ctx.fillRect(-w * 0.45 + strideX, -h * 0.22, w * 0.38, h * 0.1);
        ctx.fillRect(w * 0.05, -h * 0.22, w * 0.38, h * 0.1);
        ctx.fillStyle = '#1e293b'; // 스파이크
        ctx.fillRect(-w * 0.48 + strideX, -h * 0.06, w * 0.42, h * 0.06);
        ctx.fillRect(w * 0.03, -h * 0.06, w * 0.42, h * 0.06);

        // 3. 상체 유니폼 저지 (타자 저지)
        ctx.fillStyle = bSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 줄무늬 & 4번 타자 번호
        ctx.strokeStyle = bSkin.stripe;
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.82); ctx.lineTo(0, -h * 0.38);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(bChar.name, 0, -h * 0.66);
        ctx.font = `900 ${Math.round(15 * s)}px sans-serif`;
        ctx.fillText('4', 0, -h * 0.48);

        // 4. 타자 머리 & 얼굴 (투수 방향 마주봄)
        const headY = -h * 0.94;
        ctx.save();
        ctx.translate(0, headY);

        if (bChar.id === 'tiger') this.drawTigerFace(ctx, s, false, bSkin);
        else if (bChar.id === 'frog') this.drawFrogFace(ctx, s, false, bSkin);
        else if (bChar.id === 'penguin') this.drawPenguinFace(ctx, s, false, bSkin);
        else this.drawMonkeyFace(ctx, s, false, bSkin);

        // 야구 타자 헬멧 (귀 보호대 포함)
        ctx.fillStyle = bSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -7 * s, 18 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        // 헬멧 바이저 & 귀덮개
        ctx.fillStyle = bSkin.cap;
        ctx.beginPath();
        ctx.ellipse(-10 * s, -6 * s, 13 * s, 4.5 * s, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-15 * s, -6 * s, 6 * s, 12 * s); // 투수 쪽 귀덮개 flap
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        ctx.restore();

        // 5. 배트 스윙 (야구 배트)
        const batLen = 64 * s;
        let batAngle = b.isSwinging ? b.swingAngle : (0.65 + Math.sin(b.idleTimer) * 0.12);

        ctx.save();
        ctx.translate(-w * 0.2, -h * 0.65);
        ctx.rotate(batAngle);

        // 스윙 시 시각적인 궤적 잔상
        if (b.isSwinging) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 14 * s;
            ctx.beginPath();
            ctx.arc(0, 0, batLen, -0.9, 0);
            ctx.stroke();
        }

        // 배트 손잡이
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2 * s, -10 * s, 4 * s, 10 * s);
        // 배트 배럴 (황금 원목 메이플 배트)
        const batGrad = ctx.createLinearGradient(-4 * s, 0, 4 * s, 0);
        batGrad.addColorStop(0, '#f59e0b');
        batGrad.addColorStop(0.5, '#fbbf24');
        batGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = batGrad;
        ctx.beginPath();
        ctx.roundRect(-4.5 * s, -batLen, 9 * s, batLen - 10 * s, 3.5 * s);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    renderBall(ctx) {
        const b = this.ball;
        const p = this.project(b.x, b.y, b.z);
        const r = Math.max(5, b.radius * p.scale);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(b.rot);

        // 불꽃볼 특수 이펙트
        if (b.type === 'fireball') {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 야구공 3D 그라디언트 구체
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#f1f5f9');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 빨간 실밥
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(1.2, 1.8 * p.scale);
        ctx.beginPath();
        ctx.arc(-r * 0.45, 0, r * 0.65, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.45, 0, r * 0.65, 0.4 * Math.PI, 1.6 * Math.PI);
        ctx.stroke();

        ctx.restore();
    }

    createHitSparks(x, y, z) {
        for (let i = 0; i < 28; i++) {
            this.particles.push({
                x: x,
                y: y,
                z: z,
                vx: (Math.random() - 0.5) * 320,
                vy: (Math.random() - 0.5) * 320,
                vz: (Math.random() - 0.5) * 220,
                life: 0.4 + Math.random() * 0.3,
                color: Math.random() < 0.5 ? '#facc15' : '#ffffff',
                size: 3.5 + Math.random() * 3
            });
        }
    }

    createFireballTrail(x, y, z) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 10,
                vx: (Math.random() - 0.5) * 30,
                vy: 20 + Math.random() * 20,
                vz: -40,
                life: 0.25,
                color: Math.random() < 0.6 ? '#f97316' : '#facc15',
                size: 5
            });
        }
    }

    triggerHomeRunCelebration(dist, pts) {
        this.playHomeRunFanfare();
        this.playCrowdCheer();

        const batterChar = this.getCurrentBatter();
        const teamName = (this.inningHalf === 'top') ? `2P [${this.p2.name}]` : `1P [${this.p1.name}]`;

        this.showResultBanner(
            `🔥 GRAND SLAM HOMERUN!! 🔥`,
            `${teamName} ${batterChar.name} 초대형 장외 홈런! 비거리 ${dist}m (+${pts}점 대박!)`,
            '#facc15'
        );

        // 스타디움 상공 3단 불꽃놀이 폭죽 발사
        [-160, 0, 160].forEach((fx, idx) => {
            setTimeout(() => {
                const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#e879f9'];
                const parts = [];
                for (let i = 0; i < 45; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = 80 + Math.random() * 140;
                    parts.push({
                        x: fx,
                        y: 140 + Math.random() * 30,
                        vx: Math.cos(angle) * spd,
                        vy: Math.sin(angle) * spd,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: 3.5
                    });
                }
                this.fireworks.push({ particles: parts, life: 1.5 });
            }, idx * 220);
        });
    }

    renderEffects(ctx) {
        this.particles.forEach(p => {
            const pt = this.project(p.x, p.y, p.z);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1.5, p.size * pt.scale), 0, Math.PI * 2);
            ctx.fill();
        });

        this.fireworks.forEach(f => {
            f.particles.forEach(p => {
                const pt = this.project(p.x, p.y, 480);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;
        });
    }

    showResultBanner(main, sub, color = '#facc15') {
        this.bannerText = main;
        this.bannerSub = sub;
        this.bannerColor = color;
        this.bannerAlpha = 1.0;
    }

    renderResultBanner(ctx) {
        if (this.bannerAlpha <= 0 || !this.bannerText) return;

        ctx.save();
        ctx.globalAlpha = this.bannerAlpha;
        const midX = this.width / 2;
        const midY = this.height * 0.28;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = this.bannerColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(midX - 270, midY - 45, 540, 90, 18);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.bannerColor;
        ctx.font = '900 27px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = this.bannerColor;
        ctx.shadowBlur = 12;
        ctx.fillText(this.bannerText, midX, midY - 6);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15.5px sans-serif';
        ctx.fillText(this.bannerSub, midX, midY + 24);

        ctx.restore();
    }

    updateHUD() {
        const p1ScoreEl = document.getElementById('baseball-stat-p1-score');
        const p2ScoreEl = document.getElementById('baseball-stat-p2-score');
        const inningEl = document.getElementById('baseball-stat-inning');
        const bsoEl = document.getElementById('baseball-stat-bso');
        const pitcherHudEl = document.getElementById('baseball-hud-pitcher-name');
        const batterHudEl = document.getElementById('baseball-hud-batter-name');
        const modeBadgeEl = document.getElementById('baseball-mode-badge');

        if (p1ScoreEl) p1ScoreEl.textContent = `${this.p1.score}점`;
        if (p2ScoreEl) p2ScoreEl.textContent = `${this.p2.score}점`;

        if (inningEl) {
            inningEl.textContent = (this.inningHalf === 'top') ? '1회초 (2P 공격)' : '1회말 (1P 공격)';
        }

        if (bsoEl) {
            bsoEl.textContent = `B:${this.balls} S:${this.strikes} O:${this.outs}`;
        }

        const pChar = this.getCurrentPitcher();
        const bChar = this.getCurrentBatter();

        if (pitcherHudEl) {
            const pTeam = (this.inningHalf === 'top') ? '1P 투수' : '2P 투수';
            pitcherHudEl.textContent = `⚾ ${pTeam}: ${pChar.emoji} ${pChar.name} [${pChar.pitchStyleName}]`;
        }

        if (batterHudEl) {
            const bTeam = (this.inningHalf === 'top') ? '2P 타자' : '1P 타자';
            batterHudEl.textContent = `🏏 ${bTeam}: ${bChar.emoji} ${bChar.name} [${bChar.batStyleName}]`;
        }

        if (modeBadgeEl) {
            modeBadgeEl.textContent = (this.gameMode === '2p') ? '👥 2인용 대전' : '🤖 1인용 (vs AI)';
        }

        // 구종 버튼 액티브 상태 토글
        const pitchBtns = document.querySelectorAll('.pitch-select-btn');
        pitchBtns.forEach(btn => {
            const pt = btn.getAttribute('data-pitch');
            if (pt === this.selectedPitchType) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    // =========================================================================
    // 🧑‍💼 캐릭터 및 스킨 선택 시스템 (1P & 2P 각각 선택 가능)
    // =========================================================================
    showCharModal() {
        this.stop();
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) {
            modal.classList.add('active');
            this.updateCharSelectionUI();
        }
    }

    hideCharModal() {
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) modal.classList.remove('active');
    }

    showBatterModal() {
        this.showCharModal();
    }

    hideBatterModal() {
        this.hideCharModal();
    }

    bindCharModalEvents() {
        // 1P 캐릭터 버튼
        const p1Btns = document.querySelectorAll('#baseball-p1-char-selector .select-btn');
        p1Btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cId = btn.getAttribute('data-char');
                if (cId) {
                    this.p1.char = cId;
                    this.p1.skin = 'classic';
                    localStorage.setItem('smilegames_bb_p1_char', cId);
                    localStorage.setItem('smilegames_bb_p1_skin', 'classic');
                    this.updateCharSelectionUI();
                }
            });
        });

        // 2P 캐릭터 버튼
        const p2Btns = document.querySelectorAll('#baseball-p2-char-selector .select-btn');
        p2Btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cId = btn.getAttribute('data-char');
                if (cId) {
                    this.p2.char = cId;
                    this.p2.skin = 'classic';
                    localStorage.setItem('smilegames_bb_p2_char', cId);
                    localStorage.setItem('smilegames_bb_p2_skin', 'classic');
                    this.updateCharSelectionUI();
                }
            });
        });

        const launchBtn = document.getElementById('btn-baseball-batter-launch');
        if (launchBtn) {
            launchBtn.addEventListener('click', () => {
                this.hideCharModal();
                this.start();
            });
        }

        const hubBtn = document.getElementById('btn-baseball-batter-hub');
        if (hubBtn) {
            hubBtn.addEventListener('click', () => {
                this.hideCharModal();
                this.openHubModal();
            });
        }
    }

    updateCharSelectionUI() {
        // 1P 버튼 액티브
        document.querySelectorAll('#baseball-p1-char-selector .select-btn').forEach(btn => {
            if (btn.getAttribute('data-char') === this.p1.char) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 2P 버튼 액티브
        document.querySelectorAll('#baseball-p2-char-selector .select-btn').forEach(btn => {
            if (btn.getAttribute('data-char') === this.p2.char) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 1P 캐릭터 전용 스킨 생성
        const p1CharData = this.characters[this.p1.char] || this.characters.tiger;
        const p1SkinContainer = document.getElementById('baseball-p1-skin-selector');
        if (p1SkinContainer) {
            p1SkinContainer.innerHTML = '';
            Object.values(p1CharData.skins).forEach(skin => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = `select-btn ${skin.id === this.p1.skin ? 'active' : ''}`;
                b.innerHTML = `<span class="btn-emoji">${skin.icon}</span><span class="btn-text">${skin.name}</span>`;
                b.addEventListener('click', () => {
                    this.p1.skin = skin.id;
                    localStorage.setItem('smilegames_bb_p1_skin', skin.id);
                    this.updateCharSelectionUI();
                });
                p1SkinContainer.appendChild(b);
            });
        }

        // 2P 캐릭터 전용 스킨 생성
        const p2CharData = this.characters[this.p2.char] || this.characters.monkey;
        const p2SkinContainer = document.getElementById('baseball-p2-skin-selector');
        if (p2SkinContainer) {
            p2SkinContainer.innerHTML = '';
            Object.values(p2CharData.skins).forEach(skin => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = `select-btn ${skin.id === this.p2.skin ? 'active' : ''}`;
                b.innerHTML = `<span class="btn-emoji">${skin.icon}</span><span class="btn-text">${skin.name}</span>`;
                b.addEventListener('click', () => {
                    this.p2.skin = skin.id;
                    localStorage.setItem('smilegames_bb_p2_skin', skin.id);
                    this.updateCharSelectionUI();
                });
                p2SkinContainer.appendChild(b);
            });
        }

        // 실시간 프리뷰
        const p1PreviewEl = document.getElementById('baseball-p1-preview-text');
        const p2PreviewEl = document.getElementById('baseball-p2-preview-text');
        if (p1PreviewEl) {
            const s = p1CharData.skins[this.p1.skin] || p1CharData.skins.classic;
            p1PreviewEl.textContent = `1P: ${p1CharData.emoji} ${p1CharData.name} (${s.name}) | 투구: ${p1CharData.pitchStyleName}`;
        }
        if (p2PreviewEl) {
            const s = p2CharData.skins[this.p2.skin] || p2CharData.skins.classic;
            p2PreviewEl.textContent = `2P: ${p2CharData.emoji} ${p2CharData.name} (${s.name}) | 투구: ${p2CharData.pitchStyleName}`;
        }
    }

    // =========================================================================
    // 🏆 경기 종료 & 명예의 전당 (2인용 승패 결정)
    // =========================================================================
    gameOver() {
        this.stop();
        this.playGameOverSound();

        const modal = document.getElementById('baseball-gameover-modal');
        if (!modal) return;

        let winnerText = '🤝 무승부! 연장전 승부!';
        let winnerColor = '#facc15';

        if (this.p1.score > this.p2.score) {
            winnerText = `👑 1P [${this.p1.name}] 대승리!! 🏆`;
            winnerColor = '#38bdf8';
        } else if (this.p2.score > this.p1.score) {
            winnerText = `👑 2P [${this.p2.name}] 대승리!! 🏆`;
            winnerColor = '#f97316';
        }

        const badgeEl = document.getElementById('baseball-final-badge');
        const scoreEl = document.getElementById('baseball-final-score');
        const hrEl = document.getElementById('baseball-final-hr');
        const hitEl = document.getElementById('baseball-final-hit');
        const distEl = document.getElementById('baseball-final-dist');

        if (badgeEl) {
            badgeEl.textContent = winnerText;
            badgeEl.style.color = '#0f172a';
            badgeEl.style.background = winnerColor;
        }

        if (scoreEl) scoreEl.textContent = `1P ${this.p1.score}점  VS  2P ${this.p2.score}점`;
        if (hrEl) hrEl.textContent = `1P: ${this.p1.homeRuns}개  |  2P: ${this.p2.homeRuns}개`;
        if (hitEl) hitEl.textContent = `1P: ${this.p1.hits}개  |  2P: ${this.p2.hits}개`;
        if (distEl) distEl.textContent = `${this.maxDistance}m`;

        modal.classList.add('active');
    }

    hideGameOverModal() {
        const modal = document.getElementById('baseball-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
        this.hideCharModal();
        if (this.containerEl) {
            this.containerEl.style.display = 'none';
        }
        const hubModal = document.getElementById('hub-modal');
        if (hubModal) hubModal.classList.add('active');
    }

    // =========================================================================
    // 🎵 사운드 합성 엔진
    // =========================================================================
    playSwingSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.17);
        } catch (e) {}
    }

    playPitchWindupSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(340, now + 0.35);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.42);
        } catch (e) {}
    }

    playPitchThrowSound(type) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = (type === 'fireball') ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime((type === 'fireball') ? 620 : 380, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    playCatchSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            // 퍽-! 포수 미트 찰진 포구음
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(190, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch (e) {}
    }

    playBatHitSound(type) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. "깡-!!" 맑고 시원한 금속 배트음
            const ping = ctx.createOscillator();
            const pGain = ctx.createGain();
            ping.type = 'triangle';
            ping.frequency.setValueAtTime(2950, now);
            ping.frequency.exponentialRampToValueAtTime(950, now + 0.14);
            pGain.gain.setValueAtTime((type === 'homerun') ? 0.7 : 0.45, now);
            pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            ping.connect(pGain);
            pGain.connect(ctx.destination);
            ping.start(now);
            ping.stop(now + 0.27);

            // 2. "빡-!" 묵직한 베이스 충격음
            const thud = ctx.createOscillator();
            const tGain = ctx.createGain();
            thud.type = 'sawtooth';
            thud.frequency.setValueAtTime(240, now);
            thud.frequency.exponentialRampToValueAtTime(50, now + 0.18);
            tGain.gain.setValueAtTime(0.55, now);
            tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            thud.connect(tGain);
            tGain.connect(ctx.destination);
            thud.start(now);
            thud.stop(now + 0.21);
        } catch (e) {}
    }

    playHomeRunFanfare() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const notes = [
                { f: 523.25, time: 0.00, dur: 0.14 },
                { f: 659.25, time: 0.13, dur: 0.14 },
                { f: 783.99, time: 0.26, dur: 0.16 },
                { f: 1046.50, time: 0.42, dur: 0.65 }
            ];
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.time);
                gain.gain.setValueAtTime(0.42, now + n.time);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.time);
                osc.stop(now + n.time + n.dur + 0.05);
            });
        } catch (e) {}
    }

    playCrowdCheer() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 1.5;
            const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.9));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(950, now);
            filter.Q.setValueAtTime(1.8, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 1.5);
        } catch (e) {}
    }

    playUmpireWhistle(freq = 1400, dur = 0.2) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + dur);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.03);
        } catch (e) {}
    }

    playGameOverSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const notes = [440, 392, 349, 293];
            notes.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now + idx * 0.15);
                gain.gain.setValueAtTime(0.26, now + idx * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.24);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.15);
                osc.stop(now + idx * 0.15 + 0.26);
            });
        } catch (e) {}
    }
}
