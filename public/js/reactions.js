/**
 * Post reactions handler for sbondar.com
 * Manages reaction UI interactions and API calls
 */

// Create Alpine.js component for post reactions
function postReactions(postId) {
  return {
    postId: postId,
    reactions: [], // Will be populated from API
    counts: {},    // Reaction counts
    userReaction: null, // User's current reaction
    loading: false,
    showAllReactions: false, // Toggle for showing all reactions
    
    // Load reactions data from API
    async loadReactions() {
      try {
        this.loading = true;
        const response = await fetch(`/api/reactions/post/${this.postId}`);
        
        if (response.ok) {
          const data = await response.json();
          this.reactions = data.reactions;
          this.counts = data.counts;
          this.userReaction = data.userReaction;
          
          // Set up click outside listener
          this.setupClickOutside();
        } else {
          console.error('Failed to load reactions');
        }
      } catch (error) {
        console.error('Error loading reactions:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // Handle showing all reactions
    toggleAllReactions() {
      this.showAllReactions = !this.showAllReactions;
    },
    
    // Check if a reaction has been used
    hasReactions(type) {
      return (this.counts[type] && this.counts[type] > 0) || this.userReaction === type;
    },
    
    // Set up click outside to hide all reactions
    setupClickOutside() {
      document.addEventListener('click', (event) => {
        if (this.showAllReactions) {
          // Check if click is outside the reactions container
          const container = event.target.closest('.post-reactions-compact');
          if (!container || container.dataset.postId != this.postId) {
            this.showAllReactions = false;
          }
        }
      });
    },
    
    // Toggle a reaction (add, update, or remove)
    async toggleReaction(type) {
      if (this.loading) return;
      
      try {
        this.loading = true;
        
        const response = await fetch(`/api/reactions/post/${this.postId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType: type })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Store the user's reaction
          if (result.action === 'added' || result.action === 'updated') {
            this.userReaction = type;
          } else if (result.action === 'removed') {
            this.userReaction = null;
          }
          
          // Fetch fresh reaction counts from the server
          await this.refreshReactionCounts();
          
          // Hide all reactions after selection
          this.showAllReactions = false;
        } else {
          console.error('Failed to toggle reaction');
        }
      } catch (error) {
        console.error('Error toggling reaction:', error);
      } finally {
        this.loading = false;
      }
    },
    
    // Get updated reaction counts from the server
    async refreshReactionCounts() {
      try {
        const response = await fetch(`/api/reactions/post/${this.postId}`);
        
        if (response.ok) {
          const data = await response.json();
          // Update only the counts
          this.counts = data.counts;
        }
      } catch (error) {
        console.error('Error refreshing reaction counts:', error);
      }
    }
  };
};

// Make sure postReactions is available globally
window.postReactions = postReactions;
