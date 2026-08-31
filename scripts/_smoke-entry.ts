// esbuild entry for the behaviour tests — one file so the bundle is built once.
export { buildInitialState } from '../src/lib/demo/index'
export { reducer, accessOf } from '../src/lib/store'
export { collect, planSteps } from '../src/lib/collect'
export { runVibe, VIBE_EXAMPLES } from '../src/lib/vibe'
export { contentSnapshot, downloadSnapshot } from '../src/lib/github'
export { PRIORITY_REGIONS } from '../src/lib/regions'
export { paragraphs } from '../src/lib/util'
export { readAddress } from '../src/lib/address'
