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
        this.stage = 1; // 1:숲, 2:사막, 3:해저, 4:타임스퀘어 도시(밤), 5:글리치 보이드, 6:학교 엔딩
        this.scrollDist = 0;
        this.obstacles = [];
        this.items = [];
        this.popups = [];
        this.particles = [];
        this.stageBanner = null; // 스테이지 전환 시 상단에 깔끔하게 뜨는 배너
        this.stagePauseTimer = 0; // 스테이지 전환 시 3초 쉬고 시작하는 휴식 타이머
        this.spawnTimer = 0.9;
        this.coinSpawnTimer = 0.4;
        this.sideProps = [
            { z: 0.12, variant: 0 },
            { z: 0.32, variant: 1 },
            { z: 0.52, variant: 2 },
            { z: 0.72, variant: 3 },
            { z: 0.92, variant: 4 }
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
            this.spawnTimer = 1.2;
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
        const topRoadW = 130;
        const botRoadW = Math.min(width * 0.86, 860);

        const zPow = Math.pow(Math.max(0.001, z), 1.85);
        const y = horizonY + (groundY - horizonY) * zPow;
        const roadW = topRoadW + (botRoadW - topRoadW) * zPow;
        const x = centerX + lane * (roadW * 0.285);
        const scale = 0.18 + 0.82 * zPow;

        return { x, y, roadW, scale, zPow, horizonY, groundY, centerX, topRoadW, botRoadW };
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

        if (!mathGateActive && this.stagePauseTimer <= 0) {
            this.spawnTimer -= dt * gameSpeed * stageSpeedMult;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern(callbacks);
                const baseInterval = Math.max(1.10, 1.65 - (this.stage - 1) * 0.10);
                this.spawnTimer = baseInterval + Math.random() * 0.45;
            }
        }

        this.coinSpawnTimer -= dt * gameSpeed;
        if (this.coinSpawnTimer <= 0 && !mathGateActive && this.stagePauseTimer <= 0) {
            this.spawnCoinLine();
            // 아이템이 너무 많이 나오지 않도록 생성 주기를 대폭 늘림 (3.2초 ~ 4.5초)
            this.coinSpawnTimer = 3.2 + Math.random() * 1.3;
        }

        // 아이템 업데이트 및 충돌
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.z += dz;

            if (!item.collected && item.z > 0.80 && item.z < 0.97) {
                if (Math.abs(hero.laneX - item.lane) < 0.48) {
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

        // 장애물 업데이트 및 충돌
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
                obs.lane = Math.sin(obs.movePhase) * 0.95;
            }

            // 🔫 레이저총(4초) 활성화 시: 유저가 있는 레인의 기물을 레이저 빔이 즉시 증발시켜 없앰!
            if (
                hero.laserGunTimer > 0 &&
                obs.type !== 'ramp' &&
                obs.type !== 'climb_truck' &&
                obs.z > 0.14 &&
                obs.z < 0.94 &&
                Math.abs(obs.lane - hero.laneX) < 0.46
            ) {
                if (callbacks.onLaserDestroy) callbacks.onLaserDestroy(obs);
                this.obstacles.splice(i, 1);
                continue;
            }

            // 톰 골드런처럼 위로 올라가서 달릴 수 있는 경사로(ramp) 및 멈춰있는 대형 트럭/버스(climb_truck)!
            if (obs.type === 'ramp' || obs.type === 'climb_truck') {
                const zStart = obs.type === 'climb_truck' ? 0.68 : 0.74;
                const zEnd = obs.type === 'climb_truck' ? 1.03 : 1.00;
                if (obs.z > zStart && obs.z < zEnd && Math.abs(hero.laneX - obs.lane) < 0.40) {
                    onRampHeight = obs.type === 'climb_truck' ? 106 : 88;
                    if (!obs.passed) {
                        obs.passed = true;
                        callbacks.onRampClimb(obs);
                    }
                }
            } else if (!obs.hit && !obs.passed && obs.z > 0.85 && obs.z < 0.92) {
                if (Math.abs(hero.laneX - obs.lane) < 0.32) {
                    let avoided = false;
                    const totalHeroHeight = hero.y + hero.platformY;

                    if (
                        (obs.type === 'log' || obs.type === 'hurdle' || isChaser || obs.type === 'moving_barrier') &&
                        totalHeroHeight > 36
                    ) {
                        avoided = true;
                    } else if ((obs.type === 'arch' || obs.type === 'pillar') && totalHeroHeight > 125) {
                        avoided = true;
                    } else if (obs.type === 'arch' && hero.isSliding) {
                        avoided = true;
                    }

                    if (!avoided) {
                        obs.hit = true;
                        callbacks.onObstacleHit(obs);
                    } else {
                        obs.passed = true;
                        callbacks.onObstacleAvoided(obs);
                    }
                } else if (obs.z > 0.90) {
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
        const lanes = [-1, 0, 1];
        const chaserType = this.getStageChaserType();
        // 톰 골드런 스타일 멈춰있는 트럭/버스 등반 기물(climb_truck)과 경사로(ramp)를 풍부하게 배치!
        const types = [
            'climb_truck',
            'climb_truck',
            'ramp',
            chaserType,
            chaserType,
            'log',
            'hurdle',
            'arch',
            'pillar',
            'moving_barrier'
        ];
        const chosenLane = lanes[Math.floor(Math.random() * 3)];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        this.obstacles.push({
            lane: chosenLane,
            z: 0.03,
            type: chosenType,
            rot: 0,
            movePhase: Math.random() * Math.PI * 2,
            hit: false,
            passed: false
        });

        if (this.stage >= 2 && chosenType !== 'moving_barrier' && Math.random() < 0.35 + this.stage * 0.06) {
            const otherLanes = lanes.filter(l => l !== chosenLane);
            const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
            const subTypes = ['log', 'hurdle', 'pillar', 'ramp', 'climb_truck'];
            this.obstacles.push({
                lane: secondLane,
                z: 0.03,
                type: subTypes[Math.floor(Math.random() * subTypes.length)],
                rot: 0,
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
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
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

        // 3) 정면 (Front Face)
        ctx.fillStyle = frontCol;
        ctx.fillRect(x - hw, y - h, w, h);
        ctx.strokeRect(x - hw, y - h, w, h);
    }

    // =========================================================================
    // 1단계~5단계 테마 배경 + 고밀도 디테일 렌더링
    // =========================================================================
    renderBackgroundAndRoad(ctx, width, height, time) {
        const horizonY = height * 0.42;
        const centerX = width * 0.5;
        const topRoadW = 130;
        const botRoadW = Math.min(width * 0.86, 860);

        const themes = {
            1: { // 1단계: 숲속 (Forest)
                skyTop: '#74c69d', skyMid: '#b7e4c7', skyBot: '#d8f3dc',
                ground: '#52b788', roadTop: '#e6d2ab', roadBot: '#c9ada7',
                tileA: '#ddb892', tileB: '#b08968'
            },
            2: { // 2단계: 사막 (Desert)
                skyTop: '#f77f00', skyMid: '#fcbf49', skyBot: '#eae2b7',
                ground: '#e9c46a', roadTop: '#f4e285', roadBot: '#dda15e',
                tileA: '#e9c46a', tileB: '#d4a373'
            },
            3: { // 3단계: 해저 (Undersea)
                skyTop: '#03045e', skyMid: '#0077b6', skyBot: '#00b4d8',
                ground: '#0096c7', roadTop: '#90e0ef', roadBot: '#0077b6',
                tileA: '#ade8f4', tileB: '#48cae4'
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

        // 3. 지평선 지면
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
        ctx.fillStyle = this.stage === 5 ? '#7209b7' : '#5c4938';
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
        ctx.fillStyle = this.stage === 5 ? '#7209b7' : '#5c4938';
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

        // 3D 타일 스크롤 (입체 블록 두께 포함)
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

            for (let col = -1; col <= 1; col++) {
                const x1L = centerX + (col - 0.44) * (w1 / 3);
                const x1R = centerX + (col + 0.44) * (w1 / 3);
                const x2R = centerX + (col + 0.44) * (w2 / 3);
                const x2L = centerX + (col - 0.44) * (w2 / 3);

                // 타일 앞쪽 3D 입체 두께 단차
                ctx.fillStyle = 'rgba(26, 22, 18, 0.32)';
                ctx.beginPath();
                ctx.moveTo(x2L, y2);
                ctx.lineTo(x2R, y2);
                ctx.lineTo(x2R, y2 + lipH);
                ctx.lineTo(x2L, y2 + lipH);
                ctx.closePath();
                ctx.fill();

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
            }
        }

        // 5. 양옆 스테이지별 동물 & 배경 오브젝트 렌더링
        if (this.stage === 6) {
            this.drawSchoolEndingBuilding(ctx, centerX, horizonY + 45);
        } else {
            const sortedProps = [...this.sideProps].sort((a, b) => a.z - b.z);
            sortedProps.forEach(prop => {
                const pL = this.project(prop.z, -1.72, width, height);
                const pR = this.project(prop.z, 1.72, width, height);
                this.drawStageSideProp(ctx, pL.x - 45 * pL.scale, pL.y, pL.scale, -1, prop.variant, time);
                this.drawStageSideProp(ctx, pR.x + 45 * pR.scale, pR.y, pR.scale, 1, (prop.variant + 2) % 5, time);
            });
        }

        if (this.stage === 5) {
            this.renderGlitchOverlay(ctx, width, height, time);
        }
    }

    // 스테이지별 하늘/원경 초고밀도 디테일 (타임스퀘어 빌딩 숲, 비행선, 헬기, 스핑크스, 침몰선 등 대거 추가!)
    renderStageSkyDetails(ctx, width, height, horizonY, centerX, time) {
        ctx.save();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;

        if (this.stage === 1) {
            // 🌲 1단계 숲: 햇살 빛줄기, 겹겹이 쌓인 원경 산맥, 2단 에메랄드 폭포, 고대 나무 오두막, 새 떼
            ctx.fillStyle = 'rgba(255, 252, 210, 0.24)';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * 140, 0);
                ctx.lineTo(centerX + i * 240 - 65, horizonY);
                ctx.lineTo(centerX + i * 240 + 65, horizonY);
                ctx.closePath();
                ctx.fill();
            }

            // 원경 겹산맥
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.arc(centerX - 380, horizonY, 220, Math.PI, 0);
            ctx.arc(centerX - 110, horizonY, 195, Math.PI, 0);
            ctx.arc(centerX + 160, horizonY, 210, Math.PI, 0);
            ctx.arc(centerX + 410, horizonY, 230, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#40916c';
            ctx.beginPath();
            ctx.arc(centerX - 260, horizonY, 175, Math.PI, 0);
            ctx.arc(centerX, horizonY, 160, Math.PI, 0);
            ctx.arc(centerX + 270, horizonY, 180, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 에메랄드 2단 폭포와 물보라
            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(centerX - 32, horizonY - 140, 64, 140);
            ctx.strokeRect(centerX - 32, horizonY - 140, 64, 140);
            ctx.fillStyle = '#caf0f8';
            for (let m = -2; m <= 2; m++) {
                ctx.beginPath();
                ctx.arc(centerX + m * 16, horizonY - 6 + Math.sin(time * 8 + m) * 4, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // 숲속 통나무 트리하우스 전망대 (좌측 산 중턱)
            ctx.fillStyle = '#8d5b3c';
            ctx.fillRect(centerX - 275, horizonY - 155, 54, 42);
            ctx.strokeRect(centerX - 275, horizonY - 155, 54, 42);
            ctx.fillStyle = '#d64531';
            ctx.beginPath();
            ctx.moveTo(centerX - 285, horizonY - 155);
            ctx.lineTo(centerX - 248, horizonY - 185);
            ctx.lineTo(centerX - 211, horizonY - 155);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 하늘을 나는 새 떼 (날개짓 애니메이션)
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.8;
            for (let b = 0; b < 5; b++) {
                const bx = centerX - 180 + b * 45 + Math.sin(time * 1.2 + b) * 30;
                const by = horizonY - 185 - (b % 2) * 18;
                const wingY = Math.sin(time * 9 + b) * 7;
                ctx.beginPath();
                ctx.moveTo(bx - 12, by + wingY);
                ctx.quadraticCurveTo(bx - 5, by - 6, bx, by);
                ctx.quadraticCurveTo(bx + 5, by - 6, bx + 12, by + wingY);
                ctx.stroke();
            }

        } else if (this.stage === 2) {
            // 🏜️ 2단계 사막: 이글거리는 태양, 3D 대피라미드 군락, 거대 스핑크스 석상, 오아시스 호수 & 야자수!
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.arc(centerX + 290, horizonY - 145, 56, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 피라미드 4개 (3D 음영 면 분할)
            const pyramids = [
                { x: -380, h: 140 },
                { x: -230, h: 175 },
                { x: 140,  h: 135 },
                { x: 310,  h: 165 }
            ];
            pyramids.forEach(py => {
                ctx.fillStyle = '#e09f3e';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x - py.h, horizonY);
                ctx.lineTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.22, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#b5651d';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.22, horizonY);
                ctx.lineTo(centerX + py.x + py.h, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

            // 중앙 좌측: 고대 이집트 대스핑크스 석상 직접 그리기!
            const spX = centerX - 85;
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(spX - 45, horizonY - 48, 90, 48);
            ctx.strokeRect(spX - 45, horizonY - 48, 90, 48);
            // 스핑크스 파라오 네메스 두건
            ctx.fillStyle = '#e9c46a';
            ctx.beginPath();
            ctx.moveTo(spX - 28, horizonY - 48);
            ctx.lineTo(spX - 36, horizonY - 82);
            ctx.lineTo(spX, horizonY - 102);
            ctx.lineTo(spX + 36, horizonY - 82);
            ctx.lineTo(spX + 28, horizonY - 48);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 스핑크스 얼굴
            ctx.fillStyle = '#dda15e';
            ctx.beginPath();
            ctx.arc(spX, horizonY - 72, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 중앙 우측: 사막 오아시스 호수 & 야자수
            ctx.fillStyle = '#48cae4';
            ctx.beginPath();
            ctx.ellipse(centerX + 55, horizonY - 4, 52, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else if (this.stage === 3) {
            // 🦈 3단계 해저: 수면 빛내림, 침몰한 고대 해적선(돛대+선체), 아틀란티스 신전 기둥, 직접 그린 해양 동물들!
            ctx.fillStyle = 'rgba(144, 224, 239, 0.18)';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * 160, 0);
                ctx.lineTo(centerX + i * 210 - 45, horizonY);
                ctx.lineTo(centerX + i * 210 + 45, horizonY);
                ctx.closePath();
                ctx.fill();
            }

            // 좌측 원경: 침몰한 해적선 실루엣 & 황금 보물상자 빛
            ctx.save();
            ctx.translate(centerX - 310, horizonY - 10);
            ctx.rotate(-0.12);
            ctx.fillStyle = '#3d2f24';
            ctx.beginPath();
            ctx.moveTo(-70, -45);
            ctx.lineTo(75, -45);
            ctx.lineTo(52, 10);
            ctx.lineTo(-52, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillRect(-6, -135, 10, 90);
            ctx.strokeRect(-6, -135, 10, 90);
            ctx.fillStyle = 'rgba(220, 230, 242, 0.45)';
            ctx.beginPath();
            ctx.moveTo(4, -125);
            ctx.quadraticCurveTo(48, -95, 4, -60);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // 우측 원경: 해저 아틀란티스 고대 신전 기둥 유적
            ctx.fillStyle = '#457b9d';
            [250, 295, 340].forEach((colX, idx) => {
                const colH = 95 + (idx % 2) * 28;
                ctx.fillRect(centerX + colX, horizonY - colH, 22, colH);
                ctx.strokeRect(centerX + colX, horizonY - colH, 22, colH);
            });
            ctx.fillRect(centerX + 242, horizonY - 135, 128, 18);
            ctx.strokeRect(centerX + 242, horizonY - 135, 128, 18);

            // 수중 기포(물방울) 상승 연출
            ctx.strokeStyle = '#caf0f8';
            for (let b = 0; b < 12; b++) {
                const bx = centerX + ((b * 97) % 700) - 350;
                const by = horizonY - ((time * 45 + b * 35) % (horizonY - 20));
                ctx.beginPath();
                ctx.arc(bx, by, 5 + (b % 4) * 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 유유히 헤엄치는 직접 그린 고퀄리티 대왕고래, 백상아리, 바다거북, 열대어, 문어들!
            const whaleX = centerX - 180 + Math.sin(time * 0.8) * 55;
            const whaleY = horizonY - 108;
            this.drawRealSeaCreature(ctx, whaleX, whaleY, 0.92, 2, time); // 대왕고래
            this.drawRealSeaCreature(ctx, centerX + 150 + Math.cos(time * 1.3) * 50, horizonY - 88, 0.85, 0, time); // 백상아리
            this.drawRealSeaCreature(ctx, centerX - 35 + Math.sin(time * 1.6) * 55, horizonY - 142, 0.76, 4, time); // 바다거북
            this.drawRealSeaCreature(ctx, centerX + 55 + Math.cos(time * 1.9) * 45, horizonY - 125, 0.78, 1, time); // 열대어

        } else if (this.stage === 4) {
            // 🌃 4단계 도시 (타임스퀘어 밤): 빈틈없이 꽉 찬 2중 스카이라인 빌딩 숲 + 원 타임스퀘어 새해 볼 타워 + 비행선 + 경찰 헬기!
            // 1) 밤하늘 서치라이트 4줄기
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

            // 2) 후경(Back Row) 초고층 맨해튼 마천루 실루엣 13개 (지평선 빈틈 완전 제거!)
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
                // 옥상 송신탑 안테나
                ctx.beginPath();
                ctx.moveTo(bx + bt.w * 0.5, by);
                ctx.lineTo(bx + bt.w * 0.5, by - 28);
                ctx.stroke();
                ctx.fillStyle = '#ff0055';
                ctx.beginPath();
                ctx.arc(bx + bt.w * 0.5, by - 28, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // 3) 전경(Front Row) 3D 입체 타임스퀘어 네온 빌딩 11개!
            const frontBuildings = [
                { x: -495, w: 88, h: 215, neon: '#ff0055', text: 'BROADWAY', sub: 'MUSICAL' },
                { x: -400, w: 88, h: 235, neon: '#ff007f', text: 'SMILE', sub: 'GAMES 3D' },
                { x: -305, w: 86, h: 195, neon: '#00f5d4', text: 'TIMES SQ', sub: 'LIVE TV' },
                { x: -210, w: 82, h: 250, neon: '#ffbe0b', text: 'NASDAQ', sub: 'MARKET' },
                { x: -120, w: 76, h: 185, neon: '#3a86ff', text: 'NYC 24H', sub: 'TAXI CAB' },
                { x: -38,  w: 76, h: 265, neon: '#ff006e', text: '2026 NYC', sub: 'ONE TIMES', isCenterTower: true },
                { x: 46,   w: 76, h: 190, neon: '#06d6a0', text: 'BANANA', sub: 'EXPRESS' },
                { x: 130,  w: 82, h: 235, neon: '#8338ec', text: 'ARCADE', sub: 'STAGE 4' },
                { x: 220,  w: 88, h: 205, neon: '#fb5607', text: 'MONKEY', sub: 'HERO RUN' },
                { x: 316,  w: 92, h: 245, neon: '#00bbf9', text: 'THEATER', sub: 'TONIGHT' },
                { x: 416,  w: 90, h: 220, neon: '#ffbe0b', text: '7TH AVE', sub: 'MANHATTAN' }
            ];
            frontBuildings.forEach(b => {
                const bx = centerX + b.x;
                const by = horizonY - b.h;
                // 3D 빌딩 측면 두께
                ctx.fillStyle = '#090a12';
                ctx.fillRect(bx + b.w, by + 8, 12, b.h - 8);
                // 빌딩 본체
                ctx.fillStyle = '#161829';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2.5;
                ctx.fillRect(bx, by, b.w, b.h);
                ctx.strokeRect(bx, by, b.w, b.h);

                // 촘촘한 빌딩 유리창 불빛 그리드
                for (let wy = by + 92; wy < horizonY - 12; wy += 15) {
                    for (let wx = bx + 8; wx < bx + b.w - 12; wx += 14) {
                        if ((wx + wy) % 3 !== 0) {
                            ctx.fillStyle = (wx * wy) % 5 === 0 ? '#90e0ef' : '#ffd166';
                            ctx.fillRect(wx, wy, 7, 9);
                        }
                    }
                }

                // 상단 메인 네온 전광판
                ctx.fillStyle = b.neon;
                ctx.fillRect(bx + 6, by + 12, b.w - 12, 36);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(bx + 6, by + 12, b.w - 12, 36);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 13px "Comic Neue", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(b.text, bx + b.w * 0.5, by + 34);

                // 중단 서브 전광판
                ctx.fillStyle = '#1a1612';
                ctx.fillRect(bx + 8, by + 54, b.w - 16, 26);
                ctx.strokeStyle = b.neon;
                ctx.strokeRect(bx + 8, by + 54, b.w - 16, 26);
                ctx.fillStyle = '#ffea79';
                ctx.font = 'bold 11px "Comic Neue", sans-serif';
                ctx.fillText(b.sub, bx + b.w * 0.5, by + 71);

                // 중앙 원 타임스퀘어 타워 꼭대기 크리스탈 새해 볼(New Year's Ball)!
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

            // 4) 밤하늘을 유유히 떠다니는 스마일 게임즈 네온 비행선(Blimp) & 경찰 헬리콥터!
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

            // 우측 상단 경찰 헬리콥터 & 서치라이트
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
    // 🦌 스누피(피너츠) 주인공 원숭이급 초고디테일 동물 일러스트 렌더링!
    // (입체 그라데이션 + 복슬복슬 털 결 + 펜 해칭 빗금 + 눈동자 하이라이트 + 관절 애니메이션)
    // =========================================================================

    // 1단계 숲속 동물 5종 (0:다람쥐, 1:산토끼, 2:꽃사슴, 3:붉은여우, 4:숲부엉이)
    drawRealForestAnimal(ctx, ax, ay, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.scale(1.22, 1.22); // 원숭이처럼 존재감 있고 디테일이 잘 보이도록 확대!
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 바닥 펜 해칭 그림자
        ctx.fillStyle = 'rgba(26, 22, 18, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 32, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawHatching(ctx, -20, 5, 20, 5, 6, 7, -0.5);

        if (kind === 0) {
            // 🐿️ 0: 다람쥐 (3겹 명암의 풍성한 S자 꼬리 + 줄무늬 등 + 볼록한 볼 + 두 손으로 쥔 도토리)
            const tailWag = Math.sin(time * 7) * 0.08;
            ctx.save();
            ctx.rotate(tailWag);
            const tailGrad = ctx.createRadialGradient(-28, -36, 4, -22, -30, 32);
            tailGrad.addColorStop(0, '#e09f3e');
            tailGrad.addColorStop(0.6, '#b5651d');
            tailGrad.addColorStop(1, '#6f3b0e');
            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.moveTo(-8, -10);
            ctx.bezierCurveTo(-48, -4, -56, -58, -22, -60);
            ctx.bezierCurveTo(4, -62, 2, -26, -8, -10);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -36, -24, -22, -48, 6, 9, -0.7);
            ctx.restore();

            // 뒷다리 & 발바닥
            ctx.fillStyle = '#9c5221';
            ctx.beginPath();
            ctx.ellipse(-6, -4, 11, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 통통한 몸통 & 크림색 배
            const bodyGrad = ctx.createLinearGradient(-16, -40, 16, 0);
            bodyGrad.addColorStop(0, '#d48c46');
            bodyGrad.addColorStop(1, '#9c5221');
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, -20, 17, 21, 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.ellipse(7, -18, 9, 15, 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 머리 (볼록한 볼털 + 정수리 털 3가닥)
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.arc(5, -41, 14.5, 0, Math.PI * 2);
            ctx.arc(14, -37, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 귀 2개 & 귓속 분홍 음영
            [-2, 8].forEach((ex, idx) => {
                ctx.fillStyle = '#b5651d';
                ctx.beginPath();
                ctx.ellipse(ex, -54, 4.5, 8, idx === 0 ? -0.2 : 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 초롱초롱한 눈 (검은 눈동자 + 하얀 하이라이트) & 코 & 발그레한 볼
            ctx.fillStyle = 'rgba(235, 105, 90, 0.45)';
            ctx.beginPath();
            ctx.ellipse(13, -36, 4.5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(10, -43, 3.4, 0, Math.PI * 2);
            ctx.arc(21, -39, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(9, -44.2, 1.3, 0, Math.PI * 2);
            ctx.fill();

            // 두 앞발로 소중히 쥐고 있는 입체 도토리!
            ctx.fillStyle = '#9c5221';
            ctx.beginPath();
            ctx.ellipse(18, -23, 8.5, 9.5, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#4a2c11';
            ctx.beginPath();
            ctx.arc(18, -26, 9.5, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, 11, -28, 24, -28, 4, 5, 0.7);

        } else if (kind === 1) {
            // 🐇 1: 산토끼 (복슬복슬 솜털 질감 + 쫑긋 움직이는 긴 귀 + 수염 4가닥 + 깡충 점프)
            const hop = Math.abs(Math.sin(time * 6.5)) * 9;
            ctx.translate(0, -hop);

            // 복슬복슬 솜방울 꼬리
            ctx.fillStyle = '#fffcf7';
            ctx.beginPath();
            ctx.arc(-20, -14, 9.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -25, -14, -16, -14, 3, 5, -0.6);

            // 뒷발과 몸통
            ctx.fillStyle = '#f8edeb';
            ctx.beginPath();
            ctx.ellipse(-4, -4, 13, 6, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf7';
            ctx.beginPath();
            ctx.ellipse(0, -18, 20, 16, -0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -12, -12, 6, -10, 5, 6, -0.5);

            // 머리 & 볼록한 뺨
            ctx.beginPath();
            ctx.arc(12, -33, 14.5, 0, Math.PI * 2);
            ctx.arc(20, -29, 7.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 긴 토끼 귀 2개 (까딱거리는 애니메이션)
            const earTilt = Math.sin(time * 7) * 0.08;
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.translate(10 + dir * 4, -44);
                ctx.rotate(dir * 0.18 + earTilt);
                ctx.fillStyle = '#fffcf7';
                ctx.beginPath();
                ctx.ellipse(0, -12, 5.5, 17, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffafcc';
                ctx.beginPath();
                ctx.ellipse(0, -12, 3, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // 초롱초롱 루비 눈 + 분홍 코 + 수염
            ctx.fillStyle = '#d62828';
            ctx.beginPath();
            ctx.arc(17, -35, 3.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16, -36.2, 1.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.arc(26, -30, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(21, -28); ctx.lineTo(31, -31);
            ctx.moveTo(21, -26); ctx.lineTo(31, -26);
            ctx.stroke();

        } else if (kind === 2) {
            // 🦌 2: 꽃사슴 (우아한 근육 다리 + 검은 발굽 + 하얀 매화 반점 + 다단 가지 뿔 + 맑은 눈망울)
            const legSwing = Math.sin(time * 5) * 4;
            [[-14, 1], [-6, -1], [8, 1], [16, -1]].forEach(([lx, dir]) => {
                ctx.strokeStyle = '#9c5221';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(lx, -22);
                ctx.lineTo(lx + dir * legSwing, 2);
                ctx.stroke();
                // 검은 발굽
                ctx.fillStyle = '#1a1612';
                ctx.fillRect(lx + dir * legSwing - 3, 0, 6, 5);
            });

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.2;
            const deerGrad = ctx.createLinearGradient(0, -42, 0, -12);
            deerGrad.addColorStop(0, '#d48c46');
            deerGrad.addColorStop(1, '#9c5221');
            ctx.fillStyle = deerGrad;
            ctx.beginPath();
            ctx.ellipse(0, -27, 26, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -18, -20, 12, -20, 6, 7, -0.5);

            // 하얀 매화 반점
            ctx.fillStyle = '#fffcf2';
            [[-14, -30], [-6, -24], [3, -31], [11, -25], [-2, -33], [-11, -22]].forEach(([sx, sy]) => {
                ctx.beginPath();
                ctx.arc(sx, sy, 3.0, 0, Math.PI * 2);
                ctx.fill();
            });

            // 늘씬한 목과 머리
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.moveTo(13, -32);
            ctx.lineTo(20, -60);
            ctx.lineTo(29, -57);
            ctx.lineTo(22, -26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 하얀 가슴 털
            ctx.fillStyle = '#fff8e7';
            ctx.beginPath();
            ctx.ellipse(22, -40, 4.5, 11, 0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.ellipse(26, -62, 13.5, 9.5, 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 웅장한 사슴 뿔 (가지 뿔)
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 3.8;
            ctx.beginPath();
            ctx.moveTo(21, -70); ctx.lineTo(15, -92);
            ctx.moveTo(18, -80); ctx.lineTo(9, -86);
            ctx.moveTo(27, -70); ctx.lineTo(31, -92);
            ctx.moveTo(29, -80); ctx.lineTo(39, -86);
            ctx.stroke();

            // 눈동자 & 코
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(29, -63, 3.2, 0, Math.PI * 2);
            ctx.arc(38, -60, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(28, -64, 1.3, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 🦊 3: 붉은여우 (하얀 털 끝의 복슬복슬 대형 꼬리 + 하얀 턱수염 털 + 검은 양말 다리)
            // 복슬복슬 여우 꼬리
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.moveTo(-14, -18);
            ctx.bezierCurveTo(-48, -38, -54, -8, -22, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fffcf7';
            ctx.beginPath();
            ctx.arc(-41, -24, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 검은 양말을 신은 다리 4개
            [-12, -4, 8, 15].forEach(lx => {
                ctx.fillStyle = '#264653';
                ctx.fillRect(lx - 3, -12, 6, 14);
                ctx.strokeRect(lx - 3, -12, 6, 14);
            });

            // 몸통
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.ellipse(0, -20, 22, 13.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -14, -15, 10, -15, 5, 6, -0.5);

            // 여우 머리 & 하얀 뺨 털
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.arc(14, -38, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf7';
            ctx.beginPath();
            ctx.moveTo(4, -35);
            ctx.lineTo(16, -24);
            ctx.lineTo(28, -35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 뾰족한 검은 끝 귀
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.moveTo(4, -47); ctx.lineTo(8, -62); ctx.lineTo(14, -49);
            ctx.moveTo(16, -49); ctx.lineTo(22, -62); ctx.lineTo(26, -47);
            ctx.fill();
            ctx.stroke();

            // 영리한 눈매와 코
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(11, -39, 2.8, 0, Math.PI * 2);
            ctx.arc(20, -39, 2.8, 0, Math.PI * 2);
            ctx.arc(16, -25, 3.5, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 🦉 4: 숲부엉이 (나뭇가지 위에서 날개를 접고 앉은 정밀한 깃털 패턴 + 황금 왕방울 눈)
            ctx.fillStyle = '#7f5539';
            ctx.beginPath();
            ctx.ellipse(0, -28, 22, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 양쪽 접은 날개
            ctx.fillStyle = '#5c3a21';
            [-19, 19].forEach(wx => {
                ctx.beginPath();
                ctx.ellipse(wx, -26, 6, 18, wx < 0 ? 0.15 : -0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            // 크림색 배 & U자 깃털 비늘 무늬
            ctx.fillStyle = '#ede0d4';
            ctx.beginPath();
            ctx.ellipse(0, -21, 14, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.lineWidth = 2;
            [[-6, -24], [6, -24], [0, -18], [-5, -12], [5, -12]].forEach(([fx, fy]) => {
                ctx.beginPath();
                ctx.arc(fx, fy, 3.5, 0, Math.PI);
                ctx.stroke();
            });

            // 부엉이 귀 깃털 (Ear tufts)
            ctx.lineWidth = 3.2;
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.moveTo(-14, -46); ctx.lineTo(-24, -60); ctx.lineTo(-5, -50);
            ctx.moveTo(14, -46); ctx.lineTo(24, -60); ctx.lineTo(5, -50);
            ctx.fill();
            ctx.stroke();

            // 왕방울 황금 눈 2개 + 동공 하이라이트
            [-8.5, 8.5].forEach(ex => {
                ctx.fillStyle = '#ffbe0b';
                ctx.beginPath();
                ctx.arc(ex, -38, 8.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -38, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex - 1.5, -39.5, 1.6, 0, Math.PI * 2);
                ctx.fill();
            });

            // 갈고리 부리
            ctx.fillStyle = '#fb8500';
            ctx.beginPath();
            ctx.moveTo(-4.5, -34);
            ctx.lineTo(4.5, -34);
            ctx.lineTo(0, -26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2단계 사막 동물 5종 (0:사막전갈, 1:사막여우, 2:단봉낙타, 3:쌍봉낙타, 4:사막도마뱀)
    drawRealDesertAnimal(ctx, ax, ay, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.scale(1.22, 1.22);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.fillStyle = 'rgba(26, 22, 18, 0.26)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 34, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        this.drawHatching(ctx, -22, 5, 22, 5, 6, 7, -0.5);

        if (kind === 0) {
            // 🦂 0: 사막전갈 (다관절 다리 8개 + 갑각 마디 음영 + 집게발 + 붉은 독침)
            [-1, 1].forEach(side => {
                for (let l = 0; l < 3; l++) {
                    ctx.beginPath();
                    ctx.moveTo(side * 12, -10 - l * 4);
                    ctx.lineTo(side * 28, -16 - l * 5);
                    ctx.lineTo(side * 34, -4 - l * 3);
                    ctx.stroke();
                }
            });
            ctx.fillStyle = '#9b2226';
            ctx.beginPath();
            ctx.ellipse(0, -15, 22, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -14, -15, 14, -15, 5, 6, -0.5);

            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = i % 2 === 0 ? '#bb3e03' : '#9b2226';
                ctx.beginPath();
                ctx.arc(-8 - i * 3.5, -28 - i * 8.5, 7 - i * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(-24, -68);
            ctx.lineTo(-10, -62);
            ctx.lineTo(-19, -54);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            [-16, 16].forEach(px => {
                ctx.fillStyle = '#ae2012';
                ctx.beginPath();
                ctx.arc(px, -6, 10, 0.2, Math.PI * 1.8);
                ctx.fill();
                ctx.stroke();
            });

        } else if (kind === 1) {
            // 🦊 1: 사막여우 (페넥여우: 크림색 털 + 얼굴보다 큰 초대형 레이더 귀 + 복슬복슬 꼬리 + 초롱초롱 눈)
            ctx.fillStyle = '#f4e285';
            ctx.beginPath();
            ctx.ellipse(-22, -15, 17, 9, -0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#6f3b0e';
            ctx.beginPath();
            ctx.arc(-36, -20, 5.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f4e285';
            ctx.beginPath();
            ctx.ellipse(0, -17, 20, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -12, -13, 10, -13, 5, 6, -0.5);

            ctx.beginPath();
            ctx.arc(11, -33, 13.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 페넥여우 특유의 초대형 귀 2개 + 귓속 잔털 해칭
            [-1, 1].forEach(dir => {
                ctx.save();
                ctx.translate(11 + dir * 9, -46);
                ctx.rotate(dir * 0.45 + Math.sin(time * 6) * 0.06);
                ctx.fillStyle = '#f4e285';
                ctx.beginPath();
                ctx.ellipse(0, -6, 9, 20, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffcad4';
                ctx.beginPath();
                ctx.ellipse(0, -6, 5, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(8, -33, 3.2, 0, Math.PI * 2);
            ctx.arc(17, -33, 3.2, 0, Math.PI * 2);
            ctx.arc(13, -25, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(7, -34, 1.2, 0, Math.PI * 2);
            ctx.arc(16, -34, 1.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2 || kind === 3) {
            // 🐪 2: 단봉낙타 / 🐫 3: 쌍봉낙타 (무릎 관절이 있는 긴 다리 + 화려한 아라비안 양탄자 안장 + 혹 + 긴 목)
            const walk = Math.sin(time * 4.5) * 3.5;
            [[-15, 1], [-6, -1], [8, 1], [17, -1]].forEach(([lx, dir]) => {
                ctx.strokeStyle = '#99582a';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(lx, -26);
                ctx.lineTo(lx + dir * walk, 2);
                ctx.stroke();
            });

            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.2;
            ctx.fillStyle = kind === 2 ? '#dda15e' : '#b07d4f';
            ctx.beginPath();
            ctx.ellipse(0, -32, 28, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -18, -24, 16, -24, 6, 7, -0.5);

            // 낙타 혹 (단봉 vs 쌍봉)
            if (kind === 2) {
                ctx.beginPath();
                ctx.arc(0, -48, 15, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
                // 붉은 사막 양탄자 안장
                ctx.fillStyle = '#e63946';
                ctx.fillRect(-12, -46, 24, 12);
                ctx.strokeRect(-12, -46, 24, 12);
            } else {
                [-10, 10].forEach(hx => {
                    ctx.beginPath();
                    ctx.arc(hx, -47, 11, Math.PI, 0);
                    ctx.fill();
                    ctx.stroke();
                });
            }

            // U자형 긴 목과 낙타 얼굴
            ctx.fillStyle = kind === 2 ? '#dda15e' : '#b07d4f';
            ctx.beginPath();
            ctx.moveTo(18, -34);
            ctx.quadraticCurveTo(33, -34, 30, -62);
            ctx.lineTo(21, -62);
            ctx.quadraticCurveTo(21, -42, 14, -38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(30, -65, 12.5, 8, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(32, -67, 2.8, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 🦎 4: 사막 목도리도마뱀 (부채꼴 주름 목도리 프릴 + 비늘 해칭 + 긴 꼬리)
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.moveTo(-12, -12);
            ctx.quadraticCurveTo(-44, -4, -50, -26);
            ctx.quadraticCurveTo(-36, -10, -12, -19);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, -16, 20, 11, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -12, -16, 10, -16, 5, 6, 0.5);

            // 화려하게 펼쳐진 주황/노란 목도리 프릴
            ctx.fillStyle = '#f4a261';
            ctx.beginPath();
            ctx.arc(15, -25, 17, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#e76f51';
            for (let a = 0; a < 6; a++) {
                const ang = (a / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(15, -25);
                ctx.lineTo(15 + Math.cos(ang) * 16, -25 + Math.sin(ang) * 16);
                ctx.stroke();
            }

            ctx.strokeStyle = '#1a1612';
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.ellipse(20, -25, 11, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(23, -27, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // 3단계 해저 생물 5종 (0:백상아리, 1:열대어, 2:대왕고래, 3:바다문어, 4:바다거북)
    drawRealSeaCreature(ctx, ax, ay, scale, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.scale(scale * 1.18, scale * 1.18);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const tailWag = Math.sin(time * 7 + kind) * 7;

        if (kind === 0) {
            // 🦈 0: 백상아리 (입체 어뢰형 몸통 + 등지느러미 + 아가미 3줄 + 지그재그 이빨 + 매서운 눈)
            ctx.fillStyle = '#457b9d';
            ctx.beginPath();
            ctx.moveTo(-36, tailWag);
            ctx.lineTo(-52, -17 + tailWag);
            ctx.lineTo(-46, 0 + tailWag);
            ctx.lineTo(-50, 17 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(-8, -12);
            ctx.lineTo(4, -36);
            ctx.lineTo(16, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            const sharkGrad = ctx.createLinearGradient(0, -18, 0, 16);
            sharkGrad.addColorStop(0, '#1d3557');
            sharkGrad.addColorStop(0.55, '#457b9d');
            sharkGrad.addColorStop(1, '#f1faee');
            ctx.fillStyle = sharkGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 38, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 상어 이빨 입 & 아가미
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(22, 6, 9, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(24, -4, 3.2, 0, Math.PI * 2);
            ctx.fill();
            for (let g = 0; g < 3; g++) {
                ctx.beginPath();
                ctx.moveTo(6 + g * 4.5, -6);
                ctx.lineTo(6 + g * 4.5, 5);
                ctx.stroke();
            }

        } else if (kind === 1) {
            // 🐠 1: 열대어 (주황/하얀 줄무늬 흰동가리 + 등지느러미 + 지느러미 빗금)
            ctx.fillStyle = '#fb5607';
            ctx.beginPath();
            ctx.moveTo(-18, 0);
            ctx.lineTo(-34, -14 + tailWag * 0.6);
            ctx.lineTo(-34, 14 + tailWag * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-9, -15, 7, 30);
            ctx.strokeRect(-9, -15, 7, 30);
            ctx.fillRect(5, -14, 7, 28);
            ctx.strokeRect(5, -14, 7, 28);

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(16, -3, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(15, -4, 1.3, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2) {
            // 🐋 2: 대왕고래 (거대한 네이비/시안 그라데이션 몸통 + 주름진 하얀 배 + 시원한 분수 물줄기!)
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(-44, tailWag);
            ctx.lineTo(-62, -18 + tailWag);
            ctx.lineTo(-56, 18 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, 46, 22, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#caf0f8';
            ctx.beginPath();
            ctx.ellipse(6, 8, 34, 11, 0, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -18, 12, 26, 12, 7, 6, 0.1);

            ctx.strokeStyle = '#90e0ef';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(14, -22);
            ctx.quadraticCurveTo(4, -44, -10, -38);
            ctx.moveTo(14, -22);
            ctx.quadraticCurveTo(24, -44, 36, -38);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(26, -4, 3.8, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 🐙 3: 바다문어 (빨판이 달린 꿈틀거리는 다리 6가닥 + 입체 둥근 머리 + 귀여운 눈)
            for (let t = -2; t <= 2; t++) {
                const wave = Math.sin(time * 8 + t) * 6;
                ctx.beginPath();
                ctx.moveTo(t * 8, 4);
                ctx.quadraticCurveTo(t * 13 + wave, 20, t * 10 - wave, 32);
                ctx.lineWidth = 7;
                ctx.strokeStyle = '#e63946';
                ctx.stroke();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#1a1612';
                ctx.stroke();
            }
            ctx.lineWidth = 3.2;
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(0, -9, 21, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            this.drawHatching(ctx, -12, -16, 12, -16, 4, 6, -0.5);

            [-7, 7].forEach(ex => {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex, -6, 5.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -6, 2.5, 0, Math.PI * 2);
                ctx.fill();
            });

        } else {
            // 🐢 4: 바다거북 (육각 거북 등껍질 무늬 + 헤엄치는 지느러미 발 + 초롱초롱 눈)
            const swim = Math.sin(time * 6) * 0.2;
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.ellipse(10, -18, 7, 15, -0.45 + swim, 0, Math.PI * 2);
            ctx.ellipse(10, 18, 7, 15, 0.45 - swim, 0, Math.PI * 2);
            ctx.ellipse(-18, -13, 5, 11, 0.5, 0, Math.PI * 2);
            ctx.ellipse(-18, 13, 5, 11, -0.5, 0, Math.PI * 2);
            ctx.ellipse(28, 0, 10, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = '#95d5b2';
            ctx.lineWidth = 2.4;
            ctx.strokeRect(-11, -8, 22, 16);
            ctx.beginPath();
            ctx.moveTo(-11, 0); ctx.lineTo(11, 0);
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.stroke();

            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(31, -2, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 양옆 스테이지별 동물 & 오브젝트 디테일
    drawStageSideProp(ctx, x, y, scale, side, variant, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';

        const bob = Math.sin(time * 5 + variant) * 6;

        if (this.stage === 1) {
            // 🌲 1단계 숲: 다층 수관 나무 + 직접 그린 숲속 동물들(다람쥐, 산토끼, 꽃사슴, 붉은여우, 숲부엉이)
            ctx.fillStyle = '#7f4f24';
            ctx.fillRect(-16, -155, 32, 155);
            ctx.strokeRect(-16, -155, 32, 155);

            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.arc(-24, -155, 50, 0, Math.PI * 2);
            ctx.arc(24, -155, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#40916c';
            ctx.beginPath();
            ctx.arc(0, -190, 62, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const animalNames = ['다람쥐', '산토끼', '꽃사슴', '붉은여우', '숲부엉이'];
            this.drawRealForestAnimal(ctx, -side * 62, -10 + bob * 0.5, variant % 5, time);
            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(animalNames[variant % 5], -side * 62, 16);

        } else if (this.stage === 2) {
            // 🌵 2단계 사막: 선인장 + 직접 그린 사막 동물들(사막전갈, 사막여우, 단봉낙타, 쌍봉낙타, 사막도마뱀)
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.roundRect(-16, -145, 32, 145, 14);
            ctx.roundRect(-48, -110, 32, 22, 10);
            ctx.roundRect(-48, -140, 20, 45, 10);
            ctx.roundRect(16, -95, 32, 22, 10);
            ctx.roundRect(28, -130, 20, 50, 10);
            ctx.fill();
            ctx.stroke();

            const desertLabels = ['사막전갈', '사막여우', '단봉낙타', '쌍봉낙타', '사막도마뱀'];
            this.drawRealDesertAnimal(ctx, -side * 68, -8 + bob * 0.4, variant % 5, time);
            ctx.fillStyle = '#fff3b0';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(desertLabels[variant % 5], -side * 68, 18);

        } else if (this.stage === 3) {
            // 🦈 3단계 해저: 산호초 + 직접 그린 해양 생물들(백상아리, 열대어, 대왕고래, 바다문어, 바다거북)
            ctx.fillStyle = variant % 2 === 0 ? '#ff6b6b' : '#ff9f1c';
            ctx.beginPath();
            ctx.roundRect(-16, -130, 32, 130, 14);
            ctx.roundRect(-44, -95, 28, 65, 12);
            ctx.roundRect(16, -105, 28, 75, 12);
            ctx.fill();
            ctx.stroke();

            const seaLabels = ['백상아리', '열대어', '대왕고래', '바다문어', '바다거북'];
            this.drawRealSeaCreature(ctx, -side * 68, -52 + bob * 1.5, 1.0, variant % 5, time);
            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(seaLabels[variant % 5], -side * 68, -10);

        } else if (this.stage === 4) {
            // 🌆 4단계 도시 (타임스퀘어 밤): 3D 네온 광고판 타워 & 직접 그린 가로등
            this.draw3DBox(ctx, 0, 0, 86, 210, -side * 16, -16, '#2b2d42', '#495057', '#151624');

            ctx.fillStyle = variant % 2 === 0 ? '#ff007f' : '#00f5d4';
            ctx.fillRect(-34, -185, 68, 56);
            ctx.strokeRect(-34, -185, 68, 56);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px "Comic Neue", sans-serif';
            ctx.fillText(variant % 2 === 0 ? 'TIMES SQ' : 'BROADWAY', 0, -152);

            // 네온 가로등 기둥과 불빛
            ctx.strokeStyle = '#adb5bd';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-side * 55, 0);
            ctx.lineTo(-side * 55, -110);
            ctx.lineTo(-side * 35, -110);
            ctx.stroke();
            ctx.fillStyle = '#ffea79';
            ctx.beginPath();
            ctx.arc(-side * 35, -106, 10, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 깨진 3D 디지털 기둥 & 에러 홀로그램
            const glitchShift = (Math.random() - 0.5) * 20;
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
        ctx.fillText('🏫 스마일 초등학교 (6학년 교실)', 0, -142);

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
                this.drawObstacle(ctx, entry.obj, p, time);
            }
        });
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
            // 3D 골드 코인 (옆면 두께 림 + 정면 + 양각 별)
            ctx.fillStyle = '#b58318';
            ctx.beginPath();
            ctx.ellipse(thickness, 0, 26 * spinScaleX, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f6d54a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 26 * spinScaleX, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 내부 3D 홈
            ctx.strokeStyle = '#d4a62a';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, 16 * spinScaleX, 22, 0, 0, Math.PI * 2);
            ctx.stroke();

        } else if (item.type === 'banana') {
            // 3D 황금 바나나 캡슐 큐브 (직접 그린 바나나 송이 벡터 아이콘)
            this.draw3DBox(ctx, 0, 24, 54, 54, 14, -14, '#ffea79', '#fff8cc', '#d4a62a');
            ctx.fillStyle = '#ffb703';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(-2, -4, 15, 0.2, Math.PI * 1.15);
            ctx.quadraticCurveTo(-4, -2, 12, -10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

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

        // 🎯 명확한 바닥 히트박스 가이드 프레임 표시 (실제 충돌 판정 영역 시각화!)
        if (obs.type === 'ramp' || obs.type === 'climb_truck') {
            ctx.fillStyle = 'rgba(6, 214, 160, 0.24)';
            ctx.strokeStyle = '#06d6a0';
            ctx.lineWidth = 3.2;
            ctx.strokeRect(-64, -16, 128, 28);
        } else {
            const isNearHitZone = obs.z > 0.72 && obs.z < 0.94;
            ctx.fillStyle = isNearHitZone ? 'rgba(255, 0, 85, 0.34)' : 'rgba(230, 57, 70, 0.18)';
            ctx.strokeStyle = isNearHitZone ? '#ff0055' : '#e63946';
            ctx.lineWidth = isNearHitZone ? 4.2 : 3.0;
            ctx.beginPath();
            ctx.roundRect(-52, -14, 104, 24, 6);
            ctx.fill();
            ctx.stroke();
        }

        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.0;

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
}
