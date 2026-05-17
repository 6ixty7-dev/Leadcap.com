// content.js - Google Maps Lead Intelligence Collector Script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape_current') {
    const leads = scrapeLeads();
    sendResponse({ success: true, leads });
  } else if (request.action === 'scroll_and_scrape') {
    scrollAndScrape(request.maxLeads || 50, (progressLeads) => {
      chrome.runtime.sendMessage({ action: 'scrape_progress', leads: progressLeads });
    }).then(finalLeads => {
      chrome.runtime.sendMessage({ action: 'scrape_complete', leads: finalLeads });
    }).catch(err => {
      chrome.runtime.sendMessage({ action: 'scrape_error', error: err.message });
    });
    sendResponse({ success: true, message: 'Scrape started' });
  }
  return true;
});

function scrapeLeads() {
  const leads = [];
  // Google Maps links usually contain /maps/place/
  const cardElements = document.querySelectorAll('a[href*="/maps/place/"]');
  
  cardElements.forEach(card => {
    // Traverse up to find the parent business card block
    let parent = card.parentElement;
    while (parent && !parent.classList.contains('Nv2yCc') && parent.tagName !== 'DIV') {
      parent = parent.parentElement;
    }
    
    const container = parent || card;
    
    // 1. Business Name
    const nameEl = container.querySelector('div.qBF1Pd') || card.querySelector('div.qBF1Pd');
    const name = nameEl ? nameEl.textContent.trim() : '';
    if (!name) return; // Skip if no name
    
    // 2. Rating & Review Count
    let rating = null;
    let reviewCount = null;
    
    const ratingEl = container.querySelector('span.MW4etd');
    if (ratingEl) {
      rating = parseFloat(ratingEl.textContent.trim());
    }
    
    const reviewsEl = container.querySelector('span.UY7F9');
    if (reviewsEl) {
      const text = reviewsEl.textContent.trim().replace(/[()]/g, '');
      reviewCount = parseInt(text.replace(/,/g, ''), 10) || null;
    }
    
    // Fallback using aria-label
    if (!rating) {
      const starsEl = container.querySelector('[aria-label*="stars"]');
      if (starsEl) {
        const label = starsEl.getAttribute('aria-label');
        const matchRating = label.match(/([0-9.]+)\s+stars/);
        const matchReviews = label.match(/([0-9,]+)\s+reviews/);
        if (matchRating) rating = parseFloat(matchRating[1]);
        if (matchReviews) reviewCount = parseInt(matchReviews[1].replace(/,/g, ''), 10);
      }
    }
    
    // 3. Category & Details
    const infoLines = container.querySelectorAll('div.W4Efsd');
    let category = '';
    let address = '';
    let phone = '';
    
    infoLines.forEach(line => {
      const text = line.textContent.trim();
      
      // Category extraction using common patterns
      if (text.includes('·')) {
        const parts = text.split('·').map(p => p.trim());
        const knownCategories = ['restaurant', 'cafe', 'bar', 'gym', 'salon', 'hotel', 'bank', 'store', 'hair', 'fitness', 'service', 'office', 'agency', 'dentist', 'clinic', 'school', 'hospital', 'spa', 'market', 'club'];
        parts.forEach(part => {
          if (knownCategories.some(cat => part.toLowerCase().includes(cat))) {
            category = part;
          }
        });
        
        if (!category && parts.length > 0) {
          category = parts[0];
        }
      }
      
      // Match phone numbers
      const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/);
      if (phoneMatch && !phone) {
        phone = phoneMatch[0];
      }
    });
    
    // Fallback category
    if (!category) {
      const ratingParent = container.querySelector('span.MW4etd')?.parentElement;
      if (ratingParent) {
        const text = ratingParent.textContent.trim();
        const parts = text.split('·');
        if (parts.length > 1) {
          category = parts[1].trim();
        }
      }
    }
    
    // 4. Website
    let website = '';
    const websiteEl = container.querySelector('a[aria-label*="Website"], a[aria-label*="website"], a[data-value="Website"]');
    if (websiteEl) {
      website = websiteEl.getAttribute('href') || '';
    } else {
      const links = container.querySelectorAll('a');
      links.forEach(l => {
        const href = l.getAttribute('href');
        if (href && href.startsWith('http') && !href.includes('google.com')) {
          website = href;
        }
      });
    }
    
    // 5. Address & City
    infoLines.forEach(line => {
      const text = line.textContent.trim();
      if (text.includes(',') && !text.includes('·') && !text.includes('Open') && !text.includes('Closed') && !text.match(/\d{5,}/)) {
        address = text;
      }
    });
    
    leads.push({
      business_name: name,
      phone: phone || null,
      email: null,
      website: website || null,
      instagram: null,
      category: category || null,
      address: address || null,
      rating: rating || null,
      review_count: reviewCount || null,
      city: extractCityFromAddress(address) || null
    });
  });
  
  // Deduplicate
  return Array.from(new Set(leads.map(JSON.stringify))).map(JSON.parse);
}

function extractCityFromAddress(address) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim());
  if (parts.length > 1) {
    // City is usually the second to last part in standard formatted listings
    return parts[parts.length - 2]; 
  }
  return '';
}

async function scrollAndScrape(maxLeads, onProgress) {
  let scrollContainer = document.querySelector('div[role="feed"]');
  
  if (!scrollContainer) {
    const divs = document.querySelectorAll('div');
    for (let div of divs) {
      if (div.scrollHeight > div.clientHeight && (div.className.includes('scroll') || div.className.includes('feed'))) {
        scrollContainer = div;
        break;
      }
    }
  }
  
  if (!scrollContainer) {
    throw new Error('Scrollable list container not found. Make sure you scroll Google Maps results to activate the container.');
  }
  
  let collectedLeads = [];
  let noNewLeadsCount = 0;
  let lastLeadsCount = 0;
  
  while (collectedLeads.length < maxLeads && noNewLeadsCount < 10) {
    const currentLeads = scrapeLeads();
    const existingNames = new Set(collectedLeads.map(l => l.business_name));
    
    currentLeads.forEach(lead => {
      if (!existingNames.has(lead.business_name)) {
        collectedLeads.push(lead);
      }
    });
    
    onProgress(collectedLeads);
    
    if (collectedLeads.length >= maxLeads) break;
    
    if (collectedLeads.length === lastLeadsCount) {
      noNewLeadsCount++;
    } else {
      noNewLeadsCount = 0;
    }
    lastLeadsCount = collectedLeads.length;
    
    // Perform smooth scroll downwards to load lazy components
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    
    // Pause for dynamic loading
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const endText = document.body.textContent.includes("You've reached the end of the list");
    if (endText) break;
  }
  
  return collectedLeads;
}
