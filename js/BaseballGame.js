/**
 * Smile Games - MLB 26 스타일 스마일 프로야구 3D (Smile MLB 26 Pro Baseball Duel)
 * 
 * ⚾ MLB 26 핵심 업그레이드 특징:
 * 1. 🌐 서버 1:1 라이벌 대결 & 10초 AI 매칭 시스템:
 *    - 투수(Pitcher) 또는 타자(Batter) 역할 중 하나를 직접 선택!
 *    - 10초 카운트다운 동안 상대 유저를 탐색하고, 미매칭 시 맞춤형 AI 에이스 라이벌과 자동 매칭!
 * 2. 🎥 다이내믹 듀얼 카메라 (MLB The Show 26 정통 시점):
 *    - [타자 모드]: 포수/홈플레이트 뒤 시점 (MLB The Show 정통 배터 뷰).
 *                   투수가 160km/h 초강속구와 뚝 떨어지는 변화구를 정면으로 뿌려오는 극강의 타격감!
 *    - [투수 모드]: 투수 마운드 뒤 시점 (정밀 코스 제구 & 5대 마구 릴리즈).
 * 3. 💎 3D 다이아몬드 베이스 & 주자 진루 시스템:
 *    - 홈(Home), 1루(1B), 2루(2B), 3루(3B) 실제 야구 다이아몬드 주로 & 3D 사각 베이스백.
 *    - 안타/2루타/3루타/홈런/볼넷 시 실제 주자 진루 및 득점, 만루홈런(Grand Slam) 지원!
 *    - 상단 MLB 26 스코어버그에 실시간 다이아몬드 주자 점등 위젯 탑재.
 * 4. ⚡ 초고속 구속 (156~174km/h) & 극적인 마구 변화각:
 *    - 직구(162km/h 라이징), 파워커브(12-6 폭포수 낙폭), 슬라이더(50+ 횡스위핑), 체인지업(오프스피드 싱킹), 불꽃마구.
 * 5. 🐾 타자별 고유 장점(Perk) 시스템:
 *    - 🐯 호걸이: 💥 파워 슬러거 (Power 99 | 홈런 비거리 +25m, 185km/h 로켓 타구)
 *    - 🐸 개구리: 🎯 칼날 컨택트 (Contact 99 | 히트 판정 윈도우 +40% 확장, 안타 제조기)
 *    - 🐧 펭귄: 🌪️ 총알 배트스피드 (Clutch 95 | 배트 스피드 +40%, 2루타 확률 2배)
 *    - 🐵 원숭이: 👑 황금 5툴 올라운더 (Balanced 94 | 파워+컨택 조화, 마구 대처 능력 +30%)
 * 6. 🏃‍♂️ 자연스러운 3D 스윙 & 투구 애니메이션:
 *    - 자세(Waggle) -> 스트라이드(Stride) -> 힙 회전(Hip Fire) -> 배트 래그(Lag) -> 풀 익스텐션 & 하이 팔로스루!
 * 7. 📺 초슬림 MLB 26 브로드캐스트 스코어 버그 & 실시간 스피드건 레이더.
 */

function safeGetStorage(key, fallback) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const val = window.localStorage.getItem(key);
            return val !== null ? val : fallback;
        }
    } catch (e) {}
    return fallback;
}

function safeSetStorage(key, value) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    } catch (e) {}
}

/**
 * 🌐 고신뢰 표준 WebSocket MQTT 3.1.1 클라이언트 (단말 간 실시간 크로스 디바이스 1:1 대전)
 * - OASIS 공식 표준 가변 바이트 길이(Variable-Byte Remaining Length) 완벽 인코딩/디코딩
 * - 다중 브로커 자동 페일오버 및 자동 재연결(Auto-Reconnect) 내장
 */
function encodeMqttLength(len) {
    const bytes = [];
    do {
        let encByte = len % 128;
        len = Math.floor(len / 128);
        if (len > 0) encByte |= 0x80;
        bytes.push(encByte);
    } while (len > 0);
    return bytes;
}

function decodeMqttLength(buf, offset) {
    let multiplier = 1;
    let value = 0;
    let i = offset;
    let encByte;
    do {
        if (i >= buf.length) return { length: 0, nextOffset: offset };
        encByte = buf[i++];
        value += (encByte & 127) * multiplier;
        multiplier *= 128;
    } while ((encByte & 128) !== 0 && multiplier <= 128 * 128 * 128);
    return { length: value, nextOffset: i };
}

class SimpleMqttClient {
    constructor(brokerUrls, onMessage, onStatusChange) {
        this.brokerUrls = Array.isArray(brokerUrls) ? brokerUrls : [brokerUrls];
        this.brokerIdx = 0;
        this.ws = null;
        this.onMessage = onMessage;
        this.onStatusChange = onStatusChange;
        this.clientId = 'bb_' + Math.random().toString(36).slice(2, 9);
        this.connected = false;
        this.subscribedTopics = new Set();
        this.reconnectTimer = null;
        this.isClosedManually = false;
        this.connect();
    }

    connect() {
        if (typeof WebSocket === 'undefined' || this.isClosedManually) return;
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        const url = this.brokerUrls[this.brokerIdx % this.brokerUrls.length];
        try {
            this.ws = new WebSocket(url, ['mqtt']);
            this.ws.binaryType = 'arraybuffer';
            this.ws.onopen = () => {
                this.sendConnect();
            };
            this.ws.onmessage = (e) => {
                this.handlePacket(new Uint8Array(e.data));
            };
            this.ws.onerror = () => {
                this.connected = false;
                if (this.onStatusChange) this.onStatusChange(false, 'error');
                this.scheduleReconnect();
            };
            this.ws.onclose = () => {
                this.connected = false;
                if (this.onStatusChange) this.onStatusChange(false, 'closed');
                this.scheduleReconnect();
            };
        } catch (err) {
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.isClosedManually || this.reconnectTimer) return;
        this.brokerIdx++;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.connected && !this.isClosedManually) {
                this.connect();
            }
        }, 2200);
    }

    sendConnect() {
        const proto = [0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3C];
        const idBytes = new TextEncoder().encode(this.clientId);
        const payload = [idBytes.length >> 8, idBytes.length & 0xFF, ...idBytes];
        const body = [...proto, ...payload];
        const lenBytes = encodeMqttLength(body.length);
        const packet = new Uint8Array(1 + lenBytes.length + body.length);
        packet[0] = 0x10;
        packet.set(lenBytes, 1);
        packet.set(body, 1 + lenBytes.length);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(packet.buffer);
        }
    }

    subscribe(topic) {
        this.subscribedTopics.add(topic);
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const tBytes = new TextEncoder().encode(topic);
        const body = [0x00, 0x01, tBytes.length >> 8, tBytes.length & 0xFF, ...tBytes, 0x00];
        const lenBytes = encodeMqttLength(body.length);
        const packet = new Uint8Array(1 + lenBytes.length + body.length);
        packet[0] = 0x82;
        packet.set(lenBytes, 1);
        packet.set(body, 1 + lenBytes.length);
        this.ws.send(packet.buffer);
    }

    publish(topic, dataObj) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const tBytes = new TextEncoder().encode(topic);
        const mBytes = new TextEncoder().encode(typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj));
        const body = new Uint8Array(2 + tBytes.length + mBytes.length);
        body[0] = tBytes.length >> 8;
        body[1] = tBytes.length & 0xFF;
        body.set(tBytes, 2);
        body.set(mBytes, 2 + tBytes.length);
        const lenBytes = encodeMqttLength(body.length);
        const packet = new Uint8Array(1 + lenBytes.length + body.length);
        packet[0] = 0x30;
        packet.set(lenBytes, 1);
        packet.set(body, 1 + lenBytes.length);
        this.ws.send(packet.buffer);
    }

    handlePacket(buf) {
        if (!buf || buf.length < 2) return;
        const packetType = buf[0] >> 4;
        if (packetType === 2) {
            // CONNACK
            this.connected = true;
            if (this.onStatusChange) this.onStatusChange(true, 'connected');
            for (const topic of this.subscribedTopics) {
                this.subscribe(topic);
            }
        } else if (packetType === 3) {
            // PUBLISH
            const { length: remainingLength, nextOffset } = decodeMqttLength(buf, 1);
            if (buf.length >= nextOffset + 2) {
                const topicLen = (buf[nextOffset] << 8) | buf[nextOffset + 1];
                const topic = new TextDecoder().decode(buf.subarray(nextOffset + 2, nextOffset + 2 + topicLen));
                const payloadBytes = buf.subarray(nextOffset + 2 + topicLen, nextOffset + remainingLength);
                const payloadStr = new TextDecoder().decode(payloadBytes);
                try {
                    const parsed = JSON.parse(payloadStr);
                    if (this.onMessage) this.onMessage(topic, parsed);
                } catch (e) {
                    if (this.onMessage) this.onMessage(topic, payloadStr);
                }
            }
        }
    }

    close() {
        this.isClosedManually = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this.connected = false;
    }
}

class BaseballGame {
    constructor(soundManager) {
        this.sound = soundManager;
        this.audioCtx = null;
        this.canvas = null;
        this.ctx = null;
        this.containerEl = null;
        this.commentary = null;
        this.isRunning = false;
        this.animFrameId = null;

        // 화면 크기 & 초고해상도 레티나 화질
        this.width = typeof window !== 'undefined' ? window.innerWidth : 1280;
        this.height = typeof window !== 'undefined' ? window.innerHeight : 720;
        this.dpr = typeof window !== 'undefined' ? Math.min(Math.max(window.devicePixelRatio || 1, 2.5), 3.5) : 2.5;

        // 🎮 나의 플레이 역할: 'batter' (타자) | 'pitcher' (투수)
        this.userRole = safeGetStorage('smilegames_bb_user_role', 'batter');

        // 🐾 4종 컴투스 프로야구 2026 KBO 시그니처 선수 카드 스펙 & 9분할 핫/콜드존
        this.characters = {
            tiger: {
                id: 'tiger',
                name: '호걸이',
                roleName: 'KIA 타이거즈 4번 [시그니처 OVR 99]',
                cardGrade: '시그니처',
                ovr: 99,
                emoji: '🐯',
                pitchStyle: 'overhand',
                pitchStyleName: '오버핸드 (162km/h 강속구)',
                batterPerkTitle: '💥 파워 슬러거 (Power 99)',
                batterPerkDesc: '홈런 비거리 +25m, 타구 속도 185km/h 로켓포, 퍼펙트 타이밍 시 무조건 초대형 홈런!',
                power: 99,
                contact: 85,
                contactWindowBonus: 1.05,
                powerBonus: 25,
                speedBonus: 1.15,
                doubleBonus: 1.0,
                fastballSpeed: 154,
                controlSpread: 20,
                curveBonus: 1.1,
                sliderBonus: 1.1,
                hotZones: [3, 4, 7], // 몸쪽 중간, 한가운데, 낮은 코스 (0..8)
                coldZones: [2],      // 바깥쪽 높은 코스
                skins: {
                    classic: { id: 'classic', name: '타이거즈 홈 화이트', jersey: '#ea580c', cap: '#1e293b', stripe: '#f8fafc', icon: '🐅' },
                    away: { id: 'away', name: '타이거즈 원정 레드', jersey: '#dc2626', cap: '#0f172a', stripe: '#fca5a5', icon: '🔴' },
                    gold: { id: 'gold', name: '골든 챔피언 유니폼', jersey: '#ca8a04', cap: '#1c1917', stripe: '#fef08a', icon: '👑' }
                }
            },
            frog: {
                id: 'frog',
                name: '개구리',
                roleName: 'KBO 골든글러브 정밀 컨택트 머신 [OVR 95]',
                cardGrade: '골든글러브',
                ovr: 95,
                emoji: '🐸',
                pitchStyle: 'threequarter',
                pitchStyleName: '쓰리쿼터 (낙폭 2.2배 커브)',
                batterPerkTitle: '🎯 칼날 컨택트 (Contact 99)',
                batterPerkDesc: '배팅 타이밍 윈도우 +40% 확장! 빗맞아도 안타로 깎아치는 안타 머신',
                power: 78,
                contact: 99,
                contactWindowBonus: 1.40, // 40% 넓은 히트존
                powerBonus: 0,
                speedBonus: 1.0,
                doubleBonus: 1.1,
                fastballSpeed: 144,
                controlSpread: 8,
                curveBonus: 2.2,
                sliderBonus: 1.3,
                hotZones: [1, 2, 5], // 높은 가운데, 바깥쪽 높은/중간
                coldZones: [6],      // 몸쪽 낮은 코스
                skins: {
                    classic: { id: 'classic', name: '에메랄드 핀스트라이프', jersey: '#16a34a', cap: '#14532d', stripe: '#bbf7d0', icon: '🟢' },
                    cyber: { id: 'cyber', name: '네온 사이버 유니폼', jersey: '#06b6d4', cap: '#0e7490', stripe: '#a5f3fc', icon: '⚡' },
                    retro: { id: 'retro', name: '포레스트 올드스쿨', jersey: '#15803d', cap: '#052e16', stripe: '#fef08a', icon: '🌲' }
                }
            },
            penguin: {
                id: 'penguin',
                name: '펭귄',
                roleName: 'KBO MVP 라이징 스프레이 히터 [OVR 93]',
                cardGrade: 'MVP',
                ovr: 93,
                emoji: '🐧',
                pitchStyle: 'sidearm',
                pitchStyleName: '사이드암 (스위핑 슬라이더)',
                batterPerkTitle: '🌪️ 총알 배트스피드 (Clutch 95)',
                batterPerkDesc: '배트 스피드 +40%, 외야 갭을 뚫는 2루타/3루타 확률 2배 특화',
                power: 88,
                contact: 92,
                contactWindowBonus: 1.18,
                powerBonus: 12,
                speedBonus: 1.10,
                doubleBonus: 2.0, // 2루타 확률 2배
                fastballSpeed: 146,
                controlSpread: 12,
                curveBonus: 1.2,
                sliderBonus: 2.3,
                hotZones: [0, 1, 4], // 몸쪽 높은, 가운데 높은, 한가운데
                coldZones: [8],      // 바깥쪽 낮은 코스
                skins: {
                    classic: { id: 'classic', name: '호스 딥 네이비', jersey: '#1e3a8a', cap: '#0f172a', stripe: '#60a5fa', icon: '🔵' },
                    frost: { id: 'frost', name: '프로스트 실버 아이스', jersey: '#475569', cap: '#1e293b', stripe: '#e2e8f0', icon: '❄️' },
                    marine: { id: 'marine', name: '마린 로열 블루', jersey: '#2563eb', cap: '#1e1b4b', stripe: '#facc15', icon: '⚓' }
                }
            },
            monkey: {
                id: 'monkey',
                name: '원숭이',
                roleName: 'KBO 레전드 올스타 5툴 플레이어 [OVR 96]',
                cardGrade: '레전드',
                ovr: 96,
                emoji: '🐵',
                pitchStyle: 'submarine',
                pitchStyleName: '언더핸드 잠수함 (지면 긁는 업슛)',
                batterPerkTitle: '👑 황금 5툴 (Balanced 94)',
                batterPerkDesc: '파워+컨택트 완벽 조화, 마구/변화구 대처 능력 +30%, 높은 출루율',
                power: 92,
                contact: 94,
                contactWindowBonus: 1.25,
                powerBonus: 16,
                speedBonus: 1.08,
                doubleBonus: 1.35,
                fastballSpeed: 150,
                controlSpread: 12,
                curveBonus: 1.35,
                sliderBonus: 1.35,
                hotZones: [1, 3, 4, 5, 7], // 십자형 전방위 핫존
                coldZones: [],
                skins: {
                    classic: { id: 'classic', name: '골든 바나나 스트라이프', jersey: '#facc15', cap: '#854d0e', stripe: '#1a1612', icon: '🍌' },
                    stealth: { id: 'stealth', name: '블랙 옵스 스텔스', jersey: '#1e293b', cap: '#020617', stripe: '#ea580c', icon: '⚫' },
                    vintage: { id: 'vintage', name: '1982 레트로 빈티지', jersey: '#f1f5f9', cap: '#b91c1c', stripe: '#dc2626', icon: '🧢' }
                }
            }
        };

        // 1P (나) 팀 정보
        this.p1 = {
            name: '나 (플레이어)',
            char: safeGetStorage('smilegames_bb_user_char', 'tiger'),
            skin: safeGetStorage('smilegames_bb_user_skin', 'classic'),
            score: 0,
            hits: 0,
            homeRuns: 0
        };

        // 2P (상대 라이벌) 팀 정보
        this.p2 = {
            name: '상대 라이벌',
            char: 'monkey',
            skin: 'classic',
            score: 0,
            hits: 0,
            homeRuns: 0,
            isAI: true
        };

        // 💎 야구 다이아몬드 베이스 상황 (1루, 2루, 3루 주자)
        this.bases = {
            first: false,
            second: false,
            third: false
        };

        // 🏃 3D 다이아몬드 베이스 좌표 & 실시간 주자 러닝 시스템
        this.BASE_POS = {
            HOME: { x: 0, y: 0, z: 380 },
            '1B': { x: 180, y: 0, z: 230 },
            '2B': { x: 0, y: 0, z: 100 },
            '3B': { x: -180, y: 0, z: 230 }
        };
        this.activeRunners = [];
        this.crowdCheerTimer = 0;

        // 🏏 1~4번 정규 타선 (Batting Lineup Order & Roles)
        this.lineup = [
            {
                order: 1,
                id: 'frog',
                name: '개구리',
                emoji: '🐸',
                title: '1번 타자 [리드오프 & 스피드스타]',
                roleDesc: '🎯 컨택 99 • 전력질주 스피드 1.35x • 안타 제조기',
                contactBonus: 1.35,
                powerBonus: 0,
                speedMult: 1.35,
                power: 80,
                contact: 99
            },
            {
                order: 2,
                id: 'monkey',
                name: '몽키',
                emoji: '🐵',
                title: '2번 타자 [테이블세터 & 선구안]',
                roleDesc: '👁️ 선구안 96 • 스트라이크존 감별 • 출루율 머신',
                contactBonus: 1.15,
                powerBonus: 6,
                speedMult: 1.10,
                power: 88,
                contact: 94
            },
            {
                order: 3,
                id: 'penguin',
                name: '펭귄',
                emoji: '🐧',
                title: '3번 타자 [해결사 클러치 갭히터]',
                roleDesc: '🌪️ 배트스피드 98 • 2/3루타 갭히팅 2배',
                contactBonus: 1.20,
                powerBonus: 15,
                doubleBonus: 2.2,
                speedMult: 1.05,
                power: 92,
                contact: 92
            },
            {
                order: 4,
                id: 'tiger',
                name: '호걸이',
                emoji: '🐯',
                title: '4번 타자 [핵타선 4번 거포 슬러거]',
                roleDesc: '💥 파워 99 • 130m+ 초대형 홈런 비거리 +25m',
                contactBonus: 1.05,
                powerBonus: 28,
                speedMult: 1.0,
                power: 99,
                contact: 86
            }
        ];
        this.lineupIndex = 0;

        // 🛡️ 7인제 3D 정밀 수비수 배치 (현실적인 메이저리그 외야 수비 깊이 설정)
        this.fielders = [
            { role: '1B', name: '1루수', x: 140, y: 0, z: 235, defaultX: 140, defaultZ: 235, baseAngle: -0.2, action: 'ready', runTimer: 0, isAssigned: false },
            { role: '2B', name: '2루수', x: 65, y: 0, z: 155, defaultX: 65, defaultZ: 155, baseAngle: -0.1, action: 'ready', runTimer: 0, isAssigned: false },
            { role: 'SS', name: '유격수', x: -65, y: 0, z: 155, defaultX: -65, defaultZ: 155, baseAngle: 0.1, action: 'ready', runTimer: 0, isAssigned: false },
            { role: '3B', name: '3루수', x: -140, y: 0, z: 235, defaultX: -140, defaultZ: 235, baseAngle: 0.2, action: 'ready', runTimer: 0, isAssigned: false },
            { role: 'LF', name: '좌익수', x: -210, y: 0, z: -130, defaultX: -210, defaultZ: -130, baseAngle: 0.15, action: 'ready', runTimer: 0, isAssigned: false },
            { role: 'CF', name: '중견수', x: 0, y: 0, z: -170, defaultX: 0, defaultZ: -170, baseAngle: 0, action: 'ready', runTimer: 0, isAssigned: false },
            { role: 'RF', name: '우익수', x: 210, y: 0, z: -130, defaultX: 210, defaultZ: -130, baseAngle: -0.15, action: 'ready', runTimer: 0, isAssigned: false }
        ];
        this.fieldingThrow = null;

        this.trackerTimer = null;

        // ⚾ 경기 진행 상태 (1회초 / 1회말)
        this.inningHalf = 'top'; // 'top' (1회초) | 'bottom' (1회말)
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.lastResultWasBall = false;
        this.maxDistance = 0;
        this.difficulty = 'normal'; // 'easy' (초보자) | 'normal' (표준) | 'pro' (프로)

        // 🌐 서버 매칭 상태 머신 & 크로스 디바이스 1:1 대전 네트워크
        this.isMatching = false;
        this.matchCountdown = 10;
        this.matchTimerId = null;
        this.myPeerId = 'bb_peer_' + Math.random().toString(36).slice(2, 9);
        this.activeRoom = null;
        this.isMultiplayer = false;
        this.isHost = false;
        this.guestPeerId = null;
        this.lastInvite = null;
        this.inviteIntervalId = null;
        this.activeTactic = null; // 'squeeze' | 'hit_and_run' | 'run_and_hit' | null
        this.mqttClient = null;
        this.broadcastChannel = null;
        try {
            if (typeof window !== 'undefined' && window.BroadcastChannel) {
                this.broadcastChannel = new BroadcastChannel('smile_baseball_duel');
            }
        } catch (e) {}

        // 투수 조준 & 구종
        this.selectedPitchType = 'fastball'; // 'fastball' | 'curve' | 'slider' | 'changeup' | 'knuckleball'
        this.pitchAimX = 0;
        this.pitchAimY = 44;

        // 🎥 다이내믹 3D 카메라
        // userRole === 'batter': 포수 뒤에서 투수를 향해 바라보는 MLB 26 정통 배터 뷰
        // userRole === 'pitcher': 투수 마운드 뒤에서 홈플레이트를 바라보는 피처 뷰
        this.camera = {
            x: 0,
            y: 56,
            z: 480,
            fov: 360,
            shake: 0
        };

        // 투수 모델 (z=80 마운드 위)
        this.pitcher = {
            x: 0,
            y: 14,
            z: 80,
            phase: 'ready', // 'ready' | 'windup' | 'release' | 'follow'
            phaseTimer: 0,
            animTimer: 0,
            legKick: 0,
            armAngle: 0
        };

        // 타자 모델 (홈플레이트 z=380 옆 우타자석 x=55)
        this.batter = {
            x: 55,
            y: 0,
            z: 380,
            isSwinging: false,
            isBunting: false,
            swingTime: 0,
            swingDuration: 0.22,
            swingProgress: 0,
            idleTimer: 0
        };

        // 포수 & 심판
        this.catcher = { x: 0, y: 0, z: 415 };
        this.umpire = { x: 0, y: 10, z: 445 };

        // 날아가는 야구공
        this.ball = {
            active: false,
            x: 0,
            y: 46,
            z: 85,
            vx: 0,
            vy: 0,
            vz: 0,
            radius: 8.5,
            rot: 0,
            type: 'fastball',
            speedKmh: 161,
            targetX: 0,
            targetY: 44,
            isHit: false,
            hitType: null,
            flightTimer: 0,
            hitDist: 0
        };

        // 게임 상태 머신
        this.gameState = 'aiming'; // 'aiming' | 'windup' | 'in_flight' | 'hit_flight' | 'result_pause' | 'game_over'
        this.stateTimer = 0;

        // 파티클 & 불꽃놀이 & 배너
        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerSub = '';
        this.bannerColor = '#facc15';
        this.bannerAlpha = 0;

        this.radarTimeout = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.containerEl = document.getElementById('baseball-game-container');
        if (!this.containerEl) return;

        this.canvas = document.getElementById('baseball-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.bindEvents();
        this.setupBroadcastChannel();
        this.initNetwork(); // 페이지 진입 즉시 실시간 서버에 백그라운드 사전 접속 (매칭 대기시간 제로화)
        const savedDiff = safeGetStorage('smilegames_bb_difficulty');
        this.difficulty = (savedDiff && ['easy', 'normal', 'pro'].includes(savedDiff)) ? savedDiff : 'normal';
        this.updateDifficultyUI();
        this.updateHUD();

        // 🎙️ KBO 중계석 정우영 캐스터 & 이순철 해설위원 시스템 활성화
        if (!this.commentary && typeof BaseballCommentator !== 'undefined') {
            this.commentary = new BaseballCommentator(this);
            this.commentary.init();
        }

        this.isInitialized = true;
        this.render(); // 초기 캔버스 즉시 렌더링
    }

    resize() {
        if (!this.canvas || !this.containerEl) return;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // 초고해상도 레티나 화질: 태블릿/고해상도 디스플레이에 맞춰 선명도 최대화 (2.5x ~ 3.5x)
        this.dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2.5), 3.5);
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    ensureAudio() {
        try {
            if (this.sound) {
                this.sound.init();
                if (this.sound.ctx && this.sound.ctx.state === 'suspended') {
                    this.sound.ctx.resume();
                }
            }
            if (!this.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.audioCtx = (this.sound && this.sound.ctx) ? this.sound.ctx : new AudioCtx();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {}
    }

    getAudioCtx() {
        this.ensureAudio();
        return (this.sound && this.sound.ctx) || this.audioCtx || null;
    }

    setupBroadcastChannel() {
        if (!this.broadcastChannel) return;
        this.broadcastChannel.onmessage = (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            const topic = data.__channel_topic || 'smile_baseball/lobby';
            this.handleNetworkMessage(topic, data);
        };
    }

    /**
     * 🌐 크로스 디바이스 글로벌 실시간 대전 네트워크 초기화 (EMQX 고신뢰 클러스터 & 로컬 브로드캐스트)
     */
    initNetwork() {
        if (!this.mqttClient) {
            const brokers = [
                'wss://broker.emqx.io:8084/mqtt',
                'wss://test.mosquitto.org:8081/mqtt'
            ];
            this.mqttClient = new SimpleMqttClient(
                brokers,
                (topic, data) => this.handleNetworkMessage(topic, data),
                (connected) => {
                    const statusEl = document.getElementById('mlb-radar-status');
                    if (connected && this.isMatching && statusEl) {
                        statusEl.textContent = '⚡ 실시간 서버 접속 완료! 상대 유저 매칭 대기 중...';
                    }
                }
            );
        }
        if (this.mqttClient) {
            this.mqttClient.subscribe('smile_baseball/lobby');
        }
    }

    sendNetworkMessage(topic, obj) {
        if (!obj) return;
        obj.senderPeerId = this.myPeerId;
        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish(topic, obj);
        }
        if (this.broadcastChannel) {
            const bcData = { ...obj, __channel_topic: topic };
            this.broadcastChannel.postMessage(bcData);
        }
    }

    /**
     * 🌐 글로벌 실시간 매칭 & 인게임 실시간 데이터 핸들러
     */
    handleNetworkMessage(topic, data) {
        if (!data || typeof data !== 'object') return;

        // [1] 로비 매칭 단계
        if (topic === 'smile_baseball/lobby') {
            if (data.senderPeerId === this.myPeerId) return; // 본인 패킷 무시

            // 1. 상대 단말이 매칭 요청(FIND_RIVAL)을 보냈을 때
            if (data.type === 'FIND_RIVAL') {
                if (!this.isMatching) return;

                // 이미 방을 개설했는데 게스트가 아직 FIND_RIVAL 상태라면 재초대 전송
                if (this.activeRoom && this.isHost && this.guestPeerId === data.peerId) {
                    if (this.lastInvite) {
                        this.sendNetworkMessage('smile_baseball/lobby', this.lastInvite);
                    }
                    return;
                }
                if (this.activeRoom) return;

                // peerId가 더 작은 쪽이 방장(Host)이 되어 방을 개설하고 역할을 배정
                if (this.myPeerId < data.peerId) {
                    const roomId = 'room_' + this.myPeerId.slice(-6) + '_' + data.peerId.slice(-6);
                    this.activeRoom = roomId;
                    this.isMultiplayer = true;
                    this.isHost = true;
                    this.guestPeerId = data.peerId;

                    let hostRole = this.userRole;
                    let guestRole = data.role;
                    if (hostRole === guestRole) {
                        guestRole = (hostRole === 'pitcher') ? 'batter' : 'pitcher';
                    }

                    this.lastInvite = {
                        type: 'MATCH_INVITE',
                        hostPeerId: this.myPeerId,
                        guestPeerId: data.peerId,
                        room: roomId,
                        hostRole: hostRole,
                        guestRole: guestRole,
                        hostName: this.p1.name,
                        hostChar: this.p1.char,
                        hostSkin: this.p1.skin
                    };

                    // 게스트 수락(MATCH_ACCEPT)을 받을 때까지 400ms 주기로 반복 전송 (패킷 유실 원천 차단)
                    if (this.inviteIntervalId) clearInterval(this.inviteIntervalId);
                    this.inviteIntervalId = setInterval(() => {
                        if (this.activeRoom === roomId && this.isMatching && this.lastInvite) {
                            this.sendNetworkMessage('smile_baseball/lobby', this.lastInvite);
                        } else {
                            clearInterval(this.inviteIntervalId);
                            this.inviteIntervalId = null;
                        }
                    }, 400);

                    this.sendNetworkMessage('smile_baseball/lobby', this.lastInvite);

                    if (this.mqttClient) this.mqttClient.subscribe('smile_baseball/' + roomId);
                    this.completeMatchmaking(data.userName, data.char, data.skin, false);
                }
            } 
            // 2. 방장으로부터 매칭 초대(MATCH_INVITE) 수신 시 게스트 수락
            else if (data.type === 'MATCH_INVITE' && data.guestPeerId === this.myPeerId) {
                if (!this.isMatching) return;

                this.activeRoom = data.room;
                this.isMultiplayer = true;
                this.isHost = false;
                this.userRole = data.guestRole;
                this.resetCamera();
                this.updateHUD();

                const accept = {
                    type: 'MATCH_ACCEPT',
                    hostPeerId: data.hostPeerId,
                    guestPeerId: this.myPeerId,
                    room: data.room,
                    guestName: this.p1.name,
                    guestChar: this.p1.char,
                    guestSkin: this.p1.skin
                };
                this.sendNetworkMessage('smile_baseball/lobby', accept);
                this.sendNetworkMessage('smile_baseball/' + data.room, accept);

                if (this.mqttClient) this.mqttClient.subscribe('smile_baseball/' + data.room);
                this.completeMatchmaking(data.hostName, data.hostChar, data.hostSkin, false);
            } 
            // 3. 방장이 게스트의 수락(MATCH_ACCEPT) 확인
            else if (data.type === 'MATCH_ACCEPT' && data.hostPeerId === this.myPeerId && data.room === this.activeRoom) {
                if (this.inviteIntervalId) {
                    clearInterval(this.inviteIntervalId);
                    this.inviteIntervalId = null;
                }
                if (this.mqttClient) this.mqttClient.subscribe('smile_baseball/' + data.room);
            }
            return;
        }

        // [2] 룸 실시간 인게임 플레이 동기화 (투구, 타격, 스윙, 작전)
        if (this.activeRoom && topic === 'smile_baseball/' + this.activeRoom) {
            if (data.senderPeerId === this.myPeerId) return;

            if (data.type === 'REMOTE_PITCH') {
                if (this.userRole === 'batter') {
                    this.applyRemotePitch(data);
                }
            } else if (data.type === 'REMOTE_SWING') {
                if (this.userRole === 'pitcher') {
                    this.triggerBatterSwing();
                }
            } else if (data.type === 'REMOTE_BUNT') {
                if (this.userRole === 'pitcher') {
                    this.batter.isBunting = true;
                }
            } else if (data.type === 'REMOTE_STEAL') {
                if (this.userRole === 'pitcher') {
                    this.attemptSteal();
                }
            } else if (data.type === 'REMOTE_TACTIC') {
                if (this.userRole === 'pitcher') {
                    this.activeTactic = data.tactic;
                }
            }
        }
    }

    bindEvents() {
        window.addEventListener('pointerdown', () => this.ensureAudio(), { once: true });

        // ⌨️ 키보드 조작
        window.addEventListener('keydown', (e) => {
            if (!this.isRunning) return;
            this.ensureAudio();

            const isCurrentPitcher = (this.userRole === 'pitcher');

            // --- 투수 조작 모드 ---
            if (isCurrentPitcher && this.gameState === 'aiming') {
                if (e.key === '1') this.selectPitchType('fastball');
                if (e.key === '2') this.selectPitchType('curve');
                if (e.key === '3') this.selectPitchType('slider');
                if (e.key === '4') this.selectPitchType('changeup');
                if (e.key === '5') this.selectPitchType('knuckleball');

                // WASD 및 방향키로 과녁 정밀 이동 (키보드 장착 태블릿 완벽 지원)
                let moved = false;
                const step = (e.shiftKey) ? 7 : 3.5;
                if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { this.pitchAimX = Math.max(-36, this.pitchAimX - step); moved = true; }
                if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { this.pitchAimX = Math.min(36, this.pitchAimX + step); moved = true; }
                if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { this.pitchAimY = Math.min(76, this.pitchAimY + step); moved = true; }
                if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { this.pitchAimY = Math.max(10, this.pitchAimY - step); moved = true; }
                if (moved) {
                    e.preventDefault();
                    this.setPitchAim(this.pitchAimX, this.pitchAimY);
                }

                // 투구 발사 (Space, Enter, F 키)
                if (e.code === 'KeyF' || e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.startPitchWindup();
                }
            }

            // --- 타자 조작 모드 ---
            if (!isCurrentPitcher || this.userRole === 'batter') {
                if (e.code === 'KeyQ') {
                    e.preventDefault();
                    this.triggerSqueezeBunt();
                } else if (e.code === 'KeyH') {
                    e.preventDefault();
                    this.triggerHitAndRun();
                } else if (e.code === 'KeyR') {
                    e.preventDefault();
                    this.triggerRunAndHit();
                } else if (e.code === 'KeyS' || e.code === 'KeyD') {
                    e.preventDefault();
                    this.attemptSteal();
                } else if (e.code === 'KeyB') {
                    e.preventDefault();
                    this.toggleBuntStance();
                } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyL') {
                    e.preventDefault();
                    if (this.batter.isBunting) {
                        // 번트 자세 중 스윙을 누르면 번트를 풀고 즉시 강타 타격으로 전환!
                        this.batter.isBunting = false;
                        const buntBtn = document.getElementById('btn-baseball-bunt');
                        if (buntBtn) buntBtn.classList.remove('active');
                        const squeezeBtn = document.getElementById('btn-baseball-squeeze');
                        if (squeezeBtn) squeezeBtn.classList.remove('active');
                    }
                    this.triggerBatterSwing();
                }
            }
        });

        // 🖱️ 캔버스 마우스 클릭 / 터치 드래그로 직접 3D 과녁 조준! (태블릿 터치 스크린 지원)
        if (this.canvas) {
            let isAimDragging = false;

            const handlePointerPitchAim = (e) => {
                if (this.userRole !== 'pitcher' || this.gameState !== 'aiming') return;
                const rect = this.canvas.getBoundingClientRect();
                // 📱 태블릿 터치 좌표를 캔버스 논리 해상도(this.width, this.height)로 1:1 완벽 보정
                const px = (e.clientX - rect.left) * (this.width / rect.width);
                const py = (e.clientY - rect.top) * (this.height / rect.height);
                // ⚾ 투수 시점 (cam.z=-30) vs 타자 시점 (cam.z=460) 기준 홈플레이트(z=380) 역투영
                const relZ = (this.userRole === 'pitcher') ? Math.max(15, 380 - this.camera.z) : Math.max(15, this.camera.z - 380);
                const scale = this.camera.fov / relZ;
                const aimX = this.camera.x + (px - this.width / 2) / scale;
                const aimY = this.camera.y - (py - this.height * 0.54) / scale;
                this.setPitchAim(Math.round(aimX), Math.round(aimY));
            };

            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                this.ensureAudio();
                if (this.userRole === 'pitcher') {
                    if (this.gameState === 'aiming') {
                        isAimDragging = true;
                        handlePointerPitchAim(e);
                    }
                } else {
                    this.triggerBatterSwing();
                }
            });

            this.canvas.addEventListener('pointermove', (e) => {
                if (isAimDragging && this.userRole === 'pitcher' && this.gameState === 'aiming') {
                    handlePointerPitchAim(e);
                }
            });

            window.addEventListener('pointerup', () => {
                isAimDragging = false;
            });
        }

        // 타자 스윙 원클릭 버튼
        const swingBtn = document.getElementById('btn-baseball-swing');
        if (swingBtn) {
            swingBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                this.ensureAudio();
                if (this.batter.isBunting) {
                    this.batter.isBunting = false;
                    const buntBtn = document.getElementById('btn-baseball-bunt');
                    if (buntBtn) buntBtn.classList.remove('active');
                }
                this.triggerBatterSwing();
            });
        }

        // 🪵 타자 번트 원클릭 토글 버튼
        const buntBtn = document.getElementById('btn-baseball-bunt');
        if (buntBtn) {
            buntBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.toggleBuntStance();
            });
        }

        // 🏃 타자 도루 원클릭 버튼 (S키)
        const stealBtn = document.getElementById('btn-baseball-steal');
        if (stealBtn) {
            stealBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.attemptSteal();
            });
        }

        // 🎯 스퀴즈 번트 버튼 (Q키)
        const squeezeBtn = document.getElementById('btn-baseball-squeeze');
        if (squeezeBtn) {
            squeezeBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.triggerSqueezeBunt();
            });
        }

        // ⚡ 히트 앤드 런 버튼 (H키)
        const hitrunBtn = document.getElementById('btn-baseball-hitrun');
        if (hitrunBtn) {
            hitrunBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.triggerHitAndRun();
            });
        }

        // 🌪️ 런 앤드 히트 버튼 (R키)
        const runhitBtn = document.getElementById('btn-baseball-runhit');
        if (runhitBtn) {
            runhitBtn.addEventListener('pointerdown', (e) => {
                if (!this.isRunning) return;
                e.preventDefault();
                e.stopPropagation();
                this.ensureAudio();
                this.triggerRunAndHit();
            });
        }

        // 투수 투구 버튼
        const pitchThrowBtn = document.getElementById('btn-pitch-throw');
        if (pitchThrowBtn) {
            pitchThrowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ensureAudio();
                if (this.gameState === 'aiming') this.startPitchWindup();
            });
        }

        // 구종 선택 버튼들
        const pitchBtns = document.querySelectorAll('.mlb-pitch-btn');
        pitchBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pType = btn.getAttribute('data-pitch');
                if (pType) {
                    this.selectPitchType(pType);
                    this.ensureAudio();
                }
            });
        });

        // 난이도 조절 버튼 (쉬움 / 보통 / 프로)
        const diffBtn = document.getElementById('btn-baseball-difficulty');
        if (diffBtn) {
            diffBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.toggleDifficulty();
            });
        }

        // 역할 변경 버튼 (투수 <-> 타자)
        const roleToggleBtn = document.getElementById('btn-baseball-role-toggle');
        if (roleToggleBtn) {
            roleToggleBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.toggleUserRole();
            });
        }

        // 온라인 매칭 룸 모달 열기 버튼
        const matchModalBtn = document.getElementById('btn-baseball-match-modal');
        if (matchModalBtn) {
            matchModalBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.showCharModal();
            });
        }

        // 다시 경기하기 버튼
        const restartBtn = document.getElementById('btn-baseball-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.ensureAudio();
                this.start();
            });
        }

        // 허브 복귀 버튼
        const hubBtn = document.getElementById('btn-baseball-hub');
        if (hubBtn) hubBtn.addEventListener('click', () => this.openHubModal());

        // 게임오버 모달 버튼들
        const goRestartBtn = document.getElementById('btn-baseball-go-restart');
        if (goRestartBtn) {
            goRestartBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                this.start();
            });
        }

        const goHubBtn = document.getElementById('btn-baseball-go-hub');
        if (goHubBtn) {
            goHubBtn.addEventListener('click', () => {
                this.hideGameOverModal();
                this.openHubModal();
            });
        }

        this.bindMatchmakingModalEvents();
    }

    bindMatchmakingModalEvents() {
        // 역할 선택 버튼 (투수 / 타자)
        const roleBtns = document.querySelectorAll('.role-btn');
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const r = btn.getAttribute('data-role');
                if (r) {
                    this.userRole = r;
                    safeSetStorage('smilegames_bb_user_role', r);
                    roleBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.updateCharSelectionUI();
                }
            });
        });

        // 캐릭터 선택 버튼
        const charBtns = document.querySelectorAll('#baseball-user-char-selector .select-btn');
        charBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cId = btn.getAttribute('data-char');
                if (cId) {
                    this.p1.char = cId;
                    this.p1.skin = 'classic';
                    safeSetStorage('smilegames_bb_user_char', cId);
                    safeSetStorage('smilegames_bb_user_skin', 'classic');
                    this.updateCharSelectionUI();
                }
            });
        });

        // 🌐 서버 매칭 대결 시작 버튼 (10초 카운트다운)
        const startMatchBtn = document.getElementById('btn-baseball-start-match');
        if (startMatchBtn) {
            startMatchBtn.addEventListener('click', () => {
                this.startServerMatchmaking();
            });
        }

        // 🤖 즉시 AI 연습 대결 버튼
        const directAIBtn = document.getElementById('btn-baseball-direct-ai');
        if (directAIBtn) {
            directAIBtn.addEventListener('click', () => {
                this.cancelMatchmaking();
                this.setupChallengerAI();
                this.hideCharModal();
                this.start();
            });
        }

        const modalHubBtn = document.getElementById('btn-baseball-batter-hub');
        if (modalHubBtn) {
            modalHubBtn.addEventListener('click', () => {
                this.cancelMatchmaking();
                this.hideCharModal();
                this.openHubModal();
            });
        }
    }

    startServerMatchmaking() {
        if (this.isMatching) return;
        this.isMatching = true;
        this.matchCountdown = 10;
        this.activeRoom = null;
        this.isMultiplayer = false;

        const matchBox = document.getElementById('mlb-matchmaking-box');
        const timerEl = document.getElementById('mlb-match-timer');
        const statusEl = document.getElementById('mlb-radar-status');
        const rivalPreview = document.getElementById('mlb-rival-preview');

        if (matchBox) matchBox.style.display = 'block';
        if (rivalPreview) rivalPreview.style.display = 'none';
        if (timerEl) timerEl.textContent = '00:10';
        if (statusEl) statusEl.textContent = '📡 글로벌 서버 매칭 탐색 중... [10초 후 AI 자동 매칭]';

        this.initNetwork();

        // 실시간 매칭 신호 (MQTT 브로커 및 브로드캐스트 채널 다중 송신)
        const broadcastPing = () => {
            if (!this.isMatching) return;
            const payload = {
                type: 'FIND_RIVAL',
                peerId: this.myPeerId,
                role: this.userRole,
                userName: this.p1.name,
                char: this.p1.char,
                skin: this.p1.skin,
                time: Date.now()
            };
            this.sendNetworkMessage('smile_baseball/lobby', payload);
        };

        broadcastPing();
        this.playUmpireWhistle(600, 0.15);

        // 10초 카운트다운 타이머 시작
        if (this.matchTimerId) clearInterval(this.matchTimerId);
        this.matchTimerId = setInterval(() => {
            this.matchCountdown--;
            if (timerEl) {
                timerEl.textContent = `00:${this.matchCountdown < 10 ? '0' : ''}${this.matchCountdown}`;
            }

            // 매 초마다 핑을 전송하여 상대가 조금 늦게 들어와도 즉시 상호 매칭!
            broadcastPing();

            if (this.matchCountdown <= 0) {
                clearInterval(this.matchTimerId);
                this.matchTimerId = null;
                // 10초 초과 시 🤖 AI 에이스 라이벌 매칭!
                this.setupChallengerAI();
                this.completeMatchmaking(this.p2.name, this.p2.char, this.p2.skin, true);
            }
        }, 1000);
    }

    applyRemotePitch(data) {
        if (!data || this.gameState !== 'aiming') return;
        this.selectedPitchType = data.pType || 'fastball';
        this.startPitchWindup();
        setTimeout(() => {
            if (this.gameState === 'windup') {
                this.releasePitch(data);
            }
        }, 720);
    }

    completeMatchmaking(rivalName, rivalChar, rivalSkin, isAI = false) {
        if (this.matchTimerId) {
            clearInterval(this.matchTimerId);
            this.matchTimerId = null;
        }

        this.p2.name = rivalName;
        this.p2.char = rivalChar;
        this.p2.skin = rivalSkin;
        this.p2.isAI = isAI;

        const statusEl = document.getElementById('mlb-radar-status');
        const rivalPreview = document.getElementById('mlb-rival-preview');
        const rivalNameEl = document.getElementById('mlb-rival-name');

        if (statusEl) statusEl.textContent = '🔥 매칭 성공! 스타디움으로 입장합니다!';
        if (rivalNameEl) {
            const cObj = this.characters[rivalChar] || this.characters.monkey;
            rivalNameEl.textContent = `${cObj.emoji} ${rivalName}`;
        }
        if (rivalPreview) rivalPreview.style.display = 'flex';

        this.playHomeRunFanfare();

        setTimeout(() => {
            this.isMatching = false;
            const matchBox = document.getElementById('mlb-matchmaking-box');
            if (matchBox) matchBox.style.display = 'none';
            this.hideCharModal();
            this.start();
        }, 1200);
    }

    cancelMatchmaking() {
        this.isMatching = false;
        if (this.matchTimerId) {
            clearInterval(this.matchTimerId);
            this.matchTimerId = null;
        }
        const matchBox = document.getElementById('mlb-matchmaking-box');
        if (matchBox) matchBox.style.display = 'none';
    }

    setupChallengerAI() {
        const pool = [
            { name: 'KIA_에이스_김지훈', char: 'tiger', skin: 'classic' },
            { name: '마구장인_박주아', char: 'frog', skin: 'cyber' },
            { name: '사이드암_최우영', char: 'penguin', skin: 'classic' },
            { name: '4번거포_전준우', char: 'monkey', skin: 'classic' },
            { name: '흥덕초_에이스_이수', char: 'tiger', skin: 'away' }
        ];
        // 나의 캐릭터와 다른 캐릭터 우선 선택
        const available = pool.filter(p => p.char !== this.p1.char);
        const pick = (available.length > 0) ? available[Math.floor(Math.random() * available.length)] : pool[0];

        this.p2.name = `🤖 [AI] ${pick.name}`;
        this.p2.char = pick.char;
        this.p2.skin = pick.skin;
        this.p2.isAI = true;
    }

    setUserRole(role) {
        if (role !== 'batter' && role !== 'pitcher') return;
        this.userRole = role;
        safeSetStorage('smilegames_bb_user_role', this.userRole);
        this.resetCamera();
        this.updateHUD();
        this.showResultBanner(
            (this.userRole === 'batter') ? '🏏 타자 모드 (포수 뒤 시점) ON' : '⚾ 투수 모드 (마운드 뒤 시점) ON',
            (this.userRole === 'batter') ? '공이 정면으로 날아옵니다! [Enter/클릭]으로 타격!' : '[클릭/버튼/WASD]로 볼/스트라이크 결정 후 [Space]로 투구!',
            '#38bdf8'
        );
        this.prepareNextPitch(0.6);
    }

    setRole(role) {
        this.setUserRole(role);
    }

    toggleUserRole() {
        this.setUserRole((this.userRole === 'batter') ? 'pitcher' : 'batter');
    }

    setDifficulty(diff) {
        if (!['easy', 'normal', 'pro'].includes(diff)) return;
        this.difficulty = diff;
        safeSetStorage('smilegames_bb_difficulty', this.difficulty);
        this.updateDifficultyUI();
        const diffNames = {
            easy: '⭐ 쉬움 (초보자)',
            normal: '🔥 보통 (표준)',
            pro: '💀 프로 (MLB 하드코어)'
        };
        const diffDescs = {
            easy: '비행 속도가 약간 여유로워지고 타격 판정 범위가 넓어집니다.',
            normal: '⚾ 실전 MLB 체감! 극대화된 변화구 무브먼트와 리얼 타이밍 타격!',
            pro: '💀 155km/h 초광속구와 극단적 변화구! 찰나의 타이밍과 정밀 타격 요구!'
        };
        this.showResultBanner(`난이도: ${diffNames[this.difficulty]}`, diffDescs[this.difficulty], '#38bdf8');
    }

    toggleDifficulty() {
        if (this.difficulty === 'normal') this.setDifficulty('pro');
        else if (this.difficulty === 'pro') this.setDifficulty('easy');
        else this.setDifficulty('normal');
    }

    updateDifficultyUI() {
        const btn = document.getElementById('btn-baseball-difficulty');
        if (!btn) return;
        btn.classList.remove('normal', 'pro');
        if (this.difficulty === 'easy') {
            btn.textContent = '⭐ 쉬움 (초보자)';
        } else if (this.difficulty === 'normal') {
            btn.classList.add('normal');
            btn.textContent = '🔥 보통 (표준)';
        } else {
            btn.classList.add('pro');
            btn.textContent = '💀 프로 (MLB)';
        }
    }

    start() {
        this.init();
        this.resize();
        this.ensureAudio();

        // 점수 및 카운트 초기화
        this.p1.score = 0;
        this.p1.hits = 0;
        this.p1.homeRuns = 0;

        this.p2.score = 0;
        this.p2.hits = 0;
        this.p2.homeRuns = 0;

        // 💎 베이스 주자 초기화 (주자 없음)
        this.bases.first = false;
        this.bases.second = false;
        this.bases.third = false;
        this.activeRunners = [];

        // 🏏 1번 타자부터 선발 타선 시작
        this.lineupIndex = 0;

        if (this.fielders) {
            this.fielders.forEach(f => {
                f.x = f.defaultX;
                f.z = f.defaultZ;
                f.y = 0;
                f.action = 'ready';
                f.runTimer = 0;
                f.isAssigned = false;
            });
        }
        this.fieldingThrow = null;

        this.inningHalf = 'top';
        this.outs = 0;
        this.strikes = 0;
        this.balls = 0;
        this.lastResultWasBall = false;
        this.maxDistance = 0;
        if (!this.difficulty) this.difficulty = 'normal';

        this.particles = [];
        this.fireworks = [];
        this.bannerText = '';
        this.bannerAlpha = 0;

        this.resetCamera();
        this.hideGameOverModal();
        this.hideCharModal();
        this.updateHUD();

        this.isRunning = true;
        this.prepareNextPitch(1.0);

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        let lastTime = performance.now();

        const loop = (now) => {
            if (!this.isRunning) return;
            const dt = Math.min((now - lastTime) / 1000, 0.08);
            lastTime = now;

            this.update(dt);
            this.render();

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);

        const rText = (this.userRole === 'batter') ? '🏏 타자 타석 입장! (포수 뒤 시점)' : '⚾ 투수 마운드 등판! (투수 뒤 시점)';
        this.showResultBanner('⚾ PLAY BALL! MLB 26 개막 ⚾', rText, '#38bdf8');
        if (this.commentary) {
            this.commentary.trigger('GAME_START');
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    resetCamera() {
        if (this.userRole === 'pitcher') {
            // ⚾ [컴투스 프로야구 투수 화면 (GIF 원작)] 투수 등 뒤 백뷰 (마운드 뒤에서 홈플레이트 응시)
            this.camera.x = 18;
            this.camera.y = 66;
            this.camera.z = -30;
            this.camera.fov = 360;
        } else {
            // 🏏 [스마일 홈런 더비 타자 화면] 홈플레이트 뒤에서 투수 마운드 응시
            this.camera.x = 0;
            this.camera.y = 56;
            this.camera.z = 460;
            this.camera.fov = 360;
        }
        this.camera.shake = 0;
    }

    prepareNextPitch(delay = 1.0) {
        this.gameState = 'aiming';
        this.stateTimer = delay;
        this.ball.active = false;
        this.ball.isHit = false;
        this.ball.hasSwung = false;
        this.lastResultWasBall = false;
        this.batter.isSwinging = false;
        this.batter.swingProgress = 0;
        this.activeRunners = [];
        this.pitcher.phase = 'ready';
        this.pitcher.phaseTimer = 0;
        this.resetCamera();
        if (this.ball) this.ball.trail = [];

        // 수비수 기본 수비 위치로 복귀
        if (this.fielders) {
            this.fielders.forEach(f => {
                f.x = f.defaultX;
                f.z = f.defaultZ;
                f.y = 0;
                f.action = 'ready';
                f.runTimer = 0;
                f.isAssigned = false;
            });
        }
        this.fieldingThrow = null;

        // 타자 모드일 때: 상대 컴퓨터(AI 투수)가 자동으로 구종과 코스를 정하고 투구!
        if (this.userRole === 'batter') {
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'aiming') {
                    const opponentPitcher = this.getCurrentPitcher();
                    const types = ['fastball', 'curve', 'slider', 'changeup', 'knuckleball'];
                    // 특화 구종 가중치 부여
                    if (opponentPitcher.id === 'frog' && Math.random() < 0.45) this.selectedPitchType = 'curve';
                    else if (opponentPitcher.id === 'penguin' && Math.random() < 0.45) this.selectedPitchType = 'slider';
                    else if (opponentPitcher.id === 'tiger' && Math.random() < 0.45) this.selectedPitchType = 'fastball';
                    else if (Math.random() < 0.25) this.selectedPitchType = 'knuckleball';
                    else this.selectedPitchType = types[Math.floor(Math.random() * types.length)];

                    // ⚾ 상황별 MLB 프로 볼배합 전략 (2스트라이크 시 결정구 유인구, 3볼 시 스트라이크 승부!)
                    if (this.strikes === 2 && Math.random() < 0.65) {
                        // 2스트라이크: 삼진을 뺏어내기 위한 횡슬라이더 / 폭포수 커브 / 너클볼 유인구!
                        this.selectedPitchType = (Math.random() < 0.5) ? 'slider' : (Math.random() < 0.5 ? 'curve' : 'knuckleball');
                        this.pitchAimX = (Math.random() < 0.5) ? (28 + Math.random() * 8) : (-28 - Math.random() * 8);
                        this.pitchAimY = (this.selectedPitchType === 'curve') ? (14 + Math.random() * 8) : (32 + Math.random() * 26);
                        this.startPitchWindup();
                        return;
                    }

                    // ⚾ [MLB 실전 볼배합 시스템] 볼/스트라이크의 진짜 야구 승부!
                    // 볼넷(Walk)도 얻어내고 유인구를 골라내는 선구안의 재미를 위해 약 38% 확률로 볼 투구!
                    const ballProb = (this.difficulty === 'easy') ? 0.28 : (this.difficulty === 'pro' ? 0.44 : 0.38);
                    const isIntentionalBall = (Math.random() < ballProb);
                    if (isIntentionalBall) {
                        const ballType = Math.random();
                        if (ballType < 0.28) {
                            // 높은 볼 (하이 패스트볼: 타자 눈높이 위)
                            this.pitchAimX = (Math.random() - 0.5) * 32;
                            this.pitchAimY = 73 + Math.random() * 8;
                        } else if (ballType < 0.56) {
                            // 바운드성 낮은 볼 (원바운드 로우 유인구)
                            this.pitchAimX = (Math.random() - 0.5) * 32;
                            this.pitchAimY = 8 + Math.random() * 7;
                        } else if (ballType < 0.78) {
                            // 바깥쪽으로 빠지는 볼 (우타자 기준 바깥쪽 와이드 코스)
                            this.pitchAimX = 32 + Math.random() * 10;
                            this.pitchAimY = 24 + Math.random() * 32;
                        } else {
                            // 몸쪽 깊숙한 위협구 (우타자 기준 몸쪽 위협 코스)
                            this.pitchAimX = -32 - Math.random() * 10;
                            this.pitchAimY = 24 + Math.random() * 32;
                        }
                    } else {
                        // 스트라이크존 안쪽 칠 만한 코스 노리기 (x: -18 ~ 18, y: 28 ~ 60)
                        this.pitchAimX = (Math.random() - 0.5) * 32;
                        this.pitchAimY = 28 + Math.random() * 30;
                    }
                    this.startPitchWindup();
                }
            }, 750);
        }
    }

    startPitchWindup() {
        if (this.gameState !== 'aiming') return;
        this.gameState = 'windup';
        this.pitcher.phase = 'windup';
        this.pitcher.phaseTimer = 0;
        this.playPitchWindupSound();
    }

    pitch() {
        this.startPitchWindup();
    }

    throwPitch() {
        this.startPitchWindup();
    }

    releasePitch(remoteData = null) {
        const pitcherChar = this.getCurrentPitcher();
        const pType = (remoteData && remoteData.pType) ? remoteData.pType : this.selectedPitchType;

        // ⚾ 현실적인 KBO/MLB 프로 구속 계산 (광속 직구 154~160km/h, 극대화된 슬로우 변화구)
        let baseSpeed = pitcherChar.fastballSpeed || 156;
        if (pType === 'curve') baseSpeed = 112; // 112km/h 슬로우 파워 커브 (느린 낙차)
        if (pType === 'slider') baseSpeed = 136;
        if (pType === 'changeup') baseSpeed = 118; // 118km/h 체인지업 (직구 대비 38km/h 오프스피드!)
        if (pType === 'knuckleball') baseSpeed = 94; // 너클볼: 90~96km/h의 초슬로우 마구!

        const finalSpeed = (remoteData && typeof remoteData.speedKm === 'number')
            ? remoteData.speedKm
            : Math.round(baseSpeed + (Math.random() - 0.5) * 6);

        // 🎯 [유저 직접 제구 & 볼/스트라이크 판정 100% 결정권]
        let actualTargetX = this.pitchAimX;
        let actualTargetY = this.pitchAimY;

        if (remoteData && typeof remoteData.aimX === 'number' && typeof remoteData.aimY === 'number') {
            actualTargetX = remoteData.aimX;
            actualTargetY = remoteData.aimY;
        } else if (this.userRole === 'pitcher') {
            const inZoneAim = (Math.abs(this.pitchAimX) <= 24 && this.pitchAimY >= 22 && this.pitchAimY <= 66);
            if (inZoneAim) {
                // 스트라이크 의도: 100% 스트라이크 존 안쪽으로 정밀 안착 보장!
                actualTargetX = Math.max(-21, Math.min(21, this.pitchAimX + (Math.random() - 0.5) * 3));
                actualTargetY = Math.max(25, Math.min(63, this.pitchAimY + (Math.random() - 0.5) * 3));
            } else {
                // 볼/유인구 의도: 100% 스트라이크 존 바깥(볼)으로 확정 제구!
                actualTargetX = this.pitchAimX + (Math.random() - 0.5) * 3;
                actualTargetY = this.pitchAimY + (Math.random() - 0.5) * 3;
                if (Math.abs(actualTargetX) < 32 && actualTargetY > 15 && actualTargetY < 73) {
                    actualTargetX = (actualTargetX >= 0) ? 33 : -33;
                }
            }
        } else {
            const spread = (this.difficulty === 'easy') ? 4 : (this.difficulty === 'pro' ? 12 : 7);
            actualTargetX = this.pitchAimX + (Math.random() - 0.5) * spread;
            actualTargetY = this.pitchAimY + (Math.random() - 0.5) * spread;
        }

        // ⚾ [구종별 비행 시간 - 직구는 초광속(0.44s), 변화구는 강력한 슬로우 오프스피드(0.72s~0.88s)]
        let diffFactor = 1.0;
        if (this.difficulty === 'easy') diffFactor = 1.25;
        else if (this.difficulty === 'pro') diffFactor = 0.86;

        let flightDuration = (remoteData && typeof remoteData.flightDuration === 'number')
            ? remoteData.flightDuration
            : (0.44 * diffFactor);

        if (!remoteData) {
            if (pType === 'fastball') flightDuration = (156 / finalSpeed) * 0.44 * diffFactor;
            else if (pType === 'slider') flightDuration = 0.54 * diffFactor;
            else if (pType === 'changeup') flightDuration = 0.72 * diffFactor;
            else if (pType === 'curve') flightDuration = 0.78 * diffFactor;
            else if (pType === 'knuckleball') flightDuration = 0.88 * diffFactor;
        }

        // 🌐 [크로스 디바이스 1:1 대전] 투수가 던진 공 정보 상대 타자 단말로 실시간 브로드캐스팅
        if (!remoteData && this.isMultiplayer && this.userRole === 'pitcher' && this.activeRoom) {
            this.sendNetworkMessage('smile_baseball/' + this.activeRoom, {
                type: 'REMOTE_PITCH',
                pType: pType,
                speedKm: finalSpeed,
                aimX: actualTargetX,
                aimY: actualTargetY,
                flightDuration: flightDuration
            });
        }

        // 4대 투구폼별 리얼 3D 릴리즈 포인트 좌표 (오버핸드/쓰리쿼터/사이드암/언더핸드 잠수함)
        const pChar = this.getCurrentPitcher();
        const pStyle = pChar ? pChar.pitchStyle : 'overhand';
        let releaseX = 0;
        let releaseY = 46;
        if (pStyle === 'overhand') {
            releaseX = 4;
            releaseY = 64; // 고공 12시 오버핸드 타점 (2.1m 위에서 아래로 내리꽂히는 궤적)
        } else if (pStyle === 'threequarter') {
            releaseX = 14;
            releaseY = 50; // 자연스러운 1시반 3/4 대각 슬롯
        } else if (pStyle === 'sidearm') {
            releaseX = 34;
            releaseY = 32; // 3시 방향 횡방향 사이드암 와이프아웃 슬롯
        } else if (pStyle === 'submarine') {
            releaseX = 22;
            releaseY = 12; // 지면 10cm 높이에서 솟구쳐 오르는 언더핸드 업슛 슬롯!
        }
        const releaseZ = 85;
        const targetZ = 420; // 포수 미트 위치 (홈플레이트 z=380 통과 후 포구)

        this.lastResultWasBall = false;
        this.ball = {
            active: true,
            speedKm: finalSpeed,
            flightDuration: flightDuration,
            startX: releaseX,
            startY: releaseY,
            startZ: releaseZ,
            x: releaseX,
            y: releaseY,
            z: releaseZ,
            targetX: actualTargetX,
            targetY: actualTargetY,
            targetZ: targetZ,
            radius: 8.5,
            rot: 0,
            type: pType,
            speedKmh: finalSpeed,
            isHit: false,
            hasSwung: false,
            hitType: null,
            flightTimer: 0,
            hitDist: 0,
            trail: []
        };

        this.pitcher.phase = 'release';
        this.gameState = 'in_flight';
        this.playPitchThrowSound(pType);
        this.createReleaseSparks(releaseX, releaseY, releaseZ);

        // 스피드건 레이더 팝업 표시 (구종별 극대화된 무브먼트 특성 포함)
        const pNameMap = {
            fastball: '⚡ 4-SEAM FIREBALL • 156KM/H 광속 직구 (Rising Hop)',
            curve: '🌀 12-6 RAINBOW CURVE • 수직 폭포수 슬로커브 (-58cm Plunge)',
            slider: '🌪️ WICKED SWEEPER • 횡와이프아웃 38cm 슬라이더',
            changeup: '🐢 OFF-SPEED CHANGEUP • 직구 대비 340ms 느린 체인지업',
            knuckleball: '🔮 MYSTIC KNUCKLEBALL • 3D 카오스 초슬로우 무회전 마구'
        };
        this.showRadarGun(finalSpeed, pNameMap[pType] || 'FASTBALL');

        if (this.commentary) {
            this.commentary.trigger('PITCH_RELEASE', {
                pitchName: pNameMap[pType] || pType,
                speed: finalSpeed,
                count: `${this.balls}B ${this.strikes}S`,
                zone: (Math.abs(actualTargetX) <= 12 && actualTargetY >= 32 && actualTargetY <= 56) ? '한가운데' : '외곽'
            });
        }

        // 🤖 [컴투스 프로야구 2026] 초현실적 AI 타자 정밀 타격 & 선구안 알고리즘
        // - 실투(한가운데 빠른공/몰린 공)는 놓치지 않고 92~98% 확률로 통타(적시타/초대형 장외 홈런 폭발!)
        // - 코너워크 좋은 공은 끈질기게 커트하거나 루킹 스트라이크 유도
        // - 존 바깥 유인구는 예리한 선구안(Eye)으로 침착하게 골라내어 볼카운트 싸움
        if (this.userRole === 'pitcher' && !this.isMultiplayer) {
            const currBatter = this.getCurrentBatter();
            const currLineup = this.getCurrentBatterLineup();
            const isStrikePitch = (Math.abs(actualTargetX) <= 24 && actualTargetY >= 22 && actualTargetY <= 66);
            const isMeatball = (Math.abs(actualTargetX) <= 12 && actualTargetY >= 32 && actualTargetY <= 56);
            const isBorderline = isStrikePitch && !isMeatball && (Math.abs(actualTargetX) >= 16 || actualTargetY <= 28 || actualTargetY >= 58);

            // 🎯 핫존 판정 (타자가 특히 잘 치는 선호 코스)
            const cellCol = (actualTargetX < -8) ? 0 : (actualTargetX > 8 ? 2 : 1);
            const cellRow = (actualTargetY > 51) ? 0 : (actualTargetY < 37 ? 2 : 1);
            const zoneIdx = cellRow * 3 + cellCol;
            const isHotZone = (currBatter.hotZones && currBatter.hotZones.includes(zoneIdx)) || false;

            let aiWillSwing = false;
            let aiSwingTimingOffset = 0; // 초 단위 타이밍 오차

            if (isMeatball) {
                // 💥 [한가운데 실투 (Meatball)]: 투수가 한가운데로 던지면 절대 놓치지 않는 프로 타자 본능!
                // 92% 확률로 호쾌한 스윙! (핫존이거나 중심타선이면 98% 스윙)
                const swingChance = (isHotZone || (currLineup && currLineup.order <= 4)) ? 0.98 : 0.92;
                aiWillSwing = (Math.random() < swingChance);

                // 완벽한 타이밍 배트 스윗스팟 컨택! (타구 속도 165~180km/h 장타/홈런 폭발!)
                aiSwingTimingOffset = (Math.random() - 0.5) * 0.016;

            } else if (isHotZone && isStrikePitch) {
                // 🔥 [핫존 스트라이크]: 타자가 노리고 있는 킬러 코스!
                aiWillSwing = (Math.random() < 0.88);
                aiSwingTimingOffset = (Math.random() - 0.5) * 0.024;

            } else if (isStrikePitch) {
                // ⚡ [일반 스트라이크 코스]
                if (isBorderline) {
                    // 코너워크 보더라인 (페인팅존 모서리 명품 제구):
                    // 볼카운트가 유리할 땐 지켜보고(루킹 스트라이크 유도), 2스트라이크면 삼진 방지 커트 스윙!
                    let swingChance = 0.55;
                    if (this.strikes === 2) swingChance = 0.88; // 2스트라이크면 적극 커트
                    else if (this.balls >= 3) swingChance = 0.25; // 3볼이면 기다림
                    aiWillSwing = (Math.random() < swingChance);

                    // 코너워크 공이므로 타이밍 오차가 발생 (파울로 걷어내거나 빗맞은 범타/호수비 유도)
                    aiSwingTimingOffset = (Math.random() - 0.5) * 0.06;
                } else {
                    // 좋은 스트라이크:
                    let swingChance = 0.80;
                    if (this.strikes === 2) swingChance = 0.94;
                    aiWillSwing = (Math.random() < swingChance);

                    // 구종별 타이밍 반응:
                    if (pType === 'changeup' || pType === 'knuckleball') {
                        // 오프스피드 체인지업/너클볼: 65% 확률로 타이밍을 뺏겨 앞선 스윙(-0.08s) or 35% 참아내어 정타
                        aiSwingTimingOffset = (Math.random() < 0.65) ? (-0.08 - Math.random() * 0.08) : ((Math.random() - 0.5) * 0.025);
                    } else if (pType === 'curve') {
                        // 낙차 큰 커브:
                        aiSwingTimingOffset = (Math.random() < 0.60) ? (-0.06 - Math.random() * 0.08) : ((Math.random() - 0.5) * 0.025);
                    } else if (finalSpeed >= 152) {
                        // 152km 이상 광속구 직구: 밀려서 늦은 스윙(+0.05s) 발생 가능
                        aiSwingTimingOffset = (Math.random() < 0.55) ? (0.05 + Math.random() * 0.06) : ((Math.random() - 0.5) * 0.02);
                    } else if (pType === 'slider') {
                        // 횡변화 슬라이더: 빗맞은 타구
                        aiSwingTimingOffset = (Math.random() - 0.5) * 0.045;
                    } else {
                        aiSwingTimingOffset = (Math.random() - 0.5) * 0.035;
                    }
                }
            } else {
                // ⚪ [존 바깥의 볼 / 유인구 코스]
                // 프로 타자의 뛰어난 선구안(Eye): 0~1스트라이크에서는 85% 확률로 침착하게 볼을 골라냄!
                let chaseProb = 0.15;
                if (this.strikes === 2) {
                    // 2스트라이크 몰렸을 때만 유인구(바깥쪽 슬라이더, 원바운드 포크)에 속을 확률 48%!
                    chaseProb = 0.48;
                } else if (this.balls === 3) {
                    // 3볼에서는 96% 확률로 골라내어 볼넷 출루!
                    chaseProb = 0.04;
                }

                aiWillSwing = (Math.random() < chaseProb);

                // 유인구에 속았을 때는 헛스윙 또는 빗맞은 파울
                if (pType === 'slider' || pType === 'curve') {
                    aiSwingTimingOffset = -0.14 - Math.random() * 0.08;
                } else {
                    aiSwingTimingOffset = 0.12 + Math.random() * 0.08;
                }
            }

            if (aiWillSwing) {
                const swingDelay = Math.max(0.18, (flightDuration * 0.88) + aiSwingTimingOffset);
                setTimeout(() => {
                    if (this.isRunning && this.gameState === 'in_flight' && !this.ball.isHit) {
                        this.triggerBatterSwing();
                    }
                }, swingDelay * 1000);
            }
        }
    }

    /**
     * 🎯 MLB 3x3 스트라이크 존 판정 오버레이 카드 표시
     */
    showPitchTrackerOverlay(tx, ty, isStrike, speed, pType) {
        const tracker = document.getElementById('mlb-pitch-tracker');
        const badge = document.getElementById('mlb-tracker-call-badge');
        const speedEl = document.getElementById('mlb-tracker-speed');
        const dot = document.getElementById('mlb-tracker-dot');
        const descEl = document.getElementById('mlb-tracker-desc');

        if (!tracker || !badge || !speedEl || !dot || !descEl) return;

        if (isStrike) {
            badge.className = 'tracker-call-badge strike';
            badge.textContent = '⚡ STRIKE';
            dot.className = 'tracker-ball-dot strike';
        } else {
            badge.className = 'tracker-call-badge ball';
            badge.textContent = '⚪ BALL';
            dot.className = 'tracker-ball-dot ball';
        }

        speedEl.textContent = `${speed} KM/H`;

        // 3x3 스트라이크존 (x: -24 ~ 24, y: 22 ~ 66)에 점 매핑
        // 스트라이크는 [0%, 100%] 박스 내부, 볼(유인구)은 박스 바깥([-16%, 116%])에 정확히 위치!
        const rawPercentX = 50 + (tx / 48) * 100;
        const rawPercentY = 100 - ((ty - 22) / 44) * 100;
        const percentX = Math.max(-16, Math.min(116, rawPercentX));
        const percentY = Math.max(-16, Math.min(116, rawPercentY));

        dot.style.left = `${percentX.toFixed(1)}%`;
        dot.style.top = `${percentY.toFixed(1)}%`;

        let pitchName = '⚡ 4-SEAM 직구 (라이징 백스핀 +45cm)';
        if (pType === 'curve') pitchName = '🌀 12-6 파워 커브 (수직 폭포수 급낙차 -58cm)';
        else if (pType === 'slider') pitchName = '🌪️ 스위퍼/슬라이더 (횡 와이프아웃 38cm)';
        else if (pType === 'changeup') pitchName = '🐢 서클 체인지업 (에어브레이킹 싱커 -34cm)';
        else if (pType === 'knuckleball') pitchName = '🔮 무회전 너클볼 (3D 카오스 플러터)';

        let locationDesc = isStrike ? '스트라이크 존 통과' : '존을 벗어난 볼';
        if (this.ball && this.ball.hasSwung) {
            locationDesc = '헛스윙 스트라이크';
        }
        descEl.textContent = `${pitchName} • ${locationDesc}`;

        tracker.style.display = 'flex';
        if (this.trackerTimer) clearTimeout(this.trackerTimer);
        this.trackerTimer = setTimeout(() => {
            tracker.style.display = 'none';
        }, 2200);
    }

    /**
     * 🔄 타석 종료 시 볼/스트라이크 카운트 초기화 및 다음 타순 진행
     */
    resetAtBatCount(advanceLineup = true) {
        this.balls = 0;
        this.strikes = 0;
        this.lastResultWasBall = false;
        this.activeTactic = null;
        ['btn-baseball-squeeze', 'btn-baseball-hitrun', 'btn-baseball-runhit', 'btn-baseball-bunt'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
        });
        if (this.ball) {
            this.ball.hasSwung = false;
        }
        if (advanceLineup && this.lineup && this.lineup.length > 0) {
            this.lineupIndex = (this.lineupIndex + 1) % this.lineup.length;
        }
        this.updateHUD();
    }

    /**
     * 🛡️ 타구 방향에 따른 전담 수비수 지정 및 추격 모드 활성화
     */
    assignFielderForBall(role) {
        if (!this.fielders) return;
        this.fielders.forEach(f => {
            f.isAssigned = (f.role === role);
            f.action = f.isAssigned ? 'pursuing' : 'ready';
            f.runTimer = 0;
        });
    }

    showRadarGun(speed, pitchName) {
        const popup = document.getElementById('mlb-radar-popup');
        const speedEl = document.getElementById('mlb-radar-speed');
        const pitchEl = document.getElementById('mlb-radar-pitch');

        if (popup && speedEl && pitchEl) {
            speedEl.textContent = `${speed} KM/H`;
            pitchEl.textContent = pitchName;
            popup.style.display = 'block';

            if (this.radarTimeout) clearTimeout(this.radarTimeout);
            this.radarTimeout = setTimeout(() => {
                popup.style.display = 'none';
            }, 1800);
        }
    }

    triggerBatterSwing() {
        // [1] 방금 포구 직후 늦은 헛스윙 판정 정정 (볼 판정 후 스윙 시 100% 헛스윙 스트라이크로 즉각 정정)
        if (this.gameState === 'result_pause' && this.lastResultWasBall) {
            this.correctLateSwingToStrike();
            return;
        }

        if (this.batter.isSwinging) return;
        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // ⚾ 현재 투구에 스윙 시도 플래그 영구 기록 (이후 어떤 판정이 오더라도 헛스윙 스트라이크 보장)
        if (this.ball) {
            this.ball.hasSwung = true;
        }

        // 🌐 [크로스 디바이스 1:1 대전] 타자의 스윙 타이밍을 상대 투수 단말에 실시간 전송
        if (this.isMultiplayer && this.userRole === 'batter' && this.activeRoom) {
            this.sendNetworkMessage('smile_baseball/' + this.activeRoom, {
                type: 'REMOTE_SWING'
            });
        }

        if (this.gameState === 'in_flight' && this.ball && this.ball.active && !this.ball.isHit) {
            this.checkBatContact();
        }
    }

    /**
     * 🎯 [스마일 홈런 더비 3D] 스퀴즈 번트 (Squeeze Bunt) 작전 (Q키)
     * - 3루 주자가 있을 때 결사 쇄도하여 100% 득점하는 필살 작전!
     * - 번트 컨택트 시 3루 주자 100% 홈 득점 세이프 (+1점 득점)
     * - 타자는 50% 세이프티 스퀴즈 번트 안타 (1루 세이프) / 50% 1루 희생 아웃
     */
    triggerSqueezeBunt() {
        if (!this.isRunning || this.userRole !== 'batter') return;
        if (!this.bases.third) {
            this.showResultBanner('⚠️ 스퀴즈 번트 불가!', '3루에 주자가 있을 때만 스퀴즈 번트 작전이 가능합니다!', '#f59e0b');
            return;
        }

        this.activeTactic = 'squeeze';
        this.batter.isBunting = true;
        this.batter.isSwinging = false;

        const squeezeBtn = document.getElementById('btn-baseball-squeeze');
        if (squeezeBtn) squeezeBtn.classList.add('active');
        const buntBtn = document.getElementById('btn-baseball-bunt');
        if (buntBtn) buntBtn.classList.add('active');

        this.playSwingSound();
        this.showResultBanner('🎯 [작전] 결사 스퀴즈 번트 가동!!', '3루 주자 홈으로 전력 쇄도! 공에 배트를 정확히 대세요! (Q키)', '#f59e0b');

        if (this.isMultiplayer && this.activeRoom) {
            this.sendNetworkMessage('smile_baseball/' + this.activeRoom, {
                type: 'REMOTE_TACTIC',
                tactic: 'squeeze'
            });
        }
    }

    /**
     * ⚡ [스마일 홈런 더비 3D] 히트 앤드 런 (Hit & Run) 작전 (H키)
     * - 투구와 동시에 루상 주자가 무조건 다음 베이스로 스타트!
     * - 타자는 어떤 코스든 배트를 휘둘러 인플레이 타구를 생성!
     * - 내야 땅볼 시에도 병살타(Double Play) 100% 원천 방지!
     * - 단타 1루타 성공 시 1루 주자 3루까지 폭풍 2베이스 진루!
     */
    triggerHitAndRun() {
        if (!this.isRunning || this.userRole !== 'batter') return;
        const hasRunners = (this.bases.first || this.bases.second || this.bases.third);
        if (!hasRunners) {
            this.showResultBanner('⚠️ 히트 & 런 불가!', '루상에 주자가 있어야 히트 & 런 작전을 펼칠 수 있습니다!', '#f59e0b');
            return;
        }

        this.activeTactic = 'hit_and_run';
        const hitrunBtn = document.getElementById('btn-baseball-hitrun');
        if (hitrunBtn) hitrunBtn.classList.add('active');

        this.playUmpireWhistle(800, 0.1);
        this.showResultBanner('⚡ [작전] 히트 & 런 (Hit & Run) 가동!!', '주자가 투구와 동시에 달립니다! 어떤 공이든 무조건 치세요! (H키)', '#ef4444');

        if (this.isMultiplayer && this.activeRoom) {
            this.sendNetworkMessage('smile_baseball/' + this.activeRoom, {
                type: 'REMOTE_TACTIC',
                tactic: 'hit_and_run'
            });
        }
    }

    /**
     * 🌪️ [스마일 홈런 더비 3D] 런 앤드 히트 (Run & Hit) 스마트 작전 (R키)
     * - 주자는 투구와 동시에 도루 스타트!
     * - 타자는 스트라이크 좋은 공만 골라치고, 나쁜 볼은 지켜봄!
     * - 스트라이크 타격 시: 컨택트 판정 보너스 +30% & 2베이스 진루
     * - 나쁜 볼 지켜볼 시: 70% 높은 확률로 단독 도루 세이프!
     */
    triggerRunAndHit() {
        if (!this.isRunning || this.userRole !== 'batter') return;
        const hasRunners = (this.bases.first || this.bases.second || this.bases.third);
        if (!hasRunners) {
            this.showResultBanner('⚠️ 런 & 히트 불가!', '루상에 주자가 있어야 런 & 히트 작전이 가능합니다!', '#f59e0b');
            return;
        }

        this.activeTactic = 'run_and_hit';
        const runhitBtn = document.getElementById('btn-baseball-runhit');
        if (runhitBtn) runhitBtn.classList.add('active');

        this.playUmpireWhistle(900, 0.1);
        this.showResultBanner('🌪️ [작전] 런 & 히트 (Run & Hit) 가동!!', '주자 스타트! 좋은 스트라이크만 치고, 나쁜 볼은 도루에 맡기세요! (R키)', '#06b6d4');

        if (this.isMultiplayer && this.activeRoom) {
            this.sendNetworkMessage('smile_baseball/' + this.activeRoom, {
                type: 'REMOTE_TACTIC',
                tactic: 'run_and_hit'
            });
        }
    }

    /**
     * 🪵 [스마일 홈런 더비 3D] 번트 자세 토글
     */
    toggleBuntStance() {
        if (this.userRole !== 'batter' || !this.isRunning) return;
        this.batter.isBunting = !this.batter.isBunting;
        if (this.batter.isBunting) this.batter.isSwinging = false;
        const buntBtn = document.getElementById('btn-baseball-bunt');
        if (buntBtn) buntBtn.classList.toggle('active', this.batter.isBunting);

        if (this.batter.isBunting) {
            this.showResultBanner('🪵 [스마일] 번트 자세 세팅!', '배트를 홈플레이트 앞으로 수평으로 갖다 댑니다 (B키로 취소)', '#f59e0b');
            this.playSwingSound();
        } else {
            this.showResultBanner('🏏 [스마일] 풀스윙 스탠스 복귀', '호쾌한 홈런 타격 스탠스로 전환되었습니다', '#38bdf8');
        }
    }

    /**
     * 🪵 [스마일 홈런 더비 3D] 번트 타구 컨택트 및 진루/아웃 처리
     * 유저 명시 요구사항:
     * - 스퀴즈 번트 (Squeeze Bunt): 3루 주자 100% 홈 득점 세이프 & 타자 50% 세이프/50% 아웃
     * - 일반 번트 성공 확률 60% 보장 (희생 번트 전원 진루 or 기습 세이프티 번트 안타)
     * - 일반 번트 실패 확률 40% (쓰리번트 파울 삼진 / 팝플라이 / 병살타 / 1루 땅볼 포구 아웃)
     */
    executeBuntHit(b) {
        b.isHit = true;
        b.hitType = 'bunt';
        this.gameState = 'hit_flight';
        this.batter.isBunting = false;
        const buntBtn = document.getElementById('btn-baseball-bunt');
        if (buntBtn) buntBtn.classList.remove('active');
        const squeezeBtn = document.getElementById('btn-baseball-squeeze');
        if (squeezeBtn) squeezeBtn.classList.remove('active');

        // 번트 타구 사운드 ("툭-!" 데드볼 소리)
        this.playBuntSound();

        const prevBases = { ...this.bases };
        const hasRunners = (this.bases.first || this.bases.second || this.bases.third);

        // 🎯 1. 스퀴즈 번트 (Squeeze Bunt) 특수 발동!
        if (this.activeTactic === 'squeeze' || (this.bases.third && Math.random() < 0.20 && hasRunners)) {
            this.activeTactic = null;
            if (this.commentary) {
                this.commentary.trigger('TACTIC_SQUEEZE');
            }
            const dir = (Math.random() < 0.5) ? -1 : 1;
            b.vx = dir * (20 + Math.random() * 15);
            b.vy = 8;
            b.vz = -100;
            b.hitDist = 18;

            // 3루 주자 100% 결사 홈 쇄도 득점 세이프 (+1점)!
            this.bases.third = false;
            this.addScore(1, 'squeeze');
            this.playUmpireSafeSound();

            // 다른 주자들도 안전 1루씩 진루
            if (this.bases.second) { this.bases.third = true; this.bases.second = false; }
            if (this.bases.first) { this.bases.second = true; this.bases.first = false; }

            // 타자는 50% 세이프티 스퀴즈 번트 안타 (1루 세이프), 50% 1루 희생 아웃
            const isBatterSafe = (Math.random() < 0.50);
            if (isBatterSafe) {
                this.bases.first = true;
                this.spawnBaseRunners('bunt_sac', prevBases);
                this.resetAtBatCount(true);
                this.showResultBanner('🔥 [스퀴즈 대성공] 3루 주자 홈 쇄도 (+1점) & 타자 1루 세이프!!', '결사 스퀴즈 번트로 득점과 출루를 동시에 달성했습니다!', '#22c55e');
            } else {
                this.outs += 1;
                this.spawnBaseRunners('bunt_sac', prevBases);
                this.resetAtBatCount(false);
                this.showResultBanner('🪵 [스퀴즈 작전 성공] 3루 주자 슬라이딩 홈인 (+1점 득점)!!', '타자 희생 번트 아웃, 3루 주자 완벽 득점 성공! (1아웃)', '#22c55e');
            }
            this.updateHUD();
            return;
        }

        const isBuntSuccess = (Math.random() < 0.60); // ⚾ 60% 성공 보장!

        if (isBuntSuccess) {
            // 🎯 [60% 번트 작전 성공]
            const dir = (Math.random() < 0.5) ? -1 : 1;
            b.vx = dir * (28 + Math.random() * 20);
            b.vy = 8 + Math.random() * 5;
            b.vz = -105 - Math.random() * 25;
            b.hitDist = 20;

            if (hasRunners) {
                // 주자가 있는 상황: 전원 안전 1루씩 진루!
                let scored = 0;
                if (this.bases.third) { this.bases.third = false; scored++; }
                if (this.bases.second) { this.bases.third = true; this.bases.second = false; }
                if (this.bases.first) { this.bases.second = true; this.bases.first = false; }
                if (scored > 0) this.addScore(scored, 'bunt');

                // 35% 확률로 타자도 전력 질주 세이프 (세이프티 스퀴즈 번트 안타!)
                const batterSafe = (Math.random() < 0.35);
                if (batterSafe) {
                    this.bases.first = true;
                    this.playUmpireSafeSound();
                    this.spawnBaseRunners('bunt_sac', prevBases);
                    this.resetAtBatCount(true);
                    this.showResultBanner('⚡ [스마일] 환상의 세이프티 번트 안타!!', '주자 전원 진루 및 타자 1루 전력 질주 세이프! (60% 작전 성공)', '#38bdf8');
                } else {
                    this.outs += 1;
                    this.playCatchSound();
                    this.spawnBaseRunners('bunt_sac', prevBases);
                    this.resetAtBatCount(false);
                    this.showResultBanner('🪵 [스마일] 완벽한 희생 번트 작전 성공!!', '타자 1루 아웃, 주자 전원 진루 성공! (60% 작전 성공)', '#22c55e');
                }
            } else {
                // 주자가 없을 때: 기습 드래그 번트 1루 안타 세이프!
                this.bases.first = true;
                this.playUmpireSafeSound();
                this.spawnBaseRunners('single', prevBases);
                this.resetAtBatCount(true);
                this.showResultBanner('⚡ [스마일] 3루선 타고 흐르는 기습 번트 내야 안타!!', '총알같은 전력 질주로 1루에서 간발의 차 세이프! (60% 성공)', '#38bdf8');
            }
        } else {
            // 🛡️ [40% 번트 작전 실패]
            if (this.strikes >= 2 && Math.random() < 0.35) {
                // 2스트라이크 쓰리번트 파울 삼진 아웃!
                b.vz = 45;
                b.vy = 28;
                b.vx = (Math.random() - 0.5) * 60;
                this.camera.shake = 12;
                this.playBatHitSound('foul');
                this.recordOut('⚠️ 2스트라이크 쓰리번트 파울! 자동 삼진 아웃! (K!)');
                this.showResultBanner('⚡ 쓰리번트 파울 삼진 아웃!!', '2스트라이크 이후 번트 파울은 자동 삼진 규정 적용', '#ef4444');
                this.updateHUD();
                return;
            }

            if (this.bases.first && Math.random() < 0.50) {
                // 1루 주자 있을 때 투수 앞 정면 번트 병살타 (Double Play, 2아웃)
                b.vx = (Math.random() - 0.5) * 14;
                b.vy = 8;
                b.vz = -120;
                b.hitDist = 15;
                this.camera.shake = 18;
                this.assignFielderForBall('P');
                b.isDoublePlay = true;

                const ssFielder = this.fielders.find(f => f.role === 'SS' || f.role === '2B');
                const firstBaseman = this.fielders.find(f => f.role === '1B');

                this.fieldingThrow = {
                    active: true,
                    startX: 0,
                    startY: 12,
                    startZ: 280,
                    targetX: ssFielder ? ssFielder.x : 0,
                    targetY: 16,
                    targetZ: ssFielder ? ssFielder.z : 100,
                    x: 0,
                    y: 12,
                    z: 280,
                    progress: 0,
                    speed: 4.2,
                    catcher: ssFielder,
                    isRelayDoublePlay: true,
                    finalTarget: firstBaseman
                };

                this.bases.first = false;
                this.outs += 2;
                this.camera.shake = 22;
                this.playCatchSound();
                this.resetAtBatCount(false);
                this.showResultBanner('⚡ [스마일] 투수 앞 번트 병살타 작렬!! (DOUBLE PLAY)', '투수 ➔ 2루 ➔ 1루 전광석화 릴레이 병살타 완성! (2아웃)', '#ef4444');
                this.updateHUD();
                return;
            }

            // 일반 번트 1루 땅볼 포구 아웃
            const dir = (Math.random() < 0.5) ? -1 : 1;
            b.vx = dir * (25 + Math.random() * 20);
            b.vy = 8;
            b.vz = -90;
            b.hitDist = 16;
            this.spawnBaseRunners('bunt_out', prevBases);
            this.recordOut('🛡️ 번트 타구 수비수 빠른 포구 송구 아웃!');
            this.showResultBanner('🛡️ 번트 1루 땅볼 아웃!', '수비수의 빠른 대쉬로 1루에서 아웃되었습니다.', '#ef4444');
        }

        this.updateHUD();
    }

    /**
     * 🏃 [스마일 홈런 더비 3D] 자유 도루 시스템 (언제든 시도 가능 & 포수 레이저 송구 & 세이프/아웃 판정)
     * 유저 지정 성공 확률:
     * - 1루 주자 -> 2루 도루: 50% 성공
     * - 2루 주자 -> 3루 도루: 30% 성공
     * - 3루 주자 -> 홈스틸: 5% 성공
     */
    attemptSteal(force = false) {
        if (!this.isRunning) return;
        if (this.fieldingThrow && this.fieldingThrow.active) return;
        if (this.gameState === 'hit_flight' || (!force && this.gameState === 'result_pause')) return;

        if (!this.bases.first && !this.bases.second && !this.bases.third) {
            this.showResultBanner('🏃 루상에 주자 없음!', '루상에 주자가 없습니다. 먼저 안타나 볼넷으로 출루하세요!', '#94a3b8');
            return;
        }

        if (this.commentary) {
            this.commentary.trigger('STEAL_PLAY');
        }

        let stealType = '';
        let startKey = '';
        let targetKey = '';
        let successChance = 0;
        let targetCoords = null;

        // 우선순위 판정:
        if (this.bases.third && !this.bases.second && !this.bases.first) {
            stealType = 'home';
            startKey = '3B';
            targetKey = 'HOME';
            successChance = 0.05; // 5%
            targetCoords = this.BASE_POS['HOME'];
        } else if (this.bases.second && !this.bases.third) {
            stealType = 'second_to_third';
            startKey = '2B';
            targetKey = '3B';
            successChance = 0.30; // 30%
            targetCoords = this.BASE_POS['3B'];
        } else if (this.bases.first && !this.bases.second) {
            stealType = 'first_to_second';
            startKey = '1B';
            targetKey = '2B';
            successChance = 0.50; // 50%
            targetCoords = this.BASE_POS['2B'];
        } else if (this.bases.first && this.bases.second && !this.bases.third) {
            stealType = 'double_steal';
            startKey = '2B';
            targetKey = '3B';
            successChance = 0.30; // 30%
            targetCoords = this.BASE_POS['3B'];
        } else if (this.bases.third) {
            stealType = 'home';
            startKey = '3B';
            targetKey = 'HOME';
            successChance = 0.05; // 5%
            targetCoords = this.BASE_POS['HOME'];
        } else {
            stealType = 'first_to_second';
            startKey = '1B';
            targetKey = '2B';
            successChance = 0.50;
            targetCoords = this.BASE_POS['2B'];
        }

        const isSafe = (Math.random() < successChance);

        // 실시간 주루 애니메이션 생성
        const runnerChar = this.getCurrentBatter();
        const runnerSkin = this.getCurrentBatterSkin();
        this.activeRunners = [{
            id: Math.random(),
            char: runnerChar,
            skin: runnerSkin,
            path: [startKey, targetKey],
            legIndex: 0,
            progress: 0,
            x: this.BASE_POS[startKey].x,
            y: 0,
            z: this.BASE_POS[startKey].z,
            runCycle: Math.random() * 6.28,
            speed: 1.15,
            isBatter: false,
            isHome: (targetKey === 'HOME'),
            isFinished: false
        }];

        // ⚾ 포수의 총알 송구 (Laser Throw) 발사 애니메이션
        this.playPitchThrowSound('fastball');
        this.fieldingThrow = {
            active: true,
            isStealThrow: true,
            startX: 0,
            startY: 18,
            startZ: 410,
            targetX: targetCoords.x,
            targetY: 15,
            targetZ: targetCoords.z,
            x: 0,
            y: 18,
            z: 410,
            progress: 0,
            speed: 3.8,
            onComplete: () => {
                if (isSafe) {
                    this.playUmpireSafeSound();
                    if (stealType === 'home') {
                        this.bases.third = false;
                        this.addScore(1, 'steal');
                        this.showResultBanner('🔥 [도루] 5%의 기적! 단독 홈스틸 성공!! (SAFE)', '포수 태그를 피하며 홈플레이트 전격 슬라이딩 터치! (+1점 득점)', '#f59e0b');
                    } else if (stealType === 'second_to_third') {
                        this.bases.second = false;
                        this.bases.third = true;
                        this.showResultBanner('⚡ [도루] 3루 기습 도루 성공!! (SAFE)', '30% 확률을 뚫고 3루에 헤드퍼스트 슬라이딩 안착! (득점권 진루)', '#22c55e');
                    } else if (stealType === 'first_to_second') {
                        this.bases.first = false;
                        this.bases.second = true;
                        this.showResultBanner('⚡ [도루] 2루 도루 전격 성공!! (SAFE)', '50% 확률 성공! 빠른 스타트로 2루를 훔쳤습니다!', '#22c55e');
                    } else if (stealType === 'double_steal') {
                        this.bases.second = false;
                        this.bases.third = true;
                        this.bases.first = false;
                        this.bases.second = true;
                        this.showResultBanner('🌪️ [도루] 더블 스틸 완벽 성공!! (SAFE)', '2루 및 3루 더블 도루로 상대 배터리를 완벽히 흔들었습니다!', '#22c55e');
                    }
                } else {
                    this.playCatchSound();
                    if (stealType === 'home') {
                        this.bases.third = false;
                        this.recordOut('🚨 홈스틸 저지! 포수 블로킹 태그 아웃! (Caught Stealing)');
                        this.showResultBanner('🚨 [도루] 단독 홈스틸 실패! 태그 아웃!', '포수의 침착한 블로킹에 막혀 홈에서 아웃되었습니다 (95% 저지)', '#ef4444');
                    } else if (stealType === 'second_to_third') {
                        this.bases.second = false;
                        this.recordOut('🚨 3루 도루 저지! 3루수 총알 태그 아웃! (Caught Stealing)');
                        this.showResultBanner('🚨 [도루] 3루 도루 실패! 태그 아웃!', '포수의 레이저 송구에 3루에서 저지당했습니다 (70% 저지)', '#ef4444');
                    } else if (stealType === 'first_to_second') {
                        this.bases.first = false;
                        this.recordOut('🚨 2루 도루 저지! 2루수 태그 아웃! (Caught Stealing)');
                        this.showResultBanner('🚨 [도루] 2루 도루 실패! 태그 아웃!', '포수의 2루 총알 송구에 걸려 아웃되었습니다 (50% 저지)', '#ef4444');
                    } else if (stealType === 'double_steal') {
                        this.bases.second = false;
                        this.bases.first = false;
                        this.bases.second = true;
                        this.recordOut('🚨 더블 스틸 선행 주자 3루 태그 아웃!');
                        this.showResultBanner('🚨 [도루] 선행 2루 주자 3루에서 저지 아웃!', '포수의 정확한 3루 송구로 1아웃이 추가되었습니다', '#ef4444');
                    }
                }
                this.updateHUD();
            }
        };
    }

    /**
     * 📢 심판 세이프 판정 호각 / 징글 사운드
     */
    playUmpireSafeSound() {
        this.ensureAudio();
        if (!this.audioCtx) return;
        try {
            const ctx = this.audioCtx;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.28);
        } catch (e) {}
    }

    correctLateSwingToStrike() {
        this.lastResultWasBall = false;
        this.batter.isSwinging = true;
        this.batter.swingTime = 0;
        this.playSwingSound();

        // 직전에 잘못 부여된 볼 카운트 즉시 회수
        if (this.balls > 0) {
            this.balls--;
        }

        const pType = (this.ball && this.ball.type) || 'fastball';
        this.handleDeceptiveSwingMiss('late', pType, 40);
    }

    swing() {
        this.triggerBatterSwing();
    }

    bat() {
        this.triggerBatterSwing();
    }

    checkBatContact() {
        const b = this.ball;
        const z = b.z;
        const batterChar = this.getCurrentBatter();
        const lineupItem = this.getCurrentBatterLineup();

        const sweetSpotZ = 380;
        const diffZ = z - sweetSpotZ; // 음수: 이른 스윙, 양수: 늦은 스윙

        const isEasy = (this.difficulty === 'easy');
        const isPro = (this.difficulty === 'pro');

        // 🐾 난이도별 타격 허용 한계 (보통 모드는 실전성 높은 긴장감 넘치는 공방!)
        const earlyLimit = isEasy ? -75 : (isPro ? -28 : -44);
        const lateLimit = isEasy ? 58 : (isPro ? 24 : 36);
        const maxDistXY = isEasy ? 48 : (isPro ? 22 : 34);

        // 1. ⚠️ 타이밍 판정 (너무 이르거나 늦은 헛스윙)
        if (diffZ < earlyLimit) {
            this.handleDeceptiveSwingMiss('early', b.type, diffZ);
            return;
        } else if (diffZ > lateLimit) {
            this.handleDeceptiveSwingMiss('late', b.type, diffZ);
            return;
        }

        // 2. ⚠️ 2D 로케이션 판정 (스트라이크 존을 너무 크게 벗어난 경우)
        const dx = b.x;
        const dy = (b.y - 44) * 0.85;
        const distXY = Math.sqrt(dx * dx + dy * dy);

        if (distXY > maxDistXY) {
            this.handleDeceptiveSwingMiss('chase', b.type, distXY);
            return;
        }

        // 3. 💥 정타 판정 및 타구 비행 시작! (컴투스 프로야구 리얼 타구 물리)
        b.isHit = true;
        this.gameState = 'hit_flight';

        const prevBases = { ...this.bases };
        const absDiffZ = Math.abs(diffZ);

        // 🎯 컴투스 프로야구 핫존(Hot Zone) 공략 여부 판정
        const cellCol = (b.x < -8) ? 0 : (b.x > 8 ? 2 : 1);
        const cellRow = (b.y > 51) ? 0 : (b.y < 37 ? 2 : 1);
        const zoneIdx = cellRow * 3 + cellCol;
        const isHotZone = (batterChar.hotZones && batterChar.hotZones.includes(zoneIdx)) || false;

        const hrTiming = isEasy ? 22 : (isPro ? 10 : 14);
        const hrDist = isEasy ? 20 : (isPro ? 10 : 13);

        const hitTiming = isEasy ? 44 : (isPro ? 22 : 30);
        const hitDist = isEasy ? 32 : (isPro ? 16 : 22);

        // [1] 💥 PERFECT CONTACT: 초특대형 홈런!
        if (absDiffZ <= hrTiming && distXY <= hrDist) {
            b.hitType = 'homerun';
            let dist = Math.round(132 + (lineupItem.powerBonus || 0) + (batterChar.powerBonus || 0) + (isHotZone ? 18 : 0) + Math.random() * 24);
            if (b.type === 'knuckleball') dist += 8;

            b.hitDist = dist;
            if (dist > this.maxDistance) this.maxDistance = dist;

            const scoredRuns = this.advanceRunnersOnHit('homerun');
            this.spawnBaseRunners('homerun', prevBases);
            this.addScore(scoredRuns, 'homerun');
            this.resetAtBatCount(true);

            b.vz = -580 - Math.random() * 80;
            b.vy = 350 + Math.random() * 60;
            b.vx = (b.x * 2.2) + (Math.random() - 0.5) * 120;

            this.camera.shake = isHotZone ? 32 : 24;
            this.playBatHitSound('homerun', isHotZone);
            this.triggerHomeRunCelebration(dist, scoredRuns, isHotZone);

            if (this.commentary) {
                const isGrandSlam = (scoredRuns >= 4);
                this.commentary.trigger(isGrandSlam ? 'HIT_GRAND_SLAM' : 'HIT_HOMERUN', {
                    dist: dist,
                    runs: scoredRuns,
                    batter: batterChar.name,
                    speed: b.speedKm || 150
                });
            }
        }
        // [2] 🎯 GREAT CONTACT: 2루타 / 3루타 / 1루타 / 총알 라인드라이브
        else if (absDiffZ <= hitTiming && distXY <= hitDist) {
            const isLineDrive = (Math.random() < 0.35); // 35% 확률로 총알 라인드라이브 타구 발생!
            const isTriple = !isLineDrive && (Math.random() < 0.15 * (lineupItem.contactBonus || 1.0));
            const isDouble = !isTriple && (isLineDrive ? (Math.random() < 0.50) : (Math.random() < 0.45 * (lineupItem.doubleBonus || batterChar.doubleBonus || 1.0)));
            const hitType = isTriple ? 'triple' : (isDouble ? 'double' : 'single');
            b.hitType = hitType;
            b.isLineDrive = isLineDrive;

            const dist = isTriple ? Math.round(110 + Math.random() * 15) : (isDouble ? Math.round(94 + Math.random() * 24) : Math.round(68 + Math.random() * 22));
            b.hitDist = dist;
            if (dist > this.maxDistance) this.maxDistance = dist;

            const scoredRuns = this.advanceRunnersOnHit(hitType);
            this.spawnBaseRunners(hitType, prevBases);
            this.addScore(scoredRuns, hitType);
            this.resetAtBatCount(true);

            if (isLineDrive) {
                // ⚡ 총알 라인드라이브: 낮고 빠르게 날아가는 초고속 직선타 궤적!
                b.vz = -510 - Math.random() * 50;
                b.vy = 65 + Math.random() * 20;
                b.vx = (b.x * 2.2) + (Math.random() - 0.5) * 150;
            } else {
                b.vz = -430 - Math.random() * 50;
                b.vy = 130 + Math.random() * 35;
                b.vx = (b.x * 2.0) + (Math.random() - 0.5) * 160;
            }

            this.camera.shake = isLineDrive ? 18 : 10;
            this.playBatHitSound('hit');
            let titleText = isLineDrive ? '⚡ [총알 라인드라이브] 내야를 꿰뚫는 강력한 직선타 안타!!' : '⚾ 1루타 클린 안타 성공!';
            if (hitType === 'triple') titleText = '⚡ 3루타! 우중간을 가르는 총알 3루타!';
            else if (hitType === 'double') titleText = isLineDrive ? '⚡ [라인드라이브 2루타] 외야수를 꿰뚫는 시원한 2루타!' : '🌪️ 2루타! 외야를 가르는 시원한 2루타!';

            // 외야수 수비 추격 지정
            let targetRole = 'CF';
            if (b.vx < -50) targetRole = 'LF';
            else if (b.vx > 50) targetRole = 'RF';
            this.assignFielderForBall(targetRole);

            const subText = (scoredRuns > 0) ? `주자 홈인! (+${scoredRuns}점 득점)` : `주자 진루 (비거리 ${dist}m)`;

            // ⚡ 히트 앤드 런 & 런 앤드 히트 정타 시 폭풍 진루 보너스
            if (this.activeTactic === 'hit_and_run') {
                this.activeTactic = null;
                titleText = '🌪️ [히트 & 런 대성공] 1루 주자 3루 폭풍 진루 클린 안타!!';
                this.showResultBanner(titleText, '사전 스타트 효과로 단타에 2베이스를 질주했습니다!', '#38bdf8');
                if (this.commentary) this.commentary.trigger('TACTIC_HIT_AND_RUN');
            } else if (this.activeTactic === 'run_and_hit') {
                this.activeTactic = null;
                titleText = '🔥 [런 & 히트 정타] 스마트 타격 대성공!!';
                this.showResultBanner(titleText, '좋은 스트라이크를 골라쳐서 주자와 함께 안타 작렬!', '#22c55e');
                if (this.commentary) this.commentary.trigger('TACTIC_RUN_AND_HIT');
            } else {
                this.showResultBanner(titleText, subText, '#38bdf8');
                if (this.commentary) {
                    if (isLineDrive) {
                        this.commentary.trigger('HIT_LINEDRIVE', {
                            dist: dist,
                            batter: batterChar.name,
                            runs: scoredRuns
                        });
                    } else {
                        this.commentary.trigger('HIT_CLEAN', {
                            dist: dist,
                            batter: batterChar.name,
                            runs: scoredRuns
                        });
                    }
                }
            }
        }
        // [3] 🛡️ 내야 땅볼 / 외야 플라이 / 라인드라이브 아웃
        else if (absDiffZ <= hitTiming + 18 && distXY <= hitDist + 12) {
            b.hitType = 'out';
            this.playBatHitSound('hit');

            // ⚡ 불운의 라인드라이브 직선타 아웃 여부 (20% 확률)
            const isLineout = (absDiffZ <= hitTiming + 8 && Math.random() < 0.22);
            b.isLineout = isLineout;

            const isFlyOut = isLineout || (absDiffZ > hitTiming + 6 || Math.random() < 0.42);
            b.isFlyOut = isFlyOut;

            // ⚡ [히트 앤드 런] 주자가 미리 스타트를 끊었으므로 내야 땅볼 시 병살타 100% 방지!
            if (this.activeTactic === 'hit_and_run' && !isFlyOut) {
                this.activeTactic = null;
                let scored = 0;
                if (this.bases.third) { this.bases.third = false; scored++; }
                if (this.bases.second) { this.bases.third = true; this.bases.second = false; }
                if (this.bases.first) { this.bases.second = true; this.bases.first = false; }
                if (scored > 0) this.addScore(scored, 'hit_and_run');
                this.recordOut('🛡️ [히트 & 런] 사전 주루 스타트로 병살타 원천 방지! 타자만 1루 아웃');
                this.showResultBanner('⚡ [히트 & 런] 병살타 원천 방지 성공! 주자 진루!!', '주자가 미리 스타트를 끊어 병살타를 완벽히 막아냈습니다! (1아웃)', '#22c55e');
                this.updateHUD();
                return;
            }

            if (isLineout) {
                // ⚡ 총알 라인드라이브 직선타 타구 (낮고 빠르게 내야/외야 정면 비행)
                b.vy = 42 + Math.random() * 15;
                b.vz = -380 - Math.random() * 35;
                b.vx = (b.x * 1.8) + (Math.random() - 0.5) * 110;

                let targetRole = 'SS';
                if (b.vx < -40) targetRole = '3B';
                else if (b.vx < 10) targetRole = 'SS';
                else if (b.vx < 60) targetRole = '2B';
                else targetRole = '1B';
                this.assignFielderForBall(targetRole);
            } else if (isFlyOut) {
                // 외야/내야 플라이볼 타구 (높은 궤적)
                b.vy = 185 + Math.random() * 45;
                b.vz = -260 - Math.random() * 40;
                b.vx = (b.x * 2.2) + (Math.random() - 0.5) * 160;

                let targetRole = 'CF';
                if (b.vx < -55) targetRole = 'LF';
                else if (b.vx > 55) targetRole = 'RF';
                this.assignFielderForBall(targetRole);
            } else {
                // 내야 땅볼 타구 (지면을 낮게 깔려가는 빠른 타구)
                b.vy = 28 + Math.random() * 18;
                b.vz = -210 - Math.random() * 35;
                b.vx = (b.x * 2.0) + (Math.random() - 0.5) * 140;

                let targetRole = 'SS';
                if (b.vx < -45) targetRole = '3B';
                else if (b.vx < 15) targetRole = 'SS';
                else if (b.vx < 75) targetRole = '2B';
                else targetRole = '1B';
                this.assignFielderForBall(targetRole);
            }

            // 안전 타임아웃 (수비 인터셉트 지연 시 자동 아웃 처리)
            setTimeout(() => {
                if (this.isRunning && this.gameState === 'hit_flight' && b.hitType === 'out') {
                    this.recordOut('🛡️ 빗맞은 타구! 수비수 포구 아웃!');
                }
            }, 3200);
        }
        // [4] ⚠️ 빗맞은 관중석 파울볼
        else {
            b.hitType = 'foul';
            b.vz = -110;
            b.vy = 240;
            b.vx = (diffZ > 0) ? -320 : 320;

            if (this.strikes < 2) this.strikes++;
            this.playBatHitSound('foul');
            this.showResultBanner('⚠️ 빗맞은 파울볼!', '2스트라이크 이전 파울 (+1 스트라이크)', '#f59e0b');
            if (this.commentary) {
                this.commentary.trigger('SWING_FOUL', {
                    batter: batterChar.name,
                    count: `${this.balls}B ${this.strikes}S`
                });
            }
            this.updateHUD();
        }

        this.createHitSparks(b.x, b.y, b.z);
        this.updateHUD();
    }

    /**
     * 💨 구종 및 궤적에 속아 발생한 헛스윙 처리 (Deceptive Swing-and-Miss)
     * 배터가 스윙을 시도하여 헛돌았으므로 공 위치와 상관없이 100% 무조건 스트라이크!
     */
    handleDeceptiveSwingMiss(reason, pitchType, offsetVal) {
        if (this.ball) {
            this.ball.active = false;
            this.ball.hasSwung = true;
        }
        this.lastResultWasBall = false;
        this.strikes++;
        this.playCatchSound();
        this.playUmpireWhistle(1400, 0.2);

        // 🎯 헛스윙 시에도 실시간 MLB 스트라이크존 트래커 카드 즉시 팝업!
        const bX = (this.ball && this.ball.x !== undefined) ? this.ball.x : (this.ball ? this.ball.targetX : 0);
        const bY = (this.ball && this.ball.y !== undefined) ? this.ball.y : (this.ball ? this.ball.targetY : 44);
        const bSpeed = (this.ball && this.ball.speedKm) || 148;
        this.showPitchTrackerOverlay(bX, bY, true, bSpeed, pitchType);

        let title = '💨 헛스윙 스트라이크! (SWING AND MISS)';
        let desc = '완벽하게 타이밍을 뺏겼습니다!';

        if (reason === 'early') {
            if (pitchType === 'changeup') {
                title = '🐢 [TOO EARLY] 125km/h 체인지업에 낚임!';
                desc = '직구인 줄 알고 배트를 너무 일찍 돌렸습니다!';
            } else if (pitchType === 'curve') {
                title = '🌀 [TOO EARLY] 12-6 파워 커브에 앞선 헛스윙!';
                desc = '느린 폭포수 낙차를 기다리지 못하고 헛스윙!';
            } else if (pitchType === 'knuckleball') {
                title = '🔮 [TOO EARLY] 무회전 너클볼에 헛스윙!';
                desc = '초슬로우 마구의 타이밍에 완전히 속았습니다!';
            } else {
                title = '⚠️ [TOO EARLY] 스윙 타이밍이 너무 빠릅니다!';
                desc = '투수의 완급조절에 속아 이른 헛스윙!';
            }
        } else if (reason === 'late') {
            if (pitchType === 'fastball') {
                title = '⚡ [TOO LATE] 154km/h 불꽃 강속구에 배트 밀림!';
                desc = '광속구의 압도적인 구속을 따라가지 못했습니다!';
            } else {
                title = '⚠️ [TOO LATE] 타이밍이 늦었습니다!';
                desc = '공이 이미 포수 미트에 꽂힌 후 헛스윙!';
            }
        } else if (reason === 'chase') {
            if (pitchType === 'slider') {
                title = '🌪️ [CHASE] 날카로운 슬라이더에 낚여 헛스윙!';
                desc = '가운데 직구인 줄 알고 돌렸으나 바깥쪽으로 예리하게 도망침!';
            } else if (pitchType === 'curve') {
                title = '🌀 [CHASE] 원바운드 폭포수 커브에 헛스윙!';
                desc = '존 밑으로 떨어지는 유인구에 배트가 딸려 나갔습니다!';
            } else if (this.ball && this.ball.y < 22) {
                title = '⚪ [CHASE] 흙먼지 원바운드 볼에 헛스윙!';
                desc = '낮게 가라앉는 유인구에 속았습니다!';
            } else if (this.ball && this.ball.y > 66) {
                title = '⚪ [CHASE] 높은 하이볼 유인구에 헛스윙!';
                desc = '눈높이로 솟아오르는 하이볼에 배트 헛손질!';
            } else {
                title = '⚪ [CHASE] 유인구에 속아 헛스윙!';
                desc = '스트라이크 존을 벗어난 공에 낚였습니다!';
            }
        }

        if (this.strikes >= 3) {
            this.recordOut('💨 3구 헛스윙 삼진 아웃! (STRIKE OUT!)');
        } else {
            this.showResultBanner(title, `${desc} (카운트: ${this.balls}B - ${this.strikes}S)`, '#facc15');
            this.gameState = 'result_pause';
            this.stateTimer = 1.3;
        }

        if (this.commentary) {
            this.commentary.trigger('STRIKE_SWINGING', {
                pitchName: pitchType,
                speed: bSpeed,
                batter: (this.getCurrentBatter() && this.getCurrentBatter().name) || '타자',
                pitcher: (this.getCurrentPitcher() && this.getCurrentPitcher().name) || '투수',
                count: `${this.balls}B ${this.strikes}S`
            });
        }

        // ⚡ 히트 앤드 런 작전 중 헛스윙 시 주자 강제 도루 승부
        if (this.activeTactic === 'hit_and_run') {
            this.activeTactic = null;
            setTimeout(() => {
                this.showResultBanner('🚨 [히트 & 런 헛스윙] 주자 강제 도루 승부!!', '타자 헛스윙! 주자가 포수 송구와 도루 승부를 펼칩니다!', '#ef4444');
                this.attemptSteal();
            }, 600);
        }

        this.updateHUD();
    }

    /**
     * 💎 야구 다이아몬드 베이스 주자 진루 및 득점 계산 로직
     */
    advanceRunners(hitType) {
        return this.advanceRunnersOnHit(hitType);
    }

    advanceRunnersOnHit(hitType) {
        let scored = 0;

        if (hitType === 'homerun') {
            scored = 1; // 타자 본인
            if (this.bases.first) { scored++; this.bases.first = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.third) { scored++; this.bases.third = false; }
        } else if (hitType === 'triple') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.first) { scored++; this.bases.first = false; }
            this.bases.third = true;
        } else if (hitType === 'double') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { scored++; this.bases.second = false; }
            if (this.bases.first) { this.bases.third = true; this.bases.first = false; }
            this.bases.second = true;
        } else if (hitType === 'single') {
            if (this.bases.third) { scored++; this.bases.third = false; }
            if (this.bases.second) { this.bases.third = true; this.bases.second = false; }
            if (this.bases.first) { this.bases.second = true; this.bases.first = false; }
            this.bases.first = true;
        } else if (hitType === 'walk') {
            if (this.bases.first && this.bases.second && this.bases.third) {
                scored++; // 밀어내기 득점!
            } else if (this.bases.first && this.bases.second) {
                this.bases.third = true;
            } else if (this.bases.first) {
                this.bases.second = true;
            }
            this.bases.first = true;
        }

        return scored;
    }

    /**
     * 🏃 3D 다이아몬드 베이스 질주 주자들 생성 시스템
     */
    spawnBaseRunners(hitType, prevBases) {
        const char = this.getCurrentBatter();
        const skin = this.getCurrentBatterSkin();
        this.activeRunners = [];

        const makeRunner = (startKey, path, isBatter = false) => ({
            id: Math.random(),
            char: char,
            skin: skin,
            path: [startKey, ...path],
            legIndex: 0,
            progress: 0,
            x: this.BASE_POS[startKey].x,
            y: 0,
            z: this.BASE_POS[startKey].z,
            runCycle: Math.random() * 6.28,
            speed: (hitType === 'walk') ? 0.65 : 0.88,
            isBatter: isBatter,
            isHome: false,
            isFinished: false
        });

        if (hitType === 'homerun') {
            // 주자 전원 + 타자 홈런 주루 (모든 베이스 순회)
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B', 'HOME']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B', '3B', 'HOME'], true));
        } else if (hitType === 'triple') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B', 'HOME']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B', '3B'], true));
        } else if (hitType === 'double') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B', 'HOME']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B', '3B']));
            this.activeRunners.push(makeRunner('HOME', ['1B', '2B'], true));
        } else if (hitType === 'single') {
            if (prevBases.third) this.activeRunners.push(makeRunner('3B', ['HOME']));
            if (prevBases.second) this.activeRunners.push(makeRunner('2B', ['3B']));
            if (prevBases.first) this.activeRunners.push(makeRunner('1B', ['2B']));
            this.activeRunners.push(makeRunner('HOME', ['1B'], true));
        } else if (hitType === 'walk') {
            if (prevBases.first && prevBases.second && prevBases.third) {
                this.activeRunners.push(makeRunner('3B', ['HOME']));
                this.activeRunners.push(makeRunner('2B', ['3B']));
                this.activeRunners.push(makeRunner('1B', ['2B']));
            } else if (prevBases.first && prevBases.second) {
                this.activeRunners.push(makeRunner('2B', ['3B']));
                this.activeRunners.push(makeRunner('1B', ['2B']));
            } else if (prevBases.first) {
                this.activeRunners.push(makeRunner('1B', ['2B']));
            }
            this.activeRunners.push(makeRunner('HOME', ['1B'], true));
        }
    }

    addScore(runs, type) {
        const isUserAttacking = (this.userRole === 'batter');
        if (isUserAttacking) {
            this.p1.score += runs;
            if (type === 'homerun') this.p1.homeRuns++;
            else this.p1.hits++;
        } else {
            this.p2.score += runs;
            if (type === 'homerun') this.p2.homeRuns++;
            else this.p2.hits++;
        }
        this.updateHUD();
    }

    update(dt) {
        const pitcherChar = this.getCurrentPitcher();
        this.crowdCheerTimer += dt * 3;

        // 🏃 3D 다이아몬드 주자 진루 애니메이션 업데이트
        let anyRunnerActive = false;
        for (let i = this.activeRunners.length - 1; i >= 0; i--) {
            const runner = this.activeRunners[i];
            if (runner.isFinished) {
                // 베이스에 안착한 주자는 제자리 달리기를 멈추고 안전하게 대기
                continue;
            }

            anyRunnerActive = true;
            runner.runCycle += dt * 17;
            runner.progress += dt * runner.speed;

            const fromKey = runner.path[runner.legIndex];
            const toKey = runner.path[runner.legIndex + 1];

            if (fromKey && toKey) {
                const p0 = this.BASE_POS[fromKey];
                const p1 = this.BASE_POS[toKey];
                const t = Math.min(1, runner.progress);
                runner.x = p0.x + (p1.x - p0.x) * t;
                runner.y = 0;
                runner.z = p0.z + (p1.z - p0.z) * t;

                // 스파이크 흙먼지 파티클 (질주 발자국)
                if (Math.random() < 0.45) {
                    this.particles.push({
                        x: runner.x + (Math.random() - 0.5) * 8,
                        y: 2,
                        z: runner.z + (Math.random() - 0.5) * 8,
                        vx: -(p1.x - p0.x) * 0.05 + (Math.random() - 0.5) * 6,
                        vy: 4 + Math.random() * 8,
                        vz: -(p1.z - p0.z) * 0.05 + (Math.random() - 0.5) * 6,
                        color: '#d97706',
                        size: 3.5 + Math.random() * 3.5,
                        life: 0.38
                    });
                }

                if (runner.progress >= 1) {
                    runner.legIndex++;
                    runner.progress = 0;

                    if (runner.legIndex >= runner.path.length - 1) {
                        const finalBase = runner.path[runner.path.length - 1];
                        if (finalBase === 'HOME') {
                            runner.isHome = true;
                            runner.isFinished = true;
                            this.playHomeRunFanfare();
                            this.createHitSparks(0, 10, 380);
                        } else {
                            runner.isFinished = true;
                            runner.x = this.BASE_POS[finalBase].x;
                            runner.z = this.BASE_POS[finalBase].z;
                        }
                    }
                }
            }
        }

        // 주자들이 모두 베이스에 도달한 후 부드럽게 정적 베이스 주자로 전환
        if (this.activeRunners.length > 0 && !anyRunnerActive) {
            if (!this.runnersFinishedTimer) this.runnersFinishedTimer = 0;
            this.runnersFinishedTimer += dt;
            if (this.runnersFinishedTimer > 1.2) {
                this.activeRunners = [];
                this.runnersFinishedTimer = 0;
            }
        } else {
            this.runnersFinishedTimer = 0;
        }

        // 🏏 자연스러운 3D 타자 스윙 (스탠스 -> 스트라이드 -> 힙턴 -> 래그 -> 익스텐션 & 팔로스루)
        if (this.batter.isSwinging) {
            this.batter.swingTime += dt;
            const progress = Math.min(1, this.batter.swingTime / this.batter.swingDuration);
            this.batter.swingProgress = progress;
            if (progress >= 1) {
                this.batter.isSwinging = false;
                this.batter.swingProgress = 0;
            }
        } else {
            this.batter.idleTimer += dt * 4;
        }

        // 카메라 쉐이크 감쇠
        if (this.camera.shake > 0) {
            this.camera.shake -= dt * 32;
            if (this.camera.shake < 0) this.camera.shake = 0;
        }

        // 상태 머신 업데이트
        if (this.gameState === 'aiming') {
            this.pitcher.phaseTimer += dt * 3;
        } else if (this.gameState === 'windup') {
            this.pitcher.phaseTimer += dt;
            if (this.pitcher.phaseTimer >= 0.72) {
                this.releasePitch();
            }
        } else if (this.gameState === 'in_flight') {
            const b = this.ball;
            b.flightTimer += dt;
            const rawProg = Math.min(1.0, b.flightTimer / b.flightDuration);

            // 1. Z축 전진 (체인지업의 종속 급감속 & 너클볼의 플러터)
            let zProg = rawProg;
            if (b.type === 'changeup') {
                // 체인지업: 초반 45% 구간은 직구 속도로 빠르게 날아오다가, 후반에 공기저항을 맞아 뚝 감속!
                zProg = (rawProg < 0.45) ? (rawProg * 1.25) : (0.45 * 1.25 + (rawProg - 0.45) * 0.795);
            } else if (b.type === 'knuckleball') {
                zProg = rawProg + Math.sin(rawProg * Math.PI * 4) * 0.012;
            }
            b.z = b.startZ + (b.targetZ - b.startZ) * Math.min(1.0, zProg);

            // 2. 홈플레이트(z=380) 기준 궤적 진행률 (0.0 ~ 1.0)
            const pPlate = Math.max(0, Math.min(1.0, (b.z - b.startZ) / (380 - b.startZ)));
            const xBase = b.startX + (b.targetX - b.startX) * pPlate;
            const yBase = b.startY + (b.targetY - b.startY) * pPlate;

            let offsetX = 0;
            let offsetY = 0;
            let trailColor = '#38bdf8';

            const p = pPlate;
            if (b.type === 'fastball') {
                // ⚡ 4-SEAM FASTBALL: 강력한 백스핀에 의한 라이징 홉(Rising Hop) 효과!
                // 홈플레이트 접근 시점(p>=0.45)에서 중력을 이겨내며 타자 눈앞으로 솟구치는 라이징 궤적!
                offsetY = Math.pow(p, 1.35) * Math.sin(p * Math.PI) * 18.0;
                b.rot += dt * 64;
                trailColor = '#00f2fe';
                if (Math.random() < 0.45) this.createFastballSparks(b.x, b.y, b.z);
            } else if (b.type === 'curve') {
                // 🌀 12-6 RAINBOW CURVE: 자연스러운 초기 릴리스 무지개 호(+20) -> 홈플레이트를 향해 가속 낙하하는 수직 폭포수 궤적!
                // 역주행이나 중간 바운스 없이 plate(p=1.0)에 최대 급강하 각도로 자연스럽게 꽂힘
                offsetY = 52.0 * (Math.pow(p, 0.6) - Math.pow(p, 1.8));
                offsetX = -Math.sin(p * Math.PI) * Math.pow(p, 0.7) * 10.0;
                b.rot += dt * 36;
                trailColor = '#10b981';
                if (Math.random() < 0.45) this.createCurveTrail(b.x, b.y, b.z);
            } else if (b.type === 'slider') {
                // 🌪️ SHARP SLIDER / SWEEPER: 52% 지점까지 한가운데 직구 터널 -> 홈플레이트 앞 38cm 횡 와이프아웃 꺾임!
                if (p < 0.52) {
                    offsetX = (0 - b.targetX) * Math.sin((p / 0.52) * (Math.PI * 0.5)) * (1.0 - p);
                } else {
                    const u = (p - 0.52) / 0.48;
                    const sweepDir = (b.targetX >= 0) ? 1 : -1;
                    offsetX = sweepDir * 36.0 * Math.sin(u * Math.PI);
                    offsetY = -18.0 * Math.sin(u * Math.PI);
                }
                b.rot += dt * 52;
                trailColor = '#a855f7';
                if (Math.random() < 0.45) this.createSliderTrail(b.x, b.y, b.z);
            } else if (b.type === 'changeup') {
                // 🐢 CIRCLE CHANGEUP: 직구 터널 궤적 위장 -> 홈플레이트 앞에서 뚝 떨어지는 싱킹 페이드!
                offsetY = -32.0 * Math.pow(p, 2.2) * (1.0 - p) * 3.6;
                offsetX = 12.0 * Math.sin(p * Math.PI) * Math.pow(p, 0.8);
                b.rot += dt * 18;
                trailColor = '#f59e0b';
                if (Math.random() < 0.45) this.createChangeupSmoke(b.x, b.y, b.z);
            } else if (b.type === 'knuckleball') {
                // 🔮 MYSTIC KNUCKLEBALL: 거의 0에 가까운 무회전, 3D 카오스 요동 (22단위 진폭 플러터!)
                const flutterX = Math.sin(b.flightTimer * 28.0) * Math.cos(b.flightTimer * 20.0) + Math.sin(b.flightTimer * 42.0) * 0.35;
                const flutterY = Math.cos(b.flightTimer * 24.0) * Math.sin(b.flightTimer * 16.0) + Math.cos(b.flightTimer * 36.0) * 0.35;
                offsetX = flutterX * 22.0 * Math.sin(p * Math.PI);
                offsetY = flutterY * 18.0 * Math.sin(p * Math.PI) - 12.0 * Math.sin(p * Math.PI);
                b.rot += dt * 0.15;
                trailColor = '#ec4899';
                this.createKnuckleballVortex(b.x, b.y, b.z);
            }

            b.x = xBase + offsetX;
            b.y = yBase + offsetY;

            // 3. 3D Statcast 트래일 히스토리 기록 (55포인트로 확장하여 전 비행 궤적 선명히 보존)
            if (!b.trail) b.trail = [];
            b.trail.push({ x: b.x, y: b.y, z: b.z, color: trailColor });
            if (b.trail.length > 55) b.trail.shift();

            // 🪵 [컴투스 프로야구 2026] 번트 컨택트 체크: 공이 홈플레이트(z=370~395)를 통과할 때 타자가 번트 자세라면!
            if (this.batter && this.batter.isBunting && !b.isHit && b.z >= 370 && b.z <= 395) {
                const distXY = Math.hypot(b.x, b.y - 44);
                if (distXY <= 32) {
                    this.executeBuntHit(b);
                    return;
                }
            }

            // 4. 포수 미트 포구 (홈플레이트 z=380 통과 후 z>=415 또는 비행 완료 시)
            if ((rawProg >= 1.0 || b.z >= 415) && !b.isHit) {
                b.active = false;
                this.handlePitchMissResult(b.targetX, b.targetY);
            }
        } else if (this.gameState === 'hit_flight') {
            const b = this.ball;
            b.flightTimer += dt;

            // 중력 및 공기 저항
            b.vy -= 165 * dt;
            b.vx *= 0.995;
            b.vz *= 0.995;

            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.z += b.vz * dt;

            // 지면 바운스 감쇠
            if (b.y <= 0) {
                b.y = 0;
                b.vy = Math.max(0, -b.vy * 0.42);
                b.vx *= 0.94;
                b.vz *= 0.94;
            }

            // 🛡️ 3D 수비수 실시간 전력 질주, 포구, 송구 시뮬레이션
            if (this.fielders) {
                const assigned = this.fielders.find(f => f.isAssigned) || this.fielders[0];
                if (assigned) {
                    assigned.runTimer += dt * 18;
                    const dx = b.x - assigned.x;
                    const dz = b.z - assigned.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // 공을 향해 현실적인 프로야구 선수 주력 질주 (초인적 순간이동 속도 대폭 정상화: 115~120 units/s)
                    const sprintSpeed = (assigned.role === 'CF') ? 122 : ((assigned.role === 'SS' || assigned.role === '2B') ? 116 : 110);
                    if (dist > 6 && assigned.action === 'pursuing') {
                        assigned.x += (dx / dist) * Math.min(dist, sprintSpeed * dt);
                        assigned.z += (dz / dist) * Math.min(dist, sprintSpeed * dt);
                    }

                    // 수비 인터셉트 / 포구 체크 (실책, 평범한 공, 라인드라이브, 호수비 다채로운 수비 액션)
                    if (b.active) {
                        if (b.hitType === 'out') {
                            if (b.isFlyOut) {
                                // 🧤 외야/내야 플라이 낙하지점 정밀 포구: 수비수가 낙하지점에 근접했을 때 포구!
                                if (dist < 18 && b.y <= 24 && b.vy < 0) {
                                    b.active = false;

                                    // 🚨 1. 외야 뜬공 낙구 실책 (Dropped Flyball Error) - 9% 확률로 실책 발생!
                                    const isFlyError = (Math.random() < 0.09);
                                    if (isFlyError) {
                                        b.hitType = 'double';
                                        b.isHit = true;
                                        b.vy = 26;
                                        b.vz = -90;
                                        this.playCatchSound();
                                        const scoredRuns = this.advanceRunnersOnHit('double');
                                        this.spawnBaseRunners('double', { ...this.bases });
                                        this.addScore(scoredRuns, 'error');
                                        this.showResultBanner(`🚨 [수비 실책 ERROR] ${assigned.name} 포구 실책!`, `외야수가 낙구 지점을 놓쳤습니다! 타자 2루 출루!`, '#ef4444');
                                        if (this.commentary) {
                                            this.commentary.trigger('FIELDING_ERROR', { fielder: assigned.name, reason: '외야 뜬공 낙구' });
                                        }
                                        this.updateHUD();
                                        return;
                                    }

                                    // 2. 정상 포구: 라인드라이브 직선타 vs 슈퍼 점핑 캐치 vs 평범한 뜬공
                                    this.playCatchSound();
                                    this.createCatchSparks(assigned.x, assigned.y + 12, assigned.z);

                                    if (b.isLineout) {
                                        // ⚡ 총알 라인드라이브 직선타 정면 포구 아웃
                                        assigned.action = 'ready';
                                        this.showResultBanner(`⚡ [총알 라인드라이브] ${assigned.name} 정면 포구 아웃!`, `잘 맞은 타구가 불운하게 야수 정면으로 빨려 들어갔습니다!`, '#f59e0b');
                                        if (this.commentary) {
                                            this.commentary.trigger('FIELDING_LINEOUT', { fielder: assigned.name });
                                        }
                                        setTimeout(() => {
                                            this.recordOut(`⚡ ${assigned.name} 총알 라인드라이브 직선타 아웃!`);
                                        }, 850);
                                    } else {
                                        // 슈퍼 점핑 캐치 (20%) vs 평범한 뜬공 포구 (80%)
                                        const isSuperCatch = (dist >= 14 && Math.random() < 0.22);
                                        assigned.action = isSuperCatch ? 'jumping' : 'ready';
                                        assigned.y = isSuperCatch ? 12 : 0;

                                        if (isSuperCatch) {
                                            this.showResultBanner(`🧤 [슈퍼 점핑 캐치] ${assigned.name}의 그림 같은 호수비!!`, '허공을 가르며 타구를 낚아채 아웃 카운트를 올립니다!', '#ef4444');
                                            if (this.commentary) {
                                                this.commentary.trigger('FIELDING_JUMPING', { fielder: assigned.name });
                                            }
                                        } else {
                                            // 🧤 평범한 뜬공 포구 (Routine Flyball)
                                            this.showResultBanner(`🧤 [평범한 뜬공 포구] ${assigned.name} 안정적인 정면 포구!`, '타구가 높게 떠올라 여유 있게 포구 완료 (이지 아웃)', '#38bdf8');
                                            if (this.commentary) {
                                                this.commentary.trigger('FIELDING_ROUTINE', { fielder: assigned.name, playType: '외야 뜬공' });
                                            }
                                        }

                                        setTimeout(() => {
                                            this.recordOut(`🧤 ${assigned.name} 플라이볼 포구 아웃!`);
                                        }, 850);
                                    }
                                }
                            } else {
                                // 🛡️ 내야 땅볼 포구 & 알까기 실책 & 슈퍼 다이빙 캐치 & 평범한 땅볼
                                if (dist < 22 && b.y <= 8 && assigned.action === 'pursuing') {
                                    b.active = false;

                                    // 🚨 1. 내야 땅볼 알까기 실책 (Grounder Error) - 10% 확률로 실책 발생!
                                    const isGroundError = (Math.random() < 0.10);
                                    if (isGroundError) {
                                        b.hitType = 'single';
                                        b.isHit = true;
                                        b.vx = b.vx * 0.75;
                                        b.vz = b.vz * 0.75;
                                        this.playCatchSound();
                                        const scoredRuns = this.advanceRunnersOnHit('single');
                                        this.spawnBaseRunners('single', { ...this.bases });
                                        this.addScore(scoredRuns, 'error');
                                        this.showResultBanner(`🚨 [수비 실책 ERROR] ${assigned.name} 내야 알까기 실책!`, `불규칙 바운드로 공이 글러브를 빠져나갔습니다! 타자 1루 세이프!`, '#ef4444');
                                        if (this.commentary) {
                                            this.commentary.trigger('FIELDING_ERROR', { fielder: assigned.name, reason: '내야 땅볼 알까기' });
                                        }
                                        this.updateHUD();
                                        return;
                                    }

                                    // 2. 정상 내야 땅볼 포구: 슈퍼 다이빙 캐치 vs 평범한 내야 땅볼
                                    const isDiving = (dist >= 15 && Math.random() < 0.20);
                                    assigned.action = isDiving ? 'diving' : 'throwing';
                                    this.playCatchSound();
                                    this.createCatchSparks(assigned.x, assigned.y + 6, assigned.z);

                                    const firstBaseman = this.fielders.find(f => f.role === '1B');

                                    // 🚨 3. 1루 송구 시 6% 확률로 1루 악송구 실책 (Throwing Error)
                                    const isThrowError = (!isDiving && Math.random() < 0.06);

                                    const executeThrowToFirst = () => {
                                        assigned.action = 'throwing';
                                        const targetXPos = isThrowError ? ((firstBaseman ? firstBaseman.x : 140) + 40) : (firstBaseman ? firstBaseman.x : 140);
                                        const targetYPos = isThrowError ? 34 : 16;
                                        this.fieldingThrow = {
                                            active: true,
                                            startX: assigned.x,
                                            startY: assigned.y + 14,
                                            startZ: assigned.z,
                                            targetX: targetXPos,
                                            targetY: targetYPos,
                                            targetZ: firstBaseman ? firstBaseman.z : 235,
                                            x: assigned.x,
                                            y: assigned.y + 14,
                                            z: assigned.z,
                                            progress: 0,
                                            speed: 3.4,
                                            catcher: firstBaseman,
                                            sourceFielder: assigned,
                                            isThrowError: isThrowError
                                        };
                                        if (firstBaseman && !isThrowError) {
                                            setTimeout(() => { firstBaseman.action = 'stretching'; }, 180);
                                        }
                                    };

                                    if (isDiving) {
                                        this.showResultBanner(`🔥 [슈퍼 다이빙 캐치] ${assigned.name} 환상적인 호수비!!`, '몸을 날려 지면 타구를 건져낸 뒤 1루로 전력 송구!', '#f59e0b');
                                        if (this.commentary) {
                                            this.commentary.trigger('FIELDING_DIVING', { fielder: assigned.name });
                                        }
                                        setTimeout(executeThrowToFirst, 380);
                                    } else {
                                        // 🧤 평범한 땅볼 포구 (Routine Groundout)
                                        this.showResultBanner(`🧤 [평범한 땅볼] ${assigned.name} 안정적인 1루 송구!`, '차분하게 바운드를 맞추고 1루로 송구합니다.', '#38bdf8');
                                        if (this.commentary) {
                                            this.commentary.trigger('FIELDING_ROUTINE', { fielder: assigned.name, playType: '내야 땅볼' });
                                        }
                                        executeThrowToFirst();
                                    }
                                }
                            }
                        } else if (b.hitType === 'single' || b.hitType === 'double' || b.hitType === 'triple') {
                            // ⚾ 안타 타구: 절대 공중에서 가로채지 않음! 공이 잔디에 바운드된 후 지면에 굴러갈 때만(b.y <= 3) 수비수가 회수하여 2루 중계 송구!
                            if (dist < 18 && b.y <= 3 && assigned.action === 'pursuing') {
                                b.active = false;
                                assigned.action = 'throwing';
                                this.playCatchSound();
                                this.createCatchSparks(assigned.x, assigned.y + 10, assigned.z);
                                const cutoffFielder = this.fielders.find(f => f.role === 'SS' || f.role === '2B');
                                this.fieldingThrow = {
                                    active: true,
                                    startX: assigned.x,
                                    startY: assigned.y + 14,
                                    startZ: assigned.z,
                                    targetX: cutoffFielder ? cutoffFielder.x : 0,
                                    targetY: 16,
                                    targetZ: cutoffFielder ? cutoffFielder.z : 155,
                                    x: assigned.x,
                                    y: assigned.y + 14,
                                    z: assigned.z,
                                    progress: 0,
                                    speed: 2.8,
                                    catcher: cutoffFielder,
                                    sourceFielder: assigned
                                };
                            }
                        }
                    }
                }
            }

            // ⚾ 송구(Laser Throw) 비행 애니메이션
            if (this.fieldingThrow && this.fieldingThrow.active) {
                const ft = this.fieldingThrow;
                ft.progress += dt * ft.speed;
                const p = Math.min(1.0, ft.progress);
                ft.x = ft.startX + (ft.targetX - ft.startX) * p;
                ft.y = ft.startY + (ft.targetY - ft.startY) * p + Math.sin(p * Math.PI) * 12;
                ft.z = ft.startZ + (ft.targetZ - ft.startZ) * p;

                if (p >= 1.0) {
                    ft.active = false;
                    this.playCatchSound();
                    this.createCatchSparks(ft.targetX, ft.targetY, ft.targetZ);
                    if (ft.catcher) {
                        ft.catcher.action = 'stretching'; // 베이스 위 글러브 포구 자세
                    }

                    // 🏃 도루 완료 콜백 핸들러
                    if (ft.onComplete) {
                        ft.onComplete();
                        return;
                    }

                    // ⚡ [스마일] 번트 병살타 2단 릴레이 송구 (2루 ➔ 1루)
                    if (ft.isRelayDoublePlay && ft.finalTarget) {
                        this.fieldingThrow = {
                            active: true,
                            startX: ft.targetX,
                            startY: 18,
                            startZ: ft.targetZ,
                            targetX: ft.finalTarget.x,
                            targetY: 16,
                            targetZ: ft.finalTarget.z,
                            x: ft.targetX,
                            y: 18,
                            z: ft.targetZ,
                            progress: 0,
                            speed: 4.6,
                            catcher: ft.finalTarget,
                            isRelayDoublePlay: false,
                            finalTarget: null
                        };
                        return;
                    }

                    if (ft.isThrowError) {
                        const srcName = ft.sourceFielder ? ft.sourceFielder.name : '내야수';
                        this.playCatchSound();
                        const scoredRuns = this.advanceRunnersOnHit('single');
                        this.spawnBaseRunners('single', { ...this.bases });
                        this.addScore(scoredRuns, 'error');
                        this.showResultBanner(`🚨 [1루 악송구 실책 ERROR] ${srcName} 송구 실책!`, `1루수가 잡을 수 없는 빗나간 악송구로 타자 1루 세이프!`, '#ef4444');
                        if (this.commentary) {
                            this.commentary.trigger('FIELDING_ERROR', { fielder: srcName, reason: '1루 악송구' });
                        }
                        this.updateHUD();
                    } else if (this.ball && this.ball.hitType === 'out' && !b.isDoublePlay) {
                        const srcName = ft.sourceFielder ? ft.sourceFielder.name : '내야수';
                        this.recordOut(`🛡️ ${srcName} 포구 & 1루 송구 아웃!`);
                    }
                }
            }

            // 홈런/타구/수비 시 다이내믹 카메라 트래킹
            const trackTargetX = b.active ? (b.x * 0.35) : (this.fieldingThrow && this.fieldingThrow.active ? this.fieldingThrow.x * 0.35 : 0);
            this.camera.x += (trackTargetX - this.camera.x) * 4 * dt;
            this.camera.y += (56 + Math.max(0, (b.y - 40) * 0.25) - this.camera.y) * 4 * dt;

            // 타구 비행 완료 및 펜스 너머 홈런
            if (b.active && (b.z <= -360 || (b.y <= 0 && b.vz > -10 && b.flightTimer > 2.2))) {
                b.active = false;
                this.gameState = 'result_pause';
                let pauseTime = 2.4;
                if (b.hitType === 'homerun') pauseTime = 4.6;
                else if (b.hitType === 'triple' || b.hitType === 'double') pauseTime = 3.4;
                else if (b.hitType === 'out') pauseTime = 2.0;
                this.stateTimer = pauseTime;
            }
        } else if (this.gameState === 'result_pause') {
            this.stateTimer -= dt;

            // 카메라 부드러운 센터 복귀
            const targetX = (this.userRole === 'batter') ? 0 : 36;
            const targetY = (this.userRole === 'batter') ? 56 : 70;
            this.camera.x += (targetX - this.camera.x) * 4 * dt;
            this.camera.y += (targetY - this.camera.y) * 4 * dt;

            if (this.stateTimer <= 0) {
                this.prepareNextPitch(0.8);
            }
        }

        // 파티클 & 폭죽 갱신
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const f = this.fireworks[i];
            f.life -= dt;
            f.particles.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy -= 80 * dt;
            });
            if (f.life <= 0) this.fireworks.splice(i, 1);
        }

        if (this.bannerAlpha > 0) {
            this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.45);
        }
    }

    handlePitchMissResult(tx, ty) {
        const pitchSpeed = (this.ball && this.ball.speedKm) || 148;
        const pitchType = (this.ball && this.ball.type) || 'fastball';

        // 1. 💨 헛스윙 여부 체크: 타자가 스윙을 시도했는가?
        // 배터가 스윙을 시도했다면 공의 위치(볼/스트라이크)와 무관하게 100% 무조건 스트라이크!
        const isSwung = Boolean((this.ball && this.ball.hasSwung) || this.batter.isSwinging);

        // 2. ⚾ 스트라이크존 규격 판정 (KBO/MLB 공식 규칙: 공의 일부라도 존에 닿으면 스트라이크)
        // 스트라이크존 기본 규격: x [-24, 24], y [22, 66]
        // 야구공 외곽선 정밀 마진 2.5 반영 -> 공이 실제 존 박스 라인에 닿은 공만 정확히 스트라이크!
        const strikeMarginX = 2.5;
        const strikeMarginY = 2.5;
        const inZonePhysical = (Math.abs(tx) <= (24 + strikeMarginX) && ty >= (22 - strikeMarginY) && ty <= (66 + strikeMarginY));

        const isStrike = isSwung || inZonePhysical;

        // 🎯 실시간 MLB 스트라이크존 판정 트래커 카드 즉시 팝업
        this.showPitchTrackerOverlay(tx, ty, isStrike, pitchSpeed, pitchType);

        if (isStrike) {
            this.lastResultWasBall = false;
            this.strikes++;
            this.playCatchSound();
            this.playUmpireWhistle(1400, 0.2);

            if (this.commentary) {
                if (isSwung) {
                    this.commentary.trigger('STRIKE_SWINGING', {
                        pitchName: pitchType,
                        speed: pitchSpeed,
                        count: `${this.balls}B ${this.strikes}S`
                    });
                } else {
                    this.commentary.trigger('STRIKE_LOOKING', {
                        pitchName: pitchType,
                        speed: pitchSpeed,
                        count: `${this.balls}B ${this.strikes}S`
                    });
                }
            }

            // ⚡ [런 & 히트] 스트라이크 노스윙/헛스윙 시 주자 도루 승부 강제 진행!
            if (this.activeTactic === 'run_and_hit') {
                this.activeTactic = null;
                setTimeout(() => {
                    this.showResultBanner('🚨 [런 & 히트] 스트라이크 통과! 주자 도루 승부!!', '좋은 공이 존에 들어왔습니다! 주자가 포수 송구와 진루 승부를 펼칩니다!', '#f59e0b');
                    this.attemptSteal(true);
                }, 500);
            }

            if (this.strikes >= 3) {
                const outMsg = isSwung ? '💨 3구 헛스윙 삼진 아웃! (STRIKE OUT!)' : '💨 3구 루킹 삼진 아웃! (STRIKE OUT!)';
                this.recordOut(outMsg);
            } else {
                let title = '⚡ 스트라이크! (STRIKE)';
                let desc = `카운트: ${this.balls}B - ${this.strikes}S`;
                if (isSwung) {
                    title = '💨 헛스윙 스트라이크! (SWINGING STRIKE)';
                    desc = `배트가 헛돌았습니다! (${this.balls}B - ${this.strikes}S)`;
                }
                this.showResultBanner(title, desc, '#facc15');
                this.gameState = 'result_pause';
                this.stateTimer = 1.3;
            }
        } else {
            this.lastResultWasBall = true;
            this.balls++;
            this.playCatchSound();

            if (this.commentary) {
                this.commentary.trigger('PITCH_BALL', {
                    count: `${this.balls}B ${this.strikes}S`
                });
            }

            // ⚡ [런 & 히트] 타자가 침착하게 볼을 골라냄 -> 주자 70% 높은 확률로 도루 세이프!
            if (this.activeTactic === 'run_and_hit') {
                this.activeTactic = null;
                setTimeout(() => {
                    const hasRunners = this.bases.first || this.bases.second || this.bases.third;
                    if (hasRunners) {
                        const isSafe = Math.random() < 0.70;
                        if (isSafe) {
                            this.playUmpireSafeSound();
                            if (this.bases.second && !this.bases.third) {
                                this.bases.second = false;
                                this.bases.third = true;
                                this.showResultBanner('⚡ [런 & 히트 대성공] 볼 선구안 & 3루 도루 성공!! (SAFE)', '타자가 볼을 골라내며 주자가 여유있게 3루 안착! (70% 성공)', '#22c55e');
                            } else if (this.bases.first && !this.bases.second) {
                                this.bases.first = false;
                                this.bases.second = true;
                                this.showResultBanner('⚡ [런 & 히트 대성공] 볼 선구안 & 2루 도루 성공!! (SAFE)', '타자가 볼을 흘려보내며 주자가 2루를 안전하게 훔쳤습니다! (70% 성공)', '#22c55e');
                            } else if (this.bases.first && this.bases.second) {
                                this.bases.second = false;
                                this.bases.third = true;
                                this.bases.first = false;
                                this.bases.second = true;
                                this.showResultBanner('🌪️ [런 & 히트 대성공] 더블 도루 완벽 성공!! (SAFE)', '볼 판정과 함께 2, 3루를 모두 훔쳐냈습니다! (70% 성공)', '#22c55e');
                            }
                        } else {
                            this.playCatchSound();
                            if (this.bases.second) {
                                this.bases.second = false;
                                this.recordOut('🚨 [런 & 히트] 3루 도루 저지 아웃!');
                                this.showResultBanner('🚨 [런 & 히트] 볼 판정에도 포수의 레이저 송구로 3루 아웃!', '포수의 빠른 송구에 걸려 아웃되었습니다', '#ef4444');
                            } else if (this.bases.first) {
                                this.bases.first = false;
                                this.recordOut('🚨 [런 & 히트] 2루 도루 저지 아웃!');
                                this.showResultBanner('🚨 [런 & 히트] 볼 판정에도 포수 송구로 2루 저지 아웃!', '포수의 총알 송구에 걸려 아웃되었습니다', '#ef4444');
                            }
                        }
                        this.updateHUD();
                    }
                }, 500);
            }

            if (this.balls >= 4) {
                const prevBases = { ...this.bases };
                const scored = this.advanceRunnersOnHit('walk');
                this.spawnBaseRunners('walk', prevBases);
                this.addScore(scored, 'walk');
                this.resetAtBatCount(true); // 4구 볼넷 출루 -> 카운트 초기화 및 다음 타자!
                const msg = (scored > 0) ? '🚶 밀어내기 4구 볼넷! (+1점 득점)' : '🚶 4구 볼넷! 1루 출루 성공!';
                this.showResultBanner(msg, '침착한 선구안으로 출루!', '#38bdf8');
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
            } else {
                this.showResultBanner('⚪ 볼! (BALL)', `카운트: ${this.balls}B - ${this.strikes}S`, '#94a3b8');
                this.gameState = 'result_pause';
                this.stateTimer = 1.1;
            }
        }
        this.updateHUD();
    }

    recordOut(reason = '아웃!') {
        this.outs++;
        this.resetAtBatCount(true); // 타석 종료 -> 볼/스트라이크 초기화 & 다음 타순 진행!

        if (this.outs >= 3) {
            // 3아웃 공수교대 (또는 정규 경기 종료)
            if (this.inningHalf === 'top') {
                this.inningHalf = 'bottom';
                this.outs = 0;
                this.bases.first = false;
                this.bases.second = false;
                this.bases.third = false;
                this.showResultBanner('🔄 3아웃 공수 교대! (1회말 시작)', '마지막 역전의 기회!', '#4ade80');
                this.gameState = 'result_pause';
                this.stateTimer = 2.4;
            } else {
                this.gameOver();
            }
        } else {
            this.showResultBanner(reason, `아웃 카운트: [${this.outs} / 3 아웃]`, '#ef4444');
            this.gameState = 'result_pause';
            this.stateTimer = 1.5;
        }
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;

        ctx.clearRect(0, 0, this.width, this.height);

        let shakeX = 0, shakeY = 0;
        if (this.camera.shake > 0) {
            shakeX = (Math.random() - 0.5) * this.camera.shake;
            shakeY = (Math.random() - 0.5) * this.camera.shake;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        const isBatterRunning = this.activeRunners && this.activeRunners.some(r => r.isBatter && !r.isFinished);

        if (this.userRole === 'pitcher') {
            // ⚾ [컴투스 프로야구 투수 화면 - GIF 원작 재현 (투수 백뷰 & 홈플레이트/백스톱)]
            // 1. 투수 시점 스타디움 & 백스톱 배경
            this.renderPitcherStadiumView(ctx);
            // 2. 홈플레이트 & 타석 & 마운드 클레이
            this.renderPitcherFieldAndPlate(ctx);
            // 3. 포수 및 주심 (z=415)
            this.renderCatcherAndUmpire(ctx);
            // 4. 타자석 상대 타자 (z=380)
            if (!isBatterRunning) this.renderBatter(ctx, false);
            // 5. 비행 중인 공
            if (this.ball.active || (this.gameState === 'result_pause' && this.ball.trail && this.ball.trail.length > 4)) {
                this.renderBall(ctx);
            }
            // 6. 투수 백뷰 (등번호 39 와인드업 투구 폼)
            this.renderPitcher(ctx, false);
            // 7. 컴팩트 3D 과녁
            this.renderStrikeZoneBox(ctx);
        } else {
            // 🏏 [스마일 홈런 더비 타자 화면 - 와이드 내야 다이아몬드 & 정면 투수]
            // 1. 경기장 배경
            this.renderStadiumAtmosphere(ctx);
            // 2. 넓고 웅장한 다이아몬드 내야 필드 & 베이스
            this.renderDiamondAndBases(ctx);
            // 3. 7인제 수비수 & 송구
            this.renderFielders(ctx);
            this.renderFieldingThrow(ctx);
            // 4. 주자들
            this.renderBaseRunners(ctx);
            // 5. 마운드 위 정면 투수
            this.renderPitcher(ctx, true);
            // 6. 비행 중인 공
            if (this.ball.active || (this.gameState === 'result_pause' && this.ball.trail && this.ball.trail.length > 4)) {
                this.renderBall(ctx);
            }
            // 7. 타자석 본인 타자
            if (!isBatterRunning) this.renderBatter(ctx, true);
            // 8. 핫/콜드 존
            this.renderStrikeZoneBox(ctx);
        }

        // 파티클 & 불꽃놀이
        this.renderEffects(ctx);

        // 결과 팝업 배너
        this.renderResultBanner(ctx);

        ctx.restore();
    }

    /**
     * 3D 좌표 -> 2D 화면 투영 (투수 백뷰 vs 타자 뷰 완벽 분기)
     */
    project(x, y, z) {
        const cam = this.camera;
        let relZ;
        if (this.userRole === 'pitcher') {
            // ⚾ 투수 시점 (컴투스 프로야구 투수 백뷰): 카메라가 z = -30에 있고 홈플레이트(z = 380)를 바라봄
            relZ = Math.max(15, z - cam.z);
        } else {
            // 🏏 타자 시점 (홈플레이트 뒤 배터 뷰): 카메라가 z = 460에 있고 투수(z = 80) 및 외야를 바라봄
            relZ = Math.max(15, cam.z - z);
        }
        const scale = cam.fov / relZ;
        const screenX = this.width / 2 + (x - cam.x) * scale;
        const screenY = this.height * 0.54 - (y - cam.y) * scale;
        return { x: screenX, y: screenY, scale: scale };
    }

    /**
     * 🏟️ [컴투스 프로야구 투수 화면 (GIF 원작)] 투수 시점 포수 뒤 백스톱 펜스 & 경기장 배경
     */
    renderPitcherStadiumView(ctx) {
        // [1] 상단 야간 스타디움 하늘
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.42);
        skyGrad.addColorStop(0, '#030712');
        skyGrad.addColorStop(0.5, '#0f172a');
        skyGrad.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height * 0.42);

        // [2] 홈플레이트 뒤 거대 백스톱 펜스 (z = 460)
        const wallZ = 460;
        const pTL = this.project(-360, 160, wallZ);
        const pTR = this.project(360, 160, wallZ);
        const pBL = this.project(-360, 0, wallZ);
        const pBR = this.project(360, 0, wallZ);

        if (pBL && pBR && pTL && pTR) {
            // 백스톱 뒤 관중석 로열석 & VIP 관중석
            const topH = 80 * pTL.scale;
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(pTL.x, pTL.y - topH, pTR.x - pTL.x, topH);

            // 관중석 텍스처 도트
            ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
            for (let i = 0; i < 30; i++) {
                const rx = pTL.x + (i % 15) * ((pTR.x - pTL.x) / 15);
                const ry = pTL.y - 50 * pTL.scale + Math.floor(i / 15) * 20 * pTL.scale;
                ctx.beginPath();
                ctx.arc(rx, ry, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // 백스톱 그물망 (Netting)
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
            ctx.lineWidth = 1;
            for (let gx = pTL.x; gx <= pTR.x; gx += 14 * pTL.scale) {
                ctx.beginPath(); ctx.moveTo(gx, pTL.y); ctx.lineTo(gx, pBL.y); ctx.stroke();
            }

            // [컴투스 프로야구 GIF 원작 재현] 짙은 남색 백스톱 패딩 펜스
            const wallH = pBL.y - pTL.y;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pBL.x, pTL.y, pBR.x - pBL.x, wallH);

            // 펜스 상단 옐로우 패딩 림
            ctx.fillStyle = '#eab308';
            ctx.fillRect(pBL.x, pTL.y, pBR.x - pBL.x, 3.5);

            // 스폰서 광고 패널 ("동양골드", "스마일 홈런 더비 3D", "SMILE GAMES")
            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.max(12, Math.round(18 * pTL.scale))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('동양골드  |  스마일 홈런 더비 3D  |  SMILE GAMES', (pBL.x + pBR.x) / 2, pTL.y + wallH * 0.5);
        }
    }

    /**
     * 🏟️ [컴투스 프로야구 투수 화면 (GIF 원작)] 그라운드 잔디 & 홈플레이트 흙 서클 & 타자석
     */
    renderPitcherFieldAndPlate(ctx) {
        const wallZ = 460;
        const pBL = this.project(-360, 0, wallZ);
        const pBR = this.project(360, 0, wallZ);
        const pHome = this.project(0, 0, 380);
        const pMound = this.project(0, 0, 80);

        if (!pBL || !pBR || !pHome) return;

        // [1] 마운드에서 백스톱까지 이어지는 천연 잔디
        const turfGrad = ctx.createLinearGradient(0, pBL.y, 0, this.height);
        turfGrad.addColorStop(0, '#15803d');
        turfGrad.addColorStop(1, '#166534');
        ctx.fillStyle = turfGrad;
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // [2] 홈플레이트 클레이 흙 서클 (Warm Red Clay Dirt Circle)
        const hs = pHome.scale;
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(pHome.x, pHome.y + 4 * hs, 95 * hs, 34 * hs, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 2 * hs;
        ctx.stroke();

        // [3] 타자석 (좌타석 / 우타석 백색 분필 박스)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = 2.0 * hs;
        // 우타자석 (투수 시점 기준 화면 우측)
        ctx.strokeRect(pHome.x + 18 * hs, pHome.y - 14 * hs, 22 * hs, 38 * hs);
        // 좌타자석 (투수 시점 기준 화면 좌측)
        ctx.strokeRect(pHome.x - 40 * hs, pHome.y - 14 * hs, 22 * hs, 38 * hs);

        // [4] 3D 홈플레이트 오각형
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(pHome.x - 10 * hs, pHome.y + 5 * hs);
        ctx.lineTo(pHome.x - 10 * hs, pHome.y + 13 * hs);
        ctx.lineTo(pHome.x + 10 * hs, pHome.y + 13 * hs);
        ctx.lineTo(pHome.x + 10 * hs, pHome.y + 5 * hs);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * hs;
        ctx.stroke();

        // [5] 마운드 흙 서클 (투수 발밑 z=80)
        if (pMound) {
            const ms = pMound.scale;
            ctx.fillStyle = '#9a3412';
            ctx.beginPath();
            ctx.ellipse(pMound.x, pMound.y + 6 * ms, 75 * ms, 26 * ms, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderStadiumAtmosphere(ctx) {
        // [1] 상단 푸른 야간 스타디움 하늘 그라데이션
        const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.48);
        skyGrad.addColorStop(0, '#030712');
        skyGrad.addColorStop(0.35, '#0f172a');
        skyGrad.addColorStop(0.75, '#1e3a8a');
        skyGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, this.width, this.height * 0.48);

        // [2] 자연스러운 외야 펜스 (z = -180)
        const wallZ = -180;
        const pTL = this.project(-380, 160, wallZ);
        const pTR = this.project(380, 160, wallZ);
        const pBL = this.project(-380, 0, wallZ);
        const pBR = this.project(380, 0, wallZ);

        if (!pBL || !pBR || !pTL || !pTR) return;

        // 스타디움 4대 초고광도 조명탑 (Stadium Floodlight Towers) & 4-Point Starburst Lens Flares
        const lightCols = [-320, -150, 150, 320];
        lightCols.forEach(lx => {
            const lp = this.project(lx, 150, wallZ);
            if (lp && lp.scale > 0) {
                const ls = lp.scale;
                ctx.fillStyle = '#334155';
                ctx.fillRect(lp.x - 3.5 * ls, lp.y, 7 * ls, 55 * ls);
                ctx.fillStyle = '#090d16';
                ctx.fillRect(lp.x - 18 * ls, lp.y - 12 * ls, 36 * ls, 14 * ls);
                const halo = ctx.createRadialGradient(lp.x, lp.y - 5 * ls, 2 * ls, lp.x, lp.y - 5 * ls, 45 * ls);
                halo.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
                halo.addColorStop(0.3, 'rgba(254, 240, 138, 0.8)');
                halo.addColorStop(1, 'rgba(250, 204, 21, 0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(lp.x, lp.y - 5 * ls, 45 * ls, 0, Math.PI * 2);
                ctx.fill();

                // 4방향 렌즈 플레어 스파이크
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
                ctx.lineWidth = 1.4 * ls;
                ctx.beginPath();
                ctx.moveTo(lp.x - 55 * ls, lp.y - 5 * ls);
                ctx.lineTo(lp.x + 55 * ls, lp.y - 5 * ls);
                ctx.moveTo(lp.x, lp.y - 35 * ls);
                ctx.lineTo(lp.x, lp.y + 25 * ls);
                ctx.stroke();

                // 🌟 조명탑에서 그라운드로 쏟아지는 입체 스포트라이트 (Volumetric Light Beams)
                const groundP = this.project(lx * 0.45, 0, 260);
                if (groundP && groundP.scale > 0) {
                    const beamGrad = ctx.createLinearGradient(lp.x, lp.y, groundP.x, groundP.y);
                    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
                    beamGrad.addColorStop(0.45, 'rgba(254, 240, 138, 0.08)');
                    beamGrad.addColorStop(1, 'rgba(250, 204, 21, 0.00)');
                    ctx.fillStyle = beamGrad;
                    ctx.beginPath();
                    ctx.moveTo(lp.x - 14 * ls, lp.y);
                    ctx.lineTo(lp.x + 14 * ls, lp.y);
                    ctx.lineTo(groundP.x + 80 * groundP.scale, groundP.y);
                    ctx.lineTo(groundP.x - 80 * groundP.scale, groundP.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        });

        // 스타디움 2단 관중석 구조 (Double-Deck Grandstands & Stadium Seating)
        const grandGrad = ctx.createLinearGradient(0, pTL.y, 0, pBL.y);
        grandGrad.addColorStop(0, '#0b1120');
        grandGrad.addColorStop(0.45, '#1e293b');
        grandGrad.addColorStop(1, '#020617');
        ctx.fillStyle = grandGrad;
        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.lineTo(pTR.x, pTR.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(pBL.x, pBL.y);
        ctx.closePath();
        ctx.fill();

        // 1단 상단 관중들 (Upper Deck Crowd)
        const crowdCols = 48;
        for (let r = 0; r < 3; r++) {
            const gy = pTL.y + 10 + r * 10;
            for (let c = 0; c < crowdCols; c++) {
                const gx = pTL.x + (pTR.x - pTL.x) * (c / crowdCols);
                const bob = Math.sin(this.crowdCheerTimer + c * 0.4 + r * 0.6) * 2.0;
                const palette = ['#ef4444', '#38bdf8', '#facc15', '#22c55e', '#a855f7', '#f97316', '#ffffff'];
                ctx.fillStyle = palette[(c * 3 + r * 5) % palette.length];
                ctx.fillRect(gx, gy + bob, 4.2, 4.2);
            }
        }

        // 🔴 360도 일렉트로닉 LED 리본 전광판 (Mid-Tier LED Ribbon Board)
        const ribbonY = pTL.y + 44;
        const ribbonH = 14;
        ctx.fillStyle = '#020617';
        ctx.fillRect(pTL.x, ribbonY, pTR.x - pTL.x, ribbonH);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1;
        ctx.strokeRect(pTL.x, ribbonY, pTR.x - pTL.x, ribbonH);

        // 리본 전광판 흐르는 텍스트 (Scrolling Dynamic Broadcast Ticker)
        ctx.save();
        ctx.beginPath();
        ctx.rect(pTL.x, ribbonY, pTR.x - pTL.x, ribbonH);
        ctx.clip();
        ctx.font = '900 9.5px sans-serif';
        ctx.fillStyle = '#38bdf8';
        const ribbonText = '★ SMILE HOMERUN DERBY 3D ALL-STAR ★ 4대 투구폼: 오버핸드 · 쓰리쿼터 · 사이드암 · 언더핸드 완벽 구사 ★ 번트 60% 성공 & 자유 도루 시스템 ACTIVE ★ LIVE 4K UHD ★';
        const textOffset = ((Date.now() * 0.045) % 1200);
        ctx.fillText(ribbonText, pTL.x + 30 - textOffset, ribbonY + 10.5);
        ctx.fillText(ribbonText, pTL.x + 30 - textOffset + 1100, ribbonY + 10.5);
        ctx.restore();

        // 2단 하단 관중석 관중들 (Lower Deck Crowd)
        for (let r = 0; r < 3; r++) {
            const gy = ribbonY + ribbonH + 4 + r * 10;
            for (let c = 0; c < crowdCols; c++) {
                const gx = pTL.x + (pTR.x - pTL.x) * (c / crowdCols);
                const bob = Math.sin(this.crowdCheerTimer + c * 0.35 + r * 0.5 + 1.2) * 2.2;
                const palette = ['#dc2626', '#0284c7', '#eab308', '#16a34a', '#9333ea', '#ea580c', '#f8fafc'];
                ctx.fillStyle = palette[(c * 4 + r * 7) % palette.length];
                ctx.fillRect(gx, gy + bob, 4.5, 4.5);
            }
        }

        // 📺 센터필드 대형 스마일 홈런 더비 3D 일렉트로닉 전광판 (Jumbotron Screen)
        const jbW = (pTR.x - pTL.x) * 0.42;
        const jbH = 54;
        const jbX = (pTL.x + pTR.x) / 2 - jbW / 2;
        const jbY = pTL.y + 4;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(jbX - 4, jbY - 4, jbW + 8, jbH + 8);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.strokeRect(jbX - 4, jbY - 4, jbW + 8, jbH + 8);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#020617';
        ctx.fillRect(jbX, jbY, jbW, jbH);

        ctx.fillStyle = '#facc15';
        ctx.font = '900 12.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★ 스마일 홈런 더비 3D 공식 스타디움 ★', jbX + jbW / 2, jbY + 16);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px monospace';
        const roleStr = (this.userRole === 'batter') ? '🏏 ATTACK' : '⚾ DEFENSE';
        ctx.fillText(`${this.p1.name} [${this.p1.score}] vs [${this.p2.score}] ${this.p2.name} | ${roleStr} (${this.inningHalf === 'top' ? '1회초' : '1회말'})`, jbX + jbW / 2, jbY + 34);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('LIVE 4K ULTRA RETINA RESOLUTION • KBO OFFICIAL STADIUM', jbX + jbW / 2, jbY + 47);

        // 메이저리그 딥그린 패딩 외야 펜스 (Green Monster Outfield Wall)
        const wallH = (pBL.y - pTL.y) * 0.42;
        const wallGrad = ctx.createLinearGradient(0, pBL.y - wallH, 0, pBL.y);
        wallGrad.addColorStop(0, '#064e3b');
        wallGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(pBL.x, pBL.y - wallH, pBR.x - pBL.x, wallH);

        // 펜스 상단 옐로우 패딩 림
        ctx.fillStyle = '#eab308';
        ctx.fillRect(pBL.x, pBL.y - wallH, pBR.x - pBL.x, 3.5);

        // 외야 거리 펜스 표지판 (330 FT / 100M - 408 FT / 124M - 330 FT / 100M)
        if (this.userRole === 'batter') {
            ctx.fillStyle = '#fef08a';
            ctx.font = '900 13px monospace';
            ctx.textAlign = 'center';
            const centerM = this.project(0, 32, wallZ);
            const leftM = this.project(-230, 32, wallZ);
            const rightM = this.project(230, 32, wallZ);
            ctx.fillText('⚾ 408 FT (124M) ⚾', centerM.x, centerM.y);
            ctx.fillText('330 FT (100M)', leftM.x, leftM.y);
            ctx.fillText('330 FT (100M)', rightM.x, rightM.y);

            // 좌우 노란색 파울 폴 (Foul Poles)
            [-240, 240].forEach(px => {
                const pole = this.project(px, 120, wallZ);
                if (pole) {
                    ctx.fillStyle = '#eab308';
                    ctx.fillRect(pole.x - 2, pole.y, 4, pBL.y - pole.y);
                }
            });
        }

        // [3] 메이저리그 천연 잔디 & 워닝 트랙 (Major League Striped Lawn & Outfield Warning Track)
        const turfGrad = ctx.createLinearGradient(0, pBL.y, 0, this.height);
        turfGrad.addColorStop(0, '#15803d');
        turfGrad.addColorStop(1, '#166534');
        ctx.fillStyle = turfGrad;
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(this.width, this.height);
        ctx.lineTo(0, this.height);
        ctx.closePath();
        ctx.fill();

        // 흙빛 외야 워닝 트랙 (Outfield Warning Track Dirt Strip)
        const wtH = (this.height - pBL.y) * 0.14;
        const wtGrad = ctx.createLinearGradient(0, pBL.y, 0, pBL.y + wtH);
        wtGrad.addColorStop(0, '#7c2d12');
        wtGrad.addColorStop(0.7, '#9a3412');
        wtGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = wtGrad;
        ctx.beginPath();
        ctx.moveTo(pBL.x, pBL.y);
        ctx.lineTo(pBR.x, pBR.y);
        ctx.lineTo(this.width * 0.95, pBL.y + wtH);
        ctx.lineTo(this.width * 0.05, pBL.y + wtH);
        ctx.closePath();
        ctx.fill();

        // 워닝 트랙과 잔디 경계 백색 분필선
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(this.width * 0.05, pBL.y + wtH);
        ctx.lineTo(this.width * 0.95, pBL.y + wtH);
        ctx.stroke();

        // 🌿 메이저리그/KBO 공식 수직 원근 잔디 깎기 줄무늬 (원근감 살린 스트레이트 모어 라인)
        const stripeCount = 14;
        for (let i = 0; i < stripeCount; i++) {
            if (i % 2 === 0) {
                const x0 = pBL.x + (pBR.x - pBL.x) * (i / stripeCount);
                const x1 = pBL.x + (pBR.x - pBL.x) * ((i + 1) / stripeCount);
                const bx0 = this.width * (i / stripeCount);
                const bx1 = this.width * ((i + 1) / stripeCount);

                ctx.fillStyle = 'rgba(34, 197, 94, 0.08)'; // 자연스러운 태양광 반사 잔디결
                ctx.beginPath();
                ctx.moveTo(x0, pBL.y + wtH);
                ctx.lineTo(x1, pBL.y + wtH);
                ctx.lineTo(bx1, this.height);
                ctx.lineTo(bx0, this.height);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    /**
     * 💎 야구 다이아몬드 베이스 (홈, 1루, 2루, 3루 흙 주로, 거대 부채꼴 내야 스킨 & 베이스백)
     */
    renderDiamondAndBases(ctx) {
        // [스마일 홈런 더비 3D] 와이드 프로 다이아몬드 베이스 좌표 (시원하고 넓은 정통 내야)
        // 홈: (0, 0, 380) / 1루: (180, 0, 230) / 2루: (0, 0, 100) / 3루: (-180, 0, 230)
        const pHome = this.project(0, 0, 380);
        const p1B   = this.project(180, 0, 230);
        const p2B   = this.project(0, 0, 100);
        const p3B   = this.project(-180, 0, 230);
        const wallZ = -180;
        const pLeftPole  = this.project(-260, 0, wallZ);
        const pRightPole = this.project(260, 0, wallZ);

        if (!pHome || !p1B || !p2B || !p3B) return;

        ctx.save();

        // 1. 🏟️ 프로야구 공식 와이드 부채꼴 내야 클레이 스킨 (Infield Clay Arc)
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        const arcSteps = 24;
        for (let i = 0; i <= arcSteps; i++) {
            const angle = Math.PI - (i / arcSteps) * Math.PI; // PI(3루 외곽) -> 0(1루 외곽)
            const ax = Math.cos(angle) * 230;
            const az = 190 - Math.sin(angle) * 150;
            const ap = this.project(ax, 0, az);
            if (ap) ctx.lineTo(ap.x, ap.y);
        }
        ctx.closePath();
        ctx.fill();

        // 2. 내야 잔디 다이아몬드 아일랜드
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        const pGrassHome = this.project(0, 0, 345);
        const pGrass1B = this.project(145, 0, 230);
        const pGrass2B = this.project(0, 0, 120);
        const pGrass3B = this.project(-145, 0, 230);
        ctx.moveTo(pGrassHome.x, pGrassHome.y);
        ctx.lineTo(pGrass1B.x, pGrass1B.y);
        ctx.lineTo(pGrass2B.x, pGrass2B.y);
        ctx.lineTo(pGrass3B.x, pGrass3B.y);
        ctx.closePath();
        ctx.fill();

        // 3. 베이스별 흙 슬라이딩 피트 (Sliding Pits at 1B, 2B, 3B)
        [p1B, p2B, p3B].forEach(bp => {
            if (bp) {
                ctx.fillStyle = '#9a3412';
                ctx.beginPath();
                ctx.ellipse(bp.x, bp.y, 22 * bp.scale, 8 * bp.scale, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 4. 홈 -> 1루 / 홈 -> 3루 흙 베이스러닝 주로 (Basepaths Dirt Lanes)
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 14 * pHome.scale;
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p1B.x, p1B.y);
        ctx.moveTo(pHome.x, pHome.y); ctx.lineTo(p3B.x, p3B.y);
        ctx.stroke();

        // 5. 🌟 프로야구 공식 풀-렝스 백색 파울라인 (홈 -> 1루/3루 통과 -> 외야 끝 파울폴까지 시원하게 뻗음!)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 2.4 * pHome.scale;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        if (pLeftPole) {
            ctx.moveTo(pHome.x, pHome.y);
            ctx.lineTo(pLeftPole.x, pLeftPole.y);
        }
        if (pRightPole) {
            ctx.moveTo(pHome.x, pHome.y);
            ctx.lineTo(pRightPole.x, pRightPole.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 4. 홈플레이트 주변 클레이 흙 서클 & 타자석 분필 박스
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.ellipse(pHome.x, pHome.y, 88 * pHome.scale, 32 * pHome.scale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 타자석 (좌타석/우타석 백색 분필선)
        const hs = pHome.scale;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5 * hs;
        // 우타자석
        ctx.strokeRect(pHome.x + 22 * hs, pHome.y - 18 * hs, 24 * hs, 42 * hs);
        // 좌타자석
        ctx.strokeRect(pHome.x - 46 * hs, pHome.y - 18 * hs, 24 * hs, 42 * hs);

        // 3D 홈플레이트 백색 오각형 (입체 베벨 포함)
        ctx.fillStyle = '#0f172a'; // 검은색 고무 테두리
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y);
        ctx.lineTo(pHome.x - 14 * hs, pHome.y + 6 * hs);
        ctx.lineTo(pHome.x - 14 * hs, pHome.y + 17 * hs);
        ctx.lineTo(pHome.x + 14 * hs, pHome.y + 17 * hs);
        ctx.lineTo(pHome.x + 14 * hs, pHome.y + 6 * hs);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc'; // 흰색 본판
        ctx.beginPath();
        ctx.moveTo(pHome.x, pHome.y + 1 * hs);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 6 * hs);
        ctx.lineTo(pHome.x - 12 * hs, pHome.y + 15 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 15 * hs);
        ctx.lineTo(pHome.x + 12 * hs, pHome.y + 6 * hs);
        ctx.closePath();
        ctx.fill();

        // 5. 3D 사각 베이스백 (1루, 2루, 3루 캔버스 큐브)
        const renderBaseBag = (pt, isOccupied, label) => {
            const bs = pt.scale;
            const bw = 15 * bs;
            const bh = 15 * bs;

            ctx.save();
            ctx.translate(pt.x, pt.y);

            // 베이스백 바닥 그림자
            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3 * bs, bw * 0.7, bh * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            // 베이스백 입체 사각 쿠션
            ctx.fillStyle = isOccupied ? '#fde047' : '#ffffff';
            ctx.beginPath();
            ctx.rect(-bw / 2, -bh / 2, bw, bh);
            ctx.fill();
            ctx.strokeStyle = isOccupied ? '#d97706' : '#94a3b8';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // 베이스 중앙 엠보싱 스티치
            ctx.fillStyle = isOccupied ? '#b45309' : '#cbd5e1';
            ctx.font = `bold ${Math.round(8 * bs)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(label, 0, 3 * bs);

            ctx.restore();
        };

        renderBaseBag(p1B, this.bases.first, '1B');
        renderBaseBag(p2B, this.bases.second, '2B');
        renderBaseBag(p3B, this.bases.third, '3B');
        ctx.restore();
    }

    /**
     * 🛡️ 7인제 3D 정밀 수비수 렌더링 (1루수, 2루수, 유격수, 3루수, 좌익수, 중견수, 우익수)
     */
    renderFielders(ctx) {
        if (!this.fielders) return;

        // 투수 시점 vs 타자 시점에 따른 Z-sorting
        const sorted = [...this.fielders].sort((a, b) => {
            if (this.userRole === 'batter') {
                return (this.camera.z - b.z) - (this.camera.z - a.z);
            } else {
                return (b.z - this.camera.z) - (a.z - this.camera.z);
            }
        });

        const fieldingTeamChar = (this.userRole === 'batter') ? this.p2.char : this.p1.char;
        const fieldingCharObj = this.characters[fieldingTeamChar] || this.characters.tiger;
        const fieldingSkin = fieldingCharObj.skins ? fieldingCharObj.skins.classic : { jersey: '#1d4ed8', cap: '#1e3a8a' };

        sorted.forEach(f => {
            // 🚫 [투수 시점 뷰 클리어링]
            // 투구 조준 및 비행 시에는 화면 중앙을 가리지 않되, 타구 발생(hit_flight/result_pause) 시에는 전 수비수 시각화!
            if (this.userRole === 'pitcher' && (this.gameState === 'aiming' || this.gameState === 'windup' || this.gameState === 'in_flight')) {
                if (f.role === 'CF' || f.role === 'LF' || f.role === 'RF') return;
                if (Math.abs(f.x) < 80) return; // 투수-홈플레이트 중앙 통로 100% 확보
            }

            const p = this.project(f.x, f.y, f.z);
            if (!p || p.scale <= 0) return;
            const s = p.scale;
            const h = 76 * s;
            const w = 32 * s;

            ctx.save();
            ctx.translate(p.x, p.y);

            // 1. 전담 수비수 발밑 다이내믹 펄스 링 & 그림자
            if (f.isAssigned) {
                const pulseR = (16 + Math.sin(f.runTimer * 3) * 4) * s;
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 2.5 * s;
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.ellipse(0, 3 * s, pulseR, pulseR * 0.45, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 3 * s, 14 * s, 6 * s, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. 수비 동작별 포스처 변환 (달리기 / 슈퍼 다이빙 캐치 / 점핑 캐치 / 1루 송구 / 스트레칭)
            const isDiving = (f.action === 'diving');
            const isJumping = (f.action === 'jumping');
            const isThrowing = (f.action === 'throwing');
            const isStretching = (f.action === 'stretching');
            const isRunning = (f.action === 'pursuing');
            const isReady = (f.action === 'ready');

            if (isDiving) {
                // 🔥 [컴투스 프로야구] 슈퍼 다이빙 캐치: 몸을 지면으로 수평으로 던져 슬라이딩!
                const diveDir = (f.x < (this.ball ? this.ball.x : 0)) ? 1 : -1;
                ctx.translate(diveDir * 20 * s, 8 * s);
                ctx.rotate(diveDir * 0.98);
            } else if (isJumping) {
                ctx.translate(0, -22 * s); // 허공으로 솟구쳐 오르는 슈퍼 점핑 캐치!
            } else if (isReady) {
                ctx.translate(0, 3 * s); // 프로 수비수 준비 자세 (무릎 굽히기)
            }

            const legAngle = isRunning ? Math.sin(f.runTimer) * 0.65 : (isReady ? 0.2 : 0);

            // [다리 렌더링 - 3D 프로 유니폼 바지 & 질주/다이빙/스트레칭 애니메이션]
            // 왼다리
            ctx.save();
            ctx.translate(-w * 0.24, -h * 0.40);
            if (isRunning) ctx.rotate(legAngle);
            else if (isDiving) ctx.rotate(-0.4);
            else if (isStretching) ctx.rotate(-0.85); // 1루수 베이스 찢기 스트레칭!
            else if (isReady) ctx.rotate(-0.15);

            const legGradL = ctx.createLinearGradient(-w * 0.18, 0, w * 0.18, 0);
            legGradL.addColorStop(0, '#e2e8f0');
            legGradL.addColorStop(0.5, '#ffffff');
            legGradL.addColorStop(1, '#94a3b8');
            ctx.fillStyle = legGradL;
            ctx.fillRect(-w * 0.18, 0, w * 0.36, h * 0.40);

            // 사이드 파이핑 스트라이프
            ctx.fillStyle = fieldingSkin.jersey || '#1d4ed8';
            ctx.fillRect(-w * 0.18, 0, 2.5 * s, h * 0.40);

            // 스파이크화
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.22, h * 0.34, w * 0.42, h * 0.07);
            ctx.restore();

            // 오른다리
            ctx.save();
            ctx.translate(w * 0.24, -h * 0.40);
            if (isRunning) ctx.rotate(-legAngle);
            else if (isDiving) ctx.rotate(-0.35);
            else if (isStretching) ctx.rotate(0.25);
            else if (isReady) ctx.rotate(0.15);

            const legGradR = ctx.createLinearGradient(-w * 0.18, 0, w * 0.18, 0);
            legGradR.addColorStop(0, '#f8fafc');
            legGradR.addColorStop(0.5, '#ffffff');
            legGradR.addColorStop(1, '#64748b');
            ctx.fillStyle = legGradR;
            ctx.fillRect(-w * 0.18, 0, w * 0.36, h * 0.40);

            ctx.fillStyle = fieldingSkin.jersey || '#1d4ed8';
            ctx.fillRect(w * 0.14, 0, 2.5 * s, h * 0.40);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.20, h * 0.34, w * 0.42, h * 0.07);
            ctx.restore();

            // 3. 수비 상체 (3D 팀 저지 볼륨 & 벨트)
            ctx.save();
            if (isRunning) ctx.rotate(0.12);
            else if (isDiving) ctx.rotate(0.15);
            else if (isReady) ctx.rotate(0.05);

            const jerseyGrad = ctx.createLinearGradient(-w * 0.46, 0, w * 0.46, 0);
            jerseyGrad.addColorStop(0, fieldingSkin.jersey || '#1d4ed8');
            jerseyGrad.addColorStop(0.3, '#ffffff'); // 3D 하이라이트 림
            jerseyGrad.addColorStop(0.65, fieldingSkin.jersey || '#1d4ed8');
            jerseyGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = jerseyGrad;
            ctx.beginPath();
            ctx.roundRect(-w * 0.46, -h * 0.78, w * 0.92, h * 0.40, 6 * s);
            ctx.fill();
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 1.4 * s;
            ctx.stroke();

            // 가죽 벨트 & 금속 버클
            ctx.fillStyle = '#020617';
            ctx.fillRect(-w * 0.44, -h * 0.42, w * 0.88, 3.5 * s);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-3 * s, -h * 0.42, 6 * s, 3.5 * s);

            // 4. 리얼 3D 가죽 글러브 (가죽 웹 끈, 깊은 포켓, 웰팅 라인)
            const gloveGrad = ctx.createRadialGradient(-w * 0.5, -h * 0.6, 2 * s, -w * 0.5, -h * 0.6, 12 * s);
            gloveGrad.addColorStop(0, '#d97706');
            gloveGrad.addColorStop(0.6, '#92400e');
            gloveGrad.addColorStop(1, '#451a03');
            ctx.fillStyle = gloveGrad;
            ctx.beginPath();
            if (isDiving) {
                // 다이빙: 지면을 향해 앞으로 쭉 뻗은 글러브
                ctx.ellipse(-w * 0.85, -h * 0.35, 11 * s, 12 * s, 0.6, 0, Math.PI * 2);
            } else if (isJumping) {
                // 머리 위로 높이 뻗은 글러브
                ctx.ellipse(-w * 0.25, -h * 1.25, 10 * s, 13 * s, -0.15, 0, Math.PI * 2);
            } else if (isStretching) {
                // 1루 베이스 쪽으로 쭉 뻗은 글러브
                ctx.ellipse(-w * 0.90, -h * 0.52, 11 * s, 13 * s, 0.45, 0, Math.PI * 2);
            } else if (isReady) {
                // 준비 자세: 몸 앞 낮게 바구니 형태로 쥔 글러브
                ctx.ellipse(-w * 0.35, -h * 0.44, 9 * s, 10 * s, 0.3, 0, Math.PI * 2);
            } else {
                ctx.ellipse(-w * 0.52, -h * 0.55, 8 * s, 10 * s, 0.2, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.strokeStyle = '#290e02';
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();

            // 글러브 T-웹 십자 끈 디테일
            ctx.strokeStyle = '#fde68a';
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            if (isDiving) {
                ctx.moveTo(-w * 0.92, -h * 0.35); ctx.lineTo(-w * 0.78, -h * 0.35);
                ctx.moveTo(-w * 0.85, -h * 0.42); ctx.lineTo(-w * 0.85, -h * 0.28);
            } else if (isJumping) {
                ctx.moveTo(-w * 0.32, -h * 1.25); ctx.lineTo(-w * 0.18, -h * 1.25);
                ctx.moveTo(-w * 0.25, -h * 1.32); ctx.lineTo(-w * 0.25, -h * 1.18);
            } else {
                ctx.moveTo(-w * 0.58, -h * 0.55); ctx.lineTo(-w * 0.46, -h * 0.55);
                ctx.moveTo(-w * 0.52, -h * 0.61); ctx.lineTo(-w * 0.52, -h * 0.49);
            }
            ctx.stroke();

            // 5. 오른손
            ctx.fillStyle = '#fed7aa';
            ctx.beginPath();
            if (isThrowing) {
                ctx.arc(w * 0.72, -h * 0.88, 5.5 * s, 0, Math.PI * 2); // 송구 채찍 스로잉
            } else if (isReady) {
                ctx.arc(w * 0.25, -h * 0.44, 4.2 * s, 0, Math.PI * 2);
            } else {
                ctx.arc(w * 0.46, -h * 0.55, 4.2 * s, 0, Math.PI * 2);
            }
            ctx.fill();

            // 6. [컴투스 프로야구 3D] 프로야구 선수 헤드 & 3D 프로 캡
            ctx.save();
            ctx.translate(0, -h * 0.88);
            this.drawCom2usProAthleteFace(ctx, s * 0.82, true, fieldingSkin, fieldingCharObj, false);

            // 3D 프로 캡
            const capGrad = ctx.createRadialGradient(-3 * s, -10 * s, 2 * s, 0, -5 * s, 14 * s);
            capGrad.addColorStop(0, '#ffffff');
            capGrad.addColorStop(0.35, fieldingSkin.cap || '#1e3a8a');
            capGrad.addColorStop(1, '#020617');
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.arc(0, -5 * s, 13 * s, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1 * s;
            ctx.stroke();

            // 곡선형 바이저 (챙)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-12 * s, -5 * s, 24 * s, 3.2 * s);
            ctx.restore();

            ctx.restore(); // 상체 rotate restore

            // 7. 수비 포지션 네임택 배지 & 실시간 수비 상태 텍스트
            let statusText = f.role;
            let badgeBg = 'rgba(15, 23, 42, 0.85)';
            let badgeColor = '#38bdf8';

            if (f.isAssigned) {
                badgeBg = '#facc15';
                badgeColor = '#0f172a';
                if (f.action === 'diving') {
                    statusText = '🔥 슈퍼 다이빙 캐치!';
                    badgeBg = '#ef4444';
                    badgeColor = '#ffffff';
                }
                else if (f.action === 'jumping') {
                    statusText = '🧤 슈퍼 점핑 캐치!';
                    badgeBg = '#ef4444';
                    badgeColor = '#ffffff';
                }
                else if (f.action === 'throwing') statusText = '⚾ 1루 레이저 송구!';
                else if (f.action === 'stretching') statusText = '🧤 1루 베이스 포구!';
                else statusText = `🏃 ${f.name} 전력 질주!`;
            }

            ctx.fillStyle = badgeBg;
            ctx.beginPath();
            const badgeW = Math.max(38 * s, 64 * s);
            ctx.roundRect(-badgeW / 2, -h * 1.25, badgeW, 12 * s, 3 * s);
            ctx.fill();
            ctx.fillStyle = badgeColor;
            ctx.font = `bold ${Math.max(8, Math.round(9 * s))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(statusText, 0, -h * 1.13);

            ctx.restore();
        });
    }

    /**
     * ⚾ 3D 수비수 레이저 송구(Laser Throw) 비행 렌더링
     */
    renderFieldingThrow(ctx) {
        if (!this.fieldingThrow || !this.fieldingThrow.active) return;
        const ft = this.fieldingThrow;
        const pt = this.project(ft.x, ft.y, ft.z);
        if (!pt || pt.scale <= 0) return;

        const s = pt.scale;
        const r = Math.max(3.5, 7.5 * s);

        ctx.save();

        // 1. 송구 레이저 스피드 라인 (Yellow-white glow trail)
        const startPt = this.project(ft.startX, ft.startY, ft.startZ);
        if (startPt) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
            ctx.lineWidth = 3.5 * s;
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8 * s;
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.stroke();
        }

        ctx.translate(pt.x, pt.y);

        // 2. 송구 야구공 본체
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 3. 야구공 붉은 실밥 스티치
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.arc(-r * 0.35, 0, r * 0.75, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.35, 0, r * 0.75, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();

        // 4. 스피드 플레어 글로우
        ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * 🏃 3D 다이아몬드 베이스 주자들 렌더링 (질주 중인 주자 + 베이스 위 주자)
     */
    renderBaseRunners(ctx) {
        // 1. 이동 중인 주자들 그리기 (활성 주자가 있을 때)
        if (this.activeRunners && this.activeRunners.length > 0) {
            const sorted = [...this.activeRunners].sort((a, b) => {
                if (this.userRole === 'batter') {
                    return (this.camera.z - b.z) - (this.camera.z - a.z);
                } else {
                    return (b.z - this.camera.z) - (a.z - this.camera.z);
                }
            });
            sorted.forEach(r => this.render3DRunner(ctx, r));
        } else {
            // 2. 각 베이스에서 대기 중인 주자들 (리얼 3D 리드오프 스탠스)
            const bChar = this.getCurrentBatter();
            const bSkin = this.getCurrentBatterSkin();

            if (this.bases.first) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['1B'].x + 12, 0, this.BASE_POS['1B'].z, bChar, bSkin, '1B');
            }
            if (this.bases.second) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['2B'].x, 0, this.BASE_POS['2B'].z + 10, bChar, bSkin, '2B');
            }
            if (this.bases.third) {
                this.render3DStationaryRunner(ctx, this.BASE_POS['3B'].x - 12, 0, this.BASE_POS['3B'].z, bChar, bSkin, '3B');
            }
        }
    }

    /**
     * 🏃 실제 질주하는 3D 주자 캐릭터 (다관절 달리기 모션 & 슬라이딩 & 흙먼지)
     */
    render3DRunner(ctx, runner) {
        const p = this.project(runner.x, runner.y, runner.z);
        if (!p || p.scale <= 0) return;
        const s = p.scale;
        const h = 78 * s;
        const w = 32 * s;
        const char = runner.char || this.characters.tiger;
        const skin = runner.skin || { jersey: '#dc2626', cap: '#991b1b' };

        // 🏃 이동 방향 판정: 현재 레그의 시작 베이스 -> 목표 베이스 벡터
        const fromKey = runner.path[runner.legIndex] || 'HOME';
        const toKey = runner.path[runner.legIndex + 1] || '1B';
        const p0 = this.BASE_POS[fromKey];
        const p1 = this.BASE_POS[toKey];
        const dx = (p1 && p0) ? (p1.x - p0.x) : 1;
        const dz = (p1 && p0) ? (p1.z - p0.z) : -1;

        const isMovingLeft = (dx < 0);
        const isMovingAway = (dz < 0); // 외야/원거리 방향으로 뛰어가는 뒷모습

        const isFinalLeg = (runner.legIndex >= runner.path.length - 2);
        const isSliding = !runner.isFinished && isFinalLeg && (runner.progress > 0.76);

        ctx.save();
        ctx.translate(p.x, p.y);

        // 3D 지면 그림자
        ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';
        ctx.beginPath();
        if (isSliding) {
            ctx.ellipse(0, 3 * s, 26 * s, 8 * s, 0, 0, Math.PI * 2);
        } else {
            ctx.ellipse(0, 4 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // 🔄 좌측으로 이동 중이면 스프라이트 수평 반전 (더 이상 거꾸로 문워크하지 않음!)
        if (isMovingLeft) {
            ctx.scale(-1, 1);
        }

        // [상태 1] 베이스 안착 완료: 당당한 세이프 스탠스
        if (runner.isFinished) {
            const breathe = Math.sin(this.crowdCheerTimer * 2.2) * 1.5 * s;
            // 다리 (베이스 밟고 선 안정된 자세)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w * 0.35, -h * 0.42, w * 0.30, h * 0.42);
            ctx.fillRect(w * 0.05, -h * 0.42, w * 0.30, h * 0.42);
            // 발 (스파이크)
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.38, -h * 0.06, w * 0.34, h * 0.06);
            ctx.fillRect(w * 0.04, -h * 0.06, w * 0.34, h * 0.06);

            // 상체 (유니폼 저지)
            ctx.fillStyle = skin.jersey;
            ctx.beginPath();
            ctx.roundRect(-w * 0.40, -h * 0.82 + breathe, w * 0.80, h * 0.40, 5 * s);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.4 * s;
            ctx.stroke();

            // 등번호 or 팀 로고
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(8 * s)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(runner.isBatter ? 'BAT' : 'SAFE', 0, -h * 0.62 + breathe);

            // 머리 & 헬멧
            ctx.save();
            ctx.translate(0, -h * 0.92 + breathe);
            if (isMovingAway) {
                // 뒷모습 헬멧
                ctx.fillStyle = skin.cap;
                ctx.beginPath();
                ctx.arc(0, 0, 13 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.2 * s;
                ctx.stroke();
            } else {
                if (char.id === 'tiger') this.drawTigerFace(ctx, s * 0.82, true, skin);
                else if (char.id === 'frog') this.drawFrogFace(ctx, s * 0.82, true, skin);
                else if (char.id === 'penguin') this.drawPenguinFace(ctx, s * 0.82, true, skin);
                else this.drawMonkeyFace(ctx, s * 0.82, true, skin);

                ctx.fillStyle = skin.cap;
                ctx.beginPath();
                ctx.arc(0, -5 * s, 13 * s, Math.PI, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillRect(4 * s, -6 * s, 10 * s, 3.5 * s);
            }
            ctx.restore();
            ctx.restore();
            return;
        }

        // [상태 2] 박진감 넘치는 베이스 슬라이딩! (Sliding into base)
        if (isSliding) {
            ctx.save();
            ctx.translate(0, -h * 0.22);
            ctx.rotate(0.32); // 바닥에 미끄러져 들어가는 슬라이딩 각도

            // 슬라이딩 흙먼지 폭풍
            if (Math.random() < 0.6) {
                this.particles.push({
                    x: runner.x + (Math.random() - 0.5) * 12,
                    y: 2,
                    z: runner.z + (Math.random() - 0.5) * 12,
                    vx: -(dx) * 0.08 + (Math.random() - 0.5) * 8,
                    vy: 6 + Math.random() * 10,
                    vz: -(dz) * 0.08 + (Math.random() - 0.5) * 8,
                    color: '#fef3c7',
                    size: 4 + Math.random() * 4,
                    life: 0.4
                });
            }

            // 뻗은 다리 (베이스를 향해 앞으로 전력 뻗음)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, -h * 0.12, w * 0.85, h * 0.20);
            ctx.fillStyle = skin.jersey;
            ctx.fillRect(w * 0.5, -h * 0.12, w * 0.25, h * 0.20);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(w * 0.75, -h * 0.14, w * 0.18, h * 0.24); // 스파이크

            // 상체 (바닥에 낮게 엎드린 슬라이딩)
            ctx.fillStyle = skin.jersey;
            ctx.beginPath();
            ctx.roundRect(-w * 0.65, -h * 0.25, w * 0.70, h * 0.32, 5 * s);
            ctx.fill();
            ctx.stroke();

            // 앞으로 뻗은 팔
            ctx.strokeStyle = '#fde047';
            ctx.lineWidth = 5 * s;
            ctx.beginPath();
            ctx.moveTo(-w * 0.2, -h * 0.15);
            ctx.lineTo(w * 0.4, -h * 0.10);
            ctx.stroke();

            // 머리 & 헬멧
            ctx.save();
            ctx.translate(-w * 0.75, -h * 0.22);
            ctx.fillStyle = skin.cap;
            ctx.beginPath();
            ctx.arc(0, 0, 12 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            ctx.restore();
            ctx.restore();
            return;
        }

        // [상태 3] 🏃 리얼 2단 관절 다이내믹 전력 질주 (Athletic Articulated Sprint)
        const cycle = runner.runCycle;
        const bobY = Math.abs(Math.sin(cycle)) * 6.0 * s;

        // 관절 계산: 고관절 스윙 + 무릎 굴곡 (High Knee Drive & Heel Kick)
        const hip1 = Math.sin(cycle) * 0.78;
        const hip2 = -Math.sin(cycle) * 0.78;

        // 무릎: 다리가 뒤로 갈 때(hip < 0) 무릎이 위로 굽혀지고, 앞으로 올 때(hip > 0) 높이 치솟음!
        const knee1 = (hip1 < 0) ? Math.abs(hip1) * 1.35 : 0.18;
        const knee2 = (hip2 < 0) ? Math.abs(hip2) * 1.35 : 0.18;

        // 팔: 어깨 스윙 + 팔꿈치 90도 굽힘 전력 펌핑
        const shoulder1 = -Math.sin(cycle) * 0.85;
        const shoulder2 = Math.sin(cycle) * 0.85;
        const elbow1 = 1.45 + Math.cos(cycle) * 0.25;
        const elbow2 = 1.45 - Math.cos(cycle) * 0.25;

        ctx.save();
        ctx.translate(0, -bobY);

        // 1. 뒷다리 (2단 관절: 허벅지 -> 무릎 -> 종아리/스파이크)
        ctx.save();
        ctx.translate(-w * 0.15, -h * 0.44);
        ctx.rotate(hip1);
        // 허벅지
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.14, 0, w * 0.28, h * 0.24);
        // 무릎 관절 회전
        ctx.translate(0, h * 0.22);
        ctx.rotate(knee1);
        // 종아리 (스타킹)
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.12, 0, w * 0.24, h * 0.20);
        // 스파이크 (발)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.14, h * 0.16, w * 0.32, h * 0.07);
        ctx.restore();

        // 2. 앞다리 (2단 관절)
        ctx.save();
        ctx.translate(w * 0.15, -h * 0.44);
        ctx.rotate(hip2);
        // 허벅지
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.14, 0, w * 0.28, h * 0.24);
        // 무릎 관절 회전
        ctx.translate(0, h * 0.22);
        ctx.rotate(knee2);
        // 종아리 (스타킹)
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.12, 0, w * 0.24, h * 0.20);
        // 스파이크 (발)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.14, h * 0.16, w * 0.32, h * 0.07);
        ctx.restore();

        // 3. 상체 (폭발적인 전방 스프린트 린 Forward Sprint Lean)
        ctx.save();
        ctx.translate(0, -h * 0.45);
        ctx.rotate(0.30); // 18도 전방 상체 기울기!

        // 안쪽 팔 (2단 관절: 어깨 -> 팔꿈치 90도 펌핑)
        ctx.save();
        ctx.translate(-w * 0.32, -h * 0.32);
        ctx.rotate(shoulder1);
        // 상완
        ctx.strokeStyle = skin.jersey;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.16);
        ctx.stroke();
        // 팔꿈치 굴곡
        ctx.translate(0, h * 0.15);
        ctx.rotate(elbow1);
        // 전완 & 주먹
        ctx.strokeStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.16);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, h * 0.16, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 유니폼 저지
        ctx.fillStyle = skin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.42, -h * 0.38, w * 0.84, h * 0.40, 6 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // 뒷모습 vs 앞모습에 따른 등번호 / 로고 렌더링
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(8 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        if (isMovingAway) {
            ctx.fillText(runner.isBatter ? '99' : '7', 0, -h * 0.18);
        } else {
            ctx.fillText(runner.isBatter ? 'BAT' : 'RUN', 0, -h * 0.18);
        }

        // 바깥쪽 팔 (2단 관절: 어깨 -> 팔꿈치 90도 펌핑)
        ctx.save();
        ctx.translate(w * 0.32, -h * 0.32);
        ctx.rotate(shoulder2);
        // 상완
        ctx.strokeStyle = skin.jersey;
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.16);
        ctx.stroke();
        // 팔꿈치 굴곡
        ctx.translate(0, h * 0.15);
        ctx.rotate(elbow2);
        // 전완 & 주먹
        ctx.strokeStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, h * 0.16);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, h * 0.16, 3.5 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 4. 머리 & 헬멧
        ctx.save();
        ctx.translate(0, -h * 0.50);

        if (isMovingAway) {
            // 뒤통수 헬멧 & 통풍구
            ctx.fillStyle = skin.cap;
            ctx.beginPath();
            ctx.arc(0, 0, 14 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-3 * s, -6 * s, 6 * s, 2 * s);
        } else {
            // 정면/측면 동물 캐릭터 얼굴
            if (char.id === 'tiger') this.drawTigerFace(ctx, s * 0.85, true, skin);
            else if (char.id === 'frog') this.drawFrogFace(ctx, s * 0.85, true, skin);
            else if (char.id === 'penguin') this.drawPenguinFace(ctx, s * 0.85, true, skin);
            else this.drawMonkeyFace(ctx, s * 0.85, true, skin);

            // 헬멧 및 앞챙
            ctx.fillStyle = skin.cap;
            ctx.beginPath();
            ctx.arc(0, -5 * s, 14 * s, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();
            ctx.fillRect(4 * s, -6 * s, 10 * s, 3.5 * s); // 챙
        }

        ctx.restore(); // head
        ctx.restore(); // torso
        ctx.restore(); // bob
        ctx.restore(); // root
    }

    /**
     * 🧍 베이스에서 대기 중인 3D 주자 (리드오프 스탠스)
     */
    render3DStationaryRunner(ctx, rx, ry, rz, char, skin, baseLabel) {
        const p = this.project(rx, ry, rz);
        if (!p || p.scale <= 0) return;
        const s = p.scale;
        const h = 74 * s;
        const w = 30 * s;

        ctx.save();
        ctx.translate(p.x, p.y);

        // 지면 그림자
        ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, 15 * s, 5 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // 리드오프 호흡 애니메이션
        const breathe = Math.sin(this.crowdCheerTimer * 1.5) * 1.5 * s;

        // 다리 (살짝 벌린 준비 스탠스)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.42, -h * 0.40, w * 0.34, h * 0.40);
        ctx.fillRect(w * 0.08, -h * 0.40, w * 0.34, h * 0.40);
        ctx.fillStyle = skin.jersey;
        ctx.fillRect(-w * 0.42, -h * 0.20, w * 0.34, h * 0.10);
        ctx.fillRect(w * 0.08, -h * 0.20, w * 0.34, h * 0.10);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.44, -h * 0.05, w * 0.38, h * 0.05);
        ctx.fillRect(w * 0.06, -h * 0.05, w * 0.38, h * 0.05);

        // 상체 (유니폼 저지)
        ctx.fillStyle = skin.jersey;
        ctx.beginPath();
        ctx.roundRect(-w * 0.42, -h * 0.80 + breathe, w * 0.84, h * 0.42, 6 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4 * s;
        ctx.stroke();

        // 머리 & 헬멧
        ctx.save();
        ctx.translate(0, -h * 0.90 + breathe);
        if (char.id === 'tiger') this.drawTigerFace(ctx, s * 0.8, true, skin);
        else if (char.id === 'frog') this.drawFrogFace(ctx, s * 0.8, true, skin);
        else if (char.id === 'penguin') this.drawPenguinFace(ctx, s * 0.8, true, skin);
        else this.drawMonkeyFace(ctx, s * 0.8, true, skin);

        ctx.fillStyle = skin.cap;
        ctx.beginPath();
        ctx.arc(0, -5 * s, 13 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    renderStrikeZoneBox(ctx) {
        // 스트라이크존 z=380, x: -24 ~ 24, y: 22 ~ 66
        const szTL = this.project(-24, 66, 380);
        const szTR = this.project(24, 66, 380);
        const szBL = this.project(-24, 22, 380);
        const szBR = this.project(24, 22, 380);
        const szW = szTR.x - szTL.x;
        const szH = szBL.y - szTL.y;

        ctx.save();

        // 🎯 [컴투스 프로야구 2026] 9분할 핫/콜드 존 (Hot / Cold Strike Zone) 타일 렌더링
        const curBatter = this.getCurrentBatter();
        const hotZones = (curBatter && curBatter.hotZones) ? curBatter.hotZones : [];
        const coldZones = (curBatter && curBatter.coldZones) ? curBatter.coldZones : [];

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                const cellX = szTL.x + c * (szW / 3);
                const cellY = szTL.y + r * (szH / 3);
                const cellW = szW / 3;
                const cellH = szH / 3;

                if (hotZones.includes(idx)) {
                    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
                    ctx.fillRect(cellX + 1, cellY + 1, cellW - 2, cellH - 2);
                    ctx.fillStyle = 'rgba(248, 113, 113, 0.75)';
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText('🔥 HOT', cellX + cellW / 2, cellY + cellH / 2);
                } else if (coldZones.includes(idx)) {
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
                    ctx.fillRect(cellX + 1, cellY + 1, cellW - 2, cellH - 2);
                    ctx.fillStyle = 'rgba(147, 197, 253, 0.70)';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.fillText('❄️ COLD', cellX + cellW / 2, cellY + cellH / 2);
                }
            }
        }

        if (this.userRole === 'pitcher') {
            // ⚾ 투수 시점: 선명한 네온 3D 스트라이크 존 박스 & 코너 브래킷
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.95)';
            ctx.lineWidth = 3.0;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 14;
            ctx.strokeRect(szTL.x, szTL.y, szW, szH);

            // 3x3 격자선
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
            ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

            // 4개 코너 L 브래킷 강조
            const bLen = 8;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            // TL
            ctx.beginPath(); ctx.moveTo(szTL.x, szTL.y + bLen); ctx.lineTo(szTL.x, szTL.y); ctx.lineTo(szTL.x + bLen, szTL.y); ctx.stroke();
            // TR
            ctx.beginPath(); ctx.moveTo(szTR.x - bLen, szTR.y); ctx.lineTo(szTR.x, szTR.y); ctx.lineTo(szTR.x, szTR.y + bLen); ctx.stroke();
            // BL
            ctx.beginPath(); ctx.moveTo(szBL.x, szBL.y - bLen); ctx.lineTo(szBL.x, szBL.y); ctx.lineTo(szBL.x + bLen, szBL.y); ctx.stroke();
            // BR
            ctx.beginPath(); ctx.moveTo(szBR.x - bLen, szBR.y); ctx.lineTo(szBR.x, szBR.y); ctx.lineTo(szBR.x, szBR.y - bLen); ctx.stroke();

            // 🎯 [스마일 홈런 더비 3D 투수 시점] 콤팩트 3D 과녁 (Compact Bullseye Reticle - 스트라이크 존 1분할 크기)
            if (this.gameState === 'aiming' || this.gameState === 'windup') {
                const aimPt = this.project(this.pitchAimX, this.pitchAimY, 380);
                const inAimZone = (Math.abs(this.pitchAimX) <= 24 && this.pitchAimY >= 22 && this.pitchAimY <= 66);
                const themeColor = inAimZone ? '#22c55e' : '#f59e0b';
                const s = aimPt.scale;
                const now = Date.now();
                const pulse = 1.0 + Math.sin(now / 160) * 0.05;

                ctx.save();
                ctx.translate(aimPt.x, aimPt.y);

                // [1] 외곽 회전 타겟 링 (콤팩트한 1칸 크기: 반경 7.5*s)
                ctx.strokeStyle = themeColor;
                ctx.lineWidth = 1.6 * s;
                ctx.shadowColor = themeColor;
                ctx.shadowBlur = 8;

                const rotAngle = (now / 1000) % (Math.PI * 2);
                ctx.save();
                ctx.rotate(rotAngle);
                ctx.beginPath();
                ctx.arc(0, 0, 7.5 * s * pulse, 0, Math.PI * 2);
                ctx.stroke();

                // 4방향 코너 꺾쇠 브래킷
                const bRad = 9.5 * s * pulse;
                const bSpan = 1.6 * s;
                for (let a = 0; a < 4; a++) {
                    const ang = (a * Math.PI) / 2;
                    const bx = Math.cos(ang) * bRad;
                    const by = Math.sin(ang) * bRad;
                    ctx.beginPath();
                    ctx.arc(bx, by, bSpan, 0, Math.PI * 2);
                    ctx.fillStyle = themeColor;
                    ctx.fill();
                }
                ctx.restore();

                // [2] 중간 과녁 원형 타겟
                ctx.strokeStyle = inAimZone ? 'rgba(34, 197, 94, 0.75)' : 'rgba(245, 158, 11, 0.75)';
                ctx.fillStyle = inAimZone ? 'rgba(34, 197, 94, 0.16)' : 'rgba(245, 158, 11, 0.16)';
                ctx.lineWidth = 1.2 * s;
                ctx.beginPath();
                ctx.arc(0, 0, 4.5 * s, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // [3] 중앙 십자선 & 불스아이 코어
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.2 * s;
                ctx.beginPath();
                ctx.moveTo(-6.5 * s, 0); ctx.lineTo(6.5 * s, 0);
                ctx.moveTo(0, -6.5 * s); ctx.lineTo(0, 6.5 * s);
                ctx.stroke();

                // 중심 발광 도트
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2);
                ctx.fill();

                // [4] 🌀 구종별 궤적 변화구 가이드 화살표 (Break Trajectory Arrow)
                const pType = this.selectedPitchType;
                ctx.save();
                ctx.lineWidth = 2.0 * s;
                ctx.strokeStyle = '#38bdf8';
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#38bdf8';

                if (pType === 'fastball') {
                    // 직구: 라이징 홉 수직 상승 화살표 (↑)
                    ctx.beginPath();
                    ctx.moveTo(0, 4 * s); ctx.lineTo(0, -11 * s);
                    ctx.lineTo(-3 * s, -7 * s); ctx.moveTo(0, -11 * s); ctx.lineTo(3 * s, -7 * s);
                    ctx.stroke();
                } else if (pType === 'curve') {
                    // 12-6 커브: 수직 폭포수 급낙차 곡선 (⤹)
                    ctx.beginPath();
                    ctx.arc(6 * s, 6 * s, 10 * s, Math.PI * 1.1, Math.PI * 1.8, false);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(6 * s, 16 * s); ctx.lineTo(3 * s, 11 * s); ctx.lineTo(9 * s, 11 * s);
                    ctx.closePath(); ctx.fill();
                } else if (pType === 'slider') {
                    // 슬라이더: 날카로운 횡방향 와이프아웃 화살표 (➔)
                    ctx.beginPath();
                    ctx.moveTo(-9 * s, 2 * s); ctx.lineTo(12 * s, 2 * s);
                    ctx.lineTo(8 * s, -1 * s); ctx.moveTo(12 * s, 2 * s); ctx.lineTo(8 * s, 5 * s);
                    ctx.stroke();
                } else if (pType === 'changeup') {
                    // 체인지업: 서서히 가라앉는 싱커 화살표 (⇊)
                    ctx.beginPath();
                    ctx.moveTo(0, -4 * s); ctx.lineTo(0, 12 * s);
                    ctx.lineTo(-3 * s, 8 * s); ctx.moveTo(0, 12 * s); ctx.lineTo(3 * s, 8 * s);
                    ctx.stroke();
                } else if (pType === 'knuckleball') {
                    // 너클볼: 카오스 무회전 물결 곡선 (〰️)
                    ctx.beginPath();
                    ctx.moveTo(-10 * s, 0);
                    ctx.bezierCurveTo(-5 * s, -6 * s, -2 * s, 6 * s, 0, 0);
                    ctx.bezierCurveTo(2 * s, -6 * s, 5 * s, 6 * s, 10 * s, 0);
                    ctx.stroke();
                }
                ctx.restore();

                // [5] 상단 컴프야 스타일 콜 배지 (STRIKE / BALL & 구종 정보)
                const callText = inAimZone ? '🎯 STRIKE' : '⚪ BALL';
                const pChar = this.getCurrentPitcher();
                const pSpeed = pChar.fastballSpeed || 156;
                const pMap = {
                    fastball: `⚡ 직구 ${pSpeed}k`,
                    curve: '🌀 12-6 커브 112k',
                    slider: '🌪️ 슬라이더 136k',
                    changeup: '🐢 체인지업 118k',
                    knuckleball: '🔮 너클볼 94k'
                };
                const fullLabel = `${callText} • ${pMap[pType] || 'FASTBALL'}`;

                ctx.font = `bold ${Math.max(10, Math.round(11 * s))}px sans-serif`;
                ctx.textAlign = 'center';
                const textWidth = ctx.measureText(fullLabel).width;

                // 배지 배경 필
                ctx.fillStyle = inAimZone ? 'rgba(22, 163, 74, 0.92)' : 'rgba(2, 132, 199, 0.92)';
                ctx.beginPath();
                ctx.roundRect(-textWidth / 2 - 8, -38 * s, textWidth + 16, 17 * s, 6);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.0;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.fillText(fullLabel, 0, -26 * s);

                // [6] 하단 태블릿 터치 / 키보드 가이드 안내
                ctx.font = `800 ${Math.max(8.5, Math.round(9.5 * s))}px sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.shadowColor = '#000000';
                ctx.shadowBlur = 6;
                ctx.fillText('📱 터치·드래그 / ⌨️ [WASD·방향키] 조준  |  [Space/F] 투구', 0, 36 * s);

                ctx.restore();
            }
        } else {
            // 🏏 타자 시점 (배터 뷰): 은은한 3x3 스트라이크존
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
            ctx.lineWidth = 2.0;
            ctx.strokeRect(szTL.x, szTL.y, szW, szH);

            ctx.lineWidth = 0.8;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.strokeRect(szTL.x + szW / 3, szTL.y, szW / 3, szH);
            ctx.strokeRect(szTL.x, szTL.y + szH / 3, szW, szH / 3);

            // 🎯 [타격 어시스트 타이밍 링 (Impact Timing Ring & Dynamic PCI)]
            if (this.gameState === 'in_flight' && this.ball && this.ball.active) {
                const b = this.ball;
                const prog = Math.max(0, Math.min(1.0, (b.z - b.startZ) / (b.targetZ - b.startZ)));
                // 플레이트 도달 위치를 향해 역동적으로 이동하는 PCI 조준 링
                const aimPt = this.project(b.targetX, b.targetY, 380);
                if (aimPt) {
                    const s = aimPt.scale;
                    const ringRadius = Math.max(12 * s, (68 * s) * (1.0 - prog * 0.82));
                    const isSweetSpot = (b.z >= 370 && b.z <= 386);

                    ctx.save();
                    ctx.translate(aimPt.x, aimPt.y);

                    if (isSweetSpot) {
                        ctx.strokeStyle = '#22c55e';
                        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
                        ctx.lineWidth = 3.5 * s;
                        ctx.shadowColor = '#22c55e';
                        ctx.shadowBlur = 18;
                    } else {
                        ctx.strokeStyle = '#38bdf8';
                        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                        ctx.lineWidth = 1.8 * s;
                        ctx.shadowColor = '#38bdf8';
                        ctx.shadowBlur = 6;
                    }

                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // 가이드 텍스트
                    ctx.textAlign = 'center';
                    if (isSweetSpot) {
                        ctx.font = `900 ${Math.max(12, Math.round(14 * s))}px sans-serif`;
                        ctx.fillStyle = '#22c55e';
                        ctx.shadowColor = '#000000';
                        ctx.shadowBlur = 8;
                        ctx.fillText('⚡ 지금 스윙! [HIT NOW]', 0, -ringRadius - 10 * s);
                    } else if (this.difficulty === 'easy') {
                        ctx.font = `bold ${Math.max(10, Math.round(11 * s))}px sans-serif`;
                        ctx.fillStyle = '#bae6fd';
                        ctx.fillText('🎯 공을 보고 타이밍 맞추기', 0, -ringRadius - 8 * s);
                    }
                    ctx.restore();
                }
            }
        }

        ctx.restore();
    }

    /**
     * 3D 투수 렌더링 - 4대 투구폼(오버핸드/쓰리쿼터/사이드암/언더핸드 잠수함) 완벽 구현
     * @param {boolean} isFacingFront - 타자 시점일 때는 정면으로 던지는 모습을, 투수 시점일 때는 뒷모습을 그림
     */
    renderPitcher(ctx, isFacingFront) {
        const pit = this.pitcher;
        const pChar = this.getCurrentPitcher();
        const pSkin = this.getCurrentPitcherSkin();
        const pStyle = pChar.pitchStyle || 'overhand';

        // 마운드 위치 (0, 14, 80)
        const pp = this.project(pit.x, pit.y, pit.z);
        const s = pp.scale;
        const h = 95 * s;
        const w = 44 * s;

        ctx.save();
        ctx.translate(pp.x, pp.y);

        // [1] 투수 마운드 흙 언덕 (고화질 3D 마운드)
        const moundGrad = ctx.createRadialGradient(0, 4 * s, 6 * s, 0, 6 * s, 48 * s);
        moundGrad.addColorStop(0, '#b45309');
        moundGrad.addColorStop(0.65, '#92400e');
        moundGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = moundGrad;
        ctx.beginPath();
        ctx.ellipse(0, 6 * s, 48 * s, 17 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // [2] 투수판 (Rubber Plate)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-13 * s, 0, 26 * s, 4.5 * s);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1 * s;
        ctx.strokeRect(-13 * s, 0, 26 * s, 4.5 * s);

        // 지면 스파이크 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 6 * s, 24 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // [3] 4대 투구폼별 생체역학 키네마틱스 (Biomechanics Kinematics)
        let legKickY = 0;
        let legKickX = 0;
        let torsoAngle = 0;
        let torsoOffsetY = 0;

        let armShoulderX = w * 0.32;
        let armShoulderY = -h * 0.76;
        let gloveShoulderX = -w * 0.32;
        let gloveShoulderY = -h * 0.76;

        let elbowX = armShoulderX + 12 * s;
        let elbowY = armShoulderY - 10 * s;
        let wristX = elbowX + 10 * s;
        let wristY = elbowY - 14 * s;
        let isHoldingBall = true;

        let gElbowX = gloveShoulderX - 10 * s;
        let gElbowY = gloveShoulderY + 12 * s;
        let gWristX = gloveShoulderX - 4 * s;
        let gWristY = gloveShoulderY + 15 * s;
        let gloveAngle = 0.2;

        if (pit.phase === 'ready' || pit.phase === 'aiming') {
            const sway = Math.sin(pit.phaseTimer * 2.8) * 1.5 * s;
            torsoOffsetY = sway * 0.5;
            // 셋포지션: 두 손을 가슴 앞에 모으고 글러브 속에 야구공을 숨김
            gElbowX = gloveShoulderX + 8 * s;
            gElbowY = gloveShoulderY + 14 * s;
            gWristX = -2 * s;
            gWristY = -h * 0.68 + sway;
            gloveAngle = -0.15;

            elbowX = armShoulderX - 6 * s;
            elbowY = armShoulderY + 14 * s;
            wristX = 2 * s;
            wristY = -h * 0.68 + sway;
            isHoldingBall = true;
        } else if (pit.phase === 'windup') {
            const windupProg = Math.min(1.0, pit.phaseTimer / 0.72);
            if (windupProg < 0.40) {
                // 1단계: 하이 레그 킥 & 와인드업 밸런스 포인트
                const p1 = windupProg / 0.40;
                const kickEase = Math.sin(p1 * Math.PI * 0.5);

                if (pStyle === 'overhand') {
                    legKickY = -h * 0.48 * kickEase;
                    legKickX = -w * 0.08 * kickEase;
                } else if (pStyle === 'threequarter') {
                    legKickY = -h * 0.40 * kickEase;
                    legKickX = -w * 0.05 * kickEase;
                } else if (pStyle === 'sidearm') {
                    legKickY = -h * 0.34 * kickEase;
                    legKickX = w * 0.04 * kickEase;
                } else if (pStyle === 'submarine') {
                    legKickY = -h * 0.26 * kickEase;
                    torsoOffsetY = h * 0.12 * kickEase; // 잠수함 깊은 웅크리기 준비
                    torsoAngle = 0.22 * kickEase;
                }

                gWristX = -w * 0.05;
                gWristY = -h * 0.72 - 6 * s * kickEase;
                wristX = w * 0.05;
                wristY = -h * 0.72 - 6 * s * kickEase;
                gElbowX = gloveShoulderX + 6 * s;
                gElbowY = gloveShoulderY + 12 * s;
                elbowX = armShoulderX - 6 * s;
                elbowY = armShoulderY + 12 * s;
                isHoldingBall = true;
            } else if (windupProg < 0.76) {
                // 2단계: 스트라이드(앞발 내딛기) & 견갑골 장전 (Arm Cocking & Scapular Loading)
                const p2 = (windupProg - 0.40) / 0.36;

                legKickY = -h * 0.48 * (1 - p2 * 0.82);
                legKickX = -w * 0.38 * p2;

                gElbowX = gloveShoulderX - 16 * s * p2;
                gElbowY = gloveShoulderY - 2 * s * p2;
                gWristX = gElbowX - 14 * s * p2;
                gWristY = gElbowY - 4 * s * p2;
                gloveAngle = -0.5 * p2;

                if (pStyle === 'overhand') {
                    torsoAngle = -0.06 * p2;
                    torsoOffsetY = h * 0.03 * p2;
                    elbowX = armShoulderX + 8 * s * p2;
                    elbowY = armShoulderY - 14 * s * p2;
                    wristX = elbowX - 4 * s;
                    wristY = elbowY - 22 * s * p2; // 머리 뒤 고공 12시 코킹
                } else if (pStyle === 'threequarter') {
                    torsoAngle = 0.18 * p2;
                    torsoOffsetY = h * 0.05 * p2;
                    elbowX = armShoulderX + 16 * s * p2;
                    elbowY = armShoulderY - 6 * s * p2;
                    wristX = elbowX + 14 * s * p2;
                    wristY = elbowY - 16 * s * p2; // 대각선 1시반 코킹
                } else if (pStyle === 'sidearm') {
                    torsoAngle = 0.48 * p2; // 1루 쪽으로 상체 28도 기울임
                    torsoOffsetY = h * 0.08 * p2;
                    elbowX = armShoulderX + 24 * s * p2;
                    elbowY = armShoulderY + 6 * s * p2;
                    wristX = elbowX + 22 * s * p2;
                    wristY = elbowY - 2 * s * p2; // 옆구리 수평 3시 코킹
                } else if (pStyle === 'submarine') {
                    torsoAngle = 0.95 * p2; // 마운드 흙으로 상체 55도 깊숙이 다운!
                    torsoOffsetY = h * 0.28 * p2; // 엉덩이 깊은 기마자세
                    elbowX = armShoulderX + 18 * s * p2;
                    elbowY = armShoulderY + 28 * s * p2;
                    wristX = elbowX + 14 * s * p2;
                    wristY = elbowY + 24 * s * p2; // 지면 흙을 스칠 듯한 5시반 로우 코킹
                }
                isHoldingBall = true;
            } else {
                // 3단계: 폭발적 체간 회전 & 팔 채찍 가속 (Arm Whip & Release Slot Snap)
                const p3 = (windupProg - 0.76) / 0.24;
                const snap = Math.pow(p3, 2.2);

                gElbowX = gloveShoulderX - 4 * s;
                gElbowY = gloveShoulderY + 14 * s;
                gWristX = gloveShoulderX + 8 * s;
                gWristY = gloveShoulderY + 16 * s;
                gloveAngle = 0.4;

                if (pStyle === 'overhand') {
                    torsoAngle = 0.08 * snap;
                    elbowX = armShoulderX + (4 * s - armShoulderX) * snap;
                    elbowY = -h * 1.05 * snap + (armShoulderY) * (1 - snap);
                    wristX = elbowX + 3 * s;
                    wristY = -h * 1.38 * snap + (-h * 0.9) * (1 - snap); // 수직 12시 릴리즈!
                } else if (pStyle === 'threequarter') {
                    torsoAngle = 0.24 * snap;
                    elbowX = armShoulderX + 14 * s;
                    elbowY = armShoulderY - 8 * s;
                    wristX = armShoulderX + 22 * s * snap;
                    wristY = -h * 1.12 * snap + (-h * 0.8) * (1 - snap); // 대각선 채찍 릴리즈!
                } else if (pStyle === 'sidearm') {
                    torsoAngle = 0.52;
                    elbowX = armShoulderX + 28 * s;
                    elbowY = armShoulderY + 6 * s;
                    wristX = armShoulderX + 44 * s * snap;
                    wristY = -h * 0.68 * snap + (-h * 0.6) * (1 - snap); // 횡방향 사이드암 와이프아웃 릴리즈!
                } else if (pStyle === 'submarine') {
                    torsoAngle = 0.98;
                    torsoOffsetY = h * 0.30;
                    elbowX = armShoulderX + 24 * s;
                    elbowY = armShoulderY + 32 * s;
                    wristX = armShoulderX + 30 * s;
                    wristY = -h * 0.20 + 6 * s * (1 - snap); // 지면 10cm 높이에서 솟구치는 업슛 릴리즈!
                }
                isHoldingBall = (windupProg < 0.96);
            }
        } else {
            // 4. 팔로스루 (Follow-Through & Pitch Completion)
            gElbowX = gloveShoulderX - 4 * s;
            gElbowY = gloveShoulderY + 14 * s;
            gWristX = gloveShoulderX + 8 * s;
            gWristY = gloveShoulderY + 16 * s;
            gloveAngle = 0.45;

            if (pStyle === 'overhand') {
                torsoAngle = 0.35;
                torsoOffsetY = h * 0.08;
                elbowX = -w * 0.12;
                elbowY = -h * 0.55;
                wristX = -w * 0.25;
                wristY = -h * 0.32; // 왼쪽 무릎 바깥으로 완전히 내려치는 오버핸드 피니시
                legKickY = -h * 0.30;
                legKickX = w * 0.32; // 뒷다리 번쩍 들림
            } else if (pStyle === 'threequarter') {
                torsoAngle = 0.38;
                elbowX = -w * 0.05;
                elbowY = -h * 0.62;
                wristX = -w * 0.20;
                wristY = -h * 0.46; // 왼쪽 허리 쪽으로 대각선 감아쥐기
            } else if (pStyle === 'sidearm') {
                torsoAngle = 0.55;
                elbowX = -w * 0.10;
                elbowY = -h * 0.65;
                wristX = -w * 0.32;
                wristY = -h * 0.60; // 몸 앞을 넓게 가로지르는 수평 와이드 피니시
            } else if (pStyle === 'submarine') {
                torsoAngle = 0.85;
                torsoOffsetY = h * 0.24;
                elbowX = w * 0.15;
                elbowY = -h * 0.45;
                wristX = w * 0.08;
                wristY = -h * 0.62; // 아래에서 위로 퍼올린 후 가슴 앞 정지
            }
            isHoldingBall = false;
        }

        // [4] 하체 다리 렌더링 (원기둥 3D 유니폼 팬츠 & 스파이크)
        // 오른다리 (축 다리)
        const pLegGradR = ctx.createLinearGradient(w * 0.05, 0, w * 0.41, 0);
        pLegGradR.addColorStop(0, '#f1f5f9');
        pLegGradR.addColorStop(0.35, '#ffffff');
        pLegGradR.addColorStop(1, '#475569');
        ctx.fillStyle = pLegGradR;
        ctx.beginPath();
        const rLegTopY = -h * 0.42 + torsoOffsetY;
        ctx.roundRect(w * 0.05, rLegTopY, w * 0.36, -rLegTopY, 4 * s);
        ctx.fill();
        ctx.fillStyle = pSkin.jersey;
        ctx.fillRect(w * 0.05, rLegTopY * 0.5, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w * 0.02, -h * 0.06, w * 0.42, h * 0.06);

        // 왼다리 (스트라이드/킥 다리)
        const pLegGradL = ctx.createLinearGradient(-w * 0.45 + legKickX, 0, -w * 0.09 + legKickX, 0);
        pLegGradL.addColorStop(0, '#cbd5e1');
        pLegGradL.addColorStop(0.3, '#ffffff');
        pLegGradL.addColorStop(1, '#64748b');
        ctx.fillStyle = pLegGradL;
        ctx.beginPath();
        const lLegTopY = -h * 0.42 + torsoOffsetY;
        const lLegBotY = legKickY;
        ctx.roundRect(-w * 0.45 + legKickX, lLegTopY, w * 0.36, lLegBotY - lLegTopY, 4 * s);
        ctx.fill();
        ctx.fillStyle = pSkin.jersey;
        ctx.fillRect(-w * 0.45 + legKickX, lLegTopY + (lLegBotY - lLegTopY) * 0.5, w * 0.36, h * 0.1);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.48 + legKickX, lLegBotY - h * 0.06, w * 0.42, h * 0.06);

        // [5] 상체 유니폼 (체간 회전 & 3D 볼륨)
        ctx.save();
        ctx.translate(0, -h * 0.42 + torsoOffsetY);
        ctx.rotate(torsoAngle);

        // 유니폼 저지
        const pJerseyGrad = ctx.createLinearGradient(-w * 0.48, 0, w * 0.48, 0);
        pJerseyGrad.addColorStop(0, pSkin.jersey);
        pJerseyGrad.addColorStop(0.3, '#ffffff');
        pJerseyGrad.addColorStop(0.65, pSkin.jersey);
        pJerseyGrad.addColorStop(1, '#020617');
        ctx.fillStyle = pJerseyGrad;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.40, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8 * s;
        ctx.stroke();

        // 저지 단추선 & 팀 로고 엠블럼
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.40);
        ctx.lineTo(0, 4 * s);
        ctx.stroke();

        // [6] 리얼 3D 가죽 글러브 팔 (Glove Arm)
        this.drawArticulatedGloveArm(
            ctx, s, pSkin,
            gloveShoulderX, gloveShoulderY - (-h * 0.42 + torsoOffsetY),
            gElbowX, gElbowY - (-h * 0.42 + torsoOffsetY),
            gWristX, gWristY - (-h * 0.42 + torsoOffsetY),
            gloveAngle
        );

        // [7] 머리 & 3D 야구 모자 (투구 폼에 맞춰 시선 유지)
        const headRelY = -h * 0.52;
        ctx.save();
        ctx.translate(0, headRelY);
        // 몸이 기울어져도 시선은 홈플레이트를 응시하도록 반대 회전
        ctx.rotate(-torsoAngle * 0.65);

        if (pChar.id === 'tiger') this.drawTigerFace(ctx, s, !isFacingFront, pSkin);
        else if (pChar.id === 'frog') this.drawFrogFace(ctx, s, !isFacingFront, pSkin);
        else if (pChar.id === 'penguin') this.drawPenguinFace(ctx, s, !isFacingFront, pSkin);
        else this.drawMonkeyFace(ctx, s, !isFacingFront, pSkin);

        // 3D 야구 모자
        ctx.fillStyle = pSkin.cap;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 17 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        ctx.restore();

        // [8] 리얼 3D 다관절 투구 팔 (어깨 -> 상완 이두 -> 팔꿈치 -> 전완근 -> 아대 -> 5손가락 & 3D 실밥 야구공)
        this.drawArticulatedPitchingArm(
            ctx, s, pSkin, pChar,
            armShoulderX, armShoulderY - (-h * 0.42 + torsoOffsetY),
            elbowX, elbowY - (-h * 0.42 + torsoOffsetY),
            wristX, wristY - (-h * 0.42 + torsoOffsetY),
            isHoldingBall, pStyle
        );

        ctx.restore(); // 상체 rotate restore
        ctx.restore(); // 투수 pp.x, pp.y restore
    }

    /**
     * ⚾ 리얼 3D 다관절 투구 팔 (어깨 유니폼 슬리브 -> 상완 이두/삼두 원기둥 -> 팔꿈치 관절 -> 전완근 -> 손목 아대 -> 5손가락 & 3D 실밥 야구공)
     */
    drawArticulatedPitchingArm(ctx, s, pSkin, pChar, sx, sy, ex, ey, wx, wy, isHoldingBall, pStyle) {
        ctx.save();

        // 1. 상완 (어깨 -> 팔꿈치 원기둥 그라데이션)
        const d1x = ex - sx;
        const d1y = ey - sy;
        const len1 = Math.hypot(d1x, d1y) || 1;
        const ang1 = Math.atan2(d1y, d1x);
        const perp1x = -Math.sin(ang1);
        const perp1y = Math.cos(ang1);

        const armThick1 = 7.5 * s;
        const armGrad1 = ctx.createLinearGradient(
            sx + perp1x * armThick1, sy + perp1y * armThick1,
            sx - perp1x * armThick1, sy - perp1y * armThick1
        );
        armGrad1.addColorStop(0, '#f8fafc');
        armGrad1.addColorStop(0.35, '#ffffff');
        armGrad1.addColorStop(0.7, pSkin.jersey);
        armGrad1.addColorStop(1, '#0f172a');

        ctx.fillStyle = armGrad1;
        ctx.beginPath();
        ctx.moveTo(sx + perp1x * armThick1, sy + perp1y * armThick1);
        ctx.lineTo(ex + perp1x * (armThick1 * 0.85), ey + perp1y * (armThick1 * 0.85));
        ctx.lineTo(ex - perp1x * (armThick1 * 0.85), ey - perp1y * (armThick1 * 0.85));
        ctx.lineTo(sx - perp1x * armThick1, sy - perp1y * armThick1);
        ctx.closePath();
        ctx.fill();

        // 어깨 반소매 소매단 스트라이프
        ctx.strokeStyle = pSkin.stripe || '#f8fafc';
        ctx.lineWidth = 2.2 * s;
        ctx.beginPath();
        const midSx = sx + d1x * 0.45;
        const midSy = sy + d1y * 0.45;
        ctx.moveTo(midSx + perp1x * (armThick1 * 0.95), midSy + perp1y * (armThick1 * 0.95));
        ctx.lineTo(midSx - perp1x * (armThick1 * 0.95), midSy - perp1y * (armThick1 * 0.95));
        ctx.stroke();

        // 2. 팔꿈치 관절 캡 (Elbow Joint Hinge)
        const elbowGrad = ctx.createRadialGradient(ex - 1.5 * s, ey - 1.5 * s, 1 * s, ex, ey, 5.5 * s);
        elbowGrad.addColorStop(0, '#ffffff');
        elbowGrad.addColorStop(0.5, pSkin.jersey);
        elbowGrad.addColorStop(1, '#020617');
        ctx.fillStyle = elbowGrad;
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5 * s, 0, Math.PI * 2);
        ctx.fill();

        // 3. 전완근 (팔꿈치 -> 손목 테이퍼드 원기둥)
        const d2x = wx - ex;
        const d2y = wy - ey;
        const len2 = Math.hypot(d2x, d2y) || 1;
        const ang2 = Math.atan2(d2y, d2x);
        const perp2x = -Math.sin(ang2);
        const perp2y = Math.cos(ang2);

        const foreThickStart = 6.2 * s;
        const foreThickEnd = 4.6 * s;
        const foreGrad = ctx.createLinearGradient(
            ex + perp2x * foreThickStart, ey + perp2y * foreThickStart,
            ex - perp2x * foreThickStart, ey - perp2y * foreThickStart
        );
        foreGrad.addColorStop(0, '#fef08a');
        foreGrad.addColorStop(0.3, '#fde047');
        foreGrad.addColorStop(0.7, '#ca8a04');
        foreGrad.addColorStop(1, '#713f12');

        ctx.fillStyle = foreGrad;
        ctx.beginPath();
        ctx.moveTo(ex + perp2x * foreThickStart, ey + perp2y * foreThickStart);
        ctx.lineTo(wx + perp2x * foreThickEnd, wy + perp2y * foreThickEnd);
        ctx.lineTo(wx - perp2x * foreThickEnd, wy - perp2y * foreThickEnd);
        ctx.lineTo(ex - perp2x * foreThickStart, ey - perp2y * foreThickStart);
        ctx.closePath();
        ctx.fill();

        // 4. 팀 컬러 컴프레션 손목 아대 (Wristband)
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(ang2);
        ctx.fillStyle = pSkin.jersey;
        ctx.beginPath();
        ctx.roundRect(-4 * s, -foreThickEnd * 1.05, 5 * s, foreThickEnd * 2.1, 2 * s);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 * s;
        ctx.stroke();
        ctx.restore();

        // 5. 5손가락 입체 손 & 3D 야구공 (Seamed Baseball)
        const handDirX = Math.cos(ang2);
        const handDirY = Math.sin(ang2);
        const hx = wx + handDirX * 3.5 * s;
        const hy = wy + handDirY * 3.5 * s;

        if (isHoldingBall) {
            // 야구공 중심 좌표
            const bx = hx + handDirX * 6.5 * s;
            const by = hy + handDirY * 6.5 * s;
            const bRadius = 6.8 * s;

            // 3D 구체 라이팅 그라데이션
            const ballGrad = ctx.createRadialGradient(
                bx - bRadius * 0.35, by - bRadius * 0.35, bRadius * 0.15,
                bx, by, bRadius
            );
            ballGrad.addColorStop(0, '#ffffff');
            ballGrad.addColorStop(0.65, '#f1f5f9');
            ballGrad.addColorStop(0.9, '#cbd5e1');
            ballGrad.addColorStop(1, '#64748b');
            ctx.fillStyle = ballGrad;
            ctx.beginPath();
            ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 0.8 * s;
            ctx.stroke();

            // 빨간색 말발굽 실밥 2선 (Red Horseshoe Seams)
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1.3 * s;
            ctx.beginPath();
            ctx.arc(bx - bRadius * 0.25, by, bRadius * 0.72, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bx + bRadius * 0.25, by, bRadius * 0.72, Math.PI * 0.55, Math.PI * 1.45);
            ctx.stroke();

            // 3D 5손가락 그립 (검지, 중지가 공 위를 감싸쥐고 엄지가 아래를 받치는 그립)
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 0.8 * s;

            // 엄지손가락 (Thumb - 아래)
            ctx.beginPath();
            ctx.ellipse(bx - perp2x * 5 * s, by - perp2y * 5 * s, 3.8 * s, 2.2 * s, ang2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 검지 & 중지 손가락 (Index & Middle - 위쪽 실밥 누름)
            ctx.beginPath();
            ctx.ellipse(bx + perp2x * 3.8 * s - handDirX * 2 * s, by + perp2y * 3.8 * s - handDirY * 2 * s, 4.2 * s, 2.2 * s, ang2 + 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(bx + perp2x * 0.8 * s - handDirX * 2 * s, by + perp2y * 0.8 * s - handDirY * 2 * s, 4.4 * s, 2.2 * s, ang2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 약지 & 새끼 손가락 (공 측면 보조)
            ctx.beginPath();
            ctx.ellipse(bx - perp2x * 2.2 * s - handDirX * 3 * s, by - perp2y * 2.2 * s - handDirY * 3 * s, 3.5 * s, 1.8 * s, ang2 - 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // 릴리즈 직후 5손가락 스냅 (Fingertip Release Snap)
            ctx.fillStyle = '#fde047';
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 0.8 * s;

            // 손바닥
            ctx.beginPath();
            ctx.ellipse(hx, hy, 4.2 * s, 3.2 * s, ang2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 앞으로 쭉 뻗은 검지, 중지, 약지, 새끼
            const fAngles = [-0.35, -0.12, 0.12, 0.35];
            const fLens = [6.2 * s, 7.0 * s, 6.0 * s, 4.8 * s];
            for (let i = 0; i < 4; i++) {
                const fa = ang2 + fAngles[i];
                const fx = hx + Math.cos(fa) * fLens[i];
                const fy = hy + Math.sin(fa) * fLens[i];
                ctx.beginPath();
                ctx.moveTo(hx + perp2x * (i - 1.5) * 1.5 * s, hy + perp2y * (i - 1.5) * 1.5 * s);
                ctx.lineTo(fx, fy);
                ctx.lineWidth = 1.8 * s;
                ctx.strokeStyle = '#fde047';
                ctx.lineCap = 'round';
                ctx.stroke();
            }
            // 엄지
            ctx.beginPath();
            ctx.moveTo(hx - perp2x * 3 * s, hy - perp2y * 3 * s);
            ctx.lineTo(hx - perp2x * 5.5 * s + handDirX * 2 * s, hy - perp2y * 5.5 * s + handDirY * 2 * s);
            ctx.lineWidth = 2.2 * s;
            ctx.strokeStyle = '#fde047';
            ctx.lineCap = 'round';
            ctx.stroke();

            // 릴리즈 파티클 잔상
            ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
            ctx.beginPath();
            ctx.arc(hx + handDirX * 10 * s, hy + handDirY * 10 * s, 2.5 * s, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 🧤 리얼 3D 가죽 투수 글러브 & 팔 (천연 가죽 질감, 입체 포켓, 바스켓 웹, 글러브 가죽끈 매듭)
     */
    drawArticulatedGloveArm(ctx, s, pSkin, sx, sy, ex, ey, wx, wy, gloveAngle) {
        ctx.save();

        // 1. 글러브 팔 상완
        const d1x = ex - sx;
        const d1y = ey - sy;
        const ang1 = Math.atan2(d1y, d1x);
        const perp1x = -Math.sin(ang1);
        const perp1y = Math.cos(ang1);
        const armThick1 = 7.0 * s;

        const armGrad1 = ctx.createLinearGradient(
            sx + perp1x * armThick1, sy + perp1y * armThick1,
            sx - perp1x * armThick1, sy - perp1y * armThick1
        );
        armGrad1.addColorStop(0, '#f8fafc');
        armGrad1.addColorStop(0.35, pSkin.jersey);
        armGrad1.addColorStop(1, '#0f172a');
        ctx.fillStyle = armGrad1;
        ctx.beginPath();
        ctx.moveTo(sx + perp1x * armThick1, sy + perp1y * armThick1);
        ctx.lineTo(ex + perp1x * (armThick1 * 0.8), ey + perp1y * (armThick1 * 0.8));
        ctx.lineTo(ex - perp1x * (armThick1 * 0.8), ey - perp1y * (armThick1 * 0.8));
        ctx.lineTo(sx - perp1x * armThick1, sy - perp1y * armThick1);
        ctx.closePath();
        ctx.fill();

        // 2. 팔꿈치
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex, ey, 5.0 * s, 0, Math.PI * 2);
        ctx.fill();

        // 3. 전완
        const d2x = wx - ex;
        const d2y = wy - ey;
        const ang2 = Math.atan2(d2y, d2x);
        const perp2x = -Math.sin(ang2);
        const perp2y = Math.cos(ang2);
        const foreThickStart = 5.8 * s;
        const foreThickEnd = 4.4 * s;

        const foreGrad = ctx.createLinearGradient(
            ex + perp2x * foreThickStart, ey + perp2y * foreThickStart,
            ex - perp2x * foreThickStart, ey - perp2y * foreThickStart
        );
        foreGrad.addColorStop(0, '#fde047');
        foreGrad.addColorStop(0.5, '#ca8a04');
        foreGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = foreGrad;
        ctx.beginPath();
        ctx.moveTo(ex + perp2x * foreThickStart, ey + perp2y * foreThickStart);
        ctx.lineTo(wx + perp2x * foreThickEnd, wy + perp2y * foreThickEnd);
        ctx.lineTo(wx - perp2x * foreThickEnd, wy - perp2y * foreThickEnd);
        ctx.lineTo(ex - perp2x * foreThickStart, ey - perp2y * foreThickStart);
        ctx.closePath();
        ctx.fill();

        // 4. 3D 명품 천연 소가죽 투수 글러브 (Leather Pitcher's Glove)
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(gloveAngle);

        const gw = 18 * s;
        const gh = 22 * s;

        // 글러브 본체 (엄지 패드 + 4손가락 포켓)
        const leatherGrad = ctx.createRadialGradient(0, -gh * 0.2, 3 * s, 0, 0, gh * 0.8);
        leatherGrad.addColorStop(0, '#b45309'); // 하이라이트 새들 브라운
        leatherGrad.addColorStop(0.5, '#78350f'); // 깊은 가죽 톤
        leatherGrad.addColorStop(1, '#451a03'); // 테두리 섀도우
        ctx.fillStyle = leatherGrad;

        ctx.beginPath();
        ctx.ellipse(0, 0, gw * 0.55, gh * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 글러브 안쪽 포켓 깊이 음영
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(0, -gh * 0.08, gw * 0.34, gh * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2피스 솔리드 바스켓 가죽 웹 (Basket Weave Web)
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.moveTo(-gw * 0.3, -gh * 0.35);
        ctx.lineTo(gw * 0.3, -gh * 0.35);
        ctx.moveTo(-gw * 0.3, -gh * 0.15);
        ctx.lineTo(gw * 0.3, -gh * 0.15);
        ctx.moveTo(-gw * 0.12, -gh * 0.42);
        ctx.lineTo(-gw * 0.12, -gh * 0.05);
        ctx.moveTo(gw * 0.12, -gh * 0.42);
        ctx.lineTo(gw * 0.12, -gh * 0.05);
        ctx.stroke();

        // 글러브 외곽 가죽끈 스티치 (Rawhide Laces)
        ctx.fillStyle = '#fef08a';
        for (let a = 0; a < Math.PI * 2; a += 0.55) {
            const lx = Math.cos(a) * gw * 0.52;
            const ly = Math.sin(a) * gh * 0.48;
            ctx.fillRect(lx - 0.7 * s, ly - 0.7 * s, 1.4 * s, 1.4 * s);
        }

        // 손목 스트랩 엠블럼 패치 (Red KBO / Wilson Patch)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-gw * 0.28, gh * 0.32, gw * 0.56, 3.5 * s);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.6 * s;
        ctx.strokeRect(-gw * 0.28, gh * 0.32, gw * 0.56, 3.5 * s);

        ctx.restore();
        ctx.restore();
    }

    /**
     * 3D 자연스러운 타자 렌더링 & 유려한 3D MLB 다관절 스윙 (3D 배트 높이/스윙 플레인 & 투구 높이 추적 & 양팔 다관절)
     * @param {boolean} isCloseView - 타자 시점(MLB The Show)일 때는 바로 앞에서 역동적인 스윙을 보여줌
     */
    renderBatter(ctx, isCloseView) {
        const b = this.batter;
        const currLineup = this.getCurrentBatterLineup();
        const bChar = this.getCurrentBatter();
        const bSkin = this.getCurrentBatterSkin();

        const bp = this.project(b.x, b.y, b.z);
        const s = bp.scale;
        const h = 94 * s;
        const w = 40 * s;

        ctx.save();
        ctx.translate(bp.x, bp.y);

        // 타자석 분필 박스
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2 * s;
        ctx.strokeRect(-w * 0.7, -6 * s, w * 1.4, 30 * s);

        // 지면 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.beginPath();
        ctx.ellipse(0, 4 * s, w * 0.65, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // ⚾ 상대적 투구 높이 측정 (-1.0: 무릎 낮은 코스, 0.0: 벨트 가운데, +1.0: 가슴 높은 코스)
        const ballY = (this.ball && this.ball.active) ? this.ball.y : 44;
        const pitchHeightRel = Math.max(-1.0, Math.min(1.0, (ballY - 44) / 22));

        // 🏃‍♂️ 유려한 3D MLB 타격 메커니즘 (스탠스 웨글 -> 스트라이드 & 로딩 -> 힙 턴 & 배트 래그 -> 임팩트 익스텐션 -> 하이 팔로스루)
        const prog = b.swingProgress;
        let strideX = 0;
        let hipAngle = 0;
        let batAngle = 0;
        let weightShiftY = 0;
        let kneeBendY = 0;

        let knobX = w * 0.14;
        let knobY = -h * 0.72;
        let batElevation = 0.35; // 3D 높이 각도 (배트 헤드의 Z/Y 높낮이)

        if (b.isSwinging) {
            // 낮은 공일 때는 타자가 무릎을 굽히며 상체를 낮춰 낮은 코스 배트 플레인 형성!
            if (pitchHeightRel < 0) {
                kneeBendY = -pitchHeightRel * 6.5 * s;
            }

            if (prog < 0.22) {
                // 1. 스트라이드 & 코일링 (앞발 내딛기 & 중심 뒤로 모으기)
                const p = prog / 0.22;
                strideX = -12 * s * p;
                weightShiftY = 2 * s * p + kneeBendY * p;
                hipAngle = -0.18 * (1 - p * 0.5);
                knobX = w * 0.16 + 5 * s * p;
                knobY = -h * 0.74 - 4 * s * p + weightShiftY;
                batAngle = 0.86 + 0.14 * p; // 뒤로 젖혀지는 테이크백
                batElevation = 0.40;
            } else if (prog < 0.54) {
                // 2. 파워 언코일링 & 배트 래그 (골반 회전 폭발 & 그립이 볼 높이로 급강하!)
                const p = (prog - 0.22) / 0.32;
                strideX = -12 * s;
                weightShiftY = 2 * s + kneeBendY;
                hipAngle = -0.09 + p * 0.88; // 힙 턴 오픈
                // 그립이 투구 높이에 맞춰 3D 공간으로 전진
                knobX = (w * 0.21) - p * (w * 0.46);
                knobY = (-h * 0.78 + weightShiftY) + p * (h * 0.22 - pitchHeightRel * 10 * s);
                batAngle = 1.00 - p * 1.68;  // 배트 래그를 통한 벼락 스윙 (헤드가 뒤에 머뭄)
                batElevation = 0.30 - p * 0.35; // 수평 타격면으로 배트 레벨 진입
            } else if (prog < 0.74) {
                // 3. 임팩트 & 완전한 양팔 익스텐션 (Full Extension & Launch Attack Angle)
                const p = (prog - 0.54) / 0.20;
                strideX = -12 * s;
                weightShiftY = 2 * s + kneeBendY;
                hipAngle = 0.79;
                // 양팔이 앞으로 쭉 뻗어나가며 투구 높이에 정확히 배트 정렬
                knobX = -w * 0.25 - 12 * s * Math.sin(p * Math.PI);
                knobY = -h * 0.56 + weightShiftY - pitchHeightRel * 12 * s + (p * 5 * s);
                batAngle = -0.68 - p * 1.15;
                batElevation = -0.05 + pitchHeightRel * 0.25; // 투구 높이에 따른 3D 입체 타격 각도!
            } else {
                // 4. 어깨 위로 넘어가는 완성도 높은 MLB 하이 팔로스루
                const p = (prog - 0.74) / 0.26;
                strideX = -12 * s;
                weightShiftY = 2 * s;
                hipAngle = 0.79;
                knobX = -w * 0.25 + p * (w * 0.16);
                knobY = -h * 0.51 + weightShiftY - p * (h * 0.18);
                batAngle = -1.83 - p * 0.72; // 목 뒤로 완전히 감겨 올라가는 호쾌한 피니시
                batElevation = 0.45 * p;
            }
        } else if (b.isBunting) {
            // 🪵 [컴투스 프로야구 2026] 리얼 번트 스탠스: 몸을 투수 방향으로 돌리고 투구 높이에 배트 수평 정렬!
            const breathe = Math.sin(b.idleTimer * 4.0) * 0.8 * s;
            strideX = -8 * s;
            weightShiftY = 3 * s + breathe;
            hipAngle = 0.38;
            knobX = -w * 0.08;
            knobY = -h * 0.58 + weightShiftY - pitchHeightRel * 8 * s; // 공의 높이에 맞춰 배트 높이 완벽 조절!
            batAngle = -0.06;
            batElevation = 0;
        } else {
            // 대기 자세 (부드러운 배트 웨글 리듬과 체중 록킹)
            const idleCycle = b.idleTimer * 3.5;
            weightShiftY = Math.sin(idleCycle) * 1.2 * s;
            knobX = w * 0.14 + Math.sin(idleCycle) * 1.5 * s;
            knobY = -h * 0.72 + weightShiftY + Math.cos(idleCycle) * 1.5 * s;
            batAngle = 0.72 + Math.sin(idleCycle) * 0.10;
            batElevation = 0.35;
        }

        // 3D 입체 원기둥 음영 다리 & 유니폼 바지 (스탠스에 따른 스트라이드 이동)
        const leftLegGrad = ctx.createLinearGradient(-w * 0.46 + strideX, 0, -w * 0.08 + strideX, 0);
        leftLegGrad.addColorStop(0, '#cbd5e1');
        leftLegGrad.addColorStop(0.3, '#ffffff');
        leftLegGrad.addColorStop(0.8, '#f1f5f9');
        leftLegGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = leftLegGrad;
        ctx.beginPath();
        ctx.roundRect(-w * 0.46 + strideX, -h * 0.42 + weightShiftY, w * 0.38, h * 0.42 - weightShiftY, 4 * s);
        ctx.fill();

        const rightLegGrad = ctx.createLinearGradient(w * 0.06, 0, w * 0.44, 0);
        rightLegGrad.addColorStop(0, '#f1f5f9');
        rightLegGrad.addColorStop(0.4, '#ffffff');
        rightLegGrad.addColorStop(1, '#475569');
        ctx.fillStyle = rightLegGrad;
        ctx.beginPath();
        ctx.roundRect(w * 0.06, -h * 0.42 + weightShiftY, w * 0.38, h * 0.42 - weightShiftY, 4 * s);
        ctx.fill();

        // 유니폼 파이핑 라인 (측면 스트라이프)
        ctx.fillStyle = bSkin.jersey;
        ctx.fillRect(-w * 0.46 + strideX, -h * 0.42 + weightShiftY, 2.5 * s, h * 0.36);
        ctx.fillRect(w * 0.40, -h * 0.42 + weightShiftY, 2.5 * s, h * 0.36);

        // 양말 & 스파이크화
        ctx.fillStyle = bSkin.cap;
        ctx.fillRect(-w * 0.46 + strideX, -h * 0.18, w * 0.38, h * 0.12);
        ctx.fillRect(w * 0.06, -h * 0.18, w * 0.38, h * 0.12);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-w * 0.49 + strideX, -h * 0.06, w * 0.44, h * 0.06);
        ctx.fillRect(w * 0.03, -h * 0.06, w * 0.44, h * 0.06);

        // 상체 저지 (3D 볼륨 회전체 렌더링)
        ctx.save();
        ctx.translate(strideX * 0.3, weightShiftY);
        ctx.rotate(hipAngle);

        const jerseyGrad = ctx.createLinearGradient(-w * 0.48, 0, w * 0.48, 0);
        jerseyGrad.addColorStop(0, bSkin.jersey);
        jerseyGrad.addColorStop(0.25, '#ffffff'); // 입체 하이라이트 림
        jerseyGrad.addColorStop(0.55, bSkin.jersey);
        jerseyGrad.addColorStop(1, '#0f172a'); // 깊은 3D 앰비언트 오클루전
        ctx.fillStyle = jerseyGrad;
        ctx.beginPath();
        ctx.roundRect(-w * 0.48, -h * 0.82, w * 0.96, h * 0.44, 8 * s);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2 * s;
        ctx.stroke();

        // 🏏 유니폼 타순 번호 & 선수 이름
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * s)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(currLineup.name, 0, -h * 0.66);
        ctx.font = `900 ${Math.round(18 * s)}px sans-serif`;
        ctx.fillText(`${currLineup.order}`, 0, -h * 0.46);
        ctx.restore();

        // 머리 & 타자 헬멧
        const headY = -h * 0.94 + weightShiftY;
        ctx.save();
        ctx.translate(strideX * 0.2, headY);

        if (bChar.id === 'tiger') this.drawTigerFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'frog') this.drawFrogFace(ctx, s, isCloseView, bSkin);
        else if (bChar.id === 'penguin') this.drawPenguinFace(ctx, s, isCloseView, bSkin);
        else this.drawMonkeyFace(ctx, s, isCloseView, bSkin);

        // 타자 헬멧 (3D 볼륨 반구체 & 광택 반사광)
        const helmetGrad = ctx.createRadialGradient(-4 * s, -12 * s, 2 * s, 0, -6 * s, 18 * s);
        helmetGrad.addColorStop(0, '#ffffff'); // 태양광/조명탑 스펙큘러 하이라이트
        helmetGrad.addColorStop(0.3, bSkin.cap);
        helmetGrad.addColorStop(0.85, bSkin.cap);
        helmetGrad.addColorStop(1, '#020617'); // 하단 깊은 3D 그림자
        ctx.fillStyle = helmetGrad;
        ctx.beginPath();
        ctx.arc(0, -6 * s, 17 * s, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();

        // 헬멧 챙 & 귀 보호 플랩
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-18 * s, -7 * s, 14 * s, 16 * s, 4 * s);
        ctx.fill();
        ctx.restore();

        // 🦾 리얼 3D 타자 양팔 (앞팔 & 뒷팔 다관절) & 3D 메이플 원목 배트
        const batLen = 68 * s;
        const shLX = -w * 0.35 + strideX * 0.3;
        const shLY = -h * 0.74 + weightShiftY;
        const shRX = w * 0.24 + strideX * 0.3;
        const shRY = -h * 0.74 + weightShiftY;

        this.drawBatterArmsAndBat(
            ctx, s, bSkin, b,
            shLX, shLY, shRX, shRY,
            knobX, knobY, batAngle, batElevation, batLen,
            pitchHeightRel
        );

        ctx.restore();
    }

    /**
     * 🏏 리얼 3D 타자 양팔(리드암·트레일암) 및 3D 입체 원목 배트 렌더링
     */
    drawBatterArmsAndBat(ctx, s, bSkin, b, shLX, shLY, shRX, shRY, knobX, knobY, batAngle, batElevation, batLen, pitchHeightRel) {
        ctx.save();

        // 1. 배트 팁(끝단) 위치 계산
        const tipX = knobX + Math.sin(batAngle) * batLen;
        const tipY = knobY - Math.cos(batAngle) * batLen - batElevation * 18 * s;

        // 2. 스윙 잔상 네온 리본 (Swinging Ribbon Trail)
        if (b.isSwinging) {
            const trailGrad = ctx.createLinearGradient(knobX, knobY, tipX, tipY);
            trailGrad.addColorStop(0, 'rgba(250, 204, 21, 0.15)');
            trailGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
            trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
            ctx.fillStyle = trailGrad;
            ctx.beginPath();
            ctx.moveTo(knobX, knobY);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(tipX - Math.cos(batAngle) * 16 * s, tipY - Math.sin(batAngle) * 16 * s);
            ctx.lineTo(knobX - Math.cos(batAngle) * 6 * s, knobY - Math.sin(batAngle) * 6 * s);
            ctx.closePath();
            ctx.fill();
        }

        // 3. 뒷팔 (오른팔 / Trail Arm) 렌더링
        const elbRX = (shRX + knobX) * 0.5 + 8 * s;
        const elbRY = (shRY + knobY) * 0.5 + 4 * s;

        // 상완
        ctx.strokeStyle = bSkin.jersey;
        ctx.lineWidth = 6.8 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shRX, shRY);
        ctx.lineTo(elbRX, elbRY);
        ctx.stroke();

        // 전완근 & 손목
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 5.2 * s;
        ctx.beginPath();
        ctx.moveTo(elbRX, elbRY);
        ctx.lineTo(knobX + 3 * s, knobY + 2 * s);
        ctx.stroke();

        // 4. 앞팔 (왼팔 / Lead Arm) 렌더링
        const elbLX = (shLX + knobX) * 0.5 - 6 * s;
        const elbLY = (shLY + knobY) * 0.5 + 2 * s;

        // 상완
        ctx.strokeStyle = bSkin.jersey;
        ctx.lineWidth = 6.8 * s;
        ctx.beginPath();
        ctx.moveTo(shLX, shLY);
        ctx.lineTo(elbLX, elbLY);
        ctx.stroke();

        // 전완근
        ctx.strokeStyle = '#fed7aa';
        ctx.lineWidth = 5.2 * s;
        ctx.beginPath();
        ctx.moveTo(elbLX, elbLY);
        ctx.lineTo(knobX, knobY);
        ctx.stroke();

        // 5. 3D 메이플 원목 배트 본체 (Knob -> Handle Grip -> Taper -> 3D Barrel -> Cupped End)
        ctx.save();
        ctx.translate(knobX, knobY);
        ctx.rotate(batAngle);

        // (1) 배트 노브 (Knob 금빛 메탈 링)
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.5 * s, 3.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // (2) 그립 테이프 (Handle Grip Tape)
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(-2.8 * s, -14 * s, 5.6 * s, 14 * s, 1.5 * s);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8 * s;
        ctx.stroke();

        // (3) 프로 타격 장갑 2개 (양손 그립)
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1 * s;
        // 밑손 (왼손)
        ctx.beginPath();
        ctx.ellipse(0, -4 * s, 4.8 * s, 3.8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 윗손 (오른손)
        ctx.beginPath();
        ctx.ellipse(0, -9 * s, 5.0 * s, 4.0 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 번트 시 앞손은 배럴 위를 지탱!
        if (b.isBunting) {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(0, -batLen * 0.45, 5.5 * s, 4.8 * s, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // (4) 테이퍼 & 3D 원목 배럴 (Taper & Maple Barrel)
        const barrelGrad = ctx.createLinearGradient(-6 * s, 0, 6 * s, 0);
        barrelGrad.addColorStop(0, '#d97706'); // 원목 섀도우
        barrelGrad.addColorStop(0.25, '#fde047'); // 3D 광택 하이라이트 림
        barrelGrad.addColorStop(0.65, '#f59e0b'); // 메이플 골든 우드
        barrelGrad.addColorStop(1, '#78350f'); // 하단 앰비언트 오클루전

        ctx.fillStyle = barrelGrad;
        ctx.beginPath();
        // 테이퍼: -14s에서 -24s까지 두께 확장
        ctx.moveTo(-2.8 * s, -14 * s);
        ctx.lineTo(-5.5 * s, -26 * s);
        // 배럴: -26s에서 -batLen까지 굵은 타구부
        ctx.lineTo(-5.5 * s, -batLen);
        ctx.lineTo(5.5 * s, -batLen);
        ctx.lineTo(5.5 * s, -26 * s);
        ctx.lineTo(2.8 * s, -14 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 0.8 * s;
        ctx.stroke();

        // (5) 배럴 중심 KBO 골든 포일 엠블럼 로고
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-2 * s, -batLen * 0.62, 4 * s, 7 * s);

        // (6) 배트 끝 컵 (Cupped End Cap)
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.ellipse(0, -batLen, 5.5 * s, 2.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.restore();
    }

    renderCatcherAndUmpire(ctx) {
        const cp = this.project(this.catcher.x, this.catcher.y, this.catcher.z);
        const cs = cp.scale;
        const ch = 52 * cs;
        const cw = 36 * cs;

        ctx.fillStyle = '#334155';
        ctx.fillRect(cp.x - cw / 2, cp.y - ch * 0.75, cw, ch * 0.65);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cp.x - cw * 0.35, cp.y - ch * 0.65, cw * 0.7, ch * 0.45);

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y - ch * 0.88, 12 * cs, 0, Math.PI * 2);
        ctx.fill();

        const mittOffsetX = (this.pitchAimX * 0.35) * cs;
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(cp.x + mittOffsetX, cp.y - ch * 0.52, 10 * cs, 12 * cs, 0.15, 0, Math.PI * 2);
        ctx.fill();

        const up = this.project(this.umpire.x, this.umpire.y, this.umpire.z);
        const us = up.scale;
        const uh = 66 * us;
        const uw = 32 * us;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(up.x - uw / 2, up.y - uh * 0.85, uw, uh * 0.8);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(up.x, up.y - uh * 0.98, 10 * us, 0, Math.PI * 2);
        ctx.fill();
    }

    // ⚾ [컴투스 프로야구 2026] 리얼 3D 실사 프로야구 선수 페이스 & 헬멧/캡 시스템
    // - 만화/스누피 스타일을 완전 탈피하여, KBO/MLB 상용급 3D 인물 모델링 구현
    // - 입체 3D 턱선 및 귀, 뺨의 듀얼 아이블랙(Eye-black), 결의에 찬 프로 선수의 눈매
    // - 타자용 메탈릭 광택 하이라이트 헬멧(이어가드 포함) 및 투수/수비수용 3D 자수 캡
    // - 목덜미 스포츠 게르마늄/티타늄 꼰 목걸이
    drawCom2usProAthleteFace(ctx, s, isFront, skin, athleteType, isBatter = false) {
        ctx.save();

        const capColor = (skin && skin.cap) ? skin.cap : '#1e3a8a';
        const jerseyColor = (skin && skin.jersey) ? skin.jersey : '#3b82f6';

        // 1. 목덜미 & 3D 티타늄 스포츠 목걸이
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.roundRect(-7 * s, 8 * s, 14 * s, 8 * s, 2 * s);
        ctx.fill();

        // 티타늄 꼰 스포츠 목걸이 (실버 & 팀 컬러 트위스트)
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.arc(0, 7.5 * s, 8.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.strokeStyle = jerseyColor;
        ctx.lineWidth = 1.0 * s;
        ctx.beginPath();
        ctx.arc(0, 7.5 * s, 8.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();

        if (isFront) {
            // [정면/측면 3D 프로 선수 페이스]
            // 귀 (좌/우 3D 귀 바깥 & 귓바퀴 음영)
            [-16 * s, 16 * s].forEach((ex, idx) => {
                const earGrad = ctx.createRadialGradient(ex, -1 * s, 1 * s, ex, -1 * s, 6 * s);
                earGrad.addColorStop(0, '#fcd34d');
                earGrad.addColorStop(0.7, '#d97706');
                earGrad.addColorStop(1, '#92400e');
                ctx.fillStyle = earGrad;
                ctx.beginPath();
                ctx.ellipse(ex, -1 * s, 4 * s, 6.5 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 1 * s;
                ctx.stroke();
            });

            // 3D 입체 두상 & 각진 프로 턱선
            const faceGrad = ctx.createRadialGradient(0, -3 * s, 4 * s, 0, 1 * s, 20 * s);
            faceGrad.addColorStop(0, '#fed7aa'); // 밝은 이마/콧등 하이라이트
            faceGrad.addColorStop(0.45, '#fb923c'); // 건강한 태닝 스킨톤
            faceGrad.addColorStop(0.85, '#d97706'); // 광대뼈 & 턱선 3D 볼륨
            faceGrad.addColorStop(1, '#78350f');    // 깊은 앰비언트 오클루전 그림자

            ctx.fillStyle = faceGrad;
            ctx.beginPath();
            ctx.moveTo(-15 * s, -10 * s);
            ctx.lineTo(15 * s, -10 * s);
            ctx.lineTo(15 * s, 2 * s);
            ctx.quadraticCurveTo(14 * s, 12 * s, 0, 15 * s); // 각진 다부진 턱
            ctx.quadraticCurveTo(-14 * s, 12 * s, -15 * s, 2 * s);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(67, 20, 7, 0.65)';
            ctx.lineWidth = 1.2 * s;
            ctx.stroke();

            // ⚡ [컴투스 프로야구 시그니처] 눈 밑 듀얼 무광 아이블랙 (Eye-black) 패치!
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            // 왼쪽 눈 밑 아이블랙
            ctx.roundRect(-13.5 * s, -0.5 * s, 8.5 * s, 3.2 * s, 1.2 * s);
            // 오른쪽 눈 밑 아이블랙
            ctx.roundRect(5 * s, -0.5 * s, 8.5 * s, 3.2 * s, 1.2 * s);
            ctx.fill();

            // 날렵하고 짙은 프로야구 선수 눈썹 (양쪽)
            ctx.strokeStyle = '#1e1b4b';
            ctx.lineWidth = 2.4 * s;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-13 * s, -7.5 * s); ctx.lineTo(-4.5 * s, -6 * s);
            ctx.moveTo(13 * s, -7.5 * s); ctx.lineTo(4.5 * s, -6 * s);
            ctx.stroke();

            // 승부욕 넘치는 프로의 눈빛 (흰자 + 갈색 홍채 + 동공 + 스펙큘러 하이라이트)
            [-9 * s, 9 * s].forEach((ex, i) => {
                ctx.fillStyle = '#f8fafc';
                ctx.beginPath();
                ctx.ellipse(ex, -3.8 * s, 4.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
                ctx.fill();

                // 짙은 브라운 홍채
                ctx.fillStyle = '#3b1d08';
                ctx.beginPath();
                ctx.arc(ex + (i === 0 ? 0.5 * s : -0.5 * s), -3.8 * s, 2.2 * s, 0, Math.PI * 2);
                ctx.fill();

                // 중심 동공
                ctx.fillStyle = '#020617';
                ctx.beginPath();
                ctx.arc(ex + (i === 0 ? 0.5 * s : -0.5 * s), -3.8 * s, 1.2 * s, 0, Math.PI * 2);
                ctx.fill();

                // 하이라이트 빛 반사점
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex + (i === 0 ? 1.0 * s : -0.2 * s), -4.6 * s, 0.9 * s, 0, Math.PI * 2);
                ctx.fill();
            });

            // 오똑한 콧날 & 콧망울 3D 음영
            ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
            ctx.beginPath();
            ctx.moveTo(-1 * s, -5 * s);
            ctx.lineTo(1 * s, -5 * s);
            ctx.lineTo(2.2 * s, 3.2 * s);
            ctx.lineTo(-2.2 * s, 3.2 * s);
            ctx.closePath();
            ctx.fill();

            // 단호하게 다문 입술
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1.8 * s;
            ctx.beginPath();
            ctx.moveTo(-4.5 * s, 8.5 * s);
            ctx.lineTo(4.5 * s, 8.5 * s);
            ctx.stroke();

        } else {
            // [후면 뒷모습 3D] 다부진 목덜미와 머리카락 라인
            const backHeadGrad = ctx.createRadialGradient(0, -2 * s, 3 * s, 0, 0, 18 * s);
            backHeadGrad.addColorStop(0, '#f97316');
            backHeadGrad.addColorStop(0.7, '#d97706');
            backHeadGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = backHeadGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 16.5 * s, 0, Math.PI * 2);
            ctx.fill();

            // 짧고 단정한 스포츠 헤어라인
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.roundRect(-14 * s, 2 * s, 28 * s, 7 * s, [0, 0, 6 * s, 6 * s]);
            ctx.fill();
        }

        ctx.restore();
    }

    drawTigerFace(ctx, s, isFront, skin) {
        this.drawCom2usProAthleteFace(ctx, s, isFront, skin, 'tiger');
    }

    drawFrogFace(ctx, s, isFront, skin) {
        this.drawCom2usProAthleteFace(ctx, s, isFront, skin, 'frog');
    }

    drawPenguinFace(ctx, s, isFront, skin) {
        this.drawCom2usProAthleteFace(ctx, s, isFront, skin, 'penguin');
    }

    drawMonkeyFace(ctx, s, isFront, skin) {
        this.drawCom2usProAthleteFace(ctx, s, isFront, skin, 'monkey');
    }

    renderBall(ctx) {
        const b = this.ball;
        const p = this.project(b.x, b.y, b.z);
        if (!p) return;
        const r = Math.max(5, b.radius * p.scale);

        // [0] 🌟 3D Statcast 궤적 리본 트레이서 (Pitch Trajectory Ribbon)
        if (b.trail && b.trail.length > 1) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // [Layer 1] 🌟 외곽 네온 글로우 리본 (Wide Neon Glow Ribbon)
            for (let i = 0; i < b.trail.length - 1; i++) {
                const pt1 = this.project(b.trail[i].x, b.trail[i].y, b.trail[i].z);
                const pt2 = this.project(b.trail[i + 1].x, b.trail[i + 1].y, b.trail[i + 1].z);
                if (!pt1 || !pt2) continue;
                const prog = (i / b.trail.length);
                const alpha = Math.min(0.9, 0.2 + prog * 0.8);
                ctx.strokeStyle = b.trail[i].color || '#38bdf8';
                ctx.globalAlpha = alpha * 0.70;
                ctx.lineWidth = Math.max(3.0, 11.0 * pt1.scale * (0.35 + 0.65 * prog));
                ctx.shadowColor = b.trail[i].color || '#38bdf8';
                ctx.shadowBlur = 14 * pt1.scale;
                ctx.beginPath();
                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();
            }

            // [Layer 2] ⚡ 내부 코어 레이저 리본 (Intense White Laser Core)
            ctx.shadowBlur = 0;
            for (let i = 0; i < b.trail.length - 1; i++) {
                const pt1 = this.project(b.trail[i].x, b.trail[i].y, b.trail[i].z);
                const pt2 = this.project(b.trail[i + 1].x, b.trail[i + 1].y, b.trail[i + 1].z);
                if (!pt1 || !pt2) continue;
                const prog = (i / b.trail.length);
                ctx.strokeStyle = '#ffffff';
                ctx.globalAlpha = Math.min(0.95, 0.3 + prog * 0.7);
                ctx.lineWidth = Math.max(1.5, 3.6 * pt1.scale * (0.35 + 0.65 * prog));
                ctx.beginPath();
                ctx.moveTo(pt1.x, pt1.y);
                ctx.lineTo(pt2.x, pt2.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // [1] 3D 지면 그림자 (공의 높이에 따라 자연스럽게 번지고 축소되는 동적 그림자)
        const shadowPt = this.project(b.x, 0, b.z);
        if (shadowPt && shadowPt.scale > 0) {
            const ss = shadowPt.scale;
            const heightFactor = Math.max(0, 1 - Math.min(1, b.y / 180));
            const sW = Math.max(4, (b.radius * 1.6) * ss * (0.7 + (1 - heightFactor) * 0.5));
            const sH = Math.max(2, (b.radius * 0.7) * ss * (0.7 + (1 - heightFactor) * 0.5));
            const sAlpha = 0.12 + heightFactor * 0.42;

            ctx.save();
            ctx.fillStyle = `rgba(15, 23, 42, ${sAlpha.toFixed(2)})`;
            ctx.beginPath();
            ctx.ellipse(shadowPt.x, shadowPt.y, sW, sH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // [2] 3D 리얼 야구공 (Seams & Radial Lighting)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(b.rot);

        // 🌟 구종별 다이내믹 글로우 아우라
        if (b.type === 'fastball') {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
        } else if (b.type === 'slider') {
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 14;
        } else if (b.type === 'curve') {
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 14;
        } else if (b.type === 'changeup') {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 14;
        } else if (b.type === 'knuckleball') {
            ctx.shadowColor = '#f472b6';
            ctx.shadowBlur = 18;
            ctx.fillStyle = 'rgba(244, 114, 182, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.35, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3D 구체 입체 라이팅 그라데이션
        const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.65, '#f8fafc');
        grad.addColorStop(0.9, '#cbd5e1');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 야구공 붉은 실밥 (Classic Red Stitches)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = Math.max(1.3, 2.0 * p.scale);
        ctx.beginPath();
        ctx.arc(-r * 0.45, 0, r * 0.65, -0.6 * Math.PI, 0.6 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.45, 0, r * 0.65, 0.4 * Math.PI, 1.6 * Math.PI);
        ctx.stroke();

        // 실밥 스티치 눈금 (Stitch marks)
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = Math.max(1.0, 1.4 * p.scale);
        const stitchCount = 4;
        for (let i = 0; i < stitchCount; i++) {
            const angle = -0.5 * Math.PI + (i / (stitchCount - 1)) * Math.PI;
            const sx1 = -r * 0.45 + Math.cos(angle) * r * 0.65;
            const sy1 = Math.sin(angle) * r * 0.65;
            ctx.beginPath();
            ctx.moveTo(sx1 - 2 * p.scale, sy1 - 1 * p.scale);
            ctx.lineTo(sx1 + 2 * p.scale, sy1 + 1 * p.scale);
            ctx.stroke();

            const sx2 = r * 0.45 - Math.cos(angle) * r * 0.65;
            const sy2 = Math.sin(angle) * r * 0.65;
            ctx.beginPath();
            ctx.moveTo(sx2 - 2 * p.scale, sy2 - 1 * p.scale);
            ctx.lineTo(sx2 + 2 * p.scale, sy2 + 1 * p.scale);
            ctx.stroke();
        }

        ctx.restore();
    }

    createFastballSparks(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                z: z - 4,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.5) * 16,
                vz: -20,
                color: Math.random() < 0.6 ? '#38bdf8' : '#93c5fd',
                size: 3 + Math.random() * 3,
                life: 0.25
            });
        }
    }

    createSliderTrail(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 5,
                y: y + (Math.random() - 0.5) * 5,
                z: z - 5,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 14,
                vz: -16,
                color: Math.random() < 0.6 ? '#c084fc' : '#a855f7',
                size: 3 + Math.random() * 3,
                life: 0.28
            });
        }
    }

    createCurveTrail(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                z: z - 4,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12 - 8,
                vz: -14,
                color: Math.random() < 0.6 ? '#34d399' : '#10b981',
                size: 3.5 + Math.random() * 3.5,
                life: 0.3
            });
        }
    }

    createChangeupSmoke(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 6,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10 - 4,
                vz: -10,
                color: Math.random() < 0.6 ? '#fbbf24' : '#f59e0b',
                size: 4 + Math.random() * 4,
                life: 0.35
            });
        }
    }

    createKnuckleballVortex(x, y, z) {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z - 6,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14,
                vz: -15,
                color: Math.random() < 0.5 ? '#f472b6' : '#ec4899',
                size: 4 + Math.random() * 4,
                life: 0.32
            });
        }
    }

    createFireballTrail(x, y, z) {
        this.createKnuckleballVortex(x, y, z);
    }

    createReleaseSparks(x, y, z) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 6,
                y: y + (Math.random() - 0.5) * 6,
                z: z + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 40,
                vz: 25 + Math.random() * 35,
                color: Math.random() < 0.5 ? '#ffffff' : '#fde047',
                size: 4 + Math.random() * 4,
                life: 0.32
            });
        }
    }

    createHitSparks(x, y, z) {
        for (let i = 0; i < 32; i++) {
            this.particles.push({
                x: x, y: y, z: z,
                vx: (Math.random() - 0.5) * 360,
                vy: (Math.random() - 0.5) * 360,
                vz: (Math.random() - 0.5) * 360,
                color: ['#facc15', '#38bdf8', '#ffffff', '#ea580c'][Math.floor(Math.random() * 4)],
                size: 5 + Math.random() * 6,
                life: 0.6 + Math.random() * 0.4
            });
        }
    }

    createCatchSparks(x, y, z) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x, y: y, z: z,
                vx: (Math.random() - 0.5) * 180,
                vy: (Math.random() - 0.5) * 180,
                vz: (Math.random() - 0.5) * 180,
                color: ['#facc15', '#ffffff', '#38bdf8', '#4ade80'][Math.floor(Math.random() * 4)],
                size: 4 + Math.random() * 4,
                life: 0.45 + Math.random() * 0.3
            });
        }
    }

    renderEffects(ctx) {
        for (const p of this.particles) {
            const pt = this.project(p.x, p.y, p.z);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(2, p.size * pt.scale), 0, Math.PI * 2);
            ctx.fill();
        }

        for (const f of this.fireworks) {
            for (const p of f.particles) {
                const pt = this.project(p.x, p.y, p.z);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, Math.max(3, p.size * pt.scale), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    renderResultBanner(ctx) {
        if (this.bannerAlpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.bannerAlpha;

        const bw = Math.min(this.width * 0.75, 460);
        const bh = 68;
        const bx = this.width / 2 - bw / 2;
        const by = this.height * 0.18;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 14);
        ctx.fill();
        ctx.strokeStyle = this.bannerColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = this.bannerColor;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.bannerText, this.width / 2, by + 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = '13.5px sans-serif';
        ctx.fillText(this.bannerSub, this.width / 2, by + 52);

        ctx.restore();
    }

    showResultBanner(title, sub, color = '#facc15') {
        this.bannerText = title;
        this.bannerSub = sub;
        this.bannerColor = color;
        this.bannerAlpha = 1.0;
    }

    triggerHomeRunCelebration(dist, pts, isHotZone = false) {
        for (let i = 0; i < 4; i++) {
            const parts = [];
            const cx = (Math.random() - 0.5) * 220;
            const cy = 180 + Math.random() * 80;
            const cz = (this.userRole === 'batter') ? 100 : 250;
            const col = ['#facc15', '#ef4444', '#38bdf8', '#4ade80'][i % 4];

            for (let j = 0; j < 36; j++) {
                const a = (j / 36) * Math.PI * 2;
                const sp = 90 + Math.random() * 110;
                parts.push({
                    x: cx, y: cy, z: cz,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp,
                    vz: (Math.random() - 0.5) * 80,
                    size: 6,
                    color: col
                });
            }
            this.fireworks.push({ particles: parts, life: 1.6 });
        }

        const tag = isHotZone 
            ? ((pts >= 4) ? '🔥 [스마일] HOT ZONE 만루홈런 대폭발!!' : `🔥 [스마일] HOT ZONE CRITICAL!! ${pts}점 홈런!!`)
            : ((pts >= 4) ? '💥 GRAND SLAM 만루홈런!!' : `💥 ${pts}점 홈런 작렬!!`);
        this.showResultBanner(tag, `비거리 ${dist}m 장외 초대형 홈런! (+${pts}점)`, '#facc15');
    }

    updateHUD() {
        // [1] 상단 MLB 26 브로드캐스트 스코어 버그 갱신
        const inningEl = document.getElementById('mlb-bug-inning');
        if (inningEl) {
            inningEl.textContent = (this.inningHalf === 'top') ? '▲ 1회초' : '▼ 1회말';
        }

        const p1ScoreEl = document.getElementById('mlb-bug-p1-score');
        if (p1ScoreEl) p1ScoreEl.textContent = this.p1.score;

        const p2ScoreEl = document.getElementById('mlb-bug-p2-score');
        if (p2ScoreEl) p2ScoreEl.textContent = this.p2.score;

        // B-S-O
        const bEl = document.getElementById('mlb-bso-b');
        if (bEl) bEl.textContent = `${'●'.repeat(this.balls)}${'○'.repeat(Math.max(0, 3 - this.balls))}`;

        const sEl = document.getElementById('mlb-bso-s');
        if (sEl) sEl.textContent = `${'●'.repeat(this.strikes)}${'○'.repeat(Math.max(0, 2 - this.strikes))}`;

        const oEl = document.getElementById('mlb-bso-o');
        if (oEl) oEl.textContent = `${'●'.repeat(this.outs)}${'○'.repeat(Math.max(0, 2 - this.outs))}`;

        // 💎 다이아몬드 베이스 점등
        const b1 = document.getElementById('mlb-base-1');
        const b2 = document.getElementById('mlb-base-2');
        const b3 = document.getElementById('mlb-base-3');
        if (b1) { if (this.bases.first) b1.classList.add('active'); else b1.classList.remove('active'); }
        if (b2) { if (this.bases.second) b2.classList.add('active'); else b2.classList.remove('active'); }
        if (b3) { if (this.bases.third) b3.classList.add('active'); else b3.classList.remove('active'); }

        // 매치업 서브 텍스트 & 타선 라인업 정보 갱신
        const currLineup = this.getCurrentBatterLineup();
        const roleText = document.getElementById('mlb-bug-role-text');
        if (roleText) {
            roleText.textContent = (this.userRole === 'batter') ? '🏏 나의 역할: [타자]' : '⚾ 나의 역할: [투수]';
        }
        const matchupText = document.getElementById('mlb-bug-matchup-text');
        if (matchupText) {
            const pChar = this.getCurrentPitcher();
            matchupText.textContent = `⚾ ${pChar.name} vs 🏏 [${currLineup.order}번] ${currLineup.emoji} ${currLineup.name}`;
        }

        // 🏏 1~4번 정규 타선 HUD 배지 갱신
        const lineupBadge = document.getElementById('mlb-lineup-badge');
        const lineupName = document.getElementById('mlb-lineup-name');
        const lineupPerk = document.getElementById('mlb-lineup-perk');

        if (lineupBadge) lineupBadge.textContent = `${currLineup.order}번 타자`;
        if (lineupName) lineupName.textContent = `${currLineup.emoji} ${currLineup.name}`;
        if (lineupPerk) lineupPerk.textContent = currLineup.roleDesc;

        this.updateDifficultyUI();

        // [2] 하단 조작부 토글 (투수 모드 vs 타자 모드)
        const pitcherBar = document.getElementById('mlb-pitcher-bar');
        const batterBar = document.getElementById('mlb-batter-bar');

        if (this.userRole === 'pitcher') {
            if (pitcherBar) pitcherBar.style.display = 'flex';
            if (batterBar) batterBar.style.display = 'none';
            this.setPitchAim(this.pitchAimX, this.pitchAimY);
        } else {
            if (pitcherBar) pitcherBar.style.display = 'none';
            if (batterBar) batterBar.style.display = 'block';
        }

        // 구종 버튼 액티브
        document.querySelectorAll('.mlb-pitch-btn').forEach(btn => {
            if (btn.getAttribute('data-pitch') === this.selectedPitchType) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    }

    getCurrentPitcher() {
        if (this.userRole === 'pitcher') {
            return this.characters[this.p1.char] || this.characters.tiger;
        } else {
            return this.characters[this.p2.char] || this.characters.monkey;
        }
    }

    getCurrentBatterLineup() {
        if (!this.lineup || this.lineup.length === 0) {
            return {
                order: 4,
                id: 'tiger',
                name: '호걸이',
                emoji: '🐯',
                title: '4번 타자 [거포 슬러거]',
                roleDesc: '💥 파워 99 • 초대형 홈런',
                powerBonus: 28,
                contactBonus: 1.05
            };
        }
        return this.lineup[this.lineupIndex % this.lineup.length];
    }

    getCurrentBatter() {
        const currLineup = this.getCurrentBatterLineup();
        const baseChar = this.characters[currLineup.id] || this.characters.tiger;
        return {
            ...baseChar,
            name: currLineup.name,
            emoji: currLineup.emoji,
            contactBonus: currLineup.contactBonus || baseChar.contactBonus,
            powerBonus: currLineup.powerBonus || baseChar.powerBonus,
            doubleBonus: currLineup.doubleBonus || baseChar.doubleBonus || 1.0,
            contactWindowBonus: currLineup.contactBonus || 1.0
        };
    }

    getCurrentPitcherSkin() {
        const pChar = this.getCurrentPitcher();
        const sKey = (this.userRole === 'pitcher') ? this.p1.skin : this.p2.skin;
        return pChar.skins[sKey] || pChar.skins.classic;
    }

    getCurrentBatterSkin() {
        const currLineup = this.getCurrentBatterLineup();
        const baseChar = this.characters[currLineup.id] || this.characters.tiger;
        const skinKey = (this.userRole === 'batter' && currLineup.id === this.p1.char) ? this.p1.skin : 'classic';
        return baseChar.skins ? (baseChar.skins[skinKey] || baseChar.skins.classic) : { jersey: '#dc2626', cap: '#991b1b' };
    }

    selectPitchType(type) {
        this.selectedPitchType = type;
        this.updateHUD();
        this.playUmpireWhistle(800, 0.08);
    }

    /**
     * 🎯 [컴투스 프로야구] 3D 과녁 투수 조준 위치 실시간 갱신 (터치 & 키보드)
     */
    setPitchAim(aimX, aimY) {
        this.pitchAimX = Math.max(-36, Math.min(36, aimX));
        this.pitchAimY = Math.max(10, Math.min(76, aimY));
    }

    /**
     * 🎯 3x3 9분할 스트라이크 존 코스 적용 (0 ~ 8)
     */
    applyPitchGridIndex(idx) {
        // row 0: 상단 (y=58), row 1: 중단 (y=44), row 2: 하단 (y=30)
        // col 0: 좌측 몸쪽 (x=-16), col 1: 중앙 (x=0), col 2: 우측 바깥쪽 (x=16)
        const row = Math.floor(idx / 3);
        const col = idx % 3;

        const xCoords = [-16, 0, 16];
        const yCoords = [58, 44, 30];

        const x = xCoords[col];
        const y = yCoords[row];

        const labels = [
            '🎯 1번 [몸쪽 높은 스트라이크]',
            '🎯 2번 [가운데 높은 하이패스트볼]',
            '🎯 3번 [바깥쪽 높은 스트라이크]',
            '🎯 4번 [몸쪽 벨트높이 스트라이크]',
            '🎯 5번 [한가운데 정면 스트라이크]',
            '🎯 6번 [바깥쪽 벨트높이 스트라이크]',
            '🎯 7번 [몸쪽 낮은 코너워크]',
            '🎯 8번 [가운데 낮은 무릎 보더라인]',
            '🎯 9번 [바깥쪽 낮은 칼날 제구]'
        ];

        this.setPitchAim(x, y, labels[idx] || `🎯 ${idx + 1}번 스트라이크 존`);
        this.playUmpireWhistle(900, 0.06);
    }

    /**
     * 🎯 볼 / 스트라이크 코스 프리셋 적용
     */
    applyPitchZonePreset(zoneKey) {
        let x = 0;
        let y = 44;
        let label = '🎯 스트라이크 [한가운데]';

        if (zoneKey === 'center') {
            x = 0; y = 44; label = '🎯 스트라이크 [한가운데]';
        } else if (zoneKey === 'corner-strike') {
            x = 18; y = 28; label = '🎯 스트라이크 [외곽 코너워크]';
        } else if (zoneKey === 'low-strike') {
            x = 0; y = 26; label = '🎯 스트라이크 [무릎 보더라인]';
        } else if (zoneKey === 'high-strike') {
            x = 0; y = 60; label = '🎯 스트라이크 [높은 존]';
        } else if (zoneKey === 'outside-ball') {
            x = 34; y = 38; label = '⚪ 유인구 [바깥쪽 빠지는 볼]';
        } else if (zoneKey === 'dirt-ball') {
            x = 0; y = 12; label = '⚪ 유인구 [원바운드 낮은 볼]';
        } else if (zoneKey === 'high-ball') {
            x = 0; y = 74; label = '⚪ 유인구 [높은 하이볼]';
        } else if (zoneKey === 'inside-ball') {
            x = -34; y = 40; label = '⚪ 유인구 [몸쪽 위협구]';
        }

        this.setPitchAim(x, y, label);

        document.querySelectorAll('.mlb-zone-quick-btn').forEach(btn => {
            if (btn.getAttribute('data-zone') === zoneKey) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.playUmpireWhistle(900, 0.06);
    }

    showCharModal() {
        this.stop();
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) {
            modal.classList.add('active');
            this.updateCharSelectionUI();
        }
    }

    hideCharModal() {
        const modal = document.getElementById('baseball-batter-modal');
        if (modal) modal.classList.remove('active');
    }

    showBatterModal() { this.showCharModal(); }
    hideBatterModal() { this.hideCharModal(); }

    updateCharSelectionUI() {
        // 역할 버튼 액티브
        document.querySelectorAll('.role-btn').forEach(btn => {
            if (btn.getAttribute('data-role') === this.userRole) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 캐릭터 버튼 액티브
        document.querySelectorAll('#baseball-user-char-selector .select-btn').forEach(btn => {
            if (btn.getAttribute('data-char') === this.p1.char) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 고유 특화 카드 갱신
        const perkDesc = document.getElementById('mlb-char-perk-desc');
        const cObj = this.characters[this.p1.char] || this.characters.tiger;
        if (perkDesc) {
            perkDesc.innerHTML = `<strong>${cObj.emoji} ${cObj.name} 특화:</strong> ${cObj.batterPerkTitle} | ${cObj.batterPerkDesc}`;
        }

        // 스킨 버튼 생성
        const skinBox = document.getElementById('baseball-user-skin-selector');
        if (skinBox) {
            skinBox.innerHTML = '';
            Object.values(cObj.skins).forEach(s => {
                const sBtn = document.createElement('button');
                sBtn.type = 'button';
                sBtn.className = `costume-btn ${this.p1.skin === s.id ? 'active' : ''}`;
                sBtn.innerHTML = `<span>${s.icon}</span><span style="font-size:12px;">${s.name}</span>`;
                sBtn.onclick = () => {
                    this.p1.skin = s.id;
                    safeSetStorage('smilegames_bb_user_skin', s.id);
                    this.updateCharSelectionUI();
                };
                skinBox.appendChild(sBtn);
            });
        }
    }

    gameOver() {
        this.stop();
        const modal = document.getElementById('baseball-gameover-modal');
        if (!modal) return;

        const badge = document.getElementById('baseball-final-badge');
        const score = document.getElementById('baseball-final-score');
        const hr = document.getElementById('baseball-final-hr');
        const hit = document.getElementById('baseball-final-hit');
        const dist = document.getElementById('baseball-final-dist');

        const isP1Win = (this.p1.score >= this.p2.score);
        if (badge) {
            badge.textContent = isP1Win ? `👑 ${this.p1.name} 승리!!` : `👑 ${this.p2.name} 승리!!`;
        }
        if (score) score.textContent = `[나] ${this.p1.score}점  VS  ${this.p2.score}점 [라이벌]`;
        if (hr) hr.textContent = `나: ${this.p1.homeRuns}개 | 상대: ${this.p2.homeRuns}개`;
        if (hit) hit.textContent = `나: ${this.p1.hits}개 | 상대: ${this.p2.hits}개`;
        if (dist) dist.textContent = `${this.maxDistance}m`;

        modal.classList.add('active');
        this.playHomeRunFanfare();
    }

    hideGameOverModal() {
        const modal = document.getElementById('baseball-gameover-modal');
        if (modal) modal.classList.remove('active');
    }

    openHubModal() {
        this.stop();
        this.hideGameOverModal();
        this.hideCharModal();
        const hubModal = document.getElementById('hub-modal');
        if (hubModal) hubModal.classList.add('active');
    }

    // 🎵 Web Audio API 사운드 합성
    playPitchWindupSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const now = ctx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.45);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    playPitchThrowSound(type) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            if (type === 'fastball') {
                // ⚡ 직구: 날카롭고 빠른 채찍 바람소리
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(560, now);
                osc.frequency.exponentialRampToValueAtTime(160, now + 0.16);
                gain.gain.setValueAtTime(0.26, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.16);
            } else if (type === 'slider') {
                // 🌪️ 슬라이더: 날카롭게 꺾이는 스윙 사운드
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(140, now + 0.20);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.20);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.20);
            } else if (type === 'curve') {
                // 🌀 커브: 묵직하게 가라앉는 깊은 울림
                osc.type = 'sine';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(90, now + 0.28);
                gain.gain.setValueAtTime(0.24, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (type === 'changeup') {
                // 🐢 체인지업: 부드럽게 감속되는 조용한 바람
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, now);
                osc.frequency.exponentialRampToValueAtTime(110, now + 0.26);
                gain.gain.setValueAtTime(0.16, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.26);
            } else {
                // 🔮 너클볼: 신비로운 미스티 사운드
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(340, now + 0.15);
                osc.frequency.exponentialRampToValueAtTime(130, now + 0.32);
                gain.gain.setValueAtTime(0.20, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.32);
            }
        } catch (e) {}
    }

    playSwingSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.16);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.16);
        } catch (e) {}
    }

    playBuntSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            // 둔탁한 목재 "툭-" 사운드
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(360, now);
            osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
            gain.gain.setValueAtTime(0.52, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.11);

            const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
            const noise = ctx.createBufferSource();
            noise.buffer = buf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1300, now);
            filter.Q.setValueAtTime(4.0, now);
            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime(0.48, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playBatHitSound(type, isHotZone = false) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;

            // 1. 컴투스 프로야구 특유의 리얼 목재 배트 파열음 (High-energy Crack Transient)
            const crackLen = Math.floor(ctx.sampleRate * 0.05);
            const noiseBuf = ctx.createBuffer(1, crackLen, ctx.sampleRate);
            const data = noiseBuf.getChannelData(0);
            for (let i = 0; i < crackLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (crackLen * 0.25));
            }
            const noiseSrc = ctx.createBufferSource();
            noiseSrc.buffer = noiseBuf;

            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime((type === 'homerun' || isHotZone) ? 2300 : 1850, now);
            bandpass.Q.setValueAtTime(8.0, now);

            const nGain = ctx.createGain();
            nGain.gain.setValueAtTime((type === 'homerun' || isHotZone) ? 0.95 : 0.65, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            noiseSrc.connect(bandpass);
            bandpass.connect(nGain);
            nGain.connect(ctx.destination);
            noiseSrc.start(now);

            // 2. 묵직한 나무 중심 코어 공명음 (Wooden Body Resonance)
            const wood = ctx.createOscillator();
            const wGain = ctx.createGain();
            wood.type = 'triangle';
            const baseFreq = (type === 'homerun') ? 740 : (isHotZone ? 680 : 580);
            wood.frequency.setValueAtTime(baseFreq, now);
            wood.frequency.exponentialRampToValueAtTime(260, now + 0.22);
            wGain.gain.setValueAtTime((type === 'homerun' || isHotZone) ? 0.75 : 0.45, now);
            wGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
            wood.connect(wGain);
            wGain.connect(ctx.destination);
            wood.start(now);
            wood.stop(now + 0.24);

            // 3. 심장을 울리는 서브 베이스 타격 펀치 (Sub-Bass Punch)
            const sub = ctx.createOscillator();
            const sGain = ctx.createGain();
            sub.type = 'sine';
            sub.frequency.setValueAtTime((type === 'homerun') ? 95 : 75, now);
            sub.frequency.exponentialRampToValueAtTime(25, now + 0.18);
            sGain.gain.setValueAtTime((type === 'homerun') ? 0.85 : 0.50, now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            sub.connect(sGain);
            sGain.connect(ctx.destination);
            sub.start(now);
            sub.stop(now + 0.18);

            // 4. 홈런 시 관중들의 거대한 3D 폭발 함성
            if (type === 'homerun' || isHotZone) {
                this.playCrowdRoar(2.8);
            }
        } catch (e) {}
    }

    playCatchSound() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            // 포수 가죽 미트에 꽂히는 묵직한 포구음 (Leather Thud + Compression Pop)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(55, now + 0.13);
            gain.gain.setValueAtTime(0.58, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);

            // 가죽 공기 압축 스냅
            const snapLen = Math.floor(ctx.sampleRate * 0.035);
            const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
            const d = snapBuf.getChannelData(0);
            for (let i = 0; i < snapLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (snapLen * 0.3));
            const sSrc = ctx.createBufferSource();
            sSrc.buffer = snapBuf;
            const flt = ctx.createBiquadFilter();
            flt.type = 'lowpass';
            flt.frequency.setValueAtTime(750, now);
            const sGain = ctx.createGain();
            sGain.gain.setValueAtTime(0.4, now);
            sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            sSrc.connect(flt);
            flt.connect(sGain);
            sGain.connect(ctx.destination);
            sSrc.start(now);
        } catch (e) {}
    }

    playCrowdRoar(duration = 2.4) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const bandpass = ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(800, now);
            bandpass.frequency.linearRampToValueAtTime(1400, now + duration * 0.35);
            bandpass.frequency.linearRampToValueAtTime(650, now + duration);
            bandpass.Q.setValueAtTime(1.4, now);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.42, now + 0.3);
            gain.gain.linearRampToValueAtTime(0.32, now + duration * 0.65);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
        } catch (e) {}
    }

    playUmpireWhistle(freq = 1200, dur = 0.18) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + dur);
        } catch (e) {}
    }

    playHomeRunFanfare() {
        const ctx = this.getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime;
            const notes = [
                { f: 523.25, time: 0 },
                { f: 659.25, time: 0.14 },
                { f: 783.99, time: 0.28 },
                { f: 1046.50, time: 0.44 }
            ];
            notes.forEach(n => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(n.f, now + n.time);
                gain.gain.setValueAtTime(0.25, now + n.time);
                gain.gain.exponentialRampToValueAtTime(0.01, now + n.time + 0.28);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + n.time);
                osc.stop(now + n.time + 0.28);
            });
        } catch (e) {}
    }
}

if (typeof window !== 'undefined') {
    window.BaseballGame = BaseballGame;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseballGame;
}
