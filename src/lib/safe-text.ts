import DOMPurify from 'dompurify';

/**
 * Safely renders text with basic markdown-style formatting while preventing XSS attacks
 * Supports: **bold** and *italic* formatting
 */
export const renderSafeText = (text: string): string => {
  if (!text) return '';
  
  // First, escape any existing HTML to prevent XSS
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  // Then apply safe markdown-style formatting
  let formattedText = escapedText
    // Convert **text** to <strong>text</strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert *text* to <em>text</em> (but not if it's part of **)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Sanitize the result to ensure only safe HTML tags remain
  const sanitized = DOMPurify.sanitize(formattedText, {
    ALLOWED_TAGS: ['strong', 'em'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  return sanitized;
};

/**
 * Creates a safe HTML object for use with dangerouslySetInnerHTML
 * Only use this for content that has been processed by renderSafeText
 */
export const createSafeHTML = (safeContent: string) => {
  return { __html: safeContent };
};