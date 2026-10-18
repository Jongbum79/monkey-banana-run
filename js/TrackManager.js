/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 2] 무한 생성 3레인 러닝 트랙 & 장애물 · 코인 · 파워업 매니저
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 *
 * 특징:
 * - 피너츠(스누피) 코믹스 풍의 원근 3레인 돌길 트랙, 고대 사원 기둥, 횃불, 폭포, 야자수
 * - 3종 장애물:
 *   1) 통나무 바리케이드 (점프 ↑/Space로 회피)
 *   2) 고대 사원 덩굴 현수막 아치 (슬라이딩 ↓/S로 회피)
 *   3) 불타는 사원 화로 기둥 (좌우 레인 이동 ←/→으로 회피)
 * - 수집 아이템: 황금 별 코인(+10점), 바나나 송이(+30점 & 부스트), 보호막 실드
 */

class TrackManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.scrollDist = 0;
        this.obstacles = [];
        this.items = [];
        this.popups = [];
        this.particles = [];
        this.spawnTimer = 1.2;
        this.coinSpawnTimer = 0.4;
        this.sideProps = [
            { z: 0.15, type: 'temple' },
            { z: 0.40, type: 'palm' },
            { z: 0.65, type: 'temple' },
            { z: 0.90, type: 'palm' }
        ];
    }

    // 원근 좌표 변환 헬퍼 (z: 0.0 지평선 ~ 1.0 플레이어 위치)
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
        this.popups.push({ x, y, text, color, alpha: 1.0, scale: 1.2 });
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
        const dz = dt * gameSpeed * 0.36;
        this.scrollDist += dz;

        // 양옆 사원/야자수 프롭 이동
        this.sideProps.forEach(p => {
            p.z += dz;
            if (p.z > 1.15) {
                p.z -= 1.15;
            }
        });

        // 수학의 문이 가까이에 없을 때만 일반 장애물 스폰
        if (!mathGateActive) {
            this.spawnTimer -= dt * gameSpeed;
            if (this.spawnTimer <= 0) {
                this.spawnObstaclePattern();
                this.spawnTimer = 1.65 + Math.random() * 0.85;
            }
        }

        // 코인 줄 스폰
        this.coinSpawnTimer -= dt * gameSpeed;
        if (this.coinSpawnTimer <= 0 && !mathGateActive) {
            this.spawnCoinLine();
            this.coinSpawnTimer = 1.8 + Math.random() * 0.9;
        }

        // 아이템 업데이트 및 획득 체크
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            item.z += dz;

            // 플레이어 위치 (z: 0.83 ~ 0.96) 도달 시 충돌 판정
            if (!item.collected && item.z > 0.82 && item.z < 0.97) {
                if (Math.abs(hero.laneX - item.lane) < 0.48) {
                    item.collected = true;
                    if (item.type === 'coin') {
                        callbacks.onCoin(item);
                    } else if (item.type === 'banana') {
                        callbacks.onBananaBundle(item);
                    } else if (item.type === 'shield') {
                        callbacks.onShield(item);
                    }
                }
            }

            if (item.z > 1.18 || item.collected) {
                if (item.z > 1.18) this.items.splice(i, 1);
            }
        }

        // 장애물 업데이트 및 충돌 체크
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.z += dz;

            if (!obs.hit && !obs.passed && obs.z > 0.84 && obs.z < 0.95) {
                if (Math.abs(hero.laneX - obs.lane) < 0.44) {
                    // 장애물 종류별 회피 조건 검사
                    let avoided = false;
                    if (obs.type === 'log' && hero.y > 55) {
                        avoided = true; // 점프로 통나무 회피 성공!
                    } else if (obs.type === 'arch' && hero.isSliding) {
                        avoided = true; // 슬라이딩으로 높은 아치 회피 성공!
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

            if (obs.z > 1.18) {
                this.obstacles.splice(i, 1);
            }
        }

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const pt = this.particles[i];
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 320 * dt;
            pt.alpha -= dt * 1.6;
            if (pt.alpha <= 0) this.particles.splice(i, 1);
        }

        // 팝업 텍스트 업데이트
        for (let i = this.popups.length - 1; i >= 0; i--) {
            const pp = this.popups[i];
            pp.y -= dt * 70;
            pp.alpha -= dt * 1.15;
            if (pp.alpha <= 0) this.popups.splice(i, 1);
        }
    }

    spawnObstaclePattern() {
        const lanes = [-1, 0, 1];
        const types = ['log', 'arch', 'pillar'];
        const chosenLane = lanes[Math.floor(Math.random() * 3)];
        const chosenType = types[Math.floor(Math.random() * 3)];

        this.obstacles.push({
            lane: chosenLane,
            z: 0.04,
            type: chosenType,
            hit: false,
            passed: false
        });

        // 35% 확률로 다른 레인에 보조 장애물 하나 더 배치 (최소 1개 레인은 항상 열려 있음)
        if (Math.random() < 0.35) {
            const otherLanes = lanes.filter(l => l !== chosenLane);
            const secondLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
            this.obstacles.push({
                lane: secondLane,
                z: 0.04,
                type: 'log',
                hit: false,
                passed: false
            });
        }
    }

    spawnCoinLine() {
        const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
        const count = 4;
        for (let i = 0; i < count; i++) {
            this.items.push({
                lane,
                z: 0.02 - i * 0.065,
                type: (i === count - 1 && Math.random() < 0.25)
                    ? (Math.random() < 0.65 ? 'banana' : 'shield')
                    : 'coin',
                collected: false
            });
        }
    }

    // 배경 및 트랙 바닥 렌더링
    renderBackgroundAndRoad(ctx, width, height, time) {
        const horizonY = height * 0.42;
        const groundY = height * 0.84;
        const centerX = width * 0.5;
        const topRoadW = 130;
        const botRoadW = Math.min(width * 0.86, 860);

        // 1. 스누피 코믹스 빈티지 수채화 하늘
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0.0, '#cfe3dc');
        skyGrad.addColorStop(0.42, '#f2ead3');
        skyGrad.addColorStop(1.0, '#e3cca3');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. 원경 구름, 폭포 절벽, 야자수
        ctx.save();
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';

        // 뭉게구름
        ctx.fillStyle = '#faf6e8';
        ctx.beginPath();
        ctx.arc(centerX - 250, horizonY - 48, 55, Math.PI * 0.8, Math.PI * 1.95);
        ctx.arc(centerX - 185, horizonY - 68, 65, Math.PI * 1.0, Math.PI * 2.1);
        ctx.arc(centerX + 215, horizonY - 55, 60, Math.PI * 0.9, Math.PI * 2.05);
        ctx.fill();
        ctx.stroke();

        // 우측 원경 폭포 절벽
        ctx.fillStyle = '#dfcba6';
        ctx.beginPath();
        ctx.moveTo(centerX + 120, horizonY + 15);
        ctx.lineTo(centerX + 150, horizonY - 125);
        ctx.lineTo(centerX + 350, horizonY - 155);
        ctx.lineTo(centerX + 390, horizonY + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 절벽 폭포 물줄기
        ctx.fillStyle = '#cbe2e0';
        ctx.beginPath();
        ctx.moveTo(centerX + 205, horizonY - 130);
        ctx.lineTo(centerX + 245, horizonY - 135);
        ctx.lineTo(centerX + 255, horizonY + 10);
        ctx.lineTo(centerX + 195, horizonY + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.lineWidth = 1.8;
        for (let i = 0; i < 3; i++) {
            const wx = centerX + 212 + i * 14;
            const wyOff = (this.scrollDist * 260) % 32;
            ctx.beginPath();
            ctx.moveTo(wx, horizonY - 115 + wyOff);
            ctx.lineTo(wx - 2, horizonY - 45 + wyOff);
            ctx.stroke();
        }
        ctx.restore();

        // 3. 지평선 잔디 언덕
        ctx.fillStyle = '#d7c296';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.quadraticCurveTo(centerX, horizonY - 12, width, horizonY + 8);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. 원근 3레인 돌길 트랙 (Cobblestone Road)
        const roadGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        roadGrad.addColorStop(0, '#e6d2ab');
        roadGrad.addColorStop(1, '#d3b582');
        ctx.fillStyle = roadGrad;
        ctx.beginPath();
        ctx.moveTo(centerX - topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX + topRoadW * 0.5, horizonY);
        ctx.lineTo(centerX + botRoadW * 0.5, height);
        ctx.lineTo(centerX - botRoadW * 0.5, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 돌바닥 타일 스크롤
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

                ctx.fillStyle = (i + col) % 2 === 0 ? '#e3c99b' : '#d6b886';
                ctx.strokeStyle = '#1a1612';
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

        // 5. 양옆 고대 사원 기둥, 횃불, 야자수 원근 렌더링
        const sortedProps = [...this.sideProps].sort((a, b) => a.z - b.z);
        sortedProps.forEach(prop => {
            const pL = this.project(prop.z, -1.65, width, height);
            const pR = this.project(prop.z, 1.65, width, height);
            if (prop.type === 'temple') {
                this.drawSideTemple(ctx, pL.x - 45 * pL.scale, pL.y, pL.scale, -1, time);
                this.drawSideTemple(ctx, pR.x + 45 * pR.scale, pR.y, pR.scale, 1, time);
            } else {
                this.drawSidePalm(ctx, pL.x - 30 * pL.scale, pL.y, pL.scale, -1);
                this.drawSidePalm(ctx, pR.x + 30 * pR.scale, pR.y, pR.scale, 1);
            }
        });
    }

    drawSideTemple(ctx, x, y, scale, side, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#dcc59a';
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';

        // 사원 석조 기둥
        ctx.fillRect(-55, -240, 110, 240);
        ctx.strokeRect(-55, -240, 110, 240);

        // 상단 장식 석재
        ctx.fillStyle = '#cbb183';
        ctx.fillRect(-68, -265, 136, 30);
        ctx.strokeRect(-68, -265, 136, 30);

        // 횃불 & 불꽃
        const tx = -side * 45;
        ctx.fillStyle = '#8d5b3c';
        ctx.fillRect(tx - 7, -130, 14, 65);
        ctx.strokeRect(tx - 7, -130, 14, 65);

        const flicker = Math.sin(time * 12 + x) * 5;
        ctx.fillStyle = '#fff0a8';
        ctx.beginPath();
        ctx.moveTo(tx - 16, -132);
        ctx.quadraticCurveTo(tx - 24, -165, tx + flicker, -192);
        ctx.quadraticCurveTo(tx + 24, -165, tx + 16, -132);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    drawSidePalm(ctx, x, y, scale, side) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.2;

        // 줄기
        ctx.fillStyle = '#b89466';
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(-side * 20, -100, -side * 45, -210);
        ctx.lineTo(-side * 45 + 18, -210);
        ctx.quadraticCurveTo(-side * 20 + 18, -100, 14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 야자수 잎
        ctx.translate(-side * 36, -210);
        ctx.fillStyle = '#92b678';
        [-2.1, -1.1, -0.2, 0.6, 1.5, 2.3].forEach(ang => {
            ctx.save();
            ctx.rotate(ang);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(42, -20, 84, 10);
            ctx.quadraticCurveTo(42, 6, 0, 0);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        });
        ctx.restore();
    }

    // 트랙 위 장애물 & 아이템 렌더링 (Z-order 정렬)
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
        const bounce = Math.abs(Math.sin(time * 6 + item.z * 12)) * 20 * p.scale;
        ctx.save();
        ctx.translate(p.x, p.y - 28 * p.scale - bounce);
        ctx.scale(p.scale, p.scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 3.8;

        if (item.type === 'coin') {
            // 황금 별 코인
            ctx.fillStyle = '#d4a62a';
            ctx.beginPath();
            ctx.ellipse(7, 0, 26, 36, 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f6d54a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 26, 36, 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 가운데 별 각인 ★
            ctx.fillStyle = '#fff5b8';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const oa = (i * 72 - 90) * Math.PI / 180;
                const ia = ((i * 72 + 36) - 90) * Math.PI / 180;
                if (i === 0) ctx.moveTo(Math.cos(oa) * 14, Math.sin(oa) * 16);
                else ctx.lineTo(Math.cos(oa) * 14, Math.sin(oa) * 16);
                ctx.lineTo(Math.cos(ia) * 6, Math.sin(ia) * 7);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (item.type === 'banana') {
            // 황금 미니 바나나 부스트 아이템
            ctx.fillStyle = '#ffea79';
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 38px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍌', 0, 2);
        } else if (item.type === 'shield') {
            // 바나나 보호막 실드 아이템
            ctx.fillStyle = '#90e0ef';
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.font = 'bold 34px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', 0, 2);
        }

        ctx.restore();
    }

    drawObstacle(ctx, obs, p, time) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.strokeStyle = '#1a1612';
        ctx.lineWidth = 4.2;
        ctx.lineJoin = 'round';

        if (obs.type === 'log') {
            // 1) 낮은 통나무 바리케이드 (JUMP 표시 안내 포함!)
            ctx.fillStyle = 'rgba(26, 22, 18, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, 6, 88, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // 통나무 몸통
            ctx.fillStyle = '#8d5b3c';
            ctx.beginPath();
            ctx.roundRect(-78, -56, 156, 56, 24);
            ctx.fill();
            ctx.stroke();

            // 통나무 나이테 단면
            ctx.fillStyle = '#dfc396';
            ctx.beginPath();
            ctx.ellipse(68, -28, 16, 26, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 나무 껍질 펜선 & JUMP 뱃지
            ctx.fillStyle = '#ffd166';
            ctx.beginPath();
            ctx.roundRect(-42, -88, 84, 28, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1a1612';
            ctx.font = 'bold 17px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▲ 점프!', 0, -68);

        } else if (obs.type === 'arch') {
            // 2) 높은 사원 덩굴 현수막 아치 (SLIDE 표시 안내 포함!)
            // 양쪽 기둥
            ctx.fillStyle = '#cbb183';
            ctx.fillRect(-86, -240, 26, 240);
            ctx.strokeRect(-86, -240, 26, 240);
            ctx.fillRect(60, -240, 26, 240);
            ctx.strokeRect(60, -240, 26, 240);

            // 상단 가로 막대 석재 & 가시 덩굴 (아래쪽 공간은 비어 있어서 슬라이딩으로 통과!)
            ctx.fillStyle = '#d64531';
            ctx.fillRect(-94, -245, 188, 125);
            ctx.strokeRect(-94, -245, 188, 125);

            // 안내 문구
            ctx.fillStyle = '#fffcf5';
            ctx.font = 'bold 24px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▼ 슬라이딩(↓)', 0, -175);

        } else if (obs.type === 'pillar') {
            // 3) 레인 전체를 막는 불타는 사원 화로 기둥 (좌/우 이동으로 회피!)
            ctx.fillStyle = '#9c8970';
            ctx.beginPath();
            ctx.roundRect(-56, -185, 112, 185, 14);
            ctx.fill();
            ctx.stroke();

            // 화로 불꽃
            const f = Math.sin(time * 14) * 8;
            ctx.fillStyle = '#ff9f1c';
            ctx.beginPath();
            ctx.moveTo(-42, -185);
            ctx.quadraticCurveTo(-20, -255, f, -270);
            ctx.quadraticCurveTo(25, -255, 42, -185);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fff3b0';
            ctx.font = 'bold 20px "Gaegu", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('◀ 피하세요 ▶', 0, -90);
        }

        ctx.restore();
    }

    // 전경 잎사귀, 파티클, 팝업 렌더링
    renderEffects(ctx, width, height) {
        // 파티클
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

        // 점수/상태 팝업
        this.popups.forEach(pp => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, pp.alpha);
            ctx.font = 'bold 32px "Gaegu", cursive';
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
