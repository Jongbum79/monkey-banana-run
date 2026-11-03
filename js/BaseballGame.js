/**
 * Smile Games - MLB 26 스타일 스마일 프로야구 3D (Smile MLB 26 Pro Baseball Duel)
 * 
 * ⚾ MLB 26 핵심 업그레이드 특징:
 * 1. 🌐 서버 1:1 라이벌 대결 & 10초 AI 매칭 시스템:
 *    - 투수(Pitcher) 또는 타자(Batter) 역할 중 하나를 직접 선택!
 *    - 10초 카운트다운 동안 상대 유저를 탐색하고, 미매칭 시 맞춤형 AI 에이스 라이벌과 자동 매칭!
 * 2. 🎥 다이내믹 듀얼 카메라 (MLB The Show 26 정통 시점):
 *    - [타자 모드]: 포수/홈플레이트 뒤 시점 (MLB The Show 정통 배터 뷰).
 *                   투수가 160km/h 초강속구와 뚝 떨어지는 변화구를 정면으로 뿌려오는 극강의 타격감!
 *    - [투수 모드]: 투수 마운드 뒤 시점 (정밀 코스 제구 & 5대 마구 릴리즈).
 * 3. 💎 3D 다이아몬드 베이스 & 주자 진루 시스템:
 *    - 홈(Home), 1루(1B), 2루(2B), 3루(3B) 실제 야구 다이아몬드 주로 & 3D 사각 베이스백.
 *    - 안타/2루타/3루타/홈런/볼넷 시 실제 주자 진루 및 득점, 만루홈런(Grand Slam) 지원!
 *    - 상단 MLB 26 스코어버그에 실시간 다이아몬드 주자 점등 위젯 탑재.
 * 4. ⚡ 초고속 구속 (156~174km/h) & 극적인 마구 변화각:
 *    - 직구(162km/h 라이징), 파워커브(12-6 폭포수 낙폭), 슬라이더(50+ 횡스위핑), 체인지업(오프스피드 싱킹), 불꽃마구.
 * 5. 🐾 타자별 고유 장점(Perk) 시스템:
 *    - 🐯 호걸이: 💥 파워 슬러거 (Power 99 | 홈런 비거리 +25m, 185km/h 로켓 타구)
 *    - 🐸 개구리: 🎯 칼날 컨택트 (Contact 99 | 히트 판정 윈도우 +40% 확장, 안타 제조기)
 *    - 🐧 펭귄: 🌪️ 총알 배트스피드 (Clutch 95 | 배트 스피드 +40%, 2루타 확률 2배)
 *    - 🐵 원숭이: 👑 황금 5툴 올라운더 (Balanced 94 | 파워+컨택 조화, 마구 대처 능력 +30%)
 * 6. 🏃‍♂️ 자연스러운 3D 스윙 & 투구 애니메이션:
 *    - 자세(Waggle) -> 스트라이드(Stride) -> 힙 회전(Hip Fire) -> 배트 래그(Lag) -> 풀 익스텐션 & 하이 팔로스루!
 * 7. 📺 초슬림 MLB 26 브로드캐스트 스코어 버그 & 실시간 스피드건 레이더.
 */

function safeGetStorage(key, fallback) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            return val !== null ? val : fallback;
        }
    } catch (e) {}
    return fallback;
}

function safeSetStorage(key, value) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {}
}

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
        this.width = typeof window !== 'undefined' ? window.innerWidth : 1280;
        this.height = typeof window !== 'undefined' ? window.innerHeight : 720;
        this.dpr = typeof window !== 'undefined' ? Math.max(window.devicePixelRatio || 1, 2) : 2;

        // 🎮 나의 플레이 역할: 'batter' (타자) | 'pitcher' (투수)
        this.userRole = safeGetStorage('smilegames_bb_user_role', 'batter');

        // 🐾 4종 캐릭터 스펙 & 타자/투수 고유 특화(Perk)
        this.characters = {
            tiger: {
                id: 'tiger',
                name: '호걸이',
                roleName: 'KIA 타이거즈 4번 파워 슬러거',
                emoji: '🐯',
                pitchStyle: 'overhand',
                pitchStyleName: '오버핸드 (162km/h 강속구)',
                batterPerkTitle: '💥 파워 슬러거 (Power 99)',
                batterPerkDesc: '홈런 비거리 +25m, 타구 속도 185km/h 로켓포, 퍼펙트 타이밍 시 무조건 초대형 홈런!',
                power: 99,
                contact: 85,
                contactWindowBonus: 1.05,
                powerBonus: 25,
                speedBonus: 1.15,
                doubleBonus: 1.0,
                fastballSpeed: 162,
                controlSpread: 24,
                curveBonus: 1.1,
                sliderBonus: 1.1,
                skins: {
                    classic: { id: 'classic', name: '타이거즈 홈 화이트', jersey: '#ea580c', cap: '#1e293b', stripe: '#f8fafc', icon: '🐅' },
                    away: { id: 'away', name: '타이거즈 원정 레드', jersey: '#dc2626', cap: '#0f172a', stripe: '#fca5a5', icon: '🔴' },
                    gold: { id: 'gold', name: '골든 챔피언 유니폼', jersey: '#ca8a04', cap: '#1c1917', stripe: '#fef08a', icon: '👑' }
                }
            },
            frog: {
                id: 'frog',
                name: '개구리',
                roleName: '정밀 타격 & 안타 제조기',
                emoji: '🐸',
                pitchStyle: 'threequarter',
                pitchStyleName: '쓰리쿼터 (낙폭 2.2배 커브)',
                batterPerkTitle: '🎯 칼날 컨택트 (Contact 99)',
                batterPerkDesc: '배팅 타이밍 윈도우 +40% 확장! 빗맞아도 안타로 깎아치는 안타 머신',
                power: 78,
                contact: 99,
                contactWindowBonus: 1.40, // 40% 넓은 히트존
                powerBonus: 0,
                speedBonus: 1.0,
                doubleBonus: 1.1,
                fastballSpeed: 135,
                controlSpread: 8,
                curveBonus: 2.2,
                sliderBonus: 1.3,
                skins: {
                    classic: { id: 'classic', name: '에메랄드 핀스트라이프', jersey: '#16a34a', cap: '#14532d', stripe: '#bbf7d0', icon: '🟢' },
                    cyber: { id: 'cyber', name: '네온 사이버 유니폼', jersey: '#06b6d4', cap: '#0e7490', stripe: '#a5f3fc', icon: '⚡' },
                    retro: { id: 'retro', name: '포레스트 올드스쿨', jersey: '#15803d', cap: '#052e16', stripe: '#fef08a', icon: '🌲' }
                }
            },
            penguin: {
                id: 'penguin',
                name: '펭귄',
                roleName: '초고속 스프레이 히터',
                emoji: '🐧',
                pitchStyle: 'sidearm',
                pitchStyleName: '사이드암 (스위핑 슬라이더)',
                batterPerkTitle: '🌪️ 총알 배트스피드 (Clutch 95)',
                batterPerkDesc: '배트 스피드 +40%, 외야 갭을 뚫는 2루타/3루타 확률 2배 특화',
                power: 88,
                contact: 92,
                contactWindowBonus: 1.18,
                powerBonus: 12,
                speedBonus: 1.10,
                doubleBonus: 2.0, // 2루타 확률 2배
                fastballSpeed: 144,
                controlSpread: 12,
                curveBonus: 1.2,
                sliderBonus: 2.3,
                skins: {
                    classic: { id: 'classic', name: '호스 딥 네이비', jersey: '#1e3a8a', cap: '#0f172a', stripe: '#60a5fa', icon: '🔵' },
                    frost: { id: 'frost', name: '프로스트 실버 아이스', jersey: '#475569', cap: '#1e293b', stripe: '#e2e8f0', icon: '❄️' },
                    marine: { id: 'marine', name: '마린 로열 블루', jersey: '#2563eb', cap: '#1e1b4b', stripe: '#facc15', icon: '⚓' }
                }
            },
            monkey: {
                id: 'monkey',
                name: '원숭이',
                roleName: '황금 5툴 올라운더 타격왕',
                emoji: '🐵',
                pitchStyle: 'windup',
                pitchStyleName: '클래식 윈드업 (완전 육각형)',
                batterPerkTitle: '👑 황금 5툴 (Balanced 94)',
                batterPerkDesc: '파워+컨택트 완벽 조화, 마구/변화구 대처 능력 +30%, 높은 출루율',
                power: 92,
                contact: 94,
                contactWindowBonus: 1.25,
                powerBonus: 16,
                speedBonus: 1.08,
                doubleBonus: 1.35,
                fastballSpeed: 148,
                controlSpread: 12,
                curveBonus: 1.35,
                sliderBonus: 1.35,
                skins: {
                    classic: { id: 'classic', name: '골든 바나나 스트라이프', jersey: '#facc15', cap: '#854d0e', stripe: '#1a1612', icon: '🍌' },
                    stealth: { id: 'stealth', name: '블랙 옵스 스텔스', jersey: '#1e293b', cap: '#020617', stripe: '#ea580c', icon: '⚫' },
                    vintage: { id: 'vintage', name: '1982 레트로 빈티지', jersey: '#f1f5f9', cap: '#b91c1c', stripe: '#dc2626', icon: '🧢' }
                }
            }
        };

        // 1P (나) 팀 정보
        this.p1 = {
            name: '나 (플레이어)',
            char: safeGetStorage('smilegames_bb_user_char', 'tiger'),
            skin: safeGetStorage('smilegames_bb_user_skin', 'classic'),
            score: 0,
            hits: 0,
            homeRuns: 0
        };

        // 2P (상대 라이벌) 팀 정보
        this.p2 = {
            name: '상대 라이벌',
            char: 'monkey',
            skin: 'classic',
            score: 0,
            hits: 0,
            homeRuns: 0,
            isAI: true
        };

        // 💎 야구 다이아몬드 베이스 상황 (1루, 2루, 3루 주자)
        this.bases = {
            first: false,
            second: false,
            third: false
        };

        // ⚾ 경기 진행 상태 (1회초 / 1회말)
        this.inningHalf = 'top'; // 'top' (1회초) | 'bottom' (1회말)
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.maxDistance = 0;

        // 🌐 서버 매칭 상태 머신
        this.isMatching = false;
        this.matchCountdown = 10;
        this.matchTimerId = null;
        this.broadcastChannel = null;
        try {
            if (typeof window !== 'undefined' && window.BroadcastChannel) {
                this.broadcastChannel = new BroadcastChannel('smile_baseball_duel');
            }
        } catch (e) {}

        // 투수 조준 & 구종
        this.selectedPitchType = 'fastball'; // 'fastball' | 'curve' | 'slider' | 'changeup' | 'fireball'
        this.pitchAimX = 0;
        this.pitchAimY = 44;

        // 🎥 다이내믹 3D 카메라
        // userRole === 'batter': 포수 뒤에서 투수를 향해 바라보는 MLB 26 정통 배터 뷰
        // userRole === 'pitcher': 투수 마운드 뒤에서 홈플레이트를 바라보는 피처 뷰
        this.camera = {
            x: 0,
            y: 56,
            z: 480,
            fov: 360,
            shake: 0
        };

        // 투수 모델 (z=80 마운드 위)
        this.pitcher = {
            x: 0,
            y: 14,
            z: 80,
            phase: 'ready', // 'ready' | 'windup' | 'release' | 'follow'
            phaseTimer: 0,
            animTimer: 0,
            legKick: 0,
            armAngle: 0
        };

        // 타자 모델 (홈플레이트 z=380 옆 우타자석 x=55)
        this.batter = {
            x: 55,
            y: 0,
            z: 380,
            isSwinging: false,
            swingTime: 0,
            swingDuration: 0.22,
            swingProgress: 0,
            idleTimer: 0
        };

        // 포수 & 심판
        this.catcher = { x: 0, y: 0, z: 415 };
        this.umpire = { x: 0, y: 10, z: 445 };

        // 날아가는 야구공
        this.ball = {
            active: false,
            x: 0,
            y: 46,
            z: 85,
            vx: 0,
            vy: 0,
            vz: 0,
            radius: 8.5,
            rot: 0,
            type: 'fastball',
            speedKmh: 161,
            targetX: 0,
            targetY: 44,
            isHit: false,
            hitType: null,
            flightTimer: 0,
            hitDist: 0
        };

        // 게임 상태 머신
        this.gameState = 'aiming'; // 'aiming' | 'windup' | 'in_flight' | 'hit_flight' | 'result_pause' | 'game_over'
        this.stateTimer = 0;

        // 파티클 & 불꽃놀이 & 배너
        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerSub = '';
        this.bannerColor = '#facc15';
        this.bannerAlpha = 0;

        this.radarTimeout = null;
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
        this.setupBroadcastChannel();
        this.updateHUD();
        this.isInitialized = true;
        this.render(); // 초기 캔버스 즉시 렌더링
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

    setupBroadcastChannel() {
        if (!this.broadcastChannel) return;
        this.broadcastChannel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;

            // 상대 유저가 매칭 대기 중인 경우 실시간 피어 매칭 성사!
            if (data.type === 'FIND_RIVAL' && this.isMatching) {
                if (data.role !== this.userRole) {
                    this.completeMatchmaking(data.userName, data.char, data.skin, false);
                    this.broadcastChannel.postMessage({
                        type: 'MATCH_ACCEPTED',
                        userName: this.p1.name,
                        char: this.p1.char,
                        skin: this.p1.skin
                    });
                }
            } else if (data.type === 'MATCH_ACCEPTED' && this.isMatching) {
                this.completeMatchmaking(data.userName, data.char, data.skin, false);
            }
        };
    }

    bindEvents() {
        window.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });

        // ⌨️ 키보드 조작
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            this.ensureAudio();

            const isCurrentPitcher = (this.userRole === 'pitcher');

            // --- 투수 조작 모드 ---
            if (isCurrentPitcher && this.gameState === 'aiming') {
                if (e.key === '1') this.selectPitchType('fastball');
                if (e.key === '2') this.selectPitchType('curve');
                if (e.key === '3') this.selectPitchType('slider');
                if (e.key === '4') this.selectPitchType('changeup');
                if (e.key === '5') this.selectPitchType('fireball');

                // WASD 코스 조준
                if (e.key === 'a' || e.key === 'A') this.pitchAimX = Math.max(-28, this.pitchAimX - 6);
                if (e.key === 'd' || e.key === 'D') this.pitchAimX = Math.min(28, this.pitchAimX + 6);
                if (e.key === 'w' || e.key === 'W') this.pitchAimY = Math.min(68, this.pitchAimY + 6);
                if (e.key === 's' || e.key === 'S') this.pitchAimY = Math.max(20, this.pitchAimY - 6);

                // 투구 발사 (F 키 또는 Space)
                if (e.code === 'KeyF' || e.code === 'Space') {
                    e.preventDefault();
                    this.startPitchWindup();
                }
            }

            // --- 타자 조작 모드 ---
            if (!isCurrentPitcher || this.userRole === 'batter') {
                if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyL') {
                    e.preventDefault();
                    this.triggerBatterSwing();
                }
            }
        });

        // 캔버스 클릭 시
        if (this.canvas) {
            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                this.ensureAudio();
                if (this.userRole === 'pitcher' && this.gameState === 'aiming') {
                    this.startPitchWindup();
                } else {
                    this.triggerBatterSwing();
                }
            });
        }

        // 타자 스윙 원클릭 버튼
        const swingBtn = document.getElementById('btn-baseball-swing');
        if (swingBtn) {
            swingBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                this.ensureAudio();
                this.triggerBatterSwing();
            });
        }

        // 투수 투구 버튼
        const pitchThrowBtn = document.getElementById('btn-pitch-throw');
        if (pitchThrowBtn) {
            pitchThrowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ensureAudio();
                if (this.gameState === 'aiming') this.startPitchWindup();
            });
        }

        // 구종 선택 버튼들
        const pitchBtns = document.querySelectorAll('.mlb-pitch-btn');
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

        // 역할 변경 버튼 (투수 <-> 타자)
        const roleToggleBtn = document.getElementById('btn-baseball-role-toggle');
        if (roleToggleBtn) {
            roleToggleBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.toggleUserRole();
            });
        }

        // 온라인 매칭 룸 모달 열기 버튼
        const matchModalBtn = document.getElementById('btn-baseball-match-modal');
        if (matchModalBtn) {
            matchModalBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.showCharModal();
            });
        }

        // 다시 경기하기 버튼
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

        this.bindMatchmakingModalEvents();
    }

    bindMatchmakingModalEvents() {
        // 역할 선택 버튼 (투수 / 타자)
        const roleBtns = document.querySelectorAll('.role-btn');
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const r = btn.getAttribute('data-role');
                if (r) {
                    this.userRole = r;
                    safeSetStorage('smilegames_bb_user_role', r);
                    roleBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateCharSelectionUI();
                }
            });
        });

        // 캐릭터 선택 버튼
        const charBtns = document.querySelectorAll('#baseball-user-char-selector .select-btn');
        charBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cId = btn.getAttribute('data-char');
                if (cId) {
                    this.p1.char = cId;
                    this.p1.skin = 'classic';
                    safeSetStorage('smilegames_bb_user_char', cId);
                    safeSetStorage('smilegames_bb_user_skin', 'classic');
                    this.updateCharSelectionUI();
                }
            });
        });

        // 🌐 서버 매칭 대결 시작 버튼 (10초 카운트다운)
        const startMatchBtn = document.getElementById('btn-baseball-start-match');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', () => {
                this.startServerMatchmaking();
            });
        }

        // 🤖 즉시 AI 연습 대결 버튼
        const directAIBtn = document.getElementById('btn-baseball-direct-ai');
        if (directAIBtn) {
            directAIBtn.addEventListener('click', () => {
                this.cancelMatchmaking();
                this.setupChallengerAI();
                this.hideCharModal();
                this.start();
            });
        }

        const modalHubBtn = document.getElementById('btn-baseball-batter-hub');
        if (modalHubBtn) {
            modalHubBtn.addEventListener('click', () => {
                this.cancelMatchmaking();
                this.hideCharModal();
                this.openHubModal();
            });
        }
    }

    startServerMatchmaking() {
        if (this.isMatching) return;
        this.isMatching = true;
        this.matchCountdown = 10;

        const matchBox = document.getElementById('mlb-matchmaking-box');
        const timerEl = document.getElementById('mlb-match-timer');
        const statusEl = document.getElementById('mlb-radar-status');
        const rivalPreview = document.getElementById('mlb-rival-preview');

        if (matchBox) matchBox.style.display = 'block';
        if (rivalPreview) rivalPreview.style.display = 'none';
        if (timerEl) timerEl.textContent = '00:10';
        if (statusEl) statusEl.textContent = '📡 서버 매칭 탐색 중... [10초 후 AI 자동 매칭]';

        // 다른 탭에 매칭 신호 브로드캐스팅
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
                type: 'FIND_RIVAL',
                role: this.userRole,
                userName: this.p1.name,
                char: this.p1.char,
                skin: this.p1.skin
            });
        }

        this.playUmpireWhistle(600, 0.15);

        // 10초 카운트다운 타이머 시작
        if (this.matchTimerId) clearInterval(this.matchTimerId);
        this.matchTimerId = setInterval(() => {
            this.matchCountdown--;
            if (timerEl) {
                timerEl.textContent = `00:${this.matchCountdown < 10 ? '0' : ''}${this.matchCountdown}`;
            }

            if (this.matchCountdown <= 0) {
                clearInterval(this.matchTimerId);
                this.matchTimerId = null;
                // 10초 초과 시 🤖 AI 에이스 라이벌 매칭!
                this.setupChallengerAI();
                this.completeMatchmaking(this.p2.name, this.p2.char, this.p2.skin, true);
            }
        }, 1000);
    }

    completeMatchmaking(rivalName, rivalChar, rivalSkin, isAI = false) {
        if (this.matchTimerId) {
            clearInterval(this.matchTimerId);
            this.matchTimerId = null;
        }

        this.p2.name = rivalName;
        this.p2.char = rivalChar;
        this.p2.skin = rivalSkin;
        this.p2.isAI = isAI;

        const statusEl = document.getElementById('mlb-radar-status');
        const rivalPreview = document.getElementById('mlb-rival-preview');
        const rivalNameEl = document.getElementById('mlb-rival-name');

        if (statusEl) statusEl.textContent = '🔥 매칭 성공! 스타디움으로 입장합니다!';
        if (rivalNameEl) {
            const cObj = this.characters[rivalChar] || this.characters.monkey;
            rivalNameEl.textContent = `${cObj.emoji} ${rivalName}`;
        }
        if (rivalPreview) rivalPreview.style.display = 'flex';

        this.playHomeRunFanfare();

        setTimeout(() => {
            this.isMatching = false;
            const matchBox = document.getElementById('mlb-matchmaking-box');
            if (matchBox) matchBox.style.display = 'none';
            this.hideCharModal();
            this.start();
        }, 1200);
    }

    cancelMatchmaking() {
        this.isMatching = false;
        if (this.matchTimerId) {
            clearInterval(this.matchTimerId);
            this.matchTimerId = null;
        }
        const matchBox = document.getElementById('mlb-matchmaking-box');
        if (matchBox) matchBox.style.display = 'none';
    }

    setupChallengerAI() {
        const pool = [
            { name: 'KIA_에이스_김지훈', char: 'tiger', skin: 'classic' },
            { name: '마구장인_박주아', char: 'frog', skin: 'cyber' },
            { name: '사이드암_최우영', char: 'penguin', skin: 'classic' },
            { name: '4번거포_전준우', char: 'monkey', skin: 'classic' },
            { name: '흥덕초_에이스_이수', char: 'tiger', skin: 'away' }
        ];
        // 나의 캐릭터와 다른 캐릭터 우선 선택
        const available = pool.filter(p => p.char !== this.p1.char);
        const pick = (available.length > 0) ? available[Math.floor(Math.random() * available.length)] : pool[0];

        this.p2.name = `🤖 [AI] ${pick.name}`;
        this.p2.char = pick.char;
        this.p2.skin = pick.skin;
        this.p2.isAI = true;
    }

    setUserRole(role) {
        if (role !== 'batter' && role !== 'pitcher') return;
        this.userRole = role;
        safeSetStorage('smilegames_bb_user_role', this.userRole);
        this.resetCamera();
        this.updateHUD();
        this.showResultBanner(
            (this.userRole === 'batter') ? '🏏 타자 모드 (포수 뒤 시점) ON' : '⚾ 투수 모드 (마운드 뒤 시점) ON',
            (this.userRole === 'batter') ? '공이 정면으로 날아옵니다! [Enter]로 타격!' : '[WASD]로 코스를 노리고 [Space]로 투구!',
            '#38bdf8'
        );
        this.prepareNextPitch(0.6);
    }

    setRole(role) {
        this.setUserRole(role);
    }

    toggleUserRole() {
        this.setUserRole((this.userRole === 'batter') ? 'pitcher' : 'batter');
    }

    start() {
        this.init();
        this.resize();
        this.ensureAudio();

        // 점수 및 카운트 초기화
        this.p1.score = 0;
        this.p1.hits = 0;
        this.p1.homeRuns = 0;

        this.p2.score = 0;
        this.p2.hits = 0;
        this.p2.homeRuns = 0;

        // 💎 베이스 주자 초기화 (주자 없음)
        this.bases.first = false;
        this.bases.second = false;
        this.bases.third = false;

        this.inningHalf = 'top';
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

        const rText = (this.userRole === 'batter') ? '🏏 타자 타석 입장! (포수 뒤 시점)' : '⚾ 투수 마운드 등판! (투수 뒤 시점)';
        this.showResultBanner('⚾ PLAY BALL! MLB 26 개막 ⚾', rText, '#38bdf8');
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    resetCamera() {
        if (this.userRole === 'batter') {
            // 🏏 타자 시점: 포수/홈플레이트 뒤에서 투수 마운드를 정면으로 바라봄 (MLB The Show 26)
            this.camera.x = 0;
            this.camera.y = 56;
            this.camera.z = 480;
            this.camera.fov = 360;
        } else {
            // ⚾ 투수 시점: 투수 마운드 뒤에서 홈플레이트를 향해 바라봄
            this.camera.x = 0;
            this.camera.y = 74;
            this.camera.z = -75;
            this.camera.fov = 360;
        }
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

        // 타자 모드일 때: 상대 컴퓨터(AI 투수)가 자동으로 구종과 코스를 정하고 투구!
        if (this.userRole === 'batter') {
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'aiming') {
                    const opponentPitcher = this.getCurrentPitcher();
                    const types = ['fastball', 'curve', 'slider', 'changeup', 'fireball'];
                    // 특화 구종 가중치 부여
                    if (opponentPitcher.id === 'frog' && Math.random() < 0.45) this.selectedPitchType = 'curve';
                    else if (opponentPitcher.id === 'penguin' && Math.random() < 0.45) this.selectedPitchType = 'slider';
                    else if (opponentPitcher.id === 'tiger' && Math.random() < 0.50) this.selectedPitchType = 'fastball';
                    else this.selectedPitchType = types[Math.floor(Math.random() * types.length)];

                    // 스트라이크존 중심으로 조준
                    this.pitchAimX = (Math.random() - 0.5) * 36;
                    this.pitchAimY = 32 + Math.random() * 26;
                    this.startPitchWindup();
                }
            }, 750);
        }
    }

    startPitchWindup() {
        if (this.gameState !== 'aiming') return;
        this.gameState = 'windup';
        this.pitcher.phase = 'windup';
        this.pitcher.phaseTimer = 0;
        this.playPitchWindupSound();
    }

    pitch() {
        this.startPitchWindup();
    }

    throwPitch() {
        this.startPitchWindup();
    }

    releasePitch() {
        const pitcherChar = this.getCurrentPitcher();
        const pType = this.selectedPitchType;

        // 구종별 초고속 구속 계산 (156~172km/h)
        let baseSpeed = pitcherChar.fastballSpeed;
        if (pType === 'curve') baseSpeed = 136;
        if (pType === 'slider') baseSpeed = 146;
        if (pType === 'changeup') baseSpeed = 124;
        if (pType === 'fireball') baseSpeed = 172; // 황금 불꽃 마구!

        const finalSpeed = Math.round(baseSpeed + (Math.random() - 0.5) * 6);
        const spread = pitcherChar.controlSpread;
        const actualTargetX = this.pitchAimX + (Math.random() - 0.5) * spread;
        const actualTargetY = this.pitchAimY + (Math.random() - 0.5) * spread;

        // 비행 시간 단축 (0.36초 ~ 0.44초의 팽팽한 리얼 스피드)
        const flightDuration = (150 / finalSpeed) * 0.40;
        const releaseX = 0;
        const releaseY = 46;
        const releaseZ = 85;
        const targetZ = 380;

        const vz = (targetZ - releaseZ) / flightDuration;
        const vx = (actualTargetX - releaseX) / flightDuration;
        const vy = (actualTargetY - releaseY) / flightDuration;

        this.ball = {
            active: true,
            speedKm: finalSpeed,
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

        // 스피드건 레이더 팝업 표시
        const pNameMap = {
            fastball: '4-SEAM FASTBALL',
            curve: '12-6 POWER CURVE',
            slider: 'SHARP SLIDER',
            changeup: 'SINKING CHANGEUP',
            fireball: '🔥 GOLDEN FIREBALL'
        };
        this.showRadarGun(finalSpeed, pNameMap[pType] || 'FASTBALL');

        // 투수 모드일 때: 상대 컴퓨터(AI 타자)가 타이밍 맞춰 스윙!
        if (this.userRole === 'pitcher') {
            const aiSwingDelay = flightDuration * (0.86 + (Math.random() - 0.5) * 0.24);
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'in_flight') {
                    this.triggerBatterSwing();
                }
            }, aiSwingDelay * 1000);
        }
    }

    showRadarGun(speed, pitchName) {
        const popup = document.getElementById('mlb-radar-popup');
        const speedEl = document.getElementById('mlb-radar-speed');
        const pitchEl = document.getElementById('mlb-radar-pitch');

        if (popup && speedEl && pitchEl) {
            speedEl.textContent = `${speed} KM/H`;
            pitchEl.textContent = pitchName;
            popup.style.display = 'block';

            if (this.radarTimeout) clearTimeout(this.radarTimeout);
            this.radarTimeout = setTimeout(() => {
                popup.style.display = 'none';
            }, 1800);
        }
    }

    triggerBatterSwing() {
        if (this.batter.isSwinging) return;
        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        if (this.gameState === 'in_flight' && this.ball.active && !this.ball.isHit) {
            this.checkBatContact();
        }
    }

    swing() {
        this.triggerBatterSwing();
    }

    bat() {
        this.triggerBatterSwing();
    }

    checkBatContact() {
        const b = this.ball;
        const z = b.z;
        const batterChar = this.getCurrentBatter();

        // 🐾 타자별 고유 장점(Perk) 적용:
        // 개구리는 컨택트 99 (+40% 넓은 판정 윈도우)
        const baseWindow = 28;
        const contactRange = Math.round(baseWindow * (batterChar.contactWindowBonus || 1.0));
        const sweetSpotZ = 380;
        const diffZ = Math.abs(z - sweetSpotZ);

        if (diffZ <= contactRange) {
            b.isHit = true;
            this.gameState = 'hit_flight';

            // 1. 💥 PERFECT CONTACT: 초대형 홈런! (오차 10 이하 또는 호걸이)
            if (diffZ <= 11) {
                b.hitType = 'homerun';
                let dist = Math.round(125 + (batterChar.powerBonus || 0) + Math.random() * 22);
                if (b.type === 'fireball') dist += 20;

                b.hitDist = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                // 💎 주자 전원 득점 계산 (만루홈런, 3점, 2점, 솔로홈런)
                const scoredRuns = this.advanceRunnersOnHit('homerun');
                this.addScore(scoredRuns, 'homerun');

                b.vz = -580 - Math.random() * 80;
                b.vy = 340 + Math.random() * 60;
                b.vx = (Math.random() - 0.5) * 140;

                this.camera.shake = 22;
                this.playBatHitSound('homerun');
                this.triggerHomeRunCelebration(dist, scoredRuns);
            }
            // 2. 🎯 GREAT CONTACT: 2루타 / 3루타 / 안타
            else if (diffZ <= 23) {
                // 펭귄은 2루타 확률 2배
                const isDouble = (Math.random() < 0.45 * (batterChar.doubleBonus || 1.0));
                const hitType = isDouble ? 'double' : 'single';
                b.hitType = hitType;

                const dist = isDouble ? Math.round(92 + Math.random() * 28) : Math.round(65 + Math.random() * 24);
                b.hitDist = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                const scoredRuns = this.advanceRunnersOnHit(hitType);
                this.addScore(scoredRuns, hitType);

                b.vz = -420 - Math.random() * 60;
                b.vy = 130 + Math.random() * 40;
                b.vx = (Math.random() - 0.5) * 220;

                this.camera.shake = 10;
                this.playBatHitSound('hit');
                const titleText = isDouble ? '🌪️ 2루타! 외야를 가르는 총알 라인드라이브!' : '⚾ 1루타 클린 안타 성공!';
                const subText = (scoredRuns > 0) ? `주자 홈인! (+${scoredRuns}점 득점)` : `주자 진루 (비거리 ${dist}m)`;
                this.showResultBanner(titleText, subText, '#38bdf8');
            }
            // 3. ⚠️ 파울 플라이
            else {
                b.hitType = 'foul';
                b.vz = -110;
                b.vy = 240;
                b.vx = (z > sweetSpotZ) ? -320 : 320;

                if (this.strikes < 2) this.strikes++;
                this.playBatHitSound('foul');
                this.showResultBanner('⚠️ 관중석 파울볼!', '2스트라이크 이전 파울 (+1 스트라이크)', '#f59e0b');
            }

            this.createHitSparks(b.x, b.y, b.z);
            this.updateHUD();
        }
    }

    /**
     * 💎 야구 다이아몬드 베이스 주자 진루 및 득점 계산 로직
     */
    advanceRunners(hitType) {
        return this.advanceRunnersOnHit(hitType);
    }

    advanceRunnersOnHit(hitType) {
        let scored = 0;

        if (hitType === 'homerun') {
            scored = 1; // 타자 본인
            if (this.bases.first) { scored++; this.bases.first = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.third) { scored++; this.bases.third = false; }
        } else if (hitType === 'triple') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.first) { scored++; this.bases.first = false; }
            this.bases.third = true;
        } else if (hitType === 'double') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.first) { this.bases.third = true; this.bases.first = false; }
            this.bases.second = true;
        } else if (hitType === 'single') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { this.bases.third = true; this.bases.second = false; }
            if (this.bases.first) { this.bases.second = true; this.bases.first = false; }
            this.bases.first = true;
        } else if (hitType === 'walk') {
            if (this.bases.first && this.bases.second && this.bases.third) {
                scored++; // 밀어내기 득점!
            } else if (this.bases.first && this.bases.second) {
                this.bases.third = true;
            } else if (this.bases.first) {
                this.bases.second = true;
            }
            this.bases.first = true;
        }

        return scored;
    }

    addScore(runs, type) {
        const isUserAttacking = (this.userRole === 'batter');
        if (isUserAttacking) {
            this.p1.score += runs;
            if (type === 'homerun') this.p1.homeRuns++;
            else this.p1.hits++;
        } else {
            this.p2.score += runs;
            if (type === 'homerun') this.p2.homeRuns++;
            else this.p2.hits++;
        }
        this.updateHUD();
    }

    update(dt) {
        const pitcherChar = this.getCurrentPitcher();

        // 🏏 자연스러운 3D 타자 스윙 (스탠스 -> 스트라이드 -> 힙턴 -> 래그 -> 익스텐션 & 팔로스루)
        if (this.batter.isSwinging) {
            this.batter.swingTime += dt;
            const progress = Math.min(1, this.batter.swingTime / this.batter.swingDuration);
            this.batter.swingProgress = progress;
            if (progress >= 1) {
                this.batter.isSwinging = false;
                this.batter.swingProgress = 0;
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
            this.pitcher.phaseTimer += dt * 3;
        } else if (this.gameState === 'windup') {
            this.pitcher.phaseTimer += dt;
            if (this.pitcher.phaseTimer >= 0.72) {
                this.releasePitch();
            }
        } else if (this.gameState === 'in_flight') {
            const b = this.ball;
            b.flightTimer += dt;

            // 🌀 극적인 3D 마구 물리 역학
            if (b.type === 'curve') {
                // 파워 커브: 12-6 급낙폭 2.2배!
                const cMult = pitcherChar.curveBonus || 1.8;
                b.vy -= 72 * cMult * dt;
                b.vx += Math.sin(b.flightTimer * 12) * 18 * dt;
            } else if (b.type === 'slider') {
                // 슬라이더: 횡으로 날카롭게 55+ 꺾임!
                const sMult = pitcherChar.sliderBonus || 2.0;
                b.vx -= 68 * sMult * dt;
                b.vy -= 18 * dt;
            } else if (b.type === 'changeup') {
                // 체인지업: 홈플레이트 앞에서 급감속 & 싱킹
                if (b.z > 220) {
                    b.vz *= 0.975;
                    b.vy -= 32 * dt;
                }
            } else if (b.type === 'fireball') {
                this.createFireballTrail(b.x, b.y, b.z);
            }

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            b.rot += dt * 34;

            // 포수 미트 포구 (미타격 시)
            if (b.z >= 405 && !b.isHit) {
                b.active = false;
                this.handlePitchMissResult(b.targetX, b.targetY);
            }
        } else if (this.gameState === 'hit_flight') {
            const b = this.ball;
            b.flightTimer += dt;

            b.vy -= 170 * dt;
            b.vx *= 0.995;
            b.vz *= 0.995;

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;

            // 홈런/타구 시 다이내믹 카메라 트래킹
            if (this.userRole === 'batter') {
                this.camera.x += (b.x * 0.25 - this.camera.x) * 4 * dt;
                this.camera.y += (56 + Math.max(0, (b.y - 40) * 0.3) - this.camera.y) * 4 * dt;
            }

            if (b.y <= 0 || b.z <= -380) {
                b.active = false;
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
            }
        } else if (this.gameState === 'result_pause') {
            this.stateTimer -= dt;
            this.resetCamera();

            if (this.stateTimer <= 0) {
                this.prepareNextPitch(0.8);
            }
        }

        // 파티클 & 폭죽 갱신
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

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

        if (this.bannerAlpha > 0) {
            this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.45);
        }
    }

    handlePitchMissResult(tx, ty) {
        // 스트라이크존 규격: x [-24, 24], y [22, 66]
        const inZone = (Math.abs(tx) <= 24 && ty >= 22 && ty <= 66);

        if (inZone) {
            this.strikes++;
            this.playCatchSound();
            this.playUmpireWhistle(1400, 0.2);

            if (this.strikes >= 3) {
                this.recordOut('💨 3구 삼진 아웃! (STRIKE OUT!)');
            } else {
                this.showResultBanner('⚡ 스트라이크! (STRIKE)', `카운트: ${this.balls}B - ${this.strikes}S`, '#facc15');
                this.gameState = 'result_pause';
                this.stateTimer = 1.3;
            }
        } else {
            this.balls++;
            this.playCatchSound();

            if (this.balls >= 4) {
                const scored = this.advanceRunnersOnHit('walk');
                this.addScore(scored, 'walk');
                this.balls = 0;
                this.strikes = 0;
                const msg = (scored > 0) ? '🚶 밀어내기 4구 볼넷! (+1점 득점)' : '🚶 4구 볼넷! 1루 출루 성공!';
                this.showResultBanner(msg, '침착한 선구안으로 출루!', '#38bdf8');
                this.gameState = 'result_pause';
                this.stateTimer = 1.6;
            } else {
                this.showResultBanner('⚪ 볼! (BALL)', `카운트: ${this.balls}B - ${this.strikes}S`, '#94a3b8');
                this.gameState = 'result_pause';
                this.stateTimer = 1.1;
            }
        }
        this.updateHUD();
    }

    recordOut(reason = '아웃!') {
        this.outs++;
        this.strikes = 0;
        this.balls = 0;
        this.updateHUD();

        if (this.outs >= 3) {
            // 3아웃 공수교대 (또는 정규 경기 종료)
            if (this.inningHalf === 'top') {
                this.inningHalf = 'bottom';
                this.outs = 0;
                this.bases.first = false;
                this.bases.second = false;
                this.bases.third = false;
                this.showResultBanner('🔄 3아웃 공수 교대! (1회말 시작)', '마지막 역전의 기회!', '#4ade80');
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
            } else {
                this.gameOver();
            }
        } else {
            this.showResultBanner(reason, `아웃 카운트: [${this.outs} / 3 아웃]`, '#ef4444');
            this.gameState = 'result_pause';
            this.stateTimer = 1.5;
        }
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.width, this.height);

        let shakeX = 0, shakeY = 0;
        if (this.camera.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.camera.shake;
            shakeY = (Math.random() - 0.5) * this.camera.shake;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 1. 경기장 배경 (하늘, 스타디움 관중석, 외야 펜스 및 100m-120m-100m 거리 표지)
        this.renderStadiumAtmosphere(ctx);

        // 2. 💎 3D 다이아몬드 베이스 (홈, 1루, 2루, 3루 흙 주로 & 베이스백)
        this.renderDiamondAndBases(ctx);

        // 3. 3D 스트라이크존 박스 & 과녁
        this.renderStrikeZoneBox(ctx);

        // 4. 캐릭터 및 볼 렌더링 (Z-Sort 순서로 카메라에 맞게 그리기)
        if (this.userRole === 'batter') {
            // 🏏 타자 시점 (포수 뒤 뷰):
            // 투수(z=80 마운드 먼거리) -> 공 -> 스트라이크존 -> 타자(z=380 앞쪽 우타석)
            this.renderPitcher(ctx, true); // 먼 거리 정면 투수
            if (this.ball.active) this.renderBall(ctx);
            this.renderBatter(ctx, true);  // 근거리 타자 (MLB The Show)
        } else {
            // ⚾ 투수 시점 (마운드 뒤 뷰):
            // 포수/심판(z=415) -> 타자(z=380) -> 공 -> 투수(z=80 마운드 앞)
            this.renderCatcherAndUmpire(ctx);
            this.renderBatter(ctx, false);
            if (this.ball.active) this.renderBall(ctx);
            this.renderPitcher(ctx, false);
        }

        // 5. 파티클 & 불꽃놀이
        this.renderEffects(ctx);

        // 6. 결과 팝업 배너
        this.renderResultBanner(ctx);

        ctx.restore();
    }

    /**
     * 3D 좌표 -> 2D 화면 투영 (타자 시점 vs 투수 시점 완벽 분기)
     */
    project(x, y, z) {
        const cam = this.camera;
        let scale = 1.0;

        if (this.userRole === 'batter') {
            // 🏏 타자 시점: 카메라가 z=480(포수 뒤)에 있고 z=80(투수)을 정면으로 바라봄
            const relZ = Math.max(15, cam.z - z);
            scale = cam.fov / relZ;
            const screenX = this.width / 2 + (x - cam.x) * scale;
            const screenY = this.height * 0.54 - (y - cam.y) * scale;
            return { x: screenX, y: screenY, scale: scale };
        } else {
            // ⚾ 투수 시점: 카메라가 z=-75에 있고 z=380(홈플레이트)을 바라봄
            const relZ = Math.max(15, z - cam.z);
            scale = cam.fov / relZ;
            const screenX = this.width / 2 + (x - cam.x) * scale;
            const screenY = this.height * 0.54 - (y - cam.y) * scale;
            return { x: screenX, y: screenY, scale: scale };
        }
    }

    renderStadiumAtmosphere(ctx) {
        // [1] 상단 푸른 하늘 그라데이션
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.45);
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(1, '#7dd3fc');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height * 0.45);

        // [2] 거대 외야 펜스 / 백스탑 벽 (z=-350 타자시점 / z=520 투수시점)
        const wallZ = (this.userRole === 'batter') ? -260 : 520;
        const pTL = this.project(-420, 220, wallZ);
        const pTR = this.project(420, 220, wallZ);
        const pBL = this.project(-420, 0, wallZ);
        const pBR = this.project(420, 0, wallZ);

        // 벽돌 백스탑 벽
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();
        ctx.fill();

        // 외야 거리 펜스 표지판 (100m - 120m - 100m)
        if (this.userRole === 'batter') {
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            const centerM = this.project(0, 48, wallZ);
            const leftM = this.project(-200, 48, wallZ);
            const rightM = this.project(200, 48, wallZ);
            ctx.fillText('⚾ 120M ⚾', centerM.x, centerM.y);
            ctx.fillText('100M', leftM.x, leftM.y);
            ctx.fillText('100M', rightM.x, rightM.y);
        }

        // 스타디움 관중석 칠색 도트 관중
        for (let r = 0; r < 4; r++) {
            const gy = pTL.y + 14 + r * 12;
            for (let c = 0; c < 34; c++) {
                const gx = pTL.x + (pTR.x - pTL.x) * (c / 34);
                ctx.fillStyle = (c + r) % 3 === 0 ? '#ef4444' : ((c + r) % 3 === 1 ? '#38bdf8' : '#facc15');
                ctx.fillRect(gx, gy, 5, 5);
            }
        }

        // [3] 그라운드 잔디 (천연 잔디)
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * 💎 야구 다이아몬드 베이스 (홈, 1루, 2루, 3루 흙 주로 & 베이스백 & 주자)
     */
    renderDiamondAndBases(ctx) {
        // 다이아몬드 주요 좌표:
        // 홈: (0, 0, 380) / 1루: (130, 0, 230) / 2루: (0, 0, 90) / 3루: (-130, 0, 230)
        const pHome = this.project(0, 0, 380);
        const p1B   = this.project(130, 0, 230);
        const p2B   = this.project(0, 0, 90);
        const p3B   = this.project(-130, 0, 230);

        // 1. 다이아몬드 내야 흙 주로 (Dirt Infield Track)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(p1B.x, p1B.y);
        ctx.lineTo(p2B.x, p2B.y);
        ctx.lineTo(p3B.x, p3B.y);
        ctx.closePath();
        ctx.lineWidth = 14 * pHome.scale;
        ctx.strokeStyle = '#b45309';
        ctx.stroke();

        // 백색 파울라인 (홈 -> 1루, 홈 -> 3루)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2 * pHome.scale;
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p1B.x, p1B.y);
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p3B.x, p3B.y);
        ctx.stroke();

        // 2. 홈플레이트 주변 부채꼴 흙
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(pHome.x, pHome.y, 80 * pHome.scale, 28 * pHome.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 홈플레이트 백색 오각형
        const hs = pHome.scale;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 6 * hs);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 16 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 16 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 6 * hs);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. 3D 사각 베이스백 (1루, 2루, 3루)
        const renderBaseBag = (pt, isOccupied, label) => {
            const bs = pt.scale;
            const bw = 14 * bs;
            const bh = 14 * bs;

            ctx.save();
            ctx.translate(pt.x, pt.y);

            // 베이스백 입체 사각 쿠션
            ctx.fillStyle = isOccupied ? '#facc15' : '#ffffff';
            ctx.beginPath();
            ctx.rect(-bw / 2, -bh / 2, bw, bh);
            ctx.fill();
            ctx.strokeStyle = isOccupied ? '#b45309' : '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 주자 탑승 시 헬멧 쓴 주자 미니 3D 렌더링
            if (isOccupied) {
                ctx.fillStyle = '#dc2626'; // 빨간 타자 헬멧
                ctx.beginPath();
                ctx.arc(0, -bh * 0.9, 7 * bs, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(8 * bs)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('🏃', 0, -bh * 0.6);
            }
            ctx.restore();
        };

        renderBaseBag(p1B, this.bases.first, '1B');
        renderBaseBag(p2B, this.bases.second, '2B');
        renderBaseBag(p3B, this.bases.third, '3B');
    }

    renderStrikeZoneBox(ctx) {
        // 스트라이크존 z=380, x: -24 ~ 24, y: 22 ~ 66
        const szTL = this.project(-24, 66, 380);
        const szTR = this.project(24, 66, 380);
        const szBL = this.project(-24, 22, 380);
        const szBR = this.project(24, 22, 380);
        const szW = szTR.x - szTL.x;
        const szH = szBL.y - szTL.y;

        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.88)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 9;
        ctx.strokeRect(szTL.x, szTL.y, szW, szH);

        // 3x3 격자선
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
        ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

        // 투수 조준선 과녁 (투수 모드 시 표시)
        if (this.userRole === 'pitcher' && this.gameState === 'aiming') {
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

            ctx.beginPath();
            ctx.moveTo(aimPt.x - 14 * aimPt.scale, aimPt.y);
            ctx.lineTo(aimPt.x + 14 * aimPt.scale, aimPt.y);
            ctx.moveTo(aimPt.x, aimPt.y - 14 * aimPt.scale);
            ctx.lineTo(aimPt.x, aimPt.y + 14 * aimPt.scale);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * 3D 투수 렌더링
     * @param {boolean} isFacingFront - 타자 시점일 때는 정면으로 던지는 모습을, 투수 시점일 때는 뒷모습을 그림
     */
    renderPitcher(ctx, isFacingFront) {
        const pit = this.pitcher;
        const pChar = this.getCurrentPitcher();
        const pSkin = this.getCurrentPitcherSkin();

        // 마운드 위치 (0, 14, 80)
        const pp = this.project(pit.x, pit.y, pit.z);
        const s = pp.scale;
        const h = 95 * s;
        const w = 44 * s;

        ctx.save();
        ctx.translate(pp.x, pp.y);

        // 투수 마운드 흙 언덕
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, 6 * s, 46 * s, 16 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 투수판 (고무 플레이트)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-12 * s, 0, 24 * s, 4 * s);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(-12 * s, 0, 24 * s, 4 * s);

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 5 * s, 20 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. 와인드업 킥 모션 (다리 들기)
        let legKickY = 0;
        if (pit.phase === 'windup') {
            const windupProg = Math.min(1, pit.phaseTimer / 0.72);
            legKickY = -h * 0.38 * Math.sin(windupProg * Math.PI);
        }

        // 지지 다리 (오른다리)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(w * 0.05, -h * 0.42, w * 0.36, h * 0.42);
        ctx.fillStyle = pSkin.jersey;
        ctx.fillRect(w * 0.05, -h * 0.2, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w * 0.02, -h * 0.06, w * 0.42, h * 0.06);

        // 킥하는 앞다리 (왼다리)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.45, -h * 0.42 + legKickY, w * 0.36, h * 0.42 - legKickY);
        ctx.fillStyle = pSkin.jersey;
        ctx.fillRect(-w * 0.45, -h * 0.2 + legKickY, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.48, -h * 0.06 + legKickY, w * 0.42, h * 0.06);

        // 2. 상체 유니폼 (저지)
        ctx.fillStyle = pSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 3. 투구 팔 애니메이션
        let armEndX = 22 * s;
        let armEndY = -h * 0.75;

        if (pit.phase === 'windup') {
            if (pChar.pitchStyle === 'overhand') {
                armEndX = 4 * s;
                armEndY = -h * 1.35; // 머리 위 수직 릴리즈 준비
            } else if (pChar.pitchStyle === 'sidearm') {
                armEndX = 38 * s;
                armEndY = -h * 0.62;
            } else {
                armEndX = 24 * s;
                armEndY = -h * 1.08;
            }
        } else if (pit.phase === 'release') {
            armEndX = 18 * s;
            armEndY = -h * 0.65;
        }

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(w * 0.15, -h * 0.75);
        ctx.lineTo(armEndX, armEndY);
        ctx.stroke();

        // 4. 머리 및 얼굴 (타자 시점이면 정면 얼굴, 투수 시점이면 3/4 등판)
        const headY = -h * 0.94;
        ctx.save();
        ctx.translate(0, headY);

        if (pChar.id === 'tiger') this.drawTigerFace(ctx, s, !isFacingFront, pSkin);
        else if (pChar.id === 'frog') this.drawFrogFace(ctx, s, !isFacingFront, pSkin);
        else if (pChar.id === 'penguin') this.drawPenguinFace(ctx, s, !isFacingFront, pSkin);
        else this.drawMonkeyFace(ctx, s, !isFacingFront, pSkin);

        // 야구 모자
        ctx.fillStyle = pSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 17 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    /**
     * 3D 자연스러운 타자 렌더링 & 스윙
     * @param {boolean} isCloseView - 타자 시점(MLB The Show)일 때는 바로 앞에서 역동적인 스윙을 보여줌
     */
    renderBatter(ctx, isCloseView) {
        const b = this.batter;
        const bChar = this.getCurrentBatter();
        const bSkin = this.getCurrentBatterSkin();

        const bp = this.project(b.x, b.y, b.z);
        const s = bp.scale;
        const h = 92 * s;
        const w = 38 * s;

        ctx.save();
        ctx.translate(bp.x, bp.y);

        // 타자석 분필 박스
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(-w * 0.7, -6 * s, w * 1.4, 30 * s);

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, w * 0.6, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 🏃‍♂️ 자연스러운 3D 스윙 단계 (0%~25% 스트라이드 -> 25%~60% 힙 회전 -> 60%~100% 팔로스루)
        const prog = b.swingProgress;
        let strideX = 0;
        let hipAngle = 0;
        let batAngle = 0;

        if (b.isSwinging) {
            if (prog < 0.25) {
                // 1. 스트라이드 & 로딩
                strideX = -8 * s * (prog / 0.25);
                hipAngle = -0.15;
                batAngle = 0.85;
            } else if (prog < 0.65) {
                // 2. 힙 회전 & 폭발적 배트 래그
                const swingP = (prog - 0.25) / 0.40;
                strideX = -8 * s;
                hipAngle = -0.15 + swingP * 0.75;
                batAngle = 0.85 - swingP * 2.3; // 180도 회전
            } else {
                // 3. 풀 익스텐션 & 하이 팔로스루
                const followP = (prog - 0.65) / 0.35;
                strideX = -8 * s;
                hipAngle = 0.60;
                batAngle = -1.45 - followP * 0.4;
            }
        } else {
            // 대기 자세 (부드러운 배트 웨글 리듬)
            batAngle = 0.70 + Math.sin(b.idleTimer) * 0.12;
        }

        // 다리 & 바지
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.45 + strideX, -h * 0.42, w * 0.38, h * 0.42);
        ctx.fillRect(w * 0.05, -h * 0.42, w * 0.38, h * 0.42);
        ctx.fillStyle = bSkin.jersey;
        ctx.fillRect(-w * 0.45 + strideX, -h * 0.22, w * 0.38, h * 0.1);
        ctx.fillRect(w * 0.05, -h * 0.22, w * 0.38, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.48 + strideX, -h * 0.06, w * 0.42, h * 0.06);
        ctx.fillRect(w * 0.03, -h * 0.06, w * 0.42, h * 0.06);

        // 상체 저지 (회전 포함)
        ctx.save();
        ctx.rotate(hipAngle);
        ctx.fillStyle = bSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 4번 타자 마크
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(bChar.name, 0, -h * 0.66);
        ctx.font = `900 ${Math.round(15 * s)}px sans-serif`;
        ctx.fillText('4', 0, -h * 0.48);
        ctx.restore();

        // 머리 & 타자 헬멧
        const headY = -h * 0.94;
        ctx.save();
        ctx.translate(0, headY);

        if (bChar.id === 'tiger') this.drawTigerFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'frog') this.drawFrogFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'penguin') this.drawPenguinFace(ctx, s, isCloseView, bSkin);
        else this.drawMonkeyFace(ctx, s, isCloseView, bSkin);

        // 야구 헬멧 & 귀마개
        ctx.fillStyle = bSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 17 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.restore();

        // 🏏 배트 스윙 (황금 원목 배트 & 네온 스윙 잔상)
        const batLen = 64 * s;
        ctx.save();
        ctx.translate(-w * 0.2 + strideX * 0.5, -h * 0.65);
        ctx.rotate(batAngle);

        // 스윙 잔상 효과
        if (b.isSwinging) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 14 * s;
            ctx.beginPath();
            ctx.arc(0, 0, batLen, -0.85, 0);
            ctx.stroke();
        }

        // 배트 손잡이 & 배럴
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2 * s, -10 * s, 4 * s, 10 * s);

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

    renderCatcherAndUmpire(ctx) {
        const cp = this.project(this.catcher.x, this.catcher.y, this.catcher.z);
        const cs = cp.scale;
        const ch = 52 * cs;
        const cw = 36 * cs;

        ctx.fillStyle = '#334155';
        ctx.fillRect(cp.x - cw / 2, cp.y - ch * 0.75, cw, ch * 0.65);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cp.x - cw * 0.35, cp.y - ch * 0.65, cw * 0.7, ch * 0.45);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y - ch * 0.88, 12 * cs, 0, Math.PI * 2);
        ctx.fill();

        const mittOffsetX = (this.pitchAimX * 0.35) * cs;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(cp.x + mittOffsetX, cp.y - ch * 0.52, 10 * cs, 12 * cs, 0.15, 0, Math.PI * 2);
        ctx.fill();

        const up = this.project(this.umpire.x, this.umpire.y, this.umpire.z);
        const us = up.scale;
        const uh = 66 * us;
        const uw = 32 * us;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(up.x - uw / 2, up.y - uh * 0.85, uw, uh * 0.8);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(up.x, up.y - uh * 0.98, 10 * us, 0, Math.PI * 2);
        ctx.fill();
    }

    // 🐾 캐릭터 고유 얼굴 렌더러
    drawTigerFace(ctx, s, isFront, skin) {
        [-15 * s, 15 * s].forEach(ex => {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath(); ctx.arc(ex, -16 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.beginPath(); ctx.arc(ex, -16 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#f97316';
        ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.ellipse(-7 * s, 5 * s, 8 * s, 6 * s, 0.2, 0, Math.PI * 2);
        ctx.ellipse(7 * s, 5 * s, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2 * s, -14 * s, 4 * s, 6 * s);

        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -1.5 * s : 1.5 * s), -2 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
        });

        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0, 3 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
    }

    drawFrogFace(ctx, s, isFront, skin) {
        [-13 * s, 13 * s].forEach(ex => {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.arc(ex, -15 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex, -15 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -2 * s : 2 * s), -15 * s, 3.5 * s, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.beginPath();
        ctx.arc(-10 * s, 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.arc(10 * s, 4 * s, 4 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 2 * s, 8 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
    }

    drawPenguinFace(ctx, s, isFront, skin) {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-6 * s, 1 * s, 8 * s, 11 * s, 0.1, 0, Math.PI * 2);
        ctx.ellipse(6 * s, 1 * s, 8 * s, 11 * s, -0.1, 0, Math.PI * 2);
        ctx.fill();

        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 3.8 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex - 1 * s, -3.5 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
        });

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(0, 1 * s);
        ctx.lineTo(isFront ? -8 * s : 8 * s, 5 * s);
        ctx.lineTo(0, 9 * s);
        ctx.closePath();
        ctx.fill();
    }

    drawMonkeyFace(ctx, s, isFront, skin) {
        [-17 * s, 17 * s].forEach(ex => {
            ctx.fillStyle = '#854d0e';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#854d0e';
        ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.ellipse(0, 5 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex, -3 * s, 3.2 * s, 0, Math.PI * 2); ctx.fill();
        });

        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(0, 3 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    }

    renderBall(ctx) {
        const b = this.ball;
        const p = this.project(b.x, b.y, b.z);
        const r = Math.max(5, b.radius * p.scale);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(b.rot);

        if (b.type === 'fireball') {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#f1f5f9');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

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

    createFireballTrail(x, y, z) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 8,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                vz: -20,
                color: Math.random() < 0.5 ? '#f59e0b' : '#ef4444',
                size: 7 + Math.random() * 8,
                life: 0.35
            });
        }
    }

    createHitSparks(x, y, z) {
        for (let i = 0; i < 32; i++) {
            this.particles.push({
                x: x, y: y, z: z,
                vx: (Math.random() - 0.5) * 360,
                vy: (Math.random() - 0.5) * 360,
                vz: (Math.random() - 0.5) * 360,
                color: ['#facc15', '#38bdf8', '#ffffff', '#ea580c'][Math.floor(Math.random() * 4)],
                size: 5 + Math.random() * 6,
                life: 0.6 + Math.random() * 0.4
            });
        }
    }

    renderEffects(ctx) {
        for (const p of this.particles) {
            const pt = this.project(p.x, p.y, p.z);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(2, p.size * pt.scale), 0, Math.PI * 2);
            ctx.fill();
        }

        for (const f of this.fireworks) {
            for (const p of f.particles) {
                const pt = this.project(p.x, p.y, p.z);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(3, p.size * pt.scale), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderResultBanner(ctx) {
        if (this.bannerAlpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.bannerAlpha;

        const bw = Math.min(this.width * 0.75, 460);
        const bh = 68;
        const bx = this.width / 2 - bw / 2;
        const by = this.height * 0.18;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 14);
        ctx.fill();
        ctx.strokeStyle = this.bannerColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = this.bannerColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.bannerText, this.width / 2, by + 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = '13.5px sans-serif';
        ctx.fillText(this.bannerSub, this.width / 2, by + 52);

        ctx.restore();
    }

    showResultBanner(title, sub, color = '#facc15') {
        this.bannerText = title;
        this.bannerSub = sub;
        this.bannerColor = color;
        this.bannerAlpha = 1.0;
    }

    triggerHomeRunCelebration(dist, pts) {
        for (let i = 0; i < 4; i++) {
            const parts = [];
            const cx = (Math.random() - 0.5) * 220;
            const cy = 180 + Math.random() * 80;
            const cz = (this.userRole === 'batter') ? 100 : 250;
            const col = ['#facc15', '#ef4444', '#38bdf8', '#4ade80'][i % 4];

            for (let j = 0; j < 36; j++) {
                const a = (j / 36) * Math.PI * 2;
                const sp = 90 + Math.random() * 110;
                parts.push({
                    x: cx, y: cy, z: cz,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    vz: (Math.random() - 0.5) * 80,
                    size: 6,
                    color: col
                });
            }
            this.fireworks.push({ particles: parts, life: 1.6 });
        }

        const tag = (pts >= 4) ? '💥 GRAND SLAM 만루홈런!!' : `💥 ${pts}점 홈런 작렬!!`;
        this.showResultBanner(tag, `비거리 ${dist}m 장외 초대형 홈런! (+${pts}점)`, '#facc15');
    }

    updateHUD() {
        // [1] 상단 MLB 26 브로드캐스트 스코어 버그 갱신
        const inningEl = document.getElementById('mlb-bug-inning');
        if (inningEl) {
            inningEl.textContent = (this.inningHalf === 'top') ? '▲ 1회초' : '▼ 1회말';
        }

        const p1ScoreEl = document.getElementById('mlb-bug-p1-score');
        if (p1ScoreEl) p1ScoreEl.textContent = this.p1.score;

        const p2ScoreEl = document.getElementById('mlb-bug-p2-score');
        if (p2ScoreEl) p2ScoreEl.textContent = this.p2.score;

        // B-S-O
        const bEl = document.getElementById('mlb-bso-b');
        if (bEl) bEl.textContent = `${'●'.repeat(this.balls)}${'○'.repeat(Math.max(0, 3 - this.balls))}`;

        const sEl = document.getElementById('mlb-bso-s');
        if (sEl) sEl.textContent = `${'●'.repeat(this.strikes)}${'○'.repeat(Math.max(0, 2 - this.strikes))}`;

        const oEl = document.getElementById('mlb-bso-o');
        if (oEl) oEl.textContent = `${'●'.repeat(this.outs)}${'○'.repeat(Math.max(0, 2 - this.outs))}`;

        // 💎 다이아몬드 베이스 점등
        const b1 = document.getElementById('mlb-base-1');
        const b2 = document.getElementById('mlb-base-2');
        const b3 = document.getElementById('mlb-base-3');
        if (b1) { if (this.bases.first) b1.classList.add('active'); else b1.classList.remove('active'); }
        if (b2) { if (this.bases.second) b2.classList.add('active'); else b2.classList.remove('active'); }
        if (b3) { if (this.bases.third) b3.classList.add('active'); else b3.classList.remove('active'); }

        // 매치업 서브 텍스트
        const roleText = document.getElementById('mlb-bug-role-text');
        if (roleText) {
            roleText.textContent = (this.userRole === 'batter') ? '🏏 나의 역할: [타자]' : '⚾ 나의 역할: [투수]';
        }
        const matchupText = document.getElementById('mlb-bug-matchup-text');
        if (matchupText) {
            const pChar = this.getCurrentPitcher();
            const bChar = this.getCurrentBatter();
            matchupText.textContent = `⚾ ${pChar.name} vs 🏏 ${bChar.name}`;
        }

        // [2] 하단 조작부 토글 (투수 모드 vs 타자 모드)
        const pitcherBar = document.getElementById('mlb-pitcher-bar');
        const batterBar = document.getElementById('mlb-batter-bar');

        if (this.userRole === 'pitcher') {
            if (pitcherBar) pitcherBar.style.display = 'flex';
            if (batterBar) batterBar.style.display = 'none';
        } else {
            if (pitcherBar) pitcherBar.style.display = 'none';
            if (batterBar) batterBar.style.display = 'block';
        }

        // 구종 버튼 액티브
        document.querySelectorAll('.mlb-pitch-btn').forEach(btn => {
            if (btn.getAttribute('data-pitch') === this.selectedPitchType) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    getCurrentPitcher() {
        if (this.userRole === 'pitcher') {
            return this.characters[this.p1.char] || this.characters.tiger;
        } else {
            return this.characters[this.p2.char] || this.characters.monkey;
        }
    }

    getCurrentBatter() {
        if (this.userRole === 'batter') {
            return this.characters[this.p1.char] || this.characters.tiger;
        } else {
            return this.characters[this.p2.char] || this.characters.monkey;
        }
    }

    getCurrentPitcherSkin() {
        const pChar = this.getCurrentPitcher();
        const sKey = (this.userRole === 'pitcher') ? this.p1.skin : this.p2.skin;
        return pChar.skins[sKey] || pChar.skins.classic;
    }

    getCurrentBatterSkin() {
        const bChar = this.getCurrentBatter();
        const sKey = (this.userRole === 'batter') ? this.p1.skin : this.p2.skin;
        return bChar.skins[sKey] || bChar.skins.classic;
    }

    selectPitchType(type) {
        this.selectedPitchType = type;
        this.updateHUD();
        this.playUmpireWhistle(800, 0.08);
    }

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

    showBatterModal() { this.showCharModal(); }
    hideBatterModal() { this.hideCharModal(); }

    updateCharSelectionUI() {
        // 역할 버튼 액티브
        document.querySelectorAll('.role-btn').forEach(btn => {
            if (btn.getAttribute('data-role') === this.userRole) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 캐릭터 버튼 액티브
        document.querySelectorAll('#baseball-user-char-selector .select-btn').forEach(btn => {
            if (btn.getAttribute('data-char') === this.p1.char) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 고유 특화 카드 갱신
        const perkDesc = document.getElementById('mlb-char-perk-desc');
        const cObj = this.characters[this.p1.char] || this.characters.tiger;
        if (perkDesc) {
            perkDesc.innerHTML = `<strong>${cObj.emoji} ${cObj.name} 특화:</strong> ${cObj.batterPerkTitle} | ${cObj.batterPerkDesc}`;
        }

        // 스킨 버튼 생성
        const skinBox = document.getElementById('baseball-user-skin-selector');
        if (skinBox) {
            skinBox.innerHTML = '';
            Object.values(cObj.skins).forEach(s => {
                const sBtn = document.createElement('button');
                sBtn.type = 'button';
                sBtn.className = `costume-btn ${this.p1.skin === s.id ? 'active' : ''}`;
                sBtn.innerHTML = `<span>${s.icon}</span><span style="font-size:12px;">${s.name}</span>`;
                sBtn.onclick = () => {
                    this.p1.skin = s.id;
                    safeSetStorage('smilegames_bb_user_skin', s.id);
                    this.updateCharSelectionUI();
                };
                skinBox.appendChild(sBtn);
            });
        }
    }

    gameOver() {
        this.stop();
        const modal = document.getElementById('baseball-gameover-modal');
        if (!modal) return;

        const badge = document.getElementById('baseball-final-badge');
        const score = document.getElementById('baseball-final-score');
        const hr = document.getElementById('baseball-final-hr');
        const hit = document.getElementById('baseball-final-hit');
        const dist = document.getElementById('baseball-final-dist');

        const isP1Win = (this.p1.score >= this.p2.score);
        if (badge) {
            badge.textContent = isP1Win ? `👑 ${this.p1.name} 승리!!` : `👑 ${this.p2.name} 승리!!`;
        }
        if (score) score.textContent = `[나] ${this.p1.score}점  VS  ${this.p2.score}점 [라이벌]`;
        if (hr) hr.textContent = `나: ${this.p1.homeRuns}개 | 상대: ${this.p2.homeRuns}개`;
        if (hit) hit.textContent = `나: ${this.p1.hits}개 | 상대: ${this.p2.hits}개`;
        if (dist) dist.textContent = `${this.maxDistance}m`;

        modal.classList.add('active');
        this.playHomeRunFanfare();
    }

    hideGameOverModal() {
        const modal = document.getElementById('baseball-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
        this.hideCharModal();
        const hubModal = document.getElementById('hub-modal');
        if (hubModal) hubModal.classList.add('active');
    }

    // 🎵 Web Audio API 사운드 합성
    playPitchWindupSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.45);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    playPitchThrowSound(type) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = (type === 'fireball') ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(type === 'fireball' ? 620 : 380, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {}
    }

    playSwingSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playBatHitSound(type) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const ping = ctx.createOscillator();
            const pGain = ctx.createGain();
            ping.type = 'triangle';
            ping.frequency.setValueAtTime((type === 'homerun') ? 1450 : 1100, now);
            ping.frequency.exponentialRampToValueAtTime(260, now + 0.28);
            pGain.gain.setValueAtTime((type === 'homerun') ? 0.45 : 0.28, now);
            pGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            ping.connect(pGain);
            pGain.connect(ctx.destination);
            ping.start(now);
            ping.stop(now + 0.28);

            const thud = ctx.createOscillator();
            const tGain = ctx.createGain();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(180, now);
            thud.frequency.exponentialRampToValueAtTime(45, now + 0.15);
            tGain.gain.setValueAtTime(0.35, now);
            tGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            thud.connect(tGain);
            tGain.connect(ctx.destination);
            thud.start(now);
            thud.stop(now + 0.15);
        } catch (e) {}
    }

    playCatchSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {}
    }

    playUmpireWhistle(freq = 1200, dur = 0.18) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur);
        } catch (e) {}
    }

    playHomeRunFanfare() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const notes = [
                { f: 523.25, time: 0 },
                { f: 659.25, time: 0.14 },
                { f: 783.99, time: 0.28 },
                { f: 1046.50, time: 0.44 }
            ];
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.time);
                gain.gain.setValueAtTime(0.25, now + n.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + n.time + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.time);
                osc.stop(now + n.time + 0.28);
            });
        } catch (e) {}
    }
}

if (typeof window !== 'undefined') {
    window.BaseballGame = BaseballGame;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseballGame;
}
