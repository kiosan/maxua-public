// Handle post navigation for timeline view
document.addEventListener('DOMContentLoaded', function() {
  // Delegate click handling for post content
  document.body.addEventListener('click', function(event) {
    // Find if we clicked on a post or within a post
    const clickablePost = event.target.closest('.clickable-post');
    
    if (clickablePost) {
      // Check if we clicked on a link inside the post
      const clickedLink = event.target.closest('a');
      const clickedPostUrl = event.target.closest('.post-url');
      
      // If we clicked a link, let it handle its own navigation
      if (clickedLink || clickedPostUrl) {
        // Don't do anything, let the link handle its own click
        return;
      }
      
      // Get the permalink from the data attribute
      const permalink = clickablePost.getAttribute('data-permalink');
      
      if (permalink) {
        // Navigate to the post page
        window.location.href = permalink;
      }
    }
  });
});
