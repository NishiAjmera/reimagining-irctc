type AnalyticsEvent = 'journey_started' | 'intent_submitted' | 'constraints_edited' | 'results_viewed' | 'journey_selected' | 'recommendation_explanation_opened' | 'railway_term_explained' | 'context_question_clicked' | 'traveller_details_completed' | 'sample_payment_completed';

export function track(event: AnalyticsEvent, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const record = { event, at: new Date().toISOString(), ...data };
  const existing = JSON.parse(window.localStorage.getItem('railease-analytics') ?? '[]') as unknown[];
  window.localStorage.setItem('railease-analytics', JSON.stringify([...existing.slice(-99), record]));
  console.info('[RailEase analytics]', record);
}
