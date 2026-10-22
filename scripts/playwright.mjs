import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Keep downloaded browsers inside this project instead of the user's global cache.
const project = fileURLToPath(new URL('../', import.meta.url))
const cli = fileURLToPath(
  new URL('../node_modules/@playwright/test/cli.js', import.meta.url),
)
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: project,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: fileURLToPath(
      new URL('../.playwright', import.meta.url),
    ),
  },
  stdio: 'inherit',
})
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
