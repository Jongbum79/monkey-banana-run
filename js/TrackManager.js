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
        this.stageBanner = null; // 스테이지 전환 시 화면을 가로질러 지나가는 초대형 배너
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

    triggerStageBanner(title, subtitle, bgColor = '#ffbe0b') {
        this.stageBanner = {
            title,
            subtitle,
            bgColor,
            elapsed: 0,
            duration: 2.6
        };
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

        // 최고 속도를 기존 대비 30% 이상 낮추어 단계가 올라가도 쾌적하게 컨트롤 가능하도록 조정!
        const stageSpeedTable = { 1: 0.90, 2: 1.02, 3: 1.14, 4: 1.26, 5: 1.38 };
        const stageSpeedMult = stageSpeedTable[this.stage] || 1.0;
        const dz = dt * gameSpeed * stageSpeedMult * 0.30;
        this.scrollDist += dz;

        this.sideProps.forEach(p => {
            p.z += dz;
            if (p.z > 1.15) p.z -= 1.15;
        });

        if (!mathGateActive) {
            this.spawnTimer -= dt * gameSpeed * stageSpeedMult;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern(callbacks);
                const baseInterval = Math.max(1.10, 1.65 - (this.stage - 1) * 0.10);
                this.spawnTimer = baseInterval + Math.random() * 0.45;
            }
        }

        this.coinSpawnTimer -= dt * gameSpeed;
        if (this.coinSpawnTimer <= 0 && !mathGateActive) {
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
                }
            }
            if (item.z > 1.18) this.items.splice(i, 1);
        }

        // 톰 골드런 스타일 경사로 플랫폼(ramp) 위에 올라가 있는지 판정
        let onRampNow = false;

        // 장애물 업데이트 및 충돌
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            const isChaser = this.isMovingChaserType(obs.type);
            // 나를 향해 다가오는 돌/전갈/상어/차 추가 속도도 30% 완만하게 조정
            const extraSpeed = isChaser ? dz * 0.34 : 0;
            obs.z += dz + extraSpeed;

            if (obs.type === 'rolling_stone' || obs.type === 'glitch_hazard') {
                obs.rot = (obs.rot || 0) + dt * 11;
            }
            // 좌우로 움직이는 기물(moving_barrier)은 트랙 위를 가로지름!
            if (obs.type === 'moving_barrier') {
                obs.movePhase = (obs.movePhase || 0) + dt * 2.8;
                obs.lane = Math.sin(obs.movePhase) * 0.95;
            }

            // 경사로 플랫폼(ramp)은 부딪히는 장애물이 아니라 위로 올라타서 달리는 플랫폼!
            if (obs.type === 'ramp') {
                if (obs.z > 0.74 && obs.z < 1.00 && Math.abs(hero.laneX - obs.lane) < 0.38) {
                    onRampNow = true;
                    if (!obs.passed) {
                        obs.passed = true;
                        callbacks.onRampClimb(obs);
                    }
                }
            } else if (!obs.hit && !obs.passed && obs.z > 0.85 && obs.z < 0.92) {
                // 원숭이 크기가 작아진 것에 맞춰 좌우 히트박스 폭을 0.32로 정밀하고 명확하게 축소!
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

        hero.targetPlatformY = onRampNow ? 88 : 0;

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
        const types = ['ramp', chaserType, chaserType, 'log', 'hurdle', 'arch', 'pillar', 'moving_barrier'];
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
            const subTypes = ['log', 'hurdle', 'pillar', 'ramp'];
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

        // 경사로(ramp) 위에는 일반 코인 2개만 배치 (특별 아이템 과잉 스폰 방지)
        if (chosenType === 'ramp' && Math.random() < 0.65) {
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
        // 아이템 개수를 줄여 트랙이 깔끔하게 보이도록 2~3개만 생성
        const count = 2 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < count; i++) {
            let itemType = 'coin';
            if (i === count - 1) {
                const r = Math.random();
                // 특별 아이템 등장 확률을 대폭 낮추어(총 18%) 귀하고 전략적으로 등장하게 조정!
                if (r < 0.035) itemType = 'shield';
                else if (r < 0.085) itemType = 'super_jump';
                else if (r < 0.135) itemType = 'wukong';
                else if (r < 0.180) itemType = 'banana';
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

    // 스테이지별 하늘/원경 고밀도 디테일
    renderStageSkyDetails(ctx, width, height, horizonY, centerX, time) {
        ctx.save();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;

        if (this.stage === 1) {
            // 🌲 1단계 숲: 햇살 빛줄기, 겹겹이 쌓인 원경 산림, 에메랄드 폭포, 뭉게구름과 새 떼
            // 햇살 빛줄기
            ctx.fillStyle = 'rgba(255, 252, 210, 0.22)';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * 140, 0);
                ctx.lineTo(centerX + i * 240 - 60, horizonY);
                ctx.lineTo(centerX + i * 240 + 60, horizonY);
                ctx.closePath();
                ctx.fill();
            }
            // 먼 산맥과 폭포
            ctx.fillStyle = '#40916c';
            ctx.beginPath();
            ctx.arc(centerX - 310, horizonY, 195, Math.PI, 0);
            ctx.arc(centerX, horizonY, 165, Math.PI, 0);
            ctx.arc(centerX + 310, horizonY, 205, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 원경 폭포 줄기
            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(centerX - 28, horizonY - 135, 56, 135);
            ctx.strokeRect(centerX - 28, horizonY - 135, 56, 135);

            // 뭉게구름
            ctx.fillStyle = '#fffcf5';
            [[-280, -155], [240, -165]].forEach(([cx, cy]) => {
                ctx.beginPath();
                ctx.arc(centerX + cx, horizonY + cy, 28, 0, Math.PI * 2);
                ctx.arc(centerX + cx + 26, horizonY + cy - 6, 34, 0, Math.PI * 2);
                ctx.arc(centerX + cx + 54, horizonY + cy, 26, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

        } else if (this.stage === 2) {
            // 🏜️ 2단계 사막: 이글거리는 태양, 대피라미드 3개, 스핑크스 실루엣, 오아시스 야자수
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.arc(centerX + 260, horizonY - 130, 54, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 피라미드 3개 (음영 면 분할로 입체감 부여)
            const pyramids = [
                { x: -290, h: 155 },
                { x: -130, h: 115 },
                { x: 195,  h: 145 }
            ];
            pyramids.forEach(py => {
                ctx.fillStyle = '#e09f3e';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x - py.h, horizonY);
                ctx.lineTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.2, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#b5651d';
                ctx.beginPath();
                ctx.moveTo(centerX + py.x, horizonY - py.h);
                ctx.lineTo(centerX + py.x + py.h * 0.2, horizonY);
                ctx.lineTo(centerX + py.x + py.h, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });

        } else if (this.stage === 3) {
            // 🦈 3단계 해저: 수면 빛내림, 침몰한 해적선 실루엣, 물방울 기둥, 고래·상어·바다거북·해파리 떼!
            ctx.fillStyle = 'rgba(144, 224, 239, 0.16)';
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(centerX + i * 160, 0);
                ctx.lineTo(centerX + i * 210 - 45, horizonY);
                ctx.lineTo(centerX + i * 210 + 45, horizonY);
                ctx.closePath();
                ctx.fill();
            }

            // 수중 기포(물방울) 상승 연출
            ctx.strokeStyle = '#caf0f8';
            for (let b = 0; b < 12; b++) {
                const bx = centerX + ((b * 97) % 700) - 350;
                const by = horizonY - ((time * 45 + b * 35) % (horizonY - 20));
                ctx.beginPath();
                ctx.arc(bx, by, 5 + (b % 4) * 3, 0, Math.PI * 2);
                ctx.stroke();
            }

            // 유유히 헤엄치는 직접 그린 대왕고래, 백상아리, 바다거북, 열대어, 문어들! (이모티콘 일절 사용 안 함)
            const whaleX = centerX - 210 + Math.sin(time * 0.8) * 65;
            const whaleY = horizonY - 105;
            this.drawRealSeaCreature(ctx, whaleX, whaleY, 0.95, 2, time); // 대왕고래
            this.drawRealSeaCreature(ctx, centerX + 190 + Math.cos(time * 1.3) * 55, horizonY - 85, 0.85, 0, time); // 백상아리
            this.drawRealSeaCreature(ctx, centerX - 55 + Math.sin(time * 1.6) * 60, horizonY - 135, 0.72, 4, time); // 바다거북
            this.drawRealSeaCreature(ctx, centerX + 45 + Math.cos(time * 1.9) * 50, horizonY - 125, 0.75, 1, time); // 열대어

        } else if (this.stage === 4) {
            // 🌃 4단계 도시 (타임스퀘어 밤): 서치라이트 불빛, 고밀도 창문 빌딩 숲, 화려한 대형 전광판!
            // 밤하늘 서치라이트 2줄기
            ctx.fillStyle = 'rgba(255, 190, 11, 0.14)';
            [-1, 1].forEach(dir => {
                const sway = Math.sin(time * 1.8 + dir) * 140;
                ctx.beginPath();
                ctx.moveTo(centerX + dir * 240, horizonY);
                ctx.lineTo(centerX + dir * 240 + sway - 70, 0);
                ctx.lineTo(centerX + dir * 240 + sway + 70, 0);
                ctx.closePath();
                ctx.fill();
            });

            const buildings = [
                { x: -410, w: 92, h: 225, neon: '#ff007f', text: 'SMILE' },
                { x: -305, w: 86, h: 185, neon: '#00f5d4', text: 'TIMES SQ' },
                { x: -205, w: 78, h: 245, neon: '#ffbe0b', text: 'BROADWAY' },
                { x: -115, w: 70, h: 165, neon: '#3a86ff', text: 'NYC 24H' },
                { x: 115,  w: 78, h: 230, neon: '#8338ec', text: 'GAMES' },
                { x: 205,  w: 92, h: 195, neon: '#fb5607', text: 'MONKEY' },
                { x: 310,  w: 96, h: 240, neon: '#06d6a0', text: 'STAGE 4' }
            ];
            buildings.forEach(b => {
                const bx = centerX + b.x;
                const by = horizonY - b.h;
                ctx.fillStyle = '#151624';
                ctx.strokeStyle = '#000';
                ctx.fillRect(bx, by, b.w, b.h);
                ctx.strokeRect(bx, by, b.w, b.h);

                // 빌딩 유리창 불빛 그리드 디테일
                ctx.fillStyle = '#ffd166';
                for (let wy = by + 75; wy < horizonY - 15; wy += 18) {
                    for (let wx = bx + 10; wx < bx + b.w - 14; wx += 16) {
                        if ((wx + wy) % 3 !== 0) {
                            ctx.fillRect(wx, wy, 8, 10);
                        }
                    }
                }

                // 타임스퀘어 대형 네온 전광판
                ctx.fillStyle = b.neon;
                ctx.fillRect(bx + 8, by + 16, b.w - 16, 44);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(bx + 8, by + 16, b.w - 16, 44);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 15px "Comic Neue", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(b.text, bx + b.w * 0.5, by + 43);
            });

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 사이버 균열 포털 & 디지털 번개
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, horizonY - 95, 72 + Math.sin(time * 15) * 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#00f5d4';
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
    // 🦌 직접 그리는 고디테일 동물 벡터 일러스트 함수들 (이모티콘 사용 금지!)
    // =========================================================================

    // 1단계 숲속 동물 5종 직접 그리기 (0:다람쥐, 1:산토끼, 2:꽃사슴, 3:붉은여우, 4:숲부엉이)
    drawRealForestAnimal(ctx, ax, ay, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        // 바닥 그림자
        ctx.fillStyle = 'rgba(26, 22, 18, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 26, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (kind === 0) {
            // 0: 다람쥐 (풍성하게 말린 줄무늬 꼬리 + 도토리 들고 있는 모습)
            // 큰 복슬복슬 꼬리
            ctx.fillStyle = '#b5651d';
            ctx.beginPath();
            ctx.moveTo(-8, -10);
            ctx.bezierCurveTo(-42, -5, -46, -55, -18, -52);
            ctx.bezierCurveTo(0, -50, -4, -22, -8, -10);
            ctx.fill();
            ctx.stroke();
            // 몸통
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.ellipse(0, -18, 16, 20, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 하얀 배
            ctx.fillStyle = '#fffcf2';
            ctx.beginPath();
            ctx.ellipse(6, -16, 8, 13, 0.1, 0, Math.PI * 2);
            ctx.fill();
            // 머리 & 귀
            ctx.fillStyle = '#d48c46';
            ctx.beginPath();
            ctx.arc(4, -38, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(-2, -50, 4, 7, -0.2, 0, Math.PI * 2);
            ctx.ellipse(8, -50, 4, 7, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 눈 & 코
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(9, -40, 2.5, 0, Math.PI * 2);
            ctx.arc(16, -36, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // 손에 든 도토리
            ctx.fillStyle = '#8d5b3c';
            ctx.beginPath();
            ctx.arc(16, -22, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#4a2c11';
            ctx.beginPath();
            ctx.arc(16, -25, 7.5, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

        } else if (kind === 1) {
            // 1: 산토끼 (쫑긋한 긴 귀 + 분홍 귀 안쪽 + 솜방울 꼬리)
            const hop = Math.abs(Math.sin(time * 6)) * 6;
            ctx.translate(0, -hop);
            // 솜방울 꼬리
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-18, -12, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 몸통
            ctx.fillStyle = '#fffcf7';
            ctx.beginPath();
            ctx.ellipse(0, -16, 18, 15, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 머리
            ctx.beginPath();
            ctx.arc(10, -30, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 긴 토끼 귀 2개
            [-1, 1].forEach(dir => {
                ctx.fillStyle = '#fffcf7';
                ctx.beginPath();
                ctx.ellipse(8 + dir * 4, -52, 5, 16, dir * 0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffafcc';
                ctx.beginPath();
                ctx.ellipse(8 + dir * 4, -52, 2.5, 11, dir * 0.15, 0, Math.PI * 2);
                ctx.fill();
            });
            // 루비 눈 & 분홍 코
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.arc(15, -32, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff758f';
            ctx.beginPath();
            ctx.arc(22, -28, 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2) {
            // 2: 꽃사슴 (가느다란 다리 + 하얀 반점 몸통 + 멋진 사슴 뿔)
            // 네 다리
            ctx.strokeStyle = '#8d5b3c';
            ctx.lineWidth = 4;
            [-12, -5, 8, 15].forEach(lx => {
                ctx.beginPath();
                ctx.moveTo(lx, -22);
                ctx.lineTo(lx, 2);
                ctx.stroke();
            });
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3;
            // 몸통
            ctx.fillStyle = '#c67d3b';
            ctx.beginPath();
            ctx.ellipse(0, -26, 24, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 하얀 꽃사슴 반점들
            ctx.fillStyle = '#fffcf2';
            [[-10, -28], [-2, -23], [6, -29], [-6, -20], [10, -22]].forEach(([sx, sy]) => {
                ctx.beginPath();
                ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
                ctx.fill();
            });
            // 긴 목과 머리
            ctx.fillStyle = '#c67d3b';
            ctx.beginPath();
            ctx.moveTo(12, -32);
            ctx.lineTo(18, -56);
            ctx.lineTo(26, -54);
            ctx.lineTo(20, -28);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(24, -58, 12, 9, 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 사슴 뿔 (Antlers)
            ctx.strokeStyle = '#5c3a21';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(20, -65);
            ctx.lineTo(16, -84);
            ctx.moveTo(18, -75);
            ctx.lineTo(10, -80);
            ctx.moveTo(25, -65);
            ctx.lineTo(28, -84);
            ctx.moveTo(27, -75);
            ctx.lineTo(35, -80);
            ctx.stroke();
            // 눈과 코
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(27, -59, 2.5, 0, Math.PI * 2);
            ctx.arc(35, -56, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 3: 붉은여우 (오렌지색 몸통 + 하얀 끝 풍성한 꼬리 + 뾰족한 귀)
            // 여우 꼬리
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.ellipse(-24, -18, 18, 9, -0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-36, -24, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 여우 몸통
            ctx.fillStyle = '#e76f51';
            ctx.beginPath();
            ctx.ellipse(0, -18, 20, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 머리 (역삼각형 여우 얼굴)
            ctx.beginPath();
            ctx.moveTo(4, -44);
            ctx.lineTo(24, -44);
            ctx.lineTo(16, -24);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 뾰족한 검은 끝 귀
            ctx.fillStyle = '#264653';
            ctx.beginPath();
            ctx.moveTo(5, -44);
            ctx.lineTo(9, -56);
            ctx.lineTo(13, -44);
            ctx.moveTo(16, -44);
            ctx.lineTo(20, -56);
            ctx.lineTo(24, -44);
            ctx.fill();
            ctx.stroke();
            // 눈
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(11, -37, 2.2, 0, Math.PI * 2);
            ctx.arc(18, -37, 2.2, 0, Math.PI * 2);
            ctx.arc(16, -25, 3, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 4: 숲부엉이 (둥근 갈색 몸통 + 깃털 무늬 + 왕방울 노란 눈 + 부리)
            ctx.fillStyle = '#7f5539';
            ctx.beginPath();
            ctx.ellipse(0, -26, 20, 24, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 배 깃털 패턴
            ctx.fillStyle = '#ddb892';
            ctx.beginPath();
            ctx.ellipse(0, -20, 13, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            // 부엉이 귀 깃털
            ctx.fillStyle = '#5c3a21';
            ctx.beginPath();
            ctx.moveTo(-14, -44);
            ctx.lineTo(-22, -56);
            ctx.lineTo(-6, -48);
            ctx.moveTo(14, -44);
            ctx.lineTo(22, -56);
            ctx.lineTo(6, -48);
            ctx.fill();
            ctx.stroke();
            // 커다란 황금 눈 2개
            [-8, 8].forEach(ex => {
                ctx.fillStyle = '#ffbe0b';
                ctx.beginPath();
                ctx.arc(ex, -36, 7.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -36, 3.5, 0, Math.PI * 2);
                ctx.fill();
            });
            // 부리
            ctx.fillStyle = '#fb8500';
            ctx.beginPath();
            ctx.moveTo(-4, -32);
            ctx.lineTo(4, -32);
            ctx.lineTo(0, -25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    // 2단계 사막 동물 5종 직접 그리기 (0:사막전갈, 1:사막여우, 2:단봉낙타, 3:쌍봉낙타, 4:사막도마뱀)
    drawRealDesertAnimal(ctx, ax, ay, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        ctx.fillStyle = 'rgba(26, 22, 18, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (kind === 0) {
            // 0: 사막전갈 (집게발 + 마디 꼬리 + 독침)
            ctx.fillStyle = '#9b2226';
            ctx.beginPath();
            ctx.ellipse(0, -14, 20, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 마디 꼬리
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = '#bb3e03';
                ctx.beginPath();
                ctx.arc(-10 - i * 4, -26 - i * 9, 6 - i * 0.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            // 독침
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.moveTo(-22, -62);
            ctx.lineTo(-10, -56);
            ctx.lineTo(-18, -50);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 양쪽 집게발
            [-14, 14].forEach(px => {
                ctx.fillStyle = '#ae2012';
                ctx.beginPath();
                ctx.arc(px, -6, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

        } else if (kind === 1) {
            // 1: 사막여우 (페넥여우 특유의 엄청 큰 귀 + 크림색 털)
            ctx.fillStyle = '#f4e285';
            ctx.beginPath();
            ctx.ellipse(-20, -14, 15, 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, -16, 18, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 머리
            ctx.beginPath();
            ctx.arc(10, -30, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 페넥여우 특유의 초대형 귀 2개!
            [-1, 1].forEach(dir => {
                ctx.fillStyle = '#f4e285';
                ctx.beginPath();
                ctx.ellipse(10 + dir * 10, -48, 8, 18, dir * 0.45, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffcad4';
                ctx.beginPath();
                ctx.ellipse(10 + dir * 10, -48, 4.5, 12, dir * 0.45, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(7, -30, 2.5, 0, Math.PI * 2);
            ctx.arc(15, -30, 2.5, 0, Math.PI * 2);
            ctx.arc(12, -23, 2.8, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2 || kind === 3) {
            // 2: 단봉낙타 / 3: 쌍봉낙타 (긴 다리 + 혹 1개 또는 2개 + 긴 목)
            ctx.strokeStyle = '#99582a';
            ctx.lineWidth = 4.5;
            [-14, -6, 8, 16].forEach(lx => {
                ctx.beginPath();
                ctx.moveTo(lx, -26);
                ctx.lineTo(lx, 2);
                ctx.stroke();
            });
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3;
            ctx.fillStyle = kind === 2 ? '#dda15e' : '#b07d4f';
            // 몸통
            ctx.beginPath();
            ctx.ellipse(0, -30, 26, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 낙타 혹 (단봉 vs 쌍봉)
            if (kind === 2) {
                ctx.beginPath();
                ctx.arc(0, -46, 14, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
            } else {
                [-9, 9].forEach(hx => {
                    ctx.beginPath();
                    ctx.arc(hx, -45, 10, Math.PI, 0);
                    ctx.fill();
                    ctx.stroke();
                });
            }
            // U자형 긴 목과 머리
            ctx.beginPath();
            ctx.moveTo(18, -32);
            ctx.quadraticCurveTo(30, -32, 28, -58);
            ctx.lineTo(20, -58);
            ctx.quadraticCurveTo(20, -40, 14, -36);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(28, -62, 11, 7, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(30, -64, 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // 4: 사막 목도리도마뱀 (초록/황토 비늘 몸통 + 펼쳐진 목도리 프릴 + 긴 꼬리)
            ctx.fillStyle = '#a3b18a';
            ctx.beginPath();
            ctx.moveTo(-12, -12);
            ctx.quadraticCurveTo(-40, -4, -46, -24);
            ctx.quadraticCurveTo(-34, -10, -12, -18);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, -15, 18, 10, -0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 목도리 프릴
            ctx.fillStyle = '#f4a261';
            ctx.beginPath();
            ctx.arc(14, -24, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 도마뱀 머리
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.ellipse(18, -24, 10, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(21, -26, 2.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 3단계 해저 생물 5종 직접 그리기 (0:백상아리, 1:열대어, 2:대왕고래, 3:바다문어, 4:바다거북)
    drawRealSeaCreature(ctx, ax, ay, scale, kind, time) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        const tailWag = Math.sin(time * 7 + kind) * 6;

        if (kind === 0) {
            // 0: 백상아리 (유선형 회청색 상어 몸통 + 등지느러미 + 아가미 + 날카로운 이빨)
            ctx.fillStyle = '#457b9d';
            ctx.beginPath();
            ctx.moveTo(-36, tailWag);
            ctx.lineTo(-48, -14 + tailWag);
            ctx.lineTo(-44, 14 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 등지느러미
            ctx.beginPath();
            ctx.moveTo(-6, -12);
            ctx.lineTo(4, -32);
            ctx.lineTo(14, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 상어 몸통
            ctx.beginPath();
            ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 하얀 배
            ctx.fillStyle = '#f1faee';
            ctx.beginPath();
            ctx.ellipse(2, 5, 26, 7, 0, 0, Math.PI);
            ctx.fill();
            // 눈 & 아가미 줄 3개
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(22, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            for (let g = 0; g < 3; g++) {
                ctx.beginPath();
                ctx.moveTo(8 + g * 4, -5);
                ctx.lineTo(8 + g * 4, 4);
                ctx.stroke();
            }

        } else if (kind === 1) {
            // 1: 열대어 (주황/하얀 줄무늬 흰동가리 니모 스타일)
            ctx.fillStyle = '#fb5607';
            ctx.beginPath();
            ctx.moveTo(-18, 0);
            ctx.lineTo(-30, -12 + tailWag * 0.6);
            ctx.lineTo(-30, 12 + tailWag * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 하얀 줄무늬 2개
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-8, -13, 6, 26);
            ctx.strokeRect(-8, -13, 6, 26);
            ctx.fillRect(5, -12, 6, 24);
            ctx.strokeRect(5, -12, 6, 24);
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(15, -3, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 2) {
            // 2: 대왕고래 (거대한 푸른 고래 몸통 + 주름진 하얀 배 + 머리 위 분수 물줄기!)
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(-42, tailWag);
            ctx.lineTo(-58, -16 + tailWag);
            ctx.lineTo(-54, 16 + tailWag);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(0, 0, 42, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // 하얀 주름 배
            ctx.fillStyle = '#caf0f8';
            ctx.beginPath();
            ctx.ellipse(6, 7, 30, 10, 0, 0, Math.PI);
            ctx.fill();
            ctx.stroke();
            // 고래 머리 위 물줄기 분수
            ctx.strokeStyle = '#90e0ef';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(12, -20);
            ctx.quadraticCurveTo(4, -38, -8, -34);
            ctx.moveTo(12, -20);
            ctx.quadraticCurveTo(20, -38, 30, -34);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(24, -4, 3.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (kind === 3) {
            // 3: 바다문어 (둥근 붉은 머리 + 꿈틀거리는 다리 6가닥)
            ctx.fillStyle = '#e63946';
            for (let t = -2; t <= 2; t++) {
                const wave = Math.sin(time * 8 + t) * 5;
                ctx.beginPath();
                ctx.moveTo(t * 7, 4);
                ctx.quadraticCurveTo(t * 11 + wave, 18, t * 9 - wave, 28);
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#e63946';
                ctx.stroke();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#1a1612';
                ctx.stroke();
            }
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -8, 19, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            [-6, 6].forEach(ex => {
                ctx.beginPath();
                ctx.arc(ex, -6, 4.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#1a1612';
                ctx.beginPath();
                ctx.arc(ex, -6, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#fff';
            });

        } else {
            // 4: 바다거북 (육각형 등껍질 + 초록 지느러미 발 + 머리)
            ctx.fillStyle = '#52b788';
            // 앞뒤 지느러미 발
            ctx.beginPath();
            ctx.ellipse(10, -16, 7, 14, -0.5, 0, Math.PI * 2);
            ctx.ellipse(10, 16, 7, 14, 0.5, 0, Math.PI * 2);
            ctx.ellipse(-16, -12, 5, 10, 0.5, 0, Math.PI * 2);
            ctx.ellipse(-16, 12, 5, 10, -0.5, 0, Math.PI * 2);
            ctx.ellipse(26, 0, 9, 7, 0, 0, Math.PI * 2); // 머리
            ctx.fill();
            ctx.stroke();
            // 거북이 등껍질
            ctx.fillStyle = '#2d6a4f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = '#95d5b2';
            ctx.lineWidth = 2;
            ctx.strokeRect(-10, -7, 20, 14);
            ctx.fillStyle = '#1a1612';
            ctx.beginPath();
            ctx.arc(29, -2, 2.2, 0, Math.PI * 2);
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
            // 손오공 금관 직접 그리기
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
        if (obs.type === 'ramp') {
            ctx.fillStyle = 'rgba(6, 214, 160, 0.22)';
            ctx.strokeStyle = '#06d6a0';
            ctx.lineWidth = 3;
            ctx.strokeRect(-58, -14, 116, 24);
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

        if (obs.type === 'ramp') {
            // 🪜 3D 입체 웨지(Wedge) 등반 경사로 플랫폼
            // 1) 옆면 3D 삼각 기둥 벽면
            ctx.fillStyle = '#1d3557';
            ctx.beginPath();
            ctx.moveTo(72, 0);
            ctx.lineTo(56, -92);
            ctx.lineTo(56 + dx, -92 + dy);
            ctx.lineTo(72 + dx, dy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 2) 윗면 3D 상판 데크
            ctx.fillStyle = '#90e0ef';
            ctx.beginPath();
            ctx.moveTo(-56, -92);
            ctx.lineTo(-56 + dx, -92 + dy);
            ctx.lineTo(56 + dx, -92 + dy);
            ctx.lineTo(56, -92);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 3) 정면 경사로 슬로프
            ctx.fillStyle = '#4ea8de';
            ctx.beginPath();
            ctx.moveTo(-72, 0);
            ctx.lineTo(-56, -92);
            ctx.lineTo(56, -92);
            ctx.lineTo(72, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.moveTo(0, -78);
            ctx.lineTo(-34, -22);
            ctx.lineTo(34, -22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('⏫ 위로 올라가!', 0, -112);
            ctx.fillText('⏫ 위로 올라가!', 0, -112);

        } else if (obs.type === 'rolling_stone') {
            // 🪨 [1단계 숲 전용]: 3D 다면체 음영이 살아있는 거대 암석 바위!
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
            rockGrad.addColorStop(0, '#b7b7a4');
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

            // 3D 폴리곤 면 분할(하이라이트 면 + 섀도우 면)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.beginPath();
            ctx.moveTo(-38, -54);
            ctx.lineTo(-6, -64);
            ctx.lineTo(14, -18);
            ctx.lineTo(-32, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
            ctx.beginPath();
            ctx.moveTo(14, -18);
            ctx.lineTo(64, 12);
            ctx.lineTo(44, 48);
            ctx.lineTo(-10, 35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

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
            // 🦂 [2단계 사막 전용]: 3D 입체 갑각류 쉐이딩의 거대 사막 전갈!
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

            // 3D 전갈 몸통 (구형 그라데이션 입체 갑옷)
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

            // 3D 독침 꼬리 마디
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

            // 양쪽 3D 입체 집게발
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

            // 3D 등지느러미 & 양옆 가슴지느러미
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

            // 3D 구형 입체 상어 몸통
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
            // 🚕 [4단계 도시 전용]: 3D 입체 차체(보닛 윗면 + 옆면 차문 + 지붕)를 갖춘 타임스퀘어 택시!
            ctx.fillStyle = 'rgba(255, 243, 176, 0.38)';
            ctx.beginPath();
            ctx.moveTo(-42, -20);
            ctx.lineTo(-85, 35);
            ctx.lineTo(85, 35);
            ctx.lineTo(42, -20);
            ctx.closePath();
            ctx.fill();

            // 타이어 바퀴
            ctx.fillStyle = '#212529';
            ctx.fillRect(-68, -28, 22, 28);
            ctx.strokeRect(-68, -28, 22, 28);
            ctx.fillRect(46, -28, 22, 28);
            ctx.strokeRect(46, -28, 22, 28);

            // 1) 3D 자동차 하단 보닛/범퍼 박스
            this.draw3DBox(ctx, 0, -16, 134, 48, dx, dy * 0.8, '#ffbe0b', '#ffea79', '#d48c00');

            // 2) 3D 자동차 상단 운전석 캐빈 박스
            this.draw3DBox(ctx, 0, -64, 102, 44, dx * 0.85, dy * 0.7, '#ffbe0b', '#fff3b0', '#c97a00');

            // 앞유리창
            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(-42, -102, 84, 32);
            ctx.strokeRect(-42, -102, 84, 32);

            // 3D TAXI 지붕 사인보드
            this.draw3DBox(ctx, 0, -108, 50, 16, dx * 0.4, dy * 0.4, '#ffffff', '#e9ecef', '#adb5bd');
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('TAXI', 0, -114);

            // 헤드라이트 & 그릴
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
            // 직접 그린 사이버 글리치 눈과 픽셀 입
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
            // 🚧 3D 입체 점프 허들 바리케이드
            this.draw3DBox(ctx, -58, 0, 18, 64, dx * 0.5, dy * 0.5, '#e76f51', '#f4a261', '#9c3d24');
            this.draw3DBox(ctx, 58, 0, 18, 64, dx * 0.5, dy * 0.5, '#e76f51', '#f4a261', '#9c3d24');
            this.draw3DBox(ctx, 0, -38, 154, 28, dx * 0.6, dy * 0.6, '#fcbf49', '#ffea79', '#d48c00');

            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.fillText('🚧 점프 허들!', 0, -49);

        } else if (obs.type === 'moving_barrier') {
            // ⚙️ 3D 입체 좌우 이동 기물!
            this.draw3DBox(ctx, 0, 0, 124, 74, dx * 0.8, dy * 0.8, '#7209b7', '#b5179e', '#3a0ca3');
            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.fillText('◀▶ 3D 이동 기물!', 0, -34);

        } else if (obs.type === 'log') {
            // 🪵 3D 원기둥 통나무 (옆면 나이테 단면 포함!)
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

            // 통나무 오른쪽 3D 나이테 단면
            ctx.fillStyle = '#e6ccb2';
            ctx.beginPath();
            ctx.ellipse(64, -27, 14, 25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.roundRect(-42, -90, 84, 26, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.fillText('▲ 점프!', 0, -73);

        } else if (obs.type === 'arch') {
            // ⛩️ 3D 입체 슬라이드 아치 관문
            this.draw3DBox(ctx, -70, 0, 26, 230, dx, dy, '#cbb183', '#e6d2ab', '#8d7752');
            this.draw3DBox(ctx, 70, 0, 26, 230, dx, dy, '#cbb183', '#e6d2ab', '#8d7752');
            this.draw3DBox(ctx, 0, -115, 184, 120, dx, dy, '#d64531', '#e76f51', '#9b2226');

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.fillText('▼ 슬라이드 통과!', 0, -168);

        } else if (obs.type === 'pillar') {
            // 🏛️ 3D 입체 사각 기둥
            this.draw3DBox(ctx, 0, 0, 88, 215, dx, dy, '#9c8565', '#c8b08a', '#6c584c');

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

        // 스테이지가 바뀔 때마다 화면 중앙으로 큼직하게 지나가는 스테이지 전환 배너 연출!
        if (this.stageBanner) {
            const sb = this.stageBanner;
            const p = sb.elapsed / sb.duration; // 0 ~ 1
            let offsetX = 0;
            if (p < 0.20) {
                // 오른쪽에서 중앙으로 빠르게 진입
                const t = 1 - Math.pow(1 - p / 0.20, 3);
                offsetX = (1 - t) * (width * 0.95);
            } else if (p < 0.78) {
                // 중앙에서 천천히 이동하며 플레이어가 큰 글씨를 확실히 읽게 함
                const t = (p - 0.20) / 0.58;
                offsetX = (0.5 - t) * 90;
            } else {
                // 왼쪽으로 시원하게 빠져나감
                const t = Math.pow((p - 0.78) / 0.22, 3);
                offsetX = -45 - t * (width * 1.05);
            }

            const cx = width * 0.5 + offsetX;
            const cy = height * 0.43;
            const bannerW = Math.min(width * 0.88, 780);
            const bannerH = 136;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(-0.025); // 역동적인 사선 기울기

            // 그림자 및 배경 리본 박스
            ctx.fillStyle = 'rgba(26, 22, 18, 0.88)';
            ctx.strokeStyle = sb.bgColor;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.roundRect(-bannerW * 0.5, -bannerH * 0.5, bannerW, bannerH, 24);
            ctx.fill();
            ctx.stroke();

            // 상단/하단 포인트 라인
            ctx.fillStyle = sb.bgColor;
            ctx.fillRect(-bannerW * 0.46, -bannerH * 0.5 + 10, bannerW * 0.92, 6);
            ctx.fillRect(-bannerW * 0.46, bannerH * 0.5 - 16, bannerW * 0.92, 6);

            // 초대형 스테이지 타이틀 글씨
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 58px "Comic Neue", "Gaegu", sans-serif';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 9;
            ctx.strokeText(sb.title, 0, -14);
            ctx.fillStyle = '#fffcf5';
            ctx.fillText(sb.title, 0, -14);

            // 서브타이틀 설명 글씨
            ctx.font = 'bold 28px "Gaegu", sans-serif';
            ctx.fillStyle = sb.bgColor;
            ctx.fillText(sb.subtitle, 0, 36);

            ctx.restore();
        }
    }
}
