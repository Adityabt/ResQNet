export interface Helpline {
  number: string;
  label: string;
}

export const HELPLINES: Helpline[] = [
  { number: "112", label: "Emergency (police, fire, ambulance)" },
  { number: "108", label: "Ambulance" },
  { number: "101", label: "Fire" },
  { number: "1070", label: "Disaster management control room" },
];

export interface SafetyTopic {
  title: string;
  tips: string[];
}

export const SAFETY_TOPICS: SafetyTopic[] = [
  {
    title: "Flooding",
    tips: [
      "Move to higher ground early. Do not wait for water to reach you.",
      "Never walk or drive through moving water. Six inches can knock you down.",
      "Switch off the mains power if water is entering the building.",
      "Keep phones charged and carry ID, medicines and drinking water.",
    ],
  },
  {
    title: "Fire",
    tips: [
      "Stay low under smoke. Cover your nose and mouth with a wet cloth.",
      "Feel doors before opening them. Do not use lifts.",
      "Once outside, stay out and call for help.",
    ],
  },
  {
    title: "Injuries and first aid",
    tips: [
      "Press firmly on a bleeding wound with a clean cloth. Keep pressing.",
      "Do not move someone with a possible neck or back injury unless they are in danger.",
      "If a person is not breathing, call for help and start chest compressions.",
    ],
  },
  {
    title: "While waiting for help",
    tips: [
      "Stay in your zone unless it is unsafe. Volunteers are routed to your zone.",
      "Keep your phone on and the volume up. A volunteer may call you.",
      "Signal with a bright cloth or a torch if you are in an open area.",
    ],
  },
];