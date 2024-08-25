"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANSWER_GRADER_PROMPT_TEMPLATE = exports.GRADER_TEMPLATE = void 0;
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
