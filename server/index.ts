import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface PortInfo {
  port: number
  pid: number
  process?: string
  url: string
  isHttp?: boolean
  httpStatus?: number
  title?: string
}

// HTTP 探測：檢查端口是否為 HTTP 服務
async function probeHttp(port: number): Promise<{ isHttp: boolean; status?: number; title?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000)

    const res = await fetch(`http://localhost:${port}/`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'text/html' }
    })

    clearTimeout(timeout)

    // 嘗試取得網頁標題
    let title: string | undefined
    try {
      const text = await res.text()
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (match) {
        title = match[1].trim().slice(0, 50) // 限制長度
      }
    } catch {}

    return { isHttp: true, status: res.status, title }
  } catch (e: any) {
    // 如果是 abort 或連接錯誤，不是 HTTP 服務
    return { isHttp: false }
  }
}

// 用 netstat 獲取所有監聽中的端口
async function getListeningPorts(): Promise<PortInfo[]> {
  const isWindows = process.platform === 'win32'

  try {
    if (isWindows) {
      // Windows: netstat -ano
      const { stdout } = await execAsync('netstat -ano', { encoding: 'utf8' })
      const lines = stdout.split('\n')
      const ports: PortInfo[] = []
      const seenPorts = new Set<number>()

      for (const line of lines) {
        // 匹配 LISTENING 的行
        if (line.includes('LISTENING')) {
          // TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
          // TCP    [::]:3000              [::]:0                 LISTENING       12345
          const match = line.match(/(?:0\.0\.0\.0|127\.0\.0\.1|\[::\]|\[::1\]):(\d+)\s+.*LISTENING\s+(\d+)/)
          if (match) {
            const port = parseInt(match[1])
            const pid = parseInt(match[2])

            // 過濾系統端口，只保留開發常用範圍
            if (port >= 1024 && port <= 65535 && !seenPorts.has(port)) {
              seenPorts.add(port)
              ports.push({
                port,
                pid,
                url: `http://localhost:${port}`
              })
            }
          }
        }
      }

      // 獲取進程名稱
      if (ports.length > 0) {
        try {
          const { stdout: tasklistOut } = await execAsync('tasklist /fo csv /nh', { encoding: 'utf8' })
          const processes = new Map<number, string>()

          for (const line of tasklistOut.split('\n')) {
            // "node.exe","12345","Console","1","50,000 K"
            const match = line.match(/"([^"]+)","(\d+)"/)
            if (match) {
              processes.set(parseInt(match[2]), match[1])
            }
          }

          for (const p of ports) {
            p.process = processes.get(p.pid) || 'unknown'
          }
        } catch (e) {
          // 獲取進程名稱失敗，忽略
        }
      }

      return ports.sort((a, b) => a.port - b.port)
    } else {
      // Linux/Mac: ss 或 netstat
      const { stdout } = await execAsync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', { encoding: 'utf8' })
      const lines = stdout.split('\n')
      const ports: PortInfo[] = []
      const seenPorts = new Set<number>()

      for (const line of lines) {
        // LISTEN   0   128   0.0.0.0:3000   0.0.0.0:*   users:(("node",pid=12345,fd=18))
        const portMatch = line.match(/:(\d+)\s/)
        const pidMatch = line.match(/pid=(\d+)/) || line.match(/(\d+)\//)

        if (portMatch) {
          const port = parseInt(portMatch[1])
          const pid = pidMatch ? parseInt(pidMatch[1]) : 0

          if (port >= 1024 && port <= 65535 && !seenPorts.has(port)) {
            seenPorts.add(port)
            ports.push({
              port,
              pid,
              url: `http://localhost:${port}`
            })
          }
        }
      }

      return ports.sort((a, b) => a.port - b.port)
    }
  } catch (e) {
    console.error('Error getting ports:', e)
    return []
  }
}

// 過濾開發相關端口 (排除系統服務)
function filterDevPorts(ports: PortInfo[]): PortInfo[] {
  const devProcesses = ['node', 'bun', 'deno', 'python', 'ruby', 'java', 'go', 'php', 'nginx', 'apache', 'code', 'electron']
  const devPortRanges = [
    [3000, 3999],  // Node/React/Vue 常用
    [4000, 4999],  // Angular/其他框架
    [5000, 5999],  // Flask/Vite
    [6000, 6999],  // Storybook 等
    [8000, 8999],  // Django/通用
    [9000, 9999],  // 其他開發服務
  ]

  return ports.filter(p => {
    // 檢查是否在開發端口範圍內
    const inDevRange = devPortRanges.some(([min, max]) => p.port >= min && p.port <= max)

    // 檢查是否是開發相關進程
    const isDevProcess = p.process && devProcesses.some(dp =>
      p.process!.toLowerCase().includes(dp)
    )

    return inDevRange || isDevProcess
  })
}

const app = new Elysia()
  .use(cors())

  // 健康檢查
  .get('/health', () => ({ status: 'ok', time: new Date().toISOString() }))

  // 獲取 HTTP 服務（有探測）
  .get('/api/ports', async () => {
    const allPorts = await getListeningPorts()
    const devPorts = filterDevPorts(allPorts)

    // 排除自己 (4567)
    const portsToProbe = devPorts.filter(p => p.port !== 4567)

    // 並發探測所有端口
    const probeResults = await Promise.all(
      portsToProbe.map(async (p) => {
        const probe = await probeHttp(p.port)
        return { ...p, ...probe }
      })
    )

    // 只回傳 HTTP 服務
    const httpPorts = probeResults.filter(p => p.isHttp)

    return {
      ports: httpPorts,
      total: allPorts.length,
      probed: portsToProbe.length,
      httpCount: httpPorts.length,
      timestamp: new Date().toISOString()
    }
  })

  // 獲取所有監聽端口（不探測）
  .get('/api/ports/all', async () => {
    const ports = await getListeningPorts()

    return {
      ports: ports.filter(p => p.port !== 4567),
      total: ports.length,
      timestamp: new Date().toISOString()
    }
  })

  // 探測單一端口
  .get('/api/ports/:port/probe', async ({ params }) => {
    const port = parseInt(params.port)
    const probe = await probeHttp(port)
    return { port, ...probe }
  })

  .listen(4567)

console.log(`🚀 LocalTab API running at http://localhost:${app.server?.port}`)
console.log(`📡 Endpoints:`)
console.log(`   GET /api/ports     - 開發相關端口（過濾後）`)
console.log(`   GET /api/ports/all - 所有監聽端口`)
