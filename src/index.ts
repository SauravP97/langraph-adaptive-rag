import * as http from "http";
import {adaptiveRag} from "./adaptive-rag/adaptive_rag";
import * as dotenv from "dotenv";
// import { execute } from "./coding-interview-prep-rag/coding_interview-rag";
import {buildVectorStore} from "./basic-rag/rag";
import {invokeRag} from "./distributed-systems-rag/dsrag";
import {startChat} from "./chatbot/chatbot";
import {callModel} from "./tool-call/tool_calling";
import {agentToolCall} from "./tool-call/agent_tool_call";

dotenv.config();

const server = http.createServer(async (req, res) => {
    const url = req.url;
    if (url == "/") {
        const response = await agentToolCall();
        return res.end(
            `Input: ${response.input} \n\n
            Output: ${response.output}`);
    }
});

server.listen(3000);