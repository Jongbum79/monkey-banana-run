# 🎮 Smile Games (smile games.com)

> **회사/서비스명:** Smile Games (smile games.com)  
> **개발팀:** 최지훈, 박주아, 김이수, 최우영, 전준우  
> **서비스 형태:** GitHub Pages 기반 웹 브라우저 아케이드 멀티 게임 플랫폼  
> **플레이 링크:** [https://jongbum79.github.io/monkey-banana-run/](https://jongbum79.github.io/monkey-banana-run/)

---

## 🕹 수록 게임 목록 (4-in-1 아케이드)

1. 🍌 **원숭이의 바나나 런 (Monkey Banana Run)**
   - 흥덕초등학교에서 탈출하는 원숭이의 3D 러닝 & 사칙연산 관문 액션!
   - 뒤쫓아오는 고대 화염 드래곤을 피해 5레인 트랙을 질주하고 문제를 풀어 탈출하세요.
2. 🔨 **7구멍 신나는 두더지 잡기 (Mole Game)**
   - 6학년 눈높이에 맞춘 스튜디오급 3D 일러스트 아케이드 게임!
   - 헛스윙 시 -30점 감점 패널티, 잭팟 다이아몬드(+500점), 황금 두더지(+200점), 메카 폭탄병(-150점).
3. 🚀 **스페이스 워즈 (Space Wars: Retro 3D Shooter)**
   - 레트로 3D 우주 비행 슈팅 액션!
   - 몰려오는 운석과 적 함선을 요격하고 보스를 격파하세요.
4. ⚾ **3D 빅리그 프로야구 (Baseball Game)**
   - 실감 나는 3D 투구 궤적(직구, 슬라이더, 커브, 포크볼)과 타격 시뮬레이션!
   - 정확한 볼/스트라이크/파울/헛스윙 판정, 주자 주루 및 다이나믹 수비 연출.

---

## 📂 프로젝트 전체 구조 및 코드 위치

```plaintext
Jihun_Games/
├── index.html                   # 통합 게임 허브 & 전체 게임 컨테이너/HUD 진입점
├── style.css                    # 통합 CSS (반응형, 빈티지 코믹북 프레임, 게임별 스타일)
├── README.md                    # 프로젝트 명세 및 코드 위치 안내서
├── .nojekyll                    # GitHub Pages 정적 배포 설정
├── assets/
│   └── images/                  # 캐릭터 컨셉 아트 및 그래픽 리소스
└── js/
    ├── main.js                  # 게임 허브 라우터 & 바나나 런 메인 루프/이벤트 컨트롤러
    ├── Character.js             # 바나나 런 캐릭터 렌더링 & 애니메이션 엔진 (손오공/개구리/오리)
    ├── TrackManager.js          # 바나나 런 5레인 트랙, 장애물, 아이템, 도로 분기 관리
    ├── MathGate.js              # 바나나 런 수학 연산 관문 생성 및 정/오답 판정
    ├── Dragon.js                # 바나나 런 드래곤 추격자, 분노 게이지 & 프롤로그 연출
    ├── MoleGame.js              # 7구멍 두더지 잡기 게임 엔진 (3D SVG, 감점 패널티, 사운드)
    ├── SpaceGame.js             # 스페이스 워즈 3D 슈팅 게임 엔진
    ├── BaseballGame.js          # 3D 프로야구 게임 엔진 (투구 궤적, 판정, 주자, 수비)
    └── SoundManager.js          # Web Audio API 기반 통합 신디사이저 사운드/BGM 엔진
```

---

## 🔍 핵심 파일별 상세 코드 위치 및 역할

### 1. 웹 진입점 및 레이아웃
| 파일 경로 | 주요 역할 및 구성 요소 |
| :--- | :--- |
| [index.html](file:///Users/belltiger/Documents/Jihun_Games/index.html) | • **통합 게임 허브 모달** (`#hub-modal`) : 4개 게임 선택 및 전환 버튼<br>• **바나나 런 컨테이너** (`#canvas-container`, `.ui-overlay`)<br>• **두더지 잡기 컨테이너** (`#mole-game-container`)<br>• **스페이스 워즈 컨테이너** (`#space-game-container`)<br>• **야구 게임 컨테이너** (`#baseball-game-container`)<br>• 전역 랭킹 및 프로필 모달 |
| [style.css](file:///Users/belltiger/Documents/Jihun_Games/style.css) | • 빈티지 만화풍 테두리 (`.comic-frame`) 및 피너츠 말풍선<br>• 게임 선택 허브 및 모달 팝업 스타일<br>• 7구멍 두더지 잡기 전용 3D 정원 배경 & 디럭스 별 망치 애니메이션<br>• 스페이스 워즈 레트로 네온 HUD<br>• 야구 경기장 전광판 및 투구/타격 컨트롤러 스타일 |

---

### 2. 게임별 소스 코드 위치 (`js/`)

#### 🎮 [js/main.js](file:///Users/belltiger/Documents/Jihun_Games/js/main.js) (허브 라우터 & 바나나 런 메인)
- **게임 전환 허브 라우터**: `switchToHub()`, `switchToBananaGame()`, `switchToMoleGame()`, `switchToSpaceGame()`, `switchToBaseballGame()`
- **바나나 런 게임 루프**: `gameLoop()`, `startNewGame()`, `triggerGameOver()`
- **키보드 & 터치 입력 리스너**: 좌/우 이동, 점프, 슬라이딩, 시점 회전
- **OIIA CAT 룰렛 & 갈림길(1번/2번 도로) 선택 시스템**

#### 🍌 [js/Character.js](file:///Users/belltiger/Documents/Jihun_Games/js/Character.js) (바나나 런 캐릭터)
- **스누피/피너츠 카툰풍 3D 캐릭터 렌더링**: 원숭이, 개구리, 오리 캐릭터 지원
- **코스튬 & 진화**: 신사 복장, 손오공 긴고아/여의봉/근두운 진화 모드
- **모션 애니메이션**: 달리기, 점프, 슬라이딩, 피격, 공중제비

#### 🛣️ [js/TrackManager.js](file:///Users/belltiger/Documents/Jihun_Games/js/TrackManager.js) (바나나 런 트랙)
- **5개 레인 트랙 생성 및 곡선 렌더링**: 원근감 적용 의사 3D 트랙
- **장애물 관리**: 바위, 전갈, 상어, 자동차, 경사로 트럭 등
- **아이템 스폰**: 코인, 레이저총(레인 파괴), 슈퍼점프, 무적 방패, 손오공 변신

#### ➕ [js/MathGate.js](file:///Users/belltiger/Documents/Jihun_Games/js/MathGate.js) (수학 관문)
- 3개 문에 덧셈/뺄셈/곱셈/나눗셈 수학 문제 및 보기 자동 생성
- 정답 문 통과 시 보너스 점수 및 가속, 오답 문 충돌 시 체력 감소

#### 🐉 [js/Dragon.js](file:///Users/belltiger/Documents/Jihun_Games/js/Dragon.js) (추격자 드래곤)
- 뒤쫓아오는 거대 화염 드래곤 렌더링
- 거리 미터기(Dragon Meter) 및 분노 게이지
- 프롤로그 컷신 화염 방사 애니메이션

#### 🔨 [js/MoleGame.js](file:///Users/belltiger/Documents/Jihun_Games/js/MoleGame.js) (7구멍 두더지 잡기)
- **헛스윙 패널티**: 빈 구멍 타격 시 **`-30점` 감점**, 경고 팝업 및 버저음
- **스튜디오급 3D SVG 일러스트**:
  - 일반 힙스터 두더지 (+100점)
  - 황금 로열 두더지 (+200점)
  - **[NEW]** 잭팟 다이아몬드 두더지 (+500점, 콤보 +3)
  - 메카 밥옴 폭탄병 (-150점, 콤보 리셋)
- 2분 타이머, 콤보 배율 시스템, 키보드 `[ 1 ]` ~ `[ 7 ]` 및 모바일 터치 지원

#### 🚀 [js/SpaceGame.js](file:///Users/belltiger/Documents/Jihun_Games/js/SpaceGame.js) (스페이스 워즈)
- 3D 우주선 렌더링 및 콕핏 뷰
- 광자 레이저 발사, 실드 에너지 충전, 폭발 파티클
- 운석 요격 및 보스 함선 전투 로직

#### ⚾ [js/BaseballGame.js](file:///Users/belltiger/Documents/Jihun_Games/js/BaseballGame.js) (3D 프로야구)
- **투구 물리 엔진**: 직구, 슬라이더, 커브, 포크볼의 실감 나는 3D 궤적
- **판정 엔진**: 스트라이크 존 판정, 타이밍 기반 타격(안타/2루타/3루타/홈런/파울/헛스윙)
- **주자 & 수비 시스템**: 누상 주자 주루, 수비수 다이나믹 송구/포구 연출

#### 🔊 [js/SoundManager.js](file:///Users/belltiger/Documents/Jihun_Games/js/SoundManager.js) (통합 사운드)
- 별도 외부 오디오 파일 다운로드 없이 브라우저 **Web Audio API**로 실시간 신디사이징
- 점프음, 슬라이딩, 코인 획득, 폭발음, 두더지 타격음, 야구 배트 타구음, 레트로 BGM 등 전 장르 효과음 탑재

---

## 🕹 조작 방법 요약

### 1. 바나나 런
- **레인 이동:** `←` / `→` 또는 `A` / `D` (또는 숫자 `1` ~ `5`)
- **점프:** `Space` 또는 `↑` / `W`
- **슬라이딩 (급강하):** `↓` / `S`
- **뒤돌아보기:** `L`

### 2. 두더지 잡기
- **타격:** 키보드 `1` ~ `7` (상단 1~3, 하단 4~7) 또는 화면의 구멍을 직접 마우스 클릭 / 터치
- **주의:** 빈 구멍을 치면 **-30점 감점**!

### 3. 스페이스 워즈
- **비행 이동:** 방향키 (`←`, `→`, `↑`, `↓`) 또는 마우스 드래그
- **레이저 발사:** `Space` 또는 화면 탭

### 4. 3D 프로야구
- **타격 스윙:** `Space` 또는 화면의 [타격 스윙] 버튼
- **번트:** `B` 키
- **투구 시작:** `P` 키

---

## 🛠 로컬 개발 및 실행

별도의 빌드 도구나 Node.js 서버 없이 순수 HTML5, CSS3, JavaScript (Vanilla JS)로 구동됩니다.

```bash
# 1. 저장소 복제
git clone https://github.com/Jongbum79/monkey-banana-run.git
cd monkey-banana-run

# 2. 로컬 브라우저에서 index.html 열기 (또는 VS Code Live Server 등 사용)
open index.html
```
