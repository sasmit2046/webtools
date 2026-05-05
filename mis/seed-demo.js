/* ============================================================
   PMS Module: seed-demo.js  (COMPREHENSIVE)
   Loads LAST. Re-seeds every TABLE registered by every module
   with rich, realistic demo data so a freshly created database
   shows real content on every page (Dashboard, Programs,
   Planning, Agreements + tabs, Financials, Reports, Letters,
   Employees, Salary, Leaves, Wards, Settings, Notifications,
   Roles, Banks, Report Categories, Letter Templates, etc.).

   Safe to load every time — only fills tables that are empty.
   ============================================================ */

(function () {
    if (typeof seedData !== 'function') return;

    // Make sure every module's table is registered for Excel persistence
    [
        'employees', 'wards', 'app_settings',
        'salaries', 'leave_types', 'leave_applications',
        'roles', 'banks', 'report_categories', 'agreement_reports',
        'committee_members', 'agreement_letters', 'budget_details',
        'letter_categories', 'letter_templates', 'notifications',
        'plans', 'programs', 'agreements', 'financials', 'expenses',
        'departments', 'budget_titles', 'program_types', 'budget_sources',
        'budget_areas', 'budget_levels', 'work_types', 'budget_types',
        'users', 'report_categories'
    ].forEach(t => { if (typeof TABLES !== 'undefined' && !TABLES.includes(t)) TABLES.push(t); });

    const _origSeed = seedData;
    seedData = function (c) {
        _origSeed(c);
        const now = Date.now();
        const day = 86400000;

        /* ---------- WARDS (1..9) ---------- */
        if (!c.wards || !c.wards.length) {
            c.wards = Array.from({ length: 9 }, (_, i) => ({
                id: i + 1, ward_no: i + 1,
                name: `Ward ${i + 1}`, name_np: `वडा ${i + 1}`, is_active: 1
            }));
        }

        /* ---------- APP SETTINGS ---------- */
        if (!c.app_settings || c.app_settings.length < 6) {
            c.app_settings = [
                { id: 1, key: 'app_name', value: 'PMS' },
                { id: 2, key: 'app_subtitle', value: 'Planning Management System' },
                { id: 3, key: 'org_name', value: 'नगरपालिका कार्यालय' },
                { id: 4, key: 'org_name_en', value: 'Municipality Office' },
                { id: 5, key: 'org_address', value: 'काठमाडौं, नेपाल' },
                { id: 6, key: 'org_phone', value: '+977-1-4000000' },
                { id: 7, key: 'org_email', value: 'info@municipality.gov.np' },
                { id: 8, key: 'fiscal_year', value: '2081-82' },
                { id: 9, key: 'currency', value: 'NPR' },
                { id: 10, key: 'version', value: '4.0.0' },
                { id: 11, key: 'developer', value: 'PMS Development Team' }
            ];
        }

        /* ---------- ROLES (extended) ---------- */
        if (!c.roles || c.roles.length < 3) {
            const ALL_PERMS = (typeof PERMISSIONS !== 'undefined' && PERMISSIONS.length)
                ? PERMISSIONS.join(',')
                : 'dashboard.view,programs.view,programs.add,programs.edit,programs.delete,planning.view,planning.add,planning.edit,planning.delete,planning.approve,agreements.view,agreements.add,agreements.edit,agreements.delete,agreements.print,financial.view,financial.add,financial.edit,financial.delete,reports.view,reports.export,users.view,users.add,users.edit,users.delete,settings.view,settings.edit,notifications.view,import.programs,salary.view,salary.edit,salary.delete,leave.view,leave.apply,leave.approve,leave.delete,leave.types.manage,wards.view,wards.add,wards.edit,wards.delete,employees.view,employees.add,employees.edit,employees.delete,employees.approve,backup.export,backup.import,letter_header.edit';
            c.roles = [
                { id: 1, name: 'admin', label: 'Administrator', permissions: ALL_PERMS, is_system: 1 },
                { id: 2, name: 'data_entry', label: 'Data Entry Operator',
                  permissions: 'dashboard.view,programs.view,programs.add,programs.edit,planning.view,planning.add,planning.edit,agreements.view,agreements.add,agreements.edit,agreements.print,financial.view,financial.add,reports.view,reports.export,notifications.view,import.programs,employees.view,employees.add,employees.edit,salary.view,leave.view,leave.apply,wards.view',
                  is_system: 0 },
                { id: 3, name: 'viewer', label: 'Viewer (Read Only)',
                  permissions: 'dashboard.view,programs.view,planning.view,agreements.view,agreements.print,financial.view,reports.view,notifications.view,employees.view,salary.view,leave.view,wards.view',
                  is_system: 0 },
                { id: 4, name: 'hr_manager', label: 'HR Manager',
                  permissions: 'dashboard.view,employees.view,employees.add,employees.edit,employees.delete,employees.approve,salary.view,salary.edit,salary.delete,leave.view,leave.apply,leave.approve,leave.delete,leave.types.manage,reports.view,reports.export,notifications.view',
                  is_system: 0 },
                { id: 5, name: 'finance_officer', label: 'Finance Officer',
                  permissions: 'dashboard.view,programs.view,planning.view,agreements.view,financial.view,financial.add,financial.edit,financial.delete,reports.view,reports.export,salary.view,salary.edit,notifications.view',
                  is_system: 0 }
            ];
        }

        /* ---------- USERS (extended demo accounts) ---------- */
        if (!c.users || c.users.length < 5) {
            c.users = [
                { id: 1, name: 'System Admin', email: 'admin@pms.gov.np', password: 'admin123', role: 'admin', department_id: 0 },
                { id: 2, name: 'Ram Sharma',   email: 'dataentry@pms.gov.np', password: 'data123',  role: 'data_entry', department_id: 1 },
                { id: 3, name: 'Sita Devi',    email: 'viewer@pms.gov.np',    password: 'view123',  role: 'viewer', department_id: 2 },
                { id: 4, name: 'Hari Thapa',   email: 'hr@pms.gov.np',        password: 'hr123',    role: 'hr_manager', department_id: 0 },
                { id: 5, name: 'Gita Shrestha',email: 'finance@pms.gov.np',   password: 'fin123',   role: 'finance_officer', department_id: 0 }
            ];
        }

        /* ---------- BANKS (extended) ---------- */
        if (!c.banks || c.banks.length < 4) {
            c.banks = [
                { id: 1, name: 'Nepal Rastriya Bank',          branch: 'Kathmandu', account_no: '0101234567', swift: 'NBBLNPKA' },
                { id: 2, name: 'Nepal Bank Limited',           branch: 'Lalitpur',  account_no: '0209876543', swift: 'NEBLNPKA' },
                { id: 3, name: 'Rastriya Banijya Bank',        branch: 'Bhaktapur', account_no: '0311223344', swift: 'RBBLNPKA' },
                { id: 4, name: 'Agricultural Development Bank',branch: 'Kirtipur',  account_no: '0412345678', swift: 'ADBNNPKA' },
                { id: 5, name: 'Nabil Bank',                   branch: 'Durbar Marg', account_no: '0512348765', swift: 'NARBNPKA' },
                { id: 6, name: 'Himalayan Bank',               branch: 'Thamel',    account_no: '0698765432', swift: 'HIMANPKA' }
            ];
        }

        /* ---------- LETTER CATEGORIES + TEMPLATES (extended) ---------- */
        if (!c.letter_categories || c.letter_categories.length < 5) {
            c.letter_categories = [
                { id: 1, name: 'Bank Letter' },
                { id: 2, name: 'Tippani' },
                { id: 3, name: 'Work Permit' },
                { id: 4, name: 'Notice' },
                { id: 5, name: 'Recommendation' },
                { id: 6, name: 'Payment Order' },
                { id: 7, name: 'Completion Certificate' }
            ];
        }
        if (!c.letter_templates || c.letter_templates.length < 4) {
            c.letter_templates = [
                { id: 1, name: 'Bank Account Opening Letter', category_id: 1,
                  body: 'मिति: {AgreementDate}\n\nविषय: बैंक खाता खोल्ने बारे।\n\nश्रीमान् शाखा प्रमुख ज्यू,\n\n{CommitteeName} को तर्फबाट {ProgramName} कार्यक्रम अन्तर्गत बैंक खाता खोल्न अनुरोध गर्दछौं।\n\nसम्झौता नं: {AgreementID}\nदर्ता नं: {RegisterNo}\nवडा नं: {WardNo}\nकुल बजेट: {TotalBudget}\n\nअध्यक्ष: {Chairman}\nउप-अध्यक्ष: {ViceChairman}\nसचिव: {Secretary}\n\nधन्यवाद।' },
                { id: 2, name: 'Work Commencement Tippani', category_id: 2,
                  body: 'टिप्पणी आदेश\nमिति: {AgreementDate}\n\nविषय: कार्य सुरुवात गर्ने बारे।\n\n{ProgramName} कार्यक्रम अन्तर्गत {WardNo} वडामा निर्माण कार्य {WorkStartDate} देखि {WorkEndDate} सम्ममा सम्पन्न गर्ने व्यवस्था मिलाउनु होला।\n\nसम्झौता: {AgreementID}\nसमिति: {CommitteeName}\nकुल बजेट: {TotalBudget}' },
                { id: 3, name: 'Work Permit Letter', category_id: 3,
                  body: 'कार्य अनुमति पत्र\nमिति: {AgreementDate}\nपत्र संख्या: {RegisterNo}\n\n{CommitteeName} लाई {ProgramName} अन्तर्गत निर्माण कार्य गर्न यो अनुमति पत्र जारी गरिन्छ।\n\nकार्य अवधि: {WorkStartDate} देखि {WorkEndDate}\nकुल बजेट: {TotalBudget}\nवडा नं: {WardNo}\n\nहस्ताक्षर:\nप्रमुख प्रशासकीय अधिकृत' },
                { id: 4, name: 'Public Notice', category_id: 4,
                  body: 'सार्वजनिक सूचना\nमिति: {AgreementDate}\n\nयस कार्यालयद्वारा सञ्चालित {ProgramName} परियोजनाको अद्यावधिक जानकारी सबै सरोकारवालाहरूलाई अवगत गराइन्छ।\n\nसम्झौता: {AgreementID}\nवडा: {WardNo}\nकुल लागत: {TotalBudget}' },
                { id: 5, name: 'Payment Recommendation', category_id: 5,
                  body: 'विषय: भुक्तानी सिफारिस।\n\n{CommitteeName} द्वारा {ProgramName} अन्तर्गत सम्पन्न कार्यको भुक्तानी गर्न सिफारिस गरिन्छ।\n\nसम्झौता: {AgreementID}\nकुल रकम: {TotalBudget}\nमिति: {AgreementDate}' },
                { id: 6, name: 'First Installment Payment Order', category_id: 6,
                  body: 'भुक्तानी आदेश — पहिलो किस्ता\n\n{CommitteeName} को बैंक खाता मार्फत {ProgramName} को पहिलो किस्ता रकम भुक्तानी गर्नु पर्ने भएकोले यो आदेश जारी गरिएको छ।\n\nसम्झौता: {AgreementID}\nमिति: {AgreementDate}' },
                { id: 7, name: 'Work Completion Certificate', category_id: 7,
                  body: 'कार्य सम्पन्नता प्रमाण-पत्र\n\nयस कार्यालयद्वारा प्रमाणित गरिन्छ कि {CommitteeName} द्वारा {ProgramName} कार्यक्रम अन्तर्गत स्वीकृत कार्य {WorkStartDate} देखि {WorkEndDate} सम्ममा गुणस्तरीय रूपमा सम्पन्न गरिएको छ।\n\nसम्झौता: {AgreementID}\nकुल लागत: {TotalBudget}\nवडा: {WardNo}' }
            ];
        }

        /* ---------- REPORT CATEGORIES (already in core, top-up if light) ---------- */
        if (!c.report_categories || c.report_categories.length < 10) {
            c.report_categories = [
                { id: 1,  name: 'Road',                          parent_id: 0, unit: 'km',    sort_order: 1 },
                { id: 2,  name: 'Landslide',                     parent_id: 1, unit: 'km',    sort_order: 1 },
                { id: 3,  name: 'Clearance',                     parent_id: 1, unit: 'km',    sort_order: 2 },
                { id: 4,  name: 'Widening',                      parent_id: 1, unit: 'km',    sort_order: 3 },
                { id: 5,  name: 'New Track',                     parent_id: 1, unit: 'km',    sort_order: 4 },
                { id: 6,  name: 'Gravelled',                     parent_id: 1, unit: 'km',    sort_order: 5 },
                { id: 7,  name: 'Soling',                        parent_id: 1, unit: 'km',    sort_order: 6 },
                { id: 8,  name: 'Sedi Bato',                     parent_id: 1, unit: 'km',    sort_order: 7 },
                { id: 9,  name: 'Bridge / Culvert and Cause Way',parent_id: 0, unit: 'nos',   sort_order: 2 },
                { id: 10, name: 'Foot Trail Bridge',             parent_id: 9, unit: 'nos',   sort_order: 1 },
                { id: 11, name: 'Motorable Bridge',              parent_id: 9, unit: 'nos',   sort_order: 2 },
                { id: 12, name: 'Cause Way',                     parent_id: 9, unit: 'nos',   sort_order: 3 },
                { id: 13, name: 'Pavement',                      parent_id: 0, unit: 'm',     sort_order: 3 },
                { id: 14, name: 'Rigid Pavement',                parent_id: 13,unit: 'meter', sort_order: 1 },
                { id: 15, name: 'Flexible Pavement',             parent_id: 13,unit: 'meter', sort_order: 2 },
                { id: 16, name: 'Buildings',                     parent_id: 0, unit: 'nos',   sort_order: 4 },
                { id: 17, name: 'School Building',               parent_id: 16,unit: 'nos',   sort_order: 1 },
                { id: 18, name: 'Health Post',                   parent_id: 16,unit: 'nos',   sort_order: 2 },
                { id: 19, name: 'Community Hall',                parent_id: 16,unit: 'nos',   sort_order: 3 },
                { id: 20, name: 'Water Supply',                  parent_id: 0, unit: 'nos',   sort_order: 5 },
                { id: 21, name: 'Tap Stands',                    parent_id: 20,unit: 'nos',   sort_order: 1 },
                { id: 22, name: 'Overhead Tank',                 parent_id: 20,unit: 'nos',   sort_order: 2 }
            ];
        }

        /* ---------- COMMITTEE MEMBERS for ALL agreements ---------- */
        if ((!c.committee_members || c.committee_members.length < 6) && c.agreements && c.agreements.length) {
            const positions = ['अध्यक्ष', 'उप-अध्यक्ष', 'सचिव', 'कोषाध्यक्ष', 'सदस्य', 'सदस्य'];
            const namePool = [
                ['हरि बहादुर थापा', '1234-5678'], ['गीता देवी श्रेष्ठ', '2345-6789'],
                ['राम कुमार पौडेल', '3456-7890'], ['सीता कुमारी',     '4567-8901'],
                ['श्याम बहादुर',    '5678-9012'], ['कृष्ण कुमार',      '6789-0123'],
                ['सुनिता कार्की',    '7890-1234'], ['विष्णु प्रसाद',    '8901-2345'],
                ['माया तामाङ',      '9012-3456'], ['दिपक राई',        '0123-4567'],
                ['अनिता भट्टराई',   '1357-9024'], ['बलभद्र अधिकारी',  '2468-1357']
            ];
            const members = [];
            let mid = 1, nameIdx = 0;
            c.agreements.forEach(a => {
                positions.forEach((pos, i) => {
                    const np = namePool[nameIdx % namePool.length];
                    nameIdx++;
                    members.push({
                        id: mid++, agreement_id: a.id, name: np[0], position: pos,
                        national_id: np[1], address: `वडा ${a.wada_no}, ${a.communitee_name.split(' ')[0]||'काठमाडौं'}`
                    });
                });
            });
            c.committee_members = members;
        }

        /* ---------- AGREEMENT LETTERS for ALL agreements ---------- */
        if ((!c.agreement_letters || c.agreement_letters.length < 4) && c.agreements && c.agreements.length) {
            const letters = [];
            let lid = 1;
            c.agreements.forEach(a => {
                letters.push({
                    id: lid++, agreement_id: a.id, category_id: 1,
                    title: 'बैंक खाता खोल्ने पत्र',
                    content: `मिति: ${a.agreement_date}\n\nविषय: बैंक खाता खोल्ने बारे।\n\n${a.communitee_name} को तर्फबाट सम्झौता ${a.agreement_id} अन्तर्गत बैंक खाता खोल्न अनुरोध।`,
                    created_date: a.agreement_date, status: 'sent'
                });
                letters.push({
                    id: lid++, agreement_id: a.id, category_id: 3,
                    title: 'कार्य अनुमति पत्र',
                    content: `मिति: ${a.work_start_date}\n\n${a.communitee_name} लाई निर्माण कार्य गर्न अनुमति दिइएको छ।\nकार्य अवधि: ${a.work_start_date} देखि ${a.work_end_date}`,
                    created_date: a.work_start_date, status: 'approved'
                });
                letters.push({
                    id: lid++, agreement_id: a.id, category_id: 6,
                    title: 'पहिलो किस्ता भुक्तानी आदेश',
                    content: `${a.communitee_name} को बैंक खातामा सम्झौता ${a.agreement_id} को पहिलो किस्ता रकम भुक्तानी आदेश।`,
                    created_date: a.work_start_date, status: 'sent'
                });
            });
            c.agreement_letters = letters;
        }

        /* ---------- BUDGET DETAILS for ALL agreements ---------- */
        if ((!c.budget_details || c.budget_details.length < 3) && c.agreements && c.agreements.length) {
            c.budget_details = c.agreements.map((a, i) => {
                const est = a.total_budget_amt || 1000000;
                const valApproved = i % 2 === 0;
                return {
                    id: i + 1, agreement_id: a.id,
                    EstimateAmt: est, EstUserContribution: Math.round(est * 0.1), EstUserFund: Math.round(est * 0.9),
                    ValuationAmt: valApproved ? Math.round(est * 0.97) : 0,
                    ValUserContribution: valApproved ? Math.round(est * 0.097) : 0,
                    ValUserFund: valApproved ? Math.round(est * 0.873) : 0,
                    ValuationDate: valApproved ? a.work_end_date : '',
                    EstimateBy: 'इन्जिनियर राम पौडेल', EstApprovedBy: 'प्रमुख प्रशासन',
                    ValuationBy: valApproved ? 'इन्जिनियर श्याम थापा' : '',
                    ValApprovedBy: valApproved ? 'प्रमुख प्रशासन' : '',
                    EstStatus: 'approved', ValStatus: valApproved ? 'approved' : 'pending'
                };
            });
        }

        /* ---------- FINANCIALS (nested) for ALL agreements ---------- */
        if ((!c.financials_nested || c.financials_nested.length < 3) && c.agreements && c.agreements.length) {
            c.financials_nested = c.agreements.map((a, i) => {
                const alloc = a.total_budget_amt || 1000000;
                const expenses = [];
                // installments scaled to alloc
                expenses.push({ id: 1, desc: 'पहिलो किस्ता (Mobilization)', amount: Math.round(alloc * 0.30), date: a.work_start_date });
                if (i % 3 !== 2) expenses.push({ id: 2, desc: 'दोस्रो किस्ता (Progress 50%)', amount: Math.round(alloc * 0.25), date: '2081-08-15' });
                if (i % 3 === 0) expenses.push({ id: 3, desc: 'तेस्रो किस्ता (Progress 80%)', amount: Math.round(alloc * 0.20), date: '2081-10-20' });
                if (i % 5 === 0) expenses.push({ id: 4, desc: 'अन्तिम किस्ता (Final)', amount: Math.round(alloc * 0.15), date: '2082-01-10' });
                expenses.push({ id: expenses.length + 1, desc: 'सामग्री खरिद (Materials)', amount: Math.round(alloc * 0.05), date: '2081-07-05' });
                return { id: i + 1, agreement_id: a.id, budget_allocated: alloc, expenses };
            });
            // Also flatten into financials + expenses for Excel persistence
            c.financials = c.financials_nested.map(({ id, agreement_id, budget_allocated }) => ({ id, agreement_id, budget_allocated }));
            const flatExp = [];
            c.financials_nested.forEach(f => {
                f.expenses.forEach(e => flatExp.push({ id: e.id, financial_id: f.id, desc: e.desc, amount: e.amount, date: e.date }));
            });
            c.expenses = flatExp;
        }

        /* ---------- AGREEMENT REPORTS for several agreements ---------- */
        if ((!c.agreement_reports || c.agreement_reports.length < 3) && c.agreements && c.agreements.length) {
            c.agreement_reports = c.agreements.slice(0, Math.min(c.agreements.length, 6)).map((a, i) => {
                // Sample work-report entries for cat ids defined above
                const sample = [
                    [{ cat_id: 2, value: 0.5 }, { cat_id: 5, value: 1.2 }, { cat_id: 10, value: 1 }],
                    [{ cat_id: 6, value: 2.0 }, { cat_id: 14, value: 150 }, { cat_id: 17, value: 1 }],
                    [{ cat_id: 11, value: 1 }, { cat_id: 15, value: 80 }],
                    [{ cat_id: 21, value: 12 }, { cat_id: 22, value: 1 }, { cat_id: 19, value: 1 }],
                    [{ cat_id: 3, value: 0.8 }, { cat_id: 7, value: 0.6 }],
                    [{ cat_id: 18, value: 1 }, { cat_id: 21, value: 6 }]
                ][i] || [{ cat_id: 5, value: 0.3 }];
                return {
                    id: i + 1, agreement_id: a.id, wada_no: a.wada_no,
                    report_date: '2081-09-15',
                    entries: JSON.stringify(sample)
                };
            });
        }

        /* ---------- NOTIFICATIONS (richer feed) ---------- */
        if (!c.notifications || c.notifications.length < 5) {
            c.notifications = [
                { id: 1, message: 'नयाँ सम्झौता AGR-2081-003 दर्ता भयो।', type: 'agreement',     created_at: now - 1 * 3600000,  is_read: 0, user_id: 1 },
                { id: 2, message: 'योजना "सिँचाइ योजना" स्वीकृत भयो।',       type: 'plan_approved', created_at: now - 1 * day,      is_read: 0, user_id: 2 },
                { id: 3, message: 'योजना "स्वास्थ्य चौकी" अस्वीकृत भयो।',   type: 'plan_rejected', created_at: now - 2 * day,      is_read: 0, user_id: 2 },
                { id: 4, message: 'AGR-2081-001 को पहिलो किस्ता भुक्तानी।',  type: 'payment',       created_at: now - 3 * day,      is_read: 0, user_id: 1 },
                { id: 5, message: 'कर्मचारी "Ram Kumar" को बिदा अनुरोध।',   type: 'leave',         created_at: now - 4 * day,      is_read: 1, user_id: 1 },
                { id: 6, message: 'कर्मचारी "Sunita Karki" को प्रसूति बिदा स्वीकृत।', type: 'leave_approved', created_at: now - 5 * day, is_read: 1, user_id: 4 },
                { id: 7, message: 'मासिक तलब आदेश तयार छ — Review गर्नुहोस्।',  type: 'salary',  created_at: now - 6 * day, is_read: 0, user_id: 5 },
                { id: 8, message: 'Backup सिफारिस: पछिल्लो ब्याकअप ७ दिन अघि।', type: 'system', created_at: now - 7 * day, is_read: 0, user_id: 1 }
            ];
        }

        /* ---------- EMPLOYEES (10 demo) ---------- */
        if (!c.employees || !c.employees.length) {
            const baseEmps = [
                ['EMP-001', 'Hari Bahadur Thapa',   'हरि बहादुर थापा',   'Male',   '1985-03-12', 'Administration', 'Officer Level',  'Chief Administrative Officer', 'Administration', '2010-07-01'],
                ['EMP-002', 'Sita Devi Sharma',     'सीता देवी शर्मा',    'Female', '1988-06-22', 'Accounts',       'Officer Level',  'Account Officer',              'Accounts',       '2012-04-15'],
                ['EMP-003', 'Ram Kumar Poudel',     'राम कुमार पौडेल',   'Male',   '1990-01-10', 'Engineering',    'Officer Level',  'Civil Engineer',               'Engineering',    '2014-08-20'],
                ['EMP-004', 'Gita Shrestha',        'गीता श्रेष्ठ',       'Female', '1992-11-05', 'Planning',       'Assistant',      'Planning Assistant',           'Planning',       '2016-03-10'],
                ['EMP-005', 'Krishna Bahadur',      'कृष्ण बहादुर',      'Male',   '1980-09-18', 'Administration', 'Officer Level',  'Section Officer',              'Administration', '2008-12-05'],
                ['EMP-006', 'Sunita Karki',         'सुनिता कार्की',     'Female', '1995-04-25', 'Health',         'Officer Level',  'Health Inspector',             'Health',         '2018-06-01'],
                ['EMP-007', 'Bishnu Prasad',        'विष्णु प्रसाद',     'Male',   '1983-12-30', 'Education',      'Officer Level',  'Education Officer',            'Education',      '2011-09-15'],
                ['EMP-008', 'Maya Tamang',          'माया तामाङ',        'Female', '1991-07-14', 'Agriculture',    'Assistant',      'Agriculture Assistant',        'Agriculture',    '2017-11-22'],
                ['EMP-009', 'Dipak Rai',            'दिपक राई',          'Male',   '1987-02-08', 'Transport',      'Driver',         'Driver',                       'Transport',      '2013-05-30'],
                ['EMP-010', 'Anita Bhattarai',      'अनिता भट्टराई',     'Female', '1993-10-19', 'Administration', 'Computer Operator', 'Computer Operator',         'Administration', '2019-01-14']
            ];
            const banks = ['Nepal Rastriya Bank', 'Nepal Bank Limited', 'Rastriya Banijya Bank', 'Agricultural Development Bank'];
            c.employees = baseEmps.map((row, i) => ({
                id: i + 1,
                EmployeeCode: row[0], Fullname: row[1], NepFullname: row[2],
                Gender: row[3], Dob: row[4],
                ServiceGroup: row[5], CategoryLevel: row[6], Designation: row[7],
                Department: row[8], ServiceJoindate: row[9],
                Email: `${row[0].toLowerCase()}@municipality.gov.np`,
                PhoneNumber: '98' + (40000000 + i * 111111),
                PanNumber: 'PAN' + (100000 + i),
                BankName: banks[i % banks.length],
                BankAccountNumber: '01' + (10000000 + i * 1234567),
                CitNumber: 'CIT-' + (1000 + i),
                EpfNumber: 'EPF-' + (2000 + i),
                InsuranceNo: 'INS-' + (3000 + i),
                UcinNumber: 'UCIN-' + (4000 + i),
                HomeLeave: 12, SickLeave: 12, UnPaidLeave: 0,
                MaternityLeave: row[3] === 'Female' ? 98 : 0,
                IsMaternityLeave: 0, MaternityLeaveNum: 0,
                EducationLeave: 10, ExtraLeave: 5,
                IsTransfer: 0, IsActive: 1,
                Status: 'approved', ApprovedBy: 'System Admin',
                Comment: '', Reason: ''
            }));
        }

        /* ---------- SALARIES (one per employee) ---------- */
        if (!c.salaries || !c.salaries.length) {
            const tiers = {
                'Chief Administrative Officer': { basic: 65000, grade: 8000, level: '11' },
                'Account Officer':              { basic: 48000, grade: 5000, level: '8'  },
                'Civil Engineer':               { basic: 52000, grade: 6000, level: '8'  },
                'Planning Assistant':           { basic: 32000, grade: 3000, level: '5'  },
                'Section Officer':              { basic: 55000, grade: 7000, level: '9'  },
                'Health Inspector':             { basic: 40000, grade: 4000, level: '7'  },
                'Education Officer':            { basic: 45000, grade: 5000, level: '8'  },
                'Agriculture Assistant':        { basic: 30000, grade: 2500, level: '5'  },
                'Driver':                       { basic: 25000, grade: 2000, level: '4'  },
                'Computer Operator':            { basic: 28000, grade: 2500, level: '5'  }
            };
            c.salaries = (c.employees || []).map((e, i) => {
                const t = tiers[e.Designation] || { basic: 30000, grade: 3000, level: '5' };
                const gross = t.basic + t.grade + 3000 + 2000 + 1500;
                const pf = Math.round(t.basic * 0.10);
                const cit = Math.round(t.basic * 0.05);
                const tax = Math.round(gross * 0.05);
                return {
                    id: i + 1, employee_id: e.id,
                    basic_salary: t.basic, grade_amount: t.grade, grade_level: t.level,
                    allowance_office: 3000, allowance_transport: 2000, allowance_dearness: 1500,
                    pf_amount: pf, cit_amount: cit, tax_amount: tax,
                    insurance_amount: 500, other_deduction: 0,
                    effective_date: '2081-04-01',
                    remarks: 'FY 2081/82 salary structure',
                    created_at: now - (10 - i) * day
                };
            });
        }

        /* ---------- LEAVE TYPES ---------- */
        if (!c.leave_types || !c.leave_types.length) {
            c.leave_types = [
                { id: 1, name: 'Home Leave',      code: 'home',      annual_quota: 12, paid: 1, color: '#10b981', created_at: now },
                { id: 2, name: 'Sick Leave',      code: 'sick',      annual_quota: 12, paid: 1, color: '#f59e0b', created_at: now },
                { id: 3, name: 'Unpaid Leave',    code: 'unpaid',    annual_quota: 30, paid: 0, color: '#6b7280', created_at: now },
                { id: 4, name: 'Maternity Leave', code: 'maternity', annual_quota: 98, paid: 1, color: '#ec4899', created_at: now },
                { id: 5, name: 'Education Leave', code: 'education', annual_quota: 10, paid: 1, color: '#3b82f6', created_at: now },
                { id: 6, name: 'Extra Leave',     code: 'extra',     annual_quota: 5,  paid: 0, color: '#8b5cf6', created_at: now }
            ];
        }

        /* ---------- LEAVE APPLICATIONS (mixed statuses) ---------- */
        if (!c.leave_applications || !c.leave_applications.length) {
            c.leave_applications = [
                { id: 1, employee_id: 1, leave_type_id: 1, from_date: '2081-08-01', to_date: '2081-08-05', days: 5,
                  reason: 'Family function at home village', status: 'approved',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: 'Approved',
                  approved_at: now - 10 * day, created_at: now - 15 * day },
                { id: 2, employee_id: 2, leave_type_id: 2, from_date: '2081-09-10', to_date: '2081-09-12', days: 3,
                  reason: 'Fever and flu — doctor advised rest', status: 'approved',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: 'Get well soon',
                  approved_at: now - 8 * day, created_at: now - 9 * day },
                { id: 3, employee_id: 3, leave_type_id: 5, from_date: '2081-10-01', to_date: '2081-10-07', days: 7,
                  reason: 'Attending civil engineering training in Kathmandu', status: 'pending',
                  approved_by: '', created_at: now - 3 * day },
                { id: 4, employee_id: 4, leave_type_id: 1, from_date: '2081-11-15', to_date: '2081-11-18', days: 4,
                  reason: 'Personal work', status: 'pending',
                  approved_by: '', created_at: now - 1 * day },
                { id: 5, employee_id: 6, leave_type_id: 4, from_date: '2081-07-01', to_date: '2081-10-07', days: 98,
                  reason: 'Maternity leave', status: 'approved',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: 'Best wishes',
                  approved_at: now - 20 * day, created_at: now - 25 * day },
                { id: 6, employee_id: 8, leave_type_id: 3, from_date: '2081-09-20', to_date: '2081-09-25', days: 6,
                  reason: 'Personal emergency — no leave balance', status: 'rejected',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: 'Quota exceeded',
                  approved_at: now - 5 * day, created_at: now - 7 * day },
                { id: 7, employee_id: 9, leave_type_id: 2, from_date: '2081-10-12', to_date: '2081-10-13', days: 2,
                  reason: 'Stomach pain', status: 'approved',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: '',
                  approved_at: now - 2 * day, created_at: now - 4 * day },
                { id: 8, employee_id: 10, leave_type_id: 6, from_date: '2081-11-20', to_date: '2081-11-21', days: 2,
                  reason: 'Religious ceremony', status: 'pending',
                  approved_by: '', created_at: now - day / 2 },
                { id: 9, employee_id: 5, leave_type_id: 1, from_date: '2081-12-01', to_date: '2081-12-03', days: 3,
                  reason: 'Festival holidays', status: 'approved',
                  approved_by: 'System Admin', approver_name: 'System Admin', approval_remarks: '',
                  approved_at: now - 12 * day, created_at: now - 14 * day },
                { id: 10, employee_id: 7, leave_type_id: 5, from_date: '2082-01-10', to_date: '2082-01-15', days: 6,
                  reason: 'Education conference', status: 'pending',
                  approved_by: '', created_at: now - day * 0.3 }
            ];
        }
    };

    console.log('✅ PMS Comprehensive Demo Seed loaded — every table populated with sample data.');
})();
