"use strict";
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
exports.agentToolCall = void 0;
const zod_1 = require("zod");
const tools_1 = require("@langchain/core/tools");
const openai_1 = require("@langchain/openai");
const agents_1 = require("langchain/agents");
const hub_1 = require("langchain/hub");
const addTool = new tools_1.DynamicStructuredTool({
    name: "add",
    description: "Add two integers",
    schema: zod_1.z.object({
        a: zod_1.z.number(),
        b: zod_1.z.number(),
    }),
    func: (_a) => __awaiter(void 0, [_a], void 0, function* ({ a, b }) {
        return (a + b).toString();
    }),
});
const lengthTool = new tools_1.DynamicStructuredTool({
    name: "find_length",
    description: "Find the length of the string",
    schema: zod_1.z.object({
        str: zod_1.z.string()
    }),
    func: (_a) => __awaiter(void 0, [_a], void 0, function* ({ str }) {
        return str.length.toString();
    })
});
const agentToolCall = () => __awaiter(void 0, void 0, void 0, function* () {
    // Get the prompt to use - you can modify this!
    // You can also see the full prompt at:
    // https://smith.langchain.com/hub/hwchase17/openai-tools-agent
    const prompt = yield (0, hub_1.pull)("hwchase17/openai-tools-agent");
    const model = new openai_1.ChatOpenAI({
        temperature: 0
    });
    const tools = [addTool, lengthTool];
    const agent = yield (0, agents_1.createOpenAIToolsAgent)({
        llm: model,
        tools,
        prompt,
    });
    const agentExecutor = new agents_1.AgentExecutor({
        agent,
        tools,
        verbose: true,
    });
    const response = yield agentExecutor.invoke({
        input: "Add number 5 and 4 and also find the length of the string 'Crocodile'",
    });
    console.log("======== Response Enter ===========");
    console.log(response);
    console.log("======== Response Exit ==========");
    return response;
});
exports.agentToolCall = agentToolCall;
