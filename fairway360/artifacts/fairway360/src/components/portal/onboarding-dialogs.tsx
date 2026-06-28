import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import {
  useCreateStaff,
  useCreateMember,
  getListStaffQueryKey,
  getListClubMembersQueryKey,
} from "@workspace/api-client-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus-visible:ring-1 focus-visible:ring-accent";

/** Shared result panel: shows the invite link to copy after a person is added. */
function InviteResult({ name, link, emailed, onDone }: { name: string; link: string; emailed: boolean; onDone: () => void }) {
  const { toast } = useToast();
  const fullLink = link.startsWith("http") ? link : `${window.location.origin}${link}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-300">
        <Check className="h-5 w-5" /> <span className="font-medium">{name} added</span>
      </div>
      <p className="text-sm text-white/65">
        {emailed
          ? "An invite email with a set-password link has been sent."
          : "Share this one-time link so they can set their password (expires in 7 days):"}
      </p>
      <div className="flex items-center gap-2">
        <input readOnly value={fullLink} className={inputCls} data-testid="invite-link" />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={() => {
            navigator.clipboard?.writeText(fullLink);
            toast({ title: "Link copied" });
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <DialogFooter>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={onDone}>Done</Button>
      </DialogFooter>
    </div>
  );
}

export function AddEmployeeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateStaff();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"employee" | "supervisor">("employee");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<{ name: string; link: string; emailed: boolean } | null>(null);

  function reset() {
    setName(""); setEmail(""); setRole("employee"); setJobTitle(""); setPhone(""); setResult(null);
  }

  async function submit() {
    if (!name.trim() || !email.trim() || !jobTitle.trim()) return;
    try {
      const r = await create.mutateAsync({ data: { name, email, role, jobTitle, phone: phone || undefined } });
      qc.invalidateQueries({ queryKey: getListStaffQueryKey() });
      setResult({ name, link: r.inviteLink, emailed: r.emailed });
    } catch {
      toast({ title: "Could not add employee", description: "That email may already be in use.", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an employee</DialogTitle>
          <DialogDescription className="text-white/55">They'll get a link to set their own password.</DialogDescription>
        </DialogHeader>
        {result ? (
          <InviteResult {...result} onDone={() => { onOpenChange(false); reset(); }} />
        ) : (
          <div className="space-y-3">
            <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} data-testid="emp-name" />
            <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="emp-email" />
            <input className={inputCls} placeholder="Job title (e.g. Beverage Cart)" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} data-testid="emp-title" />
            <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="emp-phone" />
            <Select value={role} onValueChange={(v) => setRole(v as "employee" | "supervisor")}>
              <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="emp-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submit} disabled={!name.trim() || !email.trim() || !jobTitle.trim() || create.isPending} data-testid="emp-submit">
                {create.isPending ? "Adding…" : "Add & invite"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AddMemberDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("Standard");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<{ name: string; link: string; emailed: boolean } | null>(null);

  function reset() {
    setName(""); setEmail(""); setTier("Standard"); setPhone(""); setResult(null);
  }

  async function submit() {
    if (!name.trim() || !email.trim()) return;
    try {
      const r = await create.mutateAsync({ data: { name, email, tier, phone: phone || undefined } });
      qc.invalidateQueries({ queryKey: getListClubMembersQueryKey() });
      setResult({ name, link: r.inviteLink, emailed: r.emailed });
    } catch {
      toast({ title: "Could not add member", description: "That email may already be in use.", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription className="text-white/55">They'll get a link to set their own password.</DialogDescription>
        </DialogHeader>
        {result ? (
          <InviteResult {...result} onDone={() => { onOpenChange(false); reset(); }} />
        ) : (
          <div className="space-y-3">
            <input className={inputCls} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} data-testid="mem-name" />
            <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="mem-email" />
            <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="mem-phone" />
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="mem-tier"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Premier">Premier</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Junior">Junior</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submit} disabled={!name.trim() || !email.trim() || create.isPending} data-testid="mem-submit">
                {create.isPending ? "Adding…" : "Add & invite"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
