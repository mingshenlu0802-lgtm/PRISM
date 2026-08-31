/** Fact-check records travel with their article file; this only aggregates them. */
import type { FactCheck } from '../types'
import { factChecks as veyra } from './articles/veyra-gender-recognition-ruling'
import { factChecks as kalisan } from './articles/kalisan-domestic-violence-data-gap'
import { factChecks as norhold } from './articles/norhold-pay-transparency-audit'
import { factChecks as selva } from './articles/selva-telemedicine-abortion-grey-zone'
import { factChecks as funding } from './articles/movement-funding-allocation-dispute'
import { factChecks as amirat } from './articles/amirat-asylum-sogi-credibility'
import { factChecks as turan } from './articles/turan-coordinated-harassment-network'
import { factChecks as maran } from './articles/maran-islands-trial-reporting-limits'
import { factChecks as estria } from './articles/east-estria-trans-healthcare-evidence'
import { factChecks as curriculum } from './articles/veyra-curriculum-equality-bill'

export const FACT_CHECKS: FactCheck[] = [
  ...veyra, ...kalisan, ...norhold, ...selva, ...funding,
  ...amirat, ...turan, ...maran, ...estria, ...curriculum,
]
