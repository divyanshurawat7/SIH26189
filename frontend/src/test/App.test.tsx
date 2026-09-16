import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { apiClient } from '../api/client';

// Mock API client methods
vi.mock('../api/client', () => ({
  apiClient: {
    getHealth: vi.fn(),
    getOverview: vi.fn(),
    getPerson: vi.fn(),
    getPersonNetwork: vi.fn(),
    getPersonEvidence: vi.fn(),
    getCase: vi.fn(),
    getCaseTimeline: vi.fn(),
    getCaseEvidence: vi.fn(),
    getNetwork: vi.fn(),
    getFindings: vi.fn(),
    getFindingDetail: vi.fn(),
    getCrossCase: vi.fn(),
    getInvestigationDossier: vi.fn(),
    search: vi.fn(),
    getCases: vi.fn(),
    getPersons: vi.fn()
  }
}));

// Mock @xyflow/react directly in test file for JSDOM
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes }: any) => (
    <div data-testid="mock-react-flow">
      {nodes?.map((n: any) => (
        <div key={n.id} data-testid={`rf-node-${n.id}`}>
          {n.data?.id || n.id} - {n.data?.label} - {n.data?.role}
        </div>
      ))}
      {children}
    </div>
  ),
  Background: () => <div data-testid="mock-rf-background" />,
  Controls: () => <div data-testid="mock-rf-controls" />,
  MiniMap: () => <div data-testid="mock-rf-minimap" />,
  Handle: () => <div data-testid="mock-rf-handle" />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  MarkerType: { ArrowClosed: 'arrowclosed' }
}));

describe('SIH26189 Tactical Workstation Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations matching FastAPI backend responses
    (apiClient.getHealth as any).mockResolvedValue({
      status: 'ok',
      service: 'SIH26189 Investigation API',
      dataset: 'synthetic',
      phases_completed: 6
    });

    (apiClient.getCases as any).mockResolvedValue({
      total_cases: 300,
      page: 1,
      page_size: 20,
      total_pages: 15,
      cases: [
        { case_id: 'CASE_0001', crime_type: 'Extortion Racket', fir_id: 'FIR_0001', location_id: 'LOCATION_0041', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0002', crime_type: 'Cyber Financial Scam', fir_id: 'FIR_0002', location_id: 'LOCATION_0012', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0003', crime_type: 'Money Laundering', fir_id: 'FIR_0003', location_id: 'LOCATION_0088', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0004', crime_type: 'Extortion Call Cascade', fir_id: 'FIR_0004', location_id: 'LOCATION_0015', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0005', crime_type: 'Cross-Jurisdictional Fraud', fir_id: 'FIR_0005', location_id: 'LOCATION_0023', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0012', crime_type: 'Financial Transfer Chain', fir_id: 'FIR_0012', location_id: 'LOCATION_0045', status: 'UNDER_INVESTIGATION' },
        { case_id: 'CASE_0025', crime_type: 'Cross-Border Syndicate Operation', fir_id: 'FIR_0025', location_id: 'LOCATION_0099', status: 'UNDER_INVESTIGATION' }
      ]
    });

    (apiClient.getPersons as any).mockResolvedValue({
      total_persons: 1500,
      page: 1,
      page_size: 20,
      total_pages: 75,
      persons: [
        { person_id: 'PERSON_1476', name: 'Person 1476', city: 'Mumbai', occupation: 'Businessman', predicted_role: 'UPSTREAM_COORDINATOR', confidence: 0.95, criminal_significance: true },
        { person_id: 'PERSON_0026', name: 'Person 0026', city: 'Delhi', occupation: 'Trader', predicted_role: 'BROKER', confidence: 0.92, criminal_significance: true },
        { person_id: 'PERSON_0397', name: 'Person 0397', city: 'Kolkata', occupation: 'Agent', predicted_role: 'BROKER', confidence: 0.89, criminal_significance: true },
        { person_id: 'PERSON_0405', name: 'Person 0405', city: 'Chennai', occupation: 'Manager', predicted_role: 'BROKER', confidence: 0.88, criminal_significance: true },
        { person_id: 'PERSON_0432', name: 'Person 0432', city: 'Bangalore', occupation: 'Technician', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.86, criminal_significance: true },
        { person_id: 'PERSON_0553', name: 'Person 0553', city: 'Delhi', occupation: 'Merchant', predicted_role: 'CIVILIAN', confidence: 0.88, criminal_significance: false },
        { person_id: 'PERSON_1459', name: 'Person 1459', city: 'Hyderabad', occupation: 'Driver', predicted_role: 'OPERATIONAL_MEMBER', confidence: 0.91, criminal_significance: true }
      ]
    });

    (apiClient.getOverview as any).mockResolvedValue({
      total_persons: 1500,
      total_cases: 300,
      total_networks: 12,
      total_findings: 329,
      top_influencers: [
        {
          person_id: 'PERSON_1476',
          name: 'Person 1476',
          predicted_role: 'UPSTREAM_COORDINATOR',
          confidence: 0.95,
          degree: 18,
          betweenness: 0.045
        },
        {
          person_id: 'PERSON_0026',
          name: 'Person 0026',
          predicted_role: 'BROKER',
          confidence: 0.92,
          degree: 14,
          betweenness: 0.038
        }
      ],
      recent_activity: [
        {
          finding_id: 'FINDING_0001',
          pattern_type: 'layered_financial_call_chain',
          case_id: 'CASE_0001',
          confidence: 0.96,
          narrative: 'Cascading financial transfer aligned with telecommunications burst'
        }
      ]
    });

    (apiClient.getInvestigationDossier as any).mockResolvedValue({
      case_id: 'CASE_0001',
      case_summary: {
        crime_type: 'Extortion',
        fir_id: 'FIR_0001',
        incident_date: '2024-03-15',
        location: 'LOCATION_0041'
      },
      upstream_coordinator: 'PERSON_1476',
      brokers: ['PERSON_0026', 'PERSON_0397', 'PERSON_0405'],
      operational_members: ['PERSON_1459'],
      operational_chain: ['PERSON_1476', 'PERSON_0026', 'PERSON_0397', 'PERSON_0405', 'PERSON_1459', 'CASE_0001'],
      evidence_traceability: {
        total_records: 18,
        evidence_diversity_score: 7,
        categories: ['CDR', 'FINANCIAL_TRANSACTION', 'FIR_RECORD', 'LOCATION_EVENT']
      },
      confidence: 0.95,
      investigator_narrative: 'Mastermind PERSON_1476 orchestrated extortion via 3 intermediary brokers to isolate from field operative PERSON_1459.',
      communication_evidence: [
        { source_record_id: 'CALL_001', timestamp: '2024-03-14 10:00:00', entities: ['PERSON_1476', 'PERSON_0026'], confidence: 0.95 }
      ],
      financial_evidence: [
        { source_record_id: 'TXN_001', amount: 18885.32, timestamp: '2024-03-14 11:30:00', entities: ['ACC_1476', 'ACC_0026'], confidence: 0.96 }
      ]
    });

    (apiClient.getCaseTimeline as any).mockResolvedValue({
      case_id: 'CASE_0001',
      events: [
        {
          event_type: 'CDR',
          timestamp: '2024-03-14 10:00:00',
          source_record_id: 'CALL_001',
          description: 'Telecommunications contact initiating operation',
          entities: ['PERSON_1476', 'PERSON_0026']
        },
        {
          event_type: 'FINANCIAL_TRANSACTION',
          timestamp: '2024-03-14 11:30:00',
          source_record_id: 'TXN_001',
          description: 'Transfer of funds to broker account',
          entities: ['PERSON_0026', 'PERSON_0397']
        }
      ]
    });

    (apiClient.getCase as any).mockResolvedValue({
      case_id: 'CASE_0001',
      crime_type: 'Extortion',
      status: 'UNDER_INVESTIGATION',
      fir_information: {
        fir_id: 'FIR_0001',
        date: '2024-03-15',
        section: '384 IPC',
        location_id: 'LOCATION_0041'
      },
      important_persons: {
        upstream_coordinator: 'PERSON_1476',
        brokers: ['PERSON_0026', 'PERSON_0397', 'PERSON_0405'],
        operational_members: ['PERSON_1459'],
        financial_facilitators: [],
        operational_chain: ['PERSON_1476', 'PERSON_0026', 'PERSON_0397', 'PERSON_0405', 'PERSON_1459', 'CASE_0001']
      },
      investigation_narrative: 'Extortion racket targeting local merchants.',
      operational_chain: ['PERSON_1476', 'PERSON_0026', 'PERSON_0397', 'PERSON_0405', 'PERSON_1459', 'CASE_0001'],
      evidence_diversity_score: 7,
      timeline_events_count: 12
    });

    (apiClient.getCaseEvidence as any).mockResolvedValue({
      case_id: 'CASE_0001',
      total_evidence_records: 12,
      evidence_by_category: {
        CDR: [
          {
            source_type: 'CDR',
            source_record_id: 'CALL_001',
            timestamp: '2024-03-14 10:00:00',
            description: 'Direct call from coordinator to broker',
            entities: ['PERSON_1476', 'PERSON_0026'],
            confidence: 0.95
          }
        ]
      }
    });

    (apiClient.getPerson as any).mockImplementation((personId: string) => {
      if (personId === 'PERSON_0553') {
        return Promise.resolve({
          person_id: 'PERSON_0553',
          name: 'Person 0553',
          city: 'Delhi',
          occupation: 'Merchant',
          predicted_role: 'CIVILIAN',
          confidence: 0.88,
          criminal_significance: false,
          graph_features: {
            degree: 15,
            in_degree: 8,
            out_degree: 7,
            weighted_degree: 80,
            betweenness_centrality: 0.012,
            connected_cases_count: 0
          },
          connected_cases: [],
          suspicious_patterns: [],
          evidence_diversity: 1,
          investigator_narrative: 'Verified Non-Criminal Civilian Control: High degree driven entirely by benign commercial calls. 0 criminal predicates.'
        });
      }

      return Promise.resolve({
        person_id: 'PERSON_1476',
        name: 'Person 1476',
        city: 'Mumbai',
        occupation: 'Businessman',
        predicted_role: 'UPSTREAM_COORDINATOR',
        confidence: 0.95,
        criminal_significance: true,
        graph_features: {
          degree: 18,
          in_degree: 10,
          out_degree: 8,
          weighted_degree: 92,
          betweenness_centrality: 0.045,
          connected_cases_count: 2
        },
        connected_cases: ['CASE_0001'],
        suspicious_patterns: ['layered_financial_call_chain'],
        evidence_diversity: 7,
        investigator_narrative: 'Mastermind operating with 0 direct crime scene edges. Unmasked via 5-hop cascading chain.',
        hybrid_intelligence: {
          person_id: 'PERSON_1476',
          role: 'UPSTREAM_COORDINATOR',
          confidence: 0.95,
          rule_prediction: 'UPSTREAM_COORDINATOR',
          rule_confidence: 0.95,
          rule_score: 0.57,
          ml_prediction: 'UPSTREAM_COORDINATOR',
          ml_confidence: 0.92,
          ml_score: 0.23,
          evidence_score: 0.15,
          agreement: true,
          confidence_level: 'HIGH',
          ml_probabilities: { UPSTREAM_COORDINATOR: 0.92 }
        },
        explainability: {
          person_id: 'PERSON_1476',
          role: 'UPSTREAM_COORDINATOR',
          confidence: 0.95,
          flagged: true,
          summary: 'Person 1476 is flagged as potential Upstream Coordinator based on multi-hop communication and financial correlation.',
          reason_count: 2,
          high_severity_reasons: 2,
          reasons: [
            {
              type: 'DIRECT_RELATIONSHIP',
              severity: 'HIGH',
              title: 'Direct relationship with Person 0026',
              reason: 'PERSON_1476 has direct communication and financial ties with PERSON_0026.',
              other_person: 'PERSON_0026'
            }
          ],
          evidence_count: 7,
          evidence_source_categories: ['CDR', 'FINANCIAL_TRANSACTION']
        }
      });
    });

    (apiClient.getPersonNetwork as any).mockResolvedValue({
      person_id: 'PERSON_1476',
      total_direct_contacts: 2,
      direct_connections: ['PERSON_0026', 'PERSON_0397'],
      roles_of_connected_persons: {
        'PERSON_0026': 'BROKER',
        'PERSON_0397': 'BROKER'
      }
    });

    (apiClient.getPersonEvidence as any).mockResolvedValue([
      {
        source_type: 'CDR',
        source_record_id: 'CALL_001',
        timestamp: '2024-03-14 10:00:00',
        description: 'Command phone call',
        entities: ['PERSON_1476', 'PERSON_0026'],
        confidence: 0.95
      }
    ]);

    (apiClient.getFindings as any).mockResolvedValue([
      {
        finding_id: 'FINDING_0001',
        finding_type: 'layered_financial_call_chain',
        entities: ['PERSON_1476', 'PERSON_0026', 'PERSON_1459'],
        case: 'CASE_0001',
        score: 4.85,
        confidence: 0.96,
        evidence_count: 6,
        narrative: 'Layered coordination between remote coordinator and operational member.'
      }
    ]);

    (apiClient.getFindingDetail as any).mockResolvedValue({
      finding_id: 'FINDING_0001',
      finding_type: 'layered_financial_call_chain',
      entities: ['PERSON_1476', 'PERSON_0026', 'PERSON_1459'],
      case: 'CASE_0001',
      score: 4.85,
      confidence: 0.96,
      narrative: 'Layered coordination between remote coordinator and operational member.',
      supporting_evidence: [
        {
          source_type: 'FINANCIAL_TRANSACTION',
          source_record_id: 'TXN_001',
          description: 'Wire transfer to intermediary'
        }
      ]
    });

    (apiClient.getCrossCase as any).mockImplementation((entityId: string) => {
      if (entityId === 'LOCATION_0011' || entityId === 'PERSON_0553') {
        return Promise.resolve({
          entity: entityId,
          connected_cases: ['CASE_0001', 'CASE_0002'],
          strength_of_linkage: 'incidental_overlap',
          explanation: 'Incidental civilian overlap. Shared location with no multi-hop criminal coordination.',
          supporting_evidence: ['LOC_EV_001']
        });
      }

      return Promise.resolve({
        entity: entityId,
        connected_cases: ['CASE_0001', 'CASE_0005', 'CASE_0012'],
        strength_of_linkage: 'strong_criminal_coordination',
        explanation: 'Strong criminal coordination across multiple jurisdictions with recurring operational members.',
        supporting_evidence: ['TXN_001', 'CALL_001']
      });
    });

    (apiClient.search as any).mockResolvedValue({
      query: 'PERSON_1476',
      total_matches: 1,
      results: [
        {
          entity_id: 'PERSON_1476',
          entity_type: 'person',
          display_name: 'Person 1476',
          role_or_status: 'UPSTREAM_COORDINATOR',
          details: 'Businessman • Mumbai'
        }
      ]
    });
  });

  it('renders landing dashboard with accurate graph metrics and top influencers', async () => {
    render(<App />);

    // Verify Title & Subtitle
    expect(await screen.findByText(/Case Directory & Operational Telemetry/i)).toBeInTheDocument();

    // Verify Metric Tiles
    expect(await screen.findByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('329')).toBeInTheDocument();

    // Verify Flagship Demo Card
    expect(screen.getByText(/PRIMARY DEMO DOCKET: CASE_0001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PERSON_1476/i).length).toBeGreaterThan(0);

    // Verify Top Influencers Table
    expect(screen.getAllByText('PERSON_1476').length).toBeGreaterThan(0);
    expect(screen.getAllByText('COORDINATOR').length).toBeGreaterThan(0);
  });

  it('navigates to Flagship Demo view and displays the 5-hop operational chain', async () => {
    render(<App />);

    // Click Flagship Demo button in banner or navbar
    const flagshipBtn = await screen.findByText(/Inspect Flagship \(CASE_0001\)/i);
    fireEvent.click(flagshipBtn);

    // Verify Case Docket View Header
    expect(await screen.findByText(/POLICE STATION & JURISDICTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Recovered Directed Operational Chain/i)).toBeInTheDocument();

    // Verify Recovered Chain Entities
    expect(screen.getAllByText('PERSON_1476').length).toBeGreaterThan(0);
    expect(screen.getByText('PERSON_0026')).toBeInTheDocument();
    expect(screen.getByText('PERSON_0397')).toBeInTheDocument();
    expect(screen.getByText('PERSON_0405')).toBeInTheDocument();
    expect(screen.getAllByText('PERSON_1459').length).toBeGreaterThan(0);
  });

  it('audits innocent control PERSON_0553 and shows Verified Non-Criminal badge', async () => {
    render(<App />);

    // Click Innocent Shortcut in sidebar
    const innocentBtn = await screen.findByTestId('shortcut-innocent-0553');
    fireEvent.click(innocentBtn);

    // Verify Verified Non-Criminal Badges
    expect((await screen.findAllByText(/VERIFIED NON-CRIMINAL/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/False-Positive Protection Audit/i)).toBeInTheDocument();
    expect(screen.getByText(/benign civilian contact/i)).toBeInTheDocument();
  });

  it('navigates to Case Investigation page for CASE_0001', async () => {
    render(<App />);

    // Navigate to Cases tab
    const casesNavBtn = await screen.findByTestId('nav-case');
    fireEvent.click(casesNavBtn);

    // Verify Case Docket Loaded
    expect(await screen.findByText(/FIR: FIR_0001/i)).toBeInTheDocument();
    expect(screen.getAllByText(/EXTORTION/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/384 IPC/i)).toBeInTheDocument();
  });

  it('navigates to Behavioral Findings page and applies filters', async () => {
    render(<App />);

    // Navigate to Findings tab
    const findingsNavBtn = await screen.findByTestId('nav-timeline');
    fireEvent.click(findingsNavBtn);

    // Verify Findings page header
    expect(await screen.findByText(/Timeline Sequence & Behavioral Pattern Detection/i)).toBeInTheDocument();

    // Verify findings table has finding
    expect(await screen.findByText('FINDING_0001')).toBeInTheDocument();
    expect(screen.getByText(/LAYERED FINANCIAL CALL CHAIN/i)).toBeInTheDocument();
  });

  it('navigates to Network Graph view and displays topology nodes', async () => {
    render(<App />);

    // Navigate to Graph tab
    const graphNavBtn = await screen.findByTestId('nav-graph');
    fireEvent.click(graphNavBtn);

    // Verify Coordinator Isolation Badge
    expect(await screen.findByText(/COORDINATOR ISOLATION VERIFIED/i)).toBeInTheDocument();
    expect(screen.getByText(/0 direct crime-scene edges/i)).toBeInTheDocument();

    // Verify Nodes in topology
    expect(screen.getAllByText(/PERSON_1476/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PERSON_1459/i).length).toBeGreaterThan(0);
  });

  it('navigates to Cross-Case Linkages page and evaluates criminal vs incidental overlaps', async () => {
    render(<App />);

    // Navigate to Cross-Case tab
    const crossCaseNavBtn = await screen.findByTestId('nav-cross-case');
    fireEvent.click(crossCaseNavBtn);

    // Verify Header
    expect(await screen.findByText(/Cross-Case Syndicate Coordination vs. Incidental Overlap/i)).toBeInTheDocument();

    // Verify initial syndicate NET_001 evaluation
    expect(await screen.findByText(/VERIFIED CRIMINAL COORDINATION/i)).toBeInTheDocument();
    expect(screen.getByText(/ORGANIZED CRIME/i)).toBeInTheDocument();

    // Click incidental preset
    const incidentalPreset = screen.getByText(/LOCATION_0011 \(Civilian Overlap\)/i);
    fireEvent.click(incidentalPreset);

    // Verify incidental badge appears
    expect(await screen.findByText(/SUPPRESSED BENIGN/i)).toBeInTheDocument();
  });

  it('performs global search and navigates to entered person dossier', async () => {
    render(<App />);

    // Search input in navbar
    const searchInputs = await screen.findAllByPlaceholderText(/Search person name/i);
    const searchInput = searchInputs[0];
    fireEvent.change(searchInput, { target: { value: 'PERSON_1476' } });
    fireEvent.submit(searchInput.closest('form')!);

    // Verify Person Dossier loaded
    expect(await screen.findByText(/Forensic Evidence Traceability & Rationale/i)).toBeInTheDocument();
    expect(screen.getByText(/Dual-Channel Inference:/i)).toBeInTheDocument();
  });

  it('displays an error banner when API is unreachable', async () => {
    (apiClient.getOverview as any).mockRejectedValueOnce(new Error('Network Connection Refused'));

    render(<App />);

    // Verify Error Banner
    expect(await screen.findByText(/SYSTEM ERROR:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Connection Refused/i)).toBeInTheDocument();
  });

  it('navigates to Persons Directory and opens a suspect file', async () => {
    render(<App />);

    // 1. Navigate to Persons tab
    const personsBtn = await screen.findByTestId('nav-person');
    fireEvent.click(personsBtn);

    // Verify Directory loaded with profiles
    expect(await screen.findByText(/PERSON_0432/i)).toBeInTheDocument();

    // 2. Click Open Dossier on PERSON_0432 row
    const personCell = screen.getByText('PERSON_0432');
    const personRow = personCell.closest('tr')!;
    const openDossierBtn = personRow.querySelector('button')!;
    fireEvent.click(openDossierBtn);

    // 3. Verify Dossier loaded for PERSON_0432
    expect(await screen.findByText(/Forensic Evidence Traceability & Rationale/i)).toBeInTheDocument();
  });

  it('navigates to Case Dossier Export view with print readiness', async () => {
    render(<App />);

    // Navigate to Dossier export tab
    const dossierBtn = await screen.findByTestId('nav-dossier');
    fireEvent.click(dossierBtn);

    // Verify Official Dossier Document Header
    expect(await screen.findByText(/CONFIDENTIAL DOSSIER/i)).toBeInTheDocument();
    expect(screen.getByText(/Print Official Dossier/i)).toBeInTheDocument();
    expect(screen.getByText(/SUPERVISING INVESTIGATION OFFICER \(SIT-TASKFORCE\)/i)).toBeInTheDocument();
  });

  it('renders AI Role Intelligence card and Explainability outputs on Person Investigation page', async () => {
    render(<App />);

    // Navigate to Person Investigation for PERSON_1476 via sidebar shortcut
    const personShortcut = await screen.findByTestId('shortcut-mastermind-1476');
    fireEvent.click(personShortcut);

    // Verify AI Role Intelligence card header & agreement badge
    expect(await screen.findByText(/AI Role Intelligence & Hybrid Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Model & Rule Agreement/i)).toBeInTheDocument();
    expect(screen.getByText(/HIGH CONFIDENCE \(95%\)/i)).toBeInTheDocument();

    // Verify Explainability summary and reasons
    expect(screen.getByText(/Investigator Forensic Explanation/i)).toBeInTheDocument();
    expect(screen.getByText(/Person 1476 is flagged as potential Upstream Coordinator/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct relationship with Person 0026/i)).toBeInTheDocument();
  });
});
