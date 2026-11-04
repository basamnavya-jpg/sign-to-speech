/**
 * Hand3D - High-Precision Articulated Sign Language Hand Visualizer
 * Fully anatomically rigged hand featuring:
 *  - Dark teal vertical cuff base with realistic contact shadow
 *  - Smooth clay-beige rounded palm & 3-segment cylindrical fingers with visible knuckle rings
 *  - Glowing cyan/emerald nodal points on all 5 fingertips & amber tracking knuckles
 *  - Authentic ASL gesture choreography for all 40 conversational sentences
 *  - Comprehensive ASL dictionary for all 82 word pills
 *  - 20 dynamic micro-motion kinematic waveforms (waving, tapping, circular rubs, nodding, etc.)
 *  - Multi-theme switching (Natural Skin, Smart Glove, Ceramic Studio)
 */

class Hand3DVisualizer {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    if (!this.container) {
      console.error(`Container #${canvasContainerId} not found.`);
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.handGroup = null;
    this.wristGroup = null;

    // Joint references for all 5 fingers: [baseJoint, midJoint, tipJoint]
    this.fingerJoints = {
      pinky: [],
      ring: [],
      middle: [],
      index: [],
      thumb: []
    };

    // Tracking Nodal Points references
    this.tipNodes = [];
    this.knuckleNodes = [];

    // Materials dictionary for dynamic theme switching
    this.materials = {};

    // Kinematic target and current values
    this.curlValues = { pinky: 0.08, ring: 0.08, middle: 0.08, index: 0.08, thumb: 0.08 };
    this.targetCurls = { pinky: 0.08, ring: 0.08, middle: 0.08, index: 0.08, thumb: 0.08 };

    this.spreadValues = { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.45 };
    this.targetSpreads = { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.45 };

    this.wristAngles = { pitch: 0, roll: 0, yaw: 0, y: 0 };
    this.targetWristAngles = { pitch: 0, roll: 0, yaw: 0, y: 0 };

    // Modes & Sequence Playback
    this.mode = "sensor"; // 'sensor' or 'library'
    this.isAnimatingSequence = false;
    this.sequenceQueue = [];
    this.sequenceIndex = 0;
    this.sequenceTimer = null;
    this.onSequenceStep = null;

    // Dynamic micro-motion
    this.motionType = "none";
    this.motionTime = 0;

    // Initialize Gesture Library & Sentence Choreography
    this.initGesturesLibrary();
    this.initSentenceChoreography();

    // Initialize Scene & Build Hand
    this.initThree();
    this.buildExactReferenceHand();
    this.animate();

    // Window resize listener
    window.addEventListener("resize", () => this.onResize());
  }

  initThree() {
    const width = this.container.clientWidth || 700;
    const height = this.container.clientHeight || 460;

    // 1. Scene with clean warm light cream background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfbf8f2);

    // 2. Camera: placed directly in front of the hand
    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    this.camera.position.set(0, 0.25, 4.2);

    // 3. Renderer with soft shadow maps and clean tone mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls (rotate with mouse, zoom with scroll)
    if (typeof THREE.OrbitControls !== "undefined") {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.minDistance = 2.2;
      this.controls.maxDistance = 7.5;
      this.controls.target.set(0, 0.15, 0);
      this.controls.maxPolarAngle = Math.PI / 1.7;
    }

    // 5. Studio Lighting Setup matching the reference screenshot
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.95);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(2.5, 5.0, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfef3c7, 0.5);
    fillLight.position.set(-2.5, 2.0, 2.0);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    rimLight.position.set(0, 2.0, -3.0);
    this.scene.add(rimLight);

    // Soft oval contact shadow on the floor beneath the teal cuff
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.25;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  buildExactReferenceHand() {
    this.handGroup = new THREE.Group();
    this.wristGroup = new THREE.Group();
    this.handGroup.add(this.wristGroup);
    this.scene.add(this.handGroup);

    this.handGroup.position.set(0, 0.1, 0);

    // Materials matching reference screenshot
    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x115e59,
      roughness: 0.38,
      metalness: 0.15
    });

    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xdedad1,
      roughness: 0.42,
      metalness: 0.05
    });

    const jointRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xaba59a,
      roughness: 0.5,
      metalness: 0.1
    });

    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9
    });

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      wireframe: false
    });

    const knuckleNodeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });

    this.materials = {
      cuff: cuffMaterial,
      hand: handMaterial,
      joint: jointRingMaterial,
      node: nodeMaterial,
      halo: haloMaterial,
      knuckle: knuckleNodeMat
    };

    // 1. Dark Teal Wrist Cuff (Vertical Cylinder Base)
    const cuffRadius = 0.42;
    const cuffHeight = 0.55;
    const cuffGeo = new THREE.CylinderGeometry(cuffRadius, cuffRadius * 1.05, cuffHeight, 32);
    const cuffMesh = new THREE.Mesh(cuffGeo, cuffMaterial);
    cuffMesh.position.set(0, -0.92, 0);
    cuffMesh.castShadow = true;
    this.wristGroup.add(cuffMesh);

    // 2. Smooth Rounded Palm Block
    const palmWidth = 1.18;
    const palmHeight = 1.08;
    const palmDepth = 0.42;
    const palmGeo = new THREE.BoxGeometry(palmWidth, palmHeight, palmDepth, 4, 4, 4);

    const pos = palmGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const factor = 0.94;
      pos.setXYZ(i, x * factor, y * factor, z * factor);
    }
    palmGeo.computeVertexNormals();

    const palmMesh = new THREE.Mesh(palmGeo, handMaterial);
    palmMesh.position.set(0, -0.12, 0);
    palmMesh.castShadow = true;
    this.wristGroup.add(palmMesh);

    // 3. Helper to create articulated segmented fingers
    const createArticulatedFinger = (name, xBase, yBase, lengths, radius, isThumb = false) => {
      const joints = [];
      const [l1, l2, l3] = lengths;

      const baseJoint = new THREE.Group();
      baseJoint.position.set(xBase, yBase, isThumb ? 0.08 : 0);

      // Knuckle Tracking Node Dot
      const kNodeGeo = new THREE.SphereGeometry(0.045, 16, 16);
      const kNodeMesh = new THREE.Mesh(kNodeGeo, knuckleNodeMat);
      kNodeMesh.position.set(0, 0, radius * 0.95);
      baseJoint.add(kNodeMesh);
      this.knuckleNodes.push(kNodeMesh);

      // Segment 1 (Proximal Phalanx)
      const seg1Group = new THREE.Group();
      const p1Geo = new THREE.CylinderGeometry(radius * 0.94, radius, l1, 24);
      p1Geo.translate(0, l1 / 2, 0);
      const p1Mesh = new THREE.Mesh(p1Geo, handMaterial);
      p1Mesh.castShadow = true;
      seg1Group.add(p1Mesh);

      const ring1Geo = new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, 0.04, 24);
      ring1Geo.translate(0, 0.02, 0);
      const ring1Mesh = new THREE.Mesh(ring1Geo, jointRingMaterial);
      seg1Group.add(ring1Mesh);
      baseJoint.add(seg1Group);

      // Segment 2 (Intermediate Phalanx)
      const midJoint = new THREE.Group();
      midJoint.position.set(0, l1, 0);

      const bead1Geo = new THREE.SphereGeometry(radius * 0.98, 16, 16);
      const bead1Mesh = new THREE.Mesh(bead1Geo, jointRingMaterial);
      midJoint.add(bead1Mesh);

      const p2Geo = new THREE.CylinderGeometry(radius * 0.86, radius * 0.94, l2, 24);
      p2Geo.translate(0, l2 / 2, 0);
      const p2Mesh = new THREE.Mesh(p2Geo, handMaterial);
      p2Mesh.castShadow = true;
      midJoint.add(p2Mesh);
      baseJoint.add(midJoint);

      // Segment 3 (Distal Phalanx + Fingertip)
      const tipJoint = new THREE.Group();
      tipJoint.position.set(0, l2, 0);

      const bead2Geo = new THREE.SphereGeometry(radius * 0.88, 16, 16);
      const bead2Mesh = new THREE.Mesh(bead2Geo, jointRingMaterial);
      tipJoint.add(bead2Mesh);

      const p3Geo = new THREE.CylinderGeometry(radius * 0.74, radius * 0.86, l3, 24);
      p3Geo.translate(0, l3 / 2, 0);
      const p3Mesh = new THREE.Mesh(p3Geo, handMaterial);
      p3Mesh.castShadow = true;
      tipJoint.add(p3Mesh);

      const domeGeo = new THREE.SphereGeometry(radius * 0.74, 24, 16);
      domeGeo.translate(0, l3, 0);
      const domeMesh = new THREE.Mesh(domeGeo, handMaterial);
      tipJoint.add(domeMesh);

      // Glowing Nodal Point on Fingertip
      const tipNodeGeo = new THREE.SphereGeometry(0.075, 18, 18);
      const tipNodeMesh = new THREE.Mesh(tipNodeGeo, nodeMaterial);
      tipNodeMesh.position.set(0, l3 + 0.04, 0);
      tipJoint.add(tipNodeMesh);

      const haloGeo = new THREE.SphereGeometry(0.125, 16, 16);
      const haloMesh = new THREE.Mesh(haloGeo, haloMaterial);
      haloMesh.position.set(0, l3 + 0.04, 0);
      tipJoint.add(haloMesh);

      this.tipNodes.push(tipNodeMesh);

      midJoint.add(tipJoint);
      joints.push(baseJoint, midJoint, tipJoint);
      this.wristGroup.add(baseJoint);
      this.fingerJoints[name] = joints;
    };

    const topY = 0.42;

    // 4. Assemble 5 Fingers (from pinky on left to thumb on right)
    createArticulatedFinger("pinky", -0.42, topY - 0.05, [0.36, 0.28, 0.24], 0.088);
    createArticulatedFinger("ring", -0.14, topY, [0.42, 0.34, 0.28], 0.092);
    createArticulatedFinger("middle", 0.14, topY + 0.04, [0.46, 0.38, 0.30], 0.095);
    createArticulatedFinger("index", 0.42, topY, [0.42, 0.34, 0.28], 0.092);
    createArticulatedFinger("thumb", 0.62, -0.05, [0.38, 0.30, 0.26], 0.098, true);

    this.fingerJoints.thumb[0].rotation.z = -0.65;
    this.fingerJoints.thumb[0].rotation.y = 0.25;

    this.setGesture("rest");
  }

  // Complete ASL Dictionary for all 82 Word Pills + Key Signs
  initGesturesLibrary() {
    this.gestures = {
      // Neutral & Base Signs
      rest: {
        curl: { pinky: 0.08, ring: 0.08, middle: 0.08, index: 0.08, thumb: 0.08 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.45 },
        wrist: { pitch: 0, roll: 0, yaw: 0, y: 0 },
        motion: "none",
        desc: "Relaxed open hand posture (Neutral resting position)"
      },

      hello: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.14, ring: 0.05, middle: -0.05, index: -0.14, thumb: 0.55 },
        wrist: { pitch: 0.08, roll: 0.08, yaw: 0, y: 0.1 },
        motion: "wave",
        desc: "Open palm waving greeting (ASL 'Hello / Hi')"
      },
      hi: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.14, ring: 0.05, middle: -0.05, index: -0.14, thumb: 0.55 },
        wrist: { pitch: 0.08, roll: 0.08, yaw: 0, y: 0.1 },
        motion: "wave",
        desc: "Casual wave gesture (ASL 'Hi')"
      },
      bye: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.12, ring: 0.04, middle: -0.04, index: -0.12, thumb: 0.50 },
        wrist: { pitch: 0.15, roll: 0.10, yaw: 0, y: 0.08 },
        motion: "wave",
        desc: "Waving palm farewell (ASL 'Goodbye')"
      },

      iloveyou: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.22, ring: 0.0, middle: 0.0, index: -0.16, thumb: 0.70 },
        wrist: { pitch: 0.06, roll: 0, yaw: 0, y: 0.08 },
        motion: "heartbeat",
        desc: "ASL 'I Love You' sign (Thumb, Index, Pinky extended upright)"
      },

      yes: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.92 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.0, roll: 0, yaw: 0, y: 0 },
        motion: "nod",
        desc: "Closed fist nodding up and down (ASL 'Yes' affirmation)"
      },

      no: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.72, index: 0.72, thumb: 0.68 },
        spread: { pinky: 0, ring: 0, middle: -0.02, index: 0.02, thumb: 0.15 },
        wrist: { pitch: 0.12, roll: 0, yaw: 0, y: 0 },
        motion: "pinch_snap",
        desc: "Index and middle fingers snapping down to thumb (ASL 'No')"
      },

      peace: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.0, index: 0.0, thumb: 0.88 },
        spread: { pinky: 0, ring: 0, middle: 0.14, index: -0.14, thumb: 0.15 },
        wrist: { pitch: 0.05, roll: 0, yaw: 0, y: 0.06 },
        motion: "nod",
        desc: "V-shape sign with Index and Middle extended (ASL 'Peace / V')"
      },

      help: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.80 },
        wrist: { pitch: -0.10, roll: 0, yaw: 0, y: 0.12 },
        motion: "lift",
        desc: "Thumbs-up resting on base palm lifting upward (ASL 'Help')"
      },

      where: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.06, roll: 0, yaw: 0, y: 0.08 },
        motion: "waggle",
        desc: "Index finger pointed upright waggling in question (ASL 'Where')"
      },

      what: {
        curl: { pinky: 0.05, ring: 0.05, middle: 0.05, index: 0.05, thumb: 0.1 },
        spread: { pinky: 0.18, ring: 0.08, middle: -0.08, index: -0.18, thumb: 0.60 },
        wrist: { pitch: 0.24, roll: 0, yaw: 0, y: -0.04 },
        motion: "waggle",
        desc: "Open upward palms shaking in inquiry (ASL 'What')"
      },

      when: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.12, roll: 0.10, yaw: 0, y: 0.04 },
        motion: "circle_rub",
        desc: "Index finger circling in time inquiry (ASL 'When')"
      },

      who: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.48, thumb: 0.50 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.18, roll: -0.12, yaw: 0, y: 0.06 },
        motion: "circle_rub",
        desc: "Index finger wiggling near lips (ASL 'Who')"
      },

      why: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.22, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.05 },
        motion: "forward_down",
        desc: "Y-hand pulling down from temple (ASL 'Why')"
      },

      water: {
        curl: { pinky: 0.98, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.88 },
        spread: { pinky: 0, ring: 0.08, middle: 0.0, index: -0.08, thumb: 0.1 },
        wrist: { pitch: 0.16, roll: -0.08, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "W-handshape (Index, Middle, Ring up) tapping chin (ASL 'Water')"
      },

      drink: {
        curl: { pinky: 0.36, ring: 0.36, middle: 0.36, index: 0.36, thumb: 0.32 },
        spread: { pinky: 0.04, ring: 0.02, middle: -0.02, index: -0.04, thumb: 0.45 },
        wrist: { pitch: 0.25, roll: -0.22, yaw: 0, y: 0.08 },
        motion: "drink_tip",
        desc: "C-hand tilted like a drinking cup to lips (ASL 'Drink')"
      },

      thankyou: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.32, roll: 0, yaw: 0, y: -0.04 },
        motion: "forward_down",
        desc: "Open flat hand extending forward from chin (ASL 'Thank You')"
      },
      thank: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.32, roll: 0, yaw: 0, y: -0.04 },
        motion: "forward_down",
        desc: "Flat hand extending forward from chin (ASL 'Thank')"
      },
      thanks: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.32, roll: 0, yaw: 0, y: -0.04 },
        motion: "forward_down",
        desc: "Flat hand extending forward from chin (ASL 'Thanks')"
      },

      please: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.35 },
        wrist: { pitch: -0.12, roll: 0.20, yaw: 0.08, y: 0 },
        motion: "circle_rub",
        desc: "Flat open hand circular rub on chest (ASL 'Please')"
      },

      sorry: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.50 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.2 },
        wrist: { pitch: -0.12, roll: 0.18, yaw: 0.06, y: 0 },
        motion: "circle_rub",
        desc: "A-fist circular rubbing motion on chest (ASL 'Sorry')"
      },

      bathroom: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.92, thumb: 0.52 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.08, roll: 0, yaw: 0, y: 0.04 },
        motion: "shake_t",
        desc: "T-handshape (thumb under index) shaking rapidly (ASL 'Bathroom')"
      },

      i: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.92 },
        spread: { pinky: 0.22, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.0, roll: 0, yaw: 0, y: 0.06 },
        motion: "heartbeat",
        desc: "Pinky finger extended upright (ASL letter 'I' / Self-reference)"
      },
      me: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: -0.22, roll: 0.18, yaw: 0, y: -0.04 },
        motion: "tap",
        desc: "Index finger pointed inward touching chest (ASL 'Me')"
      },
      my: {
        curl: { pinky: 0.04, ring: 0.04, middle: 0.04, index: 0.04, thumb: 0.05 },
        spread: { pinky: 0.05, ring: 0.02, middle: -0.02, index: -0.05, thumb: 0.35 },
        wrist: { pitch: -0.28, roll: 0.15, yaw: 0, y: -0.06 },
        motion: "heartbeat",
        desc: "Flat palm placed gently on chest (ASL 'My / Mine')"
      },

      you: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: 0.02 },
        motion: "nod",
        desc: "Index finger pointing directly forward (ASL 'You')"
      },
      your: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.05, ring: 0.02, middle: -0.02, index: -0.05, thumb: 0.35 },
        wrist: { pitch: 0.24, roll: 0, yaw: 0, y: 0.02 },
        motion: "forward_down",
        desc: "Flat open palm pushed gently forward (ASL 'Your')"
      },
      we: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.05, roll: 0, yaw: 0, y: 0.05 },
        motion: "sweep",
        desc: "Index finger arcing from right shoulder across to left (ASL 'We')"
      },

      name: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.0, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0.02, index: -0.02, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "H-handshape (Index & Middle straight) tapping twice (ASL 'Name')"
      },

      navya: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.65, index: 0.65, thumb: 0.45 },
        spread: { pinky: 0, ring: 0, middle: 0.02, index: -0.02, thumb: 0.1 },
        wrist: { pitch: 0.08, roll: 0, yaw: 0, y: 0.05 },
        motion: "nod",
        desc: "Fingerspelling letter 'N' folded over thumb (for Navya)"
      },

      nice: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.22, roll: -0.15, yaw: 0, y: 0 },
        motion: "sweep",
        desc: "Flat right palm wiping smoothly across base hand (ASL 'Nice')"
      },

      meet: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.08, roll: 0.15, yaw: 0, y: 0.05 },
        motion: "forward_down",
        desc: "Upright index fingers approaching each other (ASL 'Meet')"
      },

      how: {
        curl: { pinky: 0.45, ring: 0.45, middle: 0.45, index: 0.45, thumb: 0.35 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.45 },
        wrist: { pitch: -0.22, roll: 0.30, yaw: 0, y: 0 },
        motion: "brush_up",
        desc: "Curved cupped hands rolling upward in inquiry (ASL 'How')"
      },

      fine: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.16, ring: 0.06, middle: -0.06, index: -0.16, thumb: 0.65 },
        wrist: { pitch: -0.15, roll: 0.12, yaw: 0, y: 0.02 },
        motion: "flutter",
        desc: "Open 5-hand with thumb touching chest (ASL 'Fine')"
      },

      good: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: 0 },
        motion: "forward_down",
        desc: "Hand touching chin then moving down forward (ASL 'Good')"
      },

      bad: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.35, roll: 0.42, yaw: 0, y: -0.06 },
        motion: "chop",
        desc: "Hand touching chin then flipping downward sharply (ASL 'Bad')"
      },

      happy: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.10, ring: 0.04, middle: -0.04, index: -0.10, thumb: 0.45 },
        wrist: { pitch: -0.18, roll: 0, yaw: 0, y: 0.08 },
        motion: "brush_up",
        desc: "Open flat palm sweeping upward on chest repeatedly (ASL 'Happy')"
      },

      sad: {
        curl: { pinky: 0.20, ring: 0.20, middle: 0.20, index: 0.20, thumb: 0.20 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.35, roll: 0, yaw: 0, y: -0.14 },
        motion: "forward_down",
        desc: "Open hand drooping down over face (ASL 'Sad')"
      },

      feel: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.48, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.03, middle: -0.03, index: -0.08, thumb: 0.40 },
        wrist: { pitch: -0.16, roll: 0, yaw: 0, y: 0.05 },
        motion: "brush_up",
        desc: "Bent middle finger stroking up center of chest (ASL 'Feel')"
      },

      tired: {
        curl: { pinky: 0.45, ring: 0.45, middle: 0.45, index: 0.45, thumb: 0.35 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.36, roll: 0, yaw: 0, y: -0.12 },
        motion: "forward_down",
        desc: "Bent hands rolling down on chest in exhaustion (ASL 'Tired')"
      },

      need: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.65, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.26, roll: 0, yaw: 0, y: 0 },
        motion: "nod",
        desc: "Bent X-index finger pressing firmly downward (ASL 'Need / Must')"
      },

      want: {
        curl: { pinky: 0.46, ring: 0.46, middle: 0.46, index: 0.46, thumb: 0.40 },
        spread: { pinky: 0.12, ring: 0.04, middle: -0.04, index: -0.12, thumb: 0.45 },
        wrist: { pitch: 0.18, roll: 0, yaw: 0, y: 0.02 },
        motion: "pull_in",
        desc: "Curved claw hands reaching out and pulling inward (ASL 'Want')"
      },

      food: {
        curl: { pinky: 0.68, ring: 0.68, middle: 0.68, index: 0.68, thumb: 0.68 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.28, roll: -0.1, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "Fingertips bunched touching thumb tapping mouth (ASL 'Food')"
      },
      eat: {
        curl: { pinky: 0.68, ring: 0.68, middle: 0.68, index: 0.68, thumb: 0.68 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.28, roll: -0.1, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "Bunched fingertips tapping repeatedly to mouth (ASL 'Eat')"
      },
      hungry: {
        curl: { pinky: 0.42, ring: 0.42, middle: 0.42, index: 0.42, thumb: 0.36 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.20, roll: 0, yaw: 0, y: 0.04 },
        motion: "pull_in",
        desc: "C-handshape moving down chest (ASL 'Hungry')"
      },

      doctor: {
        curl: { pinky: 0.92, ring: 0.90, middle: 0.0, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0.02, index: -0.02, thumb: 0.1 },
        wrist: { pitch: 0.26, roll: -0.18, yaw: 0, y: 0.02 },
        motion: "tap",
        desc: "Fingers tapping wrist pulse point (ASL 'Doctor')"
      },

      hospital: {
        curl: { pinky: 0.96, ring: 0.96, middle: 0.0, index: 0.0, thumb: 0.90 },
        spread: { pinky: 0, ring: 0, middle: 0.01, index: -0.01, thumb: 0.1 },
        wrist: { pitch: 0.20, roll: 0, yaw: 0.06, y: 0.04 },
        motion: "cross_trace",
        desc: "H-handshape tracing a medical cross on shoulder (ASL 'Hospital')"
      },

      medicine: {
        curl: { pinky: 0.95, ring: 0.95, middle: 0.55, index: 0.95, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.03 },
        motion: "circle_rub",
        desc: "Bent middle finger grinding in open palm (ASL 'Medicine')"
      },

      sick: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.55, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.22, roll: -0.15, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "Bent middle finger touching forehead and stomach (ASL 'Sick')"
      },

      pain: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.05 },
        motion: "twist",
        desc: "Index fingers twisting toward each other in sharp pain (ASL 'Pain')"
      },
      hurt: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.05 },
        motion: "twist",
        desc: "Index fingers pointing toward each other and twisting (ASL 'Hurt')"
      },

      call: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.24, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.22, roll: -0.28, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "Y-phone sign held near ear and mouth (ASL 'Call / Phone')"
      },
      phone: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.24, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.22, roll: -0.28, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "Y-handshape phone at ear (ASL 'Phone')"
      },

      go: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.35, roll: 0, yaw: 0, y: 0 },
        motion: "forward_down",
        desc: "Index fingers swinging forward and outward (ASL 'Go')"
      },
      come: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.28, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: -0.15, roll: 0, yaw: 0, y: 0.04 },
        motion: "pull_in",
        desc: "Index fingers beckoning inward toward body (ASL 'Come')"
      },

      wait: {
        curl: { pinky: 0.22, ring: 0.22, middle: 0.22, index: 0.22, thumb: 0.20 },
        spread: { pinky: 0.16, ring: 0.06, middle: -0.06, index: -0.16, thumb: 0.40 },
        wrist: { pitch: 0.18, roll: 0, yaw: 0, y: 0.04 },
        motion: "flutter",
        desc: "Fluttering spread fingers upright gesturing (ASL 'Wait')"
      },

      stop: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.04, ring: 0.01, middle: -0.01, index: -0.04, thumb: 0.35 },
        wrist: { pitch: 0.20, roll: -0.35, yaw: 0, y: -0.04 },
        motion: "chop",
        desc: "Hand chopping down firmly across open palm (ASL 'Stop')"
      },

      school: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.16, roll: 0, yaw: 0, y: 0.03 },
        motion: "tap",
        desc: "Flat palms clapping together twice (ASL 'School')"
      },

      morning: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.03, middle: -0.03, index: -0.08, thumb: 0.35 },
        wrist: { pitch: -0.15, roll: 0, yaw: 0, y: 0.18 },
        motion: "brush_up",
        desc: "Hand rising upward like the morning dawn (ASL 'Morning')"
      },

      night: {
        curl: { pinky: 0.35, ring: 0.35, middle: 0.35, index: 0.35, thumb: 0.25 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.38, roll: 0, yaw: 0, y: -0.06 },
        motion: "chop",
        desc: "Bent hand curving over horizontal wrist (ASL 'Night')"
      },

      day: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.10, roll: 0.25, yaw: 0, y: 0.05 },
        motion: "arch",
        desc: "Index finger arching across the sky like the sun (ASL 'Day')"
      },

      time: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.15, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.22, roll: 0, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "Index finger tapping wrist watch location (ASL 'Time')"
      },

      now: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.22, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: -0.10 },
        motion: "nod",
        desc: "Bent Y-hands pressing down firmly (ASL 'Now')"
      },
      today: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.22, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: -0.10 },
        motion: "nod",
        desc: "Double downward pressing Y-hands (ASL 'Today')"
      },
      tomorrow: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.15 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.55 },
        wrist: { pitch: 0.15, roll: -0.18, yaw: 0, y: 0.05 },
        motion: "forward_down",
        desc: "A-hand with thumb stroking cheek forward (ASL 'Tomorrow')"
      },

      understand: {
        curl: { pinky: 0.95, ring: 0.95, middle: 0.95, index: 0.0, thumb: 0.80 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: -0.15, roll: 0, yaw: 0, y: 0.06 },
        motion: "lift",
        desc: "Index finger flicking up from fist near temple (ASL 'Understand')"
      },

      again: {
        curl: { pinky: 0.48, ring: 0.48, middle: 0.48, index: 0.48, thumb: 0.38 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.28, roll: 0, yaw: 0, y: 0.04 },
        motion: "arch",
        desc: "Bent hand arching into open base palm (ASL 'Again / Repeat')"
      },

      emergency: {
        curl: { pinky: 0.85, ring: 0.85, middle: 0.85, index: 0.85, thumb: 0.70 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.10, roll: 0, yaw: 0, y: 0.05 },
        motion: "shake_t",
        desc: "E-handshape vibrating in alert (ASL 'Emergency')"
      },
      exit: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.28, roll: 0, yaw: 0, y: 0 },
        motion: "forward_down",
        desc: "Index finger pointing outward toward the exit door (ASL 'Exit')"
      },

      see: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.0, index: 0.0, thumb: 0.88 },
        spread: { pinky: 0, ring: 0, middle: 0.12, index: -0.12, thumb: 0.15 },
        wrist: { pitch: 0.12, roll: 0, yaw: 0, y: 0.05 },
        motion: "forward_down",
        desc: "V-handshape moving forward from eyes (ASL 'See')"
      },

      home: {
        curl: { pinky: 0.70, ring: 0.70, middle: 0.70, index: 0.70, thumb: 0.65 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.25, roll: -0.12, yaw: 0, y: 0.06 },
        motion: "tap",
        desc: "Bunched fingers touching chin then cheek (ASL 'Home')"
      },

      sleep: {
        curl: { pinky: 0.75, ring: 0.75, middle: 0.75, index: 0.75, thumb: 0.70 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.30, roll: 0, yaw: 0, y: -0.10 },
        motion: "forward_down",
        desc: "Open hand closing down into pinch over face (ASL 'Sleep')"
      },

      like: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.55, index: 0.0, thumb: 0.50 },
        spread: { pinky: 0.10, ring: 0.03, middle: -0.03, index: -0.10, thumb: 0.40 },
        wrist: { pitch: -0.15, roll: 0, yaw: 0, y: 0 },
        motion: "pull_in",
        desc: "Thumb and middle finger pinching chest and pulling out (ASL 'Like')"
      },
      love: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.92 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: -0.18, roll: 0.12, yaw: 0, y: 0 },
        motion: "heartbeat",
        desc: "Crossed S-fists folded warmly over chest (ASL 'Love')"
      },

      book: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.04, ring: 0.01, middle: -0.01, index: -0.04, thumb: 0.30 },
        wrist: { pitch: 0.18, roll: -0.22, yaw: 0, y: 0.02 },
        motion: "sweep",
        desc: "Joined palms opening outward like a book (ASL 'Book')"
      },

      here: {
        curl: { pinky: 0.08, ring: 0.08, middle: 0.08, index: 0.08, thumb: 0.10 },
        spread: { pinky: 0.12, ring: 0.04, middle: -0.04, index: -0.12, thumb: 0.50 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: -0.05 },
        motion: "circle_rub",
        desc: "Open palms facing up circling gently (ASL 'Here')"
      },

      write: {
        curl: { pinky: 0.95, ring: 0.95, middle: 0.90, index: 0.65, thumb: 0.60 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.22, roll: 0, yaw: 0, y: 0.03 },
        motion: "circle_rub",
        desc: "Pinched fingers writing across base palm (ASL 'Write')"
      },

      family: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.65, thumb: 0.60 },
        spread: { pinky: 0.12, ring: 0.06, middle: -0.02, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.05 },
        motion: "roll_circles",
        desc: "F-handshapes circling together in a family ring (ASL 'Family')"
      },
      friend: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.55, thumb: 0.75 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "Interlocking curved X-index fingers (ASL 'Friend')"
      },

      correct: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.20, roll: 0, yaw: 0, y: 0.02 },
        motion: "chop",
        desc: "Index fingers crossing firmly down in affirmation (ASL 'Correct')"
      },

      excuse: {
        curl: { pinky: 0.45, ring: 0.45, middle: 0.45, index: 0.45, thumb: 0.35 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: 0.25, roll: 0, yaw: 0, y: 0.02 },
        motion: "brush_up",
        desc: "Curved fingertips brushing across open palm (ASL 'Excuse Me')"
      },

      learn: {
        curl: { pinky: 0.65, ring: 0.65, middle: 0.65, index: 0.65, thumb: 0.60 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: -0.20, roll: 0, yaw: 0, y: 0.15 },
        motion: "lift",
        desc: "Cupped hand lifting knowledge to forehead (ASL 'Learn')"
      },

      sign: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.85 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.10, roll: 0, yaw: 0, y: 0.05 },
        motion: "roll_circles",
        desc: "Index fingers rolling in alternating backward circles (ASL 'Sign Language')"
      },

      talk: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.90 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.1 },
        wrist: { pitch: 0.20, roll: -0.15, yaw: 0, y: 0.05 },
        motion: "tap",
        desc: "4 fingers extended tapping chin (ASL 'Talk')"
      },

      car: {
        curl: { pinky: 0.85, ring: 0.85, middle: 0.85, index: 0.85, thumb: 0.75 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.10, roll: 0.25, yaw: 0, y: 0.04 },
        motion: "twist",
        desc: "Both fists steering car wheel back and forth (ASL 'Car / Drive')"
      },

      cold: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.90 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.05, roll: 0, yaw: 0, y: 0.04 },
        motion: "shake_t",
        desc: "Shivering closed fists trembling from cold (ASL 'Cold')"
      },

      hot: {
        curl: { pinky: 0.45, ring: 0.45, middle: 0.45, index: 0.45, thumb: 0.35 },
        spread: { pinky: 0.08, ring: 0.02, middle: -0.02, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.35, roll: 0, yaw: 0, y: 0 },
        motion: "forward_down",
        desc: "Claw hand at mouth pulling away quickly (ASL 'Hot')"
      },

      mother: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.12, ring: 0.04, middle: -0.04, index: -0.12, thumb: 0.65 },
        wrist: { pitch: 0.20, roll: -0.10, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "Open 5-hand with thumb tapping chin (ASL 'Mother')"
      },
      father: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.12, ring: 0.04, middle: -0.04, index: -0.12, thumb: 0.65 },
        wrist: { pitch: -0.22, roll: 0, yaw: 0, y: 0.16 },
        motion: "lift",
        desc: "Open 5-hand with thumb tapping forehead (ASL 'Father')"
      },

      know: {
        curl: { pinky: 0.50, ring: 0.50, middle: 0.50, index: 0.50, thumb: 0.40 },
        spread: { pinky: 0.06, ring: 0.02, middle: -0.02, index: -0.06, thumb: 0.35 },
        wrist: { pitch: -0.18, roll: -0.12, yaw: 0, y: 0.08 },
        motion: "tap",
        desc: "Bent fingertips tapping temple (ASL 'Know')"
      },

      later: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.28, roll: 0, yaw: 0, y: 0.02 },
        motion: "forward_down",
        desc: "L-hand pitching forward like clock hand (ASL 'Later')"
      },

      more: {
        curl: { pinky: 0.68, ring: 0.68, middle: 0.68, index: 0.68, thumb: 0.65 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.22, roll: 0, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "Flattened O-hands tapping fingertips together (ASL 'More')"
      },

      play: {
        curl: { pinky: 0.0, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.0 },
        spread: { pinky: 0.22, ring: 0, middle: 0, index: 0, thumb: 0.75 },
        wrist: { pitch: 0.08, roll: 0, yaw: 0, y: 0.05 },
        motion: "twist",
        desc: "Y-hands twisting side to side playfully (ASL 'Play')"
      },

      work: {
        curl: { pinky: 0.98, ring: 0.98, middle: 0.98, index: 0.98, thumb: 0.88 },
        spread: { pinky: 0, ring: 0, middle: 0, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.20, roll: 0, yaw: 0, y: 0.04 },
        motion: "tap",
        desc: "S-fist tapping top of base wrist (ASL 'Work')"
      },

      okay: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.65, thumb: 0.60 },
        spread: { pinky: 0.12, ring: 0.06, middle: -0.02, index: 0, thumb: 0.1 },
        wrist: { pitch: 0.08, roll: 0, yaw: 0, y: 0.04 },
        motion: "nod",
        desc: "O-K sign with index and thumb touching (ASL 'Okay')"
      },

      wonderful: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.14, ring: 0.05, middle: -0.05, index: -0.14, thumb: 0.55 },
        wrist: { pitch: -0.22, roll: 0, yaw: 0, y: 0.18 },
        motion: "brush_up",
        desc: "Both open palms pushed upward in joy (ASL 'Wonderful')"
      },

      all: {
        curl: { pinky: 0.0, ring: 0.0, middle: 0.0, index: 0.0, thumb: 0.0 },
        spread: { pinky: 0.08, ring: 0.03, middle: -0.03, index: -0.08, thumb: 0.40 },
        wrist: { pitch: 0.15, roll: 0, yaw: 0, y: 0.08 },
        motion: "sweep",
        desc: "Open hand sweeping across in an inclusive arc (ASL 'All / Everyone')"
      }
    };
  }

  // Curated ASL choreography for all 40 conversational sentences
  initSentenceChoreography() {
    this.sentenceChoreography = {
      "hello my name is navya": [
        { token: "HELLO", gesture: "hello", desc: "Open palm waving greeting (ASL 'Hello')" },
        { token: "MY", gesture: "my", desc: "Flat palm placed gently on chest (ASL 'My')" },
        { token: "NAME", gesture: "name", desc: "H-fingers tapping in rhythmic sign (ASL 'Name')" },
        { token: "NAVYA", gesture: "navya", desc: "Fingerspelling letter 'N' folded over thumb (for Navya)" }
      ],

      "nice to meet you": [
        { token: "NICE", gesture: "nice", desc: "Flat palms wiping smoothly across (ASL 'Nice')" },
        { token: "MEET", gesture: "meet", desc: "Upright index fingers meeting each other (ASL 'Meet')" },
        { token: "YOU", gesture: "you", desc: "Index finger pointing directly forward (ASL 'You')" }
      ],

      "how are you today": [
        { token: "HOW", gesture: "how", desc: "Cupped palms rolling upward in inquiry (ASL 'How')" },
        { token: "YOU", gesture: "you", desc: "Index finger pointing forward (ASL 'You')" },
        { token: "TODAY", gesture: "today", desc: "Downward pressing Y-hands indicating 'Today'" }
      ],

      "i am fine thank you": [
        { token: "I", gesture: "i", desc: "Pinky extended upright in ASL 'I'" },
        { token: "FINE", gesture: "fine", desc: "Open 5-hand with thumb touching chest (ASL 'Fine')" },
        { token: "THANK YOU", gesture: "thankyou", desc: "Flat hand extending forward from chin (ASL 'Thank You')" }
      ],

      "i love you": [
        { token: "I LOVE YOU", gesture: "iloveyou", desc: "ASL 'I Love You' sign with pulsing heartbeat" }
      ],

      "can i have some water please": [
        { token: "WANT", gesture: "want", desc: "Clawed hands reaching and pulling in (ASL 'Want')" },
        { token: "WATER", gesture: "water", desc: "W-handshape tapping lips (ASL 'Water')" },
        { token: "PLEASE", gesture: "please", desc: "Flat palm circular rub on chest (ASL 'Please')" }
      ],

      "i need help": [
        { token: "I", gesture: "i", desc: "Pinky upright in self-reference (ASL 'I')" },
        { token: "NEED", gesture: "need", desc: "Bent index finger pressing downward (ASL 'Need')" },
        { token: "HELP", gesture: "help", desc: "Thumbs-up lifting upward for support (ASL 'Help')" }
      ],

      "please call a doctor": [
        { token: "PLEASE", gesture: "please", desc: "Circular chest rubbing motion (ASL 'Please')" },
        { token: "CALL", gesture: "call", desc: "Y-phone sign at ear and mouth (ASL 'Call')" },
        { token: "DOCTOR", gesture: "doctor", desc: "Tapping pulse point on wrist (ASL 'Doctor')" }
      ],

      "where is the bathroom": [
        { token: "BATHROOM", gesture: "bathroom", desc: "T-handshape shaking side to side (ASL 'Bathroom')" },
        { token: "WHERE", gesture: "where", desc: "Index finger waggling in inquiry (ASL 'Where')" }
      ],

      "i am hungry i want food": [
        { token: "HUNGRY", gesture: "hungry", desc: "C-hand sliding down chest (ASL 'Hungry')" },
        { token: "WANT", gesture: "want", desc: "Claw hands drawing inward (ASL 'Want')" },
        { token: "FOOD", gesture: "food", desc: "Fingertips bunched tapping mouth (ASL 'Food / Eat')" }
      ],

      "i want to drink water": [
        { token: "WANT", gesture: "want", desc: "Claw hands drawing inward (ASL 'Want')" },
        { token: "DRINK", gesture: "drink", desc: "C-cup tilted to mouth (ASL 'Drink')" },
        { token: "WATER", gesture: "water", desc: "W-handshape tapping chin (ASL 'Water')" }
      ],

      "please wait for me": [
        { token: "PLEASE", gesture: "please", desc: "Circular rub on chest (ASL 'Please')" },
        { token: "WAIT", gesture: "wait", desc: "Spread fingers fluttering upright (ASL 'Wait')" },
        { token: "ME", gesture: "me", desc: "Index finger pointing to chest (ASL 'Me')" }
      ],

      "i go to school every morning": [
        { token: "I", gesture: "i", desc: "Pointing to chest (ASL 'I')" },
        { token: "GO", gesture: "go", desc: "Index fingers swinging forward (ASL 'Go')" },
        { token: "SCHOOL", gesture: "school", desc: "Palms clapping twice (ASL 'School')" },
        { token: "MORNING", gesture: "morning", desc: "Hand rising up like sunrise (ASL 'Morning')" }
      ],

      "what time is it now": [
        { token: "TIME", gesture: "time", desc: "Index finger tapping wrist watch (ASL 'Time')" },
        { token: "WHAT", gesture: "what", desc: "Open palms shaking in inquiry (ASL 'What')" },
        { token: "NOW", gesture: "now", desc: "Bent Y-hands pressing down (ASL 'Now')" }
      ],

      "i do not understand": [
        { token: "I", gesture: "i", desc: "Pointing to chest (ASL 'I')" },
        { token: "UNDERSTAND", gesture: "understand", desc: "Index finger flicking up at temple (ASL 'Understand')" },
        { token: "NO", gesture: "no", desc: "Index and middle snapping shut (ASL 'No / Negation')" }
      ],

      "could you repeat that please": [
        { token: "AGAIN", gesture: "again", desc: "Bent hand arching into palm (ASL 'Again / Repeat')" },
        { token: "PLEASE", gesture: "please", desc: "Circular chest rubbing motion (ASL 'Please')" }
      ],

      "where is the emergency exit": [
        { token: "EMERGENCY", gesture: "emergency", desc: "E-hand vibrating alert (ASL 'Emergency')" },
        { token: "EXIT", gesture: "exit", desc: "Index pointing outward path (ASL 'Exit / Go')" },
        { token: "WHERE", gesture: "where", desc: "Questioning index waggle (ASL 'Where')" }
      ],

      "i am feeling very tired": [
        { token: "FEEL", gesture: "feel", desc: "Middle finger brushing up chest (ASL 'Feel')" },
        { token: "TIRED", gesture: "tired", desc: "Bent hands rolling down in exhaustion (ASL 'Tired')" }
      ],

      "thank you for your help": [
        { token: "THANK YOU", gesture: "thankyou", desc: "Flat hand extending forward from chin (ASL 'Thank You')" },
        { token: "YOUR", gesture: "your", desc: "Flat palm pushing gently forward (ASL 'Your')" },
        { token: "HELP", gesture: "help", desc: "Thumbs up lifting upward (ASL 'Help')" }
      ],

      "see you tomorrow": [
        { token: "SEE", gesture: "see", desc: "V-hand moving forward from eyes (ASL 'See')" },
        { token: "YOU", gesture: "you", desc: "Index pointing forward (ASL 'You')" },
        { token: "TOMORROW", gesture: "tomorrow", desc: "A-thumb stroking cheek forward (ASL 'Tomorrow')" }
      ],

      "where are you going": [
        { token: "YOU", gesture: "you", desc: "Index pointing forward (ASL 'You')" },
        { token: "GO", gesture: "go", desc: "Index fingers swinging outward (ASL 'Going')" },
        { token: "WHERE", gesture: "where", desc: "Open palms shaking in inquiry (ASL 'Where')" }
      ],

      "i feel happy today": [
        { token: "FEEL", gesture: "feel", desc: "Middle finger brushed up chest (ASL 'Feel')" },
        { token: "HAPPY", gesture: "happy", desc: "Open palms sweeping upward with joy (ASL 'Happy')" },
        { token: "TODAY", gesture: "today", desc: "Downward pressing palms (ASL 'Today')" }
      ],

      "i am feeling sick and have pain": [
        { token: "SICK", gesture: "sick", desc: "Bent middle finger touching forehead/stomach (ASL 'Sick')" },
        { token: "PAIN", gesture: "pain", desc: "Index fingers twisting toward each other (ASL 'Pain')" }
      ],

      "please take me home": [
        { token: "PLEASE", gesture: "please", desc: "Circular chest rubbing motion (ASL 'Please')" },
        { token: "HOME", gesture: "home", desc: "Bunched fingertips touching chin then cheek (ASL 'Home')" },
        { token: "ME", gesture: "me", desc: "Pointing to chest (ASL 'Me')" }
      ],

      "what is your name": [
        { token: "YOUR", gesture: "your", desc: "Flat open palm pushing forward (ASL 'Your')" },
        { token: "NAME", gesture: "name", desc: "H-fingers tapping twice (ASL 'Name')" },
        { token: "WHAT", gesture: "what", desc: "Open palms shaking in inquiry (ASL 'What')" }
      ],

      "can you help me": [
        { token: "YOU", gesture: "you", desc: "Index finger pointing forward (ASL 'You')" },
        { token: "HELP", gesture: "help", desc: "Thumbs up lifting upward (ASL 'Help')" },
        { token: "ME", gesture: "me", desc: "Pointing to chest (ASL 'Me')" }
      ],

      "good morning everyone": [
        { token: "GOOD", gesture: "good", desc: "Hand moving from chin forward (ASL 'Good')" },
        { token: "MORNING", gesture: "morning", desc: "Hand rising up like sunrise (ASL 'Morning')" },
        { token: "ALL", gesture: "all", desc: "Open hand sweeping in broad arc (ASL 'Everyone')" }
      ],

      "good night sleep well": [
        { token: "GOOD", gesture: "good", desc: "Hand moving from chin forward (ASL 'Good')" },
        { token: "NIGHT", gesture: "night", desc: "Cupped hand curving over wrist (ASL 'Night')" },
        { token: "SLEEP", gesture: "sleep", desc: "Open hand closing into pinch over face (ASL 'Sleep')" }
      ],

      "i like reading books": [
        { token: "I", gesture: "i", desc: "Pointing to chest (ASL 'I')" },
        { token: "LIKE", gesture: "like", desc: "Thumb & middle finger pinching chest (ASL 'Like')" },
        { token: "BOOK", gesture: "book", desc: "Palms opening outward like a book (ASL 'Book')" }
      ],

      "is the doctor here today": [
        { token: "DOCTOR", gesture: "doctor", desc: "Tapping pulse point on wrist (ASL 'Doctor')" },
        { token: "HERE", gesture: "here", desc: "Palms flat circling gently (ASL 'Here')" },
        { token: "TODAY", gesture: "today", desc: "Palms pressing downward (ASL 'Today')" }
      ],

      "i need some medicine": [
        { token: "I", gesture: "i", desc: "Pointing to chest (ASL 'I')" },
        { token: "NEED", gesture: "need", desc: "Bent index finger pressing downward (ASL 'Need')" },
        { token: "MEDICINE", gesture: "medicine", desc: "Middle finger grinding in palm (ASL 'Medicine')" }
      ],

      "please write it down for me": [
        { token: "PLEASE", gesture: "please", desc: "Circular chest rubbing motion (ASL 'Please')" },
        { token: "WRITE", gesture: "write", desc: "Pinching fingers writing across palm (ASL 'Write')" },
        { token: "ME", gesture: "me", desc: "Pointing to chest (ASL 'Me')" }
      ],

      "i love my family and friends": [
        { token: "I LOVE YOU", gesture: "iloveyou", desc: "ASL 'I Love You' sign with pulsing heartbeat" },
        { token: "FAMILY", gesture: "family", desc: "F-handshapes circling together (ASL 'Family')" },
        { token: "FRIEND", gesture: "friend", desc: "Interlocking curved index fingers (ASL 'Friend')" }
      ],

      "where can i find food": [
        { token: "FOOD", gesture: "food", desc: "Bunched fingers tapping mouth (ASL 'Food / Eat')" },
        { token: "WHERE", gesture: "where", desc: "Open palms shaking in inquiry (ASL 'Where')" }
      ],

      "yes that is correct": [
        { token: "YES", gesture: "yes", desc: "Closed fist nodding affirmatively (ASL 'Yes')" },
        { token: "CORRECT", gesture: "correct", desc: "Index fingers crossing firmly (ASL 'Correct')" }
      ],

      "no thank you": [
        { token: "NO", gesture: "no", desc: "Index & middle snapping shut on thumb (ASL 'No')" },
        { token: "THANK YOU", gesture: "thankyou", desc: "Open hand moving forward from chin (ASL 'Thank You')" }
      ],

      "excuse me where is the hospital": [
        { token: "EXCUSE ME", gesture: "excuse", desc: "Curved fingertips brushing palm (ASL 'Excuse Me')" },
        { token: "HOSPITAL", gesture: "hospital", desc: "H-handshape tracing a medical cross (ASL 'Hospital')" },
        { token: "WHERE", gesture: "where", desc: "Open palms shaking in inquiry (ASL 'Where')" }
      ],

      "i am learning sign language": [
        { token: "LEARN", gesture: "learn", desc: "Cupped hand scooping knowledge to forehead (ASL 'Learn')" },
        { token: "SIGN", gesture: "sign", desc: "Index fingers rolling in backward circles (ASL 'Sign Language')" }
      ],

      "please call my phone": [
        { token: "PLEASE", gesture: "please", desc: "Circular chest rubbing motion (ASL 'Please')" },
        { token: "PHONE", gesture: "phone", desc: "Y-phone sign at ear and mouth (ASL 'Phone')" }
      ],

      "have a wonderful day": [
        { token: "WONDERFUL", gesture: "wonderful", desc: "Both open palms pushed upward in celebration (ASL 'Wonderful')" },
        { token: "DAY", gesture: "day", desc: "Forearm arching across like sun path (ASL 'Day')" }
      ]
    };
  }

  // Set gesture by name with smooth transition
  setGesture(gestureName) {
    if (!gestureName) gestureName = "rest";
    const key = gestureName.toLowerCase().replace(/[^a-z]/g, "");
    let target = this.gestures[key];

    // Fuzzy & synonym lookup
    if (!target) {
      if (key.includes("love") && key.includes("you")) target = this.gestures["iloveyou"];
      else if (key.includes("thank")) target = this.gestures["thankyou"];
      else if (key.includes("water")) target = this.gestures["water"];
      else if (key.includes("drink")) target = this.gestures["drink"];
      else if (key.includes("food") || key.includes("eat")) target = this.gestures["food"];
      else if (key.includes("hungry")) target = this.gestures["hungry"];
      else if (key.includes("bath") || key.includes("restroom") || key.includes("toilet")) target = this.gestures["bathroom"];
      else if (key.includes("doc") || key.includes("nurse")) target = this.gestures["doctor"];
      else if (key.includes("hosp") || key.includes("medic")) target = this.gestures["hospital"];
      else if (key.includes("help") || key.includes("emergency")) target = this.gestures["help"];
      else if (key.includes("peace")) target = this.gestures["peace"];
      else if (key.includes("fist") || key.includes("yes")) target = this.gestures["yes"];
      else if (key.includes("no")) target = this.gestures["no"];
      else if (key.includes("wait")) target = this.gestures["wait"];
      else if (key.includes("stop")) target = this.gestures["stop"];
      else if (key.includes("hi") || key.includes("hello") || key.includes("bye")) target = this.gestures["hello"];
      else if (key.includes("navya")) target = this.gestures["navya"];
      else if (key.includes("name")) target = this.gestures["name"];
      else if (key.includes("meet")) target = this.gestures["meet"];
      else if (key.includes("nice")) target = this.gestures["nice"];
      else if (key.includes("how")) target = this.gestures["how"];
      else if (key.includes("fine")) target = this.gestures["fine"];
      else if (key.includes("good")) target = this.gestures["good"];
      else if (key.includes("bad")) target = this.gestures["bad"];
      else if (key.includes("sleep")) target = this.gestures["sleep"];
      else if (key.includes("book")) target = this.gestures["book"];
      else if (key.includes("call") || key.includes("phone")) target = this.gestures["phone"];
      else if (key.includes("sign")) target = this.gestures["sign"];
      else if (key.includes("learn")) target = this.gestures["learn"];
      else if (key.includes("time")) target = this.gestures["time"];
      else if (key.includes("day") || key.includes("today")) target = this.gestures["today"];
      else if (key.includes("sick") || key.includes("pain") || key.includes("hurt")) target = this.gestures["pain"];
      else {
        target = this.gestures["hello"];
      }
    }

    this.motionType = target.motion || "none";
    this.motionTime = 0;

    // Apply target finger curls
    this.targetCurls = { ...target.curl };
    if (target.spread) this.targetSpreads = { ...target.spread };
    if (target.wrist) this.targetWristAngles = { ...target.wrist };

    return target.desc || gestureName;
  }

  // Play sequence of sign words in a sentence
  playSentenceSequence(sentenceText, onStepCallback) {
    this.stopSequence();
    this.isAnimatingSequence = true;
    this.onSequenceStep = onStepCallback;

    const normalized = sentenceText
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // 1. Check if an exact curated choreography exists for this sentence
    let steps = this.sentenceChoreography[normalized];

    // 2. Fallback: Parse dynamically for arbitrary sentences
    if (!steps || steps.length === 0) {
      steps = this.parseSentenceToSignSteps(normalized);
    }

    if (!steps || steps.length === 0) {
      this.isAnimatingSequence = false;
      return;
    }

    this.sequenceQueue = steps;
    this.sequenceIndex = 0;

    const playNext = () => {
      if (!this.isAnimatingSequence || this.sequenceIndex >= this.sequenceQueue.length) {
        // Hold final gesture, then ease back to rest posture
        setTimeout(() => {
          this.setGesture("rest");
          this.isAnimatingSequence = false;
          if (this.onSequenceStep) {
            this.onSequenceStep(null, true);
          }
        }, 1100);
        return;
      }

      const step = this.sequenceQueue[this.sequenceIndex];
      const desc = this.setGesture(step.gesture);

      if (this.onSequenceStep) {
        this.onSequenceStep({
          token: step.token,
          gesture: step.gesture,
          desc: step.desc || desc,
          stepIdx: this.sequenceIndex,
          totalSteps: this.sequenceQueue.length,
          sentence: sentenceText
        }, false);
      }

      this.sequenceIndex++;
      // Give each sign 1650ms to be clearly visible and expressive
      this.sequenceTimer = setTimeout(playNext, 1650);
    };

    playNext();
  }

  // Intelligent parser for arbitrary user input
  parseSentenceToSignSteps(cleanText) {
    const stopWords = new Set(["is", "am", "are", "a", "an", "the", "to", "for", "it", "of", "in", "on", "and", "that", "some", "be", "do"]);
    const rawTokens = cleanText.split(" ").filter(w => w.length > 0);
    const steps = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const word = rawTokens[i];

      // Multi-word phrase checks
      if (word === "i" && rawTokens[i+1] === "love" && rawTokens[i+2] === "you") {
        steps.push({ token: "I LOVE YOU", gesture: "iloveyou", desc: "ASL 'I Love You' sign" });
        i += 2;
        continue;
      }
      if (word === "thank" && rawTokens[i+1] === "you") {
        steps.push({ token: "THANK YOU", gesture: "thankyou", desc: "ASL 'Thank You' sign" });
        i += 1;
        continue;
      }
      if (word === "excuse" && rawTokens[i+1] === "me") {
        steps.push({ token: "EXCUSE ME", gesture: "excuse", desc: "ASL 'Excuse Me' sign" });
        i += 1;
        continue;
      }
      if (word === "good" && rawTokens[i+1] === "morning") {
        steps.push({ token: "GOOD MORNING", gesture: "morning", desc: "ASL 'Good Morning' sign" });
        i += 1;
        continue;
      }
      if (word === "good" && rawTokens[i+1] === "night") {
        steps.push({ token: "GOOD NIGHT", gesture: "night", desc: "ASL 'Good Night' sign" });
        i += 1;
        continue;
      }

      // Skip grammatical stop words in sign choreography
      if (stopWords.has(word)) continue;

      const upperToken = word.toUpperCase();
      steps.push({ token: upperToken, gesture: word, desc: `Signing '${upperToken}'` });
    }

    return steps.length > 0 ? steps : [{ token: "HELLO", gesture: "hello", desc: "Greeting wave" }];
  }

  stopSequence() {
    this.isAnimatingSequence = false;
    if (this.sequenceTimer) {
      clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
  }

  // Update from live ESP32 flex telemetry & MPU6050
  setSensorTelemetry(sensors) {
    if (this.mode !== "sensor" || this.isAnimatingSequence) return;

    const toCurl = (val) => {
      const clamped = Math.max(0, Math.min(1023, val || 250));
      return clamped / 1023.0;
    };

    this.targetCurls.pinky = toCurl(sensors.pinky_flex);
    this.targetCurls.ring = toCurl(sensors.ring_flex);
    this.targetCurls.middle = toCurl(sensors.middle_flex);
    this.targetCurls.index = toCurl(sensors.index_flex);
    this.targetCurls.thumb = toCurl(sensors.thumb_flex);

    const ax = sensors.accel_x || 0;
    const ay = sensors.accel_y || 1;
    const az = sensors.accel_z || 9.8;

    this.targetWristAngles.roll = Math.atan2(ax, az) * 0.45;
    this.targetWristAngles.pitch = -Math.atan2(ay, az) * 0.45;
    this.targetWristAngles.yaw = 0;
    this.targetWristAngles.y = 0;
    this.motionType = "none";
  }

  // Animation Loop with smooth LERP damping and dynamic waveforms
  animate() {
    requestAnimationFrame(() => this.animate());

    const smoothFactor = 0.16;
    this.motionTime += 0.04;
    const t = this.motionTime;

    // 1. Interpolate curls & spreads
    const fingerNames = ["pinky", "ring", "middle", "index", "thumb"];
    fingerNames.forEach((f) => {
      this.curlValues[f] += (this.targetCurls[f] - this.curlValues[f]) * smoothFactor;
      this.spreadValues[f] += (this.targetSpreads[f] - this.spreadValues[f]) * smoothFactor;
    });

    // 2. Interpolate wrist orientation
    const w = this.wristAngles;
    const tw = this.targetWristAngles;
    w.pitch += (tw.pitch - w.pitch) * smoothFactor;
    w.roll += (tw.roll - w.roll) * smoothFactor;
    w.yaw += (tw.yaw - w.yaw) * smoothFactor;
    w.y += (tw.y - w.y) * smoothFactor;

    // 3. Dynamic micro-motion waveforms (20 expressive kinematic patterns)
    let dynYaw = 0, dynRoll = 0, dynPitch = 0, dynY = 0;

    if (this.motionType === "wave") {
      dynYaw = Math.sin(t * 6.0) * 0.35;
      dynRoll = Math.cos(t * 6.0) * 0.18;
    } else if (this.motionType === "nod") {
      dynPitch = Math.sin(t * 6.5) * 0.28;
    } else if (this.motionType === "waggle") {
      dynYaw = Math.sin(t * 7.5) * 0.38;
    } else if (this.motionType === "heartbeat") {
      dynY = Math.abs(Math.sin(t * 4.5)) * 0.10;
      dynPitch = Math.sin(t * 4.5) * 0.08;
    } else if (this.motionType === "tap" || this.motionType === "pulse_tap") {
      dynPitch = Math.sin(t * 7.0) * 0.18;
      dynY = Math.sin(t * 7.0) * 0.08;
    } else if (this.motionType === "forward_down") {
      dynPitch = Math.sin(t * 3.8) * 0.18;
      dynY = -Math.abs(Math.sin(t * 3.8)) * 0.08;
    } else if (this.motionType === "circle_rub") {
      dynPitch = Math.sin(t * 4.5) * 0.15;
      dynRoll = Math.cos(t * 4.5) * 0.15;
      dynY = Math.sin(t * 4.5) * 0.06;
    } else if (this.motionType === "shake_t") {
      dynRoll = Math.sin(t * 11.0) * 0.22;
      dynYaw = Math.cos(t * 11.0) * 0.18;
    } else if (this.motionType === "pinch_snap") {
      dynPitch = Math.sin(t * 8.0) * 0.16;
    } else if (this.motionType === "chop") {
      dynPitch = -Math.abs(Math.sin(t * 5.5)) * 0.26;
    } else if (this.motionType === "brush_up") {
      dynPitch = Math.sin(t * 4.5) * 0.22;
      dynY = Math.sin(t * 4.5) * 0.12;
    } else if (this.motionType === "sweep") {
      dynYaw = Math.sin(t * 3.8) * 0.35;
      dynRoll = Math.sin(t * 3.8) * 0.14;
    } else if (this.motionType === "lift") {
      dynY = Math.sin(t * 4.0) * 0.12;
      dynPitch = -0.08;
    } else if (this.motionType === "twist") {
      dynRoll = Math.sin(t * 6.5) * 0.25;
      dynYaw = Math.sin(t * 6.5) * 0.20;
    } else if (this.motionType === "pull_in") {
      dynPitch = -Math.abs(Math.sin(t * 4.2)) * 0.20;
      dynY = Math.sin(t * 4.2) * 0.08;
    } else if (this.motionType === "drink_tip") {
      dynPitch = Math.sin(t * 5.0) * 0.32;
      dynRoll = -Math.sin(t * 5.0) * 0.16;
    } else if (this.motionType === "arch") {
      dynRoll = Math.sin(t * 4.0) * 0.25;
      dynPitch = Math.cos(t * 4.0) * 0.18;
    } else if (this.motionType === "roll_circles") {
      dynRoll = Math.sin(t * 6.0) * 0.22;
      dynPitch = Math.cos(t * 6.0) * 0.16;
    } else if (this.motionType === "cross_trace") {
      dynYaw = Math.sin(t * 4.5) * 0.25;
      dynY = Math.cos(t * 4.5) * 0.12;
    } else if (this.motionType === "flutter") {
      fingerNames.slice(0, 4).forEach((f, idx) => {
        const joints = this.fingerJoints[f];
        if (joints && joints[0]) {
          joints[0].rotation.x += Math.sin(t * 8.5 + idx * 1.5) * 0.12;
        }
      });
    }

    // Apply wrist transforms
    if (this.wristGroup) {
      this.wristGroup.rotation.x = w.pitch + dynPitch;
      this.wristGroup.rotation.z = w.roll + dynRoll;
      this.wristGroup.rotation.y = w.yaw + dynYaw;
      this.wristGroup.position.y = w.y + dynY;
    }

    // 4. Update each finger's 3-joint angles & curls
    fingerNames.forEach((f) => {
      const joints = this.fingerJoints[f];
      if (!joints || joints.length < 3) return;

      const curl = this.curlValues[f];
      const spread = this.spreadValues[f];

      if (f === "thumb") {
        joints[0].rotation.x = curl * 1.05;
        joints[0].rotation.y = curl * 0.85 + 0.25;
        joints[0].rotation.z = -0.65 + spread * 0.35;
        joints[1].rotation.x = curl * 1.25;
        joints[2].rotation.x = curl * 1.15;
      } else {
        joints[0].rotation.x = curl * 1.38;
        joints[0].rotation.z = spread;
        joints[1].rotation.x = curl * 1.48;
        joints[2].rotation.x = curl * 1.18;
      }
    });

    // 5. Pulsing glow animation on fingertip nodal points
    const pulseScale = 1.0 + Math.sin(t * 4.5) * 0.14;
    this.tipNodes.forEach((node) => {
      node.scale.set(pulseScale, pulseScale, pulseScale);
    });

    // 6. Update controls & render
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  // Dynamic Theme Switching
  setTheme(themeName) {
    if (!this.materials || !this.materials.cuff) return;
    if (themeName === "skin") {
      this.materials.cuff.color.setHex(0x115e59); // Dark teal
      this.materials.hand.color.setHex(0xdedad1); // Warm clay beige
      this.materials.node.color.setHex(0x00f0ff); // Cyan glow
      this.materials.node.emissive.setHex(0x00f0ff);
      this.materials.halo.color.setHex(0x38bdf8);
    } else if (themeName === "glove") {
      this.materials.cuff.color.setHex(0xeb745b); // Coral cyber accent
      this.materials.hand.color.setHex(0x1e293b); // Dark carbon slate
      this.materials.node.color.setHex(0x10b981); // Emerald glow
      this.materials.node.emissive.setHex(0x10b981);
      this.materials.halo.color.setHex(0x34d399);
    } else if (themeName === "ceramic") {
      this.materials.cuff.color.setHex(0xd97706); // Gold metal
      this.materials.hand.color.setHex(0xf8fafc); // Porcelain white
      this.materials.node.color.setHex(0xf59e0b); // Amber glow
      this.materials.node.emissive.setHex(0xf59e0b);
      this.materials.halo.color.setHex(0xfbbf24);
    }
  }

  // Preset Camera Angles
  setCameraView(viewName) {
    if (!this.camera || !this.controls) return;
    if (viewName === "front") {
      this.camera.position.set(0, 0.25, 4.2);
    } else if (viewName === "angled") {
      this.camera.position.set(1.8, 1.2, 3.4);
    } else if (viewName === "side") {
      this.camera.position.set(3.8, 0.25, 0.5);
    } else if (viewName === "top") {
      this.camera.position.set(0, 4.2, 0.8);
    }
    this.controls.target.set(0, 0.15, 0);
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

// Export to window
window.Hand3DVisualizer = Hand3DVisualizer;
