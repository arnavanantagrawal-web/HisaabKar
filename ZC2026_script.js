// HisaabKar - Pure Vanilla Restaurant Bill Splitter
(function () {
  'use strict';

  const form = document.getElementById('splitterForm');
  const occasionInput = document.getElementById('occasionInput');
  const currencySelect = document.getElementById('currencySelect');
  const decimalModeSelect = document.getElementById('decimalModeSelect');
  const currencySymbolLabel = document.getElementById('currencySymbolLabel');
  const billPrefix = document.getElementById('billPrefix');
  const billInput = document.getElementById('billInput');
  const peopleInput = document.getElementById('peopleInput');
  const minusBtn = document.getElementById('minusBtn');
  const plusBtn = document.getElementById('plusBtn');
  const billError = document.getElementById('billError');
  const peopleError = document.getElementById('peopleError');
  const generalAlert = document.getElementById('generalAlert');
  const reloadIndicator = document.getElementById('reloadIndicator');
  const clearBtn = document.getElementById('clearBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  const tipButtons = document.querySelectorAll('.tip-btn');
  const activeTipLabel = document.getElementById('activeTipLabel');
  const customTipBtn = document.getElementById('customTipBtn');
  const customTipRow = document.getElementById('customTipRow');
  const customTipInput = document.getElementById('customTipInput');

  const resultsSection = document.getElementById('resultsSection');
  const resultOccasion = document.getElementById('resultOccasion');
  const eachPaysVal = document.getElementById('eachPaysVal');
  const remainderExplanation = document.getElementById('remainderExplanation');
  const proofFormula = document.getElementById('proofFormula');
  const proofTotal = document.getElementById('proofTotal');
  const peopleList = document.getElementById('peopleList');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const resetFormBtn = document.getElementById('resetFormBtn');

  const chips = document.querySelectorAll('.chip');
  const STORAGE_KEY = 'hisaabkar_state_v4';
  const AVATARS = ['🍕', '🍔', '🌮', '🍣', '🍜', '🍛', '🍰', '🥗'];

  let currentSplit = null;
  let paidMap = {};
  let currentTip = 0;
  let isCustom = false;

  function init() {
    loadSavedState();

    form.addEventListener('submit', handleCalculate);
    clearBtn.addEventListener('click', clearAll);
    resetFormBtn.addEventListener('click', clearAll);
    copySummaryBtn.addEventListener('click', copyWhatsAppSummary);
    themeToggleBtn.addEventListener('click', toggleTheme);

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        occasionInput.value = c.getAttribute('data-val');
      });
    });

    minusBtn.addEventListener('click', function () {
      const val = parseInt(peopleInput.value, 10) || 1;
      if (val > 1) peopleInput.value = val - 1;
    });

    plusBtn.addEventListener('click', function () {
      const val = parseInt(peopleInput.value, 10) || 0;
      peopleInput.value = val + 1;
    });

    // Tip buttons
    tipButtons.forEach(function (btn) {
      if (btn.id === 'customTipBtn') return;
      btn.addEventListener('click', function () {
        tipButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        customTipRow.classList.add('hidden');
        isCustom = false;
        currentTip = parseInt(btn.getAttribute('data-tip'), 10);
        activeTipLabel.textContent = currentTip + '%';
      });
    });

    customTipBtn.addEventListener('click', function () {
      tipButtons.forEach(b => b.classList.remove('active'));
      customTipBtn.classList.add('active');
      customTipRow.classList.remove('hidden');
      isCustom = true;
      customTipInput.focus();
    });

    customTipInput.addEventListener('input', function () {
      const val = parseFloat(customTipInput.value) || 0;
      currentTip = val;
      activeTipLabel.textContent = val + '%';
    });

    currencySelect.addEventListener('change', function () {
      const selected = currencySelect.options[currencySelect.selectedIndex];
      const sym = selected.value;
      const defDec = selected.getAttribute('data-decimals');
      currencySymbolLabel.textContent = sym;
      billPrefix.textContent = sym;
      decimalModeSelect.value = defDec;
    });

    billInput.addEventListener('input', () => hideError(billError));
    peopleInput.addEventListener('input', () => hideError(peopleError));
  }

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
    themeText.textContent = next === 'dark' ? 'Light' : 'Dark';
    saveState();
  }

  function showError(el, message) {
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function hideError(el) {
    el.textContent = '';
    el.classList.add('hidden');
  }

  function validate(billVal, peopleVal) {
    let isValid = true;
    hideError(billError);
    hideError(peopleError);
    hideError(generalAlert);

    const trimmedBill = billVal.trim();
    const trimmedPeople = peopleVal.trim();
    const errors = [];

    // Bill Validation
    if (trimmedBill === '') {
      const msg = 'Bill amount cannot be empty. Please enter your restaurant bill amount.';
      showError(billError, msg);
      errors.push(msg);
      isValid = false;
    } else {
      const billNum = Number(trimmedBill);
      if (isNaN(billNum)) {
        const msg = 'Bill amount must be a valid number.';
        showError(billError, msg);
        errors.push(msg);
        isValid = false;
      } else if (billNum === 0) {
        const msg = 'Bill amount cannot be zero (0). Must be greater than 0.';
        showError(billError, msg);
        errors.push(msg);
        isValid = false;
      } else if (billNum < 0) {
        const msg = 'Bill amount cannot be negative. Please enter a positive amount.';
        showError(billError, msg);
        errors.push(msg);
        isValid = false;
      }
    }

    // People Validation
    if (trimmedPeople === '') {
      const msg = 'Number of friends cannot be empty. Enter how many are splitting.';
      showError(peopleError, msg);
      errors.push(msg);
      isValid = false;
    } else {
      const peopleNum = Number(trimmedPeople);
      if (isNaN(peopleNum)) {
        const msg = 'Number of people must be a valid number.';
        showError(peopleError, msg);
        errors.push(msg);
        isValid = false;
      } else if (peopleNum === 0) {
        const msg = 'Number of people cannot be zero (0). Minimum is 1 person.';
        showError(peopleError, msg);
        errors.push(msg);
        isValid = false;
      } else if (peopleNum < 0) {
        const msg = 'Number of people cannot be negative. Must be 1 or more friends.';
        showError(peopleError, msg);
        errors.push(msg);
        isValid = false;
      } else if (!Number.isInteger(peopleNum)) {
        const msg = 'Number of people must be a whole integer.';
        showError(peopleError, msg);
        errors.push(msg);
        isValid = false;
      }
    }

    if (!isValid) {
      showError(generalAlert, errors.join(' • '));
    }

    return isValid;
  }

  function calculateExactSplit(occasion, bill, people, symbol, decimals, tip) {
    const rawBill = bill * (1 + tip / 100);
    const finalBill = decimals === 0 ? Math.round(rawBill) : +(rawBill.toFixed(2));
    const multiplier = decimals === 0 ? 1 : 100;
    const totalUnits = Math.round(finalBill * multiplier);
    const baseUnits = Math.floor(totalUnits / people);
    const remainderUnits = totalUnits % people;

    const shares = [];
    let runningSumUnits = 0;

    for (let i = 0; i < people; i++) {
      const hasExtra = i < remainderUnits;
      const units = baseUnits + (hasExtra ? 1 : 0);
      runningSumUnits += units;
      const val = units / multiplier;
      shares.push({
        id: i + 1,
        name: 'Friend ' + (i + 1),
        avatar: AVATARS[i % AVATARS.length],
        formatted: decimals === 0 ? String(units) : val.toFixed(2),
        hasExtra: hasExtra
      });
    }

    const totalSum = runningSumUnits / multiplier;
    const totalSumStr = decimals === 0 ? String(totalSum) : totalSum.toFixed(2);

    let formulaStr = '';
    if (shares.length <= 6) {
      formulaStr = shares.map(s => symbol + s.formatted).join(' + ') + ' = ' + symbol + totalSumStr;
    } else {
      const highVal = (baseUnits + 1) / multiplier;
      const lowVal = baseUnits / multiplier;
      const highStr = decimals === 0 ? String(highVal) : highVal.toFixed(2);
      const lowStr = decimals === 0 ? String(lowVal) : lowVal.toFixed(2);

      formulaStr = (remainderUnits > 0)
        ? '(' + remainderUnits + ' × ' + symbol + highStr + ') + (' + (people - remainderUnits) + ' × ' + symbol + lowStr + ') = ' + symbol + totalSumStr
        : people + ' × ' + symbol + lowStr + ' = ' + symbol + totalSumStr;
    }

    return {
      occasion: occasion.trim() || 'Dinner with Squad',
      bill: finalBill,
      rawBill: bill,
      tip: tip,
      people: people,
      symbol: symbol,
      decimals: decimals,
      shares: shares,
      baseFormatted: decimals === 0 ? String(baseUnits) : (baseUnits / 100).toFixed(2),
      remainderUnits: remainderUnits,
      totalSumStr: totalSumStr,
      formulaStr: formulaStr
    };
  }

  function renderResults(split) {
    currentSplit = split;
    resultOccasion.textContent = '🍽️ ' + split.occasion;
    eachPaysVal.textContent = split.symbol + split.baseFormatted;

    if (split.remainderUnits > 0) {
      const unitName = split.decimals === 0 ? (split.symbol === '₹' ? 'Rupee' : 'unit') : 'cent';
      remainderExplanation.textContent =
        split.remainderUnits + ' friend(s) contribute ' + split.symbol +
        (split.decimals === 0 ? (parseInt(split.baseFormatted, 10) + 1) : (parseFloat(split.baseFormatted) + 0.01).toFixed(2)) +
        ' (+1 ' + unitName + ') so the total bill of ' + split.symbol + split.totalSumStr + ' is settled with 0 discrepancy!';
    } else {
      remainderExplanation.textContent = 'Evenly split across all ' + split.people + ' friends with zero remainder.';
    }

    proofFormula.textContent = split.formulaStr;
    proofTotal.textContent = split.symbol + split.totalSumStr;

    peopleList.innerHTML = '';
    split.shares.forEach(function (person) {
      const card = document.createElement('div');
      card.className = 'person-card' + (paidMap[person.id] ? ' paid' : '');
      const roleText = person.hasExtra ? '+1 remainder' : 'Base share';

      card.innerHTML =
        '<div class="person-left">' +
          '<input type="checkbox" ' + (paidMap[person.id] ? 'checked' : '') + ' class="person-checkbox" data-id="' + person.id + '" />' +
          '<span>' + person.avatar + '</span>' +
          '<div class="person-info">' +
            '<div class="name">' + person.name + '</div>' +
            '<div class="role">' + roleText + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="person-amount">' + split.symbol + person.formatted + '</div>';

      const cb = card.querySelector('.person-checkbox');
      cb.addEventListener('change', function () {
        paidMap[person.id] = cb.checked;
        if (cb.checked) {
          card.classList.add('paid');
        } else {
          card.classList.remove('paid');
        }
        saveState();
      });

      peopleList.appendChild(card);
    });

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleCalculate(e) {
    e.preventDefault();

    const billVal = billInput.value;
    const peopleVal = peopleInput.value;
    const occasionVal = occasionInput.value;
    const symbol = currencySelect.value;
    const decimals = parseInt(decimalModeSelect.value, 10);

    if (!validate(billVal, peopleVal)) {
      resultsSection.classList.add('hidden');
      return;
    }

    const bill = parseFloat(billVal);
    const people = parseInt(peopleVal, 10);

    const split = calculateExactSplit(occasionVal, bill, people, symbol, decimals, currentTip);
    renderResults(split);
    saveState();
  }

  function saveState() {
    try {
      const html = document.documentElement;
      const data = {
        theme: html.getAttribute('data-theme') || 'dark',
        occasion: occasionInput.value,
        currency: currencySelect.value,
        decimals: decimalModeSelect.value,
        bill: billInput.value,
        people: peopleInput.value,
        tip: currentTip,
        paidMap: paidMap,
        hasResults: !resultsSection.classList.contains('hidden')
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      reloadIndicator.classList.remove('hidden');
    } catch (e) {}
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
        themeIcon.textContent = data.theme === 'dark' ? '☀️' : '🌙';
        themeText.textContent = data.theme === 'dark' ? 'Light' : 'Dark';
      }
      if (data.occasion) occasionInput.value = data.occasion;
      if (data.currency) {
        currencySelect.value = data.currency;
        currencySymbolLabel.textContent = data.currency;
        billPrefix.textContent = data.currency;
      }
      if (data.decimals !== undefined) decimalModeSelect.value = data.decimals;
      if (data.bill) billInput.value = data.bill;
      if (data.people) peopleInput.value = data.people;
      if (data.tip !== undefined) {
        currentTip = data.tip;
        activeTipLabel.textContent = data.tip + '%';
      }
      if (data.paidMap) paidMap = data.paidMap;

      if (data.bill && data.people && data.hasResults) {
        if (validate(data.bill, data.people)) {
          const split = calculateExactSplit(
            data.occasion || '',
            parseFloat(data.bill),
            parseInt(data.people, 10),
            currencySelect.value,
            parseInt(decimalModeSelect.value, 10),
            currentTip
          );
          renderResults(split);
          reloadIndicator.classList.remove('hidden');
        }
      }
    } catch (e) {}
  }

  function clearAll() {
    occasionInput.value = '';
    billInput.value = '';
    peopleInput.value = '';
    paidMap = {};
    currentTip = 0;
    activeTipLabel.textContent = '0%';
    hideError(billError);
    hideError(peopleError);
    hideError(generalAlert);
    resultsSection.classList.add('hidden');
    reloadIndicator.classList.add('hidden');
    currentSplit = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function copyWhatsAppSummary() {
    if (!currentSplit) return;
    let text = '🍽️ *' + currentSplit.occasion + '* - Hisaab\n';
    text += '💵 Food Bill: ' + currentSplit.symbol + currentSplit.rawBill.toFixed(currentSplit.decimals) + '\n';
    if (currentSplit.tip > 0) text += '✨ Tip: +' + currentSplit.tip + '%\n';
    text += '💰 Total to Settle: ' + currentSplit.symbol + currentSplit.totalSumStr + '\n';
    text += '👥 Friends (' + currentSplit.people + '):\n';
    currentSplit.shares.forEach(function (s) {
      const status = paidMap[s.id] ? '✅ (Paid)' : '⏳ (Pending)';
      text += '• ' + s.avatar + ' ' + s.name + ': ' + currentSplit.symbol + s.formatted + ' ' + status + '\n';
    });
    text += '✅ Exact Check: ' + currentSplit.symbol + currentSplit.totalSumStr + ' (No rounding loss)';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        alert('Copied Hisaab settlement summary to clipboard!');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
