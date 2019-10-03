
const cacheName = "beeps 0.0";
self.addEventListener("install", event => {
	event.waitUntil(
		caches.open(cacheName).then(cache => {
			return cache.addAll([
				"/",
				"/beepbox_editor.min.js",
				"/2_3/",
				"/2_3/beepbox_editor.min.js",
				"/player/",
				"/player/beepbox_player.min.js",
			]).then(() => self.skipWaiting());
		})
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
	if (event.request.method != "GET") return;
	
	event.respondWith(async function() {
		// Try to get the response from a cache.
		const cache = await caches.open(cacheName);
		const cachedResponse = await cache.match(event.request);
		if (cachedResponse) {
			
			// If we found a match in the cache, return it, but also update
			// the entry in the cache in the background in case it changed.
			event.waitUntil(cache.add(event.request));
			
			return cachedResponse;
		}
		
		// If we didn't find a match in the cache, use the network.
		return fetch(event.request).then(function(response) {
			
			// If this is a local resource or related to google fonts, add it
			// to the permanent cache.
			if (event.request.url.startsWith(self.location.origin) ||
				event.request.url.startsWith("https://fonts.googleapis.com") ||
				event.request.url.startsWith("https://fonts.gstatic.com")) {
				cache.put(event.request, response.clone());
			}

			return response;
		})
	}());
});
