import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
import os
from dotenv import load_dotenv

load_dotenv()  # αν έχεις .env με OPENAI_API_KEY

# 📁 Διαδρομή στο json που έφτιαξες νωρίτερα
DATA_PATH = "notes_text_dataset.json"
INDEX_PATH = "faiss_index"

# 🔑 Ενσωμάτωση OpenAI Embeddings
embedding = OpenAIEmbeddings(model="text-embedding-3-small")

# 📄 Φόρτωση αρχείων
with open(DATA_PATH, "r", encoding="utf-8") as f:
    notes = json.load(f)

# ➕ Μετατροπή σε εμπλουτισμένα LangChain Documents
docs = []
for note in notes:
    metadata = {
    "filename": note.get("filename", "χωρίς όνομα"),
    "title": note.get("title", "χωρίς τίτλο"),
    "extension": note.get("extension", ""),
    "uploader": note.get("uploader", "άγνωστος"),
    "downloads": note.get("downloads", 0),
    "comments": note.get("comments", 0),
    "course": note.get("course", "Άγνωστο μάθημα"),
}


    # ✅ DEBUG
    print(f"➡️ {metadata['filename']} έχει {metadata['comments']} σχόλια")


    enriched_text = f"""
📌 Τίτλος σημείωσης: {metadata["title"]}
📝 Όνομα αρχείου: {metadata["filename"]}
👤 Χρήστης που το ανέβασε: {metadata["uploader"]}
📘 Μάθημα: {metadata["course"]}
⬇️ Λήψεις: {metadata["downloads"]}
💬 Αριθμός σχολίων: {metadata["comments"]}

{note.get("text", "").strip()}
"""



    docs.append(Document(page_content=enriched_text.strip(), metadata=metadata))



# 📦 Δημιουργία FAISS index
print("📚 Φτιάχνεται το FAISS index...")
vectorstore = FAISS.from_documents(docs, embedding)

# 💾 Αποθήκευση για μεταγενέστερη χρήση
vectorstore.save_local(INDEX_PATH)

print(f"✅ Ολοκληρώθηκε η αποθήκευση FAISS index στον φάκελο: {INDEX_PATH}")
