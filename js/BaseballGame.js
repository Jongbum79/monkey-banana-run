/**
 * Smile Games - 스마일 홈런 더비 3D (Smile Home Run Derby: 3D Baseball Challenge)
 * 
 * 주요 특징:
 * 1. 3D 원근 투영 렌더링 야구장 (천연 잔디 다이아몬드, 외야 펜스, 전광판, 조명탑, 관중석)
 * 2. 점프 게임 4종 캐릭터 타자 (🐯 호걸이, 🐵 원숭이, 🐸 개구리, 🐧 펭귄) 완벽 연동
 * 3. 4가지 구종 (직구, 커브볼, 체인지업 마구, 🔥 황금 불꽃 볼)
 * 4. 시원하고 찰진 타격감: "깡-!!" 금속 배트음, 화면 흔들림, 타구 궤적 추적 카메라
 * 5. 10구 홈런 더비 챌린지: 장외 홈런(HOMERUN!!), 안타, 2루타, 파울, 헛스윙 삼진
 * 6. 홈런 시 대형 불꽃놀이 폭죽 파티클 & 관중 환호성 & 실시간 비거리(m) 측정
 * 7. 데스크톱(스페이스바 / 클릭) 및 모바일/태블릿(터치 & 대형 스윙 버튼) 완벽 대응
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

        // 화면 크기
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.max(window.devicePixelRatio || 1, 2);

        // 게임 모드: 10구 홈런 더비
        this.totalPitches = 10;
        this.currentPitch = 0;
        this.score = 0;
        this.homeRuns = 0;
        this.hits = 0;
        this.outs = 0;
        this.maxDistance = 0;
        this.playerName = '호걸이';

        // 🐾 4종 캐릭터 타자 명단
        this.batters = {
            tiger: {
                id: 'tiger',
                name: '호걸이',
                title: 'KIA 출신 4번 거포',
                emoji: '🐯',
                power: 98,
                contact: 85,
                desc: '압도적인 배트 스피드와 파워! 장외 홈런 비거리 +20m 보너스!',
                jersey: '#ea580c',
                cap: '#0f172a',
                border: '#facc15'
            },
            monkey: {
                id: 'monkey',
                name: '원숭이',
                title: '황금 바나나 타격왕',
                emoji: '🐵',
                power: 84,
                contact: 95,
                desc: '넓은 타격 판정 범위와 전광석화 스윙! 타이밍이 빗나가도 안타로 연결!',
                jersey: '#facc15',
                cap: '#854d0e',
                border: '#1a1612'
            },
            frog: {
                id: 'frog',
                name: '개구리',
                title: '안타 제조기 캡틴',
                emoji: '🐸',
                power: 78,
                contact: 98,
                desc: '신들린 선구안과 정밀한 컨택! 까다로운 커브볼과 체인지업 완벽 공략!',
                jersey: '#16a34a',
                cap: '#14532d',
                border: '#4ade80'
            },
            penguin: {
                id: 'penguin',
                name: '펭귄',
                title: '클러치 마스터',
                emoji: '🐧',
                power: 92,
                contact: 88,
                desc: '얼음처럼 차분한 클러치 히터! 황금 불꽃 마구 타격 시 점수 2배 보너스!',
                jersey: '#0284c7',
                cap: '#0f172a',
                border: '#38bdf8'
            }
        };
        this.selectedBatter = localStorage.getItem('smilegames_baseball_batter') || 'tiger';

        // 배트 종류
        this.bats = {
            aluminum: { id: 'aluminum', name: '알루미늄 배트', icon: '⚡', sound: 'metal', color: '#94a3b8' },
            wood: { id: 'wood', name: '단풍나무 배트', icon: '🪵', sound: 'wood', color: '#d97706' },
            gold: { id: 'gold', name: '골든 슬러거', icon: '👑', sound: 'gold', color: '#facc15' },
            laser: { id: 'laser', name: '광선검 배트', icon: '🔴', sound: 'laser', color: '#ef4444' }
        };
        this.selectedBat = localStorage.getItem('smilegames_baseball_bat') || 'aluminum';

        // 게임 상태 머신:
        // 'idle' -> 'windup' -> 'flying' -> 'hit_flight' (or 'miss') -> 'result_pause' -> 'next' -> 'game_over'
        this.state = 'idle';
        this.stateTimer = 0;

        // 투수 상태
        this.pitcher = {
            x: 0,
            y: -12, // 마운드 높이
            z: 360, // 마운드 거리
            phase: 'ready', // 'ready', 'windup', 'release', 'follow'
            phaseTime: 0
        };

        // 투구 및 타구 (Baseball)
        this.ball = {
            active: false,
            x: 0,
            y: 35,
            z: 360,
            vx: 0,
            vy: 0,
            vz: 0,
            radius: 8,
            rot: 0,
            type: 'fastball', // 'fastball' | 'curve' | 'changeup' | 'fireball'
            speedKmh: 148,
            isHit: false,
            hitType: null, // 'homerun', 'hit', 'foul', 'miss'
            hitDistance: 0,
            flightTimer: 0,
            landingX: 0,
            landingY: 0,
            landingZ: 0
        };

        // 타자 상태
        this.batter = {
            x: -28, // 우타자 타석 (투수 시점 기준 좌측)
            y: 0,
            z: 0,
            isSwinging: false,
            swingTime: 0,
            swingDuration: 0.22,
            swingAngle: -0.4, // 라디안
            idleWaggle: 0
        };

        // 3D 카메라
        this.camera = {
            x: 0,
            y: -36,
            z: -75,
            targetX: 0,
            targetY: -36,
            targetZ: -75,
            fov: 360,
            shake: 0
        };

        // 이펙트 파티클
        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerSub = '';
        this.bannerColor = '#facc15';
        this.bannerAlpha = 0;

        this.STORAGE_KEY = 'smilegames_baseball_rankings';
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
        // 배트 스윙 입력: 스페이스바, 엔터, 클릭, 터치
        window.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });

        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            if (e.code === 'Space' || e.code === 'Enter' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.ensureAudio();
                this.triggerSwing();
            }
        });

        // 캔버스 직접 클릭/터치 시 스윙
        if (this.canvas) {
            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                this.ensureAudio();
                this.triggerSwing();
            });
        }

        // 모바일/태블릿 대형 스윙 버튼
        const swingBtn = document.getElementById('btn-baseball-swing');
        if (swingBtn) {
            swingBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                this.ensureAudio();
                this.triggerSwing();
            });
        }

        // 타자 선택 버튼
        const batterBtn = document.getElementById('btn-baseball-batter');
        if (batterBtn) {
            batterBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.showBatterModal();
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

        // 게임 허브 복귀 버튼
        const hubBtn = document.getElementById('btn-baseball-hub');
        if (hubBtn) {
            hubBtn.addEventListener('click', () => this.openHubModal());
        }

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

        // 타자 선택 모달 내 버튼 바인딩
        const batterSelectBtns = document.querySelectorAll('#baseball-batter-selector .select-btn');
        batterSelectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-batter');
                if (bId) this.setBatter(bId);
            });
        });

        const batterLaunchBtn = document.getElementById('btn-baseball-batter-launch');
        if (batterLaunchBtn) {
            batterLaunchBtn.addEventListener('click', () => {
                this.hideBatterModal();
                this.start();
            });
        }

        const batterHubBtn = document.getElementById('btn-baseball-batter-hub');
        if (batterHubBtn) {
            batterHubBtn.addEventListener('click', () => {
                this.hideBatterModal();
                this.openHubModal();
            });
        }
    }

    start(playerName = null) {
        this.init();
        this.resize();
        this.ensureAudio();

        if (playerName) {
            this.playerName = playerName;
        } else {
            const saved = localStorage.getItem('smilegames_last_player');
            if (saved) this.playerName = saved;
        }

        // 10구 홈런 더비 통계 리셋
        this.currentPitch = 0;
        this.score = 0;
        this.homeRuns = 0;
        this.hits = 0;
        this.outs = 0;
        this.maxDistance = 0;

        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerAlpha = 0;

        this.resetCamera();
        this.hideGameOverModal();
        this.hideBatterModal();
        this.updateHUD();

        this.isRunning = true;
        this.queueNextPitch(1.0); // 1초 후 첫 투구

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
    }

    resetCamera() {
        this.camera.x = 0;
        this.camera.y = -36;
        this.camera.z = -75;
        this.camera.targetX = 0;
        this.camera.targetY = -36;
        this.camera.targetZ = -75;
        this.camera.shake = 0;
    }

    /**
     * 다음 투구 준비 (와인드업 시작)
     */
    queueNextPitch(delay = 1.2) {
        if (this.currentPitch >= this.totalPitches) {
            this.gameOver();
            return;
        }

        this.state = 'idle';
        this.stateTimer = delay;
        this.resetCamera();
        this.ball.active = false;
        this.ball.isHit = false;
    }

    /**
     * 투수가 와인드업 후 공 던지기
     */
    throwPitch() {
        this.currentPitch++;
        this.updateHUD();

        // 4가지 구종 중 확률 배분
        // 1. 직구 (45%)
        // 2. 커브 (25%)
        // 3. 체인지업 (15%)
        // 4. 🔥 황금 불꽃 볼 (15%)
        const rand = Math.random();
        let pitchType = 'fastball';
        let speed = 148 + Math.floor(Math.random() * 8); // 148 ~ 155 km/h

        if (rand < 0.45) {
            pitchType = 'fastball';
        } else if (rand < 0.70) {
            pitchType = 'curve';
            speed = 126 + Math.floor(Math.random() * 8); // 126 ~ 133 km/h
        } else if (rand < 0.85) {
            pitchType = 'changeup';
            speed = 112 + Math.floor(Math.random() * 6); // 112 ~ 117 km/h
        } else {
            pitchType = 'fireball';
            speed = 158 + Math.floor(Math.random() * 6); // 158 ~ 163 km/h
        }

        // 공 속도에 비례한 초당 Z축 이동 속도 (z=360에서 z=0까지 도달 시간)
        // 150 km/h = 약 0.52초 비행
        const flightDuration = (150 / speed) * 0.54;
        const vz = -360 / flightDuration;

        this.ball = {
            active: true,
            x: 0,
            y: 36, // 투수 릴리즈 포인트 높이
            z: 360,
            vx: (Math.random() - 0.5) * 6, // 약간의 좌우 흔들림
            vy: -10, // 홈플레이트 스트라이크 존을 향해 완만하게 하강
            vz: vz,
            radius: 8,
            rot: 0,
            type: pitchType,
            speedKmh: speed,
            isHit: false,
            hitType: null,
            hitDistance: 0,
            flightTimer: 0,
            landingX: 0,
            landingY: 0,
            landingZ: 0
        };

        this.pitcher.phase = 'release';
        this.state = 'flying';
        this.playPitchWhooshSound(pitchType);

        // 상단 전광판 알림
        const pitchNames = {
            fastball: '⚡ 광속 직구',
            curve: '🌀 마구 커브볼',
            changeup: '🐢 완급 체인지업',
            fireball: '🔥 전설의 황금 불꽃볼!'
        };
        this.showPitchBadge(`${pitchNames[pitchType]} (${speed} km/h)`);
    }

    /**
     * 플레이어 배트 스윙 트리거
     */
    triggerSwing() {
        if (this.batter.isSwinging) return;

        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // 공이 날아오는 중인지 확인하고 충돌 판정
        if (this.state === 'flying' && this.ball.active && !this.ball.isHit) {
            this.checkBatContact();
        }
    }

    /**
     * 타격 순간 타이밍 & 판정 로직
     */
    checkBatContact() {
        const b = this.ball;
        // 홈플레이트 타격 이상 존: z가 약 -10 ~ 40 사이일 때 배트에 닿음
        // 완벽한 정타(Sweet Spot): z가 약 8 ~ 22 사이!
        const z = b.z;
        const batterData = this.batters[this.selectedBatter] || this.batters.tiger;
        const batData = this.bats[this.selectedBat] || this.bats.aluminum;

        // 원숭이는 컨택 범위 +25%
        const contactBonus = (batterData.id === 'monkey') ? 14 : 0;
        const minZ = -15 - contactBonus;
        const maxZ = 45 + contactBonus;

        if (z >= minZ && z <= maxZ) {
            // 배트에 맞음!
            b.isHit = true;
            this.state = 'hit_flight';

            // 정타 오차 계산 (Sweet spot = 15)
            const diff = Math.abs(z - 15);
            let powerMult = (batterData.power / 100) * batData.bonus;

            // 1. 💥 PERFECT: 초대형 장외 홈런! (오차 10 이하)
            if (diff <= 10) {
                b.hitType = 'homerun';
                this.homeRuns++;
                let dist = Math.round(128 + (batterData.power - 75) * 0.9 + Math.random() * 18);
                if (b.type === 'fireball') dist += 18;
                if (batterData.id === 'tiger') dist += 15; // 호걸이 보너스

                b.hitDistance = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                let pts = 100 + (dist - 100) * 5;
                if (b.type === 'fireball') pts *= 2; // 불꽃볼 2배
                this.score += pts;

                // 타구 물리: 하늘 높이 솟구쳐 외야 펜스를 넘어 장외로 비행!
                b.vx = (Math.random() - 0.5) * 120;
                b.vy = 280 + Math.random() * 50; // 높은 발사각 (High Fly)
                b.vz = 520 + Math.random() * 80; // 외야를 뚫고 나가는 전방 속도

                this.camera.shake = 16;
                this.playBatHitSound('homerun');
                this.triggerHomeRunEffects(dist, pts);
            }
            // 2. 🎯 GREAT: 날카로운 라이너성 안타 / 2루타! (오차 11 ~ 22)
            else if (diff <= 22) {
                b.hitType = 'hit';
                this.hits++;
                const dist = Math.round(75 + Math.random() * 35);
                b.hitDistance = dist;
                if (dist > this.maxDistance) this.maxDistance = dist;

                const pts = (dist >= 95) ? 60 : 35; // 2루타 or 안타
                this.score += pts;

                // 타구 물리: 빠른 속도의 라인드라이브 (낮고 빠른 비행)
                b.vx = (Math.random() - 0.5) * 190;
                b.vy = 130 + Math.random() * 40;
                b.vz = 380 + Math.random() * 60;

                this.camera.shake = 8;
                this.playBatHitSound('hit');
                this.showResultBanner(
                    (dist >= 95) ? '🎯 2루타! 좌중간 돌파!' : '⚾ 날카로운 1루타 안타!',
                    `비거리 ${dist}m (+${pts}점)`,
                    '#38bdf8'
                );
            }
            // 3. ⚡ EARLY / LATE: 파울 (오차 23 이상)
            else {
                b.hitType = 'foul';
                this.outs++;
                b.vx = (z > 15) ? -280 : 280; // 당겨치기/밀어치기 큰 파울
                b.vy = 180;
                b.vz = 140;

                this.playBatHitSound('foul');
                this.showResultBanner('⚠️ 관중석 파울볼!', '아쉬운 파울 플라이 (0점)', '#f59e0b');
            }

            this.createHitSparks(0, 30, z);
            this.updateHUD();
        }
    }

    update(dt) {
        // 배트 스윙 애니메이션 갱신
        if (this.batter.isSwinging) {
            this.batter.swingTime += dt;
            const progress = Math.min(1, this.batter.swingTime / this.batter.swingDuration);
            // 스윙 궤적: -0.4 rad -> 2.4 rad 호를 그리며 회전
            this.batter.swingAngle = -0.4 + progress * 2.8;

            if (progress >= 1) {
                this.batter.isSwinging = false;
                this.batter.swingAngle = -0.4;
            }
        } else {
            // 타석에서 배트 까딱까딱 흔들기 (Idle Waggle)
            this.batter.idleWaggle += dt * 5;
        }

        // 카메라 쉐이크 감쇠
        if (this.camera.shake > 0) {
            this.camera.shake -= dt * 30;
            if (this.camera.shake < 0) this.camera.shake = 0;
        }

        // 상태별 갱신
        if (this.state === 'idle') {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.state = 'windup';
                this.pitcher.phase = 'windup';
                this.pitcher.phaseTime = 0;
            }
        } else if (this.state === 'windup') {
            this.pitcher.phaseTime += dt;
            // 와인드업 0.75초 후 릴리즈
            if (this.pitcher.phaseTime >= 0.75) {
                this.throwPitch();
            }
        } else if (this.state === 'flying') {
            // 날아오는 공 물리 시뮬레이션
            const b = this.ball;
            b.flightTimer += dt;

            // 구종별 궤적 변화
            if (b.type === 'curve') {
                // 홈플레이트 앞에서 횡으로 휘어지며 낙하
                b.vx += Math.sin(b.flightTimer * 8) * 18 * dt;
                b.vy -= 16 * dt;
            } else if (b.type === 'changeup') {
                // 중간부터 급격히 감속
                if (b.z < 180) b.vz *= 0.985;
            } else if (b.type === 'fireball') {
                // 불꽃 파티클 방출
                this.createFireballTrail(b.x, b.y, b.z);
            }

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;
            b.rot += dt * 25;

            // 배트를 휘두르지 않고 공이 포수 미트로 지나감 (STRIKE!)
            if (b.z < -35 && !b.isHit) {
                b.active = false;
                this.outs++;
                this.playUmpireStrikeSound();
                this.showResultBanner('💨 헛스윙 삼진 아웃!', '포수 미트 포구 스트라이크 (0점)', '#ef4444');
                this.updateHUD();
                this.state = 'result_pause';
                this.stateTimer = 1.6;
            }
        } else if (this.state === 'hit_flight') {
            // 타구 비행 시뮬레이션 & 카메라 추적
            const b = this.ball;
            b.flightTimer += dt;

            // 중력 및 공기 저항
            b.vy -= 170 * dt; // 중력
            b.vx *= 0.995;
            b.vz *= 0.995;

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;

            // 카메라는 타구를 부드럽게 추적 (Dynamic Ball-Tracking Cam)
            this.camera.targetX = b.x * 0.45;
            this.camera.targetY = -36 + Math.max(0, (b.y - 40) * 0.4);
            this.camera.targetZ = Math.min(320, b.z * 0.55);

            this.camera.x += (this.camera.targetX - this.camera.x) * 6 * dt;
            this.camera.y += (this.camera.targetY - this.camera.y) * 6 * dt;
            this.camera.z += (this.camera.targetZ - this.camera.z) * 6 * dt;

            // 타구가 그라운드나 외야 펜스/관중석에 착지했을 때
            if (b.y <= 0 || b.z >= 580) {
                b.active = false;
                this.state = 'result_pause';
                this.stateTimer = 2.2;
            }
        } else if (this.state === 'result_pause') {
            this.stateTimer -= dt;
            // 카메라 서서히 원위치 복귀
            this.camera.x += (0 - this.camera.x) * 4 * dt;
            this.camera.y += (-36 - this.camera.y) * 4 * dt;
            this.camera.z += (-75 - this.camera.z) * 4 * dt;

            if (this.stateTimer <= 0) {
                this.queueNextPitch(0.8);
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

        // 불꽃놀이 폭죽 갱신
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const f = this.fireworks[i];
            f.life -= dt;
            f.particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy -= 80 * dt; // 폭죽 낙하
            });
            if (f.life <= 0) this.fireworks.splice(i, 1);
        }

        // 배너 투명도 갱신
        if (this.bannerAlpha > 0) {
            this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.45);
        }
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.width, this.height);

        // 카메라 쉐이크 오프셋
        let shakeX = 0;
        let shakeY = 0;
        if (this.camera.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.camera.shake;
            shakeY = (Math.random() - 0.5) * this.camera.shake;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 1. 청명한 여름 야구장 푸른 하늘 & 뭉게구름 배경
        this.renderSky(ctx);

        // 2. 3D 야구장 스타디움 (외야 펜스, 조명탑, 관중석, 다이아몬드 잔디밭)
        this.renderStadium(ctx);

        // 3. 투수 마운드 & 투수 캐릭터 렌더링
        this.renderPitcher(ctx);

        // 4. 야구공 렌더링 (원근감 3D 구체 및 실밥)
        if (this.ball.active) {
            this.renderBall(ctx);
        }

        // 5. 타자 캐릭터 & 배트 스윙 렌더링 (3인칭 포수 후방 뷰)
        this.renderBatter(ctx);

        // 6. 파티클 & 불꽃놀이 렌더링
        this.renderEffects(ctx);

        // 7. 대형 홈런 / 안타 / 아웃 판정 팝업 배너
        this.renderResultBanner(ctx);

        ctx.restore();
    }

    /**
     * 3D 좌표 -> 2D 스크린 좌표 투영 함수
     */
    project(x, y, z) {
        const cam = this.camera;
        const relZ = Math.max(10, z - cam.z);
        const scale = cam.fov / relZ;
        const screenX = this.width / 2 + (x - cam.x) * scale;
        const screenY = this.height * 0.62 + (-(y - cam.y)) * scale;
        return { x: screenX, y: screenY, scale: scale };
    }

    renderSky(ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, this.height * 0.55);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.55, '#38bdf8');
        grad.addColorStop(1, '#bae6fd');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height * 0.58);

        // 뭉게구름
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        [
            { x: this.width * 0.15, y: this.height * 0.12, r: 35 },
            { x: this.width * 0.18, y: this.height * 0.10, r: 45 },
            { x: this.width * 0.22, y: this.height * 0.13, r: 30 },
            { x: this.width * 0.75, y: this.height * 0.08, r: 40 },
            { x: this.width * 0.79, y: this.height * 0.06, r: 52 },
            { x: this.width * 0.83, y: this.height * 0.09, r: 36 }
        ].forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    renderStadium(ctx) {
        // [1] 외야 관중석 및 외야 펜스 (Outfield Wall at Z=480)
        const wallZ = 480;
        const pLeft = this.project(-340, 0, wallZ);
        const pRight = this.project(340, 0, wallZ);
        const pTopLeft = this.project(-340, 55, wallZ);
        const pTopRight = this.project(340, 55, wallZ);

        // 관중석 스탠드 (Bleachers)
        const bTopLeft = this.project(-360, 110, wallZ + 40);
        const bTopRight = this.project(360, 110, wallZ + 40);

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(bTopLeft.x, bTopLeft.y);
        ctx.lineTo(bTopRight.x, bTopRight.y);
        ctx.lineTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pTopLeft.x, pTopLeft.y);
        ctx.closePath();
        ctx.fill();

        // 칠색 관중 도트 애니메이션
        const crowdRows = 3;
        for (let r = 0; r < crowdRows; r++) {
            const rowY = bTopLeft.y + (pTopLeft.y - bTopLeft.y) * (r / crowdRows);
            for (let c = 0; c < 32; c++) {
                const cx = bTopLeft.x + (bTopRight.x - bTopLeft.x) * (c / 32);
                ctx.fillStyle = (c + r) % 3 === 0 ? '#ef4444' : ((c + r) % 3 === 1 ? '#38bdf8' : '#facc15');
                ctx.fillRect(cx, rowY - 4, 5, 5);
            }
        }

        // 중앙 대형 스타디움 전광판 (Center Scoreboard)
        const sbLeft = this.project(-120, 140, wallZ + 20);
        const sbRight = this.project(120, 140, wallZ + 20);
        const sbBottom = this.project(120, 55, wallZ + 20);
        const sbW = sbRight.x - sbLeft.x;
        const sbH = sbBottom.y - sbLeft.y;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sbLeft.x, sbLeft.y, sbW, sbH);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(sbLeft.x, sbLeft.y, sbW, sbH);

        // 전광판 텍스트
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚾ SMILE GAMES HOME RUN DERBY ⚾', sbLeft.x + sbW / 2, sbLeft.y + 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12.5px monospace';
        const bData = this.batters[this.selectedBatter] || this.batters.tiger;
        ctx.fillText(`타자: ${bData.emoji} ${bData.name} | 구속: ${this.ball.speedKmh} km/h`, sbLeft.x + sbW / 2, sbLeft.y + 42);
        ctx.fillText(`공: [${this.currentPitch}/10]  홈런: ${this.homeRuns}개  최장: ${this.maxDistance}m`, sbLeft.x + sbW / 2, sbLeft.y + 60);

        // 외야 펜스 벽면 (짙은 녹색 패딩)
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.moveTo(pTopLeft.x, pTopLeft.y);
        ctx.lineTo(pTopRight.x, pTopRight.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pLeft.x, pLeft.y);
        ctx.closePath();
        ctx.fill();

        // 펜스 상단 노란색 홈런 라인
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(pTopLeft.x, pTopLeft.y);
        ctx.lineTo(pTopRight.x, pTopRight.y);
        ctx.stroke();

        // 펜스 비거리 표시 (100m, 125m, 100m)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        const p100L = this.project(-240, 25, wallZ);
        const p125C = this.project(0, 25, wallZ);
        const p100R = this.project(240, 25, wallZ);
        ctx.fillText('100m', p100L.x, p100L.y);
        ctx.fillText('125m', p125C.x, p125C.y);
        ctx.fillText('100m', p100R.x, p100R.y);

        // 좌/우 황색 파울 폴 (Foul Poles)
        [-290, 290].forEach(px => {
            const poleBase = this.project(px, 0, wallZ);
            const poleTop = this.project(px, 140, wallZ);
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(poleBase.x, poleBase.y);
            ctx.lineTo(poleTop.x, poleTop.y);
            ctx.stroke();
        });

        // [2] 필드 그라운드 잔디 (천연 잔디 줄무늬)
        const pHome = this.project(0, 0, 0);
        const pPlateLeft = this.project(-300, 0, 0);
        const pPlateRight = this.project(300, 0, 0);

        // 잔디 기본 베이스
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(pLeft.x, pLeft.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pPlateRight.x, this.height);
        ctx.lineTo(pPlateLeft.x, this.height);
        ctx.closePath();
        ctx.fill();

        // 잔디 원근 줄무늬 (Mowing Stripes)
        const stripes = 7;
        for (let i = 0; i < stripes; i++) {
            if (i % 2 === 0) continue;
            const x1 = -340 + (680 / stripes) * i;
            const x2 = -340 + (680 / stripes) * (i + 1);
            const p1 = this.project(x1, 0, wallZ);
            const p2 = this.project(x2, 0, wallZ);
            const p3 = this.project(x2 * 0.9, 0, 0);
            const p4 = this.project(x1 * 0.9, 0, 0);

            ctx.fillStyle = 'rgba(22, 163, 74, 0.4)';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, this.height);
            ctx.lineTo(p4.x, this.height);
            ctx.closePath();
            ctx.fill();
        }

        // [3] 내야 부채꼴 흙 그라운드 (Infield Dirt Fan)
        const pMound = this.project(0, 0, 200);
        const pDirtL = this.project(-180, 0, 180);
        const pDirtR = this.project(180, 0, 180);

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y + 30);
        ctx.quadraticCurveTo(pDirtL.x, pDirtL.y, pMound.x - 70, pMound.y);
        ctx.lineTo(pMound.x + 70, pMound.y);
        ctx.quadraticCurveTo(pDirtR.x, pDirtR.y, pHome.x, pHome.y + 30);
        ctx.closePath();
        ctx.fill();

        // 흰색 파울 라인 (Foul Lines)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        const pFoulL = this.project(-290, 0, wallZ);
        const pFoulR = this.project(290, 0, wallZ);

        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y + 20);
        ctx.lineTo(pFoulL.x, pFoulL.y);
        ctx.moveTo(pHome.x, pHome.y + 20);
        ctx.lineTo(pFoulR.x, pFoulR.y);
        ctx.stroke();

        // [4] 홈플레이트 오각형 & 타자석 박스
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(pHome.x - 14, pHome.y + 8);
        ctx.lineTo(pHome.x - 14, pHome.y + 22);
        ctx.lineTo(pHome.x + 14, pHome.y + 22);
        ctx.lineTo(pHome.x + 14, pHome.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 타자석 분필 흰색 박스 (Batter's Box)
        [-38, 14].forEach(bx => {
            const boxP = this.project(bx, 0, 0);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxP.x, boxP.y - 12, 28, 44);
        });
    }

    renderPitcher(ctx) {
        const pit = this.pitcher;
        const p = this.project(pit.x, pit.y, pit.z);
        const s = p.scale;

        // 마운드 흙 언덕 원형
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 6, 32 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 투수 고무판 (Pitching Rubber)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 10 * s, p.y + 2, 20 * s, 4 * s);

        // 귀여운 투수 캐릭터 (코믹스 스타일)
        const bodyH = 46 * s;
        const bodyW = 22 * s;

        // 몸통 (원정팀 네이비 유니폼)
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(p.x - bodyW / 2, p.y - bodyH * 0.75, bodyW, bodyH * 0.55);

        // 머리 & 모자
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(p.x, p.y - bodyH * 0.95, 11 * s, 0, Math.PI * 2);
        ctx.fill();
        // 챙
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(p.x - 12 * s, p.y - bodyH * 0.95, 24 * s, 3.5 * s);

        // 투구 폼 모션 팔
        let armEndX = p.x + 16 * s;
        let armEndY = p.y - bodyH * 0.85;

        if (pit.phase === 'windup') {
            armEndX = p.x;
            armEndY = p.y - bodyH * 1.25; // 와인드업 손 머리 위로 번쩍!
        } else if (pit.phase === 'release') {
            armEndX = p.x - 18 * s;
            armEndY = p.y - bodyH * 0.65; // 힘차게 전방 릴리즈 팔로우스루!
        }

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - bodyH * 0.75);
        ctx.lineTo(armEndX, armEndY);
        ctx.stroke();
    }

    renderBall(ctx) {
        const b = this.ball;
        const p = this.project(b.x, b.y, b.z);
        const r = Math.max(4.5, b.radius * p.scale);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(b.rot);

        // 황금 불꽃 볼 글로우 이펙트
        if (b.type === 'fireball') {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 18;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // 야구공 본체
        const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#f1f5f9');
        grad.addColorStop(1, '#cbd5e1');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 야구공 빨간 실밥 2줄 (Red Stitches)
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

    renderBatter(ctx) {
        const bat = this.batter;
        const bData = this.batters[this.selectedBatter] || this.batters.tiger;
        const batItem = this.bats[this.selectedBat] || this.bats.aluminum;

        // 타자 위치 2D 투영 (타석 위치)
        const p = this.project(bat.x, bat.y, bat.z);
        const s = p.scale;

        const h = 88 * s;
        const w = 36 * s;

        ctx.save();
        ctx.translate(p.x, p.y);

        // [1] 배트 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 4, w * 0.65, 9 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // [2] 타자 다리 & 야구 바지
        ctx.fillStyle = '#ffffff';
        // 좌/우 다리
        ctx.fillRect(-w * 0.4, -h * 0.35, w * 0.35, h * 0.35);
        ctx.fillRect(w * 0.05, -h * 0.35, w * 0.35, h * 0.35);
        // 야구 양말 스트라이프
        ctx.fillStyle = bData.jersey;
        ctx.fillRect(-w * 0.4, -h * 0.18, w * 0.35, h * 0.09);
        ctx.fillRect(w * 0.05, -h * 0.18, w * 0.35, h * 0.09);
        // 야구 스파이크화
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.45, -h * 0.05, w * 0.4, h * 0.06);
        ctx.fillRect(w * 0.05, -h * 0.05, w * 0.4, h * 0.06);

        // [3] 타자 상체 유니폼 (홈팀 스트라이프 저지)
        ctx.fillStyle = bData.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.75, w * 0.9, h * 0.42, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 등번호 "99" (MVP 슬러거)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(13 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('99', 0, -h * 0.52);

        // [4] 동물 캐릭터별 고유 머리 & 귀 & 야구 헬멧
        const headY = -h * 0.88;
        const headR = 19 * s;

        // 귀 / 특징 (호랑이 귀, 원숭이 귀, 개구리 눈 등)
        if (bData.id === 'tiger') {
            [-14 * s, 14 * s].forEach(ex => {
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.arc(ex, headY - 14 * s, 7 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.arc(ex, headY - 14 * s, 4 * s, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (bData.id === 'frog') {
            [-13 * s, 13 * s].forEach(ex => {
                ctx.fillStyle = '#22c55e';
                ctx.beginPath();
                ctx.arc(ex, headY - 14 * s, 8 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex, headY - 14 * s, 4 * s, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (bData.id === 'monkey') {
            [-18 * s, 18 * s].forEach(ex => {
                ctx.fillStyle = '#ca8a04';
                ctx.beginPath();
                ctx.arc(ex, headY - 2 * s, 8 * s, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 야구 헬멧 본체
        ctx.fillStyle = bData.cap;
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 헬멧 측면 귀덮개 (Ear Flap)
        ctx.fillStyle = bData.cap;
        ctx.beginPath();
        ctx.roundRect(headR * 0.6, headY - 4 * s, 8 * s, 16 * s, 4 * s);
        ctx.fill();

        // [5] 배트 및 스윙 애니메이션
        // 스윙 시 배트의 회전각 (bat.swingAngle)
        let batAngle = bat.isSwinging ? bat.swingAngle : (-0.4 + Math.sin(bat.idleWaggle) * 0.12);
        const batLen = 64 * s;
        const batOriginX = w * 0.25;
        const batOriginY = -h * 0.68;

        ctx.save();
        ctx.translate(batOriginX, batOriginY);
        ctx.rotate(batAngle);

        // 스윙 궤적 스피드 블러 라인 (Swing Trail)
        if (bat.isSwinging) {
            ctx.strokeStyle = (batItem.id === 'laser') ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 14 * s;
            ctx.beginPath();
            ctx.arc(0, 0, batLen, -0.6, 0);
            ctx.stroke();
        }

        // 배트 손잡이 그립
        ctx.fillStyle = '#334155';
        ctx.fillRect(-3 * s, -14 * s, 6 * s, 14 * s);

        // 배트 헤드 (알루미늄 / 목재 / 황금 / 레이저)
        ctx.fillStyle = batItem.color;
        if (batItem.id === 'laser') {
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.roundRect(-5.5 * s, -batLen, 11 * s, batLen - 12 * s, 4 * s);
        ctx.fill();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    createHitSparks(x, y, z) {
        for (let i = 0; i < 24; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                z: z,
                vx: (Math.random() - 0.5) * 280,
                vy: (Math.random() - 0.5) * 280,
                vz: (Math.random() - 0.5) * 160,
                life: 0.35 + Math.random() * 0.3,
                maxLife: 0.6,
                color: Math.random() < 0.5 ? '#facc15' : '#ffffff',
                size: 3 + Math.random() * 3
            });
        }
    }

    createFireballTrail(x, y, z) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 25,
                vy: 20 + Math.random() * 25,
                vz: 30,
                life: 0.22,
                maxLife: 0.22,
                color: Math.random() < 0.6 ? '#f97316' : '#facc15',
                size: 4.5
            });
        }
    }

    triggerHomeRunEffects(dist, pts) {
        this.playHomeRunFanfare();
        this.playCrowdCheer();

        this.showResultBanner(
            '🔥 GRAND SLAM HOMERUN!! 🔥',
            `초대형 장외 홈런! 비거리 ${dist}m (+${pts}점 대박!)`,
            '#facc15'
        );

        // 외야 상공 3단 불꽃놀이 폭죽 발사
        [-140, 0, 140].forEach((fx, idx) => {
            setTimeout(() => {
                const colors = ['#f43f5e', '#38bdf8', '#facc15', '#4ade80', '#e879f9'];
                const parts = [];
                for (let i = 0; i < 40; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 70 + Math.random() * 120;
                    parts.push({
                        x: fx,
                        y: 110 + Math.random() * 20,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        size: 3.5
                    });
                }
                this.fireworks.push({ particles: parts, life: 1.4 });
            }, idx * 240);
        });
    }

    renderEffects(ctx) {
        // 1. 일반 파티클
        this.particles.forEach(p => {
            const pt = this.project(p.x, p.y, p.z);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(1.5, p.size * pt.scale), 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. 불꽃놀이 폭죽 (Fireworks in Stadium Sky)
        this.fireworks.forEach(f => {
            f.particles.forEach(p => {
                const pt = this.project(p.x, p.y, 420);
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

    showResultBanner(mainText, subText, color = '#facc15') {
        this.bannerText = mainText;
        this.bannerSub = subText;
        this.bannerColor = color;
        this.bannerAlpha = 1.0;
    }

    showPitchBadge(text) {
        const badgeEl = document.getElementById('baseball-pitch-badge');
        if (badgeEl) {
            badgeEl.textContent = text;
            badgeEl.style.display = 'block';
        }
    }

    renderResultBanner(ctx) {
        if (this.bannerAlpha <= 0 || !this.bannerText) return;

        ctx.save();
        ctx.globalAlpha = this.bannerAlpha;
        const midX = this.width / 2;
        const midY = this.height * 0.32;

        // 화려한 코믹스 스타일 팝업 카드
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.strokeStyle = this.bannerColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(midX - 250, midY - 45, 500, 90, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.bannerColor;
        ctx.font = '900 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = this.bannerColor;
        ctx.shadowBlur = 14;
        ctx.fillText(this.bannerText, midX, midY - 6);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(this.bannerSub, midX, midY + 24);

        ctx.restore();
    }

    updateHUD() {
        const pitchEl = document.getElementById('baseball-stat-pitch');
        const hrEl = document.getElementById('baseball-stat-hr');
        const hitEl = document.getElementById('baseball-stat-hit');
        const distEl = document.getElementById('baseball-stat-dist');
        const scoreEl = document.getElementById('baseball-stat-score');
        const batterNameEl = document.getElementById('baseball-hud-batter-name');

        if (pitchEl) pitchEl.textContent = `${this.currentPitch} / ${this.totalPitches}구`;
        if (hrEl) hrEl.textContent = `${this.homeRuns}개`;
        if (hitEl) hitEl.textContent = `${this.hits}개`;
        if (distEl) distEl.textContent = `${this.maxDistance}m`;
        if (scoreEl) scoreEl.textContent = `${this.score}점`;

        if (batterNameEl) {
            const bData = this.batters[this.selectedBatter] || this.batters.tiger;
            batterNameEl.textContent = `${bData.emoji} ${bData.name}`;
        }
    }

    // =========================================================================
    // 🧑‍💼 타자 및 배트 교체 모달
    // =========================================================================
    showBatterModal() {
        this.stop();
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) {
            modal.classList.add('active');
            this.updateBatterSelectionUI();
        }
    }

    hideBatterModal() {
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) modal.classList.remove('active');
    }

    setBatter(batterId) {
        if (!this.batters[batterId]) return;
        this.selectedBatter = batterId;
        localStorage.setItem('smilegames_baseball_batter', batterId);
        this.updateBatterSelectionUI();
        this.updateHUD();
    }

    setBat(batId) {
        if (!this.bats[batId]) return;
        this.selectedBat = batId;
        localStorage.setItem('smilegames_baseball_bat', batId);
        this.updateBatterSelectionUI();
    }

    updateBatterSelectionUI() {
        const bData = this.batters[this.selectedBatter] || this.batters.tiger;

        // 버튼 액티브 상태 토글
        const btns = document.querySelectorAll('#baseball-batter-selector .select-btn');
        btns.forEach(btn => {
            const id = btn.getAttribute('data-batter');
            if (id === this.selectedBatter) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 프리뷰 카드
        const avatarEl = document.getElementById('baseball-preview-avatar');
        const nameEl = document.getElementById('baseball-preview-name');
        const descEl = document.getElementById('baseball-preview-desc');
        const statsEl = document.getElementById('baseball-preview-stats');

        if (avatarEl) avatarEl.textContent = bData.emoji;
        if (nameEl) nameEl.textContent = `${bData.name} (${bData.title})`;
        if (descEl) descEl.textContent = bData.desc;
        if (statsEl) statsEl.textContent = `⚡ 파워 ${bData.power} | 🎯 컨택 ${bData.contact}`;
    }

    // =========================================================================
    // 🏆 게임 종료 & 명예의 전당
    // =========================================================================
    gameOver() {
        this.stop();
        this.playGameOverSound();

        const rankResult = this.saveRanking(this.playerName, this.score, this.homeRuns, this.maxDistance);
        const modal = document.getElementById('baseball-gameover-modal');
        if (!modal) return;

        const scoreEl = document.getElementById('baseball-final-score');
        const hrEl = document.getElementById('baseball-final-hr');
        const distEl = document.getElementById('baseball-final-dist');
        const hitEl = document.getElementById('baseball-final-hit');
        const badgeEl = document.getElementById('baseball-final-badge');
        const listEl = document.getElementById('baseball-gameover-ranking-list');

        if (scoreEl) scoreEl.textContent = `${this.score}점`;
        if (hrEl) hrEl.textContent = `${this.homeRuns}개`;
        if (distEl) distEl.textContent = `${this.maxDistance}m`;
        if (hitEl) hitEl.textContent = `${this.hits}개`;

        if (badgeEl) {
            if (this.homeRuns >= 6) {
                badgeEl.textContent = '👑 은하계 레전드 홈런왕 MVP!';
                badgeEl.style.background = '#facc15';
            } else if (this.homeRuns >= 3) {
                badgeEl.textContent = '🏆 4번 타자 특급 슬러거!';
                badgeEl.style.background = '#38bdf8';
            } else if (this.homeRuns >= 1) {
                badgeEl.textContent = '🥈 날카로운 거포 루키!';
                badgeEl.style.background = '#cbd5e1';
            } else {
                badgeEl.textContent = '🥉 다음 경기 홈런에 도전하세요!';
                badgeEl.style.background = '#f97316';
            }
        }

        if (listEl) {
            this.renderRankingList(listEl, rankResult.list);
        }

        modal.classList.add('active');
    }

    hideGameOverModal() {
        const modal = document.getElementById('baseball-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
        this.hideBatterModal();
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
            { name: '최지훈', score: 980, hr: 7, dist: 154 },
            { name: '박주아', score: 750, hr: 5, dist: 142 },
            { name: '김이수', score: 620, hr: 4, dist: 136 },
            { name: '최우영', score: 480, hr: 3, dist: 129 },
            { name: '전준우', score: 320, hr: 2, dist: 118 }
        ];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultRanks));
        return defaultRanks;
    }

    saveRanking(name, score, hr, maxDist) {
        const list = this.getRankings();
        const entry = {
            name: name || '호걸이',
            score: score,
            hr: hr,
            dist: maxDist,
            date: new Date().toLocaleDateString(),
            isNew: true
        };
        list.forEach(item => delete item.isNew);
        list.push(entry);
        list.sort((a, b) => b.score - a.score || b.hr - a.hr || b.dist - a.dist);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
        const userRank = list.findIndex(item => item.isNew) + 1;
        return { list: list.slice(0, 10), userRank };
    }

    renderRankingList(ulEl, list) {
        ulEl.innerHTML = '';
        const medals = ['🥇 1위', '🥈 2위', '🥉 3위'];
        list.forEach((r, idx) => {
            const li = document.createElement('li');
            li.className = `ranking-item ${r.isNew ? 'current-user' : ''}`;
            const medal = medals[idx] || `${idx + 1}위`;
            li.innerHTML = `
                <span class="rank-pos">${medal}</span>
                <span class="rank-name">${r.name}</span>
                <span class="rank-score">🪙 ${r.score}점 (홈런 ${r.hr}개 / 최장 ${r.dist}m)</span>
            `;
            ulEl.appendChild(li);
        });
    }

    // =========================================================================
    // 🎵 Web Audio API 사운드 합성 엔진
    // =========================================================================
    playSwingSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 스윙 풍음 (Whoosh)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.14);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playPitchWhooshSound(type) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = (type === 'fireball') ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime((type === 'fireball') ? 600 : 320, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

            gain.gain.setValueAtTime((type === 'fireball') ? 0.35 : 0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);
        } catch (e) {}
    }

    playBatHitSound(type) {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. "깡-!!" 맑은 고음 금속 타격음
            const pingOsc = ctx.createOscillator();
            const pingGain = ctx.createGain();
            pingOsc.type = 'triangle';
            pingOsc.frequency.setValueAtTime(2800, now);
            pingOsc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
            pingGain.gain.setValueAtTime((type === 'homerun') ? 0.65 : 0.45, now);
            pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            pingOsc.connect(pingGain);
            pingGain.connect(ctx.destination);
            pingOsc.start(now);
            pingOsc.stop(now + 0.26);

            // 2. "빡-!" 묵직한 베이스 충격음
            const thudOsc = ctx.createOscillator();
            const thudGain = ctx.createGain();
            thudOsc.type = 'sawtooth';
            thudOsc.frequency.setValueAtTime(220, now);
            thudOsc.frequency.exponentialRampToValueAtTime(50, now + 0.18);
            thudGain.gain.setValueAtTime(0.5, now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            thudOsc.connect(thudGain);
            thudGain.connect(ctx.destination);
            thudOsc.start(now);
            thudOsc.stop(now + 0.21);
        } catch (e) {}
    }

    playHomeRunFanfare() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 🎺 승리의 홈런 트럼펫 팡파레! (C5 -> E5 -> G5 -> C6)
            const notes = [
                { f: 523.25, time: 0.00, dur: 0.15 },
                { f: 659.25, time: 0.14, dur: 0.15 },
                { f: 783.99, time: 0.28, dur: 0.18 },
                { f: 1046.50, time: 0.44, dur: 0.65 }
            ];

            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.time);
                gain.gain.setValueAtTime(0.4, now + n.time);
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

            // 관중 함성 (시뮬레이션 노이즈 버스트)
            const bufferSize = ctx.sampleRate * 1.5;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.9));
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(950, now);
            filter.Q.setValueAtTime(1.8, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + 1.5);
        } catch (e) {}
    }

    playUmpireStrikeSound() {
        try {
            const ctx = this.getAudioCtx();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 심판 호각 소리
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1600, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.22);
            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
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
                osc.frequency.setValueAtTime(f, now + idx * 0.16);
                gain.gain.setValueAtTime(0.28, now + idx * 0.16);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.16);
                osc.stop(now + idx * 0.16 + 0.28);
            });
        } catch (e) {}
    }
}
