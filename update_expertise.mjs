import fs from 'fs';
import path from 'path';

const newExpertiseList = `  "Exam Strategy & Study Plan",
  "Interview Prep",
  "Career Counselling",
  "Mock Tests & Practice",
  "Motivation & Mindset Coaching",
  "College/Institute Selection",
  "Doubt Solving / Subject Help",
  "Time Management"`;

// Update FindMentor.tsx
const findMentorFile = path.join(process.cwd(), 'src/pages/FindMentor.tsx');
let findMentorContent = fs.readFileSync(findMentorFile, 'utf-8');
findMentorContent = findMentorContent.replace(
  /const EXPERTISE_OPTIONS = \[\s*"College Selection",\s*"JEE\/NEET Guidance",\s*"DSA & Coding",\s*"Placement Prep",\s*"Interview Prep",\s*"Career Guidance",\s*"Branch Selection"\s*\];/,
  `const EXPERTISE_OPTIONS = [\n${newExpertiseList}\n];`
);
fs.writeFileSync(findMentorFile, findMentorContent, 'utf-8');
console.log('Updated FindMentor.tsx expertise list');

// Update BecomeMentor.tsx
const becomeMentorFile = path.join(process.cwd(), 'src/pages/BecomeMentor.tsx');
let becomeMentorContent = fs.readFileSync(becomeMentorFile, 'utf-8');
becomeMentorContent = becomeMentorContent.replace(
  /const AREAS_OF_EXPERTISE = \[\s*"College Selection",\s*"JEE\/NEET Guidance",\s*"DSA & Coding",\s*"Placement Prep",\s*"Interview Prep",\s*"Career Guidance",\s*"Branch Selection"\s*\];/,
  `const AREAS_OF_EXPERTISE = [\n${newExpertiseList}\n];`
);
fs.writeFileSync(becomeMentorFile, becomeMentorContent, 'utf-8');
console.log('Updated BecomeMentor.tsx expertise list');
