import * as http from "http";
import {adaptiveRag} from "./adaptive-rag/adaptive_rag";
import * as dotenv from "dotenv";
// import { execute } from "./coding-interview-prep-rag/coding_interview-rag";
import {buildVectorStore} from "./basic-rag/rag";
import {invokeRag} from "./distributed-systems-rag/dsrag";
import {startChat} from "./chatbot/chatbot";

dotenv.config();

const server = http.createServer(async (req, res) => {
    const url = req.url;

    if (url == '/') {
        res.setHeader('Content-Type', "text/html");
        const formResponse = `
        <body style="
                padding:20px; 
                font-family: math; 
                border: 1px solid #c4bebe;
                width: 500px;
                height: 200px;
                border-radius: 5px;
                background: #040a24;
                color: white;">
            <h1> Chat for SWE Interview Tips! </h1>
            <form action="/chat" method="POST">
                <label for="name">Your Question: </label>
                <p>
                <input style="width:400px" type="text" id="question" name="question" required><br>
                </p>
                <p>
                <input style="padding: 5px; border-radius: 3px;" type="submit" value="Ask!">
                </p>
            </form>
        </body>
        `;
        return res.end(formResponse)
    }

    if (url == '/chat' && req.method == "POST") {
        const body: Buffer[] = [];
        req.on("data", (chunk) => {
            body.push(chunk);
        });
        
        req.on("end", async () => {
            const parsedBody = Buffer.concat(body).toString();
            const message = parsedBody.split("=")[1];
            const question = decodeURIComponent(message).replace(/\+/g, " ");
            console.log(question);

            const response = await startChat(question);
            
            res.setHeader('Content-Type', "text/html");
            res.end(`
            <body style="
            padding:20px; 
            font-family: math; 
            border: 1px solid #c4bebe;
            width: 700px;
            height: 300px;
            border-radius: 5px;
            background: #040a24;
            color: white;">
            <div style="font-size:22px;">
            <p>
               <u><b> Question Asked </b></u> : ${response.question}
            </p>
            <p>
              <u><b>  Model's Response </b></u> : ${response.answer}
            </p>
            </div>
            </body>
            `);

            return res.end();
        })
    }
});

server.listen(3000);