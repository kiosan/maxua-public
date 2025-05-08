// public/js/compose2.js
function composeApp() {
    return {
        content: '',
        attachments: [],
        dragover: false,
        publishing: false,
        statusMessage: '',
        statusType: '',
        
        // Initialize
        init() {
            // Listen for paste events on the entire document
            document.addEventListener('paste', (e) => {
                // Only catch global pastes if we're not focused in the main content or another input
                if (document.activeElement !== document.querySelector('.compose-textarea') &&
                    document.activeElement.tagName !== 'INPUT' && 
                    document.activeElement.tagName !== 'TEXTAREA') {
                    this.handleGlobalPaste(e);
                }
            });
        },
        
        // Focus the hidden paste area
        focusPasteArea() {
            this.$refs.pasteArea.focus();
        },
        
        // Handle paste in the hidden area
        handlePaste(e) {
            if (e.clipboardData) {
                // Check for HTML content
                const html = e.clipboardData.getData('text/html');
                if (html) {
                    e.preventDefault();
                    this.addAttachment('html', html);
                } else {
                    // Fallback to plain text
                    const text = e.clipboardData.getData('text/plain');
                    if (text) {
                        e.preventDefault();
                        this.addAttachment('html', `<p>${text.replace(/\n/g, '</p><p>')}</p>`);
                    }
                }
            }
        },
        
        // Handle paste events in the main post textarea
        handlePasteInPost(e) {
            // We don't prevent default here so normal paste still works
            // But we check if it has HTML to optionally add as attachment
            if (e.clipboardData) {
                const html = e.clipboardData.getData('text/html');
                if (html && html.includes('<')) {
                    // Ask user if they want to add as attachment instead
                    if (confirm("Add rich text as an attachment instead?")) {
                        e.preventDefault();
                        this.addAttachment('html', html);
                    }
                }
            }
        },
        
        // Handle global paste events
        handleGlobalPaste(e) {
            if (e.clipboardData) {
                const html = e.clipboardData.getData('text/html');
                if (html) {
                    e.preventDefault();
                    this.addAttachment('html', html);
                }
            }
        },
        
        // Handle drag and drop
        handleDrop(e) {
            this.dragover = false;
            
            // Check for HTML content in the drop data
            if (e.dataTransfer.types.includes('text/html')) {
                const html = e.dataTransfer.getData('text/html');
                if (html) {
                    this.addAttachment('html', html);
                }
            } else if (e.dataTransfer.types.includes('text/plain')) {
                const text = e.dataTransfer.getData('text/plain');
                if (text) {
                    // Convert plain text to HTML paragraphs
                    this.addAttachment('html', `<p>${text.replace(/\n/g, '</p><p>')}</p>`);
                }
            }
        },
        
        // Add an attachment
        addAttachment(type, content) {
            this.attachments.push({
                type: type,
                content: content
            });
        },
        
        // Remove an attachment - no confirmation as requested
        removeAttachment(index) {
            this.attachments.splice(index, 1);
        },
        
        // Basic HTML sanitizer - this should be replaced with a proper library
        sanitizeHTML(html) {
            // This is a VERY basic sanitizer for preview only
            // The actual sanitization should happen server-side
            return html
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/on\w+="[^"]*"/g, '')
                .replace(/on\w+='[^']*'/g, '')
                .replace(/on\w+=\w+/g, '');
        },
        
        // Publish the post
        async publishPost() {
            if (!this.content.trim() && this.attachments.length === 0) {
                this.showStatus("Post must have either content or attachments", "error");
                return;
            }
            
            this.publishing = true;
            
            try {
                const response = await fetch('/compose2/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        content: this.content,
                        attachments: this.attachments
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    this.showStatus("Post published successfully!", "success");
                    
                    // Reset form
                    this.content = '';
                    this.attachments = [];
                    
                    // Redirect to the post after a delay
                    setTimeout(() => {
                        window.location.href = `/p/${result.id}`;
                    }, 1500);
                } else {
                    throw new Error(result.error || "Failed to publish post");
                }
            } catch (error) {
                this.showStatus(`Error: ${error.message}`, "error");
            } finally {
                this.publishing = false;
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
