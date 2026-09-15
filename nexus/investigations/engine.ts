export type InvestigationRequest = { guildId: string; subjectId: string; objective: string };
export type InvestigationStep = { capability: string; purpose: string };
export type InvestigationPlan = { subjectId: string; steps: InvestigationStep[]; uncertainty: string[] };

export function createInvestigationPlan(request: InvestigationRequest): InvestigationPlan {
  return {
    subjectId: request.subjectId,
    steps: [
      { capability: 'server_history', purpose: 'Review information available to NEXUS within this guild.' },
      { capability: 'public_identity_lookup', purpose: 'Collect permitted public identity signals.' },
      { capability: 'public_web_lookup', purpose: 'Check relevant public information when available.' },
      { capability: 'risk_assessment', purpose: 'Correlate evidence and identify uncertainty.' },
    ],
    uncertainty: ['Public information may be incomplete, stale, or ambiguous.'],
  };
}
