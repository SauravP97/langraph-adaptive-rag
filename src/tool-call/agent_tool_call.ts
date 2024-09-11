import {z} from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import type { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";

const addTool = new DynamicStructuredTool({
    name: "add",
    description: "Add two integers",
    schema: z.object({
        a: z.number(),
        b: z.number(),
    }),
    func: async ({a, b}) => {
        return (a + b).toString();
    },
});

const lengthTool = new DynamicStructuredTool({
    name: "find_length",
    description: "Find the length of the string",
    schema: z.object({
        str: z.string()
    }),
    func: async ({str}) => {
        return str.length.toString();
    }
});

const agentToolCall = async () => {
    // Get the prompt to use - you can modify this!
    // You can also see the full prompt at:
    // https://smith.langchain.com/hub/hwchase17/openai-tools-agent
    const prompt = 
        await pull<ChatPromptTemplate>("hwchase17/openai-tools-agent");

    const model = new ChatOpenAI({
        temperature: 0
    });

    const tools = [addTool, lengthTool];

    const agent = await createOpenAIToolsAgent({
        llm: model,
        tools,
        prompt,
    });

    const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: true,
    });

    const response = await agentExecutor.invoke({
        input: "Add number 5 and 4 and also find the length of the string 'Crocodile'",
    });

    console.log("======== Response Enter ===========");
    console.log(response);
    console.log("======== Response Exit ==========");

    return response;
}

export {agentToolCall};
