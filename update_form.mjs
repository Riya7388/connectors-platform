import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/BecomeMentor.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Update Schema
content = content.replace(
  /college: z\.string\(\)\.min\(2, "College name is required"\),[\s\S]*?currentSemester: z\.string\(\)\.optional\(\),/,
  `examCategory: z.string().min(1, "Exam category is required"),
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
  currentPrepStage: z.string().optional(),`
);

content = content.replace(
  /\}\)\.superRefine\(\(data, ctx\) => \{[\s\S]*?const currentYear = new Date\(\)\.getFullYear\(\);[\s\S]*?if \(parseInt\(data\.gradYear\) >= currentYear && !data\.currentSemester\) \{[\s\S]*?ctx\.addIssue\(\{ code: z\.ZodIssueCode\.custom, message: "Current semester required", path: \["currentSemester"\] \}\);[\s\S]*?\}[\s\S]*?\/\/ Pricing Validation/,
  `}).superRefine((data, ctx) => {
  // Exam Category Conditional Validation
  if (data.examCategory === "JEE") {
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

  if (data.payoutMethod === "bank") {
    if (!data.bankAccount) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["bankAccount"] });
    if (!data.ifscCode) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["ifscCode"] });
    if (!data.accountHolder) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["accountHolder"] });
  } else if (data.payoutMethod === "upi") {
    if (!data.upiId || !data.upiId.includes('@')) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid UPI ID required (must contain @)", path: ["upiId"] });
  }
  
  const currentYear = new Date().getFullYear();
  if (data.gradYear && parseInt(data.gradYear) >= currentYear && !data.currentSemester) {
    if (data.examCategory === "JEE") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Current semester required", path: ["currentSemester"] });
    }
  }

  // Pricing Validation`
);

// 2. Add Constants
content = content.replace(
  /const DEGREE_TYPES = \["B\.Tech", "M\.Tech", "BSc", "BCA", "MCA", "Other"\];/,
  `const DEGREE_TYPES = ["B.Tech", "M.Tech", "BSc", "BCA", "MCA", "Other"];
const EXAM_CATEGORIES = ["JEE", "NEET", "CA", "CAT", "UPSC", "CLAT", "Banking", "Defense", "CUET", "Other"];
const CA_STAGES = ["Foundation", "Intermediate", "Articleship", "CA Finalist", "CA Qualified"];
const UPSC_STAGES = ["Prelims", "Mains", "Interview", "Qualified"];
const NEET_COURSES = ["MBBS", "BDS", "BAMS", "BHMS", "Other"];
const BANKING_EXAMS = ["SBI PO", "SBI Clerk", "IBPS PO", "IBPS Clerk", "RBI Grade B", "Other"];
const DEFENSE_EXAMS = ["NDA", "CDS", "AFCAT", "Other"];
const PREP_STAGES = ["Just Starting", "1+ Year Experience", "Repeater", "Not Applicable"];`
);

// 3. State & useEffect
content = content.replace(
  /const \[branchDropdownOpen, setBranchDropdownOpen\] = useState\(false\);/,
  `const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [dbInstitutions, setDbInstitutions] = useState<{name: string, exam_category: string}[]>([]);`
);

content = content.replace(
  /fetchBranches\(\);\n  \}, \[\]\);/,
  `fetchBranches();

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
  }, []);`
);

// 4. Watch variables
content = content.replace(
  /const watchGradYear = watch\("gradYear"\);/,
  `const watchExamCategory = watch("examCategory");
  const watchCollege = watch("college");
  const watchGradYear = watch("gradYear");`
);

// 5. Submit Payload
content = content.replace(
  /college_name: data\.college,[\s\S]*?govt_id_url: data\.govtIdUrl,/,
  `exam_category: data.examCategory,
          ca_stage: data.caStage,
          upsc_stage: data.upscStage,
          upsc_optional_subject: data.upscOptionalSubject,
          target_attempt_year: data.targetAttemptYear ? parseInt(data.targetAttemptYear) : null,
          institution_other: data.institutionOther,
          current_prep_stage: data.currentPrepStage,
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
          govt_id_url: data.govtIdUrl,`
);

// 6. Section B UI
const sectionBStart = `<h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">B. Academic Details</h3>`;

const newSectionB = `<h3 className="text-lg font-bold text-primary border-b border-primary/20 pb-2">B. Academic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 1. EXAM CATEGORY */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Exam Category</label>
                      <select {...register("examCategory")} className={\`w-full bg-surface-container-low/50 border \${errors.examCategory ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                        <option value="">Select Exam Category</option>
                        {EXAM_CATEGORIES.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                      {errors.examCategory && <p className="text-xs text-red-500">{errors.examCategory.message}</p>}
                    </div>

                    {/* 2. CONDITIONAL FIELDS BASED ON EXAM CATEGORY */}
                    
                    {/* === JEE === */}
                    {watchExamCategory === "JEE" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / University</label>
                          <div className="relative">
                            <input {...register("college")} className={\`w-full bg-surface-container-low/50 border \${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 pl-11 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="e.g. IIT Bombay" />
                            <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
                          </div>
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Degree Type</label>
                          <select {...register("degreeType")} className={\`w-full bg-surface-container-low/50 border \${errors.degreeType ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                              className={\`w-full bg-surface-container-low/50 border \${errors.branch ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface\`}
                            >
                              <span className={watch("branch") ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watch("branch") || 'Select Branch'}
                              </span>
                              <svg className={\`w-4 h-4 transition-transform \${branchDropdownOpen ? 'rotate-180' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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
                                        className={\`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors \${
                                          watch("branch") === b ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }\`}
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
                          <select {...register("admissionYear")} className={\`w-full bg-surface-container-low/50 border \${errors.admissionYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                            <option value="">Select Year</option>
                            {Array.from({length: 10}, (_, i) => currentYear - i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                          {errors.admissionYear && <p className="text-xs text-red-500">{errors.admissionYear.message}</p>}
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Graduation Year</label>
                          <select {...register("gradYear")} className={\`w-full bg-surface-container-low/50 border \${errors.gradYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                            <option value="">Select Year</option>
                            {Array.from({length: 10}, (_, i) => currentYear - 3 + i).map(y => <option key={y} value={y.toString()}>{y}</option>)}
                          </select>
                          {errors.gradYear && <p className="text-xs text-red-500">{errors.gradYear.message}</p>}
                        </div>

                        {watchGradYear && parseInt(watchGradYear) >= currentYear && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Current Semester</label>
                            <select {...register("currentSemester")} className={\`w-full bg-surface-container-low/50 border \${errors.currentSemester ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / Institution</label>
                          <select {...register("college")} className={\`w-full bg-surface-container-low/50 border \${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                            <option value="">Select College</option>
                            {dbInstitutions.filter(i => i.exam_category === 'NEET').map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={\`mt-2 w-full bg-surface-container-low/50 border \${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="Enter your college/institution name" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Course Type</label>
                          <select {...register("courseType")} className={\`w-full bg-surface-container-low/50 border \${errors.courseType ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                            <option value="">Select Course</option>
                            {NEET_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {errors.courseType && <p className="text-xs text-red-500">{errors.courseType.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Graduation Year</label>
                          <select {...register("gradYear")} className={\`w-full bg-surface-container-low/50 border \${errors.gradYear ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                          <select {...register("caStage")} className={\`w-full bg-surface-container-low/50 border \${errors.caStage ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / Institution</label>
                          <select {...register("college")} className={\`w-full bg-surface-container-low/50 border \${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
                            <option value="">Select College</option>
                            {dbInstitutions.filter(i => i.exam_category === watchExamCategory).map(i => <option key={i.name} value={i.name}>{i.name}</option>)}
                            <option value="Other">Other</option>
                          </select>
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={\`mt-2 w-full bg-surface-container-low/50 border \${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="Enter your college/institution name" />
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
                          <select {...register("upscStage")} className={\`w-full bg-surface-container-low/50 border \${errors.upscStage ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                          <select {...register("targetExam")} className={\`w-full bg-surface-container-low/50 border \${errors.targetExam ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface\`}>
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
                          <input type="text" {...register("targetCollege")} className={\`w-full bg-surface-container-low/50 border \${errors.targetCollege ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="e.g. Delhi University" />
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
                          <input type="text" {...register("otherExam")} className={\`w-full bg-surface-container-low/50 border \${errors.otherExam ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="e.g. GRE, GMAT" />
                          {errors.otherExam && <p className="text-xs text-red-500">{errors.otherExam.message}</p>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target Attempt Year (Optional)</label>
                          <input type="number" {...register("targetAttemptYear")} className="w-full bg-surface-container-low/50 border border-outline-variant/30 px-4 py-3 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none" placeholder="e.g. 2025" />
                        </div>
                      </>
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
                </div>`;

const startIndex = content.indexOf(sectionBStart);
const cIdentityString = "{/* --- C. Identity Verification --- */}";
const endIndex = content.indexOf(cIdentityString);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  content = before + newSectionB + "\n\n                " + after;
} else {
  console.log("Could not find section B markers");
}

fs.writeFileSync(file, content, 'utf-8');
console.log("Done updating BecomeMentor.tsx");
