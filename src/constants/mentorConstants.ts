export const AREAS_OF_EXPERTISE = [
  "Career Counselling & Roadmap",
  "Resume Review",
  "Interview Preparation",
  "Mock Tests & Practice",
  "Exam Strategy & Study Plan",
  "College & Branch Selection",
  "Doubt Solving / Subject Help",
  "Time Management",
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
