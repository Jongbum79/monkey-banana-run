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

// 🎰 등수 셔플 룰렛 & 올라 캣(OIIA CAT) 360° 캔버스 DOM 요소
const rankRouletteContainer = document.getElementById('rank-roulette-container');
const rouletteHeader = document.getElementById('roulette-header');
const rouletteNum = document.getElementById('roulette-num');
const rouletteDanceBadge = document.getElementById('roulette-dance-badge');
const oiiaCanvas = document.getElementById('oiia-cat-canvas');
const oiiaCtx = oiiaCanvas ? oiiaCanvas.getContext('2d') : null;
const oiiaBubbleText = document.getElementById('oiia-bubble-text');
const btnOiiaSpeed = document.getElementById('btn-oiia-speed');

// 🛣️ 갈림길 선택 및 생존 시간 UI
const roadChoiceOverlay = document.getElementById('road-choice-overlay');
const btnRoad1 = document.getElementById('btn-road-1');
const btnRoad2 = document.getElementById('btn-road-2');
const hudRoadBadge = document.getElementById('hud-road-badge');
const hudSurvivalTime = document.getElementById('hud-survival-time');

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
let selectedChar = localStorage.getItem('smilegames_character') || 'frog';
let selectedCostume = localStorage.getItem('smilegames_costume') || 'gentleman';
hero.setCharacterType(selectedChar);
hero.setCostumeType(selectedCostume);
let score = 0;
let gameSpeed = 1.0;
let schoolEndingTimer = 0;

// 🛣️ 두 갈림길 도로 및 시간에 따른 점수 시스템 변수
let selectedRoute = null; // 1 | 2 | null
let isSelectingRoute = false; // 시작 시 갈림길 선택 중 플래그
let routeScoreMultiplier = 1.0; // 1번 도로는 1.0, 2번 도로는 2.0 (모든 포인트 2배)
let routeSpeedMultiplier = 1.0; // 1번 도로는 1.0, 2번 도로는 1.50 (속도 +50% 상승)
let survivalTime = 0; // 초 단위 누적 생존 시간
let timeScoreAccumulator = 0; // 시간에 따른 점수 누적 변수
let nextTimePopupTimer = 0; // 생존 점수 획득 팝업 주기 타이머

if (playerName) {
    playerNameInput.value = playerName;
}

const STAGE_INFO = {
    1: {
        badge: '🌲 1단계: 동물들의 숲',
        bannerTitle: '🌲 STAGE 1 : 동물들의 숲',
        bannerSub: '🪨 굴러오는 진짜 바위를 피하고 손오공으로 진화하세요!',
        color: '#52b788',
        speedBase: 0.81, // 10% 감속 (0.90 -> 0.81)
        ko: '"1단계 숲속! 굴러오는 진짜 바위를 피하고 손오공 진화 & 슈퍼점프를 먹어봐!"'
    },
    2: {
        badge: '🏜️ 2단계: 황금 사막',
        bannerTitle: '🏜️ STAGE 2 : 황금 사막',
        bannerSub: '🦂 집게발을 세우고 달려오는 사막 독침 전갈을 조심하세요!',
        color: '#ffbe0b',
        speedBase: 0.90, // 10% 감속 (1.00 -> 0.90)
        ko: '"2단계 사막 진입! 달려오는 독침 전갈을 조심해!"'
    },
    3: {
        badge: '🍍 3단계: 비키니 해저 시티',
        bannerTitle: '🍍 STAGE 3 : 스폰지밥 해저 시티',
        bannerSub: '🌺 꽃구름과 파인애플 하우스 바다! 돌진하는 백상아리를 피하세요!',
        color: '#00b4d8',
        speedBase: 0.99, // 10% 감속 (1.10 -> 0.99)
        ko: '"3단계 스폰지밥 비키니 해저 시티! 파인애플 집과 모아이 석상 사이로 백상아리를 피해!"'
    },
    4: {
        badge: '🌃 4단계: 도시 타임스퀘어 밤',
        bannerTitle: '🌃 STAGE 4 : 타임스퀘어 밤',
        bannerSub: '🚕 헤드라이트를 켜고 빵빵~ 달려오는 택시 자동차를 피하세요!',
        color: '#ff007f',
        speedBase: 1.10, // 10% 감속 (1.22 -> 1.10)
        ko: '"4단계 타임스퀘어 밤! 빵빵~ 헤드라이트를 켜고 달려오는 자동차를 피해!"'
    },
    5: {
        badge: '⚡ 5단계: 글리치 보이드 (FINAL)',
        bannerTitle: '⚡ STAGE 5 : 글리치 보이드',
        bannerSub: '👾 치지직... 마지막 관문! 여길 돌파하면 흥덕초등학교에 도착합니다!',
        color: '#00f5d4',
        speedBase: 1.21, // 10% 감속 (1.35 -> 1.21)
        ko: '"치지직... 마지막 5단계 글리치 보이드! 여길 넘으면 흥덕초등학교에 도착해!"'
    },
    6: {
        badge: '🏫 엔딩: 흥덕초등학교 도착!',
        bannerTitle: '🏫 흥덕초등학교 도착!',
        bannerSub: '🎓 축하합니다! 5단계를 모두 통과하고 6학년 교실에 도착했어요!',
        color: '#ffd166',
        speedBase: 0.81, // 10% 감속 (0.90 -> 0.81)
        ko: '"딩동댕동~ 드디어 6학년 교실이 있는 흥덕초등학교에 무사히 도착했어! 축하해!"'
    }
};

// =========================================================================
// 🏆 랭킹 시스템
// =========================================================================
const RANKING_STORAGE_KEY = 'smilegames_monkey_rankings_v4';

// 🌐 브라우저 탭 및 기기 간 실시간 랭킹 동기화 채널
let rankBroadcastChannel = null;
try {
    if (typeof BroadcastChannel !== 'undefined') {
        rankBroadcastChannel = new BroadcastChannel('smilegames_rankings_sync');
        rankBroadcastChannel.onmessage = (event) => {
            if (event.data && event.data.type === 'NEW_RANKING') {
                const updatedList = getRankings();
                renderRankingList(startRankingListEl, updatedList);
                renderRankingList(gameOverRankingListEl, updatedList);
            }
        };
    }
} catch (e) {
    console.warn('BroadcastChannel not supported:', e);
}

function getRankings() {
    const raw = localStorage.getItem(RANKING_STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error(e);
        }
    }
    // 🏆 실제 플레이한 제작팀 5인 실명 기록만 등록 (플레이하지도 않은 6-1반 민준 등 가짜 학생 전면 삭제!)
    // 7,000점대 이상 달성 시 1~2위 등극, 3,000점대는 6위 이하로 정직하게 기록!
    const defaultRankings = [
        { name: '최지훈', score: 7200, math: 38 },
        { name: '박주아', score: 6450, math: 33 },
        { name: '김이수', score: 5820, math: 29 },
        { name: '최우영', score: 5150, math: 25 },
        { name: '전준우', score: 4580, math: 22 }
    ];
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(defaultRankings));
    return defaultRankings;
}

function saveScoreToRanking(name, newScore, mathCount) {
    const list = getRankings();
    const entry = {
        name: name || '익명 러너',
        score: newScore,
        math: mathCount,
        isNew: true
    };
    list.forEach(item => delete item.isNew);
    list.push(entry);
    list.sort((a, b) => b.score - a.score || b.math - a.math);
    localStorage.setItem(RANKING_STORAGE_KEY, JSON.stringify(list));
    const userRank = list.findIndex(item => item.isNew) + 1;

    // 브로드캐스트 채널을 통해 다른 탭/창에도 최신 점수 알림 전파
    if (rankBroadcastChannel) {
        try {
            rankBroadcastChannel.postMessage({ type: 'NEW_RANKING', entry });
        } catch (e) {}
    }

    return { list: list.slice(0, 15), userRank };
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

let rouletteTimer = null;

// 🎰 등수 숫자가 엄청 많이 바뀌다가 최종 등수가 나타나는 룰렛 연출!
function startRankShuffleRoulette(targetRank) {
    if (!rouletteNum || !rouletteHeader || !rouletteDanceBadge) return;

    if (rouletteTimer) {
        clearTimeout(rouletteTimer);
        rouletteTimer = null;
    }

    rouletteHeader.textContent = '🎲 실시간 공식 랭킹 산출 중...';
    rouletteDanceBadge.textContent = '🐱 OIIA OIIA 올라 캣 출격 대기 중...';
    rouletteNum.classList.add('rolling');

    let rollCount = 0;
    const maxRolls = 28; // 약 2.4초간 긴장감 넘치는 슬롯머신 셔플
    let currentInterval = 40; // 초기 40ms 고속 롤링

    function step() {
        rollCount++;
        // 롤링 중 번개처럼 바뀌는 랜덤 등수
        const fakeRank = Math.floor(Math.random() * 20) + 1;
        rouletteNum.textContent = `${fakeRank}위`;
        sound.playShuffleTick();

        if (rollCount < maxRolls) {
            // 점진적으로 감속하여 아케이드 슬롯머신 감속 연출
            if (rollCount > 20) currentInterval += 30;
            else if (rollCount > 12) currentInterval += 14;
            else currentInterval += 4;
            rouletteTimer = setTimeout(step, currentInterval);
        } else {
            // 🎯 최종 등수 확정 및 화려한 팡파레!
            rouletteNum.textContent = `🎉 ${targetRank}위! 🎉`;
            rouletteNum.classList.remove('rolling');
            rouletteHeader.textContent = `🏆 최종 결과 확정! 명예의 전당 ${targetRank}위 달성!`;
            rouletteDanceBadge.textContent = `🐱 올라 캣(OIIA OIIA CAT) 360° 무한 회전 세리머니!`;
            sound.playFanfareCheer();
        }
    }

    rouletteTimer = setTimeout(step, currentInterval);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

// =========================================================================
// 🐱 OIIA OIIA 올라 캣 (Spinning Cat) 360° 실시간 캔버스 렌더러
// =========================================================================
let oiiaActive = false;
let oiiaAnimId = null;
let oiiaDancer = 'cat'; // 'cat' | 'tiger' | 'hero'
let oiiaSpeedMode = 'normal'; // 'normal' | 'hyper'
let oiiaRotAngle = 0;
let oiiaStars = [];

function initOiiaStars() {
    oiiaStars = [];
    const emojis = ['⭐', '🍌', '💖', '🐱', '✨', '🎵', '💫', '🔥', '🐯'];
    for (let i = 0; i < 22; i++) {
        oiiaStars.push({
            x: Math.random() * 480,
            y: Math.random() * 270,
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            size: 14 + Math.random() * 18,
            vx: (Math.random() - 0.5) * 1.6,
            vy: -0.8 - Math.random() * 1.4,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.06
        });
    }
}

// 🌈 회전하는 무지개 디스코 썬버스트 배경
function drawOiiaDiscoBackground(ctx, w, h, time) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const numRays = 16;
    const baseAngle = time * (oiiaSpeedMode === 'hyper' ? 0.007 : 0.0022);

    const colors = [
        '#ff007f', '#7928ca', '#0070f3', '#00dfd8',
        '#79ffe1', '#f5a623', '#ff0080', '#e00'
    ];

    for (let i = 0; i < numRays; i++) {
        const a1 = baseAngle + (i * Math.PI * 2) / numRays;
        const a2 = baseAngle + ((i + 1) * Math.PI * 2) / numRays;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.max(w, h) * 1.2, a1, a2);
        ctx.closePath();
        ctx.fill();
    }

    // 중앙 비네팅 및 글로우
    const radial = ctx.createRadialGradient(cx, cy, 35, cx, cy, w * 0.65);
    radial.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
    radial.addColorStop(0.35, 'rgba(0, 0, 0, 0.1)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    // 반짝이는 파티클 별 업데이트 & 렌더
    ctx.save();
    oiiaStars.forEach(st => {
        st.x += st.vx;
        st.y += st.vy;
        st.rot += st.vRot;
        if (st.y < -30) {
            st.y = h + 20;
            st.x = Math.random() * w;
        }
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(st.rot);
        ctx.font = `${st.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.emoji, 0, 0);
        ctx.restore();
    });
    ctx.restore();
}

// 🐱 360° 회전 OIIA Ethel Cat 모델 렌더링
function draw3DOiiaCat(ctx, cx, cy, rot, squish, time) {
    ctx.save();
    ctx.translate(cx, cy);

    // 비트에 맞춘 바운스 & 스쿼시
    const bounceY = -Math.abs(Math.sin(time * 0.012)) * 16;
    ctx.translate(0, bounceY);
    ctx.scale(1 + squish * 0.08, 1 - squish * 0.08);

    const cosRot = Math.cos(rot);
    const sinRot = Math.sin(rot);
    const isFront = cosRot >= 0;

    // --- (1) 꼬리 (스윙 애니메이션) ---
    const tailWag = Math.sin(time * 0.015) * 0.35;
    ctx.save();
    ctx.translate(sinRot * -35, 45);
    ctx.rotate(tailWag - sinRot * 0.35);
    ctx.fillStyle = '#6b7280';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -18, 11, 26, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 꼬리 끝 흰 털
    ctx.fillStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.arc(6, -38, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- (2) 통통한 고양이 몸통 (Chubby Grey Tabby Body) ---
    ctx.save();
    ctx.scale(0.85 + Math.abs(cosRot) * 0.25, 1);
    const bodyGrad = ctx.createRadialGradient(-10, 20, 10, 0, 30, 70);
    bodyGrad.addColorStop(0, '#d1d5db');
    bodyGrad.addColorStop(0.6, '#9ca3af');
    bodyGrad.addColorStop(1, '#4b5563');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.ellipse(0, 32, 54, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 정면일 때 하얀 턱시도 가슴털 (White Chest Bib)
    if (isFront) {
        ctx.fillStyle = '#f9fafb';
        ctx.beginPath();
        ctx.ellipse(sinRot * 8, 38, 28 * Math.max(0.2, cosRot), 28, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // --- (3) 3D 궤도 귀 (Orbiting Ears with Z-Sorting) ---
    const earAngles = [
        { angle: rot - 0.75, baseSide: -1 },
        { angle: rot + 0.75, baseSide: 1 }
    ];
    earAngles.sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle));

    earAngles.forEach(ear => {
        const ex = Math.cos(ear.angle) * 44;
        const ey = -42 + Math.sin(ear.angle) * 8;
        const earFront = Math.sin(ear.angle) > -0.2;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(ear.baseSide * 0.18 + Math.cos(ear.angle) * 0.15);

        // 귀 외곽
        ctx.fillStyle = '#4b5563';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-16, 12);
        ctx.lineTo(0, -28);
        ctx.lineTo(16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 앞면일 때 핑크 속살
        if (earFront && isFront) {
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.moveTo(-9, 8);
            ctx.lineTo(0, -18);
            ctx.lineTo(9, 8);
            ctx.closePath();
            ctx.fill();
            // 흰 털
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 2, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // --- (4) 동글동글 올라 캣 머리 (Round Tabby Head) ---
    ctx.save();
    ctx.translate(0, -15);
    ctx.scale(0.88 + Math.abs(cosRot) * 0.22, 1);

    const headGrad = ctx.createRadialGradient(-15, -15, 10, 0, 0, 65);
    headGrad.addColorStop(0, '#f3f4f6');
    headGrad.addColorStop(0.45, '#9ca3af');
    headGrad.addColorStop(1, '#4b5563');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 58, 48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (isFront) {
        // --- 🐱 [정면]: 올라 캣 시그니처 맑은 눈망울 & 입꼬리 & 수염 ---
        const faceShiftX = sinRot * 18;

        // 이마의 태비 "M" 줄무늬
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.moveTo(faceShiftX - 14, -38);
        ctx.lineTo(faceShiftX, -22);
        ctx.lineTo(faceShiftX + 14, -38);
        ctx.lineTo(faceShiftX + 8, -44);
        ctx.lineTo(faceShiftX, -32);
        ctx.lineTo(faceShiftX - 8, -44);
        ctx.closePath();
        ctx.fill();

        // 볼 옆 줄무늬
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(faceShiftX + side * 42, -6);
            ctx.lineTo(faceShiftX + side * 54, -10);
            ctx.lineTo(faceShiftX + side * 44, 2);
            ctx.closePath();
            ctx.fill();
        });

        // 💖 하얀 주둥이 패드
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(faceShiftX - 10, 16, 14, 11, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(faceShiftX + 10, 16, 14, 11, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 핑크 코
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(faceShiftX, 15);
        ctx.lineTo(faceShiftX - 6, 8);
        ctx.lineTo(faceShiftX + 6, 8);
        ctx.closePath();
        ctx.fill();

        // 깜찍한 ':3' 고양이 입
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(faceShiftX - 8, 18, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(faceShiftX + 8, 18, 7, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 👀 전설의 OIIA 똥글똥글 큰 눈망울 (Starry Meme Cat Eyes)
        [-24, 24].forEach((eyeX) => {
            const curEyeX = faceShiftX + eyeX * Math.max(0.3, cosRot);
            ctx.save();
            ctx.translate(curEyeX, -6);

            // 흰자위
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 호박/녹빛 맑은 홍채
            const eyeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 13);
            eyeGrad.addColorStop(0, '#fef08a');
            eyeGrad.addColorStop(0.5, '#a3e635');
            eyeGrad.addColorStop(1, '#4d7c0f');
            ctx.fillStyle = eyeGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();

            // 큰 검은 동공
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
            ctx.fill();

            // ✦ 똥글똥글 하이라이트 별빛
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-3, -3, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(3, 4, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 〰️ 탄력 있는 하얀 수염
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        [-1, 1].forEach(side => {
            [-4, 4, 12].forEach(yOff => {
                ctx.beginPath();
                ctx.moveTo(faceShiftX + side * 14, 16 + yOff * 0.4);
                ctx.quadraticCurveTo(
                    faceShiftX + side * 40,
                    14 + yOff,
                    faceShiftX + side * 68,
                    18 + yOff * 1.5 + Math.sin(time * 0.02) * 3
                );
                ctx.stroke();
            });
        });

        // 핑크 볼터치
        ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
        ctx.beginPath();
        ctx.arc(faceShiftX - 32, 14, 9, 0, Math.PI * 2);
        ctx.arc(faceShiftX + 32, 14, 9, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // --- 🐱 [뒷모습]: 보들보들 뒤통수와 줄무늬 ---
        ctx.fillStyle = '#374151';
        [-20, 0, 20].forEach(sx => {
            ctx.beginPath();
            ctx.ellipse(sx, -10, 6, 22, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    ctx.restore();

    // --- (5) 가슴 앞에 모은 앙증맞은 앞발 (Tiny White Paws) ---
    if (isFront) {
        [-16, 16].forEach(px => {
            ctx.save();
            ctx.translate(px + sinRot * 10, 32);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 핑크 젤리
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(0, 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    ctx.restore();
}

// 🎬 OIIA 360° 올라 캣 스테이지 애니메이션 메인 루프 (올라 캣 전용)
function renderOiiaStage(now) {
    if (!oiiaActive || !oiiaCtx || !oiiaCanvas) return;

    const w = oiiaCanvas.width;
    const h = oiiaCanvas.height;

    // 회전 각도 갱신
    const speed = (oiiaSpeedMode === 'hyper' ? 0.22 : 0.065);
    oiiaRotAngle += speed;

    oiiaCtx.clearRect(0, 0, w, h);

    // 1. 디스코 썬버스트 배경 및 팡파르 별가루
    drawOiiaDiscoBackground(oiiaCtx, w, h, now);

    // 2. 360° 무한 회전 올라 캣 (OIIA OIIA Cat) 단독 렌더링
    const squishFactor = Math.cos(now * 0.014);
    draw3DOiiaCat(oiiaCtx, w * 0.5, h * 0.52, oiiaRotAngle, squishFactor, now);

    oiiaAnimId = requestAnimationFrame(renderOiiaStage);
}

function startOiiaStage() {
    if (!oiiaCanvas) return;
    oiiaActive = true;
    oiiaRotAngle = 0;
    initOiiaStars();
    if (oiiaAnimId) cancelAnimationFrame(oiiaAnimId);
    oiiaAnimId = requestAnimationFrame(renderOiiaStage);
}

function stopOiiaStage() {
    oiiaActive = false;
    if (oiiaAnimId) {
        cancelAnimationFrame(oiiaAnimId);
        oiiaAnimId = null;
    }
}

// ⚡ 올라 캣 1000 RPM 초광속 스핀 버튼 이벤트 연결
if (btnOiiaSpeed) {
    btnOiiaSpeed.addEventListener('click', () => {
        oiiaSpeedMode = (oiiaSpeedMode === 'normal' ? 'hyper' : 'normal');
        btnOiiaSpeed.classList.toggle('hyper', oiiaSpeedMode === 'hyper');
        btnOiiaSpeed.textContent = (oiiaSpeedMode === 'hyper' ? '🌪️ 1000 RPM 초광속 스핀 ON' : '⚡ 1000 RPM 초광속 스핀 ON/OFF');
        sound.playPowerUp();
    });
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
    hpBarLabelEl.textContent = `${wukongPrefix}HP ${hero.hp} / ${hero.maxHp} (기물 충돌 -12)`;

    const dist = Math.round(dragon.distance);
    dragonFillEl.style.width = `${dist}%`;
    if (track.stage >= 6) {
        dragonLabelEl.textContent = `🏫 드래곤 따돌리기 성공! 학교 도착!`;
    } else if (dist < 35) {
        dragonLabelEl.textContent = `🔥 위험! 드래곤 거리 ${dist}m`;
    } else {
        dragonLabelEl.textContent = `🐉 드래곤과 거리 ${dist}m`;
    }

    // 🛣️ 도로 뱃지 및 실시간 생존 시간 갱신
    if (hudRoadBadge) {
        if (selectedRoute === 1) {
            hudRoadBadge.innerHTML = '🟢 1번 도로: 안정적인 도로 (점수 1x / 기본 속도)';
            hudRoadBadge.style.borderColor = 'rgba(42, 157, 143, 0.7)';
        } else if (selectedRoute === 2) {
            hudRoadBadge.innerHTML = '🔥 2번 도로: 위험하지만 보상이 강한 도로 (점수 2x / 속도 +50% / 장애물 +20%)';
            hudRoadBadge.style.borderColor = 'rgba(230, 57, 70, 0.7)';
        } else {
            hudRoadBadge.innerHTML = '🛣️ 도로 선택 중... [1] 안정적 / [2] 고위험고보상';
            hudRoadBadge.style.borderColor = 'rgba(255, 190, 11, 0.7)';
        }
    }

    if (hudSurvivalTime) {
        const m = Math.floor(survivalTime / 60);
        const s = Math.floor(survivalTime % 60);
        const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        const ptsPerSec = Math.round(10 * routeScoreMultiplier);
        hudSurvivalTime.textContent = `⏱️ 생존 시간: ${formatted} (+${ptsPerSec}점/초)`;
    }
}

// 🛣️ 두 갈림길 도로 선택 함수 (1: 안정적인 도로, 2: 위험하지만 보상이 강한 도로)
function selectRoute(routeNum) {
    selectedRoute = routeNum;
    isSelectingRoute = false;
    track.selectedRoute = routeNum;
    if (roadChoiceOverlay) {
        roadChoiceOverlay.classList.remove('active');
    }

    if (routeNum === 1) {
        routeScoreMultiplier = 1.0;
        routeSpeedMultiplier = 1.0;
        sound.playSpecialItem();
        track.triggerStageBanner(
            '🟢 1번 도로 : 안정적인 도로 선택!',
            '기본 속도 & 안정적인 기물 간격으로 안전한 레이스 시작!',
            '#2a9d8f'
        );
        bubbleKo.textContent = '"[1번 안정적인 도로]를 선택했어! 안전한 속도로 안정적인 완주를 노려봐!"';
    } else {
        routeScoreMultiplier = 2.0; // 모든 포인트 2배!
        routeSpeedMultiplier = 1.50; // 속도 대폭 상승 (+50% 가속)!
        sound.playPowerUp();
        track.triggerStageBanner(
            '🔥 2번 도로 : 위험하지만 보상이 강한 도로 선택!',
            '⚡ 속도 +50% 가속 & ⚠️ 장애물 +20% 증가 & 💥 모든 포인트 2배 (x2)!',
            '#e63946'
        );
        bubbleKo.textContent = '"[2번 위험하지만 보상이 강한 도로] 선택! 속도가 50% 빨라지고 장애물이 20% 늘어난 대신 모든 점수가 2배야!"';
    }

    // 선택 시에는 용이 잡지 않도록 거리 안전하게 100m 유지
    dragon.distance = 100;
    dragon.fireTimer = 0;
    updateHUD();
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
            bubbleEn.textContent = "DING-DONG-DANG-DONG! ARRIVED AT HEUNGDEOK ELEMENTARY SCHOOL!";
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
    const speciesNames = { frog: '개구리', tiger: '호랑이', penguin: '펭귄', monkey: '원숭이' };
    const curSpecies = speciesNames[selectedChar] || '개구리';
    playerName = inputVal || `6학년 ${curSpecies}`;
    localStorage.setItem('smilegames_last_player', playerName);
    startModal.classList.remove('active');

    hero.setCharacterType(selectedChar);
    hero.setCostumeType(selectedCostume);

    sound.startBGM();
    startNewGame(false);
}

function startNewGame(skipPrologue = false) {
    if (rouletteTimer) {
        clearTimeout(rouletteTimer);
        rouletteTimer = null;
    }
    stopOiiaStage();
    sound.stopOiiaOiiaMemeBGM();
    sound.startBGM();
    hero.reset();
    hero.setCharacterType(selectedChar);
    hero.setCostumeType(selectedCostume);
    track.reset();
    mathGate.reset();
    dragon.reset();
    sound.currentStage = 1;
    score = 0;
    gameSpeed = 0.81; // 10% 감속 (0.90 -> 0.81)
    schoolEndingTimer = 0;
    gameOverModal.classList.remove('active');

    // 🛣️ 갈림길 도로 및 생존 시간 변수 초기화
    selectedRoute = null;
    isSelectingRoute = true;
    routeScoreMultiplier = 1.0;
    routeSpeedMultiplier = 1.0;
    survivalTime = 0;
    timeScoreAccumulator = 0;
    nextTimePopupTimer = 0;
    track.selectedRoute = null;

    updateHUD();

    if (skipPrologue) {
        gameState = 'PLAYING';
        document.body.classList.add('is-playing');
        hero.triggerLookBack(1.2, 'happy');
        const st1 = STAGE_INFO[1];
        track.triggerStageBanner(st1.bannerTitle, st1.bannerSub, st1.color);
        bubbleEn.textContent = "CHOOSE ROAD: [1] STABLE ROAD OR [2] HIGH RISK HIGH REWARD!";
        bubbleKo.textContent = '"게임 시작! 1번 안정적인 도로 또는 2번 고위험 고보상 도로를 선택하세요!"';
        if (roadChoiceOverlay) {
            roadChoiceOverlay.classList.add('active');
        }
    } else {
        gameState = 'PROLOGUE';
        document.body.classList.remove('is-playing');
        if (roadChoiceOverlay) {
            roadChoiceOverlay.classList.remove('active');
        }
        const speciesNames = { frog: '개구리', tiger: '호랑이', penguin: '펭귄', monkey: '원숭이' };
        const curSpecies = speciesNames[selectedChar] || '러너';
        const costumeNames = { gentleman: '신사복', santa: '산타 복장', none: '' };
        const curCostume = costumeNames[selectedCostume] ? `${costumeNames[selectedCostume]}을 입은 ` : '';
        bubbleEn.textContent = "SHHH! STEALING THE GOLDEN BANANA FROM HEUNGDEOK ELEMENTARY SCHOOL!";
        bubbleKo.textContent = `"쉿! ${curCostume}${playerName} ${curSpecies}가 흥덕초등학교에서 드래곤의 황금 바나나를 뺏어 도망간다!"`;
    }
}

function triggerGameEndModal(titleText, reasonText) {
    gameState = 'GAMEOVER';
    document.body.classList.remove('is-playing');
    gameOverTitleEl.textContent = titleText;
    finalPlayerNameEl.textContent = playerName;
    finalScoreEl.textContent = score;
    finalMathEl.textContent = mathGate.solvedCount;
    document.getElementById('gameover-reason').textContent = reasonText;

    const rankingResult = saveScoreToRanking(playerName, score, mathGate.solvedCount);
    renderRankingList(gameOverRankingListEl, rankingResult.list);
    renderRankingList(startRankingListEl, rankingResult.list);

    const userRank = rankingResult.userRank || 50;

    startRankShuffleRoulette(userRank);

    // 🐱 OIIA OIIA 올라 캣(Spinning Cat) 360° 실시간 캔버스 세리머니 & 보컬로이드 신스 BGM 시작!
    startOiiaStage();
    sound.playOiiaOiiaMemeBGM((step) => {
        if (oiiaBubbleText) {
            const memeTexts = ['OIIA OIIA!', 'OI-OI-OI!', 'SPINNING CAT!', '360° MEME!', '흥덕초 대박! 🎉', '무한 회전!'];
            oiiaBubbleText.textContent = memeTexts[Math.floor(Math.random() * memeTexts.length)];
            oiiaBubbleText.classList.add('beat');
            setTimeout(() => oiiaBubbleText.classList.remove('beat'), 110);
        }
    });

    gameOverModal.classList.add('active');
}

function triggerGameOver(reasonText) {
    sound.playRoar();
    triggerGameEndModal('🐉 게임 오버!', reasonText);
}

function triggerGameClear() {
    const bonus = Math.round(500 * routeScoreMultiplier);
    score += bonus;
    triggerGameEndModal(
        '🏫 흥덕초등학교 도착 클리어! 🎓',
        `축하합니다! 1단계 숲부터 5단계 글리치 보이드까지 모두 돌파하고 흥덕초등학교에 무사히 등교했어요! (+${bonus}점 클리어 보너스)`
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
        if (isSelectingRoute || selectedRoute === null) {
            selectRoute(1);
        } else if (gameState === 'PLAYING') {
            hero.currentLane = -2;
            sound.playLaneMove();
        }
    } else if (e.key === '2') {
        if (isSelectingRoute || selectedRoute === null) {
            selectRoute(2);
        } else if (gameState === 'PLAYING') {
            hero.currentLane = -1;
            sound.playLaneMove();
        }
    } else if (e.key === '3') {
        if (gameState === 'PLAYING') { hero.currentLane = 0; sound.playLaneMove(); }
    } else if (e.key === '4') {
        if (gameState === 'PLAYING') { hero.currentLane = 1; sound.playLaneMove(); }
    } else if (e.key === '5') {
        if (gameState === 'PLAYING') { hero.currentLane = 2; sound.playLaneMove(); }
    }
});

// 🛣️ 갈림길 도로 선택 카드 클릭 이벤트 연결
if (btnRoad1) {
    btnRoad1.addEventListener('click', () => selectRoute(1));
}
if (btnRoad2) {
    btnRoad2.addEventListener('click', () => selectRoute(2));
}

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

// 🐾 캐릭터 선택 버튼 이벤트 연결
const charBtns = document.querySelectorAll('#char-selector .select-btn');
charBtns.forEach(btn => {
    if (btn.dataset.char === selectedChar) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    btn.addEventListener('click', () => {
        charBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedChar = btn.dataset.char;
        localStorage.setItem('smilegames_character', selectedChar);
        hero.setCharacterType(selectedChar);
        sound.playSpecialItem();
    });
});

// 👔 의상 선택 버튼 이벤트 연결
const costumeBtns = document.querySelectorAll('#costume-selector .select-btn');
costumeBtns.forEach(btn => {
    if (btn.dataset.costume === selectedCostume) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    btn.addEventListener('click', () => {
        costumeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCostume = btn.dataset.costume;
        localStorage.setItem('smilegames_costume', selectedCostume);
        hero.setCostumeType(selectedCostume);
        sound.playSpecialItem();
    });
});

document.getElementById('btn-left').addEventListener('click', handleLeft);
document.getElementById('btn-right').addEventListener('click', handleRight);
document.getElementById('btn-jump').addEventListener('click', handleJump);
document.getElementById('btn-slide').addEventListener('click', handleSlide);
document.getElementById('btn-look').addEventListener('click', handleLookBack);
document.getElementById('btn-restart').addEventListener('click', () => startNewGame(true));

document.getElementById('btn-change-name').addEventListener('click', () => {
    stopOiiaStage();
    sound.stopOiiaOiiaMemeBGM();
    gameOverModal.classList.remove('active');
    gameState = 'START_MENU';
    document.body.classList.remove('is-playing');
    renderRankingList(startRankingListEl, getRankings());
    startModal.classList.add('active');
    playerNameInput.focus();
});

document.getElementById('btn-open-rank').addEventListener('click', () => {
    stopOiiaStage();
    sound.stopOiiaOiiaMemeBGM();
    gameState = 'START_MENU';
    document.body.classList.remove('is-playing');
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
// 🎮 게임 선택 허브 및 두더지 게임(MoleGame) 연동
// =========================================================================
const moleGame = new MoleGame(sound);
window.moleGame = moleGame;

function switchToHub() {
    stopOiiaStage();
    sound.stopOiiaOiiaMemeBGM();
    if (gameState === 'PLAYING') {
        gameState = 'START_MENU';
    }
    document.body.classList.remove('is-playing');
    startModal.classList.remove('active');
    gameOverModal.classList.remove('active');
    if (roadChoiceOverlay) roadChoiceOverlay.classList.remove('active');

    // 두더지 게임 정지 & 숨김
    moleGame.stop();
    moleGame.hideGameOverModal();
    const moleContainer = document.getElementById('mole-game-container');
    if (moleContainer) moleContainer.style.display = 'none';

    // 캔버스 및 바나나 UI 복원
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) canvasContainer.style.display = 'block';
    const uiOverlay = document.querySelector('.ui-overlay');
    if (uiOverlay) uiOverlay.style.display = '';

    // 허브 모달 활성화
    const hubModal = document.getElementById('hub-modal');
    if (hubModal) hubModal.classList.add('active');
}

function switchToBananaGame() {
    const hubModal = document.getElementById('hub-modal');
    if (hubModal) hubModal.classList.remove('active');

    // 두더지 게임 정지 & 숨김
    moleGame.stop();
    moleGame.hideGameOverModal();
    const moleContainer = document.getElementById('mole-game-container');
    if (moleContainer) moleContainer.style.display = 'none';

    // 바나나 런 보이기
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) canvasContainer.style.display = 'block';
    const uiOverlay = document.querySelector('.ui-overlay');
    if (uiOverlay) uiOverlay.style.display = '';

    // 바나나 런 시작 모달 띄우기
    gameState = 'START_MENU';
    renderRankingList(startRankingListEl, getRankings());
    startModal.classList.add('active');
    playerNameInput.focus();
}

function switchToMoleGame() {
    const hubModal = document.getElementById('hub-modal');
    if (hubModal) hubModal.classList.remove('active');
    startModal.classList.remove('active');
    gameOverModal.classList.remove('active');
    if (roadChoiceOverlay) roadChoiceOverlay.classList.remove('active');

    // 바나나 런 캔버스 & UI 숨김
    stopOiiaStage();
    sound.stopOiiaOiiaMemeBGM();
    gameState = 'START_MENU';
    document.body.classList.remove('is-playing');
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) canvasContainer.style.display = 'none';
    const uiOverlay = document.querySelector('.ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    // 두더지 게임 컨테이너 표시 & 2분 게임 시작
    const moleContainer = document.getElementById('mole-game-container');
    if (moleContainer) {
        moleContainer.style.display = 'flex';
    }
    const currentName = (playerNameInput ? playerNameInput.value.trim() : '') || playerName || '도전자';
    moleGame.start(currentName);
}

window.switchToHub = switchToHub;
window.switchToBananaGame = switchToBananaGame;
window.switchToMoleGame = switchToMoleGame;

// 허브 모달 버튼 이벤트 연결
const hubSelectBanana = document.getElementById('hub-select-banana');
if (hubSelectBanana) hubSelectBanana.addEventListener('click', switchToBananaGame);

const hubSelectMole = document.getElementById('hub-select-mole');
if (hubSelectMole) hubSelectMole.addEventListener('click', switchToMoleGame);

const btnBackToHub = document.getElementById('btn-back-to-hub');
if (btnBackToHub) btnBackToHub.addEventListener('click', switchToHub);

const btnSwitchHub = document.getElementById('btn-switch-hub');
if (btnSwitchHub) btnSwitchHub.addEventListener('click', switchToHub);

const btnGameOverHub = document.getElementById('btn-gameover-hub');
if (btnGameOverHub) btnGameOverHub.addEventListener('click', switchToHub);


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
        // 🐉 갈림길 선택 중일 때는 드래곤이 플레이어를 절대 잡지 못하도록 보호! ("그리고 그때는 용이 잡으면 안돼")
        if (isSelectingRoute) {
            dragon.distance = 100;
            dragon.fireTimer = 0;
        }

        const stInfo = STAGE_INFO[track.stage] || STAGE_INFO[1];
        // 2번 도로(위험하지만 보상이 강한 도로) 선택 시 전체 속도 +50% 적용 (routeSpeedMultiplier = 1.50)
        gameSpeed = (stInfo.speedBase + Math.min(0.14, score / 7000)) * routeSpeedMultiplier;
        // 요청 반영: 점프 길이를 대폭 확장하여 도약 시 시원하게 전방을 돌파 (jumpBoost 1.35x)
        const jumpBoost = hero.isJumping ? 1.35 : 1.0;
        const effectiveSpeed = ((hero.boostTimer > 0 || hero.invincibleTimer > 0) ? gameSpeed * 1.15 : gameSpeed) * jumpBoost;

        hero.update(dt, effectiveSpeed);
        dragon.update(dt);

        // ⏱️ 시간에 따른 점수 부여 시스템 (1초당 기본 10점, 2번 도로 선택 시 모든 포인트 2배로 1초당 20점)
        if (!isSelectingRoute) {
            survivalTime += dt;
            const timePointsRate = 10 * routeScoreMultiplier;
            timeScoreAccumulator += dt * timePointsRate;
            if (timeScoreAccumulator >= 1.0) {
                const addPts = Math.floor(timeScoreAccumulator);
                score += addPts;
                timeScoreAccumulator -= addPts;
            }
            nextTimePopupTimer += dt;
            if (nextTimePopupTimer >= 5.0) {
                nextTimePopupTimer = 0;
                const p = track.project(0.95, 0, width, height);
                track.addPopup(p.x, p.y - 110, `⏱️ 생존 시간 보너스 +${Math.round(5 * timePointsRate)}점!`, '#00f5d4');
            }
        }

        // 트랙 및 장애물/아이템 업데이트
        track.update(dt, effectiveSpeed, hero, mathGate.isGateApproaching(), {
            onCoin: (item) => {
                sound.playCoin();
                const earned = Math.round(10 * routeScoreMultiplier);
                score += earned;
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 45, `+${earned} 🪙`, '#d64531');
                track.addBurstParticles(p.x, p.y - 30, '#f6d54a', 8);
                updateHUD();
            },
            onBananaBundle: (item) => {
                sound.playSpecialItem();
                const earned = Math.round(35 * routeScoreMultiplier);
                score += earned;
                hero.triggerBoost(1.5);
                dragon.onPlayerSuccess(15);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 55, `황금 바나나 부스트 (1.5초)! +${earned} 🍌`, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 30, '#ffea79', 16);
                bubbleKo.textContent = '"우와! 특별 황금 바나나 파워로 1.5초 초고속 질주~!"';
                updateHUD();
            },
            onShield: (item) => {
                sound.playSpecialItem();
                const earned = Math.round(25 * routeScoreMultiplier);
                score += earned;
                hero.triggerInvincibleShield(1.8);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 60, `🛡️ 방패 무적 (1.8초)! +${earned}`, '#00b4d8');
                track.addBurstParticles(p.x, p.y - 35, '#90e0ef', 20);
                bubbleEn.textContent = "SHIELD POWER-UP! INVINCIBLE FOR 1.8 SECONDS!";
                bubbleKo.textContent = '"방패 아이템 획득! 1.8초 동안 기물에 무적이야!"';
                updateHUD();
            },
            onSuperJump: (item) => {
                sound.playSpecialItem();
                const earned = Math.round(30 * routeScoreMultiplier);
                score += earned;
                hero.triggerSuperJump(2.5);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 65, `🚀 슈퍼점프 (2.5초)! +${earned}`, '#06d6a0');
                track.addBurstParticles(p.x, p.y - 35, '#00f5d4', 22);
                bubbleEn.textContent = "SUPER JUMP ACTIVATED FOR 2.5 SECONDS!";
                bubbleKo.textContent = '"🚀 슈퍼점프 2.5초 발동! 지금 점프하면 높이 날아올라!"';
                updateHUD();
            },
            onWukong: (item) => {
                sound.playWukongEvolution();
                const earned = Math.round(50 * routeScoreMultiplier);
                score += earned;
                hero.triggerWukongEvolution();
                dragon.onPlayerSuccess(18);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 75, `👑 손오공 진화! +${earned} (${hero.hp}/${hero.maxHp})`, '#ffbe0b');
                track.addBurstParticles(p.x, p.y - 40, '#ffbe0b', 28);
                bubbleEn.textContent = "SUN WUKONG EVOLUTION!! MAX HP INCREASED & NIMBUS CLOUD SUMMONED!";
                bubbleKo.textContent = `"👑 제천대성 손오공 진화! 최대 체력이 ${hero.maxHp}으로 오르고 체력이 대폭 회복됐어!"`;
                updateHUD();
            },
            onLaserGun: (item) => {
                sound.playLaserGun();
                const earned = Math.round(40 * routeScoreMultiplier);
                score += earned;
                hero.triggerLaserGun(4.0);
                const p = track.project(item.z, item.lane, width, height);
                track.addPopup(p.x, p.y - 75, `🔫 플라즈마 레이저총 발동(4초)! +${earned}`, '#ff006e');
                track.addBurstParticles(p.x, p.y - 40, '#ff006e', 24);
                bubbleEn.textContent = "PLASMA LASER GUN!! VAPORIZING ALL OBSTACLES IN YOUR LANE FOR 4 SECONDS!";
                bubbleKo.textContent = '"🔫 레이저총 장착! 4초 동안 내가 달리는 레인의 기물을 레이저로 싹 없애버려!"';
                updateHUD();
            },
            onLaserDestroy: (obs) => {
                sound.playLaserZap();
                const earned = Math.round(25 * routeScoreMultiplier);
                score += earned;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 70, `⚡ 레이저 기물 증발! +${earned}`, '#00f5d4');
                track.addBurstParticles(p.x, p.y - 40, '#ff006e', 16);
                track.addBurstParticles(p.x, p.y - 40, '#00f5d4', 12);
                updateHUD();
            },
            onRampClimb: (obs) => {
                sound.playJump(false);
                const earned = Math.round(18 * routeScoreMultiplier);
                score += earned;
                const p = track.project(obs.z, obs.lane, width, height);
                const label = obs.type === 'climb_truck' ? `🚛 트럭 지붕 위 질주! +${earned}` : `⏫ 경사로 위 질주! +${earned}`;
                track.addPopup(p.x, p.y - 95, label, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 50, '#a8dadc', 12);
                updateHUD();
            },
            onChaserSpawn: (chaserType) => {
                if (chaserType === 'rolling_stone') sound.playRollingStone();
                else if (chaserType === 'desert_scorpion') sound.playScorpionSound();
                else if (chaserType === 'undersea_shark') sound.playSharkSound();
                else if (chaserType === 'city_car') sound.playCarHorn();
                else if (chaserType === 'glitch_hazard') sound.playGlitchStatic(0.16, 0.08);
            },
            onObstacleAvoided: (obs) => {
                const earned = Math.round(5 * routeScoreMultiplier);
                score += earned;
                const p = track.project(obs.z, obs.lane, width, height);
                track.addPopup(p.x, p.y - 60, `나이스 회피! +${earned} ✨`, '#2a9d8f');
                updateHUD();
            },
            onObstacleHit: (obs) => {
                const p = track.project(obs.z, obs.lane, width, height);

                if (hero.invincibleTimer > 0) {
                    sound.playSpecialItem();
                    const earned = Math.round(20 * routeScoreMultiplier);
                    score += earned;
                    track.addPopup(p.x, p.y - 65, `🛡️ 무적 방패 돌파! +${earned} 💥`, '#00b4d8');
                    track.addBurstParticles(p.x, p.y - 40, '#00f5d4', 18);
                    updateHUD();
                    return;
                }

                sound.playHit();
                hero.triggerStumble();
                dragon.onPlayerMistake(12);

                // 체력 100 기준 부담 없는 데미지: 기물 1회 충돌 시 HP -12 감소
                const dmg = 12;
                hero.hp = Math.max(0, hero.hp - dmg);

                if (obs && obs.type === 'arch') {
                    track.addPopup(p.x, p.y - 65, `쾅!! 아치에 머리 충돌 HP -${dmg} (슬라이드 필수!) 💥`, '#e63946');
                    bubbleEn.textContent = `OUCH!! HIT THE ARCH! SLIDE (↓) UNDER! (-${dmg} HP)`;
                    bubbleKo.textContent = `"아야! 아치 관문은 점프하면 머리를 부딪혀! 슬라이드(↓)로 통과해야 해!"`;
                } else if (obs && obs.type === 'pillar') {
                    track.addPopup(p.x, p.y - 65, `쾅!! 석조 기둥 충돌 HP -${dmg} (좌우 회피 필수!) 💥`, '#e63946');
                    bubbleEn.textContent = `OUCH!! HIT THE PILLAR! DODGE LEFT/RIGHT! (-${dmg} HP)`;
                    bubbleKo.textContent = `"아야! 거대한 기둥은 점프로 못 넘어! 좌우(←/→)로 피해야 해!"`;
                } else {
                    track.addPopup(p.x, p.y - 65, `쾅!! 기물 충돌 HP -${dmg} (남은 HP: ${hero.hp}/${hero.maxHp}) 💥`, '#e63946');
                    bubbleEn.textContent = `HIT!! -${dmg} HP! (HP: ${hero.hp}/${hero.maxHp}) DODGE OR JUMP!`;
                    bubbleKo.textContent = `"으악! 기물에 부딪혀서 HP가 -${dmg} 깎였어! (현재 HP: ${hero.hp}/${hero.maxHp})"`;
                }
                track.addBurstParticles(p.x, p.y - 35, '#e63946', 18);
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
                const earned = Math.round(100 * routeScoreMultiplier);
                score += earned;
                hero.triggerBoost(2.2);
                dragon.onPlayerSuccess(22);

                const prevHp = hero.hp;
                hero.hp = Math.min(hero.maxHp, hero.hp + 20);
                const healed = hero.hp - prevHp;
                if (healed > 0) sound.playHeal();

                const p = track.project(gate.z, door.lane, width, height);
                const healText = healed > 0 ? ` +HP ${healed} 회복💚` : '';
                track.addPopup(p.x, p.y - 95, `정답! +${earned}점${healText} 🎉`, '#2a9d8f');
                track.addBurstParticles(p.x, p.y - 70, '#52b788', 18);
                bubbleEn.textContent = `BINGO! ${gate.questionText.replace('?', gate.answer)} IS CORRECT!`;
                bubbleKo.textContent = `"정답이야! 문이 즉시 사라지며 +${earned}점 & HP가 ${hero.hp}/${hero.maxHp}로 복구됐어!"`;

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
                dragon.onPlayerMistake(15);

                // 오답 문 충돌 시 체력 감소도 30에서 15로 대폭 완화!
                const wrongDmg = 15;
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
    try {
        const shake = dragon.getScreenShakeOffset();
        ctx.translate(shake.x, shake.y);

        // 화면(카메라)은 안정적으로 고정하고 캐릭터만 레인 위를 이동하도록 유지
        track.renderBackgroundAndRoad(ctx, width, height, hero.time);

        track.renderEntities(ctx, width, height, hero.time, 0, 0.88);
        if (mathGate.activeGate && mathGate.activeGate.z <= 0.88) {
            mathGate.render(ctx, width, height, track);
        }

        if (hero.hp > 0) {
            // 🎯 정사각형 바닥 트랙의 한 칸(타일)과 100% 동일한 원숭이 바닥 히트박스 렌더링!
            const isSafe = hero.isJumping || hero.isSliding || hero.shieldActive;
            const boxColor = hero.stumbleTimer > 0
                ? '#ff0055'
                : (hero.shieldActive ? '#ffbe0b' : (isSafe ? '#06d6a0' : '#00f5d4'));
            const fillColor = hero.stumbleTimer > 0
                ? 'rgba(255, 0, 85, 0.38)'
                : (hero.shieldActive ? 'rgba(255, 190, 11, 0.32)' : (isSafe ? 'rgba(6, 214, 160, 0.28)' : 'rgba(0, 245, 212, 0.28)'));

            track.drawTrackCellHitbox(ctx, 1.0, hero.laneX, width, height, fillColor, boxColor, 4.0);

            // 원숭이를 적절한 스케일(0.36)로 렌더링하며 레인 간격을 바닥 트랙 타일과 1:1 일치
            const charScale = (Math.min(width, height) / 940) * 0.36;
            const pHero = track.project(1.0, 0, width, height);
            const lanePixelSpread = (pHero.roadW / 5) / charScale;
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

        // 🎯 왼쪽 상단/왼쪽 아래 DOM 박스가 사라진 자리에 캔버스 자체 아케이드 HUD 렌더링
        if (gameState === 'PLAYING') {
            track.renderCanvasHUD(ctx, width, height, score, track.stage, STAGE_INFO[track.stage], mathGate.solvedCount);
        }
    } finally {
        ctx.restore();
    }
}

updateHUD();
requestAnimationFrame(gameLoop);
