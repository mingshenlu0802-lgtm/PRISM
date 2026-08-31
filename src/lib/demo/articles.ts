/** Aggregates the ten fictional demo entries. */
import type { Article } from '../types'
import { article as veyra } from './articles/veyra-gender-recognition-ruling'
import { article as kalisan } from './articles/kalisan-domestic-violence-data-gap'
import { article as norhold } from './articles/norhold-pay-transparency-audit'
import { article as selva } from './articles/selva-telemedicine-abortion-grey-zone'
import { article as funding } from './articles/movement-funding-allocation-dispute'
import { article as amirat } from './articles/amirat-asylum-sogi-credibility'
import { article as turan } from './articles/turan-coordinated-harassment-network'
import { article as maran } from './articles/maran-islands-trial-reporting-limits'
import { article as estria } from './articles/east-estria-trans-healthcare-evidence'
import { article as curriculum } from './articles/veyra-curriculum-equality-bill'

export const ARTICLES: Article[] = [
  veyra, kalisan, norhold, selva, funding,
  amirat, turan, maran, estria, curriculum,
]
