import React, { useState } from 'react';
import { 
  Building, 
  DollarSign, 
  FileText, 
  MapPin, 
  Tag, 
  Plus, 
  Trash, 
  CheckCircle,
  Briefcase
} from 'lucide-react';
import { Company, Project } from '../types';

interface CompanyProfileProps {
  company: Company | null;
  onSaveProfile: (profile: any) => Promise<boolean>;
  saving: boolean;
}

export default function CompanyProfile({ company, onSaveProfile, saving }: CompanyProfileProps) {
  const [name, setName] = useState(company?.name || '');
  const [industry, setIndustry] = useState(company?.industry || '');
  const [turnover, setTurnover] = useState(company?.turnover || 0);
  const [registrationNumbers, setRegistrationNumbers] = useState(company?.registration_numbers || '');
  const [certifications, setCertifications] = useState(company?.certifications || '');
  const [gstDetails, setGstDetails] = useState(company?.gst_details || '');
  const [msmeStatus, setMsmeStatus] = useState(company?.msme_status || false);
  const [teamStrength, setTeamStrength] = useState(company?.team_strength || 1);
  
  // Tag lists
  const [geoInput, setGeoInput] = useState('');
  const [geoList, setGeoList] = useState<string[]>(company?.geographic_coverage || []);
  const [catInput, setCatInput] = useState('');
  const [catList, setCatList] = useState<string[]>(company?.required_categories || []);

  // Projects list
  const [pastProjects, setPastProjects] = useState<Project[]>(company?.past_projects || []);
  
  // New Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projValue, setProjValue] = useState(0);
  const [projYear, setProjYear] = useState(2025);

  const handleAddGeo = () => {
    if (geoInput.trim() && !geoList.includes(geoInput.trim())) {
      setGeoList([...geoList, geoInput.trim()]);
      setGeoInput('');
    }
  };

  const handleRemoveGeo = (index: number) => {
    setGeoList(geoList.filter((_, idx) => idx !== index));
  };

  const handleAddCat = () => {
    if (catInput.trim() && !catList.includes(catInput.trim())) {
      setCatList([...catList, catInput.trim()]);
      setCatInput('');
    }
  };

  const handleRemoveCat = (index: number) => {
    setCatList(catList.filter((_, idx) => idx !== index));
  };

  const handleAddProject = () => {
    if (projTitle.trim() && projClient.trim() && projValue > 0) {
      const newProj: Project = {
        title: projTitle.trim(),
        client: projClient.trim(),
        value: projValue,
        year: projYear
      };
      setPastProjects([...pastProjects, newProj]);
      setProjTitle('');
      setProjClient('');
      setProjValue(0);
    }
  };

  const handleRemoveProject = (index: number) => {
    setPastProjects(pastProjects.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      industry,
      turnover: Number(turnover),
      registration_numbers: registrationNumbers,
      certifications,
      gst_details: gstDetails,
      msme_status: msmeStatus,
      team_strength: Number(teamStrength),
      geographic_coverage: geoList,
      required_categories: catList,
      past_projects: pastProjects
    };
    
    await onSaveProfile(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-4xl select-text">
      
      {/* SECTION 1: CORPORATE META */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6 shadow-md">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-2">
          <Building className="w-5 h-5 text-brand-400" />
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider font-['Outfit']">
            General Business Parameters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Enterprise Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Industry Sector</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Annual Turnover (INR Lakhs)</label>
            <input
              type="number"
              value={turnover}
              onChange={(e) => setTurnover(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Registration Numbers</label>
            <input
              type="text"
              value={registrationNumbers}
              onChange={(e) => setRegistrationNumbers(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">GST Registration ID</label>
            <input
              type="text"
              value={gstDetails}
              onChange={(e) => setGstDetails(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Quality Certifications (eg: ISO, CMMI)</label>
            <input
              type="text"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="e.g. ISO 9001:2015, ISO 27001"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 focus:outline-none text-xs text-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            id="msme_checkbox"
            checked={msmeStatus}
            onChange={(e) => setMsmeStatus(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 bg-slate-900 border-slate-700 focus:ring-brand-500 cursor-pointer"
          />
          <label htmlFor="msme_checkbox" className="text-xs font-bold text-white cursor-pointer select-none">
            Registered as MSME Enterprise
          </label>
          <span className="block text-[9px] text-slate-500 italic pl-2">
            // MSMEs receive exemptions on earnest money deposits (EMD) and qualification thresholds in government tenders.
          </span>
        </div>
      </div>

      {/* SECTION 2: GEO & CATEGORIES TAGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Geographic operational scope */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Geographic Scope</h3>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={geoInput}
              onChange={(e) => setGeoInput(e.target.value)}
              placeholder="Add location..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
            <button 
              type="button" 
              onClick={handleAddGeo}
              className="p-2 rounded-xl bg-slate-800 text-brand-400 hover:bg-slate-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {geoList.map((tag, idx) => (
              <span key={idx} className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-750 text-[10px] text-slate-300 font-semibold uppercase">
                <span>{tag}</span>
                <button type="button" onClick={() => handleRemoveGeo(idx)} className="text-slate-500 hover:text-slate-355 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Categories tags list */}
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Tag className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trade Categories</h3>
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              placeholder="Add category tag..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
            <button 
              type="button" 
              onClick={handleAddCat}
              className="p-2 rounded-xl bg-slate-800 text-brand-400 hover:bg-slate-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {catList.map((tag, idx) => (
              <span key={idx} className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-750 text-[10px] text-slate-300 font-semibold uppercase">
                <span>{tag}</span>
                <button type="button" onClick={() => handleRemoveCat(idx)} className="text-slate-500 hover:text-slate-355 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 3: PAST COMPLETED PROJECTS */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Briefcase className="w-4 h-4 text-brand-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Completed Project Logs</h3>
        </div>

        {/* Existing Projects table list */}
        <div className="space-y-3">
          {pastProjects.map((p, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#0F172A]/40 border border-slate-800 flex items-center justify-between text-xs font-medium">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-brand-400 block">{p.client} (Yr {p.year})</span>
                <span className="text-slate-200 block font-bold">{p.title}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-extrabold text-slate-200">₹ {p.value.toLocaleString()}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveProject(idx)}
                  className="p-1.5 rounded-lg hover:bg-rose-950/20 hover:text-rose-400 text-slate-500"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Add Project form row */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 space-y-4">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">// Register Completed Project Credentials</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="Project Name..."
              className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-800 text-xs text-slate-200"
            />
            <input
              type="text"
              value={projClient}
              onChange={(e) => setProjClient(e.target.value)}
              placeholder="Client entity..."
              className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-800 text-xs text-slate-200"
            />
            <input
              type="number"
              value={projValue || ''}
              onChange={(e) => setProjValue(Number(e.target.value))}
              placeholder="Contract Value (₹)..."
              className="px-3 py-2 rounded-lg bg-[#0F172A] border border-slate-800 text-xs text-slate-200"
            />
            <button
              type="button"
              onClick={handleAddProject}
              className="py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 font-bold text-xs border border-slate-700"
            >
              Add Project Log
            </button>
          </div>
        </div>
      </div>

      {/* FINAL ACTION SUBMIT */}
      <div className="flex justify-end shrink-0">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 py-3 px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold text-xs shadow-lg hover:scale-[1.02] disabled:scale-100 transition-all disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{saving ? 'Saving updates...' : 'Save Profile Settings'}</span>
        </button>
      </div>

    </form>
  );
}
