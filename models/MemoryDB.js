// models/MemoryDB.js - In-memory database fallback
class MemoryDB {
  constructor() {
    this.links = new Map();
    this.clicks = new Map();
    console.log('🔄 In-memory database initialized');
  }

  async createLink(shortCode, originalUrl) {
    const link = {
      _id: shortCode,
      shortCode,
      originalUrl,
      clicks: 0,
      lastClicked: null,
      createdAt: new Date()
    };
    
    this.links.set(shortCode, link);
    this.clicks.set(shortCode, 0);
    return link;
  }

  async findLink(shortCode) {
    return this.links.get(shortCode) || null;
  }

  async findAllLinks() {
    return Array.from(this.links.values()).sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
  }

  async incrementClicks(shortCode) {
    const link = this.links.get(shortCode);
    if (link) {
      link.clicks += 1;
      link.lastClicked = new Date();
      return link;
    }
    return null;
  }

  async deleteLink(shortCode) {
    const existed = this.links.has(shortCode);
    this.links.delete(shortCode);
    this.clicks.delete(shortCode);
    return existed;
  }

  async linkExists(shortCode) {
    return this.links.has(shortCode);
  }
}

module.exports = new MemoryDB();