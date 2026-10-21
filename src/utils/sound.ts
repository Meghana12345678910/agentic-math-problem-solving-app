/** Short, gentle feedback; unsupported or blocked audio never interrupts practice. */
export function playFeedbackSound(correct: boolean): void {
  if (!window.AudioContext) return
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = correct ? 660 : 440
    gain.gain.setValueAtTime(0.06, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.onended = () => {
      void context.close().catch(() => {})
    }
    void context
      .resume()
      .then(() => {
        oscillator.start()
        oscillator.stop(context.currentTime + 0.16)
      })
      .catch(() => {
        void context.close().catch(() => {})
      })
  } catch {
    /* Audio support is optional. */
  }
}
