"""
Fatboy v4 — full character × state matrix.

Generates 8 characters × 8 states = 64 SVG files.
Each combination = state-specific face/hands + character-specific accessories.

Output structure:
  svg/characters/{character}/{state}.svg

Architecture:
  - Base body, sheen, cheeks, feet, eyes, mouth, hands are state-specific.
  - Top sheen, daemao, cheek/mouth visibility flags are character-controlled.
  - Character accessory layer sits on top of everything else.
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'svg', 'characters')


# =====================================================
#  SHARED DEFS (gradients - used by all combinations)
# =====================================================
DEFS = '''<defs>
  <radialGradient id="body" cx="40%" cy="28%" r="75%">
    <stop offset="0%"  stop-color="#FFF6D0"/>
    <stop offset="35%" stop-color="#FFE082"/>
    <stop offset="70%" stop-color="#F4C752"/>
    <stop offset="100%" stop-color="#C77F18"/>
  </radialGradient>
  <radialGradient id="belly" cx="50%" cy="68%" r="48%">
    <stop offset="0%"  stop-color="#FFFAE0" stop-opacity="0.95"/>
    <stop offset="55%" stop-color="#FFEDB0" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#F4C752" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="sheen" cx="50%" cy="50%" r="50%">
    <stop offset="0%"  stop-color="#FFFFFF" stop-opacity="0.85"/>
    <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="cheek" cx="50%" cy="50%" r="55%">
    <stop offset="0%"  stop-color="#FF9DAE" stop-opacity="{cheek_a}"/>
    <stop offset="60%" stop-color="#FFB3B3" stop-opacity="{cheek_a2}"/>
    <stop offset="100%" stop-color="#FFB3B3" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="shadow" cx="50%" cy="50%">
    <stop offset="0%"  stop-color="#000" stop-opacity="0.4"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="iris" cx="50%" cy="45%" r="60%">
    <stop offset="0%"  stop-color="#3A2418"/>
    <stop offset="80%" stop-color="#1F1208"/>
    <stop offset="100%" stop-color="#0D0703"/>
  </radialGradient>
  <radialGradient id="limb" cx="40%" cy="30%" r="80%">
    <stop offset="0%"  stop-color="#FFD978"/>
    <stop offset="60%" stop-color="#E8A93C"/>
    <stop offset="100%" stop-color="#B8742C"/>
  </radialGradient>
  <radialGradient id="chinShadow" cx="50%" cy="50%" r="50%">
    <stop offset="0%"  stop-color="#C77F18" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="#C77F18" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="racerRed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#E53935"/>
    <stop offset="100%" stop-color="#8E0000"/>
  </linearGradient>
  <radialGradient id="astroDome" cx="35%" cy="30%" r="70%">
    <stop offset="0%"  stop-color="#E3F2FD" stop-opacity="0.5"/>
    <stop offset="60%" stop-color="#90CAF9" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#1976D2" stop-opacity="0.1"/>
  </radialGradient>
  <linearGradient id="silver" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ECEFF1"/>
    <stop offset="50%" stop-color="#B0BEC5"/>
    <stop offset="100%" stop-color="#607D8B"/>
  </linearGradient>
  <linearGradient id="wizardPurple" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#9C27B0"/>
    <stop offset="100%" stop-color="#4A148C"/>
  </linearGradient>
  <linearGradient id="pirateBlack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#37474F"/>
    <stop offset="100%" stop-color="#000000"/>
  </linearGradient>
  <linearGradient id="ninjaBlack" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#263238"/>
    <stop offset="100%" stop-color="#000000"/>
  </linearGradient>
</defs>'''

# =====================================================
#  SHARED BASE PIECES
# =====================================================
BASE_BACK = '''<ellipse cx="120" cy="232" rx="62" ry="8" fill="url(#shadow)"/>
<ellipse cx="195" cy="200" rx="11" ry="7" fill="url(#limb)" transform="rotate(28 195 200)"/>
<ellipse cx="201" cy="206" rx="4" ry="3" fill="#FFD978" opacity="0.8"/>'''

BASE_BODY = '''<path d="M 120 35 C 175 35, 205 75, 205 130 C 205 190, 175 220, 120 220 C 65 220, 35 190, 35 130 C 35 75, 65 35, 120 35 Z" fill="url(#body)"/>
<ellipse cx="120" cy="150" rx="60" ry="55" fill="url(#belly)"/>
<ellipse cx="120" cy="190" rx="55" ry="18" fill="url(#chinShadow)"/>'''

TOP_SHEEN = '''<ellipse cx="92" cy="62" rx="32" ry="18" fill="url(#sheen)"/>
<ellipse cx="78" cy="55" rx="9" ry="5" fill="#FFFFFF" opacity="0.7"/>'''

DAEMAO = '''<path d="M 116 35 C 116 22, 122 14, 128 16 C 134 18, 136 28, 132 32 C 128 30, 124 32, 120 33 Z" fill="#E8A93C"/>
<path d="M 116 35 C 116 22, 122 14, 128 16 C 134 18, 136 28, 132 32" stroke="#B8742C" stroke-width="1.2" fill="none" stroke-linecap="round"/>
<ellipse cx="124" cy="22" rx="2" ry="3" fill="#FFE082" opacity="0.85"/>
<ellipse cx="104" cy="38" rx="4" ry="2.5" fill="#E8A93C" opacity="0.6"/>'''

FEET = '''<ellipse cx="96" cy="220" rx="20" ry="12" fill="url(#limb)"/>
<ellipse cx="89" cy="215" rx="7" ry="3.5" fill="#FFD978" opacity="0.7"/>
<ellipse cx="144" cy="220" rx="20" ry="12" fill="url(#limb)"/>
<ellipse cx="137" cy="215" rx="7" ry="3.5" fill="#FFD978" opacity="0.7"/>'''

CHEEKS = '''<ellipse cx="68" cy="150" rx="16" ry="11" fill="url(#cheek)"/>
<ellipse cx="172" cy="150" rx="16" ry="11" fill="url(#cheek)"/>'''


# =====================================================
#  PER-STATE: EYES
# =====================================================
EYES = {
    'default': '''<ellipse cx="92" cy="120" rx="17" ry="22" fill="#FFFFFF"/>
<ellipse cx="148" cy="120" rx="17" ry="22" fill="#FFFFFF"/>
<ellipse cx="94" cy="124" rx="12" ry="16" fill="url(#iris)"/>
<ellipse cx="150" cy="124" rx="12" ry="16" fill="url(#iris)"/>
<ellipse cx="89" cy="116" rx="5" ry="6.5" fill="#FFFFFF"/>
<ellipse cx="145" cy="116" rx="5" ry="6.5" fill="#FFFFFF"/>
<circle cx="99" cy="130" r="2" fill="#FFFFFF" opacity="0.85"/>
<circle cx="155" cy="130" r="2" fill="#FFFFFF" opacity="0.85"/>''',

    'thinking': '''<ellipse cx="92" cy="120" rx="17" ry="22" fill="#FFFFFF"/>
<ellipse cx="148" cy="120" rx="17" ry="22" fill="#FFFFFF"/>
<ellipse cx="98" cy="115" rx="11" ry="14" fill="url(#iris)"/>
<ellipse cx="154" cy="115" rx="11" ry="14" fill="url(#iris)"/>
<ellipse cx="93" cy="108" rx="4" ry="5" fill="#FFFFFF"/>
<ellipse cx="149" cy="108" rx="4" ry="5" fill="#FFFFFF"/>
<circle cx="103" cy="120" r="1.8" fill="#FFFFFF" opacity="0.85"/>
<circle cx="159" cy="120" r="1.8" fill="#FFFFFF" opacity="0.85"/>''',

    'focused': '''<path d="M 75 122 Q 92 110 109 122 Q 92 132 75 122 Z" fill="url(#iris)"/>
<path d="M 131 122 Q 148 110 165 122 Q 148 132 131 122 Z" fill="url(#iris)"/>
<circle cx="89" cy="119" r="2" fill="#FFFFFF"/>
<circle cx="145" cy="119" r="2" fill="#FFFFFF"/>
<path d="M 72 100 Q 88 96 102 105" stroke="#3D2817" stroke-width="4" stroke-linecap="round" fill="none"/>
<path d="M 138 105 Q 152 96 168 100" stroke="#3D2817" stroke-width="4" stroke-linecap="round" fill="none"/>''',

    'tense': '''<ellipse cx="92" cy="122" rx="16" ry="20" fill="#FFFFFF"/>
<ellipse cx="148" cy="122" rx="16" ry="20" fill="#FFFFFF"/>
<ellipse cx="92" cy="128" rx="8" ry="11" fill="url(#iris)"/>
<ellipse cx="148" cy="128" rx="8" ry="11" fill="url(#iris)"/>
<circle cx="89" cy="122" r="2.5" fill="#FFFFFF"/>
<circle cx="145" cy="122" r="2.5" fill="#FFFFFF"/>
<path d="M 105 100 Q 88 95 72 102" stroke="#3D2817" stroke-width="3.5" stroke-linecap="round" fill="none"/>
<path d="M 135 100 Q 152 95 168 102" stroke="#3D2817" stroke-width="3.5" stroke-linecap="round" fill="none"/>''',

    'victory': '''<path d="M 72 118 Q 92 100 112 118" stroke="#3A2418" stroke-width="5" stroke-linecap="round" fill="none"/>
<path d="M 128 118 Q 148 100 168 118" stroke="#3A2418" stroke-width="5" stroke-linecap="round" fill="none"/>''',

    'celebrate': '''<ellipse cx="92" cy="120" rx="19" ry="24" fill="#FFFFFF"/>
<ellipse cx="148" cy="120" rx="19" ry="24" fill="#FFFFFF"/>
<ellipse cx="94" cy="124" rx="14" ry="18" fill="url(#iris)"/>
<ellipse cx="150" cy="124" rx="14" ry="18" fill="url(#iris)"/>
<path d="M 92 116 L 95 122 L 101 124 L 95 126 L 92 132 L 89 126 L 83 124 L 89 122 Z" fill="#FFD15C"/>
<path d="M 148 116 L 151 122 L 157 124 L 151 126 L 148 132 L 145 126 L 139 124 L 145 122 Z" fill="#FFD15C"/>
<circle cx="88" cy="114" r="2.5" fill="#FFFFFF"/>
<circle cx="144" cy="114" r="2.5" fill="#FFFFFF"/>''',

    'resting': '''<path d="M 74 122 Q 92 132 110 122" stroke="#3A2418" stroke-width="4" stroke-linecap="round" fill="none"/>
<path d="M 130 122 Q 148 132 166 122" stroke="#3A2418" stroke-width="4" stroke-linecap="round" fill="none"/>''',

    'sleeping': '''<line x1="74" y1="124" x2="110" y2="124" stroke="#3A2418" stroke-width="4" stroke-linecap="round"/>
<line x1="130" y1="124" x2="166" y2="124" stroke="#3A2418" stroke-width="4" stroke-linecap="round"/>
<path d="M 76 124 L 73 128" stroke="#3A2418" stroke-width="2" stroke-linecap="round"/>
<path d="M 164 124 L 167 128" stroke="#3A2418" stroke-width="2" stroke-linecap="round"/>''',
}

# =====================================================
#  PER-STATE: MOUTHS
# =====================================================
MOUTHS = {
    'default':  '<ellipse cx="120" cy="168" rx="6" ry="7" fill="#5C2618"/><ellipse cx="120" cy="171" rx="4" ry="3" fill="#FF6B8B"/>',
    'thinking': '<path d="M 110 172 Q 120 168 130 172" stroke="#5C2618" stroke-width="3" stroke-linecap="round" fill="none"/>',
    'focused':  '<path d="M 108 170 Q 120 174 132 170" stroke="#5C2618" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
    'tense': '''<rect x="105" y="166" width="30" height="10" rx="2" fill="#FFFFFF" stroke="#5C2618" stroke-width="2"/>
<line x1="113" y1="166" x2="113" y2="176" stroke="#5C2618" stroke-width="1.3"/>
<line x1="120" y1="166" x2="120" y2="176" stroke="#5C2618" stroke-width="1.3"/>
<line x1="127" y1="166" x2="127" y2="176" stroke="#5C2618" stroke-width="1.3"/>''',
    'victory': '''<path d="M 100 162 Q 120 192 140 162 Q 120 174 100 162 Z" fill="#5C2618"/>
<path d="M 110 178 Q 120 188 130 178 Q 120 183 110 178 Z" fill="#FF6B8B"/>''',
    'celebrate': '''<path d="M 96 158 Q 120 196 144 158 Q 120 174 96 158 Z" fill="#5C2618"/>
<path d="M 108 178 Q 120 192 132 178 Q 120 184 108 178 Z" fill="#FF6B8B"/>''',
    'resting':  '<path d="M 112 170 Q 120 176 128 170" stroke="#5C2618" stroke-width="3" stroke-linecap="round" fill="none"/>',
    'sleeping': '<ellipse cx="120" cy="172" rx="5" ry="3" fill="#5C2618" opacity="0.85"/>',
}

# =====================================================
#  PER-STATE: HANDS
# =====================================================
HANDS = {
    'default': '''<ellipse cx="38" cy="160" rx="14" ry="17" fill="url(#limb)"/>
<ellipse cx="32" cy="155" rx="5" ry="3" fill="#FFD978" opacity="0.7"/>
<ellipse cx="202" cy="160" rx="14" ry="17" fill="url(#limb)"/>
<ellipse cx="208" cy="155" rx="5" ry="3" fill="#FFD978" opacity="0.7"/>''',

    'thinking': '''<ellipse cx="38" cy="160" rx="14" ry="17" fill="url(#limb)"/>
<ellipse cx="32" cy="155" rx="5" ry="3" fill="#FFD978" opacity="0.7"/>
<ellipse cx="148" cy="178" rx="13" ry="15" fill="url(#limb)" transform="rotate(-35 148 178)"/>''',

    'focused': '''<circle cx="40" cy="155" r="17" fill="url(#limb)"/>
<line x1="30" y1="155" x2="50" y2="155" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>
<ellipse cx="34" cy="148" rx="5" ry="3" fill="#FFD978" opacity="0.7"/>
<circle cx="200" cy="155" r="17" fill="url(#limb)"/>
<line x1="190" y1="155" x2="210" y2="155" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>
<ellipse cx="206" cy="148" rx="5" ry="3" fill="#FFD978" opacity="0.7"/>''',

    'tense': '''<circle cx="46" cy="138" r="16" fill="url(#limb)"/>
<line x1="36" y1="138" x2="56" y2="138" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>
<circle cx="194" cy="138" r="16" fill="url(#limb)"/>
<line x1="184" y1="138" x2="204" y2="138" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>''',

    'victory': '''<path d="M 50 115 Q 38 90 28 65" stroke="url(#limb)" stroke-width="18" stroke-linecap="round" fill="none"/>
<path d="M 190 115 Q 202 90 212 65" stroke="url(#limb)" stroke-width="18" stroke-linecap="round" fill="none"/>
<circle cx="26" cy="60" r="15" fill="url(#limb)"/>
<line x1="16" y1="60" x2="36" y2="60" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>
<circle cx="214" cy="60" r="15" fill="url(#limb)"/>
<line x1="204" y1="60" x2="224" y2="60" stroke="#B8742C" stroke-width="1.3" opacity="0.6"/>''',

    'celebrate': '''<path d="M 45 140 Q 25 130 12 110" stroke="url(#limb)" stroke-width="16" stroke-linecap="round" fill="none"/>
<path d="M 195 140 Q 215 130 228 110" stroke="url(#limb)" stroke-width="16" stroke-linecap="round" fill="none"/>
<circle cx="10" cy="106" r="14" fill="url(#limb)"/>
<circle cx="230" cy="106" r="14" fill="url(#limb)"/>''',

    'resting': '''<ellipse cx="78" cy="190" rx="14" ry="11" fill="url(#limb)"/>
<ellipse cx="162" cy="190" rx="14" ry="11" fill="url(#limb)"/>''',

    'sleeping': '''<ellipse cx="38" cy="170" rx="14" ry="17" fill="url(#limb)"/>
<ellipse cx="202" cy="170" rx="14" ry="17" fill="url(#limb)"/>''',
}

# =====================================================
#  PER-STATE: FRONT EXTRAS (stars, sweat, Z's, tea cup)
# =====================================================
EXTRAS_FRONT = {
    'default': '',

    'thinking': '''<circle cx="195" cy="78" r="3.5" fill="#FFFFFF" opacity="0.7"/>
<circle cx="208" cy="60" r="6" fill="#FFFFFF" opacity="0.8"/>
<circle cx="222" cy="38" r="13" fill="#FFFFFF" opacity="0.92"/>
<text x="222" y="44" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#5C4B2A" text-anchor="middle">?</text>''',

    'focused': '''<path d="M -12 125 L 4 125" stroke="#A78BFA" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
<path d="M 236 125 L 252 125" stroke="#A78BFA" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
<path d="M -8 150 L 6 150" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
<path d="M 234 150 L 248 150" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
<path d="M -4 100 L 8 100" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>
<path d="M 232 100 L 244 100" stroke="#A78BFA" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>''',

    'tense': '''<path d="M 60 80 Q 53 95 60 102 Q 67 95 60 80 Z" fill="#7BC8F6" opacity="0.95"/>
<ellipse cx="59" cy="92" rx="2" ry="3" fill="#FFFFFF" opacity="0.7"/>
<path d="M 175 95 Q 170 106 175 112 Q 180 106 175 95 Z" fill="#7BC8F6" opacity="0.95"/>''',

    'victory': '''<g fill="#FFD15C">
  <path d="M 0 50 L 3 58 L 11 60 L 3 62 L 0 70 L -3 62 L -11 60 L -3 58 Z"/>
  <path d="M 240 42 L 244 52 L 254 55 L 244 58 L 240 68 L 236 58 L 226 55 L 236 52 Z"/>
  <path d="M -10 165 L -8 170 L -3 171.5 L -8 173 L -10 178 L -12 173 L -17 171.5 L -12 170 Z"/>
  <path d="M 250 168 L 252 173 L 257 174.5 L 252 176 L 250 181 L 248 176 L 243 174.5 L 248 173 Z"/>
</g>''',

    'celebrate': '''<g>
  <rect x="10" y="45" width="9" height="5" fill="#FFD15C" transform="rotate(20 14 47)"/>
  <rect x="222" y="35" width="9" height="5" fill="#A78BFA" transform="rotate(-30 226 37)"/>
  <rect x="60" y="20" width="7" height="4" fill="#FF6B8B" transform="rotate(45 63 22)"/>
  <rect x="170" y="50" width="7" height="4" fill="#7BC8F6" transform="rotate(60 173 52)"/>
  <rect x="-6" y="85" width="9" height="5" fill="#FFD15C" transform="rotate(-15 -2 87)"/>
  <rect x="240" y="90" width="7" height="4" fill="#FF6B8B" transform="rotate(75 243 92)"/>
  <rect x="80" y="10" width="7" height="4" fill="#A78BFA" transform="rotate(-20 83 12)"/>
  <rect x="150" y="8" width="7" height="4" fill="#7BC8F6" transform="rotate(40 153 10)"/>
  <circle cx="28" cy="22" r="3" fill="#A78BFA"/>
  <circle cx="210" cy="14" r="3" fill="#FFD15C"/>
  <circle cx="120" cy="-2" r="2.5" fill="#FF6B8B"/>
  <circle cx="256" cy="68" r="2.5" fill="#7BC8F6"/>
  <circle cx="-16" cy="62" r="2.5" fill="#FFD15C"/>
</g>''',

    'resting': '''<ellipse cx="220" cy="215" rx="14" ry="4" fill="#5C4B2A" opacity="0.4"/>
<path d="M 208 195 L 208 210 Q 208 214 212 214 L 228 214 Q 232 214 232 210 L 232 195 Z" fill="#F4E4C1" stroke="#5C4B2A" stroke-width="2"/>
<ellipse cx="220" cy="195" rx="12" ry="3" fill="#8B5A2B"/>
<path d="M 232 200 Q 244 200 244 207 Q 244 214 232 214" stroke="#5C4B2A" stroke-width="2" fill="none"/>
<path d="M 212 188 Q 215 180 212 172 Q 215 165 212 158" stroke="#B8B8B8" stroke-width="1.8" fill="none" opacity="0.7" stroke-linecap="round"/>
<path d="M 220 188 Q 223 180 220 172 Q 223 165 220 158" stroke="#B8B8B8" stroke-width="1.8" fill="none" opacity="0.7" stroke-linecap="round"/>
<path d="M 228 188 Q 231 180 228 172" stroke="#B8B8B8" stroke-width="1.8" fill="none" opacity="0.7" stroke-linecap="round"/>''',

    'sleeping': '''<text x="210" y="82" font-family="Georgia, serif" font-size="16" fill="#A78BFA" font-weight="bold" opacity="0.85">z</text>
<text x="226" y="58" font-family="Georgia, serif" font-size="24" fill="#A78BFA" font-weight="bold" opacity="0.85">Z</text>
<text x="244" y="28" font-family="Georgia, serif" font-size="32" fill="#A78BFA" font-weight="bold" opacity="0.8">Z</text>''',
}


# =====================================================
#  PER-CHARACTER: ACCESSORY + VISIBILITY FLAGS
# =====================================================
CHARACTERS = {
    'default': {
        'show_daemao': True,
        'show_cheeks': True,
        'show_mouth': True,
        'show_top_sheen': True,
        'accessory': '',
    },

    'racer': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': False,
        'accessory': '''<path d="M 30 95 Q 30 30, 120 25 Q 210 30, 210 95 L 210 102 L 30 102 Z" fill="url(#racerRed)" stroke="#5A0E0E" stroke-width="2"/>
<path d="M 32 95 Q 32 38, 120 30 Q 208 38, 208 95 L 208 100 L 32 100 Z" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.2"/>
<ellipse cx="80" cy="55" rx="22" ry="14" fill="#FFFFFF" opacity="0.35"/>
<rect x="30" y="55" width="180" height="14" fill="#FFFFFF"/>
<text x="120" y="50" font-family="Arial Black, sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle" stroke="#5A0E0E" stroke-width="1">7</text>
<rect x="30" y="88" width="180" height="6" fill="#1A1A1A"/>
<ellipse cx="80" cy="91" rx="12" ry="8" fill="#37474F" stroke="#1A1A1A" stroke-width="2"/>
<ellipse cx="77" cy="89" rx="4" ry="3" fill="#7BC8F6" opacity="0.7"/>
<ellipse cx="160" cy="91" rx="12" ry="8" fill="#37474F" stroke="#1A1A1A" stroke-width="2"/>
<ellipse cx="157" cy="89" rx="4" ry="3" fill="#7BC8F6" opacity="0.7"/>''',
    },

    'astronaut': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': False,
        'accessory': '''<ellipse cx="120" cy="195" rx="80" ry="14" fill="url(#silver)" stroke="#455A64" stroke-width="2"/>
<ellipse cx="120" cy="195" rx="76" ry="10" fill="none" stroke="#455A64" stroke-width="1"/>
<circle cx="55" cy="195" r="3" fill="#FFD600"/>
<circle cx="185" cy="195" r="3" fill="#4FC3F7"/>
<circle cx="120" cy="130" r="100" fill="url(#astroDome)" stroke="#B0BEC5" stroke-width="3"/>
<path d="M 55 80 Q 90 35 145 35" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="0.65" stroke-linecap="round"/>
<path d="M 60 95 Q 78 70 100 60" stroke="#FFFFFF" stroke-width="2.5" fill="none" opacity="0.5" stroke-linecap="round"/>
<line x1="180" y1="50" x2="195" y2="22" stroke="#90A4AE" stroke-width="3" stroke-linecap="round"/>
<circle cx="195" cy="20" r="5" fill="#FF5252"/>
<circle cx="194" cy="19" r="2" fill="#FFCDD2" opacity="0.9"/>
<rect x="100" y="180" width="40" height="10" rx="2" fill="#1A237E" stroke="#0D1442" stroke-width="1"/>
<text x="120" y="188" font-family="Arial Black, sans-serif" font-size="8" font-weight="900" fill="#FFFFFF" text-anchor="middle">SPACE</text>''',
    },

    'pirate': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': True,
        'accessory': '''<path d="M 18 60 Q 30 70, 50 65 L 45 75 Q 25 78, 18 60 Z" fill="url(#pirateBlack)"/>
<path d="M 222 60 Q 210 70, 190 65 L 195 75 Q 215 78, 222 60 Z" fill="url(#pirateBlack)"/>
<path d="M 30 60 Q 35 25, 120 12 Q 205 25, 210 60 Q 200 78, 175 72 Q 150 68, 120 68 Q 90 68, 65 72 Q 40 78, 30 60 Z" fill="url(#pirateBlack)" stroke="#000" stroke-width="1"/>
<path d="M 50 35 Q 100 22, 150 27" stroke="#546E7A" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>
<g transform="translate(120 42)">
  <ellipse cx="0" cy="0" rx="12" ry="13" fill="#F5F5F5"/>
  <ellipse cx="-4" cy="-2" rx="3" ry="3.5" fill="#1A1A1A"/>
  <ellipse cx="4" cy="-2" rx="3" ry="3.5" fill="#1A1A1A"/>
  <path d="M -2 5 L 0 9 L 2 5 Z" fill="#1A1A1A"/>
  <line x1="-4" y1="10" x2="4" y2="10" stroke="#1A1A1A" stroke-width="1.5"/>
  <line x1="-14" y1="10" x2="14" y2="10" stroke="#F5F5F5" stroke-width="3" stroke-linecap="round"/>
  <line x1="-12" y1="14" x2="-16" y2="6" stroke="#F5F5F5" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="12" y1="14" x2="16" y2="6" stroke="#F5F5F5" stroke-width="2.5" stroke-linecap="round"/>
</g>
<ellipse cx="148" cy="120" rx="22" ry="20" fill="#1A1A1A"/>
<ellipse cx="148" cy="120" rx="18" ry="16" fill="none" stroke="#37474F" stroke-width="1" opacity="0.5"/>
<path d="M 130 110 Q 80 85, 35 82" stroke="#1A1A1A" stroke-width="2.5" fill="none"/>
<path d="M 165 122 Q 200 122, 220 120" stroke="#1A1A1A" stroke-width="2.5" fill="none"/>''',
    },

    'ninja': {
        'show_daemao': False, 'show_cheeks': False, 'show_mouth': False, 'show_top_sheen': False,
        'accessory': '''<path d="M 25 105 Q 22 30, 120 22 Q 218 30, 215 105 L 215 105 Q 205 102, 175 102 L 65 102 Q 35 102, 25 105 Z" fill="url(#ninjaBlack)" stroke="#000" stroke-width="1"/>
<path d="M 50 40 Q 100 28, 150 32" stroke="#37474F" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>
<path d="M 50 105 Q 80 95, 100 100 Q 120 102, 140 100 Q 160 95, 190 105" stroke="#000" stroke-width="1" fill="none"/>
<rect x="22" y="92" width="200" height="14" fill="#FFFFFF"/>
<path d="M 218 88 L 232 92 L 228 106 L 218 102 Z" fill="#FFFFFF"/>
<path d="M 228 92 L 240 100" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
<circle cx="120" cy="99" r="6" fill="#D32F2F"/>
<path d="M 30 140 Q 35 132, 75 130 L 165 130 Q 205 132, 210 140 L 210 200 Q 195 218, 165 218 L 75 218 Q 45 218, 30 200 Z" fill="url(#ninjaBlack)" stroke="#000" stroke-width="1"/>
<path d="M 35 138 Q 80 134, 120 134 Q 160 134, 205 138" stroke="#37474F" stroke-width="1.5" fill="none" opacity="0.6"/>''',
    },

    'mario': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': False,
        'accessory': '''<path d="M 35 70 Q 30 25, 120 18 Q 210 25, 205 70 Z" fill="#E53935" stroke="#8E0000" stroke-width="2"/>
<path d="M 30 70 Q 80 85, 120 78 Q 160 85, 210 70 L 210 78 Q 160 92, 120 86 Q 80 92, 30 78 Z" fill="#C62828" stroke="#8E0000" stroke-width="1.5"/>
<ellipse cx="85" cy="42" rx="20" ry="10" fill="#FFFFFF" opacity="0.3"/>
<circle cx="120" cy="48" r="15" fill="#FFFFFF" stroke="#8E0000" stroke-width="1.5"/>
<text x="120" y="55" font-family="Arial Black, sans-serif" font-size="20" font-weight="900" fill="#E53935" text-anchor="middle">M</text>
<g transform="translate(120 158)">
  <path d="M 0 0 Q -8 -2, -18 -1 Q -26 0, -28 4 Q -25 7, -18 6 Q -10 5, -2 4 Z" fill="#2C1810"/>
  <path d="M 0 0 Q 8 -2, 18 -1 Q 26 0, 28 4 Q 25 7, 18 6 Q 10 5, 2 4 Z" fill="#2C1810"/>
  <ellipse cx="0" cy="1" rx="4" ry="3" fill="#2C1810"/>
</g>''',
    },

    'knight': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': False,
        'accessory': '''<path d="M 28 100 Q 28 28, 120 22 Q 212 28, 212 100 L 212 105 L 28 105 Z" fill="url(#silver)" stroke="#455A64" stroke-width="2"/>
<rect x="28" y="98" width="184" height="10" fill="#78909C" stroke="#455A64" stroke-width="1"/>
<circle cx="45" cy="103" r="2.5" fill="#37474F"/>
<circle cx="120" cy="103" r="2.5" fill="#37474F"/>
<circle cx="195" cy="103" r="2.5" fill="#37474F"/>
<path d="M 120 22 L 124 90 L 116 90 Z" fill="#78909C"/>
<rect x="115" y="100" width="10" height="22" fill="#90A4AE" stroke="#455A64" stroke-width="1" rx="2"/>
<ellipse cx="80" cy="48" rx="22" ry="14" fill="#FFFFFF" opacity="0.45"/>
<g transform="translate(120 22)">
  <path d="M 0 0 Q -4 -15, -2 -28 Q 0 -36, 4 -32 Q 6 -18, 4 -6 Z" fill="#D32F2F"/>
  <path d="M 0 0 Q -2 -10, 2 -20 Q 6 -28, 8 -22 Q 10 -14, 6 -4 Z" fill="#F44336"/>
  <path d="M 2 -20 Q 4 -10, 4 -2" stroke="#FFCDD2" stroke-width="1" fill="none" opacity="0.6"/>
</g>''',
    },

    'wizard': {
        'show_daemao': False, 'show_cheeks': True, 'show_mouth': True, 'show_top_sheen': True,
        'accessory': '''<ellipse cx="120" cy="65" rx="95" ry="14" fill="#5E1187" stroke="#3D0058" stroke-width="2"/>
<ellipse cx="120" cy="63" rx="92" ry="10" fill="url(#wizardPurple)"/>
<path d="M 55 65 Q 70 50, 95 30 Q 115 10, 140 -10 Q 150 -16, 155 -8 Q 160 0, 155 8 Q 145 25, 175 65 Z" fill="url(#wizardPurple)" stroke="#3D0058" stroke-width="2"/>
<circle cx="151" cy="-7" r="4" fill="#FFD600" stroke="#B8860B" stroke-width="1"/>
<path d="M 58 60 Q 70 50, 95 35 Q 100 38, 80 56 Q 65 64, 58 60 Z" fill="#FFD600" stroke="#B8860B" stroke-width="1"/>
<g transform="translate(112 35)">
  <circle cx="0" cy="0" r="7" fill="#FFD600"/>
  <circle cx="3" cy="-1" r="6" fill="url(#wizardPurple)"/>
</g>
<g fill="#FFD600">
  <path d="M 92 50 L 94 54 L 98 55 L 94 56 L 92 60 L 90 56 L 86 55 L 90 54 Z"/>
  <path d="M 130 20 L 131.5 23.5 L 135 24.5 L 131.5 25.5 L 130 29 L 128.5 25.5 L 125 24.5 L 128.5 23.5 Z"/>
  <path d="M 145 50 L 146 52.5 L 148.5 53 L 146 54 L 145 56.5 L 144 54 L 141.5 53 L 144 52.5 Z"/>
</g>
<path d="M 70 55 Q 95 40, 110 30" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.3" stroke-linecap="round"/>''',
    },
}


# =====================================================
#  BUILD ONE COMBINATION
# =====================================================
def build_combo(character, state):
    config = CHARACTERS[character]
    cheek_a  = '0.45' if state == 'sleeping' else '0.95'
    cheek_a2 = '0.25' if state == 'sleeping' else '0.45'
    defs = DEFS.replace('{cheek_a}', cheek_a).replace('{cheek_a2}', cheek_a2)

    parts = [
        f'<svg viewBox="-20 -40 280 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fatboy {character} {state}">',
        defs,
        BASE_BACK,
        BASE_BODY,
    ]
    if config['show_top_sheen']:
        parts.append(TOP_SHEEN)
    if config['show_daemao']:
        parts.append(DAEMAO)

    parts.append(HANDS[state])
    parts.append(FEET)

    if config['show_cheeks']:
        parts.append(CHEEKS)

    parts.append(EYES[state])

    if config['show_mouth']:
        parts.append(MOUTHS[state])

    parts.append(EXTRAS_FRONT[state])
    parts.append(config['accessory'])
    parts.append('</svg>')

    return '\n'.join(parts)


# =====================================================
#  MAIN
# =====================================================
def main():
    states = list(EYES.keys())
    chars = list(CHARACTERS.keys())

    total = 0
    for character in chars:
        char_dir = os.path.join(OUT, character)
        os.makedirs(char_dir, exist_ok=True)
        for state in states:
            svg = build_combo(character, state)
            path = os.path.join(char_dir, f'{state}.svg')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(svg)
            total += 1
        print(f'  ✓ {character} ({len(states)} states)')

    print(f'\nGenerated {total} SVGs total ({len(chars)} × {len(states)} matrix)')
    print(f'Output: {OUT}')


if __name__ == '__main__':
    main()
