import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import type {Document} from "@langchain/core/documents";
import { OpenAI } from "@langchain/openai";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {GRADER_TEMPLATE, ANSWER_GRADER_PROMPT_TEMPLATE} from "./constants";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";

// Graph State holding shared resources.
interface GraphInterface {
    question: string;
    generatedAnswer: string;
    documents: Document[];
    model: OpenAI;
};

const graphState = {
    question: null,
    generatedAnswer: null,
    documents: {
        value: (x: Document[], y: Document[]) => y,
        default: () => [],
    },
    model: null,
};

// A node that grades the generated answer.
const gradeGeneratedAnswer = async (state: GraphInterface) => {
    const gradePrompter = 
        ChatPromptTemplate.fromTemplate(ANSWER_GRADER_PROMPT_TEMPLATE);
    const generatedAnswerGrader = gradePrompter.pipe(state.model);

    const graderResponse = await generatedAnswerGrader.invoke({
        question: state.question,
        generation: state.generatedAnswer,
    });

    if (graderResponse.toLowerCase().includes("no")) {
        return {generatedAnswer: "Sorry, I am unable to answer this!"};
    }

    return state;
};

// A node that generates answer from the relevant document for 
// the question asked.
const generateAnswer = async (state: GraphInterface) => {
    const ragPrompt = await hub.pull("rlm/rag-prompt");
    const ragChain = 
        ragPrompt.pipe(state.model).pipe(new StringOutputParser());
    
    const generatedAnswer = await ragChain.invoke({
        context: state.documents,
        question: state.question
    });

    return {generatedAnswer};
};

const hasRelevantDocuments = async (state: GraphInterface) => {
    const relevantDocs = state.documents;

    if (relevantDocs.length == 0) {
        return "no";
    }

    return "yes";
};

// A node that grades the document retrieved from vector store.
const documentGrader = async (state: GraphInterface) => {
    const docs = state.documents;
    const relevantDocs = [];

    for (const doc of docs) {
        const gradePrompter = 
            ChatPromptTemplate.fromTemplate(GRADER_TEMPLATE);
        const docGrader = gradePrompter.pipe(state.model);
        const graderResponse = await docGrader.invoke({
            question: state.question,
            content: doc.pageContent,
        });

        if (graderResponse.toLowerCase().includes("yes")) {
            relevantDocs.push(doc);
        }
    }

    return {documents: relevantDocs};
};

// A node that creates an Open AI mode.
const createModel = async (state: GraphInterface) => {
    const model = new OpenAI({
        temperature: 0,
    });

    return {model};
};

// A node to retrieve relevant documents according to the question
// from the vector store.
const retrieveDocs = async (state: GraphInterface) => {
    const vectorStore = await buildVectorStore();
    const retrievedDocs = 
        await vectorStore.asRetriever().invoke(state.question);
    
    return {documents: retrievedDocs};
};

// Builds a Vector Store from the contents of the URL.
async function buildVectorStore() {
    const urls = [
        "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-1-hash-indexes-prateek/",
        "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-2-saurav-prateek",
    ];
    const docs = await Promise.all(urls.map(url => {
        const loader = new CheerioWebBaseLoader(url);
        return loader.load();
    }));

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 0,
    });

    const splitDocs = await textSplitter.splitDocuments(docs.flat());

    return await MemoryVectorStore.fromDocuments(
        splitDocs,
        new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        })
    );
}

const graph = new StateGraph<GraphInterface>({channels: graphState})
    .addNode("retrieve_docs", retrieveDocs)
    .addNode("create_model", createModel )
    .addNode("grade_document", documentGrader)
    .addNode("generate", generateAnswer)
    .addNode("grade_answer", gradeGeneratedAnswer)
    .addEdge(START, "retrieve_docs")
    .addEdge("retrieve_docs", "create_model")
    .addEdge("create_model", "grade_document")
    .addConditionalEdges("grade_document", hasRelevantDocuments, {
        yes: "generate",
        no: END,
    })
    .addEdge("generate", "grade_answer")
    .addEdge("grade_answer", END);

const app = graph.compile({
    checkpointer: new MemorySaver()
});

async function invokeRag() {
    const graphResponse: GraphInterface = await app.invoke(
        {
            question: "Who wrote the article?",
        },
        { configurable: { thread_id: "1"}},
    );
    
    // Print Graph
    console.log(app.getGraph().drawMermaid());

    return graphResponse;
}

export {invokeRag};