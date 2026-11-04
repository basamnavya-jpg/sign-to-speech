"""
Bidirectional Feature: Speech-to-Sign Engine.
Accepts text input from an interlocutor speaking to the user,
tokenizes the phrase, filters grammar stopwords, and maps words
into corresponding Sign Language sequence tokens and visual asset URLs.
"""

import re
import os
from typing import List, Dict, Any, Tuple

# Predefined sign dictionary mapping words to visual representations
SIGN_VOCABULARY = {
    "again": {"token": "AGAIN", "asset": "/assets/signs/again.svg", "type": "action"},
    "bad": {"token": "BAD", "asset": "/assets/signs/bad.svg", "type": "adjective"},
    "bathroom": {"token": "BATHROOM", "asset": "/assets/signs/restroom.svg", "type": "place"},
    "toilet": {"token": "BATHROOM", "asset": "/assets/signs/restroom.svg", "type": "place"},
    "restroom": {"token": "BATHROOM", "asset": "/assets/signs/restroom.svg", "type": "place"},
    "book": {"token": "BOOK", "asset": "/assets/signs/book.svg", "type": "object"},
    "bye": {"token": "BYE", "asset": "/assets/signs/bye.svg", "type": "greeting"},
    "car": {"token": "CAR", "asset": "/assets/signs/car.svg", "type": "transport"},
    "cold": {"token": "COLD", "asset": "/assets/signs/cold.svg", "type": "feeling"},
    "come": {"token": "COME", "asset": "/assets/signs/come.svg", "type": "motion"},
    "day": {"token": "DAY", "asset": "/assets/signs/day.svg", "type": "time"},
    "doctor": {"token": "DOCTOR", "asset": "/assets/signs/doctor.svg", "type": "medical"},
    "nurse": {"token": "DOCTOR", "asset": "/assets/signs/doctor.svg", "type": "medical"},
    "drink": {"token": "DRINK", "asset": "/assets/signs/water.svg", "type": "need"},
    "eat": {"token": "EAT", "asset": "/assets/signs/food.svg", "type": "need"},
    "family": {"token": "FAMILY", "asset": "/assets/signs/family.svg", "type": "people"},
    "father": {"token": "FATHER", "asset": "/assets/signs/father.svg", "type": "people"},
    "feel": {"token": "FEEL", "asset": "/assets/signs/feel.svg", "type": "feeling"},
    "fine": {"token": "FINE", "asset": "/assets/signs/fine.svg", "type": "response"},
    "food": {"token": "FOOD", "asset": "/assets/signs/food.svg", "type": "need"},
    "friend": {"token": "FRIEND", "asset": "/assets/signs/friend.svg", "type": "people"},
    "go": {"token": "GO", "asset": "/assets/signs/go.svg", "type": "motion"},
    "good": {"token": "GOOD", "asset": "/assets/signs/good.svg", "type": "adjective"},
    "happy": {"token": "HAPPY", "asset": "/assets/signs/happy.svg", "type": "feeling"},
    "hello": {"token": "HELLO", "asset": "/assets/signs/hello.svg", "type": "greeting"},
    "hi": {"token": "HELLO", "asset": "/assets/signs/hello.svg", "type": "greeting"},
    "help": {"token": "HELP", "asset": "/assets/signs/help.svg", "type": "emergency"},
    "emergency": {"token": "EMERGENCY", "asset": "/assets/signs/help.svg", "type": "emergency"},
    "home": {"token": "HOME", "asset": "/assets/signs/home.svg", "type": "place"},
    "hot": {"token": "HOT", "asset": "/assets/signs/hot.svg", "type": "feeling"},
    "how": {"token": "HOW", "asset": "/assets/signs/how.svg", "type": "question"},
    "hungry": {"token": "HUNGRY", "asset": "/assets/signs/food.svg", "type": "need"},
    "hurt": {"token": "HURT", "asset": "/assets/signs/pain.svg", "type": "medical"},
    "i": {"token": "I", "asset": "/assets/signs/i.svg", "type": "pronoun"},
    "i love you": {"token": "I LOVE YOU", "asset": "/assets/signs/iloveyou.svg", "type": "phrase"},
    "love": {"token": "LOVE", "asset": "/assets/signs/love.svg", "type": "feeling"},
    "know": {"token": "KNOW", "asset": "/assets/signs/know.svg", "type": "cognition"},
    "later": {"token": "LATER", "asset": "/assets/signs/later.svg", "type": "time"},
    "learn": {"token": "LEARN", "asset": "/assets/signs/learn.svg", "type": "action"},
    "like": {"token": "LIKE", "asset": "/assets/signs/like.svg", "type": "feeling"},
    "me": {"token": "ME", "asset": "/assets/signs/i.svg", "type": "pronoun"},
    "meet": {"token": "MEET", "asset": "/assets/signs/meet.svg", "type": "action"},
    "more": {"token": "MORE", "asset": "/assets/signs/more.svg", "type": "quantity"},
    "morning": {"token": "MORNING", "asset": "/assets/signs/morning.svg", "type": "time"},
    "mother": {"token": "MOTHER", "asset": "/assets/signs/mother.svg", "type": "people"},
    "my": {"token": "MY", "asset": "/assets/signs/my.svg", "type": "pronoun"},
    "name": {"token": "NAME", "asset": "/assets/signs/name.svg", "type": "noun"},
    "need": {"token": "NEED", "asset": "/assets/signs/need.svg", "type": "verb"},
    "nice": {"token": "NICE", "asset": "/assets/signs/nice.svg", "type": "adjective"},
    "night": {"token": "NIGHT", "asset": "/assets/signs/night.svg", "type": "time"},
    "no": {"token": "NO", "asset": "/assets/signs/no.svg", "type": "response"},
    "now": {"token": "NOW", "asset": "/assets/signs/now.svg", "type": "time"},
    "okay": {"token": "OKAY", "asset": "/assets/signs/yes.svg", "type": "response"},
    "pain": {"token": "PAIN", "asset": "/assets/signs/pain.svg", "type": "medical"},
    "phone": {"token": "PHONE", "asset": "/assets/signs/phone.svg", "type": "object"},
    "play": {"token": "PLAY", "asset": "/assets/signs/play.svg", "type": "action"},
    "please": {"token": "PLEASE", "asset": "/assets/signs/please.svg", "type": "politeness"},
    "sad": {"token": "SAD", "asset": "/assets/signs/sad.svg", "type": "feeling"},
    "school": {"token": "SCHOOL", "asset": "/assets/signs/school.svg", "type": "place"},
    "see": {"token": "SEE", "asset": "/assets/signs/see.svg", "type": "perception"},
    "sign": {"token": "SIGN", "asset": "/assets/signs/sign.svg", "type": "action"},
    "sleep": {"token": "SLEEP", "asset": "/assets/signs/sleep.svg", "type": "need"},
    "sorry": {"token": "SORRY", "asset": "/assets/signs/sorry.svg", "type": "politeness"},
    "stop": {"token": "STOP", "asset": "/assets/signs/stop.svg", "type": "response"},
    "talk": {"token": "TALK", "asset": "/assets/signs/talk.svg", "type": "action"},
    "thank": {"token": "THANK YOU", "asset": "/assets/signs/thankyou.svg", "type": "politeness"},
    "thank you": {"token": "THANK YOU", "asset": "/assets/signs/thankyou.svg", "type": "politeness"},
    "thanks": {"token": "THANK YOU", "asset": "/assets/signs/thankyou.svg", "type": "politeness"},
    "time": {"token": "TIME", "asset": "/assets/signs/time.svg", "type": "concept"},
    "tired": {"token": "TIRED", "asset": "/assets/signs/tired.svg", "type": "feeling"},
    "today": {"token": "TODAY", "asset": "/assets/signs/today.svg", "type": "time"},
    "tomorrow": {"token": "TOMORROW", "asset": "/assets/signs/tomorrow.svg", "type": "time"},
    "understand": {"token": "UNDERSTAND", "asset": "/assets/signs/understand.svg", "type": "cognition"},
    "wait": {"token": "WAIT", "asset": "/assets/signs/wait.svg", "type": "action"},
    "want": {"token": "WANT", "asset": "/assets/signs/need.svg", "type": "verb"},
    "water": {"token": "WATER", "asset": "/assets/signs/water.svg", "type": "need"},
    "we": {"token": "WE", "asset": "/assets/signs/we.svg", "type": "pronoun"},
    "what": {"token": "WHAT", "asset": "/assets/signs/what.svg", "type": "question"},
    "when": {"token": "WHEN", "asset": "/assets/signs/when.svg", "type": "question"},
    "where": {"token": "WHERE", "asset": "/assets/signs/where.svg", "type": "question"},
    "who": {"token": "WHO", "asset": "/assets/signs/who.svg", "type": "question"},
    "why": {"token": "WHY", "asset": "/assets/signs/why.svg", "type": "question"},
    "work": {"token": "WORK", "asset": "/assets/signs/work.svg", "type": "action"},
    "yes": {"token": "YES", "asset": "/assets/signs/yes.svg", "type": "response"},
    "you": {"token": "YOU", "asset": "/assets/signs/you.svg", "type": "pronoun"},
    "your": {"token": "YOUR", "asset": "/assets/signs/your.svg", "type": "pronoun"},
    "exit": {"token": "EXIT", "asset": "/assets/signs/exit.svg", "type": "direction"},
    "hospital": {"token": "HOSPITAL", "asset": "/assets/signs/hospital.svg", "type": "medical"}
}

# English stop words that are typically omitted or implied in Sign Language (ASL grammar)
STOPWORDS = {
    "is", "are", "am", "was", "were", "be", "been", "being",
    "the", "a", "an", "of", "in", "at", "to", "for", "with",
    "do", "does", "did", "can", "could", "would", "should", "shall",
    "it", "its", "there", "here", "that", "this"
}

class SpeechToSignService:
    def __init__(self, vocabulary: Dict[str, Dict[str, str]] = None):
        self.vocabulary = vocabulary or SIGN_VOCABULARY

    def convert_speech_to_sign(self, text: str) -> Tuple[List[str], List[str], List[Dict[str, Any]]]:
        """
        Processes speech string and returns:
          (sign_sequence, image_urls, detailed_tokens)
        """
        if not text or not text.strip():
            return [], [], []

        # 1. Normalize and clean string
        normalized = text.lower().strip()
        
        # Handle common multi-word sign phrases
        if "thank you" in normalized:
            normalized = normalized.replace("thank you", "thank")
        if "how are you" in normalized:
            normalized = normalized.replace("how are you", "hello")

        # Extract words (alphanumeric tokens)
        raw_words = re.findall(r"\b[a-zA-Z0-9']+\b", normalized)

        sign_sequence: List[str] = []
        image_urls: List[str] = []
        details: List[Dict[str, Any]] = []

        for word in raw_words:
            # Check if direct match in vocabulary
            if word in self.vocabulary:
                entry = self.vocabulary[word]
                token = entry["token"]
                asset = entry["asset"]
                sign_sequence.append(token)
                image_urls.append(asset)
                details.append({
                    "word": word,
                    "token": token,
                    "asset_url": asset,
                    "matched": True,
                    "category": entry.get("type", "general")
                })
            elif word in STOPWORDS:
                # Omit stop word for sign translation, but note in details
                details.append({
                    "word": word,
                    "token": None,
                    "asset_url": None,
                    "matched": False,
                    "omitted_as_stopword": True
                })
            else:
                # Unknown word: fallback to fingerspelling representation or generic sign
                fallback_token = word.upper()
                fallback_asset = f"/assets/signs/letters/{word[0].lower()}.svg" if word else "/assets/signs/default.svg"
                sign_sequence.append(fallback_token)
                image_urls.append(fallback_asset)
                details.append({
                    "word": word,
                    "token": fallback_token,
                    "asset_url": fallback_asset,
                    "matched": False,
                    "fallback": "fingerspelling"
                })

        # If all words were stopwords or nothing matched, provide default gesture
        if not sign_sequence and raw_words:
            first_word = raw_words[0].upper()
            sign_sequence.append(first_word)
            image_urls.append("/assets/signs/default.svg")

        return sign_sequence, image_urls, details


# Global instance
speech_to_sign_service = SpeechToSignService()
