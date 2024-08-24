import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import * as util from "../utils/utils";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAI } from "@langchain/openai";
import * as hub from "langchain/hub";
import {StringOutputParser} from "@langchain/core/output_parsers";

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

    const question = "Who wrote these articles";
    const retiever = vectorStore.asRetriever();
    const reteieved_docs = await retiever.invoke(question);

    // Creating a model.
    const model = new OpenAI({
        temperature: 0,
    });

    const ragPrompt = await hub.pull('rlm/rag-prompt');
    const ragChain = 
        ragPrompt.pipe(model).pipe(new StringOutputParser);
    
    const generatedAnswer = await ragChain.invoke({
        context: util.formatDocs(reteieved_docs),
        question: question,
    });
    
    return generatedAnswer;
}

export {buildVectorStore};