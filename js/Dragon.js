/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 4] 황금 바나나를 뺏긴 드래곤(용) 프롤로그 컷신 & 실시간 추격 시스템
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * 1. 게임 시작 시: 잠자던 드래곤에게서 원숭이가 황금 바나나를 훔쳐 달아나고,
 *    잠에서 깬 드래곤이 불을 뿜으며 추격을 시작하는 피너츠 코믹스 프롤로그 연출!
 * 2. 러닝 중: 플레이어 등 뒤(화면 하단)에서 드래곤이 쫓아오며,
 *    장애물 충돌이나 오답 선택 시 거리가 좁혀져 화염 브레스와 화면 진동(Screen Shake) 발생!
 */

class DragonChaser {
    constructor() {
        this.reset();
    }

    reset() {
        this.distance = 75;        // 0(잡힘) ~ 100(안전 거리)
        this.fireTimer = 0;        // 화염 브레스 연출 타이머
        this.shakeTimer = 0;       // 화면 진동 타이머
        this.shakeIntensity = 0;
        this.time = 0;

        // 프롤로그 타이머 (0 ~ 3.6초 동안 바나나 훔치기 컷신 진행)
        this.prologueTime = 0;
        this.prologueDuration = 3.6;
    }

    // 실수(장애물 충돌 / 문제 오답) 시 드래곤이 바짝 다가오며 불을 뿜음!
    onPlayerMistake(penalty = 28) {
        this.distance = Math.max(0, this.distance - penalty);
        this.fireTimer = 1.5;
        this.shakeTimer = 0.55;
        this.shakeIntensity = 14;
    }

    // 정답을 맞히거나 부스트 획득 시 드래곤을 멀리 따돌림!
    onPlayerSuccess(bonus = 20) {
        this.distance = Math.min(100, this.distance + bonus);
    }

    update(dt) {
        this.time += dt;
        if (this.fireTimer > 0) this.fireTimer -= dt;
        if (this.shakeTimer > 0) this.shakeTimer -= dt;

        // 시간이 지남에 따라 드래곤이 조금씩 추격해 옴 (긴장감 유지)
        this.distance = Math.max(15, this.distance - dt * 1.2);
    }

    getScreenShakeOffset() {
        if (this.shakeTimer <= 0) return { x: 0, y: 0 };
        const s = this.shakeIntensity * (this.shakeTimer / 0.55);
        return {
            x: (Math.random() - 0.5) * s * 2,
            y: (Math.random() - 0.5) * s * 2
        };
    }

    /**
     * [게임 시작 프롤로그] 잠자던 용에게서 원숭이가 황금 바나나를 훔쳐 달아나는 피너츠 만화 컷신!
     */
    renderPrologue(ctx, width, height, hero) {
        const t = this.prologueTime;
        const cx = width * 0.5;
        const cy = height * 0.54;

        // 배경: 고대 드래곤의 보물창고 사원
        const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, width * 0.7);
        bgGrad.addColorStop(0, '#f5e6c8');
        bgGrad.addColorStop(1, '#c9ab7c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. 거대한 스누피 코믹스 스타일 드래곤 그리기 (좌측에 웅크리고 있음)
        const isAwake = t > 1.5;
        const dragonX = cx - 150 + (isAwake ? Math.sin(t * 35) * 6 : 0);
        const dragonY = cy + 65;

        this.drawPeanutsDragon(ctx, dragonX, dragonY, 1.15, isAwake, t);

        // 2. 황금 바나나를 훔쳐 달아나는 원숭이 연출
        const monkeyProgress = Math.min(1, t / 3.2);
        const monkeyX = cx + 40 + monkeyProgress * 220;
        const monkeyY = cy + 95;

        // 컷신 동안 원숭이는 뒤를 돌아보며 신나게 도망감!
        hero.lookBackBlend = 1.0;
        hero.lookBackMood = isAwake ? 'happy' : 'proud';
        hero.runCycle = t * 15;
        hero.render(ctx, monkeyX, monkeyY, 0.72, 0);

        // 3. 상단 코믹스 스토리 캡션 박스
        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(cx - 340, height * 0.14, 680, 96, 22);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1a1612';
        ctx.font = 'bold 28px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        if (!isAwake) {
            ctx.fillText('🍌 쉿! 잠든 드래곤의 보물창고에서 황금 바나나를 훔쳤다!', cx, height * 0.14 + 42);
            ctx.fillStyle = '#5c4938';
            ctx.font = 'bold 22px "Gaegu", sans-serif';
            ctx.fillText('"히히! 세상에서 제일 맛있는 황금 바나나는 이제 내 거야!"', cx, height * 0.14 + 76);
        } else {
            ctx.fillStyle = '#d64531';
            ctx.fillText('🔥 쿠아아앙!! 잠에서 깬 드래곤이 불을 뿜으며 쫓아온다!!', cx, height * 0.14 + 42);
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 22px "Gaegu", sans-serif';
            ctx.fillText('장애물을 피하고 3개의 문 계산 문제를 풀어 드래곤에게서 도망치세요!', cx, height * 0.14 + 76);
        }

        ctx.restore();
    }

    // 피너츠 코믹스 화풍 드래곤 드로잉
    drawPeanutsDragon(ctx, x, y, scale, isAwake, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;

        // 드래곤 날개
        ctx.fillStyle = '#e07a5f';
        ctx.beginPath();
        ctx.moveTo(-40, -140);
        ctx.quadraticCurveTo(-140, -250, -175, -150);
        ctx.quadraticCurveTo(-120, -120, -95, -90);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 드래곤 거대한 초록 몸통
        ctx.fillStyle = '#588157';
        ctx.beginPath();
        ctx.ellipse(-30, -65, 115, 85, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 노란 배 주름
        ctx.fillStyle = '#f6d54a';
        ctx.beginPath();
        ctx.ellipse(-10, -55, 75, 58, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 드래곤 머리 & 큰 주둥이
        ctx.save();
        ctx.translate(45, -145);
        ctx.rotate(isAwake ? -0.12 : 0.22);

        // 황금 뿔 2개
        ctx.fillStyle = '#f5cb42';
        ctx.beginPath();
        ctx.moveTo(-25, -45);
        ctx.quadraticCurveTo(-55, -95, -80, -85);
        ctx.quadraticCurveTo(-55, -55, -5, -40);
        ctx.fill();
        ctx.stroke();

        // 머리통 & 주둥이
        ctx.fillStyle = '#6a994e';
        ctx.beginPath();
        ctx.roundRect(-45, -52, 135, 82, 34);
        ctx.fill();
        ctx.stroke();

        // 콧구멍
        ctx.fillStyle = '#1a1612';
        ctx.beginPath();
        ctx.arc(68, -22, 8, 0, Math.PI * 2);
        ctx.fill();

        if (!isAwake) {
            // 쿨쿨 자는 눈 & Zzz...
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.arc(5, -15, 14, 0.1, Math.PI - 0.1);
            ctx.stroke();

            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 34px "Comic Neue", cursive';
            ctx.fillText('Zzz...', 25, -75 - Math.sin(t * 4) * 8);
        } else {
            // 화가 난 눈 & 입에서 뿜어져 나오는 거대한 불꽃 브레스!
            ctx.fillStyle = '#fffcf5';
            ctx.beginPath();
            ctx.arc(5, -18, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d64531';
            ctx.beginPath();
            ctx.arc(10, -18, 7, 0, Math.PI * 2);
            ctx.fill();

            // 화난 눈썹
            ctx.lineWidth = 5.5;
            ctx.beginPath();
            ctx.moveTo(-14, -38);
            ctx.lineTo(24, -24);
            ctx.stroke();

            // 불꽃 브레스!
            const flameLen = 150 + Math.sin(t * 25) * 35;
            const flameGrad = ctx.createLinearGradient(85, 0, 85 + flameLen, 0);
            flameGrad.addColorStop(0, '#fff3b0');
            flameGrad.addColorStop(0.5, '#ff9f1c');
            flameGrad.addColorStop(1, '#e71d36');
            ctx.fillStyle = flameGrad;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(85, -5);
            ctx.quadraticCurveTo(140, -55, 85 + flameLen, -25);
            ctx.lineTo(75 + flameLen * 0.9, 5);
            ctx.lineTo(90 + flameLen, 32);
            ctx.quadraticCurveTo(140, 45, 85, 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
        ctx.restore();
    }

    /**
     * [인게임 추격 연출] 화면 하단(플레이어 등 뒤)에서 쫓아오는 드래곤의 그림자와 화염 브레스!
     */
    renderInGameChase(ctx, width, height) {
        // 드래곤이 가까울수록(distance가 작을수록) 화면 하단 위로 거대한 주둥이와 불꽃이 올라옴!
        const dangerRatio = Math.max(0, (65 - this.distance) / 65);
        const showFire = this.fireTimer > 0 || dangerRatio > 0.25;

        if (!showFire && dangerRatio <= 0.05) return;

        ctx.save();
        const cx = width * 0.5;
        const popY = height + 30 - (dangerRatio * 95 + (this.fireTimer > 0 ? 55 : 0));

        // 1. 화면 하단 붉은 화염 열기 그라데이션
        const heatGrad = ctx.createLinearGradient(0, height - 180, 0, height);
        heatGrad.addColorStop(0, 'rgba(230, 57, 70, 0)');
        heatGrad.addColorStop(1, `rgba(230, 57, 70, ${0.18 + dangerRatio * 0.35})`);
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, height - 180, width, 180);

        // 2. 양옆에서 솟구치는 만화풍 드래곤 불꽃 (Fire Breath)
        if (this.fireTimer > 0 || dangerRatio > 0.4) {
            [-190, 190].forEach((offsetX, idx) => {
                const fx = cx + offsetX;
                const fy = height - 10;
                const fH = 95 + Math.sin(this.time * 18 + idx) * 28;

                ctx.fillStyle = '#ff9f1c';
                ctx.strokeStyle = '#1a1612';
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.moveTo(fx - 55, fy);
                ctx.quadraticCurveTo(fx - 30, fy - fH, fx, fy - fH * 1.2);
                ctx.quadraticCurveTo(fx + 30, fy - fH, fx + 55, fy);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#fff3b0';
                ctx.beginPath();
                ctx.moveTo(fx - 28, fy);
                ctx.quadraticCurveTo(fx, fy - fH * 0.85, fx + 28, fy);
                ctx.closePath();
                ctx.fill();
            });
        }

        // 3. 하단 중앙에 바짝 따라붙은 드래곤의 뿔과 콧김 뿜는 주둥이 실루엣
        ctx.translate(cx, popY);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;

        // 양쪽 황금 뿔
        ctx.fillStyle = '#f5cb42';
        [-1, 1].forEach(dir => {
            ctx.beginPath();
            ctx.moveTo(dir * 65, 10);
            ctx.quadraticCurveTo(dir * 125, -45, dir * 145, -75);
            ctx.quadraticCurveTo(dir * 95, -20, dir * 35, 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 드래곤 이마 & 사나운 눈
        ctx.fillStyle = '#588157';
        ctx.beginPath();
        ctx.arc(0, 45, 95, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        [-38, 38].forEach(ex => {
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.arc(ex, -6, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d64531';
            ctx.beginPath();
            ctx.arc(ex, -8, 7, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
}
