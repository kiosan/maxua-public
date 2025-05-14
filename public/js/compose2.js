// Updated public/js/compose2.js with editing functionality
function composeApp() {
    return {
        content: '',
        metadata: {},       // Stores fields with key and value properties
        submitting: null,   // null, 'draft', or 'published'
        statusMessage: '',
        statusType: '',
        shareTelegram: true,
        shareBluesky: true,
        drafts: [],
        loadingDrafts: false,
        currentDraftId: null,
        isEditMode: false,
        editPostId: null,
        deletingDraft: null, // Track which draft is being deleted to prevent double deletion
        
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
                
                // Ctrl+Enter to publish/update
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.submitPost('published');
                }
                
                // Ctrl+S to save draft (only in non-edit mode)
                if ((e.ctrlKey || e.metaKey) && e.key === 's' && !this.isEditMode) {
                    e.preventDefault();
                    this.submitPost('draft');
                }
                
                // Escape to cancel edit
                if (e.key === 'Escape' && this.isEditMode) {
                    e.preventDefault();
                    this.resetForm();
                }
            });
            
            // Load drafts on page load (but not in edit mode)
            if (!this.isEditMode) {
                await this.loadDrafts();
            }
        },

      initWithData() {
        const dataElement = document.getElementById('edit-post-data');
        if (!dataElement || !dataElement.value) return;

        try {
          // Parse the JSON data from the hidden input
          const postData = JSON.parse(dataElement.value);

          // Set edit mode
          this.isEditMode = true;
          this.editPostId = postData.id;

          // Set content
          this.content = postData.content || '';

          // Parse and set metadata
          this.metadata = {};
          if (postData.metadata) {
            let metadataObj = {};

            // Handle stringified JSON
            if (typeof postData.metadata === 'string') {
              try {
                metadataObj = JSON.parse(postData.metadata);
              } catch (e) {
                console.error('Error parsing metadata JSON:', e);
              }
            } else {
              metadataObj = postData.metadata;
            }

            // Convert to our format with IDs
            Object.entries(metadataObj).forEach(([key, value]) => {
              const id = Date.now() + Math.random().toString().slice(2, 8);
              this.metadata[id] = { key, value: String(value) };
            });
          }

          // Add an empty field if none exists
          if (Object.keys(this.metadata).length === 0) {
            this.addEmptyMetadataField();
          }

          // Disable sharing options in edit mode - we don't reshare edited posts
          this.shareTelegram = false;
          this.shareBluesky = false;

          console.log('Initialized edit mode for post:', postData.id);
        } catch (error) {
          console.error('Error initializing edit data:', error);
          this.showStatus('Error loading post data for editing', 'error');
        }
      },

        // Metadata functions
        isValidKey(key) {
            if (!key) return false;
            return /^[a-zA-Z0-9_]+$/.test(key);
        },
        
        addEmptyMetadataField() {
            // Add an empty field with both key and value as properties
            const id = Date.now().toString();
            this.metadata[id] = { key: 'key', value: '' };
          //
            // Focus on the new field after it's added
            // We need to wait for the DOM to update
            setTimeout(() => {
                const fields = document.querySelectorAll('.metadata-key');
                if (fields.length > 0) {
                    // Focus on the last added field (most recent)
                    fields[fields.length - 1].focus();
                }
            }, 50); // Small delay to ensure DOM update
        },
        
        addMetadataWithKey(keyName) {
            // Add a field with a predefined key
            const id = Date.now().toString();
            this.metadata[id] = { key: keyName, value: '' };
        },
        
        removeMetadataField(id) {
            delete this.metadata[id];
        },
        
        // Load drafts from server
        async loadDrafts() {
            if (this.loadingDrafts || this.isEditMode) return;
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
            if (this.isEditMode) return; // Don't allow selecting drafts in edit mode
            
            this.content = draft.content;
            this.currentDraftId = draft.id;
            
            // Clear existing metadata
            this.metadata = {};
            
            // Load metadata if it exists
            if (draft.metadata && typeof draft.metadata === 'object') {
                // Convert flat metadata object to our structure with id keys
                Object.entries(draft.metadata).forEach(([key, value]) => {
                    const id = Date.now() + Math.random().toString().slice(2, 8);
                    this.metadata[id] = { key, value };
                });
            }
            
            // Add an empty field if none exists
            if (Object.keys(this.metadata).length === 0) {
                this.addEmptyMetadataField();
            }
            
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
            if (!draftId) return;
            
            try {
                // Stop propagation and prevent default form submission if called from an event
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                
                // Check if already deleting this draft
                if (this.deletingDraft === draftId) return;
                this.deletingDraft = draftId;
                
                const response = await fetch(`/compose/drafts/${draftId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    // Remove from local drafts array
                    this.drafts = this.drafts.filter(draft => draft.id !== draftId);
                    this.showStatus("Draft deleted", "success");
                    
                    // Clear current draft if it was the one deleted
                    if (this.currentDraftId === draftId) {
                        this.resetForm();
                    }
                } else {
                    this.showStatus("Failed to delete draft", "error");
                }
            } catch (error) {
                console.error('Error deleting draft:', error);
                this.showStatus("Error deleting draft", "error");
            } finally {
                this.deletingDraft = null;
            }
        },
                
        // Submit post (handles both draft and publish, as well as editing)
        async submitPost(status) {
            if (this.submitting) return; // Prevent double submission
            this.submitting = status;

            try {
                // Convert our metadata structure to a flat object
                const flatMetadata = {};
                Object.values(this.metadata).forEach(field => {
                    // Only include fields that have keys (valid or not)
                    if (field.key) {
                        flatMetadata[field.key] = field.value;
                    }
                });
                
                const body = {
                    content: this.content,
                    draftId: !this.isEditMode ? this.currentDraftId : null,
                    editPostId: this.isEditMode ? this.editPostId : null,
                    type: 'text', // Always set to text
                    metadata: flatMetadata,
                    shareTelegram: this.shareTelegram,
                    shareBluesky: this.shareBluesky,
                    status: status
                };
                
                const response = await fetch('/compose/post', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body)
                });
            
                const result = await response.json();
                
                if (response.ok) {
                    // Edit mode success message
                    if (this.isEditMode && status === 'published') {
                        this.showStatus("Post updated successfully!", "success");
                        
                        // Redirect to the post after a delay
                        setTimeout(() => {
                            window.location.href = `/p/${result.id}`;
                        }, 1500);
                    }
                    // Normal publish mode
                    else if (status === 'published') {
                        this.showStatus("Post published successfully!", "success");
                        
                        // Reset form
                        this.resetForm();
                        
                        // Reload drafts to remove the one that was just published
                        await this.loadDrafts();
                        
                        // Redirect to the post after a delay
                        setTimeout(() => {
                            window.location.href = `/p/${result.id}`;
                        }, 1500);
                    } 
                    // Draft save mode
                    else {
                        this.showStatus("Draft saved successfully!", "success");
                        
                        // Update the current draft ID
                        this.currentDraftId = result.id;
                        
                        // Redirect to compose page to reset the form after a delay
                        setTimeout(() => {
                            window.location.href = '/compose';
                        }, 1500);
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
        
        // Reset form fields
        resetForm() {
            // In edit mode, go back to the post
            if (this.isEditMode && this.editPostId) {
                window.location.href = `/p/${this.editPostId}`;
                return;
            }
            
            // For all other cases, redirect to compose to get a fresh state
            window.location.href = '/compose';
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
