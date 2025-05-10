// public/js/compose2.js
function composeApp() {
    return {
        content: '',
        dragover: false,
        submitting: null, // null, 'draft', or 'published'
        statusMessage: '',
        statusType: '',
        shareTelegram: true,
        shareBluesky: true,
        
        // Initialize
        init() {
          // Keyboard shortcuts
          document.addEventListener('keydown', (e) => {
            // Skip if user is in a form field that isn't the compose textarea
            if (document.activeElement.tagName === 'INPUT' || 
               (document.activeElement.tagName === 'TEXTAREA' && 
                !document.activeElement.classList.contains('compose-textarea'))) {
                return;
            }
            
            // Ctrl+Enter to publish
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.submitPost('published');
            }
            
            // Ctrl+S to save draft
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.submitPost('draft');
            }
          });
        },
        
        // Submit post (handles both draft and publish)
        async submitPost(status) {
            if (!this.content.trim()) {
                this.showStatus(`${status === 'draft' ? 'Draft' : 'Post'} must have content`, "error");
                return;
            }
            
            if (this.submitting) return; // Prevent double submission
            this.submitting = status;
            
            try {
                const response = await fetch('/compose2/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        content: this.content,
                        shareTelegram: this.shareTelegram,
                        shareBluesky: this.shareBluesky,
                        status: status
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    if (status === 'published') {
                        this.showStatus("Post published successfully!", "success");
                        
                        // Reset form
                        this.content = '';
                        
                        // Redirect to the post after a delay
                        setTimeout(() => {
                            window.location.href = `/p/${result.id}`;
                        }, 1500);
                    } else {
                        this.showStatus("Draft saved successfully!", "success");
                    }
                } else {
                    throw new Error(result.error || `Failed to ${status === 'draft' ? 'save draft' : 'publish post'}`);
                }
            } catch (error) {
                this.showStatus(`Error: ${error.message}`, "error");
            } finally {
                this.submitting = null;
            }
        },
        
        // Show status message
        showStatus(message, type = 'success') {
            this.statusMessage = message;
            this.statusType = type;
            
            if (type === 'success') {
                setTimeout(() => {
                    this.statusMessage = '';
                }, 3000);
            }
        }
    };
}
