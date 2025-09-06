import re
import unicodedata
import json
from difflib import get_close_matches

# 🔤 Κανονικοποίηση ελληνικού κειμένου
def normalize(text):
    text = unicodedata.normalize("NFD", text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')  # remove accents
    text = re.sub(r"[^\w\s]", "", text)  # remove punctuation
    return text.strip()

# 📘 Εντοπίζει όνομα μαθήματος από το query
def extract_course_from_query(query):
    norm_query = normalize(query)

        # ✅ Αφαίρεση κοινών περιττών λέξεων
    norm_query = re.sub(r"\b(προτεινε|σημειωσεις|για|υλικο|προταση|θελω|το|την|τις|του|της|μαθημα)\b", "", norm_query)
    norm_query = re.sub(r"\s+", " ", norm_query).strip()


    # 🔄 Φόρτωσε τα διαθέσιμα μαθήματα από το JSON
    with open("notes_text_dataset.json", "r", encoding="utf-8") as f:
        notes = json.load(f)

    known_courses = list(set(normalize(n["course"]) for n in notes))

    # 1️⃣ Direct match μέσα στο query
    for course in known_courses:
        if course in norm_query:
            return course

    # 2️⃣ Regex match για "μάθημα Χ"
    match = re.search(r"(?:για\s+)?(?:το\s+)?(?:μαθημα\s+)?(.+?)(?:[\?.,]|$)", norm_query)
    if match:
        course_candidate = normalize(match.group(1).strip())
        if course_candidate in known_courses:
            return course_candidate

    # 3️⃣ Προσπάθεια με κάθε λέξη του query
    tokens = norm_query.split()
    for token in tokens:
        match = get_close_matches(token, known_courses, n=1, cutoff=0.7)
        if match:
            return match[0]

    # 4️⃣ Προσπάθεια με όλα τα n-grams του query
    for i in range(len(tokens)):
        for j in range(i + 1, len(tokens) + 1):
            phrase = ' '.join(tokens[i:j])
            match = get_close_matches(phrase, known_courses, n=1, cutoff=0.6)
            if match:
                return match[0]

    return None
