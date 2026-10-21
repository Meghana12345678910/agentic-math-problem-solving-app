import type { Question } from '../types/question'

export function describeQuestion(question: Question): string {
  const words = {
    addition: 'plus',
    subtraction: 'minus',
    multiplication: 'times',
    division: 'divided by',
  }
  return `${question.firstOperand} ${words[question.operation]} ${question.secondOperand} equals what?`
}
