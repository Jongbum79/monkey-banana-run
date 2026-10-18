/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 3] 초등학교 6학년 맞춤형 5단계 연산의 문 (3선지 계산 문제 게이트) 시스템
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 초등학교 6학년 수준에 맞춘 재미있고 너무 어렵지 않은 단계별(1~5단계) 암산 문제 출제!
 *   - 1단계 (숲): 두 자리 덧셈/뺄셈 & 기초 곱셈
 *   - 2단계 (사막): 곱셈과 나눗셈 (딱 떨어지는 나눗셈)
 *   - 3단계 (해저): 간단한 혼합 계산 (예: 6 × 4 + 5, 30 - 4 × 5)
 *   - 4단계 (도시): 간단한 소수 덧셈/곱셈 & 분수/비율 개념 (예: 1.5 + 2.5, 0.4 × 10)
 *   - 5단계 (글리치 보이드): 6학년 종합 암산 (비율/백분율, 비례식, 혼합연산 등)
 * - 플레이어가 선택한 레인의 문이 정답이면: 양쪽 문짝이 활짝 열리며 통과! (+100점 & HP 회복 & 다음 단계 진행)
 * - 오답이면: 문이 열리지 않고 굳게 닫힌 문에 '쿵!' 부딪힘!
 */

class MathGateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.activeGate = null;
        this.cooldownTimer = 5.5; // 첫 번째 문제 등장까지 대기 시간 (초)
        this.solvedCount = 0;
    }

    isGateApproaching() {
        return this.activeGate !== null && this.activeGate.z < 0.88;
    }

    generateQuestion(stage = 1) {
        let questionText = '';
        let answer = 0;
        const r = Math.random();

        if (stage === 1) {
            // [1단계: 숲] 가벼운 두 자리 덧셈/뺄셈 & 구구단
            if (r < 0.4) {
                const a = Math.floor(Math.random() * 25) + 12;
                const b = Math.floor(Math.random() * 18) + 7;
                questionText = `${a} + ${b} = ?`;
                answer = a + b;
            } else if (r < 0.75) {
                const a = Math.floor(Math.random() * 30) + 25;
                const b = Math.floor(Math.random() * 18) + 6;
                questionText = `${a} - ${b} = ?`;
                answer = a - b;
            } else {
                const a = Math.floor(Math.random() * 7) + 3;
                const b = Math.floor(Math.random() * 8) + 3;
                questionText = `${a} × ${b} = ?`;
                answer = a * b;
            }
        } else if (stage === 2) {
            // [2단계: 사막] 나눗셈과 두 자리×한 자리 곱셈
            if (r < 0.5) {
                const b = Math.floor(Math.random() * 8) + 3;
                const ans = Math.floor(Math.random() * 9) + 4;
                const a = b * ans;
                questionText = `${a} ÷ ${b} = ?`;
                answer = ans;
            } else {
                const a = Math.floor(Math.random() * 12) + 11;
                const b = Math.floor(Math.random() * 4) + 2;
                questionText = `${a} × ${b} = ?`;
                answer = a * b;
            }
        } else if (stage === 3) {
            // [3단계: 해저] 초등 혼합 계산 (곱셈/나눗셈 먼저!)
            if (r < 0.5) {
                const a = Math.floor(Math.random() * 7) + 3;
                const b = Math.floor(Math.random() * 6) + 2;
                const c = Math.floor(Math.random() * 12) + 4;
                questionText = `${a} × ${b} + ${c} = ?`;
                answer = a * b + c;
            } else {
                const b = Math.floor(Math.random() * 6) + 3;
                const q = Math.floor(Math.random() * 7) + 4;
                const a = b * q;
                const c = Math.floor(Math.random() * 10) + 5;
                questionText = `${a} ÷ ${b} + ${c} = ?`;
                answer = q + c;
            }
        } else if (stage === 4) {
            // [4단계: 도시(타임스퀘어)] 6학년 소수 계산 & 분수/비율 기초 (결과는 깔끔한 정수로!)
            if (r < 0.35) {
                // 소수 덧셈 (정수로 딱 떨어지는.5 + .5)
                const a = Math.floor(Math.random() * 6) + 1;
                const b = Math.floor(Math.random() * 6) + 2;
                questionText = `${a}.5 + ${b}.5 = ?`;
                answer = a + b + 1;
            } else if (r < 0.7) {
                // 소수 곱셈 (0.x × 10 또는 1.5 × 4 등)
                const a = Math.floor(Math.random() * 8) + 2;
                questionText = `0.${a} × 10 = ?`;
                answer = a;
            } else {
                // 분수의 곱셈 암산 (예: 20의 1/4, 30의 2/3)
                const denom = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
                const mult = Math.floor(Math.random() * 6) + 2;
                const total = denom * mult;
                questionText = `${total} × (1/${denom}) = ?`;
                answer = mult;
            }
        } else {
            // [5단계: 글리치 보이드 (마지막 스테이지!)] 6학년 비와 비율 / 백분율 / 종합 혼합연산
            if (r < 0.35) {
                // 백분율 문제 (예: 80의 50%, 60의 25%)
                const pairs = [
                    { q: '80의 50% = ?', a: 40 },
                    { q: '60의 50% = ?', a: 30 },
                    { q: '40의 25% = ?', a: 10 },
                    { q: '80의 25% = ?', a: 20 },
                    { q: '50의 20% = ?', a: 10 },
                    { q: '90의 10% = ?', a: 9 }
                ];
                const pick = pairs[Math.floor(Math.random() * pairs.length)];
                questionText = pick.q;
                answer = pick.a;
            } else if (r < 0.7) {
                // 비례식 빈칸 문제 (6학년 2학기 핵심!)
                const a = Math.floor(Math.random() * 4) + 2;
                const b = Math.floor(Math.random() * 5) + 3;
                const scale = Math.floor(Math.random() * 3) + 2;
                questionText = `${a} : ${b} = ${a * scale} : ?`;
                answer = b * scale;
            } else {
                // 괄호가 있는 혼합 연산
                const a = Math.floor(Math.random() * 7) + 4;
                const b = Math.floor(Math.random() * 6) + 3;
                const c = Math.floor(Math.random() * 4) + 2;
                questionText = `(${a} + ${b}) × ${c} = ?`;
                answer = (a + b) * c;
            }
        }

        // 오답 2개 생성 (정답과 겹치지 않는 근접 숫자)
        const wrongSet = new Set();
        while (wrongSet.size < 2) {
            const offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
            const candidate = answer + offset;
            if (candidate > 0 && candidate !== answer) {
                wrongSet.add(candidate);
            }
        }
        const wrongs = Array.from(wrongSet);

        // 3개 레인(-1, 0, 1) 중 정답 레인 무작위 배정
        const correctLane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const doors = [-1, 0, 1].map(lane => {
            if (lane === correctLane) {
                return {
                    lane,
                    value: answer,
                    isCorrect: true,
                    openAmount: 0,
                    shudder: 0
                };
            } else {
                return {
                    lane,
                    value: wrongs.pop(),
                    isCorrect: false,
                    openAmount: 0,
                    shudder: 0
                };
            }
        });

        return {
            stage,
            questionText,
            answer,
            correctLane,
            doors,
            z: 0.02,
            resolved: false,
            result: null
        };
    }

    update(dt, gameSpeed, hero, trackManager, callbacks) {
        // 학교 도착 엔딩(stage 6)에서는 더 이상 문제가 나오지 않음
        if (trackManager.stage >= 6) {
            this.activeGate = null;
            return;
        }

        if (!this.activeGate) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer <= 0) {
                trackManager.obstacles = trackManager.obstacles.filter(o => o.z > 0.55);
                this.activeGate = this.generateQuestion(trackManager.stage);
                if (callbacks.onGateSpawn) callbacks.onGateSpawn(this.activeGate);
            }
            return;
        }

        const gate = this.activeGate;
        const approachSpeed = gate.z < 0.75 ? 0.22 : 0.34;
        gate.z += dt * gameSpeed * approachSpeed;

        // 정답 문에 미리 서 있으면 문이 가까이 왔을 때 스르륵 열림
        if (!gate.resolved && gate.z > 0.74) {
            const chosenDoor = gate.doors.find(d => d.lane === hero.currentLane);
            if (chosenDoor && chosenDoor.isCorrect) {
                chosenDoor.openAmount = Math.min(1, chosenDoor.openAmount + dt * 5.5);
            }
        }

        // 플레이어 통과 시점 판정
        if (!gate.resolved && gate.z >= 0.85) {
            gate.resolved = true;
            const chosenDoor = gate.doors.find(d => d.lane === hero.currentLane) || gate.doors[1];

            if (chosenDoor.isCorrect) {
                gate.result = 'correct';
                chosenDoor.openAmount = 1.0;
                this.solvedCount++;
                callbacks.onCorrectAnswer(gate, chosenDoor);
            } else {
                gate.result = 'wrong';
                chosenDoor.openAmount = 0;
                chosenDoor.shudder = 1.0;
                callbacks.onWrongAnswer(gate, chosenDoor);
            }
        }

        gate.doors.forEach(d => {
            if (gate.resolved && d.isCorrect && gate.result === 'correct') {
                d.openAmount = Math.min(1, d.openAmount + dt * 8);
            }
            if (d.shudder > 0) {
                d.shudder = Math.max(0, d.shudder - dt * 3);
            }
        });

        if (gate.z > 1.18) {
            this.activeGate = null;
            this.cooldownTimer = 6.8;
        }
    }

    render(ctx, width, height, trackManager) {
        if (!this.activeGate) return;
        const gate = this.activeGate;

        const pCenter = trackManager.project(gate.z, 0, width, height);
        const scale = pCenter.scale;
        const roadW = pCenter.roadW;
        const gateY = pCenter.y;

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. 3개의 문 렌더링
        gate.doors.forEach(door => {
            const pDoor = trackManager.project(gate.z, door.lane, width, height);
            const doorW = (roadW / 3) * 0.88;
            const doorH = 230 * scale;
            const shakeX = door.shudder > 0 ? Math.sin(door.shudder * 45) * 12 * scale : 0;

            ctx.save();
            ctx.translate(pDoor.x + shakeX, gateY);

            // 석조/테마 문틀
            ctx.fillStyle = gate.stage === 5 ? '#3a0ca3' : '#c8b08a';
            ctx.strokeStyle = gate.stage === 5 ? '#00f5d4' : '#1a1612';
            ctx.lineWidth = Math.max(2, 4.2 * scale);
            ctx.beginPath();
            ctx.roundRect(-doorW * 0.54, -doorH - 14 * scale, doorW * 1.08, doorH + 14 * scale, 12 * scale);
            ctx.fill();
            ctx.stroke();

            // 문 안쪽 배경
            ctx.fillStyle = door.openAmount > 0.1 ? '#fff3b0' : '#2b2118';
            ctx.fillRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);

            // 양쪽 개폐식 문짝
            const halfW = (doorW * 0.46) * (1 - door.openAmount * 0.86);
            ctx.fillStyle = door.shudder > 0 ? '#d64531' : (gate.stage === 5 ? '#7209b7' : '#8d5b3c');
            ctx.fillRect(-doorW * 0.46, -doorH, halfW, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, halfW, doorH);

            ctx.fillRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);
            ctx.strokeRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);

            if (door.openAmount < 0.45) {
                const badgeR = Math.max(16, 44 * scale);
                const badgeY = -doorH * 0.55;

                ctx.fillStyle = '#fffcf5';
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = '#f5cb42';
                ctx.lineWidth = Math.max(1.5, 3 * scale);
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR * 0.84, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#1a1612';
                ctx.font = `bold ${Math.round(42 * scale)}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(door.value), 0, badgeY + 2 * scale);

                if (door.shudder > 0) {
                    ctx.fillStyle = '#d64531';
                    ctx.font = `bold ${Math.round(26 * scale)}px "Gaegu", sans-serif`;
                    ctx.fillText('🔒 오답! 안 열림!', 0, -doorH - 28 * scale);
                }
            } else {
                ctx.fillStyle = '#2a9d8f';
                ctx.font = `bold ${Math.round(30 * scale)}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('✨ 정답! 문 열림! ✨', 0, -doorH * 0.55);
            }

            ctx.restore();
        });

        // 2. 상단 6학년 문제 현수막
        const bannerW = roadW * 0.96;
        const bannerH = 78 * scale;
        const bannerY = gateY - 245 * scale - bannerH;

        ctx.save();
        ctx.translate(pCenter.x, bannerY);

        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = Math.max(2.5, 4.5 * scale);
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5, 0, bannerW, bannerH, 18 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = gate.stage === 5 ? '#f72585' : '#f5cb42';
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5, 0, bannerW, 20 * scale, [18 * scale, 18 * scale, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a1612';
        ctx.font = `bold ${Math.round(42 * scale)}px "Comic Neue", "Gaegu", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🏫 6학년 ${gate.stage}단계 문제:  ${gate.questionText}`, 0, bannerH * 0.60);

        ctx.restore();
        ctx.restore();
    }
}
