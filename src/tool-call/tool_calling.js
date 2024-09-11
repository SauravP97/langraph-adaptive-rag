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
exports.callModel = void 0;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const openai_1 = require("@langchain/openai");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("langchain/output_parsers");
const function_calling_1 = require("@langchain/core/utils/function_calling");
const addTwoNumbers = new tools_1.DynamicStructuredTool({
    name: "add_two_numbers",
    description: 'Adds two numbers',
    schema: zod_1.z.object({
        a: zod_1.z.number().describe("First number to add"),
        b: zod_1.z.number().describe("Second number to add")
    }),
    func: (_a) => __awaiter(void 0, [_a], void 0, function* ({ a, b }) {
        return (a + b).toString();
    }),
});
const callModel = () => __awaiter(void 0, void 0, void 0, function* () {
    const model = new openai_1.ChatOpenAI({
        model: "gpt-3.5-turbo-1106"
    });
    const modelWithTools = model.bind({
        tools: [(0, function_calling_1.convertToOpenAITool)(addTwoNumbers)],
        tool_choice: {
            type: "function",
            function: { name: "add_two_numbers" }
        }
    });
    const chain1 = modelWithTools.pipe(new output_parsers_1.JsonOutputKeyToolsParser({
        keyName: "add_two_numbers",
        returnSingle: true
    }));
    const chain2 = runnables_1.RunnableSequence.from([
        modelWithTools,
        new output_parsers_1.JsonOutputKeyToolsParser({
            keyName: "add_two_numbers",
            returnSingle: true
        }),
        addTwoNumbers
    ]);
    const response = yield chain2.invoke("Add two numbers 5 and 21");
});
exports.callModel = callModel;
