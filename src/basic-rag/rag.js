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
exports.buildVectorStore = buildVectorStore;
const cheerio_1 = require("@langchain/community/document_loaders/web/cheerio");
const util = __importStar(require("../utils/utils"));
const text_splitter_1 = require("langchain/text_splitter");
const hf_transformers_1 = require("@langchain/community/embeddings/hf_transformers");
const memory_1 = require("langchain/vectorstores/memory");
const openai_1 = require("@langchain/openai");
const hub = __importStar(require("langchain/hub"));
const output_parsers_1 = require("@langchain/core/output_parsers");
const prompts_1 = require("@langchain/core/prompts");
const constants = __importStar(require("../adaptive-rag/constants"));
function hallucinationGrader(model, documents, generatedAnswer) {
    return __awaiter(this, void 0, void 0, function* () {
        const hallucinationGraderPrompt = prompts_1.ChatPromptTemplate.fromTemplate(constants.HALLUCINATION_GRADER_TEMPLATE);
        const hallucinationGrader = yield hallucinationGraderPrompt.pipe(model);
        return yield hallucinationGrader.invoke({
            context: util.formatDocs(documents),
            generation: generatedAnswer,
        });
    });
}
function buildVectorStore() {
    return __awaiter(this, void 0, void 0, function* () {
        const urls = [
            "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-1-hash-indexes-prateek/",
            "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-2-saurav-prateek",
        ];
        // Retrieve text content from the URL.
        const docs = yield Promise.all(urls.map((url) => {
            const loader = new cheerio_1.CheerioWebBaseLoader(url);
            return loader.load();
        }));
        const textSplitter = yield new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 250,
            chunkOverlap: 0,
        });
        const splitDocs = yield textSplitter.splitDocuments(docs.flat());
        const vectorStore = yield memory_1.MemoryVectorStore.fromDocuments(splitDocs, new hf_transformers_1.HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        }));
        const question = "Where's TAJ Mahal located?";
        const retiever = vectorStore.asRetriever();
        const reteieved_docs = yield retiever.invoke(question);
        // Creating a model.
        const model = new openai_1.OpenAI({
            temperature: 0,
        });
        const ragPrompt = yield hub.pull('rlm/rag-prompt');
        const ragChain = ragPrompt.pipe(model).pipe(new output_parsers_1.StringOutputParser);
        let generatedAnswer = yield ragChain.invoke({
            context: util.formatDocs(reteieved_docs),
            question: question,
        });
        const hallucinated = yield hallucinationGrader(model, reteieved_docs, generatedAnswer);
        console.log("Answer supported by the set of facts? " + hallucinated);
        return generatedAnswer;
    });
}
