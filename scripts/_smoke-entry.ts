// esbuild entry for the behaviour tests — one file so the bundle is built once.
export { buildInitialState } from '../src/lib/demo/index'
export { reducer } from '../src/lib/store'
export { collect, planSteps } from '../src/lib/collect'
export { runVibe, VIBE_EXAMPLES } from '../src/lib/vibe'
export { contentSnapshot } from '../src/lib/github'
export { OWNER_EMAIL } from '../src/lib/types'
export { PRIORITY_REGIONS } from '../src/lib/regions'
