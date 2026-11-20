"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type Confirmation = { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
const Context = createContext<(options: Confirmation | string) => Promise<boolean>>(async () => false);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<Confirmation | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback((value: Confirmation | string) => {
    if (resolve.current) return Promise.resolve(false);
    setOptions(typeof value === 'string' ? { title: value } : value);
    return new Promise<boolean>(done => { resolve.current = done; });
  }, []);
  const finish = useCallback((accepted: boolean) => {
    const done = resolve.current; resolve.current = null; setOptions(null); done?.(accepted);
  }, []);
  useEffect(() => () => { resolve.current?.(false); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (document.querySelector('form[data-dirty="true"]')) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => {
    let replay = false;
    const navigate = async (event: MouseEvent) => {
      if (replay || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.href === location.href || !document.querySelector('form[data-dirty="true"]')) return;
      event.preventDefault(); event.stopPropagation();
      if (await confirm({ title: 'Leave with unsaved changes?', description: 'Your unsaved form changes will be lost.', confirmLabel: 'Leave page', destructive: true })) {
        document.querySelectorAll<HTMLFormElement>('form[data-dirty="true"]').forEach(form => { form.reset(); form.setAttribute('data-dirty', 'false'); });
        replay = true; anchor.click(); replay = false;
      }
    };
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [confirm]);
  return <Context.Provider value={confirm}>{children}<AlertDialog open={!!options} onOpenChange={open => { if (!open) finish(false); }}><AlertDialogContent className="hms-overlay"><AlertDialogHeader><AlertDialogTitle>{options?.title}</AlertDialogTitle><AlertDialogDescription>{options?.description || 'Review this action before continuing.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={() => finish(false)}>Cancel</Button><Button variant={options?.destructive ? 'destructive' : 'default'} onClick={() => finish(true)}>{options?.confirmLabel || 'Confirm'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></Context.Provider>;
}
export function useConfirm() { return useContext(Context); }
export function useGuardedNavigate() {
  const router = useRouter(), confirm = useConfirm();
  return async (href: string) => {
    if (document.querySelector('form[data-dirty="true"]') && !await confirm({ title: 'Leave with unsaved changes?', description: 'Your unsaved form changes will be lost.', confirmLabel: 'Leave page', destructive: true })) return false;
    document.querySelectorAll<HTMLFormElement>('form[data-dirty="true"]').forEach(form => { form.reset(); form.setAttribute('data-dirty', 'false'); });
    router.push(href); return true;
  };
}
