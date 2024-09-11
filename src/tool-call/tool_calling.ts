import {StateGraph, START, END} from "@langchain/langgraph";
import {ToolNode} from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {z} from 'zod';
import {ChatOpenAI} from "@langchain/openai";
import {RunnableSequence} from '@langchain/core/runnables';
import { JsonOutputKeyToolsParser } from "langchain/output_parsers";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";

const addTwoNumbers = new DynamicStructuredTool({
    name: "add_two_numbers",
    description: 'Adds two numbers',
    schema: z.object({
        a: z.number().describe("First number to add"),
        b: z.number().describe("Second number to add")
    }),
    func: async ({a, b}) => {
        return (a + b).toString();
    },
});

const callModel = async () => {
    const model = new ChatOpenAI({
        model: "gpt-3.5-turbo-1106"
    });

    const modelWithTools = model.bind({
        tools: [convertToOpenAITool(addTwoNumbers)],
        tool_choice: {
            type: "function",
            function: {name: "add_two_numbers"}
        }
    })

    const chain1 = modelWithTools.pipe(
        new JsonOutputKeyToolsParser({ 
            keyName: "add_two_numbers",
            returnSingle: true
    }));
        
    const chain2 = RunnableSequence.from([
        modelWithTools,
        new JsonOutputKeyToolsParser({
            keyName: "add_two_numbers",
            returnSingle: true
        }),
        addTwoNumbers
    ]);

    const response = await chain2.invoke("Add two numbers 5 and 21");
}

export {callModel};