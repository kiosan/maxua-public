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
        drafts: [],
        loadingDrafts: false,
        
        // Initialize
        async init() {
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
            
            // Load drafts on page load
            await this.loadDrafts();
        },
        
        // Load drafts from server
        async loadDrafts() {
            if (this.loadingDrafts) return;
            this.loadingDrafts = true;
            
            try {
                const response = await fetch('/compose/drafts', {
                    credentials: 'include'
                });
                
                if (response.ok) {
                    this.drafts = await response.json();
                } else {
                    console.error('Failed to load drafts');
                }
            } catch (error) {
                console.error('Error loading drafts:', error);
            } finally {
                this.loadingDrafts = false;
            }
        },
        
        // Select and load a draft
        selectDraft(draft) {
            
            this.content = draft.content;
            this.currentDraftId = draft.id; // Track which draft we're editing
            
            // Trigger input event to resize textarea
            const textarea = document.querySelector('.compose-textarea');
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 600) + 'px';

                // Scroll to textarea with smooth behavior
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                textarea.focus();
            }
        },

        async deleteDraft(draftId) {
            try {
                const response = await fetch(`/compose/drafts/${draftId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    // Remove from local drafts array
                    this.drafts = this.drafts.filter(draft => draft.id !== draftId);
                    this.showStatus("Draft deleted", "success");
                } else {
                    this.showStatus("Failed to delete draft", "error");
                }
            } catch (error) {
                console.error('Error deleting draft:', error);
                this.showStatus("Error deleting draft", "error");
            }
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
                const body = {
                    content: this.content,
                    shareTelegram: this.shareTelegram,
                    shareBluesky: this.shareBluesky,
                    status: status
                };
                
                // Include draftId if we're editing an existing draft
                if (this.currentDraftId && status === 'published') {
                    body.draftId = this.currentDraftId;
                }
                
                const response = await fetch('/compose/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            
                const result = response.json();
                
                if (response.ok) {
                    if (status === 'published') {
                        this.showStatus("Post published successfully!", "success");
                        
                        // Reset form
                        this.content = '';
                        
                        // Reload drafts to remove the one that was just published
                        await this.loadDrafts();
                        
                        // Redirect to the post after a delay
                        setTimeout(() => {
                            window.location.href = `/p/${result.id}`;
                        }, 1500);
                    } else {
                        this.showStatus("Draft saved successfully!", "success");
                        
                        // Reload drafts to show the new one
                        await this.loadDrafts();
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
