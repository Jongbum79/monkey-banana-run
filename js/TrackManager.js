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

        this.coinSpawnTimer -= dt * gameSpeed * (1 + (this.stage - 1) * 0.08);
        if (this.coinSpawnTimer <= 0 && !mathGateActive) {
            this.spawnCoinLine();
            this.coinSpawnTimer = 1.5 + Math.random() * 0.7;
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
                if (obs.z > 0.72 && obs.z < 1.02 && Math.abs(hero.laneX - obs.lane) < 0.46) {
                    onRampNow = true;
                    if (!obs.passed) {
                        obs.passed = true;
                        callbacks.onRampClimb(obs);
                    }
                }
            } else if (!obs.hit && !obs.passed && obs.z > 0.83 && obs.z < 0.95) {
                if (Math.abs(hero.laneX - obs.lane) < 0.44) {
                    let avoided = false;
                    const totalHeroHeight = hero.y + hero.platformY;

                    if (
                        (obs.type === 'log' || obs.type === 'hurdle' || isChaser || obs.type === 'moving_barrier') &&
                        totalHeroHeight > 54
                    ) {
                        avoided = true;
                    } else if ((obs.type === 'arch' || obs.type === 'pillar') && totalHeroHeight > 145) {
                        // 슈퍼점프 중에는 높은 아치나 기둥까지도 뛰어넘을 수 있음!
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
        // 다양한 기물 풀: 등반 경사로(ramp), 스테이지별 돌진 기물(돌/전갈/상어/차), 통나무(log), 허들(hurdle), 아치(arch), 기둥(pillar), 좌우 이동 바리케이드(moving_barrier)
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

        // 2단계 이상부터는 일정 확률로 다른 레인에 보조 기물을 함께 배치하여 박진감 강화!
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

        // 스테이지별 돌진 기물 사운드 콜백 호출!
        if (this.isMovingChaserType(chosenType) && callbacks && callbacks.onChaserSpawn) {
            callbacks.onChaserSpawn(chosenType);
        }

        // 경사로(ramp) 위에는 코인 3개 배치 (방패가 너무 자주 나오지 않도록 경사로 위에는 코인이나 가끔 슈퍼점프만 배치)
        if (chosenType === 'ramp') {
            for (let k = 0; k < 3; k++) {
                let rampItem = 'coin';
                if (k === 2 && Math.random() < 0.22) {
                    rampItem = 'super_jump';
                }
                this.items.push({
                    lane: chosenLane,
                    z: 0.03 - k * 0.04,
                    type: rampItem,
                    onRamp: true,
                    collected: false
                });
            }
        }
    }

    spawnCoinLine() {
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const count = 4;
        for (let i = 0; i < count; i++) {
            let itemType = 'coin';
            if (i === count - 1) {
                const r = Math.random();
                // 방패 빈도를 대폭 줄이고(7%), 슈퍼점프(14%)와 손오공 진화(12%), 바나나(15%)를 골고루 스폰!
                if (r < 0.07) itemType = 'shield';
                else if (r < 0.21) itemType = 'super_jump';
                else if (r < 0.33) itemType = 'wukong';
                else if (r < 0.48) itemType = 'banana';
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

        // 4. 원근 3레인 도로
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

        // 타일 스크롤
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

            for (let col = -1; col <= 1; col++) {
                const x1L = centerX + (col - 0.44) * (w1 / 3);
                const x1R = centerX + (col + 0.44) * (w1 / 3);
                const x2R = centerX + (col + 0.44) * (w2 / 3);
                const x2L = centerX + (col - 0.44) * (w2 / 3);

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

            // 유유히 헤엄치는 대왕고래, 상어, 바다거북, 열대어들
            const whaleX = centerX - 210 + Math.sin(time * 0.8) * 65;
            const whaleY = horizonY - 115;
            ctx.font = 'bold 58px sans-serif';
            ctx.fillText('🐋', whaleX, whaleY);
            ctx.fillText('🦈', centerX + 190 + Math.cos(time * 1.3) * 55, horizonY - 90);
            ctx.font = 'bold 38px sans-serif';
            ctx.fillText('🐢 🐠 🐡 🐙', centerX - 40 + Math.sin(time * 1.6) * 70, horizonY - 140);

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
            // 🌲 1단계 숲: 다층 수관 나무 + 꽃덤불 + 숲속 동물들(다람쥐, 산토끼, 꽃사슴, 여우, 부엉이)
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

            const animals = ['🐿️', '🐇', '🦌', '🦊', '🦉'];
            const animalNames = ['다람쥐', '산토끼', '꽃사슴', '붉은여우', '숲부엉이'];
            ctx.font = 'bold 58px sans-serif';
            ctx.fillText(animals[variant % 5], -side * 58, -25 + bob);
            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(animalNames[variant % 5], -side * 58, 8);

        } else if (this.stage === 2) {
            // 🌵 2단계 사막: 꽃 핀 선인장 & 오아시스 야자수 + 전갈, 사막여우, 단봉낙타, 쌍봉낙타
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.roundRect(-16, -145, 32, 145, 14);
            ctx.roundRect(-48, -110, 32, 22, 10);
            ctx.roundRect(-48, -140, 20, 45, 10);
            ctx.roundRect(16, -95, 32, 22, 10);
            ctx.roundRect(28, -130, 20, 50, 10);
            ctx.fill();
            ctx.stroke();

            const desertAnimals = ['🦂', '🦊', '🐪', '🐫', '🦎'];
            const desertLabels = ['사막전갈', '사막여우', '단봉낙타', '쌍봉낙타', '사막도마뱀'];
            ctx.font = 'bold 62px sans-serif';
            ctx.fillText(desertAnimals[variant % 5], -side * 65, -24 + bob);
            ctx.fillStyle = '#fff3b0';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(desertLabels[variant % 5], -side * 65, 10);

        } else if (this.stage === 3) {
            // 🦈 3단계 해저: 다채로운 산호초와 해초 + 상어, 열대어, 고래, 문어, 바다거북
            ctx.fillStyle = variant % 2 === 0 ? '#ff6b6b' : '#ff9f1c';
            ctx.beginPath();
            ctx.roundRect(-16, -130, 32, 130, 14);
            ctx.roundRect(-44, -95, 28, 65, 12);
            ctx.roundRect(16, -105, 28, 75, 12);
            ctx.fill();
            ctx.stroke();

            const seaCreatures = ['🦈', '🐠', '🐋', '🐙', '🐢'];
            const seaLabels = ['백상아리', '열대어', '대왕고래', '바다문어', '바다거북'];
            ctx.font = 'bold 64px sans-serif';
            ctx.fillText(seaCreatures[variant % 5], -side * 65, -55 + bob * 1.8);
            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(seaLabels[variant % 5], -side * 65, -12);

        } else if (this.stage === 4) {
            // 🌆 4단계 도시 (타임스퀘어 밤): 네온 광고판 타워 & 가로등 & 타임스퀘어 택시
            ctx.fillStyle = '#2b2d42';
            ctx.fillRect(-45, -215, 90, 215);
            ctx.strokeRect(-45, -215, 90, 215);

            ctx.fillStyle = variant % 2 === 0 ? '#ff007f' : '#00f5d4';
            ctx.fillRect(-36, -190, 72, 58);
            ctx.strokeRect(-36, -190, 72, 58);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 19px "Comic Neue", sans-serif';
            ctx.fillText(variant % 2 === 0 ? 'TIMES SQ' : 'NYC TAXI', 0, -155);

            ctx.font = 'bold 54px sans-serif';
            ctx.fillText('🚕', -side * 65, -18);

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 깨진 디지털 기둥 & 에러 홀로그램
            const glitchShift = (Math.random() - 0.5) * 20;
            ctx.fillStyle = variant % 2 === 0 ? '#ff007f' : '#00f5d4';
            ctx.fillRect(-30 + glitchShift, -195, 60, 195);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px monospace';
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
        ctx.save();
        ctx.translate(p.x, p.y - 26 * p.scale - bounce - rampOffset);
        ctx.scale(p.scale, p.scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (item.type === 'coin') {
            ctx.fillStyle = '#d4a62a';
            ctx.beginPath();
            ctx.ellipse(6, 0, 24, 34, 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f6d54a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 24, 34, 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else if (item.type === 'banana') {
            ctx.fillStyle = '#ffea79';
            ctx.beginPath();
            ctx.arc(0, 0, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('🍌', 0, 2);

        } else if (item.type === 'shield') {
            // 🛡️ 무적 방패 아이템 (3.2초)
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 56);
            glow.addColorStop(0, 'rgba(0, 245, 212, 0.85)');
            glow.addColorStop(1, 'rgba(0, 245, 212, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 56, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#00b4d8';
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('🛡️', 0, 2);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.strokeText('무적 방패!', 0, -48);
            ctx.fillText('무적 방패!', 0, -48);

        } else if (item.type === 'super_jump') {
            // 🚀 신규 아이템 1: 슈퍼점프 5초!
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 58);
            glow.addColorStop(0, 'rgba(0, 245, 212, 0.9)');
            glow.addColorStop(1, 'rgba(0, 187, 249, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 58, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#06d6a0';
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText('🚀', 0, 2);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.strokeText('슈퍼점프 5초!', 0, -50);
            ctx.fillText('슈퍼점프 5초!', 0, -50);

        } else if (item.type === 'wukong') {
            // 👑 신규 아이템 2: 손오공 진화 (체력 올리기)!
            const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
            glow.addColorStop(0, 'rgba(255, 190, 11, 0.95)');
            glow.addColorStop(1, 'rgba(251, 86, 7, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(0, 0, 64, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.arc(0, 0, 42, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 38px sans-serif';
            ctx.fillText('👑', 0, 2);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.strokeText('손오공 진화(체력UP)!', 0, -52);
            ctx.fillText('손오공 진화(체력UP)!', 0, -52);
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

        if (obs.type === 'ramp') {
            // 🪜 톰 골드런 스타일 위로 올라가 달릴 수 있는 경사로 플랫폼
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
            ctx.strokeText('⏫ 위로 올라가!', 0, -105);
            ctx.fillText('⏫ 위로 올라가!', 0, -105);

        } else if (obs.type === 'rolling_stone') {
            // 🪨 [1단계 숲 전용]: 울퉁불퉁한 다각형 암석 질감, 깊은 균열, 이끼가 낀 진짜 바위!
            ctx.fillStyle = 'rgba(26, 22, 18, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 8, 72, 20, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(0, -60);
            ctx.rotate(obs.rot || time * 9);

            // 울퉁불퉁한 10각형 암석 외곽선
            const rockPts = [
                [-58, -18], [-38, -54], [-6, -64], [32, -56], [58, -28],
                [64, 12], [44, 48], [8, 62], [-34, 54], [-62, 22]
            ];
            const rockGrad = ctx.createRadialGradient(-18, -22, 10, 0, 0, 68);
            rockGrad.addColorStop(0, '#a5a58d');
            rockGrad.addColorStop(0.55, '#6b705c');
            rockGrad.addColorStop(1, '#3f4238');
            ctx.fillStyle = rockGrad;

            ctx.beginPath();
            rockPts.forEach(([rx, ry], idx) => {
                if (idx === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 암석 내부 입체 면 분할(Facet Planes)과 짙은 균열(Cracks)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.beginPath();
            ctx.moveTo(-38, -54);
            ctx.lineTo(-6, -64);
            ctx.lineTo(12, -18);
            ctx.lineTo(-32, -12);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.moveTo(12, -18);
            ctx.lineTo(64, 12);
            ctx.lineTo(44, 48);
            ctx.lineTo(-10, 35);
            ctx.closePath();
            ctx.fill();

            // 바위 표면 크랙 & 숲속 이끼 디테일
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(-32, -22);
            ctx.lineTo(-4, -6);
            ctx.lineTo(24, -26);
            ctx.moveTo(-4, -6);
            ctx.lineTo(14, 28);
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
            ctx.strokeText('🪨 굴러오는 바위!', 0, -132);
            ctx.fillText('🪨 굴러오는 바위!', 0, -132);

        } else if (obs.type === 'desert_scorpion') {
            // 🦂 [2단계 사막 전용]: 집게발을 딱딱거리며 다가오는 거대 사막 전갈!
            const scurry = Math.sin(time * 18) * 6;
            ctx.fillStyle = 'rgba(26, 22, 18, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 70, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // 전갈 다리 8개
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

            // 전갈 몸통 갑옷
            ctx.fillStyle = '#99582a';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(0, -34, 42, 28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 높이 치켜든 독침 꼬리 (Segmented Stinger Tail)
            ctx.fillStyle = '#bb3e03';
            for (let s = 0; s < 4; s++) {
                ctx.beginPath();
                ctx.arc(Math.sin(time * 10) * 6, -65 - s * 18, 14 - s * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            // 날카로운 붉은 독침
            ctx.fillStyle = '#e63946';
            ctx.beginPath();
            ctx.moveTo(0, -135);
            ctx.lineTo(-14, -118);
            ctx.lineTo(14, -118);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 양쪽 거대 집게발 (Pincers)
            [-1, 1].forEach(side => {
                ctx.fillStyle = '#ae2012';
                ctx.beginPath();
                ctx.arc(side * (48 + scurry * 0.4), -22, 22, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🦂 독침 전갈 습격!', 0, -152);
            ctx.fillText('🦂 독침 전갈 습격!', 0, -152);

        } else if (obs.type === 'undersea_shark') {
            // 🦈 [3단계 해저 전용]: 날카로운 이빨을 드러내고 헤엄쳐 오는 거대 백상아리!
            const swimX = Math.sin(time * 12) * 8;
            ctx.save();
            ctx.translate(swimX, 0);

            // 물보라 링
            ctx.strokeStyle = '#90e0ef';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 76, 20, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 등지느러미 (Dorsal Fin)
            ctx.fillStyle = '#1d3557';
            ctx.strokeStyle = '#1a1612';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-18, -88);
            ctx.lineTo(0, -142);
            ctx.lineTo(22, -88);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 상어 머리/몸통 정면 실루엣
            ctx.fillStyle = '#457b9d';
            ctx.beginPath();
            ctx.arc(0, -52, 56, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 하얀 배 & 벌어진 입과 뾰족한 이빨들
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

            // 뾰족한 상어 이빨
            ctx.fillStyle = '#ffffff';
            for (let t = -22; t <= 22; t += 11) {
                ctx.beginPath();
                ctx.moveTo(t - 5, -54);
                ctx.lineTo(t, -42);
                ctx.lineTo(t + 5, -54);
                ctx.fill();
            }

            // 분노한 노란 눈
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
            // 🚕 [4단계 도시 전용]: 헤드라이트를 번쩍이며 달려오는 타임스퀘어 택시 자동차!
            // 바닥 헤드라이트 불빛 콘
            ctx.fillStyle = 'rgba(255, 243, 176, 0.38)';
            ctx.beginPath();
            ctx.moveTo(-42, -20);
            ctx.lineTo(-85, 35);
            ctx.lineTo(85, 35);
            ctx.lineTo(42, -20);
            ctx.closePath();
            ctx.fill();

            // 타이어 바퀴 2개
            ctx.fillStyle = '#212529';
            ctx.fillRect(-68, -28, 22, 28);
            ctx.strokeRect(-68, -28, 22, 28);
            ctx.fillRect(46, -28, 22, 28);
            ctx.strokeRect(46, -28, 22, 28);

            // 택시 차체 하단 범퍼 & 보닛
            ctx.fillStyle = '#ffbe0b';
            ctx.beginPath();
            ctx.roundRect(-66, -68, 132, 48, 12);
            ctx.fill();
            ctx.stroke();

            // 택시 상단 캐빈 & 앞유리창
            ctx.beginPath();
            ctx.roundRect(-52, -110, 104, 46, [16, 16, 0, 0]);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#90e0ef';
            ctx.fillRect(-42, -102, 84, 32);
            ctx.strokeRect(-42, -102, 84, 32);

            // TAXI 지붕 사인보드
            ctx.fillStyle = '#fff';
            ctx.fillRect(-26, -126, 52, 16);
            ctx.strokeRect(-26, -126, 52, 16);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('TAXI', 0, -114);

            // 양쪽 강렬한 헤드라이트 & 라디에이터 그릴
            ctx.fillStyle = '#fff3b0';
            [-44, 44].forEach(hx => {
                ctx.beginPath();
                ctx.arc(hx, -44, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.fillStyle = '#343a40';
            ctx.fillRect(-22, -52, 44, 18);
            ctx.strokeRect(-22, -52, 44, 18);

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('🚕 달려오는 자동차!', 0, -138);
            ctx.fillText('🚕 달려오는 자동차!', 0, -138);

        } else if (obs.type === 'glitch_hazard') {
            // ⚡ [5단계 글리치 보이드 전용]: 치지직거리는 글리치 해골 스피드 큐브!
            ctx.save();
            ctx.translate(0, -58);
            ctx.rotate(obs.rot || time * 12);
            ctx.fillStyle = '#f72585';
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 4.5;
            ctx.fillRect(-48, -48, 96, 96);
            ctx.strokeRect(-48, -48, 96, 96);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText('👾', 0, 12);
            ctx.restore();

            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.strokeText('⚡ 글리치 큐브!', 0, -126);
            ctx.fillText('⚡ 글리치 큐브!', 0, -126);

        } else if (obs.type === 'hurdle') {
            // 🚧 신규 기물 1: 스테이지 테마 허들 바리케이드 (가시 덤불 / 네온 바리케이드)
            ctx.fillStyle = this.stage === 4 ? '#ff007f' : '#e76f51';
            ctx.fillRect(-68, -64, 16, 64);
            ctx.strokeRect(-68, -64, 16, 64);
            ctx.fillRect(52, -64, 16, 64);
            ctx.strokeRect(52, -64, 16, 64);

            ctx.fillStyle = '#fcbf49';
            ctx.fillRect(-76, -64, 152, 26);
            ctx.strokeRect(-76, -64, 152, 26);

            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.fillText('🚧 점프 허들!', 0, -45);

        } else if (obs.type === 'moving_barrier') {
            // ⚙️ 신규 기물 2: 트랙 좌우로 움직이는 회전 바리케이드!
            ctx.fillStyle = '#7209b7';
            ctx.beginPath();
            ctx.roundRect(-62, -72, 124, 72, 18);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#00f5d4';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.fillText('◀▶ 좌우 이동 기물!', 0, -32);

        } else if (obs.type === 'log') {
            ctx.fillStyle = '#8d5b3c';
            ctx.beginPath();
            ctx.roundRect(-74, -52, 148, 52, 22);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.roundRect(-42, -84, 84, 26, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.fillText('▲ 점프!', 0, -66);

        } else if (obs.type === 'arch') {
            ctx.fillStyle = '#cbb183';
            ctx.fillRect(-82, -230, 24, 230);
            ctx.strokeRect(-82, -230, 24, 230);
            ctx.fillRect(58, -230, 24, 230);
            ctx.strokeRect(58, -230, 24, 230);

            ctx.fillStyle = '#d64531';
            ctx.fillRect(-90, -235, 180, 120);
            ctx.strokeRect(-90, -235, 180, 120);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.fillText('▼ 슬라이드 통과!', 0, -165);

        } else if (obs.type === 'pillar') {
            ctx.fillStyle = '#9c8565';
            ctx.fillRect(-44, -210, 88, 210);
            ctx.strokeRect(-44, -210, 88, 210);

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
