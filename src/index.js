"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const dotenv = __importStar(require("dotenv"));
const chatbot_1 = require("./chatbot/chatbot");
dotenv.config();
const server = http.createServer((req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        return res.end(formResponse);
    }
    if (url == '/chat' && req.method == "POST") {
        const body = [];
        req.on("data", (chunk) => {
            body.push(chunk);
        });
        req.on("end", () => __awaiter(void 0, void 0, void 0, function* () {
            const parsedBody = Buffer.concat(body).toString();
            const message = parsedBody.split("=")[1];
            const question = decodeURIComponent(message).replace(/\+/g, " ");
            console.log(question);
            const response = yield (0, chatbot_1.startChat)(question);
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
        }));
    }
}));
server.listen(3000);
