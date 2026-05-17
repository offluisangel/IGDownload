const IG_BASE_URL = window.location.origin + '/';
const IG_SHORTCODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const IG_POST_REGEX = /\/(p|tv|reel|reels)\/([A-Za-z0-9_-]*)(\/?)/;
const IG_STORY_REGEX = /\/(stories)\/(.*?)\/(\d*)(\/?)/;
const IG_HIGHLIGHT_REGEX = /\/(stories)\/(highlights)\/(\d*)(\/?)/;
let isDownloadFlowRunning = false;

// Expose core API functions to window object
// You can use this object from the developer console to fetch/download media
window.InstaDownloaderCore = {
    downloadPostPhotos,
    downloadStoryPhotos,
    saveMedia,
    downloadMediaBatch,
    fetchWithTimeoutAndRetry,
    getPostIdFromApi,
    getPostPhotos
};

// Listen for clicks on the Extension Icon
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "DOWNLOAD_MEDIA") {
        if (isDownloadFlowRunning) {
            if (window.toast) window.toast.error({ title: 'Please wait', description: 'A download is already in progress.' });
            return;
        }

        isDownloadFlowRunning = true;
        const path = window.location.pathname;
        let analyzingToast = null;
        
        try {
            // Show analyzing toast and keep reference to remove it later
            if (window.toast) analyzingToast = window.toast.loading({ title: 'Analyzing...', description: 'Extracting media URL' });

            // Helper: show picker or download directly
            function showPickerAndDownload(data, type, id) {
                if (!data || !data.media || data.media.length === 0) {
                    if (window.toast) window.toast.error({ title: 'Not Found', description: 'Could not extract media from this content.' });
                    return;
                }
                const items = data.media.map((m, i) => ({
                    url: m.url,
                    thumbnailUrl: m.isVideo
                        ? (m.thumbnailUrl || m.url) // fallback
                        : m.url,
                    isVideo: m.isVideo,
                    fileName: `${data.user.username}_${type}_${id}_${i}.${m.isVideo ? 'mp4' : 'jpg'}`
                }));

                if (items.length === 1) {
                    // Only one item — download directly without picker
                    return saveMedia(items[0].url, items[0].fileName);
                } else {
                    // Multiple items — show the picker
                    const shouldPreselectAll = type !== 'post';
                    window.mediaPicker.show(items, (selected) => {
                        return downloadMediaBatch(selected);
                    }, { preselectAll: shouldPreselectAll });
                }
            }
            
            // 1. Post or Reels
            const postMatch = path.match(IG_POST_REGEX);
            if (postMatch) {
                const shortcode = postMatch[2];
                const data = await downloadPostPhotos(shortcode);
                await showPickerAndDownload(data, 'post', shortcode);
                return;
            }
            
            // 2. Highlights
            const highlightMatch = path.match(IG_HIGHLIGHT_REGEX);
            if (highlightMatch) {
                const highlightId = highlightMatch[3];
                const data = await downloadStoryPhotos(null, highlightId);
                await showPickerAndDownload(data, 'highlight', highlightId);
                return;
            }

            // 3. Story
            const storyMatch = path.match(IG_STORY_REGEX);
            if (storyMatch) {
                const username = storyMatch[2];
                const data = await downloadStoryPhotos(username);
                await showPickerAndDownload(data, 'story', username);
                return;
            }

            // If nothing matched
            if (window.toast) window.toast.error({ title: 'Not Supported', description: 'Open a specific post, reel, or story first.' });

        } catch (err) {
            console.error(err);
            if (window.toast) window.toast.error({ title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            if (window.toast) window.toast.remove(analyzingToast);
            isDownloadFlowRunning = false;
        }
    }
});


console.log("Instagram Downloader Core API initialized!");
console.log("Click the extension icon to download the currently viewed post or story.");