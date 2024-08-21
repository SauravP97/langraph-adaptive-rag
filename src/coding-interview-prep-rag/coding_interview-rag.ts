import type {Document} from "@langchain/core/documents";
import {OpenAI} from "@langchain/openai";
import * as constants from "./constants";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";
import * as util from "../utils/utils";
import {ChatPromptTemplate} from "@langchain/core/prompts"
import {RagInterface} from "../utils/rag_interface";
import {AIMessage} from "@langchain/core/messages"

const graphState = {
    question: null,
    generatedAnswer: null,
    documents: {
        value: (x: Document[], y: Document[]) => y,
        default: () => [],
    },
    openAiModel: null,
};

const createModel = async (state: RagInterface) => {
    const model = new OpenAI({
        temperature: 0
    });

    return {openAiModel: model};
}

const generateAnswers = async (state: RagInterface) => {
    const ragPrompt = await hub.pull('rlm/rag-prompt');

    const ragChain = 
        ragPrompt.pipe(state.openAiModel).pipe(new StringOutputParser);
    
    const generatedAnswer = await ragChain.invoke({
        context: util.formatDocs(state.documents),
        question: state.question,
    });

    console.log("Answer generated: ");
    console.log(generatedAnswer);

    return {generatedAnswer};
};

const gradeDocuments = async (state: RagInterface) => {
    const relevantDocs = [];

    for (const doc of state.documents) {
        const gradePrompter = 
            ChatPromptTemplate.fromTemplate(constants.GRADER_TEMPLATE);
        const documentGrader = gradePrompter.pipe(state.openAiModel);
        const documentGraderResponse = await documentGrader.invoke({
            question: state.question,
            content: doc.pageContent,
        });

        if (documentGraderResponse.toLowerCase().includes("yes")) {
            relevantDocs.push(doc);
        }
    }

    console.log("Relevent Docs: ")
    console.log(relevantDocs);

    return {documents: relevantDocs};
}

const decideToGenerate = (state: RagInterface) => {
    if (state.documents.length == 0) {
        console.log("No relevant document found, Ending the RAG!");
        return "relevent_doc_absent";
    } else {
        return "relevent_doc_present";
    }
};

const retrieveIndexedDocFromVectorStore = async (state: RagInterface) => {
    const vectorStore = await buildCodingInterviewVectorStore();
    const retiever = vectorStore.asRetriever();
    const reteieved_docs = await retiever.invoke(state.question);

    return {documents: reteieved_docs};
};

async function buildCodingInterviewVectorStore() {
    const urls = constants.URLs;
    const docs = await Promise.all(urls.map((url) => {
        const loader = new CheerioWebBaseLoader(url);
        return loader.load();
    }));

    const docList = docs.flat();

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 0,
    });

    const splitDocs = await textSplitter.splitDocuments(docList);

    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
    });

    return await MemoryVectorStore.fromDocuments(
        splitDocs,
        embeddings,
    );
}

const graph = new StateGraph<RagInterface>({channels: graphState})
    .addNode("create_model", createModel)
    .addNode("retrieve", retrieveIndexedDocFromVectorStore)
    .addNode("generate", generateAnswers)
    .addNode("grade_documents", gradeDocuments)
    .addEdge(START, "retrieve")
    .addEdge("retrieve", "create_model")
    .addEdge("create_model", "grade_documents")
    .addConditionalEdges("grade_documents", decideToGenerate, {
        relevent_doc_present: "generate",
        relevent_doc_absent: END
    })
    .addEdge("generate", END);

const app = graph.compile({
    checkpointer: new MemorySaver(),
});

async function execute() {
    const graphState: RagInterface = await app.invoke(
        {
            question: "Can you give some tips for Coding interviews?"
        },
        { configurable: { thread_id: "1"}},
    );
    
    util.printGraphByMermaid(app.getGraph().drawMermaid());
    
    return graphState;
}

export {execute};
