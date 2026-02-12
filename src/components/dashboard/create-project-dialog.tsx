"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface CreateProjectDialogProps {
  /** Optional trigger element. If not provided, renders a default button. */
  trigger?: React.ReactNode;
  /** Called after successful creation with the new project ID */
  onCreated?: (projectId: string) => void;
}

export function CreateProjectDialog({ trigger, onCreated }: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && domain.trim() && brandName.trim() && !saving;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim(),
          brandName: brandName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        return;
      }

      const project = await res.json();
      setOpen(false);
      setName("");
      setDomain("");
      setBrandName("");

      if (onCreated) {
        onCreated(project.id);
      } else {
        router.push(`/dashboard?projectId=${project.id}`);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a project to start tracking your brand&apos;s visibility across AI engines.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Project Name</Label>
            <Input
              id="create-name"
              placeholder="My Company"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-domain">Domain</Label>
            <Input
              id="create-domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The domain Rangefinder will look for in AI citations
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-brand">Brand Name</Label>
            <Input
              id="create-brand"
              placeholder="My Company"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The brand name to detect in AI-generated text
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {saving ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
