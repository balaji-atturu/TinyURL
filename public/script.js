class TinyLinkApp {
  constructor() {
    this.baseUrl = window.location.origin;
    this.currentPage = window.location.pathname;
    this.init();
  }

  init() {
    console.log('🔄 Initializing TinyLink App on:', this.currentPage);
    
    // Check which page we're on and initialize accordingly
    if (this.currentPage === '/') {
      this.initDashboard();
    } else if (this.currentPage.startsWith('/code/')) {
      this.initStatsPage();
    }
  }

  // Dashboard functionality
  async initDashboard() {
    console.log('📊 Initializing dashboard...');
    this.setupDashboardEventListeners();
    await this.loadLinks();
  }

  setupDashboardEventListeners() {
    // Form submission
    const form = document.getElementById('createLinkForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleCreateLink(e));
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }
  }

  async loadLinks() {
    console.log('📥 Loading links...');
    
    try {
      const response = await fetch('/api/links');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const links = await response.json();
      console.log('✅ Links loaded:', links.length);
      this.renderLinksTable(links);
    } catch (error) {
      console.error('❌ Error loading links:', error);
      this.showError('Failed to load links: ' + error.message);
      this.renderLinksTable([]);
    }
  }

  renderLinksTable(links) {
    const tbody = document.querySelector('#linksTable tbody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) {
      console.error('❌ Table body not found');
      return;
    }

    if (!links || links.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Add each link as a table row
    links.forEach(link => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${this.escapeHtml(link.shortCode)}</strong><br>
          <small>
            <a href="${this.baseUrl}/${link.shortCode}" target="_blank">
              ${this.baseUrl}/${link.shortCode}
            </a>
            <button class="copy-btn" data-url="${this.baseUrl}/${link.shortCode}">
              Copy
            </button>
          </small>
        </td>
        <td class="url-cell" title="${this.escapeHtml(link.originalUrl)}">
          ${this.escapeHtml(link.originalUrl)}
        </td>
        <td>${link.clicks}</td>
        <td>${link.lastClicked ? new Date(link.lastClicked).toLocaleString() : 'Never'}</td>
        <td class="actions">
<button class="btn view-stats" data-code="${link.shortCode}" style="
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    margin-right: 8px;
    transform: translateY(0);
"
onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 99, 235, 0.4)';"
onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(37, 99, 235, 0.3)';"
onmousedown="this.style.transform='translateY(0)';"
onmouseup="this.style.transform='translateY(-2px)';"
>
    Stats
</button>          
<button class="btn btn-danger delete-link" data-code="${link.shortCode}" style="
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    transform: translateY(0);
"
onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(239, 68, 68, 0.4)';"
onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.3)';"
onmousedown="this.style.transform='translateY(0)';"
onmouseup="this.style.transform='translateY(-2px)';"
>
    Delete
</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Add event listeners to dynamically created buttons
    this.attachTableEventListeners();
  }

  attachTableEventListeners() {
    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.getAttribute('data-url');
        this.copyToClipboard(url);
      });
    });

    // Stats buttons
    document.querySelectorAll('.view-stats').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-code');
        this.viewStats(code);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-code');
        this.deleteLink(code);
      });
    });
  }

  async handleCreateLink(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalUrl = form.originalUrl.value;
    const customCode = form.customCode.value;
    
    // Basic validation
    if (!originalUrl) {
      this.showError('Please enter a URL');
      return;
    }

    // Disable submit button during request
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalUrl: originalUrl,
          customCode: customCode || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link');
      }

      this.showSuccess('Link created successfully!');
      form.reset();
      
      // Reload the links table
      await this.loadLinks();
      
    } catch (error) {
      this.showError(error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Short Link';
    }
  }

  async deleteLink(shortCode) {
    if (!confirm('Are you sure you want to delete this link?')) {
      return;
    }

    try {
      const response = await fetch(`/api/links/${shortCode}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete link');
      }

      this.showSuccess('Link deleted successfully!');
      await this.loadLinks(); // Refresh the table
    } catch (error) {
      this.showError(error.message);
    }
  }

  viewStats(shortCode) {
    window.location.href = `/code/${shortCode}`;
  }

  // Stats page functionality
  async initStatsPage() {
    console.log('📈 Initializing stats page...');
    const pathParts = window.location.pathname.split('/');
    const shortCode = pathParts[pathParts.length - 1];
    
    if (shortCode && shortCode !== 'code') {
      await this.loadLinkStats(shortCode);
    } else {
      this.showError('Invalid link code');
    }
  }

  async loadLinkStats(shortCode) {
    const statsContent = document.getElementById('statsContent');
    if (!statsContent) {
      console.error('❌ Stats content element not found');
      return;
    }

    // Show loading state
    statsContent.innerHTML = '<div class="loading">Loading statistics...</div>';
    
    try {
      const response = await fetch(`/api/links/${shortCode}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Link not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const link = await response.json();
      this.renderStats(link);
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      statsContent.innerHTML = `
        <div class="empty-state">
          <p>Error: ${error.message}</p>
          <a href="/" class="btn btn-primary">Back to Dashboard</a>
        </div>
      `;
    }
  }

  renderStats(link) {
    const statsContent = document.getElementById('statsContent');
    if (!statsContent) return;
    
    statsContent.innerHTML = `
      <div class="card">
        <h2>Statistics for ${this.escapeHtml(link.shortCode)}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-number">${link.clicks}</span>
            <span class="stat-label">Total Clicks</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${link.lastClicked ? new Date(link.lastClicked).toLocaleDateString() : 'Never'}</span>
            <span class="stat-label">Last Clicked</span>
          </div>
          <div class="stat-card">
            <span class="stat-number">${new Date(link.createdAt).toLocaleDateString()}</span>
            <span class="stat-label">Created</span>
          </div>
        </div>
        
        <div class="form-group">
          <label>Short URL:</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" value="${this.baseUrl}/${link.shortCode}" readonly style="flex: 1;">
            <button class="copy-btn" data-url="${this.baseUrl}/${link.shortCode}">Copy</button>
          </div>
        </div>
        
        <div class="form-group">
          <label>Original URL:</label>
          <input type="text" value="${this.escapeHtml(link.originalUrl)}" readonly>
        </div>
        
        <div style="margin-top: 1rem;">
          <a href="/" class="btn">Back to Dashboard</a>
          <button class="btn btn-danger delete-link" data-code="${link.shortCode}">Delete Link</button>
        </div>
      </div>
    `;

    // Add event listeners to buttons in stats page
    const copyBtn = statsContent.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        const url = e.target.getAttribute('data-url');
        this.copyToClipboard(url);
      });
    }

    const deleteBtn = statsContent.querySelector('.delete-link');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        const code = e.target.getAttribute('data-code');
        this.deleteLink(code);
      });
    }
  }

  handleSearch(query) {
    const tbody = document.querySelector('#linksTable tbody');
    const emptyState = document.getElementById('emptyState');
    
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query.toLowerCase())) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('Copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showSuccess('Copied to clipboard!');
    }
  }

  showSuccess(message) {
    this.showAlert(message, 'success');
  }

  showError(message) {
    this.showAlert(message, 'error');
  }

  showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Insert at the top of the main content
    const main = document.querySelector('main');
    if (main) {
      main.insertBefore(alert, main.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, starting TinyLink App...');
  window.app = new TinyLinkApp();
});