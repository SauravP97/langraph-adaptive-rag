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
exports.execute = execute;
const openai_1 = require("@langchain/openai");
const constants = __importStar(require("./constants"));
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const text_splitter_1 = require("langchain/text_splitter");
const hf_transformers_1 = require("@langchain/community/embeddings/hf_transformers");
const memory_1 = require("langchain/vectorstores/memory");
const langgraph_1 = require("@langchain/langgraph");
const hub = __importStar(require("langchain/hub"));
const output_parsers_1 = require("@langchain/core/output_parsers");
const util = __importStar(require("../utils/utils"));
const prompts_1 = require("@langchain/core/prompts");
const graphState = {
    question: null,
    generatedAnswer: null,
    documents: {
        value: (x, y) => y,
        default: () => [],
    },
    openAiModel: null,
};
const createModel = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const model = new openai_1.OpenAI({
        temperature: 0
    });
    return { openAiModel: model };
});
const generateAnswers = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const ragPrompt = yield hub.pull('rlm/rag-prompt');
    const ragChain = ragPrompt.pipe(state.openAiModel).pipe(new output_parsers_1.StringOutputParser);
    const generatedAnswer = yield ragChain.invoke({
        context: util.formatDocs(state.documents),
        question: state.question,
    });
    console.log("Answer generated: ");
    console.log(generatedAnswer);
    return { generatedAnswer };
});
const gradeDocuments = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const relevantDocs = [];
    for (const doc of state.documents) {
        const gradePrompter = prompts_1.ChatPromptTemplate.fromTemplate(constants.GRADER_TEMPLATE);
        const documentGrader = gradePrompter.pipe(state.openAiModel);
        const documentGraderResponse = yield documentGrader.invoke({
            question: state.question,
            content: doc.pageContent,
        });
        if (documentGraderResponse.toLowerCase().includes("yes")) {
            relevantDocs.push(doc);
        }
    }
    console.log("Relevent Docs: ");
    console.log(relevantDocs);
    return { documents: relevantDocs };
});
const decideToGenerate = (state) => {
    if (state.documents.length == 0) {
        console.log("No relevant document found, Ending the RAG!");
        return "relevent_doc_absent";
    }
    else {
        return "relevent_doc_present";
    }
};
const retrieveIndexedDocFromVectorStore = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const vectorStore = yield buildCodingInterviewVectorStore();
    const retiever = vectorStore.asRetriever();
    const reteieved_docs = yield retiever.invoke(state.question);
    return { documents: reteieved_docs };
});
function buildCodingInterviewVectorStore() {
    return __awaiter(this, void 0, void 0, function* () {
        const urls = constants.URLs;
        const docs = yield Promise.all(urls.map((url) => {
            const loader = new cheerio_1.CheerioWebBaseLoader(url);
            return loader.load();
        }));
        const docList = docs.flat();
        const textSplitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 250,
            chunkOverlap: 0,
        });
        const splitDocs = yield textSplitter.splitDocuments(docList);
        const embeddings = new hf_transformers_1.HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        });
        return yield memory_1.MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    });
}
const graph = new langgraph_1.StateGraph({ channels: graphState })
    .addNode("create_model", createModel)
    .addNode("retrieve", retrieveIndexedDocFromVectorStore)
    .addNode("generate", generateAnswers)
    .addNode("grade_documents", gradeDocuments)
    .addEdge(langgraph_1.START, "retrieve")
    .addEdge("retrieve", "create_model")
    .addEdge("create_model", "grade_documents")
    .addConditionalEdges("grade_documents", decideToGenerate, {
    relevent_doc_present: "generate",
    relevent_doc_absent: langgraph_1.END
})
    .addEdge("generate", langgraph_1.END);
const app = graph.compile({
    checkpointer: new langgraph_1.MemorySaver(),
});
function execute() {
    return __awaiter(this, void 0, void 0, function* () {
        const graphState = yield app.invoke({
            question: "Can you give some tips for Coding interviews?"
        }, { configurable: { thread_id: "1" } });
        util.printGraphByMermaid(app.getGraph().drawMermaid());
        return graphState;
    });
}
