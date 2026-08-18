import fs from 'fs';
import path from 'path';

// Helper to generate the display text
const getDisplayCode = () => `
                {mentor.exam_category === 'CA' ? mentor.ca_stage :
                 mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                 (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                 mentor.exam_category === 'CUET' ? mentor.target_college :
                 mentor.exam_category === 'Other' ? mentor.other_exam :
                 mentor.branch}
`;

const getBookingDisplayCode = () => `
                {bookingMentor.exam_category === 'CA' ? bookingMentor.ca_stage :
                 bookingMentor.exam_category === 'UPSC' ? bookingMentor.upsc_stage :
                 (bookingMentor.exam_category === 'Banking' || bookingMentor.exam_category === 'Defense') ? bookingMentor.target_exam :
                 bookingMentor.exam_category === 'CUET' ? bookingMentor.target_college :
                 bookingMentor.exam_category === 'Other' ? bookingMentor.other_exam :
                 bookingMentor.branch}
`;

function updateMentorProfile() {
  const file = path.join(process.cwd(), 'src/pages/MentorProfile.tsx');
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Update interface
  content = content.replace(
    /branch: string;/,
    `branch: string;
  exam_category?: string;
  ca_stage?: string;
  upsc_stage?: string;
  target_exam?: string;
  target_college?: string;
  other_exam?: string;`
  );

  // 2. Update display
  content = content.replace(
    /<span>\{mentor\.branch\}<\/span>/,
    `<span>
                {mentor.exam_category === 'CA' ? mentor.ca_stage :
                 mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                 (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                 mentor.exam_category === 'CUET' ? mentor.target_college :
                 mentor.exam_category === 'Other' ? mentor.other_exam :
                 mentor.branch}
                </span>`
  );

  fs.writeFileSync(file, content, 'utf-8');
  console.log("Updated MentorProfile.tsx");
}

function updateFindMentor() {
  const file = path.join(process.cwd(), 'src/pages/FindMentor.tsx');
  let content = fs.readFileSync(file, 'utf-8');

  // 1. Update interface
  content = content.replace(
    /branch: string;/,
    `branch: string;
  exam_category?: string;
  ca_stage?: string;
  upsc_stage?: string;
  target_exam?: string;
  target_college?: string;
  other_exam?: string;`
  );

  // 2. Update Mentor Cards in the grid
  // In FindMentor.tsx it's usually {mentor.college_name} • {mentor.branch}
  content = content.replace(
    /\{mentor\.college_name\} • \{mentor\.branch\}/g,
    `{mentor.college_name} • {mentor.exam_category === 'CA' ? mentor.ca_stage :
                 mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                 (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                 mentor.exam_category === 'CUET' ? mentor.target_college :
                 mentor.exam_category === 'Other' ? mentor.other_exam :
                 mentor.branch}`
  );

  // 3. And also {mentor.branch} alone if present
  content = content.replace(
    /\{mentor\.branch\}/g,
    `{mentor.exam_category === 'CA' ? mentor.ca_stage :
                 mentor.exam_category === 'UPSC' ? mentor.upsc_stage :
                 (mentor.exam_category === 'Banking' || mentor.exam_category === 'Defense') ? mentor.target_exam :
                 mentor.exam_category === 'CUET' ? mentor.target_college :
                 mentor.exam_category === 'Other' ? mentor.other_exam :
                 mentor.branch}`
  );

  // 4. Update the booking modal mentor details
  content = content.replace(
    /\{bookingMentor\.college_name\} • \{bookingMentor\.branch\}/g,
    `{bookingMentor.college_name} • {bookingMentor.exam_category === 'CA' ? bookingMentor.ca_stage :
                 bookingMentor.exam_category === 'UPSC' ? bookingMentor.upsc_stage :
                 (bookingMentor.exam_category === 'Banking' || bookingMentor.exam_category === 'Defense') ? bookingMentor.target_exam :
                 bookingMentor.exam_category === 'CUET' ? bookingMentor.target_college :
                 bookingMentor.exam_category === 'Other' ? bookingMentor.other_exam :
                 bookingMentor.branch}`
  );

  fs.writeFileSync(file, content, 'utf-8');
  console.log("Updated FindMentor.tsx");
}

try {
  updateMentorProfile();
  updateFindMentor();
} catch (e) {
  console.error("Error updating files", e);
}
