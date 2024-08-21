import {OpenAI} from "@langchain/openai";
import type {Document} from "@langchain/core/documents";

interface RagInterface {
    question: string;
    generatedAnswer: string;
    documents: Document[];
    openAiModel: OpenAI;
};

export {RagInterface};