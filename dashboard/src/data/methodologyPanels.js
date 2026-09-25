// Right-hand freeze-box content for each Methodology step.

export const PANEL_DATA  = [
  { title: 'Overlapping generations', badge: 'Step 1', sections: [
    { label: 'Population structure', type: 'math', equations: [
      { label: 'Age cohorts', tex: 's = E+1, \\ldots, E+S \\quad \\text{(economically active)}' },
      { label: 'Ability types', tex: 'j = 1, \\ldots, J \\quad \\text{with probability } \\lambda_j' },
      { label: 'Population', tex: '\\omega_{s,t} \\;\\text{evolves with fertility, mortality, immigration}' },
    ]},
    { label: 'Heterogeneity', type: 'output', lines: [
      { icon: '\\(\\to\\)', text: 'Each type has own \\(\\beta_j\\), \\(\\chi^b_j\\), \\(e_{j,s}\\)', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Productivity \\(e_{j,s}\\) varies by age and type', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Type assigned at birth, permanent', cls: 'info' },
    ]}
  ]},
  { title: 'Household decisions', badge: 'Step 2', sections: [
    { label: 'Utility components', type: 'math', equations: [
      { label: 'Consumption', tex: 'u(c) = \\frac{c^{\\,1-\\sigma}}{1-\\sigma}' },
      { label: 'Labour disutility', tex: '\\chi^n_s \\cdot g(n) \\quad \\text{(elliptical)}' },
      { label: 'Bequest motive', tex: '\\chi^b_j \\cdot \\rho_s \\cdot \\frac{b\'^{\\,1-\\sigma}}{1-\\sigma}' },
    ]},
    { label: 'Euler equations', type: 'math', equations: [
      { label: 'Labour FOC', tex: '\\chi^n_s g\'(n) = w\\,e_{j,s}(1-\\tau\'_{\\text{lab}})\\,u\'(c)' },
      { label: 'Savings Euler', tex: 'u\'(c_t) = \\beta_j(1-\\rho_s)(1+r_{p,t+1}(1-\\tau\'_{\\text{cap}}))\\,u\'(c_{t+1})' },
    ]}
  ]},
  { title: 'Firms & production', badge: 'Step 3', sections: [
    { label: 'Technology', type: 'math', equations: [
      { label: 'CES production', tex: 'Y_m = Z_m\\bigl[\\gamma K_m^\\rho + \\gamma_g K_{g,m}^\\rho + (1\\!-\\!\\gamma\\!-\\!\\gamma_g)(e^{g_y t}L_m)^\\rho\\bigr]^{1/\\rho}' },
      { label: 'Wage', tex: 'w = p_m \\cdot \\text{MPL}_m' },
      { label: 'Rental rate', tex: 'r = (1-\\tau^{\\text{corp}})\\,p_m\\,\\text{MPK}_m - \\delta + \\tau^{\\text{corp}}\\delta^\\tau + \\tau^{\\text{inv}}\\delta' },
    ]},
    { label: 'Features', type: 'output', lines: [
      { icon: '\\(\\to\\)', text: '\\(M\\) industries, perfect competition', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Public capital \\(K_g\\) generates rents', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Nests Cobb-Douglas when \\(\\varepsilon \\to 1\\)', cls: 'info' },
    ]}
  ]},
  { title: 'Government', badge: 'Step 4', sections: [
    { label: 'Budget constraint', type: 'math', equations: [
      { label: '', tex: 'D_{t+1} + \\text{Rev}_t = (1+r_{\\text{gov}})D_t + G + I_g + \\text{Pen} + TR + UBI' },
    ]},
    { label: 'Tax instruments', type: 'output', lines: [
      { icon: '1', text: 'Income: Gouveia-Strauss from PolicyEngine', cls: 'accent' },
      { icon: '2', text: 'Consumption: VAT + excise', cls: 'info' },
      { icon: '3', text: 'Wealth: progressive 3-parameter', cls: 'info' },
      { icon: '4', text: 'Corporate: flat rate by industry', cls: 'info' },
      { icon: '5', text: 'Bequest: on inherited wealth', cls: 'info' },
    ]}
  ]},
  { title: 'Market clearing', badge: 'Step 5', sections: [
    { label: 'Equilibrium conditions', type: 'math', equations: [
      { label: 'Labour', tex: '\\sum_{s,j} \\omega_s \\lambda_j e_{j,s} n_{j,s} = \\sum_m L_m' },
      { label: 'Capital', tex: 'K = K^d + K^f \\quad (\\text{open economy: } \\zeta_K)' },
      { label: 'Goods', tex: 'Y_m = C_m \\;\\; (m < M)' },
      { label: 'Debt', tex: 'D = D^d + D^f \\quad (\\text{foreign share: } \\zeta_D)' },
    ]},
  ]},
  { title: 'Solution method', badge: 'Step 6', sections: [
    { label: 'Two-stage algorithm', type: 'math', equations: [
      { label: 'Outer loop', tex: '\\mathbf{x} = \\{\\bar{r}_p, \\bar{r}, \\bar{w}, \\{\\bar{p}_m\\}, \\overline{BQ}, \\overline{TR}, \\text{factor}\\}' },
      { label: 'Inner loop', tex: '\\text{Solve } 2JS \\text{ Euler equations } \\forall (j,s)' },
      { label: 'Convergence', tex: '\\|\\mathbf{x}^{(i\')} - \\mathbf{x}^{(i)}\\| \\leq \\text{toler}_{\\text{ss}}' },
      { label: 'TPI', tex: '\\text{Guess } \\{\\mathbf{x}_t\\}_{t=1}^T \\to \\text{solve all cohorts} \\to \\text{iterate}' },
    ]},
  ]},
  { title: 'UK calibration', badge: 'Step 7', sections: [
    { label: 'GS tax function', type: 'math', equations: [
      { label: 'Effective tax rate', tex: '\\text{ETR}(y) = \\phi_0\\Bigl[1 - \\bigl(1 + \\phi_2\\, y^{\\phi_1}\\bigr)^{-1/\\phi_1}\\Bigr]' },
      { label: 'Marginal (analytical)', tex: '\\text{MTR}(y) = \\phi_0\\Bigl[1 - \\bigl(1 + \\phi_2\\, y^{\\phi_1}\\bigr)^{-(1+\\phi_1)/\\phi_1}\\Bigr]' },
    ]},
    { label: 'Data sources', type: 'output', lines: [
      { icon: '\\(\\to\\)', text: 'ONS: GDP, national accounts anchor', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'OBR: fiscal forecasts, debt target', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'HMRC/GOV.UK: tax rates, SPA', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'UN WPP: demographics (country 826)', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'PolicyEngine: tax function estimation', cls: 'info' },
    ]}
  ]},
  { title: 'Static vs dynamic', badge: 'Step 8', sections: [
    { label: 'What OG-UK adds', type: 'output', lines: [
      { icon: '+', text: 'endogenous GDP, wages, interest rates', cls: 'accent' },
      { icon: '+', text: 'labour supply and savings responses', cls: 'accent' },
      { icon: '+', text: 'year-by-year transition paths', cls: 'accent' },
      { icon: '+', text: 'generational incidence (age-varying impacts)', cls: 'accent' },
      { icon: '+', text: 'fiscal sustainability projections', cls: 'accent' },
    ]},
    { label: 'Active development', type: 'output', lines: [
      { icon: '\\(\\to\\)', text: 'Multi-industry calibration', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Tax function refinement', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'OBR-grounded transition charts', cls: 'info' },
    ]}
  ]},
  { title: 'OG-UK vs OBR', badge: 'Step 9', sections: [
    { label: 'OBR EFO March 2026', type: 'output', lines: [
      { icon: '=', text: 'Real GDP growth 2027-30: 1.60%  (EFO ¶1.9)', cls: 'accent' },
      { icon: '=', text: 'Productivity growth, medium term: 1.0%  (¶1.2)', cls: 'info' },
      { icon: '=', text: 'Labour supply growth by 2030: 0.5%  (¶1.2)', cls: 'info' },
      { icon: '=', text: 'Potential output growth 2030: 1.5%  (¶2.10)', cls: 'info' },
      { icon: '=', text: 'Potential output growth 2026: 1.2%  (¶2.10)', cls: 'info' },
    ]},
    { label: 'OG-UK no-AI baseline', type: 'output', lines: [
      { icon: '+', text: 'Real GDP growth 2027-30: 1.67%  (+0.07pp)', cls: 'success' },
      { icon: '+', text: 'Productivity g_y: 1.1%  (+0.10pp)', cls: 'info' },
      { icon: '+', text: 'Labour supply g_n: 0.63%  (+0.13pp)', cls: 'info' },
      { icon: '+', text: 'Potential output 2030: 1.73%  (+0.23pp)', cls: 'info' },
      { icon: '+', text: 'Potential output 2026: 1.85%  (+0.65pp)', cls: 'info' },
    ]}
  ]}
];
