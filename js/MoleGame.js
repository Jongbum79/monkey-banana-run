/**
 * Smile Games - 두더지 잡기 게임
 * 
 * 특징:
 * 1. 2분(120초) 카운트다운 타이머 (02:00 -> 00:00)
 * 2. 정확히 7개의 구멍 (Hole 1 ~ Hole 7)
 * 3. 귀여운 선글라스 두더지 디테일 비주얼:
 *    - 통통한 갈색 얼굴, 시크한 검정 선글라스, 귀여운 앞니와 주둥이, 앞발로 구멍 테두리 잡기
 *    - 일반 두더지 (+100점), 황금 두더지 (+300점), 폭탄병(Bob-omb, -150점 감점 & 콤보 리셋)
 *    - 맞았을 때 망치에 찌부러지는 스쿼시 타격 연출 + 별이 빙글빙글 도는 KO 기절!
 * 4. 테블릿 터치 & 모바일 완벽 대응 (구멍 터치 시 즉시 망치 강타)
 * 5. 키보드 숫자 [1] ~ [7] 완벽 지원 (구멍 상단에 선명한 번호 배지 배치)
 * 6. 강력하고 찰진 망치 타격 효과음 (쾅! / 딱! / 뾱! 3중 레이어 신디사이저 사운드) & 코믹 타격 이펙트
 * 7. 상단 전용 스코어보드 (시간, 점수, 콤보, 명중률, 최고 기록)
 * 8. 로컬 스토리지 기반 전용 랭킹 시스템
 */

class MoleGame {
    constructor(soundManager) {
        this.sound = soundManager;
        this.audioCtx = null;
        this.isRunning = false;
        this.timer = 120; // 2분 (120초)
        this.timerInterval = null;
        this.spawnTimeout = null;
        this.animFrameId = null;

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hits = 0;
        this.misses = 0;
        this.molesCaught = 0;
        this.goldCaught = 0;
        this.bombsHit = 0;
        this.playerName = '도전자';

        // 7개의 구멍 상태 (id: 1 ~ 7)
        this.holes = [];
        for (let i = 1; i <= 7; i++) {
            this.holes.push({
                id: i,
                state: 'empty', // 'empty' | 'rising' | 'up' | 'hit' | 'hiding'
                type: 'normal', // 'normal' | 'gold' | 'bomb'
                timer: 0,
                stayDuration: 1200,
                element: null,
                moleEl: null,
                badgeEl: null,
                popupEl: null
            });
        }

        this.hammerEl = null;
        this.containerEl = null;
        this.isInitialized = false;

        this.STORAGE_KEY = 'smilegames_mole_rankings';
    }

    init() {
        if (this.isInitialized) return;
        this.containerEl = document.getElementById('mole-game-container');
        if (!this.containerEl) return;

        this.hammerEl = document.getElementById('mole-hammer');
        this.renderHoleElements();
        this.bindEvents();
        this.updateScoreboard();
        this.updateBestScoreDisplay();
        this.isInitialized = true;
    }

    ensureAudioContext() {
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

    getAudioContext() {
        this.ensureAudioContext();
        return (this.sound && this.sound.ctx) || this.audioCtx || null;
    }

    renderHoleElements() {
        const gridTop = document.getElementById('mole-grid-top');
        const gridBottom = document.getElementById('mole-grid-bottom');
        if (!gridTop || !gridBottom) return;

        gridTop.innerHTML = '';
        gridBottom.innerHTML = '';

        this.holes.forEach((hole, idx) => {
            const holeEl = document.createElement('div');
            holeEl.className = 'mole-hole-wrap';
            holeEl.dataset.holeId = hole.id;

            // 1. 구멍 상단 키보드 숫자 배지 [ 1 ] ~ [ 7 ]
            const badge = document.createElement('div');
            badge.className = 'mole-key-badge';
            badge.innerHTML = `<span class="badge-num">${hole.id}</span>`;

            // 2. 구멍 베이스 (흙더미 + 잔디 + 어두운 굴)
            const mound = document.createElement('div');
            mound.className = 'mole-mound';

            // 3. 두더지 캐릭터 엘리먼트 (SVG 선글라스 두더지 일러스트레이션)
            const mole = document.createElement('div');
            mole.className = 'mole-actor mole-hidden';
            mole.innerHTML = this.getMoleSVG('normal');

            // 4. 구멍 앞 잔디/흙 전면 마스크 (두더지가 구멍 속에서 솟아나오게 연출)
            const frontLip = document.createElement('div');
            frontLip.className = 'mole-mound-lip';

            // 5. 타격 시 '쾅!', 'POW!', '골드 +300' 팝업 텍스트 컨테이너
            const popup = document.createElement('div');
            popup.className = 'mole-hit-popup';

            holeEl.appendChild(badge);
            holeEl.appendChild(mound);
            mound.appendChild(mole);
            mound.appendChild(frontLip);
            holeEl.appendChild(popup);

            hole.element = holeEl;
            hole.moleEl = mole;
            hole.moundEl = mound;
            hole.badgeEl = badge;
            hole.popupEl = popup;

            // 1~3번은 상단 행, 4~7번은 하단 행 배치
            if (idx < 3) {
                gridTop.appendChild(holeEl);
            } else {
                gridBottom.appendChild(holeEl);
            }

            // 터치 & 마우스 클릭 이벤트 바인딩 (테블릿 터치 완벽 대응!)
            const onWhackTrigger = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudioContext();
                this.whackHole(hole.id, e.clientX, e.clientY);
            };

            holeEl.addEventListener('pointerdown', onWhackTrigger);
        });
    }

    /**
     * 선글라스 두더지 및 황금 두더지, 폭탄병 SVG 벡터 그래픽
     */
    getMoleSVG(type = 'normal') {
        if (type === 'bomb') {
            // 💣 폭탄병 (Bob-omb)
            return `
            <svg class="mole-svg bob-omb-svg" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
                <!-- 도화선 -->
                <path d="M50 35 Q55 18 64 12" stroke="#f5cb42" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                <!-- 불꽃 -->
                <circle cx="66" cy="10" r="6" fill="#ef4444" class="fuse-spark"/>
                <circle cx="66" cy="3" fill="#fef08a"/>
                <!-- 태엽 키 (뒤쪽) -->
                <rect x="18" y="44" width="10" height="6" rx="2" fill="#eab308" stroke="#1a1612" stroke-width="2"/>
                <circle cx="16" cy="47" r="8" fill="#fde047" stroke="#1a1612" stroke-width="2.5"/>
                <!-- 폭탄 구체 몸통 -->
                <circle cx="50" cy="62" r="32" fill="#1e1e24" stroke="#111827" stroke-width="3.5"/>
                <!-- 몸통 하이라이트 -->
                <ellipse cx="40" cy="48" rx="8" ry="5" fill="#4b5563" opacity="0.6" transform="rotate(-25 40 48)"/>
                <!-- 하얀 타원형 눈 2개 -->
                <ellipse cx="42" cy="60" rx="5" ry="9" fill="#ffffff" stroke="#111827" stroke-width="1.5"/>
                <ellipse cx="58" cy="60" rx="5" ry="9" fill="#ffffff" stroke="#111827" stroke-width="1.5"/>
                <!-- 발 -->
                <ellipse cx="38" cy="94" rx="9" ry="5" fill="#f59e0b" stroke="#1a1612" stroke-width="2"/>
                <ellipse cx="62" cy="94" rx="9" ry="5" fill="#f59e0b" stroke="#1a1612" stroke-width="2"/>
            </svg>`;
        }

        const isGold = type === 'gold';
        const bodyColor = isGold ? '#facc15' : '#8d5b4c';
        const bodyShade = isGold ? '#eab308' : '#6c3b2d';
        const snoutColor = isGold ? '#fef08a' : '#f5d0b5';
        const snoutBorder = isGold ? '#b45309' : '#5c3a21';

        // 선글라스 두더지 SVG
        return `
        <svg class="mole-svg monty-mole-svg ${isGold ? 'gold-mole' : ''}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="moleGrad_${type}" cx="45%" cy="40%" r="55%">
                    <stop offset="0%" stop-color="${bodyColor}"/>
                    <stop offset="85%" stop-color="${bodyShade}"/>
                    <stop offset="100%" stop-color="#3d2116"/>
                </radialGradient>
                <linearGradient id="glassesGrad_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#111827"/>
                    <stop offset="70%" stop-color="#030712"/>
                </linearGradient>
            </defs>

            <!-- 귀 (동글동글) -->
            <circle cx="22" cy="38" r="9" fill="${bodyColor}" stroke="#1a1612" stroke-width="3"/>
            <circle cx="22" cy="38" r="5" fill="${snoutColor}"/>
            <circle cx="78" cy="38" r="9" fill="${bodyColor}" stroke="#1a1612" stroke-width="3"/>
            <circle cx="78" cy="38" r="5" fill="${snoutColor}"/>

            <!-- 통통한 두더지 몸통/머리 -->
            <path d="M22 88 C16 60, 24 24, 50 24 C76 24, 84 60, 78 88 Z" 
                  fill="url(#moleGrad_${type})" stroke="#1a1612" stroke-width="3.5"/>

            ${isGold ? `
            <!-- 황금 반짝이 이펙트 -->
            <polygon points="50,15 52,21 58,21 53,25 55,31 50,27 45,31 47,25 42,21 48,21" fill="#ffffff" class="gold-sparkle"/>
            ` : ''}

            <!-- 🕶️ 두더지의 상징: 검정 선글라스! -->
            <g class="mole-sunglasses">
                <!-- 안경테 브릿지 -->
                <path d="M44 48 L56 48" stroke="#111827" stroke-width="4.5" stroke-linecap="round"/>
                <!-- 왼쪽 렌즈 -->
                <rect x="25" y="40" width="22" height="17" rx="5" fill="url(#glassesGrad_${type})" stroke="#111827" stroke-width="2.5"/>
                <!-- 오른쪽 렌즈 -->
                <rect x="53" y="40" width="22" height="17" rx="5" fill="url(#glassesGrad_${type})" stroke="#111827" stroke-width="2.5"/>
                <!-- 렌즈 날렵한 하얀 반사광 -->
                <polygon points="30,43 36,43 28,54 26,54" fill="#ffffff" opacity="0.85"/>
                <polygon points="58,43 64,43 56,54 54,54" fill="#ffffff" opacity="0.85"/>
            </g>

            <!-- 둥글넓적한 주둥이 (Snout) -->
            <ellipse cx="50" cy="62" rx="19" ry="12" fill="${snoutColor}" stroke="${snoutBorder}" stroke-width="2.5"/>

            <!-- 까만 삼각형 코 -->
            <ellipse cx="50" cy="57" rx="5" ry="3.5" fill="#1a1612"/>
            <ellipse cx="48.5" cy="56" rx="1.5" ry="1" fill="#ffffff" opacity="0.8"/>

            <!-- 앙증맞은 커다란 앞니 (Buck Teeth) -->
            <rect x="45" y="66" width="5" height="6.5" rx="1.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.8"/>
            <rect x="50" y="66" width="5" height="6.5" rx="1.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.8"/>

            <!-- 귀여운 미소 입꼬리 -->
            <path d="M41 68 Q50 74 59 68" stroke="#1a1612" stroke-width="2" fill="none" stroke-linecap="round"/>

            <!-- 볼터치 -->
            <ellipse cx="36" cy="63" rx="4" ry="2.5" fill="#f87171" opacity="0.55"/>
            <ellipse cx="64" cy="63" rx="4" ry="2.5" fill="#f87171" opacity="0.55"/>

            <!-- 두더지의 귀여운 앞발 (구멍 테두리를 붙잡고 있는 모습) -->
            <g class="mole-paws">
                <!-- 왼발 -->
                <ellipse cx="26" cy="84" rx="9" ry="6" fill="${snoutColor}" stroke="#1a1612" stroke-width="2.5"/>
                <path d="M22 84 L20 88 M26 85 L26 89 M30 84 L32 88" stroke="#1a1612" stroke-width="2" stroke-linecap="round"/>
                <!-- 오른발 -->
                <ellipse cx="74" cy="84" rx="9" ry="6" fill="${snoutColor}" stroke="#1a1612" stroke-width="2.5"/>
                <path d="M70 84 L68 88 M74 85 L74 89 M78 84 L80 88" stroke="#1a1612" stroke-width="2" stroke-linecap="round"/>
            </g>

            <!-- 피격(기절) 시 나타나는 회전 별 레이어 -->
            <g class="mole-dizzy-stars" style="display:none;">
                <text x="30" y="24" font-size="16" fill="#facc15">💫</text>
                <text x="56" y="20" font-size="16" fill="#facc15">⭐</text>
            </g>
        </svg>`;
    }

    bindEvents() {
        // 첫 터치/클릭 시 오디오 활성화
        window.addEventListener('pointerdown', () => this.ensureAudioContext(), { once: true });

        // 키보드 숫자 [ 1 ] ~ [ 7 ] 키 매핑 (상단 숫자키 & 넘패드 완벽 지원)
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            const key = e.key;
            let holeId = null;

            if (['1', '2', '3', '4', '5', '6', '7'].includes(key)) {
                holeId = parseInt(key, 10);
            } else if (e.code && e.code.startsWith('Numpad')) {
                const num = parseInt(e.code.replace('Numpad', ''), 10);
                if (num >= 1 && num <= 7) {
                    holeId = num;
                }
            }

            if (holeId !== null) {
                e.preventDefault();
                this.ensureAudioContext();
                const targetHole = this.holes.find(h => h.id === holeId);
                if (targetHole && targetHole.element) {
                    const rect = targetHole.element.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    this.whackHole(holeId, cx, cy);
                }
            }
        });

        // 테블릿 터치 / 마우스 커서 이동 시 망치 따라다니기
        window.addEventListener('pointermove', (e) => {
            if (!this.isRunning || !this.hammerEl) return;
            this.hammerEl.style.left = `${e.clientX}px`;
            this.hammerEl.style.top = `${e.clientY}px`;
        });

        // UI 버튼 바인딩
        const restartBtn = document.getElementById('btn-mole-restart');
        if (restartBtn) restartBtn.addEventListener('click', () => {
            this.ensureAudioContext();
            this.start();
        });

        const hubBtn = document.getElementById('btn-mole-hub');
        if (hubBtn) hubBtn.addEventListener('click', () => this.openHubModal());

        const moleGameOverRestartBtn = document.getElementById('btn-mole-gameover-restart');
        if (moleGameOverRestartBtn) moleGameOverRestartBtn.addEventListener('click', () => {
            this.ensureAudioContext();
            this.hideGameOverModal();
            this.start();
        });

        const moleGameOverHubBtn = document.getElementById('btn-mole-gameover-hub');
        if (moleGameOverHubBtn) moleGameOverHubBtn.addEventListener('click', () => {
            this.hideGameOverModal();
            this.openHubModal();
        });

        const moleGameOverRunBtn = document.getElementById('btn-mole-gameover-run');
        if (moleGameOverRunBtn) moleGameOverRunBtn.addEventListener('click', () => {
            this.hideGameOverModal();
            if (window.switchToBananaGame) {
                window.switchToBananaGame();
            }
        });
    }

    start(playerName = null) {
        this.init();
        this.ensureAudioContext();

        if (playerName) {
            this.playerName = playerName;
        } else {
            const savedName = localStorage.getItem('smilegames_last_player');
            if (savedName) this.playerName = savedName;
        }

        // 초기화
        this.isRunning = true;
        this.timer = 120; // 2분 (120초)
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.hits = 0;
        this.misses = 0;
        this.molesCaught = 0;
        this.goldCaught = 0;
        this.bombsHit = 0;

        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);

        this.holes.forEach(hole => {
            this.hideMole(hole, false);
        });

        this.updateScoreboard();
        this.updateBestScoreDisplay();
        this.hideGameOverModal();

        // 2분 카운트다운 타이머 시작
        this.timerInterval = setInterval(() => {
            if (!this.isRunning) return;
            this.timer--;
            this.updateScoreboard();

            // 남은 시간 10초 미만 시 긴박한 효과
            if (this.timer <= 10 && this.timer > 0) {
                this.playClockTick();
            }

            if (this.timer <= 0) {
                this.gameOver();
            }
        }, 1000);

        // 첫 두더지 출현 시작
        this.scheduleNextSpawn(500);

        if (this.sound) {
            this.sound.playCorrect();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
    }

    scheduleNextSpawn(delay = null) {
        if (!this.isRunning) return;

        if (delay === null) {
            // 시간이 지날수록 출현 주기가 빨라짐 (120초 -> 점점 난이도 상승!)
            const progress = (120 - this.timer) / 120; // 0.0 ~ 1.0
            const minDelay = 400;
            const maxDelay = 1100 - (progress * 600); // 1100ms -> 500ms
            delay = Math.random() * (maxDelay - minDelay) + minDelay;
        }

        this.spawnTimeout = setTimeout(() => {
            if (!this.isRunning) return;
            this.spawnMoleBatch();
            this.scheduleNextSpawn();
        }, delay);
    }

    spawnMoleBatch() {
        // 비어있는 구멍 찾기
        const emptyHoles = this.holes.filter(h => h.state === 'empty');
        if (emptyHoles.length === 0) return;

        // 시간에 따라 한 번에 1~3마리까지 등장!
        const elapsed = 120 - this.timer;
        let count = 1;
        if (elapsed > 30 && Math.random() < 0.45) count = 2;
        if (elapsed > 70 && Math.random() < 0.60) count = Math.random() < 0.5 ? 2 : 3;

        // 셔플 후 선택
        const shuffled = [...emptyHoles].sort(() => Math.random() - 0.5);
        const toSpawn = shuffled.slice(0, Math.min(count, emptyHoles.length));

        toSpawn.forEach(hole => this.popMole(hole));
    }

    popMole(hole) {
        if (!hole || hole.state !== 'empty') return;

        // 타입 결정:
        // 일반 두더지 (72%), 황금 두더지 (15%), 폭탄병 (13%)
        const rand = Math.random();
        let type = 'normal';
        if (rand < 0.15) {
            type = 'gold'; // 황금 두더지 (+300점)
        } else if (rand < 0.28) {
            type = 'bomb'; // 폭탄병 (-150점 & 콤보 리셋)
        }

        hole.type = type;
        hole.state = 'up';
        hole.moleEl.innerHTML = this.getMoleSVG(type);
        hole.moleEl.className = `mole-actor mole-visible mole-${type}`;

        // 머무는 시간 계산 (난이도에 따라 0.7초 ~ 1.4초)
        const progress = (120 - this.timer) / 120;
        const stayTime = Math.max(650, 1400 - (progress * 650) + (Math.random() * 200));

        // 팝 사운드
        this.playPopSound();

        // 제한 시간 초과 시 자동으로 굴 속으로 숨기
        hole.stayTimer = setTimeout(() => {
            if (hole.state === 'up') {
                if (hole.type !== 'bomb') {
                    this.combo = 0; // 콤보 끊김
                    this.misses++;
                    this.updateScoreboard();
                }
                this.hideMole(hole, true);
            }
        }, stayTime);
    }

    hideMole(hole, animated = true) {
        if (!hole) return;
        if (hole.stayTimer) clearTimeout(hole.stayTimer);

        if (animated && hole.moleEl) {
            hole.moleEl.classList.remove('mole-visible');
            hole.moleEl.classList.add('mole-hiding');
            setTimeout(() => {
                hole.state = 'empty';
                hole.moleEl.className = 'mole-actor mole-hidden';
            }, 250);
        } else {
            hole.state = 'empty';
            if (hole.moleEl) {
                hole.moleEl.className = 'mole-actor mole-hidden';
            }
        }
    }

    /**
     * 망치로 해당 구멍 강타! (터치 또는 숫자키 1~7)
     */
    whackHole(holeId, clientX = null, clientY = null) {
        if (!this.isRunning) return;

        const hole = this.holes.find(h => h.id === holeId);
        if (!hole) return;

        this.ensureAudioContext();

        // 1. 망치 스윙 위치 계산 및 타격 연출
        const rect = hole.element.getBoundingClientRect();
        const targetX = (clientX !== null) ? clientX : (rect.left + rect.width / 2);
        const targetY = (clientY !== null) ? clientY : (rect.top + rect.height / 2);

        this.triggerHammerSwing(hole, targetX, targetY);
        this.playHammerSwingSound();

        // 2. 키 배지 클릭 피드백
        if (hole.badgeEl) {
            hole.badgeEl.classList.add('badge-active');
            setTimeout(() => hole.badgeEl.classList.remove('badge-active'), 180);
        }

        // 3. 구멍 흙더미 충격 바운스 연출
        if (hole.moundEl) {
            hole.moundEl.classList.remove('mound-smash');
            void hole.moundEl.offsetWidth;
            hole.moundEl.classList.add('mound-smash');
        }

        // 4. 판정 (타격 성공 여부)
        if (hole.state === 'up') {
            hole.state = 'hit';
            if (hole.stayTimer) clearTimeout(hole.stayTimer);

            if (hole.type === 'normal') {
                // 일반 두더지 명중!
                this.hits++;
                this.molesCaught++;
                this.combo++;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                const comboMultiplier = 1 + Math.min(2.0, (this.combo - 1) * 0.1); // 최대 3배
                const gained = Math.round(100 * comboMultiplier);
                this.score += gained;

                this.showHitPopup(hole, `+${gained}!`, 'hit-normal');
                this.playHammerHitSound(false);
                this.showSmashImpactStars(targetX, targetY, false);
                this.animateMoleDizzy(hole);

            } else if (hole.type === 'gold') {
                // 황금 두더지 대박 명중!
                this.hits++;
                this.goldCaught++;
                this.combo += 2;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                const comboMultiplier = 1 + Math.min(2.0, (this.combo - 1) * 0.1);
                const gained = Math.round(300 * comboMultiplier);
                this.score += gained;

                this.showHitPopup(hole, `🌟 황금 두더지! +${gained} 🌟`, 'hit-gold');
                this.playHammerHitSound(true);
                this.showSmashImpactStars(targetX, targetY, true);
                this.animateMoleDizzy(hole);

            } else if (hole.type === 'bomb') {
                // 💣 폭탄병 격발! 페널티
                this.bombsHit++;
                this.combo = 0;
                this.score = Math.max(0, this.score - 150);

                this.showHitPopup(hole, `💥 쾅! -150점!`, 'hit-bomb');
                this.playBombExplosionSound();
                this.animateBombExplode(hole);
            }

            this.updateScoreboard();

            // 기절 후 굴로 들어가기
            setTimeout(() => {
                this.hideMole(hole, true);
            }, 550);

        } else {
            // 빈 구멍 헛스윙!
            this.misses++;
            this.combo = 0;
            this.showHitPopup(hole, `헛스윙!`, 'hit-miss');
            this.updateScoreboard();
        }
    }

    triggerHammerSwing(hole, targetX, targetY) {
        if (!this.hammerEl) return;

        this.hammerEl.style.left = `${targetX}px`;
        this.hammerEl.style.top = `${targetY}px`;

        // 애니메이션 클래스 재적용 (쾅!)
        this.hammerEl.classList.remove('swinging');
        void this.hammerEl.offsetWidth; // trigger reflow
        this.hammerEl.classList.add('swinging');

        // 바닥에 충격파 먼지 연출
        const dust = document.createElement('div');
        dust.className = 'hammer-impact-shockwave';
        dust.style.left = `${targetX}px`;
        dust.style.top = `${targetY + 20}px`;
        document.body.appendChild(dust);
        setTimeout(() => dust.remove(), 400);
    }

    /**
     * 망치로 두더지를 때렸을 때 나타나는 화려한 코믹 타격 효과 (쾅! 버스트 + 별빛 파티클)
     */
    showSmashImpactStars(targetX, targetY, isGold = false) {
        // 1. 코믹 타격 스티커 (쾅! / POW!)
        const burst = document.createElement('div');
        burst.className = `comic-smash-burst ${isGold ? 'burst-gold' : ''}`;
        burst.textContent = isGold ? '🌟 대박!' : '쾅!';
        burst.style.left = `${targetX}px`;
        burst.style.top = `${targetY - 18}px`;
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 450);

        // 2. 사방으로 튀는 별빛 파티클 (4개)
        const starIcons = isGold ? ['⭐', '✨', '🌟', '💫'] : ['⭐', '💥', '✨', '⚡'];
        for (let i = 0; i < 4; i++) {
            const star = document.createElement('div');
            star.className = 'smash-star-particle';
            star.textContent = starIcons[i % starIcons.length];
            const angle = (i * Math.PI / 2) + (Math.random() * 0.4 - 0.2);
            const dist = 38 + Math.random() * 25;
            const destX = Math.cos(angle) * dist;
            const destY = Math.sin(angle) * dist;
            star.style.setProperty('--dest-x', `${destX}px`);
            star.style.setProperty('--dest-y', `${destY}px`);
            star.style.left = `${targetX}px`;
            star.style.top = `${targetY}px`;
            document.body.appendChild(star);
            setTimeout(() => star.remove(), 400);
        }
    }

    animateMoleDizzy(hole) {
        if (!hole.moleEl) return;
        hole.moleEl.classList.add('mole-bonked');
        const dizzyStars = hole.moleEl.querySelector('.mole-dizzy-stars');
        if (dizzyStars) dizzyStars.style.display = 'block';
    }

    animateBombExplode(hole) {
        if (!hole.moleEl) return;
        hole.moleEl.classList.add('bomb-exploded');
        // 화면 진동 흔들림 효과
        if (this.containerEl) {
            this.containerEl.classList.add('shake-screen');
            setTimeout(() => this.containerEl.classList.remove('shake-screen'), 300);
        }
    }

    showHitPopup(hole, text, typeClass) {
        if (!hole.popupEl) return;
        const pop = document.createElement('div');
        pop.className = `popup-bubble ${typeClass}`;
        pop.textContent = text;
        hole.popupEl.appendChild(pop);
        setTimeout(() => pop.remove(), 700);
    }

    updateScoreboard() {
        const timeEl = document.getElementById('mole-time');
        const scoreEl = document.getElementById('mole-score');
        const comboEl = document.getElementById('mole-combo');
        const accuracyEl = document.getElementById('mole-accuracy');

        if (timeEl) {
            const mins = Math.floor(this.timer / 60);
            const secs = this.timer % 60;
            const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            timeEl.textContent = timeStr;
            if (this.timer <= 15) {
                timeEl.classList.add('urgent-time');
            } else {
                timeEl.classList.remove('urgent-time');
            }
        }

        if (scoreEl) {
            scoreEl.textContent = this.score.toLocaleString();
        }

        if (comboEl) {
            if (this.combo >= 2) {
                const multi = (1 + Math.min(2.0, (this.combo - 1) * 0.1)).toFixed(1);
                comboEl.innerHTML = `🔥 ${this.combo} COMBO! <small>(${multi}x)</small>`;
                comboEl.classList.add('combo-boost');
            } else {
                comboEl.textContent = `${this.combo} COMBO`;
                comboEl.classList.remove('combo-boost');
            }
        }

        if (accuracyEl) {
            const totalWhacks = this.hits + this.misses;
            const pct = totalWhacks > 0 ? Math.round((this.hits / totalWhacks) * 100) : 100;
            accuracyEl.textContent = `${pct}% (${this.hits}/${totalWhacks})`;
        }
    }

    updateBestScoreDisplay() {
        const bestEl = document.getElementById('mole-best-score');
        if (!bestEl) return;
        const rankings = this.getRankings();
        if (rankings.length > 0) {
            bestEl.textContent = `${rankings[0].score.toLocaleString()}점 (${rankings[0].name})`;
        } else {
            bestEl.textContent = '0점 (최지훈)';
        }
    }

    gameOver() {
        this.stop();
        if (this.sound) {
            this.sound.playFanfareCheer();
        }

        // 랭킹 저장
        const rankResult = this.saveRanking(this.playerName, this.score, this.maxCombo, this.molesCaught);

        // 게임오버 모달 업데이트
        const modal = document.getElementById('mole-gameover-modal');
        if (!modal) return;

        const finalScoreEl = document.getElementById('mole-final-score');
        const finalComboEl = document.getElementById('mole-final-combo');
        const finalCaughtEl = document.getElementById('mole-final-caught');
        const finalAccuracyEl = document.getElementById('mole-final-accuracy');
        const rankListEl = document.getElementById('mole-gameover-ranking-list');

        if (finalScoreEl) finalScoreEl.textContent = `${this.score.toLocaleString()}점`;
        if (finalComboEl) finalComboEl.textContent = `${this.maxCombo} 연속`;
        if (finalCaughtEl) finalCaughtEl.textContent = `일반 두더지 ${this.molesCaught}마리 / 황금 두더지 ${this.goldCaught}마리 / 폭탄 ${this.bombsHit}회`;

        const totalWhacks = this.hits + this.misses;
        const pct = totalWhacks > 0 ? Math.round((this.hits / totalWhacks) * 100) : 0;
        if (finalAccuracyEl) finalAccuracyEl.textContent = `${pct}% (${this.hits}타 / ${totalWhacks}스윙)`;

        // 랭킹 리스트 렌더링
        if (rankListEl) {
            this.renderRankingList(rankListEl, rankResult.list);
        }

        modal.classList.add('active');
    }

    hideGameOverModal() {
        const modal = document.getElementById('mole-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
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
        } catch (e) {
            console.error(e);
        }

        // 제작팀 5인 기본 랭킹 데이터
        const defaultRanks = [
            { name: '최지훈', score: 8600, combo: 24, caught: 58 },
            { name: '박주아', score: 7900, combo: 20, caught: 52 },
            { name: '김이수', score: 7100, combo: 17, caught: 47 },
            { name: '최우영', score: 6300, combo: 14, caught: 41 },
            { name: '전준우', score: 5500, combo: 11, caught: 36 }
        ];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultRanks));
        return defaultRanks;
    }

    saveRanking(name, score, combo, caught) {
        const list = this.getRankings();
        const entry = {
            name: name || '익명 도전자',
            score: score,
            combo: combo,
            caught: caught,
            date: new Date().toLocaleDateString(),
            isNew: true
        };
        list.forEach(item => delete item.isNew);
        list.push(entry);
        list.sort((a, b) => b.score - a.score || b.combo - a.combo);
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
                <span class="rank-score">${r.score.toLocaleString()}점 <small style="color:#5c4938;">(🔥${r.combo || 0}콤보 / 두더지 ${r.caught || 0})</small></span>
            `;
            ulEl.appendChild(li);
        });
    }

    escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ==========================================
    // 🔨 두더지 타격 전용 고품질 웹 오디오 신디사이저 효과음
    // ==========================================

    /**
     * 두더지 명중 시 강력한 쾅! + 스냅 + 두더지 뾱! + 챠링~ 4중 레이어 타격 효과음
     */
    playHammerHitSound(isGold = false) {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. 묵직하고 강렬한 나무망치 '쾅/퍽!' 타격음 (Bass Mallet Thump)
            const thumpOsc = ctx.createOscillator();
            const thumpGain = ctx.createGain();
            thumpOsc.type = 'triangle';
            thumpOsc.frequency.setValueAtTime(680, now);
            thumpOsc.frequency.exponentialRampToValueAtTime(95, now + 0.14);
            thumpGain.gain.setValueAtTime(0.75, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            thumpOsc.connect(thumpGain);
            thumpGain.connect(ctx.destination);
            thumpOsc.start(now);
            thumpOsc.stop(now + 0.16);

            // 2. 찰지고 날카로운 망치 충돌 스냅 (Crisp Impact Snap)
            const snapOsc = ctx.createOscillator();
            const snapGain = ctx.createGain();
            snapOsc.type = 'sawtooth';
            snapOsc.frequency.setValueAtTime(1600, now);
            snapOsc.frequency.exponentialRampToValueAtTime(260, now + 0.05);
            snapGain.gain.setValueAtTime(0.5, now);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            snapOsc.connect(snapGain);
            snapGain.connect(ctx.destination);
            snapOsc.start(now);
            snapOsc.stop(now + 0.06);

            // 3. 귀여운 두더지 '뾱! / 끽!' 기절 사운드 (Cute Mole Squeak/Bonk)
            const squeakOsc = ctx.createOscillator();
            const squeakGain = ctx.createGain();
            squeakOsc.type = 'sine';
            squeakOsc.frequency.setValueAtTime(880, now + 0.02);
            squeakOsc.frequency.exponentialRampToValueAtTime(1650, now + 0.08);
            squeakGain.gain.setValueAtTime(0.38, now + 0.02);
            squeakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            squeakOsc.connect(squeakGain);
            squeakGain.connect(ctx.destination);
            squeakOsc.start(now + 0.02);
            squeakOsc.stop(now + 0.15);

            // 4. 경쾌한 득점 챠링~ 벨 차임 (Score Bell Chime)
            if (isGold) {
                // 황금 두더지: 3단 보너스 코인 팡파르
                [1046.5, 1318.5, 2093.0].forEach((freq, idx) => {
                    const cOsc = ctx.createOscillator();
                    const cGain = ctx.createGain();
                    cOsc.type = 'sine';
                    cOsc.frequency.setValueAtTime(freq, now + 0.04 + idx * 0.055);
                    cGain.gain.setValueAtTime(0.45, now + 0.04 + idx * 0.055);
                    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22 + idx * 0.055);
                    cOsc.connect(cGain);
                    cGain.connect(ctx.destination);
                    cOsc.start(now + 0.04 + idx * 0.055);
                    cOsc.stop(now + 0.25 + idx * 0.055);
                });
            } else {
                // 일반 두더지: 2단 상쾌한 딩동
                [987.77, 1318.5].forEach((freq, idx) => {
                    const dOsc = ctx.createOscillator();
                    const dGain = ctx.createGain();
                    dOsc.type = 'sine';
                    dOsc.frequency.setValueAtTime(freq, now + 0.03 + idx * 0.05);
                    dGain.gain.setValueAtTime(0.35, now + 0.03 + idx * 0.05);
                    dGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18 + idx * 0.05);
                    dOsc.connect(dGain);
                    dGain.connect(ctx.destination);
                    dOsc.start(now + 0.03 + idx * 0.05);
                    dOsc.stop(now + 0.20 + idx * 0.05);
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * 망치 휘두를 때 바람을 가르는 슉! 스윙 효과음
     */
    playHammerSwingSound() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(460, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {}
    }

    /**
     * 폭탄병 격발 시 화끈한 쾅! 폭발음
     */
    playBombExplosionSound() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(25, now + 0.38);
            gain.gain.setValueAtTime(0.7, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.43);

            // 폭발 노이즈
            const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseBuffer.length; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.linearRampToValueAtTime(80, now + 0.25);
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0.45, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            whiteNoise.connect(filter);
            filter.connect(nGain);
            nGain.connect(ctx.destination);
            whiteNoise.start(now);
            whiteNoise.stop(now + 0.25);
        } catch (e) {}
    }

    playPopSound() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.06);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    }

    playClockTick() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    }
}
