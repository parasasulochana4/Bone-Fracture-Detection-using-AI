export interface TreatmentInfo {
  condition: string;
  nextSteps: string[];
  treatmentInfo: string[];
  lifestyle: string[];
  followUp: string[];
  warningSigns: string[];
}

export const treatmentData: Record<string, TreatmentInfo> = {
  Fracture: {
    condition: 'Fracture Detected',
    nextSteps: [
      'Consult an orthopedic specialist as soon as possible for a confirmed diagnosis',
      'Obtain a follow-up X-ray or CT scan from a clinical radiology center for confirmation',
      'Immobilize the affected area to prevent further injury before seeing a doctor',
      'Avoid putting weight or pressure on the suspected fracture site',
    ],
    treatmentInfo: [
      'Treatment depends on fracture type, location, and severity — only a physician can determine the appropriate approach',
      'Simple fractures may be treated with casting or splinting for 6-8 weeks',
      'Complex or displaced fractures may require surgical intervention with plates, screws, or rods',
      'Pain management is typically prescribed by the treating physician',
      'Physical therapy is often needed during recovery to restore full mobility',
    ],
    lifestyle: [
      'Ensure adequate calcium and vitamin D intake to support bone healing',
      'Maintain a balanced diet rich in protein to aid tissue repair',
      'Avoid smoking and excessive alcohol, as they slow bone healing',
      'Follow your doctor\'s weight-bearing restrictions carefully',
      'Get sufficient rest and sleep to support the body\'s healing process',
    ],
    followUp: [
      'Schedule a follow-up X-ray at 2-4 weeks to monitor healing progress',
      'Attend all scheduled orthopedic appointments',
      'Report any changes in pain, swelling, or mobility to your doctor',
      'Follow physical therapy recommendations once the fracture begins to heal',
      'A final follow-up is typically needed at 6-8 weeks to assess full healing',
    ],
    warningSigns: [
      'Severe or worsening pain that does not respond to prescribed medication',
      'Numbness, tingling, or loss of sensation below the fracture site',
      'Skin turning pale or blue below the injury — seek emergency care immediately',
      'Fever or chills, which may indicate infection',
      'Visible deformity or shortening of the limb',
      'Inability to move fingers or toes below the injury',
    ],
  },
  'Non-Fracture': {
    condition: 'No Fracture Detected',
    nextSteps: [
      'The AI model did not detect a fracture in this X-ray, but this is not a medical diagnosis',
      'If you are experiencing persistent pain, consult a healthcare professional for a clinical evaluation',
      'A doctor may recommend additional imaging or tests based on your symptoms',
      'Keep this result for your records and share it with your doctor if you seek care',
    ],
    treatmentInfo: [
      'No fracture was detected, but your symptoms should still be evaluated by a medical professional',
      'Pain or swelling without fracture may indicate a sprain, strain, or soft tissue injury',
      'Soft tissue injuries may require rest, ice, compression, and elevation (RICE protocol)',
      'A physician can rule out conditions that X-rays alone may not reveal',
      'Follow your doctor\'s guidance for any recommended treatment or activity modifications',
    ],
    lifestyle: [
      'Maintain bone health through regular weight-bearing exercise',
      'Ensure adequate calcium (1000-1200 mg/day) and vitamin D (600-800 IU/day) intake',
      'Engage in balance and strength training to reduce fall risk',
      'Avoid smoking and limit alcohol consumption for optimal bone health',
      'Stay hydrated and maintain a nutrient-rich diet',
    ],
    followUp: [
      'If symptoms persist beyond 7-10 days, schedule a medical appointment',
      'If pain worsens or new symptoms develop, seek medical attention promptly',
      'Consider a bone density scan if you have risk factors for osteoporosis',
      'Follow up with your primary care physician for ongoing care',
    ],
    warningSigns: [
      'Pain that significantly worsens over time rather than improving',
      'New swelling, bruising, or deformity that develops after the X-ray',
      'Persistent pain lasting more than two weeks',
      'Difficulty bearing weight or using the affected limb',
      'Signs of infection: fever, redness, warmth at the injury site',
      'Any new or concerning symptoms should prompt a medical visit',
    ],
  },
};

export function getTreatmentPlan(predictedClass: string): TreatmentInfo {
  return treatmentData[predictedClass] || treatmentData['Non-Fracture'];
}
