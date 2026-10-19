/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 1~4 통합] 스누피(피너츠) 스타일 주인공 원숭이 캐릭터 엔진
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 핵심 특징:
 * 1. 기본 자세는 앞으로 도망가는 뒷모습(Back View):
 *    - 복슬복슬한 뒤통수 털 + 정수리 삐죽 털 5가닥 + 양쪽 귀 뒷면
 *    - 노란 시보리 빨간 러닝 탱크톱 등판 (날개 별 백 엠블럼) + 노란 옆줄 파란 반바지
 *    - 엉덩이 중앙에서 S자로 살랑거리며 뻗어 나오는 긴 꼬리
 *    - 뒤로 차올릴 때마다 스니커즈 발바닥의 가로 밑창 줄무늬(Treads)가 선명하게 보임!
 *    - 오른손에 번쩍 들고 뛰는 껍질 벗겨진 황금 바나나!
 * 2. 가끔 뒤를 힐끔 돌아보는 모션 (Look Back Mode):
 *    - 주기적으로(약 4.5초마다) 또는 이벤트(정답 통과, 드래곤 접근, L키) 발생 시
 *      고개와 상체를 뒤로 돌려 M자 이마 + 아치 눈썹 + 점눈 + 보조개 미소 얼굴을 보여줌!
 * 3. 점프(Jump), 슬라이딩(Slide), 부스트(Boost), 충돌 어지러움(Stumble) 액션 완비
 */

class PeanutsMonkeyHero {
    constructor() {
        this.reset();
    }

    reset() {
        this.currentLane = 0; // -1: 좌, 0: 중, 1: 우
        this.laneX = 0;       // 보간된 X (-1 ~ 1)
        this.y = 0;           // 점프 높이 (px)
        this.vy = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;

        // 애니메이션 타이머
        this.time = 0;
        this.runCycle = 0;
        this.blinkTimer = 0;
        this.isBlinking = false;

        // 뒤돌아보기(Look Back) 상태 관리
        this.lookBackTimer = 1.8; // 다음 뒤돌아보기까지 남은 시간
        this.lookBackDuration = 0; // 현재 뒤돌아보는 남은 시간
        this.lookBackBlend = 0;    // 0: 완전 뒷모습, 1: 뒤돌아본 모습 (부드러운 회전 전환)
        this.lookBackMood = 'happy'; // 'happy' | 'scared' | 'proud'

        // 피격(장애물/오답 충돌) 및 부스트, 무적 방패, 슈퍼점프, 레이저총, 손오공 진화 상태
        this.stumbleTimer = 0;
        this.boostTimer = 0;
        this.shieldActive = false;
        this.invincibleTimer = 0; // 방패 아이템 획득 시 기물 무적 타이머 (1.8초)
        this.superJumpTimer = 0;  // 슈퍼점프 아이템 획득 시 초고도 점프 (2.5초)
        this.laserGunTimer = 0;   // 🔫 레이저총 아이템 획득 시 4초간 현재 레인 기물 자동 파괴!
        this.isWukong = false;    // 손오공 진화 여부 (체력 대폭 상승 + 긴고아/여의봉/근두운 장착)
        this.wukongLevel = 0;

        // 톰 골드런 스타일 장애물(경사로/트럭/버스 지붕) 위로 올라가 달리기 높이
        this.platformY = 0;
        this.targetPlatformY = 0;

        // 캐릭터 HP 시스템 (기본 체력 100으로 명확하게 설정! 손오공 진화 시 최대 체력 증가!)
        this.maxHp = 100;
        this.hp = 100;
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
        // 슬라이드 중 점프 입력 시 딜레이 없이 즉시 슬라이드 취소 후 점프 발동!
        if (this.isSliding) {
            this.isSliding = false;
            this.slideTimer = 0;
        }
        // 착지 직전(y < 48)에도 선입력 점프가 즉시 먹히도록 반응성 대폭 개선!
        if (!this.isJumping || this.y < 48) {
            this.isJumping = true;
            // 점프 키를 누른 즉시 높이를 띄우고 강력한 점프력(31.0 / 슈퍼점프 40.0) 부여!
            this.y = Math.max(this.y, 48);
            this.vy = this.superJumpTimer > 0 ? 40.0 : 31.0;
            return true;
        }
        return false;
    }

    slide() {
        if (this.isJumping) {
            // 공중에서 아래 키를 누르면 딜레이 없이 즉시 바닥으로 초고속 착지 후 슬라이딩!
            this.y = Math.min(this.y, 14);
            this.vy = -58;
            this.isJumping = false;
        }
        this.isSliding = true;
        this.slideTimer = 0.58;
        return true;
    }

    // 뒤를 돌아보게 트리거 (mood: 'happy' | 'scared' | 'proud')
    triggerLookBack(duration = 1.4, mood = 'happy') {
        this.lookBackDuration = duration;
        this.lookBackMood = mood;
    }

    triggerStumble() {
        this.stumbleTimer = 1.1;
        this.triggerLookBack(1.1, 'scared');
    }

    triggerBoost(duration = 1.5) {
        this.boostTimer = duration;
        this.triggerLookBack(1.1, 'proud');
    }

    triggerInvincibleShield(duration = 1.8) {
        this.invincibleTimer = duration;
        this.shieldActive = true;
        this.triggerLookBack(1.1, 'proud');
    }

    triggerSuperJump(duration = 2.5) {
        this.superJumpTimer = duration;
        this.triggerLookBack(1.2, 'happy');
    }

    triggerLaserGun(duration = 4.0) {
        this.laserGunTimer = duration;
        this.triggerLookBack(1.2, 'proud');
    }

    triggerWukongEvolution() {
        this.isWukong = true;
        this.wukongLevel++;
        this.maxHp += 30; // 최대 체력 +30 증가!
        this.hp = Math.min(this.maxHp, this.hp + 45); // 체력 대폭 회복!
        this.triggerBoost(1.5);
        this.triggerLookBack(1.4, 'proud');
    }

    update(dt, speedMultiplier = 1.0) {
        this.time += dt;
        const boostFactor = (this.boostTimer > 0 || this.invincibleTimer > 0) ? 1.35 : 1.0;
        this.runCycle += dt * 13.5 * speedMultiplier * boostFactor;

        // 레인 보간 속도를 2배 이상 빠르게(dt * 28) 높여 좌우 이동 반응이 즉각적으로 이루어지게 함!
        this.laneX += (this.currentLane - this.laneX) * Math.min(1, dt * 28);

        // 장애물/트럭 지붕 위(platformY) 즉각적이고 부드러운 등반/하강
        this.platformY += (this.targetPlatformY - this.platformY) * Math.min(1, dt * 22);

        // 초고속 반응 점프 물리
        if (this.isJumping) {
            this.y += this.vy * (dt * 60);
            this.vy -= 1.25 * (dt * 60);
            if (this.y <= 0) {
                this.y = 0;
                this.vy = 0;
                this.isJumping = false;
            }
        }

        // 슬라이딩 타이머
        if (this.isSliding) {
            this.slideTimer -= dt;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
            }
        }

        // 피격 및 부스트, 무적 방패, 슈퍼점프, 레이저총 타이머
        if (this.stumbleTimer > 0) this.stumbleTimer -= dt;
        if (this.boostTimer > 0) this.boostTimer -= dt;
        if (this.superJumpTimer > 0) {
            this.superJumpTimer = Math.max(0, this.superJumpTimer - dt);
        }
        if (this.laserGunTimer > 0) {
            this.laserGunTimer = Math.max(0, this.laserGunTimer - dt);
        }
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.invincibleTimer <= 0) {
                this.invincibleTimer = 0;
                this.shieldActive = false;
            }
        }

        // 가끔 자동으로 뒤를 힐끔 돌아보는 타이머 (기본은 도망가는 뒷모습, 가끔 뒤돌아봄!)
        if (this.lookBackDuration > 0) {
            this.lookBackDuration -= dt;
            this.lookBackBlend += (1 - this.lookBackBlend) * Math.min(1, dt * 10);
        } else {
            this.lookBackBlend += (0 - this.lookBackBlend) * Math.min(1, dt * 8);
            this.lookBackTimer -= dt;
            if (this.lookBackTimer <= 0) {
                // 4.5~7초마다 1.2초간 뒤를 힐끔 돌아봄
                this.lookBackDuration = 1.25;
                this.lookBackMood = Math.random() < 0.65 ? 'happy' : 'scared';
                this.lookBackTimer = 4.5 + Math.random() * 2.8;
            }
        }

        // 눈 깜빡임
        this.blinkTimer += dt;
        if (this.blinkTimer > 3.0) {
            this.isBlinking = true;
            if (this.blinkTimer > 3.16) {
                this.isBlinking = false;
                this.blinkTimer = 0;
            }
        }
    }

    // 펜 해칭(빗금 음영) 헬퍼
    drawHatching(ctx, x1, y1, x2, y2, count, len, angle = -0.6) {
        ctx.save();
        ctx.strokeStyle = 'rgba(28, 22, 18, 0.42)';
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

    /**
     * 메인 캐릭터 렌더링
     */
    render(ctx, centerX, groundY, scale = 1.0, laneSpread = 230) {
        ctx.save();

        const charX = centerX + this.laneX * laneSpread * scale;
        const bounceY = (this.isJumping || this.isSliding) ? 0 : Math.abs(Math.sin(this.runCycle)) * 20;
        const charY = groundY - (this.y + this.platformY + bounceY) * scale;
        const tilt = (this.currentLane - this.laneX) * 0.16 + Math.sin(this.runCycle) * 0.035;

        // 1. 바닥 펜 해칭 그림자
        this.drawGroundShadow(ctx, charX, groundY, scale);

        ctx.translate(charX, charY);
        ctx.scale(scale, scale);
        ctx.rotate(tilt);

        // 슬라이딩 시 몸을 낮추고 기울임
        if (this.isSliding) {
            ctx.translate(0, 42);
            ctx.scale(1.12, 0.62);
        }

        // 피격 시 깜빡임 효과
        if (this.stumbleTimer > 0 && Math.floor(this.stumbleTimer * 16) % 2 === 0) {
            ctx.globalAlpha = 0.72;
        }

        // 부스트 또는 손오공 황금 오라 이펙트
        if (this.boostTimer > 0 || this.isWukong) {
            this.drawBoostAura(ctx);
        }

        const swing = Math.sin(this.runCycle);
        const cosSwing = Math.cos(this.runCycle);
        const isLookingBack = this.lookBackBlend > 0.35;

        // 손오공 진화 시 발밑 황금 근두운(구름) & 등 뒤 여의봉 렌더링
        if (this.isWukong) {
            this.drawWukongNimbusAndStaff(ctx, swing);
        }

        // 슈퍼점프 활성화 시 발밑 스프링 날개 링 이펙트
        if (this.superJumpTimer > 0) {
            this.drawSuperJumpAura(ctx);
        }

        // 🔫 레이저총(4초) 활성화 시 전방 레인을 관통하는 초고열 플라즈마 레이저 빔 & 레이저총 렌더링!
        if (this.laserGunTimer > 0) {
            this.drawLaserGunAndBeam(ctx);
        }

        this.drawLeftArmRunningAway(ctx, swing);
        this.drawRightArmAndBanana(ctx, swing, cosSwing);
        this.drawBackTorsoAndShorts(ctx, swing, isLookingBack);
        this.drawRunningLegsFromBack(ctx, swing, cosSwing);

        if (isLookingBack) {
            // 고개를 휙 돌려 뒤(플레이어/드래곤 쪽)를 돌아보는 스누피 원숭이 얼굴!
            this.drawLookBackHead(ctx, swing, cosSwing);
        } else {
            // 앞을 보고 열심히 도망가는 귀여운 원숭이 뒤통수!
            this.drawBackOfHead(ctx, swing, cosSwing);
        }

        // 손오공 진화 시 머리 위 금테 머리띠(긴고아)와 붉은 봉황 깃털 2가닥!
        if (this.isWukong) {
            this.drawWukongCrown(ctx, swing);
        }

        // 맨 앞(플레이어 쪽)에 위치한 반바지 엉덩이 & S자 꼬리
        this.drawTailFromBack(ctx, swing, cosSwing);

        // 피격 시 머리 위 빙글빙글 별 이펙트
        if (this.stumbleTimer > 0) {
            this.drawDizzyStars(ctx);
        }

        // 보호막(실드) 활성화 시 황금 비눗방울 실드
        if (this.shieldActive) {
            this.drawShieldBubble(ctx);
        }

        // 캐릭터 머리 위 실시간 HP 바 표시
        this.drawFloatingHpBar(ctx);

        ctx.restore();
    }

    drawLaserGunAndBeam(ctx) {
        ctx.save();
        const pulse = Math.sin(this.time * 40) * 6;

        // 1) 전방 지평선까지 뻗어나가는 고출력 플라즈마 레이저 빔
        const beamGrad = ctx.createLinearGradient(0, -195, 0, -980);
        beamGrad.addColorStop(0, 'rgba(255, 0, 110, 0.95)');
        beamGrad.addColorStop(0.5, 'rgba(0, 245, 212, 0.88)');
        beamGrad.addColorStop(1, 'rgba(255, 190, 11, 0.0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-26 - pulse * 0.5, -195);
        ctx.lineTo(-8, -980);
        ctx.lineTo(8, -980);
        ctx.lineTo(26 + pulse * 0.5, -195);
        ctx.closePath();
        ctx.fill();

        // 레이저 중심 화이트 코어
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-9, -195);
        ctx.lineTo(-2, -950);
        ctx.lineTo(2, -950);
        ctx.lineTo(9, -195);
        ctx.closePath();
        ctx.fill();

        // 2) 어깨/팔 옆에 장착된 3D 하이테크 레이저 캐논 총신
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.fillStyle = '#3a86ff';
        ctx.beginPath();
        ctx.roundRect(-88, -225, 36, 62, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff006e';
        ctx.fillRect(-82, -242, 24, 20);
        ctx.strokeRect(-82, -242, 24, 20);

        // 총구 에너지 링
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-70, -246, 16 + pulse * 0.4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawClearHitboxFrame(ctx) {
        ctx.save();
        const isSafe = this.isJumping || this.isSliding || this.shieldActive;
        const boxColor = this.stumbleTimer > 0
            ? '#ff0055'
            : (this.shieldActive ? '#ffbe0b' : (isSafe ? '#06d6a0' : '#00f5d4'));

        // 실제 판정되는 중심 코어 히트박스 영역 (좌우 폭 110, 높이 210)
        const bx = -55;
        const by = -230;
        const bw = 110;
        const bh = 220;
        const cLen = 22;

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';

        // 네 모서리 타겟 브래킷 (시야를 가리지 않으면서 히트박스 경계를 명확히 표시!)
        ctx.beginPath();
        // 좌상단
        ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
        // 우상단
        ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
        // 좌하단
        ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
        // 우하단
        ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
        ctx.stroke();

        ctx.restore();
    }

    drawGroundShadow(ctx, x, y, scale) {
        ctx.save();
        const jumpRatio = Math.max(0.35, 1 - this.y / 320);
        const rx = 86 * scale * jumpRatio;
        const ry = 22 * scale * jumpRatio;

        ctx.translate(x, y + 8 * scale);

        // 🎯 바닥 착지 지점 & 레인 히트박스 링 (언제 점프하고 어느 레인에 있는지 100% 명확하게 표시!)
        const ringCol = this.stumbleTimer > 0
            ? '#ff0055'
            : (this.isJumping ? '#06d6a0' : '#00f5d4');
        ctx.fillStyle = 'rgba(0, 245, 212, 0.16)';
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 74 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(42, 32, 22, 0.24)';
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

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

    // 1. 왼쪽 팔 (도망가며 앞뒤로 힘차게 흔드는 팔)
    drawLeftArmRunningAway(ctx, swing) {
        ctx.save();
        ctx.translate(-46, -212);
        ctx.rotate(swing * 0.52);

        ctx.fillStyle = '#8e5d3e';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(8, -10);
        ctx.quadraticCurveTo(-48, -14, -74, 22);
        // 팔꿈치 복슬복슬 잔털 3가닥
        ctx.lineTo(-86, 28);
        ctx.lineTo(-76, 33);
        ctx.lineTo(-86, 42);
        ctx.lineTo(-76, 46);
        ctx.quadraticCurveTo(-84, 68, -72, 84);
        ctx.lineTo(-50, 78);
        ctx.quadraticCurveTo(-44, 42, -36, 24);
        ctx.quadraticCurveTo(-18, 12, 10, 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawHatching(ctx, -50, 16, -15, 18, 5, 7, -1.2);

        // 왼손 주먹
        ctx.save();
        ctx.translate(-62, 86);
        ctx.fillStyle = '#f6dec2';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    // 2. 오른쪽 팔 + 껍질이 벗겨진 황금 바나나 (오른쪽에 번쩍 들고 도망감!)
    drawRightArmAndBanana(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(44, -210);
        const armWave = Math.sin(this.runCycle * 0.5) * 0.08;
        ctx.rotate(armWave);

        // 오른쪽으로 뻗어 바나나를 치켜든 갈색 털 팔
        ctx.fillStyle = '#8e5d3e';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.quadraticCurveTo(34, 8, 78, -8);
        ctx.lineTo(94, 14);
        // 팔 아래 복슬복슬 잔털
        ctx.lineTo(68, 26);
        ctx.lineTo(74, 32);
        ctx.lineTo(48, 34);
        ctx.lineTo(52, 40);
        ctx.quadraticCurveTo(18, 36, -10, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawHatching(ctx, 18, 22, 65, 18, 6, 7, -1.4);

        // 🍌 껍질 벗겨진 황금 바나나 & 바나나를 감싸 쥔 손
        ctx.save();
        ctx.translate(105, -16);
        ctx.rotate(0.10 - cosSwing * 0.05);

        // 황금 수채화 후광
        const auraGrad = ctx.createRadialGradient(5, -35, 10, 5, -35, 95);
        auraGrad.addColorStop(0, 'rgba(255, 240, 130, 0.58)');
        auraGrad.addColorStop(0.6, 'rgba(255, 230, 100, 0.20)');
        auraGrad.addColorStop(1, 'rgba(255, 230, 100, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(5, -35, 95, 0, Math.PI * 2);
        ctx.fill();

        const peelGrad = ctx.createLinearGradient(-40, -30, 50, 50);
        peelGrad.addColorStop(0, '#fff2a6');
        peelGrad.addColorStop(0.5, '#f6d34b');
        peelGrad.addColorStop(1, '#dfb028');

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;

        // 오른쪽 아래로 크게 휘어진 바나나 껍질
        ctx.fillStyle = peelGrad;
        ctx.beginPath();
        ctx.moveTo(12, -18);
        ctx.bezierCurveTo(52, -32, 68, 12, 54, 52);
        ctx.bezierCurveTo(40, 42, 36, 4, 8, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 왼쪽으로 활짝 젖혀진 바나나 껍질
        ctx.fillStyle = '#fff5b8';
        ctx.beginPath();
        ctx.moveTo(-8, -18);
        ctx.bezierCurveTo(-38, -46, -68, -24, -76, 8);
        ctx.bezierCurveTo(-54, -4, -34, -12, -10, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 위로 솟아오른 크림빛 바나나 알맹이(Fruit Core)
        const fruitGrad = ctx.createLinearGradient(-18, -110, 18, 0);
        fruitGrad.addColorStop(0, '#fffdf2');
        fruitGrad.addColorStop(0.7, '#faecc8');
        fruitGrad.addColorStop(1, '#e8d4a2');
        ctx.fillStyle = fruitGrad;
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(15, -12);
        ctx.bezierCurveTo(22, -58, 12, -102, -6, -115);
        ctx.bezierCurveTo(-22, -108, -22, -56, -12, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 바나나 알맹이 세로 결
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.45)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(2, -16);
        ctx.quadraticCurveTo(4, -64, -5, -105);
        ctx.stroke();

        // 아래쪽 노란 바나나 손잡이 몸통 & 검은 꼭지
        ctx.fillStyle = peelGrad;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(16, -14);
        ctx.quadraticCurveTo(22, 36, -36, 56);
        ctx.lineTo(-42, 48);
        ctx.quadraticCurveTo(-6, 22, -14, -14);
        ctx.quadraticCurveTo(0, -4, 16, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 정면 말려 내려온 앞껍질
        ctx.fillStyle = '#fff5b8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(12, -14);
        ctx.quadraticCurveTo(-2, -32, -18, -22);
        ctx.quadraticCurveTo(-14, -4, 4, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 검은 꼭지
        ctx.fillStyle = '#2a221b';
        ctx.beginPath();
        ctx.arc(-39, 52, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 바나나를 감싸 쥔 오른손가락 4개 + 엄지
        ctx.fillStyle = '#f6dec2';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.ellipse(-18, 6, 11, 16, -0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const fingers = [
            { x: 18, y: 4,  rx: 13, ry: 8.5, rot: 0.45 },
            { x: 13, y: 17, rx: 14, ry: 8.5, rot: 0.45 },
            { x: 6,  y: 29, rx: 13, ry: 8.0, rot: 0.45 },
            { x: -2, y: 40, rx: 11, ry: 7.5, rot: 0.45 }
        ];
        fingers.forEach(f => {
            ctx.beginPath();
            ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // 4각 반짝이 별(✦)
        const sparkles = [
            { x: 68,  y: -52, s: 14, phase: 0 },
            { x: -52, y: -62, s: 11, phase: 1.5 },
            { x: 46,  y: -88, s: 9,  phase: 3.0 },
            { x: 72,  y: 20,  s: 11, phase: 4.2 }
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

    // 3. 몸통 등판 (레이서백 빨간 러닝 탱크톱 등판 + 날개 별 백엠블럼 + 노란 옆줄 파란 반바지)
    drawBackTorsoAndShorts(ctx, swing, isLookingBack) {
        ctx.save();
        ctx.translate(0, -125);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // --- (A) 파란 반바지 뒷모습 (엉덩이 & 양옆 노란 스트라이프) ---
        const shortsGrad = ctx.createLinearGradient(-55, -20, 55, 45);
        shortsGrad.addColorStop(0, '#699bc2');
        shortsGrad.addColorStop(0.6, '#4f7fa6');
        shortsGrad.addColorStop(1, '#3b6487');
        ctx.fillStyle = shortsGrad;

        ctx.beginPath();
        ctx.moveTo(-45, -18);
        ctx.quadraticCurveTo(-68, 5, -62, 42);
        ctx.quadraticCurveTo(-30, 50, -6, 32); // 왼쪽 바짓단 -> 가랑이
        ctx.lineTo(6, 32);
        ctx.quadraticCurveTo(30, 50, 62, 42);  // 오른쪽 바짓단
        ctx.quadraticCurveTo(68, 5, 45, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 양옆 노란 트랙 스트라이프 2줄 (좌/우 옆선 모두 보임!)
        ctx.fillStyle = '#f5cb42';
        ctx.lineWidth = 3;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(side * 42, -16);
            ctx.quadraticCurveTo(side * 58, 8, side * 54, 40);
            ctx.lineTo(side * 62, 38);
            ctx.quadraticCurveTo(side * 66, 8, side * 48, -16);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 엉덩이 중앙 봉제선 & 주름 해칭
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.quadraticCurveTo(swing * 3, 10, 0, 30);
        ctx.stroke();
        this.drawHatching(ctx, -28, 22, 28, 22, 6, 7, 1.5);

        // --- (B) 빨간 러닝 탱크톱 등판 (Back of Red Tank Top) ---
        const shirtGrad = ctx.createRadialGradient(0, -65, 10, 0, -55, 85);
        shirtGrad.addColorStop(0, '#e55942');
        shirtGrad.addColorStop(0.7, '#d1432e');
        shirtGrad.addColorStop(1, '#b53421');
        ctx.fillStyle = shirtGrad;
        ctx.lineWidth = 4.2;

        // 어깨 털이 살짝 보이는 러닝 셔츠 등판 실루엣
        ctx.beginPath();
        ctx.moveTo(-38, -112);
        ctx.quadraticCurveTo(-28, -75, -45, -16);
        ctx.quadraticCurveTo(0, 2, 45, -16);
        ctx.quadraticCurveTo(28, -75, 38, -112);
        ctx.lineTo(24, -112);
        // 등 뒤쪽 라운드 목선 (정면 U넥보다 살짝 높음)
        ctx.quadraticCurveTo(0, -92, -24, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 등판 목선, 진동선, 아랫단 노란색 시보리 파이핑
        ctx.strokeStyle = '#f5cb42';
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(-28, -110);
        ctx.quadraticCurveTo(0, -88, 28, -110);
        ctx.moveTo(-38, -110);
        ctx.quadraticCurveTo(-28, -75, -43, -35);
        ctx.moveTo(38, -110);
        ctx.quadraticCurveTo(28, -75, 43, -35);
        ctx.moveTo(-44, -18);
        ctx.quadraticCurveTo(0, 0, 44, -18);
        ctx.stroke();

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-26, -108);
        ctx.quadraticCurveTo(0, -85, 26, -108);
        ctx.moveTo(-44, -22);
        ctx.quadraticCurveTo(0, -4, 44, -22);
        ctx.stroke();

        // 등판 중앙에도 날개 달린 별 백엠블럼 표시 (뒤돌아볼 때는 몸통도 살짝 비틀림 연출)
        ctx.save();
        ctx.translate(isLookingBack ? 6 : 0, -54);
        [-1, 1].forEach(dir => {
            ctx.save();
            ctx.scale(dir, 1);
            ctx.fillStyle = '#fff5dc';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(15, -5);
            ctx.quadraticCurveTo(36, -18, 42, -12);
            ctx.quadraticCurveTo(36, -3, 26, -1);
            ctx.quadraticCurveTo(36, 1, 38, 5);
            ctx.quadraticCurveTo(30, 10, 22, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
        ctx.fillStyle = '#f5cb42';
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.arc(0, 2, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#65a6cc';
        ctx.beginPath(); ctx.arc(0, 2, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffda44';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const oa = (i * 72 - 90) * Math.PI / 180;
            const ia = ((i * 72 + 36) - 90) * Math.PI / 180;
            if (i === 0) ctx.moveTo(Math.cos(oa) * 12, 2 + Math.sin(oa) * 12);
            else ctx.lineTo(Math.cos(oa) * 12, 2 + Math.sin(oa) * 12);
            ctx.lineTo(Math.cos(ia) * 5, 2 + Math.sin(ia) * 5);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();

        this.drawHatching(ctx, -34, -28, 34, -28, 8, 8, -1.3);
        ctx.restore();
    }

    // 4. 도망갈 때 뒤에서 본 양다리 (차올리는 발은 스니커즈 밑창 가로 줄무늬가 정면으로 보임!)
    drawRunningLegsFromBack(ctx, swing, cosSwing) {
        // 왼쪽 다리(swing > 0일 때 뒤로 차올림) & 오른쪽 다리(swing < 0일 때 뒤로 차올림)
        const legs = [
            { side: -1, x: -34, phase: swing },
            { side: 1,  x: 34,  phase: -swing }
        ];

        // 더 멀리(앞으로) 뻗은 다리를 먼저 그리고, 뒤(카메라 쪽)로 차올린 다리를 나중에 그려 입체감 부여
        legs.sort((a, b) => a.phase - b.phase);

        legs.forEach(leg => {
            ctx.save();
            // phase가 클수록 발을 뒤(위쪽/카메라쪽)로 번쩍 차올린 상태!
            const liftY = leg.phase * 26;
            const scaleKick = 1 + leg.phase * 0.14;
            ctx.translate(leg.x, -92 - liftY * 0.4);
            ctx.scale(scaleKick, scaleKick);
            ctx.rotate(leg.side * 0.08 - leg.phase * 0.12);

            // 갈색 털 다리
            ctx.fillStyle = '#8e5d3e';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(-18, -6);
            ctx.lineTo(-24, 24);
            ctx.lineTo(-18, 28);
            ctx.lineTo(-22, 58);
            ctx.lineTo(20, 58);
            ctx.lineTo(24, 28);
            ctx.lineTo(18, -6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            this.drawHatching(ctx, -14, 10, 14, 10, 4, 8, 1.5);

            // 스니커즈 렌더링
            ctx.save();
            ctx.translate(0, 62 - liftY * 0.5);

            if (leg.phase > 0.05) {
                // 뒤(카메라 쪽)로 차올린 발: 발바닥 가로 밑창 줄무늬(Treads)가 정면으로 쫙 보임!
                // 1) 적갈색 신발 윗부분 & 노란 2줄
                ctx.fillStyle = '#8b3e2f';
                ctx.beginPath();
                ctx.arc(0, -8, 26, Math.PI, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 노란 줄무늬
                ctx.fillStyle = '#f5cb42';
                ctx.lineWidth = 2.5;
                ctx.fillRect(-22, -16, 44, 6);
                ctx.strokeRect(-22, -16, 44, 6);

                // 2) 발바닥 밑창 타원 + 가로 미끄럼방지 줄무늬 7줄!
                ctx.fillStyle = '#f5eedc';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(0, 8, 26, 36, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#c9bba0';
                ctx.lineWidth = 2.8;
                ctx.beginPath();
                ctx.ellipse(0, 8, 20, 29, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 가로 밑창 줄무늬 (Treads)
                ctx.save();
                ctx.beginPath();
                ctx.ellipse(0, 8, 20, 29, 0, 0, Math.PI * 2);
                ctx.clip();
                ctx.strokeStyle = '#1a1612';
                ctx.lineWidth = 2.8;
                for (let ty = -18; ty <= 34; ty += 7.5) {
                    ctx.beginPath();
                    ctx.moveTo(-24, ty);
                    ctx.lineTo(24, ty);
                    ctx.stroke();
                }
                ctx.restore();
            } else {
                // 땅을 딛고 있는 발: 신발 뒤꿈치(Heel)와 노란 옆줄, 하얀 밑창이 보임
                ctx.fillStyle = '#8b3e2f';
                ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.roundRect(-22, -12, 44, 34, 14);
                ctx.fill();
                ctx.stroke();

                // 옆면 노란 2줄
                ctx.fillStyle = '#f5cb42';
                ctx.lineWidth = 2.5;
                ctx.fillRect(-22, -4, 44, 5);
                ctx.strokeRect(-22, -4, 44, 5);
                ctx.fillRect(-22, 4, 44, 5);
                ctx.strokeRect(-22, 4, 44, 5);

                // 두꺼운 하얀 밑창 뒤꿈치
                ctx.fillStyle = '#f5eedc';
                ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.roundRect(-25, 14, 50, 14, 7);
                ctx.fill();
                ctx.stroke();
            }

            ctx.restore();
            ctx.restore();
        });
    }

    // 5-A. 기본 상태: 앞을 보고 신나게 도망가는 원숭이의 귀여운 뒤통수 (Back of Head)
    drawBackOfHead(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(0, -288);
        ctx.scale(1.16, 1.16);
        ctx.rotate(Math.sin(this.runCycle * 0.5) * 0.045);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 양쪽 귀 뒷면 (살구색 귀 테두리와 갈색 귀 뿌리)
        [-92, 92].forEach((ex, idx) => {
            ctx.save();
            ctx.translate(ex, 12);
            ctx.rotate(idx === 0 ? -0.14 : 0.14);
            ctx.fillStyle = '#ebc59e';
            ctx.beginPath();
            ctx.ellipse(0, 0, 27, 39, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 귀 뒤쪽 수채화 음영 및 해칭
            ctx.fillStyle = '#cfa074';
            ctx.beginPath();
            ctx.ellipse(idx === 0 ? 6 : -6, 4, 16, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            this.drawHatching(ctx, -8, 12, 8, 18, 4, 6, 1.2);
            ctx.restore();
        });

        // 복슬복슬한 갈색 털 뒤통수 실루엣 (정수리 삐죽 털 5가닥 + 양볼 옆 잔털 그대로!)
        const backHeadGrad = ctx.createRadialGradient(-20, -35, 15, 0, 10, 115);
        backHeadGrad.addColorStop(0, '#a87452');
        backHeadGrad.addColorStop(0.65, '#8d5b3c');
        backHeadGrad.addColorStop(1, '#6b4025');
        ctx.fillStyle = backHeadGrad;

        ctx.beginPath();
        ctx.moveTo(-88, -15);
        ctx.lineTo(-96, -24);
        ctx.lineTo(-86, -32);
        ctx.quadraticCurveTo(-78, -72, -42, -92);
        // 정수리 트레이드마크 삐죽 털 5가닥!
        ctx.lineTo(-48, -106);
        ctx.lineTo(-28, -98);
        ctx.lineTo(-14, -118);
        ctx.lineTo(2, -104);
        ctx.lineTo(22, -122);
        ctx.lineTo(24, -100);
        ctx.lineTo(48, -108);
        ctx.lineTo(44, -92);
        ctx.quadraticCurveTo(82, -74, 90, -20);
        // 오른쪽 볼 잔털 3가닥
        ctx.lineTo(94, 38);
        ctx.lineTo(104, 48);
        ctx.lineTo(90, 52);
        ctx.lineTo(96, 64);
        ctx.lineTo(80, 66);
        // 목덜미 털 라인 (중간에 귀여운 제비초리 잔털 2가닥)
        ctx.quadraticCurveTo(35, 92, 12, 86);
        ctx.lineTo(4, 96);
        ctx.lineTo(-4, 86);
        ctx.lineTo(-12, 95);
        ctx.quadraticCurveTo(-40, 92, -78, 66);
        // 왼쪽 볼 잔털 3가닥
        ctx.lineTo(-94, 62);
        ctx.lineTo(-86, 52);
        ctx.lineTo(-102, 46);
        ctx.lineTo(-90, 36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 뒤통수 가마(Swirl) 펜선과 피너츠 특유의 털 결 해칭 디테일!
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.55)';
        ctx.lineWidth = 3.0;
        // 정수리 아래 귀여운 소용돌이 가마 선
        ctx.beginPath();
        ctx.arc(6, -36, 18, 0.2, Math.PI * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-10, -24, 28, Math.PI * 0.15, Math.PI * 0.75);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(18, -12, 32, Math.PI * 0.3, Math.PI * 0.85);
        ctx.stroke();

        // 뒤통수 아래쪽 펜 해칭 그늘
        this.drawHatching(ctx, -56, 48, 56, 48, 12, 14, 1.45);
        this.drawHatching(ctx, 48, -68, 76, 15, 8, 11, 2.3);

        ctx.restore();
    }

    // 5-B. 뒤돌아보기 상태 (Look Back): 어깨너머로 고개를 휙 돌려 뒤를 보며 웃거나 놀라는 얼굴!
    drawLookBackHead(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(4, -288);
        ctx.scale(1.16, 1.16);
        ctx.rotate(0.06 + Math.sin(this.runCycle * 0.5) * 0.04);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 왼쪽 귀 & 오른쪽 귀 (귓바퀴 잉크 곡선 포함)
        [-92, 92].forEach((ex, idx) => {
            ctx.save();
            ctx.translate(ex, 12);
            ctx.rotate(idx === 0 ? -0.12 : 0.15);
            ctx.fillStyle = '#f5dcc0';
            ctx.beginPath();
            ctx.ellipse(0, 0, 27, 39, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#dfb995';
            ctx.beginPath();
            ctx.ellipse(idx === 0 ? 3 : -3, 2, 15, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            if (idx === 0) ctx.arc(4, -2, 14, Math.PI * 0.65, Math.PI * 1.85);
            else ctx.arc(-3, -2, 15, -Math.PI * 0.85, Math.PI * 0.35);
            ctx.stroke();
            ctx.restore();
        });

        // 갈색 털 머리 외곽 실루엣
        const headGrad = ctx.createRadialGradient(-20, -40, 15, 0, 0, 115);
        headGrad.addColorStop(0, '#a67250');
        headGrad.addColorStop(0.65, '#8d5b3c');
        headGrad.addColorStop(1, '#704429');
        ctx.fillStyle = headGrad;

        ctx.beginPath();
        ctx.moveTo(-88, -15);
        ctx.lineTo(-96, -24);
        ctx.lineTo(-86, -32);
        ctx.quadraticCurveTo(-78, -72, -42, -92);
        ctx.lineTo(-48, -106);
        ctx.lineTo(-28, -98);
        ctx.lineTo(-14, -118);
        ctx.lineTo(2, -104);
        ctx.lineTo(22, -122);
        ctx.lineTo(24, -100);
        ctx.lineTo(48, -108);
        ctx.lineTo(44, -92);
        ctx.quadraticCurveTo(82, -74, 90, -20);
        ctx.lineTo(94, 38);
        ctx.lineTo(104, 48);
        ctx.lineTo(90, 52);
        ctx.lineTo(96, 64);
        ctx.lineTo(80, 66);
        ctx.quadraticCurveTo(0, 102, -78, 66);
        ctx.lineTo(-94, 62);
        ctx.lineTo(-86, 52);
        ctx.lineTo(-102, 46);
        ctx.lineTo(-90, 36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // M자 이마 + 통통한 양볼 크림베이지 마스크
        const faceGrad = ctx.createRadialGradient(-15, 10, 10, 0, 15, 90);
        faceGrad.addColorStop(0, '#ffefd7');
        faceGrad.addColorStop(0.75, '#f6dec1');
        faceGrad.addColorStop(1, '#e5c49f');
        ctx.fillStyle = faceGrad;
        ctx.lineWidth = 3.8;

        ctx.beginPath();
        ctx.moveTo(-4, -46);
        ctx.bezierCurveTo(18, -76, 62, -62, 60, -14);
        ctx.bezierCurveTo(84, 6, 82, 58, 42, 74);
        ctx.quadraticCurveTo(-2, 88, -46, 72);
        ctx.bezierCurveTo(-84, 56, -82, 6, -60, -14);
        ctx.bezierCurveTo(-62, -62, -22, -76, -4, -46);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawHatching(ctx, -48, -56, -12, -56, 5, 6, -1.5);
        this.drawHatching(ctx, 8, -56, 48, -56, 5, 6, -1.6);

        // 눈썹
        const browOffsetY = this.lookBackMood === 'scared' ? -7 : 0;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.8;
        ctx.beginPath();
        ctx.arc(-34, -22 + browOffsetY, 14, Math.PI * 1.15, Math.PI * 1.82);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(28, -22 + browOffsetY, 14, Math.PI * 1.18, Math.PI * 1.85);
        ctx.stroke();

        // 세로 타원형 점눈
        ctx.fillStyle = '#1a1612';
        [-33, 27].forEach(ex => {
            ctx.beginPath();
            if (this.isBlinking) {
                ctx.lineWidth = 4.5;
                ctx.moveTo(ex - 9, -2);
                ctx.quadraticCurveTo(ex, 3, ex + 9, -2);
                ctx.stroke();
            } else {
                ctx.ellipse(ex, -2, 8.5, 13.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 귀여운 두 콧구멍
        ctx.lineWidth = 3.8;
        ctx.beginPath(); ctx.arc(-8, 17, 5.5, Math.PI * 0.75, Math.PI * 1.95); ctx.stroke();
        ctx.beginPath(); ctx.arc(4, 17, 5.5, -Math.PI * 0.95, Math.PI * 0.25); ctx.stroke();

        // 표정별 입 모양 (기본/자랑스러운 보조개 스마일 vs 드래곤에 놀란 O자 입)
        ctx.lineWidth = 4.4;
        if (this.lookBackMood === 'scared') {
            // "헉! 용이 바로 뒤야!" 놀란 피너츠 물결 입 + 식은땀 한 방울
            ctx.fillStyle = '#b5483a';
            ctx.beginPath();
            ctx.ellipse(-2, 42, 18, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 이마 식은땀 방울
            ctx.fillStyle = '#a8dadc';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-58, -18);
            ctx.quadraticCurveTo(-68, -2, -58, 6);
            ctx.quadraticCurveTo(-48, -2, -58, -18);
            ctx.fill();
            ctx.stroke();
        } else {
            // 활짝 웃는 큰 스마일 입 & 양 끝 보조개 눈금
            ctx.beginPath();
            ctx.moveTo(-46, 30);
            ctx.bezierCurveTo(-28, 58, 22, 58, 42, 30);
            ctx.stroke();

            ctx.lineWidth = 4.0;
            ctx.beginPath();
            ctx.moveTo(-51, 25); ctx.lineTo(-41, 36);
            ctx.moveTo(47, 25);  ctx.lineTo(37, 36);
            ctx.stroke();

            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-2, 54, 14, 0.25, Math.PI - 0.25);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 6. 반바지 엉덩이 중앙에서 뻗어 나와 살랑거리는 S자 긴 꼬리 (뒷모습의 핵심 매력!)
    drawTailFromBack(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(0, -112);
        const tailWag = Math.sin(this.runCycle * 0.65) * 0.14;
        ctx.rotate(tailWag);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawTailCurve = () => {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(-55, 22, -115, -35, -135, -115 + cosSwing * 10);
            ctx.bezierCurveTo(-155, -195, -230, -180, -225, -105 + swing * 12);
            ctx.bezierCurveTo(-222, -68, -192, -52, -184, -72);
        };

        // 검은 잉크 외곽선
        drawTailCurve();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 28;
        ctx.stroke();

        // 갈색 털 본체
        drawTailCurve();
        ctx.strokeStyle = '#8e5d3e';
        ctx.lineWidth = 20;
        ctx.stroke();

        // 꼬리 하이라이트
        drawTailCurve();
        ctx.strokeStyle = '#a67352';
        ctx.lineWidth = 7;
        ctx.stroke();

        // 꼬리 시작점(엉덩이 연결부) 털 해칭
        this.drawHatching(ctx, -35, 8, -85, -15, 5, 7, -1.8);

        ctx.restore();
    }

    // 피격 시 머리 위에서 빙글빙글 도는 만화 별 이펙트
    drawDizzyStars(ctx) {
        ctx.save();
        ctx.translate(0, -430);
        for (let i = 0; i < 3; i++) {
            const ang = this.time * 6 + (i * Math.PI * 2) / 3;
            const sx = Math.cos(ang) * 58;
            const sy = Math.sin(ang) * 16;
            ctx.save();
            ctx.translate(sx, sy);
            ctx.fillStyle = '#ffda44';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let k = 0; k < 5; k++) {
                const oa = (k * 72 - 90) * Math.PI / 180;
                const ia = ((k * 72 + 36) - 90) * Math.PI / 180;
                if (k === 0) ctx.moveTo(Math.cos(oa) * 14, Math.sin(oa) * 14);
                else ctx.lineTo(Math.cos(oa) * 14, Math.sin(oa) * 14);
                ctx.lineTo(Math.cos(ia) * 6, Math.sin(ia) * 6);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    // 부스트 시 캐릭터 주변 만화 스피드 라인 & 황금 오라
    drawBoostAura(ctx) {
        ctx.save();
        ctx.translate(0, -190);
        const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, 210);
        grad.addColorStop(0, 'rgba(255, 230, 90, 0.45)');
        grad.addColorStop(1, 'rgba(255, 230, 90, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 210, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // 🛡️ 특별 무적 방패 오라 (기물에 완전 무적!)
    drawShieldBubble(ctx) {
        ctx.save();
        ctx.translate(0, -195);
        const pulse = 1 + Math.sin(this.time * 10) * 0.05;
        ctx.scale(pulse, pulse);

        ctx.strokeStyle = '#00b4d8';
        ctx.fillStyle = 'rgba(144, 224, 239, 0.28)';
        ctx.lineWidth = 6;
        ctx.setLineDash([16, 10]);
        ctx.lineDashOffset = -this.time * 40;
        ctx.beginPath();
        ctx.arc(0, 0, 205, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 회전하는 4개의 미니 방패 아이콘
        ctx.setLineDash([]);
        for (let i = 0; i < 4; i++) {
            const ang = this.time * 3.5 + (i * Math.PI) / 2;
            const sx = Math.cos(ang) * 205;
            const sy = Math.sin(ang) * 205;
            ctx.font = 'bold 34px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', sx, sy);
        }

        if (this.invincibleTimer > 0) {
            ctx.fillStyle = '#0077b6';
            ctx.strokeStyle = '#fffcf5';
            ctx.lineWidth = 5;
            ctx.font = 'bold 26px "Gaegu", sans-serif';
            const txt = `🛡️ 무적 방패 ${this.invincibleTimer.toFixed(1)}초`;
            ctx.strokeText(txt, 0, -225);
            ctx.fillText(txt, 0, -225);
        }
        ctx.restore();
    }

    // 🚀 슈퍼점프 5초 활성화 시 발밑 탄성 스프링 링 & 날개 효과
    drawSuperJumpAura(ctx) {
        ctx.save();
        ctx.strokeStyle = '#00f5d4';
        ctx.fillStyle = 'rgba(0, 245, 212, 0.25)';
        ctx.lineWidth = 5;
        for (let i = 0; i < 2; i++) {
            const r = 75 + i * 32 + Math.sin(this.time * 12 + i) * 10;
            ctx.beginPath();
            ctx.ellipse(0, -18 - i * 22, r, r * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = '#00bbf9';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.font = 'bold 26px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        const txt = `🚀 슈퍼점프 ${this.superJumpTimer.toFixed(1)}초`;
        ctx.strokeText(txt, 0, -505);
        ctx.fillText(txt, 0, -505);
        ctx.restore();
    }

    // 👑 손오공 진화 1: 발밑 황금 근두운(구름) & 등 뒤 여의봉(Ruyi Jingu Bang)
    drawWukongNimbusAndStaff(ctx, swing) {
        ctx.save();
        // 1) 등 뒤에 대각선으로 메고 있는 붉고 황금빛 나는 여의봉(如意棒)!
        ctx.save();
        ctx.translate(-10, -185);
        ctx.rotate(-0.58 + swing * 0.05);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        // 여의봉 붉은 기둥 본체
        ctx.fillStyle = '#d62828';
        ctx.beginPath();
        ctx.roundRect(-11, -145, 22, 290, 8);
        ctx.fill();
        ctx.stroke();
        // 양끝 황금 테두리 장식
        ctx.fillStyle = '#ffbe0b';
        ctx.fillRect(-13, -145, 26, 42);
        ctx.strokeRect(-13, -145, 26, 42);
        ctx.fillRect(-13, 103, 26, 42);
        ctx.strokeRect(-13, 103, 26, 42);
        ctx.restore();

        // 2) 발밑에 몽글몽글 피어오르는 황금 근두운(Flying Nimbus Cloud)!
        ctx.save();
        ctx.translate(0, -12 + Math.sin(this.time * 8) * 6);
        ctx.fillStyle = '#ffea79';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        const puffs = [
            { x: -75, y: 4, r: 30 },
            { x: -38, y: -6, r: 38 },
            { x: 0,   y: -10, r: 44 },
            { x: 40,  y: -5, r: 36 },
            { x: 75,  y: 5, r: 28 }
        ];
        ctx.beginPath();
        puffs.forEach(pf => {
            ctx.moveTo(pf.x + pf.r, pf.y);
            ctx.arc(pf.x, pf.y, pf.r, 0, Math.PI * 2);
        });
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    // 👑 손오공 진화 2: 머리 위 황금 머리띠(긴고아) & 바람에 휘날리는 붉은 봉황 깃털 2가닥
    drawWukongCrown(ctx, swing) {
        ctx.save();
        ctx.translate(0, -342);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        // 1) 머리 위로 길게 뻗어 휘날리는 붉은 봉황 깃털 2가닥
        [-1, 1].forEach(side => {
            ctx.save();
            const wave = Math.sin(this.time * 9 + side) * 14;
            ctx.strokeStyle = '#e63946';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(side * 16, -24);
            ctx.bezierCurveTo(side * 55, -95, side * 95 + wave, -135, side * 125 + wave, -105);
            ctx.stroke();

            ctx.strokeStyle = '#ffbe0b';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        });

        // 2) 이마/뒤통수를 감싸는 황금 긴고아(Golden Headband)
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.roundRect(-86, -16, 172, 22, 10);
        ctx.fill();
        ctx.stroke();

        // 중앙 V자 황금 문양
        ctx.fillStyle = '#fb5607';
        ctx.beginPath();
        ctx.arc(0, -5, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // 캐릭터 머리 위 대형 고시인성 플로팅 HP 게이지 바 (체력 100 기준 명확한 표시!)
    drawFloatingHpBar(ctx) {
        ctx.save();
        ctx.translate(0, -475);
        const barW = this.isWukong ? 310 : 275;
        const barH = 44;
        const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));

        // 3D 하단 그림자 & 외곽 배경 틀
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-barW * 0.5 + 4, -barH * 0.5 + 5, barW, barH, 12);
        ctx.fill();

        ctx.fillStyle = '#1f1812';
        ctx.strokeStyle = this.isWukong ? '#ffbe0b' : '#ffffff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(-barW * 0.5, -barH * 0.5, barW, barH, 12);
        ctx.fill();
        ctx.stroke();

        let hpColor = '#2a9d8f';
        if (ratio <= 0.30) hpColor = '#e63946';
        else if (ratio <= 0.60) hpColor = '#f5cb42';

        if (ratio > 0) {
            const fillW = (barW - 10) * ratio;
            ctx.fillStyle = hpColor;
            ctx.beginPath();
            ctx.roundRect(-barW * 0.5 + 5, -barH * 0.5 + 5, fillW, barH - 10, 8);
            ctx.fill();

            // 상단 유리 광택 하이라이트
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.beginPath();
            ctx.roundRect(-barW * 0.5 + 7, -barH * 0.5 + 6, Math.max(8, fillW - 4), (barH - 10) * 0.4, 6);
            ctx.fill();
        }

        // 25 / 50 / 75 눈금선 표시
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        [0.25, 0.5, 0.75].forEach(tick => {
            const tx = -barW * 0.5 + 5 + (barW - 10) * tick;
            ctx.beginPath();
            ctx.moveTo(tx, -barH * 0.5 + 5);
            ctx.lineTo(tx, barH * 0.5 - 5);
            ctx.stroke();
        });

        // 큼직하고 선명한 HP 100/100 텍스트
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 5.5;
        ctx.font = 'bold 27px "Comic Neue", "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = this.isWukong ? `👑 HP ${this.hp} / ${this.maxHp}` : `❤️ HP ${this.hp} / ${this.maxHp}`;
        ctx.strokeText(label, 0, 1);
        ctx.fillText(label, 0, 1);

        ctx.restore();
    }
}
