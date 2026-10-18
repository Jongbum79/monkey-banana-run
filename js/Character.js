/**
 * Smile Games - 원숭이의 바나나 런
 * [Step 1] 주인공 캐릭터: 스누피(피너츠) 스타일 장난꾸러기 원숭이
 * 제작: 최지훈, 박주아, 김이수, 최우영, 전준우
 */

class MonkeyHero {
    constructor() {
        this.mesh = new THREE.Group();
        this.mesh.name = "MonkeyHero";

        // 애니메이션 & 조작 변수
        this.runCycle = 0;
        this.isJumping = false;
        this.jumpProgress = 0;
        this.jumpDuration = 0.55;
        this.jumpHeight = 2.4;
        this.baseY = 0;
        this.currentLane = 0; // -1: 좌, 0: 중, 1: 우
        this.targetX = 0;
        this.laneWidth = 2.4;

        // 눈 깜빡임 타이머
        this.blinkTimer = 0;
        this.isBlinking = false;

        this.initMaterials();
        this.buildCharacter();
        this.createThoughtBubble();
    }

    initMaterials() {
        // 스누피(피너츠) 스타일의 따뜻하고 플랫한 빈티지 수채화 톤 매터리얼
        // MeshToonMaterial을 사용하여 만화책 같은 단계적 음영 생성
        this.furMat = new THREE.MeshToonMaterial({ color: 0x9c6644 }); // 부드러운 코믹스 밀크브라운
        this.skinMat = new THREE.MeshToonMaterial({ color: 0xffedd8 }); // 따뜻한 크림 베이지
        this.inkMat = new THREE.MeshBasicMaterial({ color: 0x221d19 }); // 피너츠 특유의 흑색 잉크
        this.shirtMat = new THREE.MeshToonMaterial({ color: 0xd94e34 }); // 빈티지 피너츠 레드
        this.pantsMat = new THREE.MeshToonMaterial({ color: 0x3d5a80 }); // 차분한 레트로 블루
        this.shoeMat = new THREE.MeshToonMaterial({ color: 0xf4f1de }); // 오프화이트 캔버스화
        this.bananaMat = new THREE.MeshToonMaterial({ color: 0xf4d03f }); // 따뜻한 카툰 바나나 옐로우
        this.stemMat = new THREE.MeshToonMaterial({ color: 0x606c38 }); // 올리브 그린 꼭지

        // 만화 외곽선(Black Ink Outline)용 특수 매터리얼
        this.outlineMat = new THREE.MeshBasicMaterial({
            color: 0x221d19,
            side: THREE.BackSide
        });
    }

    // 메쉬에 잉크 윤곽선 추가 헬퍼
    addOutline(mesh, thickness = 0.04) {
        const outlineMesh = mesh.clone();
        outlineMesh.material = this.outlineMat;
        outlineMesh.scale.multiplyScalar(1 + thickness);
        mesh.parent ? mesh.parent.add(outlineMesh) : mesh.add(outlineMesh);
        return outlineMesh;
    }

    buildCharacter() {
        // ================= 1. 몸통 (Body) =================
        this.bodyGroup = new THREE.Group();
        
        // 상체 (빨간 티셔츠 - 피너츠의 단순하고 둥근 핏)
        const torsoGeo = new THREE.SphereGeometry(0.42, 16, 16);
        const torso = new THREE.Mesh(torsoGeo, this.shirtMat);
        torso.scale.set(0.9, 1.15, 0.85);
        torso.position.y = 1.05;
        torso.castShadow = true;
        this.bodyGroup.add(torso);
        this.addOutline(torso, 0.05);

        // 가슴의 피너츠 감성 노란 별 마크
        const starGeo = new THREE.CircleGeometry(0.1, 5);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(0, 1.1, 0.38);
        star.rotation.z = 0.3;
        this.bodyGroup.add(star);

        // 하체 (동글동글한 파란 반바지)
        const pantsGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const pants = new THREE.Mesh(pantsGeo, this.pantsMat);
        pants.scale.set(0.95, 0.7, 0.88);
        pants.position.y = 0.65;
        pants.castShadow = true;
        this.bodyGroup.add(pants);
        this.addOutline(pants, 0.05);

        this.mesh.add(this.bodyGroup);

        // ================= 2. 머리 (Head - 피너츠 특유의 둥근 실루엣) =================
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 1.7, 0.05);

        // 두상 (동그랗고 약간 타원형의 피너츠 헤드)
        const headGeo = new THREE.SphereGeometry(0.48, 20, 20);
        const head = new THREE.Mesh(headGeo, this.furMat);
        head.scale.set(1.08, 0.98, 0.95);
        head.castShadow = true;
        this.headGroup.add(head);
        this.addOutline(head, 0.04);

        // 얼굴 살구색 볼록한 마스크
        const faceGeo = new THREE.SphereGeometry(0.38, 16, 16);
        const face = new THREE.Mesh(faceGeo, this.skinMat);
        face.position.set(0, -0.06, 0.2);
        face.scale.set(0.92, 0.85, 0.55);
        this.headGroup.add(face);

        // 피너츠 특유의 귀여운 타원형 점눈 (Dot Eyes)
        this.eyes = [];
        [-0.14, 0.14].forEach((xPos) => {
            const eyeGeo = new THREE.SphereGeometry(0.048, 12, 12);
            const eye = new THREE.Mesh(eyeGeo, this.inkMat);
            eye.scale.set(0.8, 1.4, 0.6); // 슐츠 스타일의 세로로 긴 귀여운 점눈
            eye.position.set(xPos, 0.02, 0.44);
            this.headGroup.add(eye);
            this.eyes.push(eye);
        });

        // 앙증맞은 코 (작은 잉크 점)
        const noseGeo = new THREE.SphereGeometry(0.035, 10, 10);
        const nose = new THREE.Mesh(noseGeo, this.inkMat);
        nose.position.set(0, -0.06, 0.48);
        this.headGroup.add(nose);

        // 찰스 슐츠 특유의 잉크 선 스마일 입 (Torus 커브)
        const smileGeo = new THREE.TorusGeometry(0.12, 0.022, 8, 16, Math.PI * 0.7);
        const smile = new THREE.Mesh(smileGeo, this.inkMat);
        smile.position.set(0, -0.12, 0.44);
        smile.rotation.set(0.2, 0, -Math.PI * 0.85);
        this.headGroup.add(smile);

        // 양쪽 동그란 원숭이 귀 (피너츠풍 둥근 귀)
        [-0.52, 0.52].forEach((xPos) => {
            const earGroup = new THREE.Group();
            earGroup.position.set(xPos, 0.02, -0.05);

            const earOuter = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), this.furMat);
            earOuter.scale.set(0.4, 1.1, 1);
            earGroup.add(earOuter);
            this.addOutline(earOuter, 0.06);

            const earInner = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), this.skinMat);
            earInner.scale.set(0.3, 0.9, 0.8);
            earInner.position.set(xPos > 0 ? -0.05 : 0.05, 0, 0.05);
            earGroup.add(earInner);

            this.headGroup.add(earGroup);
        });

        // 정수리의 장난꾸러기 털 꽁지 2가닥 (스누피/찰리 브라운 펜선 느낌)
        const hairCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.45, 0),
            new THREE.Vector3(0.06, 0.6, -0.02),
            new THREE.Vector3(0.12, 0.65, -0.05)
        ]);
        const hairGeo = new THREE.TubeGeometry(hairCurve, 8, 0.025, 6, false);
        const hair = new THREE.Mesh(hairGeo, this.inkMat);
        this.headGroup.add(hair);

        this.mesh.add(this.headGroup);

        // ================= 3. 팔 & 황금 바나나 =================
        // 왼팔 (스윙하는 팔)
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.42, 1.35, 0);
        const lArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 12), this.furMat);
        lArmMesh.position.y = -0.25;
        this.leftArm.add(lArmMesh);
        this.addOutline(lArmMesh, 0.06);

        const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), this.skinMat);
        lHand.position.y = -0.52;
        this.leftArm.add(lHand);
        this.addOutline(lHand, 0.06);
        this.mesh.add(this.leftArm);

        // 오른팔 (바나나를 든 팔)
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.42, 1.35, 0);
        const rArmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.5, 12), this.furMat);
        rArmMesh.position.y = -0.25;
        this.rightArm.add(rArmMesh);
        this.addOutline(rArmMesh, 0.06);

        const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), this.skinMat);
        rHand.position.y = -0.52;
        this.rightArm.add(rHand);
        this.addOutline(rHand, 0.06);

        // 🍌 스누피 카툰 스타일 황금 바나나
        this.banana = this.createBanana();
        this.banana.position.set(0, -0.48, 0.28);
        this.banana.rotation.set(0.4, 0.2, -0.5);
        this.rightArm.add(this.banana);

        this.rightArm.rotation.x = -0.6;
        this.rightArm.rotation.z = -0.25;
        this.mesh.add(this.rightArm);

        // ================= 4. 다리 & 스니커즈 =================
        // 왼다리
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.2, 0.52, 0);
        const lLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.45, 10), this.furMat);
        lLegMesh.position.y = -0.2;
        this.leftLeg.add(lLegMesh);
        this.addOutline(lLegMesh, 0.06);

        const lShoe = this.createShoe();
        lShoe.position.set(0, -0.42, 0.06);
        this.leftLeg.add(lShoe);
        this.mesh.add(this.leftLeg);

        // 오른다리
        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.2, 0.52, 0);
        const rLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.45, 10), this.furMat);
        rLegMesh.position.y = -0.2;
        this.rightLeg.add(rLegMesh);
        this.addOutline(rLegMesh, 0.06);

        const rShoe = this.createShoe();
        rShoe.position.set(0, -0.42, 0.06);
        this.rightLeg.add(rShoe);
        this.mesh.add(this.rightLeg);

        // ================= 5. 꼬리 (Tail) =================
        this.tail = new THREE.Group();
        this.tail.position.set(0, 0.65, -0.32);
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0.25, -0.35),
            new THREE.Vector3(0.08, 0.65, -0.5),
            new THREE.Vector3(0, 0.95, -0.3),
            new THREE.Vector3(-0.05, 1.05, -0.15)
        ]);
        const tailGeo = new THREE.TubeGeometry(curve, 18, 0.055, 8, false);
        const tailMesh = new THREE.Mesh(tailGeo, this.furMat);
        this.tail.add(tailMesh);
        this.addOutline(tailMesh, 0.07);
        this.mesh.add(this.tail);
    }

    createBanana() {
        const bananaGroup = new THREE.Group();
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, -0.28, -0.04),
            new THREE.Vector3(0.07, -0.08, 0.07),
            new THREE.Vector3(0.08, 0.15, 0.05),
            new THREE.Vector3(0, 0.38, -0.08)
        ]);
        const bananaGeo = new THREE.TubeGeometry(curve, 20, 0.11, 8, false);
        const bananaMesh = new THREE.Mesh(bananaGeo, this.bananaMat);
        bananaMesh.castShadow = true;
        bananaGroup.add(bananaMesh);
        this.addOutline(bananaMesh, 0.08);

        // 바나나 꼭지 (녹색)
        const stemGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.09, 8);
        const stem = new THREE.Mesh(stemGeo, this.stemMat);
        stem.position.set(0, 0.42, -0.1);
        stem.rotation.x = -0.4;
        bananaGroup.add(stem);
        this.addOutline(stem, 0.08);

        return bananaGroup;
    }

    createShoe() {
        const shoeGroup = new THREE.Group();
        // 피너츠 특유의 뭉툭하고 둥근 카툰 신발
        const shoeGeo = new THREE.SphereGeometry(0.16, 12, 12);
        const shoe = new THREE.Mesh(shoeGeo, this.shoeMat);
        shoe.scale.set(0.9, 0.7, 1.4);
        shoeGroup.add(shoe);
        this.addOutline(shoe, 0.07);

        // 신발 앞코 고무선 (잉크)
        const toeBandGeo = new THREE.TorusGeometry(0.12, 0.015, 6, 12, Math.PI);
        const toeBand = new THREE.Mesh(toeBandGeo, this.inkMat);
        toeBand.position.set(0, -0.05, 0.12);
        toeBand.rotation.x = Math.PI / 2;
        shoeGroup.add(toeBand);

        return shoeGroup;
    }

    // 피너츠 감성의 생각 말풍선 (Thought Bubble)
    createThoughtBubble() {
        this.bubbleGroup = new THREE.Group();
        this.bubbleGroup.position.set(0.85, 2.3, 0);

        // 캔버스로 따뜻한 손글씨 텍스처 렌더링
        this.bubbleCanvas = document.createElement('canvas');
        this.bubbleCanvas.width = 512;
        this.bubbleCanvas.height = 256;
        this.bubbleCtx = this.bubbleCanvas.getContext('2d');
        this.bubbleTexture = new THREE.CanvasTexture(this.bubbleCanvas);

        this.updateThoughtText("바나나는 내 거야! 🍌");

        const bubblePlaneGeo = new THREE.PlaneGeometry(1.6, 0.8);
        const bubblePlaneMat = new THREE.MeshBasicMaterial({
            map: this.bubbleTexture,
            transparent: true,
            side: THREE.DoubleSide
        });
        const bubbleMesh = new THREE.Mesh(bubblePlaneGeo, bubblePlaneMat);
        this.bubbleGroup.add(bubbleMesh);

        this.mesh.add(this.bubbleGroup);
    }

    updateThoughtText(text) {
        const ctx = this.bubbleCtx;
        ctx.clearRect(0, 0, 512, 256);

        // 말풍선 배경 (흰색 구름 타원 + 검은 잉크 테두리)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#221d19';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.roundRect(20, 20, 472, 216, 40);
        ctx.fill();
        ctx.stroke();

        // 손글씨 피너츠풍 텍스트
        ctx.fillStyle = '#221d19';
        ctx.font = 'bold 38px "Pretendard", "Comic Sans MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);

        this.bubbleTexture.needsUpdate = true;
    }

    // 좌우 레인 변경 (-1, 0, 1)
    changeLane(direction) {
        const nextLane = this.currentLane + direction;
        if (nextLane >= -1 && nextLane <= 1) {
            this.currentLane = nextLane;
            this.targetX = this.currentLane * this.laneWidth;
            return true;
        }
        return false;
    }

    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.jumpProgress = 0;
            this.updateThoughtText("점프으~! 🚀");
        }
    }

    // 프레임 업데이트
    update(deltaTime) {
        // 1. 레인 X축 부드러운 이동 (Lerp)
        this.mesh.position.x += (this.targetX - this.mesh.position.x) * 12 * deltaTime;
        
        // 회전 뱅킹 효과
        const rollTarget = (this.targetX - this.mesh.position.x) * 0.22;
        this.mesh.rotation.z += (rollTarget - this.mesh.rotation.z) * 10 * deltaTime;

        // 2. 점프
        if (this.isJumping) {
            this.jumpProgress += deltaTime / this.jumpDuration;
            if (this.jumpProgress >= 1) {
                this.isJumping = false;
                this.mesh.position.y = this.baseY;
                this.updateThoughtText("용이 쫓아온다! 🏃");
            } else {
                this.mesh.position.y = this.baseY + Math.sin(this.jumpProgress * Math.PI) * this.jumpHeight;
            }
        }

        // 3. 눈 깜빡임 (피너츠의 귀여운 눈 깜빡임)
        this.blinkTimer += deltaTime;
        if (this.blinkTimer > 3.5) {
            this.isBlinking = true;
            this.eyes.forEach(eye => eye.scale.y = 0.1); // 납작하게 감김
            if (this.blinkTimer > 3.65) {
                this.eyes.forEach(eye => eye.scale.y = 1.4); // 다시 뜸
                this.blinkTimer = 0;
                this.isBlinking = false;
            }
        }

        // 4. 스누피 특유의 깡총깡총 경쾌한 스킵 러닝 사이클
        const runSpeed = 13;
        this.runCycle += deltaTime * runSpeed;

        if (!this.isJumping) {
            // 상하 통통 튀는 만화적 바운스
            this.mesh.position.y = this.baseY + Math.abs(Math.sin(this.runCycle)) * 0.16;

            // 다리 스윙
            const legSwing = Math.sin(this.runCycle) * 0.8;
            this.leftLeg.rotation.x = legSwing;
            this.rightLeg.rotation.x = -legSwing;

            // 왼팔 스윙
            this.leftArm.rotation.x = -legSwing * 0.95;

            // 오른팔 (바나나 쥔 손): 바나나를 소중하게 안고 살짝 까딱거림
            this.rightArm.rotation.x = -0.6 + Math.sin(this.runCycle * 0.5) * 0.12;

            // 꼬리 살랑살랑
            this.tail.rotation.y = Math.sin(this.runCycle * 0.7) * 0.35;
            this.tail.rotation.x = Math.cos(this.runCycle) * 0.18;

            // 머리 까딱거리는 피너츠 리듬
            this.headGroup.rotation.z = Math.sin(this.runCycle * 0.5) * 0.08;
        } else {
            // 점프 중 귀여운 포즈
            this.leftLeg.rotation.x = -0.4;
            this.rightLeg.rotation.x = -0.3;
            this.leftArm.rotation.x = -1.3;
            this.rightArm.rotation.x = -1.0;
        }

        // 말풍선 카메라 바라보기 (빌보드 효과)
        if (this.bubbleGroup) {
            this.bubbleGroup.quaternion.copy(this.mesh.quaternion).invert();
            // 살짝 위아래로 둥둥 떠있는 효과
            this.bubbleGroup.position.y = 2.3 + Math.sin(this.runCycle * 0.4) * 0.08;
        }
    }
}
