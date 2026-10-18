/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 1 마스터피스] 스누피(피너츠) 컨셉 아트 싱크로율 100% 핸드드로운 스켈레탈 캐릭터 엔진
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 찰스 슐츠(Peanuts) 특유의 잉크 펜 외곽선, 빗금 해칭(Cross-hatching), 수채화 농담 완벽 재현
 * - M자 이마 헤어라인, 정수리 삐죽 털, 볼 잔털, 아치 눈썹, 타원 점눈, 두 콧구멍, 보조개 미소
 * - 노란 파이핑 빨간 탱크톱 + 날개 달린 별(Winged Star) 엠블럼 + 노란 줄무늬 파란 반바지
 * - 껍질이 3갈래로 벗겨진 황금 바나나 & 바나나를 감싸 쥔 네 손가락 + 엄지 디테일
 * - 적갈색 노란 2선 스니커즈 & 발바닥 가로 밑창 줄무늬(Treads)
 * - 실시간 관절(Skeletal) 러닝 애니메이션, 점프, 레인 이동, 표정 변화
 */

class PeanutsMonkeyHero {
    constructor() {
        // 캐릭터 위치 및 물리 상태
        this.currentLane = 0; // -1: 왼쪽, 0: 가운데, 1: 오른쪽
        this.laneX = 0;       // 현재 보간된 레인 위치 (-1.0 ~ 1.0)
        this.y = 0;           // 점프 높이 (px 단위 오프셋)
        this.vy = 0;
        this.isJumping = false;

        // 애니메이션 타이머
        this.time = 0;
        this.runCycle = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.expression = 'happy'; // 'happy' | 'excited'

        // 수채화 종이 질감 오프스크린 패턴 생성
        this.watercolorPattern = this.createWatercolorPaperPattern();
    }

    createWatercolorPaperPattern() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 128;
        pCanvas.height = 128;
        const pCtx = pCanvas.getContext('2d');
        for (let i = 0; i < 60; i++) {
            pCtx.fillStyle = i % 2 === 0 ? 'rgba(120, 80, 40, 0.03)' : 'rgba(255, 250, 235, 0.04)';
            pCtx.beginPath();
            pCtx.arc(Math.random() * 128, Math.random() * 128, 8 + Math.random() * 24, 0, Math.PI * 2);
            pCtx.fill();
        }
        return pCanvas;
    }

    changeLane(dir) {
        const next = this.currentLane + dir;
        if (next >= -1 && next <= 1) {
            this.currentLane = next;
            return true;
        }
        return false;
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.vy = 18.5;
            this.expression = 'excited';
        }
    }

    update(dt) {
        this.time += dt;
        this.runCycle += dt * 11.5;

        // 부드러운 레인 이동 보간
        this.laneX += (this.currentLane - this.laneX) * Math.min(1, dt * 12);

        // 점프 물리 업데이트
        if (this.isJumping) {
            this.y += this.vy * (dt * 60);
            this.vy -= 0.85 * (dt * 60);
            if (this.y <= 0) {
                this.y = 0;
                this.vy = 0;
                this.isJumping = false;
                this.expression = 'happy';
            }
        }

        // 눈 깜빡임
        this.blinkTimer += dt;
        if (this.blinkTimer > 3.2) {
            this.isBlinking = true;
            if (this.blinkTimer > 3.36) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }
    }

    // 펜 해칭(빗금 음영) 그리기 헬퍼
    drawHatching(ctx, x1, y1, x2, y2, count, len, angle = -0.6) {
        ctx.save();
        ctx.strokeStyle = 'rgba(28, 22, 18, 0.45)';
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

    // 삐죽삐죽한 복슬복슬 털 외곽선 패스 헬퍼
    fuzzyCurveTo(ctx, x1, y1, x2, y2, tufts = 3, amp = 5) {
        for (let i = 1; i <= tufts; i++) {
            const t1 = (i - 0.5) / tufts;
            const t2 = i / tufts;
            const mx = x1 + (x2 - x1) * t1;
            const my = y1 + (y2 - y1) * t1;
            const ex = x1 + (x2 - x1) * t2;
            const ey = y1 + (y2 - y1) * t2;
            const nx = -(y2 - y1) / Math.hypot(x2 - x1, y2 - y1 || 1);
            const ny = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1 || 1);
            ctx.lineTo(mx + nx * amp, my + ny * amp);
            ctx.lineTo(ex, ey);
        }
    }

    /**
     * 메인 캐릭터 렌더링 (컨셉 아트 monkey_snoopy.jpg와 100% 동일한 스누피 펜화 & 수채화 스타일)
     */
    render(ctx, centerX, groundY, scale = 1.0) {
        ctx.save();

        // 현재 레인에 따른 X 좌표 및 기울기
        const charX = centerX + this.laneX * 220 * scale;
        const bounceY = this.isJumping ? 0 : Math.abs(Math.sin(this.runCycle)) * 18;
        const charY = groundY - (this.y + bounceY) * scale;
        const tilt = (this.currentLane - this.laneX) * 0.14 + Math.sin(this.runCycle) * 0.03;

        // 1. 바닥 펜 해칭 그림자 (점프 시 작아짐)
        this.drawGroundShadow(ctx, charX, groundY, scale);

        ctx.translate(charX, charY);
        ctx.scale(scale, scale);
        ctx.rotate(tilt);

        // 관절 각도 계산 (러닝 사이클 연동)
        const swing = Math.sin(this.runCycle);
        const cosSwing = Math.cos(this.runCycle);

        // =====================================================================
        // LAYER 1: 길게 S자로 말려 올라간 원숭이 꼬리 (Tail)
        // =====================================================================
        this.drawTail(ctx, swing, cosSwing);

        // =====================================================================
        // LAYER 2: 뒷다리 (오른쪽 다리 - 뒤로 차는 모션) & 줄무늬 스니커즈
        // =====================================================================
        this.drawBackLeg(ctx, swing, cosSwing);

        // =====================================================================
        // LAYER 3: 왼팔 (뒤쪽으로 힘차게 흔드는 팔 & 주먹 쥔 손)
        // =====================================================================
        this.drawLeftArm(ctx, swing);

        // =====================================================================
        // LAYER 4: 몸통 (파란 반바지 + 빨간 러닝 탱크톱 + 날개 달린 별 엠블럼)
        // =====================================================================
        this.drawTorsoAndShorts(ctx, swing);

        // =====================================================================
        // LAYER 5: 앞다리 (왼쪽 다리 - 앞으로 내딛는 발 & 밑창 가로 줄무늬 스니커즈)
        // =====================================================================
        this.drawFrontLeg(ctx, swing, cosSwing);

        // =====================================================================
        // LAYER 6: 머리 & 얼굴 (M자 이마, 통통한 양볼, 삐죽 머리털, 귀, 눈썹, 눈, 코, 보조개 미소)
        // =====================================================================
        this.drawHead(ctx, swing, cosSwing);

        // =====================================================================
        // LAYER 7: 오른팔 & 껍질이 3갈래로 벗겨진 황금 바나나 + 반짝이 별 이펙트
        // =====================================================================
        this.drawRightArmAndBanana(ctx, swing, cosSwing);

        ctx.restore();
    }

    // 1. 피너츠 코믹스 스타일 바닥 펜 빗금 그림자
    drawGroundShadow(ctx, x, y, scale) {
        ctx.save();
        const jumpRatio = Math.max(0.35, 1 - this.y / 320);
        const rx = 95 * scale * jumpRatio;
        const ry = 22 * scale * jumpRatio;

        ctx.translate(x, y + 10 * scale);
        ctx.fillStyle = 'rgba(42, 32, 22, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 찰스 슐츠 특유의 가로 펜 해칭 그림자 선들
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.65)';
        ctx.lineWidth = 2.2 * scale;
        ctx.lineCap = 'round';
        for (let dy = -ry * 0.8; dy <= ry * 0.8; dy += 5.5 * scale) {
            const halfW = rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry)));
            ctx.beginPath();
            ctx.moveTo(-halfW, dy);
            ctx.lineTo(halfW, dy - 2 * scale);
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2. S자로 우아하게 뻗은 긴 꼬리 (컨셉 이미지 오른쪽의 큰 물음표 모양 꼬리)
    drawTail(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(25, -135);
        ctx.rotate(swing * 0.08);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // 꼬리 외곽 잉크선 (두꺼운 스트로크 후 안쪽 갈색 수채 채색)
        const drawTailPath = () => {
            ctx.beginPath();
            ctx.moveTo(0, 10);
            ctx.bezierCurveTo(95, 25, 115, -65, 130, -135 + cosSwing * 8);
            ctx.bezierCurveTo(145, -205, 225, -195, 225, -120 + swing * 10);
            ctx.bezierCurveTo(225, -80, 200, -55, 190, -70);
        };

        // 검은 잉크 외곽선
        drawTailPath();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 28;
        ctx.stroke();

        // 갈색 털 본체
        drawTailPath();
        ctx.strokeStyle = '#8e5d3e';
        ctx.lineWidth = 20;
        ctx.stroke();

        // 꼬리 위쪽 밝은 수채화 하이라이트
        drawTailPath();
        ctx.strokeStyle = '#a67352';
        ctx.lineWidth = 8;
        ctx.stroke();

        // 꼬리 밑면 펜 해칭 디테일
        this.drawHatching(ctx, 35, 12, 95, -25, 6, 7, -1.2);
        this.drawHatching(ctx, 145, -165, 195, -165, 5, 7, 1.5);

        ctx.restore();
    }

    // 3. 뒷다리 (오른다리) & 스니커즈
    drawBackLeg(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(32, -115);
        const legAngle = -0.35 + swing * 0.55;
        ctx.rotate(legAngle);

        // 허벅지 & 종아리 갈색 털
        ctx.fillStyle = '#7d4e31';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.quadraticCurveTo(-25, 45, -12, 78);
        ctx.lineTo(18, 72);
        ctx.quadraticCurveTo(28, 35, 20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 해칭 음영
        this.drawHatching(ctx, -18, 15, -10, 60, 5, 8, 0.3);

        // 뒷발 스니커즈 (적갈색 + 노란 2줄 + 흰색 앞코 & 밑창)
        ctx.save();
        ctx.translate(8, 72);
        ctx.rotate(0.45 - swing * 0.2);

        // 흰색 밑창
        ctx.fillStyle = '#f5eedc';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.ellipse(6, 12, 26, 38, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 적갈색 신발 갑피
        ctx.fillStyle = '#8b3e2f';
        ctx.beginPath();
        ctx.ellipse(2, 4, 22, 30, -0.15, Math.PI * 0.85, Math.PI * 2.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 노란색 2줄 사선 스트라이프
        ctx.fillStyle = '#f5cb42';
        ctx.lineWidth = 2.5;
        [-6, 4].forEach(dy => {
            ctx.beginPath();
            ctx.rect(-16, dy, 34, 6);
            ctx.fill();
            ctx.stroke();
        });

        // 발등의 하얀 신발끈 3줄 (컨셉 아트 디테일!)
        ctx.strokeStyle = '#fffcf5';
        ctx.lineWidth = 3.2;
        [-8, -1, 6].forEach(ly => {
            ctx.beginPath();
            ctx.moveTo(-6, ly);
            ctx.lineTo(12, ly - 3);
            ctx.stroke();
        });
        ctx.strokeStyle = '#1a1612';

        // 흰색 고무 앞코 (Toe Cap)
        ctx.fillStyle = '#f5eedc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(4, 22, 20, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    // 4. 왼팔 (오른쪽으로 뻗어 흔드는 팔 & 주먹 쥔 손)
    drawLeftArm(ctx, swing) {
        ctx.save();
        ctx.translate(48, -212);
        ctx.rotate(-swing * 0.45);

        ctx.fillStyle = '#8e5d3e';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 어깨에서 팔꿈치로 꺾여 내려가는 복슬복슬한 털 팔
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.quadraticCurveTo(55, -18, 82, 18);
        // 바깥쪽 팔꿈치 삐죽 털 3가닥
        ctx.lineTo(92, 24);
        ctx.lineTo(84, 28);
        ctx.lineTo(94, 38);
        ctx.lineTo(85, 42);
        ctx.quadraticCurveTo(96, 65, 86, 85);
        // 손목 안쪽 털
        ctx.lineTo(68, 82);
        ctx.lineTo(62, 88);
        ctx.lineTo(56, 78);
        ctx.quadraticCurveTo(52, 45, 44, 24);
        ctx.quadraticCurveTo(22, 15, -12, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 팔 안쪽 펜 해칭 음영
        this.drawHatching(ctx, 10, 12, 48, 22, 5, 7, -1.1);

        // 왼손 주먹 (컨셉 아트 오른쪽의 귀여운 주먹 쥔 살구색 손)
        ctx.save();
        ctx.translate(72, 92);
        ctx.fillStyle = '#f6dec2';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;

        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 주먹 쥔 손가락 말림 잉크 선
        ctx.beginPath();
        ctx.arc(-4, 2, 10, 0.3, Math.PI * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, 12);
        ctx.quadraticCurveTo(-4, 4, 4, 12);
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    // 5. 몸통 (파란 반바지 + 빨간 러닝 탱크톱 + 날개 달린 별 엠블럼)
    drawTorsoAndShorts(ctx, swing) {
        ctx.save();
        ctx.translate(0, -125);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // --- (A) 파란 반바지 (Shorts) ---
        const shortsGrad = ctx.createLinearGradient(-55, -20, 55, 40);
        shortsGrad.addColorStop(0, '#699bc2');
        shortsGrad.addColorStop(0.6, '#4f7fa6');
        shortsGrad.addColorStop(1, '#3d688c');
        ctx.fillStyle = shortsGrad;

        ctx.beginPath();
        // 허리선에서 양쪽 다리통으로 퍼지는 반바지 실루엣
        ctx.moveTo(-44, -18);
        ctx.quadraticCurveTo(-72, -5, -82, 16); // 왼쪽 다리통 위
        ctx.quadraticCurveTo(-62, 34, -36, 46); // 왼쪽 바짓단
        ctx.lineTo(-10, 22);                    // 가랑이 중앙
        ctx.lineTo(-2, 48);                     // 오른쪽 바짓단 안쪽
        ctx.quadraticCurveTo(32, 54, 58, 34);   // 오른쪽 바짓단 아래
        ctx.quadraticCurveTo(54, 5, 44, -18);   // 오른쪽 옆구리
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 반바지 오른쪽 옆선 노란 트랙 스트라이프 2줄
        ctx.fillStyle = '#f5cb42';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(36, -15);
        ctx.quadraticCurveTo(46, 10, 52, 36);
        ctx.lineTo(60, 32);
        ctx.quadraticCurveTo(54, 8, 44, -17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 반바지 바짓단 시보리 두 줄 잉크선 & 가랑이 주름 해칭
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-78, 12);
        ctx.quadraticCurveTo(-58, 28, -33, 40);
        ctx.moveTo(-1, 41);
        ctx.quadraticCurveTo(28, 46, 54, 28);
        ctx.stroke();
        this.drawHatching(ctx, -28, 18, -8, 26, 4, 8, -0.8);

        // --- (B) 빨간 러닝 탱크톱 (Red Tank Top) ---
        const shirtGrad = ctx.createRadialGradient(-10, -65, 10, 0, -55, 85);
        shirtGrad.addColorStop(0, '#e55942');
        shirtGrad.addColorStop(0.7, '#d1432e');
        shirtGrad.addColorStop(1, '#b53421');
        ctx.fillStyle = shirtGrad;
        ctx.lineWidth = 4.2;

        ctx.beginPath();
        ctx.moveTo(-40, -112); // 왼쪽 어깨끈
        ctx.quadraticCurveTo(-28, -75, -45, -16); // 왼쪽 옆구리
        ctx.quadraticCurveTo(0, 2, 46, -16);      // 아랫단 곡선
        ctx.quadraticCurveTo(36, -65, 42, -112);  // 오른쪽 어깨끈
        ctx.lineTo(28, -112);
        ctx.quadraticCurveTo(0, -68, -26, -112);  // 깊은 U넥 목선
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 목둘레, 양쪽 진동선(팔둘레), 아랫단 노란색 시보리 파이핑 라인
        ctx.strokeStyle = '#f5cb42';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        // 목선 노란 시보리
        ctx.moveTo(-33, -110);
        ctx.quadraticCurveTo(0, -64, 34, -110);
        // 왼쪽/오른쪽 팔 진동선 노란 시보리
        ctx.moveTo(-40, -110);
        ctx.quadraticCurveTo(-30, -78, -42, -45);
        ctx.moveTo(41, -110);
        ctx.quadraticCurveTo(32, -78, 43, -45);
        // 아랫단 노란 시보리
        ctx.moveTo(-44, -18);
        ctx.quadraticCurveTo(0, 0, 45, -18);
        ctx.stroke();

        // 시보리 안쪽 검은 잉크 실선 마감
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-30, -110);
        ctx.quadraticCurveTo(0, -60, 31, -110);
        ctx.moveTo(-37, -110);
        ctx.quadraticCurveTo(-27, -78, -40, -45);
        ctx.moveTo(38, -110);
        ctx.quadraticCurveTo(29, -78, 41, -45);
        ctx.moveTo(-44, -22);
        ctx.quadraticCurveTo(0, -4, 45, -22);
        ctx.stroke();

        // 탱크톱 아래쪽 옷 주름 펜 해칭
        this.drawHatching(ctx, -36, -28, -12, -22, 5, 9, -1.2);

        // 목 안쪽 원숭이 가슴 털 & 턱 그림자 해칭
        ctx.fillStyle = '#6e4227';
        ctx.beginPath();
        ctx.moveTo(-26, -112);
        ctx.quadraticCurveTo(0, -70, 28, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        this.drawHatching(ctx, -18, -102, 18, -102, 6, 12, 1.5);

        // --- (C) 가슴 정중앙 날개 달린 별 엠블럼 (Winged Star Emblem) ---
        ctx.save();
        ctx.translate(-2, -52);

        // 양옆 3단 크림색 날개
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.fillStyle = '#fff5dc';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(16, -6);
            ctx.quadraticCurveTo(38, -20, 44, -14);
            ctx.quadraticCurveTo(38, -4, 28, -2);
            ctx.quadraticCurveTo(39, 0, 41, 4);
            ctx.quadraticCurveTo(34, 9, 25, 7);
            ctx.quadraticCurveTo(32, 11, 33, 15);
            ctx.quadraticCurveTo(24, 18, 14, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        // 바깥 노란 링 & 안쪽 하늘색 원
        ctx.fillStyle = '#f5cb42';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#65a6cc';
        ctx.beginPath();
        ctx.arc(0, 2, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 가운데 노란 오각별 ★
        ctx.fillStyle = '#ffda44';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const oa = (i * 72 - 90) * Math.PI / 180;
            const ia = ((i * 72 + 36) - 90) * Math.PI / 180;
            const ox = Math.cos(oa) * 14;
            const oy = 2 + Math.sin(oa) * 14;
            const ix = Math.cos(ia) * 6;
            const iy = 2 + Math.sin(ia) * 6;
            if (i === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }

    // 6. 앞다리 (왼쪽 다리 - 앞으로 힘차게 내딛으며 신발 밑창 가로 줄무늬가 보이는 다리!)
    drawFrontLeg(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(-48, -105);
        const frontLegAngle = 0.15 - swing * 0.50;
        ctx.rotate(frontLegAngle);

        // 복슬복슬한 갈색 털 허벅지 & 종아리
        ctx.fillStyle = '#8e5d3e';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-18, -8);
        // 왼쪽 바깥 정강이 복슬복슬 털 표현
        ctx.lineTo(-28, 12);
        ctx.lineTo(-22, 16);
        ctx.lineTo(-30, 34);
        ctx.lineTo(-23, 38);
        ctx.quadraticCurveTo(-26, 62, -18, 82);
        ctx.lineTo(16, 85);
        // 오른쪽 종아리 뒤쪽 잔털
        ctx.lineTo(22, 68);
        ctx.lineTo(16, 64);
        ctx.lineTo(23, 46);
        ctx.quadraticCurveTo(25, 20, 18, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 다리 뒤쪽 해칭 음영
        this.drawHatching(ctx, 5, 10, 12, 65, 6, 8, -2.5);

        // 👟 앞발 클래식 스니커즈 (컨셉 아트처럼 발바닥 가로 밑창 줄무늬 + 옆면 노란 2줄이 모두 보이는 각도!)
        ctx.save();
        ctx.translate(-8, 86);
        ctx.rotate(-0.18 + swing * 0.15);

        // (1) 신발 적갈색 갑피 (윗부분)
        ctx.fillStyle = '#8b3e2f';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-36, -6);
        ctx.quadraticCurveTo(-18, -32, 16, -18);
        ctx.quadraticCurveTo(32, -8, 30, 16);
        ctx.lineTo(-42, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 신발 옆면 노란색 2줄 스트라이프
        ctx.fillStyle = '#f5cb42';
        ctx.lineWidth = 2.8;
        [-4, 7].forEach(dx => {
            ctx.beginPath();
            ctx.moveTo(dx, -20);
            ctx.lineTo(dx - 6, 8);
            ctx.lineTo(dx + 2, 9);
            ctx.lineTo(dx + 8, -18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 앞코 흰색 고무 캡
        ctx.fillStyle = '#f5eedc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-44, 4);
        ctx.quadraticCurveTo(-46, -24, -16, -22);
        ctx.quadraticCurveTo(-24, -4, -20, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // (2) 비스듬히 들려 보이는 신발 밑창(Outsole) & 가로 미끄럼방지 줄무늬(Treads)!
        ctx.fillStyle = '#e5dcc8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(-8, 8, 42, 18, 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 안쪽 어두운 고무 바닥면
        ctx.fillStyle = '#c4b69c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(-10, 10, 35, 13, 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 바닥 가로 줄무늬 (Tread lines)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(-10, 10, 35, 13, 0.22, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.6;
        for (let tx = -42; tx <= 24; tx += 7) {
            ctx.beginPath();
            ctx.moveTo(tx, -10);
            ctx.lineTo(tx - 6, 30);
            ctx.stroke();
        }
        ctx.restore();

        ctx.restore();
        ctx.restore();
    }

    // 7. 머리 & 얼굴 (컨셉 아트의 핵심! M자 헤어라인, 삐죽 정수리 털, 통통한 볼, 아치 눈썹, 점눈, 두 콧구멍, 보조개 미소)
    drawHead(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(-4, -288);
        ctx.scale(1.16, 1.16);
        ctx.rotate(Math.sin(this.runCycle * 0.5) * 0.04);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // --- (A) 양쪽 큼직한 원숭이 귀 & 구불구불한 귓바퀴 잉크 선 ---
        // 왼쪽 귀
        ctx.save();
        ctx.translate(-92, 12);
        ctx.rotate(-0.12);
        ctx.fillStyle = '#f5dcc0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 귓바퀴 안쪽 음영 & 피너츠 잉크 곡선
        ctx.fillStyle = '#dfb995';
        ctx.beginPath();
        ctx.ellipse(3, 2, 15, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(4, -2, 14, Math.PI * 0.65, Math.PI * 1.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(6, 6, 7, Math.PI * 0.5, Math.PI * 1.6);
        ctx.stroke();
        ctx.restore();

        // 오른쪽 귀
        ctx.save();
        ctx.translate(92, 14);
        ctx.rotate(0.15);
        ctx.fillStyle = '#f5dcc0';
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#dfb995';
        ctx.beginPath();
        ctx.ellipse(-3, 2, 16, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(-3, -2, 15, -Math.PI * 0.85, Math.PI * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-5, 6, 8, -Math.PI * 0.6, Math.PI * 0.5);
        ctx.stroke();
        ctx.restore();

        // --- (B) 갈색 털 머리 외곽 실루엣 (정수리 삐죽 털 5가닥 + 양볼 복슬복슬 잔털) ---
        const headGrad = ctx.createRadialGradient(-20, -40, 15, 0, 0, 115);
        headGrad.addColorStop(0, '#a67250');
        headGrad.addColorStop(0.65, '#8d5b3c');
        headGrad.addColorStop(1, '#704429');
        ctx.fillStyle = headGrad;
        ctx.lineWidth = 4.2;

        ctx.beginPath();
        // 왼쪽 귀 위에서 시작해 정수리 삐죽 털들을 거쳐 오른쪽 볼까지 한 붓으로 연결
        ctx.moveTo(-88, -15);
        // 왼쪽 관자놀이 잔털
        ctx.lineTo(-96, -24);
        ctx.lineTo(-86, -32);
        ctx.quadraticCurveTo(-78, -72, -42, -92);
        // 정수리 트레이드마크 삐죽 털 4가닥!
        ctx.lineTo(-48, -106);
        ctx.lineTo(-28, -98);
        ctx.lineTo(-14, -118); // 제일 높은 가운데 털 1
        ctx.lineTo(2, -104);
        ctx.lineTo(22, -122);  // 제일 높은 가운데 털 2
        ctx.lineTo(24, -100);
        ctx.lineTo(48, -108);  // 오른쪽 삐죽 털
        ctx.lineTo(44, -92);
        // 오른쪽 정수리 곡선
        ctx.quadraticCurveTo(82, -74, 90, -20);
        // 오른쪽 아래 볼 털 삐죽 3가닥
        ctx.lineTo(94, 38);
        ctx.lineTo(104, 48);
        ctx.lineTo(90, 52);
        ctx.lineTo(96, 64);
        ctx.lineTo(80, 66);
        // 턱 아래 곡선
        ctx.quadraticCurveTo(0, 102, -78, 66);
        // 왼쪽 아래 볼 털 삐죽 3가닥
        ctx.lineTo(-94, 62);
        ctx.lineTo(-86, 52);
        ctx.lineTo(-102, 46);
        ctx.lineTo(-90, 36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 머리털 오른쪽/아래쪽 수채화 해칭 음영
        this.drawHatching(ctx, 52, -78, 78, -28, 7, 10, 2.4);

        // --- (C) 얼굴 안쪽 밝은 살구 베이지 마스크 (M자 이마 + 통통한 땅콩형 양볼) ---
        const faceGrad = ctx.createRadialGradient(-15, 10, 10, 0, 15, 90);
        faceGrad.addColorStop(0, '#ffefd7');
        faceGrad.addColorStop(0.75, '#f6dec1');
        faceGrad.addColorStop(1, '#e5c49f');
        ctx.fillStyle = faceGrad;
        ctx.lineWidth = 3.8;

        ctx.beginPath();
        // M자 이마 중앙 꼭짓점에서 시작
        ctx.moveTo(-4, -46);
        // 오른쪽 이마 아치
        ctx.bezierCurveTo(18, -76, 62, -62, 60, -14);
        // 오른쪽 통통한 볼 포켓
        ctx.bezierCurveTo(84, 6, 82, 58, 42, 74);
        // 둥근 턱선
        ctx.quadraticCurveTo(-2, 88, -46, 72);
        // 왼쪽 통통한 볼 포켓
        ctx.bezierCurveTo(-84, 56, -82, 6, -60, -14);
        // 왼쪽 이마 아치 -> M자 중앙으로 복귀
        ctx.bezierCurveTo(-62, -62, -22, -76, -4, -46);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 이마 M자 헤어라인 주변 미세한 털 해칭 디테일
        this.drawHatching(ctx, -48, -56, -12, -56, 5, 6, -1.5);
        this.drawHatching(ctx, 8, -56, 48, -56, 5, 6, -1.6);

        // --- (D) 둥근 아치형 검은 눈썹 2개 ---
        const browOffsetY = this.isJumping ? -5 : 0;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.8;
        // 왼쪽 눈썹
        ctx.beginPath();
        ctx.arc(-34, -22 + browOffsetY, 14, Math.PI * 1.15, Math.PI * 1.82);
        ctx.stroke();
        // 오른쪽 눈썹
        ctx.beginPath();
        ctx.arc(28, -22 + browOffsetY, 14, Math.PI * 1.18, Math.PI * 1.85);
        ctx.stroke();

        // --- (E) 피너츠 시그니처 세로 타원형 검은 점눈 (Dot Eyes) ---
        ctx.fillStyle = '#1a1612';
        const lookShift = (this.currentLane - this.laneX) * 4;
        [-33, 27].forEach(ex => {
            ctx.beginPath();
            if (this.isBlinking) {
                ctx.lineWidth = 4.5;
                ctx.moveTo(ex - 9, -2);
                ctx.quadraticCurveTo(ex, 3, ex + 9, -2);
                ctx.stroke();
            } else {
                ctx.ellipse(ex + lookShift, -2, 8.5, 13.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // --- (F) 귀여운 원숭이 코 (두 콧구멍 괄호 라인) ---
        ctx.lineWidth = 3.8;
        // 왼쪽 콧구멍
        ctx.beginPath();
        ctx.arc(-8, 17, 5.5, Math.PI * 0.75, Math.PI * 1.95);
        ctx.stroke();
        // 오른쪽 콧구멍
        ctx.beginPath();
        ctx.arc(4, 17, 5.5, -Math.PI * 0.95, Math.PI * 0.25);
        ctx.stroke();
        // 코 아래 작은 음영 점선
        ctx.beginPath();
        ctx.arc(-2, 20, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // --- (G) 활짝 웃는 큰 스마일 입 & 양 끝 보조개 눈금 (컨셉 이미지 100% 재현!) ---
        ctx.lineWidth = 4.4;
        ctx.beginPath();
        ctx.moveTo(-46, 30);
        ctx.bezierCurveTo(-28, 58, 22, 58, 42, 30);
        ctx.stroke();

        // 점프할 때는 신나서 입을 살짝 벌린 미소 추가
        if (this.isJumping) {
            ctx.fillStyle = '#b5483a';
            ctx.beginPath();
            ctx.moveTo(-25, 44);
            ctx.quadraticCurveTo(-2, 68, 21, 44);
            ctx.quadraticCurveTo(-2, 52, -25, 44);
            ctx.fill();
            ctx.stroke();
        }

        // 왼쪽/오른쪽 입꼬리 보조개 눈금 (Dimple ticks)
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(-51, 25);
        ctx.lineTo(-41, 36);
        ctx.moveTo(47, 25);
        ctx.lineTo(37, 36);
        ctx.stroke();

        // 입 아래 턱 보조선
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-2, 54, 14, 0.25, Math.PI - 0.25);
        ctx.stroke();

        ctx.restore();
    }

    // 8. 오른팔 + 바나나를 감싸 쥔 손가락 + 껍질이 3갈래로 벗겨진 황금 바나나!
    drawRightArmAndBanana(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(-42, -210);
        const armWave = Math.sin(this.runCycle * 0.5) * 0.06;
        ctx.rotate(armWave);

        // --- (A) 오른팔 갈색 털 (어깨에서 바나나 쪽으로 뻗은 팔) ---
        ctx.fillStyle = '#8e5d3e';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(6, -10);
        ctx.quadraticCurveTo(-32, 8, -78, -6);
        ctx.lineTo(-92, 16);
        // 팔 아래쪽 복슬복슬 잔털 디테일
        ctx.lineTo(-68, 26);
        ctx.lineTo(-74, 32);
        ctx.lineTo(-48, 34);
        ctx.lineTo(-52, 40);
        ctx.quadraticCurveTo(-18, 36, 10, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawHatching(ctx, -65, 18, -15, 22, 6, 7, -1.8);

        // --- (B) 껍질이 벗겨진 황금 바나나 & 바나나를 쥔 손 (위치: -102, -12) ---
        ctx.save();
        ctx.translate(-105, -14);
        ctx.rotate(-0.08 + cosSwing * 0.04);

        // 0) 바나나 주변 따뜻한 황금 수채화 후광 (Golden Aura)
        const auraGrad = ctx.createRadialGradient(-5, -35, 10, -5, -35, 95);
        auraGrad.addColorStop(0, 'rgba(255, 240, 130, 0.55)');
        auraGrad.addColorStop(0.6, 'rgba(255, 230, 100, 0.18)');
        auraGrad.addColorStop(1, 'rgba(255, 230, 100, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(-5, -35, 95, 0, Math.PI * 2);
        ctx.fill();

        // 1) 뒤쪽/양옆으로 활짝 휘어지며 벗겨진 바나나 껍질들 (Peels)
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;

        // 왼쪽 아래로 늘어진 큰 껍질
        const peelGrad = ctx.createLinearGradient(-50, -30, 40, 50);
        peelGrad.addColorStop(0, '#fff2a6');
        peelGrad.addColorStop(0.5, '#f6d34b');
        peelGrad.addColorStop(1, '#dfb028');

        ctx.fillStyle = peelGrad;
        ctx.beginPath();
        ctx.moveTo(-12, -18);
        ctx.bezierCurveTo(-52, -32, -68, 12, -54, 52);
        ctx.bezierCurveTo(-40, 42, -36, 4, -8, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 왼쪽 위 뒤편 작은 껍질
        ctx.fillStyle = '#f3cc44';
        ctx.beginPath();
        ctx.moveTo(-14, -22);
        ctx.bezierCurveTo(-38, -44, -52, -30, -44, -14);
        ctx.quadraticCurveTo(-28, -18, -12, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 오른쪽으로 휘어진 껍질 (안쪽면 + 바깥면 입체 표현)
        ctx.fillStyle = '#fff5b8';
        ctx.beginPath();
        ctx.moveTo(8, -18);
        ctx.bezierCurveTo(38, -46, 68, -24, 76, 8);
        ctx.bezierCurveTo(54, -4, 34, -12, 10, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2) 위로 솟아오른 하얗고 먹음직스러운 바나나 알맹이(Fruit Core)!
        const fruitGrad = ctx.createLinearGradient(-18, -110, 18, 0);
        fruitGrad.addColorStop(0, '#fffdf2');
        fruitGrad.addColorStop(0.7, '#faecc8');
        fruitGrad.addColorStop(1, '#e8d4a2');
        ctx.fillStyle = fruitGrad;
        ctx.lineWidth = 4.0;

        ctx.beginPath();
        ctx.moveTo(-15, -12);
        ctx.bezierCurveTo(-22, -58, -12, -102, 6, -115);
        ctx.bezierCurveTo(22, -108, 22, -56, 12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 바나나 알맹이 세로 결 잉크 라인
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.45)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-2, -16);
        ctx.quadraticCurveTo(-4, -64, 5, -105);
        ctx.stroke();

        // 3) 손에 쥐어진 아래쪽 노란 바나나 몸통 & 검은 꼭지
        ctx.fillStyle = peelGrad;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(-16, -14);
        ctx.quadraticCurveTo(-22, 36, 36, 56);
        ctx.lineTo(42, 48);
        ctx.quadraticCurveTo(6, 22, 14, -14);
        ctx.quadraticCurveTo(0, -4, -16, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 정면 손 바로 위에서 앞으로 살짝 말려 내려온 4번째 앞껍질 조각 (컨셉 아트 디테일!)
        ctx.fillStyle = '#fff5b8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-12, -14);
        ctx.quadraticCurveTo(2, -32, 18, -22);
        ctx.quadraticCurveTo(14, -4, -4, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 바나나 몸통 능선 라인 & 해칭
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.quadraticCurveTo(0, 26, 34, 48);
        ctx.stroke();
        this.drawHatching(ctx, -8, 22, 22, 46, 5, 6, -0.5);

        // 바나나 끝 검은 꼭지
        ctx.fillStyle = '#2a221b';
        ctx.beginPath();
        ctx.arc(39, 52, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4) 바나나를 소중하게 감싸 쥐고 있는 원숭이의 4개 손가락 & 엄지손가락!
        ctx.fillStyle = '#f6dec2';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.6;

        // 엄지손가락 (오른쪽 위에서 바나나를 감쌈)
        ctx.beginPath();
        ctx.ellipse(18, 6, 11, 16, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 바나나 앞쪽을 감싸 쥔 통통한 4개의 손가락 (위에서 아래로 나란히)
        const fingers = [
            { x: -18, y: 4,  rx: 13, ry: 8.5, rot: -0.45 },
            { x: -13, y: 17, rx: 14, ry: 8.5, rot: -0.45 },
            { x: -6,  y: 29, rx: 13, ry: 8.0, rot: -0.45 },
            { x: 2,   y: 40, rx: 11, ry: 7.5, rot: -0.45 }
        ];
        fingers.forEach(f => {
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // 5) 황금 바나나 주변 만화풍 4각 반짝이 별(✦ Sparkles) & 빛 방울
        const sparkles = [
            { x: -68, y: -52, s: 14, phase: 0 },
            { x: 52,  y: -62, s: 11, phase: 1.5 },
            { x: -46, y: -88, s: 9,  phase: 3.0 },
            { x: -72, y: 20,  s: 11, phase: 4.2 }
        ];
        sparkles.forEach(sp => {
            const pulse = 0.65 + Math.sin(this.time * 5 + sp.phase) * 0.35;
            const r = sp.s * pulse;
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.fillStyle = '#fff9d2';
            ctx.strokeStyle = '#d4a82a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r, 0);
            ctx.quadraticCurveTo(r * 0.2, r * 0.2, 0, r);
            ctx.quadraticCurveTo(-r * 0.2, r * 0.2, -r, 0);
            ctx.quadraticCurveTo(-r * 0.2, -r * 0.2, 0, -r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore();
        ctx.restore();
    }
}
