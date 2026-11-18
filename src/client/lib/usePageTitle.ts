// Sets the browser tab title for the current page.
import { useEffect } from 'react';

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
