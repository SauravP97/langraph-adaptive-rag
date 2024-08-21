"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDocs = formatDocs;
exports.printGraphByMermaid = printGraphByMermaid;
function formatDocs(docs) {
    return docs.map((doc) => doc.pageContent).join("\n\n");
}
function printGraphByMermaid(mermaidGraphConfig) {
    console.log("Flowchart of the Graph");
    console.log(mermaidGraphConfig);
}
