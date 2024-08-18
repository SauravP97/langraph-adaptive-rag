import * as http from "http";
import {adaptiveRag} from "./adaptive-rag/adaptive_rag";
import * as dotenv from "dotenv";

dotenv.config();

const server = http.createServer(async (req, res) => {
    // Run the RAG!
    await adaptiveRag();
    console.log("Graph Ended!");

    res.statusCode = 200;
    res.setHeader('Content-Type', "text/plain");
    res.end("Graph Ran");
});

server.listen(3000);