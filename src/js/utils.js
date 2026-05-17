function getForcedDownloadName(blob, fileName) {
    const defaultName = 'insta';

    if (typeof fileName === 'string' && fileName.includes('.')) {
        const extension = fileName.split('.').pop();
        if (extension) return `${defaultName}.${extension}`;
    }

    const blobType = typeof blob?.type === 'string' ? blob.type : '';
    if (blobType.includes('video/')) return `${defaultName}.mp4`;
    if (blobType.includes('image/')) return `${defaultName}.jpg`;

    return defaultName;
}

function saveFile(blob, fileName) {
    const a = document.createElement('a');
    a.download = getForcedDownloadName(blob, fileName);
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
}

function getCookieValue(name) {
    return document.cookie.split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1];
}

function getFetchOptions() {
    return {
        headers: {
            'x-csrftoken': getCookieValue('csrftoken'),
            'x-ig-app-id': '936619743392459',
            'x-ig-www-claim': sessionStorage.getItem('www-claim-v2'),
            'x-requested-with': 'XMLHttpRequest'
        },
        referrer: window.location.href,
        referrerPolicy: 'strict-origin-when-cross-origin',
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    };
}

function getValueByKey(obj, key) {
    if (typeof obj !== 'object' || obj === null) return null;
    const stack = [obj];
    const visited = new Set();
    while (stack.length) {
        const current = stack.pop();
        if (visited.has(current)) continue;
        visited.add(current);
        try {
            if (current[key] !== undefined) return current[key];
        } catch (error) {
            if (error.name === 'SecurityError') continue;
            console.log(error);
        }
        for (const value of Object.values(current)) {
            if (typeof value === 'object' && value !== null) {
                stack.push(value);
            }
        }
    }
    return null;
}

const FETCH_TIMEOUT_MS = 15000;
const FETCH_RETRY_COUNT = 2;
const FETCH_RETRY_DELAY_MS = 700;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, fetchOptions = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...fetchOptions, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

function shouldRetryResponse(status) {
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithTimeoutAndRetry(url, fetchOptions = {}, config = {}) {
    const timeoutMs = config.timeoutMs ?? FETCH_TIMEOUT_MS;
    const retries = config.retries ?? FETCH_RETRY_COUNT;
    const retryDelayMs = config.retryDelayMs ?? FETCH_RETRY_DELAY_MS;

    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, fetchOptions, timeoutMs);
            if (!response.ok && shouldRetryResponse(response.status) && attempt < retries) {
                await wait(retryDelayMs * (attempt + 1));
                continue;
            }
            return response;
        } catch (error) {
            lastError = error;
            if (attempt >= retries) break;
            await wait(retryDelayMs * (attempt + 1));
        }
    }

    throw lastError || new Error('Network request failed');
}

async function saveMedia(url, fileName, options = {}) {
    const showToast = options.showToast !== false;
    const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
    const retries = options.retries ?? FETCH_RETRY_COUNT;
    const retryDelayMs = options.retryDelayMs ?? FETCH_RETRY_DELAY_MS;

    let loadingToast = null;
    if (showToast && window.toast) {
        loadingToast = window.toast.loading({ title: 'Downloading', description: fileName || 'Media item' });
    }

    try {
        const response = await fetchWithTimeoutAndRetry(url, {}, { timeoutMs, retries, retryDelayMs });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        saveFile(blob, fileName);

        if (showToast && window.toast) {
            window.toast.remove(loadingToast);
            window.toast.success({ title: 'Download Complete' });
        }
        return { ok: true };
    } catch (error) {
        console.log(error);
        if (showToast && window.toast) {
            window.toast.remove(loadingToast);
            window.toast.error({ title: 'Download Failed', description: 'Could not fetch the media file.' });
        }
        return { ok: false, error };
    }
}

async function downloadMediaBatch(items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) return;

    const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
    const retries = options.retries ?? FETCH_RETRY_COUNT;
    const retryDelayMs = options.retryDelayMs ?? FETCH_RETRY_DELAY_MS;

    const total = items.length;
    let downloaded = 0;
    let failed = 0;

    let progressToast = null;
    if (window.toast) {
        progressToast = window.toast.loading({
            title: 'Downloading media',
            description: `0/${total} downloaded`
        });
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const result = await saveMedia(item.url, item.fileName, {
            showToast: false,
            timeoutMs,
            retries,
            retryDelayMs
        });

        if (result.ok) downloaded += 1;
        else failed += 1;

        if (window.toast && progressToast) {
            window.toast.update(progressToast, {
                title: 'Downloading media',
                description: `${downloaded}/${total} downloaded${failed > 0 ? ` • ${failed} failed` : ''}`
            });
        }
    }

    if (window.toast && progressToast) {
        window.toast.remove(progressToast);
        if (failed === 0) {
            window.toast.success({ title: 'Download Complete', description: `${downloaded}/${total} downloaded` });
        } else {
            window.toast.error({ title: 'Download Finished', description: `${downloaded}/${total} downloaded • ${failed} failed` });
        }
    }
}

function isValidJson(string) {
    try {
        JSON.parse(string);
        return true;
    } catch {
        return false;
    }
}