/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 3 업그레이드] 초대형 가독성 6학년 5단계 연산의 문 (3선지 계산 문제 게이트) 시스템
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 문제가 멀리 있을 때도 한눈에 잘 보이도록:
 *   1) 화면 상단 중앙에 초대형 고정 문제 전광판(Giant HUD Math Board) 동시 표시!
 *   2) 3D 게이트 위 현수막과 각 문의 정답 숫자 크기를 대폭 확대(최소 크기 보정 포함)!
 * - 초등학교 6학년 수준에 맞춘 재미있고 너무 어렵지 않은 단계별(1~5단계) 암산 문제 출제!
 */

class MathGateManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.activeGate = null;
        this.cooldownTimer = 5.5;
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
            // [4단계: 도시(타임스퀘어)] 6학년 소수 계산 & 분수/비율 기초
            if (r < 0.35) {
                const a = Math.floor(Math.random() * 6) + 1;
                const b = Math.floor(Math.random() * 6) + 2;
                questionText = `${a}.5 + ${b}.5 = ?`;
                answer = a + b + 1;
            } else if (r < 0.7) {
                const a = Math.floor(Math.random() * 8) + 2;
                questionText = `0.${a} × 10 = ?`;
                answer = a;
            } else {
                const denom = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
                const mult = Math.floor(Math.random() * 6) + 2;
                const total = denom * mult;
                questionText = `${total} × (1/${denom}) = ?`;
                answer = mult;
            }
        } else {
            // [5단계: 글리치 보이드] 6학년 비와 비율 / 백분율 / 종합 혼합연산
            if (r < 0.35) {
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
                const a = Math.floor(Math.random() * 4) + 2;
                const b = Math.floor(Math.random() * 5) + 3;
                const scale = Math.floor(Math.random() * 3) + 2;
                questionText = `${a} : ${b} = ${a * scale} : ?`;
                answer = b * scale;
            } else {
                const a = Math.floor(Math.random() * 7) + 4;
                const b = Math.floor(Math.random() * 6) + 3;
                const c = Math.floor(Math.random() * 4) + 2;
                questionText = `(${a} + ${b}) × ${c} = ?`;
                answer = (a + b) * c;
            }
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
            result: null
        };
    }

    update(dt, gameSpeed, hero, trackManager, callbacks) {
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
        // 플레이어가 문제를 충분히 읽고 레인을 옮길 수 있도록 게이트 접근 속도를 안정적으로 유지
        const approachSpeed = gate.z < 0.75 ? 0.21 : 0.33;
        gate.z += dt * gameSpeed * approachSpeed;

        if (!gate.resolved && gate.z > 0.74) {
            const chosenDoor = gate.doors.find(d => d.lane === hero.currentLane);
            if (chosenDoor && chosenDoor.isCorrect) {
                chosenDoor.openAmount = Math.min(1, chosenDoor.openAmount + dt * 5.5);
            }
        }

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
            this.cooldownTimer = 6.5;
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

        // 1. 3개의 문 렌더링 (문 숫자가 멀리서도 큼직하게 보이도록 배지 및 폰트 대폭 확대!)
        gate.doors.forEach(door => {
            const pDoor = trackManager.project(gate.z, door.lane, width, height);
            const doorW = (roadW / 3) * 0.90;
            const doorH = 240 * scale;
            const shakeX = door.shudder > 0 ? Math.sin(door.shudder * 45) * 12 * scale : 0;

            ctx.save();
            ctx.translate(pDoor.x + shakeX, gateY);

            // 석조/테마 문틀
            ctx.fillStyle = gate.stage === 5 ? '#3a0ca3' : '#c8b08a';
            ctx.strokeStyle = gate.stage === 5 ? '#00f5d4' : '#1a1612';
            ctx.lineWidth = Math.max(2.5, 4.5 * scale);
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
                // 멀리 있을 때도 문 번호가 잘 보이도록 최소 반지름 26px 보장!
                const badgeR = Math.max(26, 56 * scale);
                const badgeY = -doorH * 0.55;

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

        // 2. 3D 게이트 상단 현수막 (최소 크기를 대폭 키워 멀리서도 큼직하게 보이게 함!)
        const bannerScale = Math.max(0.58, scale);
        const bannerW = Math.max(380, roadW * 1.08);
        const bannerH = 104 * bannerScale;
        const bannerY = gateY - 248 * scale - bannerH;

        ctx.save();
        ctx.translate(pCenter.x, bannerY);

        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
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

        // 3. [핵심 가독성 개선] 게이트가 다가오는 동안 화면 상단 중앙에 초대형 고정 문제 보드(HUD) 추가 렌더링!
        if (!gate.resolved && gate.z < 0.86) {
            this.renderGiantTopMathBoard(ctx, width, height, gate);
        }

        ctx.restore();
    }

    // 멀리서 문이 다가올 때도 문제가 100% 선명하고 크게 보이는 상단 중앙 초대형 칠판!
    renderGiantTopMathBoard(ctx, width, height, gate) {
        ctx.save();
        const boardW = Math.min(width * 0.62, 620);
        const boardH = 118;
        const bx = width * 0.5;
        const by = Math.max(135, height * 0.19);

        ctx.translate(bx, by);

        // 칠판 외곽 황금빛 후광
        ctx.shadowColor = 'rgba(255, 190, 11, 0.65)';
        ctx.shadowBlur = 18;

        // 칠판 본체 (진한 초록/네이비 칠판 + 두꺼운 나무/황금 테두리)
        ctx.fillStyle = gate.stage === 5 ? '#240046' : '#1b4332';
        ctx.strokeStyle = '#ffbe0b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.roundRect(-boardW * 0.5, -boardH * 0.5, boardW, boardH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
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
        ctx.fillText(`🏫 6학년 ${gate.stage}단계 계산 문제!`, 0, -boardH * 0.5 - 1);

        // 초대형 문제 수식 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Comic Neue", "Gaegu", sans-serif';
        ctx.fillText(gate.questionText, 0, -8);

        // 하단 3개 문 보기 안내 (좌 / 중 / 우)
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
