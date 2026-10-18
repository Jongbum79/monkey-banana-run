/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 3] 연산의 문 (3선지 계산 문제 게이트) 시스템
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 러닝 도중 주기적으로 간단한 사칙연산(덧셈, 뺄셈, 곱셈) 문제가 출제됨
 * - 트랙의 3개 레인(좌/중/우)에 각각 답이 적힌 3개의 큰 문(Door)이 다가옴
 * - 플레이어가 선택한 레인의 문이 정답이면: 양쪽 문짝이 활짝 열리며 통과! (+100점 & 부스트)
 * - 오답이면: 문이 열리지 않고 굳게 닫힌 문에 '쿵!' 부딪힘!
 */

class MathGateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.activeGate = null;
        this.cooldownTimer = 6.5; // 첫 번째 문제 등장까지 대기 시간 (초)
        this.solvedCount = 0;
    }

    isGateApproaching() {
        return this.activeGate !== null && this.activeGate.z < 0.88;
    }

    generateQuestion() {
        const level = Math.min(3, Math.floor(this.solvedCount / 3) + 1);
        let a, b, op, answer;

        const r = Math.random();
        if (level === 1 || r < 0.45) {
            // 덧셈
            a = Math.floor(Math.random() * 12) + 3;
            b = Math.floor(Math.random() * 12) + 2;
            op = '+';
            answer = a + b;
        } else if (r < 0.78) {
            // 뺄셈 (항상 양수 결과)
            a = Math.floor(Math.random() * 15) + 8;
            b = Math.floor(Math.random() * (a - 2)) + 2;
            op = '-';
            answer = a - b;
        } else {
            // 곱셈 (구구단)
            a = Math.floor(Math.random() * 8) + 2;
            b = Math.floor(Math.random() * 8) + 2;
            op = '×';
            answer = a * b;
        }

        const questionText = `${a} ${op} ${b} = ?`;

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
                    openAmount: 0, // 0: 닫힘, 1: 활짝 열림
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
            questionText,
            answer,
            correctLane,
            doors,
            z: 0.02,
            resolved: false,
            result: null // 'correct' | 'wrong'
        };
    }

    update(dt, gameSpeed, hero, trackManager, callbacks) {
        if (!this.activeGate) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer <= 0) {
                // 문제의 문이 등장할 때는 앞쪽 일반 장애물들을 치워주어 공정한 선택 보장
                trackManager.obstacles = trackManager.obstacles.filter(o => o.z > 0.55);
                this.activeGate = this.generateQuestion();
                if (callbacks.onGateSpawn) callbacks.onGateSpawn(this.activeGate);
            }
            return;
        }

        const gate = this.activeGate;
        // 게이트가 다가오는 속도 (플레이어가 문제를 읽고 고를 수 있도록 적당한 속도)
        const approachSpeed = gate.z < 0.75 ? 0.22 : 0.34;
        gate.z += dt * gameSpeed * approachSpeed;

        // 정답 문에 미리 서 있으면 문이 가까이 왔을 때(z > 0.72) 스르륵 열리기 시작하는 연출!
        if (!gate.resolved && gate.z > 0.74) {
            const chosenDoor = gate.doors.find(d => d.lane === hero.currentLane);
            if (chosenDoor && chosenDoor.isCorrect) {
                chosenDoor.openAmount = Math.min(1, chosenDoor.openAmount + dt * 5.5);
            }
        }

        // 플레이어 통과 시점 (z >= 0.85) 판정
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
                chosenDoor.openAmount = 0; // 틀리면 문이 절대 열리지 않음!
                chosenDoor.shudder = 1.0;  // 문에 쿵 부딪혀 문이 덜컹거림
                callbacks.onWrongAnswer(gate, chosenDoor);
            }
        }

        // 열린 문 애니메이션 및 흔들림 감쇠
        gate.doors.forEach(d => {
            if (gate.resolved && d.isCorrect && gate.result === 'correct') {
                d.openAmount = Math.min(1, d.openAmount + dt * 8);
            }
            if (d.shudder > 0) {
                d.shudder = Math.max(0, d.shudder - dt * 3);
            }
        });

        // 화면 뒤로 완전히 지나가면 제거 후 다음 문제 쿨타임 시작
        if (gate.z > 1.18) {
            this.activeGate = null;
            this.cooldownTimer = 8.0; // 8초마다 새로운 연산 문제 출현
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

        // 1. 3개의 문 렌더링 (좌: -1, 중: 0, 우: 1)
        gate.doors.forEach(door => {
            const pDoor = trackManager.project(gate.z, door.lane, width, height);
            const doorW = (roadW / 3) * 0.88;
            const doorH = 230 * scale;
            const shakeX = door.shudder > 0 ? Math.sin(door.shudder * 45) * 12 * scale : 0;

            ctx.save();
            ctx.translate(pDoor.x + shakeX, gateY);

            // (A) 석조 문틀 (Stone Frame)
            ctx.fillStyle = '#c8b08a';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = Math.max(2, 4.2 * scale);
            ctx.beginPath();
            ctx.roundRect(-doorW * 0.54, -doorH - 14 * scale, doorW * 1.08, doorH + 14 * scale, 12 * scale);
            ctx.fill();
            ctx.stroke();

            // 문 안쪽 배경 (열렸을 때 보이는 황금빛 통과 통로)
            ctx.fillStyle = door.openAmount > 0.1 ? '#fff3b0' : '#2b2118';
            ctx.fillRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);

            // (B) 양쪽 개폐식 나무 문짝 (Left & Right Door Panels)
            // openAmount가 0이면 굳게 닫혀 있고, 1이면 양옆으로 활짝 열림!
            const halfW = (doorW * 0.46) * (1 - door.openAmount * 0.86);

            // 왼쪽 문짝
            ctx.fillStyle = door.shudder > 0 ? '#d64531' : '#8d5b3c';
            ctx.fillRect(-doorW * 0.46, -doorH, halfW, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, halfW, doorH);

            // 오른쪽 문짝
            ctx.fillRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);
            ctx.strokeRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);

            // 문이 닫혀 있을 때 문 한가운데에 답 숫자 원형 명판 표시
            if (door.openAmount < 0.45) {
                const badgeR = Math.max(16, 44 * scale);
                const badgeY = -doorH * 0.55;

                // 명판 배경
                ctx.fillStyle = '#fffcf5';
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 노란 안쪽 링
                ctx.strokeStyle = '#f5cb42';
                ctx.lineWidth = Math.max(1.5, 3 * scale);
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR * 0.84, 0, Math.PI * 2);
                ctx.stroke();

                // 답 숫자
                ctx.fillStyle = '#1a1612';
                ctx.font = `bold ${Math.round(42 * scale)}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(door.value), 0, badgeY + 2 * scale);

                // 오답 문에 부딪혔을 때 '닫힘(LOCKED)' 표시
                if (door.shudder > 0) {
                    ctx.fillStyle = '#d64531';
                    ctx.font = `bold ${Math.round(26 * scale)}px "Gaegu", sans-serif`;
                    ctx.fillText('🔒 오답! 안 열림!', 0, -doorH - 28 * scale);
                }
            } else {
                // 정답 문이 활짝 열렸을 때!
                ctx.fillStyle = '#2a9d8f';
                ctx.font = `bold ${Math.round(30 * scale)}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('✨ 정답! 문 열림! ✨', 0, -doorH * 0.55);
            }

            ctx.restore();
        });

        // 2. 3개의 문 위를 가로지르는 대형 계산 문제 현수막 (Math Banner)
        const bannerW = roadW * 0.96;
        const bannerH = 74 * scale;
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

        // 노란 상단 포인트 바
        ctx.fillStyle = '#f5cb42';
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5, 0, bannerW, 18 * scale, [18 * scale, 18 * scale, 0, 0]);
        ctx.fill();
        ctx.stroke();

        // 수식 텍스트
        ctx.fillStyle = '#1a1612';
        ctx.font = `bold ${Math.round(44 * scale)}px "Comic Neue", "Gaegu", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🍌 문제:  ${gate.questionText}`, 0, bannerH * 0.58);

        ctx.restore();
        ctx.restore();
    }
}
