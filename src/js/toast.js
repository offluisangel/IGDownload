// src/js/toast.js
console.log('%c[IGDownloader] ✅ Content script loaded OK', 'color: lime; font-size: 16px; font-weight: bold;');
class ToastService {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'sileo-toaster';
    this.maxVisibleToasts = 4;
    document.body.appendChild(this.container);
  }

  createIconElement(type) {
    const iconContainer = document.createElement('div');
    iconContainer.className = `sileo-icon sileo-icon-${type}`;
    
    // SVG icons aligned with minimalist design
    let svg = '';
    if (type === 'success') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'loading') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
    }
    
    iconContainer.innerHTML = svg;
    return iconContainer;
  }

  show(options, type = 'success') {
    const normalized = typeof options === 'string' ? { title: options } : (options || {});
    const toast = document.createElement('div');
    toast.className = 'sileo-toast';
    toast.dataset.toastType = type;

    if (type) {
      toast.appendChild(this.createIconElement(type));
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'sileo-content';

    const title = document.createElement('p');
    title.className = 'sileo-title';
    title.textContent = normalized.title || '';
    contentWrapper.appendChild(title);

    if (normalized.description) {
      const desc = document.createElement('p');
      desc.className = 'sileo-description';
      desc.textContent = normalized.description;
      contentWrapper.appendChild(desc);
    }

    toast.appendChild(contentWrapper);
    
    // Insert at top to stack from top right
    this.container.prepend(toast);
    this.enforceMaxToasts();

    // Auto remove logic (unless loading type which is manually resolved)
    if (type !== 'loading') {
      setTimeout(() => {
        this.remove(toast);
      }, normalized.duration || 3500);
    }

    return toast;
  }

  success(options) { return this.show(options, 'success'); }
  error(options) { return this.show(options, 'error'); }
  loading(options) { return this.show(options, 'loading'); }

  update(toastElement, options = {}) {
    if (!toastElement || !toastElement.parentNode) return;

    const titleElement = toastElement.querySelector('.sileo-title');
    if (titleElement && options.title !== undefined) {
      titleElement.textContent = options.title;
    }

    let descElement = toastElement.querySelector('.sileo-description');
    if (options.description) {
      if (!descElement) {
        const contentWrapper = toastElement.querySelector('.sileo-content');
        if (!contentWrapper) return;
        descElement = document.createElement('p');
        descElement.className = 'sileo-description';
        contentWrapper.appendChild(descElement);
      }
      descElement.textContent = options.description;
    } else if (descElement && options.description === '') {
      descElement.remove();
    }
  }

  enforceMaxToasts() {
    while (this.container.children.length > this.maxVisibleToasts) {
      const toasts = Array.from(this.container.children);
      let candidate = null;

      for (let i = toasts.length - 1; i >= 0; i--) {
        if (toasts[i].dataset.toastType !== 'loading') {
          candidate = toasts[i];
          break;
        }
      }

      if (!candidate) {
        candidate = this.container.lastElementChild;
      }

      if (!candidate) break;
      candidate.remove();
    }
  }

  remove(toastElement) {
    if (!toastElement) return;
    if (!toastElement.parentNode) return;

    // Fallback removal for pages/environments where animation events are suppressed.
    let removed = false;
    const finalizeRemoval = () => {
      if (removed) return;
      removed = true;
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    };

    toastElement.classList.add('sileo-exit');
    toastElement.addEventListener('animationend', finalizeRemoval, { once: true });

    // If animation does not fire, force removal after a short delay.
    setTimeout(finalizeRemoval, 500);
  }
}

// Attach globally
window.toast = new ToastService();
