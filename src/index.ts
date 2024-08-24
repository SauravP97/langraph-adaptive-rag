import * as http from "http";
import {adaptiveRag} from "./adaptive-rag/adaptive_rag";
import * as dotenv from "dotenv";
import { execute } from "./coding-interview-prep-rag/coding_interview-rag";
import {buildVectorStore} from "./basic-rag/rag";

dotenv.config();

const server = http.createServer(async (req, res) => {
    // Run the RAG!
    
    //const graphState = await execute();
    // console.log("Graph Ended!");

    // res.statusCode = 200;
    // res.setHeader('Content-Type', "text/plain");
    // res.end(
    //     `
    //     Your question: ${graphState.question}
    //     \n\n
    //     Model answered: ${graphState.generatedAnswer}
    //     `);
    const content = await buildVectorStore();
    res.setHeader('Content-Type', "text/plain");
    res.end(content);
});

server.listen(3000);