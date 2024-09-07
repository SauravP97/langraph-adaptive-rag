import { OpenAI } from "@langchain/openai";
import type {Document} from "@langchain/core/documents";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { KNOWLEDGE_BASE_URLS, GRADER_TEMPLATE, QUESTION_GRADER_TEMPLATE } from "./constants";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";


// Graph shared state.
interface ChatInterface {
    question: string;
    answer: string;
    documents: Document[];
    model: OpenAI;
};

const graphState = {
    question: null,
    answer: null,
    documents: {
        value: (x: Document[], y:Document[]) => y,
        default: () => [],
    },
    model: null
};

// A node that generates answer from the relevant document for 
// the question asked.
const generateAnswer = async (state: ChatInterface) => {
    const ragPrompt = await hub.pull("rlm/rag-prompt");
    const ragChain = 
        ragPrompt.pipe(state.model).pipe(new StringOutputParser());
    
    const generatedAnswer = await ragChain.invoke({
        context: state.documents,
        question: state.question
    });

    return {answer: generatedAnswer};
};

const hasRelevantDocuments = async (state: ChatInterface) => {
    const relevantDocs = state.documents;

    if (relevantDocs.length == 0) {
        return "no";
    }

    return "yes";
};

// A node that grades the document retrieved from vector store.
const documentGrader = async (state: ChatInterface) => {
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

const createModel = async (state: ChatInterface) => {
    const model = new OpenAI({
        temperature: 0,
    });

    return {model};
};

const retrieveDocs = async (state: ChatInterface) => {
    const vectorStore = await buildVectorStore();
    const retrieveDocs = 
        await vectorStore.asRetriever().invoke(state.question);

    return {documents: retrieveDocs};
};

const gradeQuestion = async (state: ChatInterface) => {
    const gradePrompter = 
        ChatPromptTemplate.fromTemplate(QUESTION_GRADER_TEMPLATE);
    const questionGrader = gradePrompter.pipe(state.model);
    const graderResponse = await questionGrader.invoke({
        question: state.question
    });

    console.log("Question grader response: " + graderResponse);

    if (graderResponse.toLowerCase().includes("exit")) {
        return {answer: "Exit"};
    }

    return state;
}

const canContinue = async (state: ChatInterface) => {
    const answer = state.answer;
    if (answer != null && answer.toLowerCase().includes("exit")) {
        return "no";
    }

    return "yes";
}

const exitWithExceptionMessage = (state: ChatInterface) => {
    return {
        answer: `The Question does not look relevant to the Software Engineering and 
        Coding Interview domain. Please ask a relevant question!`
    }
}

const graph = new StateGraph<ChatInterface>({channels: graphState})
    .addNode("create_model", createModel)
    .addNode("grade_question", gradeQuestion)
    .addNode("retrieve", retrieveDocs)
    .addNode("grade_document", documentGrader)
    .addNode("generate", generateAnswer)
    .addNode("exit_with_exception", exitWithExceptionMessage)
    .addEdge(START, "create_model")
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
    .addEdge("exit_with_exception", END)
    .addEdge("generate", END);

const app = graph.compile({
    checkpointer: new MemorySaver()
});

async function startChat(question: string) {
    const graphResponse: ChatInterface = await app.invoke(
        {
            question: question,
        },
        { configurable: { thread_id: "42"}},
    );
    
    console.log(app.getGraph().drawMermaid());

    return graphResponse;
}

// Builds a Vector Store from the contents of the URL.
async function buildVectorStore() {
    const urls = KNOWLEDGE_BASE_URLS;
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
};

export {startChat};
