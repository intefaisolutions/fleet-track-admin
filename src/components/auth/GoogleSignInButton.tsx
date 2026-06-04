import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            },
          ) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client';

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export function GoogleSignInButton({
  clientId,
  onCredential,
  disabled,
}: {
  clientId: string;
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId || disabled) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res.credential) onCredential(res.credential);
          },
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 400,
          text: 'continue_with',
          shape: 'rectangular',
        });
        setReady(true);
      })
      .catch(() => setReady(false));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <p className="text-center text-xs text-amber-700">
        Google sign-in is not configured (set VITE_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return (
    <div
      className={`flex min-h-[44px] w-full items-center justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <div ref={containerRef} className="w-full max-w-full overflow-hidden" />
      {!ready && !disabled && (
        <span className="text-xs text-slate-400">Loading Google...</span>
      )}
    </div>
  );
}
