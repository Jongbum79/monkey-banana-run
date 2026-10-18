/**
 * Smile Games - 원숭이의 바나나 런
 * [피드백 완벽 반영 메인 엔진]
 * 개발자: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 최신 반영 사항:
 * 1. 데미지 대폭 강화(충돌 시 체력 -30, 오답 시 -35) & 무적 방패 스폰율 축소 + 지속시간 3.2초로 단축!
 * 2. 신규 아이템 2종 추가:
 *    - 🚀 슈퍼점프 (5초): 5초 동안 초고도 점프로 높은 아치/기둥까지 뛰어넘음!
 *    - 👑 손오공 진화 (체력 올리기): 최대 체력 +30 증가 & 체력 +45 회복 + 긴고아/여의봉/근두운 장착!
 * 3. 스테이지별 전용 돌진 위협 기물 & 전용 효과음:
 *    - 1단계(숲): 울퉁불퉁한 진짜 바위 돌 (우르르 돌 굴러가는 소리)
 *    - 2단계(사막): 독침을 세운 거대 전갈 (집게발 위협음)
 *    - 3단계(해저): 이빨을 드러낸 백상아리 상어 (물살 가르는 상어 위협음)
 *    - 4단계(도시): 헤드라이트를 켜고 달려오는 자동차/택시 (빵빵! 클락션 경적음)
 *    - 5단계(글리치 보이드): 글리치 해골 큐브 (치지직 노이즈 사운드)
 * 4. 단계가 올라갈수록 속도 대폭 가속 & 초대형 상단 문제 칠판으로 가독성 완벽 해결!
 * 5. 신나면서도 가볍지 않은 웅장한 D단조 액션 어드벤처 BGM 적용!
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
    1: {
        badge: '🌲 1단계: 동물들의 숲',
        bannerTitle: '🌲 STAGE 1 : 동물들의 숲',
        bannerSub: '🪨 굴러오는 진짜 바위를 피하고 손오공으로 진화하세요!',
        color: '#52b788',
        speedBase: 0.90,
        ko: '"1단계 숲속! 굴러오는 진짜 바위를 피하고 손오공 진화 & 슈퍼점프를 먹어봐!"'
    },
    2: {
        badge: '🏜️ 2단계: 황금 사막',
        bannerTitle: '🏜️ STAGE 2 : 황금 사막',
        bannerSub: '🦂 집게발을 세우고 달려오는 사막 독침 전갈을 조심하세요!',
        color: '#ffbe0b',
        speedBase: 1.00,
        ko: '"2단계 사막 진입! 달려오는 독침 전갈을 조심해!"'
    },
    3: {
        badge: '🍍 3단계: 비키니 해저 시티',
        bannerTitle: '🍍 STAGE 3 : 스폰지밥 해저 시티',
        bannerSub: '🌺 꽃구름과 파인애플 하우스 바다! 돌진하는 백상아리를 피하세요!',
        color: '#00b4d8',
        speedBase: 1.10,
        ko: '"3단계 스폰지밥 비키니 해저 시티! 파인애플 집과 모아이 석상 사이로 백상아리를 피해!"'
    },
    4: {
        badge: '🌃 4단계: 도시 타임스퀘어 밤',
        bannerTitle: '🌃 STAGE 4 : 타임스퀘어 밤',
        bannerSub: '🚕 헤드라이트를 켜고 빵빵~ 달려오는 택시 자동차를 피하세요!',
        color: '#ff007f',
        speedBase: 1.22,
        ko: '"4단계 타임스퀘어 밤! 빵빵~ 헤드라이트를 켜고 달려오는 자동차를 피해!"'
    },
    5: {
        badge: '⚡ 5단계: 글리치 보이드 (FINAL)',
        bannerTitle: '⚡ STAGE 5 : 글리치 보이드',
        bannerSub: '👾 치지직... 마지막 관문! 여길 돌파하면 학교에 도착합니다!',
        color: '#00f5d4',
        speedBase: 1.35,
        ko: '"치지직... 마지막 5단계 글리치 보이드! 여길 넘으면 학교에 도착해!"'
    },
    6: {
        badge: '🏫 엔딩: 스마일 초등학교 도착!',
        bannerTitle: '🏫 스마일 초등학교 도착!',
        bannerSub: '🎓 축하합니다! 5단계를 모두 통과하고 6학년 교실에 도착했어요!',
        color: '#ffd166',
        speedBase: 0.90,
        ko: '"딩동댕동~ 드디어 6학년 교실이 있는 학교에 무사히 도착했어! 축하해!"'
    }
};

// =========================================================================
// 🏆 랭킹 시스템
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
// HUD 업데이트
// =========================================================================
function updateHUD() {
    const stInfo = STAGE_INFO[track.stage] || STAGE_INFO[1];
    stageBadgeEl.textContent = stInfo.badge;

    const statusParts = [];
    if (hero.isWukong) statusParts.push(`👑손오공 Lv.${hero.wukongLevel}`);
    if (hero.invincibleTimer > 0) statusParts.push(`🛡️${hero.invincibleTimer.toFixed(1)}s`);
    if (hero.superJumpTimer > 0) statusParts.push(`🚀${hero.superJumpTimer.toFixed(1)}s`);
    if (hero.laserGunTimer > 0) statusParts.push(`🔫레이저 ${hero.laserGunTimer.toFixed(1)}s`);
    shieldStatusEl.textContent = statusParts.join(' ');

    hudPlayerNameEl.textContent = playerName || '플레이어';
    scoreEl.textContent = score;
    mathSolvedEl.textContent = mathGate.solvedCount;

    const hpRatio = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
    const hpPercent = Math.ceil(hpRatio * 100);
    hpBarFillEl.style.width = `${hpPercent}%`;

    if (hpRatio <= 0.30) {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #e63946, #ff6b6b)';
    } else if (hpRatio <= 0.60) {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #f5cb42, #ffd166)';
    } else {
        hpBarFillEl.style.background = 'linear-gradient(90deg, #2a9d8f, #52b788)';
    }
    const wukongPrefix = hero.isWukong ? '👑손오공 ' : '❤️ ';
    hpBarLabelEl.textContent = `${wukongPrefix}HP ${hero.hp} / ${hero.maxHp} (기물 충돌 -25)`;

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
            bubbleEn.textContent = "BZZZT!! STAGE 5: GLITCH VOID!! 3 SECONDS REST BEFORE START!";
        } else if (clamped === 6) {
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
            bubbleEn.textContent = `STAGE ${clamped} UNLOCKED! 3 SECONDS REST THEN GO!`;
        }
        bubbleKo.textContent = info.ko;
        // 스테이지가 넘어갈 때 상단 컴팩트 배너를 띄우고 3초 동안 기물 없이 쉬고 시작!
        track.triggerStageBanner(info.bannerTitle, info.bannerSub, info.color, clamped < 6);
        track.addBurstParticles(width * 0.5, height * 0.25, '#ffea79', 26);
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
    gameSpeed = 0.90;
    schoolEndingTimer = 0;
    gameOverModal.classList.remove('active');
    updateHUD();

    if (skipPrologue) {
        gameState = 'PLAYING';
        hero.triggerLookBack(1.2, 'happy');
        const st1 = STAGE_INFO[1];
        track.triggerStageBanner(st1.bannerTitle, st1.bannerSub, st1.color);
        bubbleEn.textContent = "STAGE 1: FOREST! DODGE BOULDERS, GET SUPER JUMP & WUKONG EVOLUTION!";
        bubbleKo.textContent = st1.ko;
    } else {
        gameState = 'PROLOGUE';
        bubbleEn.textContent = "SHHH! STEALING THE GOLDEN BANANA FROM SMILE ELEMENTARY SCHOOL!";
        bubbleKo.textContent = `"쉿! ${playerName} 원숭이가 스마일 초등학교에서 드래곤의 황금 바나나를 뺏어 도망간다!"`;
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
    score += 500;
    triggerGameEndModal(
        '🏫 스마일 초등학교 도착 클리어! 🎓',
        '축하합니다! 1단계 숲부터 5단계 글리치 보이드까지 모두 돌파하고 학교에 무사히 등교했어요! (+500점 클리어 보너스)'
    );
}

// =========================================================================
// 입력 제어
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
    if (hero.jump()) sound.playJump(hero.superJumpTimer > 0);
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

    // 2. 학교 도착 엔딩 연출 상태
    if (gameState === 'SCHOOL_ENDING') {
        schoolEndingTimer += dt;
        hero.update(dt, 1.0);
        track.scrollDist += dt * 0.4;
        if (track.stageBanner) {
            track.stageBanner.elapsed += dt;
            if (track.stageBanner.elapsed >= track.stageBanner.duration) {
                track.stageBanner = null;
            }
        }
        if (schoolEndingTimer > 4.2) {
            triggerGameClear();
        }
    }

    // 3. 본 게임 플레이 업데이트
    if (gameState === 'PLAYING') {
        const stInfo = STAGE_INFO[track.stage] || STAGE_INFO[1];
        // 최고 속도를 30% 낮추어 후반 스테이지에서도 쾌적한 조작 보장!
        gameSpeed = stInfo.speedBase + Math.min(0.14, score / 7000);
        const effectiveSpeed = (hero.boostTimer > 0 || hero.invincibleTimer > 0) ? gameSpeed * 1.15 : gameSpeed;

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
                sound.playSpecialItem();
                score += 35;
                hero.triggerBoost(1.5);
                dragon.onPlayerSuccess(15);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 55, '황금 바나나 부스트 (1.5초)! +35 🍌', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 30, '#ffea79', 16);
                bubbleKo.textContent = '"우와! 특별 황금 바나나 파워로 1.5초 초고속 질주~!"';
                updateHUD();
            },
            onShield: (item) => {
                // 🛡️ 무적 방패: 지속시간을 1.8초로 대폭 단축하고 스폰율을 낮춰 긴장감 극대화!
                sound.playSpecialItem();
                score += 25;
                hero.triggerInvincibleShield(1.8);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 60, '🛡️ 방패 무적 (1.8초)!', '#00b4d8');
                track.addBurstParticles(p.x, p.y - 35, '#90e0ef', 20);
                bubbleEn.textContent = "SHIELD POWER-UP! INVINCIBLE FOR 1.8 SECONDS!";
                bubbleKo.textContent = '"방패 아이템 획득! 1.8초 동안 기물에 무적이야!"';
                updateHUD();
            },
            onSuperJump: (item) => {
                // 🚀 슈퍼점프: 지속시간 2.5초로 단축!
                sound.playSpecialItem();
                score += 30;
                hero.triggerSuperJump(2.5);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 65, '🚀 슈퍼점프 (2.5초)! +30', '#06d6a0');
                track.addBurstParticles(p.x, p.y - 35, '#00f5d4', 22);
                bubbleEn.textContent = "SUPER JUMP ACTIVATED FOR 2.5 SECONDS!";
                bubbleKo.textContent = '"🚀 슈퍼점프 2.5초 발동! 지금 점프하면 높이 날아올라!"';
                updateHUD();
            },
            onWukong: (item) => {
                // 👑 손오공 진화 (체력 대폭 올리기 + 근두운/여의봉/긴고아 장착)!
                sound.playWukongEvolution();
                score += 50;
                hero.triggerWukongEvolution();
                dragon.onPlayerSuccess(18);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 75, `👑 손오공 진화! 최대체력 UP (${hero.hp}/${hero.maxHp})`, '#ffbe0b');
                track.addBurstParticles(p.x, p.y - 40, '#ffbe0b', 28);
                bubbleEn.textContent = "SUN WUKONG EVOLUTION!! MAX HP INCREASED & NIMBUS CLOUD SUMMONED!";
                bubbleKo.textContent = `"👑 제천대성 손오공 진화! 최대 체력이 ${hero.maxHp}으로 오르고 체력이 대폭 회복됐어!"`;
                updateHUD();
            },
            onLaserGun: (item) => {
                // 🔫 신규 특별 아이템: 레이저총 (4초 동안 유저가 있는 레인의 기물을 모두 자동 파괴!)
                sound.playLaserGun();
                score += 40;
                hero.triggerLaserGun(4.0);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 75, '🔫 플라즈마 레이저총 발동(4초)! +40', '#ff006e');
                track.addBurstParticles(p.x, p.y - 40, '#ff006e', 24);
                bubbleEn.textContent = "PLASMA LASER GUN!! VAPORIZING ALL OBSTACLES IN YOUR LANE FOR 4 SECONDS!";
                bubbleKo.textContent = '"🔫 레이저총 장착! 4초 동안 내가 달리는 레인의 기물을 레이저로 싹 없애버려!"';
                updateHUD();
            },
            onLaserDestroy: (obs) => {
                // ⚡ 레이저 빔이 현재 레인의 기물을 명중시켜 증발시켰을 때!
                sound.playLaserZap();
                score += 25;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 70, '⚡ 레이저 기물 증발! +25', '#00f5d4');
                track.addBurstParticles(p.x, p.y - 40, '#ff006e', 16);
                track.addBurstParticles(p.x, p.y - 40, '#00f5d4', 12);
                updateHUD();
            },
            onRampClimb: (obs) => {
                sound.playJump(false);
                score += 18;
                const p = track.project(obs.z, obs.lane, width, height);
                const label = obs.type === 'climb_truck' ? '🚛 트럭 지붕 위 질주! +18' : '⏫ 경사로 위 질주! +18';
                track.addPopup(p.x, p.y - 95, label, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 50, '#a8dadc', 12);
                updateHUD();
            },
            onChaserSpawn: (chaserType) => {
                // 스테이지별 전용 돌진 위협 기물 효과음 재생!
                if (chaserType === 'rolling_stone') sound.playRollingStone();
                else if (chaserType === 'desert_scorpion') sound.playScorpionSound();
                else if (chaserType === 'undersea_shark') sound.playSharkSound();
                else if (chaserType === 'city_car') sound.playCarHorn();
                else if (chaserType === 'glitch_hazard') sound.playGlitchStatic(0.16, 0.08);
            },
            onObstacleAvoided: (obs) => {
                score += 5;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 60, '나이스 회피! +5 ✨', '#2a9d8f');
                updateHUD();
            },
            onObstacleHit: (obs) => {
                const p = track.project(obs.z, obs.lane, width, height);

                if (hero.invincibleTimer > 0) {
                    sound.playSpecialItem();
                    score += 20;
                    track.addPopup(p.x, p.y - 65, '🛡️ 무적 방패 돌파! +20 💥', '#00b4d8');
                    track.addBurstParticles(p.x, p.y - 40, '#00f5d4', 18);
                    updateHUD();
                    return;
                }

                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(25);

                // 체력 100 기준 명확한 데미지: 기물 1회 충돌 시 HP -25 감소!
                const dmg = 25;
                hero.hp = Math.max(0, hero.hp - dmg);

                track.addPopup(p.x, p.y - 65, `쾅!! 기물 충돌 HP -${dmg} (남은 HP: ${hero.hp}/${hero.maxHp}) 💥`, '#e63946');
                track.addBurstParticles(p.x, p.y - 35, '#e63946', 18);
                bubbleEn.textContent = `HIT!! -${dmg} HP! (HP: ${hero.hp}/${hero.maxHp}) DODGE OR JUMP!`;
                bubbleKo.textContent = `"으악! 기물에 부딪혀서 HP가 -${dmg} 깎였어! (현재 HP: ${hero.hp}/${hero.maxHp})"`;
                updateHUD();

                if (hero.hp <= 0) {
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver('기물 충돌 데미지로 캐릭터 체력(HP 100)이 모두 소진되어 사라졌어요!');
                } else if (dragon.distance <= 0) {
                    triggerGameOver('뒤쫓아온 화염 드래곤에게 붙잡혔어요!');
                }
            }
        });

        // 3개의 문 6학년 연산 게이트 업데이트
        mathGate.update(dt, effectiveSpeed, hero, track, {
            onGateSpawn: (gate) => {
                bubbleEn.textContent = `STAGE ${gate.stage} MATH GATE! SOLVE:  ${gate.questionText}`;
                bubbleKo.textContent = `"화면 위 칠판을 봐! [ ${gate.questionText} ] 정답 문으로 가면 체력이 회복돼!"`;
            },
            onCorrectAnswer: (gate, door) => {
                sound.playCorrect();
                score += 100;
                hero.triggerBoost(2.2);
                dragon.onPlayerSuccess(22);

                const prevHp = hero.hp;
                hero.hp = Math.min(hero.maxHp, hero.hp + 20);
                const healed = hero.hp - prevHp;
                if (healed > 0) sound.playHeal();

                const p = track.project(gate.z, door.lane, width, height);
                const healText = healed > 0 ? ` +HP ${healed} 회복💚` : '';
                track.addPopup(p.x, p.y - 95, `정답! +100점${healText} 🎉`, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 70, '#52b788', 18);
                bubbleEn.textContent = `BINGO! ${gate.questionText.replace('?', gate.answer)} IS CORRECT!`;
                bubbleKo.textContent = `"정답이야! 문이 즉시 사라지며 +100점 & HP가 ${hero.hp}/${hero.maxHp}로 복구됐어!"`;

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
                dragon.onPlayerMistake(30);

                // 오답 문 충돌 시 체력 -30 감소!
                const wrongDmg = 30;
                hero.hp = Math.max(0, hero.hp - wrongDmg);

                track.addPopup(p.x, p.y - 95, `땡! 오답 충돌! HP -${wrongDmg} (정답:${gate.answer}) 💥`, '#e63946');
                track.addBurstParticles(p.x, p.y - 70, '#e63946', 18);
                bubbleEn.textContent = `BONK!! THE DOOR STAYED LOCKED! (ANSWER: ${gate.answer})`;
                bubbleKo.textContent = `"쿵! 틀려서 문이 안 열렸어! 정답은 ${gate.answer}! HP가 -${wrongDmg} 감소했어!"`;
                updateHUD();

                if (hero.hp <= 0) {
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver(`문이 열리지 않고 충돌해 캐릭터 체력(HP 100)이 0이 되어 사라졌어요! (정답: ${gate.answer})`);
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

    track.renderBackgroundAndRoad(ctx, width, height, hero.time);

    track.renderEntities(ctx, width, height, hero.time, 0, 0.88);
    if (mathGate.activeGate && mathGate.activeGate.z <= 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    if (hero.hp > 0) {
        // 원숭이를 조금 더 작게 축소(0.36)하여 시야와 히트박스가 훨씬 명확하게 보이도록 조정!
        const charScale = (Math.min(width, height) / 940) * 0.36;
        const roadBottomW = Math.min(width * 0.86, 860);
        const lanePixelSpread = (roadBottomW * 0.285) / charScale;
        hero.render(ctx, width * 0.5, height * 0.84, charScale, lanePixelSpread);
    }

    track.renderEntities(ctx, width, height, hero.time, 0.88, 1.2);
    if (mathGate.activeGate && mathGate.activeGate.z > 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    track.renderEffects(ctx, width, height);

    if (track.stage < 6) {
        dragon.renderInGameChase(ctx, width, height);
    }

    ctx.restore();
}

updateHUD();
requestAnimationFrame(gameLoop);
