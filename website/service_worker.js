
const cacheName = "JummBox";

self.addEventListener("install", function(event) {
	event.waitUntil(
		caches.open(cacheName).then(function(cache) {
			return cache.addAll([
				"/",
				"/beepbox_editor.min.js",
				//"/2_3/",
				//"/2_3/beepbox_editor.min.js",
				"/player/",
				"/player/beepbox_player.min.js",
			]).then(() => self.skipWaiting());
		})
	);
});

self.addEventListener("activate", function(event) {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function(event) {
	if (event.request.method != "GET") return;
	
	event.respondWith(
		caches.open(cacheName).then(function(cache) {
			return fetch(event.request).then(function(response) {
				// If this is a local resource or related to google fonts, add
				// it to the permanent cache.
				if (event.request.url.startsWith(self.location.origin) ||
					event.request.url.startsWith("https://fonts.googleapis.com") ||
					event.request.url.startsWith("https://fonts.gstatic.com"))
				{
					cache.put(event.request, response.clone());
				}
				return response;
			}).catch(function() {
				return cache.match(event.request);
			});
		})
	);
});
