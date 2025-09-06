# utils/intent_utils.py

import re
import unicodedata
from difflib import get_close_matches

# 🔤 Normalize Greek text (lowercase, no accents, no punctuation)
def normalize(text):
    text = unicodedata.normalize("NFD", text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')  # remove accents
    text = re.sub(r"[^\w\s]", "", text)  # remove punctuation
    return text.strip()

# 🎯 Ορισμένα intents που απαιτούν επιπλέον πληροφορία (π.χ. μάθημα)
FOLLOW_UP_REQUIRED = {
    "course_file_count",
    "suggest_notes_for_course"
}

# 🎯 Πιθανά intents και εναλλακτικές τους
INTENTS = {
    "top_downloaded_note": [
        "πιο κατεβασμενη σημειωση",
        "σημειωση με τις περισσοτερες ληψεις",
        "αρχειο με τα πιο πολλα downloads",
        "ποια εχει τις πιο πολλες ληψεις"
    ],
    "most_commented_note": [
        "σημειωση με τα περισσοτερα σχολια",
        "αρχειο με πολλα σχολια",
        "ποια εχει τα πιο πολλα σχολια"
    ],
    "course_file_count": [
        "ποσα αρχεια εχει το μαθημα",
        "ποσες σημειωσεις εχει το μαθημα",
        "αρχειο μαθηματος",
        "μαθημα σημειωσεις"
    ],
    "most_popular_course_by_notes": [
        "μαθημα με τις πιο πολλες σημειωσεις",
        "πιο δημοφιλες μαθημα",
        "ποιο εχει τα πιο πολλα αρχεια",
        "μαθημα με τα πιο πολλα uploads"
    ],
    "most_downloaded_course": [
        "μαθημα με τις περισσοτερες ληψεις",
        "μαθημα με τα πιο πολλα downloads",
        "ποιο μαθημα εχει τις πιο πολλες ληψεις"
    ],
    "suggest_notes_for_course": [
    "ποιες σημειωσεις να διαβασω",
    "προτεινομενες σημειωσεις για το μαθημα",
    "να δω για μαθημα",
    "σημειωσεις για το μαθημα",
    "προτεινε σημειωσεις",
    "προτεινε σημειωσεις για μαθημα",
    "προτεινε μου σημειωσεις",
    "προτεινε αρχεια",
    "τι σημειωσεις να διαβασω",
    "θελω σημειωσεις",
    "θελω να διαβασω σημειωσεις",
    "εχεις σημειωσεις για το μαθημα",
    "προτεινε σημειωσεις για τεχνητη νοημοσυνη",  
    "σημειωσεις για τεχνητη νοημοσυνη",
    "σημειωσεις τεχνητη νοημοσυνη"
    ]
}

# 🏷️ Labels για εμφάνιση στον χρήστη
INTENT_LABELS_GR = {
    "top_downloaded_note": "Πιο κατεβασμένη σημείωση",
    "most_commented_note": "Σημείωση με τα περισσότερα σχόλια",
    "course_file_count": "Πόσα αρχεία έχει ένα μάθημα",
    "most_popular_course_by_notes": "Μάθημα με τις περισσότερες σημειώσεις",
    "most_downloaded_course": "Μάθημα με τις περισσότερες λήψεις",
    "suggest_notes_for_course": "Προτεινόμενες σημειώσεις για μάθημα"
}


# 🤖 Επιστρέφει το intent με βάση την ερώτηση
def detect_intent(user_query, return_suggestion=False):
    query = normalize(user_query)

    # 🔍 Αυστηρό partial match: αν κάποιο example υπάρχει μέσα στο query
    for intent, examples in INTENTS.items():
        for example in examples:
            if normalize(example) in query:
                return intent, INTENT_LABELS_GR.get(intent, intent), None

    # 💡 Προσπάθεια suggestion με πιο χαλαρό match
    if return_suggestion:
        for intent, examples in INTENTS.items():
            for example in examples:
                example_start = normalize(example.split()[0])
                if example_start in query:
                    return None, intent, INTENT_LABELS_GR.get(intent, intent)

    # ❌ Δεν καταλάβαμε τίποτα
    return None, None, None



# ❓ Επιστρέφει αν το intent απαιτεί follow-up (π.χ. να ρωτήσουμε "Για ποιο μάθημα;")
def requires_follow_up(intent):
    return intent in FOLLOW_UP_REQUIRED
