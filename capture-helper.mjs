import { mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
if (!process.env.RUNTIME_DIR) throw new Error('RUNTIME_DIR must point to the runtime scripts.')
const captures = require(join(process.env.RUNTIME_DIR, 'scripts/wip-screenshots.cjs'))
const { chromium } = require('playwright')
captures.instrument({ chromium })
const config = JSON.parse(readFileSync(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (process.platform === 'linux') process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim()

const url = process.env.CAPTURE_URL
const output = process.env.CAPTURE_DIR
if (!url || !output) throw new Error('Set CAPTURE_URL and CAPTURE_DIR.')
let parsedUrl
try {
  parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol')
} catch (error) {
  console.error(`Invalid CAPTURE_URL: ${error.message}`)
  process.exit(1)
}

const timed = async (label, action) => {
  const started = performance.now()
  try { return await action() }
  finally { console.log(`[timing] ${label}: ${((performance.now() - started) / 1000).toFixed(3)} s`) }
}
const failure = (message, exitCode) => Object.assign(new Error(message), { exitCode })
const isTemporaryNavigationError = error => error.name === 'TimeoutError' || /net::ERR_|Navigation failed|Target closed|browser has been closed/i.test(error.message)

let browser
let exitCode = 0
try {
  await timed('create capture directory', async () => mkdirSync(output, { recursive: true }))
  browser = await timed('launch capture browser', () => chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(error => { throw failure(error.message, 75) }))

  for (const [name, width, height, mobile] of [
    ['desktop', 1440, 900, false],
    ['mobile', 390, 844, true]
  ]) {
    const page = await timed(`${name} page setup`, () => browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      isMobile: mobile,
      hasTouch: mobile
    }).catch(error => { throw failure(error.message, 75) }))
    page.setDefaultTimeout(15000)
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('response', response => {
      try {
        if (response.status() >= 400 && new URL(response.url()).origin === parsedUrl.origin)
          pageErrors.push(`HTTP ${response.status()}: ${response.url()}`)
      } catch {}
    })

    const response = await timed(`${name} navigation`, () => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(error => {
      throw failure(error.message, isTemporaryNavigationError(error) ? 75 : 1)
    }))
    if (!response?.ok()) {
      const status = response?.status()
      throw failure(`Preview returned HTTP ${status ?? 'no response'} for ${name}.`, !status || [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1)
    }

    await timed(`${name} rendered-content wait`, () => page.waitForFunction(() => {
      const screen = document.querySelector('#menu-screen')
      const heading = screen?.querySelector('.brand')
      const button = screen?.querySelector('#start-btn')
      const canvas = document.querySelector('#game canvas')
      const visible = element => {
        if (!element) return false
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }
      return visible(screen) && visible(heading) && visible(button) && visible(canvas) && canvas.width > 0 && canvas.height > 0
    }, { timeout: 30000 }).catch(error => {
      throw failure(`Rendered game UI did not become visible (${name}): ${error.message}`, 1)
    }))

    // Let the first WebGL frame and responsive layout settle before saving evidence.
    await timed(`${name} render settle`, () => page.waitForTimeout(1000))
    const screenshotPath = join(output, `final-${name}.png`)
    const image = await timed(`${name} screenshot`, () => page.screenshot({ path: screenshotPath, timeout: 30000 }).catch(error => {
      throw failure(error.message, error.name === 'TimeoutError' || !browser.isConnected() ? 75 : 1)
    }))
    if (image.length < 1000 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw failure(`Screenshot output is not a valid rendered PNG: ${screenshotPath}`, 1)
    if (pageErrors.length) throw failure(`${name} page errors: ${pageErrors.join('; ')}`, 1)
    await timed(`${name} page close`, () => page.close().catch(error => { throw failure(error.message, 75) }))
    console.log(`Captured ${name}: ${screenshotPath}`)
  }
} catch (error) {
  exitCode = error.exitCode || 1
  console.error(error)
} finally {
  if (browser) {
    try { await timed('close capture browser', () => browser.close()) }
    catch (error) {
      console.error(error)
      if (!exitCode) exitCode = 75
    }
  }
}
process.exitCode = exitCode
