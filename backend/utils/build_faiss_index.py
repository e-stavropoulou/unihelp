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
    "semester": note.get("semester", "Άγνωστο"),          # ➕ εξάμηνο ή τύπος αν δεν υπάρχει
    "course_type": note.get("course_type", "Άγνωστο"),    # ➕ τύπος μαθήματος
    "upload_date": note.get("upload_date", "Άγνωστη"),    # ➕ ημερομηνία ανάρτησης
    "note_rating": note.get("note_rating", "χωρίς αξιολόγηση"),
    "uploader_rating": note.get("uploader_rating", "χωρίς αξιολόγηση"),
}



    print(f"➡️ {metadata['filename']} έχει {metadata['comments']} σχόλια")

    enriched_text = f"""
📌 Τίτλος σημείωσης: {metadata["title"]}
📝 Όνομα αρχείου: {metadata["filename"]}
👤 Χρήστης που το ανέβασε: {metadata["uploader"]}
⭐ Βαθμολογία σημείωσης: {metadata["note_rating"]}
⭐ Βαθμολογία χρήστη: {metadata["uploader_rating"]}
📘 Μάθημα: {metadata["course"]}
📅 Εξάμηνο: {metadata["semester"]}
📂 Τύπος μαθήματος: {metadata["course_type"]}
📅 Ημερομηνία ανάρτησης: {metadata["upload_date"]}
⬇️ Λήψεις: {metadata["downloads"]}
💬 Αριθμός σχολίων: {metadata["comments"]}

{note.get("text", "").strip()}
"""



    chunks = splitter.split_text(enriched_text.strip())
    for chunk in chunks:
        if len(chunk) > 2000:  # φίλτρο για πολύ μεγάλα blocks
            print(f"⏩ Παράλειψη υπερβολικά μεγάλου chunk ({len(chunk)} chars) από {metadata['filename']}")
            continue
        docs.append(Document(page_content=chunk, metadata=metadata))


# dhmiourgia reasoning-friendly pseudo-document
metadata_lines = [
    f'Η σημείωση "{note["title"]}" του χρήστη {note["uploader"]} '
    f'για το μάθημα {note["course"]} (εξάμηνο/τύπος: {note.get("semester","Άγνωστο")}) '
    f'ανέβηκε στις {note.get("upload_date",";")} και έχει {note["downloads"]} λήψεις, '
    f'{note["comments"]} σχόλια και βαθμολογία {note.get("note_rating","χωρίς αξιολόγηση")}. '
    f'Ο χρήστης έχει μέση αξιολόγηση {note.get("uploader_rating","χωρίς αξιολόγηση")}.'
    for note in notes
]



summary_text = (
    "Παρακάτω παρατίθενται όλες οι διαθέσιμες σημειώσεις της πλατφόρμας UniHelp μαζί με τα στατιστικά τους:\n\n"
    + "\n".join(metadata_lines)
)

summary_chunks = splitter.split_text(summary_text)
for chunk in summary_chunks:
    docs.insert(0, Document(
        page_content=chunk,
        metadata={"type": "global_summary"}
    ))



# dhmioyrgia FAISS index
print("📚 Φτιάχνεται το FAISS index...")
BATCH_SIZE = 200  
vectorstore = None

for i in range(0, len(docs), BATCH_SIZE):
    batch = docs[i:i + BATCH_SIZE]
    print(f"➡️ Επεξεργασία batch {i//BATCH_SIZE + 1} ({len(batch)} chunks)")

    batch_vs = FAISS.from_documents(batch, embedding)

    if vectorstore is None:
        vectorstore = batch_vs
    else:
        vectorstore.merge_from(batch_vs)

vectorstore.save_local(INDEX_PATH)
print(f"✅ Ολοκληρώθηκε η αποθήκευση FAISS index στον φάκελο: {INDEX_PATH}")