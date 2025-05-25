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
    isMobile: window.innerWidth < 768, // Track if we're on mobile
    showThankYou: false, // Show thank you message
    thankYouMessage: '', // The thank you message to show
    
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
          
          // Check if we're on mobile or desktop and set up appropriate listeners
          this.setupHoverListeners();
          
          // Update mobile status on window resize
          window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            // If changing between mobile and desktop, update listeners
            if (wasMobile !== this.isMobile) {
              this.setupHoverListeners();
            }
          });
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
    
    // Set up hover listeners for desktop
    setupHoverListeners() {
      // Find the reactions container for this post
      const container = document.querySelector(`.post-reactions-compact[data-post-id="${this.postId}"]`);
      if (!container) return;
      
      // Clear any existing listeners
      container.onmouseenter = null;
      container.onmouseleave = null;
      
      if (!this.isMobile) {
        // Desktop: use hover
        container.onmouseenter = () => {
          this.showAllReactions = true;
        };
        
        container.onmouseleave = () => {
          this.showAllReactions = false;
        };
      }
    },
    
    // Random thank you messages
    thankYouMessages: [
      "Дякую, що приділили увагу!", 
      "Оце так реакція! Дякую", 
      "Ви зробили мій день кращим", 
      "Мені приємно, що ви відреагували", 
      "Обожнюю ваші реакції!", 
      "О, дякую за увагу!", 
      "Ваша реакція - як подарунок", 
      "Ваша реакція має значення",
      "Без вас цей пост - просто текст",
      "Оце так честь, дякую!"
    ],
    
    // Get a random thank you message
    getRandomThankYou() {
      const randomIndex = Math.floor(Math.random() * this.thankYouMessages.length);
      return this.thankYouMessages[randomIndex];
    },
    
    // Show thank you notification
    showThankYouNotification() {
      this.thankYouMessage = this.getRandomThankYou();
      this.showThankYou = true;
      
      // Hide after 2 seconds
      setTimeout(() => {
        this.showThankYou = false;
      }, 2000);
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
            // Show thank you message when reaction is added or updated
            this.showThankYouNotification();
            
            // Only hide reactions on mobile after adding/updating
            if (this.isMobile) {
              this.showAllReactions = false;
            }
          } else if (result.action === 'removed') {
            this.userReaction = null;
            // Keep reactions visible on desktop if we're hovering
            // Only hide on mobile after removing
            if (this.isMobile) {
              this.showAllReactions = false;
            }
          }
          
          // Fetch fresh reaction counts from the server
          await this.refreshReactionCounts();
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
