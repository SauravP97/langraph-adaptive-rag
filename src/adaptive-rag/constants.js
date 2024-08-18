"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUESTION_ROUTER_SYSTEM_TEMPLATE = exports.REWRITER_PROMPT_TEMPLATE = exports.ANSWER_GRADER_PROMPT_TEMPLATE = exports.HALLUCINATION_GRADER_TEMPLATE = exports.GRADER_TEMPLATE = exports.URLs = void 0;
// URLs to pick data from to build our Knowledge Base!
const URLs = [
    "https://lilianweng.github.io/posts/2023-06-23-agent/",
    "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
    "https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/",
];
exports.URLs = URLs;
const QUESTION_ROUTER_SYSTEM_TEMPLATE = `You are an expert at routing a user question to a vectorstore or web search.
Use the vectorstore for questions on LLM agents, prompt engineering, and adversarial attacks.
You do not need to be stringent with the keywords in the question related to these topics.
Otherwise, use web-search. Give a binary choice 'web_search' or 'vectorstore' based on the question.`;
exports.QUESTION_ROUTER_SYSTEM_TEMPLATE = QUESTION_ROUTER_SYSTEM_TEMPLATE;
const GRADER_TEMPLATE = `You are a grader assessing relevance of a retrieved document to a user question.
Here is the retrieved document:

<document>
{content}
</document>

Here is the user question:
<question>
{question}
</question>

If the document contains keywords related to the user question, grade it as relevant.
It does not need to be a stringent test. The goal is to filter out erroneous retrievals.
Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question.`;
exports.GRADER_TEMPLATE = GRADER_TEMPLATE;
const HALLUCINATION_GRADER_TEMPLATE = `You are a grader assessing whether an answer is grounded in / supported by a set of facts.
Here are the facts used as context to generate the answer:

<context>
{context} 
</context>

Here is the answer:

<answer>
{generation}
</answer>

Give a binary score 'yes' or 'no' score to indicate whether the answer is grounded in / supported by a set of facts.`;
exports.HALLUCINATION_GRADER_TEMPLATE = HALLUCINATION_GRADER_TEMPLATE;
const ANSWER_GRADER_PROMPT_TEMPLATE = `You are a grader assessing whether an answer is useful to resolve a question.
Here is the answer:

<answer>
{generation} 
</answer>

Here is the question:

<question>
{question}
</question>

Give a binary score 'yes' or 'no' to indicate whether the answer is useful to resolve a question.`;
exports.ANSWER_GRADER_PROMPT_TEMPLATE = ANSWER_GRADER_PROMPT_TEMPLATE;
const REWRITER_PROMPT_TEMPLATE = `You a question re-writer that converts an input question to a better version that is optimized
for vectorstore retrieval. Look at the initial and formulate an improved question.

Here is the initial question:

<question>
{question}
</question>

Respond only with an improved question. Do not include any preamble or explanation.`;
exports.REWRITER_PROMPT_TEMPLATE = REWRITER_PROMPT_TEMPLATE;
