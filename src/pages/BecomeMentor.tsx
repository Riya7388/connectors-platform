import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  DollarSign, HelpingHand, Network, User, Mail, Phone, School, 
  Award, CheckCircle, MapPin, Calendar, Building, Link, ShieldCheck, IndianRupee, Smartphone
} from "lucide-react";
import { FileUpload } from "../components/FileUpload";
import { supabase } from "../supabase";

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
  profilePhotoUrl: z.string().url("Profile photo is required"),
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
  
  college: z.string().min(2, "College name is required"),
  branch: z.string().min(2, "Branch/Major is required"),
  degreeType: z.string().min(2, "Degree type is required"),
  admissionYear: z.string().min(4, "Required"),
  gradYear: z.string().min(4, "Required"),
  currentSemester: z.string().optional(),
  
  govtIdUrl: z.string().url("Govt ID is required"),
  studentIdFrontUrl: z.string().url("Student ID Front is required"),
  studentIdBackUrl: z.string().url("Student ID Back is required"),
  linkedinUrl: z.string().regex(/^https:\/\/(www\.)?linkedin\.com\/in\/.*$/, "Must be a valid LinkedIn profile URL"),
  
  languages: z.array(z.string()).min(1, "Select at least one language"),
  sessionDurations: z.array(z.string()).min(1, "Select at least one session duration"),
  prices: z.record(z.string(), z.string()).optional(),
  freeIntro: z.boolean().default(false),
  
  payoutMethod: z.enum(["bank", "upi"]),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolder: z.string().optional(),
  upiId: z.string().optional()
}).superRefine((data, ctx) => {
  if (data.payoutMethod === "bank") {
    if (!data.bankAccount) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["bankAccount"] });
    if (!data.ifscCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["ifscCode"] });
    if (!data.accountHolder) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["accountHolder"] });
  } else if (data.payoutMethod === "upi") {
    if (!data.upiId || !data.upiId.includes('@')) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid UPI ID required", path: ["upiId"] });
  }
  
  const currentYear = new Date().getFullYear();
  if (parseInt(data.gradYear) >= currentYear && !data.currentSemester) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current semester required", path: ["currentSemester"] });
  }
});

type MentorFormValues = z.infer<typeof mentorSchema>;

const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali"];
const DURATIONS = ["15 min", "30 min", "60 min"];
const DEGREE_TYPES = ["B.Tech", "M.Tech", "BSc", "BCA", "MCA", "Other"];
const BRANCHES = ["CSE", "ECE", "Mechanical", "Civil", "EEE", "IT", "Other"];

export const BecomeMentor: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [timer, setTimer] = useState(0);

  const { register, handleSubmit, control, watch, setValue, trigger, formState: { errors, isValid } } = useForm<MentorFormValues>({
    resolver: zodResolver(mentorSchema),
    mode: "onBlur",
    defaultValues: {
      languages: [],
      sessionDurations: [],
      payoutMethod: "upi",
      freeIntro: true,
      prices: {}
    }
  });

  const watchGradYear = watch("gradYear");
  const watchPhone = watch("phone");
  const watchPayoutMethod = watch("payoutMethod");
  const watchSessionDurations = watch("sessionDurations") || [];
  const watchFreeIntro = watch("freeIntro");

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
      alert("Please verify your phone number before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (!user) {
        alert("Authentication error: You must be logged in to submit an application.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('mentors').insert([
        {
          user_id: user.id,
          full_name: data.fullName,
          profile_photo_url: data.profilePhotoUrl,
          date_of_birth: data.dob,
          gender: data.gender,
          phone_number: data.phone,
          personal_email: data.personalEmail,
          city: data.city,
          whatsapp_number: data.whatsapp,
          college_name: data.college,
          branch: data.branch,
          degree_type: data.degreeType,
          year_of_admission: parseInt(data.admissionYear),
          graduation_year: parseInt(data.gradYear),
          current_semester: data.currentSemester,
          govt_id_url: data.govtIdUrl,
          student_id_front_url: data.studentIdFrontUrl,
          student_id_back_url: data.studentIdBackUrl,
          linkedin_url: data.linkedinUrl,
          languages_known: data.languages,
          session_durations: data.sessionDurations,
          pricing: data.prices,
          free_intro_session: data.freeIntro,
          payout_type: data.payoutMethod,
          bank_account_number: data.bankAccount,
          bank_ifsc: data.ifscCode,
          bank_account_holder: data.accountHolder,
          upi_id: data.upiId,
          application_status: 'pending',
          phone_verified: phoneVerified
        }
      ]);

      if (error) {
        console.warn("DB Error (it might not exist yet):", error);
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
                Share your <span className="text-primary">Wisdom.</span> Get Paid.
              </h1>
              <p className="text-on-surface-variant text-base leading-relaxed max-w-sm">
                Join the elite network of mentors from top universities and help juniors navigate their technical journeys.
              </p>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                <div className="w-10 h-10 bg-secondary-container/20 rounded-full flex items-center justify-center text-secondary-fixed-dim shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Earn Money</h3>
                  <p className="text-xs text-on-surface-variant">Set your own rates and get paid.</p>
                </div>
              </div>

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
              <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 md:p-10 rounded-2xl shadow-2xl relative border border-white/10 space-y-10">
                <div className="flex justify-between items-center pb-4 border-b border-outline-variant/10">
                  <h2 className="text-2xl font-extrabold text-on-surface">Apply to Mentor</h2>
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
                        error={errors.profilePhotoUrl?.message}
                        onUploadSuccess={field.onChange}
                      />
                    )}
                  />
                </div>

                {/* --- B. Academic Details --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">B. Academic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / University</label>
                      <div className="relative">
                        <input {...register("college")} className={`w-full bg-surface-container-low/50 border ${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none`} placeholder="e.g. IIT Bombay" />
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                      </div>
                      {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Degree Type</label>
                      <select {...register("degreeType")} className={`w-full bg-surface-container-low/50 border ${errors.degreeType ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                        <option value="">Select Degree</option>
                        {DEGREE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {errors.degreeType && <p className="text-xs text-red-500">{errors.degreeType.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Branch / Major</label>
                      <select {...register("branch")} className={`w-full bg-surface-container-low/50 border ${errors.branch ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface`}>
                        <option value="">Select Branch</option>
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
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

                    <Controller
                      control={control}
                      name="govtIdUrl"
                      render={({ field }) => (
                        <FileUpload
                          label="Government ID Upload (Aadhaar/Passport)"
                          accept="application/pdf, image/jpeg, image/png, image/webp"
                          maxSizeMB={10}
                          bucket="government-ids"
                          error={errors.govtIdUrl?.message}
                          onUploadSuccess={field.onChange}
                        />
                      )}
                    />

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
                            error={errors.studentIdBackUrl?.message}
                            onUploadSuccess={field.onChange}
                          />
                        )}
                      />
                    </div>
                </div>

                {/* --- D. Mentoring Preferences --- */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">D. Mentoring Preferences</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Languages Known</label>
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
                            <div className="flex-1 relative max-w-[200px]">
                              <input 
                                type="number" 
                                {...register(`prices.${duration}`)} 
                                className="w-full bg-surface-container-low border border-outline-variant/30 px-3 py-2 pl-8 rounded-lg text-sm focus:border-primary focus:ring-1 outline-none" 
                                placeholder="Rate per session" 
                              />
                              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={14} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {errors.sessionDurations && <p className="text-xs text-red-500">{errors.sessionDurations.message}</p>}
                  </div>

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
                </div>

                {/* --- E. Payout Details --- */}
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

                <div className="pt-8 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-on-surface-variant text-center sm:text-left">By proceeding, you agree to our verification policies.</span>
                  <button
                    type="submit"
                    disabled={isSubmitting || !phoneVerified}
                    className="w-full sm:w-auto brand-gradient-bg text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      "Next Step"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
