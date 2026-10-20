/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 2 대규모 업그레이드]
 * - 5단계 스테이지별 고밀도 배경 디테일 & 단계별 속도 대폭 가속
 * - 스테이지별 전용 돌진 위협 기물:
 *   1단계(숲): 거칠고 입체적인 진짜 바위 돌(rolling_stone)
 *   2단계(사막): 집게발과 독침을 세운 거대 전갈(desert_scorpion)
 *   3단계(해저): 이빨을 드러내고 돌진하는 백상아리 상어(undersea_shark)
 *   4단계(도시): 헤드라이트를 켜고 달려오는 타임스퀘어 자동차/택시(city_car)
 *   5단계(글리치 보이드): 치지직 글리치 스피드 큐브(glitch_hazard)
 * - 신규 기물 대거 추가: 가시/네온 허들(hurdle), 좌우 이동 바리케이드(moving_barrier), 2레인 복합 장애물
 * - 신규 특별 아이템: 🚀 슈퍼점프 5초(super_jump), 👑 손오공 진화(wukong - 최대 체력 증가 & 회복), 🛡️ 무적 방패(shield - 스폰율 낮추고 3.2초로 밸런스 조정)
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 */

class TrackManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.stage = 1; // 1:숲, 2:사막, 3:스폰지밥 해저, 4:타임스퀘어 도시(밤), 5:글리치 보이드, 6:학교 엔딩
        this.scrollDist = 0;
        this.obstacles = [];
        this.items = [];
        this.popups = [];
        this.particles = [];
        this.stageBanner = null; // 스테이지 전환 시 상단에 깔끔하게 뜨는 배너
        this.stagePauseTimer = 0; // 스테이지 전환 시 3초 쉬고 시작하는 휴식 타이머
        this.spawnTimer = 0.65;
        this.coinSpawnTimer = 0.4;
        this.selectedRoute = null; // null: 선택 대기 | 1: 안정적인 도로 | 2: 위험하지만 보상이 강한 도로
        this.roadSignsZ = 0.58;    // 시작 갈림길 간판 Z 위치 (트랙 정면에 입체 렌더링)
        // 동물 개체 수를 40% 이상 줄이고 간격을 넓혀 쾌적하게 배치!
        this.sideProps = [
            { z: 0.14, variant: 0 },
            { z: 0.39, variant: 1 },
            { z: 0.64, variant: 2 },
            { z: 0.89, variant: 3 }
        ];
    }

    triggerStageBanner(title, subtitle, bgColor = '#ffbe0b', withPause = false) {
        this.stageBanner = {
            title,
            subtitle,
            bgColor,
            elapsed: 0,
            duration: 3.0
        };
        if (withPause) {
            // 레벨이 넘어갈 때 기존 장애물을 모두 치우고 3초 동안 안전하게 쉬고 출발!
            this.stagePauseTimer = 3.0;
            this.obstacles = [];
            this.spawnTimer = 0.9;
        }
    }

    // 스누피 카툰 펜 해칭(빗금 음영) 헬퍼
    drawHatching(ctx, x1, y1, x2, y2, count, len, angle = -0.6) {
        ctx.save();
        ctx.strokeStyle = 'rgba(26, 22, 18, 0.45)';
        ctx.lineWidth = 2.0;
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

    project(z, lane, width, height) {
        const horizonY = height * 0.42;
        const groundY = height * 0.84;
        const centerX = width * 0.5;
        const topRoadW = 150;
        const botRoadW = Math.min(width * 0.94, 960);

        const zPow = Math.pow(Math.max(0.001, z), 1.85);
        const y = horizonY + (groundY - horizonY) * zPow;
        // 바닥 트랙 타일(renderBackgroundAndRoad)의 Y 위치별 실제 도로 폭과 100% 일치시킴!
        const roadFrac = Math.max(0.001, (y - horizonY) / (height - horizonY));
        const roadW = topRoadW + (botRoadW - topRoadW) * roadFrac;
        // 5레인 시스템: lane은 -2, -1, 0, 1, 2
        const x = centerX + lane * (roadW / 5);
        const scale = 0.18 + 0.82 * zPow;

        return { x, y, roadW, scale, zPow, horizonY, groundY, centerX, topRoadW, botRoadW, roadFrac };
    }

    // 컴팩트하게 최적화된 바닥 히트박스 4꼭짓점 계산 (5개 레인 완벽 호환)
    getTrackCellCorners(z, lane, width, height) {
        const p = this.project(z, lane, width, height);
        const progCenter = Math.pow(p.roadFrac, 1 / 1.85);
        // 타일 1칸 대비 컴팩트한 히트박스
        const halfTileProg = (0.82 / 9) * 0.28;
        const prog1 = Math.max(0.001, progCenter - halfTileProg);
        const prog2 = Math.min(1.06, progCenter + halfTileProg);

        const rf1 = Math.pow(prog1, 1.85);
        const rf2 = Math.pow(prog2, 1.85);

        const y1 = p.horizonY + (height - p.horizonY) * rf1;
        const y2 = p.horizonY + (height - p.horizonY) * rf2;
        const w1 = p.topRoadW + (p.botRoadW - p.topRoadW) * rf1;
        const w2 = p.topRoadW + (p.botRoadW - p.topRoadW) * rf2;

        const halfW1 = (w1 / 5) * 0.44;
        const halfW2 = (w2 / 5) * 0.44;

        const x1L = p.centerX + lane * (w1 / 5) - halfW1;
        const x1R = p.centerX + lane * (w1 / 5) + halfW1;
        const x2R = p.centerX + lane * (w2 / 5) + halfW2;
        const x2L = p.centerX + lane * (w2 / 5) - halfW2;

        return { x1L, y1, x1R, x2R, y2, x2L };
    }

    // 정사각형 바닥 트랙의 칸과 동일한 히트박스 렌더링
    drawTrackCellHitbox(ctx, z, lane, width, height, fillColor, strokeColor, lineW = 3.5) {
        const c = this.getTrackCellCorners(z, lane, width, height);
        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineW;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(c.x1L, c.y1);
        ctx.lineTo(c.x1R, c.y1);
        ctx.lineTo(c.x2R, c.y2);
        ctx.lineTo(c.x2L, c.y2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    addPopup(x, y, text, color = '#d64531') {
        this.popups.push({ x, y, text, color, alpha: 1.0 });
    }

    addBurstParticles(x, y, color = '#f6d54a', count = 10) {
        for (let i = 0; i < count; i++) {
            const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
            const spd = 80 + Math.random() * 150;
            this.particles.push({
                x, y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 60,
                r: 5 + Math.random() * 6,
                color,
                alpha: 1.0
            });
        }
    }

    isMovingChaserType(type) {
        return (
            type === 'rolling_stone' ||
            type === 'desert_scorpion' ||
            type === 'undersea_shark' ||
            type === 'city_car' ||
            type === 'glitch_hazard'
        );
    }

    getStageChaserType() {
        if (this.stage === 1) return 'rolling_stone';      // 1단계 숲: 굴러오는 바위 돌
        if (this.stage === 2) return 'desert_scorpion';    // 2단계 사막: 달려오는 전갈
        if (this.stage === 3) return 'undersea_shark';     // 3단계 해저: 돌진하는 상어
        if (this.stage === 4) return 'city_car';           // 4단계 도시: 달려오는 자동차
        return 'glitch_hazard';                            // 5단계 글리치 보이드: 글리치 큐브
    }

    update(dt, gameSpeed, hero, mathGateActive, callbacks) {
        if (this.stageBanner) {
            this.stageBanner.elapsed += dt;
            if (this.stageBanner.elapsed >= this.stageBanner.duration) {
                this.stageBanner = null;
            }
        }

        // 시작 갈림길 3D 간판 접근/통과 로직
        if (this.roadSignsZ > 0) {
            if (this.selectedRoute) {
                this.roadSignsZ += dt * gameSpeed * 0.45;
                if (this.roadSignsZ > 1.35) this.roadSignsZ = -1;
            } else {
                this.roadSignsZ = Math.min(0.70, this.roadSignsZ + dt * 0.16);
            }
        }

        if (this.stage === 6) return;

        // 레벨 전환 시 3초 동안 기물 생성을 멈추고 안전하게 숨을 고르는 휴식 시간!
        if (this.stagePauseTimer > 0) {
            this.stagePauseTimer = Math.max(0, this.stagePauseTimer - dt);
        }

        // 최고 속도를 기존 대비 30% 이상 낮추어 단계가 올라가도 쾌적하게 컨트롤 가능하도록 조정!
        const stageSpeedTable = { 1: 0.90, 2: 1.02, 3: 1.14, 4: 1.26, 5: 1.38 };
        const stageSpeedMult = stageSpeedTable[this.stage] || 1.0;
        const dz = dt * gameSpeed * stageSpeedMult * 0.30;
        this.scrollDist += dz;

        this.sideProps.forEach(p => {
            p.z += dz;
            if (p.z > 1.15) p.z -= 1.15;
        });

        // 장애물 출현 빈도: 도로 선택 완료 전에는 대기, 1번 도로는 안전하게, 2번 도로는 장애물 20% 증가!
        if (!mathGateActive && this.stagePauseTimer <= 0 && this.selectedRoute) {
            this.spawnTimer -= dt * gameSpeed * stageSpeedMult;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern(callbacks);
                const isSafeRoute = this.selectedRoute === 1;
                // 2번 도로는 장애물 출현 빈도를 20% 올리기 위해 스폰 간격을 20% 단축 (x 0.80)
                const baseInterval = isSafeRoute
                    ? Math.max(1.15, 1.55 - (this.stage - 1) * 0.1)
                    : Math.max(0.52, (1.02 - (this.stage - 1) * 0.08) * 0.80);
                this.spawnTimer = baseInterval + Math.random() * 0.20;
            }
        }

        this.coinSpawnTimer -= dt * gameSpeed;
        if (this.coinSpawnTimer <= 0 && !mathGateActive && this.stagePauseTimer <= 0 && this.selectedRoute) {
            this.spawnCoinLine();
            // 아이템이 너무 많이 나오지 않도록 생성 주기를 대폭 늘림 (3.2초 ~ 4.5초)
            this.coinSpawnTimer = 3.2 + Math.random() * 1.3;
        }

        // 아이템 업데이트 및 충돌
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.z += dz;

            if (!item.collected && item.z > 0.78 && item.z < 0.98) {
                if (Math.abs(hero.laneX - item.lane) < 0.50) {
                    item.collected = true;
                    if (item.type === 'coin') callbacks.onCoin(item);
                    else if (item.type === 'banana') callbacks.onBananaBundle(item);
                    else if (item.type === 'shield') callbacks.onShield(item);
                    else if (item.type === 'super_jump') callbacks.onSuperJump(item);
                    else if (item.type === 'wukong') callbacks.onWukong(item);
                    else if (item.type === 'laser_gun' && callbacks.onLaserGun) callbacks.onLaserGun(item);
                }
            }
            if (item.z > 1.18) this.items.splice(i, 1);
        }

        // 톰 골드런 스타일 경사로(ramp) 또는 멈춰있는 트럭/버스(climb_truck) 지붕 위에 올라가 있는지 판정
        let onRampHeight = 0;

        // 장애물 업데이트 및 충돌 (모든 기물이 누락 없이 확실하게 데미지를 주도록 판정 전면 개선!)
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const isChaser = this.isMovingChaserType(obs.type);
            const extraSpeed = isChaser ? dz * 0.34 : 0;
            obs.z += dz + extraSpeed;

            if (obs.type === 'rolling_stone' || obs.type === 'glitch_hazard') {
                obs.rot = (obs.rot || 0) + dt * 11;
            }
            if (obs.type === 'moving_barrier') {
                obs.movePhase = (obs.movePhase || 0) + dt * 2.8;
                obs.baseLane = obs.baseLane !== undefined ? obs.baseLane : obs.lane;
                obs.lane = Math.max(-2, Math.min(2, obs.baseLane + Math.sin(obs.movePhase) * 0.38));
            }

            // 🔫 레이저총(4초) 활성화 시: 유저가 있는 레인의 기물을 레이저 빔이 즉시 증발시켜 없앰!
            if (
                hero.laserGunTimer > 0 &&
                obs.type !== 'ramp' &&
                obs.type !== 'climb_truck' &&
                obs.z > 0.14 &&
                obs.z < 1.00 &&
                Math.abs(obs.lane - hero.laneX) < 0.50
            ) {
                if (callbacks.onLaserDestroy) callbacks.onLaserDestroy(obs);
                this.obstacles.splice(i, 1);
                continue;
            }

            // 1) 경사로(ramp): 밟고 올라가서 달릴 수 있는 경사 발판
            if (obs.type === 'ramp') {
                if (obs.z > 0.70 && obs.z < 1.04 && Math.abs(hero.laneX - obs.lane) < 0.36) {
                    onRampHeight = 88;
                    if (!obs.passed) {
                        obs.passed = true;
                        callbacks.onRampClimb(obs);
                    }
                }
            } else if (obs.type === 'climb_truck') {
                // 2) 멈춘 대형 트럭/버스(climb_truck):
                // 점프해서 올라타거나(hero.y > 22) 이미 높은 플랫폼 위에 있으면 트럭 지붕 위를 달릴 수 있고,
                // 점프하지 않고 맨땅에서 트럭 정면에 그대로 부딪히면 다른 장애물과 동일하게 충돌 데미지(-25 HP)가 들어감!
                if (obs.z > 0.68 && obs.z < 1.05 && Math.abs(hero.laneX - obs.lane) < 0.36) {
                    if (obs.climbing || hero.y > 22 || hero.platformY > 36) {
                        obs.climbing = true;
                        onRampHeight = 106;
                        if (!obs.passed) {
                            obs.passed = true;
                            callbacks.onRampClimb(obs);
                        }
                    } else if (!obs.hit && obs.z > 0.86 && obs.z < 1.01 && Math.abs(hero.laneX - obs.lane) < 0.32) {
                        obs.hit = true;
                        callbacks.onObstacleHit(obs);
                    }
                }
            } else if (!obs.hit) {
                // 3) 모든 공격형 장애물(통나무, 허들, 아치, 기둥, 이동 기물, 스테이지별 돌진 기물)
                // 요청 반영: 히트박스를 컴팩트하게 줄여(레인 ±0.32, Z: 0.86 ~ 1.01) 억울한 충돌 방지 및 쾌적한 플레이!
                if (obs.z > 0.86 && obs.z < 1.01 && Math.abs(hero.laneX - obs.lane) < 0.32) {
                    let avoided = false;
                    const totalHeroHeight = hero.y + hero.platformY;

                    if (
                        (obs.type === 'log' || obs.type === 'hurdle' || isChaser || obs.type === 'moving_barrier') &&
                        totalHeroHeight > 44
                    ) {
                        avoided = true;
                    } else if ((obs.type === 'arch' || obs.type === 'pillar') && totalHeroHeight > 130) {
                        avoided = true;
                    } else if (obs.type === 'arch' && hero.isSliding) {
                        avoided = true;
                    }

                    if (!avoided) {
                        obs.hit = true;
                        callbacks.onObstacleHit(obs);
                    }
                } else if (!obs.passed && obs.z >= 1.01) {
                    obs.passed = true;
                    callbacks.onObstacleAvoided(obs);
                }
            }

            if (obs.z > 1.18) this.obstacles.splice(i, 1);
        }

        hero.targetPlatformY = onRampHeight;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 320 * dt;
            pt.alpha -= dt * 1.6;
            if (pt.alpha <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.popups.length - 1; i >= 0; i--) {
            const pp = this.popups[i];
            pp.y -= dt * 70;
            pp.alpha -= dt * 1.15;
            if (pp.alpha <= 0) this.popups.splice(i, 1);
        }
    }

    spawnObstaclePattern(callbacks) {
        const lanes = [-2, -1, 0, 1, 2];
        const chaserType = this.getStageChaserType();
        const types = [
            chaserType,
            'log',
            'hurdle',
            'arch',
            'pillar',
            'moving_barrier',
            'climb_truck',
            'ramp'
        ];

        // 🎯 억울한 충돌 방지: 현재 Z < 0.35 전방에 존재하는 기물들의 레인 조사
        const nearObstacles = this.obstacles.filter(o => o.z < 0.35);
        const occupiedLanes = new Set(nearObstacles.map(o => Math.round(o.lane)));

        // 아직 기물이 없는 안전한 레인 후보군
        const safeLanes = lanes.filter(l => !occupiedLanes.has(l));
        // 전방에 이미 위험 구간이 형성되어 있다면(남은 안전 레인이 2개 미만) 추가 생성 금지하여 회피 통로 절대 보장!
        if (safeLanes.length < 3) return;

        const chosenLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        this.obstacles.push({
            lane: chosenLane,
            baseLane: chosenLane,
            z: 0.03,
            type: chosenType,
            rot: 0,
            movePhase: Math.random() * Math.PI * 2,
            climbing: false,
            hit: false,
            passed: false
        });

        // 2번째 기물 생성: 2번 도로는 장애물 출현 20% 증가 적용! (최소 3개 레인은 항상 안전 보장)
        const remainingLanes = safeLanes.filter(l => l !== chosenLane);
        const secondObstacleChance = (this.selectedRoute === 2)
            ? Math.min(0.85, (0.48 + this.stage * 0.04) * 1.20)
            : (0.48 + this.stage * 0.04);
        if (
            chosenType !== 'moving_barrier' &&
            remainingLanes.length >= 3 &&
            Math.random() < secondObstacleChance
        ) {
            const secondLane = remainingLanes[Math.floor(Math.random() * remainingLanes.length)];
            const subTypes = ['log', 'hurdle', 'pillar', 'arch', 'climb_truck', chaserType];
            this.obstacles.push({
                lane: secondLane,
                baseLane: secondLane,
                z: 0.03,
                type: subTypes[Math.floor(Math.random() * subTypes.length)],
                rot: 0,
                climbing: false,
                hit: false,
                passed: false
            });
        }

        if (this.isMovingChaserType(chosenType) && callbacks && callbacks.onChaserSpawn) {
            callbacks.onChaserSpawn(chosenType);
        }

        // 경사로(ramp) 또는 멈춰있는 트럭(climb_truck) 지붕 위에 코인 2개 배치
        if ((chosenType === 'ramp' || chosenType === 'climb_truck') && Math.random() < 0.65) {
            for (let k = 0; k < 2; k++) {
                this.items.push({
                    lane: chosenLane,
                    z: 0.03 - k * 0.045,
                    type: 'coin',
                    onRamp: true,
                    collected: false
                });
            }
        }
    }

    spawnCoinLine() {
        const lanes = [-2, -1, 0, 1, 2];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const count = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            let itemType = 'coin';
            if (i === count - 1) {
                const r = Math.random();
                // 특별 아이템 등장 확률 (총 22% 내에 레이저총 포함!)
                if (r < 0.035) itemType = 'shield';
                else if (r < 0.080) itemType = 'super_jump';
                else if (r < 0.125) itemType = 'wukong';
                else if (r < 0.180) itemType = 'laser_gun'; // 🔫 4초간 유저 레인 기물 자동 파괴 레이저총!
                else if (r < 0.220) itemType = 'banana';
            }
            this.items.push({
                lane,
                z: 0.02 - i * 0.065,
                type: itemType,
                onRamp: false,
                collected: false
            });
        }
    }

    /**
     * 3D 입체 박스(직육면체) 원근 렌더링 헬퍼
     * (정면 Front + 윗면 Top + 옆면 Side 두께를 소실점 방향으로 입체 투영)
     */
    draw3DBox(ctx, x, y, w, h, dx, dy, frontCol, topCol, sideCol) {
        const hw = w * 0.5;
        const cornerR = Math.min(14, w * 0.18, h * 0.18);

        // 1) 윗면 (Top Face)
        ctx.fillStyle = topCol;
        ctx.beginPath();
        ctx.moveTo(x - hw, y - h);
        ctx.lineTo(x - hw + dx, y - h + dy);
        ctx.lineTo(x + hw + dx, y - h + dy);
        ctx.lineTo(x + hw, y - h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2) 옆면 (Side Extrusion Face)
        ctx.fillStyle = sideCol;
        ctx.beginPath();
        if (dx >= 0) {
            ctx.moveTo(x + hw, y - h);
            ctx.lineTo(x + hw + dx, y - h + dy);
            ctx.lineTo(x + hw + dx, y + dy);
            ctx.lineTo(x + hw, y);
        } else {
            ctx.moveTo(x - hw, y - h);
            ctx.lineTo(x - hw + dx, y - h + dy);
            ctx.lineTo(x - hw + dx, y + dy);
            ctx.lineTo(x - hw, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3) 정면 (Front Face - 동글동글 라운드 큐브 & 고퀄리티 젤리 글로스)
        ctx.fillStyle = frontCol;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - hw, y - h, w, h, cornerR);
        } else {
            ctx.rect(x - hw, y - h, w, h);
        }
        ctx.fill();
        ctx.stroke();

        // 상단 부드러운 하이라이트 띠
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x - hw + 4, y - h + 4, w - 8, Math.max(5, h * 0.22), cornerR * 0.5);
        } else {
            ctx.rect(x - hw + 4, y - h + 4, w - 8, Math.max(5, h * 0.22));
        }
        ctx.fill();
    }

    // 🌺 스폰지밥 비키니 시티 스타일 해저 꽃구름(Tropical Flower Cloud) 렌더링 헬퍼
    drawBikiniFlowerCloud(ctx, fx, fy, r, petalColor, centerColor, rot = 0) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.6;
        ctx.fillStyle = petalColor;

        // 5개의 둥글고 통통한 하와이안 꽃잎 구름
        const petals = 5;
        for (let i = 0; i < petals; i++) {
            const ang = (i / petals) * Math.PI * 2;
            const px = Math.cos(ang) * (r * 0.58);
            const py = Math.sin(ang) * (r * 0.58);
            ctx.beginPath();
            ctx.ellipse(px, py, r * 0.52, r * 0.38, ang, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // 중앙 도넛 링
        ctx.fillStyle = centerColor;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#48cae4';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    // 🍍 스폰지밥 비키니 시티 시그니처 하우스 4종 (파인애플 집, 징징이 모아이 집, 뚱이 바위 집, 집게리아)
    drawBikiniHouse(ctx, hx, hy, scale, houseType, time) {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (houseType === 'pineapple') {
            // 🍍 1) 스폰지밥 파인애플 하우스 (다이아몬드 격자 껍질 + 초록 잎사귀 왕관 + 굴뚝 + 동그란 철문 & 창문)
            // 초록색 뾰족 파인애플 잎사귀 왕관 7장
            const leafAngles = [-0.65, -0.42, -0.2, 0, 0.2, 0.42, 0.65];
            leafAngles.forEach((la, idx) => {
                ctx.save();
                ctx.translate(0, -118);
                ctx.rotate(la + Math.sin(time * 2.5 + idx) * 0.03);
                ctx.fillStyle = idx % 2 === 0 ? '#2a9d8f' : '#52b788';
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.quadraticCurveTo(0, -68 - (idx % 2) * 14, 0, -76 - (idx % 2) * 12);
                ctx.quadraticCurveTo(12, -40, 12, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            });

            // 우측 은색 강철 굴뚝 파이프
            ctx.fillStyle = '#adb5bd';
            ctx.beginPath();
            ctx.moveTo(32, -88);
            ctx.lineTo(54, -104);
            ctx.lineTo(54, -124);
            ctx.lineTo(42, -124);
            ctx.lineTo(42, -110);
            ctx.lineTo(26, -98);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 통통한 주황색 파인애플 본체
            const pineGrad = ctx.createRadialGradient(-14, -72, 10, 0, -60, 68);
            pineGrad.addColorStop(0, '#ffbe0b');
            pineGrad.addColorStop(0.55, '#fb8500');
            pineGrad.addColorStop(1, '#d62828');
            ctx.fillStyle = pineGrad;
            ctx.beginPath();
            ctx.ellipse(0, -60, 48, 64, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 파인애플 다이아몬드 대각선 격자 무늬
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(0, -60, 46, 62, 0, 0, Math.PI * 2);
            ctx.clip();
            ctx.strokeStyle = 'rgba(155, 34, 38, 0.55)';
            ctx.lineWidth = 2.2;
            for (let d = -90; d <= 90; d += 22) {
                ctx.beginPath();
                ctx.moveTo(d - 50, -130);
                ctx.lineTo(d + 50, 10);
                ctx.moveTo(d + 50, -130);
                ctx.lineTo(d - 50, 10);
                ctx.stroke();
            }
            ctx.restore();

            // 둥근 잠수함 창문 2개
            [[-20, -82], [22, -52]].forEach(([wx, wy]) => {
                ctx.fillStyle = '#90e0ef';
                ctx.beginPath();
                ctx.arc(wx, wy, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = '#adb5bd';
                ctx.lineWidth = 3.5;
                ctx.stroke();
                ctx.strokeStyle = '#1a1612';
                ctx.lineWidth = 2.5;
            });

            // 둥근 철제 현관문 & 조타 핸들
            ctx.fillStyle = '#6c757d';
            ctx.beginPath();
            ctx.roundRect(-16, -42, 32, 42, [16, 16, 0, 0]);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#dee2e6';
            ctx.beginPath();
            ctx.arc(0, -21, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else if (houseType === 'moai') {
            // 🗿 2) 징징이 이스터섬 모아이 석상 하우스 (청회색 석조 얼굴 + 일자 눈썹 + 긴 코 + 둥근 눈 창문 + 나무 문)
            const moaiGrad = ctx.createLinearGradient(-36, -135, 36, 0);
            moaiGrad.addColorStop(0, '#457b9d');
            moaiGrad.addColorStop(1, '#1d3557');
            ctx.fillStyle = moaiGrad;
            ctx.beginPath();
            ctx.moveTo(-38, 0);
            ctx.lineTo(-30, -135);
            ctx.lineTo(30, -135);
            ctx.lineTo(38, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 양옆 귀 석판
            ctx.fillStyle = '#2a6f97';
            ctx.fillRect(-46, -88, 9, 36);
            ctx.strokeRect(-46, -88, 9, 36);
            ctx.fillRect(37, -88, 9, 36);
            ctx.strokeRect(37, -88, 9, 36);

            // 굵은 일자 눈썹 돌출부
            ctx.fillStyle = '#1d3557';
            ctx.fillRect(-35, -112, 70, 14);
            ctx.strokeRect(-35, -112, 70, 14);

            // 눈 모양 둥근 창문 2개
            [-17, 17].forEach(ex => {
                ctx.fillStyle = '#ffea79';
                ctx.beginPath();
                ctx.arc(ex, -88, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 길고 네모난 모아이 코
            ctx.fillStyle = '#2a6f97';
            ctx.fillRect(-9, -96, 18, 44);
            ctx.strokeRect(-9, -96, 18, 44);

            // 아치형 나무 현관문
            ctx.fillStyle = '#8d5b3c';
            ctx.beginPath();
            ctx.roundRect(-14, -38, 28, 38, [14, 14, 0, 0]);
            ctx.fill();
            ctx.stroke();

        } else if (houseType === 'rock') {
            // 🪨 3) 뚱이 둥근 바위 집 (반구형 갈색 바위 + 꼭대기 황금 풍향계 화살표)
            ctx.strokeStyle = '#ffbe0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, -62);
            ctx.lineTo(0, -86);
            ctx.moveTo(-12, -76);
            ctx.lineTo(12, -76);
            ctx.stroke();

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.2;
            const rockGrad = ctx.createRadialGradient(-12, -42, 6, 0, -25, 52);
            rockGrad.addColorStop(0, '#9c6644');
            rockGrad.addColorStop(1, '#582f0e');
            ctx.fillStyle = rockGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 46, Math.PI, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -28, -14, 24, -14, 6, 8, -0.5);

        } else if (houseType === 'krusty') {
            // 🍔 4) 집게리아(Krusty Krab) 통나무 게 통발 식당 & 대형 검은 닻
            ctx.fillStyle = '#7f4f24';
            ctx.beginPath();
            ctx.roundRect(-48, -74, 96, 74, [24, 24, 0, 0]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#caf0f8';
            ctx.fillRect(-36, -46, 72, 34);
            ctx.strokeRect(-36, -46, 72, 34);

            // 만국기 깃발 장식
            ['#e63946', '#ffbe0b', '#06d6a0', '#3a86ff'].forEach((fc, idx) => {
                ctx.fillStyle = fc;
                ctx.beginPath();
                ctx.moveTo(-36 + idx * 18, -74);
                ctx.lineTo(-27 + idx * 18, -58);
                ctx.lineTo(-18 + idx * 18, -74);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // 조개 간판
            ctx.fillStyle = '#ff006e';
            ctx.beginPath();
            ctx.arc(0, -88, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px "Comic Neue", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('KRUSTY', 0, -85);
        }
        ctx.restore();
    }

    // 🪼 스폰지밥 비키니 시티 분홍 해파리(Bikini Bottom Pink Jellyfish)
    drawBikiniJellyfish(ctx, jx, jy, scale, time, seed = 0) {
        ctx.save();
        ctx.translate(jx, jy + Math.sin(time * 5 + seed) * 10);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.6;

        // 꿈틀거리는 분홍 촉수 4가닥
        [-10, -3, 4, 11].forEach((tx, idx) => {
            const wave = Math.sin(time * 9 + idx + seed) * 5;
            ctx.strokeStyle = '#ff006e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tx, 4);
            ctx.quadraticCurveTo(tx + wave, 16, tx - wave * 0.6, 26);
            ctx.stroke();
        });

        // 분홍 반점 해파리 갓
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.6;
        ctx.fillStyle = '#ff758f';
        ctx.beginPath();
        ctx.arc(0, 4, 18, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff006e';
        [[-8, -4, 3.2], [2, -8, 3.8], [9, -2, 2.8]].forEach(([sx, sy, sr]) => {
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // =========================================================================
    // 1단계~5단계 테마 배경 + 고밀도 디테일 렌더링
    // =========================================================================
    renderBackgroundAndRoad(ctx, width, height, time) {
        const horizonY = height * 0.42;
        const centerX = width * 0.5;
        const topRoadW = 150;
        const botRoadW = Math.min(width * 0.94, 960);

        const themes = {
            1: { // 1단계: 숲속 (Forest)
                skyTop: '#52b788', skyMid: '#95d5b2', skyBot: '#d8f3dc',
                ground: '#40916c', roadTop: '#e6d2ab', roadBot: '#c9ada7',
                tileA: '#ddb892', tileB: '#b08968'
            },
            2: { // 2단계: 사막 (Desert)
                skyTop: '#f77f00', skyMid: '#fcbf49', skyBot: '#eae2b7',
                ground: '#e9c46a', roadTop: '#f4e285', roadBot: '#dda15e',
                tileA: '#e9c46a', tileB: '#d4a373'
            },
            3: { // 3단계: 스폰지밥 비키니 시티 해저 (Bikini Bottom Undersea!)
                skyTop: '#0096c7', skyMid: '#48cae4', skyBot: '#ade8f4',
                ground: '#f4e285', roadTop: '#caf0f8', roadBot: '#48cae4',
                tileA: '#ffea79', tileB: '#90e0ef'
            },
            4: { // 4단계: 도시 (타임스퀘어 밤 느낌)
                skyTop: '#070714', skyMid: '#141829', skyBot: '#2b2d42',
                ground: '#1f2232', roadTop: '#495057', roadBot: '#212529',
                tileA: '#343a40', tileB: '#495057'
            },
            5: { // 5단계: 글리치 보이드 (Glitch Void)
                skyTop: '#05000a', skyMid: '#1a002c', skyBot: '#240046',
                ground: '#10002b', roadTop: '#3c096c', roadBot: '#10002b',
                tileA: '#240046', tileB: '#5a189a'
            },
            6: { // 클리어 엔딩: 학교 도착 (School)
                skyTop: '#90e0ef', skyMid: '#caf0f8', skyBot: '#fffcf2',
                ground: '#95d5b2', roadTop: '#e6d2ab', roadBot: '#d5b887',
                tileA: '#e3c99b', tileB: '#d6b886'
            }
        };

        const th = themes[this.stage] || themes[1];

        // 1. 하늘 그라데이션
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0.0, th.skyTop);
        skyGrad.addColorStop(0.45, th.skyMid);
        skyGrad.addColorStop(1.0, th.skyBot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. 스테이지별 원경 특수 배경 렌더링 (디테일 대폭 강화)
        this.renderStageSkyDetails(ctx, width, height, horizonY, centerX, time);

        // 3. 지평선 지면 (모래언덕/잔디밭 굴곡 디테일)
        ctx.fillStyle = th.ground;
        ctx.strokeStyle = this.stage === 5 ? '#00f5d4' : '#1a1612';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.quadraticCurveTo(centerX, horizonY - 12, width, horizonY + 8);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. 3D 원근 3레인 도로 및 좌우 입체 연석(3D Curbs)
        const curbTopW = 6;
        const curbBotW = 34;
        const curbTopH = 4;
        const curbBotH = 22;

        // 좌측 3D 입체 연석 (측면 + 윗면)
        ctx.fillStyle = this.stage === 5 ? '#7209b7' : (this.stage === 3 ? '#ff9f1c' : '#5c4938');
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX - topRoadW * 0.5 - curbTopW, horizonY - curbTopH);
        ctx.lineTo(centerX - topRoadW * 0.5, horizonY - curbTopH);
        ctx.lineTo(centerX - botRoadW * 0.5, height - curbBotH);
        ctx.lineTo(centerX - botRoadW * 0.5 - curbBotW, height - curbBotH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 좌측 연석 안쪽 수직 벽면 (3D 두께)
        ctx.fillStyle = this.stage === 5 ? '#3a0ca3' : '#3d2f24';
        ctx.beginPath();
        ctx.moveTo(centerX - topRoadW * 0.5, horizonY - curbTopH);
        ctx.lineTo(centerX - topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX - botRoadW * 0.5, height);
        ctx.lineTo(centerX - botRoadW * 0.5, height - curbBotH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 우측 3D 입체 연석 (윗면)
        ctx.fillStyle = this.stage === 5 ? '#7209b7' : (this.stage === 3 ? '#ff9f1c' : '#5c4938');
        ctx.beginPath();
        ctx.moveTo(centerX + topRoadW * 0.5, horizonY - curbTopH);
        ctx.lineTo(centerX + topRoadW * 0.5 + curbTopW, horizonY - curbTopH);
        ctx.lineTo(centerX + botRoadW * 0.5 + curbBotW, height - curbBotH);
        ctx.lineTo(centerX + botRoadW * 0.5, height - curbBotH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 우측 연석 안쪽 수직 벽면 (3D 두께)
        ctx.fillStyle = this.stage === 5 ? '#3a0ca3' : '#3d2f24';
        ctx.beginPath();
        ctx.moveTo(centerX + topRoadW * 0.5, horizonY - curbTopH);
        ctx.lineTo(centerX + topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX + botRoadW * 0.5, height);
        ctx.lineTo(centerX + botRoadW * 0.5, height - curbBotH);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const roadGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        roadGrad.addColorStop(0, th.roadTop);
        roadGrad.addColorStop(1, th.roadBot);
        ctx.fillStyle = roadGrad;
        ctx.beginPath();
        ctx.moveTo(centerX - topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX + topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX + botRoadW * 0.5, height);
        ctx.lineTo(centerX - botRoadW * 0.5, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3D 타일 스크롤 (입체 블록 두께 & 하이라이트 포함)
        const numRows = 9;
        for (let i = 0; i < numRows; i++) {
            const prog = ((i + (this.scrollDist * 2.5) % 1) / numRows);
            const pNext = ((i + 0.82 + (this.scrollDist * 2.5) % 1) / numRows);
            const z1 = Math.pow(prog, 1.85);
            const z2 = Math.pow(Math.min(1.06, pNext), 1.85);

            const y1 = horizonY + (height - horizonY) * z1;
            const y2 = horizonY + (height - horizonY) * z2;
            const w1 = topRoadW + (botRoadW - topRoadW) * z1;
            const w2 = topRoadW + (botRoadW - topRoadW) * z2;
            const lipH = 2 + z2 * 7;

            for (let col = -2; col <= 2; col++) {
                const x1L = centerX + (col - 0.46) * (w1 / 5);
                const x1R = centerX + (col + 0.46) * (w1 / 5);
                const x2R = centerX + (col + 0.46) * (w2 / 5);
                const x2L = centerX + (col - 0.46) * (w2 / 5);

                // 타일 앞쪽 3D 입체 두께 단차
                ctx.fillStyle = 'rgba(26, 22, 18, 0.35)';
                ctx.beginPath();
                ctx.moveTo(x2L, y2);
                ctx.lineTo(x2R, y2);
                ctx.lineTo(x2R, y2 + lipH);
                ctx.lineTo(x2L, y2 + lipH);
                ctx.closePath();
                ctx.fill();

                // 3D 조명 그라데이션이 적용된 바닥 타일
                ctx.fillStyle = (i + col) % 2 === 0 ? th.tileA : th.tileB;
                ctx.strokeStyle = this.stage === 5 ? '#ff007f' : '#1a1612';
                ctx.lineWidth = 1.4 + z1 * 2.4;

                ctx.beginPath();
                ctx.moveTo(x1L, y1);
                ctx.lineTo(x1R, y1);
                ctx.lineTo(x2R, y2);
                ctx.lineTo(x2L, y2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 3D 상단 햇빛 하이라이트 (입체감 증폭)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
                ctx.beginPath();
                ctx.moveTo(x1L, y1);
                ctx.lineTo(x1R, y1);
                ctx.lineTo(x1R, y1 + (y2 - y1) * 0.25);
                ctx.lineTo(x1L, y1 + (y2 - y1) * 0.25);
                ctx.closePath();
                ctx.fill();
            }

            // 3D 레인 분할 점선 (5개 레인을 구분하는 4개의 점선)
            if (i % 2 === 0) {
                for (const divCol of [-1.5, -0.5, 0.5, 1.5]) {
                    const d1x = centerX + divCol * (w1 / 5);
                    const d2x = centerX + divCol * (w2 / 5);
                    const dw1 = Math.max(1.8, 3.5 * z1);
                    const dw2 = Math.max(2.5, 5.5 * z2);

                    ctx.fillStyle = this.stage === 5 ? '#00f5d4' : '#fffcf5';
                    ctx.beginPath();
                    ctx.moveTo(d1x - dw1 * 0.5, y1);
                    ctx.lineTo(d1x + dw1 * 0.5, y1);
                    ctx.lineTo(d2x + dw2 * 0.5, y2);
                    ctx.lineTo(d2x - dw2 * 0.5, y2);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // 3D 도로변 입체 반사경 기둥 (3D Roadside Guide Posts)
            if (i % 2 === 1 && z2 > 0.08) {
                const postH = 26 * z2;
                const postW = Math.max(2.5, 5.5 * z2);
                const postLip = 3 * z2;

                // 좌측 연석 가이드 기둥
                const leftPostX = centerX - w2 * 0.5 - postW * 1.5;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(leftPostX, y2 - postH, postW, postH);
                ctx.fillStyle = '#ff0055';
                ctx.fillRect(leftPostX, y2 - postH + postLip, postW, postLip * 2);

                // 우측 연석 가이드 기둥
                const rightPostX = centerX + w2 * 0.5 + postW * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(rightPostX, y2 - postH, postW, postH);
                ctx.fillStyle = '#00f5d4';
                ctx.fillRect(rightPostX, y2 - postH + postLip, postW, postLip * 2);
            }
        }

        // 🌟 전체 그래픽 퀄리티 극대화: 스테이지별 특수 노면 조명 & 환경 연출
        if (this.stage === 4) {
            // 4단계 타임스퀘어: 실제 기업 전광판의 화려한 네온이 젖은 아스팔트에 반사되는 초호화 리플렉션!
            const reflections = [
                { x: centerX - botRoadW * 0.36, w: botRoadW * 0.16, col: 'rgba(230, 29, 43, 0.28)' },  // 코카콜라 레드
                { x: centerX - botRoadW * 0.18, w: botRoadW * 0.15, col: 'rgba(0, 180, 216, 0.26)' }, // 삼성 사이버 블루
                { x: centerX - botRoadW * 0.03, w: botRoadW * 0.14, col: 'rgba(255, 255, 255, 0.22)' }, // 애플 퓨어 화이트
                { x: centerX + botRoadW * 0.12, w: botRoadW * 0.15, col: 'rgba(255, 199, 44, 0.26)' }, // 맥도날드 골든 옐로우
                { x: centerX + botRoadW * 0.28, w: botRoadW * 0.16, col: 'rgba(0, 55, 145, 0.28)' },  // 소니 플레이스테이션 블루
                { x: centerX + botRoadW * 0.42, w: botRoadW * 0.14, col: 'rgba(212, 255, 0, 0.24)' }   // 나이키 네온 볼트
            ];
            reflections.forEach(rf => {
                const refGrad = ctx.createLinearGradient(0, horizonY, 0, height);
                refGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                refGrad.addColorStop(0.35, rf.col);
                refGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = refGrad;
                ctx.fillRect(rf.x - rf.w * 0.5, horizonY, rf.w, height - horizonY);
            });

        } else if (this.stage === 1) {
            // 1단계 숲속: 산들바람에 흩날리는 나뭇잎 파티클 & 햇살 그림자
            for (let l = 0; l < 8; l++) {
                const lx = (centerX - botRoadW * 0.46 + ((l * 123 + time * 65) % (botRoadW * 0.92)));
                const ly = horizonY + 30 + ((l * 87 + time * 85) % (height - horizonY - 45));
                const lRot = time * 2.8 + l;
                ctx.save();
                ctx.translate(lx, ly);
                ctx.rotate(lRot);
                ctx.fillStyle = l % 2 === 0 ? 'rgba(82, 183, 136, 0.65)' : 'rgba(233, 196, 106, 0.7)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

        } else if (this.stage === 3) {
            // 3단계 비키니 해저 시티: 트랙 바닥에 일렁이는 햇살 물결(Caustics) 굴절 연출
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 3.5;
            for (let c = 0; c < 5; c++) {
                const cy = horizonY + 45 + c * ((height - horizonY) / 5.5);
                const cW = topRoadW + (botRoadW - topRoadW) * ((cy - horizonY) / (height - horizonY));
                ctx.beginPath();
                ctx.moveTo(centerX - cW * 0.44, cy);
                for (let cx = centerX - cW * 0.44; cx <= centerX + cW * 0.44; cx += 35) {
                    ctx.quadraticCurveTo(cx + 17, cy + Math.sin(time * 3 + cx * 0.02 + c) * 6, cx + 35, cy);
                }
                ctx.stroke();
            }

        } else if (this.stage === 2) {
            // 2단계 사막: 지평선 아지랑이 & 날리는 모래 알갱이
            ctx.fillStyle = 'rgba(255, 243, 176, 0.35)';
            for (let d = 0; d < 12; d++) {
                const dx = centerX - botRoadW * 0.48 + ((d * 91 + time * 135) % (botRoadW * 0.96));
                const dy = horizonY + 15 + ((d * 49 + time * 38) % (height - horizonY - 25));
                ctx.beginPath();
                ctx.arc(dx, dy, 2 + (d % 3), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 5. 양옆 스테이지별 동물 & 배경 오브젝트 렌더링
        if (this.stage === 6) {
            this.drawSchoolEndingBuilding(ctx, centerX, horizonY + 45);
        } else {
            const sortedProps = [...this.sideProps].sort((a, b) => a.z - b.z);
            sortedProps.forEach((prop, idx) => {
                // 5개 레인 외곽(-3.1, +3.1) 및 추가 외곽 여백(±92)을 두어 트랙에 절대 붙지 않도록 배치!
                const pL = this.project(prop.z, -3.1, width, height);
                const pR = this.project(prop.z, 3.1, width, height);
                const boostScaleL = Math.max(0.36, pL.scale * 1.15);
                const boostScaleR = Math.max(0.36, pR.scale * 1.15);
                const showLeftAnimal = (prop.variant % 2 === 0);
                const showRightAnimal = !showLeftAnimal;
                this.drawStageSideProp(ctx, pL.x - 92 * pL.scale, pL.y, boostScaleL, -1, (prop.variant + idx) % 5, time, showLeftAnimal);
                this.drawStageSideProp(ctx, pR.x + 92 * pR.scale, pR.y, boostScaleR, 1, (prop.variant + idx + 2) % 5, time, showRightAnimal);
            });
        }

        if (this.stage === 5) {
            this.renderGlitchOverlay(ctx, width, height, time);
        }
    }

    // 스테이지별 하늘/원경 초고밀도 디테일 (스폰지밥 해저 시티, 타임스퀘어 빌딩 숲, 스핑크스 등)
    renderStageSkyDetails(ctx, width, height, horizonY, centerX, time) {
        ctx.save();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;

        if (this.stage === 1) {
            // 🌲 1단계 숲: 성스러운 햇살 빛줄기(God Rays), 겹겹이 우거진 원경 산맥과 수림 실루엣, 2단 에메랄드 폭포, 트리하우스
            const rayGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
            rayGrad.addColorStop(0, 'rgba(255, 252, 210, 0.42)');
            rayGrad.addColorStop(0.7, 'rgba(255, 252, 210, 0.14)');
            rayGrad.addColorStop(1, 'rgba(255, 252, 210, 0)');
            ctx.fillStyle = rayGrad;
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * 130, 0);
                ctx.lineTo(centerX + i * 220 - 75, horizonY);
                ctx.lineTo(centerX + i * 220 + 75, horizonY);
                ctx.closePath();
                ctx.fill();
            }

            // 원경 겹산맥 (산등성이를 따라 빼곡한 침엽수/활엽수 실루엣!)
            ctx.fillStyle = '#1b4332';
            ctx.beginPath();
            ctx.arc(centerX - 390, horizonY, 230, Math.PI, 0);
            ctx.arc(centerX - 110, horizonY, 205, Math.PI, 0);
            ctx.arc(centerX + 160, horizonY, 220, Math.PI, 0);
            ctx.arc(centerX + 420, horizonY, 240, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 산등성이 위 빽빽한 소나무 숲 실루엣
            ctx.fillStyle = '#143626';
            for (let tx = centerX - 480; tx <= centerX + 480; tx += 28) {
                const ty = horizonY - 145 - Math.sin((tx - centerX) * 0.008) * 45;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx - 9, ty + 24);
                ctx.lineTo(tx + 9, ty + 24);
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.arc(centerX - 260, horizonY, 185, Math.PI, 0);
            ctx.arc(centerX, horizonY, 170, Math.PI, 0);
            ctx.arc(centerX + 280, horizonY, 190, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 전경 산등성이 위 나무 실루엣
            ctx.fillStyle = '#1b4332';
            for (let tx = centerX - 360; tx <= centerX + 360; tx += 34) {
                const ty = horizonY - 120 - Math.sin((tx - centerX) * 0.012) * 35;
                ctx.beginPath();
                ctx.arc(tx, ty + 12, 14, 0, Math.PI * 2);
                ctx.fill();
            }

            // 에메랄드 2단 폭포와 반짝이는 물보라
            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(centerX - 34, horizonY - 150, 68, 150);
            ctx.strokeRect(centerX - 34, horizonY - 150, 68, 150);
            ctx.fillStyle = '#caf0f8';
            for (let m = -2; m <= 2; m++) {
                ctx.beginPath();
                ctx.arc(centerX + m * 17, horizonY - 6 + Math.sin(time * 8 + m) * 4, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // 숲속 통나무 트리하우스 전망대 (좌측 산 중턱)
            ctx.fillStyle = '#8d5b3c';
            ctx.fillRect(centerX - 275, horizonY - 160, 56, 44);
            ctx.strokeRect(centerX - 275, horizonY - 160, 56, 44);
            ctx.fillStyle = '#d64531';
            ctx.beginPath();
            ctx.moveTo(centerX - 288, horizonY - 160);
            ctx.lineTo(centerX - 247, horizonY - 192);
            ctx.lineTo(centerX - 206, horizonY - 160);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 우측 원경 언덕 위 포인트 꽃사슴 1마리
            ctx.save();
            ctx.translate(centerX + 280, horizonY - 6);
            ctx.scale(0.62, 0.62);
            this.drawRealForestAnimal(ctx, 0, 0, 2, time, -1);
            ctx.restore();

            // 하늘을 나는 새 떼
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            for (let b = 0; b < 5; b++) {
                const bx = centerX - 180 + b * 55 + Math.sin(time * 1.2 + b) * 30;
                const by = horizonY - 195 - (b % 2) * 18;
                const wingY = Math.sin(time * 9 + b) * 7;
                ctx.beginPath();
                ctx.moveTo(bx - 12, by + wingY);
                ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
                ctx.quadraticCurveTo(bx + 5, by - 6, bx + 12, by + wingY);
                ctx.stroke();
            }

        } else if (this.stage === 2) {
            // 🏜️ 2단계 사막: 이글거리는 태양, 3D 대피라미드 군락, 고대 대스핑크스 거대 석상, 오아시스 호수!
            // 타오르는 태양 & 눈부신 광채(Lens Flare)
            const sunX = centerX + 290;
            const sunY = horizonY - 150;
            const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 110);
            sunGlow.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
            sunGlow.addColorStop(0.3, 'rgba(255, 214, 10, 0.6)');
            sunGlow.addColorStop(0.7, 'rgba(247, 127, 0, 0.25)');
            sunGlow.addColorStop(1, 'rgba(247, 127, 0, 0)');
            ctx.fillStyle = sunGlow;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fffdf0';
            ctx.beginPath();
            ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 기자 3대 대피라미드 군락 (The Great Pyramids of Giza)
            const pyramids = [
                { x: -390, h: 145 },
                { x: -220, h: 185 },
                { x: 155,  h: 140 },
                { x: 330,  h: 170 }
            ];
            pyramids.forEach(py => {
                ctx.fillStyle = '#e09f3e';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x - py.h, horizonY);
                ctx.lineTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.25, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#b5651d';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.25, horizonY);
                ctx.lineTo(centerX + py.x + py.h, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // 👑 지평선 위 위엄 넘치는 고대 대스핑크스 거대 석상 (Horizon Monumental Great Sphinx)
            const spX = centerX - 85;
            const spY = horizonY;

            // 스핑크스 사암 기단 & 모래 언덕
            ctx.fillStyle = '#bc6c25';
            ctx.fillRect(spX - 58, spY - 38, 116, 38);
            ctx.strokeRect(spX - 58, spY - 38, 116, 38);

            // 스핑크스 사자 몸체 & 엉덩이 볼륨
            ctx.fillStyle = '#dda15e';
            ctx.beginPath();
            ctx.moveTo(spX + 46, spY - 38);
            ctx.bezierCurveTo(spX + 62, spY - 72, spX + 32, spY - 95, spX - 5, spY - 85);
            ctx.lineTo(spX - 42, spY - 85);
            ctx.lineTo(spX - 52, spY - 38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 앞발
            ctx.fillStyle = '#dda15e';
            ctx.fillRect(spX - 68, spY - 26, 34, 18);
            ctx.strokeRect(spX - 68, spY - 26, 34, 18);

            // 스핑크스 머리 & 네메스 두건 (청금석 & 황금 스트라이프)
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.moveTo(spX - 48, spY - 72);
            ctx.lineTo(spX - 52, spY - 118);
            ctx.lineTo(spX - 18, spY - 138);
            ctx.lineTo(spX + 8, spY - 118);
            ctx.lineTo(spX + 4, spY - 72);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 네메스 로열 블루 스트라이프 3줄
            ctx.fillStyle = '#1d3557';
            [-112, -98, -84].forEach(ny => {
                ctx.fillRect(spX - 48, spY + ny, 52, 6);
            });

            // 파라오 얼굴 (사암 조각 & 이집트 아몬드 눈)
            ctx.fillStyle = '#fceade';
            ctx.beginPath();
            ctx.roundRect(spX - 38, spY - 116, 34, 38, 10);
            ctx.fill();
            ctx.stroke();

            // 파라오 눈 & 우라에우스
            ctx.fillStyle = '#1a1612';
            ctx.fillRect(spX - 32, spY - 104, 8, 4);
            ctx.fillRect(spX - 16, spY - 104, 8, 4);
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(spX - 22, spY - 120, 3, 0, Math.PI * 2);
            ctx.fill();

            // 파라오 황금 턱수염
            ctx.fillStyle = '#ffbe0b';
            ctx.fillRect(spX - 25, spY - 78, 8, 14);
            ctx.strokeRect(spX - 25, spY - 78, 8, 14);

            // 고대 이집트 오벨리스크 2기 (상형문자 & 황금 피라미디온 꼭대기)
            [-185, 95].forEach((obX) => {
                const ox = centerX + obX;
                ctx.fillStyle = '#d4a373';
                ctx.beginPath();
                ctx.moveTo(ox - 10, horizonY);
                ctx.lineTo(ox - 6, horizonY - 110);
                ctx.lineTo(ox, horizonY - 125);
                ctx.lineTo(ox + 6, horizonY - 110);
                ctx.lineTo(ox + 10, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // 황금 꼭대기 (Pyramidion)
                ctx.fillStyle = '#ffbe0b';
                ctx.beginPath();
                ctx.moveTo(ox - 6, horizonY - 110);
                ctx.lineTo(ox, horizonY - 125);
                ctx.lineTo(ox + 6, horizonY - 110);
                ctx.closePath();
                ctx.fill();
            });

            // 사막 오아시스 호수 & 야자수
            ctx.fillStyle = '#48cae4';
            ctx.beginPath();
            ctx.ellipse(centerX + 65, horizonY - 3, 56, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 야자수 기둥 & 잎
            const palmX = centerX + 45;
            ctx.strokeStyle = '#582f0e';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(palmX, horizonY);
            ctx.quadraticCurveTo(palmX - 8, horizonY - 35, palmX - 4, horizonY - 55);
            ctx.stroke();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#1a1612';
            ctx.fillStyle = '#2d6a4f';
            [[-18, -65], [16, -65], [-24, -48], [22, -48]].forEach(([lx, ly]) => {
                ctx.beginPath();
                ctx.ellipse(palmX + lx * 0.5, horizonY - 55 + ly * 0.2, 16, 6, lx > 0 ? 0.4 : -0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 우측 원경 모래언덕 위 단봉낙타 1마리
            ctx.save();
            ctx.translate(centerX + 275, horizonY - 5);
            ctx.scale(0.62, 0.62);
            this.drawRealDesertAnimal(ctx, 0, 0, 2, time, -1);
            ctx.restore();

        } else if (this.stage === 3) {
            // 🍍 3단계 해저 (스폰지밥 비키니 시티 감성!):
            // 형형색색 하와이안 꽃구름 7개 + 파인애플 하우스 + 징징이 모아이 석상 집 + 뚱이 바위 집 + 집게리아 + 분홍 해파리 초원!
            const flowerClouds = [
                { x: -420, y: -215, r: 42, col: '#ff758f', inner: '#ffea79' },
                { x: -255, y: -255, r: 34, col: '#ffea79', inner: '#ff006e' },
                { x: -95,  y: -205, r: 46, col: '#80ed99', inner: '#ffffff' },
                { x: 85,   y: -245, r: 38, col: '#c77dff', inner: '#ffea79' },
                { x: 245,  y: -195, r: 44, col: '#ff9f1c', inner: '#caf0f8' },
                { x: 405,  y: -235, r: 36, col: '#ff758f', inner: '#80ed99' }
            ];
            flowerClouds.forEach((fc, idx) => {
                const driftX = Math.sin(time * 0.6 + idx) * 14;
                this.drawBikiniFlowerCloud(
                    ctx,
                    centerX + fc.x + driftX,
                    horizonY + fc.y,
                    fc.r,
                    fc.col,
                    fc.inner,
                    time * 0.25 + idx
                );
            });

            // 원경 해저 모래 언덕 (비키니 시티 특유의 민트/모래빛 해저 언덕)
            ctx.fillStyle = '#48cae4';
            ctx.beginPath();
            ctx.arc(centerX - 340, horizonY, 175, Math.PI, 0);
            ctx.arc(centerX + 320, horizonY, 185, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 좌측 지평선: 스폰지밥 비키니 시티 삼총사 거리의 집 (뚱이 바위 집 ➔ 징징이 모아이 집 ➔ 스폰지밥 파인애플 하우스!)
            this.drawBikiniHouse(ctx, centerX - 385, horizonY + 2, 0.92, 'rock', time);
            this.drawBikiniHouse(ctx, centerX - 275, horizonY + 2, 0.96, 'moai', time);
            this.drawBikiniHouse(ctx, centerX - 155, horizonY + 4, 1.02, 'pineapple', time);

            // 우측 지평선: 집게리아(Krusty Krab) & 분홍 해파리 초원
            this.drawBikiniHouse(ctx, centerX + 235, horizonY + 2, 0.96, 'krusty', time);
            this.drawBikiniJellyfish(ctx, centerX + 125, horizonY - 95, 0.95, time, 1);
            this.drawBikiniJellyfish(ctx, centerX + 345, horizonY - 125, 0.85, time, 2);
            this.drawBikiniJellyfish(ctx, centerX - 65, horizonY - 135, 0.80, time, 3);

            // 반짝이는 비눗방울 기포 상승 연출
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            for (let b = 0; b < 10; b++) {
                const bx = centerX + ((b * 97) % 720) - 360;
                const by = horizonY - ((time * 48 + b * 35) % (horizonY - 20));
                const br = 5 + (b % 4) * 3;
                ctx.beginPath();
                ctx.arc(bx, by, br, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // 상단 바다를 유유히 헤엄치는 대왕고래 1마리 (동물 과밀 방지를 위해 원경 핵심 동물만 배치!)
            const whaleX = centerX + 25 + Math.sin(time * 0.7) * 65;
            const whaleY = horizonY - 155;
            this.drawRealSeaCreature(ctx, whaleX, whaleY, 0.58, 2, time, 1);

        } else if (this.stage === 4) {
            // 🌃 4단계 도시 (타임스퀘어 밤): 빈틈없이 꽉 찬 2중 스카이라인 빌딩 숲 + 원 타임스퀘어 새해 볼 타워 + 비행선 + 경찰 헬기!
            ctx.fillStyle = 'rgba(255, 190, 11, 0.13)';
            [-2, -1, 1, 2].forEach(dir => {
                const sway = Math.sin(time * 1.8 + dir) * 130;
                ctx.beginPath();
                ctx.moveTo(centerX + dir * 160, horizonY);
                ctx.lineTo(centerX + dir * 160 + sway - 55, 0);
                ctx.lineTo(centerX + dir * 160 + sway + 55, 0);
                ctx.closePath();
                ctx.fill();
            });

            const backTowers = [
                { x: -540, w: 85, h: 255 }, { x: -460, w: 78, h: 280 }, { x: -385, w: 82, h: 240 },
                { x: -305, w: 75, h: 295 }, { x: -230, w: 80, h: 260 }, { x: -150, w: 76, h: 275 },
                { x: -75,  w: 74, h: 245 }, { x: 0,    w: 80, h: 265 }, { x: 80,   w: 76, h: 285 },
                { x: 155,  w: 82, h: 250 }, { x: 235,  w: 78, h: 290 }, { x: 315,  w: 85, h: 260 },
                { x: 400,  w: 95, h: 275 }
            ];
            backTowers.forEach(bt => {
                const bx = centerX + bt.x;
                const by = horizonY - bt.h;
                ctx.fillStyle = '#0d0f1d';
                ctx.strokeStyle = '#2b2d42';
                ctx.lineWidth = 2;
                ctx.fillRect(bx, by, bt.w, bt.h);
                ctx.strokeRect(bx, by, bt.w, bt.h);
                ctx.beginPath();
                ctx.moveTo(bx + bt.w * 0.5, by);
                ctx.lineTo(bx + bt.w * 0.5, by - 28);
                ctx.stroke();
                ctx.fillStyle = '#ff0055';
                ctx.beginPath();
                ctx.arc(bx + bt.w * 0.5, by - 28, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            const frontBuildings = [
                { x: -505, w: 90, h: 220, neon: '#ff0055', text: 'Coca-Cola', sub: 'Taste the Feeling' },
                { x: -410, w: 90, h: 240, neon: '#00b4d8', text: 'SAMSUNG', sub: 'Galaxy AI is Here' },
                { x: -315, w: 86, h: 200, neon: '#ffffff', text: ' Apple', sub: 'iPhone 16 Pro' },
                { x: -220, w: 86, h: 255, neon: '#06d6a0', text: 'NASDAQ', sub: '▲ 18,245.80' },
                { x: -125, w: 80, h: 195, neon: '#4285f4', text: 'Google', sub: 'Gemini AI' },
                { x: -38,  w: 78, h: 275, neon: '#ff007f', text: 'TIMES SQ', sub: '2026 BALL DROP', isCenterTower: true },
                { x: 48,   w: 80, h: 195, neon: '#ffc72c', text: "McDonald's", sub: "i'm lovin' it" },
                { x: 135,  w: 86, h: 245, neon: '#003791', text: 'SONY PS5', sub: 'Play Has No Limits' },
                { x: 228,  w: 88, h: 210, neon: '#ffd166', text: 'DISNEY', sub: 'THE LION KING' },
                { x: 322,  w: 92, h: 250, neon: '#00a8e8', text: 'HYUNDAI', sub: 'IONIQ Electric' },
                { x: 422,  w: 90, h: 225, neon: '#d4ff00', text: 'NIKE ✔', sub: 'JUST DO IT.' }
            ];
            frontBuildings.forEach(b => {
                const bx = centerX + b.x;
                const by = horizonY - b.h;
                ctx.fillStyle = '#090a12';
                ctx.fillRect(bx + b.w, by + 8, 12, b.h - 8);
                ctx.fillStyle = '#161829';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2.5;
                ctx.fillRect(bx, by, b.w, b.h);
                ctx.strokeRect(bx, by, b.w, b.h);

                for (let wy = by + 92; wy < horizonY - 12; wy += 15) {
                    for (let wx = bx + 8; wx < bx + b.w - 12; wx += 14) {
                        if ((wx + wy) % 3 !== 0) {
                            ctx.fillStyle = (wx * wy) % 5 === 0 ? '#90e0ef' : '#ffd166';
                            ctx.fillRect(wx, wy, 7, 9);
                        }
                    }
                }

                ctx.fillStyle = b.neon;
                ctx.fillRect(bx + 6, by + 12, b.w - 12, 36);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(bx + 6, by + 12, b.w - 12, 36);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px "Comic Neue", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(b.text, bx + b.w * 0.5, by + 34);

                ctx.fillStyle = '#1a1612';
                ctx.fillRect(bx + 8, by + 54, b.w - 16, 26);
                ctx.strokeStyle = b.neon;
                ctx.strokeRect(bx + 8, by + 54, b.w - 16, 26);
                ctx.fillStyle = '#ffea79';
                ctx.font = 'bold 11px "Comic Neue", sans-serif';
                ctx.fillText(b.sub, bx + b.w * 0.5, by + 71);

                if (b.isCenterTower) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(bx + b.w * 0.5, by);
                    ctx.lineTo(bx + b.w * 0.5, by - 42);
                    ctx.stroke();
                    ctx.fillStyle = '#00f5d4';
                    ctx.beginPath();
                    ctx.arc(bx + b.w * 0.5, by - 42, 14 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            });

            const blimpX = centerX - 240 + Math.sin(time * 0.6) * 90;
            const blimpY = horizonY - 295;
            ctx.fillStyle = '#2b2d42';
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(blimpX, blimpY, 52, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 12px "Comic Neue", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SMILE 3D', blimpX, blimpY + 4);

            const heliX = centerX + 250 + Math.cos(time * 1.1) * 70;
            const heliY = horizonY - 285;
            ctx.fillStyle = 'rgba(255, 255, 200, 0.22)';
            ctx.beginPath();
            ctx.moveTo(heliX, heliY + 8);
            ctx.lineTo(heliX - 65, horizonY);
            ctx.lineTo(heliX + 25, horizonY);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#1d3557';
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(heliX, heliY, 22, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(heliX - 34, heliY - 12);
            ctx.lineTo(heliX + 34, heliY - 12);
            ctx.stroke();

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 3D 사이버 매트릭스 타워 & 회전 홀로그램 포털 & 디지털 번개
            for (let t = -3; t <= 3; t++) {
                if (t === 0) continue;
                const tx = centerX + t * 135;
                const th = 140 + (Math.abs(t) % 2) * 55;
                ctx.fillStyle = 'rgba(58, 12, 163, 0.55)';
                ctx.strokeStyle = t % 2 === 0 ? '#00f5d4' : '#ff007f';
                ctx.lineWidth = 2;
                ctx.fillRect(tx - 32, horizonY - th, 64, th);
                ctx.strokeRect(tx - 32, horizonY - th, 64, th);
            }

            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(centerX, horizonY - 95, 72 + Math.sin(time * 15) * 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#00f5d4';
            ctx.beginPath();
            ctx.arc(centerX, horizonY - 95, 48 - Math.cos(time * 12) * 6, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                const gx = Math.random() * width;
                const gy = Math.random() * horizonY;
                ctx.moveTo(gx, gy);
                ctx.lineTo(gx + (Math.random() - 0.5) * 140, gy + 45);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    // =========================================================================
    // 🦌 초대형·초고디테일 동물 일러스트 렌더링 (기존 대비 2배 이상 확대 & 세밀 묘사!)
    // (다중 그라데이션 + 털/깃털/비늘 결 + 펜 크로스해칭 + 발톱/수염/속눈썹/소품 + 관절 모션)
    // =========================================================================

    // 1단계 숲속 동물 5종 (0:다람쥐, 1:산토끼, 2:꽃사슴, 3:붉은여우, 4:숲부엉이)
    drawRealForestAnimal(ctx, ax, ay, kind, time, faceDir = 1) {
        ctx.save();
        ctx.translate(ax, ay);
        // 요청 반영: 옆/배경 동물을 훨씬 더 크고(2.35배 스케일) 선명하게 확대!
        ctx.scale(faceDir * 2.35, 2.35);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 바닥 입체 그림자 & 펜 해칭
        ctx.fillStyle = 'rgba(26, 22, 18, 0.30)';
        ctx.beginPath();
        ctx.ellipse(0, 6, 36, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawHatching(ctx, -24, 6, 24, 6, 7, 7, -0.5);

        if (kind === 0) {
            // 🐿️ 0: 숲속 줄무늬 다람쥐 (3단 그라데이션 복슬 꼬리 + 등 줄무늬 3줄 + 발가락/발바닥 패드 + 수염 6가닥 + 앞니 + 참나무 잎 도토리)
            const tailWag = Math.sin(time * 7) * 0.09;
            ctx.save();
            ctx.rotate(tailWag);
            const tailGrad = ctx.createRadialGradient(-30, -38, 4, -22, -30, 38);
            tailGrad.addColorStop(0, '#f4a261');
            tailGrad.addColorStop(0.55, '#c86d25');
            tailGrad.addColorStop(1, '#5c300c');
            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.moveTo(-7, -9);
            ctx.bezierCurveTo(-48, -2, -62, -40, -44, -58);
            ctx.bezierCurveTo(-28, -72, 2, -60, -2, -32);
            ctx.bezierCurveTo(-4, -20, -5, -14, -7, -9);
            ctx.fill();
            ctx.stroke();
            // 꼬리 복슬털 결 & 빗금
            ctx.beginPath();
            ctx.moveTo(-24, -18);
            ctx.quadraticCurveTo(-40, -36, -24, -52);
            ctx.moveTo(-16, -24);
            ctx.quadraticCurveTo(-28, -38, -14, -48);
            ctx.stroke();
            this.drawHatching(ctx, -38, -22, -24, -50, 7, 8, -0.7);
            ctx.restore();

            // 뒷다리 허벅지 & 발가락 3개
            ctx.fillStyle = '#a45a26';
            ctx.beginPath();
            ctx.ellipse(-6, -10, 12, 9, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.ellipse(2, -3, 12, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 발가락 구분선
            ctx.beginPath();
            ctx.moveTo(8, -5); ctx.lineTo(12, -3);
            ctx.moveTo(7, -2); ctx.lineTo(12, -1);
            ctx.stroke();

            // 통통한 몸통 & 크림색 복슬 배
            const bodyGrad = ctx.createLinearGradient(-18, -42, 16, 0);
            bodyGrad.addColorStop(0, '#e09145');
            bodyGrad.addColorStop(1, '#8c4718');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, -22, 18, 22, 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 다람쥐 특유의 등 줄무늬 3줄 (검은 갈색 + 크림색 줄)
            ctx.strokeStyle = '#3d1e08';
            ctx.lineWidth = 3.2;
            [-11, -7, -3].forEach((sx, sIdx) => {
                ctx.beginPath();
                ctx.moveTo(sx, -36 + sIdx * 2);
                ctx.quadraticCurveTo(sx - 5, -24, sx - 2, -12 + sIdx * 2);
                ctx.stroke();
            });
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;

            // 크림색 배 털
            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.ellipse(8, -20, 9.5, 16, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -10, -14, 2, -10, 5, 5, -0.5);

            // 머리 + 볼록한 햄스터/다람쥐 볼 + 정수리 털 3가닥
            ctx.fillStyle = '#e09145';
            ctx.beginPath();
            ctx.arc(6, -43, 15, 0, Math.PI * 2);
            ctx.arc(16, -39, 9.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.arc(17, -37, 6.5, 0, Math.PI * 2);
            ctx.fill();

            // 귀 2개 & 귓속 분홍 털 + 귀 끝 털뭉치
            [-2, 9].forEach((ex, idx) => {
                ctx.fillStyle = '#a45a26';
                ctx.beginPath();
                ctx.ellipse(ex, -57, 5, 9, idx === 0 ? -0.2 : 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffb5a7';
                ctx.beginPath();
                ctx.ellipse(ex, -56, 2.6, 5.5, idx === 0 ? -0.2 : 0.2, 0, Math.PI * 2);
                ctx.fill();
            });

            // 발그레한 볼 + 초롱초롱 눈(이중 하이라이트) + 코 + 귀여운 앞니 + 수염
            ctx.fillStyle = 'rgba(235, 94, 85, 0.48)';
            ctx.beginPath();
            ctx.ellipse(14, -36, 4.8, 3.2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(11, -45, 4.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(9.8, -46.4, 1.5, 0, Math.PI * 2);
            ctx.arc(12.2, -43.8, 0.8, 0, Math.PI * 2);
            ctx.fill();

            // 코와 앞니
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(24, -40, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(19, -35, 3.5, 4);
            ctx.strokeRect(19, -35, 3.5, 4);

            // 수염 4가닥
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(19, -38); ctx.lineTo(30, -41);
            ctx.moveTo(19, -36); ctx.lineTo(31, -36);
            ctx.moveTo(18, -34); ctx.lineTo(29, -32);
            ctx.stroke();
            ctx.lineWidth = 2.8;

            // 두 손으로 쥐고 있는 디테일 도토리(격자 모자 + 반짝이는 열매 + 떡갈나무 잎) & 앞발
            ctx.fillStyle = '#a45a26';
            ctx.beginPath();
            ctx.ellipse(20, -24, 9.5, 11, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.ellipse(23, -22, 2.5, 5, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a2c11';
            ctx.beginPath();
            ctx.arc(20, -28, 10.5, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, 12, -30, 27, -30, 5, 5, 0.7);
            this.drawHatching(ctx, 12, -30, 27, -30, 5, 5, -0.7);
            // 도토리 위 작은 초록 잎사귀
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.ellipse(25, -39, 6, 3.2, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 도토리를 감싼 귀여운 앞발
            ctx.fillStyle = '#e09145';
            ctx.beginPath();
            ctx.ellipse(12, -24, 6, 4, -0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else if (kind === 1) {
            // 🐇 1: 산토끼 (복슬복슬 솜털 + 긴 쫑긋 귀 + 속눈썹 루비 눈 + 앞니 + 아삭한 잎사귀 당근!)
            const hop = Math.abs(Math.sin(time * 6.5)) * 8;
            ctx.translate(0, -hop);

            // 복슬복슬 구름 같은 솜방울 꼬리
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-22, -15, 10.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -28, -15, -18, -15, 4, 5, -0.6);

            // 튼튼한 뒷다리와 발가락 패드
            ctx.fillStyle = '#f8edeb';
            ctx.beginPath();
            ctx.ellipse(-6, -11, 13, 9, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(2, -3.5, 14, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 통통한 몸통 & 분홍빛 크림 배
            const rabGrad = ctx.createLinearGradient(-16, -38, 16, 0);
            rabGrad.addColorStop(0, '#ffffff');
            rabGrad.addColorStop(1, '#f3d5b5');
            ctx.fillStyle = rabGrad;
            ctx.beginPath();
            ctx.ellipse(0, -20, 21, 17, -0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -14, -12, 6, -10, 6, 6, -0.5);

            // 가슴 복슬털
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(14, -21, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 머리 & 볼록한 볼살
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(12, -35, 15, 0, Math.PI * 2);
            ctx.arc(21, -31, 8.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 긴 토끼 귀 2개 (검은 끝 포인트 + 귓속 핑크 그라데이션)
            const earTilt = Math.sin(time * 7) * 0.09;
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.translate(10 + dir * 4.5, -46);
                ctx.rotate(dir * 0.20 + earTilt);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(0, -14, 6.2, 19, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffafcc';
                ctx.beginPath();
                ctx.ellipse(0, -13, 3.4, 13.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // 귀 끝 검은 털 포인트
                ctx.fillStyle = '#2b2d42';
                ctx.beginPath();
                ctx.ellipse(0, -29, 3.8, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 발그레한 볼 + 초롱초롱 루비 눈 + 분홍 코 + 토끼 앞니 + 수염
            ctx.fillStyle = 'rgba(255, 117, 143, 0.45)';
            ctx.beginPath();
            ctx.ellipse(19, -28, 4.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(17, -37, 4.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(17.5, -37, 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16, -38.4, 1.5, 0, Math.PI * 2);
            ctx.arc(18.5, -35.8, 0.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.arc(28, -32, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 토끼 앞니 2개
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(23, -28, 4.5, 4.5);
            ctx.strokeRect(23, -28, 4.5, 4.5);

            // 수염
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(22, -31); ctx.lineTo(34, -34);
            ctx.moveTo(22, -29); ctx.lineTo(34, -29);
            ctx.moveTo(22, -27); ctx.lineTo(33, -25);
            ctx.stroke();
            ctx.lineWidth = 2.8;

            // 앞발로 들고 있는 싱싱한 통통 당근!
            ctx.save();
            ctx.translate(23, -18);
            ctx.rotate(0.35);
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.ellipse(0, -12, 3, 6, -0.3, 0, Math.PI * 2);
            ctx.ellipse(3, -12, 3, 6, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fb5607';
            ctx.beginPath();
            ctx.moveTo(-5, -8);
            ctx.lineTo(5, -8);
            ctx.lineTo(0, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

        } else if (kind === 2) {
            // 🦌 2: 대왕 꽃사슴 (관절 다리 4개 + 검은 발굽 + 매화 반점 10개 + 하얀 목도리 갈기 + 10각 왕관 가지 뿔!)
            const legSwing = Math.sin(time * 5) * 4.5;
            [[-15, 1], [-6, -1], [9, 1], [17, -1]].forEach(([lx, dir]) => {
                const footX = lx + dir * legSwing;
                ctx.strokeStyle = '#8c4718';
                ctx.lineWidth = 5.2;
                ctx.beginPath();
                ctx.moveTo(lx, -24);
                ctx.lineTo(lx + dir * legSwing * 0.4, -11);
                ctx.lineTo(footX, 2);
                ctx.stroke();
                // 무릎 관절 & 검은 발굽
                ctx.fillStyle = '#6f3b0e';
                ctx.beginPath();
                ctx.arc(lx + dir * legSwing * 0.4, -11, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1612';
                ctx.fillRect(footX - 3.5, 0, 7, 5.5);
            });

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;

            // 쫑긋한 하얀 사슴 꼬리
            ctx.fillStyle = '#fffcf2';
            ctx.beginPath();
            ctx.ellipse(-27, -32, 7, 4.5, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 우아한 몸통 그라데이션 & 하얀 배
            const deerGrad = ctx.createLinearGradient(0, -44, 0, -12);
            deerGrad.addColorStop(0, '#e09145');
            deerGrad.addColorStop(0.7, '#9c5221');
            deerGrad.addColorStop(1, '#6f3b0e');
            ctx.fillStyle = deerGrad;
            ctx.beginPath();
            ctx.ellipse(0, -28, 28, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.ellipse(0, -16, 20, 5.5, 0, 0, Math.PI);
            ctx.fill();
            this.drawHatching(ctx, -18, -20, 14, -20, 7, 7, -0.5);

            // 선명한 하얀 매화 반점 10개
            ctx.fillStyle = '#fffcf2';
            [
                [-17, -32], [-10, -25], [-3, -34], [5, -26], [12, -32],
                [-14, -22], [-5, -21], [3, -32], [9, -22], [-20, -27]
            ].forEach(([sx, sy]) => {
                ctx.beginPath();
                ctx.arc(sx, sy, 2.8, 0, Math.PI * 2);
                ctx.fill();
            });

            // 늘씬한 목과 풍성한 크림색 가슴 갈기 털
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.moveTo(12, -33);
            ctx.lineTo(20, -64);
            ctx.lineTo(30, -60);
            ctx.lineTo(23, -26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.ellipse(24, -42, 6, 14, 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 사슴 귀 2개
            ctx.fillStyle = '#b5651d';
            ctx.beginPath();
            ctx.ellipse(15, -67, 8, 4.2, -0.5, 0, Math.PI * 2);
            ctx.ellipse(20, -69, 7, 3.8, -0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 사슴 머리 & 주둥이
            ctx.fillStyle = '#e09145';
            ctx.beginPath();
            ctx.ellipse(27, -64, 14.5, 10, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 웅장한 10각 왕관 가지 뿔 (Royal Branched Antlers)
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            // 좌측 큰 뿔 + 가지 3개
            ctx.moveTo(21, -72);
            ctx.quadraticCurveTo(14, -84, 16, -98);
            ctx.moveTo(17, -80); ctx.lineTo(8, -85);
            ctx.moveTo(16, -89); ctx.lineTo(7, -94);
            ctx.moveTo(16, -86); ctx.lineTo(22, -95);
            // 우측 큰 뿔 + 가지 3개
            ctx.moveTo(27, -72);
            ctx.quadraticCurveTo(34, -84, 33, -98);
            ctx.moveTo(31, -80); ctx.lineTo(41, -85);
            ctx.moveTo(33, -89); ctx.lineTo(42, -94);
            ctx.moveTo(32, -86); ctx.lineTo(27, -95);
            ctx.stroke();
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;

            // 사슴의 깊은 눈망울 & 속눈썹 & 검은 코
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(29, -65, 3.6, 0, Math.PI * 2);
            ctx.arc(40, -62, 3.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(27.8, -66.2, 1.4, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 🦊 3: 붉은여우 (초대형 복슬 꼬리 + 하얀 꼬리 끝 + 검은 양말 다리 + 하얀 가슴털 + 영리한 호박색 눈)
            const tailSway = Math.sin(time * 5.5) * 0.08;
            ctx.save();
            ctx.rotate(tailSway);
            const foxTailGrad = ctx.createLinearGradient(-52, -36, -12, -12);
            foxTailGrad.addColorStop(0, '#d64531');
            foxTailGrad.addColorStop(1, '#f4a261');
            ctx.fillStyle = foxTailGrad;
            ctx.beginPath();
            ctx.moveTo(-14, -18);
            ctx.bezierCurveTo(-48, -44, -60, -14, -22, -8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 꼬리 끝 눈부신 하얀 털뭉치
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-44, -25, 10.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -34, -22, -18, -16, 5, 6, -0.6);
            ctx.restore();

            // 검은 스타킹 양말을 신은 날렵한 다리 4개
            [-14, -5, 8, 16].forEach((lx, idx) => {
                const swing = Math.sin(time * 6 + idx) * 3;
                ctx.fillStyle = '#1d2d44';
                ctx.fillRect(lx - 3.2 + swing, -13, 6.4, 15);
                ctx.strokeRect(lx - 3.2 + swing, -13, 6.4, 15);
            });

            // 날렵한 여우 몸통 & 하얀 배
            const foxGrad = ctx.createLinearGradient(0, -36, 0, -8);
            foxGrad.addColorStop(0, '#e76f51');
            foxGrad.addColorStop(1, '#c84b31');
            ctx.fillStyle = foxGrad;
            ctx.beginPath();
            ctx.ellipse(0, -21, 24, 14.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -16, -16, 10, -16, 6, 6, -0.5);

            // 풍성한 하얀 가슴 목도리 털 (Chest Ruff)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(10, -30);
            ctx.quadraticCurveTo(24, -24, 16, -9);
            ctx.quadraticCurveTo(6, -15, 10, -30);
            ctx.fill();
            ctx.stroke();

            // 여우 머리 & 뾰족한 주둥이 & 하얀 뺨 마스크
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.arc(15, -39, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(4, -36);
            ctx.lineTo(17, -23);
            ctx.lineTo(31, -36);
            ctx.quadraticCurveTo(22, -39, 17, -33);
            ctx.quadraticCurveTo(11, -39, 4, -36);
            ctx.fill();
            ctx.stroke();

            // 검은 끝의 뾰족한 여우 귀 2개 + 귓속 하얀 잔털
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.moveTo(4, -48); ctx.lineTo(8, -65); ctx.lineTo(15, -50);
            ctx.moveTo(17, -50); ctx.lineTo(24, -65); ctx.lineTo(28, -48);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffcad4';
            ctx.beginPath();
            ctx.moveTo(7, -50); ctx.lineTo(9, -60); ctx.lineTo(13, -51);
            ctx.moveTo(19, -51); ctx.lineTo(23, -60); ctx.lineTo(26, -50);
            ctx.fill();

            // 호박색 눈과 검은 눈동자 & 코 & 수염
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.ellipse(11, -40, 3.6, 2.8, 0.15, 0, Math.PI * 2);
            ctx.ellipse(21, -40, 3.6, 2.8, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(11, -40, 1.8, 0, Math.PI * 2);
            ctx.arc(21, -40, 1.8, 0, Math.PI * 2);
            ctx.arc(17, -24, 3.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(8, -28); ctx.lineTo(-2, -29);
            ctx.moveTo(8, -26); ctx.lineTo(-1, -25);
            ctx.moveTo(24, -28); ctx.lineTo(34, -29);
            ctx.moveTo(24, -26); ctx.lineTo(33, -25);
            ctx.stroke();

        } else {
            // 🦉 4: 숲부엉이 (이끼 낀 나뭇가지 + 노란 발톱 + 겹겹의 날개 깃털 + V자 가슴 무늬 + 황금 왕방울 눈)
            // 부엉이가 앉아있는 통나무 가지 & 초록 이끼
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.roundRect(-28, -4, 56, 9, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.arc(-22, -4, 5, 0, Math.PI * 2);
            ctx.arc(22, -4, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 나뭇가지를 움켜쥔 노란 발가락 6개
            ctx.fillStyle = '#ffbe0b';
            [-10, -7, -4, 4, 7, 10].forEach(tx => {
                ctx.beginPath();
                ctx.ellipse(tx, -3, 2.2, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 통통한 부엉이 몸통
            const owlGrad = ctx.createLinearGradient(0, -56, 0, -4);
            owlGrad.addColorStop(0, '#8d5b3c');
            owlGrad.addColorStop(1, '#5c3a21');
            ctx.fillStyle = owlGrad;
            ctx.beginPath();
            ctx.ellipse(0, -30, 24, 27, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 양쪽 접은 날개 & 깃털 층 묘사
            ctx.fillStyle = '#4a2c11';
            [-21, 21].forEach(wx => {
                ctx.beginPath();
                ctx.ellipse(wx, -28, 7, 20, wx < 0 ? 0.16 : -0.16, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                // 날개 깃털 결
                ctx.beginPath();
                ctx.moveTo(wx - 4, -34); ctx.lineTo(wx + 4, -30);
                ctx.moveTo(wx - 4, -26); ctx.lineTo(wx + 4, -22);
                ctx.moveTo(wx - 4, -18); ctx.lineTo(wx + 4, -14);
                ctx.stroke();
            });

            // 크림색 배 & 9개의 정교한 V자/비늘 깃털 무늬
            ctx.fillStyle = '#f5ebe0';
            ctx.beginPath();
            ctx.ellipse(0, -22, 15.5, 18.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = 2.0;
            [
                [-7, -27], [0, -27], [7, -27],
                [-9, -20], [-2, -20], [5, -20],
                [-6, -13], [1, -13], [7, -13]
            ].forEach(([fx, fy]) => {
                ctx.beginPath();
                ctx.arc(fx, fy, 3.4, 0.15, Math.PI - 0.15);
                ctx.stroke();
            });
            ctx.lineWidth = 2.8;

            // 부엉이 얼굴 원반 (Facial Disc) & 귀 깃털 (Horn Tufts)
            ctx.fillStyle = '#d5bdaf';
            ctx.beginPath();
            ctx.ellipse(-9, -40, 11, 11, 0, 0, Math.PI * 2);
            ctx.ellipse(9, -40, 11, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#4a2c11';
            ctx.beginPath();
            ctx.moveTo(-14, -48); ctx.lineTo(-27, -64); ctx.lineTo(-4, -52);
            ctx.moveTo(14, -48); ctx.lineTo(27, -64); ctx.lineTo(4, -52);
            ctx.fill();
            ctx.stroke();

            // 왕방울 황금 눈 2개 + 동공 + 이중 별빛 하이라이트
            [-9, 9].forEach(ex => {
                ctx.fillStyle = '#ffbe0b';
                ctx.beginPath();
                ctx.arc(ex, -40, 8.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -40, 4.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex - 1.8, -41.8, 1.9, 0, Math.PI * 2);
                ctx.arc(ex + 1.6, -38.4, 1.0, 0, Math.PI * 2);
                ctx.fill();
            });

            // 날카로운 갈고리 부리
            ctx.fillStyle = '#fb8500';
            ctx.beginPath();
            ctx.moveTo(-5, -36);
            ctx.lineTo(5, -36);
            ctx.lineTo(0, -27);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2단계 사막 동물 5종 (0:사막전갈, 1:사막여우, 2:단봉낙타, 3:쌍봉낙타, 4:사막도마뱀)
    drawRealDesertAnimal(ctx, ax, ay, kind, time, faceDir = 1) {
        ctx.save();
        ctx.translate(ax, ay);
        // 요청 반영: 사막 동물도 2.35배 스케일로 큼직하고 생동감 넘치게 확대!
        ctx.scale(faceDir * 2.35, 2.35);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.fillStyle = 'rgba(26, 22, 18, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 6, 38, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawHatching(ctx, -24, 6, 24, 6, 7, 7, -0.5);

        if (kind === 0) {
            // 🦂 0: 황제 사막전갈 (다관절 다리 8개 + 7겹 갑각 마디 + 톱니 집게발 2개 + 6마디 독침 꼬리 & 형광 독액 방울!)
            [-1, 1].forEach(side => {
                for (let l = 0; l < 4; l++) {
                    const step = Math.sin(time * 12 + l * 1.4) * 2.5;
                    ctx.beginPath();
                    ctx.moveTo(side * 12, -9 - l * 3.5);
                    ctx.lineTo(side * 27, -17 - l * 4.5 + step);
                    ctx.lineTo(side * 36, -3 - l * 2.5 + step);
                    ctx.stroke();
                }
            });

            // 마디 갑각 몸통
            const scorpGrad = ctx.createLinearGradient(-20, -28, 20, -2);
            scorpGrad.addColorStop(0, '#bb3e03');
            scorpGrad.addColorStop(0.5, '#9b2226');
            scorpGrad.addColorStop(1, '#370617');
            ctx.fillStyle = scorpGrad;
            ctx.beginPath();
            ctx.ellipse(0, -16, 24, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 갑각 등판 마디 선 & 해칭
            [-10, -3, 4, 11].forEach(segX => {
                ctx.beginPath();
                ctx.moveTo(segX, -28);
                ctx.quadraticCurveTo(segX + 3, -16, segX, -4);
                ctx.stroke();
            });
            this.drawHatching(ctx, -15, -15, 15, -15, 6, 6, -0.5);

            // 아치형 6마디 전갈 꼬리
            const tailBob = Math.sin(time * 7) * 2;
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#ca6702' : '#9b2226';
                ctx.beginPath();
                ctx.arc(-10 - i * 2.8, -28 - i * 7.8 + tailBob * 0.4, 7.5 - i * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            // 날카로운 붉은 독침 + 형광 초록 독액 방울
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(-25, -72 + tailBob);
            ctx.lineTo(-9, -66 + tailBob);
            ctx.lineTo(-19, -56 + tailBob);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#80ffdb';
            ctx.beginPath();
            ctx.arc(-8, -64 + tailBob, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 톱니가 달린 거대 집게발 2개
            [-18, 18].forEach(px => {
                ctx.fillStyle = '#ae2012';
                ctx.beginPath();
                ctx.arc(px, -5, 11, 0.25, Math.PI * 1.75);
                ctx.lineTo(px, -5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // 빛나는 눈 2개
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(10, -21, 2.5, 0, Math.PI * 2);
            ctx.arc(16, -18, 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 1) {
            // 🦊 1: 사막여우 (페넥여우: 초대형 레이더 귀 + 귓속 잔털 + 눈물 자국 무늬 + 복슬 꼬리 + 초롱초롱 눈)
            const earWave = Math.sin(time * 6) * 0.07;

            // 풍성한 모래빛 꼬리 & 검은 꼬리 끝
            ctx.fillStyle = '#f4e285';
            ctx.beginPath();
            ctx.ellipse(-24, -16, 19, 10, -0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.arc(-39, -22, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 아담한 다리 4개
            [-12, -4, 7, 14].forEach(lx => {
                ctx.fillStyle = '#e9c46a';
                ctx.fillRect(lx - 2.8, -11, 5.6, 13);
                ctx.strokeRect(lx - 2.8, -11, 5.6, 13);
            });

            // 크림색 몸통 & 하얀 배
            const fenGrad = ctx.createLinearGradient(0, -32, 0, -4);
            fenGrad.addColorStop(0, '#f4e285');
            fenGrad.addColorStop(1, '#dda15e');
            ctx.fillStyle = fenGrad;
            ctx.beginPath();
            ctx.ellipse(0, -18, 21, 13.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fffcf2';
            ctx.beginPath();
            ctx.ellipse(3, -12, 14, 6, 0, 0, Math.PI);
            ctx.fill();
            this.drawHatching(ctx, -12, -14, 10, -14, 5, 6, -0.5);

            // 페넥여우 특유의 초대형 레이더 귀 2개 + 귓속 핑크/크림 잔털 결
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.translate(12 + dir * 9.5, -46);
                ctx.rotate(dir * 0.48 + earWave * dir);
                ctx.fillStyle = '#f4e285';
                ctx.beginPath();
                ctx.ellipse(0, -9, 10.5, 23, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffcad4';
                ctx.beginPath();
                ctx.ellipse(0, -8, 6.2, 16.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // 귓속 하얀 잔털 줄무늬
                ctx.strokeStyle = '#fffcf2';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-4, -2); ctx.lineTo(3, -6);
                ctx.moveTo(-4, -8); ctx.lineTo(3, -12);
                ctx.stroke();
                ctx.restore();
            });

            // 하트형 얼굴 & 하얀 볼털
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.fillStyle = '#f4e285';
            ctx.beginPath();
            ctx.arc(12, -34, 14.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fffcf2';
            ctx.beginPath();
            ctx.ellipse(8, -29, 6, 5, 0, 0, Math.PI * 2);
            ctx.ellipse(18, -29, 6, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 초롱초롱한 큰 눈동자 + 하이라이트 + 귀여운 코 + 수염
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(8, -34, 3.8, 0, Math.PI * 2);
            ctx.arc(18, -34, 3.8, 0, Math.PI * 2);
            ctx.arc(13, -25, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(6.8, -35.3, 1.5, 0, Math.PI * 2);
            ctx.arc(16.8, -35.3, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(6, -27); ctx.lineTo(-4, -28);
            ctx.moveTo(6, -25); ctx.lineTo(-3, -24);
            ctx.moveTo(20, -27); ctx.lineTo(30, -28);
            ctx.moveTo(20, -25); ctx.lineTo(29, -24);
            ctx.stroke();

        } else if (kind === 2 || kind === 3) {
            // 🐪 2: 단봉낙타 / 🐫 3: 쌍봉낙타 (무릎 패드 긴 다리 + 금실 술 장식 아라비안 양탄자 안장 + 털뭉치 혹 + 건초 먹기)
            const walk = Math.sin(time * 4.5) * 4;
            [[-16, 1], [-6, -1], [8, 1], [18, -1]].forEach(([lx, dir]) => {
                const fx = lx + dir * walk;
                ctx.strokeStyle = '#8c5227';
                ctx.lineWidth = 5.4;
                ctx.beginPath();
                ctx.moveTo(lx, -26);
                ctx.lineTo(lx + dir * walk * 0.4, -12);
                ctx.lineTo(fx, 2);
                ctx.stroke();
                // 무릎 패드 & 넓은 사막 발바닥
                ctx.fillStyle = '#5c3a21';
                ctx.beginPath();
                ctx.arc(lx + dir * walk * 0.4, -12, 3.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6f3b0e';
                ctx.beginPath();
                ctx.ellipse(fx, 3, 5.5, 2.8, 0, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;

            // 낙타 꼬리
            ctx.beginPath();
            ctx.moveTo(-28, -34);
            ctx.quadraticCurveTo(-36, -24, -34, -14);
            ctx.stroke();

            // 낙타 몸통
            const camGrad = ctx.createLinearGradient(0, -52, 0, -14);
            camGrad.addColorStop(0, kind === 2 ? '#e9c46a' : '#c88a51');
            camGrad.addColorStop(1, '#8c5227');
            ctx.fillStyle = camGrad;
            ctx.beginPath();
            ctx.ellipse(0, -33, 30, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -18, -24, 16, -24, 7, 7, -0.5);

            // 낙타 혹 (단봉 vs 쌍봉) & 화려한 아라비안 카펫 안장
            if (kind === 2) {
                ctx.fillStyle = '#dda15e';
                ctx.beginPath();
                ctx.arc(0, -49, 16, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
            } else {
                [-11, 11].forEach(hx => {
                    ctx.fillStyle = '#b07d4f';
                    ctx.beginPath();
                    ctx.arc(hx, -48, 11.5, Math.PI, 0);
                    ctx.fill();
                    ctx.stroke();
                });
            }

            // 금빛 술이 달린 왕실 양탄자 안장
            ctx.fillStyle = kind === 2 ? '#e63946' : '#2a9d8f';
            ctx.fillRect(-15, -47, 30, 15);
            ctx.strokeRect(-15, -47, 30, 15);
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.moveTo(0, -45); ctx.lineTo(8, -39.5); ctx.lineTo(0, -34); ctx.lineTo(-8, -39.5);
            ctx.closePath();
            ctx.fill();
            // 금색 술(Tassels)
            for (let tx = -13; tx <= 13; tx += 6.5) {
                ctx.fillRect(tx - 1, -32, 2.5, 4.5);
            }

            // U자형 긴 목과 갈기 털 & 낙타 얼굴
            ctx.fillStyle = kind === 2 ? '#dda15e' : '#b07d4f';
            ctx.beginPath();
            ctx.moveTo(18, -34);
            ctx.quadraticCurveTo(35, -34, 32, -65);
            ctx.lineTo(22, -65);
            ctx.quadraticCurveTo(22, -44, 14, -39);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(32, -68, 13.5, 8.5, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 둥근 귀
            ctx.beginPath();
            ctx.arc(23, -74, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 긴 속눈썹 눈 & 콧구멍 & 입에 문 사막 풀
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(33, -70, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(32, -71, 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#52b788';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(42, -65);
            ctx.lineTo(51, -61);
            ctx.moveTo(42, -65);
            ctx.lineTo(50, -68);
            ctx.stroke();

        } else {
            // 🦎 4: 사막 목도리도마뱀 (줄무늬 긴 꼬리 + 발톱 다리 + 10갈래 부채꼴 목도리 프릴 + 경고 무늬 + 황금 파충류 눈)
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.moveTo(-12, -12);
            ctx.quadraticCurveTo(-48, -2, -56, -28);
            ctx.quadraticCurveTo(-38, -10, -12, -20);
            ctx.fill();
            ctx.stroke();

            // 발톱 달린 도마뱀 다리
            [-8, 8].forEach(lx => {
                ctx.beginPath();
                ctx.moveTo(lx, -10);
                ctx.lineTo(lx - 4, 2);
                ctx.lineTo(lx + 4, 2);
                ctx.stroke();
            });

            // 비늘 몸통
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.ellipse(0, -16, 22, 12, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -14, -16, 10, -16, 6, 6, 0.5);
            this.drawHatching(ctx, -14, -16, 10, -16, 6, 6, -0.5);

            // 화려하게 펼쳐진 2중 부채꼴 목도리 프릴 (Frill)
            const frillPulse = 1 + Math.sin(time * 9) * 0.06;
            ctx.save();
            ctx.translate(16, -26);
            ctx.scale(frillPulse, frillPulse);
            const frillGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 21);
            frillGrad.addColorStop(0, '#ffbe0b');
            frillGrad.addColorStop(0.6, '#f4a261');
            frillGrad.addColorStop(1, '#e63946');
            ctx.fillStyle = frillGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#9b2226';
            ctx.lineWidth = 2;
            for (let a = 0; a < 10; a++) {
                const ang = (a / 10) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(ang) * 19, Math.sin(ang) * 19);
                ctx.stroke();
            }
            ctx.restore();

            // 도마뱀 머리와 황금 눈
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.fillStyle = '#3a5a40';
            ctx.beginPath();
            ctx.ellipse(22, -26, 12.5, 8.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(25, -28, 3.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.fillRect(24.3, -30.5, 1.4, 5);
        }
        ctx.restore();
    }

    // 3단계 해저 생물 5종 (0:백상아리, 1:열대어, 2:대왕고래, 3:바다문어, 4:바다거북)
    drawRealSeaCreature(ctx, ax, ay, scale, kind, time, faceDir = 1) {
        ctx.save();
        ctx.translate(ax, ay);
        // 요청 반영: 해저 동물도 2.3배 스케일로 큼직하고 선명하게 확대!
        ctx.scale(faceDir * scale * 2.30, scale * 2.30);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.8;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const tailWag = Math.sin(time * 7 + kind) * 6.5;

        if (kind === 0) {
            // 🦈 0: 백상아리 (투톤 어뢰형 몸통 + 초승달 꼬리지느러미 + 등/가슴지느러미 + 아가미 5줄 + 2열 톱니 이빨 + 물방울)
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(-36, tailWag * 0.5);
            ctx.lineTo(-55, -20 + tailWag);
            ctx.lineTo(-47, 0 + tailWag * 0.6);
            ctx.lineTo(-53, 19 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 등지느러미 & 가슴지느러미
            ctx.beginPath();
            ctx.moveTo(-10, -13);
            ctx.lineTo(3, -39);
            ctx.lineTo(17, -13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const sharkGrad = ctx.createLinearGradient(0, -19, 0, 17);
            sharkGrad.addColorStop(0, '#1d3557');
            sharkGrad.addColorStop(0.55, '#457b9d');
            sharkGrad.addColorStop(1, '#f1faee');
            ctx.fillStyle = sharkGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 40, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 가슴지느러미
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(2, 8);
            ctx.lineTo(-8, 26);
            ctx.lineTo(14, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 벌린 상어 입 & 톱니 이빨 & 아가미 4줄 & 매서운 노란 눈
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(23, 6, 9.5, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            for (let tx = 16; tx <= 29; tx += 4.2) {
                ctx.beginPath();
                ctx.moveTo(tx - 1.8, 6);
                ctx.lineTo(tx, 10.5);
                ctx.lineTo(tx + 1.8, 6);
                ctx.fill();
            }

            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(26, -5, 3.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(26.8, -5, 1.8, 0, Math.PI * 2);
            ctx.fill();

            for (let g = 0; g < 4; g++) {
                ctx.beginPath();
                ctx.moveTo(4 + g * 4, -7);
                ctx.quadraticCurveTo(2 + g * 4, 0, 4 + g * 4, 6);
                ctx.stroke();
            }

        } else if (kind === 1) {
            // 🐠 1: 황제 열대어 (흰동가리: 주황 몸통 + 검은 테두리 하얀 줄무늬 3개 + 부채꼴 지느러미 결)
            ctx.fillStyle = '#fb5607';
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(-36, -15 + tailWag * 0.6);
            ctx.quadraticCurveTo(-41, tailWag * 0.6, -36, 15 + tailWag * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 등지느러미
            ctx.fillStyle = '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(-12, -14);
            ctx.quadraticCurveTo(0, -28, 12, -13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fb5607';
            ctx.beginPath();
            ctx.ellipse(0, 0, 25, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 흰동가리 하얀 줄무늬 3줄
            ctx.fillStyle = '#ffffff';
            [[-13, 6, 26], [-1, 7, 32], [11, 6, 26]].forEach(([bx, bw, bh]) => {
                ctx.beginPath();
                ctx.roundRect(bx, -bh * 0.5, bw, bh, 3);
                ctx.fill();
                ctx.stroke();
            });

            // 가슴 지느러미
            ctx.fillStyle = 'rgba(255, 190, 11, 0.85)';
            ctx.beginPath();
            ctx.ellipse(4, 5, 7, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 눈동자 & 하이라이트
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(18, -3, 3.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16.8, -4.2, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2) {
            // 🐋 2: 대왕고래 (거대한 네이비/시안 몸통 + 주름진 하얀 배 8줄 + 가슴지느러미 + 2단 분수 물줄기!)
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(-44, tailWag * 0.5);
            ctx.lineTo(-64, -19 + tailWag);
            ctx.lineTo(-58, 19 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const whaleGrad = ctx.createLinearGradient(0, -24, 0, 22);
            whaleGrad.addColorStop(0, '#1d3557');
            whaleGrad.addColorStop(0.6, '#2a6f97');
            whaleGrad.addColorStop(1, '#caf0f8');
            ctx.fillStyle = whaleGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 48, 23, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 하얀 주름 배 (Ventral Pleats)
            ctx.fillStyle = '#caf0f8';
            ctx.beginPath();
            ctx.ellipse(8, 8, 36, 12, 0, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -18, 13, 28, 13, 8, 6, 0.08);

            // 긴 가슴지느러미
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.ellipse(4, 14, 7, 16, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 시원하게 뿜어져 나오는 2단 고래 분수 & 물방울!
            ctx.strokeStyle = '#90e0ef';
            ctx.lineWidth = 3.4;
            ctx.beginPath();
            ctx.moveTo(15, -22);
            ctx.quadraticCurveTo(4, -48, -14, -40);
            ctx.moveTo(15, -22);
            ctx.quadraticCurveTo(26, -48, 40, -40);
            ctx.moveTo(15, -22);
            ctx.lineTo(15, -46);
            ctx.stroke();
            ctx.fillStyle = '#caf0f8';
            [[-16, -36], [15, -50], [42, -36]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(dx, dy, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(28, -4, 3.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(27, -5.2, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 🐙 3: 대왕 바다문어 (빨판이 촘촘히 박힌 8가닥 꿈틀 다리 + 반점 둥근 머리 + 왕눈)
            for (let t = -3; t <= 3; t++) {
                const wave = Math.sin(time * 8 + t) * 6;
                const endX = t * 8.5 - wave;
                ctx.beginPath();
                ctx.moveTo(t * 6.5, 4);
                ctx.quadraticCurveTo(t * 11 + wave, 19, endX, 34);
                ctx.lineWidth = 7.5;
                ctx.strokeStyle = '#e63946';
                ctx.stroke();
                ctx.lineWidth = 2.6;
                ctx.strokeStyle = '#1a1612';
                ctx.stroke();
                // 다리 위 분홍/하얀 빨판(Suction Cups)
                ctx.fillStyle = '#ffccd5';
                ctx.beginPath();
                ctx.arc(t * 8 + wave * 0.4, 16, 2.2, 0, Math.PI * 2);
                ctx.arc(t * 8.2, 25, 2.0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.lineWidth = 2.8;
            const octGrad = ctx.createRadialGradient(-6, -16, 4, 0, -10, 24);
            octGrad.addColorStop(0, '#ff758f');
            octGrad.addColorStop(1, '#c9184a');
            ctx.fillStyle = octGrad;
            ctx.beginPath();
            ctx.arc(0, -10, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -13, -18, 13, -18, 5, 6, -0.5);

            [-7.5, 7.5].forEach(ex => {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex, -6, 5.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -6, 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex - 1, -7.2, 1.1, 0, Math.PI * 2);
                ctx.fill();
            });

        } else {
            // 🐢 4: 푸른바다거북 (정교한 육각형 등껍질 무늬 + 노란 테두리 + 비늘 지느러미 발 + 초롱초롱 눈)
            const swim = Math.sin(time * 6) * 0.22;
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.ellipse(10, -20, 7.5, 17, -0.45 + swim, 0, Math.PI * 2);
            ctx.ellipse(10, 20, 7.5, 17, 0.45 - swim, 0, Math.PI * 2);
            ctx.ellipse(-19, -14, 5.5, 12, 0.5, 0, Math.PI * 2);
            ctx.ellipse(-19, 14, 5.5, 12, -0.5, 0, Math.PI * 2);
            ctx.ellipse(30, 0, 11, 8.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 등껍질 황금 테두리 & 짙은 녹색 돔
            ctx.fillStyle = '#e9c46a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 26, 19, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 23, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 육각형 거북 등껍질 격자 무늬
            ctx.strokeStyle = '#95d5b2';
            ctx.lineWidth = 2.4;
            ctx.strokeRect(-12, -8, 24, 16);
            ctx.beginPath();
            ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
            ctx.moveTo(-4, -8); ctx.lineTo(-4, 8);
            ctx.moveTo(4, -8); ctx.lineTo(4, 8);
            ctx.stroke();

            ctx.strokeStyle = '#1a1612';
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(33, -2.5, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(32, -3.5, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 🌲 1단계 숲: 겹겹이 우거진 고품격 숲속 나무 군락 (거대 고대 참나무, 전나무, 자작나무, 꽃나무, 버섯 & 풀숲)
    drawLushForestTreeCluster(ctx, side, variant, time) {
        ctx.save();
        const treeBaseX = side * 105;
        const wind = Math.sin(time * 2.2 + variant) * 4;

        // 1) 원경 보조 배경 나무 (깊이감 형성)
        const bgTreeX = side * 155;
        ctx.fillStyle = '#1b4332';
        ctx.strokeStyle = '#143626';
        ctx.lineWidth = 3;
        ctx.fillRect(bgTreeX - 14, -210, 28, 210);
        ctx.beginPath();
        ctx.arc(bgTreeX - 22, -210, 48, 0, Math.PI * 2);
        ctx.arc(bgTreeX + 22, -210, 48, 0, Math.PI * 2);
        ctx.arc(bgTreeX, -250, 58, 0, Math.PI * 2);
        ctx.fill();

        // 2) 중경 보조 나무 (전나무 or 자작나무)
        const midTreeX = side * 62;
        ctx.fillStyle = '#2d6a4f';
        ctx.beginPath();
        ctx.moveTo(midTreeX, -170);
        ctx.lineTo(midTreeX - 35, -95);
        ctx.lineTo(midTreeX + 35, -95);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(midTreeX, -135);
        ctx.lineTo(midTreeX - 44, -55);
        ctx.lineTo(midTreeX + 44, -55);
        ctx.closePath();
        ctx.fill();

        // 3) 주 메인 나무 (variant에 따른 4가지 고유 수종)
        const treeType = variant % 4;

        if (treeType === 0) {
            // [A] 거대 고대 참나무 (Ancient Grand Oak) - 뒤틀린 나무 밑동, 3D 나무껍질 주름, 4단 입체 수관, 덩굴
            const trunkGrad = ctx.createLinearGradient(treeBaseX - 26, -195, treeBaseX + 26, 0);
            trunkGrad.addColorStop(0, '#7f4f24');
            trunkGrad.addColorStop(0.5, '#582f0e');
            trunkGrad.addColorStop(1, '#331800');
            ctx.fillStyle = trunkGrad;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.5;

            // 곡선형 밑동 (뿌리 확장)
            ctx.beginPath();
            ctx.moveTo(treeBaseX - 22, -195);
            ctx.lineTo(treeBaseX + 22, -195);
            ctx.quadraticCurveTo(treeBaseX + 26, -60, treeBaseX + 44, 0);
            ctx.lineTo(treeBaseX - 44, 0);
            ctx.quadraticCurveTo(treeBaseX - 26, -60, treeBaseX - 22, -195);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 나무껍질 질감 빗금
            this.drawHatching(ctx, treeBaseX - 12, -165, treeBaseX - 12, -25, 7, 12, 0.4);
            this.drawHatching(ctx, treeBaseX + 12, -165, treeBaseX + 12, -25, 7, 12, -0.4);

            // 주 잎사귀 돔 4개 (입체 음영)
            const folGrad = ctx.createRadialGradient(treeBaseX - 15, -240, 20, treeBaseX, -220, 95);
            folGrad.addColorStop(0, '#52b788');
            folGrad.addColorStop(0.5, '#2d6a4f');
            folGrad.addColorStop(1, '#1b4332');
            ctx.fillStyle = folGrad;

            // 하단 좌우 볼륨
            ctx.beginPath();
            ctx.arc(treeBaseX - 38 + wind * 0.5, -195, 62, 0, Math.PI * 2);
            ctx.arc(treeBaseX + 38 + wind * 0.5, -195, 62, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 상단 메인 돔
            ctx.beginPath();
            ctx.arc(treeBaseX + wind, -242, 75, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 햇살 하이라이트 잎사귀 층
            ctx.fillStyle = 'rgba(149, 213, 178, 0.55)';
            ctx.beginPath();
            ctx.arc(treeBaseX - 22 + wind, -260, 34, 0, Math.PI * 2);
            ctx.arc(treeBaseX + 20 + wind, -250, 28, 0, Math.PI * 2);
            ctx.fill();

            // 덩굴 줄기 & 열매
            ctx.strokeStyle = '#40916c';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(treeBaseX - 28, -160);
            ctx.quadraticCurveTo(treeBaseX - 36, -110, treeBaseX - 24, -65);
            ctx.stroke();
            ctx.fillStyle = '#ffb703';
            ctx.beginPath();
            ctx.arc(treeBaseX - 24, -65, 4.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (treeType === 1) {
            // [B] 고산 침엽수 전나무 (Alpine Evergreen Fir) - 5층 원뿔 가지 & 솔방울
            ctx.fillStyle = '#4a2810';
            ctx.fillRect(treeBaseX - 10, -80, 20, 80);
            ctx.strokeRect(treeBaseX - 10, -80, 20, 80);

            const pineTiers = [
                { y: -260, w: 56, h: 65, col: '#52b788' },
                { y: -220, w: 76, h: 72, col: '#40916c' },
                { y: -175, w: 96, h: 80, col: '#2d6a4f' },
                { y: -125, w: 118, h: 88, col: '#1b4332' }
            ];

            pineTiers.forEach(tier => {
                ctx.fillStyle = tier.col;
                ctx.beginPath();
                ctx.moveTo(treeBaseX + wind * 0.4, tier.y);
                ctx.lineTo(treeBaseX - tier.w * 0.5, tier.y + tier.h);
                ctx.lineTo(treeBaseX - tier.w * 0.2, tier.y + tier.h - 10);
                ctx.lineTo(treeBaseX, tier.y + tier.h);
                ctx.lineTo(treeBaseX + tier.w * 0.2, tier.y + tier.h - 10);
                ctx.lineTo(treeBaseX + tier.w * 0.5, tier.y + tier.h);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

        } else if (treeType === 2) {
            // [C] 황금빛 자작나무 (Golden Birch) - 하얀 은빛 줄기, 검은 수피 홈, 흩날리는 황금 잎
            ctx.fillStyle = '#f8f9fa';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.2;
            ctx.fillRect(treeBaseX - 12, -220, 24, 220);
            ctx.strokeRect(treeBaseX - 12, -220, 24, 220);

            // 자작나무 검은 가로 줄무늬 홈
            ctx.fillStyle = '#212529';
            [-190, -155, -120, -85, -50, -20].forEach((ly, i) => {
                ctx.fillRect(treeBaseX - 12 + (i % 2 === 0 ? 0 : 7), ly, 15, 4);
            });

            // 황금 단풍 잎사귀 돔
            const goldGrad = ctx.createRadialGradient(treeBaseX - 10, -250, 15, treeBaseX, -230, 80);
            goldGrad.addColorStop(0, '#ffea79');
            goldGrad.addColorStop(0.5, '#e9c46a');
            goldGrad.addColorStop(1, '#d4a373');
            ctx.fillStyle = goldGrad;
            ctx.beginPath();
            ctx.arc(treeBaseX - 30 + wind, -210, 52, 0, Math.PI * 2);
            ctx.arc(treeBaseX + 30 + wind, -210, 52, 0, Math.PI * 2);
            ctx.arc(treeBaseX + wind, -255, 66, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else {
            // [D] 숲속 꽃사과/단풍나무 (Blossom Forest Tree) - 붉은 과일 & 산뜻한 단풍
            const trunkGrad = ctx.createLinearGradient(treeBaseX - 16, -180, treeBaseX + 16, 0);
            trunkGrad.addColorStop(0, '#6f4e37');
            trunkGrad.addColorStop(1, '#3c2415');
            ctx.fillStyle = trunkGrad;
            ctx.fillRect(treeBaseX - 16, -180, 32, 180);
            ctx.strokeRect(treeBaseX - 16, -180, 32, 180);

            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.arc(treeBaseX - 32 + wind, -180, 56, 0, Math.PI * 2);
            ctx.arc(treeBaseX + 32 + wind, -180, 56, 0, Math.PI * 2);
            ctx.arc(treeBaseX + wind, -225, 70, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 빨간 사과 열매 5개
            ctx.fillStyle = '#e63946';
            [[-25, -235], [20, -240], [-10, -200], [35, -190], [-35, -170]].forEach(([fx, fy]) => {
                ctx.beginPath();
                ctx.arc(treeBaseX + fx + wind, fy, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }

        // 4) 나무 밑동 풀숲 & 예쁜 빨간 버섯
        ctx.fillStyle = '#38b000';
        ctx.beginPath();
        ctx.ellipse(treeBaseX, 0, 48, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // 숲 버섯 (빨간 갓 + 흰 점)
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(treeBaseX + 26, -16, 8, 16);
        ctx.fillStyle = '#d90429';
        ctx.beginPath();
        ctx.arc(treeBaseX + 30, -16, 13, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(treeBaseX + 26, -21, 2.5, 0, Math.PI * 2);
        ctx.arc(treeBaseX + 34, -20, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 🏜️ 2단계 사막: 고대 이집트 대스핑크스 석상 (The Great Sphinx of Giza Monument)
    drawSphinxMonument(ctx, side, variant, time) {
        ctx.save();
        const spBaseX = side * 108;
        const faceDir = side < 0 ? 1 : -1;
        ctx.translate(spBaseX, 0);
        ctx.scale(faceDir, 1);

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1) 고대 사암 기단 (Sandstone Hieroglyphic Plinth)
        const baseGrad = ctx.createLinearGradient(-110, -42, 110, 0);
        baseGrad.addColorStop(0, '#e9c46a');
        baseGrad.addColorStop(0.5, '#dda15e');
        baseGrad.addColorStop(1, '#bc6c25');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(-110, -40, 220, 40);
        ctx.strokeRect(-110, -40, 220, 40);

        // 기단 상단 몰딩 계단
        ctx.fillStyle = '#f4a261';
        ctx.fillRect(-102, -50, 204, 12);
        ctx.strokeRect(-102, -50, 204, 12);

        // 상형문자 조각 장식선 (Hieroglyphic inscript)
        ctx.fillStyle = 'rgba(74, 44, 16, 0.45)';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('𓂀 𓃠 𓆣 𓏏 𓀀', 0, -18);

        // 2) 웅크린 거대 사자 몸체 (Recumbent Lion Body)
        const lionGrad = ctx.createLinearGradient(-85, -165, 85, -45);
        lionGrad.addColorStop(0, '#f4e285');
        lionGrad.addColorStop(0.4, '#e09f3e');
        lionGrad.addColorStop(1, '#b5651d');
        ctx.fillStyle = lionGrad;

        // 등허리와 엉덩이 볼륨
        ctx.beginPath();
        ctx.moveTo(35, -145);
        ctx.bezierCurveTo(75, -155, 105, -115, 95, -50); // 엉덩이
        ctx.lineTo(-65, -50);                           // 배
        ctx.bezierCurveTo(-65, -95, -35, -135, 10, -145); // 등
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 긴 사자 꼬리 (엉덩이에서 말려 올라옴)
        ctx.strokeStyle = '#99582a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(92, -62);
        ctx.quadraticCurveTo(112, -75, 102, -105);
        ctx.stroke();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#1a1612';

        // 3) 앞으로 쭉 뻗은 거대한 두 앞발 (Extended Lion Paws)
        ctx.fillStyle = '#dda15e';
        // 뒷쪽 앞발
        ctx.beginPath();
        ctx.roundRect(-98, -62, 54, 20, 8);
        ctx.fill();
        ctx.stroke();
        // 앞쪽 앞발
        ctx.beginPath();
        ctx.roundRect(-108, -52, 62, 22, 9);
        ctx.fill();
        ctx.stroke();
        // 발가락 홈 3개
        ctx.strokeStyle = '#6f4e37';
        ctx.lineWidth = 3;
        [-100, -90, -80].forEach(px => {
            ctx.beginPath();
            ctx.moveTo(px, -50);
            ctx.lineTo(px, -32);
            ctx.stroke();
        });
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;

        // 4) 스핑크스 파라오 두상 (Head of the Pharaoh)
        ctx.save();
        ctx.translate(-26, -172);

        // 네메스 두건 뒤편 날개 (Nemes Headdress Flaps) - 청금석과 순금 스트라이프!
        ctx.beginPath();
        ctx.moveTo(-42, 45);
        ctx.lineTo(-46, -18);
        ctx.lineTo(-12, -56);
        ctx.lineTo(36, -56);
        ctx.lineTo(46, -18);
        ctx.lineTo(42, 45);
        ctx.lineTo(24, 45);
        ctx.lineTo(26, -10);
        ctx.lineTo(-26, -10);
        ctx.lineTo(-24, 45);
        ctx.closePath();
        ctx.fillStyle = '#ffbe0b';
        ctx.fill();
        ctx.stroke();

        // 네메스 로열 블루 스트라이프
        ctx.fillStyle = '#1d3557';
        [-40, -25, -10, 5, 20, 35].forEach(sy => {
            ctx.fillRect(-44, sy, 88, 7);
        });

        // 파라오 얼굴 (사암 조각 피부)
        const faceGrad = ctx.createLinearGradient(-24, -40, 24, 20);
        faceGrad.addColorStop(0, '#fceade');
        faceGrad.addColorStop(0.6, '#dda15e');
        faceGrad.addColorStop(1, '#bc6c25');
        ctx.fillStyle = faceGrad;
        ctx.beginPath();
        ctx.roundRect(-24, -42, 48, 56, 16);
        ctx.fill();
        ctx.stroke();

        // 이마의 우라에우스 황금 코브라 휘장 (Uraeus Cobra)
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(0, -42, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#d62828';
        ctx.beginPath();
        ctx.arc(0, -42, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 고대 이집트 아몬드형 눈과 짙은 아이라인(Kohl)
        ctx.fillStyle = '#1a1612';
        // 좌측 눈
        ctx.beginPath();
        ctx.ellipse(-11, -22, 6, 3.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-18, -22); ctx.lineTo(-4, -22);
        ctx.stroke();
        // 우측 눈
        ctx.beginPath();
        ctx.ellipse(11, -22, 6, 3.5, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -22); ctx.lineTo(18, -22);
        ctx.stroke();

        // 조각된 코와 입술
        ctx.fillStyle = '#bc6c25';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-4, -8);
        ctx.lineTo(4, -8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#5c4938';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-8, 3);
        ctx.quadraticCurveTo(0, 7, 8, 3);
        ctx.stroke();

        // 파라오 수염 조각 (Ceremonial Braided Beard)
        ctx.fillStyle = '#1d3557';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, 14);
        ctx.lineTo(6, 14);
        ctx.lineTo(4, 38);
        ctx.lineTo(-4, 38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffbe0b';
        ctx.fillRect(-5, 20, 10, 4);
        ctx.fillRect(-5, 29, 10, 4);

        ctx.restore();
        ctx.restore();
    }

    // 🏢 타임스퀘어 실제 기업 브랜드 전광판 렌더링 (삼성, 코카콜라, 애플, 구글, 맥도날드, 소니, 디즈니, 현대, LG, 나이키)
    drawRealCorporateBillboard(ctx, x, y, w, h, brandIdx, time) {
        ctx.save();
        ctx.textAlign = 'center';

        const cx = x + w * 0.5;
        const cy = y + h * 0.5;

        if (brandIdx === 0) {
            // [0] SAMSUNG - 삼성전자 (시그니처 사이버 블루, Galaxy AI is Here, 타원 엠블럼)
            const samGrad = ctx.createLinearGradient(x, y, x, y + h);
            samGrad.addColorStop(0, '#023e8a');
            samGrad.addColorStop(1, '#001233');
            ctx.fillStyle = samGrad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#00b4d8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 빛나는 네온 타원 프레임
            ctx.strokeStyle = 'rgba(0, 180, 216, 0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, y + 32, w * 0.42, 17, -0.15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Arial", sans-serif';
            ctx.fillText('SAMSUNG', cx, y + 37);

            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 11px sans-serif';
            const pulseAI = Math.sin(time * 5) > 0 ? '✨ Galaxy AI is Here ✨' : '📱 Neo QLED 8K';
            ctx.fillText(pulseAI, cx, y + 68);

        } else if (brandIdx === 1) {
            // [1] Coca-Cola - 코카콜라 (클래식 크림슨 레드, 다이내믹 화이트 웨이브 리본, 탄산 버블)
            const cokeGrad = ctx.createLinearGradient(x, y, x, y + h);
            cokeGrad.addColorStop(0, '#e61d2b');
            cokeGrad.addColorStop(1, '#9b000b');
            ctx.fillStyle = cokeGrad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 코카콜라 시그니처 화이트 웨이브 곡선 리본
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(x + 4, y + 60);
            ctx.bezierCurveTo(cx - 15, y + 78, cx + 15, y + 42, x + w - 4, y + 54);
            ctx.stroke();

            // 탄산 버블 방울
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (let b = 0; b < 6; b++) {
                const bx = x + 12 + ((b * 17) % (w - 24));
                const by = y + h - ((time * 24 + b * 15) % (h - 10));
                ctx.beginPath();
                ctx.arc(bx, by, 2 + (b % 3), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic bold 17px "Times New Roman", serif';
            ctx.fillText('Coca-Cola', cx, y + 38);

        } else if (brandIdx === 2) {
            // [2] Apple - 애플 (옵시디언 블랙 글래스, 티타늄 프레임, 발광 사과 로고, iPhone 16 Pro)
            ctx.fillStyle = '#08080c';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#e5e5ea';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 빛나는 화이트 애플 로고 실루엣
            ctx.save();
            ctx.translate(cx, y + 30);
            ctx.fillStyle = '#ffffff';
            // 사과 몸체
            ctx.beginPath();
            ctx.arc(-5, 0, 10, 0, Math.PI * 2);
            ctx.arc(5, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            // 사과 한입 베어문 부분
            ctx.fillStyle = '#08080c';
            ctx.beginPath();
            ctx.arc(10, -2, 5.5, 0, Math.PI * 2);
            ctx.fill();
            // 잎사귀
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(3, -12, 4.5, 2.5, 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px -apple-system, sans-serif';
            ctx.fillText('iPhone 16 Pro', cx, y + 58);
            ctx.fillStyle = '#8e8e93';
            ctx.font = '10px sans-serif';
            ctx.fillText('Hello, Apple Intelligence', cx, y + 74);

        } else if (brandIdx === 3) {
            // [3] Google - 구글 (클린 다크 차콜 패널, 구글 4색 G 로고, Google Gemini)
            ctx.fillStyle = '#202124';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#4285f4';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 4색 구글 심볼 링
            ctx.save();
            ctx.translate(cx - 24, y + 28);
            const r = 11;
            ctx.lineWidth = 4;
            // 파랑
            ctx.strokeStyle = '#4285f4';
            ctx.beginPath();
            ctx.arc(0, 0, r, -Math.PI * 0.25, Math.PI * 0.25);
            ctx.stroke();
            // 초록
            ctx.strokeStyle = '#34a853';
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI * 0.25, Math.PI * 0.75);
            ctx.stroke();
            // 노랑
            ctx.strokeStyle = '#fbbc05';
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI * 0.75, Math.PI * 1.25);
            ctx.stroke();
            // 빨강
            ctx.strokeStyle = '#ea4335';
            ctx.beginPath();
            ctx.arc(0, 0, r, Math.PI * 1.25, Math.PI * 1.75);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px "Product Sans", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Google', cx - 8, y + 33);

            // 검색창 & 제미나이 텍스트
            ctx.fillStyle = '#303134';
            ctx.fillRect(x + 10, y + 52, w - 20, 22);
            ctx.strokeStyle = '#5f6368';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(x + 10, y + 52, w - 20, 22);

            ctx.fillStyle = '#8ab4f8';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✨ Gemini AI Search', cx, y + 67);

        } else if (brandIdx === 4) {
            // [4] McDonald's - 맥도날드 (버건디 레드 배경, 황금 골든 아치 M, i'm lovin' it)
            ctx.fillStyle = '#8d021f';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffc72c';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 골든 아치 M 로고
            ctx.strokeStyle = '#ffc72c';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 20, y + 42);
            ctx.quadraticCurveTo(cx - 10, y + 10, cx - 1, y + 40);
            ctx.quadraticCurveTo(cx + 8, y + 10, cx + 19, y + 42);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic bold 12px sans-serif';
            ctx.fillText("i'm lovin' it", cx, y + 62);
            ctx.fillStyle = '#ffc72c';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('🍟 Big Mac & Fries 🍔', cx, y + 76);

        } else if (brandIdx === 5) {
            // [5] SONY PlayStation - 소니 (코발트 블루, SONY 볼드 로고, 네온 △ ◯ ✕ ▢)
            const sonyGrad = ctx.createLinearGradient(x, y, x, y + h);
            sonyGrad.addColorStop(0, '#003791');
            sonyGrad.addColorStop(1, '#001947');
            ctx.fillStyle = sonyGrad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Arial Black", sans-serif';
            ctx.fillText('SONY', cx, y + 30);

            // 플레이스테이션 4대 네온 심볼: 녹색 세모, 붉은 동그라미, 하늘 엑스, 분홍 네모
            const symbols = [
                { s: '▲', c: '#00f5d4' },
                { s: '●', c: '#ff0055' },
                { s: '✖', c: '#3a86ff' },
                { s: '■', c: '#ff007f' }
            ];
            symbols.forEach((sym, idx) => {
                ctx.fillStyle = sym.c;
                ctx.font = 'bold 13px sans-serif';
                ctx.fillText(sym.s, cx - 27 + idx * 18, y + 54);
            });

            ctx.fillStyle = '#ffea79';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('PlayStation 5 Pro', cx, y + 74);

        } else if (brandIdx === 6) {
            // [6] Disney - 디즈니 (로열 인디고, 디즈니 성 골든 스타라이트, THE LION KING BROADWAY)
            const disGrad = ctx.createLinearGradient(x, y, x, y + h);
            disGrad.addColorStop(0, '#10183b');
            disGrad.addColorStop(1, '#050714');
            ctx.fillStyle = disGrad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 전구 테두리 불빛
            for (let bx = x + 5; bx < x + w - 4; bx += 10) {
                ctx.fillStyle = ((bx + Math.floor(time * 6)) % 2 === 0) ? '#ffea79' : '#fff';
                ctx.fillRect(bx, y + 2, 4, 3);
                ctx.fillRect(bx, y + h - 5, 4, 3);
            }

            ctx.fillStyle = '#ffd166';
            ctx.font = 'bold 16px "Comic Neue", cursive';
            ctx.fillText('DISNEY+', cx, y + 32);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('THE LION KING', cx, y + 54);

            ctx.fillStyle = '#ffb703';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('★ ON BROADWAY ★', cx, y + 72);

        } else if (brandIdx === 7) {
            // [7] HYUNDAI - 현대자동차 (모던 딥 메탈릭 블루, 기울어진 타원 H, 아이오닉 전기차)
            const hyunGrad = ctx.createLinearGradient(x, y, x, y + h);
            hyunGrad.addColorStop(0, '#0a2240');
            hyunGrad.addColorStop(1, '#001026');
            ctx.fillStyle = hyunGrad;
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#00a8e8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 현대 타원 H 로고
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(cx, y + 26, 17, 10, -0.15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px "Arial", sans-serif';
            ctx.fillText('HYUNDAI', cx, y + 52);

            // 아이오닉 파라메트릭 픽셀 라이트 연출
            for (let px = 0; px < 7; px++) {
                ctx.fillStyle = (px + Math.floor(time * 5)) % 2 === 0 ? '#00f5d4' : '#0077b6';
                ctx.fillRect(cx - 28 + px * 8, y + 62, 6, 6);
            }
            ctx.fillStyle = '#90e0ef';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('IONIQ 6 EV', cx, y + 80);

        } else if (brandIdx === 8) {
            // [8] LG - LG전자 (딥 와인 레드, 윙크하는 스마일 로고, Life's Good, OLED evo)
            ctx.fillStyle = '#a50034';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // LG 원형 심볼
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx - 24, y + 32, 11, 0, Math.PI * 2);
            ctx.stroke();
            // L자 코
            ctx.beginPath();
            ctx.moveTo(cx - 25, y + 26);
            ctx.lineTo(cx - 25, y + 35);
            ctx.lineTo(cx - 20, y + 35);
            ctx.stroke();
            // 윙크 눈
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 28, y + 30, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Arial", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('LG', cx - 6, y + 38);

            ctx.fillStyle = '#ffccd5';
            ctx.font = 'italic bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("Life's Good", cx, y + 58);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('OLED evo 4K', cx, y + 74);

        } else {
            // [9] NIKE - 나이키 (하이 콘트라스트 매트 블랙, 일렉트릭 볼트 네온 스우시, JUST DO IT.)
            ctx.fillStyle = '#0f0f12';
            ctx.fillRect(x, y, w, h);
            ctx.strokeStyle = '#d4ff00';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y, w, h);

            // 나이키 스우시(Swoosh) 체크 로고
            ctx.fillStyle = '#d4ff00';
            ctx.beginPath();
            ctx.moveTo(cx - 28, y + 30);
            ctx.bezierCurveTo(cx - 10, y + 42, cx + 8, y + 40, cx + 28, y + 16);
            ctx.bezierCurveTo(cx + 8, y + 34, cx - 12, y + 32, cx - 28, y + 30);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px "Impact", sans-serif';
            ctx.fillText('NIKE', cx, y + 55);

            ctx.fillStyle = '#d4ff00';
            ctx.font = 'bold 11px "Impact", sans-serif';
            ctx.fillText('JUST DO IT.', cx, y + 73);
        }

        ctx.restore();
    }

    // 🌆 4단계 도시 (타임스퀘어 밤): 실제 글로벌 유명 기업들의 초호화 3D 네온 전광판 빌딩
    drawTimesSquareBuilding(ctx, side, variant, time) {
        ctx.save();
        const cityX = side * 75;
        const bW = 106;
        const bH = 240;
        const depth = -side * 22;

        // 1) 3D 빌딩 본체
        this.draw3DBox(ctx, cityX, 0, bW, bH, depth, -20, '#1a1c2e', '#2e3440', '#0b0c14');

        // 빌딩 유리창 격자
        ctx.fillStyle = 'rgba(255, 235, 150, 0.16)';
        for (let wy = -bH + 115; wy < -15; wy += 16) {
            for (let wx = cityX - bW * 0.44; wx < cityX + bW * 0.40; wx += 14) {
                if ((wx + wy) % 5 !== 0) {
                    ctx.fillRect(wx, wy, 8, 9);
                }
            }
        }

        // 옥상 통신 안테나 & 점멸하는 붉은 항공 경고등
        ctx.strokeStyle = '#d8dee9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cityX, -bH);
        ctx.lineTo(cityX, -bH - 35);
        ctx.stroke();
        ctx.fillStyle = Math.sin(time * 6) > 0 ? '#ff0055' : '#880022';
        ctx.beginPath();
        ctx.arc(cityX, -bH - 35, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 2) 실제 기업 초대형 LED 스크린 전광판 (Real Corporate Mega Display)
        const brandIdx = (variant + (side < 0 ? 0 : 5)) % 10;
        const screenY = -bH + 14;
        const screenW = bW - 14;
        const screenH = 86;
        const screenX = cityX - screenW * 0.5;

        this.drawRealCorporateBillboard(ctx, screenX, screenY, screenW, screenH, brandIdx, time);

        // 3) 스크린 하단 실시간 증권/뉴스 티커 테이프 (Scrolling Stock Ticker)
        const tickerY = screenY + screenH + 6;
        const tickerH = 16;
        ctx.fillStyle = '#05070e';
        ctx.fillRect(screenX, tickerY, screenW, tickerH);
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX, tickerY, screenW, tickerH);

        const tickers = [
            '▲ SAMSUNG 78,500 ▲',
            '★ COCA-COLA NYC ★',
            '▲ APPLE $232.50 ▲',
            '◆ GOOGLE GEMINI ◆',
            '▲ NASDAQ +1.8% ▲',
            '★ HYUNDAI IONIQ ★',
            '▲ SONY PS5 PRO ▲',
            '★ DISNEY BROADWAY ★'
        ];
        const tickerText = tickers[brandIdx % tickers.length];
        const tickerOffset = (time * 30) % 60;
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX + 2, tickerY, screenW - 4, tickerH);
        ctx.clip();
        ctx.fillStyle = '#00f5d4';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(tickerText, screenX + 8 - tickerOffset, tickerY + 12);
        ctx.fillText(tickerText, screenX + 8 - tickerOffset + 140, tickerY + 12);
        ctx.restore();

        // 4) 1층 상가 앞 환한 뉴욕 가로등 (NYC Street Lamp)
        const lampX = cityX - side * (bW * 0.5 + 16);
        ctx.strokeStyle = '#4c566a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(lampX, 0);
        ctx.lineTo(lampX, -95);
        ctx.quadraticCurveTo(lampX, -112, lampX + side * 14, -112);
        ctx.stroke();
        // 가로등 불빛 갓 & 눈부신 황금빛 램프
        ctx.fillStyle = '#ffea79';
        ctx.beginPath();
        ctx.arc(lampX + side * 14, -108, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 234, 121, 0.28)';
        ctx.beginPath();
        ctx.arc(lampX + side * 14, -108, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 양옆 스테이지별 동물 & 오브젝트 디테일 (트랙에서 멀리 떨어뜨리고 동물 개체수 40% 이상 절감 + 비키니 시티 해저 디테일!)
    drawStageSideProp(ctx, x, y, scale, side, variant, time, showAnimal = true) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';

        const bob = Math.sin(time * 5 + variant) * 6;
        // 트랙 안쪽을 바라보되, 위치(animalX)는 트랙 바깥쪽으로 충분히 떨어뜨림!
        const faceDir = side < 0 ? 1 : -1;
        const animalX = side * 38;

        if (this.stage === 1) {
            // 🌲 1단계 숲: 겹겹이 우거진 고품격 나무 군락(외곽) + 선택적 숲속 동물(트랙과 거리를 둔 외곽)
            this.drawLushForestTreeCluster(ctx, side, variant, time);

            if (showAnimal) {
                const animalNames = ['🐿️ 다람쥐', '🐇 산토끼', '🦌 꽃사슴', '🦊 붉은여우', '🦉 숲부엉이'];
                this.drawRealForestAnimal(ctx, animalX, -8 + bob * 0.5, variant % 5, time, faceDir);

                ctx.font = 'bold 21px "Gaegu", sans-serif';
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#1a1612';
                ctx.strokeText(animalNames[variant % 5], animalX, 32);
                ctx.fillStyle = '#fffcf5';
                ctx.fillText(animalNames[variant % 5], animalX, 32);
            }

        } else if (this.stage === 2) {
            // 🌵 2단계 사막: 고대 대스핑크스 석상 & 거대 선인장 교대 배치!
            if (variant % 2 === 0) {
                this.drawSphinxMonument(ctx, side, variant, time);
            } else {
                const cactX = side * 94;
                const cactGrad = ctx.createLinearGradient(cactX - 20, -155, cactX + 20, 0);
                cactGrad.addColorStop(0, '#74a862');
                cactGrad.addColorStop(1, '#3a5a40');
                ctx.fillStyle = cactGrad;
                ctx.beginPath();
                ctx.roundRect(cactX - 16, -155, 32, 155, 14);
                ctx.roundRect(cactX - 48, -115, 32, 22, 10);
                ctx.roundRect(cactX - 48, -148, 20, 48, 10);
                ctx.roundRect(cactX + 16, -100, 32, 22, 10);
                ctx.roundRect(cactX + 28, -138, 20, 52, 10);
                ctx.fill();
                ctx.stroke();
            }

            if (showAnimal) {
                const desertLabels = ['🦂 황제전갈', '🦊 사막여우', '🐪 단봉낙타', '🐫 쌍봉낙타', '🦎 목도리도마뱀'];
                this.drawRealDesertAnimal(ctx, animalX, -6 + bob * 0.4, variant % 5, time, faceDir);

                ctx.font = 'bold 21px "Gaegu", sans-serif';
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#1a1612';
                ctx.strokeText(desertLabels[variant % 5], animalX, 34);
                ctx.fillStyle = '#fff3b0';
                ctx.fillText(desertLabels[variant % 5], animalX, 34);
            }

        } else if (this.stage === 3) {
            // 🍍 3단계 비키니 해저 시티: 스폰지밥 스타일 구멍 뚫린 튜브 산호초 & 해저 꽃 + 선택적 해양 동물!
            const coralX = side * 94;
            const tubeColors = [
                { main: '#ff6b9d', rim: '#ff477e', hole: '#a4133c' },
                { main: '#ffd166', rim: '#ffb703', hole: '#c87d00' },
                { main: '#b5179e', rim: '#7209b7', hole: '#3c096c' }
            ];
            const tc = tubeColors[variant % tubeColors.length];

            // 스폰지밥 특유의 원통형 튜브 산호 3기둥
            const tubes = [
                { dx: -26, w: 24, h: 105 },
                { dx: 0, w: 30, h: 148 },
                { dx: 28, w: 22, h: 92 }
            ];
            for (const tb of tubes) {
                ctx.fillStyle = tc.main;
                ctx.beginPath();
                ctx.roundRect(coralX + tb.dx - tb.w / 2, -tb.h, tb.w, tb.h, 10);
                ctx.fill();
                ctx.stroke();

                // 튜브 상단 구멍 입구
                ctx.fillStyle = tc.rim;
                ctx.beginPath();
                ctx.ellipse(coralX + tb.dx, -tb.h, tb.w * 0.62, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = tc.hole;
                ctx.beginPath();
                ctx.ellipse(coralX + tb.dx, -tb.h, tb.w * 0.35, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // 스폰지 구멍 무늬
                ctx.fillStyle = tc.hole;
                ctx.beginPath();
                ctx.arc(coralX + tb.dx - 4, -tb.h * 0.65, 3.5, 0, Math.PI * 2);
                ctx.arc(coralX + tb.dx + 5, -tb.h * 0.42, 4.2, 0, Math.PI * 2);
                ctx.arc(coralX + tb.dx - 2, -tb.h * 0.22, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (showAnimal) {
                const seaLabels = ['🦈 백상아리', '🐠 황제열대어', '🐋 대왕고래', '🐙 대왕문어', '🐢 푸른바다거북'];
                this.drawRealSeaCreature(ctx, animalX, -64 + bob * 1.4, 1.0, variant % 5, time, faceDir);

                ctx.font = 'bold 21px "Gaegu", sans-serif';
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#1a1612';
                ctx.strokeText(seaLabels[variant % 5], animalX, 18);
                ctx.fillStyle = '#ffea00';
                ctx.fillText(seaLabels[variant % 5], animalX, 18);
            } else {
                // 동물이 없는 쪽에는 귀여운 분홍 해파리 1마리가 둥둥!
                this.drawBikiniJellyfish(ctx, animalX, -85, 0.78, time + variant);
            }

        } else if (this.stage === 4) {
            // 🌆 4단계 도시 (타임스퀘어 밤): 실제 유명 글로벌 기업들의 화려한 3D 전광판 빌딩
            this.drawTimesSquareBuilding(ctx, side, variant, time);

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 깨진 3D 디지털 기둥 & 에러 홀로그램
            const glitchShift = side * 42 + (Math.random() - 0.5) * 18;
            this.draw3DBox(
                ctx,
                glitchShift,
                0,
                60,
                195,
                -side * 14,
                -14,
                variant % 2 === 0 ? '#ff007f' : '#00f5d4',
                '#7209b7',
                '#240046'
            );
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 22px monospace';
            ctx.fillText('ERR_404', glitchShift, -110);
        }

        ctx.restore();
    }

    renderGlitchOverlay(ctx, width, height, time) {
        ctx.save();
        for (let i = 0; i < 6; i++) {
            if (Math.random() < 0.45) {
                const gy = Math.random() * height;
                const gh = 4 + Math.random() * 18;
                ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 245, 212, 0.18)' : 'rgba(255, 0, 127, 0.18)';
                ctx.fillRect(0, gy, width, gh);
            }
        }
        ctx.restore();
    }

    drawSchoolEndingBuilding(ctx, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        ctx.fillStyle = '#f8edeb';
        ctx.fillRect(-260, -180, 520, 200);
        ctx.strokeRect(-260, -180, 520, 200);

        ctx.fillStyle = '#d64531';
        ctx.beginPath();
        ctx.moveTo(-280, -180);
        ctx.lineTo(0, -255);
        ctx.lineTo(280, -180);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fffcf5';
        ctx.beginPath();
        ctx.arc(0, -210, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a1612';
        ctx.font = 'bold 26px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏫 흥덕초등학교 (6학년 교실)', 0, -142);

        ctx.fillStyle = '#90e0ef';
        [-190, -120, 120, 190].forEach(wx => {
            ctx.fillRect(wx - 24, -110, 48, 52);
            ctx.strokeRect(wx - 24, -110, 48, 52);
        });

        ctx.fillStyle = '#8d5b3c';
        ctx.beginPath();
        ctx.roundRect(-48, -85, 96, 105, [24, 24, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    renderEntities(ctx, width, height, time, zMin = 0, zMax = 1.2) {
        const renderList = [];

        this.items.forEach(item => {
            if (!item.collected && item.z >= zMin && item.z < zMax) {
                renderList.push({ kind: 'item', obj: item, z: item.z });
            }
        });

        this.obstacles.forEach(obs => {
            if (obs.z >= zMin && obs.z < zMax) {
                renderList.push({ kind: 'obstacle', obj: obs, z: obs.z });
            }
        });

        renderList.sort((a, b) => a.z - b.z);

        renderList.forEach(entry => {
            const p = this.project(entry.z, entry.obj.lane, width, height);
            if (entry.kind === 'item') {
                this.drawItem(ctx, entry.obj, p, time);
            } else {
                const obs = entry.obj;
                // 🎯 정사각형 바닥 트랙의 한 칸(타일)과 100% 동일한 바닥 히트박스 표시!
                if (obs.type === 'ramp') {
                    this.drawTrackCellHitbox(ctx, obs.z, obs.lane, width, height, 'rgba(6, 214, 160, 0.34)', '#06d6a0', 3.6);
                } else {
                    const isNearHitZone = obs.z > 0.78 && obs.z < 1.04;
                    this.drawTrackCellHitbox(
                        ctx,
                        obs.z,
                        obs.lane,
                        width,
                        height,
                        isNearHitZone ? 'rgba(255, 0, 85, 0.42)' : 'rgba(230, 57, 70, 0.26)',
                        isNearHitZone ? '#ff0055' : '#e63946',
                        isNearHitZone ? 4.5 : 3.2
                    );
                }
                this.drawObstacle(ctx, obs, p, time);
            }
        });

        // 🛣️ 게임 시작 갈림길 3D 입체 간판 렌더링 (Z 깊이 소팅)
        if (this.roadSignsZ >= zMin && this.roadSignsZ < zMax) {
            this.renderRoadForkSignboards(ctx, width, height, time);
        }
    }

    renderRoadForkSignboards(ctx, width, height, time) {
        if (!this.roadSignsZ || this.roadSignsZ <= 0.05 || this.roadSignsZ > 1.35) return;
        const z = this.roadSignsZ;
        const pCenter = this.project(z, 0, width, height);
        const pLeft = this.project(z, -1.3, width, height);
        const pRight = this.project(z, 1.3, width, height);
        const pPillarL = this.project(z, -2.75, width, height);
        const pPillarR = this.project(z, 2.75, width, height);

        ctx.save();
        // 1) 양쪽 고속도로 대형 기둥
        const pillarH = 195 * pCenter.scale;
        const pillarW = 20 * pCenter.scale;
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5 * pCenter.scale;
        ctx.lineJoin = 'round';

        // 좌/우 지지 기둥
        [pPillarL, pPillarR].forEach(pp => {
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(pp.x - pillarW * 0.5, pp.y - pillarH, pillarW, pillarH, 4 * pCenter.scale);
            else ctx.rect(pp.x - pillarW * 0.5, pp.y - pillarH, pillarW, pillarH);
            ctx.fill(); ctx.stroke();
        });

        // 상단 가로 크로스 트러스
        const crossY = pPillarL.y - pillarH + 12 * pCenter.scale;
        const crossW = pPillarR.x - pPillarL.x;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pPillarL.x, crossY, crossW, 18 * pCenter.scale, 4 * pCenter.scale);
        else ctx.rect(pPillarL.x, crossY, crossW, 18 * pCenter.scale);
        ctx.fill(); ctx.stroke();

        const signW = 205 * pCenter.scale;
        const signH = 94 * pCenter.scale;
        const signY = crossY + 22 * pCenter.scale;

        // 2) 🛡️ [1번 도로 간판]: 안정적인 도로
        ctx.save();
        ctx.translate(pLeft.x, signY);
        const sign1Grad = ctx.createLinearGradient(0, 0, 0, signH);
        sign1Grad.addColorStop(0, '#065f46');
        sign1Grad.addColorStop(1, '#047857');
        ctx.fillStyle = sign1Grad;
        ctx.strokeStyle = this.selectedRoute === 1 ? '#ffbe0b' : '#ffffff';
        ctx.lineWidth = (this.selectedRoute === 1 ? 5 : 3.5) * pCenter.scale;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-signW * 0.5, 0, signW, signH, 12 * pCenter.scale);
        else ctx.rect(-signW * 0.5, 0, signW, signH);
        ctx.fill(); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffbe0b';
        ctx.font = `900 ${Math.max(10, Math.round(15 * pCenter.scale))}px sans-serif`;
        ctx.fillText('[ 1번 도로 (키: 1) ]', 0, 20 * pCenter.scale);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.max(12, Math.round(18 * pCenter.scale))}px "Gaegu", sans-serif`;
        ctx.fillText('🛡️ 안정적인 도로', 0, 46 * pCenter.scale);

        ctx.fillStyle = '#a7f3d0';
        ctx.font = `700 ${Math.max(9, Math.round(12 * pCenter.scale))}px sans-serif`;
        ctx.fillText('기본 속도 | 안전 주행', 0, 72 * pCenter.scale);
        ctx.restore();

        // 3) ⚡ [2번 도로 간판]: 위험하지만 보상이 강한 도로
        ctx.save();
        ctx.translate(pRight.x, signY);
        const sign2Grad = ctx.createLinearGradient(0, 0, 0, signH);
        sign2Grad.addColorStop(0, '#9f1239');
        sign2Grad.addColorStop(1, '#e11d48');
        ctx.fillStyle = sign2Grad;
        ctx.strokeStyle = this.selectedRoute === 2 ? '#ffbe0b' : '#ffffff';
        ctx.lineWidth = (this.selectedRoute === 2 ? 5 : 3.5) * pCenter.scale;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-signW * 0.5, 0, signW, signH, 12 * pCenter.scale);
        else ctx.rect(-signW * 0.5, 0, signW, signH);
        ctx.fill(); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffea79';
        ctx.font = `900 ${Math.max(10, Math.round(14 * pCenter.scale))}px sans-serif`;
        ctx.fillText('[ 2번 도로 (키: 2) ]', 0, 20 * pCenter.scale);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.max(11, Math.round(16 * pCenter.scale))}px "Gaegu", sans-serif`;
        ctx.fillText('⚡ 위험하지만 보상이 강한 도로', 0, 46 * pCenter.scale);

        ctx.fillStyle = '#fecdd3';
        ctx.font = `700 ${Math.max(9, Math.round(12 * pCenter.scale))}px sans-serif`;
        ctx.fillText('속도+50% & 장애물+20% | 🔥 모든 점수 2배!!', 0, 72 * pCenter.scale);
        ctx.restore();

        // 중앙 분기 화살표
        ctx.save();
        ctx.translate(pCenter.x, signY + signH * 0.5);
        ctx.fillStyle = '#ffbe0b';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3 * pCenter.scale;
        ctx.font = `900 ${Math.max(11, Math.round(17 * pCenter.scale))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('◀ [1]   [2] ▶', 0, 0);
        ctx.fillText('◀ [1]   [2] ▶', 0, 0);
        ctx.restore();

        ctx.restore();
    }

    drawItem(ctx, item, p, time) {
        const bounce = Math.abs(Math.sin(time * 6 + item.z * 12)) * 18 * p.scale;
        const rampOffset = item.onRamp ? 78 * p.scale : 0;

        // 1) 바닥 3D 입체 그림자
        ctx.save();
        ctx.translate(p.x, p.y - rampOffset);
        ctx.scale(p.scale, p.scale);
        ctx.fillStyle = 'rgba(20, 16, 12, 0.30)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2) 3D Y축 회전 애니메이션 (아이템이 3D 공간에서 빙글빙글 회전하며 두께감이 보임!)
        const spinAngle = time * 4.2 + item.z * 10;
        const spinScaleX = Math.max(0.28, Math.abs(Math.cos(spinAngle)));
        const thickness = 11 * Math.sin(spinAngle);

        ctx.save();
        ctx.translate(p.x, p.y - 34 * p.scale - bounce - rampOffset);
        ctx.scale(p.scale, p.scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (item.type === 'coin') {
            // ✨ 고퀄리티 3D 황금 코인 (빛나는 골드 림 + 젤리 글로스 + 양각 황금별)
            const coinGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 42);
            coinGlow.addColorStop(0, 'rgba(255, 230, 100, 0.45)');
            coinGlow.addColorStop(1, 'rgba(255, 230, 100, 0)');
            ctx.fillStyle = coinGlow;
            ctx.beginPath();
            ctx.arc(0, 0, 42, 0, Math.PI * 2);
            ctx.fill();

            // 옆면 두께 림
            ctx.fillStyle = '#b57c1e';
            ctx.beginPath();
            ctx.ellipse(thickness, 0, 26 * spinScaleX, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 정면 골드 메달
            const coinGrad = ctx.createLinearGradient(-26 * spinScaleX, -34, 26 * spinScaleX, 34);
            coinGrad.addColorStop(0, '#fff3a3');
            coinGrad.addColorStop(0.45, '#ffd13b');
            coinGrad.addColorStop(1, '#e69500');
            ctx.fillStyle = coinGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 26 * spinScaleX, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 내부 3D 엠보싱 링
            ctx.strokeStyle = '#d48806';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.ellipse(0, 0, 18 * spinScaleX, 24, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 중앙 반짝이는 양각 별
            if (Math.abs(spinScaleX) > 0.35) {
                ctx.fillStyle = '#fff9db';
                ctx.font = `bold ${Math.round(20 * Math.abs(spinScaleX))}px sans-serif`;
                ctx.fillText('★', 0, 1);
            }

            // 상단 반원형 젤리 광택 하이라이트
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, -12, 18 * spinScaleX, 10, 0, Math.PI, Math.PI * 2);
            ctx.fill();

        } else if (item.type === 'banana') {
            // 🍌 통통하고 동글동글한 고퀄리티 황금 바나나 크리스탈 큐브
            this.draw3DBox(ctx, 0, 24, 56, 56, 14, -14, '#ffea79', '#fff8cc', '#d4a62a');

            // 바나나 본체 (통통하고 둥근 황금 곡선)
            const banGrad = ctx.createLinearGradient(-16, -14, 16, 14);
            banGrad.addColorStop(0, '#fff066');
            banGrad.addColorStop(0.65, '#ffcc00');
            banGrad.addColorStop(1, '#ff9900');
            ctx.fillStyle = banGrad;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;

            ctx.beginPath();
            ctx.moveTo(-16, 12);
            ctx.quadraticCurveTo(-18, -14, 12, -18);
            ctx.quadraticCurveTo(18, -16, 18, -10);
            ctx.quadraticCurveTo(-4, -6, -8, 14);
            ctx.quadraticCurveTo(-14, 16, -16, 12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 꼭지 초록 포인트
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.arc(16, -15, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // 반짝이는 하이라이트
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-8, -4, 4, 10, 0.4, 0, Math.PI * 2);
            ctx.fill();

        } else if (item.type === 'shield') {
            // 3D 입체 방패 크리스탈 큐브 (직접 그린 기사 문장 방패 벡터 아이콘)
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 56);
            glow.addColorStop(0, 'rgba(0, 245, 212, 0.85)');
            glow.addColorStop(1, 'rgba(0, 245, 212, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 56, 0, Math.PI * 2);
            ctx.fill();

            this.draw3DBox(ctx, 0, 26, 56, 56, 15, -15, '#00b4d8', '#90e0ef', '#0077b6');
            // 방패 문장 직접 그리기
            ctx.fillStyle = '#caf0f8';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(15, -12);
            ctx.quadraticCurveTo(15, 8, 0, 16);
            ctx.quadraticCurveTo(-15, 8, -15, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.strokeText('무적 방패(1.8초)', 0, -52);
            ctx.fillText('무적 방패(1.8초)', 0, -52);

        } else if (item.type === 'super_jump') {
            // 3D 입체 슈퍼점프 부스터 큐브 (직접 그린 화살표 날개 부스터 벡터 아이콘)
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 58);
            glow.addColorStop(0, 'rgba(0, 245, 212, 0.9)');
            glow.addColorStop(1, 'rgba(0, 187, 249, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 58, 0, Math.PI * 2);
            ctx.fill();

            this.draw3DBox(ctx, 0, 26, 56, 56, 15, -15, '#06d6a0', '#80ffdb', '#048a64');
            // 상향 부스터 화살표 직접 그리기
            ctx.fillStyle = '#ffea79';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(16, -2);
            ctx.lineTo(7, -2);
            ctx.lineTo(7, 14);
            ctx.lineTo(-7, 14);
            ctx.lineTo(-7, -2);
            ctx.lineTo(-16, -2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.strokeText('슈퍼점프(2.5초)', 0, -52);
            ctx.fillText('슈퍼점프(2.5초)', 0, -52);

        } else if (item.type === 'wukong') {
            // 3D 입체 손오공 진화 보물상자 큐브 (직접 그린 황금 긴고아 왕관 벡터 아이콘)
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
            glow.addColorStop(0, 'rgba(255, 190, 11, 0.95)');
            glow.addColorStop(1, 'rgba(251, 86, 7, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 64, 0, Math.PI * 2);
            ctx.fill();

            this.draw3DBox(ctx, 0, 28, 60, 60, 16, -16, '#ffbe0b', '#ffea79', '#d48c00');
            ctx.fillStyle = '#e63946';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(-16, 10);
            ctx.lineTo(-18, -10);
            ctx.lineTo(-7, 0);
            ctx.lineTo(0, -14);
            ctx.lineTo(7, 0);
            ctx.lineTo(18, -10);
            ctx.lineTo(16, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.strokeText('손오공 진화(체력UP)!', 0, -54);
            ctx.fillText('손오공 진화(체력UP)!', 0, -54);

        } else if (item.type === 'laser_gun') {
            // 🔫 신규 특별 아이템: 3D 플라즈마 레이저총 큐브 (4초 동안 유저 레인 기물 자동 파괴!)
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
            glow.addColorStop(0, 'rgba(255, 0, 110, 0.92)');
            glow.addColorStop(1, 'rgba(58, 134, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 64, 0, Math.PI * 2);
            ctx.fill();

            this.draw3DBox(ctx, 0, 28, 60, 60, 16, -16, '#ff006e', '#ff758f', '#8338ec');

            // 직접 그린 3D SF 레이저총 총신 & 손잡이 아이콘
            ctx.fillStyle = '#00f5d4';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            ctx.fillRect(-16, -10, 26, 11);
            ctx.strokeRect(-16, -10, 26, 11);
            ctx.fillStyle = '#ffbe0b';
            ctx.fillRect(10, -8, 10, 7);
            ctx.strokeRect(10, -8, 10, 7);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-14, 1);
            ctx.lineTo(-6, 1);
            ctx.lineTo(-10, 14);
            ctx.lineTo(-18, 14);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.strokeText('🔫 레이저총(4초 레인파괴)!', 0, -54);
            ctx.fillText('🔫 레이저총(4초 레인파괴)!', 0, -54);
        }

        ctx.restore();
    }

    drawObstacle(ctx, obs, p, time) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';

        // 레인 위치에 따른 3D 소실점 방향 입체 두께 오프셋
        const dx = -obs.lane * 18 + 14;
        const dy = -20;

        if (obs.type === 'climb_truck') {
            // 🚛 [톰 골드런 스타일 신규 등반 기물]: 멈춰있는 3D 대형 컨테이너 트럭/투어버스 (보닛을 밟고 지붕 위로 올라가 달릴 수 있음!)
            // 1) 바닥 3D 그림자 & 대형 트럭 타이어 4개
            ctx.fillStyle = 'rgba(20, 16, 12, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 82, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#212529';
            [[-68, -28], [46, -28]].forEach(([wx, wy]) => {
                ctx.fillRect(wx, wy, 22, 30);
                ctx.strokeRect(wx, wy, 22, 30);
            });

            // 2) 뒤쪽 대형 3D 컨테이너 화물칸 지붕 & 몸체 (위로 올라가 달리는 지붕 데크!)
            const truckColors = {
                1: { front: '#2a9d8f', top: '#52b788', side: '#1d6f65', label: 'SAFARI TRUCK' },
                2: { front: '#e09f3e', top: '#f4e285', side: '#9e6b1e', label: 'DESERT CARGO' },
                3: { front: '#0096c7', top: '#90e0ef', side: '#023e8a', label: 'SUBMARINE BUS' },
                4: { front: '#e63946', top: '#ff758f', side: '#9b2226', label: 'NYC TOUR BUS' },
                5: { front: '#7209b7', top: '#00f5d4', side: '#3a0ca3', label: 'CYBER TRUCK' }
            };
            const tc = truckColors[this.stage] || truckColors[1];

            // 뒤쪽 높은 화물칸 컨테이너 3D 박스
            this.draw3DBox(ctx, 0, -14, 136, 96, dx * 1.4, dy * 1.5, tc.front, tc.top, tc.side);

            // 앞쪽 낮게 경사진 트럭 보닛/운전석 (발판 역할!)
            this.draw3DBox(ctx, 0, -10, 126, 52, dx * 0.7, dy * 0.7, '#ffbe0b', '#fff3b0', '#d48c00');

            // 운전석 전면 유리창 & 와이퍼
            ctx.fillStyle = '#caf0f8';
            ctx.fillRect(-48, -98, 96, 30);
            ctx.strokeRect(-48, -98, 96, 30);
            this.drawHatching(ctx, -40, -92, 30, -92, 4, 14, -0.7);

            // 라디에이터 그릴 & 헤드라이트 2개
            ctx.fillStyle = '#343a40';
            ctx.fillRect(-28, -44, 56, 22);
            ctx.strokeRect(-28, -44, 56, 22);
            for (let gx = -20; gx <= 20; gx += 10) {
                ctx.beginPath();
                ctx.moveTo(gx, -44); ctx.lineTo(gx, -22);
                ctx.stroke();
            }
            ctx.fillStyle = '#fffcf2';
            [-46, 46].forEach(hx => {
                ctx.beginPath();
                ctx.arc(hx, -34, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 지붕 위 등반 화살표 마크
            ctx.fillStyle = '#ffea79';
            ctx.beginPath();
            ctx.moveTo(0, -118);
            ctx.lineTo(-26, -98);
            ctx.lineTo(26, -98);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🚛 멈춘 트럭 위로 올라타!', 0, -134);
            ctx.fillText('🚛 멈춘 트럭 위로 올라타!', 0, -134);

        } else if (obs.type === 'ramp') {
            // 🪜 3D 입체 웨지(Wedge) 등반 경사로 플랫폼 (고디테일 미끄럼 방지 패드 & 네온 화살표)
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(72, 0);
            ctx.lineTo(56, -92);
            ctx.lineTo(56 + dx, -92 + dy);
            ctx.lineTo(72 + dx, dy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#90e0ef';
            ctx.beginPath();
            ctx.moveTo(-56, -92);
            ctx.lineTo(-56 + dx, -92 + dy);
            ctx.lineTo(56 + dx, -92 + dy);
            ctx.lineTo(56, -92);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#4ea8de';
            ctx.beginPath();
            ctx.moveTo(-72, 0);
            ctx.lineTo(-56, -92);
            ctx.lineTo(56, -92);
            ctx.lineTo(72, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2단 부스트 쉐브론 화살표
            [-48, -22].forEach(ay => {
                ctx.fillStyle = '#ffd166';
                ctx.beginPath();
                ctx.moveTo(0, ay - 26);
                ctx.lineTo(-32, ay);
                ctx.lineTo(32, ay);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('⏫ 경사로 위로 질주!', 0, -112);
            ctx.fillText('⏫ 경사로 위로 질주!', 0, -112);

        } else if (obs.type === 'rolling_stone') {
            // 🪨 [1단계 숲 전용]: 크랙과 이끼, 펜 해칭 음영이 살아있는 초고퀄리티 3D 거대 바위!
            ctx.fillStyle = 'rgba(26, 22, 18, 0.38)';
            ctx.beginPath();
            ctx.ellipse(0, 8, 74, 22, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(0, -62);
            ctx.rotate(obs.rot || time * 9);

            const rockPts = [
                [-58, -18], [-38, -54], [-6, -64], [32, -56], [58, -28],
                [64, 12], [44, 48], [8, 62], [-34, 54], [-62, 22]
            ];
            const rockGrad = ctx.createRadialGradient(-20, -24, 8, 0, 0, 70);
            rockGrad.addColorStop(0, '#d6d2c4');
            rockGrad.addColorStop(0.5, '#6b705c');
            rockGrad.addColorStop(1, '#2b2d26');
            ctx.fillStyle = rockGrad;

            ctx.beginPath();
            rockPts.forEach(([rx, ry], idx) => {
                if (idx === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
            ctx.beginPath();
            ctx.moveTo(-38, -54);
            ctx.lineTo(-6, -64);
            ctx.lineTo(14, -18);
            ctx.lineTo(-32, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            ctx.beginPath();
            ctx.moveTo(14, -18);
            ctx.lineTo(64, 12);
            ctx.lineTo(44, 48);
            ctx.lineTo(-10, 35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 바위 표면 펜 해칭 & 크랙 디테일
            this.drawHatching(ctx, -10, 22, 34, 22, 6, 11, -0.6);

            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.arc(-22, -36, 11, 0, Math.PI * 2);
            ctx.arc(26, 22, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.restore();

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🪨 굴러오는 바위!', 0, -134);
            ctx.fillText('🪨 굴러오는 바위!', 0, -134);

        } else if (obs.type === 'desert_scorpion') {
            // 🦂 [2단계 사막 전용]: 3D 입체 갑각류 쉐이딩과 톱니 집게발을 가진 거대 사막 전갈!
            const scurry = Math.sin(time * 18) * 6;
            ctx.fillStyle = 'rgba(26, 22, 18, 0.32)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 72, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#6f1d1b';
            ctx.lineWidth = 5;
            [-1, 1].forEach(side => {
                for (let l = 0; l < 4; l++) {
                    const legY = -18 - l * 10;
                    const legWave = Math.sin(time * 22 + l) * 8;
                    ctx.beginPath();
                    ctx.moveTo(side * 25, legY);
                    ctx.lineTo(side * 62, legY - 12 + legWave);
                    ctx.lineTo(side * 76, legY + 10 + legWave);
                    ctx.stroke();
                }
            });

            const bodyGrad = ctx.createRadialGradient(-12, -44, 6, 0, -34, 46);
            bodyGrad.addColorStop(0, '#d4a373');
            bodyGrad.addColorStop(0.5, '#99582a');
            bodyGrad.addColorStop(1, '#432818');
            ctx.fillStyle = bodyGrad;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, -34, 44, 30, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -26, -34, 26, -34, 6, 9, -0.5);

            for (let s = 0; s < 4; s++) {
                ctx.fillStyle = s % 2 === 0 ? '#bb3e03' : '#9b2226';
                ctx.beginPath();
                ctx.arc(Math.sin(time * 10) * 6, -65 - s * 18, 15 - s * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.moveTo(0, -138);
            ctx.lineTo(-14, -118);
            ctx.lineTo(14, -118);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            [-1, 1].forEach(side => {
                ctx.fillStyle = '#ae2012';
                ctx.beginPath();
                ctx.arc(side * (48 + scurry * 0.4), -22, 23, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🦂 독침 전갈 습격!', 0, -152);
            ctx.fillText('🦂 독침 전갈 습격!', 0, -152);

        } else if (obs.type === 'undersea_shark') {
            // 🦈 [3단계 해저 전용]: 3D 입체 어뢰형 몸통의 백상아리 상어!
            const swimX = Math.sin(time * 12) * 8;
            ctx.save();
            ctx.translate(swimX, 0);

            ctx.strokeStyle = '#90e0ef';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 76, 20, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#1d3557';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-18, -88);
            ctx.lineTo(0, -144);
            ctx.lineTo(22, -88);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.moveTo(side * 44, -42);
                ctx.lineTo(side * 86, -18);
                ctx.lineTo(side * 48, -22);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            const sharkGrad = ctx.createRadialGradient(-16, -68, 10, 0, -52, 58);
            sharkGrad.addColorStop(0, '#a8dadc');
            sharkGrad.addColorStop(0.45, '#457b9d');
            sharkGrad.addColorStop(1, '#1d3557');
            ctx.fillStyle = sharkGrad;
            ctx.beginPath();
            ctx.arc(0, -52, 56, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f1faee';
            ctx.beginPath();
            ctx.arc(0, -38, 42, 0, Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#a8201a';
            ctx.beginPath();
            ctx.ellipse(0, -42, 32, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            for (let t = -22; t <= 22; t += 11) {
                ctx.beginPath();
                ctx.moveTo(t - 5, -54);
                ctx.lineTo(t, -42);
                ctx.lineTo(t + 5, -54);
                ctx.fill();
            }

            ctx.fillStyle = '#ffbe0b';
            [-26, 26].forEach(ex => {
                ctx.beginPath();
                ctx.arc(ex, -70, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.restore();

            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🦈 돌진하는 백상아리!', 0, -152);
            ctx.fillText('🦈 돌진하는 백상아리!', 0, -152);

        } else if (obs.type === 'city_car') {
            // 🚕 [4단계 도시 전용]: 체크무늬 데칼과 3D 입체 차체를 갖춘 뉴욕 타임스퀘어 택시!
            ctx.fillStyle = 'rgba(255, 243, 176, 0.38)';
            ctx.beginPath();
            ctx.moveTo(-42, -20);
            ctx.lineTo(-85, 35);
            ctx.lineTo(85, 35);
            ctx.lineTo(42, -20);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#212529';
            ctx.fillRect(-68, -28, 22, 28);
            ctx.strokeRect(-68, -28, 22, 28);
            ctx.fillRect(46, -28, 22, 28);
            ctx.strokeRect(46, -28, 22, 28);

            this.draw3DBox(ctx, 0, -16, 134, 48, dx, dy * 0.8, '#ffbe0b', '#ffea79', '#d48c00');
            this.draw3DBox(ctx, 0, -64, 102, 44, dx * 0.85, dy * 0.7, '#ffbe0b', '#fff3b0', '#c97a00');

            // 뉴욕 택시 체크무늬 띠
            for (let cx = -56; cx < 56; cx += 16) {
                ctx.fillStyle = (cx / 16) % 2 === 0 ? '#1a1612' : '#ffffff';
                ctx.fillRect(cx, -60, 16, 6);
            }

            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(-42, -102, 84, 32);
            ctx.strokeRect(-42, -102, 84, 32);
            this.drawHatching(ctx, -34, -95, 24, -95, 4, 14, -0.7);

            this.draw3DBox(ctx, 0, -108, 50, 16, dx * 0.4, dy * 0.4, '#ffffff', '#e9ecef', '#adb5bd');
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('TAXI', 0, -114);

            ctx.fillStyle = '#fff3b0';
            [-44, 44].forEach(hx => {
                ctx.beginPath();
                ctx.arc(hx, -40, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.fillStyle = '#343a40';
            ctx.fillRect(-22, -48, 44, 18);
            ctx.strokeRect(-22, -48, 44, 18);

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🚕 달려오는 3D 자동차!', 0, -142);
            ctx.fillText('🚕 달려오는 3D 자동차!', 0, -142);

        } else if (obs.type === 'glitch_hazard') {
            // ⚡ [5단계 글리치 보이드 전용]: 3D 입체 글리치 사이버 코어 큐브!
            ctx.save();
            ctx.translate(0, -12);
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 4;
            this.draw3DBox(ctx, 0, 0, 96, 96, dx * 1.1, dy * 1.1, '#f72585', '#7209b7', '#3a0ca3');
            ctx.fillStyle = '#00f5d4';
            ctx.fillRect(-28, -68, 18, 14);
            ctx.fillRect(10, -68, 18, 14);
            ctx.fillStyle = '#ffbe0b';
            for (let gx = -24; gx <= 16; gx += 10) {
                ctx.fillRect(gx, -36 + ((gx * 7) % 6), 8, 10);
            }
            ctx.restore();

            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('⚡ 3D 글리치 큐브!', 0, -135);
            ctx.fillText('⚡ 3D 글리치 큐브!', 0, -135);

        } else if (obs.type === 'hurdle') {
            // 🚧 3D 입체 점프 허들 바리케이드 (경광등 + 안전 사선 줄무늬 디테일 추가!)
            this.draw3DBox(ctx, -58, 0, 18, 64, dx * 0.5, dy * 0.5, '#e76f51', '#f4a261', '#9c3d24');
            this.draw3DBox(ctx, 58, 0, 18, 64, dx * 0.5, dy * 0.5, '#e76f51', '#f4a261', '#9c3d24');
            this.draw3DBox(ctx, 0, -38, 154, 28, dx * 0.6, dy * 0.6, '#fcbf49', '#ffea79', '#d48c00');

            // 바리케이드 검은 사선 경고 줄무늬
            ctx.fillStyle = '#1a1612';
            for (let sx = -55; sx <= 45; sx += 32) {
                ctx.fillRect(sx, -64, 12, 24);
            }
            // 양쪽 상단 깜빡이는 붉은 경광등
            ctx.fillStyle = Math.floor(time * 8) % 2 === 0 ? '#ff0055' : '#ffbe0b';
            [-58, 58].forEach(lx => {
                ctx.beginPath();
                ctx.arc(lx, -72, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.strokeText('🚧 점프 허들!', 0, -86);
            ctx.fillText('🚧 점프 허들!', 0, -86);

        } else if (obs.type === 'moving_barrier') {
            // ⚙️ 3D 입체 좌우 이동 레이저 바리케이드 드론!
            this.draw3DBox(ctx, 0, 0, 124, 74, dx * 0.8, dy * 0.8, '#7209b7', '#b5179e', '#3a0ca3');
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.arc(0, -38, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.strokeText('◀▶ 3D 이동 기물!', 0, -84);
            ctx.fillText('◀▶ 3D 이동 기물!', 0, -84);

        } else if (obs.type === 'log') {
            // 🪵 3D 원기둥 통나무 (나무껍질 결 해칭 + 옆면 나이테 단면 + 잔가지와 잎사귀 디테일!)
            ctx.fillStyle = '#6b4025';
            ctx.beginPath();
            ctx.roundRect(-74 + dx * 0.5, -54 + dy * 0.5, 148, 54, 24);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#8d5b3c';
            ctx.beginPath();
            ctx.roundRect(-74, -54, 148, 54, 24);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -52, -28, 42, -28, 8, 12, 0.05);

            // 통나무 오른쪽 3D 나이테 단면
            ctx.fillStyle = '#e6ccb2';
            ctx.beginPath();
            ctx.ellipse(64, -27, 14, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(64, -27, 7, 13, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 통나무 위 새싹 잎사귀 2장
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.ellipse(-28, -58, 10, 5, -0.4, 0, Math.PI * 2);
            ctx.ellipse(-18, -60, 10, 5, 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.roundRect(-42, -94, 84, 26, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.fillText('▲ 점프!', 0, -77);

        } else if (obs.type === 'arch') {
            // ⛩️ 3D 입체 슬라이드 아치 관문 (기와 문양 & 금장 리벳 디테일)
            this.draw3DBox(ctx, -70, 0, 26, 230, dx, dy, '#cbb183', '#e6d2ab', '#8d7752');
            this.draw3DBox(ctx, 70, 0, 26, 230, dx, dy, '#cbb183', '#e6d2ab', '#8d7752');
            this.draw3DBox(ctx, 0, -115, 184, 120, dx, dy, '#d64531', '#e76f51', '#9b2226');
            this.drawHatching(ctx, -75, -130, 75, -130, 10, 14, -0.5);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.fillText('▼ 슬라이드 통과!', 0, -168);

        } else if (obs.type === 'pillar') {
            // 🏛️ 3D 입체 고대 석조 기둥 (주두/주초 장식 & 세로 홈 플루팅 디테일!)
            this.draw3DBox(ctx, 0, 0, 88, 215, dx, dy, '#9c8565', '#c8b08a', '#6c584c');
            this.draw3DBox(ctx, 0, 0, 102, 24, dx, dy * 0.5, '#cbb183', '#e6d2ab', '#8d7752');
            this.draw3DBox(ctx, 0, -195, 104, 24, dx, dy * 0.5, '#cbb183', '#e6d2ab', '#8d7752');

            ctx.fillStyle = '#d64531';
            ctx.beginPath();
            ctx.arc(0, -110, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 26px "Gaegu", sans-serif';
            ctx.fillText('!', 0, -102);
        }

        ctx.restore();
    }

    renderEffects(ctx, width, height) {
        this.particles.forEach(pt => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pt.alpha);
            ctx.fillStyle = pt.color;
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });

        this.popups.forEach(pp => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pp.alpha);
            ctx.font = 'bold 28px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#fffcf5';
            ctx.lineWidth = 6;
            ctx.strokeText(pp.text, pp.x, pp.y);
            ctx.fillStyle = pp.color;
            ctx.fillText(pp.text, pp.x, pp.y);
            ctx.restore();
        });

        // 스테이지 전환 배너: 트랙 시야를 절대 가리지 않도록 상단(height * 0.22)에 컴팩트하게 배치 & 3초 휴식 카운트다운 표시!
        if (this.stageBanner) {
            const sb = this.stageBanner;
            const p = sb.elapsed / sb.duration; // 0 ~ 1
            let offsetX = 0;
            if (p < 0.16) {
                const t = 1 - Math.pow(1 - p / 0.16, 3);
                offsetX = (1 - t) * (width * 0.85);
            } else if (p < 0.82) {
                const t = (p - 0.16) / 0.66;
                offsetX = (0.5 - t) * 50;
            } else {
                const t = Math.pow((p - 0.82) / 0.18, 3);
                offsetX = -25 - t * (width * 0.90);
            }

            const cx = width * 0.5 + offsetX;
            const cy = height * 0.22; // 도로와 장애물을 가리지 않는 상단 하늘 영역!
            const bannerW = Math.min(width * 0.62, 510);
            const bannerH = 84;

            ctx.save();
            ctx.translate(cx, cy);

            ctx.fillStyle = 'rgba(26, 22, 18, 0.88)';
            ctx.strokeStyle = sb.bgColor;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.roundRect(-bannerW * 0.5, -bannerH * 0.5, bannerW, bannerH, 18);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 34px "Comic Neue", "Gaegu", sans-serif';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 6;
            ctx.strokeText(sb.title, 0, -12);
            ctx.fillStyle = '#fffcf5';
            ctx.fillText(sb.title, 0, -12);

            const pauseCountdown = this.stagePauseTimer > 0
                ? `⏳ ${Math.ceil(this.stagePauseTimer)}초 숨 고르기 휴식 후 출발! `
                : '';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.fillStyle = sb.bgColor;
            ctx.fillText(pauseCountdown + sb.subtitle, 0, 22);

            ctx.restore();
        }
    }

    // 캔버스에 직접 그리는 깔끔한 아케이드 3D HUD (HTML 박스 없이 전체화면 시야 보장)
    renderCanvasHUD(ctx, width, height, score, stage, stageInfo, solvedCount) {
        ctx.save();
        // 1) 좌측 상단: 미니멀 3D 스테이지 배지
        ctx.font = 'bold 18px "Gaegu", sans-serif';
        const stText = stageInfo ? stageInfo.badge : `STAGE ${stage}`;
        const stW = ctx.measureText(stText).width + 32;

        ctx.fillStyle = 'rgba(26, 22, 18, 0.76)';
        ctx.beginPath();
        ctx.roundRect(24, 24, stW, 36, 18);
        ctx.fill();
        ctx.strokeStyle = '#ffea79';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(stText, 40, 42);

        // 2) 우측 상단: 아케이드 스코어 & 사칙연산 문제 해결 수 배지
        const scoreText = `🪙 ${score.toLocaleString()} 점   🧮 ${solvedCount}/10`;
        const scW = ctx.measureText(scoreText).width + 36;
        const scX = width - scW - 24;

        ctx.fillStyle = 'rgba(26, 22, 18, 0.76)';
        ctx.beginPath();
        ctx.roundRect(scX, 24, scW, 36, 18);
        ctx.fill();
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#ffd166';
        ctx.fillText(scoreText, scX + 18, 42);
        ctx.restore();
    }
}
