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
        this.characterType = 'frog'; // 'frog' (개구리) | 'tiger' (호랑이) | 'penguin' (펭귄) | 'monkey' (원숭이)
        this.costumeType = 'gentleman'; // 'gentleman' (신사복) | 'santa' (산타 복장) | 'none' (기본)
        this.reset();
    }

    setCharacterType(type) {
        if (['frog', 'tiger', 'penguin', 'monkey'].includes(type)) {
            this.characterType = type;
        }
    }

    setCostumeType(costume) {
        if (['gentleman', 'santa', 'none'].includes(costume)) {
            this.costumeType = costume;
        }
    }

    getSpeciesColors() {
        switch (this.characterType) {
            case 'frog':
                return {
                    skin: '#52b788',
                    skinLight: '#74c69d',
                    skinDark: '#2d6a4f',
                    belly: '#d8f3dc',
                    hasFur: false
                };
            case 'tiger':
                return {
                    skin: '#ff9e00',
                    skinLight: '#ffbe0b',
                    skinDark: '#c1121f',
                    belly: '#fff8f0',
                    stripes: '#14110f',
                    pads: '#ff5d8f',
                    hasFur: true
                };
            case 'penguin':
                return {
                    skin: '#1d3557',
                    skinLight: '#457b9d',
                    skinDark: '#0d1b2a',
                    belly: '#fffcf5',
                    beak: '#ffb703',
                    feet: '#fb8500',
                    hasFur: false
                };
            case 'monkey':
            default:
                return {
                    skin: '#8e5d3e',
                    skinLight: '#a87452',
                    skinDark: '#6b4025',
                    belly: '#f6dec2',
                    hasFur: true
                };
        }
    }

    reset() {
        this.currentLane = 0; // -2, -1: 좌, 0: 중, 1, 2: 우
        this.laneX = 0;       // 보간된 X (-2 ~ 2)
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
        if (next >= -2 && next <= 2) {
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
            // 점프 키를 누른 즉시 높이를 띄우고 긴 체공 시간(중력 0.88)으로 먼 거리를 날아가는 긴 점프력 부여!
            this.y = Math.max(this.y, 48);
            this.vy = this.superJumpTimer > 0 ? 35.0 : 26.5;
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

        // 먼 거리를 웅장하게 도약하는 롱 점프(체공 시간 증가 & 점프 거리 대폭 확장)
        if (this.isJumping) {
            this.y += this.vy * (dt * 60);
            this.vy -= 0.88 * (dt * 60);
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

        // 🐾 선택된 캐릭터 종(개구리, 호랑이, 펭귄, 원숭이)별 머리 렌더링
        if (this.characterType === 'frog') {
            this.drawFrogHead(ctx, swing, cosSwing, isLookingBack);
        } else if (this.characterType === 'tiger') {
            this.drawTigerHead(ctx, swing, cosSwing, isLookingBack);
        } else if (this.characterType === 'penguin') {
            this.drawPenguinHead(ctx, swing, cosSwing, isLookingBack);
        } else {
            if (isLookingBack) {
                this.drawLookBackHead(ctx, swing, cosSwing);
            } else {
                this.drawBackOfHead(ctx, swing, cosSwing);
            }
        }

        // 🎩 선택된 특별 의상 모자 (신사복 실크햇 / 산타 모자)
        if (this.costumeType === 'gentleman') {
            this.drawGentlemanTopHat(ctx, swing, isLookingBack);
        } else if (this.costumeType === 'santa') {
            this.drawSantaHat(ctx, swing, isLookingBack);
        }

        // 손오공 진화 시 머리 위 금테 머리띠(긴고아)와 붉은 봉황 깃털 2가닥!
        if (this.isWukong) {
            this.drawWukongCrown(ctx, swing);
        }

        // 맨 앞(플레이어 쪽)에 위치한 꼬리 (개구리는 꼬리 없음, 펭귄은 꼬리 날개, 호랑이는 줄무늬 꼬리, 원숭이는 S자 꼬리)
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
        const jumpRatio = Math.max(0.25, 1 - this.y / 460);
        const rx = 84 * scale * jumpRatio;
        const ry = 22 * scale * jumpRatio;
        const shadowAlpha = Math.max(0.12, 0.48 * jumpRatio);

        ctx.translate(x, y + 8 * scale);

        // 부드럽고 사실적인 원근 3D 바닥 그림자 그라데이션
        const shadowGrad = ctx.createRadialGradient(0, 0, 4 * scale, 0, 0, rx);
        shadowGrad.addColorStop(0, `rgba(20, 16, 12, ${shadowAlpha})`);
        shadowGrad.addColorStop(0.7, `rgba(20, 16, 12, ${shadowAlpha * 0.55})`);
        shadowGrad.addColorStop(1, 'rgba(20, 16, 12, 0)');

        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 1. 왼쪽 팔 (도망가며 앞뒤로 힘차게 흔드는 팔)
    drawLeftArmRunningAway(ctx, swing) {
        ctx.save();
        ctx.translate(-46, -212);
        ctx.rotate(swing * 0.52);

        const colors = this.getSpeciesColors();
        const armColor = this.costumeType === 'gentleman' ? '#1e2229' : (this.costumeType === 'santa' ? '#d62828' : colors.skin);
        const handColor = this.costumeType === 'gentleman' ? '#fffcf5' : (this.costumeType === 'santa' ? '#fffcf5' : colors.belly);

        ctx.fillStyle = armColor;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(8, -10);
        ctx.quadraticCurveTo(-48, -14, -74, 22);
        // 팔꿈치 복슬복슬 잔털 3가닥 (털이 있는 종족 또는 의상)
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

        // 왼손 주먹 (신사복은 하얀 예식 장갑, 산타는 뽀송한 흰 장갑, 동물은 배/손바닥 색)
        ctx.save();
        ctx.translate(-62, 86);
        ctx.fillStyle = handColor;
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 🐯 호랑이 전용 팔 디테일 (고품격 호랑이 줄무늬 & 손목 솜털 & 핑크 젤리 발바닥)
        if (this.characterType === 'tiger' && this.costumeType === 'none') {
            ctx.fillStyle = '#14110f';
            // 팔뚝 날렵한 줄무늬 2줄
            ctx.beginPath();
            ctx.moveTo(-45, 10); ctx.lineTo(-68, 22); ctx.lineTo(-42, 22); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-52, 42); ctx.lineTo(-74, 52); ctx.lineTo(-48, 50); ctx.closePath(); ctx.fill();

            // 손목 복슬복슬 흰 털 밴드
            ctx.fillStyle = '#fff8f0';
            ctx.beginPath();
            ctx.ellipse(-56, 73, 14, 7, -0.35, 0, Math.PI * 2);
            ctx.fill();

            // 앙증맞은 핑크 젤리 발바닥 패드
            ctx.save();
            ctx.translate(-62, 86);
            ctx.fillStyle = '#ff5d8f';
            ctx.beginPath();
            ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
            ctx.fill();
            [-8, 0, 8].forEach(ox => {
                ctx.beginPath();
                ctx.arc(ox, -10, 3.2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        ctx.restore();
    }

    // 2. 오른쪽 팔 + 껍질이 벗겨진 황금 바나나 (오른쪽에 번쩍 들고 도망감!)
    drawRightArmAndBanana(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(44, -210);
        const armWave = Math.sin(this.runCycle * 0.5) * 0.08;
        ctx.rotate(armWave);

        const colors = this.getSpeciesColors();
        const armColor = this.costumeType === 'gentleman' ? '#1e2229' : (this.costumeType === 'santa' ? '#d62828' : colors.skin);
        const handColor = this.costumeType === 'gentleman' ? '#fffcf5' : (this.costumeType === 'santa' ? '#fffcf5' : colors.belly);

        // 오른쪽으로 뻗어 바나나를 치켜든 팔
        ctx.fillStyle = armColor;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.quadraticCurveTo(34, 8, 78, -8);
        ctx.lineTo(94, 14);
        // 팔 아래 잔털
        ctx.lineTo(68, 26);
        ctx.lineTo(74, 32);
        ctx.lineTo(48, 34);
        ctx.lineTo(52, 40);
        ctx.quadraticCurveTo(18, 36, -10, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawHatching(ctx, 18, 22, 65, 18, 6, 7, -1.4);

        // 🐯 호랑이 전용 오른팔 디테일 (호랑이 줄무늬 & 손목 털 밴드)
        if (this.characterType === 'tiger' && this.costumeType === 'none') {
            ctx.fillStyle = '#14110f';
            ctx.beginPath();
            ctx.moveTo(30, 4); ctx.lineTo(46, 18); ctx.lineTo(34, 20); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(56, 2); ctx.lineTo(72, 14); ctx.lineTo(60, 18); ctx.closePath(); ctx.fill();

            // 손목 흰 털 밴드
            ctx.fillStyle = '#fff8f0';
            ctx.beginPath();
            ctx.ellipse(82, 8, 12, 6, 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

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

        // 바나나를 감싸 쥔 손가락 4개 + 엄지
        ctx.fillStyle = handColor;
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

    // 3. 몸통 등판 (신사복 턱시도 / 산타 복장 / 기본 스포츠웨어 탱크톱)
    drawBackTorsoAndShorts(ctx, swing, isLookingBack) {
        if (this.costumeType === 'gentleman') {
            this.drawGentlemanTuxedo(ctx, swing, isLookingBack);
            return;
        } else if (this.costumeType === 'santa') {
            this.drawSantaSuit(ctx, swing, isLookingBack);
            return;
        }

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

        // 🐯 호랑이 전용 등/어깨/옆구리 줄무늬
        if (this.characterType === 'tiger') {
            ctx.fillStyle = '#14110f';
            [-1, 1].forEach(side => {
                ctx.save();
                ctx.scale(side, 1);
                ctx.beginPath();
                ctx.moveTo(34, -102); ctx.lineTo(48, -106); ctx.lineTo(39, -92); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(42, -52); ctx.lineTo(58, -45); ctx.lineTo(45, -36); ctx.closePath(); ctx.fill();
                ctx.restore();
            });
        }

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

    // 3-B. 최고급 클래식 신사복 (정통 블랙 턱시도, 레드 행커치프, 골드 회중시계 체인, 새틴 라펠, 화이트 셔츠, 레드 보타이, 골드 단추)
    drawGentlemanTuxedo(ctx, swing, isLookingBack) {
        ctx.save();
        ctx.translate(0, -125);

        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // --- (A) 신사 정장 바지 (Black Formal Dress Trousers) ---
        const pantsGrad = ctx.createLinearGradient(-55, -20, 55, 45);
        pantsGrad.addColorStop(0, '#2b303a');
        pantsGrad.addColorStop(0.5, '#1e2229');
        pantsGrad.addColorStop(1, '#14171a');
        ctx.fillStyle = pantsGrad;

        ctx.beginPath();
        ctx.moveTo(-45, -18);
        ctx.quadraticCurveTo(-68, 5, -62, 42);
        ctx.quadraticCurveTo(-30, 50, -6, 32);
        ctx.lineTo(6, 32);
        ctx.quadraticCurveTo(30, 50, 62, 42);
        ctx.quadraticCurveTo(68, 5, 45, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 바지 옆면 고급 새틴 턱시도 스트라이프 (Satin Side Stripe)
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 3.2;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(side * 44, -16);
            ctx.quadraticCurveTo(side * 60, 10, side * 56, 40);
            ctx.stroke();
        });

        // --- (B) 턱시도 자켓 코트 (Tuxedo Tailcoat Jacket) ---
        const coatGrad = ctx.createRadialGradient(0, -65, 10, 0, -55, 85);
        coatGrad.addColorStop(0, '#2d333d');
        coatGrad.addColorStop(0.65, '#1e2229');
        coatGrad.addColorStop(1, '#111316');
        ctx.fillStyle = coatGrad;
        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 4.2;

        ctx.beginPath();
        ctx.moveTo(-44, -112);
        ctx.quadraticCurveTo(-32, -70, -50, -14);
        ctx.quadraticCurveTo(0, 4, 50, -14);
        ctx.quadraticCurveTo(32, -70, 44, -112);
        ctx.lineTo(26, -112);
        ctx.quadraticCurveTo(0, -96, -26, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 고급 새틴 턱시도 깃 (Glossy Satin Peaked Lapels)
        const lapelGrad = ctx.createLinearGradient(-35, -110, 35, -60);
        lapelGrad.addColorStop(0, '#495057');
        lapelGrad.addColorStop(0.5, '#343a40');
        lapelGrad.addColorStop(1, '#212529');
        ctx.fillStyle = lapelGrad;
        ctx.lineWidth = 3.2;
        // 좌측 라펠
        ctx.beginPath();
        ctx.moveTo(-28, -110);
        ctx.lineTo(-46, -78);
        ctx.lineTo(-24, -60);
        ctx.lineTo(-18, -98);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 우측 라펠
        ctx.beginPath();
        ctx.moveTo(28, -110);
        ctx.lineTo(46, -78);
        ctx.lineTo(24, -60);
        ctx.lineTo(18, -98);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 좌측 가슴 붉은 실크 행커치프 (Pocket Square)
        ctx.fillStyle = '#d62828';
        ctx.beginPath();
        ctx.moveTo(22, -80);
        ctx.lineTo(29, -90);
        ctx.lineTo(36, -80);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (isLookingBack) {
            // 뒤돌아볼 때: 정면 화이트 드레스 셔츠 + 골드 회중시계 체인 + 레드 보타이 + 골드 단추!
            ctx.fillStyle = '#fffcf5';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-18, -100);
            ctx.lineTo(18, -100);
            ctx.lineTo(12, -38);
            ctx.lineTo(-12, -38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 셔츠 세로 주름선
            ctx.strokeStyle = '#e9ecef';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-6, -96); ctx.lineTo(-4, -40);
            ctx.moveTo(6, -96); ctx.lineTo(4, -40);
            ctx.stroke();

            // 🌟 골드 회중시계 체인 (Albert Watch Chain)
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(-14, -60);
            ctx.quadraticCurveTo(-4, -46, 6, -56);
            ctx.stroke();
            // 골드 체인 펜던트
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(6, -56, 3.2, 0, Math.PI * 2);
            ctx.fill();

            // 붉은 실크 보타이 (Red Silk Bow Tie)
            ctx.fillStyle = '#d62828';
            ctx.strokeStyle = '#14171a';
            ctx.lineWidth = 2.6;
            // 좌측 날개
            ctx.beginPath();
            ctx.moveTo(0, -92);
            ctx.lineTo(-18, -102);
            ctx.lineTo(-18, -82);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 우측 날개
            ctx.beginPath();
            ctx.moveTo(0, -92);
            ctx.lineTo(18, -102);
            ctx.lineTo(18, -82);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 보타이 리본 중앙 매듭 & 보석
            ctx.fillStyle = '#b7094c';
            ctx.beginPath();
            ctx.arc(0, -92, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(0, -92, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // 황금 조끼 단추 3개
            ctx.fillStyle = '#ffd166';
            ctx.strokeStyle = '#14171a';
            ctx.lineWidth = 2;
            [-74, -58, -44].forEach(by => {
                ctx.beginPath();
                ctx.arc(0, by, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        } else {
            // 뒷모습: 연미복 뒷 절개선과 허리 황금 단추 2개!
            ctx.strokeStyle = '#14171a';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, -94);
            ctx.lineTo(0, -14);
            ctx.stroke();

            // 허리 황금 단추 2개
            ctx.fillStyle = '#ffd166';
            ctx.lineWidth = 2;
            [-12, 12].forEach(bx => {
                ctx.beginPath();
                ctx.arc(bx, -28, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 연미복 제비꼬리 트임 (Tailcoat vent)
            ctx.beginPath();
            ctx.moveTo(-6, -14);
            ctx.lineTo(0, -2);
            ctx.lineTo(6, -14);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 3-C. 최고급 산타 복장 (포근한 벨벳 레드 코트, 입체 양털 셰르파 트림, 두꺼운 가죽벨트 + 메탈릭 골드 버클, 레드 벨벳 바지)
    drawSantaSuit(ctx, swing, isLookingBack) {
        ctx.save();
        ctx.translate(0, -125);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // --- (A) 산타 벨벳 바지 (Red Santa Trousers) ---
        const pantsGrad = ctx.createLinearGradient(-55, -20, 55, 45);
        pantsGrad.addColorStop(0, '#e63946');
        pantsGrad.addColorStop(0.6, '#d62828');
        pantsGrad.addColorStop(1, '#9e1823');
        ctx.fillStyle = pantsGrad;

        ctx.beginPath();
        ctx.moveTo(-45, -18);
        ctx.quadraticCurveTo(-68, 5, -62, 42);
        ctx.quadraticCurveTo(-30, 50, -6, 32);
        ctx.lineTo(6, 32);
        ctx.quadraticCurveTo(30, 50, 62, 42);
        ctx.quadraticCurveTo(68, 5, 45, -18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 바지 아랫단 포근한 흰 양털 커프 (Boot Fur Cuffs)
        ctx.fillStyle = '#fffcf5';
        ctx.lineWidth = 3.2;
        [-38, 38].forEach(fx => {
            ctx.beginPath();
            ctx.roundRect(fx - 20, 36, 40, 16, 8);
            ctx.fill();
            ctx.stroke();
        });

        // --- (B) 산타 벨벳 코트 (Red Velvet Coat & Fluffy Trim) ---
        const coatGrad = ctx.createRadialGradient(0, -65, 10, 0, -55, 85);
        coatGrad.addColorStop(0, '#f03a47');
        coatGrad.addColorStop(0.7, '#d62828');
        coatGrad.addColorStop(1, '#9e1823');
        ctx.fillStyle = coatGrad;
        ctx.lineWidth = 4.2;

        ctx.beginPath();
        ctx.moveTo(-45, -112);
        ctx.quadraticCurveTo(-30, -75, -52, -16);
        ctx.quadraticCurveTo(0, 4, 52, -16);
        ctx.quadraticCurveTo(30, -75, 45, -112);
        ctx.lineTo(26, -112);
        ctx.quadraticCurveTo(0, -94, -26, -112);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 코트 목덜미 포근한 양털 칼라 (Voluminous Sherpa Fleece Collar)
        ctx.fillStyle = '#fffcf5';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.roundRect(-36, -115, 72, 24, 12);
        ctx.fill();
        ctx.stroke();
        // 칼라 구름 털 볼륨
        [-24, -8, 8, 24].forEach(cx => {
            ctx.beginPath();
            ctx.arc(cx, -104, 7, 0, Math.PI * 2);
            ctx.fill();
        });

        // 굵은 리얼 가죽 벨트 (Embossed Black Leather Belt)
        ctx.fillStyle = '#14171a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(-48, -43, 96, 24, 5);
        ctx.fill();
        ctx.stroke();

        // 벨트 메탈 아일렛 구멍 4개
        ctx.fillStyle = '#ffd166';
        [-34, -26, 26, 34].forEach(ex => {
            ctx.beginPath();
            ctx.arc(ex, -31, 2.2, 0, Math.PI * 2);
            ctx.fill();
        });

        // 큼직하고 번쩍이는 황금 버클 (Lustrous Gold Buckle)
        const buckleGrad = ctx.createLinearGradient(-20, -48, 20, -14);
        buckleGrad.addColorStop(0, '#fff3b0');
        buckleGrad.addColorStop(0.4, '#ffd166');
        buckleGrad.addColorStop(0.8, '#ffbe0b');
        buckleGrad.addColorStop(1, '#e09f3e');
        ctx.fillStyle = buckleGrad;
        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.roundRect(-20, -47, 40, 32, 7);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#14171a';
        ctx.fillRect(-10, -39, 20, 16);

        // 버클 핀 (Buckle Tongue)
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-2.5, -42, 5, 20);

        // 코트 아랫단 폭신폭신한 하얀 양털 트림 (Fluffy Bottom Sherpa Hem)
        ctx.fillStyle = '#fffcf5';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.roundRect(-50, -18, 100, 22, 11);
        ctx.fill();
        ctx.stroke();

        // 복슬복슬 털 볼륨 구름 6개
        [-38, -22, -7, 7, 22, 38].forEach(fx => {
            ctx.beginPath();
            ctx.arc(fx, -7, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        if (isLookingBack) {
            // 정면 화이트 양털 세로 여밈 & 골드 단추 2개
            ctx.fillStyle = '#fffcf5';
            ctx.beginPath();
            ctx.roundRect(-7, -92, 14, 48, 7);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.arc(0, -80, 3.2, 0, Math.PI * 2);
            ctx.arc(0, -62, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
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

            const colors = this.getSpeciesColors();
            const legColor = this.costumeType === 'gentleman' ? '#1e2229' : (this.costumeType === 'santa' ? '#d62828' : colors.skin);

            // 다리
            ctx.fillStyle = legColor;
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

            // 🐯 호랑이 다리 줄무늬
            if (this.characterType === 'tiger' && this.costumeType === 'none') {
                ctx.fillStyle = '#14110f';
                ctx.beginPath();
                ctx.moveTo(-20, 16); ctx.lineTo(-4, 24); ctx.lineTo(-18, 28); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(22, 34); ctx.lineTo(6, 42); ctx.lineTo(20, 46); ctx.closePath(); ctx.fill();
            }

            this.drawHatching(ctx, -14, 10, 14, 10, 4, 8, 1.5);

            // 신발 / 발 렌더링 (신사복 정장구두 / 산타 부츠 / 펭귄발 / 개구리발 / 호랑이 젤리 발바닥 / 스니커즈)
            ctx.save();
            ctx.translate(0, 62 - liftY * 0.5);

            const isGentleman = this.costumeType === 'gentleman';
            const isSanta = this.costumeType === 'santa';
            const isPenguin = this.characterType === 'penguin';
            const isFrog = this.characterType === 'frog';
            const isTiger = this.characterType === 'tiger' && !isGentleman && !isSanta;

            if (isTiger) {
                // 🐯 [고품격 아기 호랑이 전용 발]: 하얀 솜방망이 털 + 핑크 젤리 찹쌀떡 발바닥!
                if (leg.phase > 0.05) {
                    // 뒤로 차올린 발 (핑크 발바닥 패드가 선명히 보임!)
                    ctx.fillStyle = '#fff8f0';
                    ctx.strokeStyle = '#14110f';
                    ctx.lineWidth = 3.6;
                    ctx.beginPath();
                    ctx.ellipse(0, 8, 26, 33, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 💖 중앙 메인 젤리 패드 (하트형 핑크 패드)
                    ctx.fillStyle = '#ff5d8f';
                    ctx.beginPath();
                    ctx.ellipse(0, 14, 13, 11, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // 🐾 4개의 앙증맞은 발가락 젤리 빈즈 (Toe Beans)
                    [
                        { x: -14, y: -6, r: 5.2 },
                        { x: -5,  y: -14, r: 5.5 },
                        { x: 5,   y: -14, r: 5.5 },
                        { x: 14,  y: -6, r: 5.2 }
                    ].forEach(bean => {
                        ctx.beginPath();
                        ctx.arc(bean.x, bean.y, bean.r, 0, Math.PI * 2);
                        ctx.fill();
                    });
                } else {
                    // 땅을 딛는 발 (귀여운 하얀 호랑이 솜방망이)
                    ctx.fillStyle = '#fff8f0';
                    ctx.strokeStyle = '#14110f';
                    ctx.lineWidth = 3.6;
                    ctx.beginPath();
                    ctx.roundRect(-22, -10, 44, 30, 12);
                    ctx.fill();
                    ctx.stroke();

                    // 발톱 앞 핑크 포인트 & 털 분할선
                    ctx.fillStyle = '#ff758f';
                    [-10, 0, 10].forEach(tx => {
                        ctx.beginPath();
                        ctx.arc(tx, 14, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            } else {
                const shoeMainColor = isGentleman ? '#14171a' : (isSanta ? '#14171a' : (isPenguin ? '#fb8500' : (isFrog ? '#52b788' : '#8b3e2f')));
                const shoeAccentColor = isGentleman ? '#ffd166' : (isSanta ? '#ffd166' : (isPenguin ? '#ffb703' : (isFrog ? '#74c69d' : '#f5cb42')));

                if (leg.phase > 0.05) {
                    // 뒤(카메라 쪽)로 차올린 발
                    ctx.fillStyle = shoeMainColor;
                    ctx.beginPath();
                    ctx.arc(0, -8, 26, Math.PI, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 포인트 줄무늬
                    ctx.fillStyle = shoeAccentColor;
                    ctx.lineWidth = 2.5;
                    ctx.fillRect(-22, -16, 44, 6);
                    ctx.strokeRect(-22, -16, 44, 6);

                    // 발바닥 밑창 타원 + 가로 미끄럼방지 줄무늬
                    ctx.fillStyle = isPenguin ? '#ffbe0b' : (isFrog ? '#74c69d' : '#f5eedc');
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.ellipse(0, 8, 26, 36, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = isPenguin ? '#fb8500' : (isFrog ? '#52b788' : '#c9bba0');
                    ctx.lineWidth = 2.8;
                    ctx.beginPath();
                    ctx.ellipse(0, 8, 20, 29, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 가로 줄무늬 (Treads)
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
                    // 땅을 딛고 있는 발
                    ctx.fillStyle = shoeMainColor;
                    ctx.lineWidth = 3.8;
                    ctx.beginPath();
                    ctx.roundRect(-22, -12, 44, 34, 14);
                    ctx.fill();
                    ctx.stroke();

                    // 옆면 포인트 2줄
                    ctx.fillStyle = shoeAccentColor;
                    ctx.lineWidth = 2.5;
                    ctx.fillRect(-22, -4, 44, 5);
                    ctx.strokeRect(-22, -4, 44, 5);
                    ctx.fillRect(-22, 4, 44, 5);
                    ctx.strokeRect(-22, 4, 44, 5);

                    // 밑창 뒤꿈치
                    ctx.fillStyle = isPenguin ? '#ffbe0b' : (isFrog ? '#74c69d' : '#f5eedc');
                    ctx.lineWidth = 3.8;
                    ctx.beginPath();
                    ctx.roundRect(-25, 14, 50, 14, 7);
                    ctx.fill();
                    ctx.stroke();
                }
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

    // 5-C. 동글동글 초귀요미 개구리 머리 (Ultra-Cute Chubby Frog Head)
    drawFrogHead(ctx, swing, cosSwing, isLookingBack) {
        ctx.save();
        ctx.translate(isLookingBack ? 4 : 0, -288);
        ctx.scale(1.18, 1.18);
        ctx.rotate(isLookingBack ? (0.06 + Math.sin(this.runCycle * 0.5) * 0.04) : (Math.sin(this.runCycle * 0.5) * 0.045));

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const frogGrad = ctx.createRadialGradient(-10, -20, 20, 0, 15, 110);
        frogGrad.addColorStop(0, '#95d5b2');
        frogGrad.addColorStop(0.45, '#74c69d');
        frogGrad.addColorStop(0.85, '#52b788');
        frogGrad.addColorStop(1, '#2d6a4f');

        // 1) 동글동글 툭 튀어나온 커다란 양쪽 왕눈이 봉우리 (Big Bulbous Eye Mounds)
        [-48, 48].forEach((ex, idx) => {
            ctx.save();
            ctx.translate(ex, -74);
            ctx.fillStyle = frogGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (!isLookingBack) {
                // 뒷모습: 눈 봉우리 뒤쪽의 짙은 녹색 점박이 무늬
                ctx.fillStyle = '#2d6a4f';
                ctx.beginPath();
                ctx.ellipse(idx === 0 ? -6 : 6, -6, 15, 22, idx === 0 ? -0.3 : 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // 2) 통통하고 둥글둥글한 볼살 빵빵 개구리 얼굴 본체 (Round Chubby Face Base)
        ctx.fillStyle = frogGrad;
        ctx.beginPath();
        ctx.moveTo(-76, -30);
        ctx.quadraticCurveTo(-94, 15, -78, 58); // 통통하고 귀여운 볼살
        ctx.quadraticCurveTo(-46, 94, 0, 96);
        ctx.quadraticCurveTo(46, 94, 78, 58);
        ctx.quadraticCurveTo(94, 15, 76, -30);
        ctx.quadraticCurveTo(45, -64, 0, -58);
        ctx.quadraticCurveTo(-45, -64, -76, -30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (isLookingBack) {
            // --- 뒤돌아볼 때: 반짝반짝 큰 눈망울과 발그레한 볼터치, 행복한 미소! ---
            // 큰 왕눈이 (에메랄드빛 홍채 + 반짝이는 별빛 하이라이트)
            [-48, 48].forEach(ex => {
                ctx.save();
                ctx.translate(ex, -74);

                // 흰자
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 26, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 영롱한 에메랄드 홍채 링
                ctx.fillStyle = '#2ec4b6';
                ctx.beginPath();
                ctx.arc(ex < 0 ? 3 : -3, 2, 18, 0, Math.PI * 2);
                ctx.fill();

                // 짙은 블랙 동공
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.ellipse(ex < 0 ? 3 : -3, 2, 13, 16, 0, 0, Math.PI * 2);
                ctx.fill();

                // 큰 메인 하이라이트
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex < 0 ? 0 : -6, -4, 7, 0, Math.PI * 2);
                ctx.fill();
                // 보조 하이라이트
                ctx.beginPath();
                ctx.arc(ex < 0 ? 8 : 2, 6, 3.5, 0, Math.PI * 2);
                ctx.fill();

                // 귀여운 속눈썹
                ctx.strokeStyle = '#1a1612';
                ctx.lineWidth = 3.2;
                ctx.beginPath();
                ctx.arc(0, 0, 26, Math.PI * 1.15, Math.PI * 1.85);
                ctx.stroke();
                ctx.restore();
            });

            // 개구리 목덜미 연한 크림빛 배 (Creamy Throat)
            ctx.fillStyle = '#d8f3dc';
            ctx.beginPath();
            ctx.ellipse(0, 56, 48, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 💖 발그레한 핑크빛 볼터치 & 하이라이트
            [-54, 54].forEach(bx => {
                ctx.fillStyle = 'rgba(255, 117, 143, 0.78)';
                ctx.beginPath();
                ctx.ellipse(bx, 24, 16, 11, 0, 0, Math.PI * 2);
                ctx.fill();
                // 볼터치 속 화이트 반짝이
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(bx - 3, 22, 2.5, 0, Math.PI * 2);
                ctx.arc(bx + 4, 25, 1.8, 0, Math.PI * 2);
                ctx.fill();
            });

            // 활짝 웃으며 혀를 쏙 내민 사랑스러운 입 (Open Smile with Cute Tongue)
            ctx.fillStyle = '#b5179e';
            ctx.beginPath();
            ctx.arc(0, 24, 24, 0.15, Math.PI - 0.15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 분홍빛 귀여운 혀
            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.arc(0, 36, 15, Math.PI, 0);
            ctx.fill();

            // 입꼬리 앙증맞은 보조개 점
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(-26, 22, 2.8, 0, Math.PI * 2);
            ctx.arc(26, 22, 2.8, 0, Math.PI * 2);
            ctx.fill();

            // 개구리 콧구멍 2개 (귀여운 작은 점)
            ctx.beginPath();
            ctx.arc(-5, -4, 2.5, 0, Math.PI * 2);
            ctx.arc(5, -4, 2.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // --- 뒷모습: 매끄럽고 동글동글한 뒤통수 + 파스텔톤 점박이 무늬 ---
            ctx.fillStyle = '#40916c';
            const spots = [
                { x: 0,   y: -16, rx: 18, ry: 12, rot: 0 },
                { x: -36, y: 14,  rx: 14, ry: 10, rot: -0.2 },
                { x: 36,  y: 14,  rx: 14, ry: 10, rot: 0.2 },
                { x: -16, y: 48,  rx: 12, ry: 9,  rot: 0.1 },
                { x: 16,  y: 48,  rx: 12, ry: 9,  rot: -0.1 }
            ];
            spots.forEach(sp => {
                ctx.beginPath();
                ctx.ellipse(sp.x, sp.y, sp.rx, sp.ry, sp.rot, 0, Math.PI * 2);
                ctx.fill();
            });

            this.drawHatching(ctx, -48, 54, 48, 54, 8, 12, 1.4);
        }

        ctx.restore();
    }

    // 5-D. 명품 황금 아기 호랑이 머리 (High-End Cute & Majestic Korean Tiger Cub Head)
    drawTigerHead(ctx, swing, cosSwing, isLookingBack) {
        ctx.save();
        ctx.translate(isLookingBack ? 4 : 0, -288);
        ctx.scale(1.18, 1.18);
        ctx.rotate(isLookingBack ? (0.06 + Math.sin(this.runCycle * 0.5) * 0.04) : (Math.sin(this.runCycle * 0.5) * 0.045));

        ctx.strokeStyle = '#14110f';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) 🐯 호랑이 귀 (앞/뒤 완벽 분기 - 뒤에서는 시그니처 하얀 반점 Ocelli)
        [-66, 66].forEach((ex, idx) => {
            ctx.save();
            ctx.translate(ex, -68);
            ctx.rotate(idx === 0 ? -0.24 : 0.24);

            if (isLookingBack) {
                // --- [앞모습 귀]: 호랑이 골드 외곽 + 귀 끝 블랙 팁 + 복슬복슬 화이트 털 + 핑크 속살 ---
                ctx.fillStyle = '#ff9e00';
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 귀 끝 엣지 블랙 팁
                ctx.fillStyle = '#14110f';
                ctx.beginPath();
                ctx.arc(0, -10, 18, Math.PI * 1.15, Math.PI * 1.85);
                ctx.quadraticCurveTo(0, -8, 0, -10);
                ctx.fill();

                // 귀 속 폭신폭신 하얀 솜털 뭉치
                ctx.fillStyle = '#fff8f0';
                ctx.beginPath();
                ctx.ellipse(0, 3, 17, 21, 0, 0, Math.PI * 2);
                ctx.fill();

                // 귀 속 따뜻한 로즈핑크
                ctx.fillStyle = '#ff758f';
                ctx.beginPath();
                ctx.ellipse(0, 6, 9, 13, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // --- [뒷모습 귀]: 호랑이 고유의 시그니처 '하얀 눈 반점(Ocelli)' 완비! ---
                // 칠흑빛 벨벳 베이스
                ctx.fillStyle = '#14110f';
                ctx.beginPath();
                ctx.arc(0, 0, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 🌟 호랑이 귀 뒤의 상징! 선명한 원형 화이트 오셀리 (White Ocelli Eye Spot)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 13, 0, Math.PI * 2);
                ctx.fill();

                // 귀 밑동 골드 오렌지 그러데이션
                ctx.fillStyle = '#ff9e00';
                ctx.beginPath();
                ctx.arc(0, 14, 15, Math.PI, 0);
                ctx.fill();

                // 귀 안쪽에서 삐져나온 앙증맞은 흰 털가닥
                ctx.fillStyle = '#fff8f0';
                ctx.beginPath();
                ctx.moveTo(idx === 0 ? 14 : -14, -8);
                ctx.quadraticCurveTo(idx === 0 ? 24 : -24, -14, idx === 0 ? 20 : -20, 4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        });

        // 2) 통통하고 복슬복슬한 황금 아기 호랑이 얼굴 본체 (Royal Golden Amber Gradient)
        const tigerGrad = ctx.createRadialGradient(-15, -20, 15, 0, 10, 115);
        tigerGrad.addColorStop(0, '#ffeaa7');
        tigerGrad.addColorStop(0.35, '#ff9e00');
        tigerGrad.addColorStop(0.75, '#e85d04');
        tigerGrad.addColorStop(1, '#c1121f');
        ctx.fillStyle = tigerGrad;

        ctx.beginPath();
        ctx.moveTo(-54, -72);
        ctx.quadraticCurveTo(0, -86, 54, -72);
        ctx.quadraticCurveTo(76, -45, 82, -10);
        // 오른쪽 볼 복슬복슬 입체 털단 (3단 플러피 털)
        ctx.quadraticCurveTo(102, 12, 90, 30);
        ctx.quadraticCurveTo(102, 46, 84, 60);
        ctx.quadraticCurveTo(46, 94, 0, 94);
        ctx.quadraticCurveTo(-46, 94, -84, 60);
        // 왼쪽 볼 복슬복슬 입체 털단
        ctx.quadraticCurveTo(-102, 46, -90, 30);
        ctx.quadraticCurveTo(-102, 12, -82, -10);
        ctx.quadraticCurveTo(-76, -45, -54, -72);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (isLookingBack) {
            // --- 🐯 [앞모습]: KIA 타이거즈 공식 마스코트 '호걸이(HOGEORI)' 완벽 구현! ---
            // 1) 👑 이마 중앙의 기아 타이거즈 3선 마스코트 스트라이프 (Bold Tigers Crest)
            ctx.fillStyle = '#14110f';
            // 중앙 굵은 쐐기 줄무늬
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(-8, -68);
            ctx.quadraticCurveTo(0, -72, 8, -68);
            ctx.closePath();
            ctx.fill();

            // 이마 양옆 대칭 2선
            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.moveTo(side * 14, -40);
                ctx.lineTo(side * 26, -65);
                ctx.lineTo(side * 20, -68);
                ctx.lineTo(side * 10, -44);
                ctx.closePath();
                ctx.fill();
            });

            // 2) 🤨 호걸이의 핵심 상징! 짙고 당당한 '표정부자 눈알쇼' 마스코트 눈썹 (Bold Eyebrows)
            [-34, 34].forEach((bx, idx) => {
                ctx.save();
                ctx.translate(bx, -28);
                ctx.rotate(idx === 0 ? 0.08 : -0.08);
                ctx.fillStyle = '#14110f';
                ctx.beginPath();
                ctx.roundRect(-17, -5, 34, 10, 5);
                ctx.fill();
                ctx.restore();
            });

            // 3) 👀 호걸이 전매특허: 똥글똥글하고 맑은 만화/디즈니풍 마스코트 눈망울
            [-34, 34].forEach((ex, idx) => {
                ctx.save();
                ctx.translate(ex, -8);

                // 흰자위 (크고 둥글둥글한 눈)
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#14110f';
                ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.ellipse(0, 0, 18, 20, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // 큼직하고 또렷한 검은 동공 (익살스럽고 잔망스러운 호걸이 시선)
                ctx.fillStyle = '#14110f';
                ctx.beginPath();
                ctx.ellipse(idx === 0 ? 2 : -2, 0, 12, 14, 0, 0, Math.PI * 2);
                ctx.fill();

                // ✦ 맑고 영롱한 큰 원형 하이라이트 + 작은 보조 반사광
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(idx === 0 ? -2 : -6, -5, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(idx === 0 ? 5 : 1, 4, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 4) 🐯 볼 양옆의 시원한 기아 타이거즈 3가닥 블랙 스트라이프
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.scale(dir, 1);
                ctx.fillStyle = '#14110f';
                // 1번 줄
                ctx.beginPath();
                ctx.moveTo(56, -14); ctx.quadraticCurveTo(80, -18, 82, -8); ctx.lineTo(60, -4); ctx.closePath(); ctx.fill();
                // 2번 줄
                ctx.beginPath();
                ctx.moveTo(54, 8); ctx.quadraticCurveTo(78, 6, 80, 16); ctx.lineTo(58, 20); ctx.closePath(); ctx.fill();
                // 3번 줄
                ctx.beginPath();
                ctx.moveTo(50, 30); ctx.quadraticCurveTo(72, 30, 74, 38); ctx.lineTo(54, 40); ctx.closePath(); ctx.fill();
                ctx.restore();
            });

            // 5) 💖 호걸이의 복슬복슬 크고 둥근 화이트 머즐 (White Muzzle Pads)
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#14110f';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.ellipse(-20, 38, 26, 21, 0.12, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(20, 38, 26, 21, -0.12, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // 턱 밑 풍성한 화이트 가슴털
            ctx.beginPath();
            ctx.ellipse(0, 70, 32, 19, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // 6) 👃 호걸이의 상징: 윤기 나는 큼직하고 둥근 '블랙 마스코트 코' (Black Mascot Nose)
            ctx.fillStyle = '#14110f';
            ctx.strokeStyle = '#14110f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-15, 20, 30, 18, 9);
            ctx.fill();

            // 코 윗부분 매끄러운 흰색 윤기 하이라이트 타원
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 24, 8, 3.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 7) 😃 호걸이의 호쾌하고 장난기 넘치는 활짝 웃는 입 & 핑크 혀
            ctx.fillStyle = '#c1121f';
            ctx.strokeStyle = '#14110f';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.arc(0, 42, 16, 0, Math.PI);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 말랑한 핑크 혀
            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.arc(0, 50, 10, Math.PI, 0);
            ctx.fill();

            // 입꼬리 앙증맞은 송곳니 2개 (귀여운 타이거즈 포인트)
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#14110f';
            ctx.lineWidth = 2.2;
            [-11, 11].forEach(fx => {
                ctx.beginPath();
                ctx.moveTo(fx - 3.5, 42);
                ctx.lineTo(fx, 48);
                ctx.lineTo(fx + 3.5, 42);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // 주둥이 중앙 인중 분할선
            ctx.strokeStyle = '#14110f';
            ctx.lineWidth = 3.6;
            ctx.beginPath();
            ctx.moveTo(0, 36);
            ctx.lineTo(0, 42);
            ctx.stroke();

            // 8) 양 볼 생기 넘치는 살구빛 볼터치
            ctx.fillStyle = 'rgba(255, 107, 107, 0.55)';
            ctx.beginPath();
            ctx.ellipse(-52, 22, 14, 10, 0, 0, Math.PI * 2);
            ctx.ellipse(52, 22, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 9) 호걸이의 앙증맞은 수염 점 3개씩 & 흰 수염
            ctx.fillStyle = '#14110f';
            [-1, 1].forEach(dir => {
                ctx.beginPath();
                ctx.arc(dir * 18, 34, 2.5, 0, Math.PI * 2);
                ctx.arc(dir * 28, 38, 2.5, 0, Math.PI * 2);
                ctx.arc(dir * 18, 44, 2.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(dir * 32, 36); ctx.quadraticCurveTo(dir * 60, 35, dir * 82, 42); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(dir * 32, 42); ctx.quadraticCurveTo(dir * 60, 46, dir * 80, 54); ctx.stroke();
            });
        } else {
            // --- [뒷모습]: 촌티(밤티)를 벗어던진 한국 전통 호랑이 명품 뒤통수 & 목덜미 줄무늬! ---
            ctx.fillStyle = '#14110f';
            // 중앙 정수리 세련된 왕관형 줄무늬 (Crown Center Stripe)
            ctx.beginPath();
            ctx.moveTo(-10, -84); ctx.quadraticCurveTo(0, -50, 10, -84);
            ctx.quadraticCurveTo(4, -40, 0, -26);
            ctx.quadraticCurveTo(-4, -40, -10, -84);
            ctx.closePath();
            ctx.fill();

            // 양옆 아름다운 곡선의 호랑이 머리 줄무늬 (Upper Crest Stripes)
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.scale(dir, 1);
                // 1번 줄무늬
                ctx.beginPath();
                ctx.moveTo(28, -78);
                ctx.quadraticCurveTo(42, -74, 22, -50);
                ctx.quadraticCurveTo(14, -58, 28, -78);
                ctx.closePath();
                ctx.fill();

                // 2번 옆통수 줄무늬
                ctx.beginPath();
                ctx.moveTo(68, -42);
                ctx.quadraticCurveTo(55, -46, 34, -28);
                ctx.quadraticCurveTo(48, -24, 68, -42);
                ctx.closePath();
                ctx.fill();

                // 3번 목덜미 줄무늬
                ctx.beginPath();
                ctx.moveTo(70, -10);
                ctx.quadraticCurveTo(52, -8, 28, 4);
                ctx.quadraticCurveTo(46, 12, 70, -10);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });

            // 뒤통수 입체 명암 해칭
            this.drawHatching(ctx, -46, 52, 46, 52, 8, 12, 1.4);
        }

        ctx.restore();
    }

    // 5-E. 동글동글 아기 펭귄 머리 (Ultra-Cute Baby Emperor Penguin Head)
    drawPenguinHead(ctx, swing, cosSwing, isLookingBack) {
        ctx.save();
        ctx.translate(isLookingBack ? 4 : 0, -288);
        ctx.scale(1.18, 1.18);
        ctx.rotate(isLookingBack ? (0.06 + Math.sin(this.runCycle * 0.5) * 0.04) : (Math.sin(this.runCycle * 0.5) * 0.045));

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) 펭귄 통통하고 동그란 딥네이비/블랙 헤드 돔 (Smooth Round Navy Dome)
        const penGrad = ctx.createRadialGradient(-15, -25, 20, 0, 10, 105);
        penGrad.addColorStop(0, '#4a6fa5');
        penGrad.addColorStop(0.65, '#1d3557');
        penGrad.addColorStop(1, '#0d1b2a');
        ctx.fillStyle = penGrad;

        ctx.beginPath();
        ctx.moveTo(-64, -40);
        ctx.quadraticCurveTo(-68, -86, 0, -88);
        ctx.quadraticCurveTo(68, -86, 64, -40);
        ctx.quadraticCurveTo(78, 18, 66, 62);
        ctx.quadraticCurveTo(45, 92, 0, 94);
        ctx.quadraticCurveTo(-45, 92, -66, 62);
        ctx.quadraticCurveTo(-78, 18, -64, -40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 머리 위 앙증맞은 아기 펭귄 깃털 한 가닥
        ctx.beginPath();
        ctx.moveTo(-6, -86);
        ctx.quadraticCurveTo(0, -106, 14, -102);
        ctx.quadraticCurveTo(7, -88, 2, -86);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (isLookingBack) {
            // --- 뒤돌아볼 때: 하얀 하트형 볼살 마스크 & 초롱초롱 큰 눈 & 작은 황금 부리! ---
            ctx.fillStyle = '#fffcf5';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.moveTo(0, -26);
            ctx.bezierCurveTo(-28, -64, -62, -48, -58, -4);
            ctx.bezierCurveTo(-56, 42, -34, 72, 0, 84);
            ctx.bezierCurveTo(34, 72, 56, 42, 58, -4);
            ctx.bezierCurveTo(62, -48, 28, -64, 0, -26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 💖 발그레한 복숭아빛 볼터치 & 반짝이
            [-36, 36].forEach(bx => {
                ctx.fillStyle = 'rgba(255, 180, 162, 0.85)';
                ctx.beginPath();
                ctx.ellipse(bx, 20, 14, 9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(bx - 3, 18, 2.2, 0, Math.PI * 2);
                ctx.arc(bx + 3, 21, 1.6, 0, Math.PI * 2);
                ctx.fill();
            });

            // 🌟 맑고 초롱초롱한 큰 별빛 눈망울
            [-28, 28].forEach(ex => {
                ctx.save();
                ctx.translate(ex, -6);
                ctx.fillStyle = '#1d3557';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.fill();

                // 큰 눈빛 하이라이트
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex < 0 ? -3 : -5, -4, 5.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex < 0 ? 4 : 2, 4, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 앙증맞은 황금빛 오렌지 펭귄 부리 (Cute Tiny Golden Beak)
            const beakGrad = ctx.createLinearGradient(0, 0, 0, 36);
            beakGrad.addColorStop(0, '#ffbe0b');
            beakGrad.addColorStop(1, '#fb8500');
            ctx.fillStyle = beakGrad;
            ctx.lineWidth = 3.6;

            ctx.beginPath();
            ctx.moveTo(-16, 6);
            ctx.quadraticCurveTo(0, 2, 16, 6);
            ctx.quadraticCurveTo(8, 28, 0, 34);
            ctx.quadraticCurveTo(-8, 28, -16, 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 부리 미소 입선
            ctx.beginPath();
            ctx.moveTo(-12, 18);
            ctx.quadraticCurveTo(0, 24, 12, 18);
            ctx.stroke();
        } else {
            // --- 뒷모습: 매끄러운 딥네이비 뒤통수 + 하얀 목덜미 라인 ---
            ctx.fillStyle = '#fffcf5';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-40, 74);
            ctx.quadraticCurveTo(0, 92, 40, 74);
            ctx.quadraticCurveTo(0, 82, -40, 74);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            this.drawHatching(ctx, -42, 45, 42, 45, 8, 11, 1.45);
        }

        ctx.restore();
    }

    // 5-F. 최고급 클래식 신사 실크햇 (Gentleman Silk Top Hat & Gold Accents)
    drawGentlemanTopHat(ctx, swing, isLookingBack) {
        ctx.save();
        const hatTilt = isLookingBack ? 0.08 : (Math.sin(this.runCycle * 0.5) * 0.04 - 0.05);
        ctx.translate(isLookingBack ? 6 : 0, -398);
        ctx.rotate(hatTilt);

        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) 신사 모자 챙 (Wide Velvet Brim)
        const brimGrad = ctx.createRadialGradient(0, 10, 5, 0, 10, 68);
        brimGrad.addColorStop(0, '#495057');
        brimGrad.addColorStop(0.55, '#2b303a');
        brimGrad.addColorStop(1, '#14171a');
        ctx.fillStyle = brimGrad;

        ctx.beginPath();
        ctx.ellipse(0, 10, 72, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 챙 위 실크 광택선
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 6, 58, 11, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();

        // 2) 신사 모자 기둥 (Crown)
        const crownGrad = ctx.createLinearGradient(-38, -72, 38, 10);
        crownGrad.addColorStop(0, '#343a40');
        crownGrad.addColorStop(0.35, '#495057');
        crownGrad.addColorStop(0.7, '#212529');
        crownGrad.addColorStop(1, '#111316');
        ctx.fillStyle = crownGrad;
        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(-43, 6);
        ctx.lineTo(-47, -68);
        ctx.quadraticCurveTo(0, -82, 47, -68);
        ctx.lineTo(43, 6);
        ctx.quadraticCurveTo(0, 14, -43, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 모자 평평한 윗면 타원
        ctx.fillStyle = '#3a404a';
        ctx.beginPath();
        ctx.ellipse(0, -70, 48, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 실크 광택 하이라이트
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, -72, 40, 8.5, 0, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();

        // 3) 버건디 레드 실크 리본 밴드 (Crimson Ribbon Band)
        const ribbonGrad = ctx.createLinearGradient(-44, -12, 44, 4);
        ribbonGrad.addColorStop(0, '#b5179e');
        ribbonGrad.addColorStop(0.5, '#e63946');
        ribbonGrad.addColorStop(1, '#7a141a');
        ctx.fillStyle = ribbonGrad;
        ctx.strokeStyle = '#14171a';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(-44, 4);
        ctx.lineTo(-44.5, -14);
        ctx.quadraticCurveTo(0, -6, 44.5, -14);
        ctx.lineTo(44, 4);
        ctx.quadraticCurveTo(0, 12, -44, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 리본 황금 버클 & 골드 스타 핀
        ctx.fillStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-9, -10, 18, 15, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#14171a';
        ctx.fillRect(-4.5, -7, 9, 9);

        // 황금 별 핀 장식
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(22, -8, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 5-G. 최고급 산타 모자 (Lush Velvet Santa Hat & Fluffy Snow Pom-pom)
    drawSantaHat(ctx, swing, isLookingBack) {
        ctx.save();
        const hatSway = Math.sin(this.runCycle * 0.5) * 0.08;
        ctx.translate(isLookingBack ? 4 : 0, -384);
        ctx.rotate(hatSway);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) 붉은 산타 벨벳 원뿔 모자
        const coneGrad = ctx.createLinearGradient(-42, -65, 55, 10);
        coneGrad.addColorStop(0, '#ff4d6d');
        coneGrad.addColorStop(0.45, '#d62828');
        coneGrad.addColorStop(1, '#800f2f');
        ctx.fillStyle = coneGrad;

        ctx.beginPath();
        ctx.moveTo(-46, 2);
        ctx.quadraticCurveTo(-40, -68, -8, -98);
        ctx.bezierCurveTo(26, -128, 82, -88, 80, -42);
        ctx.quadraticCurveTo(58, -35, 44, 2);
        ctx.quadraticCurveTo(0, 12, -46, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 모자 접힌 벨벳 주름선
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(12, -74);
        ctx.quadraticCurveTo(36, -60, 58, -66);
        ctx.stroke();

        // 2) 털 폼폼 방울 (Winter Twinkle Pom-pom)
        ctx.save();
        ctx.translate(80, -38);
        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(0, 0, 21, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 폼폼 구름 털 질감
        ctx.fillStyle = '#e9ecef';
        ctx.beginPath();
        ctx.arc(3, 4, 12, 0, Math.PI * 2);
        ctx.fill();
        // 폼폼 반짝이
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-4, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3) 모자 아랫단 풍성한 하얀 양털 림 (Voluminous Fluffy Sherpa Rim)
        ctx.fillStyle = '#fffcf5';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;

        ctx.beginPath();
        ctx.roundRect(-54, -3, 108, 28, 14);
        ctx.fill();
        ctx.stroke();

        // 구름 털 뭉치 볼륨 6개
        [-36, -20, -6, 8, 22, 36].forEach(fx => {
            ctx.beginPath();
            ctx.arc(fx, 11, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        ctx.restore();
    }

    // 6-A. 명품 황금 호랑이 꼬리 (Majestic Korean Tiger Tail with Velvet Stripes & White Tip)
    drawTigerTail(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(0, -112);
        const tailWag = Math.sin(this.runCycle * 0.65) * 0.18;
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

        // 1) 칠흑빛 외곽선
        drawTailCurve();
        ctx.strokeStyle = '#14110f';
        ctx.lineWidth = 32;
        ctx.stroke();

        // 2) 풍성한 황금 호랑이 꼬리 본체 (Royal Golden Amber Coat)
        drawTailCurve();
        ctx.strokeStyle = '#ff9e00';
        ctx.lineWidth = 24;
        ctx.stroke();

        // 3) 꼬리 굽이마다 자연스럽게 감싸는 벨벳 블랙 호랑이 링 스트라이프 6개
        const tailRings = [
            { x: -36,  y: 6,    w: 16, h: 26, rot: 0.32 },
            { x: -84,  y: -26,  w: 16, h: 26, rot: -0.58 },
            { x: -128, y: -94,  w: 16, h: 26, rot: -1.25 },
            { x: -176, y: -168, w: 16, h: 26, rot: -0.42 },
            { x: -222, y: -136, w: 16, h: 26, rot: 0.68 },
            { x: -212, y: -78,  w: 14, h: 24, rot: 1.15 }
        ];
        ctx.fillStyle = '#14110f';
        tailRings.forEach(st => {
            ctx.save();
            ctx.translate(st.x, st.y);
            ctx.rotate(st.rot);
            ctx.beginPath();
            ctx.ellipse(0, 0, st.w * 0.45, st.h * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 4) 꼬리 끝 복슬복슬 스노우 화이트 솜뭉치 (Fluffy White Tip) & 링 포인트
        ctx.save();
        ctx.translate(-188, -70);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#14110f';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 꼬리 끝 검은 줄 포인트
        ctx.fillStyle = '#14110f';
        ctx.beginPath();
        ctx.arc(6, 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 꼬리 시작점(엉덩이 연결부) 털 해칭
        this.drawHatching(ctx, -35, 8, -85, -15, 6, 8, -1.8);

        ctx.restore();
    }

    // 6-B. 펭귄 꼬리 (Penguin Tail)
    drawPenguinTail(ctx, swing, cosSwing) {
        ctx.save();
        ctx.translate(0, -112);
        const tailWag = Math.sin(this.runCycle * 0.8) * 0.22;
        ctx.rotate(tailWag);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 앙증맞은 삼각형 펭귄 꼬리 깃털
        ctx.fillStyle = '#1d3557';
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(0, 36 + cosSwing * 4);
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 꼬리 끝 하얀 테두리
        ctx.fillStyle = '#fffcf5';
        ctx.beginPath();
        ctx.moveTo(-8, 18);
        ctx.lineTo(0, 34 + cosSwing * 4);
        ctx.lineTo(8, 18);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // 6. 꼬리 렌더링 (개구리는 꼬리 없음, 펭귄은 꼬리 깃털, 호랑이는 줄무늬 꼬리, 원숭이는 S자 긴 꼬리)
    drawTailFromBack(ctx, swing, cosSwing) {
        if (this.characterType === 'frog') {
            return; // 개구리는 꼬리가 없습니다!
        }
        if (this.characterType === 'penguin') {
            this.drawPenguinTail(ctx, swing, cosSwing);
            return;
        }
        if (this.characterType === 'tiger') {
            this.drawTigerTail(ctx, swing, cosSwing);
            return;
        }

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

    // =========================================================================
    // 🕺 엔딩 댄스 파티 세리머니 렌더링 시스템 (로블록스 정통 그레이 마네킹 & 디테일 안무)
    // 1~10등: 윈드밀 (Holy1 B-boy Windmill 8Iv8alrNj-g)
    // 11~20등: 에이티즈 bad 마지막 하이라이트 (ATEEZ BAD Ending Highlight & Freeze 3ZO5F5wUmBg)
    // 21~30등: red red (Cortis James RED RED 챌린지 1skzg2VEq9I)
    // 31~40등: L을 가져가 (Roblox Rivals Take the L 권루트 챌린지)
    // 41등+: 지코 새삥 (New Thing 오토바이 댄스), 야채, 측면 대 측면, 크림 치즈 허니 (기지개)
    // =========================================================================
    renderCelebrationDance(ctx, cx, cy, scale, danceType = 'windmill', danceTime = 0, dancerModel = 'roblox') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // 1. 화려한 댄스 플로어 & 스포트라이트
        this.drawDanceStageAndSpotlight(ctx, danceType, danceTime);

        // 2. 등수별 지정 안무 렌더링
        switch (danceType) {
            case 'windmill':
                this.drawWindmillBreakdance(ctx, danceTime, dancerModel);
                break;
            case 'ateez_bad':
                this.drawAteezBadDance(ctx, danceTime, dancerModel);
                break;
            case 'red_red':
                this.drawRedRedDance(ctx, danceTime, dancerModel);
                break;
            case 'take_the_l':
                this.drawTakeTheLDance(ctx, danceTime, dancerModel);
                break;
            case 'zico_newthing':
                this.drawZicoNewThingDance(ctx, danceTime, dancerModel);
                break;
            case 'veggie':
                this.drawVeggieDance(ctx, danceTime, dancerModel);
                break;
            case 'side_to_side':
                this.drawSideToSideDance(ctx, danceTime, dancerModel);
                break;
            case 'cream_cheese_honey':
            default:
                this.drawCreamCheeseHoneyDance(ctx, danceTime, dancerModel);
                break;
        }

        // 3. 댄스 파티 특수 이펙트
        this.drawDancePartyEffects(ctx, danceType, danceTime);

        ctx.restore();
    }

    // 🌟 화려한 원형 무대 & 스포트라이트 조명
    drawDanceStageAndSpotlight(ctx, danceType, danceTime) {
        ctx.save();

        const spotGrad = ctx.createRadialGradient(0, -180, 20, 0, 80, 160);
        spotGrad.addColorStop(0, 'rgba(255, 235, 120, 0.45)');
        spotGrad.addColorStop(0.65, 'rgba(0, 245, 212, 0.18)');
        spotGrad.addColorStop(1, 'rgba(255, 0, 127, 0.0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.moveTo(0, -280);
        ctx.lineTo(-145, 90);
        ctx.lineTo(145, 90);
        ctx.closePath();
        ctx.fill();

        const floorGrad = ctx.createLinearGradient(-130, 90, 130, 90);
        floorGrad.addColorStop(0, '#2b2d42');
        floorGrad.addColorStop(0.5, '#4a4e69');
        floorGrad.addColorStop(1, '#22223b');
        ctx.fillStyle = floorGrad;
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 90, 135, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = Math.sin(danceTime * 8) > 0 ? '#00f5d4' : '#ff007f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 88, 128, 32, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (let eq = -3; eq <= 3; eq++) {
            const eqH = 15 + Math.abs(Math.sin(danceTime * 9 + eq * 0.8)) * 32;
            const eqX = eq * 32;
            ctx.fillStyle = eq % 2 === 0 ? 'rgba(0, 245, 212, 0.35)' : 'rgba(255, 0, 127, 0.35)';
            ctx.fillRect(eqX - 8, 55 - eqH, 16, eqH);
        }

        ctx.restore();
    }

    // =========================================================================
    // 🤖 로블록스 정통 그레이 마네킹 (Classic Grey Studio Mannequin Dummy) 렌더러
    // 매트 그레이 바디(#a1a8b0) + 차콜 조인트 라인(#4b5563) + 스터드 + 클린 베벨
    // =========================================================================
    drawRobloxBlockyHead(ctx, x, y, angle = 0, expression = 'smile') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 1. 머리 꼭대기 실린더 스터드 (Roblox Stud)
        ctx.fillStyle = '#a1a8b0';
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.roundRect(-9, -29, 18, 9, 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, -25, 5, 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 2. 큐브형 그레이 블록 머리
        ctx.fillStyle = '#a1a8b0';
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.roundRect(-24, -20, 48, 42, 4);
        ctx.fill();
        ctx.stroke();

        // 플라스틱 광택 베벨
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fillRect(-21, -17, 42, 4);

        // 3. 로블록스 마네킹 표정 (다크 차콜 디테일)
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = '#27272a';

        if (expression === 'smile') {
            ctx.fillRect(-12, -7, 5, 8);
            ctx.fillRect(7, -7, 5, 8);
            ctx.beginPath();
            ctx.arc(0, 4, 10, 0.2, Math.PI - 0.2);
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (expression === 'smug' || expression === 'bad') {
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(-15, -12); ctx.lineTo(-6, -7);
            ctx.moveTo(15, -12); ctx.lineTo(6, -7);
            ctx.stroke();

            ctx.fillRect(-12, -6, 5, 7);
            ctx.fillRect(7, -6, 5, 7);

            ctx.beginPath();
            ctx.moveTo(-6, 7);
            ctx.quadraticCurveTo(4, 9, 13, 3);
            ctx.lineWidth = 3.2;
            ctx.stroke();
        } else if (expression === 'wink') {
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-14, -3); ctx.lineTo(-9, -8); ctx.lineTo(-4, -3);
            ctx.stroke();

            ctx.fillRect(7, -7, 5, 8);

            ctx.beginPath();
            ctx.arc(0, 4, 10, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else if (expression === 'eyes_side') {
            const look = Math.sin(angle * 14) > 0 ? 3.5 : -3.5;
            ctx.fillRect(-12 + look, -7, 5, 8);
            ctx.fillRect(7 + look, -7, 5, 8);
            ctx.beginPath();
            ctx.arc(0, 4, 9, 0.2, Math.PI - 0.2);
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (expression === 'relaxed') {
            // 기지개 켤 때 편안하게 감은 눈 (^_^)
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-15, -3); ctx.lineTo(-10, -8); ctx.lineTo(-5, -3);
            ctx.moveTo(5, -3); ctx.lineTo(10, -8); ctx.lineTo(15, -3);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, 5, 8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawRobloxBlockyTorso(ctx, x, y, angle = 0, color = '#949ba4') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 그레이 마네킹 토르소
        ctx.fillStyle = color;
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        ctx.roundRect(-27, -32, 54, 64, 4);
        ctx.fill();
        ctx.stroke();

        // 플라스틱 하이라이트 베벨
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(-24, -29, 48, 5);

        // 허리 R15 관절 분할 라인
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-25, 14);
        ctx.lineTo(25, 14);
        ctx.stroke();

        ctx.restore();
    }

    drawRobloxBlockyArm(ctx, shoulderX, shoulderY, upperAngle = 0, lowerAngle = 0, color = '#a1a8b0', isLeft = false) {
        ctx.save();
        ctx.translate(shoulderX, shoulderY);
        ctx.rotate(upperAngle);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.5;

        // 상완 (Upper Arm)
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 26, 3);
        ctx.fill();
        ctx.stroke();

        // 관절 링
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(-7, 24, 14, 3);

        // 팔꿈치 관절
        ctx.translate(0, 26);
        ctx.rotate(lowerAngle);

        // 하완 (Lower Arm)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 24, 3);
        ctx.fill();
        ctx.stroke();

        // 로블록스 정통 C자형 컵 손
        ctx.translate(0, 24);
        ctx.fillStyle = '#8e959f';
        ctx.beginPath();
        ctx.roundRect(-8, 0, 16, 14, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#27272a';
        ctx.beginPath();
        ctx.arc(0, 7, 3.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawRobloxBlockyLeg(ctx, hipX, hipY, upperAngle = 0, lowerAngle = 0, color = '#8e959f', isLeft = false) {
        ctx.save();
        ctx.translate(hipX, hipY);
        ctx.rotate(upperAngle);

        ctx.fillStyle = color;
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 3.6;

        // 허벅지 (Upper Leg)
        ctx.beginPath();
        ctx.roundRect(-9, 0, 18, 30, 3);
        ctx.fill();
        ctx.stroke();

        // 무릎 관절 링
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(-8, 28, 16, 3);

        // 무릎 관절
        ctx.translate(0, 30);
        ctx.rotate(lowerAngle);

        // 종아리 (Lower Leg)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-9, 0, 18, 28, 3);
        ctx.fill();
        ctx.stroke();

        // 발 (Foot / Shoe)
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.roundRect(-9, 28, 20, 14, 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // =========================================================================
    // 🌀 [1~10등] 홀리원 B-boy 정통 윈드밀 (8Iv8alrNj-g)
    // =========================================================================
    drawWindmillBreakdance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();
        ctx.translate(0, 35);

        const spin = danceTime * 12.0;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 234, 120, 0.85)';
        ctx.lineWidth = 4;
        for (let a = 0; a < 3; a++) {
            const arcAng = spin + (a * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.arc(0, 0, 75 + a * 18, arcAng, arcAng + 1.3);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffbe0b';
        for (let sp = 0; sp < 8; sp++) {
            const sx = Math.cos(spin * 2 + sp) * (60 + sp * 8);
            const sy = 32 + Math.sin(spin * 3 + sp) * 10;
            ctx.beginPath();
            ctx.arc(sx, sy, 3 + (sp % 4), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (dancerModel === 'roblox') {
            ctx.save();
            ctx.rotate(spin);

            // 130도 와이드 V자 스플릿 다리 회전
            ctx.save();
            ctx.rotate(-1.15);
            this.drawRobloxBlockyLeg(ctx, 0, 0, 0, 0, '#8e959f', true);
            ctx.restore();

            ctx.save();
            ctx.rotate(1.15);
            this.drawRobloxBlockyLeg(ctx, 0, 0, 0, 0, '#8e959f', false);
            ctx.restore();

            this.drawRobloxBlockyTorso(ctx, 0, 0, 0, '#949ba4');
            this.drawRobloxBlockyArm(ctx, -26, -10, -0.6, 0.4, '#a1a8b0', true);
            this.drawRobloxBlockyArm(ctx, 26, -10, 0.6, -0.4, '#a1a8b0', false);

            ctx.restore();

            ctx.save();
            ctx.translate(0, -68);
            this.drawRobloxBlockyHead(ctx, 0, 0, Math.sin(spin) * 0.1, 'wink');
            ctx.restore();

        } else {
            ctx.save();
            ctx.rotate(spin);

            const colors = this.getSpeciesColors();
            const legColor = this.costumeType === 'gentleman' ? '#1e2229' : (this.costumeType === 'santa' ? '#d62828' : colors.skin);
            ctx.fillStyle = legColor;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;

            ctx.save();
            ctx.rotate(-0.65);
            ctx.fillRect(-18, 0, 36, 115);
            ctx.strokeRect(-18, 0, 36, 115);
            ctx.restore();

            ctx.save();
            ctx.rotate(0.65);
            ctx.fillRect(-18, 0, 36, 115);
            ctx.strokeRect(-18, 0, 36, 115);
            ctx.restore();

            ctx.fillStyle = this.costumeType === 'gentleman' ? '#14171a' : (this.costumeType === 'santa' ? '#b7094c' : colors.skin);
            ctx.beginPath();
            ctx.arc(0, 0, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            ctx.save();
            ctx.translate(0, -65);
            ctx.scale(0.85, 0.85);
            if (this.characterType === 'frog') this.drawFrogHead(ctx, 0, 0, true);
            else if (this.characterType === 'tiger') this.drawTigerHead(ctx, 0, 0, true);
            else if (this.characterType === 'penguin') this.drawPenguinHead(ctx, 0, 0, true);
            else this.drawLookBackHead(ctx, 0, 0);

            if (this.costumeType === 'gentleman') this.drawGentlemanTopHat(ctx, 0, true);
            else if (this.costumeType === 'santa') this.drawSantaHat(ctx, 0, true);
            ctx.restore();
        }

        ctx.save();
        ctx.font = '900 19px system-ui, sans-serif';
        ctx.fillStyle = '#ffbe0b';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.strokeText('🌀 [1~10등] 홀리원 B-BOY 정통 윈드밀!', 0, -150);
        ctx.fillText('🌀 [1~10등] 홀리원 B-BOY 정통 윈드밀!', 0, -150);
        ctx.restore();

        ctx.restore();
    }

    // =========================================================================
    // 🔥 [11~20등] 에이티즈 BAD 마지막 하이라이트 (댄스브레이크 & 아웃트로 프리즈 3ZO5F5wUmBg)
    // =========================================================================
    drawAteezBadDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        // 3.6초 아웃트로 하이라이트 사이클 (폭풍 펀치 & 댄스 브레이크 ➔ 극적인 엔딩 프리즈)
        const cycleTime = danceTime % 3.6;
        const isFreezeEnding = cycleTime > 2.7; // 마지막 0.9초는 카리스마 엔딩 정지 포즈!

        if (!isFreezeEnding) {
            // [하이라이트 난타 구간] 고속 142 BPM 펑크 펀치 & 체스트 팝
            const bpm = danceTime * 16.0;
            const beat = Math.sin(bpm);
            const isHit = beat > 0.45;
            const bounceY = Math.abs(beat) * 16;
            const stepSway = Math.sin(bpm * 0.5) * 14;

            ctx.translate(stepSway * 0.35, bounceY);

            if (isHit) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
                ctx.lineWidth = 3.8;
                ctx.beginPath();
                ctx.ellipse(0, 24, 78, 22, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            if (dancerModel === 'roblox') {
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.32, 0.45, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.32, -0.45, '#8e959f', false);

                ctx.save();
                ctx.translate(0, -68 + (isHit ? -7 : 3));
                ctx.scale(isHit ? 1.14 : 0.98, isHit ? 1.08 : 1.0);
                this.drawRobloxBlockyTorso(ctx, 0, 0, 0, '#949ba4');

                const armAngle = isHit ? -1.35 : -1.0;
                this.drawRobloxBlockyArm(ctx, -27, -24, armAngle, -1.2, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -24, -armAngle, 1.2, '#a1a8b0', false);
                ctx.restore();

                ctx.save();
                ctx.translate(0, -68);
                this.drawRobloxBlockyHead(ctx, 0, 0, isHit ? 0.09 : -0.05, 'bad');
                ctx.restore();
            } else {
                ctx.save();
                ctx.translate(0, -68);
                this.drawBackTorsoAndShorts(ctx, 0, true);
                this.drawFrogHead(ctx, 0, 0, true);
                ctx.restore();
            }

            ctx.save();
            ctx.font = '900 23px system-ui, sans-serif';
            ctx.fillStyle = isHit ? '#ff0055' : '#ffbe0b';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('🔥 BAD 마지막 댄스브레이크 폭풍 비트! 🔥', 0, -150);
            ctx.fillText('🔥 BAD 마지막 댄스브레이크 폭풍 비트! 🔥', 0, -150);
            ctx.restore();

        } else {
            // [에이티즈 시그니처 엔딩 프리즈 (Freeze Outro)]
            // 한 손을 머리 뒤로 넘기고, 한 손은 허리에 걸친 채 카메라를 쏘아보는 카리스마 정지 자세!
            ctx.translate(0, 8);

            if (dancerModel === 'roblox') {
                this.drawRobloxBlockyLeg(ctx, -18, -45, -0.25, 0.1, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 18, -45, 0.35, -0.1, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -68, 0.08, '#949ba4');

                // 왼팔: 머리 뒤로 강렬하게 뻗는 프리즈 포즈
                this.drawRobloxBlockyArm(ctx, -27, -85, -2.4, -1.4, '#a1a8b0', true);
                // 오른팔: 허리춤에 각지게 고정한 힙합 락
                this.drawRobloxBlockyArm(ctx, 27, -85, 0.7, -1.1, '#a1a8b0', false);

                // 고개 살짝 숙이며 치명적인 아이컨택
                this.drawRobloxBlockyHead(ctx, 0, -68, -0.08, 'smug');
            } else {
                ctx.save();
                ctx.translate(0, -68);
                this.drawBackTorsoAndShorts(ctx, 0, true);
                this.drawFrogHead(ctx, 0, 0, true);
                ctx.restore();
            }

            ctx.save();
            ctx.font = '900 23px system-ui, sans-serif';
            ctx.fillStyle = '#ffbe0b';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('⚡ ATEEZ BAD 엔딩 프리즈 락! ⚡', 0, -150);
            ctx.fillText('⚡ ATEEZ BAD 엔딩 프리즈 락! ⚡', 0, -150);
            ctx.restore();
        }

        ctx.restore();
    }

    // =========================================================================
    // ❤️ [21~30등] 코르티스 제임스 RED RED 정통 챌린지 (1skzg2VEq9I)
    // =========================================================================
    drawRedRedDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        const cycle = 4.5;
        const phaseTime = danceTime % cycle;
        const phase = phaseTime < 1.5 ? 0 : (phaseTime < 3.0 ? 1 : 2);
        const bpm = Math.sin(danceTime * 9.5);
        const bounceY = Math.abs(bpm) * 12;

        ctx.translate(0, bounceY);

        if (dancerModel === 'roblox') {
            if (phase === 0) {
                // 1구간: "팔랑귀 팔랑귀"
                const earFlutter = Math.sin(danceTime * 32) * 0.45;
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.2, 0.3, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.2, -0.3, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -68, 0, '#949ba4');
                this.drawRobloxBlockyArm(ctx, -27, -85, -2.6 + earFlutter, -0.7, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -85, 2.6 - earFlutter, 0.7, '#a1a8b0', false);
                this.drawRobloxBlockyHead(ctx, 0, -68, Math.sin(danceTime * 8) * 0.1, 'smile');

                ctx.font = '900 20px system-ui, sans-serif';
                ctx.fillStyle = '#ff0055';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3.5;
                ctx.textAlign = 'center';
                ctx.strokeText("👂 팔랑귀 팔랑귀! (THAT'S RED, RED)", 0, -150);
                ctx.fillText("👂 팔랑귀 팔랑귀! (THAT'S RED, RED)", 0, -150);

            } else if (phase === 1) {
                // 2구간: "눈치나 살피기"
                const lookAngle = Math.sin(danceTime * 6) * 0.25;
                this.drawRobloxBlockyLeg(ctx, -16, -45, 0.1, 0.2, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, -0.1, -0.2, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -68, lookAngle * 0.3, '#949ba4');
                this.drawRobloxBlockyArm(ctx, -27, -85, -1.8, -1.1, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -85, 1.8, 1.1, '#a1a8b0', false);
                this.drawRobloxBlockyHead(ctx, 0, -68, lookAngle, 'eyes_side');

                ctx.font = '900 20px system-ui, sans-serif';
                ctx.fillStyle = '#ffbe0b';
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 3.5;
                ctx.textAlign = 'center';
                ctx.strokeText("👀 눈치나 살피기! (THAT'S RED, RED)", 0, -150);
                ctx.fillText("👀 눈치나 살피기! (THAT'S RED, RED)", 0, -150);

            } else {
                // 3구간: "도가니 사리기"
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.4, 0.8, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.4, -0.8, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -62, 0, '#949ba4');
                this.drawRobloxBlockyArm(ctx, -27, -85, -0.5, 1.3, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -85, 0.5, -1.3, '#a1a8b0', false);
                this.drawRobloxBlockyHead(ctx, 0, -62, 0, 'bad');

                ctx.font = '900 20px system-ui, sans-serif';
                ctx.fillStyle = '#ff0055';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3.5;
                ctx.textAlign = 'center';
                ctx.strokeText("🦵 도가니 사리기! (THAT'S RED, RED)", 0, -150);
                ctx.fillText("🦵 도가니 사리기! (THAT'S RED, RED)", 0, -150);
            }

        } else {
            ctx.save();
            ctx.translate(0, -65);
            this.drawBackTorsoAndShorts(ctx, 0, true);
            this.drawFrogHead(ctx, 0, 0, true);
            ctx.restore();
        }

        ctx.restore();
    }

    // =========================================================================
    // 🕺 [31~40등] 로블록스 라이벌즈 'L을 가져가' (권루트 Take the L 챌린지)
    // =========================================================================
    drawTakeTheLDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        const tempo = danceTime * 9.5;
        const hopY = Math.abs(Math.sin(tempo)) * 22;
        const kickDir = Math.sin(tempo);

        ctx.translate(0, -hopY);

        if (dancerModel === 'roblox') {
            if (kickDir > 0) {
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.95, 0.2, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.15, 0.1, '#8e959f', false);
            } else {
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.15, 0.1, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.95, -0.2, '#8e959f', false);
            }

            this.drawRobloxBlockyTorso(ctx, 0, -68, -kickDir * 0.08, '#949ba4');

            const armSwing = Math.sin(tempo) * 0.8;
            this.drawRobloxBlockyArm(ctx, 27, -85, armSwing, 0.2, '#a1a8b0', false);
            this.drawRobloxBlockyHead(ctx, 0, -68, kickDir * 0.06, 'smug');

            ctx.save();
            ctx.translate(0, -85);
            this.drawRobloxBlockyArm(ctx, -27, 0, -2.4, -1.2, '#a1a8b0', true);

            ctx.font = 'bold 32px "Arial Black", sans-serif';
            ctx.fillStyle = '#ffbe0b';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('L', 0, -32);
            ctx.fillText('L', 0, -32);
            ctx.restore();

        } else {
            ctx.save();
            ctx.translate(0, -65);
            this.drawBackTorsoAndShorts(ctx, 0, true);
            this.drawFrogHead(ctx, 0, 0, true);
            ctx.restore();
        }

        ctx.save();
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#ffea79';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.textAlign = 'center';
        ctx.strokeText('🤣 로블록스 L을 가져가 (TAKE THE L)!', 0, -150);
        ctx.fillText('🤣 로블록스 L을 가져가 (TAKE THE L)!', 0, -150);
        ctx.restore();

        ctx.restore();
    }

    // =========================================================================
    // 🏍️ [41등+] 지코 '새삥' (New Thing 오토바이 시동 & 주행 라이딩 댄스 바타 안무)
    // =========================================================================
    drawZicoNewThingDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        const cycle = 3.6;
        const phaseTime = danceTime % cycle;
        const isRevving = phaseTime < 1.4; // 1.4초 동안 부릉부릉 오토바이 시동 걸기!

        if (isRevving) {
            // [오토바이 시동 걸기 & 킥스타터 밟기]
            const kickBeat = Math.sin(danceTime * 14.0);
            const kickY = Math.max(0, kickBeat) * 16;
            ctx.translate(0, -kickY * 0.4);

            if (dancerModel === 'roblox') {
                // 왼다리는 단단하게 지탱, 오른다리는 킥스타터 힘차게 밟기!
                this.drawRobloxBlockyLeg(ctx, -16, -45, 0.1, 0.2, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, -0.5 + Math.max(0, kickBeat) * 0.8, 0.4, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -68, 0.08, '#949ba4');

                // 왼손은 핸들 잡고, 오른손은 스로틀 부릉부릉 감기!
                this.drawRobloxBlockyArm(ctx, -27, -85, -1.3, -0.6, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -85, -1.1 + kickBeat * 0.35, -0.9, '#a1a8b0', false);

                this.drawRobloxBlockyHead(ctx, 0, -68, 0.08, 'smug');
            } else {
                ctx.save();
                ctx.translate(0, -68);
                this.drawBackTorsoAndShorts(ctx, 0, true);
                this.drawFrogHead(ctx, 0, 0, true);
                ctx.restore();
            }

            ctx.save();
            ctx.font = '900 21px system-ui, sans-serif';
            ctx.fillStyle = '#ffbe0b';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('🏍️ 부릉~ 부릉~ 새삥 오토바이 시동 걸기!', 0, -150);
            ctx.fillText('🏍️ 부릉~ 부릉~ 새삥 오토바이 시동 걸기!', 0, -150);
            ctx.restore();

        } else {
            // [오토바이 질주 주행 라이딩 & 바디 팝] "나는 새삥 모든 게 다 새삥!"
            const rideBpm = Math.sin(danceTime * 10.0);
            const rideBounce = Math.abs(rideBpm) * 14;
            const rideWeave = Math.sin(danceTime * 5.0) * 18;

            ctx.translate(rideWeave * 0.4, rideBounce);

            if (dancerModel === 'roblox') {
                // 핸들을 꽉 잡고 무릎 바운스 타며 질주
                this.drawRobloxBlockyLeg(ctx, -16, -45, -0.28, 0.5, '#8e959f', true);
                this.drawRobloxBlockyLeg(ctx, 16, -45, 0.28, -0.5, '#8e959f', false);

                this.drawRobloxBlockyTorso(ctx, 0, -68, rideWeave * 0.008, '#949ba4');

                // 양손으로 와이드 핸들을 꽉 잡고 운전하는 라이딩 포즈
                this.drawRobloxBlockyArm(ctx, -27, -85, -1.4, -0.6, '#a1a8b0', true);
                this.drawRobloxBlockyArm(ctx, 27, -85, 1.4, 0.6, '#a1a8b0', false);

                this.drawRobloxBlockyHead(ctx, 0, -68, rideWeave * 0.006, 'bad');
            } else {
                ctx.save();
                ctx.translate(0, -68);
                this.drawBackTorsoAndShorts(ctx, 0, true);
                this.drawFrogHead(ctx, 0, 0, true);
                ctx.restore();
            }

            ctx.save();
            ctx.font = '900 21px system-ui, sans-serif';
            ctx.fillStyle = '#00f5d4';
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 4;
            ctx.textAlign = 'center';
            ctx.strokeText('🔥 지코 - 새삥 (NEW THING) 질주 라이딩! 🔥', 0, -150);
            ctx.fillText('🔥 지코 - 새삥 (NEW THING) 질주 라이딩! 🔥', 0, -150);
            ctx.restore();
        }

        ctx.restore();
    }

    // =========================================================================
    // 🥦 [41등+] 로블록스 라이벌즈 '야채' (권루트 Vegetables 이모트)
    // =========================================================================
    drawVeggieDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        const jump = Math.abs(Math.sin(danceTime * 10.0)) * 26;
        ctx.translate(0, -jump);

        if (dancerModel === 'roblox') {
            const flap = Math.sin(danceTime * 12.0) * 0.5;
            this.drawRobloxBlockyLeg(ctx, -14, -45, 0.2, 0.4, '#8e959f', true);
            this.drawRobloxBlockyLeg(ctx, 14, -45, -0.2, -0.4, '#8e959f', false);

            this.drawRobloxBlockyTorso(ctx, 0, -68, flap * 0.1, '#949ba4');
            this.drawRobloxBlockyArm(ctx, -27, -85, -1.2 + flap, -1.3, '#a1a8b0', true);
            this.drawRobloxBlockyArm(ctx, 27, -85, 1.2 - flap, 1.3, '#a1a8b0', false);
            this.drawRobloxBlockyHead(ctx, 0, -68, -flap * 0.15, 'smile');

        } else {
            ctx.save();
            ctx.translate(0, -65);
            this.drawBackTorsoAndShorts(ctx, 0, true);
            this.drawFrogHead(ctx, 0, 0, true);
            ctx.restore();
        }

        const veggies = ['🥦', '🥕', '🍅', '🌽', '🥬'];
        ctx.font = '24px sans-serif';
        veggies.forEach((v, idx) => {
            const vx = -70 + idx * 35;
            const vy = -110 - Math.sin(danceTime * 6 + idx) * 20;
            ctx.fillText(v, vx, vy);
        });

        ctx.save();
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#52b788';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.textAlign = 'center';
        ctx.strokeText('🥦 로블록스 야채 (VEGETABLES)!', 0, -150);
        ctx.fillText('🥦 로블록스 야채 (VEGETABLES)!', 0, -150);
        ctx.restore();

        ctx.restore();
    }

    // =========================================================================
    // ↔️ [41등+] 로블록스 라이벌즈 '측면 대 측면' (Side to Side / Floss 이모트)
    // =========================================================================
    drawSideToSideDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        const tempo = danceTime * 11.0;
        const hip = Math.sin(tempo) * 26;
        const armAngle = -Math.sin(tempo) * 0.9;

        ctx.translate(hip * 0.35, 0);

        if (dancerModel === 'roblox') {
            this.drawRobloxBlockyLeg(ctx, -16, -45, 0.2, 0.1, '#8e959f', true);
            this.drawRobloxBlockyLeg(ctx, 16, -45, -0.2, -0.1, '#8e959f', false);

            this.drawRobloxBlockyTorso(ctx, hip * 0.5, -68, hip * 0.008, '#949ba4');
            this.drawRobloxBlockyArm(ctx, -27, -85, armAngle, 0.1, '#a1a8b0', true);
            this.drawRobloxBlockyArm(ctx, 27, -85, armAngle, 0.1, '#a1a8b0', false);
            this.drawRobloxBlockyHead(ctx, 0, -68, -hip * 0.006, 'smile');

        } else {
            ctx.save();
            ctx.translate(0, -65);
            this.drawBackTorsoAndShorts(ctx, 0, true);
            this.drawFrogHead(ctx, 0, 0, true);
            ctx.restore();
        }

        ctx.save();
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.textAlign = 'center';
        ctx.strokeText('↔️ 로블록스 측면 대 측면 (SIDE TO SIDE)!', 0, -150);
        ctx.fillText('↔️ 로블록스 측면 대 측면 (SIDE TO SIDE)!', 0, -150);
        ctx.restore();

        ctx.restore();
    }

    // =========================================================================
    // 🍯 [41등+] 크림 치즈 허니 (다리는 완전히 가만히 서있고, 양팔만 위로 기지개 펴듯이 쭉 뻗는 댄스!)
    // =========================================================================
    drawCreamCheeseHoneyDance(ctx, danceTime, dancerModel = 'roblox') {
        ctx.save();

        // 부드러운 기지개 스트레칭 주기 (4.0초 루프)
        const stretchCycle = Math.sin(danceTime * 3.5);
        const stretchHeight = (stretchCycle + 1) * 0.5; // 0 to 1
        const sideLean = Math.sin(danceTime * 1.8) * 0.08;

        // 다리는 가만히 제자리에 고정! (이동 없음)
        ctx.translate(0, 0);

        if (dancerModel === 'roblox') {
            // 🤖 [로블록스 마네킹]: 다리는 미동 없이 차렷/단단히 서있음
            this.drawRobloxBlockyLeg(ctx, -14, -45, 0, 0, '#8e959f', true);
            this.drawRobloxBlockyLeg(ctx, 14, -45, 0, 0, '#8e959f', false);

            // 상체는 기지개 켜며 시원하게 살짝 젖혀짐 & 좌우 기울기
            this.drawRobloxBlockyTorso(ctx, 0, -68, sideLean, '#949ba4');

            // ★ 핵심: 양팔이 머리 위로 기지개 켜듯이 시원하게 쭉 뻗어짐!
            // 팔이 하늘 높이 만세하며 좌우로 시원하게 펴짐
            const stretchAngleLeft = -2.7 + stretchHeight * 0.35;
            const stretchAngleRight = 2.7 - stretchHeight * 0.35;
            this.drawRobloxBlockyArm(ctx, -27, -85, stretchAngleLeft, -0.2, '#a1a8b0', true);
            this.drawRobloxBlockyArm(ctx, 27, -85, stretchAngleRight, 0.2, '#a1a8b0', false);

            // 기지개 켤 때 나른하고 시원하게 눈 감고 미소 짓는 마네킹 헤드
            this.drawRobloxBlockyHead(ctx, 0, -68, sideLean * 0.8, 'relaxed');

        } else {
            // 🐵 [동물 러너 캐릭터]: 다리는 가만히 서서 양팔만 위로 기지개 펴기!
            const colors = this.getSpeciesColors();
            const armColor = this.costumeType === 'gentleman' ? '#1e2229' : (this.costumeType === 'santa' ? '#d62828' : colors.skin);

            ctx.fillStyle = '#2b303a';
            ctx.fillRect(-30, -45, 24, 72);
            ctx.fillRect(6, -45, 24, 72);

            ctx.save();
            ctx.translate(0, -65);
            ctx.rotate(sideLean);
            this.drawBackTorsoAndShorts(ctx, 0, true);

            // 양팔 기지개 만세
            [-1, 1].forEach(side => {
                ctx.save();
                ctx.translate(side * 28, -85);
                ctx.rotate(side * (0.35 + stretchHeight * 0.2));
                ctx.fillStyle = armColor;
                ctx.fillRect(-8, -85, 18, 85);
                ctx.restore();
            });
            ctx.restore();

            ctx.save();
            ctx.translate(0, -65);
            this.drawFrogHead(ctx, 0, 0, true);
            ctx.restore();
        }

        // 반짝이는 아침 햇살 & 꿀방울 이펙트
        const honeyIcons = ['🍯', '🧀', '✨', '🍯', '✨'];
        ctx.font = '24px sans-serif';
        honeyIcons.forEach((t, idx) => {
            const tx = -65 + idx * 32;
            const ty = -125 - stretchHeight * 15 + Math.sin(danceTime * 4 + idx) * 10;
            ctx.fillText(t, tx, ty);
        });

        // 네온 배너
        ctx.save();
        ctx.font = '900 20px system-ui, sans-serif';
        ctx.fillStyle = '#ffd166';
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3.5;
        ctx.textAlign = 'center';
        ctx.strokeText('🍯 크림 치즈 허니 (다리 고정 & 팔 기지개 댄스)!', 0, -150);
        ctx.fillText('🍯 크림 치즈 허니 (다리 고정 & 팔 기지개 댄스)!', 0, -150);
        ctx.restore();

        ctx.restore();
    }

    // ✨ 댄스 파티 특수 이펙트
    drawDancePartyEffects(ctx, danceType, danceTime) {
        ctx.save();
        const notes = ['♪', '♫', '♬', '♩'];
        ctx.font = 'bold 22px sans-serif';
        for (let n = 0; n < 6; n++) {
            const nx = Math.sin(danceTime * 2.5 + n * 1.2) * 95;
            const ny = -70 - ((danceTime * 40 + n * 35) % 150);
            ctx.fillStyle = n % 2 === 0 ? '#00f5d4' : '#ff007f';
            ctx.fillText(notes[n % notes.length], nx, ny);
        }
        ctx.restore();
    }
}
