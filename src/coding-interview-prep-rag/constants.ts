const URLs = [
    "https://www.freecodecamp.org/news/how-to-make-progress-while-studying-for-coding-interviews-894c320bfa74/",
    "https://medium.com/coderbyte/learn-by-doing-the-8-best-interactive-coding-websites-4c902915287c",
];

const GRADER_TEMPLATE = 
    `You are a grader assessing relevance of a retrieved document to a user question.
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

export {
    URLs,
    GRADER_TEMPLATE,
};