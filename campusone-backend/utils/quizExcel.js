import { createWorkbookBuffer, readFirstWorksheetRows } from './excelWorkbook.js';
import { validateQuestions } from './quizValidation.js';

export const QUIZ_EXCEL_COLUMNS = [
  'type',
  'questionText',
  'option1',
  'option2',
  'option3',
  'option4',
  'correctAnswer',
  'marks',
];

export const parseQuizQuestionsWorkbook = async (buffer) => {
  const rows = await readFirstWorksheetRows(buffer, { defval: '' });
  const parsedQuestions = rows.map((row, index) => {
    const type = String(row.type || row.Type || 'MCQ').trim().toUpperCase();
    const questionText = row.questionText || row.question || row.Question || '';
    const options = [row.option1, row.option2, row.option3, row.option4]
      .filter((option) => option !== undefined && option !== null && String(option).trim() !== '');
    const correctRaw = row.correctAnswer ?? row.correct ?? row.Correct;
    const marks = Number(row.marks ?? row.Marks ?? 1);

    let correctAnswer;
    if (type === 'MCQ') {
      if (typeof correctRaw === 'string' && /^[a-jA-J]$/.test(correctRaw.trim())) {
        correctAnswer = correctRaw.trim().toLowerCase().charCodeAt(0) - 97;
      } else {
        const numericAnswer = Number(correctRaw);
        correctAnswer = numericAnswer >= 1 && numericAnswer <= options.length
          ? numericAnswer - 1
          : numericAnswer;
      }
    } else if (type === 'TRUE_FALSE' || type === 'TF') {
      const value = String(correctRaw).toLowerCase().trim();
      if (!['true', 'false', '1', '0', 't', 'f'].includes(value)) {
        throw new Error(`Question ${index + 1} must use TRUE or FALSE as its correct answer`);
      }
      correctAnswer = ['true', '1', 't'].includes(value) ? 0 : 1;
    } else {
      correctAnswer = String(correctRaw ?? '').trim();
    }

    return {
      type: type === 'TF' ? 'TRUE_FALSE' : type,
      questionText: String(questionText),
      options: type === 'TRUE_FALSE' || type === 'TF' ? ['True', 'False'] : options,
      correctAnswer,
      marks,
      order: index,
    };
  }).filter((question) => question.questionText.trim());

  return validateQuestions(parsedQuestions);
};

export const createQuizImportTemplate = async () => {
  const exampleRows = [
    {
      type: 'MCQ',
      questionText: 'Which data structure follows FIFO order?',
      option1: 'Stack',
      option2: 'Queue',
      option3: 'Tree',
      option4: 'Graph',
      correctAnswer: 'B',
      marks: 2,
    },
    {
      type: 'TRUE_FALSE',
      questionText: 'A primary key must be unique.',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswer: 'TRUE',
      marks: 1,
    },
    {
      type: 'SHORT',
      questionText: 'What does DBMS stand for?',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswer: 'Database Management System',
      marks: 2,
    },
  ];

  const instructionRows = [
    ['CampusOne Quiz Import Instructions'],
    ['Keep the column names in the Questions sheet unchanged. Delete the example rows before entering your own questions.'],
    [],
    ['Column', 'Accepted value'],
    ['type', 'MCQ, TRUE_FALSE (or TF), or SHORT'],
    ['questionText', 'Required question text'],
    ['option1-option4', 'Required for MCQ. Leave blank for TRUE_FALSE and SHORT.'],
    ['correctAnswer (MCQ)', 'Use A, B, C, or D. Letters are recommended to avoid index confusion.'],
    ['correctAnswer (TRUE_FALSE)', 'Use TRUE or FALSE'],
    ['correctAnswer (SHORT)', 'Expected answer/reference text'],
    ['marks', 'A number greater than 0'],
  ];
  return createWorkbookBuffer([
    {
      name: 'Questions',
      rows: exampleRows,
      header: QUIZ_EXCEL_COLUMNS,
      columns: [
        { wch: 14 },
        { wch: 52 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
        { wch: 24 },
        { wch: 10 },
      ],
      freezeHeader: true,
    },
    {
      name: 'Instructions',
      rows: instructionRows,
      columns: [{ wch: 30 }, { wch: 90 }],
    },
  ]);
};
