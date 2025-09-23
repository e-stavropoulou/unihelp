from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.load_local("faiss_index", embedding, allow_dangerous_deserialization=True)

# Retrieve all documents (or top k documents)
docs = vectorstore.similarity_search(".*", k=10)

for i, doc in enumerate(docs):
    print(f"\n--- 📄 Document {i+1} ---")
    print(doc.page_content)
