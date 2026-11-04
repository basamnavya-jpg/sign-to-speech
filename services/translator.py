"""
Gesture Recognition & Sentence Construction Engine.
Handles:
  - Raw sensor pattern matching & ML classification
  - Gesture dictionary mapping (Gesture_ID -> Label)
  - Buffer/queue based sentence formulation with NLP grammar smoothing
  - Debounce tracking and auto-reset timeout management
"""

import time
import math
from typing import Dict, List, Optional, Tuple, Any

class GestureDefinition:
    def __init__(
        self,
        gesture_id: int,
        label: str,
        flex_targets: Tuple[float, float, float, float, float],
        accel_targets: Tuple[float, float, float],
        gyro_targets: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        description: str = "",
        tts_phrase: Optional[str] = None
    ):
        self.gesture_id = gesture_id
        self.label = label
        self.flex_targets = flex_targets # (thumb, index, middle, ring, pinky) 0-1023
        self.accel_targets = accel_targets # (ax, ay, az)
        self.gyro_targets = gyro_targets # (gx, gy, gz)
        self.description = description
        self.tts_phrase = tts_phrase or label


class TranslatorEngine:
    def __init__(self, debounce_seconds: float = 1.2, auto_clear_timeout: float = 12.0):
        self.debounce_seconds = debounce_seconds
        self.auto_clear_timeout = auto_clear_timeout
        
        # Sentence buffer state
        self.active_buffer: List[str] = []
        self.last_added_word: Optional[str] = None
        self.last_added_time: float = 0.0
        self.last_activity_time: float = time.time()
        
        # Gesture signatures library
        # High flex (>600) means finger bent; low flex (<300) means finger straight
        self.gestures: Dict[int, GestureDefinition] = {
            101: GestureDefinition(
                101, "Hello",
                (120, 110, 115, 125, 130), # All straight (open palm)
                (0.2, 8.5, 3.2),
                (15.0, 55.0, 25.0),
                "Open palm greeting wave",
                "Hello!"
            ),
            102: GestureDefinition(
                102, "Help",
                (450, 510, 100, 90, 80), # Thumb up/open urgency
                (0.1, 0.9, 9.8),
                (5.0, 12.0, 3.0),
                "Emergency call for assistance",
                "Help me, please."
            ),
            103: GestureDefinition(
                103, "Hospital",
                (800, 150, 160, 820, 830), # H-handshape (Index & middle straight)
                (0.3, 5.1, 7.8),
                (8.0, 4.0, 1.0),
                "Hospital / medical facility request",
                "Hospital."
            ),
            104: GestureDefinition(
                104, "I",
                (850, 870, 890, 880, 120), # Pinky straight, others curled
                (0.0, 4.5, 8.2),
                (2.1, 3.0, 1.5),
                "Personal pronoun 'I'",
                "I"
            ),
            105: GestureDefinition(
                105, "Need",
                (650, 820, 300, 310, 320), # Index bent down hook
                (0.4, -2.1, 8.8),
                (35.0, -12.0, 5.0),
                "Expressing requirement or necessity",
                "Need"
            ),
            106: GestureDefinition(
                106, "Doctor",
                (450, 220, 210, 750, 780), # M-shape / D wrist tap
                (0.1, 6.2, 7.1),
                (12.0, 18.0, -4.0),
                "Doctor / Physician assistance",
                "Doctor"
            ),
            107: GestureDefinition(
                107, "Water",
                (750, 140, 150, 160, 820), # W-handshape (Index, middle, ring straight)
                (0.2, 6.8, 6.5),
                (10.0, 8.0, 2.0),
                "Request for water / hydration",
                "Water"
            ),
            108: GestureDefinition(
                108, "Thank You",
                (140, 130, 135, 140, 150), # Flat hand moving forward down
                (1.8, 3.4, 8.5),
                (-25.0, 10.0, 4.0),
                "Gratitude expression",
                "Thank you."
            ),
            109: GestureDefinition(
                109, "Yes",
                (820, 830, 840, 850, 860), # Fist nodding
                (0.5, 3.2, 8.9),
                (45.0, 5.0, 0.0),
                "Affirmation / Agreement",
                "Yes."
            ),
            110: GestureDefinition(
                110, "No",
                (750, 200, 210, 800, 810), # Index and middle pinching to thumb
                (0.2, 5.5, 7.0),
                (0.0, 25.0, 0.0),
                "Negation / Disagreement",
                "No."
            ),
            111: GestureDefinition(
                111, "Where",
                (650, 160, 720, 740, 780), # Index pointing & oscillating
                (0.3, 7.2, 5.5),
                (0.0, 42.0, -38.0),
                "Question location 'Where'",
                "Where"
            ),
            112: GestureDefinition(
                112, "Exit",
                (210, 190, 710, 750, 780), # Hand gesturing toward exit door
                (3.5, 4.0, 7.2),
                (18.0, -15.0, 20.0),
                "Way out / Exit direction",
                "Exit"
            ),
            113: GestureDefinition(
                113, "Pain",
                (550, 250, 260, 790, 800), # Index fingers pointing toward each other
                (0.0, 4.0, 9.0),
                (15.0, -20.0, 10.0),
                "Expressing physical pain / discomfort",
                "Pain"
            ),
            114: GestureDefinition(
                114, "Food",
                (510, 490, 480, 520, 530), # Flat O hand to mouth
                (0.5, 8.0, 5.0),
                (10.0, 5.0, 0.0),
                "Request for food / nourishment",
                "Food"
            )
        }

        # Rest/Neutral pose for comparison
        self.rest_flex = (250, 260, 240, 250, 270)
        self.rest_accel = (0.1, 1.2, 9.6)

        # Grammar smoothing patterns: mapping token sequence -> natural English sentence
        self.grammar_templates = [
            (["hello", "name", "navya"], "Hello, my name is Navya."),
            (["nice", "meet", "you"], "Nice to meet you."),
            (["how", "you", "today"], "How are you today?"),
            (["fine", "thank", "you"], "I am fine, thank you."),
            (["i", "love", "you"], "I love you."),
            (["water", "please"], "Can I have some water, please?"),
            (["i", "need", "help"], "I need help."),
            (["please", "doctor"], "Please call a doctor."),
            (["where", "bathroom"], "Where is the bathroom?"),
            (["hungry", "food"], "I am hungry, I want food."),
            (["drink", "water"], "I want to drink water."),
            (["please", "wait"], "Please wait for me."),
            (["go", "school"], "I go to school every morning."),
            (["i", "need", "doctor"], "I need a doctor."),
            (["i", "need", "hospital"], "I need to go to the hospital."),
            (["i", "need", "water"], "I need some water, please."),
            (["i", "need", "food"], "I need food."),
            (["where", "exit"], "Where is the exit?"),
            (["where", "hospital"], "Where is the nearest hospital?"),
            (["where", "doctor"], "Where can I find a doctor?"),
            (["help", "doctor"], "Help me, I need a doctor!"),
            (["help", "hospital"], "Please help me get to the hospital!"),
            (["thank", "you"], "Thank you very much."),
            (["thank you"], "Thank you very much."),
            (["hello"], "Hello! Nice to meet you."),
            (["help"], "Help! I need assistance."),
            (["yes"], "Yes, that is correct."),
            (["no"], "No, thank you."),
            (["pain"], "I am in pain.")
        ]

    def classify_raw_sensors(
        self,
        thumb: float,
        index: float,
        middle: float,
        ring: float,
        pinky: float,
        ax: float,
        ay: float,
        az: float,
        gx: float = 0.0,
        gy: float = 0.0,
        gz: float = 0.0
    ) -> Tuple[str, float, Optional[int], str, str]:
        """
        Classifies incoming raw glove telemetry into a gesture.
        Returns: (gesture_label, confidence, gesture_id, description, tts_hint)
        """
        input_flex = (thumb, index, middle, ring, pinky)
        input_accel = (ax, ay, az)
        input_gyro = (gx, gy, gz)

        # First, check if hand is simply in resting neutral state
        dist_rest = self._compute_distance(input_flex, self.rest_flex, input_accel, self.rest_accel)
        
        best_gesture: Optional[GestureDefinition] = None
        min_dist = float("inf")

        for gid, gdef in self.gestures.items():
            dist = self._compute_distance(
                input_flex, gdef.flex_targets,
                input_accel, gdef.accel_targets,
                input_gyro, gdef.gyro_targets
            )
            if dist < min_dist:
                min_dist = dist
                best_gesture = gdef

        # If closest is rest pose or distance is too high
        if best_gesture is None or (dist_rest < min_dist and dist_rest < 0.25):
            return "Rest", 0.95, 100, "Neutral resting hand position", ""

        # Normalize distance into a confidence score (0.0 to 1.0)
        # Empirical scaling parameter
        sigma = 0.35
        raw_conf = math.exp(-(min_dist ** 2) / (2 * (sigma ** 2)))
        confidence = round(max(0.40, min(0.99, raw_conf)), 2)

        return (
            best_gesture.label,
            confidence,
            best_gesture.gesture_id,
            best_gesture.description,
            best_gesture.tts_phrase
        )

    def _compute_distance(
        self,
        f1: Tuple[float, ...], f2: Tuple[float, ...],
        a1: Tuple[float, ...], a2: Tuple[float, ...],
        g1: Optional[Tuple[float, ...]] = None, g2: Optional[Tuple[float, ...]] = None
    ) -> float:
        """
        Computes weighted normalized Euclidean distance between sensor vector and gesture template.
        """
        # Flex sensors normalized to [0, 1] range (1023 max)
        flex_sq = sum(((v1 - v2) / 1023.0) ** 2 for v1, v2 in zip(f1, f2)) / 5.0
        
        # Accelerometer normalized (scale ~ 10 m/s^2)
        accel_sq = sum(((v1 - v2) / 10.0) ** 2 for v1, v2 in zip(a1, a2)) / 3.0
        
        dist = math.sqrt(0.70 * flex_sq + 0.30 * accel_sq)
        return dist

    def add_to_sentence(self, word: str) -> Tuple[str, List[str], bool]:
        """
        Appends a newly recognized word into the active sentence buffer.
        Applies debouncing: ignores identical word repeated within debounce interval.
        Returns: (formulated_sentence, buffer_list, was_appended)
        """
        clean_word = word.strip()
        if not clean_word or clean_word.lower() in ("rest", "none", "unknown"):
            return self.get_sentence(), list(self.active_buffer), False

        now = time.time()
        # Debounce: if same word added within debounce_seconds, ignore
        if (self.last_added_word and 
            self.last_added_word.lower() == clean_word.lower() and 
            (now - self.last_added_time) < self.debounce_seconds):
            return self.get_sentence(), list(self.active_buffer), False

        # Check if previous buffer was idle longer than auto-clear timeout
        if self.active_buffer and (now - self.last_activity_time) > self.auto_clear_timeout:
            self.active_buffer.clear()

        self.active_buffer.append(clean_word)
        self.last_added_word = clean_word
        self.last_added_time = now
        self.last_activity_time = now

        current_sentence = self.get_sentence()
        return current_sentence, list(self.active_buffer), True

    def clear_sentence(self) -> Tuple[str, List[str]]:
        """Resets the active sentence buffer."""
        self.active_buffer.clear()
        self.last_added_word = None
        self.last_added_time = 0.0
        self.last_activity_time = time.time()
        return "", []

    def get_sentence(self) -> str:
        """
        Synthesizes active buffer into a grammatically coherent English sentence.
        """
        if not self.active_buffer:
            return ""

        lower_tokens = [w.lower() for w in self.active_buffer]

        # 1. Exact match in grammar templates
        for template_tokens, rendered_sentence in self.grammar_templates:
            if lower_tokens == template_tokens:
                return rendered_sentence

        # 2. Check suffix / subphrase matching
        # e.g., ["I", "Need", "Hospital"]
        for template_tokens, rendered_sentence in self.grammar_templates:
            if len(lower_tokens) >= len(template_tokens):
                if lower_tokens[-len(template_tokens):] == template_tokens:
                    return rendered_sentence

        # 3. Rule-based heuristic grammatical assembly
        words = list(self.active_buffer)
        
        # Capitalize 'I'
        formatted = []
        for i, w in enumerate(words):
            lw = w.lower()
            if lw == "i":
                formatted.append("I")
            elif i == 0:
                formatted.append(w.capitalize())
            else:
                formatted.append(lw)

        # Smart article insertion for medical & common words
        # e.g., ["I", "need", "doctor"] -> "I need a doctor."
        # e.g., ["I", "need", "hospital"] -> "I need a hospital."
        result = []
        for i, token in enumerate(formatted):
            prev = formatted[i-1].lower() if i > 0 else ""
            if prev in ("need", "want") and token.lower() in ("doctor", "hospital", "nurse", "wheelchair"):
                result.append("a " + token.lower())
            elif prev in ("need", "want") and token.lower() in ("water", "food", "help", "medicine"):
                result.append(token.lower())
            else:
                result.append(token)

        sentence = " ".join(result).strip()
        if sentence and not sentence[-1] in (".", "?", "!"):
            sentence += "."

        return sentence

    def get_buffer(self) -> List[str]:
        """Returns copy of current buffer."""
        return list(self.active_buffer)


# Global singleton instance
translator_service = TranslatorEngine()
