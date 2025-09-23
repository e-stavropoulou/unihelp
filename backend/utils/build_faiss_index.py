import json
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from dotenv import load_dotenv

load_dotenv()

DATA_PATH = "notes_text_dataset.json"
INDEX_PATH = "faiss_index"

embedding = OpenAIEmbeddings(model="text-embedding-3-small")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

with open(DATA_PATH, "r", encoding="utf-8") as f:
    notes = json.load(f)

docs = []

# chunks me metadata
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

    chunks = splitter.split_text(enriched_text.strip())
    for chunk in chunks:
        docs.append(Document(page_content=chunk, metadata=metadata))


# dhmiourgia reasoning-friendly pseudo-document
metadata_lines = [
    f'Η σημείωση "{note["title"]}" του χρήστη {note["uploader"]} για το μάθημα {note["course"]} έχει {note["downloads"]} λήψεις και {note["comments"]} σχόλια.'
    for note in notes
]

summary_text = (
    "Παρακάτω παρατίθενται όλες οι διαθέσιμες σημειώσεις της πλατφόρμας UniHelp μαζί με τα στατιστικά τους:\n\n"
    + "\n".join(metadata_lines)
)

docs.insert(0, Document(
    page_content=summary_text,
    metadata={"type": "global_summary"}
))


# dhmioyrgia FAISS index
print("📚 Φτιάχνεται το FAISS index...")
vectorstore = FAISS.from_documents(docs, embedding)
vectorstore.save_local(INDEX_PATH)

print(f"✅ Ολοκληρώθηκε η αποθήκευση FAISS index στον φάκελο: {INDEX_PATH}")
