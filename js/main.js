/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 1 ~ Step 4 통합 + 피드백 5종 완벽 반영 메인 엔진]
 * 개발자: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 반영 사항:
 * 1. 고밀도 디테일의 고대 화염 드래곤 추격 & 프롤로그 연출
 * 2. 주인공 원숭이 사이즈 절반(50%) 축소 -> 전방 장애물 및 3개의 문 계산 문제 시야 완벽 확보!
 * 3. 밝고 흥미진진한 어드벤처 BGM 자동 재생 및 ON/OFF 토글
 * 4. 시작 시 플레이어 이름 입력 & Top 10 명예의 전당 랭킹 시스템
 * 5. 캐릭터 HP 게이지: 장애물 3번 충돌 시 HP 0이 되어 완전 소멸! 계산 문제를 풀 때마다 조금씩(+15%) 복구!
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI 요소 참조
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

let gameState = 'START_MENU'; // 'START_MENU' | 'PROLOGUE' | 'PLAYING' | 'GAMEOVER'
let playerName = localStorage.getItem('smilegames_last_player') || '';
let score = 0;
let gameSpeed = 1.0;
let obstacleHitCount = 0;

if (playerName) {
    playerNameInput.value = playerName;
}

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
    // 초기 기본 개발팀 랭킹 데이터
    const defaultRankings = [
        { name: '최지훈', score: 650, math: 5 },
        { name: '박주아', score: 540, math: 4 },
        { name: '김이수', score: 480, math: 4 },
        { name: '최우영', score: 410, math: 3 },
        { name: '전준우', score: 350, math: 3 }
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
// HUD 업데이트 (HP 바, 점수, 드래곤 거리)
// =========================================================================
function updateHUD() {
    hudPlayerNameEl.textContent = playerName || '플레이어';
    scoreEl.textContent = score;
    mathSolvedEl.textContent = mathGate.solvedCount;

    // HP 비율 계산 (maxHp = 99, 장애물 1회 충돌 시 -33 감소 -> 3회 충돌 시 0% 소멸!)
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
    const remainHits = Math.ceil(hero.hp / 33);
    hpBarLabelEl.textContent = `❤️ HP ${hpPercent}% (남은 충돌 한도: ${remainHits}회)`;

    const dist = Math.round(dragon.distance);
    dragonFillEl.style.width = `${dist}%`;
    if (dist < 35) {
        dragonLabelEl.textContent = `🔥 위험! 드래곤 거리 ${dist}m`;
    } else {
        dragonLabelEl.textContent = `🐉 드래곤과 거리 ${dist}m`;
    }
}

function startWithPlayerName() {
    const inputVal = playerNameInput.value.trim();
    playerName = inputVal || '용감한 원숭이';
    localStorage.setItem('smilegames_last_player', playerName);
    startModal.classList.remove('active');

    // 밝고 흥미진진한 어드벤처 BGM 시작!
    sound.startBGM();
    startNewGame(false);
}

function startNewGame(skipPrologue = false) {
    hero.reset();
    track.reset();
    mathGate.reset();
    dragon.reset();
    score = 0;
    obstacleHitCount = 0;
    gameSpeed = 1.0;
    gameOverModal.classList.remove('active');
    updateHUD();

    if (skipPrologue) {
        gameState = 'PLAYING';
        hero.triggerLookBack(1.2, 'happy');
        bubbleEn.textContent = "HEHE! MY BANANA! WONDER IF CHARLIE BROWN IS WATCHING?";
        bubbleKo.textContent = `"출발! ${playerName}님, 장애물을 피하고 3개의 문 계산 문제를 풀어보세요!"`;
    } else {
        gameState = 'PROLOGUE';
        bubbleEn.textContent = "SHHH! STEALING THE ANCIENT DRAGON'S GOLDEN BANANA!";
        bubbleKo.textContent = `"쉿! ${playerName} 원숭이가 잠든 고대 드래곤의 황금 바나나를 훔쳤다!"`;
    }
}

function triggerGameOver(reasonText) {
    gameState = 'GAMEOVER';
    sound.playRoar();

    finalPlayerNameEl.textContent = playerName;
    finalScoreEl.textContent = score;
    finalMathEl.textContent = mathGate.solvedCount;
    document.getElementById('gameover-reason').textContent = reasonText;

    // 랭킹 저장 및 갱신
    const updatedRankings = saveScoreToRanking(playerName, score, mathGate.solvedCount);
    renderRankingList(gameOverRankingListEl, updatedRankings);
    renderRankingList(startRankingListEl, updatedRankings);

    gameOverModal.classList.add('active');
}

// =========================================================================
// 입력 제어 (키보드, 터치 스와이프, UI 버튼)
// =========================================================================
function handleLeft() {
    if (gameState === 'PROLOGUE') {
        startNewGame(true);
        return;
    }
    if (gameState !== 'PLAYING') return;
    if (hero.changeLane(-1)) sound.playLaneMove();
}

function handleRight() {
    if (gameState === 'PROLOGUE') {
        startNewGame(true);
        return;
    }
    if (gameState !== 'PLAYING') return;
    if (hero.changeLane(1)) sound.playLaneMove();
}

function handleJump() {
    if (gameState === 'PROLOGUE') {
        startNewGame(true);
        return;
    }
    if (gameState !== 'PLAYING') return;
    if (hero.jump()) sound.playJump();
}

function handleSlide() {
    if (gameState === 'PROLOGUE') {
        startNewGame(true);
        return;
    }
    if (gameState !== 'PLAYING') return;
    if (hero.slide()) sound.playSlide();
}

function handleLookBack() {
    if (gameState === 'PROLOGUE') {
        startNewGame(true);
        return;
    }
    if (gameState !== 'PLAYING') return;
    hero.triggerLookBack(1.5, 'happy');
    bubbleKo.textContent = `"히히! ${playerName} 원숭이가 뒤를 힐끔 돌아봤어! 🍌"`;
}

window.addEventListener('keydown', (e) => {
    if (gameState === 'START_MENU') {
        if (e.key === 'Enter') {
            startWithPlayerName();
        }
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

// 초기 랭킹 보드 렌더링
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

    // 2. 본 게임 플레이 업데이트
    if (gameState === 'PLAYING') {
        gameSpeed = Math.min(1.65, 1.0 + score / 2600);
        const effectiveSpeed = hero.boostTimer > 0 ? gameSpeed * 1.35 : gameSpeed;

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
                sound.playCorrect();
                score += 30;
                hero.triggerBoost(2.5);
                dragon.onPlayerSuccess(15);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 55, '바나나 부스트! +30 🍌', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 30, '#ffea79', 14);
                bubbleKo.textContent = '"우와! 황금 바나나 파워로 초고속 질주~!"';
                updateHUD();
            },
            onShield: (item) => {
                sound.playCoin();
                hero.shieldActive = true;
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 55, '보호막 장착! 🛡️', '#4ea8de');
                bubbleKo.textContent = '"든든한 보호막 장착! 장애물 1번은 막아준다!"';
            },
            onObstacleAvoided: (obs) => {
                score += 5;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 60, '나이스 회피! +5 ✨', '#2a9d8f');
                updateHUD();
            },
            onObstacleHit: (obs) => {
                const p = track.project(obs.z, obs.lane, width, height);
                if (hero.shieldActive) {
                    hero.shieldActive = false;
                    sound.playCoin();
                    track.addPopup(p.x, p.y - 60, '보호막 방어! 🛡️', '#4ea8de');
                    bubbleKo.textContent = '"휴~ 보호막 덕분에 HP가 깎이지 않았어!"';
                    return;
                }
                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(26);

                // 장애물 1회 충돌 시 HP 33 감소 (3번 충돌하면 99 -> 66 -> 33 -> 0 완전 소멸!)
                obstacleHitCount++;
                hero.hp = Math.max(0, hero.hp - 33);

                track.addPopup(p.x, p.y - 65, '쿵! HP -33% 💥', '#e63946');
                track.addBurstParticles(p.x, p.y - 35, '#e63946', 14);
                bubbleEn.textContent = "OUCH!! HP DROPPED! 3 HITS AND YOU'RE OUT!";
                bubbleKo.textContent = `"아야! 장애물에 부딪쳐서 HP가 줄었어! (계산 문제를 풀면 조금씩 회복돼!)"`;
                updateHUD();

                if (hero.hp <= 0) {
                    // HP가 0이 되면 캐릭터가 펑! 소멸하는 이펙트 후 게임오버
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver('장애물에 3번 충돌하여 캐릭터 HP가 모두 소진되어 사라졌어요!');
                } else if (dragon.distance <= 0) {
                    triggerGameOver('뒤쫓아온 화염 드래곤에게 붙잡혔어요!');
                }
            }
        });

        // 3개의 문 연산 게이트 업데이트
        mathGate.update(dt, effectiveSpeed, hero, track, {
            onGateSpawn: (gate) => {
                bubbleEn.textContent = `MATH GATE AHEAD! SOLVE:  ${gate.questionText}`;
                bubbleKo.textContent = `"앞에 3개의 문이 나타났어! [ ${gate.questionText} ] 정답 문으로 가면 HP가 회복돼!"`;
            },
            onCorrectAnswer: (gate, door) => {
                sound.playCorrect();
                score += 100;
                hero.triggerBoost(2.2);
                dragon.onPlayerSuccess(22);

                // 문제를 풀 때마다 HP 조금씩(+15, 약 15%) 복구!
                const prevHp = hero.hp;
                hero.hp = Math.min(hero.maxHp, hero.hp + 15);
                const healed = hero.hp - prevHp;
                if (healed > 0) sound.playHeal();

                const p = track.project(gate.z, door.lane, width, height);
                const healText = healed > 0 ? ` +HP 회복💚` : '';
                track.addPopup(p.x, p.y - 95, `정답! +100점${healText} 🎉`, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 70, '#52b788', 18);
                bubbleEn.textContent = `BINGO! ${gate.questionText.replace('?', gate.answer)} IS CORRECT! (+HP HEALED)`;
                bubbleKo.textContent = `"정답이야! 문이 활짝 열리며 +100점 & 체력(HP)이 조금 복구됐어!"`;
                updateHUD();
            },
            onWrongAnswer: (gate, door) => {
                const p = track.project(gate.z, door.lane, width, height);
                if (hero.shieldActive) {
                    hero.shieldActive = false;
                    sound.playHit();
                    track.addPopup(p.x, p.y - 95, `오답(${door.value})! 보호막 소모 🛡️`, '#4ea8de');
                    bubbleKo.textContent = `"앗, 정답은 ${gate.answer}인데! 보호막이 대신 막아줬어!"`;
                    return;
                }
                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(28);
                hero.hp = Math.max(0, hero.hp - 33);

                track.addPopup(p.x, p.y - 95, `땡! 문 안 열림! HP -33% (정답:${gate.answer}) 💥`, '#e63946');
                track.addBurstParticles(p.x, p.y - 70, '#e63946', 14);
                bubbleEn.textContent = `BONK!! THE DOOR STAYED LOCKED! (ANSWER: ${gate.answer})`;
                bubbleKo.textContent = `"쿵! 틀려서 문이 안 열렸어! 정답은 ${gate.answer}! HP가 감소했어!"`;
                updateHUD();

                if (hero.hp <= 0) {
                    track.addBurstParticles(p.x, height * 0.80, '#fffcf5', 28);
                    triggerGameOver(`문이 열리지 않고 충돌해 캐릭터 HP가 0이 되어 사라졌어요! (정답: ${gate.answer})`);
                } else if (dragon.distance <= 0) {
                    triggerGameOver(`계산 문제의 문이 열리지 않아 드래곤에게 붙잡혔어요! (정답: ${gate.answer})`);
                }
            }
        });

        updateHUD();
    }

    // 3. 화면 렌더링
    ctx.save();
    const shake = dragon.getScreenShakeOffset();
    ctx.translate(shake.x, shake.y);

    // (A) 배경 하늘, 폭포, 고대 사원, 3레인 돌길 트랙
    track.renderBackgroundAndRoad(ctx, width, height, hero.time);

    // (B) 원숭이보다 앞쪽(지평선 방향, z <= 0.88)에 있는 장애물, 코인, 수학의 문 렌더링
    track.renderEntities(ctx, width, height, hero.time, 0, 0.88);
    if (mathGate.activeGate && mathGate.activeGate.z <= 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    // (C) 주인공 스누피 원숭이 렌더링
    //     [요구사항 2 & 5 반영]:
    //     - 캐릭터 사이즈를 기존의 절반(0.5배)으로 축소하여 다가오는 장애물과 계산 문제가 한눈에 보이게 함!
    //     - HP가 0이 되면 캐릭터가 완전히 사라짐(렌더링 생략)!
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

    // (F) 플레이어 등 뒤(화면 하단)에서 불을 뿜으며 쫓아오는 고대 화염 드래곤 연출!
    dragon.renderInGameChase(ctx, width, height);

    ctx.restore();
}

updateHUD();
requestAnimationFrame(gameLoop);
