import React, { useState } from 'react';
import {
  Building,
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
    <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-4xl select-text bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300 min-h-screen">

      {/* SECTION 1: CORPORATE META */}
      <div className="glass-panel dark:bg-slate-900/45 dark:border-white/10 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-premium select-none">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-2">
          <Building className="w-5 h-5 text-primary-500 dark:text-[#C9A84C]" />
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white tracking-wide">
            General Business Parameters
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Enterprise Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Industry Sector</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Annual Turnover (INR Lakhs)</label>
            <input
              type="number"
              value={turnover}
              onChange={(e) => setTurnover(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Registration Numbers</label>
            <input
              type="text"
              value={registrationNumbers}
              onChange={(e) => setRegistrationNumbers(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">GST Registration ID</label>
            <input
              type="text"
              value={gstDetails}
              onChange={(e) => setGstDetails(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Quality Certifications (eg: ISO, CMMI)</label>
            <input
              type="text"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="e.g. ISO 9001:2015, ISO 27001"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-slate-800 dark:text-slate-100 transition-colors duration-200"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3.5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <input
            type="checkbox"
            id="msme_checkbox"
            checked={msmeStatus}
            onChange={(e) => setMsmeStatus(e.target.checked)}
            className="w-4 h-4 rounded text-primary-500 dark:text-[#C9A84C] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-primary-500 cursor-pointer"
          />
          <label htmlFor="msme_checkbox" className="text-xs font-bold text-slate-900 dark:text-white cursor-pointer select-none">
            Registered as MSME Enterprise
          </label>
          <span className="block text-[9px] text-slate-500 dark:text-slate-400 italic pl-2 font-mono">
            // MSMEs receive exemptions on EMD and eligibility thresholds in government bids.
          </span>
        </div>
      </div>

      {/* SECTION 2: GEO & CATEGORIES TAGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">

        {/* Geographic operational scope */}
        <div className="glass-panel dark:bg-slate-900/45 dark:border-white/10 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-premium">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-primary-500 dark:text-[#C9A84C]" />
            <h3 className="text-xs font-display font-bold text-slate-900 dark:text-white tracking-wide">Geographic Scope</h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={geoInput}
              onChange={(e) => setGeoInput(e.target.value)}
              placeholder="Add location..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddGeo}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-[#C9A84C] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {geoList.map((tag, idx) => (
              <span key={idx} className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase shadow-sm">
                <span>{tag}</span>
                <button type="button" onClick={() => handleRemoveGeo(idx)} className="text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-slate-350 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>

        {/* Categories tags list */}
        <div className="glass-panel dark:bg-slate-900/45 dark:border-white/10 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-premium">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Tag className="w-4 h-4 text-primary-500 dark:text-[#C9A84C]" />
            <h3 className="text-xs font-display font-bold text-slate-900 dark:text-white tracking-wide">Trade Categories</h3>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={catInput}
              onChange={(e) => setCatInput(e.target.value)}
              placeholder="Add category tag..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddCat}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-[#C9A84C] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-2">
            {catList.map((tag, idx) => (
              <span key={idx} className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase shadow-sm">
                <span>{tag}</span>
                <button type="button" onClick={() => handleRemoveCat(idx)} className="text-slate-400 dark:text-slate-550 hover:text-slate-700 dark:hover:text-slate-350 font-bold">×</button>
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* SECTION 3: PAST COMPLETED PROJECTS */}
      <div className="glass-panel dark:bg-slate-900/45 dark:border-white/10 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-premium">
        <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Briefcase className="w-4 h-4 text-primary-500 dark:text-[#C9A84C]" />
          <h3 className="text-xs font-display font-bold text-slate-900 dark:text-white tracking-wide">Completed Project Logs</h3>
        </div>

        {/* Existing Projects table list */}
        <div className="space-y-2.5">
          {pastProjects.map((p, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-medium shadow-sm">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-primary-650 dark:text-[#C9A84C] block">{p.client} (Yr {p.year})</span>
                <span className="text-slate-900 dark:text-white block font-bold">{p.title}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-bold text-slate-900 dark:text-white font-mono">₹ {p.value.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveProject(idx)}
                  className="p-1.5 rounded-lg hover:bg-danger/10 hover:text-danger text-slate-400 dark:text-slate-500 border border-transparent hover:border-danger/25 dark:hover:border-danger/40 transition-all"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Add Project form row */}
        <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">// Register Completed Project Credentials</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 select-none">
            <input
              type="text"
              value={projTitle}
              onChange={(e) => setProjTitle(e.target.value)}
              placeholder="Project Name..."
              className="px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:outline-none"
            />
            <input
              type="text"
              value={projClient}
              onChange={(e) => setProjClient(e.target.value)}
              placeholder="Client entity..."
              className="px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:outline-none"
            />
            <input
              type="number"
              value={projValue || ''}
              onChange={(e) => setProjValue(Number(e.target.value))}
              placeholder="Contract Value (₹)..."
              className="px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-primary-500 dark:focus:border-[#C9A84C] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddProject}
              className="py-2 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-primary-650 dark:text-[#C9A84C] transition shadow-sm"
            >
              Add Project Log
            </button>
          </div>
        </div>
      </div>

      {/* FINAL ACTION SUBMIT */}
      <div className="flex justify-end shrink-0 select-none">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center space-x-2 py-3 px-8 rounded-xl bg-primary-500 dark:bg-[#C9A84C] hover:bg-primary-600 dark:hover:bg-[#A07840] text-white font-bold text-xs shadow-premium-glow hover:scale-[1.02] disabled:scale-100 transition-all disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{saving ? 'Saving updates...' : 'Save Profile Settings'}</span>
        </button>
      </div>

    </form>
  );
}
