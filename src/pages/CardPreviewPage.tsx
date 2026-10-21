import QuestionCard from '../components/practice/QuestionCard'
import type { Question } from '../types/question'

const sampleQuestion: Question = {
  id: 'sample-multiplication',
  operation: 'multiplication',
  firstOperand: 7,
  secondOperand: 8,
  displayText: '7 × 8 = ?',
  correctAnswer: 56,
  choices: [48, 54, 56, 64],
  difficulty: 2,
  source: 'regular',
}

function CardPreviewPage() {
  return (
    <section>
      <h1>Try a sample card</h1>
      <p>Explore this sample question. Your choice here will not be saved.</p>
      <QuestionCard
        question={sampleQuestion}
        questionNumber={1}
        totalQuestions={1}
      />
    </section>
  )
}

export default CardPreviewPage
