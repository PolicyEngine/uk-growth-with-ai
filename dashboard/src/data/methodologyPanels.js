// Right-hand freeze-box content for each Model-tab step. Equations are
// parametric; values, where given, sit in a separate section.

export const PANEL_DATA  = [
  { title: 'Why OG-UK', badge: 'Step 1', sections: [
    { label: 'Question → OG-UK feature', type: 'grid', cols: ['OG-UK feature'], rows: [
      { label: 'Does capital deepen?', cells: ['Saving and investment in general equilibrium'] },
      { label: 'Who loses labour income?', cells: ['Households by age and ability'] },
      { label: 'Do revenue and debt change?', cells: ['Fitted tax functions, government budget'] },
      { label: 'Is it UK-specific?', cells: ['UK demographics and calibration'] },
      { label: 'Can it be reproduced?', cells: ['Open source, committed results'] },
    ]},
    { label: 'Not in OG-UK', type: 'output', lines: [
      { icon: '✗', text: 'Unemployment and job search', cls: 'warn' },
      { icon: '✗', text: 'More than one sector (as run)', cls: 'warn' },
    ]},
  ]},
  { title: 'Overlapping generations', badge: 'Step 2', sections: [
    { label: 'Population structure', type: 'math', equations: [
      { label: 'Age cohorts', tex: 's = E+1, \\ldots, E+S \\quad \\text{(economically active)}' },
      { label: 'Ability types', tex: 'j = 1, \\ldots, J \\quad \\text{with probability } \\lambda_j' },
      { label: 'Population', tex: '\\omega_{s,t} \\;\\text{evolves with fertility, mortality, immigration}' },
      { label: 'Oldest cohort', tex: '\\rho_{E+S} = 1' },
    ]},
    { label: 'Values in OG-UK', type: 'output', lines: [
      { icon: '=', text: '\\(S = 80\\) ages (21 to 100), \\(J = 7\\) types', cls: 'info' },
      { icon: '=', text: 'Discount factor \\(\\beta = 0.965\\) for every type', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Productivity \\(e_{j,s}\\) varies by age and type; type is permanent', cls: 'info' },
    ]},
  ]},
  { title: 'Household decisions', badge: 'Step 3', sections: [
    { label: 'Utility components', type: 'math', equations: [
      { label: 'Consumption (CRRA)', tex: 'u(c) = \\frac{c^{\\,1-\\sigma}}{1-\\sigma}' },
      { label: 'Labour disutility', tex: '\\chi^n_s \\cdot g(n) \\quad \\text{(elliptical)}' },
      { label: 'Bequest motive', tex: '\\chi^b_j \\cdot \\rho_s \\cdot \\frac{b\'^{\\,1-\\sigma}}{1-\\sigma}' },
    ]},
    { label: 'Euler equations, simplified (no consumption or wealth tax, bequest term or growth factors)', type: 'math', equations: [
      { label: 'Labour', tex: '\\chi^n_s g\'(n_t) = w_t\\,e_{j,s}(1-\\tau^{\\prime}_{\\text{lab},t})\\,u\'(c_t)' },
      { label: 'Savings', tex: 'u\'(c_t) = \\beta(1-\\rho_s)\\bigl(1+r_{p,t+1}(1-\\tau^{\\prime}_{\\text{cap},t+1})\\bigr)\\,u\'(c_{t+1})' },
    ]},
  ]},
  { title: 'Firms and production', badge: 'Step 4', sections: [
    { label: 'Technology', type: 'math', equations: [
      { label: 'CES production', tex: 'Y_{m,t} = Z_{m,t}\\bigl[\\gamma^{1/\\varepsilon} K_{m,t}^{\\rho} + \\gamma_g^{1/\\varepsilon} K_{g,m,t}^{\\rho} + (1\\!-\\!\\gamma\\!-\\!\\gamma_g)^{1/\\varepsilon}(e^{g_y t}L_{m,t})^{\\rho}\\bigr]^{1/\\rho}' },
      { label: 'Curvature', tex: '\\rho = \\frac{\\varepsilon-1}{\\varepsilon}' },
      { label: 'Wage', tex: 'w_t = p_{m,t} \\cdot \\text{MPL}_{m,t}' },
      { label: 'Rental rate', tex: 'r_t = (1-\\tau^{\\text{corp}})\\,p_{m,t}\\,\\text{MPK}_{m,t} - \\delta + \\tau^{\\text{corp}}\\delta^\\tau + \\tau^{\\text{inv}}\\delta' },
    ]},
    { label: 'In OG-UK', type: 'output', lines: [
      { icon: '=', text: 'Public-capital share \\(\\gamma_g = 0\\), no public investment', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'Cobb-Douglas when \\(\\varepsilon = 1\\); these runs use one industry', cls: 'info' },
    ]},
  ]},
  { title: 'Government', badge: 'Step 5', sections: [
    { label: 'Budget constraint', type: 'math', equations: [
      { label: '', tex: 'D_{t+1} + \\text{Rev}_t = (1+r_{\\text{gov},t})D_t + G_t + I_{g,t} + \\text{Pen}_t + TR_t + UBI_t' },
      { label: 'Before the closure', tex: 'G_t = \\alpha_G Y_t, \\quad TR_t = \\alpha_T Y_t' },
      { label: 'From \\(t_{G1}\\) to \\(t_{G2}\\)', tex: 'G_t \\text{ adjusts towards the debt target; } TR_t = \\alpha_T Y_t' },
    ]},
    { label: 'Tax instruments', type: 'output', lines: [
      { icon: '1', text: 'Income: Gouveia-Strauss, fitted to PolicyEngine UK', cls: 'accent' },
      { icon: '2', text: 'Consumption: VAT and excise', cls: 'info' },
      { icon: '3', text: 'Wealth: progressive three-parameter', cls: 'info' },
      { icon: '4', text: 'Corporate: flat rate by industry', cls: 'info' },
      { icon: '5', text: 'Bequest: on inherited wealth', cls: 'info' },
    ]},
  ]},
  { title: 'Market clearing', badge: 'Step 6', sections: [
    { label: 'Equilibrium conditions', type: 'math', equations: [
      { label: 'Labour', tex: '\\sum_{s,j} \\omega_{s,t} \\lambda_j e_{j,s} n_{j,s,t} = \\sum_m L_{m,t}' },
      { label: 'Capital', tex: 'K_t = K^d_t + K^f_t \\quad (\\text{open economy: } \\zeta_K)' },
      { label: 'Goods', tex: 'Y_{m,t} = C_{m,t} \\;\\; (m < M)' },
      { label: 'Debt', tex: 'D_t = D^d_t + D^f_t \\quad (\\text{foreign share: } \\zeta_D)' },
    ]},
  ]},
  { title: 'Solution method', badge: 'Step 7', sections: [
    { label: 'Two-stage algorithm', type: 'math', equations: [
      { label: 'Outer loop', tex: '\\mathbf{x} = \\{\\bar{r}_p, \\bar{r}, \\bar{w}, \\{\\bar{p}_m\\}, \\overline{BQ}, \\overline{TR}, \\text{factor}\\}' },
      { label: 'Inner loop', tex: '\\text{Solve } 2JS \\text{ Euler equations } \\forall (j,s)' },
      { label: 'Convergence', tex: '\\|\\mathbf{x}^{(i\')} - \\mathbf{x}^{(i)}\\| \\leq \\text{toler}_{\\text{ss}}' },
      { label: 'TPI', tex: '\\text{Guess } \\{\\mathbf{x}_t\\}_{t=1}^T \\to \\text{solve all cohorts} \\to \\text{iterate}' },
    ]},
  ]},
  { title: 'UK calibration', badge: 'Step 8', sections: [
    { label: 'Gouveia-Strauss tax function', type: 'math', equations: [
      { label: 'Effective tax rate', tex: '\\text{ETR}(y) = \\phi_0\\Bigl[1 - \\bigl(1 + \\phi_2\\, y^{\\phi_1}\\bigr)^{-1/\\phi_1}\\Bigr]' },
      { label: 'Marginal (analytical)', tex: '\\text{MTR}(y) = \\phi_0\\Bigl[1 - \\bigl(1 + \\phi_2\\, y^{\\phi_1}\\bigr)^{-(1+\\phi_1)/\\phi_1}\\Bigr]' },
    ]},
    { label: 'Data sources', type: 'output', lines: [
      { icon: '\\(\\to\\)', text: 'ONS: national accounts', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'OBR: fiscal forecasts, debt target', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'HMRC/GOV.UK: tax rates, state pension age', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'UN World Population Prospects, UK (via EAPD-DRB)', cls: 'info' },
      { icon: '\\(\\to\\)', text: 'PolicyEngine UK: tax function estimation', cls: 'info' },
    ]},
  ]},
  { title: 'Static and dynamic analysis', badge: 'Step 9', sections: [
    { label: 'What OG-UK adds', type: 'output', lines: [
      { icon: '+', text: 'Endogenous GDP, wages, interest rates', cls: 'accent' },
      { icon: '+', text: 'Labour supply and saving responses', cls: 'accent' },
      { icon: '+', text: 'Year-by-year transition paths', cls: 'accent' },
      { icon: '+', text: 'Effects by generation', cls: 'accent' },
      { icon: '+', text: 'Fiscal sustainability projections', cls: 'accent' },
    ]},
  ]},
];
