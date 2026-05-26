// app.js - DSA Tracker Dashboard Logic

// State Management
let completedQuestions = new Set();
let bookmarkedQuestions = new Set();
let expandedCategories = new Set();

// Active Filters
let searchQuery = "";
let statusFilter = "all"; // 'all', 'completed', 'pending', 'bookmarked'
let difficultyFilter = "all"; // 'all', 'easy', 'medium', 'hard'

// HTML Elements
const progressCountText = document.getElementById("progress-count");
const progressBarFill = document.getElementById("progress-bar-fill");
const searchInput = document.getElementById("search-input");
const accordionListContainer = document.getElementById("accordion-list");
const resetBtn = document.getElementById("reset-btn");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
  cleanData();
  loadState();
  setupEventListeners();
  render();
});

// Dynamic Data Cleaning: Promotes specific tags to become primary platform badges
function cleanData() {
  if (typeof DSA_DATA === "undefined") return;
  
  const customPlatforms = ["javatpoint", "tutorialspoint", "coding ninjas", "interviewbit", "codestudio", "hackerrank", "codeforces"];
  
  DSA_DATA.forEach(category => {
    category.questions.forEach(q => {
      if (!q.tags) return;
      
      // Find if any tag matches a known custom platform (case-insensitive check)
      const platformTagIndex = q.tags.findIndex(t => 
        customPlatforms.includes(t.toLowerCase().trim())
      );
      
      if (platformTagIndex !== -1) {
        // Promote the tag to be the main platform name
        const rawTag = q.tags[platformTagIndex];
        q.platform = rawTag;
        
        // Remove it from tags list so it doesn't show up below the question name
        q.tags.splice(platformTagIndex, 1);
      } else if (q.practice_link) {
        // Fallback: detect from practice URL domain name
        const url = q.practice_link.toLowerCase();
        if (url.includes("javatpoint.com")) {
          q.platform = "Javatpoint";
        } else if (url.includes("tutorialspoint.com")) {
          q.platform = "Tutorialspoint";
        } else if (url.includes("codingninjas.com") || url.includes("codestudio")) {
          q.platform = "Coding Ninjas";
        } else if (url.includes("interviewbit.com")) {
          q.platform = "InterviewBit";
        } else if (url.includes("hackerrank.com")) {
          q.platform = "HackerRank";
        } else if (url.includes("codeforces.com")) {
          q.platform = "CodeForces";
        }
      }
    });
  });
}

// Load States from LocalStorage
function loadState() {
  try {
    const completedStr = localStorage.getItem("dsa_tracker_completed");
    if (completedStr) {
      completedQuestions = new Set(JSON.parse(completedStr));
    }
    
    const bookmarkedStr = localStorage.getItem("dsa_tracker_bookmarked");
    if (bookmarkedStr) {
      bookmarkedQuestions = new Set(JSON.parse(bookmarkedStr));
    }

    const expandedStr = localStorage.getItem("dsa_tracker_expanded");
    if (expandedStr) {
      expandedCategories = new Set(JSON.parse(expandedStr));
    } else {
      // By default, let's expand the first topic (Foundation)
      if (DSA_DATA.length > 0) {
        expandedCategories.add(DSA_DATA[0].id);
      }
    }
  } catch (e) {
    console.error("Error loading localStorage state:", e);
  }
}

// Save States to LocalStorage
function saveState() {
  try {
    localStorage.setItem("dsa_tracker_completed", JSON.stringify(Array.from(completedQuestions)));
    localStorage.setItem("dsa_tracker_bookmarked", JSON.stringify(Array.from(bookmarkedQuestions)));
    localStorage.setItem("dsa_tracker_expanded", JSON.stringify(Array.from(expandedCategories)));
  } catch (e) {
    console.error("Error saving localStorage state:", e);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Search box listener
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      render();
      
      // If user is searching, expand any topic that contains matching questions
      if (searchQuery.length > 0) {
        autoExpandMatchingTopics();
      }
    });
  }

  // Filter Tabs Listeners
  document.querySelectorAll(".tab-group-status .tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-group-status .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      statusFilter = tab.getAttribute("data-filter");
      render();
    });
  });

  document.querySelectorAll(".tab-group-difficulty .tab").forEach(tab => {
    tab.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-group-difficulty .tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      difficultyFilter = tab.getAttribute("data-filter");
      render();
    });
  });

  // Event Delegation for Accordion Toggles, Checkboxes, and Bookmarks
  accordionListContainer.addEventListener("click", (e) => {
    // 1. Accordion Header Toggle
    const header = e.target.closest(".accordion-header");
    if (header) {
      const item = header.closest(".accordion-item");
      const categoryId = item.getAttribute("data-id");
      toggleAccordion(categoryId, item);
      return;
    }

    // 2. Completed Checkbox Toggle
    const checkbox = e.target.closest(".checkbox-custom");
    if (checkbox) {
      e.stopPropagation();
      const row = checkbox.closest(".question-row");
      const qId = row.getAttribute("data-id");
      toggleQuestionCompleted(qId, row);
      return;
    }

    // 3. Bookmark Toggle
    const bookmark = e.target.closest(".bookmark-btn");
    if (bookmark) {
      e.stopPropagation();
      const row = bookmark.closest(".question-row");
      const qId = row.getAttribute("data-id");
      toggleQuestionBookmarked(qId, bookmark);
      return;
    }
  });

  // Reset Progress Button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const confirmReset = confirm("Are you sure you want to reset all your progress and bookmarks? This cannot be undone.");
      if (confirmReset) {
        completedQuestions.clear();
        bookmarkedQuestions.clear();
        expandedCategories.clear();
        if (DSA_DATA.length > 0) {
          expandedCategories.add(DSA_DATA[0].id);
        }
        saveState();
        
        // Reset search/filters UI
        if (searchInput) {
          searchInput.value = "";
        }
        searchQuery = "";
        
        // Reset active tabs to first item
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelector(".tab-group-status [data-filter='all']").classList.add("active");
        document.querySelector(".tab-group-difficulty [data-filter='all']").classList.add("active");
        statusFilter = "all";
        difficultyFilter = "all";
        
        render();
        alert("Progress successfully reset!");
      }
    });
  }

  // Toggle All button listener
  const toggleAllBtn = document.getElementById("toggle-all-btn");
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener("click", handleToggleAll);
  }

  // Back to Top button listener with cross-browser scroll coordinate fallbacks
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    const handleScroll = () => {
      const scrolled = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrolled > 200) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    };

    // Listen on both window scroll and document scroll to capture all scroll containers
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    
    backToTopBtn.addEventListener("click", () => {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
        // Double backup for smooth scroll support
        document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
        document.body.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        // Hard fallback if scrollTo behavior throws an error
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    });
  }
}

// Handle Expand/Collapse All
function handleToggleAll() {
  if (typeof DSA_DATA === "undefined") return;
  const allIds = DSA_DATA.map(c => c.id);
  const allExpanded = allIds.every(id => expandedCategories.has(id));
  
  if (allExpanded) {
    // Collapse all
    expandedCategories.clear();
  } else {
    // Expand all
    allIds.forEach(id => expandedCategories.add(id));
  }
  
  saveState();
  render();
  updateToggleAllBtn();
}

// Update Toggle All Button Icon & Label
function updateToggleAllBtn() {
  const toggleAllBtn = document.getElementById("toggle-all-btn");
  if (!toggleAllBtn || typeof DSA_DATA === "undefined") return;
  
  const allIds = DSA_DATA.map(c => c.id);
  const allExpanded = allIds.every(id => expandedCategories.has(id));
  
  if (allExpanded) {
    toggleAllBtn.title = "Collapse all folders";
    toggleAllBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="10" y1="14" x2="3" y2="21"></line></svg>
    `;
  } else {
    toggleAllBtn.title = "Expand all folders";
    toggleAllBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
    `;
  }
}

// Auto expand accordion folders that contain matched results during search
function autoExpandMatchingTopics() {
  let changed = false;
  DSA_DATA.forEach(category => {
    const hasMatch = category.questions.some(q => matchesFilters(q, category.name));
    if (hasMatch && !expandedCategories.has(category.id)) {
      expandedCategories.add(category.id);
      changed = true;
    }
  });
  if (changed) {
    saveState();
    // Update expanded heights in the DOM without complete re-rendering
    document.querySelectorAll(".accordion-item").forEach(item => {
      const catId = item.getAttribute("data-id");
      const content = item.querySelector(".accordion-content");
      if (expandedCategories.has(catId)) {
        item.classList.add("expanded");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  }
}

// Toggle Accordion Panel height dynamically
function toggleAccordion(categoryId, element) {
  const content = element.querySelector(".accordion-content");
  
  if (expandedCategories.has(categoryId)) {
    expandedCategories.delete(categoryId);
    element.classList.remove("expanded");
    content.style.maxHeight = "0px";
  } else {
    expandedCategories.add(categoryId);
    element.classList.add("expanded");
    content.style.maxHeight = content.scrollHeight + "px";
  }
  saveState();
}

// Toggle Question Completed
function toggleQuestionCompleted(qId, rowElement) {
  if (completedQuestions.has(qId)) {
    completedQuestions.delete(qId);
    rowElement.classList.remove("done");
  } else {
    completedQuestions.add(qId);
    rowElement.classList.add("done");
  }
  saveState();
  updateStatistics();
  updateCategoryProgressBadges();
}

// Toggle Question Bookmarked
function toggleQuestionBookmarked(qId, btnElement) {
  if (bookmarkedQuestions.has(qId)) {
    bookmarkedQuestions.delete(qId);
    btnElement.classList.remove("active");
  } else {
    bookmarkedQuestions.add(qId);
    btnElement.classList.add("active");
  }
  saveState();
  
  // If the user is currently viewing "Bookmarked Only" tab, we should re-render to remove it from view if untoggled
  if (statusFilter === "bookmarked") {
    render();
  }
}

// Highlight matching search text securely
function highlightText(text, query) {
  if (!query) return text;
  // Escape special regex characters
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

// Check if a question matches active filters
function matchesFilters(q, categoryName = "") {
  // 1. Difficulty Filter
  if (difficultyFilter !== "all" && q.difficulty.toLowerCase() !== difficultyFilter) {
    return false;
  }

  // 2. Status Filter
  if (statusFilter === "completed" && !completedQuestions.has(q.id)) {
    return false;
  }
  if (statusFilter === "pending" && completedQuestions.has(q.id)) {
    return false;
  }
  if (statusFilter === "bookmarked" && !bookmarkedQuestions.has(q.id)) {
    return false;
  }

  // 3. Search query
  if (searchQuery) {
    const inName = q.name.toLowerCase().includes(searchQuery);
    const inTags = q.tags.some(t => t.toLowerCase().includes(searchQuery));
    const inCategory = categoryName.toLowerCase().includes(searchQuery);
    if (!inName && !inTags && !inCategory) {
      return false;
    }
  }

  return true;
}

// Dynamic Render Function
function render() {
  updateToggleAllBtn();
  let totalQuestionsCount = 0;
  let matchesCount = 0;
  let accordionHtml = "";

  DSA_DATA.forEach(category => {
    // Count total questions in the dataset
    totalQuestionsCount += category.questions.length;
    
    // Filter questions under this topic
    const filteredQuestions = category.questions.filter(q => matchesFilters(q, category.name));
    
    // Total solved questions inside this category
    const solvedCount = category.questions.filter(q => completedQuestions.has(q.id)).length;
    const catPercent = category.questions.length > 0 ? Math.round((solvedCount / category.questions.length) * 100) : 0;
    
    // Hide categories that have 0 matching questions when filters are active
    if (filteredQuestions.length === 0 && (searchQuery || statusFilter !== "all" || difficultyFilter !== "all")) {
      return;
    }
    
    matchesCount += filteredQuestions.length;
    
    // Build category progress badges
    let badgeClass = "";
    if (catPercent === 100) {
      badgeClass = "completed";
    } else if (catPercent > 0) {
      badgeClass = "started";
    }
    
    const isExpanded = expandedCategories.has(category.id);
    const expandedClass = isExpanded ? "expanded" : "";
    const contentStyle = isExpanded ? "" : "style='max-height: 0px;'";
    
    // Category item shell
    let categoryHtml = `
      <div class="accordion-item ${expandedClass}" data-id="${category.id}">
        <button class="accordion-header">
          <div class="accordion-header-left">
            <svg class="accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            <span class="accordion-title">${highlightText(category.name, searchQuery)}</span>
          </div>
          <div class="accordion-header-right">
            ${category.video_link ? `
              <a href="${category.video_link}" target="_blank" class="header-video-badge" title="Watch lectures on YouTube" onclick="event.stopPropagation();">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#FF0000" d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.518 3.5 12 3.5 12 3.5s-7.517 0-9.388.555A3.002 3.002 0 0 0 .5 6.163C0 8.037 0 12 0 12s0 3.963.502 5.837a3.003 3.003 0 0 0 2.11 2.108C6.483 20.5 12 20.5 12 20.5s7.518 0 9.388-.555a3.002 3.002 0 0 0 2.11-2.108C24 15.963 24 12 24 12s0-3.963-.502-5.837z" />
                  <polygon fill="#FFFFFF" points="9.545,15.568 9.545,8.432 15.818,12" />
                </svg>
              </a>
            ` : ""}
            <span class="topic-progress-text">${solvedCount}/${category.questions.length} Solved</span>
            <span class="topic-percent-badge ${badgeClass}" id="badge-${category.id}">${catPercent}%</span>
          </div>
        </button>
        <div class="accordion-content" ${contentStyle}>
    `;

    // Multi-video playlists (e.g. for Searching/Sorting having multiple lecture clips)
    if (category.videos && category.videos.length > 1) {
      categoryHtml += `<div class="video-playlist-container">`;
      category.videos.forEach(video => {
        categoryHtml += `
          <a href="${video.url}" target="_blank" class="playlist-video-link">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="color: var(--danger);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            ${video.title}
          </a>
        `;
      });
      categoryHtml += `</div>`;
    }

    // Build the questions table body
    categoryHtml += `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th class="checkbox-cell">Status</th>
              <th class="bookmark-cell">Revisit</th>
              <th>Question Name</th>
              <th>Platform</th>
              <th>Links</th>
              <th>Difficulty</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Loop questions
    filteredQuestions.forEach(q => {
      const isDone = completedQuestions.has(q.id);
      const isStarred = bookmarkedQuestions.has(q.id);
      
      const doneClass = isDone ? "done" : "";
      const starredClass = isStarred ? "active" : "";
      const diffClass = `difficulty-${q.difficulty.toLowerCase()}`;
      const platformClass = "platform-" + q.platform.toLowerCase().replace(/\s+/g, "-");
      
      // Determine links
      let practiceIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
      let practiceUrl = q.practice_link;
      let practiceTitle = "Practice on LeetCode/GFG";
      
      if (!practiceUrl) {
        // If there's no link, we link to a Google Search of the question
        practiceUrl = `https://www.google.com/search?q=${encodeURIComponent(q.name + " kunal kushwaha java assignment")}`;
        practiceTitle = "Search question details on Google";
        practiceIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      }

      categoryHtml += `
        <tr class="question-row ${doneClass}" data-id="${q.id}">
          <td class="checkbox-cell">
            <span class="checkbox-custom" title="Mark as Completed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.801 10A10 10 0 1 1 17 3.335" class="checkbox-circle"></path>
                <path d="m9 11 3 3L22 4" class="checkbox-check"></path>
              </svg>
            </span>
          </td>
          <td class="bookmark-cell">
            <button class="bookmark-btn ${starredClass}" title="Flag for Revision later">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </button>
          </td>
          <td>
            <div class="question-text">
              ${highlightText(q.name, searchQuery)}
            </div>
            ${q.tags && q.tags.length > 0 ? `
              <div class="company-tags">
                ${q.tags.map(t => `<span class="company-tag">${highlightText(t, searchQuery)}</span>`).join('')}
              </div>
            ` : ""}
          </td>
          <td>
            <span class="platform-badge ${platformClass}">${q.platform}</span>
          </td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <a href="${practiceUrl}" target="_blank" class="action-link" title="${practiceTitle}">
                ${practiceIcon}
              </a>
              ${q.video_link ? `
                <a href="${q.video_link}" target="_blank" class="action-link video-link" title="Watch Lecture Video">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                </a>
              ` : ""}
            </div>
          </td>
          <td>
            <span class="badge ${diffClass}">${q.difficulty}</span>
          </td>
        </tr>
      `;
    });

    categoryHtml += `
          </tbody>
        </table>
      </div>
      </div>
      </div>
    `;

    accordionHtml += categoryHtml;
  });

  // Empty state if nothing matches
  if (matchesCount === 0) {
    accordionHtml = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        <p style="font-size: 1.1rem; font-weight: 500;">No matching questions found</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">Try adjusting your search terms or active filters</p>
      </div>
    `;
  }

  // Inject accordions into DOM
  accordionListContainer.innerHTML = accordionHtml;

  // Re-adjust max-height for all expanded accordions in the DOM so that heights transitions stay correct
  document.querySelectorAll(".accordion-item.expanded").forEach(item => {
    const content = item.querySelector(".accordion-content");
    content.style.maxHeight = content.scrollHeight + "px";
  });

  updateStatistics();
}

// Update Overall Header Statistics Card
function updateStatistics() {
  let totalQ = 0;
  DSA_DATA.forEach(c => totalQ += c.questions.length);

  const doneCount = completedQuestions.size;
  const percent = totalQ > 0 ? Math.round((doneCount / totalQ) * 100) : 0;

  if (progressCountText) {
    progressCountText.innerText = `${doneCount} of ${totalQ} Completed`;
  }
  
  if (progressBarFill) {
    progressBarFill.style.width = `${percent}%`;
    
    // Update text label inside progress fill only if there's enough space
    const progressTextElement = progressBarFill.querySelector(".progress-bar-text");
    if (progressTextElement) {
      progressTextElement.innerText = `${percent}%`;
      progressTextElement.style.opacity = percent > 5 ? "1" : "0";
    }
  }
}

// Recalculate progress text and percentage badges for each category in real-time
function updateCategoryProgressBadges() {
  DSA_DATA.forEach(category => {
    const solvedCount = category.questions.filter(q => completedQuestions.has(q.id)).length;
    const catPercent = category.questions.length > 0 ? Math.round((solvedCount / category.questions.length) * 100) : 0;
    
    // Find item elements in DOM
    const item = document.querySelector(`.accordion-item[data-id="${category.id}"]`);
    if (item) {
      const progressText = item.querySelector(".topic-progress-text");
      if (progressText) {
        progressText.innerText = `${solvedCount}/${category.questions.length} Solved`;
      }
      
      const badge = item.querySelector(`.topic-percent-badge`);
      if (badge) {
        badge.innerText = `${catPercent}%`;
        badge.className = "topic-percent-badge";
        if (catPercent === 100) {
          badge.classList.add("completed");
        } else if (catPercent > 0) {
          badge.classList.add("started");
        }
      }
    }
  });
}
