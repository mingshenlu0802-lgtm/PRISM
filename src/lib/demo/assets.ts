/** Visual assets travel with their article file; this only aggregates them. */
import type { ImageAsset } from '../types'
import { assets as veyra } from './articles/veyra-gender-recognition-ruling'
import { assets as kalisan } from './articles/kalisan-domestic-violence-data-gap'
import { assets as norhold } from './articles/norhold-pay-transparency-audit'
import { assets as selva } from './articles/selva-telemedicine-abortion-grey-zone'
import { assets as funding } from './articles/movement-funding-allocation-dispute'
import { assets as amirat } from './articles/amirat-asylum-sogi-credibility'
import { assets as turan } from './articles/turan-coordinated-harassment-network'
import { assets as maran } from './articles/maran-islands-trial-reporting-limits'
import { assets as estria } from './articles/east-estria-trans-healthcare-evidence'
import { assets as curriculum } from './articles/veyra-curriculum-equality-bill'

export const ASSETS: ImageAsset[] = [
  ...veyra, ...kalisan, ...norhold, ...selva, ...funding,
  ...amirat, ...turan, ...maran, ...estria, ...curriculum,
]
