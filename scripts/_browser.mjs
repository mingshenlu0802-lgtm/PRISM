/**
 * 找一个能用的 Chromium。
 *
 * 沙箱里 Playwright 的浏览器预装在 /opt/pw-browsers，目录名带版本号，所以要找一下。
 * 别处（比如 GitHub Actions）Playwright 自己就能找到，这里返回空数组，
 * 让 chromium.launch() 走它的默认逻辑。
 *
 * 特意不用 node:fs 的 globSync：那是 Node 22 才有的，而 CI 跑的是 Node 20——
 * 用了它，脚本就只能在开发机上跑，在 CI 里第一行就抛 TypeError。
 * readdirSync 从 Node 0.x 就有。
 */
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/opt/pw-browsers'

/** 预装浏览器的可执行文件路径；找不到就返回 null。 */
export function localChromium() {
  if (!existsSync(ROOT)) return null
  let entries
  try { entries = readdirSync(ROOT) } catch { return null }
  const candidates = [
    ...entries.filter((d) => d.startsWith('chromium-')).map((d) => join(ROOT, d, 'chrome-linux', 'chrome')),
    ...entries.filter((d) => d.startsWith('chromium_headless_shell-')).map((d) => join(ROOT, d, 'chrome-linux', 'headless_shell')),
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

/** 直接喂给 chromium.launch()。没有预装的就交给 Playwright 自己找。 */
export function launchOptions() {
  const path = localChromium()
  return path ? { executablePath: path } : {}
}
