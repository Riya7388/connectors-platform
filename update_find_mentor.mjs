import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/pages/FindMentor.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Update Mentor Interface
content = content.replace(
  /branch: string;/,
  `branch: string;\n  exam_category?: string;\n  exam_branch?: string;`
);

// 2. Add states for Exam Category, Institutions, Exam Branches
content = content.replace(
  /const \[selectedColleges, setSelectedColleges\] = useState<string\[\]>\(\[\]\);/,
  `const [selectedExamCategory, setSelectedExamCategory] = useState("All");
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [selectedExamColleges, setSelectedExamColleges] = useState<string[]>([]);
  const [selectedExamBranches, setSelectedExamBranches] = useState<string[]>([]);
  const [dbInstitutions, setDbInstitutions] = useState<string[]>([]);
  const [dbExamBranches, setDbExamBranches] = useState<string[]>([]);`
);

// 3. Add useEffect for Strict Data Isolation
const fetchHookCode = `
  useEffect(() => {
    const fetchCategoryData = async () => {
      if (selectedExamCategory === "All" || selectedExamCategory === "JEE") {
        setDbInstitutions([]);
        setDbExamBranches([]);
        return;
      }
      const [instRes, branchRes] = await Promise.all([
        supabase.from('institutions').select('name').eq('exam_category', selectedExamCategory).order('name', { ascending: true }),
        supabase.from('exam_branches').select('name').eq('exam_category', selectedExamCategory).order('name', { ascending: true })
      ]);
      if (instRes.data) setDbInstitutions(instRes.data.map((i: any) => i.name));
      if (branchRes.data) setDbExamBranches(branchRes.data.map((b: any) => b.name));
    };
    fetchCategoryData();
    
    // Wipe selected filters when category changes
    setSelectedColleges([]);
    setSelectedBranches([]);
    setSelectedExamColleges([]);
    setSelectedExamBranches([]);
  }, [selectedExamCategory]);
`;

content = content.replace(
  /useEffect\(\(\) => \{\n    const fetchMentorsAndOptions/,
  fetchHookCode + '\n  useEffect(() => {\n    const fetchMentorsAndOptions'
);

// 4. Update active filter count logic
content = content.replace(
  /if \(selectedColleges\.length > 0\) count\+\+;\n    if \(selectedBranches\.length > 0\) count\+\+;/,
  `if (selectedExamCategory !== "All") count++;
    if (selectedColleges.length > 0 || selectedExamColleges.length > 0) count++;
    if (selectedBranches.length > 0 || selectedExamBranches.length > 0) count++;`
);

// 5. Update dependency array for filtered list
content = content.replace(
  /\[searchTerm, selectedColleges, selectedBranches, verifiedOnly, selectedExpertise, selectedPriceRange, freeIntroOnly, selectedLanguages, selectedRating\]/g,
  `[searchTerm, selectedExamCategory, selectedColleges, selectedExamColleges, selectedBranches, selectedExamBranches, verifiedOnly, selectedExpertise, selectedPriceRange, freeIntroOnly, selectedLanguages, selectedRating]`
);

// 6. Update filtering logic
const filteringLogic = `
      // 0. Exam Category Filter
      const matchesCategory = selectedExamCategory === "All" || m.exam_category === selectedExamCategory;

      // 1. Text search — matches name, college, branch, exam_branch
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        m.full_name.toLowerCase().includes(term) ||
        (m.college_name || "").toLowerCase().includes(term) ||
        (m.branch || "").toLowerCase().includes(term) ||
        (m.exam_branch || "").toLowerCase().includes(term);

      // 2. Branch filter
      const matchesBranch =
        (selectedExamCategory === "All") ? true :
        (selectedExamCategory === "JEE") ?
          (selectedBranches.length === 0 || selectedBranches.includes(m.branch)) :
          (selectedExamBranches.length === 0 || selectedExamBranches.includes(m.exam_branch || ""));

      // 3. College filter
      const matchesCollege =
        (selectedExamCategory === "All") ? true :
        (selectedExamCategory === "JEE") ?
          (selectedColleges.length === 0 || selectedColleges.includes(m.college_name)) :
          (selectedExamColleges.length === 0 || selectedExamColleges.includes(m.college_name));
`;

content = content.replace(
  /\/\/ 1\. Text search — matches name, college, branch[\s\S]*?const matchesCollege =[\s\S]*?selectedColleges\.includes\(m\.college_name\);/m,
  filteringLogic
);

// Update final return for filtered
content = content.replace(
  /return \(\n\s*matchesSearch &&\n\s*matchesBranch &&\n\s*matchesCollege/,
  `return (\n        matchesCategory &&\n        matchesSearch &&\n        matchesBranch &&\n        matchesCollege`
);

// 7. Update resetAll
content = content.replace(
  /setSearchTerm\(""\);/,
  `setSearchTerm("");
    setSelectedExamCategory("All");
    setSelectedExamColleges([]);
    setSelectedExamBranches([]);`
);

// 8. Update Sidebar UI
const newSidebarUI = `
            {/* 0. Exam Category Filter */}
            <div>
              <label className="block mb-2 text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
                Exam Category
              </label>
              <select
                value={selectedExamCategory}
                onChange={(e) => setSelectedExamCategory(e.target.value)}
                className="w-full bg-surface-container-high/50 border border-outline-variant/30 px-4 py-2.5 rounded-xl text-sm focus:border-primary focus:ring-1 outline-none text-on-surface"
              >
                <option value="All">All Exams</option>
                {["JEE", "NEET", "CA", "CAT", "UPSC", "CLAT", "Banking", "Defense", "CUET", "Other"].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <FilterDivider />

            {/* 1. College & Branch (Conditional) */}
            {selectedExamCategory === "JEE" && (
              <>
                <SearchableMultiSelect
                  label="College / University"
                  options={allColleges}
                  selected={selectedColleges}
                  onChange={setSelectedColleges}
                  placeholder="Search colleges..."
                />
                <FilterDivider />
                <SearchableMultiSelect
                  label="Branch"
                  options={dbBranches}
                  selected={selectedBranches}
                  onChange={setSelectedBranches}
                  placeholder="Search branches..."
                />
                <FilterDivider />
              </>
            )}

            {(selectedExamCategory === "NEET" || selectedExamCategory === "CAT" || selectedExamCategory === "CLAT" || selectedExamCategory === "CUET") && (
              <>
                <SearchableMultiSelect
                  label="College / Institution"
                  options={dbInstitutions}
                  selected={selectedExamColleges}
                  onChange={setSelectedExamColleges}
                  placeholder="Search colleges..."
                />
                <FilterDivider />
              </>
            )}

            {(selectedExamCategory !== "All" && selectedExamCategory !== "JEE" && selectedExamCategory !== "Other") && (
              <>
                <SearchableMultiSelect
                  label="Branch / Specialization"
                  options={dbExamBranches}
                  selected={selectedExamBranches}
                  onChange={setSelectedExamBranches}
                  placeholder="Search branches..."
                />
                <FilterDivider />
              </>
            )}
`;

content = content.replace(
  /\{\/\* 1\. College \/ University — Searchable Multi-Select \(sourced from public\.colleges\) \*\/\}[\s\S]*?\{\/\* 3\. Verified Only — Toggle \*\/\}/,
  newSidebarUI + '\n            {/* 3. Verified Only — Toggle */}'
);

fs.writeFileSync(file, content, 'utf-8');
console.log('Updated FindMentor.tsx with Overhauled Filters');
