import net from 'node:net'
import { spawn } from 'node:child_process'

const port = 3006
const host = '127.0.0.1'

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host })
    socket.once('connect', () => {
      socket.end()
      resolve(true)
    })
    socket.once('error', () => {
      resolve(false)
    })
  })
}

if (await isPortOpen()) {
  console.log(`Next.js dev server already running at http://localhost:${port}`)
  process.exit(0)
}

const child = spawn('npm', ['run', 'dev:web'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

const forwardSignal = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.on('SIGINT', () => forwardSignal('SIGINT'))
process.on('SIGTERM', () => forwardSignal('SIGTERM'))

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
