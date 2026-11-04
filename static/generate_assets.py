"""
Generates clean, modern SVG sign graphics for the entire expanded Sign Language vocabulary.
"""

import os
from pathlib import Path

ASSET_DIR = Path(__file__).resolve().parent / "assets" / "signs"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_ICONS = {
    "hello": {"title": "HELLO", "color": "#3B82F6", "symbol": "✋", "sub": "Open Palm Wave"},
    "help": {"title": "HELP", "color": "#EF4444", "symbol": "🆘", "sub": "Support Hand / Urgency"},
    "hospital": {"title": "HOSPITAL", "color": "#10B981", "symbol": "🏥", "sub": "Cross / H-Shape Sign"},
    "doctor": {"title": "DOCTOR", "color": "#06B6D4", "symbol": "🩺", "sub": "Wrist Pulse Tap"},
    "water": {"title": "WATER", "color": "#0EA5E9", "symbol": "💧", "sub": "W-Handshape Chin Tap"},
    "food": {"title": "FOOD", "color": "#F59E0B", "symbol": "🍽️", "sub": "Flat-O Hand to Mouth"},
    "where": {"title": "WHERE", "color": "#8B5CF6", "symbol": "🧭", "sub": "Oscillating Index Finger"},
    "exit": {"title": "EXIT", "color": "#10B981", "symbol": "🚪", "sub": "Directional Way Out"},
    "thankyou": {"title": "THANK YOU", "color": "#EC4899", "symbol": "🙏", "sub": "Hand Moving from Chin"},
    "yes": {"title": "YES", "color": "#22C55E", "symbol": "✊", "sub": "Fist Nodding Motion"},
    "no": {"title": "NO", "color": "#F43F5E", "symbol": "🤏", "sub": "Two Fingers Pinch Thumb"},
    "i": {"title": "I", "color": "#6366F1", "symbol": "☝️", "sub": "Pinky Extended (ASL 'I')"},
    "iloveyou": {"title": "I LOVE YOU", "color": "#F43F5E", "symbol": "🤟", "sub": "Thumb, Index & Pinky"},
    "love": {"title": "LOVE", "color": "#F43F5E", "symbol": "❤️", "sub": "Fists Over Heart"},
    "need": {"title": "NEED", "color": "#EAB308", "symbol": "👇", "sub": "Bent Index Hook Down"},
    "pain": {"title": "PAIN", "color": "#DC2626", "symbol": "⚡", "sub": "Index Fingers Converging"},
    "restroom": {"title": "RESTROOM", "color": "#14B8A6", "symbol": "🚻", "sub": "T-Handshape Shake"},
    "please": {"title": "PLEASE", "color": "#8B5CF6", "symbol": "🤲", "sub": "Flat Hand on Chest"},
    "book": {"title": "BOOK", "color": "#3B82F6", "symbol": "📖", "sub": "Hands Opening"},
    "car": {"title": "CAR", "color": "#64748B", "symbol": "🚗", "sub": "Steering Wheel Grip"},
    "cold": {"title": "COLD", "color": "#06B6D4", "symbol": "🥶", "sub": "Shivering Fists"},
    "come": {"title": "COME", "color": "#10B981", "symbol": "👉", "sub": "Beckoning Index"},
    "day": {"title": "DAY", "color": "#F59E0B", "symbol": "☀️", "sub": "Sun Arc Sweep"},
    "friend": {"title": "FRIEND", "color": "#EC4899", "symbol": "🤝", "sub": "Interlocked Index Hooks"},
    "go": {"title": "GO", "color": "#3B82F6", "symbol": "🚀", "sub": "Pointing Away"},
    "good": {"title": "GOOD", "color": "#22C55E", "symbol": "👍", "sub": "Mouth to Flat Palm"},
    "happy": {"title": "HAPPY", "color": "#EAB308", "symbol": "😊", "sub": "Brushing Chest Upward"},
    "home": {"title": "HOME", "color": "#8B5CF6", "symbol": "🏡", "sub": "Cheek to Chin Tap"},
    "hot": {"title": "HOT", "color": "#EF4444", "symbol": "🔥", "sub": "Claw Away from Mouth"},
    "how": {"title": "HOW", "color": "#06B6D4", "symbol": "❓", "sub": "Knuckles Turning Up"},
    "know": {"title": "KNOW", "color": "#6366F1", "symbol": "💡", "sub": "Temple Tap"},
    "meet": {"title": "MEET", "color": "#10B981", "symbol": "👫", "sub": "Index Fingers Meeting"},
    "morning": {"title": "MORNING", "color": "#F59E0B", "symbol": "🌅", "sub": "Sunrise Arm Lift"},
    "mother": {"title": "MOTHER", "color": "#EC4899", "symbol": "👩", "sub": "Open 5 on Chin"},
    "father": {"title": "FATHER", "color": "#3B82F6", "symbol": "👨", "sub": "Open 5 on Forehead"},
    "my": {"title": "MY", "color": "#64748B", "symbol": "🙋", "sub": "Flat Palm on Chest"},
    "name": {"title": "NAME", "color": "#8B5CF6", "symbol": "🏷️", "sub": "H-Shapes Tapping"},
    "night": {"title": "NIGHT", "color": "#1E293B", "symbol": "🌙", "sub": "Wrist Over Forearm"},
    "now": {"title": "NOW", "color": "#06B6D4", "symbol": "⏱️", "sub": "Y-Shapes Dropping"},
    "phone": {"title": "PHONE", "color": "#3B82F6", "symbol": "📱", "sub": "Y-Shape at Ear"},
    "play": {"title": "PLAY", "color": "#22C55E", "symbol": "🎮", "sub": "Y-Shapes Shaking"},
    "sad": {"title": "SAD", "color": "#64748B", "symbol": "😢", "sub": "Drooping Open Hands"},
    "school": {"title": "SCHOOL", "color": "#F59E0B", "symbol": "🏫", "sub": "Clapping Flat Palms"},
    "see": {"title": "SEE", "color": "#06B6D4", "symbol": "👀", "sub": "V-Shape Forward"},
    "sign": {"title": "SIGN", "color": "#6366F1", "symbol": "🤟", "sub": "Circling Index Fingers"},
    "sleep": {"title": "SLEEP", "color": "#8B5CF6", "symbol": "😴", "sub": "Closing Over Face"},
    "sorry": {"title": "SORRY", "color": "#EAB308", "symbol": "🥺", "sub": "A-Fist on Chest"},
    "stop": {"title": "STOP", "color": "#EF4444", "symbol": "🛑", "sub": "Hand Chop on Palm"},
    "talk": {"title": "TALK", "color": "#3B82F6", "symbol": "🗣️", "sub": "Index Tapping Chin"},
    "time": {"title": "TIME", "color": "#06B6D4", "symbol": "⌚", "sub": "Tapping Wristwatch"},
    "tired": {"title": "TIRED", "color": "#64748B", "symbol": "🥱", "sub": "Bent Hands Drooping"},
    "today": {"title": "TODAY", "color": "#F59E0B", "symbol": "📅", "sub": "Double Y Bounce"},
    "tomorrow": {"title": "TOMORROW", "color": "#10B981", "symbol": "⏩", "sub": "A-Thumb Forward"},
    "understand": {"title": "UNDERSTAND", "color": "#EAB308", "symbol": "💡", "sub": "Index Flick Up"},
    "wait": {"title": "WAIT", "color": "#8B5CF6", "symbol": "⏳", "sub": "Fluttering Fingers"},
    "what": {"title": "WHAT", "color": "#3B82F6", "symbol": "🤔", "sub": "Palms Up Shrug"},
    "when": {"title": "WHEN", "color": "#06B6D4", "symbol": "🕒", "sub": "Index Circling Tip"},
    "who": {"title": "WHO", "color": "#6366F1", "symbol": "👤", "sub": "L-Shape at Chin"},
    "why": {"title": "WHY", "color": "#EC4899", "symbol": "❓", "sub": "Temple to Y-Shape"},
    "work": {"title": "WORK", "color": "#64748B", "symbol": "🔨", "sub": "Fist on Wrist Tap"},
    "you": {"title": "YOU", "color": "#3B82F6", "symbol": "👉", "sub": "Pointing Forward"},
    "your": {"title": "YOUR", "color": "#6366F1", "symbol": "🫱", "sub": "Flat Palm Forward"},
    "default": {"title": "SIGN", "color": "#64748B", "symbol": "🤟", "sub": "ASL Gesture Token"}
}

def create_svg(name: str, meta: dict):
    title = meta.get("title", name.upper())
    color = meta.get("color", "#64748B")
    symbol = meta.get("symbol", "🤟")
    sub = meta.get("sub", "Sign Gesture")

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <linearGradient id="grad_{name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{color}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="{color}" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="border_{name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{color}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="{color}" stop-opacity="0.3"/>
    </linearGradient>
  </defs>

  <rect x="6" y="6" width="228" height="228" rx="28" fill="#ffffff" stroke="url(#border_{name})" stroke-width="2"/>
  <rect x="12" y="12" width="216" height="216" rx="22" fill="url(#grad_{name})"/>

  <circle cx="120" cy="95" r="48" fill="{color}" fill-opacity="0.12" stroke="{color}" stroke-width="2" stroke-dasharray="4 4"/>

  <text x="120" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" text-anchor="middle" dominant-baseline="central">
    {symbol}
  </text>

  <rect x="30" y="160" width="180" height="34" rx="10" fill="{color}" fill-opacity="0.12" stroke="{color}" stroke-width="1.2"/>
  <text x="120" y="182" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="700" fill="#1e293b" text-anchor="middle">
    {title}
  </text>

  <text x="120" y="214" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">
    {sub}
  </text>
</svg>"""

    svg_file = ASSET_DIR / f"{name}.svg"
    with open(svg_file, "w", encoding="utf-8") as f:
        f.write(svg_content)
    
    png_compat_file = ASSET_DIR / f"{name}.png"
    with open(png_compat_file, "w", encoding="utf-8") as f:
        f.write(svg_content)

def main():
    for name, meta in DEFAULT_ICONS.items():
        create_svg(name, meta)
    print(f"Generated {len(DEFAULT_ICONS)} vector sign icons in {ASSET_DIR}")

if __name__ == "__main__":
    main()
