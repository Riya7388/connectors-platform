import React, { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, Star, BrainCircuit, BarChart3, School, MapPin, IndianRupee, Flame, Download, Users } from "lucide-react";
import { supabase } from "../supabase";
// @ts-ignore
import html2pdf from "html2pdf.js";

interface College {
  id: string;
  name: string;
  nirf_rank: number;
  avg_placement_package_lpa: number;
  total_fees_4_years_inr: number;
  city: string;
  state: string;
}

export const Compare: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [college1Name, setCollege1Name] = useState("");
  const [college2Name, setCollege2Name] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [college1Data, setCollege1Data] = useState<College | null>(null);
  const [college2Data, setCollege2Data] = useState<College | null>(null);
  const [mentorCount1, setMentorCount1] = useState(0);
  const [mentorCount2, setMentorCount2] = useState(0);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchColleges = async () => {
      const { data, error } = await supabase.from('colleges').select('*').order('name');
      if (data && !error) {
        setColleges(data);
      }
    };
    fetchColleges();
  }, []);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowReport(false);
    
    if (!college1Name || !college2Name) {
      setError("Please select both colleges.");
      return;
    }
    if (college1Name === college2Name) {
      setError("Please select two different colleges to compare.");
      return;
    }

    const c1 = colleges.find(c => c.name === college1Name);
    const c2 = colleges.find(c => c.name === college2Name);

    if (!c1 || !c2) {
      setError("We're still gathering verified data for one or both of these colleges. Check back soon!");
      return;
    }

    setLoading(true);
    setLoadingProgress(10);
    
    try {
      setCollege1Data(c1);
      setCollege2Data(c2);

      // Fetch Mentor Counts
      const { count: count1 } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('college', c1.name)
        .eq('verified', true)
        .eq('application_status', 'approved');

      const { count: count2 } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('college', c2.name)
        .eq('verified', true)
        .eq('application_status', 'approved');

      // Fallback in case application_status doesn't exist, we try without it
      let finalCount1 = count1 || 0;
      let finalCount2 = count2 || 0;

      if (count1 === null && count2 === null) {
        const { count: count1Fallback } = await supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('college', c1.name).eq('verified', true);
        const { count: count2Fallback } = await supabase.from('mentors').select('*', { count: 'exact', head: true }).eq('college', c2.name).eq('verified', true);
        finalCount1 = count1Fallback || 0;
        finalCount2 = count2Fallback || 0;
      }

      setMentorCount1(finalCount1);
      setMentorCount2(finalCount2);
      setLoadingProgress(50);

      // Call AI Function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-compare', {
        body: {
          college1: c1.name,
          college2: c2.name,
          data: {
            college1: { ...c1, available_mentors: finalCount1 },
            college2: { ...c2, available_mentors: finalCount2 }
          }
        }
      });

      if (aiError) throw aiError;

      setAiSummary(aiData.summary);
      setReportId(`CONN-AI-${Math.floor(10000 + Math.random() * 90000)}`);
      setLoadingProgress(100);
      
      setTimeout(() => {
        setLoading(false);
        setShowReport(true);
      }, 500);

    } catch (err) {
      console.error(err);
      setError("An error occurred while generating the comparison.");
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!reportRef.current) return;
    const opt = {
      margin: 0.5,
      filename: `Comparison_${college1Name}_vs_${college2Name}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(reportRef.current).save();
  };

  return (
    <div className="relative min-h-screen py-12">
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-container/10 rounded-full blur-[100px] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto px-6">
        <section className="text-center mb-16 space-y-4">
          <h1 className="font-extrabold text-5xl text-primary">AI Comparison Engine</h1>
          <p className="text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed">
            Compare colleges with deep neural insights based on real data. Explore NIRF rankings, placements, fees, and connect with verified mentors.
          </p>
        </section>

        <section className="mb-12">
          <form onSubmit={handleCompare} className="glass-card p-8 rounded-2xl relative border border-white/10">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-medium">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-12 h-12 rounded-full kinetic-gradient items-center justify-center font-bold text-lg text-white shadow-lg border-2 border-background z-10">
                VS
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-primary">College Selection 01</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" size={20} />
                  <input 
                    list="colleges-list"
                    value={college1Name}
                    onChange={(e) => setCollege1Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm"
                    placeholder="Search College Name..."
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-secondary-fixed-dim">College Selection 02</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-fixed-dim" size={20} />
                  <input 
                    list="colleges-list"
                    value={college2Name}
                    onChange={(e) => setCollege2Name(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all text-sm"
                    placeholder="Search College Name..."
                    type="text"
                  />
                </div>
              </div>
              
              <datalist id="colleges-list">
                {colleges.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-4 kinetic-gradient text-white font-bold rounded-full text-base neon-glow-primary hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Sparkles size={18} className={loading ? "animate-spin" : ""} /> {loading ? "Analyzing..." : "Generate Comparison"}
              </button>
            </div>
          </form>
        </section>

        {loading && (
          <section className="py-12 animate-fade-in">
            <div className="max-w-xl mx-auto glass-card p-8 rounded-2xl border border-primary/20 text-center relative overflow-hidden ai-scanner">
              <div className="mb-4">
                <BrainCircuit className="mx-auto text-primary animate-pulse" size={48} />
              </div>
              <h3 className="font-bold text-xl mb-2 text-on-surface">AI is Synthesizing Data...</h3>
              <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
                Comparing NIRF rankings, recent placement records, fee structures, and mentoring network...
              </p>
              <div className="mt-6 w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          </section>
        )}

        {showReport && college1Data && college2Data && (
          <div ref={reportRef} className="p-4 rounded-xl">
            <section className="space-y-8 animate-fade-in">
              <div className="flex flex-col md:flex-row gap-6 items-center glass-card p-6 rounded-2xl border border-white/10">
                <div className="p-4 bg-primary/10 rounded-full text-primary">
                  <BarChart3 size={32} />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-2xl font-extrabold text-on-surface">{college1Data.name} vs. {college2Data.name}</h2>
                  <p className="text-secondary-fixed-dim text-xs font-semibold">Report ID: #{reportId} • Generated just now</p>
                </div>
                <div className="md:ml-auto">
                  <button 
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 hover:underline transition-all text-sm font-semibold"
                  >
                    <Download size={16} /> Download Report PDF
                  </button>
                </div>
              </div>

              <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/10 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="p-4">Key Parameters</th>
                        <th className="p-4">{college1Data.name}</th>
                        <th className="p-4">{college2Data.name}</th>
                        <th className="p-4">AI Insight / Winner</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-sm">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                          <Star size={16} className="text-yellow-400" /> NIRF Engineering Rank
                        </td>
                        <td className="p-4">#{college1Data.nirf_rank || 'N/A'}</td>
                        <td className="p-4">#{college2Data.nirf_rank || 'N/A'}</td>
                        <td className="p-4 text-primary font-bold">
                          {(!college1Data.nirf_rank || !college2Data.nirf_rank) ? 'N/A' : 
                            college1Data.nirf_rank < college2Data.nirf_rank ? college1Data.name : college2Data.name}
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors bg-white/[0.01]">
                        <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                          <Flame size={16} className="text-orange-500" /> Avg Placement Package
                        </td>
                        <td className="p-4">{college1Data.avg_placement_package_lpa ? `₹${college1Data.avg_placement_package_lpa} LPA` : 'N/A'}</td>
                        <td className="p-4">{college2Data.avg_placement_package_lpa ? `₹${college2Data.avg_placement_package_lpa} LPA` : 'N/A'}</td>
                        <td className="p-4 text-secondary-fixed-dim font-bold">
                          {(!college1Data.avg_placement_package_lpa || !college2Data.avg_placement_package_lpa) ? 'N/A' : 
                            college1Data.avg_placement_package_lpa > college2Data.avg_placement_package_lpa ? college1Data.name : college2Data.name}
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                          <IndianRupee size={16} className="text-green-400" /> Fees (4 Yrs, No Hostel)
                        </td>
                        <td className="p-4">{college1Data.total_fees_4_years_inr ? `₹${(college1Data.total_fees_4_years_inr / 100000).toFixed(2)} Lakhs` : 'N/A'}</td>
                        <td className="p-4">{college2Data.total_fees_4_years_inr ? `₹${(college2Data.total_fees_4_years_inr / 100000).toFixed(2)} Lakhs` : 'N/A'}</td>
                        <td className="p-4 text-green-400 font-bold">
                          {(!college1Data.total_fees_4_years_inr || !college2Data.total_fees_4_years_inr) ? 'N/A' : 
                            college1Data.total_fees_4_years_inr < college2Data.total_fees_4_years_inr ? college1Data.name : college2Data.name}
                        </td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors bg-white/[0.01]">
                        <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                          <MapPin size={16} className="text-blue-400" /> Location
                        </td>
                        <td className="p-4">{college1Data.city}, {college1Data.state}</td>
                        <td className="p-4">{college2Data.city}, {college2Data.state}</td>
                        <td className="p-4 text-on-surface-variant italic">Informational</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-on-surface flex items-center gap-2">
                          <Users size={16} className="text-purple-400" /> Available Mentors
                        </td>
                        <td className="p-4">{mentorCount1}</td>
                        <td className="p-4">{mentorCount2}</td>
                        <td className="p-4 text-purple-400 font-bold">
                          {mentorCount1 > mentorCount2 ? college1Data.name : mentorCount2 > mentorCount1 ? college2Data.name : 'Tie'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-primary/20 space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                  <BrainCircuit size={20} /> AI Synthesis Summary
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
                  {aiSummary}
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
