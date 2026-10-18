/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 3 업그레이드] 3D 입체 연산의 문 & 간단한 사칙연산(+, -, ×, ÷) 전용 출제 시스템
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 소수점, 분수, 비율 문제를 모두 제외하고 직관적이고 재미있는 사칙연산(더하기, 빼기, 곱하기, 나누기)만 출제!
 * - 3개의 문과 현수막을 3D 입체 원근 도형(윗면 + 옆면 두께 + 정면)으로 렌더링!
 * - 화면 상단 중앙에도 초대형 고정 칠판 보드를 함께 띄워 멀리서도 문제가 선명하게 보임!
 */

class MathGateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.activeGate = null;
        // 게임 길이를 24% 늘림 (5.5s * 1.24 = 6.82s)
        this.cooldownTimer = 6.82;
        this.solvedCount = 0;
    }

    isGateApproaching() {
        return this.activeGate !== null && this.activeGate.z < 0.88;
    }

    generateQuestion(stage = 1) {
        let questionText = '';
        let answer = 0;
        const r = Math.random();

        // 전 스테이지(1~5단계) 모두 소수점/비율 없이 간단한 더하기(+), 빼기(-), 곱하기(×), 나누기(÷)만 출제!
        if (r < 0.25) {
            // 1) 더하기 (+)
            const maxA = 10 + stage * 5;
            const a = Math.floor(Math.random() * maxA) + 5;
            const b = Math.floor(Math.random() * (8 + stage * 4)) + 4;
            questionText = `${a} + ${b} = ?`;
            answer = a + b;
        } else if (r < 0.50) {
            // 2) 빼기 (-) : 항상 양수가 나오도록
            const a = Math.floor(Math.random() * (14 + stage * 5)) + 12;
            const b = Math.floor(Math.random() * (a - 4)) + 3;
            questionText = `${a} - ${b} = ?`;
            answer = a - b;
        } else if (r < 0.75) {
            // 3) 곱하기 (×) : 구구단 범위
            const a = Math.floor(Math.random() * (5 + stage)) + 2;
            const b = Math.floor(Math.random() * 7) + 2;
            questionText = `${a} × ${b} = ?`;
            answer = a * b;
        } else {
            // 4) 나누기 (÷) : 항상 나머지가 0인 깔끔한 나눗셈
            const b = Math.floor(Math.random() * 7) + 2;
            const ans = Math.floor(Math.random() * (5 + stage)) + 2;
            const a = b * ans;
            questionText = `${a} ÷ ${b} = ?`;
            answer = ans;
        }

        // 오답 2개 생성
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
            result: null,
            fadeAlpha: 1.0
        };
    }

    update(dt, gameSpeed, hero, trackManager, callbacks) {
        if (trackManager.stage >= 6) {
            this.activeGate = null;
            return;
        }
        // 스테이지 전환 후 3초 휴식 카운트다운 중에는 연산 게이트 타이머도 함께 대기!
        if (trackManager.stagePauseTimer > 0) {
            return;
        }

        if (!this.activeGate) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer <= 0) {
                trackManager.obstacles = trackManager.obstacles.filter(o => o.z > 0.62);
                this.activeGate = this.generateQuestion(trackManager.stage);
                if (callbacks.onGateSpawn) callbacks.onGateSpawn(this.activeGate);
            }
            return;
        }

        const gate = this.activeGate;
        // 요청 반영: 문제를 통과(resolved)한 직후에는 게이트가 시야를 가리지 않도록 초고속으로 사라짐!
        const approachSpeed = gate.resolved ? 1.85 : (gate.z < 0.75 ? 0.175 : 0.28);
        gate.z += dt * gameSpeed * approachSpeed;

        if (!gate.resolved && gate.z > 0.72) {
            const chosenDoor = gate.doors.find(d => d.lane === hero.currentLane);
            if (chosenDoor && chosenDoor.isCorrect) {
                chosenDoor.openAmount = Math.min(1, chosenDoor.openAmount + dt * 6.5);
            }
        }

        if (!gate.resolved && gate.z >= 0.85) {
            gate.resolved = true;
            // 문 바로 뒤에 숨어있던 기물이 시야 때문에 피하지 못하는 일이 없도록 정리
            trackManager.obstacles = trackManager.obstacles.filter(o => o.z < 0.55 || o.z > 0.98);
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

        if (gate.resolved) {
            gate.fadeAlpha = Math.max(0, (gate.fadeAlpha ?? 1.0) - dt * 8.5);
        }

        gate.doors.forEach(d => {
            if (gate.resolved && d.isCorrect && gate.result === 'correct') {
                d.openAmount = Math.min(1, d.openAmount + dt * 12);
            }
            if (d.shudder > 0) {
                d.shudder = Math.max(0, d.shudder - dt * 5);
            }
        });

        // 문제를 통과하자마자 빠르게 투명해지며 즉시 제거되어 플레이 방해 제로!
        if ((gate.resolved && gate.fadeAlpha <= 0.04) || gate.z > 0.95) {
            this.activeGate = null;
            this.cooldownTimer = 8.43;
        }
    }

    render(ctx, width, height, trackManager) {
        if (!this.activeGate) return;
        const gate = this.activeGate;
        if (gate.resolved && gate.fadeAlpha <= 0.04) return;

        const pCenter = trackManager.project(gate.z, 0, width, height);
        const scale = pCenter.scale;
        const roadW = pCenter.roadW;
        const gateY = pCenter.y;

        ctx.save();
        ctx.globalAlpha = gate.fadeAlpha ?? 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. 3D 입체 문(3D Volumetric Doors) 렌더링
        gate.doors.forEach(door => {
            const pDoor = trackManager.project(gate.z, door.lane, width, height);
            const doorW = (roadW / 3) * 0.90;
            const doorH = 240 * scale;
            const depthX = (-door.lane * 16 + 14) * scale; // 3D 원근 옆면 두께
            const depthY = -18 * scale;                   // 3D 원근 윗면 두께
            const shakeX = door.shudder > 0 ? Math.sin(door.shudder * 45) * 12 * scale : 0;

            ctx.save();
            ctx.translate(pDoor.x + shakeX, gateY);

            const frameTopY = -doorH - 14 * scale;
            const frameW = doorW * 1.08;
            const halfFW = frameW * 0.5;

            ctx.strokeStyle = gate.stage === 5 ? '#00f5d4' : '#1a1612';
            ctx.lineWidth = Math.max(2.5, 4.2 * scale);

            // (A) 3D 석조 문틀 윗면 (Top Face)
            ctx.fillStyle = gate.stage === 5 ? '#5a189a' : '#e6d2ab';
            ctx.beginPath();
            ctx.moveTo(-halfFW, frameTopY);
            ctx.lineTo(-halfFW + depthX, frameTopY + depthY);
            ctx.lineTo(halfFW + depthX, frameTopY + depthY);
            ctx.lineTo(halfFW, frameTopY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // (B) 3D 석조 문틀 옆면 (Side Extrusion Face)
            ctx.fillStyle = gate.stage === 5 ? '#240046' : '#9c8565';
            ctx.beginPath();
            if (depthX >= 0) {
                ctx.moveTo(halfFW, frameTopY);
                ctx.lineTo(halfFW + depthX, frameTopY + depthY);
                ctx.lineTo(halfFW + depthX, depthY);
                ctx.lineTo(halfFW, 0);
            } else {
                ctx.moveTo(-halfFW, frameTopY);
                ctx.lineTo(-halfFW + depthX, frameTopY + depthY);
                ctx.lineTo(-halfFW + depthX, depthY);
                ctx.lineTo(-halfFW, 0);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // (C) 석조 문틀 정면 (Front Face)
            ctx.fillStyle = gate.stage === 5 ? '#3a0ca3' : '#c8b08a';
            ctx.fillRect(-halfFW, frameTopY, frameW, doorH + 14 * scale);
            ctx.strokeRect(-halfFW, frameTopY, frameW, doorH + 14 * scale);

            // 문 안쪽 통로
            ctx.fillStyle = door.openAmount > 0.1 ? '#fff3b0' : '#2b2118';
            ctx.fillRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, doorW * 0.92, doorH);

            // 양쪽 3D 개폐식 문짝
            const halfW = (doorW * 0.46) * (1 - door.openAmount * 0.86);
            ctx.fillStyle = door.shudder > 0 ? '#d64531' : (gate.stage === 5 ? '#7209b7' : '#8d5b3c');
            ctx.fillRect(-doorW * 0.46, -doorH, halfW, doorH);
            ctx.strokeRect(-doorW * 0.46, -doorH, halfW, doorH);

            ctx.fillRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);
            ctx.strokeRect(doorW * 0.46 - halfW, -doorH, halfW, doorH);

            if (door.openAmount < 0.45) {
                const badgeR = Math.max(26, 56 * scale);
                const badgeY = -doorH * 0.55;

                // 3D 입체 명판 두께
                ctx.fillStyle = '#d4a373';
                ctx.beginPath();
                ctx.arc(4 * scale, badgeY + 4 * scale, badgeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#fffcf5';
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.strokeStyle = '#f5cb42';
                ctx.lineWidth = Math.max(2, 4 * scale);
                ctx.beginPath();
                ctx.arc(0, badgeY, badgeR * 0.85, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#1a1612';
                const numFontPx = Math.max(26, Math.round(56 * scale));
                ctx.font = `bold ${numFontPx}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(door.value), 0, badgeY + 2 * scale);

                if (door.shudder > 0) {
                    ctx.fillStyle = '#d64531';
                    ctx.font = `bold ${Math.max(22, Math.round(30 * scale))}px "Gaegu", sans-serif`;
                    ctx.fillText('🔒 오답! 안 열림!', 0, -doorH - 28 * scale);
                }
            } else {
                ctx.fillStyle = '#2a9d8f';
                ctx.font = `bold ${Math.max(22, Math.round(34 * scale))}px "Gaegu", sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText('✨ 정답! 문 열림! ✨', 0, -doorH * 0.55);
            }

            ctx.restore();
        });

        // 2. 3D 게이트 상단 현수막 (3D 두께감 포함)
        const bannerScale = Math.max(0.58, scale);
        const bannerW = Math.max(380, roadW * 1.08);
        const bannerH = 104 * bannerScale;
        const bannerY = gateY - 258 * scale - bannerH;

        ctx.save();
        ctx.translate(pCenter.x, bannerY);

        // 3D 현수막 뒤쪽 입체 박스 두께
        ctx.fillStyle = '#8d5b3c';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5 + 10 * bannerScale, -10 * bannerScale, bannerW, bannerH, 20 * bannerScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fffcf5';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5, 0, bannerW, bannerH, 20 * bannerScale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = gate.stage === 5 ? '#f72585' : '#ffbe0b';
        ctx.beginPath();
        ctx.roundRect(-bannerW * 0.5, 0, bannerW, 24 * bannerScale, [20 * bannerScale, 20 * bannerScale, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a1612';
        const qFontPx = Math.max(30, Math.round(54 * bannerScale));
        ctx.font = `bold ${qFontPx}px "Comic Neue", "Gaegu", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🧮 ${gate.questionText}`, 0, bannerH * 0.62);

        ctx.restore();

        // 3. 화면 상단 중앙 초대형 3D 칠판 보드 렌더링
        if (!gate.resolved && gate.z < 0.86) {
            this.renderGiantTopMathBoard(ctx, width, height, gate);
        }

        ctx.restore();
    }

    renderGiantTopMathBoard(ctx, width, height, gate) {
        ctx.save();
        const boardW = Math.min(width * 0.62, 620);
        const boardH = 118;
        const bx = width * 0.5;
        const by = Math.max(135, height * 0.19);

        ctx.translate(bx, by);

        // 3D 입체 칠판 하단/우측 두께
        ctx.fillStyle = '#5c4938';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-boardW * 0.5 + 8, -boardH * 0.5 + 8, boardW, boardH, 20);
        ctx.fill();
        ctx.stroke();

        // 칠판 본체
        ctx.fillStyle = gate.stage === 5 ? '#240046' : '#1b4332';
        ctx.strokeStyle = '#ffbe0b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(-boardW * 0.5, -boardH * 0.5, boardW, boardH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 상단 단계 배지
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.roundRect(-140, -boardH * 0.5 - 16, 280, 30, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a1612';
        ctx.font = 'bold 19px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🏫 ${gate.stage}단계 사칙연산 문제!`, 0, -boardH * 0.5 - 1);

        // 초대형 문제 수식 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Comic Neue", "Gaegu", sans-serif';
        ctx.fillText(gate.questionText, 0, -8);

        // 하단 3개 문 보기 안내
        const dLeft = gate.doors.find(d => d.lane === -1);
        const dMid = gate.doors.find(d => d.lane === 0);
        const dRight = gate.doors.find(d => d.lane === 1);
        ctx.fillStyle = '#ffea79';
        ctx.font = 'bold 24px "Gaegu", sans-serif';
        ctx.fillText(
            `◀ 왼쪽 문: [ ${dLeft.value} ]     ▲ 가운데 문: [ ${dMid.value} ]     ▶ 오른쪽 문: [ ${dRight.value} ]`,
            0,
            boardH * 0.5 - 20
        );

        ctx.restore();
    }
}
