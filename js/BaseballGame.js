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
                fastballSpeed: 152,
                controlSpread: 20,
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
                fastballSpeed: 144,
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
                fastballSpeed: 146,
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

        // 🏃 3D 다이아몬드 베이스 좌표 & 실시간 주자 러닝 시스템
        this.BASE_POS = {
            HOME: { x: 0, y: 0, z: 380 },
            '1B': { x: 130, y: 0, z: 230 },
            '2B': { x: 0, y: 0, z: 90 },
            '3B': { x: -130, y: 0, z: 230 }
        };
        this.activeRunners = [];
        this.crowdCheerTimer = 0;

        // 🏏 1~4번 정규 타선 (Batting Lineup Order & Roles)
        this.lineup = [
            {
                order: 1,
                id: 'frog',
                name: '개구리',
                emoji: '🐸',
                title: '1번 타자 [리드오프 & 스피드스타]',
                roleDesc: '🎯 컨택 99 • 전력질주 스피드 1.35x • 안타 제조기',
                contactBonus: 1.35,
                powerBonus: 0,
                speedMult: 1.35,
                power: 80,
                contact: 99
            },
            {
                order: 2,
                id: 'monkey',
                name: '몽키',
                emoji: '🐵',
                title: '2번 타자 [테이블세터 & 선구안]',
                roleDesc: '👁️ 선구안 96 • 스트라이크존 감별 • 출루율 머신',
                contactBonus: 1.15,
                powerBonus: 6,
                speedMult: 1.10,
                power: 88,
                contact: 94
            },
            {
                order: 3,
                id: 'penguin',
                name: '펭귄',
                emoji: '🐧',
                title: '3번 타자 [해결사 클러치 갭히터]',
                roleDesc: '🌪️ 배트스피드 98 • 2/3루타 갭히팅 2배',
                contactBonus: 1.20,
                powerBonus: 15,
                doubleBonus: 2.2,
                speedMult: 1.05,
                power: 92,
                contact: 92
            },
            {
                order: 4,
                id: 'tiger',
                name: '호걸이',
                emoji: '🐯',
                title: '4번 타자 [핵타선 4번 거포 슬러거]',
                roleDesc: '💥 파워 99 • 130m+ 초대형 홈런 비거리 +25m',
                contactBonus: 1.05,
                powerBonus: 28,
                speedMult: 1.0,
                power: 99,
                contact: 86
            }
        ];
        this.lineupIndex = 0;

        // 🛡️ 7인제 3D 정밀 수비수 배치 (Fielders)
        this.fielders = [
            { role: '1B', name: '1루수', x: 140, y: 0, z: 235, defaultX: 140, defaultZ: 235, baseAngle: -0.2 },
            { role: '2B', name: '2루수', x: 65, y: 0, z: 155, defaultX: 65, defaultZ: 155, baseAngle: -0.1 },
            { role: 'SS', name: '유격수', x: -65, y: 0, z: 155, defaultX: -65, defaultZ: 155, baseAngle: 0.1 },
            { role: '3B', name: '3루수', x: -140, y: 0, z: 235, defaultX: -140, defaultZ: 235, baseAngle: 0.2 },
            { role: 'LF', name: '좌익수', x: -210, y: 0, z: -30, defaultX: -210, defaultZ: -30, baseAngle: 0.15 },
            { role: 'CF', name: '중견수', x: 0, y: 0, z: -55, defaultX: 0, defaultZ: -55, baseAngle: 0 },
            { role: 'RF', name: '우익수', x: 210, y: 0, z: -30, defaultX: 210, defaultZ: -30, baseAngle: -0.15 }
        ];

        this.trackerTimer = null;

        // ⚾ 경기 진행 상태 (1회초 / 1회말)
        this.inningHalf = 'top'; // 'top' (1회초) | 'bottom' (1회말)
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.lastResultWasBall = false;
        this.maxDistance = 0;
        this.difficulty = 'easy'; // 'easy' (초보자) | 'normal' (보통) | 'pro' (프로)

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
        this.selectedPitchType = 'fastball'; // 'fastball' | 'curve' | 'slider' | 'changeup' | 'knuckleball'
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
        const savedDiff = safeGetStorage('smilegames_bb_difficulty');
        this.difficulty = (savedDiff && ['easy', 'normal', 'pro'].includes(savedDiff)) ? savedDiff : 'easy';
        this.updateDifficultyUI();
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
                if (e.key === '5') this.selectPitchType('knuckleball');

                // WASD 및 방향키 코스 정밀 조준
                let moved = false;
                if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { this.pitchAimX = Math.max(-34, this.pitchAimX - 5); moved = true; }
                if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { this.pitchAimX = Math.min(34, this.pitchAimX + 5); moved = true; }
                if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { this.pitchAimY = Math.min(74, this.pitchAimY + 5); moved = true; }
                if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { this.pitchAimY = Math.max(14, this.pitchAimY - 5); moved = true; }
                if (moved) this.setPitchAim(this.pitchAimX, this.pitchAimY);

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

        // 🖱️ 캔버스 마우스 클릭 / 터치 드래그로 직접 투구 위치 & 볼/스트라이크 코스 조준!
        if (this.canvas) {
            let isAimDragging = false;

            const handlePointerPitchAim = (e) => {
                if (this.userRole !== 'pitcher' || this.gameState !== 'aiming') return;
                const rect = this.canvas.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                // 투수 카메라 역투영 (z=380 홈플레이트 평면 기준)
                const scale = this.camera.fov / (380 - this.camera.z);
                const aimX = this.camera.x + (px - this.width / 2) / scale;
                const aimY = this.camera.y - (py - this.height * 0.54) / scale;
                this.setPitchAim(Math.round(aimX), Math.round(aimY));
            };

            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                this.ensureAudio();
                if (this.userRole === 'pitcher') {
                    if (this.gameState === 'aiming') {
                        isAimDragging = true;
                        handlePointerPitchAim(e);
                    }
                } else {
                    this.triggerBatterSwing();
                }
            });

            this.canvas.addEventListener('pointermove', (e) => {
                if (isAimDragging && this.userRole === 'pitcher' && this.gameState === 'aiming') {
                    handlePointerPitchAim(e);
                }
            });

            window.addEventListener('pointerup', () => {
                isAimDragging = false;
            });
        }

        // 🎯 볼 / 스트라이크 판정 및 코스 빠른 선택 버튼들
        const zoneBtns = document.querySelectorAll('.mlb-zone-quick-btn');
        zoneBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ensureAudio();
                const zoneKey = btn.getAttribute('data-zone');
                if (zoneKey) this.applyPitchZonePreset(zoneKey);
            });
        });

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

        // 난이도 조절 버튼 (쉬움 / 보통 / 프로)
        const diffBtn = document.getElementById('btn-baseball-difficulty');
        if (diffBtn) {
            diffBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.toggleDifficulty();
            });
        }

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
            (this.userRole === 'batter') ? '공이 정면으로 날아옵니다! [Enter/클릭]으로 타격!' : '[클릭/버튼/WASD]로 볼/스트라이크 결정 후 [Space]로 투구!',
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

    setDifficulty(diff) {
        if (!['easy', 'normal', 'pro'].includes(diff)) return;
        this.difficulty = diff;
        safeSetStorage('smilegames_bb_difficulty', this.difficulty);
        this.updateDifficultyUI();
        const diffNames = {
            easy: '⭐ 쉬움 (초보자)',
            normal: '🔥 보통 (일반)',
            pro: '💀 프로 (MLB)'
        };
        const diffDescs = {
            easy: '비행 시간이 여유로워지고 타격 판정 및 홈런 범위가 대폭 넓어집니다!',
            normal: '균형 잡힌 표준 난이도입니다.',
            pro: '실제 메이저리그급 리얼 타이밍과 정밀 제구가 요구됩니다.'
        };
        this.showResultBanner(`난이도 변경: ${diffNames[this.difficulty]}`, diffDescs[this.difficulty], '#38bdf8');
    }

    toggleDifficulty() {
        if (this.difficulty === 'easy') this.setDifficulty('normal');
        else if (this.difficulty === 'normal') this.setDifficulty('pro');
        else this.setDifficulty('easy');
    }

    updateDifficultyUI() {
        const btn = document.getElementById('btn-baseball-difficulty');
        if (!btn) return;
        btn.classList.remove('normal', 'pro');
        if (this.difficulty === 'easy') {
            btn.textContent = '⭐ 쉬움 (초보자)';
        } else if (this.difficulty === 'normal') {
            btn.classList.add('normal');
            btn.textContent = '🔥 보통 (일반)';
        } else {
            btn.classList.add('pro');
            btn.textContent = '💀 프로 (MLB)';
        }
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
        this.activeRunners = [];

        // 🏏 1번 타자부터 선발 타선 시작
        this.lineupIndex = 0;

        if (this.fielders) {
            this.fielders.forEach(f => {
                f.x = f.defaultX;
                f.z = f.defaultZ;
            });
        }

        this.inningHalf = 'top';
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.lastResultWasBall = false;
        this.maxDistance = 0;
        this.difficulty = 'easy'; // 'easy' (초보자) | 'normal' (보통) | 'pro' (프로)

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
            // ⚾ 투수 시점: MLB The Show 방송 중계형 오프셋 투수 카메라
            // 투수(x:0, z:80)의 어깨 너머로 홈플레이트와 스트라이크존, 타자를 100% 한눈에 선명하게 바라봄!
            this.camera.x = 36;
            this.camera.y = 70;
            this.camera.z = -25;
            this.camera.fov = 360;
        }
        this.camera.shake = 0;
    }

    prepareNextPitch(delay = 1.0) {
        this.gameState = 'aiming';
        this.stateTimer = delay;
        this.ball.active = false;
        this.ball.isHit = false;
        this.ball.hasSwung = false;
        this.lastResultWasBall = false;
        this.batter.isSwinging = false;
        this.batter.swingProgress = 0;
        this.activeRunners = [];
        this.pitcher.phase = 'ready';
        this.pitcher.phaseTimer = 0;
        this.resetCamera();

        // 수비수 기본 수비 위치로 복귀
        if (this.fielders) {
            this.fielders.forEach(f => {
                f.x = f.defaultX;
                f.z = f.defaultZ;
            });
        }

        // 타자 모드일 때: 상대 컴퓨터(AI 투수)가 자동으로 구종과 코스를 정하고 투구!
        if (this.userRole === 'batter') {
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'aiming') {
                    const opponentPitcher = this.getCurrentPitcher();
                    const types = ['fastball', 'curve', 'slider', 'changeup', 'knuckleball'];
                    // 특화 구종 가중치 부여
                    if (opponentPitcher.id === 'frog' && Math.random() < 0.45) this.selectedPitchType = 'curve';
                    else if (opponentPitcher.id === 'penguin' && Math.random() < 0.45) this.selectedPitchType = 'slider';
                    else if (opponentPitcher.id === 'tiger' && Math.random() < 0.45) this.selectedPitchType = 'fastball';
                    else if (Math.random() < 0.25) this.selectedPitchType = 'knuckleball';
                    else this.selectedPitchType = types[Math.floor(Math.random() * types.length)];

                    // ⚾ [볼넷 & 유인구 시스템] 38% 확률로 볼/유인구 투구, 62% 확률로 스트라이크존 승부!
                    const isIntentionalBall = (Math.random() < 0.38);
                    if (isIntentionalBall) {
                        const ballType = Math.random();
                        if (ballType < 0.30) {
                            // 높은 볼 (하이 패스트볼)
                            this.pitchAimX = (Math.random() - 0.5) * 36;
                            this.pitchAimY = 70 + Math.random() * 8;
                        } else if (ballType < 0.60) {
                            // 바운드성 낮은 볼 (로우 유인구)
                            this.pitchAimX = (Math.random() - 0.5) * 36;
                            this.pitchAimY = 11 + Math.random() * 8;
                        } else if (ballType < 0.80) {
                            // 바깥쪽으로 크게 빠지는 볼
                            this.pitchAimX = 27 + Math.random() * 12;
                            this.pitchAimY = 25 + Math.random() * 32;
                        } else {
                            // 몸쪽 깊숙한 위협구
                            this.pitchAimX = -27 - Math.random() * 12;
                            this.pitchAimY = 25 + Math.random() * 32;
                        }
                    } else {
                        // 스트라이크존 안쪽 코스 노리기 (x: -20 ~ 20, y: 26 ~ 62)
                        this.pitchAimX = (Math.random() - 0.5) * 38;
                        this.pitchAimY = 26 + Math.random() * 36;
                    }
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

        // ⚾ 현실적인 KBO/MLB 프로 구속 계산 (직구 147~153, 너클볼 99~105)
        // ⚾ 현실적인 KBO/MLB 프로 구속 계산 (직구 150~156km/h, 체인지업 124~128km/h)
        let baseSpeed = pitcherChar.fastballSpeed || 152;
        if (pType === 'curve') baseSpeed = 121;
        if (pType === 'slider') baseSpeed = 139;
        if (pType === 'changeup') baseSpeed = 125;
        if (pType === 'knuckleball') baseSpeed = 101; // 너클볼: 98~104km/h의 느린 마구!

        const finalSpeed = Math.round(baseSpeed + (Math.random() - 0.5) * 6);

        // 🎯 [유저 직접 제구 & 볼/스트라이크 판정 100% 결정권]
        let actualTargetX = this.pitchAimX;
        let actualTargetY = this.pitchAimY;

        if (this.userRole === 'pitcher') {
            const inZoneAim = (Math.abs(this.pitchAimX) <= 24 && this.pitchAimY >= 22 && this.pitchAimY <= 66);
            if (inZoneAim) {
                // 스트라이크 의도: 100% 스트라이크 존 안쪽으로 정밀 안착 보장!
                actualTargetX = Math.max(-21, Math.min(21, this.pitchAimX + (Math.random() - 0.5) * 3));
                actualTargetY = Math.max(25, Math.min(63, this.pitchAimY + (Math.random() - 0.5) * 3));
            } else {
                // 볼/유인구 의도: 100% 스트라이크 존 바깥(볼)으로 확정 제구!
                actualTargetX = this.pitchAimX + (Math.random() - 0.5) * 3;
                actualTargetY = this.pitchAimY + (Math.random() - 0.5) * 3;
                if (Math.abs(actualTargetX) < 32 && actualTargetY > 15 && actualTargetY < 73) {
                    actualTargetX = (actualTargetX >= 0) ? 33 : -33;
                }
            }
        } else {
            const spread = (pType === 'knuckleball') ? 16 : pitcherChar.controlSpread;
            actualTargetX = this.pitchAimX + (Math.random() - 0.5) * spread;
            actualTargetY = this.pitchAimY + (Math.random() - 0.5) * spread;
        }

        // ⚾ [구종별 비행 시간 - 난이도 연동]
        // 쉬움(Easy): 누구나 여유 있게 공을 보고 시원하게 타격할 수 있는 쾌적한 비행 시간 (직구 ~0.80초)
        let diffFactor = 1.62;
        if (this.difficulty === 'normal') diffFactor = 1.35;
        else if (this.difficulty === 'pro') diffFactor = 1.10;

        let flightDuration = 0.50 * diffFactor;
        if (pType === 'fastball') flightDuration = (152 / finalSpeed) * 0.50 * diffFactor;
        else if (pType === 'slider') flightDuration = 0.56 * diffFactor;
        else if (pType === 'changeup') flightDuration = 0.68 * diffFactor;
        else if (pType === 'curve') flightDuration = 0.73 * diffFactor;
        else if (pType === 'knuckleball') flightDuration = 0.82 * diffFactor;

        const releaseX = 0;
        const releaseY = 46;
        const releaseZ = 85;
        const targetZ = 380;

        this.lastResultWasBall = false;
        this.ball = {
            active: true,
            speedKm: finalSpeed,
            flightDuration: flightDuration,
            startX: releaseX,
            startY: releaseY,
            startZ: releaseZ,
            x: releaseX,
            y: releaseY,
            z: releaseZ,
            targetX: actualTargetX,
            targetY: actualTargetY,
            targetZ: targetZ,
            radius: 8.5,
            rot: 0,
            type: pType,
            speedKmh: finalSpeed,
            isHit: false,
            hasSwung: false,
            hitType: null,
            flightTimer: 0,
            hitDist: 0,
            trail: []
        };

        this.pitcher.phase = 'release';
        this.gameState = 'in_flight';
        this.playPitchThrowSound(pType);
        this.createReleaseSparks(releaseX, releaseY, releaseZ);

        // 스피드건 레이더 팝업 표시 (구종별 무브먼트 특성 포함)
        const pNameMap = {
            fastball: '⚡ 4-SEAM FASTBALL • 라이징 홉 +38cm Hop',
            curve: '🌀 12-6 POWER CURVE • 폭포수 종낙차 -42cm Drop',
            slider: '🌪️ SHARP SLIDER • 횡 브레이크 -28cm Wipeout',
            changeup: '🐢 CIRCLE CHANGEUP • 급감속 브레이킹 -26km/h Sink',
            knuckleball: '🔮 MYSTIC KNUCKLEBALL • 무회전 플러터 0.2 RPM'
        };
        this.showRadarGun(finalSpeed, pNameMap[pType] || 'FASTBALL');

        // 투수 모드일 때: 상대 AI 타자의 선구안 및 스윙 (난이도 연동)
        if (this.userRole === 'pitcher') {
            const isStrikePitch = (Math.abs(actualTargetX) <= 24 && actualTargetY >= 22 && actualTargetY <= 66);
            let aiWillSwing = false;
            let aiSwingTimingOffset = 0; // 초 단위 타이밍 오차

            const isEasy = (this.difficulty === 'easy');
            if (pType === 'fastball') {
                if (isStrikePitch) {
                    aiWillSwing = isEasy ? (Math.random() < 0.65) : (Math.random() < 0.88);
                    aiSwingTimingOffset = (finalSpeed >= 152) ? 0.08 + Math.random() * 0.06 : (Math.random() - 0.5) * 0.04;
                } else {
                    aiWillSwing = (actualTargetY > 66 && Math.random() < (isEasy ? 0.60 : 0.45));
                    aiSwingTimingOffset = 0.08;
                }
            } else if (pType === 'changeup') {
                aiWillSwing = isStrikePitch ? (Math.random() < 0.75) : (Math.random() < (isEasy ? 0.75 : 0.55));
                aiSwingTimingOffset = -0.22 + (Math.random() - 0.5) * 0.05; // 체인지업에 낚여 이른 헛스윙!
            } else if (pType === 'slider') {
                aiWillSwing = isStrikePitch ? (Math.random() < 0.75) : (Math.random() < (isEasy ? 0.80 : 0.70));
                aiSwingTimingOffset = (Math.random() - 0.5) * 0.04;
            } else if (pType === 'curve') {
                aiWillSwing = isStrikePitch ? (Math.random() < 0.70) : (actualTargetY < 24 && Math.random() < (isEasy ? 0.75 : 0.55));
                aiSwingTimingOffset = -0.16 + (Math.random() - 0.5) * 0.06;
            } else if (pType === 'knuckleball') {
                aiWillSwing = Math.random() < (isEasy ? 0.75 : 0.65);
                aiSwingTimingOffset = -0.20 + (Math.random() - 0.5) * 0.14;
            }

            if (aiWillSwing) {
                const swingDelay = Math.max(0.25, (flightDuration * 0.88) + aiSwingTimingOffset);
                setTimeout(() => {
                    if (this.isRunning && this.gameState === 'in_flight' && !this.ball.isHit) {
                        this.triggerBatterSwing();
                    }
                }, swingDelay * 1000);
            }
        }
    }

    /**
     * 🎯 MLB 3x3 스트라이크 존 판정 오버레이 카드 표시
     */
    showPitchTrackerOverlay(tx, ty, isStrike, speed, pType) {
        const tracker = document.getElementById('mlb-pitch-tracker');
        const badge = document.getElementById('mlb-tracker-call-badge');
        const speedEl = document.getElementById('mlb-tracker-speed');
        const dot = document.getElementById('mlb-tracker-dot');
        const descEl = document.getElementById('mlb-tracker-desc');

        if (!tracker || !badge || !speedEl || !dot || !descEl) return;

        if (isStrike) {
            badge.className = 'tracker-call-badge strike';
            badge.textContent = '⚡ STRIKE';
            dot.className = 'tracker-ball-dot strike';
        } else {
            badge.className = 'tracker-call-badge ball';
            badge.textContent = '⚪ BALL';
            dot.className = 'tracker-ball-dot ball';
        }

        speedEl.textContent = `${speed} KM/H`;

        // 3x3 스트라이크존 (x: -24 ~ 24, y: 22 ~ 66)에 점 매핑
        const percentX = Math.max(8, Math.min(92, 50 + (tx / 48) * 100));
        const percentY = Math.max(8, Math.min(92, 100 - ((ty - 22) / 44) * 100));

        dot.style.left = `${percentX.toFixed(1)}%`;
        dot.style.top = `${percentY.toFixed(1)}%`;

        let pitchName = '⚡ 4-SEAM 직구 (라이징 백스핀 +38cm)';
        if (pType === 'curve') pitchName = '🌀 12-6 파워 커브 (폭포수 종낙차 -42cm)';
        else if (pType === 'slider') pitchName = '🌪️ 샤프 슬라이더 (횡 브레이크 -28cm)';
        else if (pType === 'changeup') pitchName = '🐢 서클 체인지업 (급감속 싱커 -26km/h)';
        else if (pType === 'knuckleball') pitchName = '🔮 무회전 너클볼 (카오스 플러터 0.2 RPM)';

        let locationDesc = isStrike ? '스트라이크 존 통과' : '존을 벗어난 유인구';
        if (this.ball && this.ball.hasSwung) {
            locationDesc = isStrike ? '헛스윙 스트라이크' : '유인구 헛스윙';
        }
        descEl.textContent = `${pitchName} • ${locationDesc}`;

        tracker.style.display = 'flex';
        if (this.trackerTimer) clearTimeout(this.trackerTimer);
        this.trackerTimer = setTimeout(() => {
            tracker.style.display = 'none';
        }, 2200);
    }

    /**
     * 🔄 타석 종료 시 볼/스트라이크 카운트 초기화 및 다음 타순 진행
     */
    resetAtBatCount(advanceLineup = true) {
        this.balls = 0;
        this.strikes = 0;
        this.lastResultWasBall = false;
        if (this.ball) {
            this.ball.hasSwung = false;
        }
        if (advanceLineup && this.lineup && this.lineup.length > 0) {
            this.lineupIndex = (this.lineupIndex + 1) % this.lineup.length;
        }
        this.updateHUD();
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
        // [1] 방금 포구 직후 늦은 헛스윙 판정 정정 (볼 판정 후 0.4초 이내에 스윙 시 스트라이크로 즉시 정정)
        if (this.gameState === 'result_pause' && this.stateTimer > 0.65 && this.lastResultWasBall) {
            this.correctLateSwingToStrike();
            return;
        }

        if (this.batter.isSwinging) return;
        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // ⚾ 현재 투구에 스윙 시도 플래그 영구 기록 (이후 어떤 판정이 오더라도 헛스윙 스트라이크 보장)
        if (this.ball) {
            this.ball.hasSwung = true;
        }

        if (this.gameState === 'in_flight' && this.ball && this.ball.active && !this.ball.isHit) {
            this.checkBatContact();
        }
    }

    correctLateSwingToStrike() {
        this.lastResultWasBall = false;
        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // 직전에 잘못 부여된 볼 카운트 즉시 회수
        if (this.balls > 0) {
            this.balls--;
        }

        const pType = (this.ball && this.ball.type) || 'fastball';
        this.handleDeceptiveSwingMiss('late', pType, 40);
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
        const lineupItem = this.getCurrentBatterLineup();

        const sweetSpotZ = 380;
        const diffZ = z - sweetSpotZ; // 음수: 이른 스윙, 양수: 늦은 스윙

        const isEasy = (this.difficulty === 'easy');
        const isNormal = (this.difficulty === 'normal');

        // 🐾 난이도별 타격 허용 한계 (쉬움 모드는 대폭 완화되어 누구나 시원하게 타격!)
        const earlyLimit = isEasy ? -95 : (isNormal ? -68 : -46);
        const lateLimit = isEasy ? 85 : (isNormal ? 58 : 38);
        const maxDistXY = isEasy ? 68 : (isNormal ? 52 : 36);

        // 1. ⚠️ 타이밍 판정 (너무 이르거나 늦은 헛스윙)
        if (diffZ < earlyLimit) {
            this.handleDeceptiveSwingMiss('early', b.type, diffZ);
            return;
        } else if (diffZ > lateLimit) {
            this.handleDeceptiveSwingMiss('late', b.type, diffZ);
            return;
        }

        // 2. ⚠️ 2D 로케이션 판정 (스트라이크 존을 너무 크게 벗어난 경우)
        const dx = b.x;
        const dy = (b.y - 44) * 0.85;
        const distXY = Math.sqrt(dx * dx + dy * dy);

        if (distXY > maxDistXY) {
            this.handleDeceptiveSwingMiss('chase', b.type, distXY);
            return;
        }

        // 3. 💥 정타 판정 및 타구 비행 시작!
        b.isHit = true;
        this.gameState = 'hit_flight';

        const prevBases = { ...this.bases };
        const absDiffZ = Math.abs(diffZ);

        const hrTiming = isEasy ? 35 : (isNormal ? 24 : 16);
        const hrDist = isEasy ? 32 : (isNormal ? 22 : 16);

        const hitTiming = isEasy ? 68 : (isNormal ? 50 : 32);
        const hitDist = isEasy ? 56 : (isNormal ? 42 : 28);

        // [1] 💥 PERFECT CONTACT: 초특대형 홈런!
        if (absDiffZ <= hrTiming && distXY <= hrDist) {
            b.hitType = 'homerun';
            let dist = Math.round(128 + (lineupItem.powerBonus || 0) + (batterChar.powerBonus || 0) + Math.random() * 24);
            if (b.type === 'knuckleball') dist += 8;

            b.hitDist = dist;
            if (dist > this.maxDistance) this.maxDistance = dist;

            const scoredRuns = this.advanceRunnersOnHit('homerun');
            this.spawnBaseRunners('homerun', prevBases);
            this.addScore(scoredRuns, 'homerun');
            this.resetAtBatCount(true);

            b.vz = -570 - Math.random() * 80;
            b.vy = 340 + Math.random() * 60;
            b.vx = (b.x * 2.2) + (Math.random() - 0.5) * 120;

            this.camera.shake = 22;
            this.playBatHitSound('homerun');
            this.triggerHomeRunCelebration(dist, scoredRuns);
        }
        // [2] 🎯 GREAT CONTACT: 2루타 / 3루타 / 1루타
        else if (absDiffZ <= hitTiming && distXY <= hitDist) {
            const isTriple = (Math.random() < 0.15 * (lineupItem.contactBonus || 1.0));
            const isDouble = !isTriple && (Math.random() < 0.45 * (lineupItem.doubleBonus || batterChar.doubleBonus || 1.0));
            const hitType = isTriple ? 'triple' : (isDouble ? 'double' : 'single');
            b.hitType = hitType;

            const dist = isTriple ? Math.round(110 + Math.random() * 15) : (isDouble ? Math.round(94 + Math.random() * 24) : Math.round(68 + Math.random() * 22));
            b.hitDist = dist;
            if (dist > this.maxDistance) this.maxDistance = dist;

            const scoredRuns = this.advanceRunnersOnHit(hitType);
            this.spawnBaseRunners(hitType, prevBases);
            this.addScore(scoredRuns, hitType);
            this.resetAtBatCount(true);

            b.vz = -430 - Math.random() * 50;
            b.vy = 130 + Math.random() * 35;
            b.vx = (b.x * 2.0) + (Math.random() - 0.5) * 160;

            this.camera.shake = 10;
            this.playBatHitSound('hit');
            let titleText = '⚾ 1루타 클린 안타 성공!';
            if (hitType === 'triple') titleText = '⚡ 3루타! 우중간을 가르는 총알 3루타!';
            else if (hitType === 'double') titleText = '🌪️ 2루타! 외야를 가르는 시원한 2루타!';

            const subText = (scoredRuns > 0) ? `주자 홈인! (+${scoredRuns}점 득점)` : `주자 진루 (비거리 ${dist}m)`;
            this.showResultBanner(titleText, subText, '#38bdf8');
        }
        // [3] 🛡️ 빗맞은 내야 땅볼 / 외야 플라이 아웃
        else if (absDiffZ <= hitTiming + 18 && distXY <= hitDist + 12) {
            b.hitType = 'out';
            b.vz = -240 - Math.random() * 45;
            b.vy = 85 + Math.random() * 30;
            b.vx = (b.x * 2.0) + (Math.random() - 0.5) * 140;
            this.playBatHitSound('hit');

            let outPos = '유격수 땅볼';
            if (b.vx > 35) outPos = '1루수 땅볼';
            else if (b.vx < -35) outPos = '3루수 땅볼';
            else if (Math.random() < 0.45) outPos = '중견수 플라이';

            setTimeout(() => {
                this.recordOut(`🛡️ 빗맞은 타구! ${outPos} 아웃!`);
            }, 850);
        }
        // [4] ⚠️ 빗맞은 관중석 파울볼
        else {
            b.hitType = 'foul';
            b.vz = -110;
            b.vy = 240;
            b.vx = (diffZ > 0) ? -320 : 320;

            if (this.strikes < 2) this.strikes++;
            this.playBatHitSound('foul');
            this.showResultBanner('⚠️ 빗맞은 파울볼!', '2스트라이크 이전 파울 (+1 스트라이크)', '#f59e0b');
            this.updateHUD();
        }

        this.createHitSparks(b.x, b.y, b.z);
        this.updateHUD();
    }

    /**
     * 💨 구종 및 궤적에 속아 발생한 헛스윙 처리 (Deceptive Swing-and-Miss)
     * 배터가 스윙을 시도하여 헛돌았으므로 공 위치와 상관없이 100% 무조건 스트라이크!
     */
    handleDeceptiveSwingMiss(reason, pitchType, offsetVal) {
        if (this.ball) {
            this.ball.active = false;
            this.ball.hasSwung = true;
        }
        this.lastResultWasBall = false;
        this.strikes++;
        this.playCatchSound();
        this.playUmpireWhistle(1400, 0.2);

        // 🎯 헛스윙 시에도 실시간 MLB 스트라이크존 트래커 카드 즉시 팝업!
        const bX = (this.ball && this.ball.x !== undefined) ? this.ball.x : (this.ball ? this.ball.targetX : 0);
        const bY = (this.ball && this.ball.y !== undefined) ? this.ball.y : (this.ball ? this.ball.targetY : 44);
        const bSpeed = (this.ball && this.ball.speedKm) || 148;
        this.showPitchTrackerOverlay(bX, bY, true, bSpeed, pitchType);

        let title = '💨 헛스윙 스트라이크! (SWING AND MISS)';
        let desc = '완벽하게 타이밍을 뺏겼습니다!';

        if (reason === 'early') {
            if (pitchType === 'changeup') {
                title = '🐢 [TOO EARLY] 125km/h 체인지업에 낚임!';
                desc = '직구인 줄 알고 배트를 너무 일찍 돌렸습니다!';
            } else if (pitchType === 'curve') {
                title = '🌀 [TOO EARLY] 12-6 파워 커브에 앞선 헛스윙!';
                desc = '느린 폭포수 낙차를 기다리지 못하고 헛스윙!';
            } else if (pitchType === 'knuckleball') {
                title = '🔮 [TOO EARLY] 무회전 너클볼에 헛스윙!';
                desc = '초슬로우 마구의 타이밍에 완전히 속았습니다!';
            } else {
                title = '⚠️ [TOO EARLY] 스윙 타이밍이 너무 빠릅니다!';
                desc = '투수의 완급조절에 속아 이른 헛스윙!';
            }
        } else if (reason === 'late') {
            if (pitchType === 'fastball') {
                title = '⚡ [TOO LATE] 154km/h 불꽃 강속구에 배트 밀림!';
                desc = '광속구의 압도적인 구속을 따라가지 못했습니다!';
            } else {
                title = '⚠️ [TOO LATE] 타이밍이 늦었습니다!';
                desc = '공이 이미 포수 미트에 꽂힌 후 헛스윙!';
            }
        } else if (reason === 'chase') {
            if (pitchType === 'slider') {
                title = '🌪️ [CHASE] 날카로운 슬라이더에 낚여 헛스윙!';
                desc = '가운데 직구인 줄 알고 돌렸으나 바깥쪽으로 예리하게 도망침!';
            } else if (pitchType === 'curve') {
                title = '🌀 [CHASE] 원바운드 폭포수 커브에 헛스윙!';
                desc = '존 밑으로 떨어지는 유인구에 배트가 딸려 나갔습니다!';
            } else if (this.ball && this.ball.y < 22) {
                title = '⚪ [CHASE] 흙먼지 원바운드 볼에 헛스윙!';
                desc = '낮게 가라앉는 유인구에 속았습니다!';
            } else if (this.ball && this.ball.y > 66) {
                title = '⚪ [CHASE] 높은 하이볼 유인구에 헛스윙!';
                desc = '눈높이로 솟아오르는 하이볼에 배트 헛손질!';
            } else {
                title = '⚪ [CHASE] 유인구에 속아 헛스윙!';
                desc = '스트라이크 존을 벗어난 공에 낚였습니다!';
            }
        }

        if (this.strikes >= 3) {
            this.recordOut('💨 3구 헛스윙 삼진 아웃! (STRIKE OUT!)');
        } else {
            this.showResultBanner(title, `${desc} (카운트: ${this.balls}B - ${this.strikes}S)`, '#facc15');
            this.gameState = 'result_pause';
            this.stateTimer = 1.3;
        }
        this.updateHUD();
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

    /**
     * 🏃 3D 다이아몬드 베이스 질주 주자들 생성 시스템
     */
    spawnBaseRunners(hitType, prevBases) {
        const char = this.getCurrentBatter();
        const skin = this.getCurrentBatterSkin();
        this.activeRunners = [];

        const makeRunner = (startKey, path, isBatter = false) => ({
            id: Math.random(),
            char: char,
            skin: skin,
            path: [startKey, ...path],
            legIndex: 0,
            progress: 0,
            x: this.BASE_POS[startKey].x,
            y: 0,
            z: this.BASE_POS[startKey].z,
            runCycle: Math.random() * 6.28,
            speed: (hitType === 'walk') ? 0.65 : 0.88,
            isBatter: isBatter,
            isHome: false,
            isFinished: false
        });

        if (hitType === 'homerun') {
            // 주자 전원 + 타자 홈런 주루 (모든 베이스 순회)
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B', 'HOME']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B', '3B', 'HOME'], true));
        } else if (hitType === 'triple') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B', 'HOME']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B', '3B'], true));
        } else if (hitType === 'double') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B'], true));
        } else if (hitType === 'single') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B']));
            this.activeRunners.push(makeRunner('HOME', ['1B'], true));
        } else if (hitType === 'walk') {
            if (prevBases.first && prevBases.second && prevBases.third) {
                this.activeRunners.push(makeRunner('3B', ['HOME']));
                this.activeRunners.push(makeRunner('2B', ['3B']));
                this.activeRunners.push(makeRunner('1B', ['2B']));
            } else if (prevBases.first && prevBases.second) {
                this.activeRunners.push(makeRunner('2B', ['3B']));
                this.activeRunners.push(makeRunner('1B', ['2B']));
            } else if (prevBases.first) {
                this.activeRunners.push(makeRunner('1B', ['2B']));
            }
            this.activeRunners.push(makeRunner('HOME', ['1B'], true));
        }
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
        this.crowdCheerTimer += dt * 3;

        // 🏃 3D 다이아몬드 주자 진루 애니메이션 업데이트
        for (let i = this.activeRunners.length - 1; i >= 0; i--) {
            const runner = this.activeRunners[i];
            runner.runCycle += dt * 15;
            runner.progress += dt * runner.speed;

            const fromKey = runner.path[runner.legIndex];
            const toKey = runner.path[runner.legIndex + 1];

            if (fromKey && toKey) {
                const p0 = this.BASE_POS[fromKey];
                const p1 = this.BASE_POS[toKey];
                const t = Math.min(1, runner.progress);
                runner.x = p0.x + (p1.x - p0.x) * t;
                runner.y = 0;
                runner.z = p0.z + (p1.z - p0.z) * t;

                // 스파이크 흙먼지 파티클
                if (Math.random() < 0.35) {
                    this.particles.push({
                        x: runner.x + (Math.random() - 0.5) * 6,
                        y: 2,
                        z: runner.z + (Math.random() - 0.5) * 6,
                        vx: (Math.random() - 0.5) * 10,
                        vy: 5 + Math.random() * 8,
                        vz: (Math.random() - 0.5) * 10,
                        color: '#b45309',
                        size: 3 + Math.random() * 3,
                        life: 0.35
                    });
                }

                if (runner.progress >= 1) {
                    runner.legIndex++;
                    runner.progress = 0;

                    if (runner.legIndex >= runner.path.length - 1) {
                        const finalBase = runner.path[runner.path.length - 1];
                        if (finalBase === 'HOME') {
                            runner.isHome = true;
                            runner.isFinished = true;
                            this.playHomeRunFanfare();
                            this.createHitSparks(0, 10, 380);
                        } else {
                            runner.isFinished = true;
                            runner.x = this.BASE_POS[finalBase].x;
                            runner.z = this.BASE_POS[finalBase].z;
                        }
                    }
                }
            }
        }

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
            const rawProg = Math.min(1.0, b.flightTimer / b.flightDuration);

            // 1. Z축 전진 (체인지업의 종속 급감속 & 너클볼의 플러터)
            let zProg = rawProg;
            if (b.type === 'changeup') {
                // 체인지업: 초반 45% 구간은 직구 속도로 빠르게 날아오다가, 후반에 공기저항을 맞아 뚝 감속!
                zProg = (rawProg < 0.45) ? (rawProg * 1.25) : (0.45 * 1.25 + (rawProg - 0.45) * 0.795);
            } else if (b.type === 'knuckleball') {
                zProg = rawProg + Math.sin(rawProg * Math.PI * 4) * 0.012;
            }
            b.z = b.startZ + (b.targetZ - b.startZ) * Math.min(1.0, zProg);

            // 2. 궤적 진행률 (0.0 ~ 1.0)
            const p = Math.max(0, Math.min(1.0, (b.z - b.startZ) / (b.targetZ - b.startZ)));
            const xBase = b.startX + (b.targetX - b.startX) * p;
            const yBase = b.startY + (b.targetY - b.startY) * p;

            let offsetX = 0;
            let offsetY = 0;
            let trailColor = '#38bdf8';

            if (b.type === 'fastball') {
                // ⚡ 4-SEAM FASTBALL: 강력한 백스핀에 의한 라이징 홉(Hop) 효과!
                offsetY = Math.sin(p * Math.PI) * 9.5;
                b.rot += dt * 54;
                trailColor = '#38bdf8';
                if (Math.random() < 0.35) this.createFastballSparks(b.x, b.y, b.z);
            } else if (b.type === 'curve') {
                // 🌀 12-6 POWER CURVE: 초기 솟구치는 Hump -> 60% 지점 이후 폭포수 12-6 급낙차!
                if (p < 0.42) {
                    offsetY = Math.sin((p / 0.42) * Math.PI) * 16.0;
                } else {
                    const u = (p - 0.42) / 0.58;
                    offsetY = -34.0 * Math.sin(u * Math.PI) * Math.pow(u, 0.85);
                }
                offsetX = Math.sin(p * Math.PI) * 5.0;
                b.rot += dt * 40;
                trailColor = '#34d399';
                if (Math.random() < 0.35) this.createCurveTrail(b.x, b.y, b.z);
            } else if (b.type === 'slider') {
                // 🌪️ SHARP SLIDER: 60% 지점까지 한가운데 직구 터널 -> 홈플레이트 앞 날카로운 횡 브레이크(Wipeout)!
                if (p < 0.60) {
                    offsetX = (0 - b.targetX) * Math.sin((p / 0.60) * (Math.PI * 0.5)) * (1.0 - p);
                } else {
                    const u = (p - 0.60) / 0.40;
                    offsetX = (b.targetX >= 0 ? 1 : -1) * 22.0 * Math.sin(u * Math.PI);
                    offsetY = -12.0 * Math.sin(u * Math.PI);
                }
                b.rot += dt * 46;
                trailColor = '#c084fc';
                if (Math.random() < 0.35) this.createSliderTrail(b.x, b.y, b.z);
            } else if (b.type === 'changeup') {
                // 🐢 CIRCLE CHANGEUP: 직구 터널 높이 위장 -> 홈플레이트 앞 싱킹(Sink/Fade)!
                if (p < 0.62) {
                    offsetY = Math.sin((p / 0.62) * (Math.PI * 0.5)) * 14.0;
                } else {
                    const u = (p - 0.62) / 0.38;
                    offsetY = -24.0 * Math.sin(u * Math.PI);
                    offsetX = 7.0 * Math.sin(u * Math.PI);
                }
                b.rot += dt * 20;
                trailColor = '#fbbf24';
                if (Math.random() < 0.35) this.createChangeupSmoke(b.x, b.y, b.z);
            } else if (b.type === 'knuckleball') {
                // 🔮 MYSTIC KNUCKLEBALL: 거의 0에 가까운 무회전, 좌우/상하 카오스 요동 (Flutter)
                const flutterX = Math.sin(b.flightTimer * 24.0) * Math.cos(b.flightTimer * 18.0);
                const flutterY = Math.cos(b.flightTimer * 20.0) * Math.sin(b.flightTimer * 15.0);
                offsetX = flutterX * 13.0 * Math.sin(p * Math.PI);
                offsetY = flutterY * 11.0 * Math.sin(p * Math.PI) - 8.0 * Math.sin(p * Math.PI);
                b.rot += dt * 0.25;
                trailColor = '#f472b6';
                this.createKnuckleballVortex(b.x, b.y, b.z);
            }

            b.x = xBase + offsetX;
            b.y = yBase + offsetY;

            // 3. 3D Statcast 트래일 히스토리 기록
            if (!b.trail) b.trail = [];
            b.trail.push({ x: b.x, y: b.y, z: b.z, color: trailColor });
            if (b.trail.length > 22) b.trail.shift();

            // 4. 포수 미트 포구 (홈플레이트 z=380 통과 후 미타격 시)
            if (rawProg >= 1.0 && !b.isHit) {
                b.active = false;
                this.handlePitchMissResult(b.x, b.y);
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

            // 🛡️ 수비수 7인의 능동적 타구 추적 및 대처 이동
            if (this.fielders && b.active) {
                this.fielders.forEach(f => {
                    const dx = b.x - f.x;
                    const dz = b.z - f.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < 180) {
                        f.x += (dx / dist) * 42 * dt;
                        f.z += (dz / dist) * 42 * dt;
                    }
                });
            }

            // 홈런/타구 시 다이내믹 카메라 트래킹
            if (this.userRole === 'batter') {
                this.camera.x += (b.x * 0.25 - this.camera.x) * 4 * dt;
                this.camera.y += (56 + Math.max(0, (b.y - 40) * 0.3) - this.camera.y) * 4 * dt;
            }

            if (b.y <= 0 || b.z <= -380) {
                b.active = false;
                this.gameState = 'result_pause';
                let pauseTime = 2.4;
                if (b.hitType === 'homerun') pauseTime = 4.6;
                else if (b.hitType === 'triple' || b.hitType === 'double') pauseTime = 3.4;
                else if (b.hitType === 'out') pauseTime = 2.0;
                this.stateTimer = pauseTime;
            }
        } else if (this.gameState === 'result_pause') {
            this.stateTimer -= dt;

            // 카메라 부드러운 센터 복귀
            const targetX = (this.userRole === 'batter') ? 0 : 36;
            const targetY = (this.userRole === 'batter') ? 56 : 70;
            this.camera.x += (targetX - this.camera.x) * 4 * dt;
            this.camera.y += (targetY - this.camera.y) * 4 * dt;

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
        const pitchSpeed = (this.ball && this.ball.speedKm) || 148;
        const pitchType = (this.ball && this.ball.type) || 'fastball';

        // 1. 💨 헛스윙 여부 체크: 타자가 스윙을 시도했는가?
        // 배터가 스윙을 시도했다면 공의 위치(볼/스트라이크)와 무관하게 100% 무조건 스트라이크!
        const isSwung = Boolean((this.ball && this.ball.hasSwung) || this.batter.isSwinging);

        // 2. ⚾ 스트라이크존 규격 판정 (KBO/MLB 공식 규칙: 공의 일부라도 존에 닿으면 스트라이크)
        // 스트라이크존 기본 규격: x [-24, 24], y [22, 66]
        // 야구공 반지름(r=8.5) 마진 4.5 반영 -> 존 경계선에 걸치거나 스치는 공은 100% 스트라이크!
        const strikeMarginX = 4.5;
        const strikeMarginY = 4.5;
        const inZonePhysical = (Math.abs(tx) <= (24 + strikeMarginX) && ty >= (22 - strikeMarginY) && ty <= (66 + strikeMarginY));

        const isStrike = isSwung || inZonePhysical;

        // 🎯 실시간 MLB 스트라이크존 판정 트래커 카드 즉시 팝업
        this.showPitchTrackerOverlay(tx, ty, isStrike, pitchSpeed, pitchType);

        if (isStrike) {
            this.lastResultWasBall = false;
            this.strikes++;
            this.playCatchSound();
            this.playUmpireWhistle(1400, 0.2);

            if (this.strikes >= 3) {
                const outMsg = isSwung ? '💨 3구 헛스윙 삼진 아웃! (STRIKE OUT!)' : '💨 3구 루킹 삼진 아웃! (STRIKE OUT!)';
                this.recordOut(outMsg);
            } else {
                let title = '⚡ 스트라이크! (STRIKE)';
                let desc = `카운트: ${this.balls}B - ${this.strikes}S`;
                if (isSwung) {
                    title = '💨 헛스윙 스트라이크! (SWINGING STRIKE)';
                    desc = `배트가 헛돌았습니다! (${this.balls}B - ${this.strikes}S)`;
                }
                this.showResultBanner(title, desc, '#facc15');
                this.gameState = 'result_pause';
                this.stateTimer = 1.3;
            }
        } else {
            this.lastResultWasBall = true;
            this.balls++;
            this.playCatchSound();

            if (this.balls >= 4) {
                const prevBases = { ...this.bases };
                const scored = this.advanceRunnersOnHit('walk');
                this.spawnBaseRunners('walk', prevBases);
                this.addScore(scored, 'walk');
                this.resetAtBatCount(true); // 4구 볼넷 출루 -> 카운트 초기화 및 다음 타자!
                const msg = (scored > 0) ? '🚶 밀어내기 4구 볼넷! (+1점 득점)' : '🚶 4구 볼넷! 1루 출루 성공!';
                this.showResultBanner(msg, '침착한 선구안으로 출루!', '#38bdf8');
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
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
        this.resetAtBatCount(true); // 타석 종료 -> 볼/스트라이크 초기화 & 다음 타순 진행!

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

        // 1. 경기장 배경 (하늘, 스타디움 관중석, 외야 펜스 및 100m-120m-100m 거리 표지, 대형 전광판, 조명탑)
        this.renderStadiumAtmosphere(ctx);

        // 2. 💎 3D 다이아몬드 베이스 (홈, 1루, 2루, 3루 잔디 줄무늬 & 흙 주로 & 베이스백)
        this.renderDiamondAndBases(ctx);

        // 3. 🛡️ 7인제 3D 정밀 수비수 (1루, 2루, 유격수, 3루, 좌/중/우익수)
        this.renderFielders(ctx);

        // 4. 🏃 3D 다이아몬드 주자들 (질주하는 주자들 & 베이스 위 주자들)
        this.renderBaseRunners(ctx);

        // 4. 3D 스트라이크존 박스 & 과녁
        this.renderStrikeZoneBox(ctx);

        // 5. 캐릭터 및 볼 렌더링 (Z-Sort 순서로 카메라에 맞게 그리기)
        const isBatterRunning = this.activeRunners && this.activeRunners.some(r => r.isBatter && !r.isFinished);

        if (this.userRole === 'batter') {
            // 🏏 타자 시점 (포수 뒤 뷰):
            // 투수(z=80 마운드 먼거리) -> 공 -> 스트라이크존 -> 타자(z=380 앞쪽 우타석)
            this.renderPitcher(ctx, true); // 먼 거리 정면 투수
            if (this.ball.active) this.renderBall(ctx);
            if (!isBatterRunning) this.renderBatter(ctx, true); // 근거리 타자 (MLB The Show)
        } else {
            // ⚾ 투수 시점 (마운드 뒤 뷰):
            // 포수/심판(z=415) -> 타자(z=380) -> 공 -> 투수(z=80 마운드 앞)
            this.renderCatcherAndUmpire(ctx);
            if (!isBatterRunning) this.renderBatter(ctx, false);
            if (this.ball.active) this.renderBall(ctx);
            this.renderPitcher(ctx, false);
        }

        // 6. 파티클 & 불꽃놀이
        this.renderEffects(ctx);

        // 7. 결과 팝업 배너
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
        // [1] 상단 푸른 야간 스타디움 하늘 그라데이션
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.48);
        skyGrad.addColorStop(0, '#030712');
        skyGrad.addColorStop(0.35, '#0f172a');
        skyGrad.addColorStop(0.75, '#1e3a8a');
        skyGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height * 0.48);

        // [2] 거대 외야 펜스 / 백스탑 벽 (z=-270 타자시점 / z=520 투수시점)
        const wallZ = (this.userRole === 'batter') ? -270 : 520;
        const pTL = this.project(-460, 240, wallZ);
        const pTR = this.project(460, 240, wallZ);
        const pBL = this.project(-460, 0, wallZ);
        const pBR = this.project(460, 0, wallZ);

        // 스타디움 4대 초고광도 조명탑 (Stadium Floodlight Towers)
        const lightCols = [-380, -180, 180, 380];
        lightCols.forEach(lx => {
            const lp = this.project(lx, 220, wallZ);
            if (lp && lp.scale > 0) {
                const ls = lp.scale;
                // 철골 기둥
                ctx.fillStyle = '#475569';
                ctx.fillRect(lp.x - 3 * ls, lp.y, 6 * ls, 65 * ls);
                // 램프 헤드 프레임
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(lp.x - 20 * ls, lp.y - 14 * ls, 40 * ls, 15 * ls);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1 * ls;
                ctx.strokeRect(lp.x - 20 * ls, lp.y - 14 * ls, 40 * ls, 15 * ls);

                // 할로겐 라이트 발광 글로우
                const halo = ctx.createRadialGradient(lp.x, lp.y - 6 * ls, 2 * ls, lp.x, lp.y - 6 * ls, 48 * ls);
                halo.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
                halo.addColorStop(0.3, 'rgba(250, 204, 21, 0.4)');
                halo.addColorStop(1, 'rgba(250, 204, 21, 0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(lp.x, lp.y - 6 * ls, 48 * ls, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 스타디움 3단 관중석 (Grandstands & Stadium Seating)
        const grandGrad = ctx.createLinearGradient(0, pTL.y, 0, pBL.y);
        grandGrad.addColorStop(0, '#1e293b');
        grandGrad.addColorStop(0.6, '#334155');
        grandGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grandGrad;
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();
        ctx.fill();

        // 수만 명의 생동감 넘치는 애니메이션 관중들 (Cheering Crowd)
        const crowdRows = 5;
        const crowdCols = 46;
        for (let r = 0; r < crowdRows; r++) {
            const gy = pTL.y + 12 + r * 11;
            for (let c = 0; c < crowdCols; c++) {
                const gx = pTL.x + (pTR.x - pTL.x) * (c / crowdCols);
                const bob = Math.sin(this.crowdCheerTimer + c * 0.4 + r * 0.6) * 2.2;
                const palette = ['#ef4444', '#38bdf8', '#facc15', '#22c55e', '#a855f7', '#f97316', '#ffffff'];
                ctx.fillStyle = palette[(c * 3 + r * 5) % palette.length];
                ctx.fillRect(gx, gy + bob, 4.5, 4.5);
            }
        }

        // 📺 센터필드 대형 MLB 26 일렉트로닉 전광판 (Jumbotron Screen)
        const jbW = (pTR.x - pTL.x) * 0.38;
        const jbH = 52;
        const jbX = (pTL.x + pTR.x) / 2 - jbW / 2;
        const jbY = pTL.y + 4;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(jbX - 4, jbY - 4, jbW + 8, jbH + 8);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.strokeRect(jbX - 4, jbY - 4, jbW + 8, jbH + 8);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#020617';
        ctx.fillRect(jbX, jbY, jbW, jbH);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ SMILE STADIUM MLB 26 PRO DUEL ★', jbX + jbW / 2, jbY + 16);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px monospace';
        const roleStr = (this.userRole === 'batter') ? '🏏 ATTACK' : '⚾ DEFENSE';
        ctx.fillText(`${this.p1.name} [${this.p1.score}] vs [${this.p2.score}] ${this.p2.name} | ${roleStr} (${this.inningHalf === 'top' ? '1회초' : '1회말'})`, jbX + jbW / 2, jbY + 34);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('LIVE MATCH CAMERA • RETINA PRO RESOLUTION', jbX + jbW / 2, jbY + 46);

        // 메이저리그 딥그린 패딩 외야 펜스 (Green Monster Outfield Wall)
        const wallH = (pBL.y - pTL.y) * 0.42;
        const wallGrad = ctx.createLinearGradient(0, pBL.y - wallH, 0, pBL.y);
        wallGrad.addColorStop(0, '#064e3b');
        wallGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(pBL.x, pBL.y - wallH, pBR.x - pBL.x, wallH);

        // 펜스 상단 옐로우 패딩 림
        ctx.fillStyle = '#eab308';
        ctx.fillRect(pBL.x, pBL.y - wallH, pBR.x - pBL.x, 3.5);

        // 외야 거리 펜스 표지판 (330 FT / 100M - 408 FT / 124M - 330 FT / 100M)
        if (this.userRole === 'batter') {
            ctx.fillStyle = '#fef08a';
            ctx.font = '900 13px monospace';
            ctx.textAlign = 'center';
            const centerM = this.project(0, 32, wallZ);
            const leftM = this.project(-230, 32, wallZ);
            const rightM = this.project(230, 32, wallZ);
            ctx.fillText('⚾ 408 FT (124M) ⚾', centerM.x, centerM.y);
            ctx.fillText('330 FT (100M)', leftM.x, leftM.y);
            ctx.fillText('330 FT (100M)', rightM.x, rightM.y);

            // 좌우 노란색 파울 폴 (Foul Poles)
            [-240, 240].forEach(px => {
                const pole = this.project(px, 120, wallZ);
                if (pole) {
                    ctx.fillStyle = '#eab308';
                    ctx.fillRect(pole.x - 2, pole.y, 4, pBL.y - pole.y);
                }
            });
        }

        // [3] 메이저리그 천연 잔디 스트라이프 (Major League Striped Mowed Lawn)
        const turfGrad = ctx.createLinearGradient(0, pBL.y, 0, this.height);
        turfGrad.addColorStop(0, '#15803d');
        turfGrad.addColorStop(1, '#166534');
        ctx.fillStyle = turfGrad;
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // 8개 방사형 잔디 깎기 줄무늬 (Alternating Lawn Mower Stripes)
        const stripeCount = 10;
        for (let i = 0; i < stripeCount; i++) {
            if (i % 2 === 0) {
                const x0 = pBL.x + (pBR.x - pBL.x) * (i / stripeCount);
                const x1 = pBL.x + (pBR.x - pBL.x) * ((i + 1) / stripeCount);
                const bx0 = this.width * (i / stripeCount);
                const bx1 = this.width * ((i + 1) / stripeCount);

                ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'; // 산뜻한 빛 반사 줄무늬
                ctx.beginPath();
                ctx.moveTo(x0, pBL.y);
                ctx.lineTo(x1, pBL.y);
                ctx.lineTo(bx1, this.height);
                ctx.lineTo(bx0, this.height);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    /**
     * 💎 야구 다이아몬드 베이스 (홈, 1루, 2루, 3루 흙 주로 & 베이스백)
     */
    renderDiamondAndBases(ctx) {
        // 다이아몬드 주요 좌표:
        // 홈: (0, 0, 380) / 1루: (130, 0, 230) / 2루: (0, 0, 90) / 3루: (-130, 0, 230)
        const pHome = this.project(0, 0, 380);
        const p1B   = this.project(130, 0, 230);
        const p2B   = this.project(0, 0, 90);
        const p3B   = this.project(-130, 0, 230);

        // 1. 내야 클레이 흙 다이아몬드 아치 (Clay Infield Skin)
        ctx.save();
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(p1B.x, p1B.y);
        ctx.lineTo(p2B.x, p2B.y);
        ctx.lineTo(p3B.x, p3B.y);
        ctx.closePath();
        ctx.lineWidth = 18 * pHome.scale;
        ctx.strokeStyle = '#b45309';
        ctx.stroke();

        // 2. 내야 잔디 중앙 다이아몬드 서클
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(p1B.x, p1B.y);
        ctx.lineTo(p2B.x, p2B.y);
        ctx.lineTo(p3B.x, p3B.y);
        ctx.closePath();
        ctx.fill();

        // 3. 백색 파울라인 (홈 -> 1루 -> 외야 / 홈 -> 3루 -> 외야)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2.4 * pHome.scale;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p1B.x, p1B.y);
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p3B.x, p3B.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. 홈플레이트 주변 클레이 흙 서클 & 타자석 분필 박스
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.ellipse(pHome.x, pHome.y, 88 * pHome.scale, 32 * pHome.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 타자석 (좌타석/우타석 백색 분필선)
        const hs = pHome.scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5 * hs;
        // 우타자석
        ctx.strokeRect(pHome.x + 22 * hs, pHome.y - 18 * hs, 24 * hs, 42 * hs);
        // 좌타자석
        ctx.strokeRect(pHome.x - 46 * hs, pHome.y - 18 * hs, 24 * hs, 42 * hs);

        // 3D 홈플레이트 백색 오각형 (입체 베벨 포함)
        ctx.fillStyle = '#0f172a'; // 검은색 고무 테두리
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(pHome.x - 14 * hs, pHome.y + 6 * hs);
        ctx.lineTo(pHome.x - 14 * hs, pHome.y + 17 * hs);
        ctx.lineTo(pHome.x + 14 * hs, pHome.y + 17 * hs);
        ctx.lineTo(pHome.x + 14 * hs, pHome.y + 6 * hs);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc'; // 흰색 본판
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y + 1 * hs);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 6 * hs);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 15 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 15 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 6 * hs);
        ctx.closePath();
        ctx.fill();

        // 5. 3D 사각 베이스백 (1루, 2루, 3루 캔버스 큐브)
        const renderBaseBag = (pt, isOccupied, label) => {
            const bs = pt.scale;
            const bw = 15 * bs;
            const bh = 15 * bs;

            ctx.save();
            ctx.translate(pt.x, pt.y);

            // 베이스백 바닥 그림자
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3 * bs, bw * 0.7, bh * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // 베이스백 입체 사각 쿠션
            ctx.fillStyle = isOccupied ? '#fde047' : '#ffffff';
            ctx.beginPath();
            ctx.rect(-bw / 2, -bh / 2, bw, bh);
            ctx.fill();
            ctx.strokeStyle = isOccupied ? '#d97706' : '#94a3b8';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // 베이스 중앙 엠보싱 스티치
            ctx.fillStyle = isOccupied ? '#b45309' : '#cbd5e1';
            ctx.font = `bold ${Math.round(8 * bs)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, 0, 3 * bs);

            ctx.restore();
        };

        renderBaseBag(p1B, this.bases.first, '1B');
        renderBaseBag(p2B, this.bases.second, '2B');
        renderBaseBag(p3B, this.bases.third, '3B');
        ctx.restore();
    }

    /**
     * 🛡️ 7인제 3D 정밀 수비수 렌더링 (1루수, 2루수, 유격수, 3루수, 좌익수, 중견수, 우익수)
     */
    renderFielders(ctx) {
        if (!this.fielders) return;

        // 투수 시점 vs 타자 시점에 따른 Z-sorting
        const sorted = [...this.fielders].sort((a, b) => {
            if (this.userRole === 'batter') {
                return (this.camera.z - b.z) - (this.camera.z - a.z);
            } else {
                return (b.z - this.camera.z) - (a.z - this.camera.z);
            }
        });

        const fieldingTeamChar = (this.userRole === 'batter') ? this.p2.char : this.p1.char;
        const fieldingCharObj = this.characters[fieldingTeamChar] || this.characters.tiger;
        const fieldingSkin = fieldingCharObj.skins ? fieldingCharObj.skins.classic : { jersey: '#1d4ed8', cap: '#1e3a8a' };

        sorted.forEach(f => {
            // 🚫 [투수 시점 뷰 클리어링]
            // 투수 시점에서는 홈플레이트를 향해 바라보므로 카메라 앞이나 시야 정중앙을 가리는
            // 외야수(CF, LF, RF) 및 중앙 내야수는 절대 화면을 가리지 않도록 렌더링 제외!
            if (this.userRole === 'pitcher') {
                if (f.role === 'CF' || f.role === 'LF' || f.role === 'RF') return;
                if (Math.abs(f.x) < 80) return; // 투수-홈플레이트 중앙 통로 100% 확보
            }

            const p = this.project(f.x, f.y, f.z);
            if (!p || p.scale <= 0) return;
            const s = p.scale;
            const h = 76 * s;
            const w = 32 * s;

            ctx.save();
            ctx.translate(p.x, p.y);

            // 1. 지면 타원 그림자
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. 수비 대기 자세 (낮게 무릎을 굽힌 수비 스탠스)
            // 양다리 (화이트 유니폼 바지)
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(-w * 0.42, -h * 0.40, w * 0.36, h * 0.40);
            ctx.fillRect(w * 0.06, -h * 0.40, w * 0.36, h * 0.40);

            // 스파이크화
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.44, -h * 0.06, w * 0.38, h * 0.06);
            ctx.fillRect(w * 0.04, -h * 0.06, w * 0.38, h * 0.06);

            // 3. 수비 상체 (팀 저지)
            ctx.fillStyle = fieldingSkin.jersey || '#1d4ed8';
            ctx.beginPath();
            ctx.roundRect(-w * 0.46, -h * 0.78, w * 0.92, h * 0.40, 5 * s);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();

            // 4. 가죽 글러브 (왼손에 장착된 브라운 가죽 글러브)
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.ellipse(-w * 0.52, -h * 0.55, 7 * s, 9 * s, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 1 * s;
            ctx.stroke();
            // 글러브 웹(웹비) 포켓
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.arc(-w * 0.52, -h * 0.55, 4 * s, 0, Math.PI * 2);
            ctx.fill();

            // 5. 오른손 (송구 대기)
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.arc(w * 0.46, -h * 0.55, 4 * s, 0, Math.PI * 2);
            ctx.fill();

            // 6. 머리 & 캡
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            ctx.arc(0, -h * 0.88, 11 * s, 0, Math.PI * 2);
            ctx.fill();

            // 야구 모자
            ctx.fillStyle = fieldingSkin.cap || '#1e3a8a';
            ctx.beginPath();
            ctx.arc(0, -h * 0.93, 11.5 * s, Math.PI, Math.PI * 2);
            ctx.fill();
            // 캡 챙 (visor)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-12 * s, -h * 0.93, 24 * s, 3 * s);

            // 7. 수비 포지션 네임택 배지
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
            ctx.beginPath();
            ctx.roundRect(-16 * s, -h * 1.15, 32 * s, 11 * s, 3 * s);
            ctx.fill();
            ctx.fillStyle = '#38bdf8';
            ctx.font = `bold ${Math.max(7, Math.round(8 * s))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(f.role, 0, -h * 1.05);

            ctx.restore();
        });
    }

    /**
     * 🏃 3D 다이아몬드 베이스 주자들 렌더링 (질주 중인 주자 + 베이스 위 주자)
     */
    renderBaseRunners(ctx) {
        // 1. 이동 중인 주자들 그리기 (활성 주자가 있을 때)
        if (this.activeRunners && this.activeRunners.length > 0) {
            const sorted = [...this.activeRunners].sort((a, b) => {
                if (this.userRole === 'batter') {
                    return (this.camera.z - b.z) - (this.camera.z - a.z);
                } else {
                    return (b.z - this.camera.z) - (a.z - this.camera.z);
                }
            });
            sorted.forEach(r => this.render3DRunner(ctx, r));
        } else {
            // 2. 각 베이스에서 대기 중인 주자들 (리얼 3D 리드오프 스탠스)
            const bChar = this.getCurrentBatter();
            const bSkin = this.getCurrentBatterSkin();

            if (this.bases.first) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['1B'].x + 12, 0, this.BASE_POS['1B'].z, bChar, bSkin, '1B');
            }
            if (this.bases.second) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['2B'].x, 0, this.BASE_POS['2B'].z + 10, bChar, bSkin, '2B');
            }
            if (this.bases.third) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['3B'].x - 12, 0, this.BASE_POS['3B'].z, bChar, bSkin, '3B');
            }
        }
    }

    /**
     * 🏃 실제 질주하는 3D 주자 캐릭터 (다관절 달리기 모션 & 흙먼지)
     */
    render3DRunner(ctx, runner) {
        const p = this.project(runner.x, runner.y, runner.z);
        if (!p || p.scale <= 0) return;
        const s = p.scale;
        const h = 78 * s;
        const w = 32 * s;
        const char = runner.char || this.characters.tiger;
        const skin = runner.skin || { jersey: '#dc2626', cap: '#991b1b' };

        ctx.save();
        ctx.translate(p.x, p.y);

        // 3D 지면 그림자
        ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 달리기 각도 (다리와 팔의 역동적인 교차 스윙)
        const leg1 = Math.sin(runner.runCycle) * 0.78;
        const leg2 = -Math.sin(runner.runCycle) * 0.78;
        const arm1 = -Math.sin(runner.runCycle) * 0.88;
        const arm2 = Math.sin(runner.runCycle) * 0.88;
        const bobY = Math.abs(Math.sin(runner.runCycle)) * 4.5 * s;

        ctx.save();
        ctx.translate(0, -bobY);

        // 1. 뒷다리
        ctx.save();
        ctx.translate(-w * 0.22, -h * 0.42);
        ctx.rotate(leg1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.16, 0, w * 0.32, h * 0.44);
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.16, h * 0.22, w * 0.32, h * 0.12);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.18, h * 0.38, w * 0.36, h * 0.08);
        ctx.restore();

        // 2. 앞다리
        ctx.save();
        ctx.translate(w * 0.22, -h * 0.42);
        ctx.rotate(leg2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.16, 0, w * 0.32, h * 0.44);
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.16, h * 0.22, w * 0.32, h * 0.12);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.18, h * 0.38, w * 0.36, h * 0.08);
        ctx.restore();

        // 3. 상체 (앞으로 기울인 폭발적 전력질주)
        ctx.save();
        ctx.translate(0, -h * 0.44);
        ctx.rotate(0.24);

        // 뒷팔
        ctx.save();
        ctx.translate(-w * 0.38, -h * 0.30);
        ctx.rotate(arm1);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.28);
        ctx.stroke();
        ctx.restore();

        // 유니폼 저지
        ctx.fillStyle = skin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.44, -h * 0.38, w * 0.88, h * 0.40, 6 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();

        // 등번호
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(8 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(runner.isBatter ? 'BAT' : 'RUN', 0, -h * 0.18);

        // 앞팔
        ctx.save();
        ctx.translate(w * 0.38, -h * 0.30);
        ctx.rotate(arm2);
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 5 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.28);
        ctx.stroke();
        ctx.restore();

        // 4. 머리 & 헬멧
        ctx.save();
        ctx.translate(0, -h * 0.50);

        if (char.id === 'tiger') this.drawTigerFace(ctx, s * 0.85, true, skin);
        else if (char.id === 'frog') this.drawFrogFace(ctx, s * 0.85, true, skin);
        else if (char.id === 'penguin') this.drawPenguinFace(ctx, s * 0.85, true, skin);
        else this.drawMonkeyFace(ctx, s * 0.85, true, skin);

        // 타자 헬멧
        ctx.fillStyle = skin.cap;
        ctx.beginPath();
        ctx.arc(0, -5 * s, 14 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.fillRect(4 * s, -6 * s, 10 * s, 3.5 * s); // 챙

        ctx.restore(); // head

        ctx.restore(); // torso
        ctx.restore(); // bob

        ctx.restore();
    }

    /**
     * 🧍 베이스에서 대기 중인 3D 주자 (리드오프 스탠스)
     */
    render3DStationaryRunner(ctx, rx, ry, rz, char, skin, baseLabel) {
        const p = this.project(rx, ry, rz);
        if (!p || p.scale <= 0) return;
        const s = p.scale;
        const h = 74 * s;
        const w = 30 * s;

        ctx.save();
        ctx.translate(p.x, p.y);

        // 지면 그림자
        ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 15 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 리드오프 호흡 애니메이션
        const breathe = Math.sin(this.crowdCheerTimer * 1.5) * 1.5 * s;

        // 다리 (살짝 벌린 준비 스탠스)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.42, -h * 0.40, w * 0.34, h * 0.40);
        ctx.fillRect(w * 0.08, -h * 0.40, w * 0.34, h * 0.40);
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.42, -h * 0.20, w * 0.34, h * 0.10);
        ctx.fillRect(w * 0.08, -h * 0.20, w * 0.34, h * 0.10);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.44, -h * 0.05, w * 0.38, h * 0.05);
        ctx.fillRect(w * 0.06, -h * 0.05, w * 0.38, h * 0.05);

        // 상체 (유니폼 저지)
        ctx.fillStyle = skin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.42, -h * 0.80 + breathe, w * 0.84, h * 0.42, 6 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // 머리 & 헬멧
        ctx.save();
        ctx.translate(0, -h * 0.90 + breathe);
        if (char.id === 'tiger') this.drawTigerFace(ctx, s * 0.8, true, skin);
        else if (char.id === 'frog') this.drawFrogFace(ctx, s * 0.8, true, skin);
        else if (char.id === 'penguin') this.drawPenguinFace(ctx, s * 0.8, true, skin);
        else this.drawMonkeyFace(ctx, s * 0.8, true, skin);

        ctx.fillStyle = skin.cap;
        ctx.beginPath();
        ctx.arc(0, -5 * s, 13 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
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

        if (this.userRole === 'pitcher') {
            // ⚾ 투수 시점: 선명한 네온 3D 스트라이크 존 박스 & 코너 브래킷
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
            ctx.lineWidth = 3.0;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 14;
            ctx.strokeRect(szTL.x, szTL.y, szW, szH);

            // 3x3 격자선
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
            ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

            // 4개 코너 L 브래킷 강조
            const bLen = 8;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            // TL
            ctx.beginPath(); ctx.moveTo(szTL.x, szTL.y + bLen); ctx.lineTo(szTL.x, szTL.y); ctx.lineTo(szTL.x + bLen, szTL.y); ctx.stroke();
            // TR
            ctx.beginPath(); ctx.moveTo(szTR.x - bLen, szTR.y); ctx.lineTo(szTR.x, szTR.y); ctx.lineTo(szTR.x, szTR.y + bLen); ctx.stroke();
            // BL
            ctx.beginPath(); ctx.moveTo(szBL.x, szBL.y - bLen); ctx.lineTo(szBL.x, szBL.y); ctx.lineTo(szBL.x + bLen, szBL.y); ctx.stroke();
            // BR
            ctx.beginPath(); ctx.moveTo(szBR.x - bLen, szBR.y); ctx.lineTo(szBR.x, szBR.y); ctx.lineTo(szBR.x, szBR.y - bLen); ctx.stroke();

            // 🧤 투수 조준 포수 미트 & 실시간 스트라이크/볼 판정 타겟팅
            if (this.gameState === 'aiming') {
                const aimPt = this.project(this.pitchAimX, this.pitchAimY, 380);
                const inAimZone = (Math.abs(this.pitchAimX) <= 24 && this.pitchAimY >= 22 && this.pitchAimY <= 66);
                const targetColor = inAimZone ? '#22c55e' : '#f59e0b';
                const s = aimPt.scale;

                // [1] 포수 가죽 미트 (Mitt)
                ctx.save();
                ctx.translate(aimPt.x, aimPt.y);

                // 미트 가죽 바디
                ctx.fillStyle = '#78350f';
                ctx.beginPath();
                ctx.ellipse(0, 0, 16 * s, 14 * s, -0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#451a03';
                ctx.lineWidth = 1.8 * s;
                ctx.stroke();

                // 미트 포켓 (볼 받는 중앙 홀)
                ctx.fillStyle = '#451a03';
                ctx.beginPath();
                ctx.arc(-2 * s, 0, 8 * s, 0, Math.PI * 2);
                ctx.fill();

                // 가죽 끈 스티치
                ctx.strokeStyle = '#d97706';
                ctx.lineWidth = 1.2 * s;
                [-8 * s, -4 * s, 0, 4 * s, 8 * s].forEach(ly => {
                    ctx.beginPath();
                    ctx.moveTo(-12 * s, ly);
                    ctx.lineTo(-7 * s, ly);
                    ctx.stroke();
                });

                // [2] 포켓 중앙 타겟팅 조준경 & 십자선 (초록: 스트라이크 / 주황: 볼)
                ctx.strokeStyle = targetColor;
                ctx.fillStyle = inAimZone ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)';
                ctx.lineWidth = 2 * s;
                ctx.shadowColor = targetColor;
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.arc(0, 0, 9 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-15 * s, 0); ctx.lineTo(15 * s, 0);
                ctx.moveTo(0, -15 * s); ctx.lineTo(0, 15 * s);
                ctx.stroke();

                // [3] 스트라이크 코스 vs 유인구 볼 코스 상태 텍스트
                ctx.font = `bold ${Math.max(9, Math.round(11 * s))}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillStyle = targetColor;
                ctx.shadowBlur = 8;
                const statusLabel = inAimZone ? '🎯 스트라이크 코스' : '⚠️ 볼 / 유인구 코스';
                ctx.fillText(statusLabel, 0, -22 * s);

                // 조작 안내 미니 배지
                ctx.font = `800 ${Math.max(8, Math.round(9 * s))}px monospace`;
                ctx.fillStyle = '#ffffff';
                ctx.fillText('[클릭/버튼/WASD 조준] [Space 투구]', 0, 24 * s);

                ctx.restore();
            }
        } else {
            // 🏏 타자 시점 (배터 뷰): 은은한 3x3 스트라이크존
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
            ctx.lineWidth = 2.0;
            ctx.strokeRect(szTL.x, szTL.y, szW, szH);

            ctx.lineWidth = 0.8;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
            ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

            // 🎯 [타격 어시스트 타이밍 링 (Impact Timing Ring)]
            if (this.gameState === 'in_flight' && this.ball && this.ball.active) {
                const b = this.ball;
                const prog = Math.max(0, Math.min(1.0, (b.z - b.startZ) / (b.targetZ - b.startZ)));
                const aimPt = this.project(0, 44, 380);
                if (aimPt) {
                    const s = aimPt.scale;
                    const ringRadius = Math.max(16 * s, (75 * s) * (1.0 - prog * 0.76));
                    const isSweetSpot = (b.z >= 320 && b.z <= 395);

                    ctx.save();
                    ctx.translate(aimPt.x, aimPt.y);

                    if (isSweetSpot) {
                        ctx.strokeStyle = '#22c55e';
                        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
                        ctx.lineWidth = 4.0 * s;
                        ctx.shadowColor = '#22c55e';
                        ctx.shadowBlur = 18;
                    } else {
                        ctx.strokeStyle = '#38bdf8';
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                        ctx.lineWidth = 2.2 * s;
                        ctx.shadowColor = '#38bdf8';
                        ctx.shadowBlur = 8;
                    }

                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 가이드 텍스트
                    ctx.textAlign = 'center';
                    if (isSweetSpot) {
                        ctx.font = `900 ${Math.max(12, Math.round(14 * s))}px sans-serif`;
                        ctx.fillStyle = '#fde047';
                        ctx.shadowColor = '#000000';
                        ctx.shadowBlur = 6;
                        ctx.fillText('⚡ 지금 스윙! [NOW]', 0, -ringRadius - 10 * s);
                    } else {
                        ctx.font = `bold ${Math.max(10, Math.round(11 * s))}px sans-serif`;
                        ctx.fillStyle = '#bae6fd';
                        ctx.fillText('🎯 공을 보고 타이밍 맞추기', 0, -ringRadius - 8 * s);
                    }
                    ctx.restore();
                }
            }
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
     * 3D 자연스러운 타자 렌더링 & 유려한 MLB 다관절 스윙
     * @param {boolean} isCloseView - 타자 시점(MLB The Show)일 때는 바로 앞에서 역동적인 스윙을 보여줌
     */
    renderBatter(ctx, isCloseView) {
        const b = this.batter;
        const currLineup = this.getCurrentBatterLineup();
        const bChar = this.getCurrentBatter();
        const bSkin = this.getCurrentBatterSkin();

        const bp = this.project(b.x, b.y, b.z);
        const s = bp.scale;
        const h = 94 * s;
        const w = 40 * s;

        ctx.save();
        ctx.translate(bp.x, bp.y);

        // 타자석 분필 박스
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(-w * 0.7, -6 * s, w * 1.4, 30 * s);

        // 지면 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, w * 0.65, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 🏃‍♂️ 유려한 3D MLB 타격 메커니즘 (스탠스 웨글 -> 스트라이드 & 로딩 -> 힙 턴 & 배트 래그 -> 임팩트 익스텐션 -> 하이 팔로스루)
        const prog = b.swingProgress;
        let strideX = 0;
        let hipAngle = 0;
        let batAngle = 0;
        let weightShiftY = 0;

        if (b.isSwinging) {
            if (prog < 0.22) {
                // 1. 스트라이드 & 코일링 (앞발 내딛기 & 중심 뒤로 모으기)
                const p = prog / 0.22;
                strideX = -10 * s * p;
                weightShiftY = 2 * s * p;
                hipAngle = -0.20 * (1 - p * 0.5);
                batAngle = 0.88 + 0.15 * p; // 뒤로 젖혀지는 테이크백
            } else if (prog < 0.55) {
                // 2. 파워 언코일링 & 배트 래그 (골반 회전 폭발 & 그립 먼저 끌고 내려옴)
                const p = (prog - 0.22) / 0.33;
                strideX = -10 * s;
                weightShiftY = 2 * s;
                hipAngle = -0.10 + p * 0.85; // 힙 턴 오픈
                batAngle = 1.03 - p * 2.35;  // 배트 래그를 통한 벼락 스윙
            } else {
                // 3. 풀 익스텐션 & 어깨 위 하이 팔로스루
                const p = (prog - 0.55) / 0.45;
                strideX = -10 * s;
                hipAngle = 0.75;
                batAngle = -1.32 - p * 0.55; // 어깨 위로 넘어가는 완성도 높은 피니시
            }
        } else {
            // 대기 자세 (부드러운 배트 웨글 리듬과 체중 록킹)
            const idleCycle = b.idleTimer * 3.5;
            batAngle = 0.72 + Math.sin(idleCycle) * 0.12;
            weightShiftY = Math.sin(idleCycle) * 1.2 * s;
        }

        // 다리 & 유니폼 바지 (스탠스에 따른 스트라이드 이동)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.46 + strideX, -h * 0.42 + weightShiftY, w * 0.38, h * 0.42 - weightShiftY);
        ctx.fillRect(w * 0.06, -h * 0.42 + weightShiftY, w * 0.38, h * 0.42 - weightShiftY);

        // 유니폼 파이핑 라인 (측면 스트라이프)
        ctx.fillStyle = bSkin.jersey;
        ctx.fillRect(-w * 0.46 + strideX, -h * 0.42 + weightShiftY, 2.5 * s, h * 0.36);
        ctx.fillRect(w * 0.40, -h * 0.42 + weightShiftY, 2.5 * s, h * 0.36);

        // 양말 & 스파이크화
        ctx.fillStyle = bSkin.cap;
        ctx.fillRect(-w * 0.46 + strideX, -h * 0.18, w * 0.38, h * 0.12);
        ctx.fillRect(w * 0.06, -h * 0.18, w * 0.38, h * 0.12);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.49 + strideX, -h * 0.06, w * 0.44, h * 0.06);
        ctx.fillRect(w * 0.03, -h * 0.06, w * 0.44, h * 0.06);

        // 상체 저지 (회전 포함)
        ctx.save();
        ctx.translate(strideX * 0.3, weightShiftY);
        ctx.rotate(hipAngle);
        ctx.fillStyle = bSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 🏏 유니폼 타순 번호 & 선수 이름
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(currLineup.name, 0, -h * 0.66);
        ctx.font = `900 ${Math.round(18 * s)}px sans-serif`;
        ctx.fillText(`${currLineup.order}`, 0, -h * 0.46);
        ctx.restore();

        // 머리 & 타자 헬멧
        const headY = -h * 0.94 + weightShiftY;
        ctx.save();
        ctx.translate(strideX * 0.2, headY);

        if (bChar.id === 'tiger') this.drawTigerFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'frog') this.drawFrogFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'penguin') this.drawPenguinFace(ctx, s, isCloseView, bSkin);
        else this.drawMonkeyFace(ctx, s, isCloseView, bSkin);

        // 타자 헬멧 & 귀마개 (귀 보호대)
        ctx.fillStyle = bSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 17 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 헬멧 챙 & 귀 보호 플랩
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-18 * s, -7 * s, 14 * s, 16 * s, 4 * s);
        ctx.fill();
        ctx.restore();

        // 🏏 배트 & 타격 스윙 (황금 원목 배트 & 네온 스윙 궤적)
        const batLen = 68 * s;
        ctx.save();
        ctx.translate(-w * 0.2 + strideX * 0.6, -h * 0.65 + weightShiftY);
        ctx.rotate(batAngle);

        // 스윙 네온 잔상 효과
        if (b.isSwinging) {
            const trailGrad = ctx.createRadialGradient(0, 0, batLen * 0.5, 0, 0, batLen);
            trailGrad.addColorStop(0, 'rgba(250, 204, 21, 0.6)');
            trailGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.4)');
            trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.arc(0, 0, batLen * 1.05, -1.1, 0.2);
            ctx.lineTo(0, 0);
            ctx.fill();
        }

        // 타격 장갑 (Batting Gloves)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(0, -5 * s, 5 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1 * s;
        ctx.stroke();

        // 배트 손잡이 (그립 테이프)
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2.5 * s, -12 * s, 5 * s, 12 * s);

        // 배트 배럴 (황금빛 우드 배트 그라데이션)
        const batGrad = ctx.createLinearGradient(-5 * s, 0, 5 * s, 0);
        batGrad.addColorStop(0, '#f59e0b');
        batGrad.addColorStop(0.4, '#fef08a');
        batGrad.addColorStop(0.7, '#fbbf24');
        batGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = batGrad;
        ctx.beginPath();
        ctx.roundRect(-5 * s, -batLen, 10 * s, batLen - 12 * s, 4 * s);
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

    // 🐾 세련된 3D 스포츠 아바타 얼굴 렌더러
    drawTigerFace(ctx, s, isFront, skin) {
        // 귀 (외이 + 내이 핑크)
        [-15 * s, 15 * s].forEach(ex => {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath(); ctx.arc(ex, -16 * s, 9 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f472b6';
            ctx.beginPath(); ctx.arc(ex, -16 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 3D 얼굴 그라데이션
        const fGrad = ctx.createRadialGradient(0, -2 * s, 3 * s, 0, 0, 19 * s);
        fGrad.addColorStop(0, '#fb923c');
        fGrad.addColorStop(0.7, '#f97316');
        fGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(0, 0, 18.5 * s, 0, Math.PI * 2); ctx.fill();

        // 호랑이 이마 줄무늬
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2.5 * s, -14 * s, 5 * s, 5 * s);
        ctx.fillRect(-8 * s, -12 * s, 4 * s, 3 * s);
        ctx.fillRect(4 * s, -12 * s, 4 * s, 3 * s);

        // 흰색 주둥이 & 뺨
        ctx.fillStyle = '#fffbeb';
        ctx.beginPath();
        ctx.ellipse(-7 * s, 5 * s, 8.5 * s, 6.5 * s, 0.2, 0, Math.PI * 2);
        ctx.ellipse(7 * s, 5 * s, 8.5 * s, 6.5 * s, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // 뺨 호랑이 수염 줄무늬
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-17 * s, -1 * s, 5 * s, 2 * s);
        ctx.fillRect(-16 * s, 3 * s, 4 * s, 2 * s);
        ctx.fillRect(12 * s, -1 * s, 5 * s, 2 * s);
        ctx.fillRect(12 * s, 3 * s, 4 * s, 2 * s);

        // 초롱초롱한 눈망울 (트윈 하이라이트)
        [-6.5 * s, 6.5 * s].forEach(ex => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 4.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -1.5 * s : 1.5 * s), -2 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
            // 눈동자 빛 반사
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -2.2 * s : 0.8 * s), -3.2 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 붉은 코
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(0, 3 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
    }

    drawFrogFace(ctx, s, isFront, skin) {
        // 볼록 솟은 개구리 왕눈
        [-13 * s, 13 * s].forEach(ex => {
            ctx.fillStyle = '#16a34a';
            ctx.beginPath(); ctx.arc(ex, -15 * s, 9.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex, -15 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -2 * s : 2 * s), -15 * s, 3.8 * s, 0, Math.PI * 2); ctx.fill();
            // 눈동자 하이라이트
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex + (isFront ? -2.8 * s : 1.2 * s), -16.2 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 3D 라임 헤드 그라데이션
        const fGrad = ctx.createRadialGradient(0, -2 * s, 4 * s, 0, 0, 19 * s);
        fGrad.addColorStop(0, '#4ade80');
        fGrad.addColorStop(0.7, '#22c55e');
        fGrad.addColorStop(1, '#16a34a');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(0, 0, 18.5 * s, 0, Math.PI * 2); ctx.fill();

        // 발그레한 핑크 볼터치
        ctx.fillStyle = 'rgba(244, 114, 182, 0.75)';
        ctx.beginPath();
        ctx.arc(-11 * s, 4 * s, 4.5 * s, 0, Math.PI * 2);
        ctx.arc(11 * s, 4 * s, 4.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // 싱그러운 개구리 미소
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.arc(0, 2 * s, 8.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
    }

    drawPenguinFace(ctx, s, isFront, skin) {
        // 펭귄 턱시도 헤드 (다크 슬레이트 3D)
        const fGrad = ctx.createRadialGradient(0, -2 * s, 4 * s, 0, 0, 19 * s);
        fGrad.addColorStop(0, '#334155');
        fGrad.addColorStop(0.7, '#1e293b');
        fGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(0, 0, 18.5 * s, 0, Math.PI * 2); ctx.fill();

        // 순백 하트 마스크
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(-6 * s, 1 * s, 8.5 * s, 11 * s, 0.1, 0, Math.PI * 2);
        ctx.ellipse(6 * s, 1 * s, 8.5 * s, 11 * s, -0.1, 0, Math.PI * 2);
        ctx.fill();

        // 뺨 노란색 플레어 깃털
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(-12 * s, 4 * s, 3.5 * s, 0, Math.PI * 2);
        ctx.arc(12 * s, 4 * s, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // 눈망울 & 스파클
        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex - 1.2 * s, -3.5 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 3D 오렌지 부리
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(isFront ? -8.5 * s : 8.5 * s, 5 * s);
        ctx.lineTo(0, 9.5 * s);
        ctx.closePath();
        ctx.fill();
    }

    drawMonkeyFace(ctx, s, isFront, skin) {
        // 동그란 원숭이 귀 (외이 + 내이)
        [-17 * s, 17 * s].forEach(ex => {
            ctx.fillStyle = '#78350f';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 8.5 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath(); ctx.arc(ex, -2 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 원숭이 얼굴 3D 브라운 그라데이션
        const fGrad = ctx.createRadialGradient(0, -2 * s, 4 * s, 0, 0, 19 * s);
        fGrad.addColorStop(0, '#a16207');
        fGrad.addColorStop(0.7, '#854d0e');
        fGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = fGrad;
        ctx.beginPath(); ctx.arc(0, 0, 18.5 * s, 0, Math.PI * 2); ctx.fill();

        // 밝은 피치 주둥이
        ctx.fillStyle = '#ffedd5';
        ctx.beginPath();
        ctx.ellipse(0, 5.5 * s, 11.5 * s, 8.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 초롱한 눈망울
        [-6 * s, 6 * s].forEach(ex => {
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.arc(ex, -3 * s, 3.6 * s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex - 1 * s, -4.2 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
        });

        // 장난스러운 스마일 코 & 입
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(0, 3 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.arc(0, 6 * s, 4.5 * s, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
    }

    renderBall(ctx) {
        const b = this.ball;
        const p = this.project(b.x, b.y, b.z);
        if (!p) return;
        const r = Math.max(5, b.radius * p.scale);

        // [0] 🌟 3D Statcast 궤적 리본 트레이서 (Pitch Trajectory Tracer)
        if (b.trail && b.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 0; i < b.trail.length - 1; i++) {
                const pt1 = this.project(b.trail[i].x, b.trail[i].y, b.trail[i].z);
                const pt2 = this.project(b.trail[i + 1].x, b.trail[i + 1].y, b.trail[i + 1].z);
                if (!pt1 || !pt2) continue;
                const alpha = (i / b.trail.length) * 0.75;
                ctx.strokeStyle = b.trail[i].color || '#38bdf8';
                ctx.globalAlpha = alpha;
                ctx.lineWidth = Math.max(1.8, 5.0 * pt1.scale * (i / b.trail.length));
                ctx.beginPath();
                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // [1] 3D 지면 그림자 (공의 높이에 따라 자연스럽게 번지고 축소되는 동적 그림자)
        const shadowPt = this.project(b.x, 0, b.z);
        if (shadowPt && shadowPt.scale > 0) {
            const ss = shadowPt.scale;
            const heightFactor = Math.max(0, 1 - Math.min(1, b.y / 180));
            const sW = Math.max(4, (b.radius * 1.6) * ss * (0.7 + (1 - heightFactor) * 0.5));
            const sH = Math.max(2, (b.radius * 0.7) * ss * (0.7 + (1 - heightFactor) * 0.5));
            const sAlpha = 0.12 + heightFactor * 0.42;

            ctx.save();
            ctx.fillStyle = `rgba(15, 23, 42, ${sAlpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y, sW, sH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // [2] 3D 리얼 야구공 (Seams & Radial Lighting)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(b.rot);

        // 🌟 구종별 다이내믹 글로우 아우라
        if (b.type === 'fastball') {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
        } else if (b.type === 'slider') {
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 14;
        } else if (b.type === 'curve') {
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 14;
        } else if (b.type === 'changeup') {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 14;
        } else if (b.type === 'knuckleball') {
            ctx.shadowColor = '#f472b6';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3D 구체 입체 라이팅 그라데이션
        const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.65, '#f8fafc');
        grad.addColorStop(0.9, '#cbd5e1');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 야구공 붉은 실밥 (Classic Red Stitches)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(1.3, 2.0 * p.scale);
        ctx.beginPath();
        ctx.arc(-r * 0.45, 0, r * 0.65, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.45, 0, r * 0.65, 0.4 * Math.PI, 1.6 * Math.PI);
        ctx.stroke();

        // 실밥 스티치 눈금 (Stitch marks)
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = Math.max(1.0, 1.4 * p.scale);
        const stitchCount = 4;
        for (let i = 0; i < stitchCount; i++) {
            const angle = -0.5 * Math.PI + (i / (stitchCount - 1)) * Math.PI;
            const sx1 = -r * 0.45 + Math.cos(angle) * r * 0.65;
            const sy1 = Math.sin(angle) * r * 0.65;
            ctx.beginPath();
            ctx.moveTo(sx1 - 2 * p.scale, sy1 - 1 * p.scale);
            ctx.lineTo(sx1 + 2 * p.scale, sy1 + 1 * p.scale);
            ctx.stroke();

            const sx2 = r * 0.45 - Math.cos(angle) * r * 0.65;
            const sy2 = Math.sin(angle) * r * 0.65;
            ctx.beginPath();
            ctx.moveTo(sx2 - 2 * p.scale, sy2 - 1 * p.scale);
            ctx.lineTo(sx2 + 2 * p.scale, sy2 + 1 * p.scale);
            ctx.stroke();
        }

        ctx.restore();
    }

    createFastballSparks(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                z: z - 4,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16,
                vz: -20,
                color: Math.random() < 0.6 ? '#38bdf8' : '#93c5fd',
                size: 3 + Math.random() * 3,
                life: 0.25
            });
        }
    }

    createSliderTrail(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                z: z - 5,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 14,
                vz: -16,
                color: Math.random() < 0.6 ? '#c084fc' : '#a855f7',
                size: 3 + Math.random() * 3,
                life: 0.28
            });
        }
    }

    createCurveTrail(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                z: z - 4,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12 - 8,
                vz: -14,
                color: Math.random() < 0.6 ? '#34d399' : '#10b981',
                size: 3.5 + Math.random() * 3.5,
                life: 0.3
            });
        }
    }

    createChangeupSmoke(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 6,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 4,
                vz: -10,
                color: Math.random() < 0.6 ? '#fbbf24' : '#f59e0b',
                size: 4 + Math.random() * 4,
                life: 0.35
            });
        }
    }

    createKnuckleballVortex(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 6,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14,
                vz: -15,
                color: Math.random() < 0.5 ? '#f472b6' : '#ec4899',
                size: 4 + Math.random() * 4,
                life: 0.32
            });
        }
    }

    createFireballTrail(x, y, z) {
        this.createKnuckleballVortex(x, y, z);
    }

    createReleaseSparks(x, y, z) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                vz: 25 + Math.random() * 35,
                color: Math.random() < 0.5 ? '#ffffff' : '#fde047',
                size: 4 + Math.random() * 4,
                life: 0.32
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

        // 매치업 서브 텍스트 & 타선 라인업 정보 갱신
        const currLineup = this.getCurrentBatterLineup();
        const roleText = document.getElementById('mlb-bug-role-text');
        if (roleText) {
            roleText.textContent = (this.userRole === 'batter') ? '🏏 나의 역할: [타자]' : '⚾ 나의 역할: [투수]';
        }
        const matchupText = document.getElementById('mlb-bug-matchup-text');
        if (matchupText) {
            const pChar = this.getCurrentPitcher();
            matchupText.textContent = `⚾ ${pChar.name} vs 🏏 [${currLineup.order}번] ${currLineup.emoji} ${currLineup.name}`;
        }

        // 🏏 1~4번 정규 타선 HUD 배지 갱신
        const lineupBadge = document.getElementById('mlb-lineup-badge');
        const lineupName = document.getElementById('mlb-lineup-name');
        const lineupPerk = document.getElementById('mlb-lineup-perk');

        if (lineupBadge) lineupBadge.textContent = `${currLineup.order}번 타자`;
        if (lineupName) lineupName.textContent = `${currLineup.emoji} ${currLineup.name}`;
        if (lineupPerk) lineupPerk.textContent = currLineup.roleDesc;

        this.updateDifficultyUI();

        // [2] 하단 조작부 토글 (투수 모드 vs 타자 모드)
        const pitcherBar = document.getElementById('mlb-pitcher-bar');
        const batterBar = document.getElementById('mlb-batter-bar');

        if (this.userRole === 'pitcher') {
            if (pitcherBar) pitcherBar.style.display = 'flex';
            if (batterBar) batterBar.style.display = 'none';
            this.setPitchAim(this.pitchAimX, this.pitchAimY);
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

    getCurrentBatterLineup() {
        if (!this.lineup || this.lineup.length === 0) {
            return {
                order: 4,
                id: 'tiger',
                name: '호걸이',
                emoji: '🐯',
                title: '4번 타자 [거포 슬러거]',
                roleDesc: '💥 파워 99 • 초대형 홈런',
                powerBonus: 28,
                contactBonus: 1.05
            };
        }
        return this.lineup[this.lineupIndex % this.lineup.length];
    }

    getCurrentBatter() {
        const currLineup = this.getCurrentBatterLineup();
        const baseChar = this.characters[currLineup.id] || this.characters.tiger;
        return {
            ...baseChar,
            name: currLineup.name,
            emoji: currLineup.emoji,
            contactBonus: currLineup.contactBonus || baseChar.contactBonus,
            powerBonus: currLineup.powerBonus || baseChar.powerBonus,
            doubleBonus: currLineup.doubleBonus || baseChar.doubleBonus || 1.0,
            contactWindowBonus: currLineup.contactBonus || 1.0
        };
    }

    getCurrentPitcherSkin() {
        const pChar = this.getCurrentPitcher();
        const sKey = (this.userRole === 'pitcher') ? this.p1.skin : this.p2.skin;
        return pChar.skins[sKey] || pChar.skins.classic;
    }

    getCurrentBatterSkin() {
        const currLineup = this.getCurrentBatterLineup();
        const baseChar = this.characters[currLineup.id] || this.characters.tiger;
        const skinKey = (this.userRole === 'batter' && currLineup.id === this.p1.char) ? this.p1.skin : 'classic';
        return baseChar.skins ? (baseChar.skins[skinKey] || baseChar.skins.classic) : { jersey: '#dc2626', cap: '#991b1b' };
    }

    selectPitchType(type) {
        this.selectedPitchType = type;
        this.updateHUD();
        this.playUmpireWhistle(800, 0.08);
    }

    /**
     * 🎯 투수 조준 위치 & 볼/스트라이크 판정 실시간 갱신
     */
    setPitchAim(aimX, aimY, customLabel = null) {
        this.pitchAimX = Math.max(-36, Math.min(36, aimX));
        this.pitchAimY = Math.max(10, Math.min(76, aimY));

        const inZone = (Math.abs(this.pitchAimX) <= 24 && this.pitchAimY >= 22 && this.pitchAimY <= 66);
        const callBadge = document.getElementById('mlb-pitcher-call-badge');
        if (callBadge) {
            if (inZone) {
                callBadge.className = 'pitcher-current-call-badge strike';
                callBadge.textContent = customLabel || '🎯 스트라이크 존 [포수 미트]';
            } else {
                callBadge.className = 'pitcher-current-call-badge ball';
                callBadge.textContent = customLabel || '⚪ 볼 / 유인구 코스';
            }
        }
    }

    /**
     * 🎯 볼 / 스트라이크 코스 프리셋 적용
     */
    applyPitchZonePreset(zoneKey) {
        let x = 0;
        let y = 44;
        let label = '🎯 스트라이크 [한가운데]';

        if (zoneKey === 'center') {
            x = 0; y = 44; label = '🎯 스트라이크 [한가운데]';
        } else if (zoneKey === 'corner-strike') {
            x = 18; y = 28; label = '🎯 스트라이크 [외곽 코너워크]';
        } else if (zoneKey === 'low-strike') {
            x = 0; y = 26; label = '🎯 스트라이크 [무릎 보더라인]';
        } else if (zoneKey === 'high-strike') {
            x = 0; y = 60; label = '🎯 스트라이크 [높은 존]';
        } else if (zoneKey === 'outside-ball') {
            x = 34; y = 38; label = '⚪ 유인구 [바깥쪽 빠지는 볼]';
        } else if (zoneKey === 'dirt-ball') {
            x = 0; y = 12; label = '⚪ 유인구 [원바운드 낮은 볼]';
        } else if (zoneKey === 'high-ball') {
            x = 0; y = 74; label = '⚪ 유인구 [높은 하이볼]';
        } else if (zoneKey === 'inside-ball') {
            x = -34; y = 40; label = '⚪ 유인구 [몸쪽 위협구]';
        }

        this.setPitchAim(x, y, label);

        document.querySelectorAll('.mlb-zone-quick-btn').forEach(btn => {
            if (btn.getAttribute('data-zone') === zoneKey) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.playUmpireWhistle(900, 0.06);
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

            if (type === 'fastball') {
                // ⚡ 직구: 날카롭고 빠른 채찍 바람소리
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(560, now);
                osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
                gain.gain.setValueAtTime(0.26, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.16);
            } else if (type === 'slider') {
                // 🌪️ 슬라이더: 날카롭게 꺾이는 스윙 사운드
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.20);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.20);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.20);
            } else if (type === 'curve') {
                // 🌀 커브: 묵직하게 가라앉는 깊은 울림
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);
                gain.gain.setValueAtTime(0.24, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (type === 'changeup') {
                // 🐢 체인지업: 부드럽게 감속되는 조용한 바람
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.26);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.26);
            } else {
                // 🔮 너클볼: 신비로운 미스티 사운드
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(340, now + 0.15);
                osc.frequency.exponentialRampToValueAtTime(130, now + 0.32);
                gain.gain.setValueAtTime(0.20, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.32);
            }
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
