"use client";
import { useRef, useState } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export interface RowAction {label:string;run:()=>unknown;danger?:boolean}
export function RowActions({label,items}:{label:string;items:RowAction[]}) {
  const [pending,setPending]=useState(false),busy=useRef(false),trigger=useRef<HTMLButtonElement>(null);
  return <DropdownMenu><DropdownMenuTrigger disabled={pending} render={<Button ref={trigger} variant="ghost" size="icon" aria-label={`Actions for ${label}`}/>}>{pending?<Loader2 className="animate-spin"/>:<MoreHorizontal/>}</DropdownMenuTrigger><DropdownMenuContent align="end" className="hms-overlay min-w-44">{items.map(item=><DropdownMenuItem key={item.label} variant={item.danger?'destructive':'default'} onClick={async()=>{if(busy.current)return;trigger.current?.focus();busy.current=true;setPending(true);try{await item.run();}catch(error){toast.error((error as Error).message);}finally{busy.current=false;setPending(false);}}}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
