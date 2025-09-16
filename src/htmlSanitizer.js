// HTML Sanitizer for safe rendering of AI responses
class HTMLSanitizer {
    constructor() {
        // Allowed HTML tags and their attributes
        this.allowedTags = {
            'strong': [],
            'em': [],
            'b': [],
            'i': [],
            'br': [],
            'p': [],
            'ul': [],
            'ol': [],
            'li': [],
            'h1': [],
            'h2': [],
            'h3': [],
            'h4': [],
            'h5': [],
            'h6': [],
            'blockquote': [],
            'code': [],
            'pre': [],
            'a': ['href', 'target'],
            'div': ['class'],
            'span': ['class']
        };
        
        // Allowed URL schemes for links
        this.allowedSchemes = ['http:', 'https:', 'mailto:'];
    }

    sanitize(html) {
        if (typeof html !== 'string') {
            return '';
        }

        // Create a temporary container
        const container = document.createElement('div');
        container.innerHTML = html;

        // Recursively clean the DOM
        this.cleanNode(container);

        return container.innerHTML;
    }

    cleanNode(node) {
        const children = Array.from(node.childNodes);
        
        for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Text nodes are safe, keep them
                continue;
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                
                if (this.allowedTags.hasOwnProperty(tagName)) {
                    // Clean attributes
                    this.cleanAttributes(child, this.allowedTags[tagName]);
                    // Recursively clean children
                    this.cleanNode(child);
                } else {
                    // Remove disallowed tags but keep their text content
                    const textContent = child.textContent;
                    const textNode = document.createTextNode(textContent);
                    child.parentNode.replaceChild(textNode, child);
                }
            } else {
                // Remove other node types (comments, etc.)
                child.remove();
            }
        }
    }

    cleanAttributes(element, allowedAttrs) {
        const attributes = Array.from(element.attributes);
        
        for (const attr of attributes) {
            if (!allowedAttrs.includes(attr.name)) {
                element.removeAttribute(attr.name);
            } else if (attr.name === 'href') {
                // Validate URLs
                if (!this.isValidUrl(attr.value)) {
                    element.removeAttribute(attr.name);
                }
            }
        }
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return this.allowedSchemes.includes(urlObj.protocol);
        } catch (e) {
            return false;
        }
    }

    // Safe method to set content with limited HTML support
    setSafeHTML(element, content) {
        const sanitized = this.sanitize(content);
        element.innerHTML = sanitized;
    }

    // Safe method to set text content only
    setSafeText(element, content) {
        element.textContent = content;
    }
}

// Export for use in the app
window.HTMLSanitizer = HTMLSanitizer;