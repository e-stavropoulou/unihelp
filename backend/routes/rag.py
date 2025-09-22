import sys
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from typing import List

rag_bp = Blueprint("rag_bp", __name__)

# 📦 Φόρτωση FAISS index
embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.load_local("faiss_index", embedding, allow_dangerous_deserialization=True)

# 🔍 Βασικός FAISS retriever
base_retriever = vectorstore.as_retriever(search_kwargs={"k": 20})

# 🔎 Εύρεση του summary doc (που φτιάξαμε στο FAISS index)
summary_doc = None
for doc in vectorstore.similarity_search("πίνακας μεταδεδομένων", k=20):
    if doc.metadata.get("type") == "global_summary":
        summary_doc = doc
        print("✅ Βρέθηκε το summary document ✅")
        break


# ✅ Custom retriever που προσθέτει πάντα το summary doc
class SummaryBoostingRetriever(BaseRetriever):
    def __init__(self, base_retriever, summary_doc):
        super().__init__()
        self._base_retriever = base_retriever
        self._summary_doc = summary_doc

    def get_relevant_documents(self, query: str) -> List[Document]:
        base_docs = self._base_retriever.get_relevant_documents(query)
        if self._summary_doc and self._summary_doc not in base_docs:
            print("📌 Προστέθηκε το summary doc στο context")
            return [self._summary_doc] + base_docs
        return base_docs

    async def aget_relevant_documents(self, query: str) -> List[Document]:
        base_docs = await self._base_retriever.aget_relevant_documents(query)
        if self._summary_doc and self._summary_doc not in base_docs:
            return [self._summary_doc] + base_docs
        return base_docs

    @property
    def lc_attributes(self) -> dict:
        return {}

# ✅ Χρήση του enhanced retriever
retriever = SummaryBoostingRetriever(base_retriever, summary_doc)

# 🤖 Set up LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 🔗 RAG QA chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    chain_type="stuff",
    return_source_documents=True
)

# 💬 RAG endpoint
@rag_bp.route("/ask-rag", methods=["POST"])
@jwt_required()
def ask_rag():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"result": "⚠️ Δεν έλαβα κάποια ερώτηση."}), 400

    print("\n--- 📥 Ερώτηση χρήστη:", query, file=sys.stderr)

    try:
        result = qa_chain.invoke({"query": query})
        answer = result["result"]

        return jsonify({
            "result": answer,
            "source_docs": [doc.metadata for doc in result["source_documents"]]
        })

    except Exception as e:
        print("❌ Σφάλμα:", str(e), file=sys.stderr)
        return jsonify({"result": f"❌ Σφάλμα: {str(e)}"}), 500
