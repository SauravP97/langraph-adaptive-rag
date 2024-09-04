import * as http from "http";
import {adaptiveRag} from "./adaptive-rag/adaptive_rag";
import * as dotenv from "dotenv";
// import { execute } from "./coding-interview-prep-rag/coding_interview-rag";
import {buildVectorStore} from "./basic-rag/rag";
import {invokeRag} from "./distributed-systems-rag/dsrag";

dotenv.config();

const server = http.createServer(async (req, res) => {
    const response = await invokeRag();

    res.setHeader('Content-Type', "text/plain");
    res.end(`
        Question Asked: ${response.question}
        \n \n
        Answer generated: ${response.generatedAnswer}
    `);
});

server.listen(3000);