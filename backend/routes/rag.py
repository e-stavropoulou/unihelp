# routes/rag.py

import sys
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA

rag_bp = Blueprint("rag_bp", __name__)

# 🔍 Set up embeddings and vector store
embedding = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.load_local("faiss_all_notes_raw", embedding, allow_dangerous_deserialization=True)
retriever = vectorstore.as_retriever(search_kwargs={"k": 30})

# 🤖 Set up LLM
llm = ChatOpenAI(model="gpt-4o", temperature=0)

# 🔗 Create QA chain
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    chain_type="stuff",
    return_source_documents=True
)

# 💬 Main RAG endpoint
@rag_bp.route("/ask-rag", methods=["POST"])
@jwt_required()
def ask_rag():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"result": "⚠️ Δεν έλαβα κάποια ερώτηση."}), 400

    print("\n--- 📥 Ερώτηση χρήστη:", query, file=sys.stderr)

    try:
        result = qa_chain(query)
        answer = result["result"]

        return jsonify({
            "result": answer,
            "source_docs": [doc.metadata for doc in result["source_documents"]]
        })

    except Exception as e:
        print("❌ Σφάλμα:", str(e), file=sys.stderr)
        return jsonify({"result": f"❌ Σφάλμα: {str(e)}"}), 500
