export interface User {
  id: number;
  email: string;
  role: string;
  full_name?: string;
  created_at: string;
}

export interface Project {
  title: string;
  client: string;
  value: number;
  description?: string;
  year: number;
}

export interface Company {
  id: number;
  user_id: number;
  name: string;
  industry?: string;
  turnover?: number;
  registration_numbers?: string;
  certifications?: string;
  gst_details?: string;
  msme_status: boolean;
  past_projects: Project[];
  team_strength: number;
  geographic_coverage: string[];
  required_categories: string[];
  updated_at: string;
}

export interface TenderDocument {
  id: number;
  file_name: string;
  file_path: string;
  doc_type?: string;
  size_bytes?: number;
  parsed_json?: any;
  created_at: string;
}

export interface Tender {
  id: number;
  tender_id: string;
  title: string;
  department?: string;
  location?: string;
  budget?: number;
  deadline?: string;
  eligibility_criteria?: string;
  source_url?: string;
  bid_detail_url?: string;
  pdf_url?: string;
  source_name: string;
  created_at: string;
  status: string;
  documents: TenderDocument[];
  opportunity_score?: number;   // 0-100 from AI scoring agent
  eligibility?: string;         // eligible | partially_eligible | not_eligible
}

export interface FinancialMatch {
  status: 'pass' | 'fail' | 'conditional';
  details: string;
}

export interface TechnicalMatch {
  status: 'pass' | 'fail' | 'conditional';
  details: string;
}

export interface ExperienceMatch {
  status: 'pass' | 'fail' | 'conditional';
  details: string;
}

export interface LocationMatch {
  status: 'pass' | 'fail';
  details: string;
}

export interface MSMEAdvantage {
  applicable: boolean;
  details: string;
}

export interface EligibilityReport {
  id: number;
  tender_id: number;
  company_id: number;
  eligibility: 'eligible' | 'partially_eligible' | 'not_eligible';
  confidence_score: number;
  opportunity_score: number;
  summary?: string;
  requirements_analysis: {
    financial_match: FinancialMatch;
    technical_match: TechnicalMatch;
    experience_match: ExperienceMatch;
    location_match?: LocationMatch;
    overall_rationale: string;
  };
  risk_analysis: {
    risks: string[];
    msme_advantage: MSMEAdvantage;
  };
  timeline: {
    publishing_date?: string;
    pre_bid_meeting?: string;
    submission_deadline?: string;
    clarification_deadline?: string;
  };
  checklist: {
    submission_checklist: string[];
    key_requirements: string[];
  };
  created_at: string;
}

export interface AgentTask {
  id: string;
  task_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  log_messages: { timestamp: string; level: string; message: string }[];
  current_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  type: string;
  priority: string; // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tender_id?: number;
  company_id: number;
  metadata?: {
    why_this_tender_matches?: string;
    recommended_action?: string;
    risk_summary?: string;
    trigger_reason?: string;
    evidence?: string[];
  };
}
