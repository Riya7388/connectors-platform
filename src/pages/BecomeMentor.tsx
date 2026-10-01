import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  DollarSign, HelpingHand, User, Mail, Phone, Search,
  CheckCircle, MapPin, Calendar, Link, ShieldCheck, IndianRupee, Smartphone,
  Trophy, Plus, Trash2, Target, RotateCcw, X, Sparkles, Check, ChevronDown
} from "lucide-react";
import { FileUpload } from "../components/FileUpload";
import { supabase } from "../supabase";
import { AREAS_OF_EXPERTISE, LANGUAGES } from "../constants/mentorConstants";
import { FREE_MODE } from "../lib/config";

const DRAFT_STORAGE_KEY = "becomeMentor_draft";

// For Firebase OTP
import { auth } from "../lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}



// --- Schema Definition ---
const mentorSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  // File upload URLs are optional in schema — uploads are verified by admins post-submission
  profilePhotoUrl: z.string().url().optional().or(z.literal("")),
  dob: z.string().refine((val) => {
    if (!val) return false;
    const age = (new Date().getTime() - new Date(val).getTime()) / 31557600000;
    return age >= 16;
  }, "Must be at least 16 years old"),
  gender: z.string().optional(),
  phone: z.string().min(10, "Valid phone number is required"),
  personalEmail: z.string().email("Invalid email format"),
  city: z.string().min(2, "City is required"),
  whatsapp: z.string().optional(),
  
  examCategory: z.string().min(1, "Exam category is required"),
  currentOrganization: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  college: z.string().optional(),
  branch: z.string().optional(),
  degreeType: z.string().optional(),
  admissionYear: z.string().optional(),
  gradYear: z.string().optional(),
  currentSemester: z.string().optional(),
  caStage: z.string().optional(),
  upscStage: z.string().optional(),
  upscOptionalSubject: z.string().optional(),
  targetAttemptYear: z.string().optional(),
  institutionOther: z.string().optional(),
  courseType: z.string().optional(),
  targetExam: z.string().optional(),
  targetCollege: z.string().optional(),
  otherExam: z.string().optional(),
  currentPrepStage: z.string().optional(),
  examBranch: z.string().optional(),
  examBranchOther: z.string().optional(),
  
  // File upload URLs — optional in schema, verified by admin after submission
  govtIdUrl: z.string().url().optional().or(z.literal("")),
  studentIdFrontUrl: z.string().url().optional().or(z.literal("")),
  studentIdBackUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().regex(/^https:\/\/(www\.)?linkedin\.com\/in\/.*$/, "Must be a valid LinkedIn profile URL"),
  
  languages: z.array(z.string()).min(1, "Select at least one language"),
  areasOfExpertise: z.array(z.string()).min(1, "Select at least one area of expertise"),
  expertiseOther: z.string().optional(),
  sessionDurations: z.array(z.string()).min(1, "Select at least one session duration"),
  prices: z.record(z.string(), z.string()).optional(),
  freeIntro: z.boolean().default(false),
  
  payoutMethod: z.enum(["bank", "upi"]).optional().default("upi"),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolder: z.string().optional(),
  upiId: z.string().optional(),
  availabilityTime: z.string().optional(),
  customAvailability: z.string().optional(),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000, "Bio must be under 1000 characters")
}).superRefine((data, ctx) => {
  // Exam Category Conditional Validation
  if (PROFESSIONAL_CATEGORIES.includes(data.examCategory)) {
    if (!data.currentOrganization) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["currentOrganization"] });
    if (!data.yearsOfExperience) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["yearsOfExperience"] });
  } else if (data.examCategory === "JEE") {
    if (!data.college) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["college"] });
    if (!data.branch) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["branch"] });
    if (!data.degreeType) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["degreeType"] });
    if (!data.admissionYear) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["admissionYear"] });
    if (!data.gradYear) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["gradYear"] });
  } else if (data.examCategory === "NEET") {
    if (!data.college) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["college"] });
    if (data.college === "Other" && !data.institutionOther) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["institutionOther"] });
    if (!data.courseType) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["courseType"] });
    if (!data.gradYear) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["gradYear"] });
  } else if (data.examCategory === "CA") {
    if (!data.caStage) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["caStage"] });
  } else if (data.examCategory === "CAT" || data.examCategory === "CLAT") {
    if (!data.college) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["college"] });
    if (data.college === "Other" && !data.institutionOther) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["institutionOther"] });
  } else if (data.examCategory === "UPSC") {
    if (!data.upscStage) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["upscStage"] });
  } else if (data.examCategory === "Banking" || data.examCategory === "Defense") {
    if (!data.targetExam) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["targetExam"] });
  } else if (data.examCategory === "CUET") {
    if (!data.targetCollege) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["targetCollege"] });
  } else if (data.examCategory === "Other") {
    if (!data.otherExam) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["otherExam"] });
  }

  if (!FREE_MODE) {
    if (data.payoutMethod === "bank") {
      if (!data.bankAccount) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["bankAccount"] });
      if (!data.ifscCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["ifscCode"] });
      if (!data.accountHolder) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["accountHolder"] });
    } else if (data.payoutMethod === "upi") {
      if (!data.upiId || !data.upiId.includes('@')) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid UPI ID required (must contain @)", path: ["upiId"] });
    }
  }
  
  const currentYear = new Date().getFullYear();
  if (data.gradYear && parseInt(data.gradYear) >= currentYear && !data.currentSemester) {
    if (data.examCategory === "JEE") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current semester required", path: ["currentSemester"] });
    }
  }

  // Pricing Validation
  if (!data.sessionDurations || data.sessionDurations.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one session duration", path: ["sessionDurations"] });
  } else if (!FREE_MODE) {
    data.sessionDurations.forEach(duration => {
      if (!data.prices || !data.prices[duration] || isNaN(parseFloat(data.prices[duration]))) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Required`, path: ["prices", duration] });
      }
    });
  }
});

type MentorFormValues = z.infer<typeof mentorSchema>;

const DURATIONS = FREE_MODE ? ["15 min", "30 min"] : ["15 min", "30 min", "60 min"];
const DEGREE_TYPES = ["B.Tech", "M.Tech", "BSc", "BCA", "MCA", "Other"];
const PROFESSIONAL_CATEGORIES = [
  "Freelancing",
  "Web Development",
  "Digital Marketing",
  "DSA (Data Structures & Algorithms)",
  "Content Creation",
  "Entrepreneurship",
  "Startup Building",
  "Software Development",
  "Career Development",
  "Career Switching",
  "Job Search"
];
const EXPERIENCE_OPTIONS = [
  "0-1 years",
  "1-3 years",
  "3-5 years",
  "5-10 years",
  "10+ years"
];
const EXAM_CATEGORIES = [
  "JEE", "NEET", "CA", "CAT", "UPSC", "CLAT", "Banking", "Defense", "CUET",
  "Freelancing", "Web Development", "Digital Marketing", "DSA (Data Structures & Algorithms)",
  "Content Creation", "Entrepreneurship", "Startup Building", "Software Development",
  "Career Development", "Career Switching", "Job Search", "Other"
];
const CA_STAGES = ["Foundation", "Intermediate", "Articleship", "CA Finalist", "CA Qualified"];
const UPSC_STAGES = ["Prelims", "Mains", "Interview", "Qualified"];
const NEET_COURSES = ["MBBS", "BDS", "BAMS", "BHMS", "Other"];
const BANKING_EXAMS = ["SBI PO", "SBI Clerk", "IBPS PO", "IBPS Clerk", "RBI Grade B", "Other"];
const DEFENSE_EXAMS = ["NDA", "CDS", "AFCAT", "Other"];
const PREP_STAGES = ["Just Starting", "1+ Year Experience", "Repeater", "Qualified & Working", "Not Applicable"];

export const BecomeMentor: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Dynamic branches from DB
  const [dbBranches, setDbBranches] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);
  const [dbInstitutions, setDbInstitutions] = useState<{name: string, exam_category: string}[]>([]);
  const [dbExamBranches, setDbExamBranches] = useState<{name: string, exam_category: string}[]>([]);
  const [examBranchSearch, setExamBranchSearch] = useState("");
  const [examBranchDropdownOpen, setExamBranchDropdownOpen] = useState(false);
  
  // Searchable Multi-Select for Areas of Expertise
  const [expertiseSearch, setExpertiseSearch] = useState("");
  const [expertiseDropdownOpen, setExpertiseDropdownOpen] = useState(false);
  const expertiseDropdownRef = React.useRef<HTMLDivElement>(null);

  // Achievement Proofs State (Multiple Uploads)
  const [achievementProofs, setAchievementProofs] = useState<string[]>([""]);

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [timer, setTimer] = useState(0);

  // Achievements State (Max 5, 30 words each)
  const [achievements, setAchievements] = useState<string[]>([]);

  // Goals & Targets State (Max 3, 30 words each)
  const [goals, setGoals] = useState<string[]>([]);

  const getWordCount = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  };

  const handleAddAchievement = () => {
    if (achievements.length < 5) {
      setAchievements([...achievements, ""]);
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setAchievements(achievements.filter((_, i) => i !== index));
  };

  const handleAchievementChange = (index: number, val: string) => {
    const updated = [...achievements];
    updated[index] = val;
    setAchievements(updated);
  };

  const handleAddGoal = () => {
    if (goals.length < 3) {
      setGoals([...goals, ""]);
    }
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleGoalChange = (index: number, val: string) => {
    const updated = [...goals];
    updated[index] = val;
    setGoals(updated);
  };

  const { register, handleSubmit, control, watch, setValue, reset, trigger, formState: { errors, isValid, isSubmitted } } = useForm<MentorFormValues>({
    resolver: zodResolver(mentorSchema) as any,
    mode: "all",
    defaultValues: {
      fullName: "",
      profilePhotoUrl: "",
      dob: "",
      gender: "",
      phone: "",
      personalEmail: "",
      city: "",
      whatsapp: "",
      examCategory: "",
      currentOrganization: "",
      yearsOfExperience: "",
      college: "",
      branch: "",
      degreeType: "",
      admissionYear: "",
      gradYear: "",
      currentSemester: "",
      caStage: "",
      upscStage: "",
      upscOptionalSubject: "",
      targetAttemptYear: "",
      institutionOther: "",
      courseType: "",
      targetExam: "",
      targetCollege: "",
      otherExam: "",
      currentPrepStage: "",
      examBranch: "",
      examBranchOther: "",
      govtIdUrl: "",
      studentIdFrontUrl: "",
      studentIdBackUrl: "",
      linkedinUrl: "",
      languages: [],
      areasOfExpertise: [],
      expertiseOther: "",
      sessionDurations: FREE_MODE ? ["15 min", "30 min"] : [],
      payoutMethod: "upi",
      freeIntro: true,
      prices: {},
      bankAccount: "",
      ifscCode: "",
      accountHolder: "",
      upiId: "",
      bio: "",
      availabilityTime: "",
      customAvailability: ""
    }
  });

  const [draftRestored, setDraftRestored] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore saved profile from database OR saved draft on mount
  useEffect(() => {
    const loadProfileOrDraft = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        let dbLoaded = false;
        if (user) {
          const { data: mentorDb, error: mentorDbError } = await supabase
            .from('mentors')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (mentorDb && !mentorDbError) {
            dbLoaded = true;

            // Parse areas of expertise
            let parsedExpertise: string[] = [];
            if (Array.isArray(mentorDb.areas_of_expertise)) {
              parsedExpertise = mentorDb.areas_of_expertise;
            } else if (typeof mentorDb.areas_of_expertise === 'string') {
              try {
                parsedExpertise = JSON.parse(mentorDb.areas_of_expertise);
              } catch {
                parsedExpertise = [mentorDb.areas_of_expertise];
              }
            }

            // Parse achievement proofs from govt_id_url
            if (mentorDb.govt_id_url) {
              const proofs = mentorDb.govt_id_url.includes(',')
                ? mentorDb.govt_id_url.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [mentorDb.govt_id_url];
              setAchievementProofs(proofs.length > 0 ? proofs : [""]);
            }

            if (Array.isArray(mentorDb.achievements)) {
              setAchievements(mentorDb.achievements);
            }
            if (Array.isArray(mentorDb.goals)) {
              setGoals(mentorDb.goals);
            }
            if (mentorDb.phone_number) {
              setPhoneVerified(true);
            }

            reset({
              fullName: mentorDb.full_name || "",
              profilePhotoUrl: mentorDb.profile_photo_url || "",
              dob: mentorDb.date_of_birth || "",
              gender: mentorDb.gender || "",
              phone: mentorDb.phone_number || "",
              personalEmail: mentorDb.personal_email || "",
              city: mentorDb.city || "",
              whatsapp: mentorDb.whatsapp_number || "",
              examCategory: mentorDb.exam_category || "",
              currentOrganization: mentorDb.current_organization || "",
              yearsOfExperience: mentorDb.years_of_experience || "",
              college: mentorDb.college_name || "",
              branch: mentorDb.branch || "",
              degreeType: mentorDb.degree_type || "",
              admissionYear: mentorDb.year_of_admission ? String(mentorDb.year_of_admission) : "",
              gradYear: mentorDb.graduation_year ? String(mentorDb.graduation_year) : "",
              currentSemester: mentorDb.current_semester || "",
              caStage: mentorDb.ca_stage || "",
              upscStage: mentorDb.upsc_stage || "",
              upscOptionalSubject: mentorDb.upsc_optional_subject || "",
              targetAttemptYear: mentorDb.target_attempt_year ? String(mentorDb.target_attempt_year) : "",
              institutionOther: mentorDb.institution_other || "",
              courseType: mentorDb.course_type || "",
              targetExam: mentorDb.target_exam || "",
              targetCollege: mentorDb.target_college || "",
              otherExam: mentorDb.other_exam || "",
              currentPrepStage: mentorDb.current_prep_stage || "",
              examBranch: mentorDb.exam_branch || "",
              examBranchOther: mentorDb.exam_branch_other || "",
              govtIdUrl: mentorDb.govt_id_url || "",
              studentIdFrontUrl: mentorDb.student_id_front_url || "",
              studentIdBackUrl: mentorDb.student_id_back_url || "",
              linkedinUrl: mentorDb.linkedin_url || "",
              languages: Array.isArray(mentorDb.languages_known) ? mentorDb.languages_known : [],
              areasOfExpertise: parsedExpertise,
              expertiseOther: mentorDb.expertise_other || "",
              sessionDurations: Array.isArray(mentorDb.session_durations)
                ? (FREE_MODE ? mentorDb.session_durations.filter((d: string) => d === "15 min" || d === "30 min") : mentorDb.session_durations)
                : (FREE_MODE ? ["15 min", "30 min"] : []),
              prices: FREE_MODE ? {} : (mentorDb.pricing || {}),
              freeIntro: FREE_MODE ? true : (mentorDb.free_intro_session ?? true),
              payoutMethod: mentorDb.payout_type || "upi",
              bankAccount: FREE_MODE ? "" : (mentorDb.bank_account_number || ""),
              ifscCode: FREE_MODE ? "" : (mentorDb.bank_ifsc || ""),
              accountHolder: FREE_MODE ? "" : (mentorDb.bank_account_holder || ""),
              upiId: FREE_MODE ? "" : (mentorDb.upi_id || ""),
              bio: mentorDb.bio || "",
              availabilityTime: mentorDb.availability_time || "",
              customAvailability: mentorDb.availability_time || ""
            });
          }
        }

        if (!dbLoaded) {
          const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (rawDraft) {
            const draft = JSON.parse(rawDraft);
            if (draft && typeof draft === "object") {
              // Explicitly omit file upload URLs from restoration
              const {
                profilePhotoUrl: _p,
                govtIdUrl: _g,
                studentIdFrontUrl: _sf,
                studentIdBackUrl: _sb,
                achievements: savedAchievements,
                goals: savedGoals,
                lastSaved: _ls,
                ...restFields
              } = draft;

              if (FREE_MODE) {
                delete (restFields as any).prices;
                delete (restFields as any).bankAccount;
                delete (restFields as any).ifscCode;
                delete (restFields as any).accountHolder;
                delete (restFields as any).upiId;
                if (Array.isArray(restFields.sessionDurations)) {
                  restFields.sessionDurations = restFields.sessionDurations.filter((d: string) => d === "15 min" || d === "30 min");
                }
              }

              // Check if there is actual saved content
              const hasSavedData = Object.entries(restFields).some(([k, v]) => {
                if (k === 'freeIntro' || k === 'payoutMethod') return false;
                if (Array.isArray(v)) return v.length > 0;
                if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0;
                return typeof v === 'string' && v.trim().length > 0;
              }) || (Array.isArray(savedAchievements) && savedAchievements.length > 0) || (Array.isArray(savedGoals) && savedGoals.length > 0);

              if (hasSavedData) {
                reset({
                  ...restFields,
                  sessionDurations: Array.isArray(restFields.sessionDurations) && restFields.sessionDurations.length > 0
                    ? restFields.sessionDurations
                    : (FREE_MODE ? ["15 min", "30 min"] : []),
                  freeIntro: FREE_MODE ? true : ((restFields as any).freeIntro ?? true),
                  profilePhotoUrl: "",
                  govtIdUrl: "",
                  studentIdFrontUrl: "",
                  studentIdBackUrl: ""
                });

                if (Array.isArray(savedAchievements)) {
                  setAchievements(savedAchievements);
                }
                if (Array.isArray(savedGoals)) {
                  setGoals(savedGoals);
                }

                setDraftRestored(true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading profile or restoring draft:", err);
      } finally {
        setIsInitialized(true);
      }
    };

    loadProfileOrDraft();
  }, [reset]);

  // Debounced auto-save draft to localStorage (excluding file uploads)
  const allFormValues = watch();

  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      const draftData = {
        fullName: allFormValues.fullName || "",
        dob: allFormValues.dob || "",
        gender: allFormValues.gender || "",
        phone: allFormValues.phone || "",
        personalEmail: allFormValues.personalEmail || "",
        city: allFormValues.city || "",
        whatsapp: allFormValues.whatsapp || "",
        examCategory: allFormValues.examCategory || "",
        currentOrganization: allFormValues.currentOrganization || "",
        yearsOfExperience: allFormValues.yearsOfExperience || "",
        college: allFormValues.college || "",
        branch: allFormValues.branch || "",
        degreeType: allFormValues.degreeType || "",
        admissionYear: allFormValues.admissionYear || "",
        gradYear: allFormValues.gradYear || "",
        currentSemester: allFormValues.currentSemester || "",
        caStage: allFormValues.caStage || "",
        upscStage: allFormValues.upscStage || "",
        upscOptionalSubject: allFormValues.upscOptionalSubject || "",
        targetAttemptYear: allFormValues.targetAttemptYear || "",
        institutionOther: allFormValues.institutionOther || "",
        courseType: allFormValues.courseType || "",
        targetExam: allFormValues.targetExam || "",
        targetCollege: allFormValues.targetCollege || "",
        otherExam: allFormValues.otherExam || "",
        currentPrepStage: allFormValues.currentPrepStage || "",
        examBranch: allFormValues.examBranch || "",
        examBranchOther: allFormValues.examBranchOther || "",
        linkedinUrl: allFormValues.linkedinUrl || "",
        languages: allFormValues.languages || [],
        areasOfExpertise: allFormValues.areasOfExpertise || [],
        expertiseOther: allFormValues.expertiseOther || "",
        sessionDurations: FREE_MODE
          ? (allFormValues.sessionDurations || []).filter((d: string) => d === "15 min" || d === "30 min")
          : (allFormValues.sessionDurations || []),
        prices: FREE_MODE ? {} : (allFormValues.prices || {}),
        freeIntro: FREE_MODE ? true : (allFormValues.freeIntro ?? true),
        payoutMethod: FREE_MODE ? "upi" : (allFormValues.payoutMethod || "upi"),
        bankAccount: FREE_MODE ? "" : (allFormValues.bankAccount || ""),
        ifscCode: FREE_MODE ? "" : (allFormValues.ifscCode || ""),
        accountHolder: FREE_MODE ? "" : (allFormValues.accountHolder || ""),
        upiId: FREE_MODE ? "" : (allFormValues.upiId || ""),
        availabilityTime: allFormValues.availabilityTime || "",
        customAvailability: allFormValues.customAvailability || "",
        bio: allFormValues.bio || "",
        achievements,
        goals,
        lastSaved: new Date().toISOString()
      };

      const hasContent = Object.entries(draftData).some(([k, v]) => {
        if (k === 'freeIntro' || k === 'payoutMethod' || k === 'lastSaved') return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === 'object' && v !== null) return Object.keys(v).length > 0;
        return typeof v === 'string' && v.trim().length > 0;
      });

      if (hasContent) {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        } catch (e) {
          console.warn("Failed to auto-save draft to localStorage:", e);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [allFormValues, achievements, goals, isInitialized]);

  const handleClearDraft = () => {
    if (window.confirm("Are you sure you want to clear your saved draft and start over?")) {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {
        console.warn("Failed to remove draft from localStorage:", e);
      }

      reset({
        fullName: "",
        profilePhotoUrl: "",
        dob: "",
        gender: "",
        phone: "",
        personalEmail: "",
        city: "",
        whatsapp: "",
        examCategory: "",
        currentOrganization: "",
        yearsOfExperience: "",
        college: "",
        branch: "",
        degreeType: "",
        admissionYear: "",
        gradYear: "",
        currentSemester: "",
        caStage: "",
        upscStage: "",
        upscOptionalSubject: "",
        targetAttemptYear: "",
        institutionOther: "",
        courseType: "",
        targetExam: "",
        targetCollege: "",
        otherExam: "",
        currentPrepStage: "",
        examBranch: "",
        examBranchOther: "",
        govtIdUrl: "",
        studentIdFrontUrl: "",
        studentIdBackUrl: "",
        linkedinUrl: "",
        languages: [],
        areasOfExpertise: [],
        expertiseOther: "",
        sessionDurations: FREE_MODE ? ["15 min", "30 min"] : [],
        prices: {},
        freeIntro: true,
        payoutMethod: "upi",
        bankAccount: "",
        ifscCode: "",
        accountHolder: "",
        upiId: "",
        availabilityTime: "",
        customAvailability: "",
        bio: ""
      });

      setAchievements([]);
      setGoals([]);
      setAchievementProofs([""]);
      setPhoneVerified(false);
      setOtpSent(false);
      setOtpInput("");
      setDraftRestored(false);
    }
  };

  const handleAddAchievementProof = () => {
    setAchievementProofs(prev => [...prev, ""]);
  };

  const handleRemoveAchievementProof = (index: number) => {
    setAchievementProofs(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  };

  const handleAchievementProofSuccess = (index: number, url: string) => {
    setAchievementProofs(prev => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
    if (index === 0) {
      setValue("govtIdUrl", url);
    }
  };

  const toggleExpertise = (topic: string) => {
    const current = watchAreasOfExpertise || [];
    const updated = current.includes(topic)
      ? current.filter(t => t !== topic)
      : [...current, topic];
    setValue("areasOfExpertise", updated, { shouldValidate: true });
    trigger("areasOfExpertise");
  };

  const watchExamCategory = watch("examCategory");
  const watchCollege = watch("college");
  const watchGradYear = watch("gradYear");
  const watchExamBranch = watch("examBranch");
  const watchPhone = watch("phone");
  const watchPayoutMethod = watch("payoutMethod");
  const watchSessionDurations = watch("sessionDurations") || [];
  const watchAreasOfExpertise = watch("areasOfExpertise") || [];

  const watchBio = watch("bio") || "";
  const watchAvailabilityTime = watch("availabilityTime");

  // Close expertise dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expertiseDropdownRef.current && !expertiseDropdownRef.current.contains(event.target as Node)) {
        setExpertiseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch branches from DB
  useEffect(() => {
    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('name')
        .order('name', { ascending: true });
      if (data && !error) {
        setDbBranches(data.map((b: { name: string }) => b.name));
      }
    };
    fetchBranches();

    const fetchInstitutions = async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('name, exam_category')
        .order('name', { ascending: true });
      if (data && !error) {
        setDbInstitutions(data);
      }
    };
    fetchInstitutions();

    const fetchExamBranches = async () => {
      const { data, error } = await supabase
        .from('exam_branches')
        .select('name, exam_category')
        .order('name', { ascending: true });
      if (data && !error) {
        setDbExamBranches(data);
      }
    };
    fetchExamBranches();
  }, []);

  useEffect(() => {
    if (!window.recaptchaVerifier && auth.app.options.apiKey) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      } catch (e) {
        console.warn("Firebase not configured correctly", e);
      }
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const sendOtp = async () => {
    if (!watchPhone || watchPhone.length < 10) return alert("Enter a valid phone number first.");
    if (!auth.app.options.apiKey) {
      alert("[Mock Mode] Firebase keys missing. OTP sent to " + watchPhone + ". Use 123456 to verify.");
      setOtpSent(true);
      setTimer(60);
      return;
    }
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, watchPhone, appVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setTimer(60);
    } catch (error) {
      console.error(error);
      alert("Failed to send OTP. Check console.");
    }
  };

  const verifyOtp = async () => {
    if (!auth.app.options.apiKey) {
      if (otpInput === "123456") {
        setPhoneVerified(true);
        setOtpSent(false);
      } else {
        alert("Invalid mock OTP.");
      }
      return;
    }
    try {
      await confirmationResult.confirm(otpInput);
      setPhoneVerified(true);
      setOtpSent(false);
    } catch (error) {
      alert("Invalid OTP");
    }
  };

  const onSubmit = async (data: MentorFormValues) => {
    if (!phoneVerified) {
      setPhoneWarning(true);
      return;
    }
    setPhoneWarning(false);
    
    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        alert("Authentication error: You must be logged in to submit an application.");
        setIsSubmitting(false);
        return;
      }

      // Check if this user already has a mentor record
      const { data: existingMentor } = await supabase
        .from('mentors')
        .select('id, application_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const mentorPayload = {
        user_id: user.id,
        full_name: data.fullName,
        profile_photo_url: data.profilePhotoUrl,
        date_of_birth: data.dob,
        gender: data.gender,
        phone_number: data.phone,
        personal_email: data.personalEmail,
        city: data.city,
        whatsapp_number: data.whatsapp,
        exam_category: data.examCategory,
        current_organization: data.currentOrganization || null,
        years_of_experience: data.yearsOfExperience || null,
        ca_stage: data.caStage,
        upsc_stage: data.upscStage,
        upsc_optional_subject: data.upscOptionalSubject,
        target_attempt_year: data.targetAttemptYear ? parseInt(data.targetAttemptYear) : null,
        institution_other: data.institutionOther,
        current_prep_stage: data.currentPrepStage,
        exam_branch: data.examBranch || "",
        exam_branch_other: data.examBranchOther || "",
        course_type: data.courseType,
        target_exam: data.targetExam,
        target_college: data.targetCollege,
        other_exam: data.otherExam,
        college_name: data.college || "",
        branch: data.branch || "",
        degree_type: data.degreeType || "",
        year_of_admission: data.admissionYear ? parseInt(data.admissionYear) : null,
        graduation_year: data.gradYear ? parseInt(data.gradYear) : null,
        current_semester: data.currentSemester || "",
        govt_id_url: proofUrlString,
        student_id_front_url: data.studentIdFrontUrl,
        student_id_back_url: data.studentIdBackUrl,
        linkedin_url: data.linkedinUrl,
        areas_of_expertise: cleanedExpertise.length > 0 ? cleanedExpertise : null,
        expertise_other: customExpertise || null,
        languages_known: data.languages,
        session_durations: FREE_MODE
          ? (data.sessionDurations || []).filter((d: string) => d === "15 min" || d === "30 min")
          : data.sessionDurations,
        pricing: FREE_MODE ? {} : (data.prices || {}),
        free_intro_session: FREE_MODE ? true : data.freeIntro,
        payout_type: FREE_MODE ? null : data.payoutMethod,
        bank_account_number: FREE_MODE ? null : (data.bankAccount || null),
        bank_ifsc: FREE_MODE ? null : (data.ifscCode || null),
        bank_account_holder: FREE_MODE ? null : (data.accountHolder || null),
        upi_id: FREE_MODE ? null : (data.upiId || null),
        bio: data.bio,
        availability_time: data.availabilityTime === 'Custom' ? (data.customAvailability || 'Custom') : (data.availabilityTime || null),
        achievements: cleanedAchievements.length > 0 ? cleanedAchievements : null,
        goals: cleanedGoals.length > 0 ? cleanedGoals : null,
        application_status: existingMentor?.application_status || 'pending'
      };

      let saveError;
      if (existingMentor) {
        const { error } = await supabase
          .from('mentors')
          .update(mentorPayload)
          .eq('id', existingMentor.id);
        saveError = error;
      } else {
        const { error } = await supabase
          .from('mentors')
          .insert([mentorPayload]);
        saveError = error;
      }

      if (saveError) {
        console.error("Failed to submit/update application:", saveError);
        alert("Something went wrong saving your application — please try again.");
        return;
      }
      
      // Clear draft from localStorage on successful application submission
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to remove draft on submission:", err);
      }

      setFormSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("An error occurred. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen py-16">
      <div id="recaptcha-container"></div>
      
      {/* Background Orbs */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Asymmetric Left side props */}
          <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-32 hidden lg:block">
            <div className="space-y-4">
              <span className="text-secondary-fixed-dim font-bold text-xs uppercase tracking-widest">Empower Future Engineers</span>
              <h1 className="font-extrabold text-4xl leading-tight">
                {FREE_MODE ? (
                  <>Share your <span className="text-primary">Wisdom.</span> Guide Students.</>
                ) : (
                  <>Share your <span className="text-primary">Wisdom.</span> Get Paid.</>
                )}
              </h1>
              <p className="text-on-surface-variant text-base leading-relaxed max-w-sm">
                Join the elite network of mentors from top universities and help juniors navigate their technical journeys.
              </p>
            </div>

            <div className="space-y-4">
              {!FREE_MODE && (
                <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                  <div className="w-10 h-10 bg-secondary-container/20 rounded-full flex items-center justify-center text-secondary-fixed-dim shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Earn Money</h3>
                    <p className="text-xs text-on-surface-variant">Set your own rates and get paid.</p>
                  </div>
                </div>
              )}

              <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <HelpingHand size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Help Juniors</h3>
                  <p className="text-xs text-on-surface-variant">Guide them through career hurdles.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Onboarding Form Container */}
          <div className="lg:col-span-8">
            {formSubmitted ? (
              <div className="glass-card p-10 rounded-2xl border border-primary/20 text-center space-y-6 animate-fade-in">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                  <CheckCircle size={36} />
                </div>
                <h2 className="font-extrabold text-3xl">Application Submitted!</h2>
                <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">
                  Thank you for applying. We will review your application and contact you soon.
                </p>
                <button onClick={() => setFormSubmitted(false)} className="brand-gradient-bg px-6 py-2.5 rounded-full font-bold text-sm text-white hover:scale-105 transition-all">
                  Apply Again / Reset
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit as any)} className="glass-card p-6 md:p-10 rounded-2xl shadow-2xl relative border border-white/10 space-y-10">
                {/* Draft Restored Banner */}
                {draftRestored && (
                  <div className="bg-primary/10 border border-primary/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={16} className="text-primary shrink-0" />
                      <span className="text-on-surface font-medium text-xs sm:text-sm">
                        We restored your previous progress from your saved draft.
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="text-xs text-on-surface-variant hover:text-red-400 underline font-medium transition-colors"
                      >
                        Clear draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftRestored(false)}
                        className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg transition-colors"
                        title="Dismiss notice"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/10">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-on-surface">Apply to Mentor</h2>
                    <button
                      type="button"
                      onClick={handleClearDraft}
                      className="text-xs text-on-surface-variant hover:text-red-400 bg-surface-container-low/60 hover:bg-red-500/10 border border-outline-variant/20 px-2.5 py-1 rounded-lg transition-all font-medium flex items-center gap-1.5"
                      title="Reset all fields and clear draft"
                    >
                      <RotateCcw size={12} /> Clear draft / Start over
                    </button>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs font-bold text-primary mr-2 uppercase tracking-wider">Step 1 of 3</span>
                    <div className="w-8 h-1 bg-primary rounded-full"></div>
                    <div className="w-4 h-1 bg-outline-variant/30 rounded-full"></div>
                    <div className="w-4 h-1 bg-outline-variant/30 rounded-full"></div>
                  </div>
                </div>

                {/* --- A. Basic Details --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">A. Basic Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Full Name (Govt ID)</label>
                      <div className="relative">
                        <input {...register("fullName")} className={`w-full bg-surface-container-low/50 border ${errors.fullName ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none`} placeholder="John Doe" />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Personal Email</label>
                      <div className="relative">
                        <input type="email" {...register("personalEmail")} className={`w-full bg-surface-container-low/50 border ${errors.personalEmail ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none`} placeholder="john@example.com" />
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      {errors.personalEmail && <p className="text-xs text-red-500">{errors.personalEmail.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Phone Number</label>
                      <div className="relative flex gap-2">
                        <div className="relative flex-1">
                          <input type="tel" disabled={phoneVerified} {...register("phone")} className={`w-full bg-surface-container-low/50 border ${errors.phone ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none ${phoneVerified ? 'opacity-50' : ''}`} placeholder="+91 9876543210" />
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                        </div>
                        {!phoneVerified && !otpSent && (
                          <button type="button" onClick={sendOtp} className="px-4 py-2 bg-primary/20 text-primary rounded-xl font-bold text-sm hover:bg-primary/30 shrink-0">Verify</button>
                        )}
                        {phoneVerified && (
                          <div className="flex items-center px-3 bg-green-500/20 text-green-500 rounded-xl">
                            <CheckCircle size={20} />
                          </div>
                        )}
                      </div>
                      {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                      
                      {otpSent && !phoneVerified && (
                        <div className="flex gap-2 mt-2 animate-fade-in">
                          <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="6-digit OTP" className="bg-surface-container-low/50 border border-outline-variant/30 px-4 py-2 rounded-xl text-sm w-full outline-none" />
                          <button type="button" onClick={verifyOtp} className="px-4 py-2 brand-gradient-bg text-white rounded-xl font-bold text-sm shrink-0">Submit</button>
                          <button type="button" disabled={timer > 0} onClick={sendOtp} className="px-3 py-2 text-xs text-primary disabled:opacity-50">{timer > 0 ? `Resend in ${timer}s` : 'Resend'}</button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">WhatsApp Number</label>
                      <div className="relative">
                        <input type="tel" {...register("whatsapp")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="+91 9876543210" />
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="checkbox" id="samePhone" onChange={(e) => { if(e.target.checked) setValue("whatsapp", watchPhone); trigger("whatsapp"); }} className="rounded border-outline-variant/30" />
                        <label htmlFor="samePhone" className="text-xs text-on-surface-variant cursor-pointer">Same as phone number</label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Date of Birth</label>
                      <div className="relative">
                        <input type="date" {...register("dob")} className={`w-full bg-surface-container-low/50 border ${errors.dob ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} />
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      {errors.dob && <p className="text-xs text-red-500">{errors.dob.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Gender</label>
                      <select {...register("gender")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current City / Location</label>
                      <div className="relative">
                        <input type="text" {...register("city")} className={`w-full bg-surface-container-low/50 border ${errors.city ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="e.g. Bangalore" />
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Controller
                      control={control}
                      name="profilePhotoUrl"
                      render={({ field }) => (
                        <FileUpload
                          label="Profile Photo"
                          accept="image/jpeg, image/png, image/webp"
                          maxSizeMB={5}
                          capture="user"
                          bucket="profile-photos"
                          value={field.value}
                          error={errors.profilePhotoUrl?.message}
                          onUploadSuccess={field.onChange}
                        />
                      )}
                    />
                    <p className="text-[11px] text-on-surface-variant/70 italic">
                      Note: Uploaded files aren't saved in drafts — please re-upload if you return to a saved draft.
                    </p>
                  </div>

                  <div className="space-y-2 mt-6">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex justify-between">
                      <span>Bio / About You</span>
                      <span className={watchBio.length < 50 || watchBio.length > 1000 ? "text-red-500" : "text-primary"}>
                        {watchBio.length} / 1000
                      </span>
                    </label>
                    <textarea 
                      {...register("bio")} 
                      className={`w-full bg-surface-container-low/50 border ${errors.bio ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none min-h-[120px] custom-scrollbar`} 
                      placeholder="Tell students about yourself — your journey, what you can help with, and why they should connect with you."
                    ></textarea>
                    {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
                  </div>



                  {/* Achievements Section */}
                  <div className="space-y-3 mt-6 pt-6 border-t border-outline-variant/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                          <Trophy size={14} className="text-amber-400" />
                          Key Achievements (Optional, Max 5)
                        </label>
                        <p className="text-xs text-on-surface-variant/70 mt-0.5">
                          Highlight your top milestones, awards, ranks, or accomplishments (up to 30 words each).
                        </p>
                      </div>
                      {achievements.length < 5 && (
                        <button
                          type="button"
                          onClick={handleAddAchievement}
                          className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors shrink-0 w-fit"
                        >
                          <Plus size={14} /> Add Achievement
                        </button>
                      )}
                    </div>

                    {achievements.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {achievements.map((ach, idx) => {
                          const words = getWordCount(ach);
                          const isOverLimit = words > 30;
                          return (
                            <div key={idx} className="bg-surface-container-low/30 p-3.5 rounded-xl border border-outline-variant/20 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-on-surface">Achievement #{idx + 1}</span>
                                <div className="flex items-center gap-3">
                                  <span className={isOverLimit ? "text-red-500 font-bold" : "text-on-surface-variant/70 font-medium"}>
                                    {words} / 30 words
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAchievement(idx)}
                                    className="text-on-surface-variant/50 hover:text-red-400 p-1 rounded transition-colors"
                                    title="Remove achievement"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={ach}
                                onChange={(e) => handleAchievementChange(idx, e.target.value)}
                                className={`w-full bg-surface-container-low/60 border ${isOverLimit ? 'border-red-500' : 'border-outline-variant/30'} px-3.5 py-2.5 rounded-lg text-sm focus:border-primary focus:ring-1 outline-none`}
                                placeholder="e.g. Secured AIR 42 in JEE Advanced 2023 / Led $2M seed round"
                              />
                              {isOverLimit && (
                                <p className="text-[11px] text-red-500 font-medium">Please keep this achievement under 30 words (currently {words} words).</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* My Goals & Targets Section */}
                  <div className="space-y-3 mt-6 pt-6 border-t border-outline-variant/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-1.5">
                          <Target size={14} className="text-primary" />
                          My Goals & Targets (Optional, Max 3)
                        </label>
                        <p className="text-xs text-on-surface-variant/70 mt-0.5">
                          What are you currently working towards? Add up to 3 goals.
                        </p>
                      </div>
                      {goals.length < 3 && (
                        <button
                          type="button"
                          onClick={handleAddGoal}
                          className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors shrink-0 w-fit"
                        >
                          <Plus size={14} /> Add Goal
                        </button>
                      )}
                    </div>

                    {goals.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {goals.map((goal, idx) => {
                          const words = getWordCount(goal);
                          const isOverLimit = words > 30;
                          return (
                            <div key={idx} className="bg-surface-container-low/30 p-3.5 rounded-xl border border-outline-variant/20 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-on-surface">Goal #{idx + 1}</span>
                                <div className="flex items-center gap-3">
                                  <span className={isOverLimit ? "text-red-500 font-bold" : "text-on-surface-variant/70 font-medium"}>
                                    {words} / 30 words
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGoal(idx)}
                                    className="text-on-surface-variant/50 hover:text-red-400 p-1 rounded transition-colors"
                                    title="Remove goal"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <input
                                type="text"
                                value={goal}
                                onChange={(e) => handleGoalChange(idx, e.target.value)}
                                className={`w-full bg-surface-container-low/60 border ${isOverLimit ? 'border-red-500' : 'border-outline-variant/30'} px-3.5 py-2.5 rounded-lg text-sm focus:border-primary focus:ring-1 outline-none`}
                                placeholder="e.g. Preparing for CAT 2024 / Building an AI SaaS / Cracking Google SWE"
                              />
                              {isOverLimit && (
                                <p className="text-[11px] text-red-500 font-medium">Please keep this goal under 30 words (currently {words} words).</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* --- B. Current Role / Profession --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">B. Current Role / Profession</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. EXAM CATEGORY */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">In which field will you mentor</label>
                      <select {...register("examCategory")} className={`w-full bg-surface-container-low/50 border ${errors.examCategory ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                        <option value="">Select Category</option>
                        {EXAM_CATEGORIES.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      {errors.examCategory && <p className="text-xs text-red-500">{errors.examCategory.message}</p>}
                    </div>

                    {/* 2. CONDITIONAL FIELDS BASED ON EXAM CATEGORY */}

                    {/* === Professional Categories === */}
                    {PROFESSIONAL_CATEGORIES.includes(watchExamCategory) && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Currently Working In</label>
                          <input
                            type="text"
                            {...register("currentOrganization")}
                            className={`w-full bg-surface-container-low/50 border ${errors.currentOrganization ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}
                            placeholder="e.g. Freelance, Google, My Own Startup"
                          />
                          {errors.currentOrganization && <p className="text-xs text-red-500">{errors.currentOrganization.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Experience</label>
                          <select
                            {...register("yearsOfExperience")}
                            className={`w-full bg-surface-container-low/50 border ${errors.yearsOfExperience ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}
                          >
                            <option value="">Select Experience</option>
                            {EXPERIENCE_OPTIONS.map(exp => (
                              <option key={exp} value={exp}>{exp}</option>
                            ))}
                          </select>
                          {errors.yearsOfExperience && <p className="text-xs text-red-500">{errors.yearsOfExperience.message}</p>}
                        </div>
                      </>
                    )}
                    
                    {/* === JEE === */}
                    {watchExamCategory === "JEE" && (
                      <>
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / University</label>
                          <div className="relative">
                            <div
                              onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                              className={`w-full bg-surface-container-low/50 border ${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface`}
                            >
                              <span className={watchCollege ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watchCollege || 'Select College'}
                              </span>
                              <svg className={`w-4 h-4 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            {collegeDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                                <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                    <input
                                      type="text"
                                      value={collegeSearch}
                                      onChange={(e) => setCollegeSearch(e.target.value)}
                                      placeholder="Search colleges..."
                                      className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                  {dbInstitutions
                                    .filter(i => i.exam_category === 'JEE')
                                    .filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase()))
                                    .map(i => (
                                      <button
                                        key={i.name}
                                        type="button"
                                        onClick={() => {
                                          setValue("college", i.name);
                                          trigger("college");
                                          setCollegeDropdownOpen(false);
                                          setCollegeSearch("");
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                          watchCollege === i.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }`}
                                      >
                                        {i.name}
                                      </button>
                                    ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue("college", "Other");
                                      trigger("college");
                                      setCollegeDropdownOpen(false);
                                      setCollegeSearch("");
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                      watchCollege === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                    }`}
                                  >
                                    Other
                                  </button>
                                  {dbInstitutions.filter(i => i.exam_category === 'JEE').filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                                    <p className="px-4 py-3 text-xs text-on-surface-variant">No colleges found</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register("college")} />
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={`mt-2 w-full bg-surface-container-low/50 border ${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="Enter your college name" />
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Degree Type</label>
                          <select {...register("degreeType")} className={`w-full bg-surface-container-low/50 border ${errors.degreeType ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Degree</option>
                            {DEGREE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          {errors.degreeType && <p className="text-xs text-red-500">{errors.degreeType.message}</p>}
                        </div>

                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Branch / Major</label>
                          <div className="relative">
                            <div 
                              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                              className={`w-full bg-surface-container-low/50 border ${errors.branch ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface`}
                            >
                              <span className={watch("branch") ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watch("branch") || 'Select Branch'}
                              </span>
                              <svg className={`w-4 h-4 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            {branchDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                                <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                    <input
                                      type="text"
                                      value={branchSearch}
                                      onChange={(e) => setBranchSearch(e.target.value)}
                                      placeholder="Search branches..."
                                      className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                  {dbBranches
                                    .filter(b => b.toLowerCase().includes(branchSearch.toLowerCase()))
                                    .map(b => (
                                      <button
                                        key={b}
                                        type="button"
                                        onClick={() => {
                                          setValue("branch", b);
                                          trigger("branch");
                                          setBranchDropdownOpen(false);
                                          setBranchSearch("");
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                          watch("branch") === b ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }`}
                                      >
                                        {b}
                                      </button>
                                    ))}
                                  {dbBranches.filter(b => b.toLowerCase().includes(branchSearch.toLowerCase())).length === 0 && (
                                    <p className="px-4 py-3 text-xs text-on-surface-variant">No branches found</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register("branch")} />
                          {errors.branch && <p className="text-xs text-red-500">{errors.branch.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Admission Year</label>
                          <select {...register("admissionYear")} className={`w-full bg-surface-container-low/50 border ${errors.admissionYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Year</option>
                            {Array.from({length: 10}, (_, i) => currentYear - i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                          {errors.admissionYear && <p className="text-xs text-red-500">{errors.admissionYear.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Graduation Year</label>
                          <select {...register("gradYear")} className={`w-full bg-surface-container-low/50 border ${errors.gradYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Year</option>
                            {Array.from({length: 10}, (_, i) => currentYear - 3 + i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                          {errors.gradYear && <p className="text-xs text-red-500">{errors.gradYear.message}</p>}
                        </div>

                        {watchGradYear && parseInt(watchGradYear) >= currentYear && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current Semester</label>
                            <select {...register("currentSemester")} className={`w-full bg-surface-container-low/50 border ${errors.currentSemester ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                              <option value="">Select Semester</option>
                              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                              <option value="Graduated">Graduated</option>
                            </select>
                            {errors.currentSemester && <p className="text-xs text-red-500">{errors.currentSemester.message}</p>}
                          </div>
                        )}
                      </>
                    )}

                    {/* === NEET === */}
                    {watchExamCategory === "NEET" && (
                      <>
                        
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / Institution</label>
                          <div className="relative">
                            <div 
                              onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                              className={`w-full bg-surface-container-low/50 border ${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface`}
                            >
                              <span className={watchCollege ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watchCollege || 'Select College'}
                              </span>
                              <svg className={`w-4 h-4 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            {collegeDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                                <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                    <input
                                      type="text"
                                      value={collegeSearch}
                                      onChange={(e) => setCollegeSearch(e.target.value)}
                                      placeholder="Search colleges..."
                                      className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                  {dbInstitutions
                                    .filter(i => i.exam_category === 'NEET')
                                    .filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase()))
                                    .map(i => (
                                      <button
                                        key={i.name}
                                        type="button"
                                        onClick={() => {
                                          setValue("college", i.name);
                                          trigger("college");
                                          setCollegeDropdownOpen(false);
                                          setCollegeSearch("");
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                          watchCollege === i.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }`}
                                      >
                                        {i.name}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setValue("college", "Other");
                                        trigger("college");
                                        setCollegeDropdownOpen(false);
                                        setCollegeSearch("");
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                        watchCollege === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                      }`}
                                    >
                                      Other
                                    </button>
                                  {dbInstitutions.filter(i => i.exam_category === 'NEET').filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                                    <p className="px-4 py-3 text-xs text-on-surface-variant">No colleges found</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register("college")} />
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={`mt-2 w-full bg-surface-container-low/50 border ${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="Enter your college/institution name" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Course Type</label>
                          <select {...register("courseType")} className={`w-full bg-surface-container-low/50 border ${errors.courseType ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Course</option>
                            {NEET_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {errors.courseType && <p className="text-xs text-red-500">{errors.courseType.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Graduation Year</label>
                          <select {...register("gradYear")} className={`w-full bg-surface-container-low/50 border ${errors.gradYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Year</option>
                            {Array.from({length: 10}, (_, i) => currentYear - 3 + i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                          {errors.gradYear && <p className="text-xs text-red-500">{errors.gradYear.message}</p>}
                        </div>
                      </>
                    )}

                    {/* === CA === */}
                    {watchExamCategory === "CA" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">CA Stage</label>
                          <select {...register("caStage")} className={`w-full bg-surface-container-low/50 border ${errors.caStage ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Stage</option>
                            {CA_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.caStage && <p className="text-xs text-red-500">{errors.caStage.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    {/* === CAT & CLAT === */}
                    {(watchExamCategory === "CAT" || watchExamCategory === "CLAT") && (
                      <>
                        
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / Institution</label>
                          <div className="relative">
                            <div 
                              onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                              className={`w-full bg-surface-container-low/50 border ${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface`}
                            >
                              <span className={watchCollege ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watchCollege || 'Select College'}
                              </span>
                              <svg className={`w-4 h-4 transition-transform ${collegeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                            {collegeDropdownOpen && (
                              <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                                <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                    <input
                                      type="text"
                                      value={collegeSearch}
                                      onChange={(e) => setCollegeSearch(e.target.value)}
                                      placeholder="Search colleges..."
                                      className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                                <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                  {dbInstitutions
                                    .filter(i => i.exam_category === watchExamCategory)
                                    .filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase()))
                                    .map(i => (
                                      <button
                                        key={i.name}
                                        type="button"
                                        onClick={() => {
                                          setValue("college", i.name);
                                          trigger("college");
                                          setCollegeDropdownOpen(false);
                                          setCollegeSearch("");
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                          watchCollege === i.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }`}
                                      >
                                        {i.name}
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setValue("college", "Other");
                                        trigger("college");
                                        setCollegeDropdownOpen(false);
                                        setCollegeSearch("");
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                        watchCollege === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                      }`}
                                    >
                                      Other
                                    </button>
                                  {dbInstitutions.filter(i => i.exam_category === watchExamCategory).filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                                    <p className="px-4 py-3 text-xs text-on-surface-variant">No colleges found</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register("college")} />
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={`mt-2 w-full bg-surface-container-low/50 border ${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="Enter your college/institution name" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    {/* === UPSC === */}
                    {watchExamCategory === "UPSC" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">UPSC Stage</label>
                          <select {...register("upscStage")} className={`w-full bg-surface-container-low/50 border ${errors.upscStage ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Stage</option>
                            {UPSC_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {errors.upscStage && <p className="text-xs text-red-500">{errors.upscStage.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Optional Subject (Optional)</label>
                          <input type="text" {...register("upscOptionalSubject")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. History" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    {/* === Banking & Defense === */}
                    {(watchExamCategory === "Banking" || watchExamCategory === "Defense") && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Exam</label>
                          <select {...register("targetExam")} className={`w-full bg-surface-container-low/50 border ${errors.targetExam ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                            <option value="">Select Exam</option>
                            {(watchExamCategory === "Banking" ? BANKING_EXAMS : DEFENSE_EXAMS).map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                          {errors.targetExam && <p className="text-xs text-red-500">{errors.targetExam.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    {/* === CUET === */}
                    {watchExamCategory === "CUET" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target College/University</label>
                          <input type="text" {...register("targetCollege")} className={`w-full bg-surface-container-low/50 border ${errors.targetCollege ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="e.g. Delhi University" />
                          {errors.targetCollege && <p className="text-xs text-red-500">{errors.targetCollege.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    {/* === Other === */}
                    {watchExamCategory === "Other" && (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Which exam are you mentoring for?</label>
                          <input type="text" {...register("otherExam")} className={`w-full bg-surface-container-low/50 border ${errors.otherExam ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="e.g. GRE, GMAT" />
                          {errors.otherExam && <p className="text-xs text-red-500">{errors.otherExam.message}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
                    )}

                    
                    {/* Universal Field for Branch/Specialization (Except JEE/Other/Professional Categories) */}
                    {watchExamCategory && !PROFESSIONAL_CATEGORIES.includes(watchExamCategory) && watchExamCategory !== "JEE" && watchExamCategory !== "Other" && (
                      <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-outline-variant/20">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Branch / Specialization</label>
                        <div className="relative">
                          <div 
                            onClick={() => setExamBranchDropdownOpen(!examBranchDropdownOpen)}
                            className={`w-full bg-surface-container-low/50 border ${errors.examBranch ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface`}
                          >
                            <span className={watchExamBranch && watchExamBranch !== "Other" ? 'text-on-surface' : watchExamBranch === "Other" ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                              {watchExamBranch || 'Select Branch/Specialization'}
                            </span>
                            <svg className={`w-4 h-4 transition-transform ${examBranchDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                          {examBranchDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-64 overflow-hidden">
                              <div className="sticky top-0 bg-surface-container-low p-2 border-b border-outline-variant/20">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                  <input
                                    type="text"
                                    value={examBranchSearch}
                                    onChange={(e) => setExamBranchSearch(e.target.value)}
                                    placeholder="Search branches..."
                                    className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="overflow-y-auto max-h-48 custom-scrollbar">
                                {dbExamBranches
                                  .filter(b => b.exam_category === watchExamCategory)
                                  .filter(b => b.name.toLowerCase().includes(examBranchSearch.toLowerCase()))
                                  .map(b => (
                                    <button
                                      key={b.name}
                                      type="button"
                                      onClick={() => {
                                        setValue("examBranch", b.name);
                                        trigger("examBranch");
                                        setExamBranchDropdownOpen(false);
                                        setExamBranchSearch("");
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                        watchExamBranch === b.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                      }`}
                                    >
                                      {b.name}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue("examBranch", "Other");
                                      trigger("examBranch");
                                      setExamBranchDropdownOpen(false);
                                      setExamBranchSearch("");
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors ${
                                      watchExamBranch === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                    }`}
                                  >
                                    Other
                                  </button>
                                {dbExamBranches.filter(b => b.exam_category === watchExamCategory).filter(b => b.name.toLowerCase().includes(examBranchSearch.toLowerCase())).length === 0 && (
                                  <p className="px-4 py-3 text-xs text-on-surface-variant">No branches found (Select Other)</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <input type="hidden" {...register("examBranch")} />
                        {errors.examBranch && <p className="text-xs text-red-500">{errors.examBranch.message}</p>}
                        {watchExamBranch === "Other" && (
                          <input {...register("examBranchOther")} className={`mt-2 w-full bg-surface-container-low/50 border ${errors.examBranchOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="Enter your specialization" />
                        )}
                      </div>
                    )}

                    {/* Universal Field at the end of Section B */}
                    <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-outline-variant/20">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current Preparation Stage</label>
                      <select {...register("currentPrepStage")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface">
                        <option value="">Select Stage (Optional)</option>
                        {PREP_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                  </div>
                </div>

                {/* --- C. Identity Verification --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">C. Identity Verification</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">LinkedIn Profile URL</label>
                    <div className="relative">
                      <input {...register("linkedinUrl")} className={`w-full bg-surface-container-low/50 border ${errors.linkedinUrl ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="https://linkedin.com/in/username" />
                      <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                    </div>
                    {errors.linkedinUrl && <p className="text-xs text-red-500">{errors.linkedinUrl.message}</p>}
                  </div>

                  {/* Achievement Proof Section */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        Achievement Proof
                      </label>
                      <p className="text-xs text-on-surface-variant/70 mt-0.5">
                        Upload proof of your achievements, certifications, ranks, awards, etc.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {achievementProofs.map((url, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-on-surface-variant">
                              {achievementProofs.length > 1 ? `Achievement Proof ${index + 1}` : 'Achievement Proof 1'}
                            </span>
                            {achievementProofs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveAchievementProof(index)}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                                title="Remove this achievement proof upload"
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            )}
                          </div>
                          <FileUpload
                            label=""
                            accept="application/pdf, image/jpeg, image/png, image/webp"
                            maxSizeMB={10}
                            bucket="government-ids"
                            value={url}
                            error={index === 0 ? errors.govtIdUrl?.message : undefined}
                            onUploadSuccess={(uploadedUrl) => handleAchievementProofSuccess(index, uploadedUrl)}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAchievementProof}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-2 rounded-xl transition-colors shrink-0 w-fit"
                    >
                      <Plus size={14} /> + Add another achievement
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Controller
                      control={control}
                      name="studentIdFrontUrl"
                      render={({ field }) => (
                        <FileUpload
                          label="Student ID Card (Front)"
                          helperText="Must clearly show your photo, name, and enrollment year"
                          accept="application/pdf, image/jpeg, image/png, image/webp"
                          maxSizeMB={10}
                          bucket="student-ids"
                          value={field.value}
                          error={errors.studentIdFrontUrl?.message}
                          onUploadSuccess={field.onChange}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="studentIdBackUrl"
                      render={({ field }) => (
                        <FileUpload
                          label="Student ID Card (Back)"
                          accept="application/pdf, image/jpeg, image/png, image/webp"
                          maxSizeMB={10}
                          bucket="student-ids"
                          value={field.value}
                          error={errors.studentIdBackUrl?.message}
                          onUploadSuccess={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <p className="text-[11px] text-on-surface-variant/70 italic">
                    Note: Uploaded files aren't saved in drafts — please re-upload if you return to a saved draft.
                  </p>
                </div>

                {/* --- D. Mentoring Preferences --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">D. Mentoring Preferences</h3>
                  
                  <div className="space-y-2 relative" ref={expertiseDropdownRef}>
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Areas of Expertise</label>
                    <p className="text-xs text-on-surface-variant/70 -mt-1">Select all topics you can help students with</p>
                    
                    {/* Multi-Select Trigger Box */}
                    <div
                      onClick={() => setExpertiseDropdownOpen(!expertiseDropdownOpen)}
                      className={`w-full bg-surface-container-low/50 border ${errors.areasOfExpertise ? 'border-red-500' : 'border-outline-variant/30'} p-3 rounded-xl min-h-[48px] cursor-pointer flex items-center justify-between text-on-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors`}
                    >
                      <div className="flex flex-wrap gap-1.5 items-center flex-1 mr-2">
                        {(!watchAreasOfExpertise || watchAreasOfExpertise.length === 0) ? (
                          <span className="text-xs sm:text-sm text-on-surface-variant/50">
                            Search and select areas of expertise...
                          </span>
                        ) : (
                          watchAreasOfExpertise.map((topic) => (
                            <span
                              key={topic}
                              className="inline-flex items-center gap-1 bg-primary/20 text-primary px-2.5 py-1 rounded-lg text-xs font-semibold animate-fade-in"
                            >
                              {topic}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpertise(topic);
                                }}
                                className="hover:text-red-400 p-0.5 rounded transition-colors"
                                title={`Remove ${topic}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-on-surface-variant/60 transition-transform shrink-0 ${expertiseDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </div>

                    {/* Searchable Dropdown Menu */}
                    {expertiseDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl max-h-72 overflow-hidden animate-fade-in">
                        <div className="sticky top-0 bg-surface-container-low p-2.5 border-b border-outline-variant/20 z-10">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                            <input
                              type="text"
                              value={expertiseSearch}
                              onChange={(e) => setExpertiseSearch(e.target.value)}
                              placeholder="Search expertise..."
                              className="w-full bg-surface-container-high/50 border border-outline-variant/20 pl-8 pr-3 py-2 rounded-lg text-xs focus:border-primary outline-none text-on-surface"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="overflow-y-auto max-h-56 custom-scrollbar p-1.5 space-y-0.5">
                          {AREAS_OF_EXPERTISE
                            .filter(topic => topic.toLowerCase().includes(expertiseSearch.toLowerCase()))
                            .map(topic => {
                              const isSelected = (watchAreasOfExpertise || []).includes(topic);
                              return (
                                <div
                                  key={topic}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpertise(topic);
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/15 text-primary font-semibold'
                                      : 'text-on-surface hover:bg-surface-container-high/50'
                                  }`}
                                >
                                  <span>{topic}</span>
                                  <div
                                    className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] transition-colors ${
                                      isSelected
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-outline-variant/50 bg-surface-container-low'
                                    }`}
                                  >
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                  </div>
                                </div>
                              );
                            })}
                          {AREAS_OF_EXPERTISE.filter(topic => topic.toLowerCase().includes(expertiseSearch.toLowerCase())).length === 0 && (
                            <p className="px-4 py-3 text-xs text-on-surface-variant text-center">No matching areas of expertise found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {watchAreasOfExpertise.includes("Other") && (
                      <div className="mt-2 animate-fade-in">
                        <input
                          {...register("expertiseOther")}
                          className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none"
                          placeholder="Enter your custom expertise (e.g. Public Speaking, Vedic Maths)"
                        />
                      </div>
                    )}
                    {errors.areasOfExpertise && <p className="text-xs text-red-500">{errors.areasOfExpertise.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Languages I Can Mentor In</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES.map(lang => (
                        <label key={lang} className="flex items-center cursor-pointer">
                          <input type="checkbox" value={lang} {...register("languages")} className="peer hidden" />
                          <div className="px-4 py-2 rounded-full border border-outline-variant/30 peer-checked:bg-primary/20 peer-checked:text-primary peer-checked:border-primary text-sm font-medium text-on-surface-variant transition-colors">
                            {lang}
                          </div>
                        </label>
                      ))}
                    </div>
                    {errors.languages && <p className="text-xs text-red-500">{errors.languages.message}</p>}
                  </div>

                  {FREE_MODE ? (
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Session Durations</label>
                      <div className="flex flex-wrap gap-4">
                        {DURATIONS.map(duration => (
                          <label key={duration} className="flex items-center cursor-pointer gap-2.5 bg-surface-container-low/40 px-4 py-3 rounded-xl border border-outline-variant/20 hover:border-primary/40 transition-colors">
                            <input 
                              type="checkbox" 
                              value={duration} 
                              {...register("sessionDurations")} 
                              className="rounded border-outline-variant/30 text-primary focus:ring-primary w-4 h-4" 
                            />
                            <span className="text-sm font-semibold text-on-surface">{duration}</span>
                          </label>
                        ))}
                      </div>
                      {errors.sessionDurations && <p className="text-xs text-red-500">{errors.sessionDurations.message}</p>}

                      {/* FREE Mode Info Card */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/5 border border-primary/20 flex items-start sm:items-center gap-3.5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase brand-gradient-bg text-white shadow-sm flex-shrink-0">
                          FREE
                        </span>
                        <p className="text-sm text-on-surface font-medium leading-relaxed">
                          Sessions are completely free on Connectors for now. You are helping students — that's the whole point.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Session Durations & Pricing</label>
                      <div className="space-y-3">
                        {DURATIONS.map(duration => (
                          <div key={duration} className="flex items-center gap-4 bg-surface-container-low/30 p-3 rounded-xl border border-outline-variant/10">
                            <label className="flex items-center cursor-pointer gap-2 w-32">
                              <input type="checkbox" value={duration} {...register("sessionDurations")} className="rounded border-outline-variant/30" />
                              <span className="text-sm font-semibold">{duration}</span>
                            </label>
                            
                            {watchSessionDurations.includes(duration) && (
                              <div className="flex-1 max-w-[200px]">
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    {...register(`prices.${duration}` as any)} 
                                    className={`w-full bg-surface-container-low border ${(errors.prices as any)?.[duration] ? 'border-red-500' : 'border-outline-variant/30'} px-3 py-2 pl-8 rounded-lg text-sm focus:border-primary focus:ring-1 outline-none`} 
                                    placeholder="Rate per session" 
                                  />
                                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                                </div>
                                {(errors.prices as any)?.[duration] && (
                                  <p className="text-[10px] text-red-500 mt-1">{(errors.prices as any)[duration].message}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {errors.sessionDurations && <p className="text-xs text-red-500">{errors.sessionDurations.message}</p>}
                    </div>
                  )}

                  {!FREE_MODE && (
                    <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/20">
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">Offer Free Intro Session?</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5">Your first 15-min session with each student will be free.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...register("freeIntro")} className="sr-only peer" />
                        <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">When are you usually free?</label>
                    <p className="text-xs text-on-surface-variant/70 -mt-1">Help students know the best time to reach you</p>
                    <select {...register("availabilityTime")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface">
                      <option value="">Select Availability (Optional)</option>
                      <option value="Morning (6 AM - 12 PM)">Morning (6 AM - 12 PM)</option>
                      <option value="Afternoon (12 PM - 5 PM)">Afternoon (12 PM - 5 PM)</option>
                      <option value="Evening (5 PM - 9 PM)">Evening (5 PM - 9 PM)</option>
                      <option value="Night (9 PM - 12 AM)">Night (9 PM - 12 AM)</option>
                      <option value="Weekdays Evening">Weekdays Evening</option>
                      <option value="Weekends Anytime">Weekends Anytime</option>
                      <option value="Flexible / Varies">Flexible / Varies</option>
                      <option value="Custom">Custom</option>
                    </select>
                    {watchAvailabilityTime === "Custom" && (
                      <input {...register("customAvailability")} className="mt-2 w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="Describe your schedule, e.g. Mon/Wed 7-9 PM" />
                    )}
                  </div>
                </div>

                {/* --- E. Payout Details --- */}
                {!FREE_MODE && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">E. Payout Details</h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500" /> This information is encrypted and only used for payouts.</p>
                    
                    <div className="flex gap-4">
                      <label className="flex items-center cursor-pointer gap-2">
                        <input type="radio" value="upi" {...register("payoutMethod")} className="text-primary" />
                        <span className="text-sm font-semibold">UPI ID</span>
                      </label>
                      <label className="flex items-center cursor-pointer gap-2">
                        <input type="radio" value="bank" {...register("payoutMethod")} className="text-primary" />
                        <span className="text-sm font-semibold">Bank Transfer</span>
                      </label>
                    </div>

                    {watchPayoutMethod === "upi" && (
                      <div className="space-y-2 max-w-md">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">UPI ID</label>
                        <input {...register("upiId")} className={`w-full bg-surface-container-low/50 border ${errors.upiId ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="username@upi" />
                        {errors.upiId && <p className="text-xs text-red-500">{errors.upiId.message}</p>}
                      </div>
                    )}

                    {watchPayoutMethod === "bank" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Account Holder Name</label>
                          <input {...register("accountHolder")} className={`w-full bg-surface-container-low/50 border ${errors.accountHolder ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} />
                          {errors.accountHolder && <p className="text-xs text-red-500">{errors.accountHolder.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Account Number</label>
                          <input type="password" {...register("bankAccount")} className={`w-full bg-surface-container-low/50 border ${errors.bankAccount ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} />
                          {errors.bankAccount && <p className="text-xs text-red-500">{errors.bankAccount.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">IFSC Code</label>
                          <input {...register("ifscCode")} className={`w-full bg-surface-container-low/50 border ${errors.ifscCode ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} />
                          {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode.message}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-8 border-t border-outline-variant/20 flex flex-col gap-4">
                  {/* Phone verification warning */}
                  {phoneWarning && !phoneVerified && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 font-medium">
                      ⚠️ Please verify your phone number before submitting — click "Verify" next to the phone field above.
                    </div>
                  )}

                  {/* Validation errors summary (shown after first submit attempt) */}
                  {isSubmitted && !isValid && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                      Some required fields are missing or invalid — please scroll up and check the highlighted fields.
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-on-surface-variant text-center sm:text-left">By proceeding, you agree to our verification policies.</span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto brand-gradient-bg text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                    >
                      {isSubmitting ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        "Next Step →"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
