/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 2 고도화] 5단계 스테이지(숲/사막/해저/타임스퀘어밤/글리치보이드 + 학교 엔딩) &
 * 톰 골드런 스타일 등반 경사로(ramp) + 굴러오는 바위(rolling_stone) + 무적 방패(shield)
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
        this.spawnTimer = 1.0;
        this.coinSpawnTimer = 0.4;
        this.sideProps = [
            { z: 0.15, variant: 0 },
            { z: 0.40, variant: 1 },
            { z: 0.65, variant: 2 },
            { z: 0.90, variant: 3 }
        ];
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
            const spd = 80 + Math.random() * 140;
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

    update(dt, gameSpeed, hero, mathGateActive, callbacks) {
        if (this.stage === 6) return; // 학교 엔딩 시 정지

        // 5단계 글리치 보이드는 가장 빠르고 긴장감 넘침
        const stageSpeedMult = this.stage === 5 ? 1.22 : (1 + (this.stage - 1) * 0.05);
        const dz = dt * gameSpeed * stageSpeedMult * 0.36;
        this.scrollDist += dz;

        this.sideProps.forEach(p => {
            p.z += dz;
            if (p.z > 1.15) p.z -= 1.15;
        });

        if (!mathGateActive) {
            this.spawnTimer -= dt * gameSpeed * stageSpeedMult;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern(callbacks);
                const baseInterval = this.stage === 5 ? 1.25 : 1.55;
                this.spawnTimer = baseInterval + Math.random() * 0.65;
            }
        }

        this.coinSpawnTimer -= dt * gameSpeed;
        if (this.coinSpawnTimer <= 0 && !mathGateActive) {
            this.spawnCoinLine();
            this.coinSpawnTimer = 1.6 + Math.random() * 0.8;
        }

        // 아이템 업데이트 및 충돌
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.z += dz;

            if (!item.collected && item.z > 0.81 && item.z < 0.97) {
                if (Math.abs(hero.laneX - item.lane) < 0.48) {
                    item.collected = true;
                    if (item.type === 'coin') callbacks.onCoin(item);
                    else if (item.type === 'banana') callbacks.onBananaBundle(item);
                    else if (item.type === 'shield') callbacks.onShield(item);
                }
            }
            if (item.z > 1.18) this.items.splice(i, 1);
        }

        // 톰 골드런 스타일 경사로 플랫폼(ramp) 위에 올라가 있는지 판정
        let onRampNow = false;

        // 장애물 업데이트 및 충돌
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            // 움직이는 돌(rolling_stone)은 나를 향해 더 빠르게 굴러옴!
            const extraSpeed = obs.type === 'rolling_stone' ? dz * 0.42 : 0;
            obs.z += dz + extraSpeed;
            if (obs.type === 'rolling_stone') {
                obs.rot = (obs.rot || 0) + dt * 10;
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
                    if ((obs.type === 'log' || obs.type === 'rolling_stone') && totalHeroHeight > 52) {
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
        // 톰 골드런 경사로(ramp)와 굴러오는 바위(rolling_stone)를 포함한 5종 패턴!
        const types = ['ramp', 'rolling_stone', 'log', 'arch', 'pillar'];
        const chosenLane = lanes[Math.floor(Math.random() * 3)];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        this.obstacles.push({
            lane: chosenLane,
            z: 0.04,
            type: chosenType,
            rot: 0,
            hit: false,
            passed: false
        });

        // 굴러오는 돌이 생성될 때 돌 구르는 소리 재생!
        if (chosenType === 'rolling_stone' && callbacks && callbacks.onRollingStoneSpawn) {
            callbacks.onRollingStoneSpawn();
        }

        // 경사로(ramp) 위에는 보너스 코인 3개와 특별 방패 아이템을 올려두어 올라가는 재미 극대화!
        if (chosenType === 'ramp') {
            for (let k = 0; k < 3; k++) {
                this.items.push({
                    lane: chosenLane,
                    z: 0.04 - k * 0.04,
                    type: k === 2 ? 'shield' : 'coin',
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
                // 방패 아이템 스폰 확률을 높여 플레이어가 무적 방패를 자주 즐길 수 있게 함!
                if (r < 0.38) itemType = 'shield';
                else if (r < 0.62) itemType = 'banana';
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
    // 1단계~5단계 테마 배경 + 동물 디테일 렌더링
    // =========================================================================
    renderBackgroundAndRoad(ctx, width, height, time) {
        const horizonY = height * 0.42;
        const centerX = width * 0.5;
        const topRoadW = 130;
        const botRoadW = Math.min(width * 0.86, 860);

        // 스테이지별 팔레트 설정
        const themes = {
            1: { // 1단계: 숲속 (Forest)
                skyTop: '#a8dadc', skyMid: '#d8f3dc', skyBot: '#95d5b2',
                ground: '#74c69d', roadTop: '#e6d2ab', roadBot: '#c9ada7',
                tileA: '#ddb892', tileB: '#b08968'
            },
            2: { // 2단계: 사막 (Desert)
                skyTop: '#ff9f1c', skyMid: '#ffbf69', skyBot: '#f4a261',
                ground: '#e9c46a', roadTop: '#f4e285', roadBot: '#dda15e',
                tileA: '#e9c46a', tileB: '#d4a373'
            },
            3: { // 3단계: 해저 (Undersea)
                skyTop: '#03045e', skyMid: '#0077b6', skyBot: '#00b4d8',
                ground: '#48cae4', roadTop: '#90e0ef', roadBot: '#0096c7',
                tileA: '#ade8f4', tileB: '#48cae4'
            },
            4: { // 4단계: 도시 (타임스퀘어 밤 느낌)
                skyTop: '#0b090a', skyMid: '#161a1d', skyBot: '#2b2d42',
                ground: '#2b2d42', roadTop: '#495057', roadBot: '#212529',
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

        // 2. 스테이지별 원경 특수 배경 렌더링
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
                this.drawStageSideProp(ctx, pR.x + 45 * pR.scale, pR.y, pR.scale, 1, (prop.variant + 1) % 4, time);
            });
        }

        // 5단계 글리치 보이드 화면 지지직 이펙트
        if (this.stage === 5) {
            this.renderGlitchOverlay(ctx, width, height, time);
        }
    }

    // 스테이지별 하늘/원경 디테일
    renderStageSkyDetails(ctx, width, height, horizonY, centerX, time) {
        ctx.save();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.5;

        if (this.stage === 1) {
            // 1단계 숲: 뭉게구름과 원경 숲 산맥, 날아다니는 새들
            ctx.fillStyle = '#52b788';
            ctx.beginPath();
            ctx.arc(centerX - 260, horizonY, 160, Math.PI, 0);
            ctx.arc(centerX + 260, horizonY, 180, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
        } else if (this.stage === 2) {
            // 2단계 사막: 이글거리는 태양과 거대 피라미드 2개!
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.arc(centerX + 220, horizonY - 110, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#e09f3e';
            [[-220, 140], [180, 120]].forEach(([px, ph]) => {
                ctx.beginPath();
                ctx.moveTo(centerX + px - ph, horizonY);
                ctx.lineTo(centerX + px, horizonY - ph);
                ctx.lineTo(centerX + px + ph, horizonY);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            });
        } else if (this.stage === 3) {
            // 3단계 해저: 바닷속 물방울들과 하늘(수면 위)을 유유히 헤엄치는 거대한 고래와 상어, 물고기 떼!
            // 거대 고래 🐋
            const whaleX = centerX - 180 + Math.sin(time * 0.8) * 60;
            const whaleY = horizonY - 105;
            ctx.fillStyle = '#023e8a';
            ctx.beginPath();
            ctx.ellipse(whaleX, whaleY, 95, 38, 0.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 54px sans-serif';
            ctx.fillText('🐋', whaleX - 30, whaleY + 15);
            ctx.fillText('🦈', centerX + 180 + Math.cos(time * 1.3) * 50, horizonY - 85);
            ctx.font = 'bold 34px sans-serif';
            ctx.fillText('🐠 🐟 🐡', centerX + Math.sin(time * 2) * 80, horizonY - 130);
        } else if (this.stage === 4) {
            // 4단계 도시 (타임스퀘어 밤): 마천루 스카이라인 & 화려한 네온 전광판 빌딩들!
            const buildings = [
                { x: -360, w: 95, h: 210, neon: '#ff007f', text: 'SMILE' },
                { x: -250, w: 85, h: 175, neon: '#00f5d4', text: 'NYC' },
                { x: -150, w: 75, h: 230, neon: '#ffbe0b', text: '24H' },
                { x: 140,  w: 85, h: 220, neon: '#8338ec', text: 'GAMES' },
                { x: 240,  w: 95, h: 185, neon: '#3a86ff', text: 'STAR' },
                { x: 350,  w: 90, h: 215, neon: '#fb5607', text: 'TAXI' }
            ];
            buildings.forEach(b => {
                ctx.fillStyle = '#1d1e2c';
                ctx.strokeStyle = '#000';
                ctx.fillRect(centerX + b.x, horizonY - b.h, b.w, b.h);
                ctx.strokeRect(centerX + b.x, horizonY - b.h, b.w, b.h);

                // 타임스퀘어 대형 네온 전광판
                ctx.fillStyle = b.neon;
                ctx.fillRect(centerX + b.x + 10, horizonY - b.h + 25, b.w - 20, 42);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px "Comic Neue", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(b.text, centerX + b.x + b.w * 0.5, horizonY - b.h + 52);
            });
        } else if (this.stage === 5) {
            // 5단계 글리치 보이드: 공간 균열 번개 & 붉은 보이드 코어
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                const gx = Math.random() * width;
                const gy = Math.random() * horizonY;
                ctx.moveTo(gx, gy);
                ctx.lineTo(gx + (Math.random() - 0.5) * 120, gy + 40);
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
            // 🌲 1단계 숲: 울창한 나무 + 귀여운 숲속 동물들(다람쥐, 토끼, 사슴, 여우)
            ctx.fillStyle = '#7f4f24';
            ctx.fillRect(-16, -150, 32, 150);
            ctx.strokeRect(-16, -150, 32, 150);

            ctx.fillStyle = '#40916c';
            ctx.beginPath();
            ctx.arc(0, -175, 68, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 나무 옆에서 응원하는 숲속 동물 디테일!
            const animals = ['🐿️', '🐇', '🦌', '🦊'];
            const animalNames = ['다람쥐', '산토끼', '꽃사슴', '여우'];
            ctx.font = 'bold 58px sans-serif';
            ctx.fillText(animals[variant % 4], -side * 55, -25 + bob);
            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(animalNames[variant % 4], -side * 55, 8);

        } else if (this.stage === 2) {
            // 🌵 2단계 사막: 선인장 + 전갈, 사막여우, 낙타 디테일!
            ctx.fillStyle = '#588157';
            ctx.beginPath();
            ctx.roundRect(-16, -145, 32, 145, 14);
            ctx.roundRect(-48, -110, 32, 22, 10);
            ctx.roundRect(-48, -140, 20, 45, 10);
            ctx.roundRect(16, -95, 32, 22, 10);
            ctx.roundRect(28, -130, 20, 50, 10);
            ctx.fill();
            ctx.stroke();

            // 사막 동물 디테일 (전갈, 사막여우, 쌍봉낙타)
            const desertAnimals = ['🦂', '🦊', '🐪', '🐫'];
            const desertLabels = ['사막전갈', '사막여우', '단봉낙타', '쌍봉낙타'];
            ctx.font = 'bold 62px sans-serif';
            ctx.fillText(desertAnimals[variant % 4], -side * 65, -24 + bob);
            ctx.fillStyle = '#fff3b0';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(desertLabels[variant % 4], -side * 65, 10);

        } else if (this.stage === 3) {
            // Coral & 🦈 3단계 해저: 산호초 + 상어, 열대어 물고기, 고래, 문어 디테일!
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.roundRect(-18, -125, 36, 125, 16);
            ctx.fill();
            ctx.stroke();

            const seaCreatures = ['🦈', '🐠', '🐋', '🐙'];
            const seaLabels = ['백상아리', '열대어', '대왕고래', '바다문어'];
            ctx.font = 'bold 64px sans-serif';
            ctx.fillText(seaCreatures[variant % 4], -side * 65, -55 + bob * 1.8);
            ctx.fillStyle = '#caf0f8';
            ctx.font = 'bold 18px "Gaegu", sans-serif';
            ctx.fillText(seaLabels[variant % 4], -side * 65, -12);

        } else if (this.stage === 4) {
            // 🌆 4단계 도시 (타임스퀘어 밤): 네온 전광판 타워 & 노란 택시 & 가로등!
            ctx.fillStyle = '#2b2d42';
            ctx.fillRect(-45, -210, 90, 210);
            ctx.strokeRect(-45, -210, 90, 210);

            // 네온 전광판
            ctx.fillStyle = variant % 2 === 0 ? '#ff007f' : '#00f5d4';
            ctx.fillRect(-36, -185, 72, 55);
            ctx.strokeRect(-36, -185, 72, 55);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px "Comic Neue", sans-serif';
            ctx.fillText('TIMES SQ', 0, -152);

            // 타임스퀘어 노란 택시 🚕
            ctx.font = 'bold 54px sans-serif';
            ctx.fillText('🚕', -side * 65, -18);

        } else if (this.stage === 5) {
            // ⚡ 5단계 글리치 보이드: 깨진 디지털 기둥 & 에러 큐브
            const glitchShift = (Math.random() - 0.5) * 18;
            ctx.fillStyle = variant % 2 === 0 ? '#ff007f' : '#00f5d4';
            ctx.fillRect(-30 + glitchShift, -190, 60, 190);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px monospace';
            ctx.fillText('ERR_404', glitchShift, -110);
        }

        ctx.restore();
    }

    // 5단계 글리치 보이드 화면 노이즈 오버레이
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

    // 🏫 5단계 클리어 시 나타나는 정겨운 학교(초등학교) 건물!
    drawSchoolEndingBuilding(ctx, cx, cy) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';

        // 학교 본관 건물
        ctx.fillStyle = '#f8edeb';
        ctx.fillRect(-260, -180, 520, 200);
        ctx.strokeRect(-260, -180, 520, 200);

        // 빨간 벽돌 지붕 & 중앙 시계탑 박공
        ctx.fillStyle = '#d64531';
        ctx.beginPath();
        ctx.moveTo(-280, -180);
        ctx.lineTo(0, -255);
        ctx.lineTo(280, -180);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 학교 시계탑 & 간판
        ctx.fillStyle = '#fffcf5';
        ctx.beginPath();
        ctx.arc(0, -210, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a1612';
        ctx.font = 'bold 26px "Gaegu", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏫 스마일 초등학교 (6학년 교실)', 0, -142);

        // 창문들
        ctx.fillStyle = '#90e0ef';
        [-190, -120, 120, 190].forEach(wx => {
            ctx.fillRect(wx - 24, -110, 48, 52);
            ctx.strokeRect(wx - 24, -110, 48, 52);
        });

        // 학교 정문 아치
        ctx.fillStyle = '#8d5b3c';
        ctx.beginPath();
        ctx.roundRect(-48, -85, 96, 105, [24, 24, 0, 0]);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    // 트랙 위 장애물 & 아이템 렌더링
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
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍌', 0, 2);
        } else if (item.type === 'shield') {
            // 🛡️ 특별 아이템: 기물에 무적이 되는 황금빛 방패 아이템!
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
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', 0, 2);

            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 16px "Gaegu", sans-serif';
            ctx.strokeText('무적 방패!', 0, -46);
            ctx.fillText('무적 방패!', 0, -46);
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

        if (obs.type === 'ramp') {
            // 🪜 1) 톰 골드런 스타일 위로 올라가 달릴 수 있는 경사로 플랫폼!
            ctx.fillStyle = '#4ea8de';
            ctx.beginPath();
            ctx.moveTo(-72, 0);
            ctx.lineTo(-56, -92);
            ctx.lineTo(56, -92);
            ctx.lineTo(72, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 경사로 화살표 스트라이프
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
            ctx.textAlign = 'center';
            ctx.strokeText('⏫ 위로 올라가!', 0, -105);
            ctx.fillText('⏫ 위로 올라가!', 0, -105);

        } else if (obs.type === 'rolling_stone') {
            // 🪨 2) 나를 향해 데구르르 굴러오는 움직이는 거대 바위!
            ctx.fillStyle = 'rgba(26, 22, 18, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 65, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.save();
            ctx.translate(0, -56);
            ctx.rotate(obs.rot || time * 8);

            ctx.fillStyle = '#7f7f7f';
            ctx.beginPath();
            ctx.arc(0, 0, 56, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 바위 균열 디테일
            ctx.beginPath();
            ctx.moveTo(-25, -20);
            ctx.lineTo(0, 5);
            ctx.lineTo(28, -12);
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = '#ffbe0b';
            ctx.font = 'bold 19px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.strokeText('🪨 굴러오는 돌!', 0, -122);
            ctx.fillText('🪨 굴러오는 돌!', 0, -122);

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
            ctx.textAlign = 'center';
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
            ctx.font = 'bold 22px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▼ 슬라이딩(↓)', 0, -168);

        } else if (obs.type === 'pillar') {
            ctx.fillStyle = '#9c8970';
            ctx.beginPath();
            ctx.roundRect(-52, -175, 104, 175, 14);
            ctx.fill();
            ctx.stroke();

            const f = Math.sin(time * 14) * 8;
            ctx.fillStyle = '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(-38, -175);
            ctx.quadraticCurveTo(-18, -240, f, -255);
            ctx.quadraticCurveTo(22, -240, 38, -175);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
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
            ctx.font = 'bold 30px "Gaegu", cursive';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#fffcf5';
            ctx.lineWidth = 6;
            ctx.strokeText(pp.text, pp.x, pp.y);
            ctx.fillStyle = pp.color;
            ctx.fillText(pp.text, pp.x, pp.y);
            ctx.restore();
        });
    }
}
