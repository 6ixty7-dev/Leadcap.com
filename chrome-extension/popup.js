// popup.js - Controller for Lead Intelligence OS Collector Popup

const BACKEND_URL = 'http://localhost:3001/api';
let collectedLeads = [];
let isScraping = false;

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const tabWarning = document.getElementById('tab-warning');
  const leadsCount = document.getElementById('leads-count');
  const listPreview = document.getElementById('list-preview');
  const actionsPanel = document.getElementById('actions-panel');
  const btnCollect = document.getElementById('btn-collect');
  const btnScrapeCurrent = document.getElementById('btn-scrape-current');
  const btnImport = document.getElementById('btn-import');
  const maxLeadsInput = document.getElementById('max-leads');
  const successContainer = document.getElementById('success-container');
  const statusDisplay = document.getElementById('status-display');

  // 1. Check Backend Connectivity
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();
    if (data.success) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'CRM Connected';
    } else {
      statusDot.className = 'status-dot';
      statusText.textContent = 'CRM Offline';
    }
  } catch (err) {
    statusDot.className = 'status-dot';
    statusText.textContent = 'CRM Offline';
  }

  // 2. Validate active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isGoogleMaps = tab && (tab.url.includes('google.com/maps') || tab.url.includes('google.co.in/maps'));

  if (!isGoogleMaps) {
    tabWarning.style.display = 'block';
    btnCollect.disabled = true;
    btnScrapeCurrent.disabled = true;
    maxLeadsInput.disabled = true;
  }

  // 3. One-Click Visible Scrape
  btnScrapeCurrent.addEventListener('click', async () => {
    if (!tab) return;
    btnScrapeCurrent.disabled = true;
    btnScrapeCurrent.innerHTML = '<span class="spinner"></span> <span>Scraping...</span>';
    
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape_current' });
      if (response && response.success) {
        collectedLeads = response.leads;
        updateUI();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to communicate with the page. Please reload Google Maps and try again.');
    } finally {
      btnScrapeCurrent.disabled = false;
      btnScrapeCurrent.textContent = 'Scrape Visible Cards';
    }
  });

  // 4. Collect & Scroll Loop
  btnCollect.addEventListener('click', async () => {
    if (!tab || isScraping) return;
    
    isScraping = true;
    collectedLeads = [];
    updateUI();
    
    const maxLeads = parseInt(maxLeadsInput.value, 10) || 50;
    
    btnCollect.disabled = true;
    btnScrapeCurrent.disabled = true;
    btnImport.style.display = 'none';
    successContainer.style.display = 'none';
    btnCollect.innerHTML = '<span class="spinner"></span> <span>Scrolling & Scanning...</span>';
    statusDisplay.textContent = 'Active Scanning Status';

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'scroll_and_scrape', maxLeads });
    } catch (err) {
      console.error(err);
      alert('Could not start scroll scan. Make sure Google Maps is fully loaded.');
      resetScrapingState();
    }
  });

  // 5. Direct CRM Import
  btnImport.addEventListener('click', async () => {
    if (collectedLeads.length === 0) return;
    
    btnImport.disabled = true;
    btnImport.innerHTML = '<span class="spinner"></span> <span>Uploading to CRM...</span>';

    try {
      const res = await fetch(`${BACKEND_URL}/import/extension`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: collectedLeads })
      });
      const data = await res.json();
      
      if (data.success) {
        successContainer.style.display = 'block';
        btnImport.style.display = 'none';
        listPreview.style.display = 'none';
        collectedLeads = [];
        leadsCount.textContent = '0';
        statusDisplay.textContent = 'Leads Collected';
      } else {
        alert(`Import failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to Local CRM API. Make sure backend is running on port 3001.');
    } finally {
      btnImport.disabled = false;
      btnImport.textContent = '🚀 Import to Lead CRM';
    }
  });

  // 6. Listen for Progress Updates from Content Script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'scrape_progress') {
      collectedLeads = message.leads;
      leadsCount.textContent = collectedLeads.length;
      renderPreviewList();
    } else if (message.action === 'scrape_complete') {
      collectedLeads = message.leads;
      resetScrapingState();
      updateUI();
    } else if (message.action === 'scrape_error') {
      alert(`Scraping Error: ${message.error}`);
      resetScrapingState();
    }
  });

  function resetScrapingState() {
    isScraping = false;
    btnCollect.disabled = false;
    btnScrapeCurrent.disabled = false;
    btnCollect.textContent = '⚡ Collect & Scroll';
    statusDisplay.textContent = 'Leads Collected';
  }

  function updateUI() {
    leadsCount.textContent = collectedLeads.length;
    renderPreviewList();
    
    if (collectedLeads.length > 0) {
      btnImport.style.display = 'flex';
      listPreview.style.display = 'flex';
    } else {
      btnImport.style.display = 'none';
      listPreview.style.display = 'none';
    }
  }

  function renderPreviewList() {
    listPreview.innerHTML = '';
    if (collectedLeads.length === 0) return;

    collectedLeads.forEach(lead => {
      const item = document.createElement('div');
      item.className = 'lead-item';
      
      const ratingText = lead.rating ? `⭐ ${lead.rating} (${lead.review_count || 0})` : 'No reviews';
      
      item.innerHTML = `
        <div class="lead-item-header">
          <span>${truncate(lead.business_name, 35)}</span>
          <span style="color: var(--indigo); font-weight: 700;">${ratingText}</span>
        </div>
        <div class="lead-item-meta">
          <span>📂 ${lead.category || 'Local Business'}</span>
          <span>📍 ${lead.city || 'Unknown Location'}</span>
        </div>
      `;
      listPreview.appendChild(item);
    });
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }
});
