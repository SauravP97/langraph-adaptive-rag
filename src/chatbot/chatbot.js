"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startChat = startChat;
const openai_1 = require("@langchain/openai");
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const hf_transformers_1 = require("@langchain/community/embeddings/hf_transformers");
const text_splitter_1 = require("langchain/text_splitter");
const memory_1 = require("langchain/vectorstores/memory");
const constants_1 = require("./constants");
const prompts_1 = require("@langchain/core/prompts");
const langgraph_1 = require("@langchain/langgraph");
const hub = __importStar(require("langchain/hub"));
const output_parsers_1 = require("@langchain/core/output_parsers");
;
const graphState = {
    question: null,
    answer: null,
    documents: {
        value: (x, y) => y,
        default: () => [],
    },
    model: null
};
// A node that generates answer from the relevant document for 
// the question asked.
const generateAnswer = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const ragPrompt = yield hub.pull("rlm/rag-prompt");
    const ragChain = ragPrompt.pipe(state.model).pipe(new output_parsers_1.StringOutputParser());
    const generatedAnswer = yield ragChain.invoke({
        context: state.documents,
        question: state.question
    });
    return { answer: generatedAnswer };
});
const hasRelevantDocuments = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const relevantDocs = state.documents;
    if (relevantDocs.length == 0) {
        return "no";
    }
    return "yes";
});
// A node that grades the document retrieved from vector store.
const documentGrader = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const docs = state.documents;
    const relevantDocs = [];
    for (const doc of docs) {
        const gradePrompter = prompts_1.ChatPromptTemplate.fromTemplate(constants_1.GRADER_TEMPLATE);
        const docGrader = gradePrompter.pipe(state.model);
        const graderResponse = yield docGrader.invoke({
            question: state.question,
            content: doc.pageContent,
        });
        if (graderResponse.toLowerCase().includes("yes")) {
            relevantDocs.push(doc);
        }
    }
    return { documents: relevantDocs };
});
const createModel = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const model = new openai_1.OpenAI({
        temperature: 0,
    });
    return { model };
});
const retrieveDocs = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const vectorStore = yield buildVectorStore();
    const retrieveDocs = yield vectorStore.asRetriever().invoke(state.question);
    return { documents: retrieveDocs };
});
const gradeQuestion = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const gradePrompter = prompts_1.ChatPromptTemplate.fromTemplate(constants_1.QUESTION_GRADER_TEMPLATE);
    const questionGrader = gradePrompter.pipe(state.model);
    const graderResponse = yield questionGrader.invoke({
        question: state.question
    });
    console.log("Question grader response: " + graderResponse);
    if (graderResponse.toLowerCase().includes("exit")) {
        return { answer: "Exit" };
    }
    return state;
});
const canContinue = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const answer = state.answer;
    if (answer != null && answer.toLowerCase().includes("exit")) {
        return "no";
    }
    return "yes";
});
const exitWithExceptionMessage = (state) => {
    return {
        answer: `The Question does not look relevant to the Software Engineering and 
        Coding Interview domain. Please ask a relevant question!`
    };
};
const graph = new langgraph_1.StateGraph({ channels: graphState })
    .addNode("create_model", createModel)
    .addNode("grade_question", gradeQuestion)
    .addNode("retrieve", retrieveDocs)
    .addNode("grade_document", documentGrader)
    .addNode("generate", generateAnswer)
    .addNode("exit_with_exception", exitWithExceptionMessage)
    .addEdge(langgraph_1.START, "create_model")
    .addEdge("create_model", "grade_question")
    .addConditionalEdges("grade_question", canContinue, {
    yes: "retrieve",
    no: "exit_with_exception",
})
    .addEdge("retrieve", "grade_document")
    .addConditionalEdges("grade_document", hasRelevantDocuments, {
    yes: "generate",
    no: "exit_with_exception"
})
    .addEdge("exit_with_exception", langgraph_1.END)
    .addEdge("generate", langgraph_1.END);
const app = graph.compile({
    checkpointer: new langgraph_1.MemorySaver()
});
function startChat(question) {
    return __awaiter(this, void 0, void 0, function* () {
        const graphResponse = yield app.invoke({
            question: question,
        }, { configurable: { thread_id: "42" } });
        console.log(app.getGraph().drawMermaid());
        return graphResponse;
    });
}
// Builds a Vector Store from the contents of the URL.
function buildVectorStore() {
    return __awaiter(this, void 0, void 0, function* () {
        const urls = constants_1.KNOWLEDGE_BASE_URLS;
        const docs = yield Promise.all(urls.map(url => {
            const loader = new cheerio_1.CheerioWebBaseLoader(url);
            return loader.load();
        }));
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 250,
            chunkOverlap: 0,
        });
        const splitDocs = yield textSplitter.splitDocuments(docs.flat());
        return yield memory_1.MemoryVectorStore.fromDocuments(splitDocs, new hf_transformers_1.HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        }));
    });
}
;
