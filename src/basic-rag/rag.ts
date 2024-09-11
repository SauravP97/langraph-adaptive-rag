import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import * as util from "../utils/utils";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAI } from "@langchain/openai";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import * as constants from "../adaptive-rag/constants";
import type {Document} from "@langchain/core/documents";

async function hallucinationGrader(model: OpenAI, documents: Document[], generatedAnswer: string) {
    const hallucinationGraderPrompt = ChatPromptTemplate.fromTemplate(
        constants.HALLUCINATION_GRADER_TEMPLATE,
    );
    const hallucinationGrader = 
        await hallucinationGraderPrompt.pipe(model);

    return await hallucinationGrader.invoke({
        context: util.formatDocs(documents),
        generation: generatedAnswer, 
    });
}

async function buildVectorStore() {
    const urls = [
        "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-1-hash-indexes-prateek/",
        "https://www.linkedin.com/pulse/data-structures-powering-our-database-part-2-saurav-prateek",
    ];
    // Retrieve text content from the URL.
    const docs = await Promise.all(urls.map((url) => {
        const loader = new CheerioWebBaseLoader(url);
        return loader.load();
    }));

    const textSplitter = await new RecursiveCharacterTextSplitter({
        chunkSize: 250,
        chunkOverlap: 0,
    });

    const splitDocs = await textSplitter.splitDocuments(docs.flat());

    const vectorStore = await MemoryVectorStore.fromDocuments(
        splitDocs,
        new HuggingFaceTransformersEmbeddings({
            model: "Xenova/all-MiniLM-L6-v2",
        })
    );

    const question = "Where's TAJ Mahal located?";
    const retiever = vectorStore.asRetriever();
    const reteieved_docs = await retiever.invoke(question);

    // Creating a model.
    const model = new OpenAI({
        temperature: 0,
    });

    const ragPrompt = await hub.pull('rlm/rag-prompt');
    const ragChain = 
        ragPrompt.pipe(model).pipe(new StringOutputParser);
    
    let generatedAnswer = await ragChain.invoke({
        context: util.formatDocs(reteieved_docs),
        question: question,
    });
    
    const hallucinated = 
        await hallucinationGrader(model, reteieved_docs, generatedAnswer);
    
    console.log("Answer supported by the set of facts? " + hallucinated);

    return generatedAnswer;
}

export {buildVectorStore};