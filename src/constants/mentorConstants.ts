export const AREAS_OF_EXPERTISE = [
  "Career Counselling & Roadmap",
  "Resume Review",
  "Interview Preparation",
  "Mock Tests & Practice",
  "Exam Strategy & Study Plan",
  "Exam Pattern & Syllabus Guidance",
  "PYQs & Mock Tests",
  "Subject-wise Guidance",
  "Doubt Solving & Concept Clarification",
  "Doubt Solving / Subject Help",
  "Revision Strategy",
  "Time Management",
  "Preparation from Scratch",
  "Backlog Management",
  "Speed & Accuracy Improvement",
  "Mock Test Analysis",
  "PYQ Analysis & Pattern Identification",
  "Study Resources & Material Selection",
  "Self-Study Strategy",
  "Consistency & Study Routine",
  "Weak Subject Improvement",
  "Rank Improvement Strategy",
  "Last-Minute Preparation",
  "Drop Year Guidance",
  "Exam-Day Strategy",
  "Managing with Boards",
  "College & Branch Selection",
  "Motivation & Mindset Coaching",
  "Leadership",
  "Communication Skills",
  "Entrepreneurship",
  "Coding",
  "AI/ML",
  "Research Guidance",
  "Other"
] as const;

export const PRESET_EXPERTISE_OPTIONS = AREAS_OF_EXPERTISE.filter(
  (item) => item !== "Other"
);

export const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali"
] as const;
