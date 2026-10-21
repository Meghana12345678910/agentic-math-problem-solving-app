import type { Question } from '../types/question'

export function explainQuestion(question: Question): string {
  const {
    firstOperand: first,
    secondOperand: second,
    correctAnswer: answer,
  } = question
  switch (question.operation) {
    case 'addition':
      return `Start with ${first} and add ${second} to get ${answer}.`
    case 'subtraction':
      return `Start with ${first} and take away ${second} to get ${answer}.`
    case 'multiplication':
      return `${first} groups of ${second} make ${answer}.`
    case 'division':
      return `${answer} groups of ${second} make ${first}.`
  }
}
