/**
 * PulseNews Frontend Logic & API Integration
 * Connected to NewsAPI.ai (Event Registry) API
 */

// Configuration
const API_KEY = '74ed4be7-676e-44be-8905-7d1c9c3f1635';
const BASE_URL = 'https://eventregistry.org/api/v1/article/getArticles';

// Default Category Image Fallbacks (Unsplash)
const CATEGORY_IMAGES = {
  'general': 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80&auto=format&fit=crop',
  'news/Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&auto=format&fit=crop',
  'news/Business': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&auto=format&fit=crop',
  'news/Science': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80&auto=format&fit=crop',
  'news/Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80&auto=format&fit=crop',
  'news/Health': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80&auto=format&fit=crop',
  'news/Arts_and_Entertainment': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80&auto=format&fit=crop',
  'news/Politics': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80&auto=format&fit=crop'
};

// Application State
let state = {
  category: 'general',
  search: '',
  sort: 'date',
  page: 1,
  articles: [],
  bookmarks: [],
  theme: 'dark',
  activeArticle: null
};

// DOM Elements Cache
const DOM = {
  logoBtn: document.getElementById('logo-btn'),
  searchInput: document.getElementById('search-input'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  moonIcon: document.getElementById('moon-icon'),
  sunIcon: document.getElementById('sun-icon'),
  bookmarksToggleBtn: document.getElementById('bookmarks-toggle-btn'),
  bookmarkBadge: document.getElementById('bookmark-badge'),
  categoriesList: document.getElementById('categories-list'),
  feedHeading: document.getElementById('feed-heading'),
  sortBySelect: document.getElementById('sort-by-select'),
  feedContainer: document.getElementById('feed-container'),
  loadMoreBtn: document.getElementById('load-more-btn'),
  loadingSkeletons: document.getElementById('loading-skeletons'),
  bookmarksDrawer: document.getElementById('bookmarks-drawer'),
  drawerCloseBtn: document.getElementById('drawer-close-btn'),
  bookmarksList: document.getElementById('bookmarks-list'),
  articleModal: document.getElementById('article-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalImage: document.getElementById('modal-image'),
  modalSource: document.getElementById('modal-source'),
  modalDate: document.getElementById('modal-date'),
  modalAuthor: document.getElementById('modal-author'),
  modalTitle: document.getElementById('modal-title'),
  modalSentimentWrapper: document.getElementById('modal-sentiment-wrapper'),
  modalSentimentText: document.getElementById('modal-sentiment-text'),
  modalSentimentBar: document.getElementById('modal-sentiment-bar'),
  modalSentimentPercent: document.getElementById('modal-sentiment-percent'),
  modalBodyText: document.getElementById('modal-body-text'),
  modalFullCoverageBtn: document.getElementById('modal-full-coverage-btn'),
  shareTwitter: document.getElementById('share-twitter'),
  shareCopyLink: document.getElementById('share-copy-link'),
  shareBookmark: document.getElementById('share-bookmark'),
  toastContainer: document.getElementById('toast-container'),
  liveTickerList: document.getElementById('live-ticker-list')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBookmarks();
  initLiveTicker();
  setupEventListeners();
  fetchArticles();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('pulsenews_theme');
  if (savedTheme) {
    state.theme = savedTheme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    state.theme = 'light';
  }
  
  applyTheme();
}

function applyTheme() {
  if (state.theme === 'light') {
    document.body.classList.add('light-mode');
    DOM.moonIcon.style.display = 'none';
    DOM.sunIcon.style.display = 'block';
  } else {
    document.body.classList.remove('light-mode');
    DOM.moonIcon.style.display = 'block';
    DOM.sunIcon.style.display = 'none';
  }
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('pulsenews_theme', state.theme);
  applyTheme();
  showToast(`Theme switched to ${state.theme} mode`, 'success');
}

// Bookmarks (Local Storage) System
function initBookmarks() {
  const savedBookmarks = localStorage.getItem('pulsenews_bookmarks');
  if (savedBookmarks) {
    try {
      state.bookmarks = JSON.parse(savedBookmarks);
    } catch (e) {
      state.bookmarks = [];
    }
  }
  updateBookmarkBadge();
  renderBookmarks();
}

function updateBookmarkBadge() {
  DOM.bookmarkBadge.textContent = state.bookmarks.length;
}

function isBookmarked(uri) {
  return state.bookmarks.some(article => article.uri === uri);
}

function toggleBookmark(article) {
  const index = state.bookmarks.findIndex(item => item.uri === article.uri);
  if (index > -1) {
    state.bookmarks.splice(index, 1);
    showToast('Article removed from bookmarks', 'success');
  } else {
    state.bookmarks.push(article);
    showToast('Article saved to bookmarks', 'success');
  }
  localStorage.setItem('pulsenews_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadge();
  renderBookmarks();
  
  // Re-render feed elements (since some bookmark icons might need updating)
  updateCardBookmarkButtons();
  updateModalBookmarkButton();
}

function renderBookmarks() {
  if (state.bookmarks.length === 0) {
    DOM.bookmarksList.innerHTML = `
      <div class="drawer-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p>No saved articles yet.<br>Save stories by clicking the bookmark icon on card corners.</p>
      </div>
    `;
    return;
  }

  DOM.bookmarksList.innerHTML = '';
  state.bookmarks.forEach(article => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    
    const fallbackImg = CATEGORY_IMAGES[state.category] || CATEGORY_IMAGES['general'];
    const imageUrl = article.image || fallbackImg;
    const sourceTitle = article.source ? article.source.title : 'Pulse News';
    
    item.innerHTML = `
      <img src="${imageUrl}" class="bookmark-item-img" alt="${article.title}" onerror="this.src='${fallbackImg}'">
      <div class="bookmark-item-info">
        <div class="bookmark-item-meta">${sourceTitle}</div>
        <div class="bookmark-item-title">${article.title}</div>
      </div>
      <button class="btn-remove-bookmark" aria-label="Remove bookmark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;
    
    // Bind click to open reader modal
    item.querySelector('.bookmark-item-title').addEventListener('click', () => {
      openArticleModal(article);
    });
    
    // Bind remove bookmark
    item.querySelector('.btn-remove-bookmark').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(article);
    });

    DOM.bookmarksList.appendChild(item);
  });
}

function updateCardBookmarkButtons() {
  const cards = DOM.feedContainer.querySelectorAll('.news-card, .hero-main-card');
  cards.forEach(card => {
    const uri = card.dataset.uri;
    const btn = card.querySelector('.btn-bookmark-card');
    if (btn) {
      if (isBookmarked(uri)) {
        btn.classList.add('bookmarked');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
      } else {
        btn.classList.remove('bookmarked');
        btn.querySelector('svg').setAttribute('fill', 'none');
      }
    }
  });
}

function updateModalBookmarkButton() {
  if (state.activeArticle) {
    if (isBookmarked(state.activeArticle.uri)) {
      DOM.shareBookmark.classList.add('bookmarked');
      DOM.shareBookmark.querySelector('svg').setAttribute('fill', 'currentColor');
      DOM.shareBookmark.querySelector('svg').style.color = 'var(--accent-color)';
    } else {
      DOM.shareBookmark.classList.remove('bookmarked');
      DOM.shareBookmark.querySelector('svg').setAttribute('fill', 'none');
      DOM.shareBookmark.querySelector('svg').style.color = 'var(--text-primary)';
    }
  }
}

// Caching layer using sessionStorage to reduce API hits
function getCacheKey() {
  return `pulsenews_cache_${state.category}_${state.search}_${state.sort}_${state.page}`;
}

function getCachedData() {
  const cached = sessionStorage.getItem(getCacheKey());
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      // Cache valid for 10 minutes
      if (Date.now() - timestamp < 10 * 60 * 1000) {
        return data;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

function setCachedData(data) {
  try {
    sessionStorage.setItem(getCacheKey(), JSON.stringify({
      timestamp: Date.now(),
      data: data
    }));
  } catch (e) {
    console.warn('Session storage quota exceeded. Cache skipped.', e);
  }
}

// Fetching Articles from newsapi.ai
async function fetchArticles(append = false) {
  if (append) {
    state.page += 1;
  } else {
    state.page = 1;
    DOM.feedContainer.innerHTML = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Check client-side cache
  const cachedResult = getCachedData();
  if (cachedResult) {
    processApiResponse(cachedResult, append);
    return;
  }

  showLoading(true);

  // Setup request fields
  const requestBody = {
    action: 'getArticles',
    apiKey: API_KEY,
    articlesPage: state.page,
    articlesCount: 15,
    resultType: 'articles',
    articlesSortBy: state.sort,
    lang: 'eng'
  };

  // Add filters based on state
  if (state.category !== 'general') {
    requestBody.categoryUri = state.category;
  }
  if (state.search.trim() !== '') {
    requestBody.keyword = state.search.trim();
  }

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    if (data.articles && data.articles.results) {
      setCachedData(data.articles.results);
      processApiResponse(data.articles.results, append);
    } else {
      showErrorState();
    }
  } catch (error) {
    console.error('API Fetch Failure:', error);
    showToast(`Failed to fetch stories: ${error.message}`, 'error');
    showErrorState();
  } finally {
    showLoading(false);
  }
}

function processApiResponse(results, append) {
  if (append) {
    state.articles = [...state.articles, ...results];
  } else {
    state.articles = results;
  }

  renderFeed(results, append);
}

function showLoading(isLoading) {
  if (isLoading) {
    DOM.loadingSkeletons.style.display = 'block';
    DOM.loadMoreBtn.style.display = 'none';
  } else {
    DOM.loadingSkeletons.style.display = 'none';
    if (state.articles.length > 0 && state.articles.length % 15 === 0) {
      DOM.loadMoreBtn.style.display = 'flex';
    } else {
      DOM.loadMoreBtn.style.display = 'none';
    }
  }
}

function showErrorState() {
  DOM.feedContainer.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; color: var(--sentiment-neg); margin-bottom: 16px;">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <h3 style="font-family: var(--font-title); font-size: 1.5rem; margin-bottom: 8px; color: var(--text-primary);">Unable to Load Stories</h3>
      <p style="margin-bottom: 24px;">There was an issue contacting the news databases. Please check your network or try sorting differently.</p>
      <button class="btn-primary" onclick="window.location.reload();" style="margin: 0 auto;">Refresh Engine</button>
    </div>
  `;
  DOM.loadMoreBtn.style.display = 'none';
}

// Rendering Core UI
function renderFeed(results, append) {
  if (!append && results.length === 0) {
    DOM.feedContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 16px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 style="font-family: var(--font-title); font-size: 1.3rem; margin-bottom: 8px; color: var(--text-primary);">No Results Found</h3>
        <p>We couldn't find any coverage matching your filters or keywords.</p>
      </div>
    `;
    return;
  }

  const fallbackImg = CATEGORY_IMAGES[state.category] || CATEGORY_IMAGES['general'];

  // If page 1 and not appending, we construct the split Hero highlight section + Cards Grid
  if (state.page === 1) {
    DOM.feedContainer.innerHTML = '';
    
    // Split articles: first goes to hero, next 3 go to trending side list, remainder to cards grid
    const heroArticle = results[0];
    const trendingArticles = results.slice(1, 4);
    const gridArticles = results.slice(4);

    // Create Hero Section wrapper
    const heroSection = document.createElement('div');
    heroSection.className = 'hero-section';
    heroSection.style.marginBottom = '32px';

    // RENDER HERO MAIN CARD
    const heroImageUrl = heroArticle.image || fallbackImg;
    const heroSource = heroArticle.source ? heroArticle.source.title : 'World News';
    const heroTime = formatRelativeTime(heroArticle.dateTime);
    const sentimentObj = getSentimentProfile(heroArticle.sentiment);
    
    const heroCard = document.createElement('div');
    heroCard.className = 'hero-main-card';
    heroCard.dataset.uri = heroArticle.uri;
    heroCard.innerHTML = `
      <div class="hero-img-wrap">
        <img src="${heroImageUrl}" class="hero-img" alt="${heroArticle.title}" onerror="this.src='${fallbackImg}'">
        <div class="hero-overlay">
          <span class="badge badge-primary">Featured</span>
          <span class="badge badge-sentiment ${sentimentObj.class}">${sentimentObj.text}</span>
        </div>
      </div>
      <div class="hero-info">
        <div class="hero-meta">
          <span class="source-tag">${heroSource}</span>
          <span>&bull;</span>
          <span>${heroTime}</span>
        </div>
        <h2 class="hero-title">${heroArticle.title}</h2>
        <p class="hero-desc">${heroArticle.body.substring(0, 180)}...</p>
        <div class="hero-footer">
          <div class="btn-read-more">
            <span>Open Coverage</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <button class="btn-bookmark-card ${isBookmarked(heroArticle.uri) ? 'bookmarked' : ''}" aria-label="Bookmark article">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${isBookmarked(heroArticle.uri) ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    `;
    
    heroCard.addEventListener('click', (e) => {
      if (e.target.closest('.btn-bookmark-card')) {
        e.stopPropagation();
        toggleBookmark(heroArticle);
      } else {
        openArticleModal(heroArticle);
      }
    });

    heroSection.appendChild(heroCard);

    // RENDER TRENDING SIDEBAR
    const trendingSide = document.createElement('div');
    trendingSide.className = 'trending-side';
    
    let trendingItemsHtml = '';
    trendingArticles.forEach((article, index) => {
      const source = article.source ? article.source.title : 'Global';
      const time = formatRelativeTime(article.dateTime);
      trendingItemsHtml += `
        <div class="trending-item" data-index="${index}">
          <div class="trending-num">0${index + 1}</div>
          <div class="trending-content">
            <div class="trending-meta">
              <span class="source-tag" style="font-size: 0.7rem;">${source}</span>
              <span>&bull;</span>
              <span>${time}</span>
            </div>
            <div class="trending-title">${article.title}</div>
          </div>
        </div>
      `;
    });

    trendingSide.innerHTML = `
      <h3 class="trending-header">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Trending Stories</span>
      </h3>
      <div class="trending-list">
        ${trendingItemsHtml || '<p style="font-size:0.85rem; color:var(--text-muted);">No other trending items.</p>'}
      </div>
    `;

    // Add trending card click listeners
    const trendingItems = trendingSide.querySelectorAll('.trending-item');
    trendingItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        openArticleModal(trendingArticles[index]);
      });
    });

    heroSection.appendChild(trendingSide);
    DOM.feedContainer.appendChild(heroSection);

    // Create and Append the Grid for the remaining items
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'news-grid';
    cardsGrid.id = 'news-cards-grid';
    
    DOM.feedContainer.appendChild(cardsGrid);
    
    renderGridCards(gridArticles, cardsGrid);
  } else {
    // If we are loading page 2+, just append to the existing cards grid
    const cardsGrid = document.getElementById('news-cards-grid');
    if (cardsGrid) {
      renderGridCards(results, cardsGrid);
    }
  }
}

function renderGridCards(articles, gridContainer) {
  const fallbackImg = CATEGORY_IMAGES[state.category] || CATEGORY_IMAGES['general'];

  articles.forEach(article => {
    const imageUrl = article.image || fallbackImg;
    const sourceTitle = article.source ? article.source.title : 'Global News';
    const relativeTime = formatRelativeTime(article.dateTime);
    const sentiment = getSentimentProfile(article.sentiment);
    const bookmarked = isBookmarked(article.uri);

    const card = document.createElement('div');
    card.className = 'news-card';
    card.dataset.uri = article.uri;
    
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${imageUrl}" class="card-img" alt="${article.title}" onerror="this.src='${fallbackImg}'">
        <div class="card-badges">
          <span class="badge badge-sentiment ${sentiment.class}">${sentiment.text}</span>
        </div>
      </div>
      <div class="card-info">
        <div class="card-meta">
          <span class="source-tag">${sourceTitle}</span>
          <span>&bull;</span>
          <span>${relativeTime}</span>
        </div>
        <h3 class="card-title">${article.title}</h3>
        <p class="card-desc">${article.body ? article.body.substring(0, 110) : ''}...</p>
        <div class="card-footer">
          <div class="btn-read-more" style="font-size: 0.8rem;">
            <span>Open Article</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 14px; height: 14px;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
          <button class="btn-bookmark-card ${bookmarked ? 'bookmarked' : ''}" aria-label="Bookmark article">
            <svg xmlns="http://www.w3.org/2000/svg" fill="${bookmarked ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-bookmark-card')) {
        e.stopPropagation();
        toggleBookmark(article);
      } else {
        openArticleModal(article);
      }
    });

    gridContainer.appendChild(card);
  });
}

// Modal Dialogue Controller
function openArticleModal(article) {
  state.activeArticle = article;
  
  const fallbackImg = CATEGORY_IMAGES[state.category] || CATEGORY_IMAGES['general'];
  DOM.modalImage.src = article.image || fallbackImg;
  DOM.modalImage.onerror = function() {
    this.src = fallbackImg;
  };
  
  DOM.modalSource.textContent = article.source ? article.source.title : 'World Coverage';
  DOM.modalDate.textContent = formatDateFull(article.dateTime || `${article.date}T${article.time}Z`);
  
  // Format Author list
  if (article.authors && article.authors.length > 0) {
    const authorNames = article.authors.map(a => a.name).join(', ');
    DOM.modalAuthor.textContent = `By ${authorNames}`;
    DOM.modalAuthor.style.display = 'inline';
  } else {
    DOM.modalAuthor.style.display = 'none';
  }

  DOM.modalTitle.textContent = article.title;
  
  // Format Sentiment meter
  const sentiment = article.sentiment !== undefined ? article.sentiment : 0;
  const sentimentProfile = getSentimentProfile(sentiment);
  DOM.modalSentimentText.textContent = `${sentimentProfile.text} Sentiment`;
  DOM.modalSentimentText.style.color = `var(--sentiment-${sentimentProfile.class})`;
  DOM.modalSentimentBar.className = `sentiment-meter-bar`;
  DOM.modalSentimentBar.style.backgroundColor = `var(--sentiment-${sentimentProfile.class})`;
  
  // Scale sentiment (-1 to 1) into percentage (0% to 100%)
  const percentage = Math.round((sentiment + 1) * 50);
  DOM.modalSentimentBar.style.width = `${percentage}%`;
  DOM.modalSentimentPercent.textContent = sentiment > 0 ? `+${sentiment.toFixed(2)}` : sentiment.toFixed(2);

  // Format Article Content Body text
  let bodyContent = '';
  if (article.body) {
    const paragraphs = article.body.split('\n\n');
    paragraphs.forEach(para => {
      if (para.trim()) {
        bodyContent += `<p>${para.trim()}</p>`;
      }
    });
  }
  DOM.modalBodyText.innerHTML = bodyContent || '<p>Full content text is not available directly from listing summary.</p>';

  // Link button
  DOM.modalFullCoverageBtn.href = article.url;

  updateModalBookmarkButton();

  // Show Modal
  DOM.articleModal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Stop background scrolling
}

function closeArticleModal() {
  DOM.articleModal.classList.remove('active');
  document.body.style.overflow = '';
  state.activeArticle = null;
}

// Helpers & Utilities
function getSentimentProfile(val) {
  if (val === undefined || val === null) {
    return { text: 'Neutral', class: 'neu' };
  }
  if (val > 0.05) {
    return { text: 'Positive', class: 'pos' };
  }
  if (val < -0.05) {
    return { text: 'Negative', class: 'neg' };
  }
  return { text: 'Neutral', class: 'neu' };
}

function formatRelativeTime(dateTimeStr) {
  if (!dateTimeStr) return 'Recently';
  try {
    const date = new Date(dateTimeStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    // Default formatted short date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
}

function formatDateFull(dateTimeStr) {
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateTimeStr;
  }
}

// Interactive Live Info Ticker (Markets + News Headlines)
function initLiveTicker() {
  const stockData = [
    { symbol: 'BTC/USD', price: 92350.25, change: 1.45 },
    { symbol: 'ETH/USD', price: 3410.80, change: -0.65 },
    { symbol: 'AAPL', price: 218.42, change: 0.88 },
    { symbol: 'GOOGL', price: 182.15, change: -1.20 },
    { symbol: 'TSLA', price: 245.90, change: 3.12 },
    { symbol: 'SPY', price: 542.10, change: 0.15 }
  ];

  const breakingNews = [
    'Treyarch porting Call of Duty: Black Ops 1 & 2 to PS5 and PS4 this July',
    'Federal Reserve hints at potential interest rate adjustments in upcoming meeting',
    'Global Aerospace Forum announces breakthrough in sustainable aviation fuel trials',
    'DeepMind unveils alpha-level agent capability in localized workspace tasks',
    'Championship finals draw record global broadcasting viewership counts'
  ];

  function renderTicker() {
    let tickerHtml = '';

    // Loop double times to make seamless infinite loop
    for (let loop = 0; loop < 2; loop++) {
      stockData.forEach(stock => {
        const isUp = stock.change >= 0;
        const changeSign = isUp ? '+' : '';
        const badgeClass = isUp ? 'stock-up' : 'stock-down';
        tickerHtml += `
          <span class="ticker-item">
            <span class="ticker-bullet"></span>
            <strong>${stock.symbol}</strong>: $${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} 
            <span class="ticker-stock ${badgeClass}">${changeSign}${stock.change.toFixed(2)}%</span>
          </span>
        `;
      });

      breakingNews.forEach(head => {
        tickerHtml += `
          <span class="ticker-item">
            <span class="ticker-bullet" style="background-color: var(--accent-color);"></span>
            <strong>Breaking</strong>: ${head}
          </span>
        `;
      });
    }

    DOM.liveTickerList.innerHTML = tickerHtml;
  }

  renderTicker();

  // Simulating market price ticker movements dynamically
  setInterval(() => {
    stockData.forEach(stock => {
      // Simulate micro fluctuation
      const percentMovement = (Math.random() - 0.48) * 0.4; // Slightly bias upwards
      const delta = stock.price * (percentMovement / 100);
      stock.price += delta;
      stock.change += percentMovement;
      // Keep boundaries
      if (stock.change > 10) stock.change = 10;
      if (stock.change < -10) stock.change = -10;
    });
    renderTicker();
  }, 6000);
}

// Global Event Listeners Setup
function setupEventListeners() {
  // Navigation / Search Reset
  DOM.logoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    state.category = 'general';
    state.search = '';
    DOM.searchInput.value = '';
    DOM.feedHeading.textContent = 'World News';
    
    // Highlight first nav tab
    const tabs = DOM.categoriesList.querySelectorAll('.category-tab');
    tabs.forEach((tab, index) => {
      if (index === 0) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    fetchArticles();
  });

  // Category Tab Switches
  DOM.categoriesList.addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;
    
    // Toggle active state
    DOM.categoriesList.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update query conditions
    state.category = tab.dataset.category;
    DOM.feedHeading.textContent = tab.textContent;
    state.search = ''; // Reset keyword search on tab switch
    DOM.searchInput.value = '';

    fetchArticles();
  });

  // Sort Option Switches
  DOM.sortBySelect.addEventListener('change', () => {
    state.sort = DOM.sortBySelect.value;
    fetchArticles();
  });

  // Keyboard Search Box Enter Key Event
  DOM.searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const q = DOM.searchInput.value.trim();
      state.search = q;
      
      // Update heading text
      if (q) {
        DOM.feedHeading.textContent = `Search Results: "${q}"`;
      } else {
        const activeTab = DOM.categoriesList.querySelector('.category-tab.active');
        DOM.feedHeading.textContent = activeTab ? activeTab.textContent : 'World News';
      }

      fetchArticles();
    }
  });

  // Load More Pagination Button
  DOM.loadMoreBtn.addEventListener('click', () => {
    fetchArticles(true);
  });

  // Theme Toggler Button
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // Bookmarks Off-Canvas drawer togglers
  DOM.bookmarksToggleBtn.addEventListener('click', () => {
    DOM.bookmarksDrawer.classList.add('active');
  });

  DOM.drawerCloseBtn.addEventListener('click', () => {
    DOM.bookmarksDrawer.classList.remove('active');
  });

  // Close reader modal click bindings
  DOM.modalCloseBtn.addEventListener('click', closeArticleModal);
  
  DOM.articleModal.addEventListener('click', (e) => {
    if (e.target === DOM.articleModal) {
      closeArticleModal();
    }
  });

  // Modal actions binding
  DOM.shareBookmark.addEventListener('click', () => {
    if (state.activeArticle) {
      toggleBookmark(state.activeArticle);
    }
  });

  // Copy link widget
  DOM.shareCopyLink.addEventListener('click', () => {
    if (state.activeArticle) {
      navigator.clipboard.writeText(state.activeArticle.url)
        .then(() => {
          showToast('Article URL copied to clipboard', 'success');
        })
        .catch(() => {
          showToast('Failed to copy link', 'error');
        });
    }
  });

  // Share on X (Twitter)
  DOM.shareTwitter.addEventListener('click', () => {
    if (state.activeArticle) {
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(state.activeArticle.title)}&url=${encodeURIComponent(state.activeArticle.url)}&via=PulseNews`;
      window.open(shareUrl, '_blank', 'width=550,height=420');
    }
  });
}

// Toast Alert Messages System
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Custom Icon inside toast
  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
  } else {
    iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
  }

  toast.innerHTML = `${iconHtml}<span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  // Transition animations
  setTimeout(() => toast.classList.add('show'), 50);

  // Auto clean-up
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
