import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { WorkflowBar } from './components/WorkflowBar';
import { HeroBanner } from './components/HeroBanner';
import { StatCards } from './components/StatCards';
import { RecentTendersTable } from './components/RecentTendersTable';
import { GovernmentSourcesGrid } from './components/GovernmentSourcesGrid';
import { VerificationWorkbench } from './components/VerificationWorkbench';
import { TendersScreen } from './components/TendersScreen';
import { AuditTrailScreen } from './components/AuditTrailScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { UploadTenderModal } from './components/UploadTenderModal';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { Footer } from './components/Footer';
import { LiveScraperModal } from './components/LiveScraperModal';

import { 
  INITIAL_TENDERS, 
  INITIAL_GOVERNMENT_SOURCES, 
  INITIAL_AUDIT_LOGS 
} from './data/tendersData';
import { NavigationTab, Tender, WorkflowStepId, AuditTrailLog } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('landing');
  const [tenders, setTenders] = useState<Tender[]>(INITIAL_TENDERS);
  const [selectedTender, setSelectedTender] = useState<Tender>(INITIAL_TENDERS[0]);
  const [auditLogs, setAuditLogs] = useState<AuditTrailLog[]>(INITIAL_AUDIT_LOGS);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<WorkflowStepId>(1);

  // Quick 1-Click Interactive Demo (Tender 1024)
  const handleLaunchDemo = () => {
    const demoTender = tenders.find((t) => t.id === 'GEM/2026/PROC/1024') || tenders[0];
    setSelectedTender(demoTender);
    setCurrentWorkflowStep(5); // Land on Explainable Risks for high impact demo!
    setActiveTab('verification');
  };

  const handleSelectTenderForVerification = (tender: Tender) => {
    setSelectedTender(tender);
    setCurrentWorkflowStep(1);
    setActiveTab('verification');
  };

  const handleWorkflowStepClick = (stepId: WorkflowStepId) => {
    setCurrentWorkflowStep(stepId);
    setActiveTab('verification');
  };

  const handleRecordAuditLog = (log: {
    tenderId: string;
    bidderName: string;
    action: string;
    category: 'VERIFICATION' | 'OVERRIDE' | 'DECISION' | 'CLARIFICATION';
    justification: string;
  }) => {
    const newLog: AuditTrailLog = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      officer: 'R. K. Sharma (Procurement Officer)',
      tenderId: log.tenderId,
      bidderName: log.bidderName,
      action: log.action,
      category: log.category,
      sha256: '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      justification: log.justification,
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleAddNewTender = (newTender: Tender) => {
    setTenders((prev) => [newTender, ...prev]);
    setSelectedTender(newTender);
    setActiveTab('verification');
    setCurrentWorkflowStep(1);

    handleRecordAuditLog({
      tenderId: newTender.id,
      bidderName: 'All Initial Bidders',
      action: `New Tender Ingested: ${newTender.title}`,
      category: 'VERIFICATION',
      justification: 'Automated AI extraction codified RFP requirements and scheduled cross-registry verification.'
    });
  };

  const handleImportScrapedTender = (newTender: Tender) => {
    setTenders((prev) => {
      const exists = prev.some((t) => t.id === newTender.id);
      if (exists) {
        return prev.map((t) => (t.id === newTender.id ? newTender : t));
      }
      return [newTender, ...prev];
    });
    setSelectedTender(newTender);
    setActiveTab('verification');
    setCurrentWorkflowStep(1);

    handleRecordAuditLog({
      tenderId: newTender.id,
      bidderName: 'All Initial Bidders',
      action: `Portal Scraper Ingested: ${newTender.title}`,
      category: 'VERIFICATION',
      justification: `Direct synchronization from government portal (${newTender.subtitle}). Automated parser codified eligibility clauses and scheduled statutory verifications.`
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff] text-[#0b1c30]">
      {/* 
        If activeTab is 'landing', show the full dedicated Landing Page.
        Otherwise show the authenticated procurement dashboard suite with Navbar & Workflow ribbon.
      */}
      {activeTab === 'landing' ? (
        <LandingPage
          onExplorePrototype={() => setActiveTab('dashboard')}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onViewVerificationWorkflow={handleLaunchDemo}
        />
      ) : (
        <>
          {/* Top Main Navigation Bar for Dashboard/Workbench */}
          <Navbar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onLaunchDemo={handleLaunchDemo}
            onOpenUpload={() => setIsUploadModalOpen(true)}
            onOpenScraper={() => setIsScraperModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />

          {/* Workflow Horizontal Progress Ribbon */}
          <WorkflowBar
            currentStep={activeTab === 'verification' ? currentWorkflowStep : 1}
            onStepClick={handleWorkflowStepClick}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                {/* Hero Card with "Run Interactive Demo" */}
                <HeroBanner
                  onRunDemo={handleLaunchDemo}
                  onUploadTender={() => setIsUploadModalOpen(true)}
                  onOpenScraper={() => setIsScraperModalOpen(true)}
                />

                {/* 4 Stat Cards */}
                <StatCards
                  onCardClick={(type) => {
                    if (type === 'high-risk') {
                      handleLaunchDemo();
                    } else {
                      setActiveTab('tenders');
                    }
                  }}
                />

                {/* Recent Tenders Table */}
                <RecentTendersTable
                  tenders={tenders}
                  onSelectTender={handleSelectTenderForVerification}
                  onUploadClick={() => setIsUploadModalOpen(true)}
                  onOpenScraper={() => setIsScraperModalOpen(true)}
                />

                {/* Authorised Government Data Sources */}
                <GovernmentSourcesGrid sources={INITIAL_GOVERNMENT_SOURCES} />
              </div>
            )}

            {/* VERIFICATION WORKBENCH (Deep dive for Tender 1024 and others) */}
            {activeTab === 'verification' && (
              <VerificationWorkbench
                tender={selectedTender}
                initialStep={currentWorkflowStep}
                onBackToDashboard={() => setActiveTab('dashboard')}
                onRecordAuditLog={handleRecordAuditLog}
              />
            )}

            {/* TENDERS REGISTRY */}
            {activeTab === 'tenders' && (
              <TendersScreen
                tenders={tenders}
                onSelectTender={handleSelectTenderForVerification}
                onUploadClick={() => setIsUploadModalOpen(true)}
                onOpenScraper={() => setIsScraperModalOpen(true)}
              />
            )}

            {/* CRYPTOGRAPHIC AUDIT TRAIL */}
            {activeTab === 'audit-trail' && (
              <AuditTrailScreen logs={auditLogs} />
            )}

            {/* EVALUATION REPORTS */}
            {activeTab === 'reports' && (
              <ReportsScreen
                tenders={tenders}
                onSelectTenderForWorkbench={handleSelectTenderForVerification}
              />
            )}
          </main>

          {/* Footer */}
          <Footer />
        </>
      )}

      {/* Global Officer Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => setActiveTab('dashboard')}
      />

      {/* Global Upload Tender Modal */}
      <UploadTenderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onAddTender={handleAddNewTender}
      />

      {/* Live Government Tender Scraper Modal */}
      <LiveScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
        onImportTender={handleImportScrapedTender}
      />
    </div>
  );
}
