/* ===== NEPALI CALENDAR ===== */
const NM=['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पुष','माघ','फागुन','चैत्र'];
const ND_DAYS={0:31,1:31,2:32,3:31,4:31,5:30,6:30,7:29,8:30,9:29,10:30,11:30};
function nepaliHTML(id,val=''){const p=val?val.split('-'):['2081','04','15'];let y='',m='',d='';for(let i=2070;i<=2095;i++)y+=`<option value="${i}"${i==p[0]?' selected':''}>${i}</option>`;NM.forEach((n,i)=>{m+=`<option value="${String(i+1).padStart(2,'0')}"${i+1==+p[1]?' selected':''}>${n}</option>`});const mx=ND_DAYS[+p[1]-1]||30;for(let i=1;i<=mx;i++)d+=`<option value="${String(i).padStart(2,'0')}"${i==+p[2]?' selected':''}>${i}</option>`;return`<div class="nepali-date-group">${[['साल',y],['महिना',m],['गते',d]].map(([l,o])=>`<div style="flex:1"><select class="form-select form-select-sm" data-nd="${id}" onchange="ND.upd('${id}')"><option value="">${l}</option>${o}</select></div>`).join('')}</div>`}
const ND={upd(id){const s=document.querySelectorAll(`[data-nd="${id}"]`);if(!s.length)return;const mx=ND_DAYS[+s[1].value-1]||30;let d='';for(let i=1;i<=mx;i++)d+=`<option value="${String(i).padStart(2,'0')}">${i}</option>`;s[2].innerHTML=`<option value="">गते</option>`+d},get(id){const s=document.querySelectorAll(`[data-nd="${id}"]`);if(!s.length||!s[0].value||!s[1].value||!s[2].value)return'';return`${s[0].value}-${s[1].value}-${s[2].value}`}};

/* ===== EXCEL DATABASE LAYER ===== */
const TABLES=['departments','budget_titles','program_types','budget_sources','budget_areas','budget_levels','work_types','budget_types','letter_categories','letter_templates','banks','report_categories','users','programs','plans','agreements','committee_members','agreement_letters','budget_details','agreement_reports','financials','expenses','notifications'];
const XDB={
    fh:null, cache:{}, _st:null, fileName:'',
    isSupported(){return!!window.showSaveFilePicker},

    async createNew(){
        if(!this.isSupported()){toast('Please use Chrome or Edge browser','error');return}
        try{
            this.fh=await window.showSaveFilePicker({suggestedName:'PMS_Database.xlsx',types:[{description:'Excel Files',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});
            this.fileName=this.fh.name;
            seedData(this.cache);
            await this._write();
            this._showLogin();
            toast('Database created: '+this.fileName);
        }catch(e){if(e.name!=='AbortError')toast('Error creating file: '+e.message,'error')}
    },

    browseForFile(){
        if(this.isSupported()){
            this._pickNative();
        }else{
            document.getElementById('browse-area').style.display='block';
        }
    },

    async _pickNative(){
        try{
            [this.fh]=await window.showOpenFilePicker({types:[{description:'Excel Files',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});
            this.fileName=this.fh.name;
            await this._read();
            this._ensureTables();
            this._showLogin();
            toast('Database opened: '+this.fileName);
        }catch(e){if(e.name!=='AbortError')toast('Error opening file','error')}
    },

    handleFilePick(file){
        if(!file)return;
        this.fileName=file.name;
        const reader=new FileReader();
        reader.onload=async(e)=>{
            try{
                const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
                this._parseWB(wb);
                this._ensureTables();
                this._showLogin();
                toast('Database loaded: '+this.fileName);
            }catch(err){toast('Invalid Excel file','error')}
        };
        reader.readAsArrayBuffer(file);
    },

    async _read(){
        const file=await this.fh.getFile();
        const buf=await file.arrayBuffer();
        const wb=XLSX.read(buf,{type:'array'});
        this._parseWB(wb);
    },

    _parseWB(wb){
        TABLES.forEach(t=>{const ws=wb.Sheets[t];this.cache[t]=ws?XLSX.utils.sheet_to_json(ws):[]});
        const fins=this.cache.financials||[];
        const exps=this.cache.expenses||[];
        this.cache.financials_nested=fins.map(f=>({...f,expenses:exps.filter(e=>e.financial_id===f.id).map(e=>({id:e.id,desc:e.desc,amount:e.amount,date:e.date}))}));
    },

    _ensureTables(){
        TABLES.forEach(t=>{if(!this.cache[t])this.cache[t]=[]});
        if(!this.cache.financials_nested){
            const fins=this.cache.financials||[];
            const exps=this.cache.expenses||[];
            this.cache.financials_nested=fins.map(f=>({...f,expenses:exps.filter(e=>e.financial_id===f.id).map(e=>({id:e.id,desc:e.desc,amount:e.amount,date:e.date}))}));
        }
    },

    async _write(){
        try{
            const allExps=[];
            (this.cache.financials_nested||[]).forEach(f=>{(f.expenses||[]).forEach(e=>{allExps.push({...e,financial_id:f.id})})});
            this.cache.expenses=allExps;
            const flatFins=(this.cache.financials_nested||[]).map(({id,agreement_id,budget_allocated})=>({id,agreement_id,budget_allocated}));
            this.cache.financials=flatFins;

            const wb=XLSX.utils.book_new();
            TABLES.forEach(t=>{
                const data=this.cache[t]||[];
                const ws=XLSX.utils.json_to_sheet(data.length?data:[{_:'(empty)'}]);
                const cols=Object.keys(data.length?data[0]:{_:''}).map(k=>({wch:Math.max(k.length+2,12)}));
                ws['!cols']=cols;
                XLSX.utils.book_append_sheet(wb,ws,t);
            });
            const out=XLSX.write(wb,{type:'array',bookType:'xlsx'});
            if(this.fh){
                const w=await this.fh.createWritable();
                await w.write(out);
                await w.close();
            }
            this._setStatus('saved');
        }catch(e){
            console.error('Write error:',e);
            this._setStatus('error');
            toast('Save failed! Is the file open in Excel? Close it and try again.','error');
        }
    },

    save(){clearTimeout(this._st);this._setStatus('saving');this._st=setTimeout(()=>this._write(),600)},

    get(t){this._ensureTables();return t==='financials'?(this.cache.financials_nested||[]):(this.cache[t]||[])},
    set(t,v){this.cache[t]=v;this.save()},
    nextId(t){const items=this.get(t);return items.length?Math.max(...items.map(i=>i.id))+1:1},

    _setStatus(s){
        const el=document.getElementById('save-status');
        if(!el)return;
        el.className=s;
        if(s==='saved')el.innerHTML='<i class="fas fa-check-circle"></i> Saved';
        else if(s==='saving')el.innerHTML='<i class="fas fa-spinner fa-spin"></i> Saving...';
        else el.innerHTML='<i class="fas fa-exclamation-circle"></i> Save Error';
    },

    _showLogin(){
        document.getElementById('setup-main').style.display='none';
        document.getElementById('login-section').style.display='block';
        // Save file reference info for session restore
        if(this.fileName)sessionStorage.setItem('pms_fname',this.fileName);
    },

    goBack(){
        document.getElementById('setup-main').style.display='block';
        document.getElementById('login-section').style.display='none';
        document.getElementById('file-name-display').style.display='none';
        document.getElementById('browse-area').style.display='none';
    },

    closeAndReopen(){
        if(confirm('This will save current data and let you switch to a different database file. Continue?')){
            this._write().then(()=>{App.user=null;document.getElementById('app').style.display='none';document.getElementById('setup-page').style.display='flex';document.getElementById('setup-main').style.display='block';document.getElementById('login-section').style.display='none';document.getElementById('db-indicator').style.display='none';document.getElementById('file-name-display').style.display='none';document.getElementById('browse-area').style.display='none';this.fh=null;this.fileName='';}).catch(()=>{toast('Could not save before switching','error')});
        }
    }
};

/* ===== SEED DATA ===== */
function seedData(c){
    c.departments=[{id:1,name:'शिक्षा विभाग',name_en:'Education Department'},{id:2,name:'स्वास्थ्य विभाग',name_en:'Health Department'},{id:3,name:'आवास विभाग',name_en:'Housing Department'},{id:4,name:'कृषि विभाग',name_en:'Agriculture Department'},{id:5,name:'यातायात विभाग',name_en:'Transport Department'}];
    c.budget_titles=[{id:1,name:'पूर्वाधार निर्माण'},{id:2,name:'सामाजिक विकास'},{id:3,name:'आर्थिक विकास'},{id:4,name:'प्रशासनिक'},{id:5,name:'वातावरण संरक्षण'}];
    c.program_types=[{id:1,name:'वार्ड स्तरीय'},{id:2,name:'नगर स्तरीय'},{id:3,name:'केन्द्रीय'},{id:4,name:'साझेदारी'}];
    c.budget_sources=[{id:1,name:'आन्तरिक स्रोत'},{id:2,name:'सरकारी अनुदान'},{id:3,name:'विदेशी सहायता'},{id:4,name:'अन्य'}];
    c.budget_areas=[{id:1,name:'शहरी क्षेत्र'},{id:2,name:'ग्रामीण क्षेत्र'},{id:3,name:'उपनगरीय क्षेत्र'},{id:4,name:'दुर्गम क्षेत्र'}];
    c.budget_levels=[{id:1,name:'संघीय'},{id:2,name:'प्रदेश'},{id:3,name:'स्थानीय'},{id:4,name:'वडा'}];
    c.work_types=[{id:1,name:'निर्माण'},{id:2,name:'मर्मत सम्भार'},{id:3,name:'अध्ययन अनुसन्धान'},{id:4,name:'सेवा प्रवाह'},{id:5,name:'क्षमता विकास'}];
    c.budget_types=[{id:1,name:'चालु'},{id:2,name:'पूंजीगत'},{id:3,name:'वित्तीय व्यवस्थापन'}];
    c.letter_categories=[{id:1,name:'Bank Letter'},{id:2,name:'Tippani'},{id:3,name:'Work Permit'},{id:4,name:'Notice'},{id:5,name:'Recommendation'}];
    c.letter_templates=[
        {id:1,name:'Bank Account Opening Letter',category_id:1,body:'मिति: {AgreementDate}\n\nविषय: बैंक खाता खोल्ने बारे\n\nसम्मानित महोदय,\n\n{CommitteeName} को तर्फबाट {ProgramName} कार्यक्रम अन्तर्गत बैंक खाता खोल्न अनुरोध गर्दछौं।\n\nसम्झौता नं: {AgreementID}\nवडा नं: {WardNo}\nकुल बजेट: {TotalBudget}\n\nअध्यक्ष: {Chairman}\nसचिव: {Secretary}\n\nधन्यवाद।'},
        {id:2,name:'Work Commencement Tippani',category_id:2,body:'टिप्पणी\nमिति: {AgreementDate}\n\nविषय: कार्य सुरुवात गर्ने बारे\n\n{ProgramName} कार्यक्रम अन्तर्गत {WardNo} वडामा निर्माण कार्य {WorkStartDate} देखि सुरु गर्ने व्यवस्था मिलाउनु होला।\n\nसम्झौता: {AgreementID}\nसमिति: {CommitteeName}'},
        {id:3,name:'Work Permit Letter',category_id:3,body:'कार्य अनुमति पत्र\nमिति: {AgreementDate}\n\n{CommitteeName} लाई {ProgramName} अन्तर्गत निर्माण कार्य गर्न यो अनुमति पत्र जारी गरिन्छ।\n\nकार्य अवधि: {WorkStartDate} देखि {WorkEndDate} सम्म\nकुल बजेट: {TotalBudget}\n\nरजिस्टर नं: {RegisterNo}'}
    ];
    c.users=[{id:1,name:'System Admin',email:'admin@pms.gov.np',password:'admin123',role:'admin',department_id:0},{id:2,name:'Ram Sharma',email:'dataentry@pms.gov.np',password:'data123',role:'data_entry',department_id:1},{id:3,name:'Sita Devi',email:'viewer@pms.gov.np',password:'view123',role:'viewer',department_id:2}];
    c.programs=[
        {id:1,Program_Name:'पूर्वाधार विकास कार्यक्रम',parent_id:0,Budget_Amount:5000000,Register_No:'PRJ-001',Ward_Number:0,budge_title_id:1,program_type_id:2,budget_source_id:1,budget_area_id:1,department_id:3,budget_level_id:3,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:2,Program_Name:'सडक निर्माण वडा १',parent_id:1,Budget_Amount:2000000,Register_No:'PRJ-001-01',Ward_Number:1,budge_title_id:1,program_type_id:1,budget_source_id:1,budget_area_id:1,department_id:3,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:1},
        {id:3,Program_Name:'पुल निर्माण वडा ३',parent_id:1,Budget_Amount:1500000,Register_No:'PRJ-001-02',Ward_Number:3,budge_title_id:1,program_type_id:1,budget_source_id:2,budget_area_id:2,department_id:3,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:4,Program_Name:'खानेपानी योजना वडा ५',parent_id:1,Budget_Amount:1500000,Register_No:'PRJ-001-03',Ward_Number:5,budge_title_id:1,program_type_id:1,budget_source_id:1,budget_area_id:2,department_id:3,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:0,isCompleted:0},
        {id:5,Program_Name:'सामाजिक विकास कार्यक्रम',parent_id:0,Budget_Amount:3500000,Register_No:'PRJ-002',Ward_Number:0,budge_title_id:2,program_type_id:2,budget_source_id:1,budget_area_id:1,department_id:1,budget_level_id:3,work_type_id:4,budget_type_id:1,isSelected:1,isCompleted:0},
        {id:6,Program_Name:'विद्यालय भवन निर्माण',parent_id:5,Budget_Amount:1500000,Register_No:'PRJ-002-01',Ward_Number:2,budge_title_id:2,program_type_id:1,budget_source_id:2,budget_area_id:1,department_id:1,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:1},
        {id:7,Program_Name:'स्वास्थ्य चौकी निर्माण',parent_id:5,Budget_Amount:1000000,Register_No:'PRJ-002-02',Ward_Number:4,budge_title_id:2,program_type_id:1,budget_source_id:1,budget_area_id:3,department_id:2,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:8,Program_Name:'सामुदायिक भवन',parent_id:5,Budget_Amount:1000000,Register_No:'PRJ-002-03',Ward_Number:6,budge_title_id:2,program_type_id:1,budget_source_id:1,budget_area_id:2,department_id:1,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:0,isCompleted:0},
        {id:9,Program_Name:'कृषि विकास कार्यक्रम',parent_id:0,Budget_Amount:2500000,Register_No:'PRJ-003',Ward_Number:0,budge_title_id:3,program_type_id:2,budget_source_id:2,budget_area_id:2,department_id:4,budget_level_id:3,work_type_id:5,budget_type_id:1,isSelected:1,isCompleted:0},
        {id:10,Program_Name:'सिँचाइ योजना',parent_id:9,Budget_Amount:1500000,Register_No:'PRJ-003-01',Ward_Number:7,budge_title_id:3,program_type_id:1,budget_source_id:2,budget_area_id:2,department_id:4,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:11,Program_Name:'कृषि प्रशिक्षण',parent_id:9,Budget_Amount:1000000,Register_No:'PRJ-003-02',Ward_Number:8,budge_title_id:3,program_type_id:1,budget_source_id:3,budget_area_id:3,department_id:4,budget_level_id:4,work_type_id:5,budget_type_id:1,isSelected:0,isCompleted:1},
        {id:12,Program_Name:'वातावरण संरक्षण कार्यक्रम',parent_id:0,Budget_Amount:1800000,Register_No:'PRJ-004',Ward_Number:0,budge_title_id:5,program_type_id:2,budget_source_id:3,budget_area_id:1,department_id:5,budget_level_id:3,work_type_id:3,budget_type_id:1,isSelected:1,isCompleted:0},
        {id:13,Program_Name:'वृक्षारोपण अभियान',parent_id:12,Budget_Amount:800000,Register_No:'PRJ-004-01',Ward_Number:1,budge_title_id:5,program_type_id:1,budget_source_id:3,budget_area_id:1,department_id:5,budget_level_id:4,work_type_id:3,budget_type_id:1,isSelected:0,isCompleted:1},
        {id:14,Program_Name:'व्यवस्थापन मूल्य',parent_id:0,Budget_Amount:1200000,Register_No:'PRJ-005',Ward_Number:0,budge_title_id:4,program_type_id:3,budget_source_id:1,budget_area_id:1,department_id:0,budget_level_id:3,work_type_id:4,budget_type_id:1,isSelected:0,isCompleted:0},
        {id:15,Program_Name:'यातायात सुधार कार्यक्रम',parent_id:0,Budget_Amount:2200000,Register_No:'PRJ-006',Ward_Number:0,budge_title_id:1,program_type_id:2,budget_source_id:2,budget_area_id:1,department_id:5,budget_level_id:3,work_type_id:2,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:16,Program_Name:'सडक मर्मत सँभार',parent_id:15,Budget_Amount:1200000,Register_No:'PRJ-006-01',Ward_Number:3,budge_title_id:1,program_type_id:1,budget_source_id:2,budget_area_id:1,department_id:5,budget_level_id:4,work_type_id:2,budget_type_id:2,isSelected:1,isCompleted:0},
        {id:17,Program_Name:'पैदल यात्री मार्ग',parent_id:15,Budget_Amount:1000000,Register_No:'PRJ-006-02',Ward_Number:5,budge_title_id:1,program_type_id:1,budget_source_id:1,budget_area_id:1,department_id:5,budget_level_id:4,work_type_id:1,budget_type_id:2,isSelected:0,isCompleted:1}
    ];
    c.plans=[{id:1,program_id:2,year:'2081-82',status:'approved',priority:'high'},{id:2,program_id:3,year:'2081-82',status:'approved',priority:'medium'},{id:3,program_id:6,year:'2081-82',status:'approved',priority:'high'},{id:4,program_id:10,year:'2081-82',status:'pending',priority:'medium'},{id:5,program_id:16,year:'2081-82',status:'pending',priority:'low'},{id:6,program_id:7,year:'2081-82',status:'rejected',priority:'low'}];
    c.agreements=[
        {id:1,agreement_id:'AGR-2081-001',program_id:2,total_budget_amt:2000000,communitee_name:'वडा १ सडक निर्माण समिति',wada_no:1,agreement_date:'2081-03-15',work_start_date:'2081-04-01',work_end_date:'2082-02-15',chairman_name:'हरि बहादुर',vicechairman_name:'गीता देवी',secretory_name:'राम कुमार',estimate_file:'estimate_001.pdf',valuation_file:'valuation_001.pdf'},
        {id:2,agreement_id:'AGR-2081-002',program_id:6,total_budget_amt:1500000,communitee_name:'विद्यालय निर्माण समिति',wada_no:2,agreement_date:'2081-04-01',work_start_date:'2081-04-15',work_end_date:'2082-03-01',chairman_name:'श्याम बहादुर',vicechairman_name:'सरिता देवी',secretory_name:'कृष्ण कुमार',estimate_file:'estimate_002.pdf',valuation_file:'valuation_002.pdf'},
        {id:3,agreement_id:'AGR-2081-003',program_id:3,total_budget_amt:1500000,communitee_name:'पुल निर्माण उपभोक्ता समिति',wada_no:3,agreement_date:'2081-05-10',work_start_date:'2081-05-20',work_end_date:'2082-04-10',chairman_name:'बलभद्र',vicechairman_name:'निर्मला',secretory_name:'दिलिप',estimate_file:'',valuation_file:''}
    ];
    c.financials_nested=[
        {id:1,agreement_id:1,budget_allocated:2000000,expenses:[{id:1,desc:'पहिलो किस्ता',amount:600000,date:'2081-05-01'},{id:2,desc:'दोस्रो किस्ता',amount:500000,date:'2081-08-15'}]},
        {id:2,agreement_id:2,budget_allocated:1500000,expenses:[{id:1,desc:'पहिलो किस्ता',amount:450000,date:'2081-05-15'},{id:2,desc:'दोस्रो किस्ता',amount:400000,date:'2081-09-01'}]},
        {id:3,agreement_id:3,budget_allocated:1500000,expenses:[{id:1,desc:'पहिलो किस्ता',amount:300000,date:'2081-07-01'}]}
    ];
    c.notifications=[
        {id:1,message:'नयाँ सम्झौता AGR-2081-003 दर्ता भयो',type:'agreement',created_at:Date.now()-3600000,is_read:0,user_id:1},
        {id:2,message:'योजना सिँचाइ योजना स्वीकृत भयो',type:'plan_approved',created_at:Date.now()-86400000,is_read:0,user_id:2},
        {id:3,message:'योजना स्वास्थ्य चौकी अस्वीकृत भयो',type:'plan_rejected',created_at:Date.now()-172800000,is_read:0,user_id:2}
    ];
    c.committee_members=[
        {id:1,agreement_id:1,name:'हरि बहादुर थापा',position:'अध्यक्ष',national_id:'1234-5678',address:'वडा १, काठमाडौं'},
        {id:2,agreement_id:1,name:'गीता देवी श्रेष्ठ',position:'सह-अध्यक्ष',national_id:'2345-6789',address:'वडा १, काठमाडौं'},
        {id:3,agreement_id:1,name:'राम कुमार पौडेल',position:'सचिव',national_id:'3456-7890',address:'वडा १, काठमाडौं'},
        {id:4,agreement_id:1,name:'सीता कुमारी',position:'कोषाध्यक्ष',national_id:'4567-8901',address:'वडा १, काठमाडौं'},
        {id:5,agreement_id:2,name:'श्याम बहादुर',position:'अध्यक्ष',national_id:'5678-9012',address:'वडा २, भक्तपुर'},
        {id:6,agreement_id:2,name:'कृष्ण कुमार',position:'सचिव',national_id:'6789-0123',address:'वडा २, भक्तपुर'}
    ];
    c.agreement_letters=[
        {id:1,agreement_id:1,category_id:1,title:'बैंक खाता खोल्ने पत्र',content:'मिति: 2081-03-15\n\nविषय: बैंक खाता खोल्ने बारे\n\nवडा १ सडक निर्माण समिति को तर्फबाट सडक निर्माण वडा १ कार्यक्रम अन्तर्गत बैंक खाता खोल्न अनुरोध।',created_date:'2081-03-16',status:'sent'},
        {id:2,agreement_id:1,category_id:3,title:'कार्य अनुमति पत्र',content:'मिति: 2081-04-01\n\nसडक निर्माण कार्य गर्न अनुमति दिइएको छ।',created_date:'2081-04-01',status:'approved'},
        {id:3,agreement_id:2,category_id:2,title:'कार्य सुरुवात टिप्पणी',content:'विद्यालय भवन निर्माण कार्य सुरु गर्ने बारे टिप्पणी।',created_date:'2081-04-15',status:'draft'}
    ];
    c.budget_details=[
        {id:1,agreement_id:1,EstimateAmt:2000000,EstUserContribution:200000,EstUserFund:1800000,ValuationAmt:1950000,ValUserContribution:195000,ValUserFund:1755000,ValuationDate:'2081-04-10',EstimateBy:'इन्जिनियर राम',EstApprovedBy:'प्रमुख प्रशासन',ValuationBy:'इन्जिनियर श्याम',ValApprovedBy:'प्रमुख प्रशासन',EstStatus:'approved',ValStatus:'approved'},
        {id:2,agreement_id:2,EstimateAmt:1500000,EstUserContribution:150000,EstUserFund:1350000,ValuationAmt:0,ValUserContribution:0,ValUserFund:0,ValuationDate:'',EstimateBy:'इन्जिनियर सीता',EstApprovedBy:'प्रमुख प्रशासन',ValuationBy:'',ValApprovedBy:'',EstStatus:'approved',ValStatus:'pending'},
        {id:3,agreement_id:3,EstimateAmt:1500000,EstUserContribution:150000,EstUserFund:1350000,ValuationAmt:0,ValUserContribution:0,ValUserFund:0,ValuationDate:'',EstimateBy:'',EstApprovedBy:'',ValuationBy:'',ValApprovedBy:'',EstStatus:'pending',ValStatus:'pending'}
    ];
    c.banks=[
        {id:1,name:'Nepal Rastriya Bank',branch:'Kathmandu',account_no:'0101234567',swift:'NBBLNPKA'},
        {id:2,name:'Nepal Bank Limited',branch:'Lalitpur',account_no:'0209876543',swift:'NEBLNPKA'},
        {id:3,name:'Rastriya Banijya Bank',branch:'Bhaktapur',account_no:'0311223344',swift:'RBBLNPKA'},
        {id:4,name:'Agricultural Development Bank',branch:'Kirtipur',account_no:'0412345678',swift:'ADBNNPKA'}
    ];
    c.report_categories=[
        {id:1,name:'Road',parent_id:0,unit:'km',sort_order:1},
        {id:2,name:'Landslide',parent_id:1,unit:'km',sort_order:1},
        {id:3,name:'Clearance',parent_id:1,unit:'km',sort_order:2},
        {id:4,name:'Widening',parent_id:1,unit:'km',sort_order:3},
        {id:5,name:'New Track',parent_id:1,unit:'km',sort_order:4},
        {id:6,name:'Gravelled',parent_id:1,unit:'km',sort_order:5},
        {id:7,name:'Soling',parent_id:1,unit:'km',sort_order:6},
        {id:8,name:'Sedi Bato',parent_id:1,unit:'km',sort_order:7},
        {id:9,name:'Bridge / Culvert and Cause Way',parent_id:0,unit:'nos',sort_order:2},
        {id:10,name:'Foot Trail Bridge',parent_id:9,unit:'nos',sort_order:1},
        {id:11,name:'Motorable Bridge',parent_id:9,unit:'nos',sort_order:2},
        {id:12,name:'Cause Way',parent_id:9,unit:'nos',sort_order:3},
        {id:13,name:'Pavement',parent_id:0,unit:'m',sort_order:3},
        {id:14,name:'Rigid Pavement',parent_id:13,unit:'meter',sort_order:1},
        {id:15,name:'Flexible Pavement',parent_id:13,unit:'meter',sort_order:2}
    ];
    c.agreement_reports=[
        {id:1,agreement_id:1,wada_no:1,report_date:'2081-08-15',entries:JSON.stringify([{cat_id:2,value:0.5},{cat_id:5,value:1.2},{cat_id:10,value:1}])},
        {id:2,agreement_id:2,wada_no:2,report_date:'2081-09-01',entries:JSON.stringify([{cat_id:6,value:2.0},{cat_id:14,value:150}])}
    ];}


/* ===== UTILITY ===== */
function fmt(n){return'Rs. '+Number(n||0).toLocaleString('en-NP')}
function getRef(id,t){const i=XDB.get(t).find(x=>x.id===+id);return i?(i.name||i.name_en||i.Program_Name||''):'-'}
function toast(msg,type='success'){const el=document.createElement('div');el.className='toast-msg '+type;el.textContent=msg;document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),3500)}
function paginate(arr,p,pp=10){const t=Math.ceil(arr.length/pp),s=(p-1)*pp;return{items:arr.slice(s,s+pp),total:t,current:p,count:arr.length}}
function pagHTML(pg,fn){if(pg.total<=1)return'';let h='<div class="pagination mt-3">';h+=`<div class="page-btn" onclick="${fn}(${pg.current-1})"${pg.current<=1?' style="opacity:.4;pointer-events:none"':''}><i class="fas fa-chevron-left"></i></div>`;for(let i=1;i<=pg.total;i++)h+=`<div class="page-btn${i===pg.current?' active':''}" onclick="${fn}(${i})">${i}</div>`;h+=`<div class="page-btn" onclick="${fn}(${pg.current+1})"${pg.current>=pg.total?' style="opacity:.4;pointer-events:none"':''}><i class="fas fa-chevron-right"></i></div>`;h+=`<span style="margin-left:8px;font-size:.78rem;color:var(--muted)">${pg.count} records</span></div>`;return h}
function canWrite(){return App.user&&(App.user.role==='admin'||App.user.role==='data_entry')}
function isAdmin(){return App.user&&App.user.role==='admin'}
function deptFilter(items){if(isAdmin())return items;return items.filter(i=>!i.department_id||i.department_id===(App.user?.department_id||0))}
function timeAgo(ts){const d=Date.now()-ts;if(d<60000)return'Just now';if(d<3600000)return Math.floor(d/60000)+' min ago';if(d<86400000)return Math.floor(d/3600000)+' hours ago';return Math.floor(d/86400000)+' days ago'}
function getParentBudget(pid){return XDB.get('programs').filter(p=>p.parent_id===pid).reduce((s,p)=>s+(p.Budget_Amount||0),0)}

/* ===== APP ===== */
const App={
    user:null,currentPage:'dashboard',charts:{},
    menu:[
        {s:'MAIN'},{id:'dashboard',icon:'fa-th-large',label:'Dashboard'},
        {s:'MANAGEMENT'},{id:'programs',icon:'fa-project-diagram',label:'Programs'},{id:'planning',icon:'fa-clipboard-list',label:'Planning'},{id:'agreements',icon:'fa-file-contract',label:'Agreements'},
        {s:'FINANCE'},{id:'financial',icon:'fa-money-bill-wave',label:'Financial'},
        {s:'ANALYTICS'},{id:'reports',icon:'fa-chart-bar',label:'Reports'},
        {s:'SYSTEM'},{id:'users',icon:'fa-users-cog',label:'User Management',admin:1},{id:'settings',icon:'fa-cogs',label:'Settings'},{id:'notifications',icon:'fa-bell',label:'Notifications'}
    ],
    login(){
        const email=document.getElementById('login-email').value.trim(),pass=document.getElementById('login-password').value;
        const u=XDB.get('users').find(x=>x.email===email&&x.password===pass);
        if(!u){const e=document.getElementById('login-error');e.classList.remove('d-none');e.textContent='Invalid credentials';return}
        this.user=u;
        // Save session to sessionStorage (survives page refresh, clears on tab close unless explicit logout)
        sessionStorage.setItem('pms_session',JSON.stringify({userId:u.id,loginTime:Date.now()}));
        this.showApp();toast('Welcome, '+u.name);
    },
    logout(){
        sessionStorage.removeItem('pms_session');
        this.user=null;document.getElementById('app').style.display='none';document.getElementById('setup-page').style.display='flex';document.getElementById('setup-main').style.display='block';document.getElementById('login-section').style.display='none';document.getElementById('db-indicator').style.display='none'
    },
    showApp(){
        document.getElementById('setup-page').style.display='none';document.getElementById('app').style.display='block';
        document.getElementById('db-indicator').style.display='flex';
        document.getElementById('db-file-label').textContent='Database: '+XDB.fileName;
        const st=document.getElementById('session-timer');if(st)st.style.display='flex';
        const stxt=document.getElementById('st-text');if(stxt)stxt.textContent=this.user.name;
        this.buildSidebar();this.buildUser();this.navigate('dashboard');
    },
    buildSidebar(){
        let h='';this.menu.forEach(m=>{if(m.s){h+=`<div class="nav-section">${m.s}</div>`;return}if(m.admin&&!isAdmin())return;h+=`<div class="nav-item${m.id===this.currentPage?' active':''}" onclick="App.navigate('${m.id}')"><i class="fas ${m.icon}"></i><span>${m.label}</span></div>`});
        document.getElementById('sidebar-nav').innerHTML=h;
    },
    buildUser(){
        const u=this.user,rn={admin:'Administrator',data_entry:'Data Entry',viewer:'Viewer'}[u.role],d=u.department_id?getRef(u.department_id,'departments'):'All Departments';
        document.getElementById('sidebar-user').innerHTML=`<div class="avatar">${u.name.charAt(0)}</div><div><div class="name">${u.name}</div><div class="role">${rn} - ${d}</div></div>`;
    },
    navigate(p){
        this.currentPage=p;Object.values(this.charts).forEach(c=>{if(c&&c.destroy)c.destroy()});this.charts={};this.buildSidebar();
        document.getElementById('page-title').textContent=this.menu.find(m=>m.id===p)?.label||'Dashboard';
        const R={dashboard:PG.dashboard,programs:PG.programs,planning:PG.planning,agreements:PG.agreements,financial:PG.financial,reports:PG.reports,users:PG.users,settings:PG.settings,notifications:PG.notifications};
        if(R[p])R[p](document.getElementById('content-area'));
        document.getElementById('sidebar').classList.remove('mobile-open');document.getElementById('sidebar-overlay').classList.remove('show');
    },
    toggleSidebar(){if(window.innerWidth<=768){document.getElementById('sidebar').classList.toggle('mobile-open');document.getElementById('sidebar-overlay').classList.toggle('show')}else{document.getElementById('sidebar').classList.toggle('collapsed');document.getElementById('main-wrap').classList.toggle('expanded')}},
    openModal(t,b,w){document.getElementById('modal-title').textContent=t;document.getElementById('modal-body').innerHTML=b;document.getElementById('modal-box').style.maxWidth=w||'680px';document.getElementById('modal-overlay').classList.add('show')},
    closeModal(){document.getElementById('modal-overlay').classList.remove('show')},
    toggleNotif(){const p=document.getElementById('notif-panel');p.classList.toggle('show');if(p.classList.contains('show'))this.renderNotif()},
    renderNotif(){
        const ns=XDB.get('notifications').filter(n=>!n.user_id||n.user_id===this.user.id).sort((a,b)=>b.created_at-a.created_at).slice(0,10);
        document.getElementById('notif-dot').style.display=ns.filter(n=>!n.is_read).length?'block':'none';
        if(!ns.length){document.getElementById('notif-panel').innerHTML='<div style="padding:18px;text-align:center;color:var(--muted);font-size:.82rem">No notifications</div>';return}
        let h=`<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-weight:700;font-size:.85rem;display:flex;justify-content:space-between;align-items:center">Notifications<button class="btn-outline-gold" style="padding:3px 10px;font-size:.72rem" onclick="App.markAllRead()">Read All</button></div>`;
        ns.forEach(n=>{h+=`<div class="notif-item${n.is_read?'':' unread'}" onclick="App.markRead(${n.id})"><div class="nt">${n.message}</div><div class="ntm">${timeAgo(n.created_at)}</div></div>`});
        document.getElementById('notif-panel').innerHTML=h;
    },
    markRead(id){const ns=XDB.get('notifications');const n=ns.find(x=>x.id===id);if(n)n.is_read=1;XDB.set('notifications',ns);this.renderNotif()},
    markAllRead(){const ns=XDB.get('notifications');ns.forEach(n=>{if(!n.user_id||n.user_id===this.user.id)n.is_read=1});XDB.set('notifications',ns);this.renderNotif()},
    addNotif(msg,type,uid=0){const ns=XDB.get('notifications');ns.push({id:XDB.nextId('notifications'),message:msg,type,created_at:Date.now(),is_read:0,user_id:uid});XDB.set('notifications',ns)},
    exportCSV(fn,rows){if(!rows.length){toast('No data','warning');return}const h=Object.keys(rows[0]);let c=h.join(',')+'\n';rows.forEach(r=>{c+=h.map(k=>`"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')+'\n'});const b=new Blob(['\uFEFF'+c],{type:'text/csv;charset=utf-8;'});const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=fn+'.csv';l.click();toast('Exported')}
};

/* ===== PAGES ===== */
const PG={};

PG.dashboard=(el)=>{
    const progs=deptFilter(XDB.get('programs')),agrs=XDB.get('agreements'),fins=XDB.get('financials');
    const tBud=progs.reduce((s,p)=>s+(p.Budget_Amount||0),0),comp=progs.filter(p=>p.isCompleted).length,ong=progs.length-comp;
    const tExp=fins.reduce((s,f)=>s+f.expenses.reduce((a,e)=>a+(e.amount||0),0),0),tAlloc=fins.reduce((s,f)=>s+(f.budget_allocated||0),0);
    el.innerHTML=`
    <div class="row g-3 mb-4">
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-project-diagram"></i></div><div class="stat-value">${progs.length}</div><div class="stat-label">Total Programs</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-money-bill-wave"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tBud)}</div><div class="stat-label">Total Budget</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(45,125,154,.1);color:var(--info)"><i class="fas fa-spinner"></i></div><div class="stat-value">${ong}</div><div class="stat-label">Ongoing</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-check-circle"></i></div><div class="stat-value">${comp}</div><div class="stat-label">Completed</div></div></div>
    </div>
    <div class="row g-3 mb-4">
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(199,124,26,.1);color:var(--warning)"><i class="fas fa-file-contract"></i></div><div class="stat-value">${agrs.length}</div><div class="stat-label">Agreements</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(192,57,43,.1);color:var(--danger)"><i class="fas fa-receipt"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tExp)}</div><div class="stat-label">Expenses</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(26,107,90,.1);color:var(--accent2)"><i class="fas fa-piggy-bank"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tAlloc-tExp)}</div><div class="stat-label">Remaining</div></div></div>
        <div class="col-lg-3 col-md-6"><div class="stat-card"><div class="stat-icon" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-bell"></i></div><div class="stat-value">${XDB.get('notifications').filter(n=>!n.is_read&&(!n.user_id||n.user_id===App.user.id)).length}</div><div class="stat-label">Unread Alerts</div></div></div>
    </div>
    <div class="row g-3 mb-4">
        <div class="col-lg-8"><div class="panel"><div class="panel-head"><h5>Budget by Department</h5></div><div class="panel-body"><canvas id="ch1" height="250"></canvas></div></div></div>
        <div class="col-lg-4"><div class="panel"><div class="panel-head"><h5>Completion Status</h5></div><div class="panel-body"><canvas id="ch2" height="250"></canvas></div></div></div>
    </div>
    <div class="row g-3 mb-4">
        <div class="col-lg-6"><div class="panel"><div class="panel-head"><h5>Budget by Ward</h5></div><div class="panel-body"><canvas id="ch3" height="220"></canvas></div></div></div>
        <div class="col-lg-6"><div class="panel"><div class="panel-head"><h5>Budget by Source</h5></div><div class="panel-body"><canvas id="ch4" height="220"></canvas></div></div></div>
    </div>
    ${isAdmin()?`<div class="row g-3 mb-4"><div class="col-12"><div class="panel"><div class="panel-head"><h5>Recent Notifications</h5></div><div class="panel-body">${PG._notifTable()}</div></div></div></div>`:''}`;

    const depts=XDB.get('departments'),dd=depts.map(d=>({n:d.name,b:progs.filter(p=>p.department_id===d.id).reduce((s,p)=>s+(p.Budget_Amount||0),0)})).filter(d=>d.b>0);
    App.charts.d1=new Chart(document.getElementById('ch1'),{type:'bar',data:{labels:dd.map(d=>d.n),datasets:[{data:dd.map(d=>d.b),backgroundColor:['#c9a227','#1a6b5a','#2d7d9a','#c77c1a','#c0392b'],borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>(v/1e6).toFixed(1)+'M'}}}}});
    App.charts.d2=new Chart(document.getElementById('ch2'),{type:'doughnut',data:{labels:['Completed','Ongoing'],datasets:[{data:[comp,ong],backgroundColor:['#1a6b5a','#c9a227'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:14,usePointStyle:true}}},cutout:'65%'}});
    const wd={};progs.forEach(p=>{if(p.Ward_Number>0)wd[p.Ward_Number]=(wd[p.Ward_Number]||0)+(p.Budget_Amount||0)});const wl=Object.keys(wd).sort((a,b)=>a-b);
    App.charts.d3=new Chart(document.getElementById('ch3'),{type:'bar',data:{labels:wl.map(w=>'वडा '+w),datasets:[{data:wl.map(w=>wd[w]),backgroundColor:'#1a6b5a',borderRadius:5,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>(v/1e6).toFixed(1)+'M'}}}}});
    const srcs=XDB.get('budget_sources'),sd=srcs.map(s=>({n:s.name,b:progs.filter(p=>p.budget_source_id===s.id).reduce((a,p)=>a+(p.Budget_Amount||0),0)})).filter(s=>s.b>0);
    App.charts.d4=new Chart(document.getElementById('ch4'),{type:'pie',data:{labels:sd.map(s=>s.n),datasets:[{data:sd.map(s=>s.b),backgroundColor:['#c9a227','#1a6b5a','#2d7d9a','#c77c1a'],borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{padding:12,usePointStyle:true}}}}});
};
PG._notifTable=()=>{const ns=XDB.get('notifications').sort((a,b)=>b.created_at-a.created_at).slice(0,5);if(!ns.length)return'<p style="color:var(--muted);font-size:.85rem">No notifications</p>';return`<div class="table-wrap"><table><thead><tr><th>Message</th><th>Time</th><th></th></tr></thead><tbody>${ns.map(n=>`<tr><td>${n.message}</td><td style="white-space:nowrap">${timeAgo(n.created_at)}</td><td><span class="${n.is_read?'badge-teal':'badge-gold'}">${n.is_read?'Read':'Unread'}</span></td></tr>`).join('')}</tbody></table></div>`};

/* ===== PROGRAMS PAGE ===== */
PG.programs=(el,page=1)=>{
    const progs=deptFilter(XDB.get('programs'));
    el.innerHTML=`
    <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-project-diagram"></i></div><div><div class="stat-value" style="font-size:1.3rem">${progs.length}</div><div class="stat-label">Total Programs</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-check-circle"></i></div><div><div class="stat-value" style="font-size:1.3rem">${progs.filter(p=>p.isCompleted).length}</div><div class="stat-label">Completed</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(192,57,43,.1);color:var(--danger)"><i class="fas fa-spinner"></i></div><div><div class="stat-value" style="font-size:1.3rem">${progs.filter(p=>!p.isCompleted).length}</div><div class="stat-label">Ongoing</div></div></div></div></div>
    </div>
    <div class="panel no-print">
        <div class="panel-head">
            <div class="d-flex gap-2 align-items-center flex-wrap">
                <input type="text" id="ps" class="form-control form-control-sm" style="width:200px" placeholder="Search..." onkeyup="PG._pf()">
                <select id="pw" class="form-select form-select-sm" style="width:120px" onchange="PG._pf()"><option value="">All Wards</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}">वडा ${w}</option>`).join('')}</select>
                <select id="pst" class="form-select form-select-sm" style="width:130px" onchange="PG._pf()"><option value="">All Status</option><option value="1">Completed</option><option value="0">Ongoing</option></select>
                <select id="pdt" class="form-select form-select-sm" style="width:160px" onchange="PG._pf()"><option value="">All Departments</option>${XDB.get('departments').map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select>
            </div>
            ${canWrite()?'<button class="btn-gold-sm" onclick="PG.pf()"><i class="fas fa-plus me-1"></i>Add Program</button>':''}
        </div>
        <div class="panel-body">
            <div class="table-wrap"><table><thead><tr><th>Reg No</th><th>Program Name</th><th>Type</th><th>Ward</th><th>Budget</th><th>Dept</th><th>Status</th><th>Selected</th><th>Actions</th></tr></thead><tbody id="ptb"></tbody></table></div>
            <div id="ppg"></div>
        </div>
    </div>`;
    PG._pd=progs;PG._pp=page;PG._pf();
};
PG._pf=()=>{
    const s=(document.getElementById('ps')?.value||'').toLowerCase(),w=document.getElementById('pw')?.value,st=document.getElementById('pst')?.value,dt=document.getElementById('pdt')?.value;
    let f=PG._pd;if(s)f=f.filter(p=>p.Program_Name.toLowerCase().includes(s)||p.Register_No.toLowerCase().includes(s));if(w)f=f.filter(p=>p.Ward_Number===+w);if(st!==''&&st!==undefined)f=f.filter(p=>p.isCompleted===+st);if(dt)f=f.filter(p=>p.department_id===+dt);
    f.sort((a,b)=>a.id-b.id);const pg=paginate(f,PG._pp||1,10),tb=document.getElementById('ptb');if(!tb)return;
    const all=XDB.get('programs');
    tb.innerHTML=pg.items.map(p=>{const ip=all.some(c=>c.parent_id===p.id),cb=ip?getParentBudget(p.id):0,tp=p.parent_id?'Child':ip?'Parent':'Standalone';return`<tr><td><code style="font-size:.78rem;background:rgba(201,162,39,.08);padding:2px 5px;border-radius:4px">${p.Register_No}</code></td><td><strong>${p.parent_id?'<span style="color:var(--muted)">↳ </span>':''}${p.Program_Name}</strong>${ip?`<div style="font-size:.72rem;color:var(--muted)">Child total: ${fmt(cb)}</div>`:''}</td><td><span class="badge-${tp==='Parent'?'gold':tp==='Child'?'blue':'teal'}">${tp}</span></td><td>${p.Ward_Number||'-'}</td><td style="white-space:nowrap;font-weight:600">${fmt(p.Budget_Amount)}</td><td style="font-size:.8rem">${getRef(p.department_id,'departments')}</td><td><span class="${p.isCompleted?'badge-teal':'badge-red'}">${p.isCompleted?'Completed':'Ongoing'}</span></td><td>${p.isSelected?'<i class="fas fa-check-circle" style="color:var(--success)"></i>':'<i class="fas fa-times-circle" style="color:var(--muted);opacity:.3"></i>'}</td><td class="no-print">${canWrite()?`<button class="btn-ism me-1" onclick="PG.pf(${p.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="PG.pdel(${p.id})"><i class="fas fa-trash"></i></button>`:'-'}</td></tr>`}).join('');
    document.getElementById('ppg').innerHTML=pagHTML(pg,'PG._ppg');
};
PG._ppg=p=>{PG._pp=p;PG._pf()};
PG.pf=(id)=>{
    const progs=XDB.get('programs'),p=id?progs.find(x=>x.id===id):null;
    const popts=progs.filter(x=>!x.parent_id&&x.id!==id).map(x=>`<option value="${x.id}"${p&&p.parent_id===x.id?' selected':''}>${x.Program_Name}</option>`).join('');
    const depts=XDB.get('departments'),bt=XDB.get('budget_titles'),pt=XDB.get('program_types'),bs=XDB.get('budget_sources'),ba=XDB.get('budget_areas'),bl=XDB.get('budget_levels'),wt=XDB.get('work_types'),bty=XDB.get('budget_types');
    const sel=(v,c)=>c.map(x=>`<option value="${x.id}"${v===x.id?' selected':''}>${x.name}</option>`).join('');
    App.openModal(id?'Edit Program':'Add Program',`<form onsubmit="PG.psave(event,${id||0})"><div class="row g-3">
    <div class="col-md-6"><label class="form-label">Program Name *</label><input type="text" class="form-control" name="Program_Name" value="${p?.Program_Name||''}" required></div>
    <div class="col-md-6"><label class="form-label">Parent Program</label><select class="form-select" name="parent_id"><option value="0">None (Top Level)</option>${popts}</select></div>
    <div class="col-md-4"><label class="form-label">Register No *</label><input type="text" class="form-control" name="Register_No" value="${p?.Register_No||''}" required></div>
    <div class="col-md-4"><label class="form-label">Ward Number</label><select class="form-select" name="Ward_Number"><option value="0">None</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}"${p?.Ward_Number===w?' selected':''}>${w}</option>`).join('')}</select></div>
    <div class="col-md-4"><label class="form-label">Budget Amount *</label><input type="number" class="form-control" name="Budget_Amount" value="${p?.Budget_Amount||''}" required min="0"></div>
    <div class="col-md-4"><label class="form-label">Budget Title</label><select class="form-select" name="budge_title_id"><option value="0">Select</option>${sel(p?.budge_title_id,bt)}</select></div>
    <div class="col-md-4"><label class="form-label">Program Type</label><select class="form-select" name="program_type_id"><option value="0">Select</option>${sel(p?.program_type_id,pt)}</select></div>
    <div class="col-md-4"><label class="form-label">Budget Source</label><select class="form-select" name="budget_source_id"><option value="0">Select</option>${sel(p?.budget_source_id,bs)}</select></div>
    <div class="col-md-4"><label class="form-label">Budget Area</label><select class="form-select" name="budget_area_id"><option value="0">Select</option>${sel(p?.budget_area_id,ba)}</select></div>
    <div class="col-md-4"><label class="form-label">Budget Level</label><select class="form-select" name="budget_level_id"><option value="0">Select</option>${sel(p?.budget_level_id,bl)}</select></div>
    <div class="col-md-4"><label class="form-label">Work Type</label><select class="form-select" name="work_type_id"><option value="0">Select</option>${sel(p?.work_type_id,wt)}</select></div>
    <div class="col-md-4"><label class="form-label">Budget Type</label><select class="form-select" name="budget_type_id"><option value="0">Select</option>${sel(p?.budget_type_id,bty)}</select></div>
    <div class="col-md-4"><label class="form-label">Department</label><select class="form-select" name="department_id"><option value="0">None</option>${sel(p?.department_id,depts)}</select></div>
    <div class="col-md-3"><label class="form-label">Selected</label><select class="form-select" name="isSelected"><option value="0"${!p?.isSelected?' selected':''}>No</option><option value="1"${p?.isSelected?' selected':''}>Yes</option></select></div>
    <div class="col-md-3"><label class="form-label">Completed</label><select class="form-select" name="isCompleted"><option value="0"${!p?.isCompleted?' selected':''}>No</option><option value="1"${p?.isCompleted?' selected':''}>Yes</option></select></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'820px');
};
PG.psave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());
    d.Budget_Amount=+d.Budget_Amount;d.parent_id=+d.parent_id;d.Ward_Number=+d.Ward_Number;d.budge_title_id=+d.budge_title_id;d.program_type_id=+d.program_type_id;d.budget_source_id=+d.budget_source_id;d.budget_area_id=+d.budget_area_id;d.department_id=+d.department_id;d.isSelected=+d.isSelected;d.isCompleted=+d.isCompleted;
    d.budget_level_id=+(d.budget_level_id||0);d.work_type_id=+(d.work_type_id||0);d.budget_type_id=+(d.budget_type_id||0);
    const progs=XDB.get('programs');if(progs.find(p=>p.Program_Name===d.Program_Name&&p.id!==id)){toast('Duplicate program name!','error');return}
    if(id){const i=progs.findIndex(p=>p.id===id);if(i>=0)progs[i]={...progs[i],...d}}else{d.id=XDB.nextId('programs');progs.push(d)}
    XDB.set('programs',progs);App.closeModal();toast(id?'Updated':'Added');PG.programs(document.getElementById('content-area'));
};
PG.pdel=(id)=>{
    if(XDB.get('programs').some(p=>p.parent_id===id)){toast('Has child programs','error');return}
    App.openModal('Confirm Delete',`<p>Delete this program?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('programs',XDB.get('programs').filter(p=>p.id!==${id}));App.closeModal();toast('Deleted');PG.programs(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'400px');
};

/* ===== PLANNING PAGE ===== */
PG.planning=(el,page=1)=>{
    const plans=XDB.get('plans');
    const approved=plans.filter(p=>p.status==='approved').length,pending=plans.filter(p=>p.status==='pending').length,rejected=plans.filter(p=>p.status==='rejected').length;
    el.innerHTML=`
    <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-check-circle"></i></div><div><div class="stat-value" style="font-size:1.3rem">${approved}</div><div class="stat-label">Approved Plans</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-clock"></i></div><div><div class="stat-value" style="font-size:1.3rem">${pending}</div><div class="stat-label">Pending Plans</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(192,57,43,.1);color:var(--danger)"><i class="fas fa-times-circle"></i></div><div><div class="stat-value" style="font-size:1.3rem">${rejected}</div><div class="stat-label">Rejected Plans</div></div></div></div></div>
    </div>
    <div class="panel no-print">
        <div class="panel-head">
            <div class="d-flex gap-2">
                <select id="plf" class="form-select form-select-sm" style="width:130px" onchange="PG._plf()"><option value="">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                <select id="plpr" class="form-select form-select-sm" style="width:130px" onchange="PG._plf()"><option value="">All Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
            </div>
            ${canWrite()?'<button class="btn-gold-sm" onclick="PG.plForm()"><i class="fas fa-plus me-1"></i>Add Plan</button>':''}
        </div>
        <div class="panel-body">
            <div class="table-wrap"><table><thead><tr><th>Program</th><th>Reg No</th><th>Year</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody id="pltb"></tbody></table></div>
            <div id="plpg"></div>
        </div>
    </div>`;
    PG._pld=plans;PG._plp=page;PG._plf();
};
PG._plf=()=>{
    const st=document.getElementById('plf')?.value,pr=document.getElementById('plpr')?.value;let f=PG._pld;if(st)f=f.filter(p=>p.status===st);if(pr)f=f.filter(p=>p.priority===pr);f.sort((a,b)=>b.id-a.id);
    const pg=paginate(f,PG._plp||1,10),tb=document.getElementById('pltb');if(!tb)return;
    tb.innerHTML=pg.items.map(p=>{const prog=XDB.get('programs').find(x=>x.id===p.program_id);return`<tr><td><strong>${prog?.Program_Name||'-'}</strong></td><td><code style="font-size:.78rem;background:rgba(201,162,39,.08);padding:2px 5px;border-radius:4px">${prog?.Register_No||'-'}</code></td><td>${p.year}</td><td><span class="badge-${p.priority==='high'?'red':p.priority==='medium'?'gold':'blue'}">${p.priority}</span></td><td><span class="badge-${p.status==='approved'?'teal':p.status==='rejected'?'red':'gold'}">${p.status}</span></td><td class="no-print">${isAdmin()&&p.status==='pending'?`<button class="btn-ssm me-1" onclick="PG.plAct(${p.id},'approved')" title="Approve"><i class="fas fa-check"></i></button><button class="btn-dsm me-1" onclick="PG.plAct(${p.id},'rejected')" title="Reject"><i class="fas fa-times"></i></button>`:''}${canWrite()?`<button class="btn-ism me-1" onclick="PG.plForm(${p.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="XDB.set('plans',XDB.get('plans').filter(x=>x.id!==${p.id}));toast('Deleted');PG.planning(document.getElementById('content-area'))"><i class="fas fa-trash"></i></button>`:''}</td></tr>`}).join('');
    document.getElementById('plpg').innerHTML=pagHTML(pg,'PG._plpg');
};
PG._plpg=p=>{PG._plp=p;PG._plf()};
PG.plForm=(id)=>{
    const plans=XDB.get('plans'),p=id?plans.find(x=>x.id===id):null,progs=XDB.get('programs');
    App.openModal(id?'Edit Plan':'Add Plan',`<form onsubmit="PG.plSave(event,${id||0})"><div class="row g-3"><div class="col-md-6"><label class="form-label">Program *</label><select class="form-select" name="program_id" required>${progs.map(x=>`<option value="${x.id}"${p?.program_id===x.id?' selected':''}>${x.Program_Name}</option>`).join('')}</select></div><div class="col-md-3"><label class="form-label">Year *</label><input type="text" class="form-control" name="year" value="${p?.year||'2081-82'}" required></div><div class="col-md-3"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="low"${p?.priority==='low'?' selected':''}>Low</option><option value="medium"${p?.priority==='medium'?' selected':''}>Medium</option><option value="high"${p?.priority==='high'?' selected':''}>High</option></select></div></div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`);
};
PG.plSave=(e,id)=>{e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());d.program_id=+d.program_id;const plans=XDB.get('plans');if(id){const i=plans.findIndex(p=>p.id===id);if(i>=0)plans[i]={...plans[i],...d}}else{d.id=XDB.nextId('plans');d.status='pending';plans.push(d)}XDB.set('plans',plans);App.closeModal();toast(id?'Updated':'Added');PG.planning(document.getElementById('content-area'))};
PG.plAct=(id,st)=>{const plans=XDB.get('plans'),p=plans.find(x=>x.id===id);if(!p)return;p.status=st;XDB.set('plans',plans);const pr=XDB.get('programs').find(x=>x.id===p.program_id);const msg=st==='approved'?`योजना "${pr?.Program_Name||''}" स्वीकृत भयो`:`योजना "${pr?.Program_Name||''}" अस्वीकृत भयो`;XDB.get('users').filter(u=>u.role==='data_entry').forEach(u=>App.addNotif(msg,st==='approved'?'plan_approved':'plan_rejected',u.id));toast('Plan '+st);PG.planning(document.getElementById('content-area'))};

/* ===== AGREEMENTS PAGE ===== */
PG.agreements=(el,page=1)=>{
    const agrs=XDB.get('agreements');
    const tBudget=agrs.reduce((s,a)=>s+(a.total_budget_amt||0),0);
    el.innerHTML=`
    <div class="row g-3 mb-3">
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(199,124,26,.1);color:var(--warning)"><i class="fas fa-file-contract"></i></div><div><div class="stat-value" style="font-size:1.3rem">${agrs.length}</div><div class="stat-label">Total Agreements</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-money-bill-wave"></i></div><div><div class="stat-value" style="font-size:1.1rem">${fmt(tBudget)}</div><div class="stat-label">Total Budget</div></div></div></div></div>
        <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(45,125,154,.1);color:var(--info)"><i class="fas fa-users"></i></div><div><div class="stat-value" style="font-size:1.3rem">${[...new Set(agrs.map(a=>a.wada_no))].length}</div><div class="stat-label">Wards Covered</div></div></div></div></div>
    </div>
    <div class="panel no-print">
        <div class="panel-head">
            <div class="d-flex gap-2 flex-wrap align-items-center">
                <input type="text" id="as" class="form-control form-control-sm" style="width:200px" placeholder="Search ID / Committee..." onkeyup="PG._af()">
                <select id="aw2" class="form-select form-select-sm" style="width:110px" onchange="PG._af()"><option value="">All Wards</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}">वडा ${w}</option>`).join('')}</select>
            </div>
            <div class="d-flex gap-2">
                ${canWrite()?'<button class="btn-gold-sm" onclick="PG.afForm()"><i class="fas fa-plus me-1"></i>New Agreement</button>':''}
                <button class="btn-outline-gold" onclick="App.exportCSV('agreements',XDB.get('agreements'))"><i class="fas fa-file-csv me-1"></i>CSV</button>
            </div>
        </div>
        <div class="panel-body">
            <div class="table-wrap"><table><thead><tr><th>Agreement ID</th><th>Reg No</th><th>Program</th><th>Committee</th><th>Ward</th><th>Budget</th><th>Date</th><th>Files</th><th>Actions</th></tr></thead><tbody id="atb"></tbody></table></div>
            <div id="apg"></div>
        </div>
    </div>`;
    PG._ad=agrs;PG._ap=page;PG._af();
};
PG._af=()=>{
    const s=(document.getElementById('as')?.value||'').toLowerCase(),w=document.getElementById('aw2')?.value;
    let f=PG._ad;
    if(s)f=f.filter(a=>a.agreement_id.toLowerCase().includes(s)||a.communitee_name.toLowerCase().includes(s));
    if(w)f=f.filter(a=>a.wada_no===+w);
    f.sort((a,b)=>b.id-a.id);
    const pg=paginate(f,PG._ap||1,10),tb=document.getElementById('atb');if(!tb)return;
    tb.innerHTML=pg.items.map(a=>{
        const pr=XDB.get('programs').find(p=>p.id===a.program_id);
        return`<tr>
            <td><a class="view-link" onclick="PG.agreementDetail(${a.id})"><i class="fas fa-external-link-alt"></i> ${a.agreement_id}</a></td>
            <td><code style="font-size:.78rem;background:rgba(201,162,39,.08);padding:2px 5px;border-radius:4px">${pr?.Register_No||'-'}</code></td>
            <td style="font-size:.84rem">${pr?.Program_Name||'-'}</td>
            <td style="font-size:.84rem">${a.communitee_name}</td>
            <td>${a.wada_no}</td>
            <td style="font-weight:600">${fmt(a.total_budget_amt)}</td>
            <td style="white-space:nowrap">${a.agreement_date}</td>
            <td>${a.estimate_file||a.valuation_file?'<i class="fas fa-paperclip" style="color:var(--accent)"></i>':'<span style="color:var(--muted);font-size:.78rem">None</span>'}</td>
            <td class="no-print">
                <button class="btn-ism me-1" onclick="PG.agreementDetail(${a.id})" title="View Detail"><i class="fas fa-eye"></i></button>
                <button class="btn-ism me-1" onclick="PG.afPrint(${a.id})" title="Print"><i class="fas fa-print"></i></button>
                ${canWrite()?`<button class="btn-ism me-1" onclick="PG.afForm(${a.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="XDB.set('agreements',XDB.get('agreements').filter(x=>x.id!==${a.id}));XDB.set('financials',XDB.get('financials').filter(x=>x.agreement_id!==${a.id}));toast('Deleted');PG.agreements(document.getElementById('content-area'))"><i class="fas fa-trash"></i></button>`:''}
            </td>
        </tr>`}).join('');
    document.getElementById('apg').innerHTML=pagHTML(pg,'PG._apg');
};
PG._apg=p=>{PG._ap=p;PG._af()};

/* ===== AGREEMENT DETAIL PAGE ===== */
PG.agreementDetail=(id,tab)=>{
    const a=XDB.get('agreements').find(x=>x.id===id);if(!a)return;
    const pr=XDB.get('programs').find(p=>p.id===a.program_id);
    const dept=pr?getRef(pr.department_id,'departments'):'';
    const bt=pr?getRef(pr.budge_title_id,'budget_titles'):'';
    const ba=pr?getRef(pr.budget_area_id,'budget_areas'):'';
    const bs=pr?getRef(pr.budget_source_id,'budget_sources'):'';
    const pt=pr?getRef(pr.program_type_id,'program_types'):'';
    const bl=pr?getRef(pr.budget_level_id,'budget_levels'):'';
    const wt=pr?getRef(pr.work_type_id,'work_types'):'';
    const bty=pr?getRef(pr.budget_type_id,'budget_types'):'';
    const fin=XDB.get('financials').find(f=>f.agreement_id===id);
    const expenses=fin?fin.expenses:[];
    const totalExp=expenses.reduce((s,e)=>s+(e.amount||0),0);
    const allocated=fin?fin.budget_allocated:0;
    const remaining=allocated-totalExp;
    const pct=allocated?Math.round(totalExp/allocated*100):0;
    const barColor=pct>90?'var(--danger)':pct>60?'var(--warning)':'var(--success)';
    const members=XDB.get('committee_members').filter(m=>m.agreement_id===id);
    const letters=XDB.get('agreement_letters').filter(l=>l.agreement_id===id);
    const bd=XDB.get('budget_details').find(b=>b.agreement_id===id);
    const activeTab=tab||'overview';

    const el=document.getElementById('content-area');
    App.currentPage='agreements';
    document.getElementById('page-title').textContent='Agreement Detail';
    el.innerHTML=`
    <div class="back-link no-print" onclick="PG.agreements(document.getElementById('content-area'))"><i class="fas fa-arrow-left"></i> Back to Agreements</div>
    <div class="detail-header mb-3">
        <div class="agr-id"><i class="fas fa-file-contract me-1"></i>Agreement Document</div>
        <h3>${a.agreement_id}</h3>
        <div class="sub-info">${a.communitee_name} &nbsp;·&nbsp; Ward ${a.wada_no} &nbsp;·&nbsp; Date: ${a.agreement_date}</div>
        <div class="mt-3 no-print d-flex gap-2 flex-wrap">
            <button class="btn-gold-sm" onclick="PG.afPrint(${a.id})"><i class="fas fa-print me-1"></i>Print Agreement</button>
            ${canWrite()?`<button class="btn-outline-gold" style="color:#fff!important;border-color:rgba(255,255,255,.3)" onclick="PG.afForm(${a.id})"><i class="fas fa-edit me-1"></i>Edit</button>`:''}
        </div>
    </div>
    <div class="detail-tabs no-print">
        <div class="detail-tab${activeTab==='overview'?' active':''}" onclick="PG.agreementDetail(${id},'overview')"><i class="fas fa-info-circle me-1"></i>Overview</div>
        <div class="detail-tab${activeTab==='members'?' active':''}" onclick="PG.agreementDetail(${id},'members')"><i class="fas fa-users me-1"></i>Committee Members <span class="badge-blue ms-1">${members.length}</span></div>
        <div class="detail-tab${activeTab==='letters'?' active':''}" onclick="PG.agreementDetail(${id},'letters')"><i class="fas fa-envelope me-1"></i>Letters <span class="badge-blue ms-1">${letters.length}</span></div>
        <div class="detail-tab${activeTab==='budget'?' active':''}" onclick="PG.agreementDetail(${id},'budget')"><i class="fas fa-calculator me-1"></i>Budget Details</div>
        <div class="detail-tab${activeTab==='financial'?' active':''}" onclick="PG.agreementDetail(${id},'financial')"><i class="fas fa-money-bill-wave me-1"></i>Expenses</div>
    </div>
    <div id="detail-tab-content"></div>`;

    // Render correct tab
    if(activeTab==='overview') PG._detailOverview(a,pr,dept,bt,ba,bs,pt,bl,wt,bty);
    else if(activeTab==='members') PG._detailMembers(id,members);
    else if(activeTab==='letters') PG._detailLetters(id,letters);
    else if(activeTab==='budget') PG._detailBudget(id,a,bd);
    else if(activeTab==='financial') PG._detailFinancial(id,a,fin,allocated,totalExp,remaining,pct,barColor,expenses);
};

PG._detailOverview=(a,pr,dept,bt,ba,bs,pt,bl,wt,bty)=>{
    document.getElementById('detail-tab-content').innerHTML=`
    <div class="detail-meta-grid mb-4">
        <div class="detail-meta-card"><div class="dmk">Program</div><div class="dmv">${pr?.Program_Name||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Register No</div><div class="dmv"><code style="font-size:.88rem;background:rgba(201,162,39,.1);padding:2px 8px;border-radius:4px">${pr?.Register_No||'-'}</code></div></div>
        <div class="detail-meta-card"><div class="dmk">Department</div><div class="dmv">${dept||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Budget Title</div><div class="dmv">${bt||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Program Type</div><div class="dmv">${pt||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Budget Area</div><div class="dmv">${ba||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Budget Source</div><div class="dmv">${bs||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Budget Level</div><div class="dmv">${bl||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Work Type</div><div class="dmv">${wt||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Budget Type</div><div class="dmv">${bty||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Ward No</div><div class="dmv">वडा ${a.wada_no}</div></div>
        <div class="detail-meta-card"><div class="dmk">Work Start</div><div class="dmv">${a.work_start_date||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Work End</div><div class="dmv">${a.work_end_date||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Chairman</div><div class="dmv">${a.chairman_name||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Vice Chairman</div><div class="dmv">${a.vicechairman_name||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Secretary</div><div class="dmv">${a.secretory_name||'-'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Estimate File</div><div class="dmv">${a.estimate_file?`<i class="fas fa-file-pdf me-1" style="color:var(--danger)"></i>${a.estimate_file}`:'<span style="color:var(--muted)">None</span>'}</div></div>
        <div class="detail-meta-card"><div class="dmk">Valuation File</div><div class="dmv">${a.valuation_file?`<i class="fas fa-file-pdf me-1" style="color:var(--danger)"></i>${a.valuation_file}`:'<span style="color:var(--muted)">None</span>'}</div></div>
    </div>`;
};

PG._detailMembers=(agrId,members)=>{
    document.getElementById('detail-tab-content').innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-users me-2" style="color:var(--accent)"></i>Committee Members</h5>
        ${canWrite()?`<button class="btn-gold-sm no-print" onclick="PG.memberForm(${agrId})"><i class="fas fa-plus me-1"></i>Add Member</button>`:''}</div>
        <div class="panel-body">
        ${members.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>Name</th><th>Position</th><th>National ID</th><th>Address</th>${canWrite()?'<th>Actions</th>':''}</tr></thead><tbody>
        ${members.map((m,i)=>`<tr><td>${i+1}</td><td><strong>${m.name}</strong></td><td><span class="member-badge"><i class="fas fa-id-badge me-1"></i>${m.position}</span></td><td><code style="font-size:.78rem">${m.national_id||'-'}</code></td><td>${m.address||'-'}</td>${canWrite()?`<td><button class="btn-ism me-1" onclick="PG.memberForm(${agrId},${m.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="PG.memberDel(${agrId},${m.id})"><i class="fas fa-trash"></i></button></td>`:''}</tr>`).join('')}
        </tbody></table></div>`:`<div style="text-align:center;padding:28px;color:var(--muted)"><i class="fas fa-users fa-2x mb-2 d-block"></i>No members added yet</div>`}
        </div>
    </div>`;
};
PG.memberForm=(agrId,id)=>{
    const members=XDB.get('committee_members'),m=id?members.find(x=>x.id===id):null;
    App.openModal(id?'Edit Member':'Add Committee Member',`<form onsubmit="PG.memberSave(event,${agrId},${id||0})"><div class="row g-3">
    <div class="col-md-6"><label class="form-label">Full Name *</label><input type="text" class="form-control" name="name" value="${m?.name||''}" required></div>
    <div class="col-md-6"><label class="form-label">Position *</label><input type="text" class="form-control" name="position" value="${m?.position||''}" placeholder="अध्यक्ष / सचिव / कोषाध्यक्ष..." required></div>
    <div class="col-md-6"><label class="form-label">National ID</label><input type="text" class="form-control" name="national_id" value="${m?.national_id||''}"></div>
    <div class="col-md-6"><label class="form-label">Address</label><input type="text" class="form-control" name="address" value="${m?.address||''}"></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'560px');
};
PG.memberSave=(e,agrId,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());d.agreement_id=agrId;
    const members=XDB.get('committee_members');
    if(id){const i=members.findIndex(m=>m.id===id);if(i>=0)members[i]={...members[i],...d}}else{d.id=XDB.nextId('committee_members');members.push(d)}
    XDB.set('committee_members',members);App.closeModal();toast(id?'Updated':'Added');PG.agreementDetail(agrId,'members');
};
PG.memberDel=(agrId,id)=>{
    App.openModal('Confirm Delete',`<p>Remove this member?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('committee_members',XDB.get('committee_members').filter(m=>m.id!==${id}));App.closeModal();toast('Removed');PG.agreementDetail(${agrId},'members')"><i class="fas fa-trash me-1"></i>Remove</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'380px');
};

PG._detailLetters=(agrId,letters)=>{
    const cats=XDB.get('letter_categories');
    document.getElementById('detail-tab-content').innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-envelope me-2" style="color:var(--accent)"></i>Agreement Letters</h5>
        ${canWrite()?`<div class="d-flex gap-2"><button class="btn-gold-sm no-print" onclick="PG.letterForm(${agrId})"><i class="fas fa-plus me-1"></i>New Letter</button><button class="btn-teal-sm no-print" onclick="PG.letterMerge(${agrId})"><i class="fas fa-magic me-1"></i>Mail Merge</button></div>`:''}</div>
        <div class="panel-body">
        ${letters.length?letters.map(l=>{const cat=cats.find(c=>c.id===l.category_id);const stc={sent:'badge-teal',approved:'badge-teal',draft:'badge-gold',rejected:'badge-red'}[l.status]||'badge-blue';return`
        <div class="letter-card">
            <div class="d-flex align-items-center gap-12" style="gap:12px">
                <div class="letter-icon" style="background:rgba(45,125,154,.1);color:var(--info)"><i class="fas fa-file-alt"></i></div>
                <div style="flex:1"><div style="font-weight:700;font-size:.9rem">${l.title}</div><div style="font-size:.75rem;color:var(--muted)">${cat?.name||'-'} &nbsp;·&nbsp; ${l.created_date||''}</div></div>
                <span class="${stc}">${l.status}</span>
            </div>
            <div class="d-flex gap-2 no-print">
                <button class="btn-ism" onclick="PG.letterView(${agrId},${l.id})" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn-ism" onclick="PG.letterPrint(${agrId},${l.id})" title="Print"><i class="fas fa-print"></i></button>
                ${canWrite()?`<button class="btn-ism" onclick="PG.letterForm(${agrId},${l.id})" title="Edit"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="PG.letterDel(${agrId},${l.id})" title="Delete"><i class="fas fa-trash"></i></button>`:''}
            </div>
        </div>`}).join(''):`<div style="text-align:center;padding:28px;color:var(--muted)"><i class="fas fa-envelope-open fa-2x mb-2 d-block"></i>No letters yet. Add one or use Mail Merge.</div>`}
        </div>
    </div>`;
};
PG.letterForm=(agrId,id)=>{
    const letters=XDB.get('agreement_letters'),l=id?letters.find(x=>x.id===id):null;
    const cats=XDB.get('letter_categories');
    App.openModal(id?'Edit Letter':'New Letter',`<form onsubmit="PG.letterSave(event,${agrId},${id||0})"><div class="row g-3">
    <div class="col-md-8"><label class="form-label">Title *</label><input type="text" class="form-control" name="title" value="${l?.title||''}" required></div>
    <div class="col-md-4"><label class="form-label">Category</label><select class="form-select" name="category_id"><option value="0">Select</option>${cats.map(c=>`<option value="${c.id}"${l?.category_id===c.id?' selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="col-md-4"><label class="form-label">Date (BS)</label>${nepaliHTML('ld',l?.created_date||'')}</div>
    <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" name="status"><option value="draft"${l?.status==='draft'?' selected':''}>Draft</option><option value="sent"${l?.status==='sent'?' selected':''}>Sent</option><option value="approved"${l?.status==='approved'?' selected':''}>Approved</option><option value="rejected"${l?.status==='rejected'?' selected':''}>Rejected</option></select></div>
    <div class="col-12"><label class="form-label">Content *</label>${RTE.build('letter-rte',l?.content||'')}</div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'720px');
};
PG.letterSave=(e,agrId,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());d.agreement_id=agrId;d.category_id=+d.category_id;d.created_date=ND.get('ld');
    d.content=RTE.get('letter-rte');
    if(!d.content||!d.title){toast('Title and content required','error');return}
    const letters=XDB.get('agreement_letters');
    if(id){const i=letters.findIndex(l=>l.id===id);if(i>=0)letters[i]={...letters[i],...d}}else{d.id=XDB.nextId('agreement_letters');letters.push(d)}
    XDB.set('agreement_letters',letters);App.closeModal();toast(id?'Updated':'Saved');PG.agreementDetail(agrId,'letters');
};
PG.letterView=(agrId,id)=>{
    const l=XDB.get('agreement_letters').find(x=>x.id===id);if(!l)return;
    const cat=XDB.get('letter_categories').find(c=>c.id===l.category_id);
    App.openModal(l.title,`<div class="letter-preview">${l.content.replace(/\n/g,'<br>')}</div>
    <div class="mt-3 d-flex gap-2 no-print"><button class="btn-gold-sm" onclick="PG.letterPrint(${agrId},${id})"><i class="fas fa-print me-1"></i>Print</button><button class="btn-outline-gold" onclick="App.closeModal()">Close</button></div>`,'680px');
};
PG.letterPrint=(agrId,id)=>{
    const l=XDB.get('agreement_letters').find(x=>x.id===id);if(!l)return;
    const pw=window.open('','_blank','width=800,height=600');
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${l.title}</title><style>body{font-family:'Noto Sans Devanagari',Arial,sans-serif;padding:40px;font-size:14px;line-height:2;color:#111}h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}pre{white-space:pre-wrap;font-family:inherit;font-size:14px}@media print{body{padding:20px}}</style></head><body><h2>${l.title}</h2><pre>${l.content}</pre><script>window.onload=()=>window.print()<\/script></body></html>`);
    pw.document.close();
};
PG.letterDel=(agrId,id)=>{
    App.openModal('Confirm Delete',`<p>Delete this letter?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('agreement_letters',XDB.get('agreement_letters').filter(l=>l.id!==${id}));App.closeModal();toast('Deleted');PG.agreementDetail(${agrId},'letters')"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'380px');
};
PG.letterMerge=(agrId)=>{
    const a=XDB.get('agreements').find(x=>x.id===agrId);
    const pr=a?XDB.get('programs').find(p=>p.id===a.program_id):null;
    const templates=XDB.get('letter_templates');
    const cats=XDB.get('letter_categories');
    const TAGS=['{AgreementID}','{ProgramName}','{RegisterNo}','{CommitteeName}','{WardNo}','{TotalBudget}','{Chairman}','{ViceChairman}','{Secretary}','{AgreementDate}','{WorkStartDate}','{WorkEndDate}'];
    const tagValues={'{AgreementID}':a?.agreement_id||'','{ProgramName}':pr?.Program_Name||'','{RegisterNo}':pr?.Register_No||'','{CommitteeName}':a?.communitee_name||'','{WardNo}':a?.wada_no||'','{TotalBudget}':fmt(a?.total_budget_amt||0),'{Chairman}':a?.chairman_name||'','{ViceChairman}':a?.vicechairman_name||'','{Secretary}':a?.secretory_name||'','{AgreementDate}':a?.agreement_date||'','{WorkStartDate}':a?.work_start_date||'','{WorkEndDate}':a?.work_end_date||''};
    App.openModal('Mail Merge — Generate Letter',`
    <div class="row g-3 mb-3">
        <div class="col-md-6"><label class="form-label">Use Template</label><select class="form-select" id="mm-tmpl" onchange="PG._mmLoad()"><option value="">— blank —</option>${templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div>
        <div class="col-md-6"><label class="form-label">Category</label><select class="form-select" id="mm-cat"><option value="0">Select</option>${cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    </div>
    <div class="mb-2"><label class="form-label">Merge Tags — click to insert</label><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${TAGS.map(t=>`<span class="merge-tag" onclick="PG._mmInsert('${t}')">${t}</span>`).join('')}</div></div>
    <label class="form-label">Letter Title *</label><input type="text" class="form-control mb-2" id="mm-title" placeholder="Title...">
    <label class="form-label">Content *</label>
    <div class="mb-3">${RTE.build('mm-rte','')}</div>
    <div class="d-flex gap-2">
        <button class="btn-teal-sm" onclick="PG._mmPreview(${JSON.stringify(tagValues).replace(/"/g,'&quot;')})"><i class="fas fa-eye me-1"></i>Preview</button>
        <button class="btn-gold-sm" onclick="PG._mmSave(${agrId},${JSON.stringify(tagValues).replace(/"/g,'&quot;')})"><i class="fas fa-save me-1"></i>Save as Letter</button>
        <button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button>
    </div>
    <div id="mm-preview-area" style="margin-top:14px;display:none"></div>`,'760px');
    window._mmTagValues=tagValues;
    window._mmTemplates=templates;
};
PG._mmLoad=()=>{
    const id=+document.getElementById('mm-tmpl').value;if(!id)return;
    const t=(window._mmTemplates||[]).find(x=>x.id===id);if(!t)return;
    RTE.set('mm-rte',t.body||'');
    if(t.name)document.getElementById('mm-title').value=t.name;
};
PG._mmInsert=(tag)=>{RTE.insertText('mm-rte',tag)};
PG._mmPreview=(tv)=>{
    let body=RTE.get('mm-rte')||'';
    const tags=typeof tv==='string'?JSON.parse(tv.replace(/&quot;/g,'"')):tv;
    Object.entries(tags).forEach(([k,v])=>{body=body.replace(new RegExp(k.replace(/[{}]/g,'\\$&'),'g'),String(v))});
    const pa=document.getElementById('mm-preview-area');if(!pa)return;
    pa.style.display='block';pa.innerHTML=`<div style="font-weight:700;font-size:.82rem;margin-bottom:6px;color:var(--muted)">PREVIEW</div><div class="letter-preview">${body}</div>`;
};
PG._mmSave=(agrId,tv)=>{
    const title=document.getElementById('mm-title')?.value.trim();const body=RTE.get('mm-rte');const catId=+document.getElementById('mm-cat')?.value;
    if(!title||!body){toast('Title and content required','error');return}
    const tags=typeof tv==='string'?JSON.parse(tv.replace(/&quot;/g,'"')):tv;let merged=body;
    Object.entries(tags).forEach(([k,v])=>{merged=merged.replace(new RegExp(k.replace(/[{}]/g,'\\$&'),'g'),String(v))});
    const letters=XDB.get('agreement_letters');letters.push({id:XDB.nextId('agreement_letters'),agreement_id:agrId,category_id:catId,title,content:merged,created_date:'',status:'draft'});
    XDB.set('agreement_letters',letters);App.closeModal();toast('Letter saved');PG.agreementDetail(agrId,'letters');
};

PG._detailBudget=(agrId,a,bd)=>{
    const f=(v)=>v?fmt(v):'<span style="color:var(--muted)">-</span>';
    const stBadge=(s)=>s==='approved'?'<span class="badge-teal">Approved</span>':s==='pending'?'<span class="badge-gold">Pending</span>':'<span class="badge-red">Rejected</span>';
    document.getElementById('detail-tab-content').innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-calculator me-2" style="color:var(--accent)"></i>Budget Details</h5>
        ${canWrite()?`<button class="btn-gold-sm no-print" onclick="PG.budgetDetailForm(${agrId})"><i class="fas ${bd?'fa-edit':'fa-plus'} me-1"></i>${bd?'Edit':'Add'} Budget Details</button>`:''}</div>
        <div class="panel-body">
        ${bd?`
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <div class="panel" style="border:2px solid rgba(201,162,39,.2)">
                    <div class="panel-head" style="background:rgba(201,162,39,.05)"><h5 style="color:var(--accent)"><i class="fas fa-drafting-compass me-1"></i>Estimate Details</h5>${stBadge(bd.EstStatus)}</div>
                    <div class="panel-body">
                        <div class="bud-field-grid">
                            <div class="bud-field-item"><label>Estimate Amount</label><div class="bv" style="color:var(--info)">${f(bd.EstimateAmt)}</div></div>
                            <div class="bud-field-item"><label>User Contribution</label><div class="bv">${f(bd.EstUserContribution)}</div></div>
                            <div class="bud-field-item"><label>User Fund</label><div class="bv">${f(bd.EstUserFund)}</div></div>
                            <div class="bud-field-item"><label>Estimated By</label><div class="bv">${bd.EstimateBy||'-'}</div></div>
                            <div class="bud-field-item"><label>Approved By</label><div class="bv">${bd.EstApprovedBy||'-'}</div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="panel" style="border:2px solid rgba(26,107,90,.2)">
                    <div class="panel-head" style="background:rgba(26,107,90,.04)"><h5 style="color:var(--success)"><i class="fas fa-clipboard-check me-1"></i>Valuation Details</h5>${stBadge(bd.ValStatus)}</div>
                    <div class="panel-body">
                        <div class="bud-field-grid">
                            <div class="bud-field-item"><label>Valuation Amount</label><div class="bv" style="color:var(--success)">${f(bd.ValuationAmt)}</div></div>
                            <div class="bud-field-item"><label>User Contribution</label><div class="bv">${f(bd.ValUserContribution)}</div></div>
                            <div class="bud-field-item"><label>User Fund</label><div class="bv">${f(bd.ValUserFund)}</div></div>
                            <div class="bud-field-item"><label>Valuation Date</label><div class="bv">${bd.ValuationDate||'-'}</div></div>
                            <div class="bud-field-item"><label>Valuation By</label><div class="bv">${bd.ValuationBy||'-'}</div></div>
                            <div class="bud-field-item"><label>Approved By</label><div class="bv">${bd.ValApprovedBy||'-'}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`:`<div style="text-align:center;padding:32px;color:var(--muted)"><i class="fas fa-calculator fa-2x mb-2 d-block"></i>No budget details yet. ${canWrite()?'Click "Add Budget Details" to get started.':''}</div>`}
        </div>
    </div>`;
};
PG.budgetDetailForm=(agrId)=>{
    const bd=XDB.get('budget_details').find(b=>b.agreement_id===agrId);
    App.openModal((bd?'Edit':'Add')+' Budget Details',`<form onsubmit="PG.budgetDetailSave(event,${agrId})"><div class="row g-3">
    <div class="col-12"><div style="font-weight:700;font-size:.82rem;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;padding:6px 0 2px;border-bottom:2px solid rgba(201,162,39,.2);margin-bottom:4px">Estimate</div></div>
    <div class="col-md-4"><label class="form-label">Estimate Amount</label><input type="number" class="form-control" name="EstimateAmt" value="${bd?.EstimateAmt||''}" min="0"></div>
    <div class="col-md-4"><label class="form-label">User Contribution</label><input type="number" class="form-control" name="EstUserContribution" value="${bd?.EstUserContribution||''}" min="0"></div>
    <div class="col-md-4"><label class="form-label">User Fund</label><input type="number" class="form-control" name="EstUserFund" value="${bd?.EstUserFund||''}" min="0"></div>
    <div class="col-md-4"><label class="form-label">Estimated By</label><input type="text" class="form-control" name="EstimateBy" value="${bd?.EstimateBy||''}"></div>
    <div class="col-md-4"><label class="form-label">Approved By</label><input type="text" class="form-control" name="EstApprovedBy" value="${bd?.EstApprovedBy||''}"></div>
    <div class="col-md-4"><label class="form-label">Est. Status</label><select class="form-select" name="EstStatus"><option value="pending"${bd?.EstStatus==='pending'?' selected':''}>Pending</option><option value="approved"${bd?.EstStatus==='approved'?' selected':''}>Approved</option><option value="rejected"${bd?.EstStatus==='rejected'?' selected':''}>Rejected</option></select></div>
    <div class="col-12"><div style="font-weight:700;font-size:.82rem;color:var(--success);text-transform:uppercase;letter-spacing:.5px;padding:6px 0 2px;border-bottom:2px solid rgba(26,107,90,.2);margin-bottom:4px">Valuation</div></div>
    <div class="col-md-4"><label class="form-label">Valuation Amount</label><input type="number" class="form-control" name="ValuationAmt" value="${bd?.ValuationAmt||''}" min="0"></div>
    <div class="col-md-4"><label class="form-label">User Contribution</label><input type="number" class="form-control" name="ValUserContribution" value="${bd?.ValUserContribution||''}" min="0"></div>
    <div class="col-md-4"><label class="form-label">User Fund</label><input type="number" class="form-control" name="ValUserFund" value="${bd?.ValUserFund||''}" min="0"></div>
    <div class="col-md-3"><label class="form-label">Valuation Date (BS)</label>${nepaliHTML('vd',bd?.ValuationDate||'')}</div>
    <div class="col-md-3"><label class="form-label">Valuation By</label><input type="text" class="form-control" name="ValuationBy" value="${bd?.ValuationBy||''}"></div>
    <div class="col-md-3"><label class="form-label">Val. Approved By</label><input type="text" class="form-control" name="ValApprovedBy" value="${bd?.ValApprovedBy||''}"></div>
    <div class="col-md-3"><label class="form-label">Val. Status</label><select class="form-select" name="ValStatus"><option value="pending"${bd?.ValStatus==='pending'?' selected':''}>Pending</option><option value="approved"${bd?.ValStatus==='approved'?' selected':''}>Approved</option><option value="rejected"${bd?.ValStatus==='rejected'?' selected':''}>Rejected</option></select></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'800px');
};
PG.budgetDetailSave=(e,agrId)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());
    d.agreement_id=agrId;d.ValuationDate=ND.get('vd');
    ['EstimateAmt','EstUserContribution','EstUserFund','ValuationAmt','ValUserContribution','ValUserFund'].forEach(k=>{d[k]=+(d[k]||0)});
    const bds=XDB.get('budget_details'),idx=bds.findIndex(b=>b.agreement_id===agrId);
    if(idx>=0)bds[idx]={...bds[idx],...d};else{d.id=XDB.nextId('budget_details');bds.push(d)}
    XDB.set('budget_details',bds);App.closeModal();toast('Saved');PG.agreementDetail(agrId,'budget');
};

PG._detailFinancial=(id,a,fin,allocated,totalExp,remaining,pct,barColor,expenses)=>{
    document.getElementById('detail-tab-content').innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-money-bill-wave me-2" style="color:var(--accent)"></i>Expenses &amp; Financial</h5>
        ${canWrite()&&fin?`<button class="btn-ssm no-print" onclick="PG.efForm(${fin.id})"><i class="fas fa-plus me-1"></i>Add Expense</button>`:''}</div>
        <div class="panel-body">
        <div class="row g-3 mb-4">
            <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-wallet"></i></div><div><div class="stat-value" style="font-size:1.1rem">${fmt(allocated)}</div><div class="stat-label">Allocated Budget</div></div></div></div></div>
            <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(192,57,43,.1);color:var(--danger)"><i class="fas fa-receipt"></i></div><div><div class="stat-value" style="font-size:1.1rem">${fmt(totalExp)}</div><div class="stat-label">Total Expenses</div></div></div></div></div>
            <div class="col-md-4"><div class="stat-card" style="padding:14px 18px"><div class="d-flex align-items-center gap-3"><div class="stat-icon mb-0" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-piggy-bank"></i></div><div><div class="stat-value" style="font-size:1.1rem">${fmt(remaining)}</div><div class="stat-label">Remaining</div></div></div></div></div>
        </div>
        <div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;font-size:.82rem;font-weight:600;margin-bottom:6px"><span>Budget Utilization</span><span style="color:${barColor}">${pct}%</span></div><div class="fin-progress-bar"><div class="fin-progress-fill" style="width:${Math.min(pct,100)}%;background:${barColor}"></div></div></div>
        ${expenses.length?`<h6 style="font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin-bottom:10px">Expense Ledger</h6>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th>${canWrite()?'<th>Action</th>':''}</tr></thead><tbody>
        ${expenses.map((e,i)=>`<tr><td style="color:var(--muted)">${i+1}</td><td><strong>${e.desc}</strong></td><td style="font-weight:600;color:var(--danger)">${fmt(e.amount)}</td><td>${e.date||'-'}</td>${canWrite()&&fin?`<td><button class="btn-dsm" onclick="PG.edel(${fin.id},${e.id});PG.agreementDetail(${id},'financial')"><i class="fas fa-trash"></i></button></td>`:''}</tr>`).join('')}
        <tr style="background:#faf8f4"><td colspan="2" style="font-weight:700">Total</td><td style="font-weight:800;color:var(--danger)">${fmt(totalExp)}</td><td></td>${canWrite()?'<td></td>':''}</tr>
        </tbody></table></div>`:'<p style="color:var(--muted);font-size:.85rem;text-align:center;padding:20px"><i class="fas fa-inbox me-2"></i>No expenses recorded yet</p>'}
        </div>
    </div>`;
};

PG.afForm=(id)=>{
    const agrs=XDB.get('agreements'),a=id?agrs.find(x=>x.id===id):null,progs=XDB.get('programs').filter(p=>p.isSelected);
    const banks=XDB.get('banks');
    const popts=progs.map(p=>`<option value="${p.id}"${a?.program_id===p.id?' selected':''}>${p.Program_Name} (${fmt(p.Budget_Amount)})</option>`).join('');
    const bopts=banks.map(b=>`<option value="${b.id}"${a?.bank_id===b.id?' selected':''}>${b.name}${b.branch?' - '+b.branch:''}</option>`).join('');
    App.openModal(id?'Edit Agreement':'New Agreement',`<form onsubmit="PG.afSave(event,${id||0})"><div class="row g-3">
    <div class="col-md-6"><label class="form-label">Agreement ID *</label><input type="text" class="form-control" name="agreement_id" value="${a?.agreement_id||'AGR-2081-'+String(XDB.nextId('agreements')).padStart(3,'0')}" required></div>
    <div class="col-md-6"><label class="form-label">Program *</label><select class="form-select" name="program_id" required onchange="PG._aw(this)"><option value="">Select</option>${popts}</select></div>
    <div class="col-md-4"><label class="form-label">Total Budget *</label><input type="number" class="form-control" name="total_budget_amt" value="${a?.total_budget_amt||''}" required min="0"></div>
    <div class="col-md-4"><label class="form-label">Committee Name *</label><input type="text" class="form-control" name="communitee_name" value="${a?.communitee_name||''}" required></div>
    <div class="col-md-4"><label class="form-label">Ward No (Auto)</label><input type="text" class="form-control" name="wada_no" id="aw" value="${a?.wada_no||''}" readonly style="background:#faf8f4"></div>
    <div class="col-md-4"><label class="form-label">Bank</label><select class="form-select" name="bank_id"><option value="0">— No Bank —</option>${bopts}</select></div>
    <div class="col-md-4"><label class="form-label">Account No</label><input type="text" class="form-control" name="account_no" value="${a?.account_no||''}" placeholder="Bank account number"></div>
    <div class="col-md-4"><label class="form-label">Account Name</label><input type="text" class="form-control" name="account_name" value="${a?.account_name||''}" placeholder="Account holder name"></div>
    <div class="col-md-4"><label class="form-label">Agreement Date (BS)</label>${nepaliHTML('ad',a?.agreement_date||'')}</div>
    <div class="col-md-4"><label class="form-label">Work Start (BS)</label>${nepaliHTML('as2',a?.work_start_date||'')}</div>
    <div class="col-md-4"><label class="form-label">Work End (BS)</label>${nepaliHTML('ae',a?.work_end_date||'')}</div>
    <div class="col-md-4"><label class="form-label">Chairman *</label><input type="text" class="form-control" name="chairman_name" value="${a?.chairman_name||''}" required></div>
    <div class="col-md-4"><label class="form-label">Vice Chairman</label><input type="text" class="form-control" name="vicechairman_name" value="${a?.vicechairman_name||''}"></div>
    <div class="col-md-4"><label class="form-label">Secretary</label><input type="text" class="form-control" name="secretory_name" value="${a?.secretory_name||''}"></div>
    <div class="col-md-6"><label class="form-label">Estimate File</label><input type="file" class="form-control" name="est"><div style="font-size:.72rem;color:var(--muted);margin-top:2px">${a?.estimate_file||'None'}</div></div>
    <div class="col-md-6"><label class="form-label">Valuation File</label><input type="file" class="form-control" name="val"><div style="font-size:.72rem;color:var(--muted);margin-top:2px">${a?.valuation_file||'None'}</div></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'780px');
};
PG._aw=(sel)=>{const pr=XDB.get('programs').find(p=>p.id===+sel.value);document.getElementById('aw').value=pr?.Ward_Number||'';const bi=document.querySelector('[name="total_budget_amt"]');if(pr&&bi&&!bi.value)bi.value=pr.Budget_Amount};
PG.afSave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());
    d.program_id=+d.program_id;d.total_budget_amt=+d.total_budget_amt;d.wada_no=+d.wada_no;d.bank_id=+(d.bank_id||0);
    d.agreement_date=ND.get('ad');d.work_start_date=ND.get('as2');d.work_end_date=ND.get('ae');
    if(fd.get('est')?.name)d.estimate_file=fd.get('est').name;if(fd.get('val')?.name)d.valuation_file=fd.get('val').name;
    const agrs=XDB.get('agreements');
    if(id){const i=agrs.findIndex(a=>a.id===id);if(i>=0){if(!d.estimate_file&&agrs[i].estimate_file)d.estimate_file=agrs[i].estimate_file;if(!d.valuation_file&&agrs[i].valuation_file)d.valuation_file=agrs[i].valuation_file;agrs[i]={...agrs[i],...d}}}
    else{d.id=XDB.nextId('agreements');agrs.push(d);const pr=XDB.get('programs').find(p=>p.id===d.program_id);App.addNotif(`नयाँ सम्झौता ${d.agreement_id} - ${pr?.Program_Name||''}`,'agreement',1);const fn=XDB.get('financials');fn.push({id:XDB.nextId('financials'),agreement_id:d.id,budget_allocated:d.total_budget_amt,expenses:[]});XDB.set('financials',fn)}
    XDB.set('agreements',agrs);App.closeModal();toast(id?'Updated':'Created');PG.agreements(document.getElementById('content-area'));
};
PG.afPrint=(id)=>{
    const a=XDB.get('agreements').find(x=>x.id===id);if(!a)return;
    const pr=XDB.get('programs').find(p=>p.id===a.program_id),dept=pr?getRef(pr.department_id,'departments'):'',bt=pr?getRef(pr.budge_title_id,'budget_titles'):'',ba=pr?getRef(pr.budget_area_id,'budget_areas'):'';
    App.openModal('Print Agreement',`<div class="agreement-print" id="pa"><h2>सम्झौता पत्र</h2><p style="text-align:center;font-size:.85rem;margin-bottom:18px">(Agreement Document)</p>
    <table style="width:100%;font-size:12px;margin-bottom:14px"><tbody>
    <tr><td style="width:28%"><strong>सम्झौता नं:</strong></td><td>${a.agreement_id}</td><td style="width:22%"><strong>मिति:</strong></td><td>${a.agreement_date}</td></tr>
    <tr><td><strong>कार्यक्रम:</strong></td><td colspan="3">${pr?.Program_Name||'-'}</td></tr>
    <tr><td><strong>विभाग:</strong></td><td>${dept}</td><td><strong>बजेट शीर्षक:</strong></td><td>${bt}</td></tr>
    <tr><td><strong>समिति:</strong></td><td colspan="3">${a.communitee_name}</td></tr>
    <tr><td><strong>वडा नं:</strong></td><td>${a.wada_no}</td><td><strong>क्षेत्र:</strong></td><td>${ba}</td></tr>
    <tr><td><strong>कुल बजेट:</strong></td><td colspan="3" style="font-weight:700;font-size:14px">${fmt(a.total_budget_amt)}</td></tr>
    <tr><td><strong>सुरु मिति:</strong></td><td>${a.work_start_date}</td><td><strong>समाप्ति:</strong></td><td>${a.work_end_date}</td></tr>
    </tbody></table>
    <h6 style="margin:16px 0 8px">समिति विवरण</h6>
    <table style="width:100%;font-size:12px"><tbody><tr><td style="width:28%"><strong>अध्यक्ष:</strong></td><td>${a.chairman_name}</td></tr><tr><td><strong>सह-अध्यक्ष:</strong></td><td>${a.vicechairman_name||'-'}</td></tr><tr><td><strong>सचिव:</strong></td><td>${a.secretory_name||'-'}</td></tr></tbody></table>
    <p style="margin:16px 0;font-size:11px;color:#666">माथि उल्लेखित कार्यक्रम अन्तर्गतको निर्माण कार्य सम्पन्न गर्न समितिले सम्झौता गरेको प्रमाणित छ।</p>
    <div class="sign-row"><div class="sign-box"><strong>अध्यक्ष</strong><div class="sign-line">${a.chairman_name}</div></div><div class="sign-box"><strong>सचिव</strong><div class="sign-line">${a.secretory_name||''}</div></div><div class="sign-box"><strong>प्रमुख</strong><div class="sign-line">_______________</div></div></div></div>
    <div class="mt-3 no-print d-flex gap-2"><button class="btn-gold-sm" onclick="window.print()"><i class="fas fa-print me-1"></i>Print</button><button class="btn-outline-gold" onclick="App.closeModal()">Close</button></div>`,'800px');
};

/* ===== FINANCIAL PAGE ===== */
PG.financial=(el)=>{
    const fins=XDB.get('financials'),agrs=XDB.get('agreements');let tA=0,tE=0;
    const rows=fins.map(f=>{const a=agrs.find(x=>x.id===f.agreement_id),pr=a?XDB.get('programs').find(p=>p.id===a.program_id):null;const et=f.expenses.reduce((s,e)=>s+(e.amount||0),0);tA+=f.budget_allocated||0;tE+=et;return{...f,a,pr,et,r:(f.budget_allocated||0)-et}});
    el.innerHTML=`<div class="row g-3 mb-4"><div class="col-md-4"><div class="stat-card"><div class="stat-icon" style="background:rgba(26,107,90,.1);color:var(--success)"><i class="fas fa-wallet"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tA)}</div><div class="stat-label">Total Allocated</div></div></div><div class="col-md-4"><div class="stat-card"><div class="stat-icon" style="background:rgba(192,57,43,.1);color:var(--danger)"><i class="fas fa-receipt"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tE)}</div><div class="stat-label">Total Expenses</div></div></div><div class="col-md-4"><div class="stat-card"><div class="stat-icon" style="background:rgba(201,162,39,.12);color:var(--accent)"><i class="fas fa-piggy-bank"></i></div><div class="stat-value" style="font-size:1.2rem">${fmt(tA-tE)}</div><div class="stat-label">Remaining</div></div></div></div>
    <div class="panel"><div class="panel-head"><h5>Financial Details</h5></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Agreement</th><th>Program</th><th>Allocated</th><th>Expenses</th><th>Remaining</th><th>Progress</th><th>Actions</th></tr></thead><tbody>${rows.map(r=>{const pct=r.budget_allocated?Math.round(r.et/r.budget_allocated*100):0,cl=pct>90?'var(--danger)':pct>60?'var(--warning)':'var(--success)';return`<tr><td><a class="view-link" onclick="PG.agreementDetail(${r.a?.id})"><i class="fas fa-external-link-alt"></i> ${r.a?.agreement_id||'-'}</a></td><td style="font-size:.84rem">${r.pr?.Program_Name||'-'}</td><td style="font-weight:600">${fmt(r.budget_allocated)}</td><td style="font-weight:600;color:var(--danger)">${fmt(r.et)}</td><td style="font-weight:600;color:var(--success)">${fmt(r.r)}</td><td style="width:130px"><div style="background:#eee;border-radius:8px;height:7px;overflow:hidden"><div style="height:100%;width:${Math.min(pct,100)}%;background:${cl};border-radius:8px;transition:width .3s"></div></div><span style="font-size:.72rem;color:var(--muted)">${pct}%</span></td><td class="no-print">${canWrite()?`<button class="btn-ssm" onclick="PG.efForm(${r.id})"><i class="fas fa-plus me-1"></i>Expense</button>`:''}</td></tr>`}).join('')}</tbody></table></div></div></div>`;
};
PG.efForm=(fid)=>{
    const f=XDB.get('financials').find(x=>x.id===fid);if(!f)return;
    const elist=f.expenses.length?`<div class="table-wrap mt-2"><table><thead><tr><th>Description</th><th>Amount</th><th>Date</th><th></th></tr></thead><tbody>${f.expenses.map(e=>`<tr><td>${e.desc}</td><td>${fmt(e.amount)}</td><td>${e.date||'-'}</td><td><button class="btn-dsm" onclick="PG.edel(${fid},${e.id})"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div>`:'<p style="color:var(--muted);font-size:.82rem;margin-top:8px">No expenses yet</p>';
    App.openModal('Add Expense',`<form onsubmit="PG.eSave(event,${fid})"><div class="row g-3"><div class="col-md-6"><label class="form-label">Description *</label><input type="text" class="form-control" name="desc" required></div><div class="col-md-3"><label class="form-label">Amount *</label><input type="number" class="form-control" name="amount" required min="0"></div><div class="col-md-3"><label class="form-label">Date (BS)</label>${nepaliHTML('ed','')}</div></div>${elist}<div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Add</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`);
};
PG.eSave=(e,fid)=>{e.preventDefault();const fd=new FormData(e.target),fins=XDB.get('financials'),f=fins.find(x=>x.id===fid);if(!f)return;const amt=+fd.get('amount');if(f.expenses.reduce((s,e)=>s+e.amount,0)+amt>(f.budget_allocated||0)){toast('Exceeds budget!','error');return}f.expenses.push({id:f.expenses.length?Math.max(...f.expenses.map(x=>x.id))+1:1,desc:fd.get('desc'),amount:amt,date:ND.get('ed')});XDB.set('financials',fins);toast('Expense added');PG.efForm(fid)};
PG.edel=(fid,eid)=>{const fins=XDB.get('financials'),f=fins.find(x=>x.id===fid);if(f)f.expenses=f.expenses.filter(e=>e.id!==eid);XDB.set('financials',fins);toast('Deleted');PG.efForm(fid)};

/* ===== REPORTS PAGE ===== */
PG.reports=(el)=>{
    el.innerHTML=`<div class="panel no-print mb-4"><div class="panel-head"><h5>Report Filters</h5></div><div class="panel-body"><div class="row g-3 align-items-end"><div class="col-md-3"><label class="form-label">Report Type</label><select class="form-select" id="rt" onchange="PG.rgen()"><option value="ward">Ward-wise</option><option value="budget_title">By Budget Title</option><option value="program_type">By Program Type</option><option value="budget_area">By Budget Area</option><option value="department">By Department</option><option value="completion">By Completion</option></select></div><div class="col-md-3"><button class="btn-gold-sm w-100" onclick="PG.rgen()"><i class="fas fa-sync-alt me-1"></i>Generate</button></div><div class="col-md-6 d-flex gap-2 justify-content-end"><button class="btn-outline-gold" onclick="PG.rcsv()"><i class="fas fa-file-csv me-1"></i>CSV</button><button class="btn-teal-sm" onclick="window.print()"><i class="fas fa-print me-1"></i>Print</button></div></div></div></div><div class="panel" id="rpanel"><div class="panel-body" id="rbody"><p style="color:var(--muted);text-align:center;padding:28px">Select type and click Generate</p></div></div>`;
};
PG._rr=[];
PG.rgen=()=>{
    const t=document.getElementById('rt').value,progs=deptFilter(XDB.get('programs')),g={};
    const map={ward:{k:p=>p.Ward_Number||0,l:'Ward'},budget_title:{k:p=>getRef(p.budge_title_id,'budget_titles')||'N/A',l:'Budget Title'},program_type:{k:p=>getRef(p.program_type_id,'program_types')||'N/A',l:'Program Type'},budget_area:{k:p=>getRef(p.budget_area_id,'budget_areas')||'N/A',l:'Budget Area'},department:{k:p=>getRef(p.department_id,'departments')||'N/A',l:'Department'},completion:{k:p=>p.isCompleted?'Completed':'Ongoing',l:'Status'}};
    const m=map[t];progs.forEach(p=>{const k=m.k(p);g[k]=(g[k]||0)+(p.Budget_Amount||0)});
    const ent=Object.entries(g).sort((a,b)=>b[1]-a[1]),tot=ent.reduce((s,e)=>s+e[1],0);
    PG._rr=ent.map(([k,v])=>({[m.l]:k==='0'?'No Ward':k,Budget:v,Percentage:(tot?(v/tot*100):0).toFixed(1)+'%'}));
    document.getElementById('rbody').innerHTML=`<div class="panel-head"><h5>${m.l}-wise Budget</h5><span class="badge-gold">Total: ${fmt(tot)}</span></div><div class="table-wrap" style="padding:0"><table><thead><tr><th>${m.l}</th><th>Budget</th><th>%</th><th style="width:180px">Bar</th></tr></thead><tbody>${ent.map(([k,v])=>{const p=tot?(v/tot*100):0;return`<tr><td><strong>${k==='0'?'No Ward':k}</strong></td><td style="font-weight:600">${fmt(v)}</td><td>${p.toFixed(1)}%</td><td><div style="background:#eee;border-radius:6px;height:8px;overflow:hidden"><div style="height:100%;width:${Math.min(p,100)}%;background:var(--accent);border-radius:6px"></div></div></td></tr>`}).join('')}<tr style="background:#faf8f4;font-weight:700"><td>Total</td><td>${fmt(tot)}</td><td>100%</td><td></td></tr></tbody></table></div>`;
};
PG.rcsv=()=>{if(!PG._rr.length){toast('Generate first','warning');return}App.exportCSV('report',PG._rr)};

/* ===== USERS PAGE ===== */
PG.users=(el)=>{
    if(!isAdmin()){el.innerHTML='<p style="color:var(--danger);font-weight:600">Access Denied</p>';return}
    const users=XDB.get('users');
    el.innerHTML=`<div class="panel"><div class="panel-head"><h5>User Management</h5><button class="btn-gold-sm" onclick="PG.ufForm()"><i class="fas fa-plus me-1"></i>Add User</button></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Actions</th></tr></thead><tbody>${users.map(u=>`<tr><td><strong>${u.name}</strong></td><td>${u.email}</td><td><span class="badge-${u.role==='admin'?'red':u.role==='data_entry'?'gold':'blue'}">${u.role.replace('_',' ')}</span></td><td>${u.department_id?getRef(u.department_id,'departments'):'All'}</td><td>${u.id!==1?`<button class="btn-ism me-1" onclick="PG.ufForm(${u.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="XDB.set('users',XDB.get('users').filter(x=>x.id!==${u.id}));toast('Deleted');PG.users(document.getElementById('content-area'))"><i class="fas fa-trash"></i></button>`:'<span style="color:var(--muted);font-size:.78rem">Protected</span>'}</td></tr>`).join('')}</tbody></table></div></div></div>`;
};
PG.ufForm=(id)=>{
    const users=XDB.get('users'),u=id?users.find(x=>x.id===id):null,depts=XDB.get('departments');
    App.openModal(id?'Edit User':'Add User',`<form onsubmit="PG.ufSave(event,${id||0})"><div class="row g-3"><div class="col-md-6"><label class="form-label">Name *</label><input type="text" class="form-control" name="name" value="${u?.name||''}" required></div><div class="col-md-6"><label class="form-label">Email *</label><input type="email" class="form-control" name="email" value="${u?.email||''}" required></div><div class="col-md-4"><label class="form-label">Password${id?' (blank=keep)':''} *</label><input type="password" class="form-control" name="password"${id?'':' required'} minlength="5"></div><div class="col-md-4"><label class="form-label">Role</label><select class="form-select" name="role"><option value="admin"${u?.role==='admin'?' selected':''}>Admin</option><option value="data_entry"${u?.role==='data_entry'?' selected':''}>Data Entry</option><option value="viewer"${u?.role==='viewer'?' selected':''}>Viewer</option></select></div><div class="col-md-4"><label class="form-label">Department</label><select class="form-select" name="department_id"><option value="0">All</option>${depts.map(d=>`<option value="${d.id}"${u?.department_id===d.id?' selected':''}>${d.name}</option>`).join('')}</select></div></div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`);
};
PG.ufSave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());d.department_id=+d.department_id;
    const users=XDB.get('users');if(users.find(u=>u.email===d.email&&u.id!==id)){toast('Email exists','error');return}
    if(id){const i=users.findIndex(u=>u.id===id);if(i>=0){if(d.password)users[i].password=d.password;users[i].name=d.name;users[i].email=d.email;users[i].role=d.role;users[i].department_id=d.department_id}}
    else{if(!d.password){toast('Password required','error');return}d.id=XDB.nextId('users');users.push(d)}
    XDB.set('users',users);App.closeModal();toast(id?'Updated':'Added');PG.users(document.getElementById('content-area'));
};

/* ===== SETTINGS PAGE (Admin Dropdown Manager) ===== */
PG.settings=(el)=>{
    if(!isAdmin()){el.innerHTML='<p style="color:var(--danger);font-weight:600">Access Denied</p>';return}
    PG._settingsTab=PG._settingsTab||'departments';
    const tabs=[
        {id:'departments',label:'Departments',icon:'fa-building',hasNameEn:true},
        {id:'program_types',label:'Program Types',icon:'fa-layer-group',hasNameEn:false},
        {id:'budget_titles',label:'Budget Titles',icon:'fa-tags',hasNameEn:false},
        {id:'budget_areas',label:'Budget Areas',icon:'fa-map-marker-alt',hasNameEn:false},
        {id:'budget_sources',label:'Budget Sources',icon:'fa-coins',hasNameEn:false},
        {id:'budget_levels',label:'Budget Levels',icon:'fa-layer-group',hasNameEn:false},
        {id:'work_types',label:'Work Types',icon:'fa-hard-hat',hasNameEn:false},
        {id:'budget_types',label:'Budget Types',icon:'fa-chart-pie',hasNameEn:false},
        {id:'letter_categories',label:'Letter Categories',icon:'fa-envelope-open-text',hasNameEn:false},
        {id:'banks',label:'Banks',icon:'fa-university',isBanks:true},
        {id:'report_categories',label:'Report Categories',icon:'fa-hard-hat',isReportCats:true},
        {id:'letter_templates',label:'Letter Templates',icon:'fa-file-alt',isTemplates:true},
    ];
    el.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        ${tabs.map(t=>`<div style="padding:7px 14px;border-radius:8px;border:1.5px solid ${PG._settingsTab===t.id?'var(--accent)':'var(--border)'};background:${PG._settingsTab===t.id?'var(--accent)':'var(--card)'};color:${PG._settingsTab===t.id?'#fff':'var(--muted)'};font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s" onclick="PG._setTab('${t.id}')"><i class="fas ${t.icon} me-1"></i>${t.label}</div>`).join('')}
    </div>
    <div id="settings-content"></div>`;
    PG._renderSettingsTab(PG._settingsTab,tabs);
};
PG._setTab=(id)=>{PG._settingsTab=id;PG.settings(document.getElementById('content-area'))};
PG._renderSettingsTab=(tabId,tabs)=>{
    const tab=tabs?tabs.find(t=>t.id===tabId):{id:tabId,label:tabId,icon:'fa-list',hasNameEn:false};
    if(tab?.isTemplates){PG._renderTemplateTab();return;}
    const items=XDB.get(tabId);
    const sc=document.getElementById('settings-content');if(!sc)return;
    sc.innerHTML=`
    <div class="panel">
        <div class="panel-head">
            <h5><i class="fas ${tab?.icon||'fa-list'} me-2" style="color:var(--accent)"></i>${tab?.label||tabId}</h5>
            <span class="badge-gold">${items.length} items</span>
        </div>
        <div class="panel-body">
            <div class="add-item-row">
                <input type="text" id="ni-name" class="form-control" placeholder="Nepali name (e.g. नयाँ विभाग)" style="max-width:260px">
                ${tab?.hasNameEn?`<input type="text" id="ni-name-en" class="form-control" placeholder="English name (optional)" style="max-width:220px">`:''}
                <button class="btn-gold-sm" onclick="PG._addDropItem('${tabId}',${tab?.hasNameEn})"><i class="fas fa-plus me-1"></i>Add</button>
            </div>
            <div id="dropdown-items-list">
                ${items.length?items.map(item=>`
                <div class="dropdown-item-row" id="drow-${item.id}">
                    <div>
                        <div class="item-name">${item.name}</div>
                        ${item.name_en?`<div class="item-sub">${item.name_en}</div>`:''}
                        <div class="item-sub">ID: ${item.id}</div>
                    </div>
                    <div class="d-flex gap-2 no-print">
                        <button class="btn-ism" onclick="PG._editDropItem(${item.id},'${tabId}',${tab?.hasNameEn})"><i class="fas fa-edit"></i></button>
                        <button class="btn-dsm" onclick="PG._delDropItem(${item.id},'${tabId}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`).join(''):
                `<div style="text-align:center;padding:28px;color:var(--muted);font-size:.85rem"><i class="fas fa-inbox me-2"></i>No items yet. Add one above.</div>`}
            </div>
        </div>
    </div>`;
};
PG._addDropItem=(tabId,hasNameEn)=>{
    const nameEl=document.getElementById('ni-name'),nameEnEl=document.getElementById('ni-name-en');
    const name=(nameEl?.value||'').trim();
    if(!name){toast('Name is required','error');return}
    const items=XDB.get(tabId);
    if(items.find(i=>i.name===name)){toast('Already exists','error');return}
    const newItem={id:XDB.nextId(tabId),name};
    if(hasNameEn&&nameEnEl)newItem.name_en=nameEnEl.value.trim();
    items.push(newItem);
    XDB.set(tabId,items);
    toast('Added successfully');
    PG.settings(document.getElementById('content-area'));
};
PG._editDropItem=(id,tabId,hasNameEn)=>{
    const items=XDB.get(tabId),item=items.find(x=>x.id===id);if(!item)return;
    App.openModal(`Edit Item`,`<form onsubmit="PG._saveDropItem(event,${id},'${tabId}',${hasNameEn})"><div class="row g-3">
    <div class="col-12"><label class="form-label">Name (Nepali) *</label><input type="text" class="form-control" name="name" value="${item.name}" required></div>
    ${hasNameEn?`<div class="col-12"><label class="form-label">Name (English)</label><input type="text" class="form-control" name="name_en" value="${item.name_en||''}"></div>`:''}
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'460px');
};
PG._saveDropItem=(e,id,tabId,hasNameEn)=>{
    e.preventDefault();const fd=new FormData(e.target);
    const items=XDB.get(tabId),idx=items.findIndex(x=>x.id===id);if(idx<0)return;
    items[idx].name=fd.get('name');
    if(hasNameEn)items[idx].name_en=fd.get('name_en')||'';
    XDB.set(tabId,items);App.closeModal();toast('Updated');PG.settings(document.getElementById('content-area'));
};
PG._delDropItem=(id,tabId)=>{
    const usageMap={
        departments:{table:'programs',field:'department_id'},
        program_types:{table:'programs',field:'program_type_id'},
        budget_titles:{table:'programs',field:'budge_title_id'},
        budget_areas:{table:'programs',field:'budget_area_id'},
        budget_sources:{table:'programs',field:'budget_source_id'},
        budget_levels:{table:'programs',field:'budget_level_id'},
        work_types:{table:'programs',field:'work_type_id'},
        budget_types:{table:'programs',field:'budget_type_id'},
    };
    const u=usageMap[tabId];
    if(u){const used=XDB.get(u.table).some(p=>p[u.field]===id);if(used){toast('Cannot delete: used in Programs','error');return}}
    App.openModal('Confirm Delete',`<p>Delete this item? This cannot be undone.</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="(()=>{const items=XDB.get('${tabId}').filter(x=>x.id!==${id});XDB.set('${tabId}',items);App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))})()"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'400px');
};

/* ===== LETTER TEMPLATE MANAGER (in Settings) ===== */
PG._renderTemplateTab=()=>{
    const templates=XDB.get('letter_templates'),cats=XDB.get('letter_categories');
    const sc=document.getElementById('settings-content');if(!sc)return;
    sc.innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-file-alt me-2" style="color:var(--accent)"></i>Letter Templates</h5>
        <button class="btn-gold-sm" onclick="PG._tmplForm()"><i class="fas fa-plus me-1"></i>New Template</button></div>
        <div class="panel-body">
        ${templates.length?`<div class="table-wrap"><table><thead><tr><th>Template Name</th><th>Category</th><th>Preview</th><th>Actions</th></tr></thead><tbody>
        ${templates.map(t=>{const cat=cats.find(c=>c.id===t.category_id);return`<tr><td><strong>${t.name}</strong></td><td>${cat?.name||'-'}</td><td style="max-width:280px;font-size:.78rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.body.substring(0,80)}...</td><td class="no-print"><button class="btn-ism me-1" onclick="PG._tmplForm(${t.id})"><i class="fas fa-edit"></i></button><button class="btn-dsm" onclick="PG._tmplDel(${t.id})"><i class="fas fa-trash"></i></button></td></tr>`}).join('')}
        </tbody></table></div>`:`<div style="text-align:center;padding:28px;color:var(--muted)"><i class="fas fa-file-alt fa-2x mb-2 d-block"></i>No templates yet</div>`}
        <div style="margin-top:16px;padding:12px;background:#faf8f4;border-radius:8px;font-size:.78rem;color:var(--muted)">
            <strong>Available Merge Tags:</strong><br>
            <code>{AgreementID} {ProgramName} {RegisterNo} {CommitteeName} {WardNo} {TotalBudget} {Chairman} {ViceChairman} {Secretary} {AgreementDate} {WorkStartDate} {WorkEndDate}</code>
        </div>
        </div>
    </div>`;
};
PG._tmplForm=(id)=>{
    const templates=XDB.get('letter_templates'),t=id?templates.find(x=>x.id===id):null;
    const cats=XDB.get('letter_categories');
    const TAGS=['{AgreementID}','{ProgramName}','{RegisterNo}','{CommitteeName}','{WardNo}','{TotalBudget}','{Chairman}','{ViceChairman}','{Secretary}','{AgreementDate}','{WorkStartDate}','{WorkEndDate}'];
    App.openModal(id?'Edit Template':'New Template',`<form onsubmit="PG._tmplSave(event,${id||0})"><div class="row g-3">
    <div class="col-md-8"><label class="form-label">Template Name *</label><input type="text" class="form-control" name="name" value="${t?.name||''}" required></div>
    <div class="col-md-4"><label class="form-label">Category</label><select class="form-select" name="category_id"><option value="0">Select</option>${cats.map(c=>`<option value="${c.id}"${t?.category_id===c.id?' selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="col-12"><div class="mb-2"><label class="form-label">Merge Tags — click to insert</label><div style="display:flex;flex-wrap:wrap;gap:4px">${TAGS.map(tag=>`<span class="merge-tag" onclick="RTE.insertText('tmpl-rte','${tag}')">${tag}</span>`).join('')}</div></div></div>
    <div class="col-12"><label class="form-label">Template Body *</label>${RTE.build('tmpl-rte',t?.body||'')}</div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'760px');
};
PG._tmplInsert=(tag)=>{RTE.insertText('tmpl-rte',tag)};
PG._tmplSave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());d.category_id=+d.category_id;
    d.body=RTE.get('tmpl-rte');
    if(!d.body){toast('Body required','error');return}
    const templates=XDB.get('letter_templates');
    if(id){const i=templates.findIndex(t=>t.id===id);if(i>=0)templates[i]={...templates[i],...d}}else{d.id=XDB.nextId('letter_templates');templates.push(d)}
    XDB.set('letter_templates',templates);App.closeModal();toast(id?'Updated':'Saved');PG.settings(document.getElementById('content-area'));
};
PG._tmplDel=(id)=>{
    App.openModal('Delete Template',`<p>Delete this template?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('letter_templates',XDB.get('letter_templates').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'380px');
};

/* ===== NOTIFICATIONS PAGE ===== */
PG.notifications=(el)=>{
    const ns=XDB.get('notifications').filter(n=>!n.user_id||n.user_id===App.user.id).sort((a,b)=>b.created_at-a.created_at);
    el.innerHTML=`<div class="panel"><div class="panel-head"><h5>All Notifications</h5><button class="btn-outline-gold btn-sm" onclick="App.markAllRead();PG.notifications(document.getElementById('content-area'))">Read All</button></div><div class="panel-body">${ns.length?`<div class="table-wrap"><table><thead><tr><th></th><th>Message</th><th>Type</th><th>Time</th></tr></thead><tbody>${ns.map(n=>`<tr style="${n.is_read?'':'background:rgba(201,162,39,.04)'}"><td>${n.is_read?'<i class="fas fa-envelope-open" style="color:var(--muted)"></i>':'<i class="fas fa-envelope" style="color:var(--accent)"></i>'}</td><td>${n.message}</td><td><span class="badge-blue">${n.type}</span></td><td style="white-space:nowrap">${timeAgo(n.created_at)}</td></tr>`).join('')}</tbody></table></div>`:'<p style="color:var(--muted);text-align:center;padding:28px">No notifications</p>'}</div></div>`;
};

/* ===== RICH TEXT EDITOR ENGINE ===== */
const RTE={
    build(id,html=''){
        return`<div class="rte-wrap" id="rte-${id}">
        <div class="rte-toolbar">
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','bold')" title="Bold"><b>B</b></button>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','italic')" title="Italic"><i>I</i></button>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','underline')" title="Underline"><u>U</u></button>
            <div class="rte-sep"></div>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','justifyLeft')" title="Left"><i class="fas fa-align-left"></i></button>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','justifyCenter')" title="Center"><i class="fas fa-align-center"></i></button>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','justifyRight')" title="Right"><i class="fas fa-align-right"></i></button>
            <div class="rte-sep"></div>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','insertUnorderedList')" title="List"><i class="fas fa-list-ul"></i></button>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','insertOrderedList')" title="Ordered"><i class="fas fa-list-ol"></i></button>
            <div class="rte-sep"></div>
            <select class="form-select form-select-sm" style="width:auto;height:28px;padding:2px 6px;font-size:.75rem" onchange="RTE.cmd('${id}','fontSize',this.value);this.value=''">
                <option value="">Size</option><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">X-Large</option>
            </select>
            <div class="rte-sep"></div>
            <button type="button" class="rte-btn" onclick="RTE.cmd('${id}','removeFormat')" title="Clear"><i class="fas fa-eraser"></i></button>
        </div>
        <div class="rte-body" id="rte-body-${id}" contenteditable="true">${html}</div>
        </div>`;
    },
    cmd(id,cmd,val){const el=document.getElementById('rte-body-'+id);if(!el)return;el.focus();document.execCommand(cmd,false,val||null)},
    get(id){const el=document.getElementById('rte-body-'+id);return el?el.innerHTML:''},
    set(id,html){const el=document.getElementById('rte-body-'+id);if(el)el.innerHTML=html||''},
    insertText(id,text){
        const el=document.getElementById('rte-body-'+id);if(!el)return;
        el.focus();
        const sel=window.getSelection();
        if(sel&&sel.rangeCount){const r=sel.getRangeAt(0);r.deleteContents();r.insertNode(document.createTextNode(text));r.collapse(false);}
        else el.innerHTML+=' '+text;
    },
    getPlain(id){const el=document.getElementById('rte-body-'+id);return el?el.innerText:''}
};

/* ===== BANK MANAGEMENT (Admin) ===== */
PG._renderBankTab=()=>{
    const banks=XDB.get('banks');
    const sc=document.getElementById('settings-content');if(!sc)return;
    sc.innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-university me-2" style="color:var(--accent)"></i>Bank Management</h5>
        <button class="btn-gold-sm" onclick="PG.bankForm()"><i class="fas fa-plus me-1"></i>Add Bank</button></div>
        <div class="panel-body">
        <div class="table-wrap"><table><thead><tr><th>Bank Name</th><th>Branch</th><th>Account No</th><th>SWIFT</th><th>Actions</th></tr></thead><tbody>
        ${banks.length?banks.map(b=>`<tr>
            <td><strong>${b.name}</strong></td><td>${b.branch||'-'}</td>
            <td><code style="font-size:.78rem;background:rgba(201,162,39,.08);padding:2px 6px;border-radius:4px">${b.account_no||'-'}</code></td>
            <td>${b.swift||'-'}</td>
            <td><button class="btn-ism me-1" onclick="PG.bankForm(${b.id})"><i class="fas fa-edit"></i></button>
            <button class="btn-dsm" onclick="PG.bankDel(${b.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join(''):`<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">No banks yet</td></tr>`}
        </tbody></table></div>
        </div>
    </div>`;
};
PG.bankForm=(id)=>{
    const banks=XDB.get('banks'),b=id?banks.find(x=>x.id===id):null;
    App.openModal(id?'Edit Bank':'Add Bank',`<form onsubmit="PG.bankSave(event,${id||0})"><div class="row g-3">
    <div class="col-md-6"><label class="form-label">Bank Name *</label><input type="text" class="form-control" name="name" value="${b?.name||''}" required></div>
    <div class="col-md-6"><label class="form-label">Branch</label><input type="text" class="form-control" name="branch" value="${b?.branch||''}"></div>
    <div class="col-md-6"><label class="form-label">Account No</label><input type="text" class="form-control" name="account_no" value="${b?.account_no||''}"></div>
    <div class="col-md-6"><label class="form-label">SWIFT Code</label><input type="text" class="form-control" name="swift" value="${b?.swift||''}"></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'560px');
};
PG.bankSave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());
    const banks=XDB.get('banks');
    if(id){const i=banks.findIndex(b=>b.id===id);if(i>=0)banks[i]={...banks[i],...d}}
    else{d.id=XDB.nextId('banks');banks.push(d)}
    XDB.set('banks',banks);App.closeModal();toast(id?'Updated':'Added');PG.settings(document.getElementById('content-area'));
};
PG.bankDel=(id)=>{
    const used=XDB.get('agreements').some(a=>a.bank_id===id);
    if(used){toast('Cannot delete: used in Agreements','error');return}
    App.openModal('Delete Bank',`<p>Delete this bank?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('banks',XDB.get('banks').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'380px');
};

/* ===== REPORT CATEGORIES MANAGEMENT (Admin, parent/child) ===== */
PG._renderReportCatTab=()=>{
    const cats=XDB.get('report_categories');
    const parents=cats.filter(c=>!c.parent_id||c.parent_id===0);
    const sc=document.getElementById('settings-content');if(!sc)return;
    sc.innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-hard-hat me-2" style="color:var(--accent)"></i>Report Categories</h5>
        <button class="btn-gold-sm" onclick="PG.rcatForm()"><i class="fas fa-plus me-1"></i>Add Category</button></div>
        <div class="panel-body">
        ${parents.length?parents.map(p=>{
            const children=cats.filter(c=>c.parent_id===p.id);
            return`<div style="margin-bottom:14px">
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(201,162,39,.06);border-radius:8px;border:1px solid rgba(201,162,39,.2);margin-bottom:6px">
                    <div><strong>${p.name}</strong> <span class="badge-gold ms-2">${p.unit||'nos'}</span></div>
                    <div class="d-flex gap-1">
                        <button class="btn-ssm" onclick="PG.rcatForm(0,${p.id})" title="Add child"><i class="fas fa-plus"></i></button>
                        <button class="btn-ism" onclick="PG.rcatForm(${p.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-dsm" onclick="PG.rcatDel(${p.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                ${children.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 32px;background:var(--card);border-radius:7px;border:1px solid var(--border);margin-bottom:4px">
                    <div style="font-size:.88rem"><i class="fas fa-level-down-alt me-2" style="color:var(--muted);font-size:.7rem"></i>${c.name} <span class="badge-blue ms-1">${c.unit||'nos'}</span></div>
                    <div class="d-flex gap-1">
                        <button class="btn-ism" onclick="PG.rcatForm(${c.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn-dsm" onclick="PG.rcatDel(${c.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`).join('')}
            </div>`;
        }).join(''):`<div style="text-align:center;padding:28px;color:var(--muted)"><i class="fas fa-hard-hat fa-2x mb-2 d-block"></i>No categories yet. Add a parent category first.</div>`}
        </div>
    </div>`;
};
PG.rcatForm=(id,parentId)=>{
    const cats=XDB.get('report_categories'),c=id?cats.find(x=>x.id===id):null;
    const parents=cats.filter(x=>!x.parent_id||x.parent_id===0).filter(x=>x.id!==id);
    App.openModal(id?'Edit Category':'Add Category',`<form onsubmit="PG.rcatSave(event,${id||0})"><div class="row g-3">
    <div class="col-md-8"><label class="form-label">Category Name *</label><input type="text" class="form-control" name="name" value="${c?.name||''}" required></div>
    <div class="col-md-4"><label class="form-label">Unit</label><input type="text" class="form-control" name="unit" value="${c?.unit||'nos'}" placeholder="km / nos / meter"></div>
    <div class="col-md-6"><label class="form-label">Parent Category</label><select class="form-select" name="parent_id"><option value="0">— Top Level —</option>${parents.map(p=>`<option value="${p.id}"${(c?.parent_id||parentId||0)===p.id?' selected':''}>${p.name}</option>`).join('')}</select></div>
    <div class="col-md-6"><label class="form-label">Sort Order</label><input type="number" class="form-control" name="sort_order" value="${c?.sort_order||0}" min="0"></div>
    </div><div class="mt-4 d-flex gap-2"><button type="submit" class="btn-gold-sm"><i class="fas fa-save me-1"></i>Save</button><button type="button" class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div></form>`,'500px');
};
PG.rcatSave=(e,id)=>{
    e.preventDefault();const fd=new FormData(e.target),d=Object.fromEntries(fd.entries());
    d.parent_id=+(d.parent_id||0);d.sort_order=+(d.sort_order||0);
    const cats=XDB.get('report_categories');
    if(id){const i=cats.findIndex(c=>c.id===id);if(i>=0)cats[i]={...cats[i],...d}}
    else{d.id=XDB.nextId('report_categories');cats.push(d)}
    XDB.set('report_categories',cats);App.closeModal();toast(id?'Updated':'Added');PG.settings(document.getElementById('content-area'));
};
PG.rcatDel=(id)=>{
    const cats=XDB.get('report_categories');
    const hasChildren=cats.some(c=>c.parent_id===id);
    if(hasChildren){toast('Delete child categories first','error');return}
    App.openModal('Delete Category',`<p>Delete this category?</p><div class="mt-3 d-flex gap-2"><button class="btn-dsm" onclick="XDB.set('report_categories',XDB.get('report_categories').filter(x=>x.id!==${id}));App.closeModal();toast('Deleted');PG.settings(document.getElementById('content-area'))"><i class="fas fa-trash me-1"></i>Delete</button><button class="btn-outline-gold" onclick="App.closeModal()">Cancel</button></div>`,'380px');
};

/* ===== REPORTS PAGE — Rebuilt ===== */
PG.reports=(el)=>{
    PG._rptTab=PG._rptTab||'program';
    el.innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">
        <div style="padding:8px 18px;border-radius:8px;border:1.5px solid ${PG._rptTab==='program'?'var(--accent)':'var(--border)'};background:${PG._rptTab==='program'?'var(--accent)':'var(--card)'};color:${PG._rptTab==='program'?'#fff':'var(--muted)'};font-size:.82rem;font-weight:600;cursor:pointer" onclick="PG._rptTab='program';PG.reports(document.getElementById('content-area'))"><i class="fas fa-project-diagram me-1"></i>Program Report</div>
        <div style="padding:8px 18px;border-radius:8px;border:1.5px solid ${PG._rptTab==='agreement'?'var(--accent)':'var(--border)'};background:${PG._rptTab==='agreement'?'var(--accent)':'var(--card)'};color:${PG._rptTab==='agreement'?'#fff':'var(--muted)'};font-size:.82rem;font-weight:600;cursor:pointer" onclick="PG._rptTab='agreement';PG.reports(document.getElementById('content-area'))"><i class="fas fa-file-contract me-1"></i>Agreement Report</div>
        <div style="padding:8px 18px;border-radius:8px;border:1.5px solid ${PG._rptTab==='workreport'?'var(--accent)':'var(--border)'};background:${PG._rptTab==='workreport'?'var(--accent)':'var(--card)'};color:${PG._rptTab==='workreport'?'#fff':'var(--muted)'};font-size:.82rem;font-weight:600;cursor:pointer" onclick="PG._rptTab='workreport';PG.reports(document.getElementById('content-area'))"><i class="fas fa-hard-hat me-1"></i>Work Report</div>
    </div>
    <div id="rpt-content"></div>`;
    if(PG._rptTab==='program') PG._rptProgram();
    else if(PG._rptTab==='agreement') PG._rptAgreement();
    else if(PG._rptTab==='workreport') PG._rptWork();
};

PG._rptProgram=()=>{
    const depts=XDB.get('departments'),bt=XDB.get('budget_titles'),pt=XDB.get('program_types'),bs=XDB.get('budget_sources'),ba=XDB.get('budget_areas'),bl=XDB.get('budget_levels'),wt=XDB.get('work_types'),bty=XDB.get('budget_types');
    const mkSel=(name,items,label)=>`<div class="col-md-3 col-sm-6"><label class="form-label">${label}</label><select class="form-select form-select-sm" name="${name}"><option value="">All</option>${items.map(i=>`<option value="${i.id}">${i.name}</option>`).join('')}</select></div>`;
    document.getElementById('rpt-content').innerHTML=`
    <div class="panel mb-3">
        <div class="panel-head"><h5><i class="fas fa-filter me-2" style="color:var(--accent)"></i>Filter Programs</h5></div>
        <div class="panel-body">
        <form id="prpt-form" onsubmit="PG._rptProgRun(event)">
        <div class="row g-2 mb-3">
            <div class="col-md-3 col-sm-6"><label class="form-label">Program Name</label><input type="text" class="form-control form-control-sm" name="Program_Name" placeholder="Search..."></div>
            <div class="col-md-3 col-sm-6"><label class="form-label">Register No</label><input type="text" class="form-control form-control-sm" name="Register_No" placeholder="PRJ-..."></div>
            <div class="col-md-3 col-sm-6"><label class="form-label">Ward No</label><select class="form-select form-select-sm" name="Ward_Number"><option value="">All</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}">वडा ${w}</option>`).join('')}</select></div>
            ${mkSel('budge_title_id',bt,'Budget Title')}
            ${mkSel('program_type_id',pt,'Program Type')}
            ${mkSel('budget_source_id',bs,'Budget Source')}
            ${mkSel('budget_area_id',ba,'Budget Area')}
            ${mkSel('department_id',depts,'Department')}
            ${mkSel('budget_level_id',bl,'Budget Level')}
            ${mkSel('work_type_id',wt,'Work Type')}
            ${mkSel('budget_type_id',bty,'Budget Type')}
            <div class="col-md-3 col-sm-6"><label class="form-label">Selected</label><select class="form-select form-select-sm" name="isSelected"><option value="">All</option><option value="1">Yes</option><option value="0">No</option></select></div>
            <div class="col-md-3 col-sm-6"><label class="form-label">Completed</label><select class="form-select form-select-sm" name="isCompleted"><option value="">All</option><option value="1">Completed</option><option value="0">Ongoing</option></select></div>
        </div>
        <div class="d-flex gap-2">
            <button type="submit" class="btn-gold-sm"><i class="fas fa-search me-1"></i>Generate Report</button>
            <button type="button" class="btn-outline-gold" onclick="document.getElementById('prpt-form').reset();document.getElementById('prpt-result').innerHTML=''">Reset</button>
        </div>
        </form>
        </div>
    </div>
    <div id="prpt-result"></div>`;
};
PG._rptProgRun=(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target),f=Object.fromEntries(fd.entries());
    let data=deptFilter(XDB.get('programs'));
    if(f.Program_Name)data=data.filter(p=>p.Program_Name.toLowerCase().includes(f.Program_Name.toLowerCase()));
    if(f.Register_No)data=data.filter(p=>(p.Register_No||'').toLowerCase().includes(f.Register_No.toLowerCase()));
    if(f.Ward_Number)data=data.filter(p=>p.Ward_Number===+f.Ward_Number);
    if(f.budge_title_id)data=data.filter(p=>p.budge_title_id===+f.budge_title_id);
    if(f.program_type_id)data=data.filter(p=>p.program_type_id===+f.program_type_id);
    if(f.budget_source_id)data=data.filter(p=>p.budget_source_id===+f.budget_source_id);
    if(f.budget_area_id)data=data.filter(p=>p.budget_area_id===+f.budget_area_id);
    if(f.department_id)data=data.filter(p=>p.department_id===+f.department_id);
    if(f.budget_level_id)data=data.filter(p=>p.budget_level_id===+f.budget_level_id);
    if(f.work_type_id)data=data.filter(p=>p.work_type_id===+f.work_type_id);
    if(f.budget_type_id)data=data.filter(p=>p.budget_type_id===+f.budget_type_id);
    if(f.isSelected!=='')data=data.filter(p=>p.isSelected===+f.isSelected);
    if(f.isCompleted!=='')data=data.filter(p=>p.isCompleted===+f.isCompleted);
    const total=data.reduce((s,p)=>s+(p.Budget_Amount||0),0);
    const res=document.getElementById('prpt-result');
    if(!data.length){res.innerHTML='<div class="panel"><div class="panel-body" style="text-align:center;color:var(--muted);padding:28px">No programs match the filters.</div></div>';return}
    PG._rptProgData=data;
    res.innerHTML=`<div class="panel">
        <div class="panel-head">
            <h5>Results <span class="badge-gold ms-2">${data.length} programs</span> <span class="badge-teal ms-1">Total: ${fmt(total)}</span></h5>
            <div class="d-flex gap-2 no-print">
                <button class="btn-outline-gold" onclick="window.print()"><i class="fas fa-print me-1"></i>Print</button>
                <button class="btn-teal-sm" onclick="PG._rptExcel(PG._rptProgData,'Program_Report')"><i class="fas fa-file-excel me-1"></i>Excel</button>
            </div>
        </div>
        <div class="table-wrap">
        <table class="report-summary-table" style="width:100%"><thead><tr><th>#</th><th>Register No</th><th>Program Name</th><th>Ward</th><th>Budget</th><th>Department</th><th>Budget Title</th><th>Type</th><th>Level</th><th>Status</th></tr></thead>
        <tbody>${data.map((p,i)=>`<tr>
            <td>${i+1}</td>
            <td><code style="font-size:.78rem">${p.Register_No}</code></td>
            <td>${p.Program_Name}</td>
            <td>${p.Ward_Number||'-'}</td>
            <td style="font-weight:600;text-align:right">${fmt(p.Budget_Amount)}</td>
            <td>${getRef(p.department_id,'departments')}</td>
            <td>${getRef(p.budge_title_id,'budget_titles')}</td>
            <td>${getRef(p.program_type_id,'program_types')}</td>
            <td>${getRef(p.budget_level_id,'budget_levels')}</td>
            <td><span class="${p.isCompleted?'badge-teal':'badge-red'}">${p.isCompleted?'Completed':'Ongoing'}</span></td>
        </tr>`).join('')}
        <tr class="total-row"><td colspan="4" style="font-weight:800">TOTAL</td><td style="font-weight:800;text-align:right">${fmt(total)}</td><td colspan="5"></td></tr>
        </tbody></table></div></div>`;
};

PG._rptAgreement=()=>{
    const progs=XDB.get('programs');
    document.getElementById('rpt-content').innerHTML=`
    <div class="panel mb-3">
        <div class="panel-head"><h5><i class="fas fa-filter me-2" style="color:var(--accent)"></i>Filter Agreements</h5></div>
        <div class="panel-body">
        <form id="arpt-form" onsubmit="PG._rptAgrRun(event)">
        <div class="row g-2 mb-3">
            <div class="col-md-4"><label class="form-label">Program</label><select class="form-select form-select-sm" name="program_id"><option value="">All Programs</option>${progs.map(p=>`<option value="${p.id}">${p.Program_Name}</option>`).join('')}</select></div>
            <div class="col-md-4"><label class="form-label">Committee Name</label><input type="text" class="form-control form-control-sm" name="communitee_name" placeholder="Search committee..."></div>
            <div class="col-md-4"><label class="form-label">Ward No</label><select class="form-select form-select-sm" name="wada_no"><option value="">All Wards</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}">वडा ${w}</option>`).join('')}</select></div>
            <div class="col-md-4"><label class="form-label">Agreement Date From (BS)</label><input type="text" class="form-control form-control-sm" name="date_from" placeholder="2081-01-01"></div>
            <div class="col-md-4"><label class="form-label">Agreement Date To (BS)</label><input type="text" class="form-control form-control-sm" name="date_to" placeholder="2081-12-30"></div>
            <div class="col-md-4"><label class="form-label">Work Start</label><input type="text" class="form-control form-control-sm" name="work_start_date" placeholder="2081-..."></div>
            <div class="col-md-4"><label class="form-label">Work End</label><input type="text" class="form-control form-control-sm" name="work_end_date" placeholder="2082-..."></div>
        </div>
        <div class="d-flex gap-2">
            <button type="submit" class="btn-gold-sm"><i class="fas fa-search me-1"></i>Generate Report</button>
            <button type="button" class="btn-outline-gold" onclick="document.getElementById('arpt-form').reset();document.getElementById('arpt-result').innerHTML=''">Reset</button>
        </div>
        </form>
        </div>
    </div>
    <div id="arpt-result"></div>`;
};
PG._rptAgrRun=(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target),f=Object.fromEntries(fd.entries());
    let data=XDB.get('agreements');
    if(f.program_id)data=data.filter(a=>a.program_id===+f.program_id);
    if(f.communitee_name)data=data.filter(a=>(a.communitee_name||'').toLowerCase().includes(f.communitee_name.toLowerCase()));
    if(f.wada_no)data=data.filter(a=>a.wada_no===+f.wada_no);
    if(f.date_from)data=data.filter(a=>(a.agreement_date||'')>=f.date_from);
    if(f.date_to)data=data.filter(a=>(a.agreement_date||'')<=f.date_to);
    if(f.work_start_date)data=data.filter(a=>(a.work_start_date||'')>=f.work_start_date);
    if(f.work_end_date)data=data.filter(a=>(a.work_end_date||'')<=f.work_end_date);
    const total=data.reduce((s,a)=>s+(a.total_budget_amt||0),0);
    const res=document.getElementById('arpt-result');
    if(!data.length){res.innerHTML='<div class="panel"><div class="panel-body" style="text-align:center;color:var(--muted);padding:28px">No agreements match the filters.</div></div>';return}
    PG._rptAgrData=data;
    const fins=XDB.get('financials');
    res.innerHTML=`<div class="panel">
        <div class="panel-head">
            <h5>Results <span class="badge-gold ms-2">${data.length} agreements</span> <span class="badge-teal ms-1">Total: ${fmt(total)}</span></h5>
            <div class="d-flex gap-2 no-print">
                <button class="btn-outline-gold" onclick="window.print()"><i class="fas fa-print me-1"></i>Print</button>
                <button class="btn-teal-sm" onclick="PG._rptExcel(PG._rptAgrData.map(a=>({ID:a.agreement_id,Program:getRef(a.program_id,'programs'),Committee:a.communitee_name,Ward:a.wada_no,Budget:a.total_budget_amt,Date:a.agreement_date,Start:a.work_start_date,End:a.work_end_date})),'Agreement_Report')"><i class="fas fa-file-excel me-1"></i>Excel</button>
            </div>
        </div>
        <div class="table-wrap">
        <table class="report-summary-table" style="width:100%"><thead><tr><th>#</th><th>Agreement ID</th><th>Program</th><th>Committee</th><th>Ward</th><th>Budget</th><th>Bank</th><th>Agr. Date</th><th>Start</th><th>End</th><th>Expenses</th><th>Remaining</th></tr></thead>
        <tbody>${data.map((a,i)=>{
            const pr=XDB.get('programs').find(p=>p.id===a.program_id);
            const bank=XDB.get('banks').find(b=>b.id===a.bank_id);
            const fin=fins.find(f=>f.agreement_id===a.id);
            const exp=fin?(fin.expenses||[]).reduce((s,e)=>s+(e.amount||0),0):0;
            return`<tr>
            <td>${i+1}</td>
            <td><a class="view-link" onclick="PG.agreementDetail(${a.id})">${a.agreement_id}</a></td>
            <td style="font-size:.82rem">${pr?.Program_Name||'-'}</td>
            <td style="font-size:.82rem">${a.communitee_name}</td>
            <td>${a.wada_no}</td>
            <td style="font-weight:600;text-align:right">${fmt(a.total_budget_amt)}</td>
            <td style="font-size:.78rem">${bank?bank.name:'-'}</td>
            <td style="white-space:nowrap">${a.agreement_date||'-'}</td>
            <td style="white-space:nowrap">${a.work_start_date||'-'}</td>
            <td style="white-space:nowrap">${a.work_end_date||'-'}</td>
            <td style="text-align:right;color:var(--danger)">${fmt(exp)}</td>
            <td style="text-align:right;color:var(--success)">${fmt((a.total_budget_amt||0)-exp)}</td>
            </tr>`;
        }).join('')}
        <tr class="total-row"><td colspan="5" style="font-weight:800">TOTAL</td><td style="font-weight:800;text-align:right">${fmt(total)}</td><td colspan="6"></td></tr>
        </tbody></table></div></div>`;
};

PG._rptWork=()=>{
    const cats=XDB.get('report_categories');
    const parents=cats.filter(c=>!c.parent_id||c.parent_id===0).sort((a,b)=>a.sort_order-b.sort_order);
    document.getElementById('rpt-content').innerHTML=`
    <div class="panel mb-3">
        <div class="panel-head"><h5><i class="fas fa-filter me-2" style="color:var(--accent)"></i>Work Report Filter</h5></div>
        <div class="panel-body">
        <form id="wrpt-form" onsubmit="PG._rptWorkRun(event)">
        <div class="row g-2 mb-3">
            <div class="col-md-3"><label class="form-label">Ward No</label><select class="form-select form-select-sm" name="wada_no"><option value="">All Wards</option>${[1,2,3,4,5,6,7,8,9].map(w=>`<option value="${w}">वडा ${w}</option>`).join('')}</select></div>
            <div class="col-md-3"><label class="form-label">Parent Category</label><select class="form-select form-select-sm" name="parent_cat"><option value="">All</option>${parents.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
            <div class="col-md-3"><label class="form-label">Sub Category</label><select class="form-select form-select-sm" id="wrpt-subcat" name="sub_cat"><option value="">All</option>${cats.filter(c=>c.parent_id>0).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
            <div class="col-md-3"><label class="form-label">View Mode</label><select class="form-select form-select-sm" name="view_mode"><option value="both">Both Categories</option><option value="parent">Parent Only</option><option value="sub">Sub Category Only</option></select></div>
        </div>
        <div class="d-flex gap-2">
            <button type="submit" class="btn-gold-sm"><i class="fas fa-search me-1"></i>Generate Report</button>
            <button type="button" class="btn-outline-gold" onclick="document.getElementById('wrpt-form').reset();document.getElementById('wrpt-result').innerHTML=''">Reset</button>
        </div>
        </form>
        </div>
    </div>
    <div id="wrpt-result"></div>`;
};
PG._rptWorkRun=(e)=>{
    e.preventDefault();
    const fd=new FormData(e.target),f=Object.fromEntries(fd.entries());
    const cats=XDB.get('report_categories');
    const parents=cats.filter(c=>!c.parent_id||c.parent_id===0).sort((a,b)=>a.sort_order-b.sort_order);
    const allReports=XDB.get('agreement_reports');
    // Filter reports by ward if selected
    let filteredReports=allReports;
    if(f.wada_no)filteredReports=filteredReports.filter(r=>r.wada_no===+f.wada_no);

    // Parse entries from JSON
    const parsedReports=filteredReports.map(r=>{let entries=[];try{entries=JSON.parse(r.entries||'[]');}catch(e){entries=[];}return{...r,entries}});

    // Get unique wards
    const wards=[...new Set(parsedReports.map(r=>r.wada_no))].sort((a,b)=>a-b);
    if(!wards.length){document.getElementById('wrpt-result').innerHTML='<div class="panel"><div class="panel-body" style="text-align:center;color:var(--muted);padding:28px">No work reports found for the selected filters.</div></div>';return}

    // Build aggregation: ward -> cat_id -> sum
    const aggr={};
    parsedReports.forEach(r=>{
        const w=r.wada_no;if(!aggr[w])aggr[w]={};
        r.entries.forEach(en=>{aggr[w][en.cat_id]=(aggr[w][en.cat_id]||0)+(+en.value||0)});
    });

    const viewMode=f.view_mode||'both';
    // Filter parents/cats based on selection
    let showParents=parents;
    if(f.parent_cat)showParents=parents.filter(p=>p.id===+f.parent_cat);

    // Build table
    let thead='<tr><th style="min-width:220px">Category</th>';
    wards.forEach(w=>{thead+=`<th style="text-align:center;min-width:80px">वडा ${w}</th>`});
    thead+='<th style="text-align:right;min-width:80px">Total</th></tr>';

    let tbody='';
    let grandTotal={};wards.forEach(w=>{grandTotal[w]=0});let grandTotalAll=0;

    showParents.forEach(parent=>{
        const children=cats.filter(c=>c.parent_id===parent.id).sort((a,b)=>a.sort_order-b.sort_order);
        if(f.sub_cat&&!children.find(c=>c.id===+f.sub_cat))return;

        // Parent row total per ward
        const parentTotals={};let parentSum=0;
        wards.forEach(w=>{
            let s=0;children.forEach(c=>{s+=(aggr[w]?.[c.id]||0)});
            parentTotals[w]=s;parentSum+=s;
            grandTotal[w]+=(viewMode==='parent'?s:0);
        });

        if(viewMode==='both'||viewMode==='parent'){
            tbody+=`<tr class="group-row"><td><strong><i class="fas fa-folder me-2" style="color:var(--accent)"></i>${parent.name}</strong> <span class="badge-gold ms-1">${parent.unit||'nos'}</span></td>`;
            wards.forEach(w=>{tbody+=`<td style="text-align:center;font-weight:700">${parentTotals[w]||'-'}</td>`});
            tbody+=`<td style="text-align:right;font-weight:700">${parentSum||'-'}</td></tr>`;
            grandTotalAll+=(viewMode==='parent'?parentSum:0);
        }

        if(viewMode==='both'||viewMode==='sub'){
            let showChildren=children;
            if(f.sub_cat)showChildren=children.filter(c=>c.id===+f.sub_cat);
            showChildren.forEach(c=>{
                let rowSum=0;
                tbody+=`<tr><td style="padding-left:${viewMode==='both'?'32px':'14px'};font-size:.85rem">${viewMode==='both'?'<i class="fas fa-angle-right me-2" style="color:var(--muted)"></i>':''}${c.name} <span class="badge-blue ms-1">${c.unit||'nos'}</span></td>`;
                wards.forEach(w=>{
                    const v=aggr[w]?.[c.id]||0;rowSum+=v;
                    tbody+=`<td style="text-align:center">${v||'-'}</td>`;
                    grandTotal[w]+=v;
                });
                tbody+=`<td style="text-align:right">${rowSum||'-'}</td></tr>`;
                grandTotalAll+=rowSum;
            });
        }
    });

    // Grand total row
    tbody+='<tr class="total-row"><td><strong>GRAND TOTAL</strong></td>';
    wards.forEach(w=>{tbody+=`<td style="text-align:center;font-weight:800">${grandTotal[w]||'-'}</td>`});
    tbody+=`<td style="text-align:right;font-weight:800">${grandTotalAll||'-'}</td></tr>`;

    PG._rptWorkData={wards,aggr,cats,parents:showParents};
    document.getElementById('wrpt-result').innerHTML=`<div class="panel">
        <div class="panel-head">
            <h5>Work Summary Report <span class="badge-blue ms-2">${parsedReports.length} report(s)</span></h5>
            <div class="d-flex gap-2 no-print">
                <button class="btn-outline-gold" onclick="window.print()"><i class="fas fa-print me-1"></i>Print</button>
                <button class="btn-teal-sm" onclick="PG._rptWorkExcel()"><i class="fas fa-file-excel me-1"></i>Excel</button>
            </div>
        </div>
        <div class="table-wrap"><table class="report-summary-table" style="width:100%"><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
    </div>`;
};
PG._rptWorkExcel=()=>{
    if(!PG._rptWorkData){toast('Generate first','warning');return}
    const {wards,aggr,cats,parents}=PG._rptWorkData;
    const rows=[];
    parents.forEach(parent=>{
        const children=cats.filter(c=>c.parent_id===parent.id).sort((a,b)=>a.sort_order-b.sort_order);
        const prow={Category:parent.name,Unit:parent.unit||'nos'};let psum=0;
        wards.forEach(w=>{let s=0;children.forEach(c=>{s+=(aggr[w]?.[c.id]||0)});prow['वडा '+w]=s||0;psum+=s});
        prow.Total=psum;rows.push(prow);
        children.forEach(c=>{const crow={'  Sub-Category':'  '+c.name,Unit:c.unit||'nos'};let csum=0;wards.forEach(w=>{const v=aggr[w]?.[c.id]||0;crow['वडा '+w]=v;csum+=v});crow.Total=csum;rows.push(crow)});
    });
    App.exportCSV('Work_Report',rows);
};
PG._rptExcel=(rows,name)=>{
    if(!rows||!rows.length){toast('No data','warning');return}
    const ws=XLSX.utils.json_to_sheet(rows);
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name.substring(0,31));
    const out=XLSX.write(wb,{type:'array',bookType:'xlsx'});
    const b=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const l=document.createElement('a');l.href=URL.createObjectURL(b);l.download=name+'.xlsx';l.click();
    toast('Exported to Excel');
};

/* ===== AGREEMENT REPORT TAB (in agreementDetail) ===== */
PG._detailAgrReport=(agrId)=>{
    const a=XDB.get('agreements').find(x=>x.id===agrId);
    const existingReport=XDB.get('agreement_reports').find(r=>r.agreement_id===agrId);
    const cats=XDB.get('report_categories');
    const parents=cats.filter(c=>!c.parent_id||c.parent_id===0).sort((a,b)=>a.sort_order-b.sort_order);
    let entries={};
    if(existingReport){try{const arr=JSON.parse(existingReport.entries||'[]');arr.forEach(e=>{entries[e.cat_id]=e.value});}catch(x){}}
    const tc=document.getElementById('detail-tab-content');if(!tc)return;
    tc.innerHTML=`
    <div class="panel">
        <div class="panel-head"><h5><i class="fas fa-hard-hat me-2" style="color:var(--accent)"></i>Work Report Form</h5>
        ${canWrite()?`<button class="btn-gold-sm no-print" onclick="PG._saveAgrReport(${agrId})"><i class="fas fa-save me-1"></i>Save Report</button>`:''}</div>
        <div class="panel-body">
        <div class="row g-2 mb-3">
            <div class="col-md-4"><label class="form-label">Ward No</label><input type="number" class="form-control" id="rpt-wada" value="${existingReport?.wada_no||a?.wada_no||''}" min="1" max="9"></div>
            <div class="col-md-4"><label class="form-label">Report Date (BS)</label>${nepaliHTML('rptd',existingReport?.report_date||'')}</div>
        </div>
        ${parents.length?parents.map(parent=>{
            const children=cats.filter(c=>c.parent_id===parent.id).sort((a,b)=>a.sort_order-b.sort_order);
            return`<div class="rf-section">
                <div class="rf-section-head"><i class="fas fa-folder-open me-2" style="color:var(--accent)"></i>${parent.name} <span class="badge-gold ms-2">${parent.unit||'nos'}</span></div>
                <div class="rf-section-body">
                ${children.length?children.map(c=>`
                <div class="rf-row">
                    <div><div class="rf-label">${c.name}</div><div class="rf-sub">${c.unit||'nos'}</div></div>
                    <input type="number" class="rf-input" id="rcat-${c.id}" value="${entries[c.id]||''}" min="0" step="0.01" placeholder="0">
                </div>`).join(''):'<div style="color:var(--muted);font-size:.82rem;text-align:center;padding:12px">No sub-categories. Add in Settings → Report Categories.</div>'}
                </div>
            </div>`;
        }).join(''):'<div style="text-align:center;color:var(--muted);padding:28px">No report categories defined. Go to Settings → Report Categories to add them.</div>'}
        </div>
    </div>`;
};
PG._saveAgrReport=(agrId)=>{
    const cats=XDB.get('report_categories').filter(c=>c.parent_id>0);
    const entries=[];
    cats.forEach(c=>{const el=document.getElementById('rcat-'+c.id);if(el&&el.value!=='')entries.push({cat_id:c.id,value:+el.value})});
    const wada=+document.getElementById('rpt-wada')?.value||0;
    const rdate=ND.get('rptd');
    const reports=XDB.get('agreement_reports');
    const existing=reports.find(r=>r.agreement_id===agrId);
    if(existing){existing.entries=JSON.stringify(entries);existing.wada_no=wada;existing.report_date=rdate;}
    else reports.push({id:XDB.nextId('agreement_reports'),agreement_id:agrId,wada_no:wada,report_date:rdate,entries:JSON.stringify(entries)});
    XDB.set('agreement_reports',reports);
    toast('Report saved');
};

/* ===== UPDATE SETTINGS to render banks and report_categories ===== */
// Patch _renderSettingsTab to handle isBanks and isReportCats
const _origRenderSettingsTab=PG._renderSettingsTab.bind(PG);
PG._renderSettingsTab=(tabId,tabs)=>{
    const tab=tabs?tabs.find(t=>t.id===tabId):null;
    if(tab?.isBanks){PG._renderBankTab();return}
    if(tab?.isReportCats){PG._renderReportCatTab();return}
    _origRenderSettingsTab(tabId,tabs);
};

/* ===== FIX agreementDetail to include report tab ===== */
const _origAgreementDetail=PG.agreementDetail.bind(PG);
PG.agreementDetail=(id,tab)=>{
    _origAgreementDetail(id,tab);
    // If we need to patch the tab list to add report tab and render it
    if(!tab||tab==='overview'){return}
    if(tab==='report'){
        const a=XDB.get('agreements').find(x=>x.id===id);if(!a)return;
        const el=document.getElementById('content-area');
        App.currentPage='agreements';
        document.getElementById('page-title').textContent='Agreement Detail';
        const pr=XDB.get('programs').find(p=>p.id===a.program_id);
        const members=XDB.get('committee_members').filter(m=>m.agreement_id===id);
        const letters=XDB.get('agreement_letters').filter(l=>l.agreement_id===id);
        el.innerHTML=`
        <div class="back-link no-print" onclick="PG.agreements(document.getElementById('content-area'))"><i class="fas fa-arrow-left"></i> Back to Agreements</div>
        <div class="detail-header mb-3">
            <div class="agr-id"><i class="fas fa-file-contract me-1"></i>Agreement Document</div>
            <h3>${a.agreement_id}</h3>
            <div class="sub-info">${a.communitee_name} &nbsp;·&nbsp; Ward ${a.wada_no} &nbsp;·&nbsp; Date: ${a.agreement_date}</div>
        </div>
        <div class="detail-tabs no-print">
            <div class="detail-tab" onclick="PG.agreementDetail(${id},'overview')"><i class="fas fa-info-circle me-1"></i>Overview</div>
            <div class="detail-tab" onclick="PG.agreementDetail(${id},'members')"><i class="fas fa-users me-1"></i>Committee <span class="badge-blue ms-1">${members.length}</span></div>
            <div class="detail-tab" onclick="PG.agreementDetail(${id},'letters')"><i class="fas fa-envelope me-1"></i>Letters <span class="badge-blue ms-1">${letters.length}</span></div>
            <div class="detail-tab" onclick="PG.agreementDetail(${id},'budget')"><i class="fas fa-calculator me-1"></i>Budget Details</div>
            <div class="detail-tab" onclick="PG.agreementDetail(${id},'financial')"><i class="fas fa-money-bill-wave me-1"></i>Expenses</div>
            <div class="detail-tab active" onclick="PG.agreementDetail(${id},'report')"><i class="fas fa-hard-hat me-1"></i>Work Report</div>
        </div>
        <div id="detail-tab-content"></div>`;
        PG._detailAgrReport(id);
    }
};

/* ===== PATCH agreementDetail tabs to include Work Report tab ===== */
// Override to inject Work Report tab into header
const _origDetailOverview=PG._detailOverview.bind(PG);
// Patch _origAgreementDetail to inject the report tab in detail-tabs
// We do this by patching the HTML after render for non-report tabs
const _patchDetailTabs=(id,tab)=>{
    const tabsEl=document.querySelector('.detail-tabs');
    if(!tabsEl)return;
    // Check if Work Report tab exists
    if(!tabsEl.innerHTML.includes('Work Report')){
        tabsEl.innerHTML+=`<div class="detail-tab${tab==='report'?' active':''}" onclick="PG.agreementDetail(${id},'report')"><i class="fas fa-hard-hat me-1"></i>Work Report</div>`;
    }
};
// Override agreementDetail to patch tabs
const _orig2AgreementDetail=PG.agreementDetail.bind(PG);
PG.agreementDetail=(id,tab)=>{
    _orig2AgreementDetail(id,tab);
    if(tab!=='report')setTimeout(()=>_patchDetailTabs(id,tab),0);
};

/* ===== SESSION PERSISTENCE via IndexedDB ===== */
const SessionDB={
    _db:null,
    async open(){
        return new Promise((res,rej)=>{
            const r=indexedDB.open('pms_session_db',1);
            r.onupgradeneeded=e=>{e.target.result.createObjectStore('handles',{keyPath:'key'})};
            r.onsuccess=e=>{this._db=e.target.result;res()};
            r.onerror=()=>rej();
        });
    },
    async saveHandle(fh){
        if(!this._db)await this.open();
        return new Promise(res=>{
            const tx=this._db.transaction('handles','readwrite');
            tx.objectStore('handles').put({key:'fh',handle:fh});
            tx.oncomplete=()=>res();tx.onerror=()=>res();
        });
    },
    async loadHandle(){
        if(!this._db)await this.open();
        return new Promise(res=>{
            const tx=this._db.transaction('handles','readonly');
            const req=tx.objectStore('handles').get('fh');
            req.onsuccess=()=>res(req.result?.handle||null);
            req.onerror=()=>res(null);
        });
    },
    async clear(){
        if(!this._db)return;
        const tx=this._db.transaction('handles','readwrite');
        tx.objectStore('handles').delete('fh');
    }
};

/* ===== INIT — Session Restore with IndexedDB ===== */
App.init=function(){
    setInterval(()=>{
        const se=document.getElementById('session-timer');
        if(se&&App.user){
            const sess=sessionStorage.getItem('pms_session');
            if(sess){try{const s=JSON.parse(sess);const mins=Math.floor((Date.now()-s.loginTime)/60000);const stxt=document.getElementById('st-text');if(stxt)stxt.textContent=App.user.name+' · '+mins+'m';}catch(e){}}
        }
    },30000);

    // Try IndexedDB session restore
    (async()=>{
        try{
            await SessionDB.open();
            const savedFH=await SessionDB.loadHandle();
            const sess=sessionStorage.getItem('pms_session');
            if(savedFH&&sess){
                // Verify permission
                let perm=await savedFH.queryPermission({mode:'readwrite'});
                if(perm==='prompt'){perm=await savedFH.requestPermission({mode:'readwrite'});}
                if(perm==='granted'){
                    XDB.fh=savedFH;
                    XDB.fileName=savedFH.name;
                    await XDB._read();
                    XDB._ensureTables();
                    // Restore user
                    try{
                        const s=JSON.parse(sess);
                        const u=XDB.get('users').find(x=>x.id===s.userId);
                        if(u){
                            App.user=u;
                            App.showApp();
                            toast('Session restored: '+u.name,'info');
                            return;
                        }
                    }catch(e){}
                }
            }
        }catch(e){}
        // No session - show setup page normally
    })();
};

// Patch XDB to save file handle to IndexedDB after opening
const _origCreateNew=XDB.createNew.bind(XDB);
XDB.createNew=async function(){
    await _origCreateNew();
    if(this.fh)SessionDB.saveHandle(this.fh).catch(()=>{});
};
const _origPickNative=XDB._pickNative.bind(XDB);
XDB._pickNative=async function(){
    await _origPickNative();
    if(this.fh)SessionDB.saveHandle(this.fh).catch(()=>{});
};
const _origLogout=App.logout.bind(App);
App.logout=function(){
    sessionStorage.removeItem('pms_session');
    SessionDB.clear().catch(()=>{});
    _origLogout();
};
App.init();