export interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

export const FAQ_DATA: FAQItem[] = [
  {
    id: 1,
    question: "What is Connectors?",
    answer:
      "Connectors is a student mentorship platform that helps students connect with mentors who can provide experience-based guidance on academics, competitive exams, career decisions, college selection and other areas.",
  },
  {
    id: 2,
    question: "Is Connectors free?",
    answer:
      "Yes. Connectors is currently completely free for students and mentors. There are no charges for mentorship sessions at present.",
  },
  {
    id: 3,
    question: "Who can become a mentor?",
    answer:
      "College students and individuals with relevant experience, knowledge or achievements can apply, including current college students. Mentors are asked for details and proof of their achievements and experience during verification.",
  },
  {
    id: 4,
    question: "Are mentors verified?",
    answer:
      "Connectors reviews the information and achievement proof submitted by mentors before approving their profiles. However, users should independently evaluate the advice shared by any mentor before relying on it.",
  },
  {
    id: 5,
    question: "What if a student does not attend a scheduled session?",
    answer:
      "Students are expected to attend scheduled sessions on time. Repeated no-shows or missing sessions without reasonable notice may result in warnings, temporary restrictions or blocking of the account.",
  },
  {
    id: 6,
    question: "What if a mentor does not attend a session?",
    answer:
      "Mentors are expected to be available for confirmed sessions. If a mentor repeatedly fails to attend, appropriate action may be taken, including removal from the platform. You can also report the issue from the chat.",
  },
  {
    id: 7,
    question: "Can I report inappropriate behaviour?",
    answer:
      "Yes. You can report inappropriate, misleading, abusive or unacceptable behaviour. Connectors may review the report and take appropriate action, including restricting or blocking an account.",
  },
  {
    id: 8,
    question: "Can the AI tools make mistakes?",
    answer:
      "Yes. Mentor Genie is meant to help you explore options, but it can be incomplete or wrong. College data such as fees and placements may be estimates, so please verify it from official sources.",
  },
];
