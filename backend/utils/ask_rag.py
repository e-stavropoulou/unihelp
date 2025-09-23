import json
import re
import unicodedata
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from dotenv import load_dotenv

load_dotenv()

# ensomatosi faiss
embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.load_local("../faiss_index", embedding, allow_dangerous_deserialization=True)

# ftiaxnei rag chain
llm = ChatOpenAI(model="gpt-4o")
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(),
    chain_type="stuff"
)

# kanonikopoisi keimenou
def normalize(text):
    return unicodedata.normalize("NFKC", text.strip().lower())

# metrics
def answer_from_metrics(query):
    query = query.lower()
    with open("notes_text_dataset.json", "r", encoding="utf-8") as f:
        notes = json.load(f)

    # most downloaded
    if "λήψεις" in query or "κατεβασμένη" in query:
        top_note = max(notes, key=lambda x: x.get("downloads", 0))
        return f"""📥 Πιο κατεβασμένη σημείωση:
Αρχείο: {top_note["filename"]}
Χρήστης: {top_note["uploader"]}
Μάθημα: {top_note["course"]}
Λήψεις: {top_note["downloads"]}"""

    # most commented
    elif "σχόλια" in query:
        top_note = max(notes, key=lambda x: x.get("comments", 0))
        return f"""💬 Περισσότερα σχόλια:
Αρχείο: {top_note["filename"]}
Χρήστης: {top_note["uploader"]}
Μάθημα: {top_note["course"]}
Σχόλια: {top_note["comments"]}"""

    # arxeia mathimaton
    elif "πόσα" in query and "αρχεία" in query and "μάθημα" in query:
        match = re.search(r"μάθημα\s+(.+?)[\?;.,]*$", query)
        if match:
            asked_course_raw = match.group(1).strip()
            asked_course = normalize(re.sub(r"[^\w\s]", "", asked_course_raw))  
            count = sum(1 for note in notes if normalize(note["course"]) == asked_course)

            
            for note in notes:
                if normalize(note["course"]) == asked_course:
                    display_name = note["course"]
                    break
            else:
                display_name = asked_course_raw

            return f'Το μάθημα "{display_name}" έχει {count} {"αρχεία" if count != 1 else "αρχείο"}.'



    # mathimata me perissoteres simioseis
    elif "μαθήματα" in query and "περισσότερες" in query:
        course_counts = {}
        for note in notes:
            course = normalize(note["course"])
            course_counts[course] = course_counts.get(course, 0) + 1
        max_count = max(course_counts.values())
        top_courses = [c for c, v in course_counts.items() if v == max_count]
        pretty_names = set(note["course"] for note in notes if normalize(note["course"]) in top_courses)
        return f'📚 Τα μαθήματα με τις περισσότερες σημειώσεις ({max_count}):\n' + "\n".join(f"• {name}" for name in pretty_names)

    return None

# erotisi xristi
while True:
    query = input("\n❓ Ρώτα το UniHelp Bot (ή γράψε 'exit'): ")
    if query.lower() == "exit":
        break

    response = qa_chain.invoke(query)
    print(f"\n🤖 Bot: {response['result']}")
    