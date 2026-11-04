/**
 * Smart Glove Companion & 3D Gesture Controller
 * Orchestrates:
 *  - 3D Articulated Hand Kinematics & Smooth Animations
 *  - Immediate Auto-Navigation/Scroll back to 3D Hand on Sentence/Word Clicks
 *  - High-Fidelity Gesture Playback in accordance with full sentences
 *  - WebSocket Telemetry from ESP32 / Mock Simulator
 *  - Speech Synthesis (Web Speech API TTS)
 *  - Interactive 40 Sentences & 82 Word Pills
 *  - Sentence Builder Engine
 */

// Global State
let hand3d = null;
let ws = null;
let isStreamingSimulated = true;
let currentSentenceText = "Hello, my name is Navya";
let buildBuffer = [];
let recentSentences = [
  { text: "Please wait for me", time: "23:40 • glove" },
  { text: "I go to school every morning", time: "23:40 • glove" }
];

// System Settings State & Defaults
const DEFAULT_SETTINGS = {
  voiceUri: "",
  rate: 1.0,
  pitch: 1.0,
  volume: 100,
  autoSpeak: false,
  speedFactor: 1.0,
  confidenceThreshold: 80,
  smoothing: true,
  handTheme: "skin",
  cameraAngle: "angled",
  showGauges: true,
  showHudBadge: true,
  showOrbitHint: true,
  bleName: "SmartGlove_ESP32",
  sampleRate: "5"
};

let appSettings = { ...DEFAULT_SETTINGS };
let lastAutoSpokenGesture = "";
let availableVoices = [];

// 40 Comprehensive Conversational Sentences
const SENTENCES_LIST = [
  "Hello, my name is Navya",
  "Nice to meet you",
  "How are you today?",
  "I am fine, thank you",
  "I love you",
  "Can I have some water, please?",
  "I need help",
  "Please call a doctor",
  "Where is the bathroom?",
  "I am hungry, I want food",
  "I want to drink water",
  "Please wait for me",
  "I go to school every morning",
  "What time is it now?",
  "I do not understand",
  "Could you repeat that, please?",
  "Where is the emergency exit?",
  "I am feeling very tired",
  "Thank you for your help",
  "See you tomorrow",
  "Where are you going?",
  "I feel happy today",
  "I am feeling sick and have pain",
  "Please take me home",
  "What is your name?",
  "Can you help me?",
  "Good morning, everyone",
  "Good night, sleep well",
  "I like reading books",
  "Is the doctor here today?",
  "I need some medicine",
  "Please write it down for me",
  "I love my family and friends",
  "Where can I find food?",
  "Yes, that is correct",
  "No, thank you",
  "Excuse me, where is the hospital?",
  "I am learning sign language",
  "Please call my phone",
  "Have a wonderful day"
];

// All 82 Word Pills matching user interface
const WORDS_LIST = [
  "again", "bad", "bathroom", "book", "bye", "car", "cold", "come",
  "day", "doctor", "drink", "eat", "family", "father", "feel", "fine",
  "food", "friend", "go", "good", "happy", "hello", "help", "hi",
  "home", "hot", "how", "hungry", "hurt", "i", "i love you", "know",
  "later", "learn", "like", "love", "me", "meet", "more", "morning",
  "mother", "my", "name", "need", "nice", "night", "no", "now",
  "okay", "pain", "phone", "play", "please", "sad", "school", "see",
  "sign", "sleep", "sorry", "stop", "talk", "thank", "thank you", "thanks",
  "time", "tired", "today", "tomorrow", "understand", "wait", "want", "water",
  "we", "what", "when", "where", "who", "why", "work", "yes", "you", "your"
];

// Navigate smoothly and immediately back to the 3D hand stage card
function scrollToHandStage() {
  const stage = document.querySelector(".hand-3d-stage-card");
  if (stage) {
    stage.scrollIntoView({ behavior: "smooth", block: "start" });
    stage.classList.add("stage-highlight");
    setTimeout(() => stage.classList.remove("stage-highlight"), 1400);
  }
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize 3D Hand Model
  if (window.Hand3DVisualizer) {
    hand3d = new Hand3DVisualizer("hand3dContainer");
  }

  // 2. Populate UI Lists
  populateSentences();
  populateWords();
  renderRecentSentences();

  // 3. Setup WebSocket Connection to Backend
  initWebSocket();

  // 4. Attach Event Listeners
  setupEventListeners();

  // 5. Initialize System Settings & Preferences
  initSettings();

  // Initial demonstration pose
  if (hand3d) {
    hand3d.setGesture("hello");
  }
});

// Render the 40 Sentences List
function populateSentences() {
  const container = document.getElementById("sentencesList");
  if (!container) return;
  container.innerHTML = "";

  SENTENCES_LIST.forEach((sentence, index) => {
    const item = document.createElement("div");
    item.className = "sentence-item";
    item.textContent = sentence;
    item.dataset.index = index;

    item.addEventListener("click", () => {
      // Immediately navigate back to the 3D hand
      scrollToHandStage();

      // Highlight active sentence item
      document.querySelectorAll(".sentence-item").forEach(el => el.classList.remove("active-playing"));
      item.classList.add("active-playing");

      // Play sentence sequence
      playSentence(sentence);
    });

    container.appendChild(item);
  });
}

// Render the 82 Words Grid
function populateWords() {
  const container = document.getElementById("wordsPillGrid");
  if (!container) return;
  container.innerHTML = "";

  WORDS_LIST.forEach((word) => {
    const pill = document.createElement("div");
    pill.className = "word-pill";
    pill.textContent = word;

    pill.addEventListener("click", () => {
      // Immediately navigate back to the 3D hand
      scrollToHandStage();

      // Trigger 3D sign
      signWord(word);

      // Add to Build Buffer
      addWordToBuffer(word);
    });

    container.appendChild(pill);
  });
}

// Play sentence in 3D & TTS
function playSentence(text) {
  scrollToHandStage();

  currentSentenceText = text;
  document.getElementById("sentenceInput").value = text;
  document.getElementById("liveActiveGestureLabel").textContent = text;
  document.getElementById("btLatestGesture").innerHTML = `${text}<br><small class="text-sub">&bull; glove &bull; ${getTimestamp()}</small>`;

  // Speak with TTS
  speakText(text);

  // Add to recent list
  addToRecent(text);

  // Switch 3D hand to library mode and play animated sequence
  if (hand3d) {
    hand3d.mode = "library";
    updateModeButtonsUI("library");

    const hudTitle = document.getElementById("hudSignTitle");
    const hudDesc = document.getElementById("hudSignDesc");
    const hudProgressBar = document.getElementById("hudProgressBar");
    const hudProgressFill = document.getElementById("hudProgressFill");
    const screenBanner = document.getElementById("screenshotGestureBanner");

    if (screenBanner) {
      screenBanner.textContent = text;
      screenBanner.classList.add("active-sign");
    }

    hudProgressBar.style.display = "block";
    hudProgressFill.style.width = "0%";

    hand3d.playSentenceSequence(text, (stepData, isComplete) => {
      if (isComplete) {
        hudTitle.textContent = "REST";
        hudDesc.textContent = "Sequence complete. Resting posture.";
        hudProgressBar.style.display = "none";
        if (screenBanner) {
          screenBanner.textContent = "Waiting for gestures...";
          screenBanner.classList.remove("active-sign");
        }
        document.querySelectorAll(".sentence-item").forEach(el => el.classList.remove("active-playing"));
        document.querySelectorAll(".word-pill").forEach(el => el.classList.remove("active-signing"));
        return;
      }

      const activeWord = stepData && stepData.token ? stepData.token : (typeof stepData === "string" ? stepData : text.toUpperCase());
      const desc = stepData && stepData.desc ? stepData.desc : "Signing gesture";
      const stepIdx = stepData && typeof stepData.stepIdx === "number" ? stepData.stepIdx : 0;
      const totalSteps = stepData && typeof stepData.totalSteps === "number" ? stepData.totalSteps : 1;

      hudTitle.textContent = `[${stepIdx + 1}/${totalSteps}] ${activeWord}`;
      hudDesc.textContent = desc;

      if (screenBanner) {
        screenBanner.textContent = `${activeWord}`;
        screenBanner.classList.add("active-sign");
      }

      const pct = Math.round(((stepIdx + 1) / totalSteps) * 100);
      hudProgressFill.style.width = `${pct}%`;

      // Highlight active word pill in vocabulary list
      const cleanWord = activeWord.toLowerCase();
      document.querySelectorAll(".word-pill").forEach(el => {
        const textLower = el.textContent.toLowerCase();
        if (textLower === cleanWord || (cleanWord.length > 2 && textLower.includes(cleanWord))) {
          el.classList.add("active-signing");
        } else {
          el.classList.remove("active-signing");
        }
      });
    });
  }
}

// Sign an individual word
function signWord(word) {
  scrollToHandStage();

  document.getElementById("liveActiveGestureLabel").textContent = word.toUpperCase();
  document.getElementById("hudSignTitle").textContent = word.toUpperCase();
  const screenBanner = document.getElementById("screenshotGestureBanner");
  if (screenBanner) {
    screenBanner.textContent = word.toUpperCase();
    screenBanner.classList.add("active-sign");
  }

  // Highlight clicked word pill
  document.querySelectorAll(".word-pill").forEach(el => {
    if (el.textContent.toLowerCase() === word.toLowerCase()) {
      el.classList.add("active-signing");
    } else {
      el.classList.remove("active-signing");
    }
  });

  // Speak word
  speakText(word);

  if (hand3d) {
    hand3d.mode = "library";
    updateModeButtonsUI("library");
    const desc = hand3d.setGesture(word);
    document.getElementById("hudSignDesc").textContent = desc;
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Show Gestures button
  document.getElementById("btnShowGestures").addEventListener("click", () => {
    scrollToHandStage();
    const text = document.getElementById("sentenceInput").value.trim();
    if (text) playSentence(text);
  });

  // Enter key on input bar
  document.getElementById("sentenceInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      scrollToHandStage();
      const text = document.getElementById("sentenceInput").value.trim();
      if (text) playSentence(text);
    }
  });

  // Speak Current Text
  document.getElementById("btnSpeakCurrentText").addEventListener("click", () => {
    scrollToHandStage();
    const text = document.getElementById("sentenceInput").value.trim() || currentSentenceText;
    playSentence(text);
  });

  // Clear Text
  document.getElementById("btnClearText").addEventListener("click", () => {
    document.getElementById("sentenceInput").value = "";
    document.getElementById("liveActiveGestureLabel").textContent = "Rest (Neutral)";
    const screenBanner = document.getElementById("screenshotGestureBanner");
    if (screenBanner) {
      screenBanner.textContent = "Waiting for gestures...";
      screenBanner.classList.remove("active-sign");
    }
    if (hand3d) hand3d.setGesture("rest");
  });

  // Toggle Simulated Glove Playback
  const btnToggleSim = document.getElementById("btnToggleSimulatedGlove");
  btnToggleSim.addEventListener("click", async () => {
    isStreamingSimulated = !isStreamingSimulated;
    btnToggleSim.textContent = isStreamingSimulated ? "Stop simulated glove" : "Start simulated glove";
    btnToggleSim.style.backgroundColor = isStreamingSimulated ? "var(--teal-btn)" : "var(--coral-btn)";

    // Send control command to backend
    try {
      await fetch("/api/simulator/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isStreamingSimulated ? "play" : "pause" })
      });
    } catch (e) {
      console.warn("Simulator control fetch error:", e);
    }
  });

  // Connect Real Glove button
  document.getElementById("btnConnectRealGlove").addEventListener("click", () => {
    alert("Bluetooth Smart Glove pairing initiated.\nSearching for ESP32 BLE device 'SmartGlove_ESP32'...\n(Simulated data active as fallback)");
  });

  // Mode Toggles: Live Sensor vs Library Demo
  document.getElementById("modeSensor").addEventListener("click", () => {
    if (hand3d) {
      hand3d.mode = "sensor";
      hand3d.stopSequence();
    }
    updateModeButtonsUI("sensor");
  });

  document.getElementById("modeLibrary").addEventListener("click", () => {
    if (hand3d) {
      hand3d.mode = "library";
      hand3d.setGesture("hello");
    }
    updateModeButtonsUI("library");
  });

  // Camera Presets
  document.querySelectorAll(".cam-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.cam;
      if (hand3d) hand3d.setCameraView(view);
    });
  });

  // Hand Appearance Theme Switcher (Natural Skin, Smart Glove, Ceramic Studio)
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const theme = btn.dataset.theme;
      if (hand3d) hand3d.setTheme(theme);
    });
  });

  // Quick Poses Bar
  document.querySelectorAll(".quick-pose-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      scrollToHandStage();
      const pose = chip.dataset.pose;
      if (hand3d) {
        hand3d.mode = "library";
        updateModeButtonsUI("library");
        const desc = hand3d.setGesture(pose);
        document.getElementById("liveActiveGestureLabel").textContent = pose.toUpperCase();
        document.getElementById("hudSignTitle").textContent = pose.toUpperCase();
        document.getElementById("hudSignDesc").textContent = desc;
        const screenBanner = document.getElementById("screenshotGestureBanner");
        if (screenBanner) {
          screenBanner.textContent = pose.toUpperCase();
          screenBanner.classList.add("active-sign");
        }
        speakText(pose);
      }
    });
  });

  // Quick Add Tag chips
  document.querySelectorAll(".quick-tag-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      scrollToHandStage();
      const word = btn.dataset.word;
      addWordToBuffer(word);
      signWord(word);
    });
  });

  // Make Sentence button
  document.getElementById("btnMakeSentence").addEventListener("click", async () => {
    if (buildBuffer.length === 0) return;
    scrollToHandStage();

    try {
      const word = buildBuffer[buildBuffer.length - 1];
      const res = await fetch("/api/sentence/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word })
      });
      const data = await res.json();
      const sentence = data.current_sentence || buildBuffer.join(" ") + ".";
      playSentence(sentence);
    } catch (e) {
      const sentence = buildBuffer.join(" ") + ".";
      playSentence(sentence);
    }
  });

  // Use Recent Gestures
  document.getElementById("btnUseRecent").addEventListener("click", () => {
    if (recentSentences.length > 0) {
      scrollToHandStage();
      playSentence(recentSentences[0].text);
    }
  });

  // Clear Build Buffer
  document.getElementById("btnClearBuildBuffer").addEventListener("click", async () => {
    buildBuffer = [];
    renderBuildBuffer();
    try {
      await fetch("/api/sentence/clear", { method: "DELETE" });
    } catch (e) {
      console.warn(e);
    }
  });

  // Settings Button - Open Modal
  const btnSettings = document.getElementById("btnSettings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      openSettingsModal();
    });
  }

  // Close Settings Buttons
  const btnCloseSettings = document.getElementById("btnCloseSettings");
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener("click", closeSettingsModal);
  }

  const btnCancelSettings = document.getElementById("btnCancelSettings");
  if (btnCancelSettings) {
    btnCancelSettings.addEventListener("click", closeSettingsModal);
  }

  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettingsModal();
  });

  // Modal Tab Switching
  document.querySelectorAll(".modal-tab-btn").forEach(tabBtn => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      tabBtn.classList.add("active");
      const targetPanel = document.getElementById(tabBtn.dataset.tab);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Settings Sliders Live Value Badges
  const rateSlider = document.getElementById("settingRate");
  if (rateSlider) {
    rateSlider.addEventListener("input", () => {
      document.getElementById("valSettingRate").textContent = `${Number(rateSlider.value).toFixed(1)}x`;
    });
  }

  const pitchSlider = document.getElementById("settingPitch");
  if (pitchSlider) {
    pitchSlider.addEventListener("input", () => {
      document.getElementById("valSettingPitch").textContent = Number(pitchSlider.value).toFixed(2);
    });
  }

  const volSlider = document.getElementById("settingVolume");
  if (volSlider) {
    volSlider.addEventListener("input", () => {
      document.getElementById("valSettingVolume").textContent = `${volSlider.value}%`;
    });
  }

  const confSlider = document.getElementById("settingConfidence");
  if (confSlider) {
    confSlider.addEventListener("input", () => {
      document.getElementById("valSettingConfidence").textContent = `${confSlider.value}%`;
    });
  }

  // Speed Chip Buttons
  document.querySelectorAll(".speed-chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".speed-chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Action Buttons
  const btnTestVoice = document.getElementById("btnTestVoice");
  if (btnTestVoice) btnTestVoice.addEventListener("click", testSpeechOutput);

  const btnRestartStreamer = document.getElementById("btnRestartStreamer");
  if (btnRestartStreamer) btnRestartStreamer.addEventListener("click", restartTelemetryStreamer);

  const btnSaveSettings = document.getElementById("btnSaveSettings");
  if (btnSaveSettings) btnSaveSettings.addEventListener("click", saveSettingsFromModal);

  const btnResetSettings = document.getElementById("btnResetSettings");
  if (btnResetSettings) btnResetSettings.addEventListener("click", resetSettings);
}

function updateModeButtonsUI(mode) {
  const btnSensor = document.getElementById("modeSensor");
  const btnLib = document.getElementById("modeLibrary");
  if (!btnSensor || !btnLib) return;
  if (mode === "sensor") {
    btnSensor.classList.add("active");
    btnLib.classList.remove("active");
  } else {
    btnLib.classList.add("active");
    btnSensor.classList.remove("active");
  }
}

// Add Word to Sentence Builder Buffer
function addWordToBuffer(word) {
  buildBuffer.push(word);
  renderBuildBuffer();
}

function renderBuildBuffer() {
  const container = document.getElementById("bufferTokensRow");
  const placeholder = document.getElementById("bufferPlaceholder");
  if (!container || !placeholder) return;
  container.innerHTML = "";

  if (buildBuffer.length === 0) {
    placeholder.style.display = "inline";
    return;
  }

  placeholder.style.display = "none";
  buildBuffer.forEach((tok, idx) => {
    const chip = document.createElement("span");
    chip.className = "buffer-token-chip";
    chip.textContent = tok;
    chip.title = "Click to remove";
    chip.style.cursor = "pointer";
    chip.addEventListener("click", () => {
      buildBuffer.splice(idx, 1);
      renderBuildBuffer();
    });
    container.appendChild(chip);
  });
}

// Recent sentences history
function addToRecent(text) {
  if (recentSentences.length > 0 && recentSentences[0].text === text) return;

  recentSentences.unshift({
    text: text,
    time: `${getTimestamp()} • glove`
  });

  if (recentSentences.length > 6) recentSentences.pop();
  renderRecentSentences();
}

function renderRecentSentences() {
  const list = document.getElementById("recentList");
  const badge = document.getElementById("recentCountBadge");
  if (!list) return;

  list.innerHTML = "";
  if (badge) badge.textContent = recentSentences.length;

  recentSentences.forEach((item) => {
    const row = document.createElement("div");
    row.className = "recent-item";
    row.innerHTML = `
      <div class="recent-item-info">
        <span class="recent-item-text">${item.text}</span>
        <span class="recent-item-time">${item.time}</span>
      </div>
      <span class="live-dot-green"></span>
    `;
    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
      scrollToHandStage();
      playSentence(item.text);
    });
    list.appendChild(row);
  });
}

// WebSocket Connection to Backend
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/sensors`;

  const pill = document.getElementById("connStatusPill");
  const text = document.getElementById("connStatusText");

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (pill) pill.classList.remove("disconnected");
    if (text) text.textContent = "Connected";
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "telemetry") {
        handleLiveTelemetry(data);
      }
    } catch (e) {
      console.warn("WebSocket parse error:", e);
    }
  };

  ws.onerror = () => {
    if (pill) pill.classList.add("disconnected");
    if (text) text.textContent = "Not connected";
  };

  ws.onclose = () => {
    if (pill) pill.classList.add("disconnected");
    if (text) text.textContent = "Not connected";
    setTimeout(initWebSocket, 2500);
  };
}

// Handle Live Telemetry Packet from Glove / Simulator
function handleLiveTelemetry(data) {
  const sensors = data.sensors || {};
  const classification = data.classification || {};

  // 1. Pass raw sensor telemetry to 3D Hand Model (if in sensor mode and not playing sequence)
  if (hand3d && hand3d.mode === "sensor" && !hand3d.isAnimatingSequence) {
    hand3d.setSensorTelemetry(sensors);
  }

  // 2. Update Flex Gauges HUD
  const setGauge = (id, valId, val) => {
    const clamped = Math.max(0, Math.min(1023, Math.round(val || 0)));
    const pct = Math.round((clamped / 1023) * 100);
    const bar = document.getElementById(id);
    const num = document.getElementById(valId);
    if (bar) bar.style.height = `${pct}%`;
    if (num) num.textContent = clamped;
  };

  setGauge("gaugeThumb", "valThumb", sensors.thumb_flex);
  setGauge("gaugeIndex", "valIndex", sensors.index_flex);
  setGauge("gaugeMiddle", "valMiddle", sensors.middle_flex);
  setGauge("gaugeRing", "valRing", sensors.ring_flex);
  setGauge("gaugePinky", "valPinky", sensors.pinky_flex);

  // 3. Update IMU Readings
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== undefined && val !== null) ? Number(val).toFixed(1) : "0.0";
  };
  setTxt("valAx", sensors.accel_x);
  setTxt("valAy", sensors.accel_y);
  setTxt("valAz", sensors.accel_z);

  // 4. Update HUD text in sensor mode
  if (hand3d && hand3d.mode === "sensor" && !hand3d.isAnimatingSequence) {
    const label = classification.gesture_label || "Rest";
    const conf = Math.round((classification.confidence || 0.95) * 100);

    document.getElementById("hudSignTitle").textContent = label.toUpperCase();
    document.getElementById("hudSignDesc").textContent = classification.description || "Live telemetry reading";
    document.getElementById("hudConfidence").textContent = `${conf}% Match`;
    document.getElementById("liveActiveGestureLabel").textContent = label;

    const screenBanner = document.getElementById("screenshotGestureBanner");
    if (screenBanner) {
      if (label.toLowerCase() === "rest" || label.toLowerCase() === "none") {
        screenBanner.textContent = "Waiting for gestures...";
        screenBanner.classList.remove("active-sign");
      } else {
        screenBanner.textContent = label;
        screenBanner.classList.add("active-sign");
      }
    }

    // 5. Auto-speak recognized gesture if enabled in settings
    if (appSettings.autoSpeak && classification.gesture_label) {
      const label = classification.gesture_label;
      const conf = Math.round((classification.confidence || 0.95) * 100);
      if (
        conf >= (appSettings.confidenceThreshold || 80) &&
        label.toLowerCase() !== "rest" &&
        label.toLowerCase() !== "none" &&
        label !== lastAutoSpokenGesture
      ) {
        lastAutoSpokenGesture = label;
        speakText(label);
      }
    }
  }
}

// Text to Speech with custom settings
function speakText(text) {
  if (!text || text.trim() === "") return;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Number(appSettings.rate) || 1.0;
    utterance.pitch = Number(appSettings.pitch) || 1.0;
    utterance.volume = (Number(appSettings.volume) || 100) / 100;

    if (appSettings.voiceUri && availableVoices.length > 0) {
      const match = availableVoices.find(v => v.voiceURI === appSettings.voiceUri || v.name === appSettings.voiceUri);
      if (match) utterance.voice = match;
    }

    window.speechSynthesis.speak(utterance);
  }
}

// Helpers
function getTimestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ==========================================
// Settings Modal & Preferences Manager
// ==========================================

function initSettings() {
  loadSavedSettings();
  loadSpeechVoices();
  applySettingsToUI();
}

function loadSavedSettings() {
  try {
    const stored = localStorage.getItem("smartGloveSettings");
    if (stored) {
      const parsed = JSON.parse(stored);
      appSettings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load settings from localStorage:", e);
    appSettings = { ...DEFAULT_SETTINGS };
  }
}

function loadSpeechVoices() {
  if (!("speechSynthesis" in window)) return;

  const updateVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
    const select = document.getElementById("settingVoice");
    if (!select) return;

    select.innerHTML = '<option value="">Default System Voice</option>';
    availableVoices.forEach((voice) => {
      const opt = document.createElement("option");
      opt.value = voice.voiceURI || voice.name;
      opt.textContent = `${voice.name} (${voice.lang})${voice.default ? ' [Default]' : ''}`;
      if (appSettings.voiceUri && (voice.voiceURI === appSettings.voiceUri || voice.name === appSettings.voiceUri)) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
  };

  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

function openSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) {
    console.error("Modal element #settingsModal not found");
    return;
  }

  // 1. Instantly display modal
  modal.style.display = "flex";
  modal.classList.add("open");

  // 2. Safely populate and synchronize form fields
  try {
    loadSpeechVoices();

    const voiceSelect = document.getElementById("settingVoice");
    if (voiceSelect && appSettings.voiceUri) {
      voiceSelect.value = appSettings.voiceUri;
    }

    const rateInput = document.getElementById("settingRate");
    const valRate = document.getElementById("valSettingRate");
    if (rateInput && valRate) {
      rateInput.value = appSettings.rate;
      valRate.textContent = `${Number(appSettings.rate).toFixed(1)}x`;
    }

    const pitchInput = document.getElementById("settingPitch");
    const valPitch = document.getElementById("valSettingPitch");
    if (pitchInput && valPitch) {
      pitchInput.value = appSettings.pitch;
      valPitch.textContent = Number(appSettings.pitch).toFixed(2);
    }

    const volInput = document.getElementById("settingVolume");
    const valVol = document.getElementById("valSettingVolume");
    if (volInput && valVol) {
      volInput.value = appSettings.volume;
      valVol.textContent = `${appSettings.volume}%`;
    }

    const autoSpeakCheck = document.getElementById("settingAutoSpeak");
    if (autoSpeakCheck) autoSpeakCheck.checked = !!appSettings.autoSpeak;

    // Telemetry speed buttons
    document.querySelectorAll(".speed-chip-btn").forEach(btn => {
      btn.classList.toggle("active", parseFloat(btn.dataset.speed) === parseFloat(appSettings.speedFactor));
    });

    const confInput = document.getElementById("settingConfidence");
    const valConf = document.getElementById("valSettingConfidence");
    if (confInput && valConf) {
      confInput.value = appSettings.confidenceThreshold;
      valConf.textContent = `${appSettings.confidenceThreshold}%`;
    }

    const smoothCheck = document.getElementById("settingSmoothing");
    if (smoothCheck) smoothCheck.checked = !!appSettings.smoothing;

    // 3D Hand
    const themeSelect = document.getElementById("settingHandTheme");
    if (themeSelect) themeSelect.value = appSettings.handTheme || "skin";

    const camSelect = document.getElementById("settingCameraAngle");
    if (camSelect) camSelect.value = appSettings.cameraAngle || "angled";

    const gaugesCheck = document.getElementById("settingShowGauges");
    if (gaugesCheck) gaugesCheck.checked = appSettings.showGauges !== false;

    const hudCheck = document.getElementById("settingShowHudBadge");
    if (hudCheck) hudCheck.checked = appSettings.showHudBadge !== false;

    const orbitCheck = document.getElementById("settingShowOrbitHint");
    if (orbitCheck) orbitCheck.checked = appSettings.showOrbitHint !== false;

    // Hardware
    const bleNameInput = document.getElementById("settingBleName");
    if (bleNameInput) bleNameInput.value = appSettings.bleName || "SmartGlove_ESP32";

    const sampleRateSelect = document.getElementById("settingSampleRate");
    if (sampleRateSelect) sampleRateSelect.value = String(appSettings.sampleRate || "5");
  } catch (err) {
    console.warn("Settings sync warning:", err);
  }
}

function closeSettingsModal() {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  modal.style.display = "none";
  modal.classList.remove("open");
}

function switchSettingsTab(tabId) {
  document.querySelectorAll(".modal-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function setSpeedFactor(spd) {
  appSettings.speedFactor = spd;
  document.querySelectorAll(".speed-chip-btn").forEach(btn => {
    btn.classList.toggle("active", parseFloat(btn.dataset.speed) === parseFloat(spd));
  });
  applySpeedFactorToBackend(spd);
}

function saveSettingsFromModal() {
  const voiceSelect = document.getElementById("settingVoice");
  const rateInput = document.getElementById("settingRate");
  const pitchInput = document.getElementById("settingPitch");
  const volInput = document.getElementById("settingVolume");
  const autoSpeakCheck = document.getElementById("settingAutoSpeak");
  const confInput = document.getElementById("settingConfidence");
  const smoothCheck = document.getElementById("settingSmoothing");
  const themeSelect = document.getElementById("settingHandTheme");
  const camSelect = document.getElementById("settingCameraAngle");
  const gaugesCheck = document.getElementById("settingShowGauges");
  const hudCheck = document.getElementById("settingShowHudBadge");
  const orbitCheck = document.getElementById("settingShowOrbitHint");
  const bleNameInput = document.getElementById("settingBleName");
  const sampleRateSelect = document.getElementById("settingSampleRate");

  const activeSpeedBtn = document.querySelector(".speed-chip-btn.active");
  const speed = activeSpeedBtn ? parseFloat(activeSpeedBtn.dataset.speed) : (appSettings.speedFactor || 1.0);

  appSettings.voiceUri = voiceSelect ? voiceSelect.value : "";
  appSettings.rate = rateInput ? parseFloat(rateInput.value) : 1.0;
  appSettings.pitch = pitchInput ? parseFloat(pitchInput.value) : 1.0;
  appSettings.volume = volInput ? parseInt(volInput.value, 10) : 100;
  appSettings.autoSpeak = autoSpeakCheck ? autoSpeakCheck.checked : false;
  appSettings.speedFactor = speed;
  appSettings.confidenceThreshold = confInput ? parseInt(confInput.value, 10) : 80;
  appSettings.smoothing = smoothCheck ? smoothCheck.checked : true;
  appSettings.handTheme = themeSelect ? themeSelect.value : "skin";
  appSettings.cameraAngle = camSelect ? camSelect.value : "angled";
  appSettings.showGauges = gaugesCheck ? gaugesCheck.checked : true;
  appSettings.showHudBadge = hudCheck ? hudCheck.checked : true;
  appSettings.showOrbitHint = orbitCheck ? orbitCheck.checked : true;
  appSettings.bleName = bleNameInput ? bleNameInput.value.trim() : "SmartGlove_ESP32";
  appSettings.sampleRate = sampleRateSelect ? sampleRateSelect.value : "5";

  try {
    localStorage.setItem("smartGloveSettings", JSON.stringify(appSettings));
  } catch (e) {
    console.warn("Failed to persist settings:", e);
  }

  // Apply to backend simulator if speed changed
  applySpeedFactorToBackend(appSettings.speedFactor);

  // Apply UI and 3D Hand settings
  applySettingsToUI();

  closeSettingsModal();
  showToast("Settings applied & saved successfully");
}

function resetSettings() {
  appSettings = { ...DEFAULT_SETTINGS };
  try {
    localStorage.removeItem("smartGloveSettings");
  } catch (e) {
    console.warn(e);
  }
  openSettingsModal();
  applySettingsToUI();
  applySpeedFactorToBackend(1.0);
  showToast("Settings reset to defaults");
}

function applySettingsToUI() {
  // 1. HUD Gauges & Badges
  const gauges = document.querySelector(".sensor-gauges-hud");
  if (gauges) gauges.style.display = appSettings.showGauges ? "flex" : "none";

  const hudBadge = document.querySelector(".gesture-hud-badge");
  if (hudBadge) hudBadge.style.display = appSettings.showHudBadge ? "block" : "none";

  const orbitHint = document.querySelector(".orbit-hint");
  if (orbitHint) orbitHint.style.display = appSettings.showOrbitHint ? "block" : "none";

  // 2. 3D Hand Appearance & Camera
  if (hand3d) {
    if (appSettings.handTheme && typeof hand3d.setTheme === "function") {
      hand3d.setTheme(appSettings.handTheme);
      document.querySelectorAll(".theme-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.theme === appSettings.handTheme);
      });
    }
    if (appSettings.cameraAngle && typeof hand3d.setCameraView === "function") {
      hand3d.setCameraView(appSettings.cameraAngle);
    }
  }

  // 3. Bluetooth Device Name in diagnostics card
  const btDev = document.getElementById("btDeviceName");
  if (btDev) {
    btDev.textContent = `${appSettings.bleName} (simulated)`;
  }
}

async function applySpeedFactorToBackend(speed) {
  try {
    await fetch("/api/simulator/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "speed", speed_factor: speed })
    });
  } catch (e) {
    console.warn("Simulator speed update error:", e);
  }
}

async function restartTelemetryStreamer() {
  try {
    const res = await fetch("/api/simulator/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restart" })
    });
    if (res.ok) {
      showToast("Telemetry stream restarted from frame 0");
    }
  } catch (e) {
    console.warn("Simulator restart error:", e);
  }
}

function testSpeechOutput() {
  const voiceSelect = document.getElementById("settingVoice");
  const rateInput = document.getElementById("settingRate");
  const pitchInput = document.getElementById("settingPitch");
  const volInput = document.getElementById("settingVolume");

  if (!("speechSynthesis" in window)) {
    alert("Speech synthesis is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("Hello, my name is Navya. Smart Glove system online.");
  if (rateInput) utterance.rate = parseFloat(rateInput.value);
  if (pitchInput) utterance.pitch = parseFloat(pitchInput.value);
  if (volInput) utterance.volume = parseInt(volInput.value, 10) / 100;

  if (voiceSelect && voiceSelect.value && availableVoices.length > 0) {
    const match = availableVoices.find(v => (v.voiceURI === voiceSelect.value || v.name === voiceSelect.value));
    if (match) utterance.voice = match;
  }

  window.speechSynthesis.speak(utterance);
}

function showToast(message, icon = "✓") {
  const toast = document.getElementById("toastNotification");
  const msgEl = document.getElementById("toastMessage");
  const iconEl = document.getElementById("toastIcon");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  if (iconEl) iconEl.textContent = icon;

  toast.classList.add("show");
  if (window._toastTimeout) clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

// Global window bindings for direct inline HTML event triggers
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.switchSettingsTab = switchSettingsTab;
window.setSpeedFactor = setSpeedFactor;
window.saveSettingsFromModal = saveSettingsFromModal;
window.resetSettings = resetSettings;
window.testSpeechOutput = testSpeechOutput;
window.restartTelemetryStreamer = restartTelemetryStreamer;

