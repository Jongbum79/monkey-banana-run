/**
 * Smile Games - 스페이스 워즈 (Space Wars: Retro Pixel 3D Shooter)
 * [Math Playground X-Tech Run 스타일 3D 트렌치 & 고퀄리티 픽셀 아트 에디션]
 * 
 * 주요 특징:
 * 1. Math Playground X-Tech Run 스타일의 3D 네온 트렌치(Trench Corridor) & 바닥/벽면 그리드 질주!
 * 2. 과녁(조준선) 완전 삭제 - 시야를 가리지 않는 깔끔한 아케이드 뷰
 * 3. 고퀄리티 픽셀 아트(Pixel Art) 그래픽:
 *    - 플레이어 X-윙 우주선 후방 픽셀 렌더링 & 듀얼 엔진 플라즈마 파티클
 *    - 고퀄리티 TIE 파이터 & 인터셉터 픽셀 적기
 *    - 🛡️ 안 맞는 우주선(레이저가 튕겨나가는 방어막 중장갑 장애물 기체 - 회피 필수!)
 *    - 14포인트마다 출현하는 거대 제국 전함 픽셀 보스 (체력바 + 레이저 반격)
 * 4. 완벽한 연속 충돌 판정(Continuous Swept Collision) - 레이저가 적을 통과하지 않고 정확하게 명중!
 * 5. 적기 격추 시 정확히 1포인트 획득
 * 6. 스페이스바 1회당 단 1발의 레이저 발사
 * 7. 우주선 뒤 시점 (3rd Person Rear-Chase View)
 * 8. 데스크톱(WASD/방향키 + Space) 및 태블릿(터치 스티어링 + 발사 버튼) 완벽 대응
 */

class SpaceGame {
    constructor(soundManager) {
        this.sound = soundManager;
        this.audioCtx = null;
        this.isRunning = false;
        this.containerEl = null;
        this.canvas = null;
        this.ctx = null;
        this.animFrameId = null;

        // 화면 크기
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2); // ⚡ 최소 2배 슈퍼샘플링 레티나/HD 해상도 보장

        // 플레이어 우주선 상태 (트렌치 내부 비행)
        this.player = {
            x: 0,
            y: 80,
            z: 0,
            targetX: 0,
            targetY: 80,
            vx: 0,
            vy: 0,
            roll: 0,
            pitch: 0,
            hp: 100,
            maxHp: 100,
            shootCooldown: 0,
            isInvincible: 0,
            wallDamageCooldown: 0,
            width: 74,
            height: 42
        };

        // 점수 및 보스 상태
        this.score = 0;
        this.highScore = 0;
        this.bossCount = 0;
        this.bossTargetScore = 14; // 정확히 14포인트마다 보스 출현
        this.playerName = '스카이워커';

        // 보스 상태
        this.boss = {
            active: false,
            x: 0,
            y: -40,
            z: 1600,
            targetX: 0,
            targetY: -40,
            hp: 15, // 👾 보스 체력 (15 HP)
            maxHp: 15,
            phase: 'entering', // 'entering' | 'fighting' | 'exploding'
            shootTimer: 0,
            moveTimer: 0,
            flashTimer: 0,
            explodeTimer: 0
        };

        // 엔티티 관리
        this.stars = [];
        this.lasers = [];        // 플레이어 단일 레이저
        this.enemyLasers = [];   // 적/보스 레이저
        this.enemies = [];       // 일반 적 전투기 (격추 시 1점)
        this.obstacles = [];     // 🛡️ 안 맞는 우주선 (레이저 반사 방어막 기체 - 회피 전용)
        this.items = [];         // 💚 체력 회복 캡슐 아이템
        this.particles = [];     // 픽셀 폭발 및 불꽃 파티클

        this.enemySpawnTimer = 0.5; // 적 스폰 타이머 (과밀 방지)
        this.itemTimer = 0;         // 정기 회복 아이템 타이머

        // X-Tech Run 트렌치 네온 그리드 스크롤 거리
        this.trenchDist = 0;

        // 컨트롤 상태
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false
        };

        // 태블릿 터치 조작
        this.touch = {
            active: false,
            startX: 0,
            startY: 0,
            curX: 0,
            curY: 0
        };

        this.bossAlertTimer = 0;
        this.bgmPlaying = false;
        this.bgmStep = 0;
        this.bgmTimer = null;

        // 🧑‍🚀 반란군 파일럿 & 캐릭터별 전용 스킨 (점프 게임 4종 캐릭터 연동)
        this.pilots = {
            frog: {
                id: 'frog',
                name: '개구리 대위',
                speciesName: '개구리',
                emoji: '🐸',
                intro: '늪지대 행성 최고의 기동성 파일럿! 침착하고 유연한 회피 비행이 특기.',
                skins: {
                    classic: { id: 'classic', name: '반란군 오렌지', suit: '#ea580c', helmet: '#f8fafc', visor: '#38bdf8', icon: '🟠', badge: '클래식' },
                    emerald: { id: 'emerald', name: '에메랄드 스쿼드론', suit: '#16a34a', helmet: '#22c55e', visor: '#4ade80', icon: '🟢', badge: '스페셜' },
                    cyber: { id: 'cyber', name: '사이버 크롬', suit: '#0891b2', helmet: '#e2e8f0', visor: '#06b6d4', icon: '⚡', badge: '하이테크' }
                }
            },
            tiger: {
                id: 'tiger',
                name: '호걸이 사령관',
                speciesName: '호랑이',
                emoji: '🐯',
                intro: 'KIA 타이거즈 출신의 우주 에이스! 화끈한 공격력과 저돌적인 돌파력.',
                skins: {
                    classic: { id: 'classic', name: '타이거 오렌지', suit: '#ea580c', helmet: '#ff9e00', visor: '#facc15', icon: '🟠', badge: '클래식' },
                    redleader: { id: 'redleader', name: '레드 스쿼드론', suit: '#dc2626', helmet: '#ef4444', visor: '#f87171', icon: '🔴', badge: '편대장' },
                    gold: { id: 'gold', name: '골드 챔피언', suit: '#d97706', helmet: '#fbbf24', visor: '#fef08a', icon: '🟡', badge: '레전드' }
                }
            },
            penguin: {
                id: 'penguin',
                name: '펭귄 스타파이터',
                speciesName: '펭귄',
                emoji: '🐧',
                intro: '얼음 행성 호스(Hoth) 출신의 파일럿! 빙판길처럼 미끄러지듯 날카로운 선회 기동.',
                skins: {
                    classic: { id: 'classic', name: '아틱 오렌지', suit: '#ea580c', helmet: '#f1f5f9', visor: '#38bdf8', icon: '🟠', badge: '클래식' },
                    navy: { id: 'navy', name: '딥 네이비 윙', suit: '#1e3a8a', helmet: '#3b82f6', visor: '#60a5fa', icon: '🔵', badge: '스페셜' },
                    frost: { id: 'frost', name: '프로스트 실버', suit: '#475569', helmet: '#cbd5e1', visor: '#93c5fd', icon: '❄️', badge: '극저온' }
                }
            },
            monkey: {
                id: 'monkey',
                name: '원숭이 스카이워커',
                speciesName: '원숭이',
                emoji: '🐵',
                intro: '황금 바나나를 되찾기 위해 나선 주인공! 반란군 로그 스쿼드론의 전설.',
                skins: {
                    classic: { id: 'classic', name: '로그 리더 오렌지', suit: '#ea580c', helmet: '#f8fafc', visor: '#38bdf8', icon: '🟠', badge: '클래식' },
                    stealth: { id: 'stealth', name: '블랙 옵스 스텔스', suit: '#0f172a', helmet: '#334155', visor: '#ef4444', icon: '⚫', badge: '비밀작전' },
                    golden: { id: 'golden', name: '골든 바나나 제트', suit: '#ca8a04', helmet: '#eab308', visor: '#fef08a', icon: '🍌', badge: '마스터' }
                }
            }
        };

        this.selectedPilot = localStorage.getItem('smilegames_space_pilot') || 'frog';
        this.selectedSkin = localStorage.getItem('smilegames_space_pilot_skin') || 'classic';

        // ⚡ 7종 레이저 광선 테마 (원형 플라즈마 에너지 볼 - 기본값: 스타워즈 레드)
        this.laserThemes = {
            red: {
                id: 'red',
                name: '스타워즈 레드',
                emoji: '🔴',
                core: '#ffffff',
                mid: '#f87171',
                main: '#ef4444',
                dark: '#991b1b',
                glow: '#ff0033',
                glowAlpha: 'rgba(239, 68, 68, 0.35)',
                rim: '#fca5a5',
                spark: '#ff3344'
            },
            blue: {
                id: 'blue',
                name: '제다이 블루',
                emoji: '🔵',
                core: '#ffffff',
                mid: '#60a5fa',
                main: '#3b82f6',
                dark: '#1e3a8a',
                glow: '#0066ff',
                glowAlpha: 'rgba(59, 130, 246, 0.35)',
                rim: '#93c5fd',
                spark: '#38bdf8'
            },
            green: {
                id: 'green',
                name: '에메랄드 그린',
                emoji: '🟢',
                core: '#ffffff',
                mid: '#86efac',
                main: '#22c55e',
                dark: '#15803d',
                glow: '#00ff88',
                glowAlpha: 'rgba(34, 197, 94, 0.35)',
                rim: '#4ade80',
                spark: '#00ff88'
            },
            yellow: {
                id: 'yellow',
                name: '골든 썬더',
                emoji: '🟡',
                core: '#ffffff',
                mid: '#fef08a',
                main: '#eab308',
                dark: '#854d0e',
                glow: '#ffcc00',
                glowAlpha: 'rgba(234, 179, 8, 0.35)',
                rim: '#fde047',
                spark: '#facc15'
            },
            purple: {
                id: 'purple',
                name: '바이올렛 빔',
                emoji: '🟣',
                core: '#ffffff',
                mid: '#d8b4fe',
                main: '#a855f7',
                dark: '#581c87',
                glow: '#c026d3',
                glowAlpha: 'rgba(168, 85, 247, 0.35)',
                rim: '#e9d5ff',
                spark: '#c084fc'
            },
            pink: {
                id: 'pink',
                name: '네온 핑크',
                emoji: '💖',
                core: '#ffffff',
                mid: '#f472b6',
                main: '#ec4899',
                dark: '#831843',
                glow: '#ff1493',
                glowAlpha: 'rgba(236, 72, 153, 0.35)',
                rim: '#fbcfe8',
                spark: '#f472b6'
            },
            cyan: {
                id: 'cyan',
                name: '사이언 크리스탈',
                emoji: '💎',
                core: '#ffffff',
                mid: '#67e8f9',
                main: '#06b6d4',
                dark: '#164e63',
                glow: '#00f0ff',
                glowAlpha: 'rgba(6, 182, 212, 0.35)',
                rim: '#a5f3fc',
                spark: '#22d3ee'
            }
        };

        this.selectedLaserColor = localStorage.getItem('smilegames_space_laser_color') || 'red';

        this.STORAGE_KEY = 'smilegames_space_rankings';
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.containerEl = document.getElementById('space-game-container');
        if (!this.containerEl) return;

        this.canvas = document.getElementById('space-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.initStars(260);
        this.bindEvents();
        this.updateHUD();
        this.isInitialized = true;
    }

    resize() {
        if (!this.canvas || !this.containerEl) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2); // ⚡ 고화질 레티나 / 4K 디스플레이 완벽 대응
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true; // ⚡ 최고화질 안티에일리어싱 적용
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
        } catch (e) {
            console.error(e);
        }
    }

    getAudioCtx() {
        this.ensureAudio();
        return (this.sound && this.sound.ctx) || this.audioCtx || null;
    }

    initStars(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * 2600,
                y: (Math.random() - 0.5) * 1600,
                z: Math.random() * 2000 + 40,
                color: Math.random() < 0.3 ? '#38bdf8' : (Math.random() < 0.15 ? '#f43f5e' : '#ffffff'),
                size: Math.random() * 2.5 + 1
            });
        }
    }

    bindEvents() {
        window.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });

        // 키보드 조작
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            this.ensureAudio();

            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
            if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;

            if (e.code === 'Space') {
                e.preventDefault();
                this.keys.space = true;
                this.fireSingleLaser();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isRunning) return;
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
            if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
            if (e.code === 'Space') this.keys.space = false;
        });

        // 태블릿 좌측 터치 스티어링
        const touchZone = document.getElementById('space-touch-zone');
        if (touchZone) {
            touchZone.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.ensureAudio();
                const t = e.touches[0];
                this.touch.active = true;
                this.touch.startX = t.clientX;
                this.touch.startY = t.clientY;
                this.touch.curX = t.clientX;
                this.touch.curY = t.clientY;
            }, { passive: false });

            touchZone.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (!this.touch.active) return;
                const t = e.touches[0];
                this.touch.curX = t.clientX;
                this.touch.curY = t.clientY;

                const dx = this.touch.curX - this.touch.startX;
                const dy = this.touch.curY - this.touch.startY;
                const maxRange = 110;
                this.player.targetX = Math.max(-315, Math.min(315, (dx / maxRange) * 315));
                this.player.targetY = Math.max(-130, Math.min(150, 80 + (dy / maxRange) * 120));
            }, { passive: false });

            const touchEnd = () => {
                this.touch.active = false;
                this.player.targetX = 0;
                this.player.targetY = 80;
            };
            touchZone.addEventListener('touchend', touchEnd);
            touchZone.addEventListener('touchcancel', touchEnd);
        }

        // 태블릿 우측 대형 레이저 발사 버튼
        const fireBtn = document.getElementById('btn-space-fire');
        if (fireBtn) {
            const onFirePress = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.fireSingleLaser();
            };
            fireBtn.addEventListener('pointerdown', onFirePress);
        }

        // HUD 및 모달 버튼
        const pilotBtn = document.getElementById('btn-space-pilot');
        if (pilotBtn) pilotBtn.addEventListener('click', () => {
            this.ensureAudio();
            this.showPilotModal();
        });

        const pilotLaunchBtn = document.getElementById('btn-space-pilot-launch');
        if (pilotLaunchBtn) pilotLaunchBtn.addEventListener('click', () => {
            this.ensureAudio();
            this.hidePilotModal();
            this.start();
        });

        const pilotHubBtn = document.getElementById('btn-space-pilot-hub');
        if (pilotHubBtn) pilotHubBtn.addEventListener('click', () => {
            this.hidePilotModal();
            this.openHubModal();
        });

        const pilotCharBtns = document.querySelectorAll('#space-pilot-char-selector .select-btn');
        pilotCharBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const pilot = btn.getAttribute('data-pilot');
                if (pilot) this.setPilot(pilot);
            });
        });

        // ⚡ 상단 HUD 레이저 색상 즉시 순환 토글 버튼
        const laserBtn = document.getElementById('btn-space-laser');
        if (laserBtn) laserBtn.addEventListener('click', () => {
            this.ensureAudio();
            this.cycleLaserColor();
        });

        const restartBtn = document.getElementById('btn-space-restart');
        if (restartBtn) restartBtn.addEventListener('click', () => {
            this.ensureAudio();
            this.start();
        });

        const hubBtn = document.getElementById('btn-space-hub');
        if (hubBtn) hubBtn.addEventListener('click', () => this.openHubModal());

        const goRestart = document.getElementById('btn-space-gameover-restart');
        if (goRestart) goRestart.addEventListener('click', () => {
            this.hideGameOverModal();
            this.start();
        });

        const goHub = document.getElementById('btn-space-gameover-hub');
        if (goHub) goHub.addEventListener('click', () => {
            this.hideGameOverModal();
            this.openHubModal();
        });

        const goBanana = document.getElementById('btn-space-gameover-banana');
        if (goBanana) goBanana.addEventListener('click', () => {
            this.hideGameOverModal();
            if (window.switchToBananaGame) window.switchToBananaGame();
        });

        // 🌟 승리 엔딩 모달 버튼들
        const victoryContinueBtn = document.getElementById('btn-space-victory-continue');
        if (victoryContinueBtn) victoryContinueBtn.addEventListener('click', () => {
            this.ensureAudio();
            this.resumeAfterVictory();
        });

        const victoryBananaBtn = document.getElementById('btn-space-victory-banana');
        if (victoryBananaBtn) victoryBananaBtn.addEventListener('click', () => {
            this.hideVictoryModal();
            if (window.switchToBananaGame) window.switchToBananaGame();
        });

        const victoryHubBtn = document.getElementById('btn-space-victory-hub');
        if (victoryHubBtn) victoryHubBtn.addEventListener('click', () => {
            this.hideVictoryModal();
            this.openHubModal();
        });
    }

    start(playerName = null) {
        this.init();
        this.resize();
        this.ensureAudio();

        // 🚨 생각 그림(말풍선) 및 코믹 프레임 완전 숨김
        const bubble = document.querySelector('.peanuts-speech-bubble');
        if (bubble) bubble.style.display = 'none';
        const comicFrame = document.querySelector('.comic-frame');
        if (comicFrame) comicFrame.style.display = 'none';

        if (playerName) {
            this.playerName = playerName;
        } else {
            const savedName = localStorage.getItem('smilegames_last_player');
            if (savedName) this.playerName = savedName;
        }

        // 플레이어 초기화
        this.player.x = 0;
        this.player.y = 80;
        this.player.targetX = 0;
        this.player.targetY = 80;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.roll = 0;
        this.player.pitch = 0;
        this.player.hp = 100;
        this.player.shootCooldown = 0;
        this.player.isInvincible = 1.2;
        this.player.wallDamageCooldown = 0;

        // 점수 및 보스 상태
        this.score = 0;
        this.bossCount = 0;
        this.bossTargetScore = 14;
        this.boss.active = false;
        this.bossAlertTimer = 0;
        this.trenchDist = 0;

        // 엔티티 초기화
        this.lasers = [];
        this.enemyLasers = [];
        this.enemies = [];
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.enemySpawnTimer = 0.5;
        this.itemTimer = 0;

        this.isRunning = true;
        this.hideGameOverModal();
        this.hideVictoryModal();
        this.updateHUD();

        this.startSpaceBGM();

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
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.stopSpaceBGM();
    }

    /**
     * 1회당 단 1발의 픽셀 레이저 발사!
     */
    fireSingleLaser() {
        if (!this.isRunning || this.player.shootCooldown > 0) return;

        const curTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;

        // 우주선 중앙 기수에서 발사되는 단일 레이저 빔
        this.lasers.push({
            x: this.player.x,
            y: this.player.y - 14,
            z: 50,
            prevZ: 50,
            vz: 1650, // ⚡ 너무 빠르지 않고 동그라미 탄환 비행이 뚜렷하게 보이는 최적 탄속!
            length: 100, // 확실한 빔 길이
            color: this.selectedLaserColor,
            alive: true
        });

        this.player.shootCooldown = 0.38; // ⚡ 연사 속도 완화: 0.18s -> 0.38s (초당 약 2.6발로 편안한 발사 템포)
        this.playBlasterSound();

        // 세련된 초고속 이온 총구 플래시 스파크 (선택된 레이저 컬러 테마 반영)
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.player.x + (Math.random() - 0.5) * 8,
                y: this.player.y - 14 + (Math.random() - 0.5) * 8,
                z: 60,
                vx: (Math.random() - 0.5) * 90,
                vy: (Math.random() - 0.5) * 90,
                vz: 280,
                life: 0.1,
                maxLife: 0.1,
                color: Math.random() < 0.5 ? '#ffffff' : curTheme.spark,
                size: 2.8,
                isPixel: true
            });
        }
    }

    update(dt) {
        if (this.player.shootCooldown > 0) this.player.shootCooldown -= dt;
        if (this.player.isInvincible > 0) this.player.isInvincible -= dt;

        // ⚡ 스페이스바 누르고 있을 시 부드러운 자동 사격 (사격 누락 방지)
        if (this.keys.space && this.player.shootCooldown <= 0) {
            this.fireSingleLaser();
        }

        // 1. 플레이어 조작 & 뱅크 롤
        const moveSpeed = 380;
        let moveX = 0;
        let moveY = 0;

        if (this.keys.left) moveX -= 1;
        if (this.keys.right) moveX += 1;
        if (this.keys.up) moveY -= 1;
        if (this.keys.down) moveY += 1;

        if (!this.touch.active) {
            this.player.targetX += moveX * moveSpeed * dt;
            this.player.targetY += moveY * moveSpeed * dt;
            // 트렌치 내부 비행 한계선 (벽면 및 바닥 접촉 가능 범위)
            this.player.targetX = Math.max(-315, Math.min(315, this.player.targetX));
            this.player.targetY = Math.max(-130, Math.min(150, this.player.targetY));
        }

        this.player.x += (this.player.targetX - this.player.x) * 12 * dt;
        this.player.y += (this.player.targetY - this.player.y) * 12 * dt;

        // 🧱 트렌치 벽면 및 바닥 충돌 판정 & 데미지
        if (this.player.wallDamageCooldown > 0) {
            this.player.wallDamageCooldown -= dt;
        }

        const trenchW = 340;
        const wingHalf = 46;
        const leftLimit = -trenchW + wingHalf;  // -294 (좌측 날개 충돌선)
        const rightLimit = trenchW - wingHalf;   // 294 (우측 날개 충돌선)
        const floorLimit = 142;                  // 142 (바닥 충돌선)

        // (1) 좌측 벽면 충돌
        if (this.player.x <= leftLimit) {
            this.player.x = leftLimit;
            this.player.targetX = Math.max(leftLimit + 30, this.player.targetX); // 반발 튕김
            this.createWallSparks(-trenchW, this.player.y, 16);

            if (this.player.wallDamageCooldown <= 0) {
                this.player.wallDamageCooldown = 0.42;
                this.hitPlayer(15);
                this.playWallHitSound();
                this.showScorePopup(this.player.x, this.player.y - 25, 20, '💥 벽면 충돌! (-15 HP)');
            }
        }

        // (2) 우측 벽면 충돌
        if (this.player.x >= rightLimit) {
            this.player.x = rightLimit;
            this.player.targetX = Math.min(rightLimit - 30, this.player.targetX); // 반발 튕김
            this.createWallSparks(trenchW, this.player.y, 16);

            if (this.player.wallDamageCooldown <= 0) {
                this.player.wallDamageCooldown = 0.42;
                this.hitPlayer(15);
                this.playWallHitSound();
                this.showScorePopup(this.player.x, this.player.y - 25, 20, '💥 벽면 충돌! (-15 HP)');
            }
        }

        // (3) 바닥 충돌
        if (this.player.y >= floorLimit) {
            this.player.y = floorLimit;
            this.player.targetY = Math.min(floorLimit - 30, this.player.targetY); // 반발 상승
            this.createWallSparks(this.player.x, 165, 16);

            if (this.player.wallDamageCooldown <= 0) {
                this.player.wallDamageCooldown = 0.42;
                this.hitPlayer(15);
                this.playWallHitSound();
                this.showScorePopup(this.player.x, this.player.y - 25, 20, '💥 바닥 충돌! (-15 HP)');
            }
        }

        const targetRoll = (this.player.targetX - this.player.x) * 0.0038;
        this.player.roll += (targetRoll - this.player.roll) * 11 * dt;

        const targetPitch = (this.player.y - this.player.targetY) * 0.0022;
        this.player.pitch += (targetPitch - this.player.pitch) * 10 * dt;

        // 2. 엔진 부스터 픽셀 파티클 분사
        if (Math.random() < 0.9) {
            [-16, 16].forEach(ex => {
                this.particles.push({
                    x: this.player.x + ex * Math.cos(this.player.roll),
                    y: this.player.y + 14 + ex * Math.sin(this.player.roll),
                    z: -8,
                    vx: (Math.random() - 0.5) * 20,
                    vy: Math.random() * 25 + 20,
                    vz: -Math.random() * 320 - 240,
                    life: 0.22,
                    maxLife: 0.22,
                    color: Math.random() < 0.6 ? '#38bdf8' : '#0284c7',
                    size: 3.5,
                    isPixel: true
                });
            });
        }

        // 3. X-Tech Run 트렌치 네온 그리드 스크롤 & 3D 별빛
        const warpSpeed = this.boss.active ? 850 : 620;
        this.trenchDist += warpSpeed * dt;

        this.stars.forEach(star => {
            star.z -= warpSpeed * dt;
            if (star.z <= 10) {
                star.z = 2000;
                star.x = (Math.random() - 0.5) * 2600;
                star.y = (Math.random() - 0.5) * 1600;
            }
        });

        // 4. 플레이어 레이저 전진
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.prevZ = l.z;
            l.z += l.vz * dt;
            if (l.z > 1950) {
                this.lasers.splice(i, 1);
            }
        }

        // 5. 적 / 보스 레이저 전진
        for (let i = this.enemyLasers.length - 1; i >= 0; i--) {
            const el = this.enemyLasers[i];
            el.prevZ = el.z;
            el.z -= el.vz * dt;
            el.x += (el.vx || 0) * dt;
            el.y += (el.vy || 0) * dt;

            // 플레이어 피격 판정
            if (el.z < 45 && el.z > -45) {
                const dist = Math.hypot(el.x - this.player.x, el.y - this.player.y);
                if (dist < 46 && this.player.isInvincible <= 0) {
                    this.enemyLasers.splice(i, 1);
                    this.hitPlayer(18);
                    continue;
                }
            }

            if (el.z < -80) {
                this.enemyLasers.splice(i, 1);
            }
        }

        // 5-2. 💚 체력 회복 캡슐 아이템 업데이트 & 수거 판정
        this.itemTimer += dt;
        if (this.itemTimer > 15 && this.items.length < 1 && this.player.hp < 80) {
            this.itemTimer = 0;
            this.spawnHealthItem((Math.random() - 0.5) * 260, Math.random() * 50 + 20, 1650);
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            it.prevZ = it.z;
            it.z -= it.vz * dt;
            it.rot += 3.2 * dt;
            it.pulse += 5 * dt;

            // 플레이어 기체 수거 판정 (너그러운 75px 반경)
            if (it.z < 60 && it.z > -45) {
                const dist = Math.hypot(it.x - this.player.x, it.y - this.player.y);
                if (dist < 75) {
                    const oldHp = this.player.hp;
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + it.healAmount);
                    const healed = this.player.hp - oldHp;

                    this.playHealthPickupSound();
                    this.createHealthPickupParticles(this.player.x, this.player.y);
                    this.showScorePopup(this.player.x, this.player.y - 30, 20, `+${healed} HP 회복! ❤️`);
                    this.updateHUD();

                    this.items.splice(i, 1);
                    continue;
                }
            }

            if (it.z < -60) {
                this.items.splice(i, 1);
            }
        }

        if (this.bossAlertTimer > 0) {
            this.bossAlertTimer -= dt;
        }

        // 정확히 14포인트마다 보스 출현!
        if (this.score >= this.bossTargetScore && !this.boss.active) {
            this.spawnBoss();
        }

        if (this.boss.active) {
            this.updateBoss(dt);
        } else {
            this.updateNormalEnemies(dt);
            this.updateObstacleShips(dt);
        }

        // 6. 충돌 판정 (완벽한 연속 판정 & 쉴드 반사)
        this.checkCollisions();

        // 7. 픽셀 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += (p.vz || 0) * dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 일반 적 전투기 스폰 및 비행 (과밀 해소: 한 번에 최대 2기, 2.4초 간격 스폰!)
     */
    updateNormalEnemies(dt) {
        // 적 우주선 수: 2명 추가하여 동시 최대 4기 유지!
        this.enemySpawnTimer -= dt;
        if (this.enemies.length < 4 && this.enemySpawnTimer <= 0) {
            this.enemySpawnTimer = 1.3 + Math.random() * 0.7;
            const spawnX = (Math.random() - 0.5) * 440;
            const spawnY = (Math.random() - 0.5) * 160 - 10;
            this.enemies.push({
                x: spawnX,
                y: spawnY,
                z: 1650 + Math.random() * 200,
                prevZ: 1650,
                targetX: (Math.random() - 0.5) * 240,
                targetY: Math.random() * 70 + 10,
                vz: 380 + Math.random() * 60, // 적당하고 침착한 비행 속도
                roll: (Math.random() - 0.5) * 1.5,
                shootTimer: Math.random() * 1.5 + 1.2,
                chargeFlash: false,
                type: Math.random() < 0.4 ? 'interceptor' : 'fighter',
                hp: 1,
                alive: true
            });
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.prevZ = e.z;
            e.z -= e.vz * dt;
            e.x += (e.targetX - e.x) * 0.9 * dt;
            e.y += (e.targetY - e.y) * 0.9 * dt;
            e.roll += 0.6 * dt;

            // 🚨 적 레이저 발사 전 사전 경고 섬광 (Pre-fire Charge Flash)
            e.shootTimer -= dt;
            if (e.shootTimer <= 0.45 && e.shootTimer > 0 && e.z > 300 && e.z < 1350) {
                e.chargeFlash = true; // 총구 차징 섬광 켜기
            } else {
                e.chargeFlash = false;
            }

            // 적 레이저 발사
            if (e.shootTimer <= 0 && e.z > 300 && e.z < 1350) {
                e.shootTimer = 3.2; // 여유 있는 사격 간격
                e.chargeFlash = false;
                const dx = (this.player.x - e.x) / (e.z / 550);
                const dy = (this.player.y - e.y) / (e.z / 550);
                this.enemyLasers.push({
                    x: e.x,
                    y: e.y + 4,
                    z: e.z,
                    prevZ: e.z,
                    vx: dx * 0.42,
                    vy: dy * 0.42,
                    vz: 660, // 적당히 빠르고 스릴 넘치는 탄속
                    length: 120, // 길고 뚜렷한 빔
                    color: '#ff0055'
                });
                this.playEnemyBlasterSound();
            }

            // 플레이어 기체 충돌
            if (e.z < 45 && e.z > -45) {
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < 52 && this.player.isInvincible <= 0) {
                    this.createPixelExplosion(e.x, e.y, e.z, 24);
                    this.enemies.splice(i, 1);
                    this.hitPlayer(25);
                    continue;
                }
            }

            if (e.z < -60) {
                this.enemies.splice(i, 1);
            }
        }
    }

    /**
     * 🛡️ 안 맞는 우주선 (레이저가 튕겨나가는 방어막 중장갑 장애물 기체 - 최대 1기 유지)
     */
    updateObstacleShips(dt) {
        // 화면에 최대 1대만 간헐적으로 출현
        if (this.obstacles.length < 1 && Math.random() < 0.008) {
            const laneX = [-180, 0, 180][Math.floor(Math.random() * 3)];
            this.obstacles.push({
                x: laneX,
                y: Math.random() * 60 - 5,
                z: 1800,
                prevZ: 1800,
                vz: 480,
                shieldPulse: 0,
                width: 70,
                height: 50,
                alive: true
            });
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.prevZ = obs.z;
            obs.z -= obs.vz * dt;
            obs.shieldPulse += dt * 5;

            // 플레이어와 충돌 시 실드 피해
            if (obs.z < 45 && obs.z > -45) {
                const dist = Math.hypot(obs.x - this.player.x, obs.y - this.player.y);
                if (dist < 60 && this.player.isInvincible <= 0) {
                    this.createPixelExplosion(obs.x, obs.y, obs.z, 20);
                    this.obstacles.splice(i, 1);
                    this.hitPlayer(30);
                    continue;
                }
            }

            if (obs.z < -80) {
                this.obstacles.splice(i, 1);
            }
        }
    }

    spawnBoss() {
        this.boss.active = true;
        this.boss.phase = 'entering';
        this.boss.x = 0;
        this.boss.y = -50;
        this.boss.z = 1750;
        this.boss.targetX = 0;
        this.boss.targetY = -35;
        const scaledHp = 15 + this.bossCount * 3; // 👾 보스 체력 (15 HP 시작)
        this.boss.hp = scaledHp;
        this.boss.maxHp = scaledHp;
        this.boss.shootTimer = 1.4;
        this.boss.moveTimer = 0;
        this.boss.flashTimer = 0;

        this.bossAlertTimer = 3.2;
        this.playBossSiren();

        this.enemies.forEach(e => this.createPixelExplosion(e.x, e.y, e.z, 14));
        this.enemies = [];
        this.obstacles = [];

        this.updateHUD();
    }

    updateBoss(dt) {
        const b = this.boss;

        if (b.phase === 'entering') {
            b.z -= 450 * dt;
            if (b.z <= 680) {
                b.z = 680;
                b.phase = 'fighting';
            }
        } else if (b.phase === 'fighting') {
            b.moveTimer += dt;
            b.x = Math.sin(b.moveTimer * 1.5) * 170;
            b.y = -35 + Math.cos(b.moveTimer * 2.4) * 45;

            if (b.flashTimer > 0) b.flashTimer -= dt;

            b.shootTimer -= dt;
            if (b.shootTimer <= 0) {
                b.shootTimer = 1.1;
                this.fireBossLasers();
            }
        } else if (b.phase === 'exploding') {
            b.explodeTimer += dt;
            if (Math.random() < 0.5) {
                const ex = b.x + (Math.random() - 0.5) * 190;
                const ey = b.y + (Math.random() - 0.5) * 95;
                this.createPixelExplosion(ex, ey, b.z, 30);
                this.playExplosionSound(true);
            }

            if (b.explodeTimer >= 2.5) {
                b.active = false;
                this.bossCount++;
                // 🌟 15 HP 거대 보스 격침! 은하계 구출 대승리 엔딩 트리거!
                this.missionVictory();
            }
        }
    }

    fireBossLasers() {
        const b = this.boss;
        [-70, 70].forEach(turretOffset => {
            const dx = (this.player.x - (b.x + turretOffset)) / (b.z / 500);
            const dy = (this.player.y - (b.y + 12)) / (b.z / 500);
            this.enemyLasers.push({
                x: b.x + turretOffset,
                y: b.y + 12,
                z: b.z - 20,
                prevZ: b.z - 20,
                vx: dx * 0.55,
                vy: dy * 0.55,
                vz: 720,
                length: 130,
                color: '#f43f5e'
            });
        });
        this.playBossBlasterSound();
    }

    /**
     * 연속 스웹트 충돌 판정 (Continuous Swept Collision)
     * - 탄속이 빠르거나 프레임레이트가 변동되어도 적을 그냥 건너뛰는 현상을 100% 방지!
     */
    checkCollisions() {
        for (let lIdx = this.lasers.length - 1; lIdx >= 0; lIdx--) {
            const laser = this.lasers[lIdx];
            let laserConsumed = false;

            // 1. 🛡️ 안 맞는 우주선 (방어막 장애물 기체) 판정: 맞으면 '팅!' 하고 레이저 반사!
            for (let oIdx = this.obstacles.length - 1; oIdx >= 0; oIdx--) {
                const obs = this.obstacles[oIdx];
                // Z축 통과 구간 판정
                const zMin = Math.min(laser.prevZ, laser.z);
                const zMax = Math.max(laser.prevZ, laser.z) + laser.length;

                if (obs.z >= zMin - 40 && obs.z <= zMax + 40) {
                    const dx = Math.abs(laser.x - obs.x);
                    const dy = Math.abs(laser.y - obs.y);
                    if (dx < 58 && dy < 42) {
                        // 방어막에 튕겨나감!
                        this.lasers.splice(lIdx, 1);
                        laserConsumed = true;
                        this.createShieldDeflectSparks(laser.x, laser.y, obs.z);
                        this.playShieldDeflectSound();
                        this.showScorePopup(obs.x, obs.y, obs.z, '🛡️ DEFLECTED! (회피하세요)');
                        break;
                    }
                }
            }

            if (laserConsumed) continue;

            // 2. 일반 적 전투기 판정 (맞추면 정확히 1포인트!)
            for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
                const enemy = this.enemies[eIdx];
                const zMin = Math.min(laser.prevZ, laser.z);
                const zMax = Math.max(laser.prevZ, laser.z) + laser.length;

                if (enemy.z >= zMin - 45 && enemy.z <= zMax + 45) {
                    const dx = Math.abs(laser.x - enemy.x);
                    const dy = Math.abs(laser.y - enemy.y);
                    // 🎯 확실하고 시원한 조준 판정 (너그러운 아케이드 히트박스)
                    if (dx < 70 && dy < 54) {
                        this.enemies.splice(eIdx, 1);

                        // 💥 레이저가 적을 파괴해도 즉시 사라지지 않고, 관통하여 깊은 우주(z > 1950)까지 시원하게 전진 비행!
                        laser.pierceCount = (laser.pierceCount || 0) + 1;
                        if (laser.pierceCount >= 3) {
                            this.lasers.splice(lIdx, 1);
                            laserConsumed = true;
                        }

                        this.score += 1; // 정확히 1포인트 획득!
                        this.createPixelExplosion(enemy.x, enemy.y, enemy.z, 28);
                        this.playExplosionSound();
                        this.showScorePopup(enemy.x, enemy.y, enemy.z, '+1 POINT!');

                        // 💚 40% 확률로 체력 회복 캡슐 드롭 (체력 낮을 시 100% 드롭!)
                        if (Math.random() < 0.40 || this.player.hp < 45) {
                            this.spawnHealthItem(enemy.x, enemy.y, enemy.z);
                        }

                        // 🚨 적이 격추되면 해당 적이 발사했던 주변 잔여 레이저(유령 탄환)를 무력화 스파크로 즉시 정화!
                        for (let elIdx = this.enemyLasers.length - 1; elIdx >= 0; elIdx--) {
                            const el = this.enemyLasers[elIdx];
                            if (Math.abs(el.z - enemy.z) < 320 && Math.hypot(el.x - enemy.x, el.y - enemy.y) < 160) {
                                this.createShieldDeflectSparks(el.x, el.y, el.z);
                                this.enemyLasers.splice(elIdx, 1);
                            }
                        }

                        this.updateHUD();
                        if (laserConsumed) break;
                    }
                }
            }

            if (laserConsumed) continue;

            // 3. 거대 보스 판정
            if (this.boss.active && this.boss.phase === 'fighting') {
                const b = this.boss;
                const zMin = Math.min(laser.prevZ, laser.z);
                const zMax = Math.max(laser.prevZ, laser.z) + laser.length;

                if (b.z >= zMin - 60 && b.z <= zMax + 60) {
                    const dx = Math.abs(laser.x - b.x);
                    const dy = Math.abs(laser.y - b.y);
                    if (dx < 135 && dy < 65) {
                        this.lasers.splice(lIdx, 1);
                        b.hp -= 1;
                        b.flashTimer = 0.12;

                        this.playBossHitSound();
                        this.createShieldDeflectSparks(laser.x, laser.y, b.z);

                        if (b.hp <= 0) {
                            b.hp = 0;
                            b.phase = 'exploding';
                            b.explodeTimer = 0;
                            this.score += 5; // 보스 격파 보너스
                            this.showScorePopup(b.x, b.y, b.z, '🌟 BOSS CLEAR! +5 🌟');
                            // 보스 격파 시 전장의 모든 적 레이저 탄막 무력화!
                            for (const el of this.enemyLasers) {
                                this.createShieldDeflectSparks(el.x, el.y, el.z);
                            }
                            this.enemyLasers = [];
                        }

                        this.updateHUD();
                    }
                }
            }
        }
    }

    hitPlayer(damage) {
        if (this.player.isInvincible > 0) return;
        this.player.hp = Math.max(0, this.player.hp - damage);
        this.player.isInvincible = 1.0;
        this.playPlayerHitSound();

        if (this.containerEl) {
            this.containerEl.classList.remove('shake-space');
            void this.containerEl.offsetWidth;
            this.containerEl.classList.add('shake-space');
        }

        this.updateHUD();

        if (this.player.hp <= 0) {
            this.gameOver();
        }
    }

    createPixelExplosion(x, y, z, count = 22) {
        const colors = ['#f59e0b', '#ef4444', '#facc15', '#ffffff', '#fb923c'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 260 + 80;
            this.particles.push({
                x, y, z,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                vz: (Math.random() - 0.5) * speed,
                life: 0.45 + Math.random() * 0.35,
                maxLife: 0.8,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 4.5 + 3,
                isPixel: true
            });
        }
    }

    createShieldDeflectSparks(x, y, z) {
        for (let i = 0; i < 9; i++) {
            this.particles.push({
                x, y, z,
                vx: (Math.random() - 0.5) * 220,
                vy: (Math.random() - 0.5) * 220,
                vz: Math.random() * 240 + 80,
                life: 0.22,
                maxLife: 0.22,
                color: '#38bdf8',
                size: 3.5,
                isPixel: true
            });
        }
    }

    showScorePopup(x, y, z, text) {
        const fov = 460;
        const scale = fov / Math.max(z, 60);
        const sx = this.width / 2 + x * scale;
        const sy = this.height / 2 + y * scale;

        const pop = document.createElement('div');
        pop.className = 'space-score-popup';
        pop.textContent = text;
        pop.style.left = `${sx}px`;
        pop.style.top = `${sy}px`;
        this.containerEl.appendChild(pop);
        setTimeout(() => pop.remove(), 700);
    }

    // =========================================================================
    // 3D 렌더링 파이프라인 (X-Tech Run 네온 트렌치 & 고퀄 픽셀 아트)
    // =========================================================================
    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        // ⚡ 최고화질 안티에일리어싱 세팅
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. 심우주 배경
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, this.width, this.height);

        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const fov = 460; // ⚡ 340 -> 460 대폭 향상! 우주선과 트렌치 디테일이 시원하고 선명하게 확대

        // 2. 3D 스타필드
        this.stars.forEach(star => {
            const scale = fov / star.z;
            const sx = centerX + star.x * scale;
            const sy = centerY + star.y * scale;

            if (sx >= 0 && sx <= this.width && sy >= 0 && sy <= this.height) {
                const prevScale = fov / (star.z + 32);
                const psx = centerX + star.x * prevScale;
                const psy = centerY + star.y * prevScale;

                ctx.strokeStyle = star.color;
                ctx.lineWidth = Math.min(star.size * scale * 2.2, 3);
                ctx.beginPath();
                ctx.moveTo(psx, psy);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            }
        });

        // 3. Math Playground X-Tech Run 스타일 3D 네온 트렌치 (Trench Corridor)
        this.renderTechRunTrench(ctx, centerX, centerY, fov);

        // 4. 적 / 보스 레이저 (원근감 동그라미 플라즈마 에너지 볼)
        // ⚡ 플레이어 레이저와 명확히 구분되도록 대비 색상 자동 적용!
        // 플레이어가 녹색 계열을 고르면 적기는 강렬한 레드(#ef4444), 그 외(기본 레드 등)는 제국군 에메랄드 그린(#22c55e)
        const isPlayerGreen = (this.selectedLaserColor === 'green');
        const enemyGlow = isPlayerGreen ? '#ff0055' : '#00ff88';
        const enemyGlowAlpha = isPlayerGreen ? 'rgba(255, 0, 85, 0.32)' : 'rgba(0, 255, 136, 0.32)';
        const enemyMid = isPlayerGreen ? '#fca5a5' : '#86efac';
        const enemyMain = isPlayerGreen ? '#ef4444' : '#22c55e';
        const enemyDark = isPlayerGreen ? '#b91c1c' : '#15803d';
        const enemyRim = isPlayerGreen ? '#f87171' : '#4ade80';

        this.enemyLasers.forEach(el => {
            const scale = fov / Math.max(el.z, 20);
            const sx = centerX + el.x * scale;
            const sy = centerY + el.y * scale;

            const isBossBullet = (el.length > 100);
            const sizeMult = isBossBullet ? 1.4 : 1.0;
            // 🔴 동그라미 반지름 (원근감에 따라 10px ~ 22px 크기)
            const r = Math.max(10, 22 * Math.min(scale, 1.2)) * sizeMult;

            ctx.save();
            ctx.shadowColor = isBossBullet ? (isPlayerGreen ? '#ff3b30' : '#facc15') : enemyGlow;
            ctx.shadowBlur = Math.round(Math.max(14, 28 * Math.min(scale, 1.2)) * sizeMult);

            // [1] 외곽 동그라미 글로우 링
            ctx.fillStyle = isBossBullet ? (isPlayerGreen ? 'rgba(255, 69, 58, 0.35)' : 'rgba(250, 204, 21, 0.35)') : enemyGlowAlpha;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // [2] 3D 구체 입체 그라디언트 동그라미 에너지 볼 (Circle Plasma Orb)
            const grad = ctx.createRadialGradient(
                sx - r * 0.28, sy - r * 0.28, 0,
                sx, sy, r
            );
            grad.addColorStop(0, '#ffffff'); // 순백색 핵
            grad.addColorStop(0.25, isBossBullet ? '#fef08a' : enemyMid);
            grad.addColorStop(0.65, isBossBullet ? '#ea580c' : enemyMain);
            grad.addColorStop(0.92, isBossBullet ? '#9a3412' : enemyDark);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();

            // [3] 또렷한 외곽 네온 림 테두리 (Crisp Outline Ring)
            ctx.strokeStyle = isBossBullet ? '#fde047' : enemyRim;
            ctx.lineWidth = Math.max(2, 3.5 * Math.min(scale, 1.2));
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.stroke();

            // [4] 중심 순백색 하이라이트 동그라미
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx - r * 0.24, sy - r * 0.24, r * 0.32, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // 5. 🛡️ 안 맞는 우주선 (방어막 장애물 기체) 렌더링
        this.obstacles.forEach(obs => {
            this.renderShieldedObstacle(ctx, obs, centerX, centerY, fov);
        });

        // 5-2. 💚 체력 회복 캡슐 아이템 렌더링
        this.items.forEach(it => {
            this.renderHealthItem(ctx, it, centerX, centerY, fov);
        });

        // 6. 거대 제국 전함 픽셀 보스
        if (this.boss.active) {
            this.renderPixelBoss(ctx, centerX, centerY, fov);
        }

        // 7. 일반 적 전투기 고퀄리티 픽셀 렌더링
        this.enemies.forEach(e => {
            this.renderPixelEnemy(ctx, e, centerX, centerY, fov);
        });

        // 8. 플레이어 단일 레이저 (7컬러 팔레트 지원 동그라미 플라즈마 에너지 볼)
        const defaultLaserTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;
        this.lasers.forEach(l => {
            const lTheme = this.laserThemes[l.color] || defaultLaserTheme;
            const scale = fov / Math.max(l.z, 20);
            const sx = centerX + l.x * scale;
            const sy = centerY + l.y * scale;

            // 🔴 동그라미 반지름 (원근감에 따라 11px ~ 26px 크기로 둥글고 선명하게 렌더링)
            const r = Math.max(11, 26 * Math.min(scale, 1.2));

            ctx.save();
            ctx.shadowColor = lTheme.glow;
            ctx.shadowBlur = Math.round(Math.max(14, 28 * Math.min(scale, 1.2)));

            // [1] 외곽 소프트 네온 동그라미 글로우 링
            ctx.fillStyle = lTheme.glowAlpha;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // [2] 3D 구체 입체 그라디언트 동그라미 에너지 볼 (Circle Plasma Orb)
            const grad = ctx.createRadialGradient(
                sx - r * 0.28, sy - r * 0.28, 0,
                sx, sy, r
            );
            grad.addColorStop(0, lTheme.core); // 순백색 초고열 핵
            grad.addColorStop(0.25, lTheme.mid); // 밝은 중간 플라즈마
            grad.addColorStop(0.65, lTheme.main); // 강렬한 메인 레이저 컬러
            grad.addColorStop(0.92, lTheme.dark); // 짙은 테두리
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();

            // [3] 또렷한 외곽 네온 림 테두리 (Crisp Outline Ring)
            ctx.strokeStyle = lTheme.rim;
            ctx.lineWidth = Math.max(2, 3.5 * Math.min(scale, 1.2));
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.stroke();

            // [4] 중심 순백색 하이라이트 동그라미 (Pure White Center Core)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx - r * 0.24, sy - r * 0.24, r * 0.32, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });

        // 9. 픽셀 파티클 렌더링
        this.particles.forEach(p => {
            const z = Math.max(p.z, 15);
            const scale = fov / z;
            const sx = centerX + p.x * scale;
            const sy = centerY + p.y * scale;

            if (sx >= -50 && sx <= this.width + 50 && sy >= -50 && sy <= this.height + 50) {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                // 네모난 픽셀 블록 파티클
                const pSize = Math.max(2, p.size * scale);
                ctx.fillRect(sx - pSize / 2, sy - pSize / 2, pSize, pSize);
                ctx.restore();
            }
        });

        // 10. 플레이어 우주선 (우주선 뒤 시점 고퀄리티 픽셀 아트)
        this.renderPixelPlayerShip(ctx, centerX, centerY);

        // 🚨 과녁(Targeting Reticle)은 유저 요청에 따라 완전 삭제됨!
    }

    /**
     * 스타워즈 데스스타 트렌치 런 (정통 일반 벽 - Star Wars Imperial Trench Wall)
     * - 좌우 완벽히 직각으로 똑바로 선 리얼 메탈릭 벽면 (Straight Upright Industrial Armor Walls)
     * - 모듈러 강철 장갑판, 리벳, 표면 배관 파이프, 벽면 방어 지지대
     * - 상단 개방형 우주 뷰 (No weird arches, open starry sky above)
     * - 중앙 배기 통로 & 유도 활주선이 있는 견고한 트렌치 바닥
     */
    renderTechRunTrench(ctx, centerX, centerY, fov) {
        ctx.save();
        const trenchWidth = 340;
        const trenchFloorY = 165;
        const trenchRimY = -170; // 벽면 상단 림
        const maxZ = 1800;
        const minZ = 50;

        // 1. 소실점 원경 음영 (Horizon Fade)
        const farScale = fov / maxZ;
        const farX1 = centerX - trenchWidth * farScale;
        const farX2 = centerX + trenchWidth * farScale;
        const farYCeil = centerY + trenchRimY * farScale;
        const farYFloor = centerY + trenchFloorY * farScale;

        ctx.fillStyle = '#0a0e17';
        ctx.fillRect(farX1, farYCeil, farX2 - farX1, farYFloor - farYCeil);

        // 2. 깊이 슬라이스 렌더링 (원경 -> 근경 순서로 똑바로 선 일반 벽과 바닥 렌더링)
        const segmentSpacing = 110;
        const offset = this.trenchDist % segmentSpacing;
        let sliceIndex = Math.floor(this.trenchDist / segmentSpacing);

        for (let zNear = maxZ - offset; zNear >= minZ; zNear -= segmentSpacing) {
            const zFar = zNear + segmentSpacing;
            const sNear = fov / Math.max(zNear, 30);
            const sFar = fov / Math.max(zFar, 40);

            const xLN = centerX - trenchWidth * sNear;
            const xRN = centerX + trenchWidth * sNear;
            const yTN = centerY + trenchRimY * sNear;
            const yBN = centerY + trenchFloorY * sNear;

            const xLF = centerX - trenchWidth * sFar;
            const xRF = centerX + trenchWidth * sFar;
            const yTF = centerY + trenchRimY * sFar;
            const yBF = centerY + trenchFloorY * sFar;

            const isEven = (Math.abs(sliceIndex) % 2 === 0);
            sliceIndex--;

            // ==========================================
            // (1) 좌측 일반 벽면 (Left Straight Vertical Wall)
            // ==========================================
            ctx.beginPath();
            ctx.moveTo(xLN, yTN);
            ctx.lineTo(xLF, yTF);
            ctx.lineTo(xLF, yBF);
            ctx.lineTo(xLN, yBN);
            ctx.closePath();
            // 스타워즈 제국군 전함 특유의 건메탈/다크 슬레이트 아머 플레이트
            ctx.fillStyle = isEven ? '#1e2636' : '#252f42';
            ctx.fill();

            // 패널 이음새 (Panel Seams)
            ctx.strokeStyle = '#0f141f';
            ctx.lineWidth = Math.max(1, 1.8 * sNear);
            ctx.stroke();

            // 가로 분할 장갑선 (Horizontal Tier Seams)
            const yMidN = yTN + (yBN - yTN) * 0.5;
            const yMidF = yTF + (yBF - yTF) * 0.5;
            ctx.beginPath();
            ctx.moveTo(xLN, yMidN);
            ctx.lineTo(xLF, yMidF);
            ctx.strokeStyle = '#141b26';
            ctx.stroke();

            // 벽면 배관 파이프 (Industrial Conduit Pipe)
            const pipeYN = yTN + (yBN - yTN) * 0.72;
            const pipeYF = yTF + (yBF - yTF) * 0.72;
            ctx.beginPath();
            ctx.moveTo(xLN, pipeYN);
            ctx.lineTo(xLF, pipeYF);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = Math.max(1.5, 3.5 * sNear);
            ctx.stroke();

            // 똑바로 선 수직 강화 기둥 (Straight Vertical Buttress Pillar)
            ctx.beginPath();
            ctx.moveTo(xLN, yTN);
            ctx.lineTo(xLN, yBN);
            ctx.strokeStyle = '#111722';
            ctx.lineWidth = Math.max(3, 7 * sNear);
            ctx.stroke();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = Math.max(1, 2 * sNear);
            ctx.stroke();

            // ==========================================
            // (2) 우측 일반 벽면 (Right Straight Vertical Wall)
            // ==========================================
            ctx.beginPath();
            ctx.moveTo(xRN, yTN);
            ctx.lineTo(xRF, yTF);
            ctx.lineTo(xRF, yBF);
            ctx.lineTo(xRN, yBN);
            ctx.closePath();
            ctx.fillStyle = isEven ? '#1e2636' : '#252f42';
            ctx.fill();

            ctx.strokeStyle = '#0f141f';
            ctx.lineWidth = Math.max(1, 1.8 * sNear);
            ctx.stroke();

            // 우측 가로 분할 장갑선
            ctx.beginPath();
            ctx.moveTo(xRN, yMidN);
            ctx.lineTo(xRF, yMidF);
            ctx.strokeStyle = '#141b26';
            ctx.stroke();

            // 우측 벽면 배관 파이프
            ctx.beginPath();
            ctx.moveTo(xRN, pipeYN);
            ctx.lineTo(xRF, pipeYF);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = Math.max(1.5, 3.5 * sNear);
            ctx.stroke();

            // 우측 똑바로 선 수직 강화 기둥
            ctx.beginPath();
            ctx.moveTo(xRN, yTN);
            ctx.lineTo(xRN, yBN);
            ctx.strokeStyle = '#111722';
            ctx.lineWidth = Math.max(3, 7 * sNear);
            ctx.stroke();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = Math.max(1, 2 * sNear);
            ctx.stroke();

            // ==========================================
            // (3) 트렌치 바닥 (Trench Floor)
            // ==========================================
            ctx.beginPath();
            ctx.moveTo(xLN, yBN);
            ctx.lineTo(xRN, yBN);
            ctx.lineTo(xRF, yBF);
            ctx.lineTo(xLF, yBF);
            ctx.closePath();
            ctx.fillStyle = isEven ? '#131924' : '#17202e';
            ctx.fill();

            // 바닥 팽창 이음매 (Floor Expansion Joint)
            ctx.beginPath();
            ctx.moveTo(xLN, yBN);
            ctx.lineTo(xRN, yBN);
            ctx.strokeStyle = '#0d121c';
            ctx.lineWidth = Math.max(1, 2 * sNear);
            ctx.stroke();

            // 바닥 중앙 배기 통로 (Central Exhaust Channel)
            const midX1_N = centerX - 26 * sNear;
            const midX2_N = centerX + 26 * sNear;
            const midX1_F = centerX - 26 * sFar;
            const midX2_F = centerX + 26 * sFar;
            ctx.beginPath();
            ctx.moveTo(midX1_N, yBN);
            ctx.lineTo(midX2_N, yBN);
            ctx.lineTo(midX2_F, yBF);
            ctx.lineTo(midX1_F, yBF);
            ctx.closePath();
            ctx.fillStyle = '#0a0d14';
            ctx.fill();

            // 중앙 활주 유도선 점선 (Centerline Guide Ticks)
            if (isEven) {
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(centerX - Math.max(1.5, 2.5 * sNear), yBN - 1, Math.max(3, 5 * sNear), Math.max(2, 4 * sNear));
            }

            // ==========================================
            // (4) 벽면 상단 림 (Top Rim Catwalk Ledge)
            // ==========================================
            const rimW_N = 65 * sNear;
            const rimW_F = 65 * sFar;

            // 좌측 상단 림 표면 (Death Star Surface Ledge)
            ctx.beginPath();
            ctx.moveTo(xLN - rimW_N, yTN);
            ctx.lineTo(xLN, yTN);
            ctx.lineTo(xLF, yTF);
            ctx.lineTo(xLF - rimW_F, yTF);
            ctx.closePath();
            ctx.fillStyle = '#161c28';
            ctx.fill();
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 우측 상단 림 표면
            ctx.beginPath();
            ctx.moveTo(xRN, yTN);
            ctx.lineTo(xRN + rimW_N, yTN);
            ctx.lineTo(xRF + rimW_F, yTF);
            ctx.lineTo(xRF, yTF);
            ctx.closePath();
            ctx.fillStyle = '#161c28';
            ctx.fill();
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 상단 모서리 적색 경고 비콘 (Blinking Red Beacon Lights)
            if (Math.abs(sliceIndex) % 4 === 0) {
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 6;
                ctx.fillRect(xLN - 2, yTN - 2, 4, 4);
                ctx.fillRect(xRN - 2, yTN - 2, 4, 4);
                ctx.shadowBlur = 0;
            }
        }

        // 3. 트렌치 모서리 베벨 라인 (Corner Bevel Lines)
        const sMin = fov / minZ;
        const sMax = fov / maxZ;

        // 좌/우 벽면 상단 모서리
        [-trenchWidth, trenchWidth].forEach(tx => {
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(centerX + tx * sMin, centerY + trenchRimY * sMin);
            ctx.lineTo(centerX + tx * sMax, centerY + trenchRimY * sMax);
            ctx.stroke();

            // 좌/우 벽-바닥 결합 모서리 (Corner Seam)
            ctx.strokeStyle = '#090d14';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(centerX + tx * sMin, centerY + trenchFloorY * sMin);
            ctx.lineTo(centerX + tx * sMax, centerY + trenchFloorY * sMax);
            ctx.stroke();
        });

        ctx.restore();
    }

    /**
     * 플레이어 우주선 (스타워즈 반란군 T-65B X-윙 스타파이터 - 디테일 에디션)
     */
    renderPixelPlayerShip(ctx, centerX, centerY) {
        const p = this.player;
        const px = Math.round(centerX + p.x);
        const py = Math.round(centerY + p.y);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.roll);

        if (p.isInvincible > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const size = 52; // 고퀄리티 X-윙 크기

        // 1. 공격 대형으로 전개된 4개의 S-포일 날개 (Attack Position X-Wings)
        const wings = [
            { x: -size * 0.88, y: -size * 0.44, dirX: -1, dirY: -1 }, // 상좌
            { x: -size * 0.88, y: size * 0.38, dirX: -1, dirY: 1 },   // 하좌
            { x: size * 0.88, y: -size * 0.44, dirX: 1, dirY: -1 },   // 상우
            { x: size * 0.88, y: size * 0.38, dirX: 1, dirY: 1 }      // 하우
        ];

        wings.forEach(w => {
            // 날개 블레이드 장갑판
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(w.dirX * size * 0.2, 0);
            ctx.lineTo(w.x, w.y);
            ctx.lineTo(w.x, w.y + w.dirY * size * 0.14);
            ctx.lineTo(w.dirX * size * 0.2, w.dirY * size * 0.09);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 반란군 레드 파이브 시그니처 스트라이프 (Red Squadron Stripes)
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(w.x * 0.65, w.y * 0.65);
            ctx.lineTo(w.x * 0.84, w.y * 0.84);
            ctx.lineTo(w.x * 0.84, (w.y + w.dirY * size * 0.14) * 0.84);
            ctx.lineTo(w.x * 0.65, (w.y + w.dirY * size * 0.14) * 0.65);
            ctx.closePath();
            ctx.fill();

            // 윙팁 Taim & Bak KX9 레이저 포신 (Laser Cannon Barrels)
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(w.x - 2, w.y - 14, 4, 28);
            ctx.fillStyle = '#22c55e'; // 포구 발광 팁
            ctx.fillRect(w.x - 1, w.y - 15, 2, 2);
        });

        // 2. 4대의 대형 Incom 4L4 이온 엔진 배기구 & 플라즈마 분사 (4 Ion Engines)
        const engines = [
            { x: -size * 0.36, y: -size * 0.22 },
            { x: -size * 0.36, y: size * 0.2 },
            { x: size * 0.36, y: -size * 0.22 },
            { x: size * 0.36, y: size * 0.2 }
        ];

        engines.forEach(eng => {
            // 엔진 원형 나셀 하우징
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(eng.x, eng.y, 9.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 이온 플라즈마 분사 코어 (푸른빛 발광)
            const plasmaPulse = Math.sin(Date.now() * 0.02) * 2 + 6;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(eng.x, eng.y, plasmaPulse * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(eng.x, eng.y, plasmaPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // 3. 중앙 슬릭 동체 (Fuselage Body)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7); // 전방 노즈콘
        ctx.lineTo(-size * 0.22, size * 0.26);
        ctx.lineTo(size * 0.22, size * 0.26);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 4. 캐노피 윈도우 (Cockpit Glass) & 탑승 파일럿 (Pilot in Cockpit)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.48);
        ctx.lineTo(-size * 0.14, -size * 0.16);
        ctx.lineTo(size * 0.14, -size * 0.16);
        ctx.closePath();
        ctx.fill();

        // 🧑‍🚀 탑승 파일럿 렌더링 (점프 게임 캐릭터 + 파일럿 비행복 & 전용 스킨)
        this.renderPilotInCockpit(ctx, size);

        // 캐노피 투명 유리 반사광 & 콕핏 프레임
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.48);
        ctx.lineTo(-size * 0.14, -size * 0.16);
        ctx.lineTo(size * 0.14, -size * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 5. R2 아스트로멕 드로이드 유닛 (R2 Astromech Droid behind Cockpit)
        const droidY = -size * 0.08;
        ctx.fillStyle = '#e2e8f0'; // 실버 돔
        ctx.beginPath();
        ctx.arc(0, droidY, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2563eb'; // 블루 띠
        ctx.fillRect(-4, droidY - 2, 8, 3);
        ctx.fillStyle = '#ef4444'; // 드로이드 레드 센서 아이
        ctx.fillRect(Math.sin(Date.now() * 0.005) * 2, droidY - 1, 2, 2);

        // 실드 피격 보호막 (네온 픽셀 돔)
        if (p.isInvincible > 0.4) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(-size * 0.9, -size * 0.6, size * 1.8, size * 1.2);
        }

        ctx.restore();
    }

    /**
     * 일반 적 전투기 (스타워즈 제국군 TIE 파이터 & TIE 인터셉터 - 초정밀 디테일)
     */
    renderPixelEnemy(ctx, e, centerX, centerY, fov) {
        const scale = fov / Math.max(e.z, 20);
        const sx = centerX + e.x * scale;
        const sy = centerY + e.y * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(e.roll);

        const size = Math.max(14, 54 * scale);

        if (e.type === 'interceptor') {
            // ==========================================
            // ⭐ TIE INTERCEPTOR (제국군 TIE 인터셉터)
            // ==========================================
            [-1, 1].forEach(side => {
                const wx = side * size * 0.92;

                // 상단 대거 날개 (Forward Dagger Wing)
                ctx.beginPath();
                ctx.moveTo(wx, -size * 0.12);
                ctx.lineTo(side * size * 1.38, -size * 0.88);
                ctx.lineTo(wx, -size * 0.72);
                ctx.closePath();
                ctx.fillStyle = '#0a0e17';
                ctx.fill();
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = Math.max(1.2, 2.2 * scale);
                ctx.stroke();

                // 하단 대거 날개
                ctx.beginPath();
                ctx.moveTo(wx, size * 0.12);
                ctx.lineTo(side * size * 1.38, size * 0.88);
                ctx.lineTo(wx, size * 0.72);
                ctx.closePath();
                ctx.fillStyle = '#0a0e17';
                ctx.fill();
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = Math.max(1.2, 2.2 * scale);
                ctx.stroke();

                // 4대 윙팁 레이저 캐논 & 붉은 발광 총구
                [-1, 1].forEach(vSide => {
                    const tipX = side * size * 1.38;
                    const tipY = vSide * size * 0.88;
                    ctx.fillStyle = '#ef4444';
                    ctx.shadowColor = '#ef4444';
                    ctx.shadowBlur = 8;
                    ctx.fillRect(tipX - 2, tipY - 2, 4, 4);
                    ctx.shadowBlur = 0;
                });

                // 날개 중앙 연결 파일런
                ctx.fillStyle = '#334155';
                ctx.fillRect(Math.min(0, wx), -size * 0.12, Math.abs(wx), size * 0.24);
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.min(0, wx), -size * 0.12, Math.abs(wx), size * 0.24);
            });
        } else {
            // ==========================================
            // ⭐ TIE FIGHTER (제국군 표준 TIE 파이터)
            // ==========================================
            [-1, 1].forEach(side => {
                const wx = side * size * 0.94;
                const ww = size * 0.28;
                const wh = size * 1.4;

                // 정통 육각형 솔라 패널 날개 (True Hexagonal Solar Panel)
                ctx.beginPath();
                ctx.moveTo(wx, -wh * 0.5);
                ctx.lineTo(wx + side * ww * 0.5, -wh * 0.32);
                ctx.lineTo(wx + side * ww * 0.5, wh * 0.32);
                ctx.lineTo(wx, wh * 0.5);
                ctx.lineTo(wx - side * ww * 0.5, wh * 0.32);
                ctx.lineTo(wx - side * ww * 0.5, -wh * 0.32);
                ctx.closePath();

                // 딥 솔라 블랙
                ctx.fillStyle = '#0a0e17';
                ctx.fill();

                // 티타늄 외곽 프레임
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = Math.max(1.5, 3 * scale);
                ctx.stroke();

                // 6방향 구조 스포크 스트럿 (6 Radial Structural Spokes)
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = Math.max(1, 1.8 * scale);
                ctx.beginPath();
                ctx.moveTo(wx, 0); ctx.lineTo(wx, -wh * 0.5);
                ctx.moveTo(wx, 0); ctx.lineTo(wx, wh * 0.5);
                ctx.moveTo(wx, 0); ctx.lineTo(wx + side * ww * 0.5, -wh * 0.32);
                ctx.moveTo(wx, 0); ctx.lineTo(wx + side * ww * 0.5, wh * 0.32);
                ctx.moveTo(wx, 0); ctx.lineTo(wx - side * ww * 0.5, -wh * 0.32);
                ctx.moveTo(wx, 0); ctx.lineTo(wx - side * ww * 0.5, wh * 0.32);
                ctx.stroke();

                // 날개 중앙 원형 허브 캡
                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.arc(wx, 0, Math.max(3, 7.5 * scale), 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(wx, 0, Math.max(1.5, 3.5 * scale), 0, Math.PI * 2);
                ctx.fill();

                // 날개 연결 파일런
                ctx.fillStyle = '#334155';
                ctx.fillRect(Math.min(0, wx), -size * 0.1, Math.abs(wx), size * 0.2);
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.min(0, wx), -size * 0.1, Math.abs(wx), size * 0.2);
            });
        }

        // ==========================================
        // ⭐ 공통 중앙 구형 조종석 포드 (Spherical Cockpit Pod)
        // ==========================================
        const podR = Math.max(6, 17.5 * scale);

        // 3D 구체 음영 그라데이션 (금속 구체 입체감)
        const podGrad = ctx.createRadialGradient(
            -podR * 0.35, -podR * 0.35, podR * 0.1,
            0, 0, podR
        );
        podGrad.addColorStop(0, '#64748b');
        podGrad.addColorStop(0.4, '#334155');
        podGrad.addColorStop(0.85, '#1e293b');
        podGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(0, 0, podR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = Math.max(1, 1.8 * scale);
        ctx.stroke();

        // 스타워즈 시그니처: 정면 팔각형 조종석 윈도우 (Octagonal Viewport Glass)
        const viewR = podR * 0.62;
        ctx.fillStyle = '#060a12';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const vx = Math.cos(angle) * viewR;
            const vy = Math.sin(angle) * viewR;
            if (i === 0) ctx.moveTo(vx, vy);
            else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();

        // 윈도우 팔각 프레임 및 스포크 살
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.moveTo(Math.cos(angle) * viewR, Math.sin(angle) * viewR);
            ctx.lineTo(-Math.cos(angle) * viewR, -Math.sin(angle) * viewR);
        }
        ctx.stroke();

        // 윈도우 중앙 조준 센서 레드 글로우 (붉은 조준점)
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.5, 3 * scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 조종석 턱 밑 트윈 레이저 블래스터 포탑 (Twin Chin Cannons)
        [-1, 1].forEach(side => {
            const cx = side * podR * 0.42;
            const cy = podR * 0.82;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx - 1.5, cy, 3, Math.max(3, 7 * scale));
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 1, cy + Math.max(3, 7 * scale) - 1, 2, 2);
        });

        // 🚨 사격 0.45초 전 확실한 총구 차징 섬광 경고 (Pre-fire charging warning flash)
        if (e.chargeFlash) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 20;
            [-1, 1].forEach(side => {
                const cx = side * podR * 0.42;
                const cy = podR * 0.82 + Math.max(3, 7 * scale);
                ctx.beginPath();
                ctx.arc(cx, cy, Math.max(4, 9 * scale), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        ctx.restore();
    }

    /**
     * 🛡️ 안 맞는 우주선 (스타워즈 제국군 중장갑 바리어 기체 - 육각 편향 실드)
     */
    renderShieldedObstacle(ctx, obs, centerX, centerY, fov) {
        const scale = fov / Math.max(obs.z, 20);
        const sx = centerX + obs.x * scale;
        const sy = centerY + obs.y * scale;

        ctx.save();
        ctx.translate(sx, sy);

        const size = Math.max(16, 60 * scale);

        // 1. 제국군 중장갑 선체 바디 (Heavy Armored Gunboat Hull)
        ctx.beginPath();
        ctx.moveTo(0, size * 0.55); // 전방 기수
        ctx.lineTo(-size * 0.65, -size * 0.35);
        ctx.lineTo(-size * 0.3, -size * 0.55);
        ctx.lineTo(size * 0.3, -size * 0.55);
        ctx.lineTo(size * 0.65, -size * 0.35);
        ctx.closePath();
        ctx.fillStyle = '#1e2638';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(1.5, 2.5 * scale);
        ctx.stroke();

        // 장갑판 디테일 & 경고 옐로우 스트라이프
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-size * 0.2, -size * 0.1, size * 0.4, Math.max(2, 4 * scale));

        // 콕핏 바이저 (호박색 글로우)
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.fillRect(-size * 0.15, size * 0.2, size * 0.3, Math.max(2, 5 * scale));
        ctx.shadowBlur = 0;

        // 후방 듀얼 이온 엔진 배기구
        [-1, 1].forEach(side => {
            ctx.fillStyle = '#0284c7';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.fillRect(side * size * 0.25 - 3, -size * 0.58, 6, 4);
            ctx.shadowBlur = 0;
        });

        // 2. 🛡️ 스타워즈 편향 방어막 돔 (Deflector Shield Envelope)
        const pulse = Math.sin(obs.shieldPulse * 3) * 0.18 + 0.82;
        const shieldR = size * 0.95;

        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.75 * pulse})`;
        ctx.lineWidth = Math.max(2, 3.5 * scale);

        // 외곽 육각형 실드 버블
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = Math.cos(angle) * shieldR;
            const py = Math.sin(angle) * shieldR;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(14, 165, 233, ${0.12 * pulse})`;
        ctx.fill();
        ctx.stroke();

        // 내부 서브 헥사곤 실드 격자 라인
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI) / 3;
            ctx.moveTo(Math.cos(angle) * shieldR, Math.sin(angle) * shieldR);
            ctx.lineTo(-Math.cos(angle) * shieldR, -Math.sin(angle) * shieldR);
        }
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    /**
     * 14포인트마다 출현하는 거대 보스 (스타워즈 제국군 스타 디스트로이어 - Imperial Star Destroyer)
     */
    renderPixelBoss(ctx, centerX, centerY, fov) {
        const b = this.boss;
        const scale = fov / Math.max(b.z, 20);
        const sx = centerX + b.x * scale;
        const sy = centerY + b.y * scale;

        ctx.save();
        ctx.translate(sx, sy);

        const w = Math.max(80, 290 * scale);
        const h = w * 0.65;

        const isFlash = b.flashTimer > 0;
        const hullMain = isFlash ? '#ffffff' : '#1e2638';
        const hullDark = isFlash ? '#fef08a' : '#141a26';
        const hullEdge = isFlash ? '#facc15' : '#334155';

        // 1. 거대 쐐기형 선체 (Triangular Wedge Dagger Hull)
        ctx.beginPath();
        ctx.moveTo(0, h * 0.45); // 전방 기수 (Bow)
        ctx.lineTo(-w * 0.5, -h * 0.45); // 좌현 후방
        ctx.lineTo(w * 0.5, -h * 0.45);  // 우현 후방
        ctx.closePath();
        ctx.fillStyle = hullMain;
        ctx.fill();
        ctx.strokeStyle = hullEdge;
        ctx.lineWidth = Math.max(1.5, 3 * scale);
        ctx.stroke();

        // 2. 다단 상부 장갑 테라스 (Tiered Superstructure Terraces)
        ctx.beginPath();
        ctx.moveTo(0, h * 0.15);
        ctx.lineTo(-w * 0.28, -h * 0.35);
        ctx.lineTo(w * 0.28, -h * 0.35);
        ctx.closePath();
        ctx.fillStyle = hullDark;
        ctx.fill();
        ctx.strokeStyle = hullEdge;
        ctx.stroke();

        // 3. 스타 디스트로이어 함교 타워 & 트윈 편향 실드 돔 (Bridge Tower & Shield Globes)
        const bridgeW = w * 0.24;
        const bridgeH = h * 0.16;
        const bridgeY = -h * 0.42;

        ctx.fillStyle = '#2b3447';
        ctx.fillRect(-bridgeW * 0.5, bridgeY, bridgeW, bridgeH);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(-bridgeW * 0.5, bridgeY, bridgeW, bridgeH);

        // 파노라마 지휘 뷰포트 (푸른 창문 슬릿)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-bridgeW * 0.4, bridgeY + 2, bridgeW * 0.8, Math.max(2, 3 * scale));

        // 함교 탑 상단 트윈 쉴드 제너레이터 돔 (2 Geodesic Shield Domes)
        [-1, 1].forEach(side => {
            const domeX = side * bridgeW * 0.38;
            const domeY = bridgeY - bridgeH * 0.4;
            const domeR = Math.max(3, 7.5 * scale);
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(domeX, domeY, domeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.stroke();
        });

        // 4. 터보레이저 배터리 포탑 4문 (Turbolaser Batteries)
        [-w * 0.2, -w * 0.1, w * 0.1, w * 0.2].forEach(tx => {
            const ty = -h * 0.15;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(tx - 2, ty - 2, 4, 4);
        });

        // 5. 3D 공간 보스 체력바
        const barW = Math.max(80, 190 * scale);
        const barH = Math.max(6, 10 * scale);
        const hpPct = Math.max(0, b.hp / b.maxHp);

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(-barW / 2, -h * 0.65, barW, barH);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-barW / 2, -h * 0.65, barW, barH);

        ctx.fillStyle = hpPct > 0.4 ? '#ef4444' : '#f59e0b';
        ctx.fillRect(-barW / 2 + 1, -h * 0.65 + 1, (barW - 2) * hpPct, barH - 2);

        ctx.restore();
    }

    updateHUD() {
        const scoreEl = document.getElementById('space-score');
        const hpEl = document.getElementById('space-hp-bar-fill');
        const hpLabel = document.getElementById('space-hp-label');
        const bossProgEl = document.getElementById('space-boss-prog');
        const bossBarWrap = document.getElementById('space-boss-bar-wrap');
        const bossBarFill = document.getElementById('space-boss-bar-fill');
        const bossLabel = document.getElementById('space-boss-label');
        const bestEl = document.getElementById('space-best-score');

        if (scoreEl) scoreEl.textContent = this.score;

        if (hpEl) {
            const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
            hpEl.style.width = `${hpPct}%`;
            if (hpPct <= 25) {
                hpEl.style.background = '#ef4444';
            } else if (hpPct <= 55) {
                hpEl.style.background = '#f59e0b';
            } else {
                hpEl.style.background = '#10b981';
            }
        }

        if (hpLabel) {
            hpLabel.textContent = `❤️ 실드 ${this.player.hp} / ${this.player.maxHp}`;
        }

        if (bossProgEl) {
            if (this.boss.active) {
                bossProgEl.textContent = `👾 보스전 교전 중!!`;
                bossProgEl.style.color = '#ef4444';
            } else {
                const remaining = Math.max(0, this.bossTargetScore - this.score);
                bossProgEl.textContent = `보스 출현까지: 앞으로 ${remaining}기 격추`;
                bossProgEl.style.color = '#38bdf8';
            }
        }

        if (bossBarWrap) {
            if (this.boss.active) {
                bossBarWrap.style.display = 'block';
                if (bossBarFill) {
                    const bPct = Math.max(0, (this.boss.hp / this.boss.maxHp) * 100);
                    bossBarFill.style.width = `${bPct}%`;
                }
                if (bossLabel) {
                    bossLabel.textContent = `👾 제국 전함 보스 HP: ${this.boss.hp} / ${this.boss.maxHp}`;
                }
            } else {
                bossBarWrap.style.display = 'none';
            }
        }

        if (bestEl) {
            const ranks = this.getRankings();
            if (ranks.length > 0) {
                bestEl.textContent = `${ranks[0].score}점 (${ranks[0].name})`;
            }
        }

        // 🧑‍🚀 상단 HUD 파일럿 및 스킨 표시
        const pilotEl = document.getElementById('space-hud-pilot-name');
        if (pilotEl) {
            const pData = this.pilots[this.selectedPilot] || this.pilots.frog;
            const sData = pData.skins[this.selectedSkin] || pData.skins.classic;
            pilotEl.textContent = `${pData.emoji} ${pData.name} (${sData.name})`;
        }

        // ⚡ 상단 HUD 레이저 색상 버튼 표시
        const laserHudEl = document.getElementById('space-hud-laser-name');
        if (laserHudEl) {
            const lTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;
            laserHudEl.textContent = `${lTheme.emoji} ${lTheme.name}`;
        }
    }

    // =========================================================================
    // 🧑‍🚀 우주 파일럿 & 전용 스킨 & 레이저 색상 선택 시스템
    // =========================================================================
    showPilotModal() {
        this.stop(); // 모달 오픈 시 게임 일시 정지
        const modal = document.getElementById('space-pilot-modal');
        if (modal) {
            modal.classList.add('active');
            this.updatePilotSelectionUI();
        }
    }

    hidePilotModal() {
        const modal = document.getElementById('space-pilot-modal');
        if (modal) modal.classList.remove('active');
    }

    setPilot(pilotId) {
        if (!this.pilots[pilotId]) return;
        this.selectedPilot = pilotId;
        const skins = Object.keys(this.pilots[pilotId].skins);
        if (!this.pilots[pilotId].skins[this.selectedSkin]) {
            this.selectedSkin = skins[0];
        }
        localStorage.setItem('smilegames_space_pilot', this.selectedPilot);
        localStorage.setItem('smilegames_space_pilot_skin', this.selectedSkin);
        this.updatePilotSelectionUI();
        this.updateHUD();
    }

    setPilotSkin(skinId) {
        const pData = this.pilots[this.selectedPilot];
        if (!pData || !pData.skins[skinId]) return;
        this.selectedSkin = skinId;
        localStorage.setItem('smilegames_space_pilot_skin', this.selectedSkin);
        this.updatePilotSelectionUI();
        this.updateHUD();
    }

    setLaserColor(colorId) {
        if (!this.laserThemes[colorId]) return;
        this.selectedLaserColor = colorId;
        localStorage.setItem('smilegames_space_laser_color', colorId);
        this.updateLaserSelectionUI();
        this.updateHUD();
    }

    cycleLaserColor() {
        const colorKeys = Object.keys(this.laserThemes);
        const curIdx = colorKeys.indexOf(this.selectedLaserColor);
        const nextIdx = (curIdx + 1) % colorKeys.length;
        this.setLaserColor(colorKeys[nextIdx]);
        this.playBlasterSound();
    }

    updatePilotSelectionUI() {
        const pData = this.pilots[this.selectedPilot] || this.pilots.frog;
        const sData = pData.skins[this.selectedSkin] || pData.skins.classic;

        // 1. 파일럿 캐릭터 버튼 액티브 상태
        const pilotBtns = document.querySelectorAll('#space-pilot-char-selector .select-btn');
        pilotBtns.forEach(btn => {
            const id = btn.getAttribute('data-pilot');
            if (id === this.selectedPilot) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 2. 캐릭터 전용 스킨 버튼 동적 생성
        const skinSelector = document.getElementById('space-pilot-skin-selector');
        const skinTitle = document.getElementById('space-skin-title');
        if (skinTitle) {
            skinTitle.textContent = `👔 ${pData.name} 전용 파일럿 스킨 선택`;
        }

        if (skinSelector) {
            skinSelector.innerHTML = '';
            Object.values(pData.skins).forEach(skin => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `select-btn ${skin.id === this.selectedSkin ? 'active' : ''}`;
                btn.setAttribute('data-skin', skin.id);
                btn.innerHTML = `
                    <span class="btn-emoji">${skin.icon}</span>
                    <span class="btn-text" style="font-size:13.5px; font-weight:700;">${skin.name}</span>
                `;
                btn.addEventListener('click', () => {
                    this.setPilotSkin(skin.id);
                });
                skinSelector.appendChild(btn);
            });
        }

        // 3. 7종 레이저 광선 색상 버튼 UI 업데이트
        this.updateLaserSelectionUI();

        // 4. 실시간 파일럿 프리뷰 카드 업데이트
        const avatarEl = document.getElementById('pilot-preview-avatar');
        const nameEl = document.getElementById('pilot-preview-name');
        const skinEl = document.getElementById('pilot-preview-skin');
        const descEl = document.getElementById('pilot-preview-desc');
        const laserPreviewEl = document.getElementById('pilot-preview-laser');

        if (avatarEl) avatarEl.textContent = pData.emoji;
        if (nameEl) nameEl.textContent = pData.name;
        if (skinEl) skinEl.textContent = `비행복: ${sData.icon} ${sData.name} [${sData.badge}]`;
        if (descEl) descEl.textContent = pData.intro;

        const lTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;
        if (laserPreviewEl) {
            laserPreviewEl.textContent = `광선포: ${lTheme.emoji} ${lTheme.name}`;
            laserPreviewEl.style.color = lTheme.mid || '#f87171';
        }
    }

    updateLaserSelectionUI() {
        const laserSelector = document.getElementById('space-pilot-laser-selector');
        if (laserSelector) {
            laserSelector.innerHTML = '';
            Object.values(this.laserThemes).forEach(theme => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `select-btn ${theme.id === this.selectedLaserColor ? 'active' : ''}`;
                btn.setAttribute('data-laser', theme.id);
                btn.innerHTML = `
                    <span class="btn-emoji">${theme.emoji}</span>
                    <span class="btn-text" style="font-size:13px; font-weight:700;">${theme.name}</span>
                `;
                btn.addEventListener('click', () => {
                    this.setLaserColor(theme.id);
                    this.playBlasterSound();
                });
                laserSelector.appendChild(btn);
            });
        }

        const laserPreviewEl = document.getElementById('pilot-preview-laser');
        if (laserPreviewEl) {
            const lTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;
            laserPreviewEl.textContent = `광선포: ${lTheme.emoji} ${lTheme.name}`;
            laserPreviewEl.style.color = lTheme.mid || '#f87171';
        }
    }

    renderPilotInCockpit(ctx, size) {
        const pilotType = this.selectedPilot || 'frog';
        const skinType = this.selectedSkin || 'classic';
        const pilotData = this.pilots[pilotType] || this.pilots.frog;
        const skinData = pilotData.skins[skinType] || pilotData.skins.classic;

        const py = -size * 0.28;
        const headR = 5.2;

        ctx.save();

        // 1. 파일럿 비행복 어깨 & 생명유지 체스트 팩 (Pilot Flight Suit)
        ctx.fillStyle = skinData.suit;
        ctx.beginPath();
        ctx.moveTo(-6, py + 2);
        ctx.lineTo(6, py + 2);
        ctx.lineTo(7, py + 6.5);
        ctx.lineTo(-7, py + 6.5);
        ctx.closePath();
        ctx.fill();

        // 반란군 파일럿 산소 생명유지 체스트 박스
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-2.5, py + 3.2, 5, 3.2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-1.8, py + 3.8, 1.2, 1);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0.6, py + 3.8, 1.2, 1);

        // 2. 캐릭터별 고유 머리 & 파일럿 헬멧
        ctx.fillStyle = skinData.helmet;
        ctx.beginPath();
        ctx.arc(0, py - 1, headR, 0, Math.PI * 2);
        ctx.fill();

        // 헬멧 센터 릿지 스트라이프
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-1, py - 1 - headR, 2, headR * 1.5);

        // 3. 점프 게임 캐릭터 고유 생김새 (Frog / Tiger / Penguin / Monkey)
        if (pilotType === 'frog') {
            // 🐸 개구리: 헬멧 위에 솟은 큰 동그란 개구리 눈 2개
            [-3.4, 3.4].forEach(ex => {
                ctx.fillStyle = '#52b788';
                ctx.beginPath();
                ctx.arc(ex, py - 4.6, 2.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex, py - 4.6, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(ex, py - 4.6, 0.8, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (pilotType === 'tiger') {
            // 🐯 호랑이: 헬멧 양옆에 쫑긋 솟은 호랑이 귀 & 줄무늬
            [-4.2, 4.2].forEach(ex => {
                ctx.fillStyle = '#ff9e00';
                ctx.beginPath();
                ctx.arc(ex, py - 4.5, 2.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff5d8f';
                ctx.beginPath();
                ctx.arc(ex, py - 4.5, 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#14110f';
                ctx.fillRect(ex - 0.5, py - 6, 1, 1.5);
            });
        } else if (pilotType === 'penguin') {
            // 🐧 펭귄: 헬멧 하단 앙증맞은 주황 부리
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(0, py + 2.2);
            ctx.lineTo(-2.2, py + 0.3);
            ctx.lineTo(2.2, py + 0.3);
            ctx.closePath();
            ctx.fill();
        } else if (pilotType === 'monkey') {
            // 🐵 원숭이: 헬멧 양옆 둥근 귀
            [-5.2, 5.2].forEach(ex => {
                ctx.fillStyle = '#8d5b4c';
                ctx.beginPath();
                ctx.arc(ex, py - 1, 2.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fca5a5';
                ctx.beginPath();
                ctx.arc(ex, py - 1, 1.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 4. 비행 바이저 (Flight Visor)
        ctx.fillStyle = skinData.visor;
        ctx.beginPath();
        ctx.arc(0, py - 0.8, 3.8, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.lineTo(-3, py - 0.8);
        ctx.closePath();
        ctx.fill();

        // 바이저 하이라이트 글레어
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.6, py - 0.4, 3.2, 0.9);

        ctx.restore();
    }

    gameOver() {
        this.stop();
        this.playGameOverSound();

        const rankResult = this.saveRanking(this.playerName, this.score, this.bossCount);

        const modal = document.getElementById('space-gameover-modal');
        if (!modal) return;

        const finalScoreEl = document.getElementById('space-final-score');
        const finalBossEl = document.getElementById('space-final-boss');
        const rankListEl = document.getElementById('space-gameover-ranking-list');

        if (finalScoreEl) finalScoreEl.textContent = `${this.score}점`;
        if (finalBossEl) finalBossEl.textContent = `${this.bossCount}회 격파`;

        if (rankListEl) {
            this.renderRankingList(rankListEl, rankResult.list);
        }

        modal.classList.add('active');
    }

    hideGameOverModal() {
        const modal = document.getElementById('space-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * 🌟 15 HP 제국 거대 보스 격침! 은하계 구출 대승리 엔딩 세리머니
     */
    missionVictory() {
        this.stop();
        this.playGrandVictoryFanfare();

        // 🌟 15 HP 제국 보스 완파 기념 +50점 특별 보너스 지급 & 실드 풀회복!
        this.score += 50;
        this.player.hp = this.player.maxHp;
        this.updateHUD();

        const rankResult = this.saveRanking(this.playerName, this.score, this.bossCount);

        const modal = document.getElementById('space-victory-modal');
        if (!modal) return;

        const scoreEl = document.getElementById('space-victory-score');
        const bossEl = document.getElementById('space-victory-boss');
        const shieldEl = document.getElementById('space-victory-shield');
        const laserEl = document.getElementById('space-victory-laser');
        const rankListEl = document.getElementById('space-victory-ranking-list');
        const pilotAvatarEl = document.getElementById('victory-pilot-avatar');
        const pilotNameEl = document.getElementById('victory-pilot-name');
        const pilotSpeechEl = document.getElementById('victory-pilot-speech');

        if (scoreEl) scoreEl.textContent = this.score;
        if (bossEl) bossEl.textContent = `${this.bossCount}회 격파 (15 HP 완파)`;
        if (shieldEl) shieldEl.textContent = `100% (완전 충전)`;

        const lTheme = this.laserThemes[this.selectedLaserColor] || this.laserThemes.red;
        if (laserEl) laserEl.textContent = `${lTheme.emoji} ${lTheme.name}`;

        const pData = this.pilots[this.selectedPilot] || this.pilots.frog;
        const sData = pData.skins[this.selectedSkin] || pData.skins.classic;

        if (pilotAvatarEl) pilotAvatarEl.textContent = pData.emoji;
        if (pilotNameEl) pilotNameEl.textContent = `${pData.name} (${sData.name})`;

        const quotes = {
            frog: `"개굴! 포스가 우리와 함께했다! 제국 전함의 주 반응로를 완벽하게 침몰시켰어!"`,
            tiger: `"어흥! 전함 녀석도 우리 화끈한 레이저 앞에서는 한 방이지! 은하계는 안전하다!"`,
            penguin: `"얼음처럼 차갑고 날카로운 사격이었다! 제국 모함 격침 확인! 귀환을 환영합니다!"`,
            monkey: `"우끼끼! 황금 바나나의 힘으로 제국 함대를 박살냈다! 전 은하계에 평화가 찾아왔다!"`
        };
        if (pilotSpeechEl) pilotSpeechEl.textContent = quotes[this.selectedPilot] || quotes.frog;

        if (rankListEl) {
            this.renderRankingList(rankListEl, rankResult.list);
        }

        modal.classList.add('active');
    }

    hideVictoryModal() {
        const modal = document.getElementById('space-victory-modal');
        if (modal) modal.classList.remove('active');
    }

    /**
     * 🚀 승리 후 다음 행성 구출 작전 출격 (무한 루프 모드 계속하기)
     */
    resumeAfterVictory() {
        this.hideVictoryModal();
        this.hideGameOverModal();

        this.boss.active = false;
        this.boss.phase = 'entering';
        this.boss.hp = 15;
        this.boss.maxHp = 15;
        this.bossTargetScore = this.score + 14;
        this.enemyLasers = [];
        this.player.hp = this.player.maxHp;
        this.player.isInvincible = 2.0;
        this.isRunning = true;
        this.updateHUD();
        this.startSpaceBGM();

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
        this.showScorePopup('🚀 다음 작전 구역 진입!', this.width / 2, this.height * 0.45);
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
        this.hideVictoryModal();
        if (this.containerEl) {
            this.containerEl.style.display = 'none';
        }
        const hubModal = document.getElementById('hub-modal');
        if (hubModal) {
            hubModal.classList.add('active');
        }
    }

    getRankings() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}

        const defaultRanks = [
            { name: '최지훈', score: 42, boss: 3 },
            { name: '박주아', score: 35, boss: 2 },
            { name: '김이수', score: 28, boss: 2 },
            { name: '최우영', score: 21, boss: 1 },
            { name: '전준우', score: 14, boss: 1 }
        ];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultRanks));
        return defaultRanks;
    }

    saveRanking(name, score, bossCount) {
        const list = this.getRankings();
        const entry = {
            name: name || '스카이워커',
            score: score,
            boss: bossCount,
            date: new Date().toLocaleDateString(),
            isNew: true
        };
        list.forEach(item => delete item.isNew);
        list.push(entry);
        list.sort((a, b) => b.score - a.score || b.boss - a.boss);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        const userRank = list.findIndex(item => item.isNew) + 1;
        return { list: list.slice(0, 10), userRank };
    }

    renderRankingList(ulEl, list) {
        ulEl.innerHTML = '';
        const medals = ['🥇 1위', '🥈 2위', '🥉 3위'];
        list.forEach((r, idx) => {
            const li = document.createElement('li');
            li.className = 'ranking-item' + (r.isNew ? ' highlight' : '');
            const rankBadge = idx < 3 ? medals[idx] : `${idx + 1}위`;
            li.innerHTML = `
                <span class="rank-badge">${rankBadge}</span>
                <span class="rank-name">${this.escapeHtml(r.name)}</span>
                <span class="rank-score">${r.score}점 <small style="color:#5c4938;">(👾보스 ${r.boss || 0}기 격파)</small></span>
            `;
            ulEl.appendChild(li);
        });
    }

    escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // =========================================================================
    // 🔊 오디오 신디사이저 엔진 (블래스터, 폭발, 실드 반사 '팅!', 사이렌)
    // =========================================================================

    playBlasterSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(3400, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.11);

            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    playEnemyBlasterSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1400, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.11);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {}
    }

    playBossBlasterSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(780, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.23);
        } catch (e) {}
    }

    /**
     * 🛡️ 안 맞는 우주선 방어막에 맞았을 때 튕겨나가는 '팅-!' 메탈릭 사운드
     */
    playShieldDeflectSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1850, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.14);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } catch (e) {}
    }

    playBossSiren() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            [0, 0.35, 0.7].forEach((tOff) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, now + tOff);
                osc.frequency.linearRampToValueAtTime(880, now + tOff + 0.18);
                osc.frequency.linearRampToValueAtTime(440, now + tOff + 0.32);
                gain.gain.setValueAtTime(0.28, now + tOff);
                gain.gain.exponentialRampToValueAtTime(0.01, now + tOff + 0.33);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + tOff);
                osc.stop(now + tOff + 0.34);
            });
        } catch (e) {}
    }

    playExplosionSound(isBig = false) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(isBig ? 180 : 280, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + (isBig ? 0.38 : 0.24));
            gain.gain.setValueAtTime(isBig ? 0.6 : 0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isBig ? 0.40 : 0.25));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + (isBig ? 0.42 : 0.26));
        } catch (e) {}
    }

    playBossHitSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {}
    }

    playPlayerHitSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.23);
        } catch (e) {}
    }

    playGrandVictoryFanfare() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 🌟 웅장하고 영광스러운 은하계 승리 팡파레
            const sequence = [
                { f: 261.63, time: 0.00, dur: 0.16, type: 'sawtooth', vol: 0.28 },
                { f: 329.63, time: 0.14, dur: 0.16, type: 'sawtooth', vol: 0.28 },
                { f: 392.00, time: 0.28, dur: 0.16, type: 'sawtooth', vol: 0.30 },
                { f: 523.25, time: 0.42, dur: 0.45, type: 'triangle', vol: 0.40 },
                // 팡파레 2절
                { f: 392.00, time: 0.90, dur: 0.14, type: 'sawtooth', vol: 0.30 },
                { f: 523.25, time: 1.05, dur: 0.14, type: 'sawtooth', vol: 0.32 },
                { f: 659.25, time: 1.20, dur: 0.14, type: 'sawtooth', vol: 0.34 },
                { f: 783.99, time: 1.35, dur: 0.70, type: 'triangle', vol: 0.45 },
                // 승리의 영웅 코드 피날레 (G5 + C6 + E6)
                { f: 783.99, time: 2.10, dur: 1.20, type: 'sawtooth', vol: 0.26 },
                { f: 1046.50, time: 2.10, dur: 1.20, type: 'triangle', vol: 0.32 },
                { f: 1318.51, time: 2.10, dur: 1.20, type: 'sine', vol: 0.35 }
            ];

            sequence.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = n.type;
                osc.frequency.setValueAtTime(n.f, now + n.time);
                gain.gain.setValueAtTime(n.vol, now + n.time);
                gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.time);
                osc.stop(now + n.time + n.dur + 0.05);
            });
        } catch (e) {}
    }

    playVictoryFanfare() {
        this.playGrandVictoryFanfare();
    }

    spawnHealthItem(x, y, z) {
        this.items.push({
            x: x,
            y: y,
            z: z,
            prevZ: z,
            vz: 350, // 트렌치를 따라 완만하게 날아옴
            rot: 0,
            pulse: 0,
            healAmount: 30,
            alive: true
        });
    }

    renderHealthItem(ctx, it, centerX, centerY, fov) {
        const scale = fov / Math.max(it.z, 20);
        const sx = centerX + it.x * scale;
        const sy = centerY + it.y * scale;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(it.rot);

        const r = Math.max(9, 24 * scale);

        // 1. 맥동 발광 에메랄드 오라
        const pulse = Math.sin(it.pulse) * 0.25 + 0.75;
        const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
        auraGrad.addColorStop(0, 'rgba(74, 222, 128, 0.9)');
        auraGrad.addColorStop(0.5, `rgba(34, 197, 94, ${0.45 * pulse})`);
        auraGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 2. 캡슐 바디 (에메랄드 메디컬 포드)
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 3 * scale);
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. 중심 백색 십자 메디컬 마크 (+)
        ctx.fillStyle = '#ffffff';
        const crossW = r * 0.75;
        const crossT = r * 0.28;
        ctx.fillRect(-crossW / 2, -crossT / 2, crossW, crossT);
        ctx.fillRect(-crossT / 2, -crossW / 2, crossT, crossW);

        ctx.restore();
    }

    playHealthPickupSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0.25, now + idx * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.25);
            });
        } catch (e) {}
    }

    createHealthPickupParticles(x, y) {
        for (let i = 0; i < 16; i++) {
            const angle = (i * Math.PI) / 8;
            const spd = Math.random() * 90 + 50;
            this.particles.push({
                x: x,
                y: y,
                z: 40,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                vz: (Math.random() - 0.5) * 80,
                life: 0.45,
                maxLife: 0.45,
                color: Math.random() < 0.6 ? '#4ade80' : '#10b981',
                size: 4
            });
        }
    }

    /**
     * 💥 벽면/바닥 충돌 시 메탈릭 스크래치 & 충격음
     */
    playWallHitSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
            gain.gain.setValueAtTime(0.42, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }

    /**
     * 💥 벽면/바닥 충돌 시 튀는 불꽃 파티클
     */
    createWallSparks(x, y, count = 20) {
        for (let i = 0; i < count; i++) {
            const spd = Math.random() * 200 + 80;
            const dirX = x < -200 ? 1 : (x > 200 ? -1 : (Math.random() - 0.5) * 2);
            const dirY = y > 100 ? -1 : (Math.random() - 0.5) * 2;
            this.particles.push({
                x: x,
                y: y,
                z: (Math.random() - 0.5) * 25,
                vx: dirX * spd + (Math.random() - 0.5) * 60,
                vy: dirY * (spd * 0.7) + (Math.random() - 0.5) * 60,
                vz: -Math.random() * 200 - 40,
                life: 0.32,
                maxLife: 0.32,
                color: Math.random() < 0.6 ? '#facc15' : '#f97316',
                size: 3.5,
                isPixel: true
            });
        }
    }

    playGameOverSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;
            [349.23, 311.13, 277.18, 233.08].forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now + idx * 0.15);
                gain.gain.setValueAtTime(0.3, now + idx * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.15);
                osc.stop(now + idx * 0.15 + 0.27);
            });
        } catch (e) {}
    }

    startSpaceBGM() {
        this.stopSpaceBGM();
        this.bgmPlaying = true;
        this.bgmStep = 0;

        const bassNotes = [
            110, 110, 130.81, 110,  146.83, 110, 164.81, 146.83,
            98,  98,  116.54, 98,   130.81, 98,  146.83, 130.81
        ];

        const tick = () => {
            if (!this.bgmPlaying) return;
            const ctx = this.getAudioCtx();
            if (ctx && ctx.state === 'running') {
                const now = ctx.currentTime;
                const freq = bassNotes[this.bgmStep % bassNotes.length];
                const pitchMod = this.boss.active ? 1.25 : 1.0;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq * pitchMod, now);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);

                this.bgmStep++;
            }
            this.bgmTimer = setTimeout(tick, this.boss.active ? 110 : 140);
        };

        tick();
    }

    stopSpaceBGM() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }
}
