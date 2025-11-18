<script lang="ts">
  import { getContext, onMount, onDestroy } from 'svelte';
  import type { Writable } from 'svelte/store';

  const { open, close } = getContext<{ open: Writable<boolean>; close: () => void }>('modal');

  let portalTarget: HTMLElement;
  let overlayElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let closeButtonElement: HTMLButtonElement;

  onMount(() => {
    // Create portal target outside shadow DOM
    portalTarget = document.createElement('div');
    portalTarget.setAttribute('data-reservine-modal-portal', 'true');
    document.body.appendChild(portalTarget);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && $open) {
        close();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      if (portalTarget && portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
      }
    };
  });

  $: if (portalTarget) {
    if ($open) {
      // Create overlay
      if (!overlayElement) {
        overlayElement = document.createElement('div');
        overlayElement.className = 'r-modal-overlay';
        overlayElement.addEventListener('click', close);
      }

      // Create close button
      if (!closeButtonElement) {
        closeButtonElement = document.createElement('button');
        closeButtonElement.className = 'r-modal-close';
        closeButtonElement.setAttribute('aria-label', 'Close modal');
        closeButtonElement.innerHTML = `
          <svg style="width:24px; height:24px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        `;
        closeButtonElement.addEventListener('click', close);
      }

      // Create content container
      if (!contentElement) {
        contentElement = document.createElement('div');
        contentElement.className = 'r-modal-content';
        contentElement.innerHTML = `<div class="r-modal-slot-content"></div>`;
      }

      // Append close button first, then content (so close button appears above)
      contentElement.appendChild(closeButtonElement);

      portalTarget.appendChild(overlayElement);
      portalTarget.appendChild(contentElement);

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Clean up
      if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
      }
      if (closeButtonElement && closeButtonElement.parentNode) {
        closeButtonElement.parentNode.removeChild(closeButtonElement);
      }
      if (contentElement && contentElement.parentNode) {
        contentElement.parentNode.removeChild(contentElement);
      }
      document.body.style.overflow = '';
    }
  }

  onDestroy(() => {
    if (overlayElement) {
      overlayElement.removeEventListener('click', close);
    }
    if (closeButtonElement) {
      closeButtonElement.removeEventListener('click', close);
    }
    document.body.style.overflow = '';
  });

  export function getContentElement() {
    return contentElement?.querySelector('.r-modal-slot-content');
  }
</script>
