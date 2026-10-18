/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 4 고도화] 고밀도 펜화 & 수채화 디테일의 고대 화염 드래곤 (Ancient Fire Dragon)
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 단순하고 귀여운 도형 용이 아닌, 날카로운 비늘·나선형 거대 뿔·박쥐형 막날개·날카로운 송곳니·
 *   파충류 세로 동공·등줄기 가시·날카로운 발톱·3단 화염 브레스를 갖춘 위압적인 드래곤 일러스트 렌더링!
 * - 프롤로그: 보물 더미 위에서 잠들어 있다가 바나나를 도둑맞고 거대한 화염을 뿜으며 깨어나는 연출
 * - 인게임 추격: 화면 하단에서 양쪽 거대 날개와 날카로운 발톱, 사나운 주둥이와 화염을 뿜으며 추격!
 */

class DragonChaser {
    constructor() {
        this.reset();
    }

    reset() {
        this.distance = 75;        // 0(잡힘) ~ 100(안전 거리)
        this.fireTimer = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.time = 0;

        this.prologueTime = 0;
        this.prologueDuration = 3.8;
    }

    onPlayerMistake(penalty = 28) {
        this.distance = Math.max(0, this.distance - penalty);
        this.fireTimer = 1.6;
        this.shakeTimer = 0.6;
        this.shakeIntensity = 15;
    }

    onPlayerSuccess(bonus = 18) {
        this.distance = Math.min(100, this.distance + bonus);
    }

    update(dt) {
        this.time += dt;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (this.shakeTimer > 0) this.shakeTimer -= dt;
        this.distance = Math.max(15, this.distance - dt * 1.1);
    }

    getScreenShakeOffset() {
        if (this.shakeTimer <= 0) return { x: 0, y: 0 };
        const s = this.shakeIntensity * (this.shakeTimer / 0.6);
        return {
            x: (Math.random() - 0.5) * s * 2,
            y: (Math.random() - 0.5) * s * 2
        };
    }

    // 펜 해칭(빗금 음영) 헬퍼
    drawHatching(ctx, x1, y1, x2, y2, count, len, angle = -0.7) {
        ctx.save();
        ctx.strokeStyle = 'rgba(20, 16, 12, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        for (let i = 0; i <= count; i++) {
            const t = i / count;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 용 비늘(Dragon Scales) 패턴 그리기 헬퍼
    drawScalePatch(ctx, cx, cy, rows, cols, size) {
        ctx.save();
        ctx.strokeStyle = 'rgba(20, 16, 12, 0.5)';
        ctx.lineWidth = 1.8;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const sx = cx + (c - cols / 2) * size + (r % 2) * (size * 0.5);
                const sy = cy + (r - rows / 2) * (size * 0.7);
                ctx.beginPath();
                ctx.arc(sx, sy, size * 0.5, 0.15, Math.PI - 0.15);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    /**
     * [프롤로그 컷신] 스마일 초등학교에서 드래곤이 지키던 황금 바나나를 뺏어 달아나는 원숭이!
     */
    renderPrologue(ctx, width, height, hero) {
        const t = this.prologueTime;
        const cx = width * 0.5;
        const cy = height * 0.56;
        const isAwake = t > 1.5;

        // 1. 스마일 초등학교 운동장 & 하늘 배경 (드래곤이 깨어나면 붉은 노을빛으로 변함)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        if (isAwake) {
            bgGrad.addColorStop(0, '#ff9f1c');
            bgGrad.addColorStop(0.55, '#e76f51');
            bgGrad.addColorStop(1, '#d4a373');
        } else {
            bgGrad.addColorStop(0, '#90e0ef');
            bgGrad.addColorStop(0.55, '#caf0f8');
            bgGrad.addColorStop(1, '#e9c46a');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 학교 운동장 잔디 및 모래 트랙 바닥
        ctx.fillStyle = '#95d5b2';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;
        ctx.fillRect(0, cy + 40, width, height - (cy + 40));
        ctx.beginPath();
        ctx.moveTo(0, cy + 40);
        ctx.lineTo(width, cy + 40);
        ctx.stroke();

        // 2. 배경에 입체(3D) 스마일 초등학교 본관 건물 렌더링!
        ctx.save();
        ctx.translate(cx + 40, cy + 40);
        // 3D 건물 옆면 (입체 두께)
        ctx.fillStyle = '#d8c3a5';
        ctx.beginPath();
        ctx.moveTo(240, -195);
        ctx.lineTo(275, -215);
        ctx.lineTo(275, 0);
        ctx.lineTo(240, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 학교 정면 본관
        ctx.fillStyle = '#f8edeb';
        ctx.fillRect(-240, -195, 480, 195);
        ctx.strokeRect(-240, -195, 480, 195);

        // 3D 지붕
        ctx.fillStyle = '#d64531';
        ctx.beginPath();
        ctx.moveTo(-260, -195);
        ctx.lineTo(0, -270);
        ctx.lineTo(260, -195);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 시계탑 & 학교 현판
        ctx.fillStyle = '#fffcf5';
        ctx.beginPath();
        ctx.arc(0, -225, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a1612';
        ctx.font = 'bold 24px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏫 스마일 초등학교 (급식실 황금 바나나 보관소)', 0, -155);

        // 교실 창문들
        ctx.fillStyle = '#90e0ef';
        [-175, -105, 105, 175].forEach(wx => {
            ctx.fillRect(wx - 22, -125, 44, 48);
            ctx.strokeRect(wx - 22, -125, 44, 48);
        });
        ctx.restore();

        // 3. 학교 운동장 한가운데서 바나나를 지키던 거대 화염 드래곤!
        const dragonShakeX = isAwake ? Math.sin(t * 42) * 5 : 0;
        this.drawDetailedAncientDragon(ctx, cx - 155 + dragonShakeX, cy + 95, 1.08, isAwake, t);

        // 4. 학교에서 황금 바나나를 뺏어 달아나는 원숭이!
        const monkeyProgress = Math.min(1, t / 3.3);
        const monkeyX = cx + 70 + monkeyProgress * 240;
        const monkeyY = cy + 115;

        hero.lookBackBlend = 1.0;
        hero.lookBackMood = isAwake ? 'scared' : 'proud';
        hero.runCycle = t * 16;
        hero.render(ctx, monkeyX, monkeyY, 0.42, 0);

        // 5. 상단 코믹스 스토리 캡션 박스
        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(cx - 360, height * 0.12, 720, 92, 20);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        if (!isAwake) {
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 27px "Gaegu", sans-serif';
            ctx.fillText('🏫 학교에서 드래곤이 지키던 황금 바나나를 뺏었다!', cx, height * 0.12 + 38);
            ctx.fillStyle = '#5c4938';
            ctx.font = 'bold 21px "Gaegu", sans-serif';
            ctx.fillText('"헤헤! 스마일 초등학교에서 바나나를 뺏어 도망치자!"', cx, height * 0.12 + 72);
        } else {
            ctx.fillStyle = '#c1121f';
            ctx.font = 'bold 28px "Gaegu", sans-serif';
            ctx.fillText('🔥 크아아아앙!! 학교를 지키던 드래곤이 불을 뿜으며 쫓아온다!!', cx, height * 0.12 + 38);
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 21px "Gaegu", sans-serif';
            ctx.fillText('장애물을 피하고 사칙연산(+,-,×,÷) 문제를 풀어 도망가세요!', cx, height * 0.12 + 72);
        }

        ctx.restore();
    }

    /**
     * 고밀도 펜화 & 수채화 디테일의 고대 화염 드래곤 (비늘, 박쥐형 거대 날개, 가시, 나선 뿔, 송곳니, 발톱)
     */
    drawDetailedAncientDragon(ctx, x, y, scale, isAwake, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // =====================================================================
        // 1. 거대한 박쥐형 드래곤 날개 (Bat-like Membranous Wings with Bone Struts)
        // =====================================================================
        ctx.save();
        const wingFlap = isAwake ? Math.sin(t * 14) * 0.15 : 0;
        ctx.translate(-35, -135);
        ctx.rotate(-0.15 + wingFlap);

        // 날개막 (진한 붉은 암갈색 그라데이션)
        const wingGrad = ctx.createLinearGradient(-220, -220, 0, 0);
        wingGrad.addColorStop(0, '#6b1d14');
        wingGrad.addColorStop(0.5, '#9e3324');
        wingGrad.addColorStop(1, '#52160e');
        ctx.fillStyle = wingGrad;
        ctx.lineWidth = 4.2;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-85, -180, -210, -215); // 주 날개뼈 능선
        // 날개 끝 3개의 갈퀴(Scalloped wing membrane)
        ctx.quadraticCurveTo(-195, -125, -235, -75);
        ctx.quadraticCurveTo(-155, -70, -165, -15);
        ctx.quadraticCurveTo(-95, -35, -80, 20);
        ctx.quadraticCurveTo(-40, 0, 0, 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 날개 마디 뼈대(Wing finger struts) & 날개 끝 갈고리 발톱
        ctx.strokeStyle = '#2d4730';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-85, -180, -210, -215);
        ctx.stroke();

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        [
            [-135, -145, -235, -75],
            [-105, -115, -165, -15],
            [-65, -75, -80, 20]
        ].forEach(strut => {
            ctx.beginPath();
            ctx.moveTo(strut[0], strut[1]);
            ctx.quadraticCurveTo((strut[0] + strut[2]) * 0.5, strut[1] + 25, strut[2], strut[3]);
            ctx.stroke();
        });

        // 날개막 펜 해칭 음영
        this.drawHatching(ctx, -185, -175, -90, -80, 10, 18, 1.3);
        ctx.restore();

        // =====================================================================
        // 2. 가시 돋친 거대한 꼬리 (Spiked Serpentine Tail)
        // =====================================================================
        ctx.fillStyle = '#38573a';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(-110, -35);
        ctx.bezierCurveTo(-240, -20, -280, -120, -220, -185);
        ctx.bezierCurveTo(-250, -110, -200, 10, -95, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 꼬리 끝 창날 모양 가시(Tail Spade)
        ctx.fillStyle = '#a3261b';
        ctx.beginPath();
        ctx.moveTo(-220, -185);
        ctx.lineTo(-245, -210);
        ctx.lineTo(-210, -225);
        ctx.lineTo(-195, -190);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // =====================================================================
        // 3. 근육질 몸통 & 등줄기 가시 & 황금 갑주 배판 (Armored Body & Spines)
        // =====================================================================
        // 등줄기 날카로운 삼각 가시 6개 (Dorsal Spikes)
        ctx.fillStyle = '#d4a22a';
        for (let i = 0; i < 6; i++) {
            const sx = -135 + i * 32;
            const sy = -118 - Math.sin((i / 5) * Math.PI) * 35;
            ctx.beginPath();
            ctx.moveTo(sx - 14, sy + 18);
            ctx.lineTo(sx - 4, sy - 26);
            ctx.lineTo(sx + 16, sy + 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // 거대한 몸통
        const bodyGrad = ctx.createRadialGradient(-20, -90, 20, -40, -60, 160);
        bodyGrad.addColorStop(0, '#4f7852');
        bodyGrad.addColorStop(0.6, '#365639');
        bodyGrad.addColorStop(1, '#213823');
        ctx.fillStyle = bodyGrad;
        ctx.lineWidth = 4.5;

        ctx.beginPath();
        ctx.moveTo(-155, -20);
        ctx.bezierCurveTo(-165, -135, -35, -165, 45, -120);
        ctx.bezierCurveTo(85, -85, 75, -10, 35, 18);
        ctx.quadraticCurveTo(-60, 32, -155, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 몸통 비늘 패턴 및 해칭 묘사
        this.drawScalePatch(ctx, -65, -85, 4, 6, 22);
        this.drawScalePatch(ctx, -115, -55, 3, 4, 20);
        this.drawHatching(ctx, -145, -15, 25, 12, 16, 16, -1.1);

        // 황금빛 갑주 배판 (Segmented Armored Belly Plates)
        ctx.fillStyle = '#d9b252';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.moveTo(-85, 15);
        ctx.quadraticCurveTo(-10, -85, 58, -88);
        ctx.quadraticCurveTo(75, -30, 32, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 배판 마디 분할 가로줄
        ctx.lineWidth = 3;
        for (let i = 1; i <= 5; i++) {
            const by = 10 - i * 16;
            ctx.beginPath();
            ctx.moveTo(-65 + i * 18, by + 6);
            ctx.quadraticCurveTo(10, by - 8, 52 + (3 - i) * 3, by + 4);
            ctx.stroke();
        }

        // =====================================================================
        // 4. 날카로운 4발톱 앞다리 (Ferocious Dragon Claws)
        // =====================================================================
        ctx.fillStyle = '#365639';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(5, -35);
        ctx.quadraticCurveTo(45, -15, 55, 18);
        ctx.lineTo(15, 22);
        ctx.quadraticCurveTo(-5, 0, -15, -20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 날카로운 상아빛 발톱 3개
        ctx.fillStyle = '#fff5dc';
        [20, 36, 52].forEach(cxPos => {
            ctx.beginPath();
            ctx.moveTo(cxPos - 7, 16);
            ctx.quadraticCurveTo(cxPos + 8, 28, cxPos + 14, 34);
            ctx.quadraticCurveTo(cxPos - 2, 32, cxPos - 10, 22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // =====================================================================
        // 5. 드래곤의 사나운 머리, 나선형 거대 뿔, 날카로운 송곳니 & 3단 불꽃 브레스
        // =====================================================================
        ctx.save();
        ctx.translate(48, -142);
        ctx.rotate(isAwake ? -0.08 : 0.18);

        // (A) 뒤로 길게 뻗은 한 쌍의 나선형 거대 뿔 (Ridged Horns)
        [-12, 4].forEach((hy, idx) => {
            ctx.fillStyle = idx === 0 ? '#b88b28' : '#e0b646';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-18, -32 + hy);
            ctx.bezierCurveTo(-65, -75 + hy, -125, -95 + hy, -155, -75 + hy);
            ctx.bezierCurveTo(-115, -55 + hy, -65, -35 + hy, -5, -12 + hy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 뿔의 마디 주름선
            ctx.lineWidth = 2.5;
            for (let k = 1; k <= 5; k++) {
                const hx = -25 - k * 20;
                const hTop = -36 - k * 8 + hy;
                ctx.beginPath();
                ctx.moveTo(hx, hTop);
                ctx.lineTo(hx + 8, hTop + 18);
                ctx.stroke();
            }
        });

        // (B) 아래턱 (Lower Jaw) - 깨어났을 때 입을 크게 벌려 포효!
        const jawOpen = isAwake ? 0.42 + Math.sin(t * 22) * 0.08 : 0.02;
        ctx.save();
        ctx.translate(10, 5);
        ctx.rotate(jawOpen);

        ctx.fillStyle = '#2d4730';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(105, 8);
        ctx.quadraticCurveTo(95, 34, 45, 32);
        ctx.lineTo(-25, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 턱 밑 날카로운 가시 수염 3개
        ctx.fillStyle = '#d4a22a';
        [15, 45, 75].forEach(bx => {
            ctx.beginPath();
            ctx.moveTo(bx - 8, 28);
            ctx.lineTo(bx - 14, 48);
            ctx.lineTo(bx + 6, 30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 입 안쪽 붉은 구강 & 아래턱 날카로운 송곳니들
        if (isAwake) {
            ctx.fillStyle = '#fff8e7';
            [18, 38, 58, 78, 94].forEach((tx, idx) => {
                const th = idx === 4 ? 22 : 15;
                ctx.beginPath();
                ctx.moveTo(tx - 6, 6);
                ctx.lineTo(tx + 2, 6 - th);
                ctx.lineTo(tx + 7, 7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        }
        ctx.restore();

        // (C) 깨어났을 때 입에서 뿜어져 나오는 압도적인 3단 화염 소용돌이 브레스!
        if (isAwake) {
            ctx.save();
            ctx.translate(95, 8);
            const fWave = Math.sin(t * 28) * 14;

            // 바깥 맹렬한 진홍색 불길
            const outerFire = ctx.createLinearGradient(0, 0, 260, 0);
            outerFire.addColorStop(0, '#ff4d00');
            outerFire.addColorStop(0.6, '#e61919');
            outerFire.addColorStop(1, 'rgba(180, 10, 10, 0)');
            ctx.fillStyle = outerFire;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.5;

            ctx.beginPath();
            ctx.moveTo(-15, -12);
            ctx.bezierCurveTo(60, -75, 160, -85 + fWave, 255, -35 + fWave);
            ctx.lineTo(220, 5);
            ctx.lineTo(265, 45 - fWave);
            ctx.bezierCurveTo(160, 85, 65, 65, -15, 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 중간 주황/황금 불길
            ctx.fillStyle = '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(-10, -8);
            ctx.quadraticCurveTo(85, -48, 195, -15 + fWave * 0.6);
            ctx.lineTo(165, 12);
            ctx.quadraticCurveTo(85, 48, -10, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 코어 백열 불길
            ctx.fillStyle = '#fff9d2';
            ctx.beginPath();
            ctx.moveTo(-5, -4);
            ctx.quadraticCurveTo(55, -22, 125, -2);
            ctx.quadraticCurveTo(55, 22, -5, 6);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // (D) 윗머리 & 각진 용의 주둥이 (Snout & Upper Skull)
        const headGrad = ctx.createLinearGradient(-30, -55, 110, 15);
        headGrad.addColorStop(0, '#4f7852');
        headGrad.addColorStop(1, '#2f4d32');
        ctx.fillStyle = headGrad;
        ctx.lineWidth = 4.4;

        ctx.beginPath();
        ctx.moveTo(-38, 10);
        ctx.lineTo(-42, -32);
        // 눈썹 융기(Brow ridge)
        ctx.lineTo(-5, -52);
        ctx.lineTo(32, -36);
        // 콧잔등 능선과 솟아오른 코끝 뿔(Nasal horn)
        ctx.lineTo(82, -32);
        ctx.lineTo(98, -52); // 코끝 뿔
        ctx.lineTo(106, -28);
        ctx.lineTo(118, -12);
        ctx.lineTo(112, 12);
        ctx.quadraticCurveTo(45, 18, -38, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 윗턱 날카로운 송곳니들 (Upper Fangs)
        ctx.fillStyle = '#fff8e7';
        ctx.lineWidth = 3.2;
        [25, 46, 68, 88, 104].forEach((tx, idx) => {
            const th = (idx === 1 || idx === 4) ? 24 : 15;
            ctx.beginPath();
            ctx.moveTo(tx - 6, 12);
            ctx.lineTo(tx, 12 + th);
            ctx.lineTo(tx + 7, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 콧구멍 & 뿜어져 나오는 연기
        ctx.fillStyle = '#1a1612';
        ctx.beginPath();
        ctx.ellipse(92, -14, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // (E) 눈 (잠든 눈 vs 분노로 이글거리는 황금 파충류 세로 동공!)
        if (!isAwake) {
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(-8, -22);
            ctx.quadraticCurveTo(10, -10, 26, -22);
            ctx.stroke();

            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 30px "Comic Neue", cursive';
            ctx.fillText('Zzz...', 25, -75 - Math.sin(t * 4) * 8);
        } else {
            // 날카롭게 찢어진 황금빛 용의 눈
            ctx.fillStyle = '#ffea00';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.moveTo(-12, -24);
            ctx.quadraticCurveTo(8, -38, 28, -20);
            ctx.quadraticCurveTo(8, -8, -12, -24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 붉은 테두리와 검은 세로 찢어진 동공 (Slit Pupil)
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.ellipse(9, -23, 9, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.ellipse(9, -23, 3.2, 8.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 사납게 찌푸린 눈썹 능선
            ctx.fillStyle = '#a3261b';
            ctx.beginPath();
            ctx.moveTo(-18, -34);
            ctx.lineTo(32, -22);
            ctx.lineTo(28, -32);
            ctx.lineTo(-14, -44);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // 주둥이 비늘 해칭
        this.drawHatching(ctx, 35, -18, 85, -5, 6, 9, 1.2);

        ctx.restore();
        ctx.restore();
    }

    /**
     * [인게임 추격 연출] 화면 하단에서 양쪽 거대 박쥐 날개와 날카로운 발톱, 사나운 용의 머리와 화염 브레스가 추격!
     */
    renderInGameChase(ctx, width, height) {
        const dangerRatio = Math.max(0, (72 - this.distance) / 72);
        const showFire = this.fireTimer > 0 || dangerRatio > 0.2;

        if (!showFire && dangerRatio <= 0.02) return;

        ctx.save();
        const cx = width * 0.5;
        const wingBeat = Math.sin(this.time * 12) * 14;
        const popY = height + 45 - (dangerRatio * 115 + (this.fireTimer > 0 ? 55 : 0));

        // 1. 화면 하단 붉은 화염 열기 그라데이션
        const heatGrad = ctx.createLinearGradient(0, height - 190, 0, height);
        heatGrad.addColorStop(0, 'rgba(214, 40, 40, 0)');
        heatGrad.addColorStop(1, `rgba(214, 40, 40, ${0.22 + dangerRatio * 0.38})`);
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, height - 190, width, 190);

        ctx.translate(cx, popY);
        ctx.strokeStyle = '#1a1612';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 2. 양옆으로 넓게 펼쳐진 드래곤의 거대한 박쥐형 날개 & 날개 발톱!
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.scale(side, 1);
            ctx.fillStyle = '#7a1f16';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(75, 20);
            ctx.quadraticCurveTo(210, -85 + wingBeat, 360, -55 + wingBeat);
            ctx.quadraticCurveTo(310, -5, 290, 35);
            ctx.quadraticCurveTo(220, 5, 195, 45);
            ctx.lineTo(75, 45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 날개 윗능선 뼈대
            ctx.strokeStyle = '#2d4730';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(75, 20);
            ctx.quadraticCurveTo(210, -85 + wingBeat, 360, -55 + wingBeat);
            ctx.stroke();
            ctx.restore();
        });

        // 3. 불꽃 브레스 기둥 (실수했을 때나 가까울 때 맹렬히 솟구침!)
        if (this.fireTimer > 0 || dangerRatio > 0.35) {
            [-145, 0, 145].forEach((fx, idx) => {
                const fH = (idx === 1 ? 135 : 95) + Math.sin(this.time * 22 + idx) * 28;
                ctx.fillStyle = '#e63946';
                ctx.strokeStyle = '#1a1612';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(fx - 52, 5);
                ctx.quadraticCurveTo(fx - 25, -fH * 0.7, fx + Math.sin(this.time * 18 + idx) * 14, -fH);
                ctx.quadraticCurveTo(fx + 25, -fH * 0.7, fx + 52, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#ffbe0b';
                ctx.beginPath();
                ctx.moveTo(fx - 28, 5);
                ctx.quadraticCurveTo(fx, -fH * 0.75, fx + 28, 5);
                ctx.closePath();
                ctx.fill();
            });
        }

        // 4. 화면 아래를 움켜쥐듯 뻗어 나온 드래곤의 양쪽 날카로운 발톱!
        [-130, 130].forEach(clawX => {
            ctx.fillStyle = '#365639';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.arc(clawX, 22, 34, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 날카로운 3개의 상아빛 발톱
            ctx.fillStyle = '#fff5dc';
            [-18, 0, 18].forEach(dx => {
                ctx.beginPath();
                ctx.moveTo(clawX + dx - 7, 12);
                ctx.lineTo(clawX + dx, -22);
                ctx.lineTo(clawX + dx + 7, 12);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        });

        // 5. 중앙에서 이빨을 드러내고 노려보는 사나운 드래곤 머리!
        // 양쪽 거대한 황금 마디 뿔
        [-1, 1].forEach(dir => {
            ctx.fillStyle = '#d4a22a';
            ctx.lineWidth = 4.2;
            ctx.beginPath();
            ctx.moveTo(dir * 52, -5);
            ctx.bezierCurveTo(dir * 115, -45, dir * 155, -85, dir * 175, -115);
            ctx.bezierCurveTo(dir * 135, -45, dir * 95, -10, dir * 38, 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 비늘 돋친 머리통 & 사나운 눈썹 능선
        ctx.fillStyle = '#365639';
        ctx.beginPath();
        ctx.moveTo(-88, 45);
        ctx.lineTo(-72, -25);
        ctx.lineTo(-28, -42);
        ctx.lineTo(0, -28);
        ctx.lineTo(28, -42);
        ctx.lineTo(72, -25);
        ctx.lineTo(88, 45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 이글거리는 파충류 세로 동공 눈 (Slit Dragon Eyes)
        [-38, 38].forEach((ex, idx) => {
            const dir = idx === 0 ? -1 : 1;
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.moveTo(ex - dir * 20, -18);
            ctx.quadraticCurveTo(ex, -32, ex + dir * 18, -10);
            ctx.quadraticCurveTo(ex, 0, ex - dir * 20, -18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 세로로 찢어진 검은 동공
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(ex, -16, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.ellipse(ex, -16, 2.8, 7.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 붉은 분노 눈썹
            ctx.fillStyle = '#a3261b';
            ctx.beginPath();
            ctx.moveTo(ex - dir * 24, -26);
            ctx.lineTo(ex + dir * 20, -12);
            ctx.lineTo(ex + dir * 18, -20);
            ctx.lineTo(ex - dir * 20, -34);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 콧구멍 & 송곳니가 솟은 주둥이
        ctx.fillStyle = '#fff8e7';
        [-45, -24, 24, 45].forEach(fx => {
            ctx.beginPath();
            ctx.moveTo(fx - 6, 25);
            ctx.lineTo(fx, 2);
            ctx.lineTo(fx + 6, 25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }
}
