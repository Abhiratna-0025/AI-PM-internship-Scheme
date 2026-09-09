const CACHE_NAME = "weathergpt-offline-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


// ===============================
// INSTALL
// ===============================

self.addEventListener(
    "install",
    (event) => {

        console.log(
            "WeatherGPT Service Worker installing..."
        );

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then((cache) => {

                    return cache.addAll(
                        APP_FILES
                    );

                })

        );

        self.skipWaiting();

    }
);


// ===============================
// ACTIVATE
// ===============================

self.addEventListener(
    "activate",
    (event) => {

        console.log(
            "WeatherGPT Service Worker activated."
        );

        event.waitUntil(

            caches.keys()
                .then((cacheNames) => {

                    return Promise.all(

                        cacheNames
                            .filter(
                                (name) =>
                                    name !== CACHE_NAME
                            )
                            .map(
                                (name) =>
                                    caches.delete(name)
                            )

                    );

                })

        );

        self.clients.claim();

    }
);


// ===============================
// FETCH
// ===============================

self.addEventListener(
    "fetch",
    (event) => {

        const request =
            event.request;


        // Only handle GET requests
        if (
            request.method !== "GET"
        ) {

            return;

        }


        event.respondWith(

            fetch(request)
                .then((response) => {

                    // Save successful responses
                    // for future offline use.

                    if (
                        response &&
                        response.status === 200
                    ) {

                        const responseClone =
                            response.clone();

                        caches.open(
                            CACHE_NAME
                        )
                        .then((cache) => {

                            cache.put(
                                request,
                                responseClone
                            );

                        });

                    }

                    return response;

                })
                .catch(() => {

                    // Internet unavailable.
                    // Try the cached version.

                    return caches.match(
                        request
                    )
                    .then((cachedResponse) => {

                        if (
                            cachedResponse
                        ) {

                            return cachedResponse;

                        }


                        // If the requested page
                        // isn't cached, return
                        // the main application.

                        return caches.match(
                            "./index.html"
                        );

                    });

                })

        );

    }
);