import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { NetworkGraphView } from './pages/NetworkGraphView';
import { PersonInvestigation } from './pages/PersonInvestigation';
import { CaseInvestigation } from './pages/CaseInvestigation';
import { TimelinePatternView } from './pages/TimelinePatternView';
import { CaseDossierView } from './pages/CaseDossierView';
import { CrossCaseView } from './pages/CrossCaseView';
import { saveRecentInvestigation } from './utils/storage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>('CASE_0001');

  const handleNavigate = (
    type: string,
    id?: string
  ) => {
    if (type === 'person' || type === 'persons') {
      setCurrentTab('person');
      if (id) {
        setSelectedPersonId(id);
        saveRecentInvestigation(id, 'person');
      } else {
        setSelectedPersonId(null);
      }
    } else if (type === 'case' || type === 'cases') {
      setCurrentTab('case');
      if (id) {
        setSelectedCaseId(id);
        saveRecentInvestigation(id, 'case');
      } else {
        setSelectedCaseId(null);
      }
    } else if (type === 'graph' || type === 'flagship') {
      setCurrentTab('graph');
      if (id) setSelectedCaseId(id);
      saveRecentInvestigation(id || 'CASE_0001', 'case');
    } else if (type === 'dossier') {
      setCurrentTab('dossier');
      if (id) setSelectedCaseId(id);
    } else if (type === 'timeline' || type === 'findings') {
      setCurrentTab('timeline');
      if (id) setSelectedCaseId(id);
    } else if (type === 'cross-case' || type === 'network') {
      setCurrentTab('cross-case');
      if (id) saveRecentInvestigation(id, 'network');
    } else {
      setCurrentTab(type);
      if (id) {
        if (id.startsWith('PERSON_')) {
          setSelectedPersonId(id);
          saveRecentInvestigation(id, 'person');
        } else if (id.startsWith('CASE_')) {
          setSelectedCaseId(id);
          saveRecentInvestigation(id, 'case');
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Chrome: Classification Banner & Header */}
      <Navbar
        onNavigate={handleNavigate}
        activeCaseId={selectedCaseId}
      />

      {/* Main Workspace Frame */}
      <div className="app-container">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          selectedPersonId={selectedPersonId}
          selectedCaseId={selectedCaseId}
          onSelectTab={(tab, id) => handleNavigate(tab, id)}
        />

        {/* Active Workspace Viewport */}
        <main className="main-content">
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={handleNavigate} />
          )}

          {(currentTab === 'graph' || currentTab === 'flagship') && (
            <NetworkGraphView
              caseId={selectedCaseId || 'CASE_0001'}
              onNavigate={handleNavigate}
            />
          )}

          {(currentTab === 'person' || currentTab === 'persons') && (
            <PersonInvestigation
              personId={selectedPersonId}
              onNavigate={handleNavigate}
            />
          )}

          {(currentTab === 'case' || currentTab === 'cases') && (
            <CaseInvestigation
              caseId={selectedCaseId}
              onNavigate={handleNavigate}
            />
          )}

          {(currentTab === 'timeline' || currentTab === 'findings') && (
            <TimelinePatternView
              caseId={selectedCaseId || 'CASE_0001'}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'dossier' && (
            <CaseDossierView
              caseId={selectedCaseId || 'CASE_0001'}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'cross-case' && (
            <CrossCaseView onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
