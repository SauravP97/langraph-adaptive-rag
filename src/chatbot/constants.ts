const KNOWLEDGE_BASE_URLS = [
    'https://www.techinterviewhandbook.org/software-engineering-interview-guide/',
    'https://www.techinterviewhandbook.org/resume/',
    'https://www.techinterviewhandbook.org/coding-interview-prep/',
    'https://www.techinterviewhandbook.org/coding-interview-rubrics/',
    'https://www.techinterviewhandbook.org/system-design/',
    'https://www.techinterviewhandbook.org/behavioral-interview/'
];

const QUESTION_GRADER_TEMPLATE = 
    ` You are a grader assessing the relevance of a question to the topic related to 
      Software Engineering and Coding Interviews. 
      Here is the question for you to assess:

      <question>
      {question}
      </question>

      If the question is not relevant to the Software Engineering and Coding Interviews domain
      return with an "exit" response, otherwise return "continue"
    `;

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

export {KNOWLEDGE_BASE_URLS, GRADER_TEMPLATE, QUESTION_GRADER_TEMPLATE};