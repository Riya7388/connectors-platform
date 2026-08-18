import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/BecomeMentor.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Add states for college search/dropdown
if (!content.includes('const [collegeSearch, setCollegeSearch] = useState("");')) {
  content = content.replace(
    /const \[branchDropdownOpen, setBranchDropdownOpen\] = useState\(false\);/,
    `const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false);`
  );
}

// 2. The replacement block for the searchable college dropdown
const getSearchableCollegeDropdown = (examCategoryContext) => `
                        <div className="space-y-2 relative">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College / Institution</label>
                          <div className="relative">
                            <div 
                              onClick={() => setCollegeDropdownOpen(!collegeDropdownOpen)}
                              className={\`w-full bg-surface-container-low/50 border \${errors.college ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-3 rounded-xl text-sm cursor-pointer flex items-center justify-between text-on-surface\`}
                            >
                              <span className={watchCollege ? 'text-on-surface' : 'text-on-surface-variant/50'}>
                                {watchCollege || 'Select College'}
                              </span>
                              <svg className={\`w-4 h-4 transition-transform \${collegeDropdownOpen ? 'rotate-180' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
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
                                    .filter(i => i.exam_category === ${examCategoryContext})
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
                                        className={\`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors \${
                                          watchCollege === i.name ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                        }\`}
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
                                      className={\`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors \${
                                        watchCollege === "Other" ? 'bg-primary/15 text-primary font-semibold' : 'text-on-surface'
                                      }\`}
                                    >
                                      Other
                                    </button>
                                  {dbInstitutions.filter(i => i.exam_category === ${examCategoryContext}).filter(i => i.name.toLowerCase().includes(collegeSearch.toLowerCase())).length === 0 && (
                                    <p className="px-4 py-3 text-xs text-on-surface-variant">No colleges found</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <input type="hidden" {...register("college")} />
                          {errors.college && <p className="text-xs text-red-500">{errors.college.message}</p>}
                          {watchCollege === "Other" && (
                            <input {...register("institutionOther")} className={\`mt-2 w-full bg-surface-container-low/50 border \${errors.institutionOther ? 'border-red-500' : 'border-outline-variant/30'} px-4 py-2 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none\`} placeholder="Enter your college/institution name" />
                          )}
                        </div>`;

// 3. Replace NEET college dropdown
const neetRegex = /<div className="space-y-2">\s*<label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College \/ Institution<\/label>\s*<select \{\.\.\.register\("college"\)\} className=\{[^>]*\}>\s*<option value="">Select College<\/option>\s*\{dbInstitutions\.filter\(i => i\.exam_category === 'NEET'\)\.map\(i => <option key=\{i\.name\} value=\{i\.name\}>\{i\.name\}<\/option>\)\}\s*<option value="Other">Other<\/option>\s*<\/select>\s*\{errors\.college && <p className="text-xs text-red-500">\{errors\.college\.message\}<\/p>\}\s*\{watchCollege === "Other" && \(\s*<input \{\.\.\.register\("institutionOther"\)\} className=\{[^>]*\} placeholder="Enter your college\/institution name" \/>\s*\)\}\s*<\/div>/;
content = content.replace(neetRegex, getSearchableCollegeDropdown("'NEET'"));

// 4. Replace CAT/CLAT college dropdown
const catRegex = /<div className="space-y-2">\s*<label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">College \/ Institution<\/label>\s*<select \{\.\.\.register\("college"\)\} className=\{[^>]*\}>\s*<option value="">Select College<\/option>\s*\{dbInstitutions\.filter\(i => i\.exam_category === watchExamCategory\)\.map\(i => <option key=\{i\.name\} value=\{i\.name\}>\{i\.name\}<\/option>\)\}\s*<option value="Other">Other<\/option>\s*<\/select>\s*\{errors\.college && <p className="text-xs text-red-500">\{errors\.college\.message\}<\/p>\}\s*\{watchCollege === "Other" && \(\s*<input \{\.\.\.register\("institutionOther"\)\} className=\{[^>]*\} placeholder="Enter your college\/institution name" \/>\s*\)\}\s*<\/div>/;
content = content.replace(catRegex, getSearchableCollegeDropdown("watchExamCategory"));

fs.writeFileSync(file, content, 'utf-8');
console.log("Updated BecomeMentor.tsx with searchable college dropdowns");
