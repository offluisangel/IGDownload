// src/js/picker.js

class MediaPicker {
    constructor() {
        this.overlay = null;
        this.selectedItems = new Set();
        this.mediaItems = [];
        this.onDownload = null;
        this.isSubmitting = false;
    }

    /**
     * Show the picker with a list of media items.
     * @param {Array} items - Array of { url, thumbnailUrl, isVideo, fileName }
     * @param {Function} onDownload - Called with array of selected items after confirm
     * @param {Object} [options]
     * @param {boolean} [options.preselectAll=true] - Whether all items start selected
     */
    show(items, onDownload, options = {}) {
        if (this.overlay) this.destroy();

        const { preselectAll = true } = options;
        this.mediaItems = items;
        this.onDownload = onDownload;
        this.isSubmitting = false;
        this.selectedItems = new Set();
        if (preselectAll) {
            items.forEach((_, i) => this.selectedItems.add(i));
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'ig-picker-overlay';

        // Close on background click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.destroy();
        });

        const panel = document.createElement('div');
        panel.className = 'ig-picker-panel';

        // --- Header ---
        const header = document.createElement('div');
        header.className = 'ig-picker-header';
        header.innerHTML = `
            <div>
                <div class="ig-picker-title">Select media</div>
                <div class="ig-picker-subtitle">${items.length} item${items.length !== 1 ? 's' : ''} found</div>
            </div>
            <button class="ig-picker-close" id="ig-picker-close-btn" title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>`;
        header.querySelector('#ig-picker-close-btn').addEventListener('click', () => this.destroy());

        // --- Select All ---
        const selectAllRow = document.createElement('div');
        selectAllRow.className = 'ig-picker-select-all';
        
        const selectAllCheckbox = this._makeCheckbox(preselectAll && items.length > 0);
        const selectAllLabel = document.createElement('span');
        selectAllLabel.textContent = 'Select all';
        selectAllRow.appendChild(selectAllCheckbox);
        selectAllRow.appendChild(selectAllLabel);
        selectAllRow.addEventListener('click', () => {
            const allSelected = this.selectedItems.size === items.length;
            if (allSelected) {
                this.selectedItems.clear();
                selectAllCheckbox.classList.remove('selected');
            } else {
                items.forEach((_, i) => this.selectedItems.add(i));
                selectAllCheckbox.classList.add('selected');
            }
            this.overlay.querySelectorAll('.ig-picker-item').forEach((el, i) => {
                el.classList.toggle('selected', this.selectedItems.has(i));
            });
            this._updateDownloadBtn();
        });

        // --- Grid ---
        const grid = document.createElement('div');
        grid.className = 'ig-picker-grid';

        items.forEach((item, index) => {
            const cell = document.createElement('div');
            cell.className = 'ig-picker-item';
            if (this.selectedItems.has(index)) {
                cell.classList.add('selected');
            }

            const img = document.createElement('img');
            img.src = item.thumbnailUrl;
            img.loading = 'lazy';
            cell.appendChild(img);

            // Checkmark indicator
            const check = document.createElement('div');
            check.className = 'ig-check';
            check.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            cell.appendChild(check);

            // Video badge
            if (item.isVideo) {
                const badge = document.createElement('div');
                badge.className = 'ig-video-badge';
                badge.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Video`;
                cell.appendChild(badge);
            }

            cell.addEventListener('click', () => {
                if (this.selectedItems.has(index)) {
                    this.selectedItems.delete(index);
                    cell.classList.remove('selected');
                } else {
                    this.selectedItems.add(index);
                    cell.classList.add('selected');
                }
                // Update "select all" toggle
                const allSelected = this.selectedItems.size === items.length;
                selectAllCheckbox.classList.toggle('selected', allSelected);
                this._updateDownloadBtn();
            });

            grid.appendChild(cell);
        });

        // --- Footer ---
        const footer = document.createElement('div');
        footer.className = 'ig-picker-footer';

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'ig-picker-download-btn';
        downloadBtn.id = 'ig-picker-download-btn';
        downloadBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download ${items.length}`;
        downloadBtn.addEventListener('click', async () => {
            if (this.isSubmitting) return;

            const selected = [...this.selectedItems].sort().map(i => items[i]);
            if (selected.length === 0) return;

            this.isSubmitting = true;
            downloadBtn.disabled = true;

            const onDownloadHandler = this.onDownload;
            this.destroy();
            if (onDownloadHandler) await Promise.resolve(onDownloadHandler(selected));
        });
        footer.appendChild(downloadBtn);

        panel.appendChild(header);
        panel.appendChild(selectAllRow);
        panel.appendChild(grid);
        panel.appendChild(footer);
        this.overlay.appendChild(panel);
        document.body.appendChild(this.overlay);
    }

    _makeCheckbox(selected) {
        const el = document.createElement('div');
        el.className = 'ig-check' + (selected ? ' selected' : '');
        el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        return el;
    }

    _updateDownloadBtn() {
        const btn = this.overlay ? this.overlay.querySelector('#ig-picker-download-btn') : null;
        if (!btn) return;
        const count = this.selectedItems.size;
        btn.disabled = count === 0;
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download ${count > 0 ? count : ''}`;
    }

    destroy() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.selectedItems = new Set();
        this.isSubmitting = false;
    }
}

window.mediaPicker = new MediaPicker();
