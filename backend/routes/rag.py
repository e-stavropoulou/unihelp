import sys
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from typing import List
from langchain.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_history_aware_retriever
from langchain_core.prompts import MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage



rag_bp = Blueprint("rag_bp", __name__)

qa_chain = None  # global cache

def build_pipeline():
    global qa_chain
    if qa_chain:
        return qa_chain

    print("🔄 Initializing RAG pipeline...", file=sys.stderr)

    embedding = OpenAIEmbeddings(model="text-embedding-3-small")
    vectorstore = FAISS.load_local("faiss_index", embedding, allow_dangerous_deserialization=True)

    base_retriever = vectorstore.as_retriever(search_kwargs={"k": 20})

    summary_doc = None
    for doc in vectorstore.similarity_search("πίνακας μεταδεδομένων", k=20):
        if doc.metadata.get("type") == "global_summary":
            summary_doc = doc
            print("✅ Βρέθηκε το summary document ✅", file=sys.stderr)
            break

    class SummaryBoostingRetriever(BaseRetriever):
        def __init__(self, base_retriever, summary_doc):
            super().__init__()
            self._base_retriever = base_retriever
            self._summary_doc = summary_doc

        def get_relevant_documents(self, query: str):
            base_docs = self._base_retriever.get_relevant_documents(query)
            if self._summary_doc and self._summary_doc not in base_docs:
                print("📌 Προστέθηκε το summary doc στο context", file=sys.stderr)
                return [self._summary_doc] + base_docs
            return base_docs

        async def aget_relevant_documents(self, query: str):
            base_docs = await self._base_retriever.aget_relevant_documents(query)
            if self._summary_doc and self._summary_doc not in base_docs:
                return [self._summary_doc] + base_docs
            return base_docs

        @property
        def lc_attributes(self) -> dict:
            return {}

    retriever = SummaryBoostingRetriever(base_retriever, summary_doc)

    # LLM
    llm = ChatOpenAI(model="gpt-4o", temperature=0)

    # Prompt
    system_prompt = """
    Είσαι η Thinkerbell η βοηθός που απαντά σε ερωτήσεις φοιτητών στην πλατφόρμα UniHelp.Η πλατφόρμα UniHelp υποστηρίζει φοιτητές στο τμήμα Μηχανικών Η/Υ και Πληροφορικής του Πανεπιστημίου Πατρών.Απαντάς πάντα με φιλικό αλλά κόσμιο ύφος. Τα θέματα που καλύπτεις αφορούν κυρίως μαθήματα, σπουδές, φοιτητική ζωή και οτιδήποτε σχετικό με την ακαδημαϊκή κοινότητα. Αν δεν γνωρίζεις την απάντηση, παραδέχεσαι ότι δεν γνωρίζεις και δεν προσπαθείς να "εφευρίσκεις" απαντήσεις. Αν η ερώτηση δεν σχετίζεται με τα θέματα που καλύπτεις, ενημερώνεις ευγενικά τον χρήστη ότι δεν μπορείς να βοηθήσεις σε αυτό το θέμα. Απαντάς σε όποια γλώσσα χρησιμοποιεί ο χρήστης στην ερώτησή του. Να χρησιμοποιείς ΑΚΡΙΒΩΣ τις οδηγίες που δίνονται στη λίστα "Γνώσεις για την πλατφόρμα UniHelp" χωρίς να τις αλλάζεις ή να προσθέτεις δικά σου στοιχεία. 
    Αν σε ρωτήσουν σε ποιο εξάμηνο είναι κάποιο μάθημα, να απαντάς σε ποιο εξάμηνο είναι με βάση το πεδίο "Εξάμηνο" που εμφανίζεται στις πληροφορίες των σημειώσεων. Αν δεν βρεις εκεί την πληροφορία, τότε να απαντάς ότι δεν γνωρίζεις το εξάμηνο του μαθήματος, μην μαντεύεις εξάμηνο.
    Μόνο τα επιλογής μαθήματα μπορεί να υπάρχουν σε διαφορετικά εξάμηνα ανά φοιτητή. Τα υποχρεωτικά ορίζονται από το πρόγραμμα σπουδών του τμήματος.
    Αν το πεδίο είναι κενό, τότε να χρησιμοποιείς τον τύπο του μαθήματος ("υποχρεωτικό", "επιλογής χειμερινού", "επιλογής εαρινού") και να ενημερώνεις ότι επειδή είναι επιλογής ο κάθε φοιτητής μπορεί να το έχει επιλέξει σε διαφορετικό εξάμηνο. 
    
    Αν το context είναι κενό ή δεν περιέχει σημειώσεις για το μάθημα που ρωτάει ο χρήστης, απάντησε καθαρά:
    «Δεν υπάρχουν ανεβασμένες σημειώσεις για αυτό το μάθημα στην πλατφόρμα UniHelp.»
    Μην εφευρίσκεις απαντήσεις.

    Αν σε ρωτήσου ποιες σημειώσεις να διαβάσουν να προτείνεις αυτές με τις καλύτερες βαθμολογίες.
    Γνώσεις για την πλατφόρμα UniHelp: 
    0. Οποιαδήποτε απορία σχετικά με το σύστημα πόντων ή το σύστημα αναφορών ή πως γίνεσαι διαχειριστής αναγράφονται αναλυτικά στο προφίλ του χρήστη στο κουμπί i γωνία δεξία. 
    1. Οι σημειώσεις βρίσκονται στη σελίδα «Όλες οι Σημειώσεις». Ο χρήστης μπορεί να φτάσει εκεί από τη γραμμή μενού και να κάνει αναζήτηση με τίτλο σημείωσης ή φιλτράρισμα. 
    2. Ο χρήστης βλέπει τις δικές του σημειώσεις στη σελίδα «Οι Σημειώσεις μου». 
    3. Για να βρει άλλους φοιτητές, χρησιμοποιεί τη σελίδα «Αναζήτηση Χρηστών». 
    4. Για να στείλει μήνυμα, πρώτα βρίσκει τον χρήστη απο τη σελίδα «Αναζήτηση Χρηστών» και μετά υπάρχει σχετικό κουμπί για να ξεκινήσει συζήτηση. 
    5. Οι Admin χρήστες έχουν πρόσβαση στο UniHelp-Admin Dashboard, όπου διαχειρίζονται αναφορές, στατιστικά πλατφόρμας(top contibutors, καλύτερες σημειώσεις με βάση τις κριτικές των χρηστών), ρόλους χρηστών, τις ανεβασμένες σημειώσεις, σχόλια.

    Context: {context}
    """

    contextualize_q_system_prompt = """Δεδομένου ενός ιστορικού συνομιλίας και της τελευταίας ερώτησης του χρήστη, η οποία μπορεί να αναφέρεται στο ιστορικό, φτιάξε μια ανεξάρτητη ερώτηση
    που μπορεί να γίνει κατανοητή χωρίς το ιστορικό. 
    ΜΗΝ απαντήσεις στην ερώτηση, απλά αναδιατύπωσέ την αν χρειάζεται,
    ή άφησέ την ίδια αν δεν χρειάζεται αναδιατύπωση."""

    prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])


    contextualize_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}")
])

    history_aware_retriever = create_history_aware_retriever(
    llm,
    retriever,   
    contextualize_prompt
)


    # Chains
    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    qa_chain = create_retrieval_chain(
    history_aware_retriever,
    question_answer_chain
)

    print("🚀 Δημιουργήθηκε το qa_chain!", file=sys.stderr)
    return qa_chain

chat_history = []

# Endpoint
@rag_bp.route("/ask-rag", methods=["POST"])
@jwt_required()
def ask_rag():
    data = request.get_json()
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"result": "⚠️ Δεν έλαβα κάποια ερώτηση."}), 400

    print("\n--- 📥 Ερώτηση χρήστη:", query, file=sys.stderr)

    try:
        bot = build_pipeline()
        res = bot.invoke({
            "input": query,
            "chat_history": chat_history
        })

        answer = res["answer"]
        chat_history.append(HumanMessage(content=query))
        chat_history.append(AIMessage(content=answer))

        return jsonify({
            "result": res["answer"],
            "source_docs": [doc.metadata for doc in res["context"]]  
        })

    except Exception as e:
        print("❌ Σφάλμα:", str(e), file=sys.stderr)
        return jsonify({"result": f"❌ Σφάλμα: {str(e)}"}), 500
