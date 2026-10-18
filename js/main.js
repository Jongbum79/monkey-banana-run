/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 1 ~ Step 4 통합 메인 게임 엔진]
 * 개발자: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 흐름:
 * 1. 프롤로그(PROLOGUE): 잠자고 있는 드래곤의 황금 바나나를 훔쳐 달아나는 원숭이 인트로 컷신
 * 2. 본 게임(PLAYING):
 *    - 원숭이가 기본 뒷모습으로 트랙을 달리며 가끔 뒤를 힐끔 돌아봄 (L키 또는 자동)
 *    - 장애물(통나무 점프, 사원 아치 슬라이딩, 기둥 좌우 이동) 회피 및 코인/파워업 수집
 *    - 주기적으로 출제되는 3개의 문 연산 문제: 정답이면 문이 열리고 +100점, 틀리면 문에 쿵 부딪힘!
 *    - 뒤쫓아오는 드래곤의 화염 위협과 화면 진동 연출
 * 3. 게임 오버(GAMEOVER): 최고 점수 기록 저장 및 재도전
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI 요소 참조
const scoreEl = document.getElementById('score-val');
const bestScoreEl = document.getElementById('best-score-val');
const heartsEl = document.getElementById('hearts-val');
const mathSolvedEl = document.getElementById('math-solved-val');
const dragonFillEl = document.getElementById('dragon-meter-fill');
const dragonLabelEl = document.getElementById('dragon-meter-label');
const bubbleEn = document.getElementById('bubble-en');
const bubbleKo = document.getElementById('bubble-ko');
const gameOverModal = document.getElementById('gameover-modal');
const finalScoreEl = document.getElementById('final-score');
const finalMathEl = document.getElementById('final-math');

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

let gameState = 'PROLOGUE'; // 'PROLOGUE' | 'PLAYING' | 'GAMEOVER'
let score = 0;
let bestScore = parseInt(localStorage.getItem('smilegames_monkey_best') || '0', 10);
let lives = 3;
let gameSpeed = 1.0;

bestScoreEl.textContent = bestScore;

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

function updateHUD() {
    scoreEl.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('smilegames_monkey_best', String(bestScore));
    }
    bestScoreEl.textContent = bestScore;
    heartsEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, 3 - lives));
    mathSolvedEl.textContent = mathGate.solvedCount;

    const dist = Math.round(dragon.distance);
    dragonFillEl.style.width = `${dist}%`;
    if (dist < 35) {
        dragonLabelEl.textContent = `🔥 위험! 드래곤 거리 ${dist}m`;
    } else {
        dragonLabelEl.textContent = `🐉 드래곤과 거리 ${dist}m`;
    }
}

function startNewGame(skipPrologue = false) {
    hero.reset();
    track.reset();
    mathGate.reset();
    dragon.reset();
    score = 0;
    lives = 3;
    gameSpeed = 1.0;
    gameOverModal.classList.remove('active');
    updateHUD();

    if (skipPrologue) {
        gameState = 'PLAYING';
        hero.triggerLookBack(1.2, 'happy');
        bubbleEn.textContent = "HEHE! MY BANANA! WONDER IF CHARLIE BROWN IS WATCHING?";
        bubbleKo.textContent = '"바나나를 들고 앞으로 달려라! 장애물과 계산 문제를 조심해!"';
    } else {
        gameState = 'PROLOGUE';
        bubbleEn.textContent = "SHHH! STEALING THE DRAGON'S GOLDEN BANANA!";
        bubbleKo.textContent = '"잠든 드래곤의 황금 바나나를 훔쳐서 도망가자!"';
    }
}

function triggerGameOver(reasonText) {
    gameState = 'GAMEOVER';
    sound.playRoar();
    finalScoreEl.textContent = score;
    finalMathEl.textContent = mathGate.solvedCount;
    document.getElementById('gameover-reason').textContent = reasonText;
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
    bubbleKo.textContent = '"히히! 내 뒤통수만 보다가 얼굴 보니까 반갑지? 🍌"';
}

window.addEventListener('keydown', (e) => {
    if (gameState === 'GAMEOVER' && (e.key === 'Enter' || e.key === ' ')) {
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
        hero.currentLane = -1;
        sound.playLaneMove();
    } else if (e.key === '2') {
        hero.currentLane = 0;
        sound.playLaneMove();
    } else if (e.key === '3') {
        hero.currentLane = 1;
        sound.playLaneMove();
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

document.getElementById('btn-left').addEventListener('click', handleLeft);
document.getElementById('btn-right').addEventListener('click', handleRight);
document.getElementById('btn-jump').addEventListener('click', handleJump);
document.getElementById('btn-slide').addEventListener('click', handleSlide);
document.getElementById('btn-look').addEventListener('click', handleLookBack);
document.getElementById('btn-restart').addEventListener('click', () => startNewGame(true));

// =========================================================================
// 메인 게임 루프 (Step 1 ~ Step 4 통합 렌더링)
// =========================================================================
let lastTime = performance.now();

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. 프롤로그 컷신 상태 (용의 바나나를 훔쳐 달아나는 시작 장면)
    if (gameState === 'PROLOGUE') {
        dragon.prologueTime += dt;
        if (dragon.prologueTime > 1.5 && dragon.prologueTime - dt <= 1.5) {
            sound.playRoar();
            bubbleEn.textContent = "ROOOAAAR!! GIVE BACK MY GOLDEN BANANA!!";
            bubbleKo.textContent = '"으아앙! 잠에서 깬 드래곤이 불을 뿜으며 쫓아온다! 도망쳐!"';
        }
        dragon.renderPrologue(ctx, width, height, hero);

        if (dragon.prologueTime >= dragon.prologueDuration) {
            startNewGame(true);
        }
        return;
    }

    // 2. 본 게임 플레이 업데이트
    if (gameState === 'PLAYING') {
        // 시간이 지날수록 서서히 속도 증가 (최대 1.65배)
        gameSpeed = Math.min(1.65, 1.0 + score / 2500);
        const effectiveSpeed = hero.boostTimer > 0 ? gameSpeed * 1.35 : gameSpeed;

        hero.update(dt, effectiveSpeed);
        dragon.update(dt);

        // 트랙 및 장애물/아이템 업데이트
        track.update(dt, effectiveSpeed, hero, mathGate.isGateApproaching(), {
            onCoin: (item) => {
                sound.playCoin();
                score += 10;
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 60, '+10 🪙', '#d64531');
                track.addBurstParticles(p.x, p.y - 40, '#f6d54a', 8);
                updateHUD();
            },
            onBananaBundle: (item) => {
                sound.playCorrect();
                score += 30;
                hero.triggerBoost(2.5);
                dragon.onPlayerSuccess(15);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 70, '바나나 부스트! +30 🍌', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 40, '#ffea79', 14);
                bubbleKo.textContent = '"우와! 황금 바나나 파워로 초고속 질주~!"';
                updateHUD();
            },
            onShield: (item) => {
                sound.playCoin();
                hero.shieldActive = true;
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 70, '보호막 장착! 🛡️', '#4ea8de');
                bubbleKo.textContent = '"든든한 보호막이 생겼어! 장애물 1번은 끄떡없지!"';
            },
            onObstacleAvoided: (obs) => {
                score += 5;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 80, '나이스 회피! +5 ✨', '#2a9d8f');
                updateHUD();
            },
            onObstacleHit: (obs) => {
                const p = track.project(obs.z, obs.lane, width, height);
                if (hero.shieldActive) {
                    hero.shieldActive = false;
                    sound.playCoin();
                    track.addPopup(p.x, p.y - 80, '보호막 방어! 🛡️', '#4ea8de');
                    bubbleKo.textContent = '"휴~ 보호막 덕분에 다치지 않았어!"';
                    return;
                }
                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(26);
                lives--;
                track.addPopup(p.x, p.y - 80, '쿵! 충돌! 💥', '#e63946');
                track.addBurstParticles(p.x, p.y - 40, '#e63946', 12);
                bubbleEn.textContent = "OUCH!! WATCH OUT FOR OBSTACLES!";
                bubbleKo.textContent = '"아야! 장애물에 부딪혔어! 드래곤이 바로 뒤까지 따라왔어!"';
                updateHUD();

                if (lives <= 0 || dragon.distance <= 0) {
                    triggerGameOver('장애물에 걸려 뒤쫓아온 드래곤에게 황금 바나나를 뺏겼어요!');
                }
            }
        });

        // 3개의 문 연산 게이트 업데이트
        mathGate.update(dt, effectiveSpeed, hero, track, {
            onGateSpawn: (gate) => {
                bubbleEn.textContent = `MATH GATE AHEAD! SOLVE:  ${gate.questionText}`;
                bubbleKo.textContent = `"앞에 3개의 문이 나타났어! [ ${gate.questionText} ] 정답 문으로 가자!"`;
            },
            onCorrectAnswer: (gate, door) => {
                sound.playCorrect();
                score += 100;
                hero.triggerBoost(2.2);
                dragon.onPlayerSuccess(22);
                const p = track.project(gate.z, door.lane, width, height);
                track.addPopup(p.x, p.y - 120, '정답! 문 열림! +100점 🎉', '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 90, '#ffda44', 18);
                bubbleEn.textContent = `BINGO! ${gate.questionText.replace('?', gate.answer)} IS CORRECT!`;
                bubbleKo.textContent = `"정답이야! 문이 활짝 열렸어! 보너스 +100점 획득!"`;
                updateHUD();
            },
            onWrongAnswer: (gate, door) => {
                const p = track.project(gate.z, door.lane, width, height);
                if (hero.shieldActive) {
                    hero.shieldActive = false;
                    sound.playHit();
                    track.addPopup(p.x, p.y - 120, `오답(${door.value})! 보호막 소모 🛡️`, '#4ea8de');
                    bubbleKo.textContent = `"앗, 정답은 ${gate.answer}인데! 보호막이 대신 막아줬어!"`;
                    return;
                }
                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(30);
                lives--;
                track.addPopup(p.x, p.y - 120, `땡! 문이 안 열려요! (정답: ${gate.answer}) 💥`, '#e63946');
                track.addBurstParticles(p.x, p.y - 90, '#e63946', 14);
                bubbleEn.textContent = `BONK!! THE DOOR STAYED LOCKED! (ANSWER: ${gate.answer})`;
                bubbleKo.textContent = `"쿵! 틀려서 문이 안 열렸어! 정답은 ${gate.answer}였는데!"`;
                updateHUD();

                if (lives <= 0 || dragon.distance <= 0) {
                    triggerGameOver(`계산 문제의 문이 열리지 않아 드래곤에게 붙잡혔어요! (정답: ${gate.answer})`);
                }
            }
        });

        updateHUD();
    }

    // 3. 화면 렌더링 (드래곤 화염 진동 오프셋 적용)
    ctx.save();
    const shake = dragon.getScreenShakeOffset();
    ctx.translate(shake.x, shake.y);

    // (A) 피너츠 배경 하늘, 폭포, 고대 사원, 3레인 돌길 트랙
    track.renderBackgroundAndRoad(ctx, width, height, hero.time);

    // (B) 원숭이보다 앞쪽(지평선 방향, z <= 0.88)에 있는 장애물, 코인, 수학의 문 렌더링
    track.renderEntities(ctx, width, height, hero.time, 0, 0.88);
    if (mathGate.activeGate && mathGate.activeGate.z <= 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    // (C) 주인공 스누피 원숭이 렌더링 (기본 도망가는 뒷모습 + 가끔 뒤돌아보기!)
    const charScale = Math.min(width, height) / 940;
    const roadBottomW = Math.min(width * 0.86, 860);
    const lanePixelSpread = (roadBottomW * 0.285) / charScale;
    hero.render(ctx, width * 0.5, height * 0.84, charScale, lanePixelSpread);

    // (D) 원숭이를 막 지나친(z > 0.88) 장애물/문 렌더링
    track.renderEntities(ctx, width, height, hero.time, 0.88, 1.2);
    if (mathGate.activeGate && mathGate.activeGate.z > 0.88) {
        mathGate.render(ctx, width, height, track);
    }

    // (E) 파티클 및 점수 팝업
    track.renderEffects(ctx, width, height);

    // (F) 플레이어 등 뒤(화면 하단)에서 불을 뿜으며 쫓아오는 드래곤 연출!
    dragon.renderInGameChase(ctx, width, height);

    ctx.restore();
}

// 초기 게임 시작
startNewGame(false);
requestAnimationFrame(gameLoop);
