const RSS_URL = "https://feeds.transistor.fm/startups-are-hard";

fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`)
  .then(res => res.json())
  .then(data => {
    const episodes = data.items;
    if (!episodes.length) return;

    // Latest episode
    const latest = episodes[0];
    document.getElementById("latest-embed").innerHTML = `
      <h3>${latest.title}</h3>
      <iframe src="https://share.transistor.fm/e/${latest.guid.split('/').pop()}"
        width="100%" height="180" frameborder="0" scrolling="no"></iframe>
    `;

    // Episode list
    const list = document.getElementById("episode-list");
    episodes.forEach(ep => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${ep.link}" target="_blank">${ep.title}</a> — ${new Date(ep.pubDate).toLocaleDateString("uk-UA")}`;
      list.appendChild(li);
    });
  })
  .catch(err => {
    document.getElementById("latest-embed").textContent = "Failed to load episodes.";
    console.error(err);
  });

