import MistakeStatistics from '../components/statistics/MistakeStatistics'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { storageService } from '../services/storageService'
import { calculateStatistics } from '../services/statisticsService'
import StatisticsCard from '../components/statistics/StatisticsCard'
import RecentSessions from '../components/statistics/RecentSessions'
import ConfirmDialog from '../components/common/ConfirmDialog'
import type { DifficultyLevel, MathOperation } from '../types/question'
import './StatisticsPage.css'

const operations: { value: MathOperation; label: string }[] = [
  { value: 'addition', label: 'Addition' },
  { value: 'subtraction', label: 'Subtraction' },
  { value: 'multiplication', label: 'Multiplication' },
  { value: 'division', label: 'Division' },
]
const levels: { value: DifficultyLevel; label: string }[] = [
  { value: 1, label: 'Level 1: Beginner' },
  { value: 2, label: 'Level 2: Easy' },
  { value: 3, label: 'Level 3: Intermediate' },
  { value: 4, label: 'Level 4: Advanced' },
]
function loadHistory() {
  return {
    attempts: storageService.loadAttempts(),
    patterns: storageService.loadMistakePatterns(),
    threshold: storageService.loadSettings().masteryThreshold,
    sessions: storageService.loadSessions(),
  }
}

function StatisticsPage() {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  const [history, setHistory] = useState(loadHistory)
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState('')
  const statistics = useMemo(
    () => calculateStatistics(history.attempts),
    [history.attempts],
  )

  function reset() {
    const saved = storageService.resetStatistics()
    setHistory(loadHistory())
    setConfirmReset(false)
    setMessage(
      saved
        ? 'Practice history and statistics have been reset.'
        : 'Statistics were reset for this page, but the change could not be saved on this device.',
    )
  }

  return (
    <section>
      <h1 ref={heading} tabIndex={-1}>
        Statistics
      </h1>
      {statistics.attempted === 0 && (
        <p>
          No questions answered yet.{' '}
          <Link to="/practice/setup">Start Practice</Link> to see your progress
          here.
        </p>
      )}
      <section aria-labelledby="overall-heading">
        <h2 id="overall-heading">Overall performance</h2>
        <StatisticsCard title="Overall totals" totals={statistics} />
      </section>
      <section aria-labelledby="operation-heading">
        <h2 id="operation-heading">By operation</h2>
        <div className="statistics-grid">
          {operations.map(({ value, label }) => (
            <StatisticsCard
              key={value}
              title={label}
              totals={statistics.byOperation[value]}
            />
          ))}
        </div>
      </section>
      <section aria-labelledby="difficulty-heading">
        <h2 id="difficulty-heading">By difficulty</h2>
        <div className="statistics-grid">
          {levels.map(({ value, label }) => (
            <StatisticsCard
              key={value}
              title={label}
              totals={statistics.byDifficulty[value]}
            />
          ))}
        </div>
      </section>
      <RecentSessions sessions={history.sessions} />
      <MistakeStatistics
        patterns={history.patterns}
        attempts={history.attempts}
        threshold={history.threshold}
      />
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setConfirmReset(true)}
      >
        Reset Statistics
      </button>
      {confirmReset && (
        <ConfirmDialog
          onConfirm={reset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
      <p role="status">{message}</p>
    </section>
  )
}
export default StatisticsPage
