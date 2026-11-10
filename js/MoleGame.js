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
        this.diamondCaught = 0;
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

            // 잔디 & 꽃 장식 (자연스럽고 예쁜 디테일)
            const decor = document.createElement('div');
            decor.className = 'mound-decor';
            const flowers = ['🌸', '🌼', '🍀', '🌻', '🌺'];
            decor.innerHTML = `
                <span class="mound-grass left">🌱</span>
                <span class="mound-flower">${flowers[(hole.id - 1) % flowers.length]}</span>
                <span class="mound-grass right">🌱</span>
            `;

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
            mound.appendChild(decor);
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
     * 6학년 프로 게이머들도 반하는 프리미엄 스튜디오급 3D 일러스트레이션 SVG
     */
    getMoleSVG(type = 'normal') {
        if (type === 'bomb') {
            // 💣 메카 다이너마이트 폭탄병 (Mecha Bob-omb)
            return `
            <svg class="mole-svg bob-omb-svg" viewBox="0 0 120 135" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="bombBodyGrad" cx="38%" cy="32%" r="62%">
                        <stop offset="0%" stop-color="#64748b"/>
                        <stop offset="25%" stop-color="#1e293b"/>
                        <stop offset="70%" stop-color="#0f172a"/>
                        <stop offset="100%" stop-color="#020617"/>
                    </radialGradient>
                    <linearGradient id="keyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fef08a"/>
                        <stop offset="45%" stop-color="#eab308"/>
                        <stop offset="100%" stop-color="#854d0e"/>
                    </linearGradient>
                    <radialGradient id="fuseGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="30%" stop-color="#fef08a"/>
                        <stop offset="70%" stop-color="#f97316"/>
                        <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
                    </radialGradient>
                </defs>

                <!-- 황동 태엽 키 (뒤쪽 회전) -->
                <g class="bomb-wind-key">
                    <rect x="8" y="58" width="16" height="8" rx="2" fill="url(#keyGrad)" stroke="#111827" stroke-width="2.5"/>
                    <circle cx="8" cy="62" r="13" fill="none" stroke="url(#keyGrad)" stroke-width="6"/>
                    <circle cx="8" cy="62" r="13" fill="none" stroke="#111827" stroke-width="2.5"/>
                </g>

                <!-- 도화선 (입체 굵은 밧줄) -->
                <path d="M60 42 Q66 22 78 14" stroke="#ca8a04" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="3 3"/>
                <path d="M60 42 Q66 22 78 14" stroke="#78350f" stroke-width="3" fill="none" stroke-linecap="round"/>
                
                <!-- 도화선 불꽃 스파크 & 연기 -->
                <g class="bomb-spark-group">
                    <circle cx="80" cy="12" r="18" fill="url(#fuseGlow)" class="fuse-spark-halo"/>
                    <polygon points="80,2 84,9 91,8 86,14 90,21 82,17 76,21 78,14 72,10 79,9" fill="#fef08a" class="fuse-spark-core"/>
                    <circle cx="80" cy="12" r="4.5" fill="#ffffff"/>
                </g>

                <!-- 메카 발 (오렌지 스니커즈) -->
                <ellipse cx="44" cy="118" rx="14" ry="8" fill="#ea580c" stroke="#111827" stroke-width="3"/>
                <ellipse cx="44" cy="116" rx="11" ry="5" fill="#f97316"/>
                <rect x="40" y="112" width="8" height="3" rx="1.5" fill="#ffffff"/>
                <ellipse cx="76" cy="118" rx="14" ry="8" fill="#ea580c" stroke="#111827" stroke-width="3"/>
                <ellipse cx="76" cy="116" rx="11" ry="5" fill="#f97316"/>
                <rect x="72" y="112" width="8" height="3" rx="1.5" fill="#ffffff"/>

                <!-- 구체 폭탄 본체 -->
                <circle cx="60" cy="78" r="40" fill="url(#bombBodyGrad)" stroke="#090d16" stroke-width="4"/>

                <!-- 금속 3D 하이라이트 (스펙큘러) -->
                <path d="M36 50 Q48 42 66 45 Q50 50 42 62 Z" fill="#ffffff" opacity="0.6"/>
                <ellipse cx="38" cy="64" rx="4" ry="9" fill="#ffffff" opacity="0.4" transform="rotate(-30 38 64)"/>

                <!-- 공사 위험 경고 스트라이프 벨트 -->
                <g clip-path="url(#bombBeltClip)">
                    <clipPath id="bombBeltClip">
                        <rect x="22" y="75" width="76" height="15" rx="4"/>
                    </clipPath>
                    <rect x="22" y="75" width="76" height="15" fill="#eab308" stroke="#111827" stroke-width="2.5"/>
                    <path d="M24 75 L34 90 M36 75 L46 90 M48 75 L58 90 M60 75 L70 90 M72 75 L82 90 M84 75 L94 90" 
                          stroke="#1e293b" stroke-width="5"/>
                </g>

                <!-- 분노한 애니메 눈 (> <) -->
                <g class="bomb-eyes-angry">
                    <path d="M42 67 L52 72 L42 77" stroke="#ef4444" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 0 5px #ef4444)"/>
                    <path d="M78 67 L68 72 L78 77" stroke="#ef4444" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 0 5px #ef4444)"/>
                </g>

                <!-- 해골 위험 심볼 -->
                <circle cx="60" cy="101" r="9.5" fill="#ef4444" stroke="#111827" stroke-width="2"/>
                <text x="60" y="105" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">☠️</text>
            </svg>`;
        }

        const isGold = (type === 'gold');
        const isDiamond = (type === 'diamond');

        let bodyGradStops = `
            <stop offset="0%" stop-color="#b45309"/>
            <stop offset="38%" stop-color="#854d0e"/>
            <stop offset="72%" stop-color="#57300a"/>
            <stop offset="100%" stop-color="#2e1503"/>
        `;
        let snoutFill = '#fef3c7';
        let snoutStroke = '#78350f';
        let capColor = '#dc2626';

        if (isGold) {
            bodyGradStops = `
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="15%" stop-color="#fef08a"/>
                <stop offset="45%" stop-color="#facc15"/>
                <stop offset="80%" stop-color="#b45309"/>
                <stop offset="100%" stop-color="#713f12"/>
            `;
            snoutFill = '#fef9c3';
            snoutStroke = '#a16207';
            capColor = '#f59e0b';
        } else if (isDiamond) {
            bodyGradStops = `
                <stop offset="0%" stop-color="#ffffff"/>
                <stop offset="20%" stop-color="#e0f2fe"/>
                <stop offset="50%" stop-color="#38bdf8"/>
                <stop offset="80%" stop-color="#0284c7"/>
                <stop offset="100%" stop-color="#0c4a6e"/>
            `;
            snoutFill = '#e0f2fe';
            snoutStroke = '#0369a1';
            capColor = '#06b6d4';
        }

        return `
        <svg class="mole-svg ${type}-mole-svg" viewBox="0 0 120 135" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="moleGrad_${type}" cx="42%" cy="38%" r="58%">
                    ${bodyGradStops}
                </radialGradient>
                <linearGradient id="glassesLensGrad_${type}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#06b6d4"/>
                    <stop offset="45%" stop-color="#3b82f6"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
                <linearGradient id="goldCrownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#fef08a"/>
                    <stop offset="40%" stop-color="#facc15"/>
                    <stop offset="80%" stop-color="#eab308"/>
                    <stop offset="100%" stop-color="#854d0e"/>
                </linearGradient>
                <radialGradient id="diamondGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
                </radialGradient>
            </defs>

            ${isGold ? `
            <!-- 황금 후광 아우라 -->
            <circle cx="60" cy="65" r="52" fill="none" stroke="#fde047" stroke-width="4" opacity="0.45" class="gold-aura-ring"/>
            <circle cx="60" cy="65" r="48" fill="none" stroke="#facc15" stroke-width="2" stroke-dasharray="6 4" class="gold-aura-spin"/>
            ` : ''}

            ${isDiamond ? `
            <!-- 다이아몬드 네온 아우라 -->
            <circle cx="60" cy="65" r="52" fill="url(#diamondGlow)"/>
            <polygon points="24,30 28,38 20,38" fill="#e0f2fe" class="diamond-float-1"/>
            <polygon points="96,32 100,40 92,40" fill="#e0f2fe" class="diamond-float-2"/>
            ` : ''}

            <!-- 귀 (입체 그라데이션) -->
            <g class="mole-ears">
                <circle cx="24" cy="54" r="13" fill="url(#moleGrad_${type})" stroke="#1a1612" stroke-width="3.5"/>
                <circle cx="24" cy="54" r="7" fill="${snoutFill}" opacity="0.8"/>
                <circle cx="96" cy="54" r="13" fill="url(#moleGrad_${type})" stroke="#1a1612" stroke-width="3.5"/>
                <circle cx="96" cy="54" r="7" fill="${snoutFill}" opacity="0.8"/>
            </g>

            <!-- 통통하고 매끄러운 3D 몸통/머리 (타원 + 베지어) -->
            <path d="M24 116 C16 75, 26 32, 60 32 C94 32, 104 75, 96 116 Z" 
                  fill="url(#moleGrad_${type})" stroke="#1a1612" stroke-width="4.5"/>

            <!-- 머리 상단 하이라이트 광원 -->
            <ellipse cx="55" cy="42" rx="16" ry="6" fill="#ffffff" opacity="0.35" transform="rotate(-12 55 42)"/>

            ${isGold ? `
            <!-- 👑 로열 골드 왕관 -->
            <g class="mole-crown">
                <ellipse cx="60" cy="33" rx="19" ry="8" fill="#991b1b" stroke="#1a1612" stroke-width="2"/>
                <path d="M38 34 L42 16 L52 25 L60 12 L68 25 L78 16 L82 34 Z" 
                      fill="url(#goldCrownGrad)" stroke="#1a1612" stroke-width="3" stroke-linejoin="round"/>
                <circle cx="60" cy="22" r="4.5" fill="#ef4444" stroke="#1a1612" stroke-width="1.5"/>
                <circle cx="59" cy="21" r="1.5" fill="#ffffff"/>
                <circle cx="48" cy="28" r="3.5" fill="#3b82f6" stroke="#1a1612" stroke-width="1.5"/>
                <circle cx="72" cy="28" r="3.5" fill="#10b981" stroke="#1a1612" stroke-width="1.5"/>
            </g>
            ` : (isDiamond ? `
            <!-- 💎 다이아몬드 크리스탈 티아라 -->
            <g class="mole-diamond-tiara">
                <polygon points="60,8 72,24 60,32 48,24" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.5"/>
                <polygon points="60,8 60,32 48,24" fill="#bae6fd" opacity="0.7"/>
                <polygon points="40,22 48,26 42,33 34,28" fill="#7dd3fc" stroke="#0369a1" stroke-width="2"/>
                <polygon points="80,22 86,28 78,33 72,26" fill="#7dd3fc" stroke="#0369a1" stroke-width="2"/>
            </g>
            ` : `
            <!-- 🧢 힙스터 스냅백 모자 (뒤로 쓴 스타일) -->
            <g class="mole-snapback">
                <ellipse cx="60" cy="34" rx="24" ry="9" fill="${capColor}" stroke="#1a1612" stroke-width="3.5"/>
                <ellipse cx="60" cy="33" rx="22" ry="6" fill="#b91c1c"/>
                <circle cx="60" cy="26" r="4.5" fill="#facc15" stroke="#1a1612" stroke-width="2"/>
                <circle cx="59" cy="25" r="1.5" fill="#ffffff"/>
            </g>
            `)}

            <!-- 🕶️ 3D 디자인 선글라스 (사이버펑크 / 미러 렌즈) -->
            <g class="mole-sunglasses-group">
                <path d="M50 63 L70 63" stroke="#090d16" stroke-width="6" stroke-linecap="round"/>
                <path d="M52 63 L68 63" stroke="${isGold ? '#eab308' : (isDiamond ? '#38bdf8' : '#ffffff')}" stroke-width="2" stroke-linecap="round"/>
                
                <rect x="26" y="52" width="28" height="22" rx="7" fill="url(#glassesLensGrad_${type})" stroke="#090d16" stroke-width="3.5"/>
                <rect x="66" y="52" width="28" height="22" rx="7" fill="url(#glassesLensGrad_${type})" stroke="#090d16" stroke-width="3.5"/>

                <polygon points="32,56 42,56 32,70 28,70" fill="#ffffff" opacity="0.85"/>
                <polygon points="44,56 48,56 40,70 36,70" fill="#ffffff" opacity="0.55"/>
                <polygon points="72,56 82,56 72,70 68,70" fill="#ffffff" opacity="0.85"/>
                <polygon points="84,56 88,56 80,70 76,70" fill="#ffffff" opacity="0.55"/>

                <circle cx="28" cy="55" r="1.5" fill="#facc15"/>
                <circle cx="92" cy="55" r="1.5" fill="#facc15"/>
            </g>

            <!-- 볼터치 (생동감 넘치는 홍조) -->
            <ellipse cx="32" cy="82" rx="6" ry="3.5" fill="#f43f5e" opacity="0.45"/>
            <ellipse cx="88" cy="82" rx="6" ry="3.5" fill="#f43f5e" opacity="0.45"/>

            <!-- 둥글넓적한 입체 주둥이 (Snout) -->
            <ellipse cx="60" cy="81" rx="24" ry="16" fill="${snoutFill}" stroke="${snoutStroke}" stroke-width="3"/>
            <ellipse cx="60" cy="77" rx="20" ry="10" fill="#ffffff" opacity="0.35"/>

            <!-- 입체 단추 코 -->
            <ellipse cx="60" cy="74" rx="7" ry="5" fill="#1c1917" stroke="#0c0a09" stroke-width="1.5"/>
            <ellipse cx="58" cy="72.5" rx="2.5" ry="1.5" fill="#ffffff" opacity="0.9"/>

            <!-- 앞니 2개 (Glossy Buck Teeth) -->
            <rect x="53" y="85" width="6.5" height="8.5" rx="2" fill="#ffffff" stroke="#1a1612" stroke-width="2"/>
            <rect x="60.5" y="85" width="6.5" height="8.5" rx="2" fill="#ffffff" stroke="#1a1612" stroke-width="2"/>

            <!-- 귀여운 미소 입꼬리 -->
            <path d="M48 88 Q60 96 72 88" stroke="#1a1612" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M56 89 Q60 94 64 89" fill="#f43f5e" stroke="#1a1612" stroke-width="1.5"/>

            ${isGold ? `
            <!-- 🪙 골드 목걸이 메달리온 -->
            <g class="mole-gold-chain">
                <path d="M42 108 Q60 120 78 108" stroke="#eab308" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="3 3"/>
                <circle cx="60" cy="118" r="8" fill="#fde047" stroke="#854d0e" stroke-width="2.5"/>
                <text x="60" y="122" font-size="10" font-weight="900" fill="#854d0e" text-anchor="middle">★</text>
            </g>
            ` : ''}

            <!-- 🐾 3D 앞발 (구멍 테두리를 꽉 쥐고 솟아나오는 모션) -->
            <g class="mole-paws-front">
                <ellipse cx="28" cy="108" rx="13" ry="8" fill="${snoutFill}" stroke="#1a1612" stroke-width="3"/>
                <ellipse cx="20" cy="105" rx="3" ry="4.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>
                <ellipse cx="26" cy="103" rx="3" ry="5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>
                <ellipse cx="32" cy="104" rx="3" ry="4.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>

                <ellipse cx="92" cy="108" rx="13" ry="8" fill="${snoutFill}" stroke="#1a1612" stroke-width="3"/>
                <ellipse cx="88" cy="104" rx="3" ry="4.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>
                <ellipse cx="94" cy="103" rx="3" ry="5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>
                <ellipse cx="100" cy="105" rx="3" ry="4.5" fill="#ffffff" stroke="#1a1612" stroke-width="1.5"/>
            </g>

            <!-- 피격(기절/KO) 시 회전하는 만화풍 3D 별 & 빙글빙글 새 -->
            <g class="mole-dizzy-stars" style="display:none;">
                <text x="20" y="28" font-size="20" class="dizzy-star-spin">💫</text>
                <text x="78" y="24" font-size="20" class="dizzy-star-spin-reverse">⭐</text>
                <text x="50" y="16" font-size="16" class="dizzy-bird">🐥</text>
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
            // 두더지 출현 빈도 완화: 너무 자주 나오지 않고 여유 있고 쾌적한 아케이드 템포 (1.1초 ~ 2.2초)
            const progress = (120 - this.timer) / 120; // 0.0 ~ 1.0
            const minDelay = 1100;
            const maxDelay = 2200 - (progress * 600); // 2200ms -> 1600ms
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

        // 과도한 동시 다발 출현 방지: 기본 1마리씩 등장, 60초 이후에만 간헐적 2마리 등장
        const elapsed = 120 - this.timer;
        let count = 1;
        if (elapsed > 60 && Math.random() < 0.25) count = 2;

        // 셔플 후 선택
        const shuffled = [...emptyHoles].sort(() => Math.random() - 0.5);
        const toSpawn = shuffled.slice(0, Math.min(count, emptyHoles.length));

        toSpawn.forEach(hole => this.popMole(hole));
    }

    popMole(hole) {
        if (!hole || hole.state !== 'empty') return;

        // 타입 결정:
        // 일반 두더지 (65%), 황금 두더지 (16%), 폭탄병 (13%), 초희귀 다이아몬드 두더지 (6%)
        const rand = Math.random();
        let type = 'normal';
        if (rand < 0.06) {
            type = 'diamond'; // 💎 다이아몬드 두더지 (+500점 슈퍼 잭팟)
        } else if (rand < 0.22) {
            type = 'gold'; // 👑 황금 두더지 (+300점)
        } else if (rand < 0.35) {
            type = 'bomb'; // 💣 폭탄병 (-150점 & 콤보 리셋)
        }

        hole.type = type;
        hole.state = 'up';
        hole.moleEl.innerHTML = this.getMoleSVG(type);
        hole.moleEl.className = `mole-actor mole-visible mole-${type}`;

        // 머무는 시간 계산 (충분히 보고 칠 수 있도록 0.9초 ~ 1.6초 제공)
        const progress = (120 - this.timer) / 120;
        const stayTime = Math.max(900, 1600 - (progress * 450) + (Math.random() * 250));

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
                this.playHammerHitSound('normal');
                this.showSmashImpactStars(targetX, targetY, 'normal');
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

                this.showHitPopup(hole, `👑 황금 두더지! +${gained}`, 'hit-gold');
                this.playHammerHitSound('gold');
                this.showSmashImpactStars(targetX, targetY, 'gold');
                this.animateMoleDizzy(hole);

            } else if (hole.type === 'diamond') {
                // 💎 다이아몬드 두더지 초대박 잭팟!
                this.hits++;
                this.diamondCaught = (this.diamondCaught || 0) + 1;
                this.combo += 3;
                if (this.combo > this.maxCombo) this.maxCombo = this.combo;

                const comboMultiplier = 1 + Math.min(2.0, (this.combo - 1) * 0.1);
                const gained = Math.round(500 * comboMultiplier);
                this.score += gained;

                this.showHitPopup(hole, `💎 다이아 잭팟! +${gained}`, 'hit-diamond');
                this.playHammerHitSound('diamond');
                this.showSmashImpactStars(targetX, targetY, 'diamond');
                this.animateMoleDizzy(hole);

            } else if (hole.type === 'bomb') {
                // 💣 폭탄병 격발! 페널티
                this.bombsHit++;
                this.combo = 0;
                this.score = Math.max(0, this.score - 150);

                this.showHitPopup(hole, `💥 폭탄 폭발! -150점!`, 'hit-bomb');
                this.playBombExplosionSound();
                this.animateBombExplode(hole);
                this.flashScorePenalty();
            }

            this.updateScoreboard();

            // 기절 후 굴로 들어가기
            setTimeout(() => {
                this.hideMole(hole, true);
            }, 550);

        } else {
            // ❌ 빈 구멍 헛스윙! (유저 요청: 계속 헛스윙해도 포인트 깎이는 게 없는 문제 해결!)
            this.misses++;
            this.combo = 0;
            const penalty = 30; // 헛스윙 시 -30점 감점
            this.score = Math.max(0, this.score - penalty);
            this.showHitPopup(hole, `헛스윙! -${penalty}점`, 'hit-miss');
            this.playMissWhiffSound();
            this.flashScorePenalty();
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
    showSmashImpactStars(targetX, targetY, type = 'normal') {
        const isGold = (type === 'gold');
        const isDiamond = (type === 'diamond');

        // 1. 코믹 타격 스티커 (쾅! / 대박! / 💎 잭팟!)
        const burst = document.createElement('div');
        burst.className = `comic-smash-burst ${isGold ? 'burst-gold' : (isDiamond ? 'burst-diamond' : '')}`;
        burst.textContent = isDiamond ? '💎 잭팟!' : (isGold ? '🌟 대박!' : '쾅!');
        burst.style.left = `${targetX}px`;
        burst.style.top = `${targetY - 18}px`;
        document.body.appendChild(burst);
        setTimeout(() => burst.remove(), 450);

        // 2. 사방으로 튀는 별빛 & 다이아몬드 파티클 (4개)
        const starIcons = isDiamond 
            ? ['💎', '✨', '🔷', '⭐'] 
            : (isGold ? ['⭐', '✨', '🌟', '💫'] : ['⭐', '💥', '✨', '⚡']);
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

    flashScorePenalty() {
        const scoreEl = document.getElementById('mole-score');
        if (scoreEl) {
            scoreEl.classList.remove('score-deduct');
            void scoreEl.offsetWidth;
            scoreEl.classList.add('score-deduct');
        }
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
        if (finalCaughtEl) finalCaughtEl.textContent = `일반 두더지 ${this.molesCaught}마리 / 황금 ${this.goldCaught}마리 / 다이아 ${this.diamondCaught || 0}마리 / 폭탄 ${this.bombsHit}회`;

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
    playHammerHitSound(type = 'normal') {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const isGold = (type === 'gold');
            const isDiamond = (type === 'diamond');

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
            if (isDiamond) {
                // 💎 다이아몬드 두더지: 5단 크리스탈 팡파르
                [1318.5, 1760.0, 2093.0, 2637.0, 3520.0].forEach((freq, idx) => {
                    const cOsc = ctx.createOscillator();
                    const cGain = ctx.createGain();
                    cOsc.type = 'sine';
                    cOsc.frequency.setValueAtTime(freq, now + 0.03 + idx * 0.045);
                    cGain.gain.setValueAtTime(0.48, now + 0.03 + idx * 0.045);
                    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28 + idx * 0.045);
                    cOsc.connect(cGain);
                    cGain.connect(ctx.destination);
                    cOsc.start(now + 0.03 + idx * 0.045);
                    cOsc.stop(now + 0.32 + idx * 0.045);
                });
            } else if (isGold) {
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
     * 빈 구멍 헛스윙 시 바람을 가르는 슉! + 감점 버저음
     */
    playMissWhiffSound() {
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // 1. 바람 가르는 헛스윙 휘두름
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);

            // 2. 아쉬운 뾱/보잉 감점 알림음
            const buzzOsc = ctx.createOscillator();
            const buzzGain = ctx.createGain();
            buzzOsc.type = 'sawtooth';
            buzzOsc.frequency.setValueAtTime(175, now + 0.03);
            buzzOsc.frequency.exponentialRampToValueAtTime(115, now + 0.18);
            buzzGain.gain.setValueAtTime(0.22, now + 0.03);
            buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);
            buzzOsc.connect(buzzGain);
            buzzGain.connect(ctx.destination);
            buzzOsc.start(now + 0.03);
            buzzOsc.stop(now + 0.20);
        } catch (e) {}
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
