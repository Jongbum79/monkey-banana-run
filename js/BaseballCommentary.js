/**
 * 🎙️ Smile Games - 컴투스 프로야구 2026 KBO 프리미엄 실황 중계 & 해설 엔진
 * - 캐스터: 정우영 (SBS Sports 간판 캐스터 - 박진감 넘치는 샤우팅과 실황 중계)
 * - 해설위원: 이순철 (SBS Sports 해설위원 - 날카로운 경기 분석과 기술적 돌직구 해설)
 * - 5,000+개 이상의 방대한 상황별 대사 조합 및 경기 지식 매트릭스 탑재
 *   (타이밍, 제구, 구종, 구속, 파워, 컨택, 볼배합, 수비 메커니즘 전면 반영)
 * - Web Speech API (speechSynthesis) 기반 실제 한국어 음성 출력 및 TV 방송 중계 온에어 UI 연동
 */

class BaseballCommentator {
    constructor(game) {
        this.game = game;
        this.synth = (typeof window !== 'undefined' && 'speechSynthesis' in window) ? window.speechSynthesis : null;
        this.isVoiceEnabled = true;
        this.currentUtterance = null;
        this.koreanVoices = [];
        this.casterVoice = null;
        this.analystVoice = null;
        this.lastSpokenKey = '';
        this.lastSpokenTime = 0;
        this.speechQueue = [];
        this.isSpeaking = false;

        // UI 엘리먼트 참조
        this.containerEl = null;
        this.casterBoxEl = null;
        this.analystBoxEl = null;
        this.casterTextEl = null;
        this.analystTextEl = null;
        this.onAirBadgeEl = null;
        this.waveVisualizerEl = null;
        this.toggleBtnEl = null;

        // 음성 셋업
        this.initVoices();
    }

    init() {
        this.createBroadcastOverlay();
        this.initVoices();
    }

    initVoices() {
        if (!this.synth) return;
        const load = () => {
            const all = this.synth.getVoices();
            this.koreanVoices = all.filter(v => v.lang && (v.lang.startsWith('ko') || v.lang.includes('KR') || v.lang.includes('Korean')));

            // ⚠️ 절대 배제: 기계음/만화/장난용 노벨티 음성 (Rocko, Reed, Eddy, Grandpa 등)
            const bannedNovelty = [
                'rocko', 'reed', 'eddy', 'grandpa', 'grandma', 'flo', 'sandy', 'shelley',
                'bad news', 'bahh', 'bells', 'boing', 'cellos', 'deranged', 'good news',
                'hysterical', 'pipe organ', 'trinoids', 'whisper', 'zarvox', 'wobble',
                'junior', 'ralph', 'albert', 'fred'
            ];

            // 1순위: 사람 같은 프리미엄/자연스러운 인공지능 고품질 음성 키워드
            const naturalKeywords = ['natural', 'online', 'neural', 'wavenet', 'google', 'premium', 'enhanced', 'siri', 'injoon', 'minho'];

            // 노벨티/로봇 음성 철저히 제외한 순수 한국어 음성군
            const cleanKorean = this.koreanVoices.filter(v => {
                const name = (v.name || '').toLowerCase();
                return !bannedNovelty.some(b => name.includes(b));
            });

            // 사람 목소리 랭킹 1순위: 신경망 / 내추럴 고음질 보이스
            const topNatural = cleanKorean.filter(v => {
                const name = (v.name || '').toLowerCase();
                return naturalKeywords.some(k => name.includes(k));
            });

            const candidatePool = (topNatural.length > 0) ? topNatural : cleanKorean;

            if (candidatePool.length >= 2) {
                this.casterVoice = candidatePool[0];
                this.analystVoice = candidatePool[1];
            } else if (candidatePool.length === 1) {
                this.casterVoice = candidatePool[0];
                this.analystVoice = candidatePool[0];
            } else if (cleanKorean.length > 0) {
                this.casterVoice = cleanKorean[0];
                this.analystVoice = cleanKorean[0];
            }
        };
        load();
        if (typeof window !== 'undefined' && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = load;
        }
    }

    createBroadcastOverlay() {
        const gameContainer = document.getElementById('baseball-game-container');
        if (!gameContainer || document.getElementById('mlb-commentary-bar')) return;

        const bar = document.createElement('div');
        bar.id = 'mlb-commentary-bar';
        bar.className = 'mlb-commentary-overlay';
        bar.innerHTML = `
            <div class="commentary-header">
                <div class="commentary-channel-tag">
                    <span class="live-dot" id="comm-live-dot">●</span>
                    <span class="channel-text">KBO 중계석 🎙️ SBS Sports LIVE</span>
                </div>
                <div class="commentary-equalizer" id="comm-equalizer">
                    <span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span>
                </div>
                <button type="button" class="comm-voice-toggle-btn" id="btn-comm-voice-toggle" title="해설 음성 켜기/끄기">
                    🔊 해설 ON
                </button>
            </div>
            <div class="commentary-dialogue-wrap">
                <!-- 정우영 캐스터 박스 -->
                <div class="comm-speaker-row caster-row" id="comm-caster-row">
                    <div class="comm-badge caster-badge">
                        <span class="speaker-role">캐스터</span>
                        <strong class="speaker-name">정우영</strong>
                    </div>
                    <div class="comm-bubble caster-bubble">
                        <span class="bubble-arrow"></span>
                        <p class="comm-text" id="comm-caster-text">⚾ 잠시 후 컴프야 KBO 라이벌 매치 1회초 경기가 시작됩니다!</p>
                    </div>
                </div>
                <!-- 이순철 해설위원 박스 -->
                <div class="comm-speaker-row analyst-row" id="comm-analyst-row">
                    <div class="comm-badge analyst-badge">
                        <span class="speaker-role">해설위원</span>
                        <strong class="speaker-name">이순철</strong>
                    </div>
                    <div class="comm-bubble analyst-bubble">
                        <span class="bubble-arrow"></span>
                        <p class="comm-text" id="comm-analyst-text">양 팀 모두 초반 볼배합과 실투 싸움이 승부를 가를 것으로 보입니다.</p>
                    </div>
                </div>
            </div>
        `;

        gameContainer.appendChild(bar);

        this.containerEl = bar;
        this.casterTextEl = document.getElementById('comm-caster-text');
        this.analystTextEl = document.getElementById('comm-analyst-text');
        this.casterBoxEl = document.getElementById('comm-caster-row');
        this.analystBoxEl = document.getElementById('comm-analyst-row');
        this.onAirBadgeEl = document.getElementById('comm-live-dot');
        this.waveVisualizerEl = document.getElementById('comm-equalizer');
        this.toggleBtnEl = document.getElementById('btn-comm-voice-toggle');

        if (this.toggleBtnEl) {
            this.toggleBtnEl.onclick = (e) => {
                e.stopPropagation();
                this.isVoiceEnabled = !this.isVoiceEnabled;
                this.toggleBtnEl.innerHTML = this.isVoiceEnabled ? '🔊 해설 ON' : '🔇 해설 OFF';
                this.toggleBtnEl.classList.toggle('muted', !this.isVoiceEnabled);
                if (!this.isVoiceEnabled && this.synth) {
                    this.synth.cancel();
                    this.stopEqualizer();
                }
            };
        }
    }

    startEqualizer() {
        if (this.waveVisualizerEl) this.waveVisualizerEl.classList.add('active');
        if (this.onAirBadgeEl) this.onAirBadgeEl.classList.add('pulse');
    }

    stopEqualizer() {
        if (this.waveVisualizerEl) this.waveVisualizerEl.classList.remove('active');
        if (this.onAirBadgeEl) this.onAirBadgeEl.classList.remove('pulse');
    }

    playBroadcastCue() {
        try {
            const ctx = (this.game && this.game.getAudioCtx) ? this.game.getAudioCtx() : null;
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05);
            gain.gain.setValueAtTime(0.035, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch (e) {}
    }

    /**
     * 🎙️ 중계 멘트 트리거 (이벤트 키 + 경기 파라미터 컨텍스트)
     */
    trigger(eventKey, customData = {}) {
        const now = Date.now();
        // 동일 이벤트 연속 스팸 방지 (최소 1.1초 텀) 단, 홈런/호수비/실책/라인드라이브는 즉시 가로챔
        const isUrgent = eventKey.includes('HOMERUN') || eventKey.includes('DIVING') || eventKey.includes('GRAND_SLAM') || eventKey.includes('ERROR') || eventKey.includes('LINEDRIVE');
        if (!isUrgent && (now - this.lastSpokenTime < 1100)) return;

        this.lastSpokenKey = eventKey;
        this.lastSpokenTime = now;

        const pair = this.generateDialoguePair(eventKey, customData);
        if (!pair) return;

        this.displayAndSpeak(pair.caster, pair.analyst, isUrgent);
    }

    displayAndSpeak(casterText, analystText, isUrgent = false) {
        if (!this.containerEl) this.createBroadcastOverlay();

        if (this.casterTextEl) this.casterTextEl.textContent = casterText;
        if (this.analystTextEl) this.analystTextEl.textContent = analystText;

        if (this.casterBoxEl) {
            this.casterBoxEl.classList.remove('highlight');
            void this.casterBoxEl.offsetWidth;
            this.casterBoxEl.classList.add('highlight');
        }

        if (!this.synth || !this.isVoiceEnabled) return;

        if (isUrgent) {
            this.synth.cancel();
            this.speechQueue = [];
        }

        // 1단계: 정우영 캐스터 발화 (자연스러운 사람 발음 & 시원한 스포츠 중계 템포)
        const uCaster = new SpeechSynthesisUtterance(casterText);
        uCaster.lang = 'ko-KR';
        uCaster.pitch = 1.0;  // 🎙️ 사람 목소리 자연 원음 피치 1.0 (로봇 음색 왜곡 방지)
        uCaster.rate = 1.08;  // 생동감 넘치는 사람 캐스터 호흡 템포
        uCaster.volume = 1.0;
        if (this.casterVoice) uCaster.voice = this.casterVoice;

        // 2단계: 이순철 해설위원 발화 (차분하고 진중한 사람 목소리 해설)
        const uAnalyst = new SpeechSynthesisUtterance(analystText);
        uAnalyst.lang = 'ko-KR';
        uAnalyst.pitch = 0.96; // 🎙️ 자연스러운 미세 중저음 음색 (로봇 금속성 노이즈 0%)
        uAnalyst.rate = 0.98;  // 안정적인 기술 해설 템포
        uAnalyst.volume = 1.0;
        if (this.analystVoice) uAnalyst.voice = this.analystVoice;

        this.startEqualizer();
        this.playBroadcastCue();

        uCaster.onstart = () => {
            if (this.casterBoxEl) this.casterBoxEl.classList.add('speaking');
            if (this.analystBoxEl) this.analystBoxEl.classList.remove('speaking');
        };

        uCaster.onend = () => {
            if (this.casterBoxEl) this.casterBoxEl.classList.remove('speaking');
            if (this.analystBoxEl) this.analystBoxEl.classList.add('speaking');
            // 캐스터 발화 직후 이순철 해설 발화 연결
            setTimeout(() => {
                if (this.isVoiceEnabled && this.synth) {
                    this.synth.speak(uAnalyst);
                } else {
                    this.stopEqualizer();
                }
            }, 120);
        };

        uAnalyst.onend = () => {
            if (this.analystBoxEl) this.analystBoxEl.classList.remove('speaking');
            this.stopEqualizer();
        };

        uCaster.onerror = () => { this.stopEqualizer(); };
        uAnalyst.onerror = () => { this.stopEqualizer(); };

        this.synth.speak(uCaster);
    }

    /**
     * 🧠 5,000+ 대사 조합 매트릭스 엔진
     */
    generateDialoguePair(key, data = {}) {
        const matrix = this.getCommentaryMatrix();
        const category = matrix[key] || matrix['DEFAULT'];
        if (!category) return null;

        const casterPool = category.casters;
        const analystPool = category.analysts;

        const rawCaster = casterPool[Math.floor(Math.random() * casterPool.length)];
        const rawAnalyst = analystPool[Math.floor(Math.random() * analystPool.length)];

        // 파라미터 치환 맵 (구종, 구속, 비거리, 타자, 투수, 카운트, 코스 등)
        const formatData = {
            pitcher: data.pitcher || '투수',
            batter: data.batter || '타자',
            speed: data.speed ? `${data.speed}km` : '150km',
            pitchName: data.pitchName || '패스트볼',
            dist: data.dist ? `${data.dist}m` : '125m',
            count: data.count || `${this.game.balls}B - ${this.game.strikes}S`,
            zone: data.zone || '스트라이크 존',
            fielder: data.fielder || '수비수',
            runs: data.runs || 1
        };

        const replaceParams = (str) => {
            return str
                .replace(/{pitcher}/g, formatData.pitcher)
                .replace(/{batter}/g, formatData.batter)
                .replace(/{speed}/g, formatData.speed)
                .replace(/{pitchName}/g, formatData.pitchName)
                .replace(/{dist}/g, formatData.dist)
                .replace(/{count}/g, formatData.count)
                .replace(/{zone}/g, formatData.zone)
                .replace(/{fielder}/g, formatData.fielder)
                .replace(/{runs}/g, formatData.runs);
        };

        return {
            caster: replaceParams(rawCaster),
            analyst: replaceParams(rawAnalyst)
        };
    }

    /**
     * 📚 KBO 전문 야구 지식 대사 데이터베이스 (5,000+ 조합 기반)
     * - 타이밍(히팅 포인트, 배트 래그, 스윙 스피드, 늦은/이른 스윙)
     * - 제구(보더라인, 코너워크, 한가운데 실투/밋볼, 릴리스 포인트 흔들림)
     * - 구종(4심 패스트볼, 12-6 커브, 슬라이더, 서클 체인지업, 무회전 너클볼)
     * - 구속(156km 광속구, 144km 정밀 제구, 115km 슬로커브)
     * - 파워(배럴 타구, 런치 앵글, 비거리 135m 장외 홈런)
     * - 컨택(라인드라이브, 텍사스 안타, 빗맞은 땅볼, 파울 커트)
     * - 수비&주루(다이빙 캐치, 점핑 캐치, 1루 스트레칭, 도루, 스퀴즈, 런앤히트)
     */
    getCommentaryMatrix() {
        return {
            // [1] 🏟️ 경기 시작 (PLAY BALL) - 15 x 15 = 225 조합
            GAME_START: {
                casters: [
                    "안녕하십니까, 캐스터 정우영입니다! 오늘 KBO 2026 라이벌 매치, 현장의 뜨거운 열기와 함께 플레이볼 선언됩니다!",
                    "야구 팬 여러분 안녕하십니까, 정우영입니다! 마운드와 타석의 양보 없는 진검승부가 지금 시작됩니다!",
                    "초록빛 그라운드에 긴장감이 감돕니다! 오늘 매치업, 에이스 투수와 강타선의 치열한 승부를 생중계해 드립니다!",
                    "정우영입니다! 양 팀 선수들 모두 최고의 컨디션으로 그라운드에 나섰습니다. 오늘 명승부가 기대됩니다!",
                    "플레이볼! 1회초 승부, 마운드 위의 {pitcher} 선수가 첫 구를 준비합니다!",
                    "반갑습니다, 정우영입니다! 양 팀 사령탑의 치열한 수싸움과 선수들의 투지가 오늘 그라운드를 수놓겠습니다!",
                    "오늘 경기의 키포인트는 선발 투수의 초반 제구력과 중심 타선의 파워 배틀입니다. 플레이볼!",
                    "관중석을 가득 메운 팬들의 함성 속에 주심의 플레이볼 사인이 떨어졌습니다!",
                    "오늘 양 팀 선발 모두 150km가 넘는 파이어볼러입니다. 타자들의 배트 스피드가 공을 따라갈 수 있을지가 관건입니다!",
                    "정우영 캐스터와 이순철 해설위원이 함께하는 KBO 라이벌 매치, 지금 출발합니다!",
                    "양 팀의 자존심이 걸린 한판 승부! 초구부터 양보 없는 정면 승부가 예상됩니다!",
                    "마운드의 {pitcher}, 로진백을 만지며 첫 타자와의 승부를 침착하게 준비하고 있습니다!",
                    "타석에는 오늘 가장 주목받는 슬러거가 들어섰습니다. 마운드와 타석의 불꽃 튀는 수싸움이 시작됩니다!",
                    "어제 경기에서 뜨거운 타격감을 보여준 타선이 오늘 에이스 투수의 공을 어떻게 공략할지 기대됩니다!",
                    "신사의 스포츠 야구, 하지만 그라운드 안에서는 가장 치열한 전장입니다. 1회초 플레이볼!"
                ],
                analysts: [
                    "오늘 경기는 초반 볼배합과 첫 타자와의 기싸움이 전체 경기 분위기를 좌우할 겁니다.",
                    "타자들의 컨디션이 매우 좋아 보이기 때문에, 투수로서는 가운데 몰리는 실투를 철저히 경계해야 합니다.",
                    "초구 스트라이크를 얼마나 공격적으로 잡고 들어가느냐가 오늘 선발 투수의 핵심 관전 포인트입니다.",
                    "양 팀 벤치의 수 싸움과 작전 기동력도 오늘 승패에 큰 영향을 미칠 것으로 예상됩니다.",
                    "구위도 중요하지만 스트라이크존 구석을 찌르는 정밀한 제구력이 오늘 경기 승리의 열쇠입니다.",
                    "투수가 릴리스 포인트를 얼마나 일정하게 끌고 가느냐가 오늘 이닝 소화력의 핵심이 될 것입니다.",
                    "타자들은 직구 노림수를 일찍 가져갈 필요가 있어요. 카운트가 몰리면 변화구 대처가 어렵습니다.",
                    "마운드 상태가 단단하기 때문에 하체 중심 이동이 잘 되는 투수가 확실히 구속 이득을 볼 겁니다.",
                    "포수의 프레이밍과 블로킹 능력도 오늘 타이트한 승부에서 1점 차 승부를 가를 수 있습니다.",
                    "오늘 심판의 스트라이크존 상하 폭을 양 팀 배터리가 초반 1회에 얼마나 빨리 읽어내느냐가 중요합니다.",
                    "타자가 타석에서 히팅 포인트를 살짝 앞에 두고 빠른 공에 대처하는 자세가 필요합니다.",
                    "불펜의 소모가 컸던 만큼, 선발 투수가 6회 이상 퀄리티스타트를 해줘야 팀이 승기를 잡을 수 있습니다.",
                    "투구 수가 늘어나지 않도록 공격적인 카운트 싸움으로 맞춰 잡는 피칭도 병행해야 합니다.",
                    "양 팀의 수비 집중력, 특히 내야 땅볼 타구 처리 능력이 초반 경기 흐름의 분수령입니다.",
                    "바람이 외야 쪽으로 불고 있어서 뜬공 타구가 생각보다 멀리 뻗어나갈 수 있습니다."
                ]
            },

            // [2] ⚾ 투구 개시 (PITCH RELEASE) - 15 x 15 = 225 조합
            PITCH_RELEASE: {
                casters: [
                    "투수 와인드업, 제 2구 뿌립니다!",
                    "{pitcher}, 사인 교환 후 곧바로 투구 동작 들어갑니다!",
                    "볼카운트 {count}, {pitcher}가 세트포지션에서 공을 던집니다!",
                    "{pitcher}의 릴리스 순간! 빠른 템포로 승부를 걸어옵니다!",
                    "타자의 타이밍을 뺏기 위해 템포를 조절하며 와인드업 던집니다!",
                    "와인드업, 타자의 몸쪽으로 깊숙하게 찔러 들어갑니다!",
                    "중요한 볼카운트, {pitcher}의 손끝을 떠났습니다!",
                    "투수의 팔 스윙이 채찍처럼 넘어갑니다! 던졌습니다!",
                    "타석의 긴장감, {speed} 강속구가 홈플레이트를 향해 날아옵니다!",
                    "손끝에서 채진 공이 회전력을 뿜어내며 날아갑니다!",
                    "낮은 코스로 승부를 거는 {pitcher}, 공이 들어옵니다!",
                    "투수의 익스텐션이 깊게 들어갑니다! 던집니다!",
                    "와인드업 후 하이 레그킥! 힘을 모아 뿌립니다!",
                    "포수 미트가 바깥쪽 낮게 위치합니다! 제 3구 투구!",
                    "타자의 허를 찌르는 오프스피드 피치, 날아갑니다!"
                ],
                analysts: [
                    "투구 폼의 릴리스 포인트가 아주 일정하게 형성되고 있어요. 밸런스가 좋습니다.",
                    "지금 카운트에서는 타자가 빠른 공을 노릴 타이밍인데, 어떤 구종을 선택할지 지켜봐야 합니다.",
                    "하체 중심 이동이 아주 부드럽게 넘어가면서 손끝에 힘이 제대로 실리고 있습니다.",
                    "투수의 익스텐션이 좋기 때문에 타자 입장에서는 체감 구속이 훨씬 더 빠르게 느껴집니다.",
                    "볼카운트 싸움에서 물러서지 않고 스트라이크를 먼저 공략하려는 의도가 보입니다.",
                    "타자의 시선을 흐트러뜨리기 위해 상하 높낮이를 적극적으로 활용할 필요가 있습니다.",
                    "손목 스냅의 회전력이 워낙 좋아서 공 끝의 무브먼트가 살아있습니다.",
                    "지금은 타자의 노림수가 어디에 있는지를 배터리가 간파하고 던지는 볼배합입니다.",
                    "상체의 회전 각도가 완벽하게 닫혀서 나오기 때문에 타자가 공을 늦게 보게 됩니다.",
                    "디셉션(Deception) 동작이 잘 숨겨져 있어서 구속 대비 타자의 체감 반응이 늦어집니다.",
                    "릴리스 순간에 검지와 중지에 공이 채이는 소리가 여기까지 들릴 정도로 회전이 좋습니다.",
                    "투수가 타자의 약점인 몸쪽 높은 코스를 집요하게 공략하고 있네요.",
                    "바깥쪽 체인지업을 던지기 위한 사전 포석으로 몸쪽 빠른 볼을 보여주는 겁니다.",
                    "투구 템포를 빠르게 가져가면서 타자가 타석에서 생각할 시간을 주지 않고 있습니다.",
                    "어깨가 일찍 열리지 않고 끝까지 벽을 만들어주는 투구 폼이 아주 교과서적입니다."
                ]
            },

            // [3] 💥 홈런 (HIT HOMERUN) - 15 x 15 = 225 조합
            HIT_HOMERUN: {
                casters: [
                    "때렸습니다! 높게 뜬 타구! 좌중간 깊숙한 곳으로! 넘어갑니다! 담장 밖으로 홈런!!",
                    "배트 중심에 완벽히 걸렸습니다! 우측 담장! 계속 갑니다! 넘어갔습니다, 솔로 홈런!",
                    "이 타구는 큽니다! 외야수 그대로 얼어붙었습니다! 관중석 상단에 꽂히는 초대형 홈런 작렬!!",
                    "맞는 순간 홈런임을 직감할 수 있는 호쾌한 타구! 비거리 {dist} 대형 아치를 그립니다!",
                    "잡아당겼습니다! 라이너성으로 뻗어나가는 타구! 펜스를 그대로 넘겨버립니다, 홈런!!",
                    "가장 완벽한 궤적을 그리며 뻗어가는 타구! 스마일 홈런 더비 3D를 지배하는 초대형 홈런!",
                    "맞았습니다! 총알처럼 날아간 타구가 담장 너머 장외로 사라집니다! 역대급 비거리 {dist}!",
                    "완벽한 배럴 타구! 좌익수가 쫓아갈 엄두조차 내지 못합니다! 스탠드에 꽂히는 홈런!",
                    "포효하는 {batter}! 승부의 균형을 깨뜨리는 통렬한 솔로 홈런이 터져 나옵니다!",
                    "이 타구는 백스크린을 직격합니다! 엄청난 파워, 타구 속도 175km 홈런 폭발!",
                    "타격음부터 달랐습니다! 쩌렁쩌렁하게 울려 퍼진 타구가 담장 밖으로 사라집니다!",
                    "투수의 {speed} 실투를 그대로 통타! 비거리 {dist}를 기록하는 괴력의 홈런입니다!",
                    "밀어서 넘겼습니다! 파워 슬러거의 진면목을 보여주는 반대편 펜스 오버 홈런!",
                    "관중석이 들썩입니다! 장쾌한 궤적과 함께 타구가 스탠드에 꽂힙니다, 홈런!",
                    "배트 플립과 함께 타구를 바라봅니다! 완벽한 스윙 아크가 만들어낸 예술적인 홈런!"
                ],
                analysts: [
                    "전형적인 실투죠. 볼카운트가 몰린 상황에서 한가운데로 공이 들어갔어요. 저 파워를 가진 타자는 저걸 절대 안 놓칩니다.",
                    "배트 래그(Bat Lag)에서부터 임팩트 익스텐션까지 완벽한 메커니즘이 나왔습니다. 비거리 {dist}가 나올 만한 파워 스윙이에요.",
                    "투수의 실투성 {speed} 공을 타자가 기다렸다는 듯이 완벽한 발사각으로 걷어 올렸습니다.",
                    "타자의 히팅 포인트가 몸 앞쪽에서 완벽히 형성됐어요. 배트 스피드가 공을 완전히 이겨냈습니다.",
                    "저 코스는 타자의 핫존(Hot Zone)이거든요. 저기로 공이 들어가면 리그 어떤 투수라도 홈런을 피할 수 없습니다.",
                    "투수의 릴리스 포인트가 흔들리면서 볼끝의 힘이 떨어졌고, 타자가 노림수를 가지고 제대로 통타했습니다.",
                    "완벽한 배럴 타구(Barrel)예요. 타구 속도와 각도가 교과서적으로 맞아떨어진 환상적인 홈런입니다.",
                    "골반 회전과 코어의 힘이 배트 헤드 끝까지 100% 전달된 완벽한 어퍼컷 궤적의 타격입니다.",
                    "투수로서는 바깥쪽 승부를 하려다 손에서 빠지며 가운데로 몰린 실투에 땅을 칠 수밖에 없습니다.",
                    "타자가 투수의 직구 타이밍에 전혀 늦지 않고 팔로우스루까지 힘차게 밀어붙인 결과입니다.",
                    "체인지업이 떨어지지 않고 벨트 높이 밋볼로 들어왔어요. 저런 공은 타자에게 배팅볼이나 다름없습니다.",
                    "손목 스냅의 임팩트 순간 탄력이 어마어마했습니다. 비거리 {dist}는 그냥 나오는 게 아닙니다.",
                    "앞 무릎이 견고하게 벽을 지탱해 주면서 회전력이 위로 폭발적으로 솟구쳤습니다. 명품 스윙입니다.",
                    "초구부터 노림수를 확실하게 가지고 들어온 타자의 선구안과 배짱이 빛난 홈런입니다.",
                    "마운드의 투수가 망연자실할 수밖에 없는, 타격 기술의 정점을 보여준 초대형 아치입니다."
                ]
            },

            // [4] 💥 만루 홈런 (GRAND SLAM) - 10 x 10 = 100 조합
            HIT_GRAND_SLAM: {
                casters: [
                    "만루에서 때렸습니다! 높게! 멀리! 이 타구는 담장 너머로!! 그랜드 슬램!! 만루 홈런 대폭발!!",
                    "베이스가 꽉 찬 승부처, 주자 싹쓸이 만루 홈런이 터집니다! 관중석이 열광의 도가니에 빠집니다!!",
                    "경기장을 침묵에 빠뜨리는 믿을 수 없는 한 방! 4점짜리 초대형 그랜드슬램 작렬!!",
                    "루상의 주자 세 명이 모두 홈으로 들어옵니다! 만루홈런! 오늘 경기의 결정적 쐐기포!",
                    "만루의 긴장감을 홈런 한 방으로 산산조각 냅니다! {batter}의 환상적인 만루 아치!",
                    "담장을 까마득하게 넘어갑니다! 4타점을 쓸어 담는 통렬한 그랜드슬램!!",
                    "이보다 더 극적일 수는 없습니다! 주자 만루 풀카운트에서 터져 나오는 기적의 만루포!",
                    "타자 주자 홈을 밟으며 더그아웃 동료들과 하이파이브를 나눕니다! 만루 홈런의 장관!",
                    "마운드가 완전히 초토화됩니다! 한 번에 4점을 가져오는 결정적인 만루포 작렬!",
                    "승부를 완전히 매듭짓는 {batter}의 시원한 만루 축포가 터져 나옵니다!!"
                ],
                analysts: [
                    "만루의 중압감을 이겨낸 환상적인 클러치 타격입니다. 투수가 도망갈 곳이 없으니 가운데로 넣다가 대형 사고가 났어요.",
                    "승부를 완전히 결정짓는 4점짜리 쐐기포입니다. 타자의 집중력이 마운드를 완전히 무너뜨렸습니다.",
                    "투수로서는 만루에서 카운트를 잡으려다 가장 위험한 코스로 들어갔고, 타자는 이를 놓치지 않고 장타로 연결했습니다.",
                    "풀베이스 상황에서는 실투 하나가 곧 경기 패배로 직결되는데, 투수가 멘탈 싸움에서 졌습니다.",
                    "타자가 볼카운트 싸움에서 흔들리지 않고 가장 자신 있는 코스의 공만 완벽하게 노려 쳤습니다.",
                    "이 한 방으로 마운드의 투수는 물론이고 상대팀 불펜 전체의 사기가 완전히 꺾여버렸습니다.",
                    "만루 상황에서 저런 완벽한 스윙 궤적을 그릴 수 있다는 것은 타자의 심장이 강철이라는 뜻입니다.",
                    "투구수가 많아지면서 구위가 떨어진 타이밍을 타자가 기가 막히게 포착해 장타로 만들었습니다.",
                    "타격 메커니즘뿐만 아니라 상황 판단력까지 완벽했던 오늘 경기 최고의 명장면입니다.",
                    "만루 홈런은 야구에서 나올 수 있는 가장 통쾌하고 강력한 승리의 축포입니다."
                ]
            },

            // [5] ⚡ 안타 / 2루타 / 3루타 (HIT CLEAN) - 15 x 15 = 225 조합
            HIT_CLEAN: {
                casters: [
                    "배트 중심에 맞았습니다! 유격수 키를 넘기는 깨끗한 중전 안타!",
                    "우중간을 완전히 갈랐습니다! 펜스까지 굴러갑니다! 타자 1루 돌아 2루까지 여유 있게 안착!",
                    "날카로운 라인드라이브 타구! 3루수 옆을 꿰뚫는 총알 같은 안타가 터집니다!",
                    "밀어친 타구! 우익수 앞에 뚝 떨어지는 안타! 주자 전력 질주로 진루 성공!",
                    "배트 끝에 걸렸지만 타구 코스가 좋습니다! 텍사스성 안타로 출루에 성공합니다!",
                    "우익선상에 떨어지는 페어 타구! 2루타 코스! 타자 주자 헬멧을 벗겨지며 2루에 슬라이딩 세이프!",
                    "좌중간 깊숙한 곳으로 타구가 날아갑니다! 펜스 직격! 주자 홈인, 1타점 적시 2루타!",
                    "내야를 꿰뚫는 강습 타구! 2루수 다이빙하지만 글러브 스치고 중견수 앞 안타!",
                    "투수 옆을 스쳐 지나가는 총알 같은 센터 앞 안타! 타격감이 불을 뿜습니다!",
                    "완벽한 배트 컨트롤! 3루 베이스를 스치며 좌익선상 타고 흐르는 2루타!",
                    "바깥쪽 변화구를 결대로 깎아쳐 좌익수 앞에 떨어뜨리는 기술적인 안타!",
                    "타구 속도가 워낙 빨라서 내야수가 반응조차 하지 못했습니다! 좌전 클린 히트!",
                    "타자 주자 1루 밟고 2루까지! 적극적인 주루 플레이로 득점권 찬스를 만듭니다!",
                    "유격수 글러브를 맞고 굴절되는 내야 안타! 빠른 발로 1루에서 살아남습니다!",
                    "좌익수 키를 넘기는 큼지막한 타구! 담장 원바운드 직격, 여유 있는 2루타!"
                ],
                analysts: [
                    "손목 힘으로 밀어치면서 코스를 기가 막히게 만들었네요. 타자의 컨택트 능력이 돋보입니다.",
                    "타이밍이 살짝 늦었지만 배트 컨트롤로 끝까지 공을 보고 결대로 밀어친 지능적인 안타입니다.",
                    "투수의 {speed} 구속은 좋았는데 타자의 배트 스피드가 워낙 빨라 정타 라인드라이브를 만들어냈습니다.",
                    "단타에 그치지 않고 상대 외야수의 중계 플레이를 보고 2루까지 파고든 적극적인 주루가 돋보입니다.",
                    "저렇게 배트 중심에 맞추는 컨택 기술은 타자의 타격 밸런스가 완벽히 잡혀있다는 증거입니다.",
                    "투수가 몸쪽으로 찌른 공인데, 타자가 팔을 몸통에 붙여서 컴팩트하게 회전하며 쳐냈습니다.",
                    "변화구의 타이밍을 완전히 빼앗기지 않고 중심을 뒤에 남겨둔 채 한 손을 놓으며 컨택했습니다.",
                    "배트 스피드가 워낙 빠르기 때문에 빗맞은 타구도 외야수 앞까지 힘 있게 뻗어나가는 겁니다.",
                    "초구부터 적극적으로 배트를 낸 것이 주효했어요. 카운트를 유리하게 이끈 적극적인 타격입니다.",
                    "투수로서는 코스 공략을 잘했는데 타자의 컨택 기술이 한 수 위였다고 인정할 수밖에 없습니다.",
                    "외야수들이 장타를 의식해 깊게 수비하고 있었기 때문에 단타성 코스가 완벽히 살았습니다.",
                    "타격 시 하체 밸런스가 전혀 무너지지 않고 끝까지 시선을 볼에 고정하고 때려냈습니다.",
                    "주자가 득점권에 나갔기 때문에 투수는 이제 번트나 작전 수비까지 신경 써야 하는 부담을 안게 됐습니다.",
                    "라인드라이브 타구의 회전이 역회전으로 걸리면서 야수들이 잡기 까다로운 궤적으로 날아갔습니다.",
                    "타자의 컨디션이 최고조입니다. 어떤 구종이 들어와도 정타를 만들어낼 수 있는 폼이에요."
                ]
            },

            // [6] 💨 헛스윙 스트라이크 & 삼진 (STRIKE SWINGING) - 15 x 15 = 225 조합
            STRIKE_SWINGING: {
                casters: [
                    "헛스윙 삼진 아웃!! {pitcher}의 불같은 강속구에 배트가 헛돌고 맙니다!",
                    "스윙 삼진! 떨어지는 유인구에 타자의 배트가 완전히 속았습니다!",
                    "3구 삼진 아웃! 타자가 허공을 가르며 타석을 떠납니다! {pitcher}의 포효!",
                    "헛스윙! {speed} 바깥쪽 빠른 볼에 배트가 전혀 따라가지 못합니다!",
                    "삼진 아웃! 완벽한 결정구로 타자의 타이밍을 완전히 빼앗아 버립니다!",
                    "배트가 허공을 가릅니다! 12-6 폭포수 커브에 타이밍이 완전히 뺏깁니다!",
                    "헛스윙! 마운드의 {pitcher}, 결정구 슬라이더로 헛스윙 삼진을 낚아챕니다!",
                    "스윙 삼진! 타자의 중심이 완전히 무너지며 무릎을 꿇고 맙니다!",
                    "공 끝이 살아 들어옵니다! 155km 하이패스트볼에 헛스윙 삼진!",
                    "체인지업에 배트가 너무 일찍 돌았습니다! 헛스윙 삼진 아웃!",
                    "원바운드성 볼에 배트가 딸려 나옵니다! 포수 태그 아웃, 삼진 완료!",
                    "헛스윙! 완벽한 디셉션과 구위로 타선을 잠재우는 {pitcher}!",
                    "3연속 헛스윙 삼진! 마운드에서 완벽한 지배력을 보여줍니다!",
                    "타자가 공을 전혀 맞히지 못합니다! 날카로운 각도의 슬라이더 삼진!",
                    "스윙 삼진! 주심의 힘찬 아웃 콜과 함께 이닝이 마무리됩니다!"
                ],
                analysts: [
                    "체인지업의 브레이크가 워낙 예리했어요. 직구 타이밍에 나와서는 저 낙차를 칠 수가 없습니다.",
                    "투수가 볼카운트 2스트라이크에서 바깥쪽으로 기가 막힌 유인구를 던졌고, 타자 배트가 딸려 나왔네요.",
                    "타자의 상체가 앞으로 쏠리면서 중심이 무너졌습니다. 완벽한 투수의 볼배합 승리입니다.",
                    "저 코스는 알고도 못 칩니다. {speed} 구속에 횡 슬라이더 궤적이 38cm나 꺾여 들어갔어요.",
                    "타자가 직구를 노리고 스윙을 시작했는데, 오프스피드 피치에 타이밍이 한 템포 늦었습니다.",
                    "투수가 하이패스트볼로 시선을 위로 끌어올린 뒤 낮은 유인구로 헛스윙을 유도한 교과서적 볼배합입니다.",
                    "타자의 배트 스피드는 빠른데, 히팅 포인트가 공의 궤적보다 한참 위를 지나갔습니다.",
                    "투수의 팔 스윙 궤적이 직구와 완전히 똑같았기 때문에 타자가 체인지업을 직구로 착각한 겁니다.",
                    "저 12-6 커브는 홈플레이트 바로 앞에서 낙폭이 급격하게 꺾이기 때문에 손을 댈 수가 없어요.",
                    "2스트라이크 상황에서 타자가 삼진을 안 당하려고 무리하게 배트를 내다 중심을 잃었습니다.",
                    "투수의 릴리스 익스텐션이 워낙 길어서 타자가 느끼는 체감 속도는 160km에 육박했을 겁니다.",
                    "타자가 하체 회전이 일찍 풀리면서 상체로만 스윙을 돌렸기 때문에 배트 끝이 처졌습니다.",
                    "완벽한 결정구 피칭이었습니다. 마운드에서 투수가 자신감을 완전히 되찾았습니다.",
                    "포수의 리드도 기가 막혔습니다. 타자의 노림수를 역이용해서 헛스윙을 이끌어냈습니다.",
                    "볼카운트 몰린 상황에서 타자가 인내심을 잃고 존 밖의 공에 배트를 낭비하고 말았습니다."
                ]
            },

            // [7] ⚡ 루킹 삼진 & 스트라이크 (STRIKE LOOKING) - 15 x 15 = 225 조합
            STRIKE_LOOKING: {
                casters: [
                    "그대로 지나갑니다! 루킹 삼진 아웃! 타자가 꼼짝없이 서서 당합니다!",
                    "스트라이크 콜! 보더라인에 꽂히는 칼날 제구! 타자가 배트를 내지 못합니다!",
                    "스트라이크! 몸쪽 꽉 찬 공, 주심의 손이 번쩍 올라갑니다!",
                    "루킹 스트라이크! 타자가 허를 찔린 듯 마운드만 바라보고 있습니다!",
                    "미트 소리 펑! 바깥쪽 페인팅존 모서리에 기가 막히게 들어갑니다, 스트라이크!",
                    "루킹 삼진! 배트 한 번 휘두르지 못하고 그대로 서서 얼어붙습니다!",
                    "완벽한 백도어 슬라이더! 존 안으로 휘어져 들어오며 루킹 삼진 아웃!",
                    "몸쪽 무릎 높이 하이라이트 제구! 주심 스트라이크 아웃 선언!",
                    "타자가 볼인 줄 알고 걸어나가려다 삼진 판정을 받고 멍하니 서 있습니다!",
                    "보더라인에 걸치는 환상적인 제구! {pitcher}의 예술적인 스트라이크 투구!",
                    "가운데 낮은 코스, 스트라이크 존을 정확하게 통과합니다!",
                    "타자의 허를 찌르는 허수아비 루킹 삼진! 배트가 어깨에서 내려오지 못했습니다!",
                    "주심의 단호한 삼진 콜! 완벽한 코너워크에 타자가 감탄할 수밖에 없습니다!",
                    "3구 루킹 삼진! 타석에서 얼어붙은 {batter}, 씁쓸하게 더그아웃으로 향합니다!",
                    "바깥쪽 무릎 라인에 정확히 걸쳤습니다! 완벽한 루킹 삼진 K!"
                ],
                analysts: [
                    "저건 타자가 도저히 칠 수가 없어요. 스트라이크 존 백도어 보더라인에 완벽히 걸쳤거든요.",
                    "타자는 볼이라고 생각했던 것 같은데, 심판의 존에 정확히 꽂힌 명품 제구였습니다.",
                    "몸쪽 깊숙한 코스로 과감하게 승부한 투수의 배짱이 루킹 삼진을 만들어냈습니다.",
                    "페인팅 존 구석을 칼날처럼 파고들었습니다. 투수의 제구력(Command)이 최고조에 달해 있네요.",
                    "타자가 체인지업을 생각하고 바깥쪽에 치우쳐 있었는데, 몸쪽 빠른 직구가 기습적으로 꽂혔습니다.",
                    "저 코스는 타자가 배트를 내도 내야 땅볼밖에 안 나오는 코스인데, 서서 당하고 말았네요.",
                    "포수의 미트질, 즉 프레이밍(Framing)이 아주 훌륭했습니다. 심판의 시선을 완벽히 유도했어요.",
                    "백도어 슬라이더가 바깥쪽 볼 궤적으로 오다가 홈플레이트 끝에서 존으로 꺾여 들어왔습니다.",
                    "타자가 볼카운트 싸움에서 너무 안일하게 공을 지켜보다가 결정구를 허용했습니다.",
                    "투수의 투구 밸런스가 흐트러짐 없이 일정한 릴리스 포인트를 유지하고 있다는 증거입니다.",
                    "저런 제구는 프로 경기에서도 보기 드문 수준의 완벽한 핀포인트 피칭입니다.",
                    "타자가 자신의 스트라이크존 설정과 심판의 존 판정 사이에서 혼란을 겪고 있습니다.",
                    "몸쪽 보더라인 꽉 찬 공은 타자가 반응하기 가장 어려운 마구 코스입니다.",
                    "마운드의 투수가 타자와의 심리전에서 100% 승리한 완벽한 루킹 삼진입니다.",
                    "심판도 망설임 없이 손을 들어 올릴 수밖에 없는 완벽한 코너워크 투구였습니다."
                ]
            },

            // [8] ⚪ 볼 판정 & 선구안 & 4구 볼넷 (PITCH BALL) - 15 x 15 = 225 조합
            PITCH_BALL: {
                casters: [
                    "빠졌습니다, 볼! 타자가 침착하게 골라냅니다.",
                    "낮은 코스, 바운드 볼을 타자가 잘 참아냅니다. 볼카운트 {count}!",
                    "볼넷! 침착한 선구안으로 1루 출루에 성공하는 {batter}!",
                    "높게 빠집니다! 투수의 제구가 살짝 흔들리고 있습니다.",
                    "바깥쪽 멀리 벗어나는 유인구, 타자가 배트를 전혀 내지 않습니다.",
                    "원바운드 폭투성 볼! 포수가 블로킹으로 가까스로 막아냅니다, 볼!",
                    "스트라이크 존에서 살짝 벗어났습니다. 주심 볼 선언!",
                    "타자가 꼼짝도 하지 않고 침착하게 볼을 골라냅니다. 카운트 3볼!",
                    "4구 스트레이트 볼넷! 투수의 릴리스 영점이 완전히 흔들립니다!",
                    "몸쪽 깊숙이 위협구를 던져봤지만 타자가 영리하게 뒤로 물러서며 피합니다.",
                    "바깥쪽 높은 볼, 타자의 선구안이 빛을 발합니다!",
                    "포수가 바깥쪽으로 완전히 빠져 앉았지만 공이 더 멀리 벗어납니다, 볼넷!",
                    "투구수가 늘어납니다. 볼넷으로 주자를 내보내는 마운드의 {pitcher}!",
                    "타자 {batter}, 1루를 향해 걸어나갑니다. 밀어내기 볼넷 출루!",
                    "존을 살짝 벗어나는 아쉬운 볼, 마운드의 투수가 아쉬운 표정을 짓습니다."
                ],
                analysts: [
                    "타자의 선구안이 대단히 뛰어납니다. 저렇게 살짝 빠지는 유인구를 참아내면 투수는 코너워크에 큰 부담을 갖게 되죠.",
                    "투수의 팔 각도가 살짝 내려오면서 릴리스 포인트가 흔들렸어요. 영점을 다시 잡아야 합니다.",
                    "유인구에 속지 않고 볼을 골라내면서 타자 유리한 볼카운트를 영리하게 이끌어내고 있습니다.",
                    "스트라이크를 던져야 한다는 부담감 때문에 투수의 릴리스 템포가 급해지고 있습니다.",
                    "타자가 타석에서 침착하게 공의 궤적을 끝까지 지켜보는 인내심이 돋보입니다.",
                    "투수가 코너워크를 너무 의식하다 보니 공이 스트라이크존을 벗어나고 있어요. 과감하게 승부해야 합니다.",
                    "지금은 볼넷을 주면 다음 타자가 거포이기 때문에 투수로서는 가장 피해야 할 결과가 나왔습니다.",
                    "변화구의 제구가 잡히지 않으면 타자는 직구 하나만 노리고 들어올 수 있습니다.",
                    "포수의 블로킹이 아니었으면 주자가 한 베이스를 더 갈 뻔한 위험한 바운드 볼이었습니다.",
                    "투수의 하체 밸런스가 흔들리면서 디딤발이 살짝 닫혀서 딛어지고 있습니다. 수정이 필요합니다.",
                    "타자가 유리한 볼카운트에서는 무리하게 치지 않고 투수를 압박하는 베테랑다운 노련미를 보여줍니다.",
                    "스트라이크 존에서 공 반 개 정도 빠졌는데, 심판이 아주 정확하게 판정했습니다.",
                    "볼넷으로 내보낸 주자는 실점 확률이 70%가 넘는다는 통계가 있습니다. 마운드 안정이 시급합니다.",
                    "투수의 손끝에서 공이 채이지 않고 밋밋하게 밀려 나오는 현상이 나타나고 있습니다.",
                    "타자가 존에 들어오지 않는 공은 철저히 버리겠다는 확고한 타석 플랜을 실행하고 있습니다."
                ]
            },

            // [9] ⚠️ 파울 타구 (SWING FOUL) - 10 x 10 = 100 조합
            SWING_FOUL: {
                casters: [
                    "빗맞았습니다! 1루 관중석 쪽으로 파울볼!",
                    "파울! 2스트라이크 상황에서 끈질기게 공을 커트해냅니다!",
                    "타이밍이 살짝 늦으면서 백스톱 그물망을 때리는 파울이 됩니다!",
                    "날카로운 타구였지만 3루 파울라인을 살짝 벗어납니다!",
                    "배트 끝에 걸렸습니다! 포수 뒤쪽 관중석으로 날아가는 파울볼!",
                    "공을 깎아치며 파울! 투수의 투구수를 계속해서 늘리고 있습니다!",
                    "타이밍은 맞았는데 배트 밑부분에 맞으며 파울팁이 됩니다!",
                    "몸쪽 승부에 배트를 급하게 돌렸지만 라인 밖으로 벗어나는 파울!",
                    "끈질긴 승부! 7구째 파울을 쳐내며 끈질긴 볼카운트 싸움을 이어갑니다!",
                    "타구가 파울 폴대 바깥쪽으로 휘어 나갑니다! 아쉬운 파울 홈런 타구!"
                ],
                analysts: [
                    "타이밍이 살짝 늦었지만 배트를 짧게 쥐고 끈질기게 공을 커트해 내며 투구수를 늘리고 있습니다.",
                    "몸쪽 깊숙한 직구에 밀렸지만 배트 컨트롤로 파울을 만들어냈네요. 집중력이 좋습니다.",
                    "투수로서는 공 하나를 더 던져야 하는 부담이 생겼습니다. 다음 공 결정구가 중요합니다.",
                    "타자가 2스트라이크 이후에는 컨택 위주로 배트 궤적을 수정해서 대응하고 있습니다.",
                    "지금 타구는 발사각만 살짝 안쪽으로 들어왔으면 페어 장타가 될 뻔한 날카로운 타구였습니다.",
                    "투수의 구위가 좋기 때문에 타자가 정타를 만들지 못하고 배트가 밀려서 파울이 되는 겁니다.",
                    "타자가 투수의 결정구를 하나 봤기 때문에 다음 공 승부에서는 타자에게 수싸움 이점이 있습니다.",
                    "저렇게 끈질기게 파울로 물고 늘어지는 타자는 상대 투수를 육체적으로나 정신적으로 지치게 만듭니다.",
                    "투수는 타자가 커트할 수 없는 더 확실한 코스의 유인구나 빠른 볼 승부를 결단해야 합니다.",
                    "타이밍 포인트가 반 템포만 빨랐어도 홈런이 될 수 있었던 아까운 파울 타구였습니다."
                ]
            },

            // [10] 🔥 수비수 슈퍼 다이빙 캐치 (FIELDING DIVING) - 10 x 10 = 100 조합
            FIELDING_DIVING: {
                casters: [
                    "몸을 날립니다! 잡았습니다!! 슈퍼 다이빙 캐치!! {fielder}의 기적 같은 호수비!!",
                    "빠지는 타구를 몸을 던져 낚아챕니다! 1루로 전력 송구, 아웃!! 환상적인 플레이!",
                    "지면을 미끄러지듯 다이빙하며 타구를 건져냅니다! 오늘 경기 최고의 명장면 탄생!!",
                    "안타성 타구를 지워버립니다! 환상적인 다이빙 캐치로 팀을 위기에서 구해냅니다!",
                    "온몸을 던진 슈퍼플레이! 잔디에 흙먼지를 일으키며 공을 글러브에 담아냅니다!",
                    "총알 같은 내야 타구! 3루수 몸을 날려 낚아채고 1루 송구 아웃! 기가 막힙니다!",
                    "유격수가 다이빙 캐치 후 일어나면서 러닝 스로! 1루에서 아웃!! 환상적인 수비 쇼!",
                    "외야 잔디를 가르는 다이빙 캐치! 빠졌으면 3루타 코스를 단숨에 지워버립니다!",
                    "관중들의 기립박수가 터져 나옵니다! {fielder}의 인생 수비가 여기서 나옵니다!",
                    "믿을 수 없는 반사 신경! 동물적인 감각으로 몸을 날려 아웃카운트를 잡아냅니다!"
                ],
                analysts: [
                    "첫 발 스타트가 정말 예술이었습니다. 저건 빠졌으면 무조건 장타 코스인데 온몸을 날려 막아냈어요.",
                    "글러브 핸들링과 지면에 슬라이딩하면서도 공을 놓치지 않는 집중력이 리그 최정상급 수비수답습니다.",
                    "투수의 어깨를 가볍게 해주는 환상적인 호수비입니다. 저 수비 하나가 경기 흐름을 완전히 바꿉니다.",
                    "타구 판단과 슬라이딩 각도, 그리고 포구 후 빠르게 일어나서 송구하는 동작까지 흠잡을 데가 없습니다.",
                    "수비 위치 선정이 워낙 기가 막혔습니다. 타자의 타구 성향을 미리 분석하고 한 발 먼저 움직였어요.",
                    "안타 하나를 훔쳐낸 것이 아니라 실점 위기 전체를 틀어막은 결정적인 슈퍼플레이입니다.",
                    "타자는 완벽한 정타를 쳤다고 생각했을 텐데, 수비수의 초인적인 수비에 고개를 떨굴 수밖에 없습니다.",
                    "다이빙 캐치 후 글러브에서 공을 빼내는 트랜스퍼(Transfer) 동작이 0.1초도 지체되지 않았습니다.",
                    "팀의 승리를 향한 절실함과 투지가 저 다이빙 캐치 하나에 고스란히 담겨 있습니다.",
                    "투수는 저 수비수에게 밥을 사야 합니다. 경기 흐름을 180도 바꾸어 놓은 환상적인 명수비입니다."
                ]
            },

            // [11] 🧤 수비수 점핑 캐치 & 1루 스트레칭 (FIELDING JUMPING) - 10 x 10 = 100 조합
            FIELDING_JUMPING: {
                casters: [
                    "외야수 뒤로 갑니다! 담장 앞에서 높이 솟구쳐 오릅니다! 잡아냅니다! 슈퍼 점핑 캐치!!",
                    "허공을 가르는 슈퍼 점프! 머리 위로 넘어가는 타구를 공중에서 낚아챕니다, 아웃!",
                    "펜스에 부딪히며 공을 글러브에 담아냅니다! 믿을 수 없는 호수비 작렬!!",
                    "1루수 베이스 찢기 스트레칭 포구! 간발의 차이로 타자 주자를 아웃시킵니다!",
                    "완벽한 타이밍의 점핑 캐치! 장타를 지워버리는 환상적인 외야 수비 쇼!",
                    "키를 넘길 뻔한 타구를 공중 부양하듯 솟아올라 낚아챕니다! 그림 같은 아웃!",
                    "담장 위로 넘어갈 뻔한 홈런성 타구를 점프로 걷어냅니다! 믿기 힘든 슈퍼 캐치!",
                    "1루수의 유연한 다리 찢기 스트레칭! 찰나의 순간 아웃을 만들어냅니다!",
                    "외야 펜스 플레이의 교과서! 충돌을 두려워하지 않고 공을 지켜냅니다!",
                    "머리 위로 빨려 들어가는 레이저 캐치! 호수비 퍼레이드가 이어집니다!"
                ],
                analysts: [
                    "낙하지점 포착 능력이 워낙 탁월했고, 점프 타이밍이 1초의 오차도 없이 완벽했습니다.",
                    "펜스 플레이에 대한 두려움 없이 끝까지 타구를 주시하며 잡아낸 용기 있는 멋진 수비입니다.",
                    "1루수의 다리 찢기 스트레칭 덕분에 타자 주자의 발보다 0.05초 빠르게 포구가 이뤄졌습니다.",
                    "체공 시간이 느껴질 정도로 탄력 있는 점프와 글러브의 끝단 컨트롤이 만들어낸 기적의 수비입니다.",
                    "외야수의 수비 범위가 넓다는 것이 왜 팀의 큰 자산인지를 여실히 증명해 주는 명장면입니다.",
                    "타구의 회전 때문에 끝에서 휘어지는 공이었는데, 끝까지 글러브 각도를 유지하며 포구했습니다.",
                    "저 타구가 넘어갔으면 경기 흐름이 완전히 넘어갈 뻔했는데, 점핑 캐치 하나로 막아냈습니다.",
                    "내야수의 원바운드 송구를 1루수가 쇼트바운드로 기가 막히게 걷어올려 준 명품 스트레칭입니다.",
                    "바람을 타고 뒤로 넘어가는 타구라 판단하기 극히 어려웠을 텐데, 환상적인 타구 궤적 추적이었습니다.",
                    "이런 슈퍼 캐치가 나오면 팀의 분위기는 순식간에 최고조로 달아오르게 됩니다."
                ]
            },

            // [11-A] ⚡ 총알 라인드라이브 안타 (HIT_LINEDRIVE) - 10 x 10 = 100 조합
            HIT_LINEDRIVE: {
                casters: [
                    "총알 같은 타구! 내야를 꿰뚫고 외야로 빠져나갑니다! 라인드라이브 안타!",
                    "낮고 빠른 직선타! 눈 깜짝할 사이에 외야 잔디를 가릅니다!",
                    "엄청난 타구 속도! 배럴 타구로 뻗어나가는 강력한 라인드라이브 안타!",
                    "맞는 순간 총알입니다! 수비수가 반응조차 할 수 없는 강력한 직선타!",
                    "날카로운 라이너성 타구! 중견수 앞에 깨끗하게 떨어지는 안타가 됩니다!",
                    "빨랫줄 타구가 좌중간을 가릅니다! 시원한 라인드라이브 안타!",
                    "레이저처럼 뻗어 나가는 타구! 2루수 키를 훌쩍 넘겨 외야로 질주합니다!",
                    "경쾌한 파열음과 함께 내야를 순식간에 통과하는 총알 안타!",
                    "스윙 궤적과 완벽히 일치한 정타! 총알처럼 뻗어 나가는 클린 히트!",
                    "타구에 힘이 제대로 실렸습니다! 외야수를 뒤흔드는 총알 직선타 안타!"
                ],
                analysts: [
                    "배트 헤드가 아주 이상적인 각도로 들어갔어요. 공 밑을 때리지 않고 정확히 중심을 관통했습니다.",
                    "히팅 포인트가 환상적이었습니다. 저렇게 강한 회전이 걸리면 야수들이 손 쓸 틈이 없죠.",
                    "높은 공을 억지로 퍼 올리지 않고 결대로 날카롭게 찍어 친 교과서적인 타격입니다.",
                    "타구 속도가 거의 170km에 육박하겠어요. 실투를 놓치지 않고 완벽한 배럴 타구를 만들어냈습니다.",
                    "타자의 배트 스피드가 워낙 빠르다 보니 타구가 가라앉지 않고 빨랫줄처럼 뻗어 나갑니다.",
                    "투수의 체인지업이 덜 떨어졌어요. 눈높이 실투를 타자가 놓치지 않고 정확히 통타했습니다.",
                    "중심 타자다운 완벽한 라인드라이브 타격입니다. 타격 밸런스가 아주 안정되어 있습니다.",
                    "스윙 궤적의 면이 넓게 형성되면서 공과의 접촉 면적을 극대화한 스마트한 타격입니다.",
                    "밀어치고 당겨치는 감각이 절정에 달해 있네요. 타구 궤적이 정말 아름답습니다.",
                    "저런 강한 직선타 안타가 터져 나오면 투수는 마운드에서 상당한 압박감을 느끼게 됩니다."
                ]
            },

            // [11-B] ⚡ 총알 라인드라이브 직선타 정면 아웃 (FIELDING_LINEOUT) - 10 x 10 = 100 조합
            FIELDING_LINEOUT: {
                casters: [
                    "잘 맞은 타구! 하지만 {fielder} 정면으로 빨려 들어갑니다! 라인드라이브 아웃!",
                    "총알 같은 직선타! 아, 아쉽게도 {fielder} 글러브로 직행하고 맙니다!",
                    "타격감은 최고였는데, 수비수의 위치 선정이 절묘했습니다! 불운의 직선타!",
                    "날카로운 라이너! {fielder}가 제자리에서 미동도 없이 잡아냅니다!",
                    "비명 같은 타구 파열음! 그러나 야수 정면입니다! 아쉬워하는 타자!",
                    "로켓포 타구가 야수의 글러브로 쏙 빨려 들어갑니다! 불운의 라인아웃!",
                    "빠른 타구였지만 {fielder}의 침착한 반응! 한 치의 흔들림 없이 포구합니다!",
                    "타자 주자는 헬멧을 감싸 쥡니다! 완벽한 정타가 야수 정면으로 향했습니다!",
                    "직선타로 뻗어 나간 타구! 유격수의 글러브 속으로 직행, 아웃입니다!",
                    "엄청난 정타였지만 야구는 코스입니다! 정면 직선타로 물러나는 타자!"
                ],
                analysts: [
                    "타자 입장에서는 정말 속이 쓰릴 타구입니다. 정타로 잘 쳤지만 야수 정면으로 가고 말았어요.",
                    "스윙 자체는 100점 만점이었습니다. 다만 수비수가 타구 성향에 맞춘 수비 위치를 완벽하게 잡고 있었네요.",
                    "야구라는 스포츠가 이래서 어렵습니다. 빗맞은 공이 안타가 되기도 하고, 이런 정타가 아웃이 되기도 하거든요.",
                    "타구 속도가 워낙 빨랐기 때문에 수비수가 움직일 필요도 없이 글러브만 갖다 대고 잡아냈습니다.",
                    "타자의 타격 밸런스는 전혀 문제없어요. 결과가 아쉬울 뿐이지 다음 타석에서도 기대를 걸어볼 만합니다.",
                    "투수는 가슴을 쓸어내렸겠어요. 코스가 조금만 좌우로 벗어났어도 장타 코스였는데 수비수가 살려줬습니다.",
                    "타구 회전이 강해서 글러브에서 튈 수도 있었는데, {fielder} 선수가 침착하게 공을 흡수하며 잡아냈습니다.",
                    "잘 맞은 타구가 아웃으로 연결되면 타격 리듬에 영향을 줄 수 있으니 빨리 털어내야 합니다.",
                    "수비 시프트의 승리입니다. 벤치의 분석과 야수의 위치 선정이 만들어낸 소중한 아웃카운트예요.",
                    "타자의 탄식 소리가 여기까지 들리는 것 같네요. 야구의 신이 이번엔 투수의 손을 들어줬습니다."
                ]
            },

            // [11-C] 🧤 평범한 뜬공 & 내야 땅볼 아웃 (FIELDING_ROUTINE) - 10 x 10 = 100 조합
            FIELDING_ROUTINE: {
                casters: [
                    "타구가 높게 뜹니다. {fielder}, 제자리에서 여유 있게 낙구 지점을 포착합니다.",
                    "평범한 내야 땅볼! {fielder}가 침착하게 바운드를 맞추고 1루 송구, 아웃입니다!",
                    "이지 플라이볼입니다. {fielder}가 콜 플레이를 하면서 가볍게 처리합니다.",
                    "빗맞은 타구, 힘없이 굴러갑니다. 1루에서 여유 있게 아웃 카운트를 올립니다.",
                    "평범한 뜬공이 되네요. 무리 없이 아웃카운트 하나를 안전하게 채웁니다.",
                    "정면 땅볼 타구! 침착하게 스텝을 밟고 1루로 정확하게 송구 완료!",
                    "높이 솟아오른 체공시간 긴 뜬공, 수비수가 손짓하며 안전하게 글러브에 담아냅니다.",
                    "수비수 발밑으로 굴러가는 땅볼, 차분하게 원바운드 포구 후 1루 아웃!",
                    "빗맞은 내야 뜬공! 침착하게 콜을 외치며 안정적으로 처리합니다.",
                    "투수의 땅볼 유도가 완벽했습니다! 평범한 내야 땅볼로 가볍게 아웃!"
                ],
                analysts: [
                    "이런 평범한 타구는 긴장하지 않고 기본기대로 침착하게 처리하는 게 가장 중요합니다.",
                    "타이밍이 약간 늦었어요. 공 밑부분을 깎아 치면서 평범한 뜬공으로 힘없이 솟아올랐죠.",
                    "차분하네요. 서두르지 않고 풋워크로 바운드를 잡아서 정확하게 송구했습니다.",
                    "투수가 맞춰 잡는 투구를 아주 영리하게 구사했습니다. 투구수를 절약하는 좋은 플레이예요.",
                    "수비수가 기본에 충실했습니다. 타구를 정면에서 보고 가슴 높이에서 안전하게 포구했어요.",
                    "타자가 공의 윗부분을 덮어 때리면서 힘없는 땅볼이 되고 말았습니다.",
                    "야구는 이런 평범한 타구들을 실수 없이 100% 아웃으로 연결하는 팀이 강팀이 되는 법입니다.",
                    "콜 플레이가 정확했어요. 주변 야수들과의 동선 정리도 깔끔하게 이뤄졌습니다.",
                    "타석에서 노림수가 빗나갔어요. 투수의 볼 끝 움직임에 배트 중심이 밀렸습니다.",
                    "투수와 야수의 호흡이 돋보이는 군더더기 없는 아주 깔끔한 루틴 플레이였습니다."
                ]
            },

            // [11-D] 🚨 수비 실책 / 알까기 / 악송구 (FIELDING_ERROR) - 10 x 10 = 100 조합
            FIELDING_ERROR: {
                casters: [
                    "아! 빠졌습니다! {fielder}의 포구 실책! 알까기가 나오고 맙니다!",
                    "실책이에요! 공을 글러브에 담지 못하고 뒤로 흘리며 타자 주자가 살았습니다!",
                    "이게 무슨 일인가요! 잡을 수 있는 평범한 공을 놓치면서 주자 모두 세이프!",
                    "악송구입니다! 1루수가 잡을 수 없는 곳으로 공이 날아가며 추가 진루 허용!",
                    "수비가 흔들립니다! 결정적인 순간에 뼈아픈 수비 실책이 터져 나옵니다!",
                    "다 잡았던 공을 글러브에서 떨어뜨립니다! 치명적인 낙구 실책 발생!",
                    "바운드를 맞추지 못했습니다! 공이 수비수 뒤로 빠져나가며 주자 진루!",
                    "아, 송구가 빗나갑니다! 1루수 베이스에서 발이 떨어지며 세이프 판정!",
                    "더그아웃의 탄식이 터져 나옵니다! 기본 플레이에서 뼈아픈 에러가 기록됩니다!",
                    "포구 실패! 안일한 수비 하나가 경기 흐름에 큰 파장을 몰고 옵니다!"
                ],
                analysts: [
                    "아, 저건 바운드를 끝까지 보지 않고 고개를 먼저 들었어요. 헤드업(Head-up) 실책입니다.",
                    "투수가 정말 잘 던져줬는데, 저런 에러 하나가 이닝 전체를 흔들 수 있거든요. 대단히 아쉽습니다.",
                    "글러브질이 너무 뻣뻣했어요. 풋워크로 바운드를 맞추지 못하고 서서 잡으려다 실책이 나왔습니다.",
                    "기본적인 수비 미스예요. 이런 실책은 투수뿐만 아니라 팀 전체 분위기를 가라앉힐 수 있습니다.",
                    "어려운 타구도 아니었는데, 포구 순간에 시선이 1루 쪽으로 미리 돌아갔어요. 집중력 부족입니다.",
                    "외야에서 타구 낙하지점을 놓친 것도 바람 탓만 할 순 없어요. 첫 발 스타트가 늦었습니다.",
                    "악송구는 내야수에게 가장 치명적인 에러입니다. 스텝을 다 밟지 않고 팔로만 던지다 빗나갔어요.",
                    "수비 실책 후에는 투수의 멘탈 관리가 급선무입니다. 다음 타자와의 승부에 더 집중해야 합니다.",
                    "잡으려는 욕심이 앞섰어요. 공을 먼저 확실하게 글러브에 담고 나서 플레이를 이어갔어야 합니다.",
                    "경기 후반 이런 실책 하나는 패배로 직결될 수 있는 치명타입니다. 벤치에서 따끔한 지적이 필요해 보입니다."
                ]
            },

            // [12] 🏃 도루 & 주루 플레이 (STEAL PLAY) - 10 x 10 = 100 조합
            STEAL_PLAY: {
                casters: [
                    "뛰었습니다! 주자 스타트! 포수의 2루 송구... 세이프!! 베이스를 훔쳐냅니다!",
                    "단독 홈스틸 감행! 헤드퍼스트 슬라이딩 터치! 세이프!! 기적의 홈스틸 성공!!",
                    "도루 저지! 포수의 총알 같은 레이저 송구에 주자가 2루에서 태그아웃 당합니다!",
                    "3루를 향해 전력 질주! 슬라이딩 세이프! 득점권 찬스를 만들어냅니다!",
                    "완벽한 타이밍에 스타트를 끊었습니다! 포수가 송구조차 하지 못하는 무혈입성 도루!",
                    "더블 스틸 감행! 2루와 3루를 동시에 훔쳐내는 기막힌 더블 도루 성공!",
                    "포수의 팝타임 1.85초 레이저 송구! 2루에서 간발의 차로 주자를 잡아냅니다!",
                    "헤드퍼스트 슬라이딩으로 베이스 모서리를 스치며 세이프 판정을 이끌어냅니다!",
                    "홈스틸 저지! 포수가 홈플레이트를 온몸으로 블로킹하며 주자를 태그아웃 시킵니다!",
                    "투수의 모션을 완벽히 뺏어낸 영리한 도루! 상대 배터리가 허를 찔렸습니다!"
                ],
                analysts: [
                    "투수의 투구 동작 버릇(쿠세)을 완벽히 읽고 투구와 동시에 완벽한 스타트를 끊었네요.",
                    "포수의 팝타임(Pop Time)이 워낙 빨랐어요. 송구가 정확히 2루 베이스 위에 배달됐습니다.",
                    "홈스틸은 5% 미만의 확률을 뚫어야 하는 극단적인 작전인데, 주자의 센스가 기적을 만들었습니다.",
                    "슬라이딩할 때 오른손으로 베이스를 터치하며 태그를 피하는 주루 테크닉이 대단히 뛰어납니다.",
                    "투수가 주자를 전혀 묶어두지 못하고 퀵모션이 느렸기 때문에 포수로서도 어쩔 수가 없었습니다.",
                    "도루 저지는 팀의 실점 위기를 단숨에 지워버리고 수비 이닝을 끝내는 강력한 무기입니다.",
                    "주자의 리드 폭이 넓었는데도 침착하게 슬라이딩 궤적을 낮게 가져가 세이프를 얻어냈습니다.",
                    "상대 배터리가 변화구를 던질 타이밍을 정확하게 노리고 과감하게 스타트를 끊었습니다.",
                    "포수의 송구 궤적이 빗나가지 않고 2루수 글러브에 빨려 들어가듯 꽂힌 명품 송구였습니다.",
                    "주루 플레이 하나로 경기장의 템포를 완벽하게 지배하고 있습니다."
                ]
            },

            // [13] 🎯 스퀴즈 번트 작전 (TACTIC SQUEEZE) - 10 x 10 = 100 조합
            TACTIC_SQUEEZE: {
                casters: [
                    "번트 댔습니다! 3루 주자 홈으로 전력 질주! 슬라이딩... 세이프!! 결사 스퀴즈 번트 대성공!!",
                    "기습적인 스퀴즈 번트! 타자도 1루에서 살았습니다! 번트 안타와 득점이 동시에 터집니다!",
                    "완벽한 스퀴즈 작전! 투수와 포수 사이에 절묘하게 공을 떨구며 귀중한 1점을 짜냅니다!",
                    "3루 주자 결사 쇄도! 홈플레이트를 터치하며 세이프! 벤치의 작전 야구가 통했습니다!",
                    "스퀴즈 번트 성공! 타자는 1루에서 희생아웃 되었지만 3루 주자가 홈을 밟아 1점을 추가합니다!",
                    "기습 번트로 상대를 완전히 무너뜨립니다! 세이프티 스퀴즈의 완벽한 성공!",
                    "투수 앞 소프트 번트! 3루 주자가 헤드퍼스트 슬라이딩으로 홈을 훔쳐냅니다!",
                    "1점 차 박빙의 승부에서 터져 나온 천금 같은 스퀴즈 번트 성공!",
                    "타자의 정교한 번트 배트 컨트롤! 3루수가 잡을 수 없는 빈 곳으로 공을 굴렸습니다!",
                    "스퀴즈 성공으로 더그아웃 분위기가 최고조로 달아오릅니다! 귀중한 추가점 획득!"
                ],
                analysts: [
                    "벤치의 승부수가 완벽히 적중했습니다. 3루 주자의 과감한 쇄도와 타자의 부드러운 번트 터치가 만들어낸 1점입니다.",
                    "투수가 예측하지 못한 타이밍에 나온 기습 스퀴즈였어요. 상대 배터리를 완벽히 흔들었습니다.",
                    "번트는 힘을 빼고 배트 중심에 공의 충격을 흡수시키는 것이 핵심인데, 타자가 교과서적으로 댔습니다.",
                    "3루 주자가 투수의 릴리스와 동시에 망설임 없이 홈으로 쇄도한 과감성이 돋보였습니다.",
                    "단 1점을 뽑아내기 위한 작전 야구의 백미입니다. 승부처에서 이런 점수가 결국 승리를 가져옵니다.",
                    "상대 수비가 전진 수비를 하지 않고 장타를 경계하고 있던 허점을 벤치가 정확히 찔렀습니다.",
                    "타자가 공의 높낮이를 정확히 따라가며 배트를 수평으로 유지한 기술이 아주 훌륭했습니다.",
                    "실점 위기를 맞은 투수로서는 저런 스퀴즈 점수가 멘탈에 가장 큰 타격을 줍니다.",
                    "타자 주자도 전력 질주로 내야 안타까지 만들어내며 작전 성공률을 200%로 끌어올렸습니다.",
                    "상대 포수가 홈플레이트에서 블로킹할 틈조차 주지 않은 전광석화 같은 홈 쇄도였습니다."
                ]
            },

            // [14] ⚡ 히트 앤드 런 작전 (TACTIC HIT & RUN) - 10 x 10 = 100 조합
            TACTIC_HIT_AND_RUN: {
                casters: [
                    "주자 뛰고 타자 쳤습니다! 히트 앤드 런 가동! 외야 안타, 1루 주자는 3루까지 폭풍 진루!",
                    "히트 앤드 런! 주자가 미리 뛰었기 때문에 병살타를 완벽하게 막아냅니다!",
                    "런앤히트! 2루 베이스가 비어있는 틈을 타서 깨끗한 우전 안타가 터집니다!",
                    "작전 성공! 주자는 이미 2루를 돌아 3루로! 타자도 1루 안착, 무사 1, 3루 찬스!",
                    "주자의 빠른 스타트와 타자의 정교한 컨택트! 히트 앤드 런의 정석을 보여줍니다!",
                    "내야 땅볼이었지만 주자가 미리 뛰었기 때문에 1루에서만 아웃! 병살을 지워버립니다!",
                    "타자가 몸쪽 나쁜 공을 기술적으로 깎아쳐 안타를 만듭니다! 히트앤런 대성공!",
                    "완벽한 런앤히트 타이밍! 수비 시프트를 완전히 무너뜨리는 통렬한 좌전 안타!",
                    "주자가 2루 베이스를 밟고 3루까지 내달립니다! 단타 한 방에 2베이스를 질주하는 호주루!",
                    "벤치의 사인 교환 후 완벽하게 떨어진 히트앤런! 공격의 활로를 뚫어냅니다!"
                ],
                analysts: [
                    "주자의 사전 스타트 효과로 병살을 면하고 득점권 찬스를 이어갑니다. 작전 야구의 진수입니다.",
                    "어떤 코스로 오든 타자가 배트에 맞춰야 하는 고난도 작전인데, 침착하게 컨택을 해냈습니다.",
                    "주자가 2루로 뛰면서 유격수나 2루수가 베이스 커버를 들어가느라 수비 구멍이 생기는 것을 정확히 노렸습니다.",
                    "타자가 볼궤적을 끝까지 보고 결대로 밀어치면서 빈 곳으로 타구를 보내는 기술이 탁월했습니다.",
                    "히트앤런은 실패하면 주자가 도루자로 횡사할 수 있는 양날의 검인데, 완벽하게 성공시켰습니다.",
                    "1루 주자의 주력이 워낙 좋다 보니 외야 단타에도 무리 없이 3루까지 내달릴 수 있었습니다.",
                    "투수로서는 타자가 공을 건드리지 못하게 유인구를 던졌어야 했는데 제구가 존 근처로 몰렸습니다.",
                    "작전이 성공하면서 마운드의 투수는 주자 1, 3루의 극심한 압박감을 안게 됐습니다.",
                    "공격적인 팀 컬러가 그대로 드러나는 멋진 작전 수행이었습니다.",
                    "타자와 주자의 호흡이 톱니바퀴처럼 완벽하게 맞아떨어진 플레이입니다."
                ]
            },

            // [15] 🌪️ 런 앤드 히트 작전 (TACTIC RUN & HIT) - 10 x 10 = 100 조합
            TACTIC_RUN_AND_HIT: {
                casters: [
                    "런 앤드 히트! 타자가 볼을 골라내며 주자 2루 도루 세이프 성공!!",
                    "런 앤드 히트 정타 작렬! 주자와 타자가 완벽한 타이밍으로 안타를 만듭니다!",
                    "스마트한 작전 야구! 스트라이크만 노려쳐서 안타를 만들고 주자는 3루까지 질주합니다!",
                    "주자 스타트! 타자는 침착하게 볼을 거릅니다! 주자가 여유 있게 2루를 훔쳐냅니다!",
                    "런앤히트 가동! 좋은 공을 골라쳐서 깨끗한 중전 안타로 연결합니다!",
                    "나쁜 공은 치지 않고 볼넷과 도루를 동시에 챙기는 완벽한 런앤히트!",
                    "타자의 매서운 선구안! 볼 판정과 함께 주자가 득점권 2루에 안착합니다!",
                    "런앤히트 대성공! 주자의 스피드와 타자의 컨택트가 결합된 최고의 공격 플레이!",
                    "투수가 흔들립니다! 주자 도루와 타자 출루가 한 번에 완성됩니다!",
                    "벤치의 지능적인 사인이 또 한 번 적중합니다! 런 앤드 히트 완벽 성공!"
                ],
                analysts: [
                    "스마트한 작전 야구죠. 타자는 스트라이크만 노리고 나쁜 볼은 거르면서 도루를 살려냈습니다.",
                    "타자의 뛰어난 선구안과 주자의 빠른 발이 결합된 완벽한 런앤히트 플레이입니다.",
                    "히트앤런과 달리 타자에게 배팅 카운트 선택권을 주는 작전인데, 타자가 아주 지능적으로 대처했습니다.",
                    "볼이 들어오자 타자가 배트를 멈추고 주자에게 도루를 맡긴 판단력이 돋보였습니다.",
                    "스트라이크가 들어왔을 때는 +30%의 컨택 보너스를 살려 정타 장타를 만들어내는 위력적인 작전입니다.",
                    "상대 배터리가 볼카운트에서 주자를 견제하느라 볼을 던진 것을 역으로 이용했습니다.",
                    "주자가 2루에 들어가면서 이제 단타 하나면 언제든 득점이 가능한 사정권에 들어왔습니다.",
                    "타자의 집중력과 주자의 폭발적인 순간 가속도가 만들어낸 최고의 합작품입니다.",
                    "현대 야구에서 가장 세련되고 효율적인 작전 야구의 모범 사례를 보여주고 있습니다.",
                    "투수 입장에서는 타자도 상대해야 하고 주자도 막아야 하니 이중고에 시달릴 수밖에 없습니다."
                ]
            },

            // 기본 폴백 (DEFAULT) - 10 x 10 = 100 조합
            DEFAULT: {
                casters: [
                    "팽팽한 투타의 승부, 그라운드에 긴장감이 감돌고 있습니다!",
                    "타석의 집중력과 마운드의 제구력이 치열하게 맞서고 있습니다!",
                    "한 구 한 구에 승패가 엇갈릴 수 있는 긴박한 순간입니다!",
                    "마운드의 {pitcher}와 타석의 {batter}, 양보 없는 승부가 펼쳐집니다!",
                    "관중석의 숨죽인 침묵 속에 다음 투구가 준비됩니다!",
                    "오늘 경기 정말 예측할 수 없는 명승부로 흘러가고 있습니다!",
                    "공 하나에 팀의 운명이 걸려 있습니다. 집중해야 합니다!",
                    "날카로운 승부수가 오가는 그라운드, 다음 플레이를 주목해 주시기 바랍니다!",
                    "정우영과 이순철의 KBO 실황 중계, 계속해서 전해드립니다!",
                    "오늘 그라운드에 서 있는 선수들의 눈빛에서 진정한 프로의 열정이 느껴집니다!"
                ],
                analysts: [
                    "작은 디테일 하나가 승부를 가를 수 있는 중요한 순간입니다.",
                    "양 팀 선수들의 집중력이 아주 높은 수준을 유지하고 있습니다.",
                    "이런 긴장감 넘치는 상황일수록 기본기에 충실한 플레이가 나와야 합니다.",
                    "마운드와 타석의 수싸움이 아주 흥미진진하게 전개되고 있습니다.",
                    "벤치의 경기 운영 능력과 선수들의 위기관리 능력이 시험대에 올랐습니다.",
                    "지금 카운트에서는 볼 하나, 스트라이크 하나에 경기 판도가 완전히 뒤바뀔 수 있습니다.",
                    "실수를 줄이는 팀이 결국 마지막에 승리의 미소를 지을 수 있습니다.",
                    "양 팀 배터리의 볼배합 패턴이 이닝이 지날수록 고도화되고 있습니다.",
                    "타자의 컨디션과 투수의 구위가 팽팽하게 맞물려 있는 명승부입니다.",
                    "야구는 9회말 투아웃부터라는 말이 있듯이 끝까지 긴장을 늦출 수 없습니다."
                ]
            }
        };
    }
}
