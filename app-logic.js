(function(){
  'use strict';

  // Local storage keys (scoped for ver2)
  var STORAGE_KEY = 'smart-expense-tracker:v2:data';

  var DEFAULT_CATEGORIES = [
    { id: 'salary', label: 'Salary', type: 'income' },
    { id: 'freelance', label: 'Freelance', type: 'income' },
    { id: 'gift', label: 'Gift', type: 'income' },
    { id: 'food', label: 'Food', type: 'expense' },
    { id: 'transport', label: 'Transport', type: 'expense' },
    { id: 'shopping', label: 'Shopping', type: 'expense' },
    { id: 'bills', label: 'Bills', type: 'expense' },
    { id: 'entertainment', label: 'Entertainment', type: 'expense' },
    { id: 'health', label: 'Health', type: 'expense' }
  ];

  var state = loadState();

  function loadState(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return { transactions: [], budgets: {}, categories: DEFAULT_CATEGORIES };
      var parsed = JSON.parse(raw);
      parsed.categories = Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : DEFAULT_CATEGORIES;
      parsed.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      parsed.budgets = parsed.budgets || {};
      return parsed;
    }catch(e){
      return { transactions: [], budgets: {}, categories: DEFAULT_CATEGORIES };
    }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // Utils
  var qs = function(sel, el){ return (el||document).querySelector(sel); };
  var qsa = function(sel, el){ return Array.from((el||document).querySelectorAll(sel)); };
  var todayStr = function(){ return new Date().toISOString().slice(0,10); };
  var byDateDesc = function(a,b){ return a.date > b.date ? -1 : a.date < b.date ? 1 : 0; };
  var uuid = function(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); };
  var formatCurrency = function(n){ return '₹'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2}); };
  function escapeHtml(str){ return String(str).replace(/[&<>"]+/g,function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]); }); }

  // Elements
  var el = {
    form: qs('#txForm'),
    txType: qs('#txType'),
    txCategory: qs('#txCategory'),
    txAmount: qs('#txAmount'),
    txDate: qs('#txDate'),
    txNote: qs('#txNote'),
    txList: qs('#txList'),
    sortBy: qs('#sortBy'),
    filterFrom: qs('#filterFrom'),
    filterTo: qs('#filterTo'),
    filterCategory: qs('#filterCategory'),
    filterType: qs('#filterType'),
    filterSearch: qs('#filterSearch'),
    clearFilters: qs('#clearFilters'),
    exportCsv: qs('#exportCsv'),
    importCsv: qs('#importCsv'),
    budgetForm: qs('#budgetForm'),
    budgetCategory: qs('#budgetCategory'),
    budgetAmount: qs('#budgetAmount'),
    budgetList: qs('#budgetList'),
    summary: {
      balance: qs('#summary-balance'),
      income: qs('#summary-income'),
      expense: qs('#summary-expense'),
      budgetFill: qs('#summary-budget-fill'),
      budgetPercent: qs('#summary-budget-percent')
    }
  };

  if(el.txDate) el.txDate.value = todayStr();

  function populateCategorySelects(){
    function optionsForType(type){
      return state.categories.filter(function(c){ return c.type===type; }).map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join('');
    }
    if(el.txCategory){ el.txCategory.innerHTML = optionsForType(el.txType.value); }
    if(el.filterCategory){ el.filterCategory.innerHTML = '<option value="all" selected>All</option>' + state.categories.map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join(''); }
    if(el.budgetCategory){ el.budgetCategory.innerHTML = state.categories.filter(function(c){return c.type==='expense';}).map(function(c){ return '<option value="'+c.id+'">'+c.label+'</option>'; }).join(''); }
  }
  if(el.txType){ el.txType.addEventListener('change', populateCategorySelects); }
  populateCategorySelects();

  // Add transaction
  if(el.form){
    el.form.addEventListener('submit', function(e){
      e.preventDefault();
      var amount = Number(el.txAmount.value);
      if(!el.txCategory.value || !amount || amount<=0) return;
      state.transactions.push({ id: uuid(), type: el.txType.value, category: el.txCategory.value, amount: amount, date: el.txDate.value || todayStr(), note: (el.txNote.value||'').trim() });
      saveState();
      el.form.reset();
      el.txDate.value = todayStr();
      populateCategorySelects();
      initAppPage();
    });
  }

  // Row actions
  if(el.txList){
    el.txList.addEventListener('click', function(e){
      var target = e.target.closest('[data-action]');
      if(!target) return;
      var id = target.getAttribute('data-id');
      var action = target.getAttribute('data-action');
      var idx = state.transactions.findIndex(function(t){ return t.id===id; });
      if(idx===-1) return;
      if(action==='delete'){
        state.transactions.splice(idx,1); saveState(); initAppPage();
      }
      if(action==='edit'){
        var tx = state.transactions[idx];
        if(el.txType) el.txType.value = tx.type;
        populateCategorySelects();
        if(el.txCategory) el.txCategory.value = tx.category;
        if(el.txAmount) el.txAmount.value = String(tx.amount);
        if(el.txDate) el.txDate.value = tx.date;
        if(el.txNote) el.txNote.value = tx.note;
        state.transactions.splice(idx,1); saveState(); initAppPage();
      }
    });
  }

  // Filters
  [el.filterFrom, el.filterTo, el.filterCategory, el.filterType, el.filterSearch, el.sortBy].forEach(function(ctrl){
    if(!ctrl) return;
    ctrl.addEventListener('input', renderTransactions);
    ctrl.addEventListener('change', renderTransactions);
  });
  if(el.clearFilters){ el.clearFilters.addEventListener('click', function(){
    if(el.filterFrom) el.filterFrom.value = '';
    if(el.filterTo) el.filterTo.value = '';
    if(el.filterCategory) el.filterCategory.value = 'all';
    if(el.filterType) el.filterType.value = 'all';
    if(el.filterSearch) el.filterSearch.value = '';
    renderTransactions();
  }); }

  function applyFilters(list){
    var from = el.filterFrom && el.filterFrom.value || '';
    var to = el.filterTo && el.filterTo.value || '';
    var cat = el.filterCategory && el.filterCategory.value || 'all';
    var type = el.filterType && el.filterType.value || 'all';
    var q = (el.filterSearch && el.filterSearch.value || '').trim().toLowerCase();
    var out = list.slice();
    if(from) out = out.filter(function(t){ return t.date >= from; });
    if(to) out = out.filter(function(t){ return t.date <= to; });
    if(cat!=='all') out = out.filter(function(t){ return t.category===cat; });
    if(type!=='all') out = out.filter(function(t){ return t.type===type; });
    if(q) out = out.filter(function(t){ return (t.note||'').toLowerCase().includes(q); });
    var sort = el.sortBy && el.sortBy.value || 'date_desc';
    if(sort==='date_asc') out.sort(function(a,b){ return a.date.localeCompare(b.date); });
    else if(sort==='amount_desc') out.sort(function(a,b){ return b.amount - a.amount; });
    else if(sort==='amount_asc') out.sort(function(a,b){ return a.amount - b.amount; });
    else out.sort(byDateDesc);
    return out;
  }

  // CSV (robust quoting and commas)
  if(el.exportCsv){ el.exportCsv.addEventListener('click', function(){
    var headers = ['id','type','category','amount','date','note'];
    var rows = state.transactions.map(function(t){
      return headers.map(function(h){
        var cell = String((t[h]==null?'':t[h])).replaceAll('"','""');
        return '"'+cell+'"';
      }).join(',');
    });
    var csv = [headers.join(',')].concat(rows).join('\n');
    var blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download='transactions.csv'; a.click(); URL.revokeObjectURL(url);
  }); }
  function parseCsv(text){
    if(text && text.charCodeAt(0)===0xFEFF) text = text.slice(1);
    var rows = [], row = [], cur = '';
    var inQuotes = false;
    for(var i=0;i<text.length;i++){
      var ch = text[i];
      if(inQuotes){
        if(ch==='"'){
          if(text[i+1]==='"'){ cur+='"'; i++; }
          else { inQuotes=false; }
        } else { cur+=ch; }
      } else {
        if(ch==='"'){ inQuotes=true; }
        else if(ch===','){ row.push(cur); cur=''; }
        else if(ch==='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
        else if(ch==='\r'){ }
        else { cur+=ch; }
      }
    }
    if(cur.length>0 || row.length){ row.push(cur); rows.push(row); }
    return rows;
  }
  if(el.importCsv){ el.importCsv.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    file.text().then(function(text){
      var rows = parseCsv(text).filter(function(r){ return r.length && r.join('').trim().length; });
      if(!rows.length) { e.target.value=''; return; }
      var headers = rows.shift().map(function(h){ return (h||'').trim().toLowerCase(); });
      var idx = {}; headers.forEach(function(h,i){ idx[h]=i; });
      rows.forEach(function(cols){
        function col(name){ var i = idx[name]; return (i==null)?'':(cols[i]||''); }
        var typeVal = (col('type')||'').toLowerCase()==='income' ? 'income' : 'expense';
        var amountVal = Number(col('amount')||0);
        var dateVal = col('date')||todayStr();
        if(!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) dateVal = todayStr();
        var tx = {
          id: col('id') || uuid(),
          type: typeVal,
          category: col('category') || 'shopping',
          amount: amountVal,
          date: dateVal,
          note: col('note') || ''
        };
        if(tx.amount>0) state.transactions.push(tx);
      });
      saveState(); initAppPage(); e.target.value='';
    });
  }); }

  // Render
  function renderSummary(){
    if(!el.summary.income || !el.summary.expense || !el.summary.balance) return;
    var totals = state.transactions.reduce(function(acc,t){ if(t.type==='income') acc.income+=t.amount; else acc.expense+=t.amount; return acc; }, {income:0,expense:0});
    var balance = totals.income - totals.expense;
    el.summary.income.textContent = formatCurrency(totals.income);
    el.summary.expense.textContent = formatCurrency(totals.expense);
    el.summary.balance.textContent = formatCurrency(balance);
    var month = new Date().toISOString().slice(0,7);
    var monthExp = state.transactions.filter(function(t){ return t.type==='expense' && t.date.startsWith(month); });
    var spentTotal = Object.values(groupByCategory(monthExp)).reduce(function(a,b){ return a+b; },0) || 0;
    var budgetTotal = Object.values(state.budgets).reduce(function(a,b){ return a+b; },0) || 0;
    var pct = budgetTotal>0 ? Math.min(100, Math.round((spentTotal/budgetTotal)*100)) : 0;
    if(el.summary.budgetFill) el.summary.budgetFill.style.width = pct+'%';
    if(el.summary.budgetPercent) el.summary.budgetPercent.textContent = pct+'%';
  }

  function renderTransactions(){
    if(!el.txList) return;
    var list = applyFilters(state.transactions);
    el.txList.innerHTML = list.map(renderTxItem).join('');
  }
  function renderTxItem(tx){
    var catLabel = (state.categories.find(function(c){return c.id===tx.category;})||{}).label || tx.category;
    return (
      '<li class="tx-item">'+
        '<div>'+
          '<div class="tx-note">'+escapeHtml(tx.note||catLabel)+'</div>'+
          '<div class="tx-meta">'+escapeHtml(catLabel)+' • '+escapeHtml(tx.date)+'</div>'+
        '</div>'+
        '<div class="tx-amount '+tx.type+'">'+formatCurrency(tx.amount)+'</div>'+
        '<div class="tx-meta">'+(tx.type==='income'?'Income':'Expense')+'</div>'+
        '<div class="row-actions">'+
          '<button class="icon-btn" data-action="edit" data-id="'+tx.id+'" title="Edit">✏️</button>'+
          '<button class="icon-btn" data-action="delete" data-id="'+tx.id+'" title="Delete">🗑️</button>'+
        '</div>'+
      '</li>'
    );
  }

  function renderBudgets(){
    if(!el.budgetList) return;
    var month = new Date().toISOString().slice(0,7);
    var monthExpenses = state.transactions.filter(function(t){ return t.type==='expense' && t.date.startsWith(month); });
    var spentByCat = groupByCategory(monthExpenses);
    el.budgetList.innerHTML = Object.keys(state.budgets).map(function(cat){
      var amount = state.budgets[cat]||0;
      var spent = spentByCat[cat]||0;
      var pct = amount>0 ? Math.min(100, Math.round((spent/amount)*100)) : 0;
      var label = (state.categories.find(function(c){return c.id===cat;})||{}).label || cat;
      return (
        '<li class="budget-item">'+
          '<div>'+
            '<div style="font-weight:700">'+escapeHtml(label)+'</div>'+
            '<div class="muted">'+formatCurrency(spent)+' / '+formatCurrency(amount)+'</div>'+
          '</div>'+
          '<div style="min-width:240px;">'+
            '<div class="budget-bar"><div class="budget-fill" style="width:'+pct+'%"></div></div>'+
          '</div>'+
        '</li>'
      );
    }).join('');
  }

  function groupByCategory(list){
    return list.reduce(function(acc,t){ acc[t.category]=(acc[t.category]||0)+t.amount; return acc; },{});
  }

  // Charts
  var categoryChart, flowChart, analyticsLineChart, overviewPieChart;
  function getTextColor(){ return '#e6eefb'; }
  function gradientColors(n){
    var base=['#77e3ff','#00d4ff','#66ffe7','#2fd27a','#ff977a','#ff6b6b','#c77dff','#ffd166','#06d6a0'];
    return Array.from({length:n}, function(_,i){ return base[i%base.length]; });
  }
  function aggregateByMonth(list){
    return list.reduce(function(acc,t){ var key=t.date.slice(0,7); acc[key]=acc[key]||{income:0,expense:0}; acc[key][t.type]+=t.amount; return acc; },{});
  }

  function renderCategoryAndFlow(){
    var ctx1 = document.getElementById('categoryChart');
    var ctx2 = document.getElementById('flowChart');
    if(ctx1){
      var expenses = state.transactions.filter(function(t){return t.type==='expense';});
      var byCatObj = groupByCategory(expenses);
      var labels = Object.keys(byCatObj).map(function(id){ var c=state.categories.find(function(x){return x.id===id;}); return c?c.label:id; });
      var data = Object.values(byCatObj);
      if(categoryChart) categoryChart.destroy();
      categoryChart = new Chart(ctx1, { type:'doughnut', data:{ labels: labels, datasets:[{ data: data, backgroundColor: gradientColors(labels.length), borderWidth:0 }] }, options:{ plugins:{ legend:{ labels:{ color:getTextColor() } } } } });
    }
    if(ctx2){
      var byMonth = aggregateByMonth(state.transactions);
      var months = Object.keys(byMonth).sort();
      var incomes = months.map(function(m){ return byMonth[m].income; });
      var expensesSeries = months.map(function(m){ return byMonth[m].expense; });
      if(flowChart) flowChart.destroy();
      flowChart = new Chart(ctx2, { type:'line', data:{ labels: months, datasets:[
        { label:'Income', data: incomes, borderColor:'#2fd27a', backgroundColor:'rgba(47,210,122,0.2)', tension:0.35, fill:true },
        { label:'Expense', data: expensesSeries, borderColor:'#ff6b6b', backgroundColor:'rgba(255,107,107,0.2)', tension:0.35, fill:true }
      ] }, options:{ plugins:{ legend:{ labels:{ color:getTextColor() } } }, scales:{ x:{ ticks:{ color:getTextColor() } }, y:{ ticks:{ color:getTextColor() } } } } });
    }
  }

  function renderAnalytics(){
    var ctx = document.getElementById('analyticsLine');
    if(!ctx) return;
    var byMonth = aggregateByMonth(state.transactions);
    var months = Object.keys(byMonth).sort();
    var incomes = months.map(function(m){ return byMonth[m].income; });
    var expensesSeries = months.map(function(m){ return byMonth[m].expense; });
    if(analyticsLineChart) analyticsLineChart.destroy();
    analyticsLineChart = new Chart(ctx, { type:'line', data:{ labels: months, datasets:[
      { label:'Income', data: incomes, borderColor:'#2fd27a', backgroundColor:'rgba(47,210,122,0.2)', tension:0.35, fill:true },
      { label:'Expense', data: expensesSeries, borderColor:'#ff6b6b', backgroundColor:'rgba(255,107,107,0.2)', tension:0.35, fill:true }
    ] }, options:{ plugins:{ legend:{ labels:{ color:getTextColor() } } }, scales:{ x:{ ticks:{ color:getTextColor() } }, y:{ ticks:{ color:getTextColor() } } } } });
  }

  // Page initializers
  function initAppPage(){
    populateCategorySelects();
    renderSummary();
    renderTransactions();
    renderBudgets();
    renderCategoryAndFlow();
  }
  function initOverviewPage(){
    var totals = state.transactions.reduce(function(acc,t){ if(t.type==='income') acc.income+=t.amount; else acc.expense+=t.amount; return acc; }, {income:0,expense:0});
    var balance = totals.income - totals.expense;
    var elBal = qs('#ov-balance'); if(elBal) elBal.textContent = formatCurrency(balance);
    var last30 = new Date(Date.now() - 29*24*3600*1000).toISOString().slice(0,10);
    var tx30 = state.transactions.filter(function(t){ return t.date>=last30; });
    var inc30 = tx30.filter(function(t){return t.type==='income';}).reduce(function(a,t){return a+t.amount;},0);
    var exp30 = tx30.filter(function(t){return t.type==='expense';}).reduce(function(a,t){return a+t.amount;},0);
    var elInc = qs('#ov-income'); if(elInc) elInc.textContent = formatCurrency(inc30);
    var elExp = qs('#ov-expense'); if(elExp) elExp.textContent = formatCurrency(exp30);
    var month = new Date().toISOString().slice(0,7);
    var monthExp = state.transactions.filter(function(t){ return t.type==='expense' && t.date.startsWith(month); });
    var spentByCat = groupByCategory(monthExp);
    var budgetTotal = Object.values(state.budgets).reduce(function(a,b){return a+b;},0) || 0;
    var spentTotal = Object.values(spentByCat).reduce(function(a,b){return a+b;},0) || 0;
    var pct = budgetTotal>0 ? Math.min(100, Math.round(spentTotal/budgetTotal*100)) : 0;
    var elBar = qs('#ov-budget'); if(elBar) elBar.style.width = pct+'%';
    var elText = qs('#ov-budget-text'); if(elText) elText.textContent = pct+'% of budget';
    var recent = state.transactions.slice().sort(byDateDesc).slice(0,8);
    var ovList = qs('#ov-recent'); if(ovList) ovList.innerHTML = recent.map(renderTxItem).join('');
    var ctx = document.getElementById('ov-pie');
    if(ctx){
      if(overviewPieChart) overviewPieChart.destroy();
      var labels = Object.keys(spentByCat).map(function(id){ var c=state.categories.find(function(x){return x.id===id;}); return c?c.label:id; });
      var data = Object.values(spentByCat);
      overviewPieChart = new Chart(ctx, { type:'doughnut', data:{ labels:labels, datasets:[{ data:data, backgroundColor: gradientColors(labels.length), borderWidth:0 }] }, options:{ plugins:{ legend:{ labels:{ color:getTextColor() } } } } });
    }
  }
  function initAnalyticsPage(){ renderAnalytics(); }

  function boot(){
    var page = (document.body && document.body.getAttribute('data-page')) || '';
    if(page==='app') initAppPage();
    if(page==='overview') initOverviewPage();
    if(page==='analytics') initAnalyticsPage();
  }

  document.addEventListener('DOMContentLoaded', boot);
})();


