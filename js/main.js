/**
 * Smile Games - 원숭이의 바나나 런
 * [6학년 맞춤형 5단계 스테이지 + 방패 무적 아이템 + 등반 경사로 + 굴러오는 돌 + 학교 엔딩 완벽 통합]
 * 개발자: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 반영 사항:
 * 1. 특별 아이템(🛡️ 방패): 획득 시 멋있는 파워업 사운드(playSpecialItem)와 함께 7초간 모든 기물에 완전 무적!
 * 2. 톰 골드런 스타일 등반 장애물(경사로 ramp): 부딪히지 않고 그 위로 올라가서 달릴 수 있음!
 * 3. 움직이는 돌(rolling_stone): 플레이어를 향해 굴러오며 묵직한 바위 굴러가는 소리(playRollingStone) 재생!
 * 4. 초등학교 6학년 맞춤형 5단계 레벨 & 낮은 체력(HP 60, 3회 충돌 시 소멸, 문제 풀면 회복):
 *    - 1단계: 숲 (다람쥐, 토끼, 사슴, 여우 등 동물 디테일)
 *    - 2단계: 사막 (전갈, 사막여우, 낙타, 피라미드 디테일)
 *    - 3단계: 해저 (상어, 열대어, 고래, 문어, 산호초 디테일)
 *    - 4단계: 도시 (타임스퀘어 화려한 밤 네온 전광판 & 노란 택시 디테일)
 *    - 5단계: 글리치 보이드 (마지막 스테이지! 주변에 '치지직' 노이즈 소리와 함께 가장 빠른 난이도)
 *    - 엔딩: 5단계를 클리어하면 드디어 🏫 스마일 초등학교(6학년 교실)가 나오며 해피엔딩 클리어!
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI 요소 참조
const stageBadgeEl = document.getElementById('stage-badge');
const shieldStatusEl = document.getElementById('shield-status');
const hudPlayerNameEl = document.getElementById('hud-player-name');
const scoreEl = document.getElementById('score-val');
const bestScoreEl = document.getElementById('best-score-val');
const mathSolvedEl = document.getElementById('math-solved-val');
const hpBarFillEl = document.getElementById('hp-bar-fill');
const hpBarLabelEl = document.getElementById('hp-bar-label');
const dragonFillEl = document.getElementById('dragon-meter-fill');
const dragonLabelEl = document.getElementById('dragon-meter-label');
const bubbleEn = document.getElementById('bubble-en');
const bubbleKo = document.getElementById('bubble-ko');

// 모달 및 입력 요소
const startModal = document.getElementById('start-modal');
const gameOverModal = document.getElementById('gameover-modal');
const gameOverTitleEl = document.getElementById('gameover-title');
const playerNameInput = document.getElementById('player-name-input');
const startRankingListEl = document.getElementById('start-ranking-list');
const gameOverRankingListEl = document.getElementById('gameover-ranking-list');
const finalPlayerNameEl = document.getElementById('final-player-name');
const finalScoreEl = document.getElementById('final-score');
const finalMathEl = document.getElementById('final-math');
const bgmBtn = document.getElementById('btn-bgm');

// 모듈 인스턴스 생성
const sound = new SoundManager();
const hero = new PeanutsMonkeyHero();
const track = new TrackManager();
const mathGate = new MathGateManager();
const dragon = new DragonChaser();

// 게임 상태 변수
let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let gameState = 'START_MENU'; // 'START_MENU' | 'PROLOGUE' | 'PLAYING' | 'SCHOOL_ENDING' | 'GAMEOVER'
let playerName = localStorage.getItem('smilegames_last_player') || '';
let score = 0;
let gameSpeed = 1.0;
let schoolEndingTimer = 0;

if (playerName) {
    playerNameInput.value = playerName;
}

const STAGE_INFO = {
    1: { badge: '🌲 1단계: 동물들의 숲', speedBase: 1.0, ko: '"1단계 숲속! 다람쥐와 사슴이 응원해! 경사로 위로 올라가고 굴러오는 돌을 피해!"' },
    2: { badge: '🏜️ 2단계: 황금 사막', speedBase: 1.15, ko: '"2단계 사막 진입! 전갈, 사막여우, 낙타가 있는 사막을 돌파하자!"' },
    3: { badge: '🦈 3단계: 신비한 해저', speedBase: 1.28, ko: '"3단계 해저 터널! 상어와 고래, 물고기들이 헤엄치는 바다 밑을 달리자!"' },
    4: { badge: '🌃 4단계: 도시 (타임스퀘어 밤)', speedBase: 1.42, ko: '"4단계 타임스퀘어 야경! 네온 전광판과 노란 택시 사이를 질주하자!"' },
    5: { badge: '⚡ 5단계: 글리치 보이드 (FINAL)', speedBase: 1.62, ko: '"치지직... 마지막 5단계 글리치 보이드! 여길 넘으면 학교에 도착해!"' },
    6: { badge: '🏫 엔딩: 스마일 초등학교 도착!', speedBase: 1.0, ko: '"딩동댕동~ 드디어 6학년 교실이 있는 학교에 무사히 도착했어! 축하해!"' }
};

// =========================================================================
// 🏆 랭킹 시스템 (localStorage 기반 + Smile Games 개발팀 초기 명예의 전당)
// =========================================================================
const RANKING_STORAGE_KEY = 'smilegames_monkey_rankings_v1';

function getRankings() {
    const raw = localStorage.getItem(RANKING_STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
    }
    const defaultRankings = [
        { name: '최지훈', score: 1250, math: 10 },
        { name: '박주아', score: 980, math: 8 },
        { name: '김이수', score: 840, math: 7 },
        { name: '최우영', score: 710, math: 6 },
        { name: '전준우', score: 620, math: 5 }
    ];
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(defaultRankings));
    return defaultRankings;
}

function saveScoreToRanking(name, newScore, mathCount) {
    const list = getRankings();
    const entry = {
        name: name || '익명 원숭이',
        score: newScore,
        math: mathCount,
        isNew: true
    };
    list.forEach(item => delete item.isNew);
    list.push(entry);
    list.sort((a, b) => b.score - a.score || b.math - a.math);
    const top10 = list.slice(0, 10);
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(top10));
    return top10;
}

function renderRankingList(ulElement, rankings) {
    ulElement.innerHTML = '';
    const medals = ['🥇 1위', '🥈 2위', '🥉 3위'];
    rankings.forEach((r, idx) => {
        const li = document.createElement('li');
        li.className = 'ranking-item' + (r.isNew ? ' highlight' : '');
        const rankLabel = idx < 3 ? medals[idx] : `${idx + 1}위`;
        li.innerHTML = `
            <span class="rank-badge">${rankLabel}</span>
            <span class="rank-name">${escapeHtml(r.name)}</span>
            <span class="rank-score">${r.score}점 <small style="color:#5c4938;">(🧮${r.math || 0})</small></span>
        `;
        ulElement.appendChild(li);
    });

    if (rankings.length > 0) {
        bestScoreEl.textContent = `${rankings[0].score} (${rankings[0].name})`;
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// =========================================================================
// HUD 업데이트 (단계, 방패 무적 타이머, 축소된 체력 HP 60, 점수, 드래곤 거리)
// =========================================================================
function updateHUD() {
    const stInfo = STAGE_INFO[track.stage] || STAGE_INFO[1];
    stageBadgeEl.textContent = stInfo.badge;

    if (hero.invincibleTimer > 0) {
        shieldStatusEl.textContent = `🛡️ 무적 ${ hero.invincibleTimer.toFixed(1) }초`;
    } else {
        shieldStatusEl.textContent = '';
    }

    hudPlayerNameEl.textContent = playerName || '플레이어';
    scoreEl.textContent = score;
    mathSolvedEl.textContent = mathGate.solvedCount;

    // 낮춘 체력(maxHp = 60, 장애물 1회 충돌 시 -20 감소 -> 3회 충돌 시 0 소멸!)
    const hpRatio = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
    const hpPercent = Math.ceil(hpRatio * 100);
    hpBarFillEl.style.width = `${hpPercent}%`;

    if (hpRatio <= 0.35) {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #e63946, #ff6b6b)';
    } else if (hpRatio <= 0.68) {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #f5cb42, #ffd166)';
    } else {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #2a9d8f, #52b788)';
    }
    const remainHits = Math.ceil(hero.hp / 20);
    hpBarLabelEl.textContent = `❤️ 체력 ${hero.hp}/${hero.maxHp} (남은 충돌 한도: ${remainHits}회)`;

    const dist = Math.round(dragon.distance);
    dragonFillEl.style.width = `${dist}%`;
    if (track.stage >= 6) {
        dragonLabelEl.textContent = `🏫 드래곤 따돌리기 성공! 학교 도착!`;
    } else if (dist < 35) {
        dragonLabelEl.textContent = `🔥 위험! 드래곤 거리 ${dist}m`;
    } else {
        dragonLabelEl.textContent = `🐉 드래곤과 거리 ${dist}m`;
    }
}

function setStage(newStage) {
    const clamped = Math.max(1, Math.min(6, newStage));
    if (track.stage !== clamped) {
        track.stage = clamped;
        sound.currentStage = clamped;
        const info = STAGE_INFO[clamped];
        if (clamped === 5) {
            sound.playGlitchStatic();
            bubbleEn.textContent = "BZZZT!! STAGE 5: GLITCH VOID!! WATCH OUT!!";
        } else if (clamped === 6) {
            // 5단계 클리어 -> 학교 도착 엔딩!
            gameState = 'SCHOOL_ENDING';
            schoolEndingTimer = 0;
            track.obstacles = [];
            track.items = [];
            dragon.distance = 100;
            sound.playSchoolBellAndFanfare();
            hero.triggerLookBack(4.5, 'happy');
            bubbleEn.textContent = "DING-DONG-DANG-DONG! ARRIVED AT SMILE ELEMENTARY SCHOOL!";
        } else {
            sound.playSpecialItem();
            bubbleEn.textContent = `STAGE ${clamped} UNLOCKED! KEEP RUNNING TO SCHOOL!`;
        }
        bubbleKo.textContent = info.ko;
        track.addPopup(width * 0.5, height * 0.35, `🎉 ${info.badge} 진입!`, '#f72585');
        track.addBurstParticles(width * 0.5, height * 0.4, '#ffea79', 26);
        updateHUD();
    }
}

function startWithPlayerName() {
    const inputVal = playerNameInput.value.trim();
    playerName = inputVal || '6학년 원숭이';
    localStorage.setItem('smilegames_last_player', playerName);
    startModal.classList.remove('active');

    sound.startBGM();
    startNewGame(false);
}

function startNewGame(skipPrologue = false) {
    hero.reset();
    track.reset();
    mathGate.reset();
    dragon.reset();
    sound.currentStage = 1;
    score = 0;
    gameSpeed = 1.0;
    schoolEndingTimer = 0;
    gameOverModal.classList.remove('active');
    updateHUD();

    if (skipPrologue) {
        gameState = 'PLAYING';
        hero.triggerLookBack(1.2, 'happy');
        bubbleEn.textContent = "STAGE 1: FOREST! CLIMB RAMPS, DODGE ROLLING STONES & GET SHIELD!";
        bubbleKo.textContent = STAGE_INFO[1].ko;
    } else {
        gameState = 'PROLOGUE';
        bubbleEn.textContent = "SHHH! STEALING THE ANCIENT DRAGON'S GOLDEN BANANA!";
        bubbleKo.textContent = `"쉿! ${playerName} 원숭이가 황금 바나나를 들고 학교까지 5단계를 달려간다!"`;
    }
}

function triggerGameEndModal(titleText, reasonText) {
    gameState = 'GAMEOVER';
    gameOverTitleEl.textContent = titleText;
    finalPlayerNameEl.textContent = playerName;
    finalScoreEl.textContent = score;
    finalMathEl.textContent = mathGate.solvedCount;
    document.getElementById('gameover-reason').textContent = reasonText;

    const updatedRankings = saveScoreToRanking(playerName, score, mathGate.solvedCount);
    renderRankingList(gameOverRankingListEl, updatedRankings);
    renderRankingList(startRankingListEl, updatedRankings);

    gameOverModal.classList.add('active');
}

function triggerGameOver(reasonText) {
    sound.playRoar();
    triggerGameEndModal('🐉 게임 오버!', reasonText);
}

function triggerGameClear() {
    score += 500; // 학교 도착 보너스 점수!
    triggerGameEndModal(
        '🏫 스마일 초등학교 도착 클리어! 🎓',
        '축하합니다! 1단계 숲부터 5단계 글리치 보이드까지 모두 돌파하고 학교에 무사히 등교했어요! (+500점 클리어 보너스)'
    );
}

// =========================================================================
// 입력 제어 (키보드, 터치 스와이프, UI 버튼)
// =========================================================================
function handleLeft() {
    if (gameState === 'PROLOGUE') { startNewGame(true); return; }
    if (gameState !== 'PLAYING' && gameState !== 'SCHOOL_ENDING') return;
    if (hero.changeLane(-1)) sound.playLaneMove();
}

function handleRight() {
    if (gameState === 'PROLOGUE') { startNewGame(true); return; }
    if (gameState !== 'PLAYING' && gameState !== 'SCHOOL_ENDING') return;
    if (hero.changeLane(1)) sound.playLaneMove();
}

function handleJump() {
    if (gameState === 'PROLOGUE') { startNewGame(true); return; }
    if (gameState !== 'PLAYING' && gameState !== 'SCHOOL_ENDING') return;
    if (hero.jump()) sound.playJump();
}

function handleSlide() {
    if (gameState === 'PROLOGUE') { startNewGame(true); return; }
    if (gameState !== 'PLAYING' && gameState !== 'SCHOOL_ENDING') return;
    if (hero.slide()) sound.playSlide();
}

function handleLookBack() {
    if (gameState === 'PROLOGUE') { startNewGame(true); return; }
    if (gameState !== 'PLAYING' && gameState !== 'SCHOOL_ENDING') return;
    hero.triggerLookBack(1.5, 'happy');
    bubbleKo.textContent = `"히히! ${playerName} 원숭이가 뒤를 힐끔 돌아봤어! 🍌"`;
}

window.addEventListener('keydown', (e) => {
    if (gameState === 'START_MENU') {
        if (e.key === 'Enter') startWithPlayerName();
        return;
    }
    if (gameState === 'GAMEOVER' && e.key === 'Enter') {
        startNewGame(true);
        return;
    }
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        handleLeft();
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        handleRight();
    } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
        e.preventDefault();
        handleJump();
    } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSlide();
    } else if (e.key.toLowerCase() === 'l') {
        handleLookBack();
    } else if (e.key === '1') {
        if (gameState === 'PLAYING') { hero.currentLane = -1; sound.playLaneMove(); }
    } else if (e.key === '2') {
        if (gameState === 'PLAYING') { hero.currentLane = 0; sound.playLaneMove(); }
    } else if (e.key === '3') {
        if (gameState === 'PLAYING') { hero.currentLane = 1; sound.playLaneMove(); }
    }
});

// 모바일 터치 스와이프 지원
let touchStartX = 0;
let touchStartY = 0;
window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
    if (gameState !== 'PLAYING') return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 35 || Math.abs(dy) > 35) {
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) handleLeft();
            else handleRight();
        } else {
            if (dy < 0) handleJump();
            else handleSlide();
        }
    }
}, { passive: true });

// 버튼 이벤트 연결
document.getElementById('btn-start-game').addEventListener('click', startWithPlayerName);
document.getElementById('btn-left').addEventListener('click', handleLeft);
document.getElementById('btn-right').addEventListener('click', handleRight);
document.getElementById('btn-jump').addEventListener('click', handleJump);
document.getElementById('btn-slide').addEventListener('click', handleSlide);
document.getElementById('btn-look').addEventListener('click', handleLookBack);
document.getElementById('btn-restart').addEventListener('click', () => startNewGame(true));

document.getElementById('btn-change-name').addEventListener('click', () => {
    gameOverModal.classList.remove('active');
    gameState = 'START_MENU';
    renderRankingList(startRankingListEl, getRankings());
    startModal.classList.add('active');
    playerNameInput.focus();
});

document.getElementById('btn-open-rank').addEventListener('click', () => {
    gameState = 'START_MENU';
    renderRankingList(startRankingListEl, getRankings());
    startModal.classList.add('active');
    playerNameInput.focus();
});

bgmBtn.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    bgmBtn.textContent = isMuted ? '🔇 BGM OFF' : '🎵 BGM ON';
    bgmBtn.classList.toggle('muted', isMuted);
});

renderRankingList(startRankingListEl, getRankings());

// =========================================================================
// 메인 게임 루프
// =========================================================================
let lastTime = performance.now();

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. 시작 메뉴 또는 프롤로그 컷신 상태
    if (gameState === 'START_MENU' || gameState === 'PROLOGUE') {
        if (gameState === 'PROLOGUE') {
            dragon.prologueTime += dt;
            if (dragon.prologueTime > 1.5 && dragon.prologueTime - dt <= 1.5) {
                sound.playRoar();
                bubbleEn.textContent = "ROOOAAAR!! GIVE BACK MY GOLDEN BANANA!!";
                bubbleKo.textContent = '"크아아앙! 분노한 고대 화염 드래곤이 불을 뿜으며 쫓아온다!"';
            }
            if (dragon.prologueTime >= dragon.prologueDuration) {
                startNewGame(true);
            }
        }
        dragon.renderPrologue(ctx, width, height, hero);
        return;
    }

    // 2. 학교 도착 엔딩 연출 상태 (5단계 클리어 후!)
    if (gameState === 'SCHOOL_ENDING') {
        schoolEndingTimer += dt;
        hero.update(dt, 1.0);
        track.roadOffset = (track.roadOffset + dt * 2.2) % 1;
        // 파티클 업데이트
        track.particles.forEach(pt => {
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 400 * dt;
            pt.life -= dt;
        });
        track.particles = track.particles.filter(pt => pt.life > 0);
        track.popups.forEach(p => { p.y -= 55 * dt; p.life -= dt; });
        track.popups = track.popups.filter(p => p.life > 0);

        if (schoolEndingTimer > 4.2) {
            triggerGameClear();
        }
    }

    // 3. 본 게임 플레이 업데이트
    if (gameState === 'PLAYING') {
        const stInfo = STAGE_INFO[track.stage] || STAGE_INFO[1];
        gameSpeed = stInfo.speedBase + Math.min(0.25, score / 5000);
        const effectiveSpeed = (hero.boostTimer > 0 || hero.invincibleTimer > 0) ? gameSpeed * 1.28 : gameSpeed;

        hero.update(dt, effectiveSpeed);
        dragon.update(dt);

        // 트랙 및 장애물/아이템 업데이트
        track.update(dt, effectiveSpeed, hero, mathGate.isGateApproaching(), {
            onCoin: (item) => {
                sound.playCoin();
                score += 10;
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 45, '+10 🪙', '#d64531');
                track.addBurstParticles(p.x, p.y - 30, '#f6d54a', 8);
                updateHUD();
            },
            onBananaBundle: (item) => {
                // 특별 아이템 먹는 멋있는 소리 재생!
                sound.playSpecialItem();
                score += 35;
                hero.triggerBoost(2.8);
                dragon.onPlayerSuccess(15);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 55, '황금 바나나 부스트! +35 🍌', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 30, '#ffea79', 16);
                bubbleKo.textContent = '"우와! 특별 황금 바나나 파워로 초고속 질주~!"';
                updateHUD();
            },
            onShield: (item) => {
                // 방패 아이템 획득 -> 멋있는 파워업 사운드 + 7초간 기물 완전 무적!
                sound.playSpecialItem();
                score += 25;
                hero.triggerInvincibleShield(7.0);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 60, '🛡️ 방패 무적 발동! (7초간 기물 파괴!)', '#00b4d8');
                track.addBurstParticles(p.x, p.y - 35, '#90e0ef', 22);
                bubbleEn.textContent = "SHIELD POWER-UP! INVINCIBLE TO ALL OBSTACLES FOR 7 SECONDS!";
                bubbleKo.textContent = '"멋진 방패 아이템 획득! 7초 동안 모든 장애물에 완전 무적이야!"';
                updateHUD();
            },
            onRampClimb: (obs) => {
                // 톰 골드런 스타일 경사로 위로 올라가며 질주!
                sound.playJump();
                score += 15;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 85, '경사로 위 질주! +15 🏃‍♂️', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 50, '#a8dadc', 10);
                bubbleKo.textContent = '"신난다! 톰 골드런처럼 장애물 경사로 위로 뛰어올랐어!"';
                updateHUD();
            },
            onRollingStoneSpawn: () => {
                // 움직이는 돌이 굴러올 때 돌 굴러가는 효과음 재생!
                sound.playRollingStone();
            },
            onObstacleAvoided: (obs) => {
                score += 5;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 60, '나이스 회피! +5 ✨', '#2a9d8f');
                updateHUD();
            },
            onObstacleHit: (obs) => {
                const p = track.project(obs.z, obs.lane, width, height);

                // 방패 무적 상태일 때는 기물을 부수며 보너스 점수 획득!
                if (hero.invincibleTimer > 0) {
                    sound.playSpecialItem();
                    score += 20;
                    track.addPopup(p.x, p.y - 65, '🛡️ 무적 방패 돌파! +20 💥', '#00b4d8');
                    track.addBurstParticles(p.x, p.y - 40, '#00f5d4', 18);
                    bubbleKo.textContent = '"방패 무적 파워로 장애물을 쾅! 부수고 지나갔어!"';
                    updateHUD();
                    return;
                }

                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(25);

                // 낮춘 체력(HP 60): 장애물 1회 충돌 시 -20 감소 (3번 충돌 시 0 소멸!)
                hero.hp = Math.max(0, hero.hp - 20);

                track.addPopup(p.x, p.y - 65, '쿵! 체력 -20 💥', '#e63946');
                track.addBurstParticles(p.x, p.y - 35, '#e63946', 14);
                bubbleEn.textContent = "OUCH!! HP DROPPED! SOLVE MATH GATES TO RECOVER!";
                bubbleKo.textContent = `"아야! 장애물에 부딪쳐서 체력이 줄었어! (남은 체력: ${hero.hp}/${hero.maxHp})"`;
                updateHUD();

                if (hero.hp <= 0) {
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver('장애물에 3번 충돌하여 캐릭터 체력(HP)이 모두 소진되어 사라졌어요!');
                } else if (dragon.distance <= 0) {
                    triggerGameOver('뒤쫓아온 화염 드래곤에게 붙잡혔어요!');
                }
            }
        });

        // 3개의 문 6학년 연산 게이트 업데이트
        mathGate.update(dt, effectiveSpeed, hero, track, {
            onGateSpawn: (gate) => {
                bubbleEn.textContent = `STAGE ${gate.stage} MATH GATE! SOLVE:  ${gate.questionText}`;
                bubbleKo.textContent = `"6학년 ${gate.stage}단계 문제 등장! [ ${gate.questionText} ] 정답 문으로 가면 체력이 회복되고 다음 단계로 가!"`;
            },
            onCorrectAnswer: (gate, door) => {
                sound.playCorrect();
                score += 100;
                hero.triggerBoost(2.2);
                dragon.onPlayerSuccess(22);

                // 문제를 풀 때마다 낮아진 체력 조금씩(+10) 복구!
                const prevHp = hero.hp;
                hero.hp = Math.min(hero.maxHp, hero.hp + 10);
                const healed = hero.hp - prevHp;
                if (healed > 0) sound.playHeal();

                const p = track.project(gate.z, door.lane, width, height);
                const healText = healed > 0 ? ` +체력 회복💚` : '';
                track.addPopup(p.x, p.y - 95, `정답! +100점${healText} 🎉`, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 70, '#52b788', 18);
                bubbleEn.textContent = `BINGO! ${gate.questionText.replace('?', gate.answer)} IS CORRECT!`;
                bubbleKo.textContent = `"정답이야! 문이 활짝 열리며 +100점 & 체력이 조금 복구됐어!"`;

                // 2문제 풀 때마다 다음 스테이지로 진급! (총 10문제 풀면 5단계 클리어 -> 6단계 학교 도착!)
                const nextStage = Math.min(6, Math.floor(mathGate.solvedCount / 2) + 1);
                if (nextStage > track.stage) {
                    setStage(nextStage);
                } else {
                    updateHUD();
                }
            },
            onWrongAnswer: (gate, door) => {
                const p = track.project(gate.z, door.lane, width, height);
                if (hero.invincibleTimer > 0) {
                    sound.playSpecialItem();
                    track.addPopup(p.x, p.y - 95, `오답(${door.value})! 무적 방패로 방어 🛡️`, '#00b4d8');
                    bubbleKo.textContent = `"앗, 정답은 ${gate.answer}인데 무적 방패가 대신 막아줬어!"`;
                    return;
                }
                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(26);
                hero.hp = Math.max(0, hero.hp - 20);

                track.addPopup(p.x, p.y - 95, `땡! 문 안 열림! 체력 -20 (정답:${gate.answer}) 💥`, '#e63946');
                track.addBurstParticles(p.x, p.y - 70, '#e63946', 14);
                bubbleEn.textContent = `BONK!! THE DOOR STAYED LOCKED! (ANSWER: ${gate.answer})`;
                bubbleKo.textContent = `"쿵! 틀려서 문이 안 열렸어! 정답은 ${gate.answer}! 체력이 감소했어!"`;
                updateHUD();

                if (hero.hp <= 0) {
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver(`문이 열리지 않고 충돌해 캐릭터 체력이 0이 되어 사라졌어요! (정답: ${gate.answer})`);
                } else if (dragon.distance <= 0) {
                    triggerGameOver(`계산 문제의 문이 열리지 않아 드래곤에게 붙잡혔어요! (정답: ${gate.answer})`);
                }
            }
        });

        updateHUD();
    }

    // 4. 화면 렌더링
    ctx.save();
    const shake = dragon.getScreenShakeOffset();
    ctx.translate(shake.x, shake.y);

    // (A) 단계별 배경(1:숲, 2:사막, 3:해저, 4:도시 타임스퀘어, 5:글리치 보이드, 6:학교 도착) 및 3레인 트랙
    track.renderBackgroundAndRoad(ctx, width, height, hero.time);

    // (B) 원숭이보다 앞쪽(지평선 방향, z <= 0.88)에 있는 장애물, 경사로, 굴러오는 돌, 방패 아이템, 수학의 문 렌더링
    track.renderEntities(ctx, width, height, hero.time, 0, 0.88);
    if (mathGate.activeGate && mathGate.activeGate.z <= 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    // (C) 주인공 스누피 원숭이 렌더링 (사이즈 절반 축소 + 경사로 등반 높이 및 무적 방패 오라 반영)
    if (hero.hp > 0) {
        const charScale = (Math.min(width, height) / 940) * 0.50;
        const roadBottomW = Math.min(width * 0.86, 860);
        const lanePixelSpread = (roadBottomW * 0.285) / charScale;
        hero.render(ctx, width * 0.5, height * 0.84, charScale, lanePixelSpread);
    }

    // (D) 원숭이를 막 지나친(z > 0.88) 장애물/문 렌더링
    track.renderEntities(ctx, width, height, hero.time, 0.88, 1.2);
    if (mathGate.activeGate && mathGate.activeGate.z > 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    // (E) 파티클 및 점수 팝업
    track.renderEffects(ctx, width, height);

    // (F) 플레이어 등 뒤에서 불을 뿜으며 쫓아오는 고대 화염 드래곤 (학교 도착 시에는 사라짐)
    if (track.stage < 6) {
        dragon.renderInGameChase(ctx, width, height);
    }

    ctx.restore();
}

updateHUD();
requestAnimationFrame(gameLoop);
