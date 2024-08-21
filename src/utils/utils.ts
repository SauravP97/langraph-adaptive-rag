import type {Document} from "@langchain/core/documents";
import {CompiledStateGraph} from "@langchain/langgraph";
import {RagInterface} from "./rag_interface";

function formatDocs(docs: Document[]) {
    return docs.map((doc) => doc.pageContent).join("\n\n");
}

function printGraphByMermaid(mermaidGraphConfig: string) {
    console.log("Flowchart of the Graph");
    console.log(mermaidGraphConfig);
}

export {formatDocs, printGraphByMermaid};