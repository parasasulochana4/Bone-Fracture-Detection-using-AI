import {
  HeartPulse, ArrowRight, AlertTriangle, Activity,
  Calendar, Pill, CheckCircle2, XCircle,
} from 'lucide-react';
import SectionHeading from '@/components/SectionHeading';
import Callout from '@/components/Callout';
import { getTreatmentPlan } from '@/data/treatmentData';

const sections = [
  { key: 'nextSteps', icon: ArrowRight, label: 'Recommended Next Steps', color: 'sky' },
  { key: 'treatmentInfo', icon: Pill, label: 'General Treatment Information', color: 'amber' },
  { key: 'lifestyle', icon: Activity, label: 'Lifestyle Recommendations', color: 'emerald' },
  { key: 'followUp', icon: Calendar, label: 'Follow-Up Recommendations', color: 'sky' },
  { key: 'warningSigns', icon: AlertTriangle, label: 'Warning Signs — Seek Medical Attention', color: 'rose' },
] as const;

export default function TreatmentPlanPage() {
  const fracturePlan = getTreatmentPlan('Fracture');
  const nonFracturePlan = getTreatmentPlan('Non-Fracture');

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Post-Diagnosis"
        title="Treatment Plan"
        description="After the AI model produces a prediction, this treatment plan provides general health guidance. This information is for educational purposes only and does not replace professional medical advice."
      />

      <Callout variant="warning" title="Important Medical Disclaimer">
        The treatment information below is generated based on the AI model's prediction and is
        intended for educational purposes only. It does not constitute medical advice, diagnosis,
        or treatment recommendations. Always consult a qualified healthcare professional for
        medical decisions.
      </Callout>

      {/* Fracture treatment plan */}
      <div className="mt-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15">
            <XCircle className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{fracturePlan.condition}</h3>
            <p className="text-xs text-slate-500">When the model predicts a fracture</p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.key} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="mb-4 flex items-center gap-2">
                <section.icon className={`h-5 w-5 text-${section.color}-400`} />
                <h4 className="font-semibold text-slate-100">{section.label}</h4>
              </div>
              <ul className="space-y-2.5">
                {fracturePlan[section.key].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-${section.color}-500`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Non-fracture treatment plan */}
      <div className="mt-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{nonFracturePlan.condition}</h3>
            <p className="text-xs text-slate-500">When the model predicts no fracture</p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.key} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="mb-4 flex items-center gap-2">
                <section.icon className={`h-5 w-5 text-${section.color}-400`} />
                <h4 className="font-semibold text-slate-100">{section.label}</h4>
              </div>
              <ul className="space-y-2.5">
                {nonFracturePlan[section.key].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-${section.color}-500`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-12">
        <div className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-6">
          <HeartPulse className="h-6 w-6 shrink-0 text-sky-400" />
          <p className="text-sm text-slate-300">
            The treatment plan is automatically shown on the Prediction page after a prediction is made.
            The plan adapts based on whether the model detects a fracture or not, providing relevant
            guidance for each scenario.
          </p>
        </div>
      </div>
    </div>
  );
}
