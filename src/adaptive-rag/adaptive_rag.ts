import {RecursiveCharacterTextSplitter} from "langchain/text_splitter";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import {MemoryVectorStore} from "langchain/vectorstores/memory";
import {HuggingFaceTransformersEmbeddings} from "@langchain/community/embeddings/hf_transformers";
import {OpenAI} from "@langchain/openai";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {JsonOutputParser} from "@langchain/core/output_parsers";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";
import type {Document} from "@langchain/core/documents";
import * as constants from "./constants";
import {START, END, MemorySaver, StateGraph} from "@langchain/langgraph";
import * as util from "../utils/utils";
import {RagInterface} from "../utils/rag_interface";

const graphState = {
    question: null,
    generatedAnswer: null,
    documents: {
        value: (x: Document[], y:Document[]) => y,
        default: () => [],
    },
    openAiModel: null,
};

// Checks if the model is Hallucinating or not!
// Evaluates the answer generated by the Model and the context on the basis
// of which the model was generated, to determine whether the model
// hallucinated or not.
async function hallucinationGrader(state: RagInterface) {
    const hallucinationGraderPrompt = ChatPromptTemplate.fromTemplate(
        constants.HALLUCINATION_GRADER_TEMPLATE,
    );
    const hallucinationGrader = 
        await hallucinationGraderPrompt.pipe(state.openAiModel);

    return await hallucinationGrader.invoke({
        context: util.formatDocs(state.documents),
        generation: state.generatedAnswer, 
    });
}

// Checks if the answer generated by the model was relevant to the question
// or not.
async function answerGrader(state: RagInterface) {
    const answerGraderPrompt = ChatPromptTemplate.fromTemplate(
        constants.ANSWER_GRADER_PROMPT_TEMPLATE,
    );

    const answerGrader = answerGraderPrompt.pipe(state.openAiModel);

    return await answerGrader.invoke({
        question: state.question,
        generation: state.generatedAnswer,
    });
}

// Node: A dummy node to perform a web search.
const webSearch = async (state: RagInterface) => {
    console.log("==== Node: Performed Web Search");

    return {documents: state.documents};
};

// Node: A node to retrieve the documents.
const retrieve = async (state: RagInterface) => {
    console.log("==== Node: Retrieving Documents from Vector database");
    const vectorStore = await buildVectorStore();
    const retriever = vectorStore.asRetriever();
    const retrieved_docs = await retriever.invoke(state.question);

    return {documents: retrieved_docs};
};

// Node: A node to create OpenAI model.
const createModel = async (state: RagInterface) => {
    const model = new OpenAI({
        temperature: 0,
    });

    return {openAiModel: model};
}

// Node: A node to generate answers from the LLM Model.
const generate = async (state: RagInterface) => {
    console.log("==== Node: Generate Answers from the LLM Model");
    
    // Check this to understand this prompt: 
    // https://smith.langchain.com/hub/rlm/rag-prompt
    const ragPrompt = await hub.pull("rlm/rag-prompt");

    const ragChain = 
        ragPrompt.pipe(state.openAiModel).pipe(new StringOutputParser());

    const generatedAnswer = await ragChain.invoke({
        context: util.formatDocs(state.documents),
        question: state.question
    });

    console.log("Answer generated by the model: ");
    console.log(generatedAnswer);

    return {generatedAnswer};
};

// Node: A node to grade the docuemts retrieved from the Vector database.
// Checks if the question can be asnwered from the Retrieved doc.
// Evaluates the question asked and the context provided to check if the model
// can use the context doc to answer the question.
const gradeDocuments = async(state: RagInterface) => {
    console.log("==== Node: Grade Documents retrieved by the Vector DB");
    const relevantDocs: Document[] = [];

    for (const doc of state.documents) {
        const gradePrompter = 
            ChatPromptTemplate.fromTemplate(constants.GRADER_TEMPLATE);
        const retrievalGrader = gradePrompter.pipe(state.openAiModel);
        const graderResponse = await retrievalGrader.invoke({
            question: state.question,
            content: doc.pageContent,
        });
        console.log(graderResponse.toLowerCase());

        if (graderResponse.toLowerCase().includes("yes")) {
            console.log("==== Node: Grade Documents - Relevant Doc");
            relevantDocs.push(doc);
        } else {
            console.log("==== Node: Grade Documents - Non-relevant Doc");
        }
    }

    return {documents: relevantDocs};
}

// Node: Transfor Query with a better one.
// This node performs query analysis on the user questions and optimizes 
// them for RAG to help handle difficult queries.
const transformQuery = async (state: RagInterface) => {
    console.log("==== Edge: Transform Query");
    const rewritePrompt = ChatPromptTemplate.fromTemplate(
        constants.REWRITER_PROMPT_TEMPLATE
    );
    const rewriter = 
        rewritePrompt.pipe(state.openAiModel).pipe(new StringOutputParser);
    const betterQuestion = await rewriter.invoke({
        question: state.question,
    });

    return {question: betterQuestion};
}

// Edge: Decide on the datasource to route the initial question to.
const routeQuestion = async (state: RagInterface) => {
    const questionRouterPrompt = ChatPromptTemplate.fromMessages([
        ["system", constants.QUESTION_ROUTER_SYSTEM_TEMPLATE],
        ["human", "{question}"],
    ]);

    const questionRouter = 
        questionRouterPrompt.pipe(state.openAiModel).pipe(new StringOutputParser());

    const source = await questionRouter.invoke({
        question: state.question,
    });

    if (source.toLowerCase().includes("web_search")) {
        return "web_search";
    } else {
        return "retrieve";
    }
}

// Edge: Decide whether the current documents are sufficiently relevant
// to come up with a good answer.
const decideToGenerate = async (state: RagInterface) => {
    const relevantDocs = state.documents;

    if (relevantDocs.length == 0) {
        console.log("==== Edge: Decide To Generate - No relevant Doc found");
        return "transform_query";
    } else {
        console.log("==== Edge: Decide To Generate - Relevant Doc found");
        return "generate";
    }
};

const gradeGeneratedDocumentAndQuestion = async (state: RagInterface) => {
    console.log("==== Edge: Grade Doc and Questions");
    const answerSupportDocuments = await hallucinationGrader(state);
    
    if (answerSupportDocuments.toLowerCase().includes("yes")) {
        const answerIsRelevantToQuestion = await answerGrader(state);

        if (answerIsRelevantToQuestion.toLowerCase().includes("yes")) {
            console.log("==== Edge: Grade Doc and Questions - Answer found relevant!");
            return "useful";
        } else {
            console.log("==== Edge: Grade Doc and Questions - Irrelevant answer");
            return "not_useful";
        }
    } else {
        console.log("==== Edge: Grade Doc and Questions - Model Hallucinating");
        return "hallucinated";
    }
}

const graph = new StateGraph<RagInterface>({channels: graphState})
    .addNode("web_search", webSearch)
    .addNode("create_model", createModel)
    .addNode("retrieve", retrieve)
    .addNode("grade_documents", gradeDocuments)
    .addNode("generate", generate)
    .addNode("transform_query", transformQuery)
    .addEdge(START, "create_model")
    .addConditionalEdges("create_model", routeQuestion)
    .addEdge("web_search", END)
    .addEdge("retrieve", "grade_documents")
    .addConditionalEdges("grade_documents", decideToGenerate)
    .addEdge("transform_query", "retrieve")
    .addConditionalEdges("generate", gradeGeneratedDocumentAndQuestion, {
        hallucinated: "generate",
        useful: END,
        not_useful: "transform_query",
    });

const app = graph.compile({
    checkpointer: new MemorySaver(),
    interruptBefore: ["web_search"],
});

async function adaptiveRag() {
    return await app.invoke(
        {
            question: "What are some features of long-term memory?",
        },
        { configurable: { thread_id: "1" } },
    );
}

async function buildVectorStore() {
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

    const embedding = new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
    });

    // Add to Vector store.
    return await MemoryVectorStore.fromDocuments(
        splitDocs,
        embedding,
    );
}

function createOpenAiModel() {
    return new OpenAI({
        temperature: 0,
    });
}

export {adaptiveRag};