import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/BecomeMentor.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Zod schema
content = content.replace(
  /currentPrepStage: z\.string\(\)\.optional\(\),/,
  `currentPrepStage: z.string().optional(),\n  examBranch: z.string().optional(),\n  examBranchOther: z.string().optional(),`
);

// 2. Add states
content = content.replace(
  /const \[dbInstitutions, setDbInstitutions\] = useState<\s*\{name: string, exam_category: string\}\[]\s*>\(\[\]\);/,
  `const [dbInstitutions, setDbInstitutions] = useState<{name: string, exam_category: string}[]>([]);
  const [dbExamBranches, setDbExamBranches] = useState<{name: string, exam_category: string}[]>([]);
  const [examBranchSearch, setExamBranchSearch] = useState("");
  const [examBranchDropdownOpen, setExamBranchDropdownOpen] = useState(false);`
);

// 3. Add fetch
content = content.replace(
  /fetchInstitutions\(\);/,
  `fetchInstitutions();

    const fetchExamBranches = async () => {
      const { data, error } = await supabase
        .from('exam_branches')
        .select('name, exam_category')
        .order('name', { ascending: true });
      if (data && !error) {
        setDbExamBranches(data);
      }
    };
    fetchExamBranches();`
);

// 4. Add watch
content = content.replace(
  /const watchGradYear = watch\("gradYear"\);/,
  `const watchGradYear = watch("gradYear");\n  const watchExamBranch = watch("examBranch");`
);

// 5. Add to payload
content = content.replace(
  /current_prep_stage: data\.currentPrepStage,/,
  `current_prep_stage: data.currentPrepStage,
          exam_branch: data.examBranch || "",
          exam_branch_other: data.examBranchOther || "",`
);

// 6. Insert UI
const uiToInsert = `
                    {/* Universal Field for Branch/Specialization (Except JEE/Other) */}
                    {watchExamCategory && watchExamCategory !== "JEE" && watchExamCategory !== "Other" && (
                      <div className="space-y-2 md:col-span-2 mt-4 pt-4 border-t border-outline-variant/20">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Branch / Specialization</label>
                        <div className="relative">
                          <div 
                            onClick={() => setExamBranchDropdownOpen(!examBranchDropdownOpen)}
                            className={\`w-full bg-surface-container-low/50 border \${errors.examBranch ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface\`}
                          >
                            <span className={watchExamBranch && watchExamBranch !== "Other" ? 'text-on-surface' : watchExamBranch === "Other" ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                              {watchExamBranch || 'Select Branch/Specialization'}
                            </span>
                            <svg className={\`w-4 h-4 transition-transform \${examBranchDropdownOpen ? 'rotate-180' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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
                                      className={\`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors \${
                                        watchExamBranch === b.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                      }\`}
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
                                    className={\`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors \${
                                      watchExamBranch === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                    }\`}
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
                          <input {...register("examBranchOther")} className={\`mt-2 w-full bg-surface-container-low/50 border \${errors.examBranchOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="Enter your specialization" />
                        )}
                      </div>
                    )}
`;

content = content.replace(
  /\{\/\* Universal Field at the end of Section B \*\/\}/,
  uiToInsert + '\n                    {/* Universal Field at the end of Section B */}'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Updated BecomeMentor.tsx with examBranch');
