
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Save, X } from "lucide-react";

type Unit = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
};

const UnitManager = () => {
  const { toast } = useToast();
  const [units, setUnits] = useState<Unit[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
  });

  const loadUnits = async () => {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast({
        title: "Error loading units",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setUnits(data || []);
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const resetCreateForm = () => {
    setForm({
      name: "",
      code: "",
      description: "",
      status: "active",
    });
  };

  const startEdit = (u: Unit) => {
    setEditingId(u.id);
    setEditForm({
      name: u.name,
      code: u.code || "",
      description: u.description || "",
      status: u.status || "active",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const createUnit = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Validation error",
        description: "Unit name is required.",
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("units").insert({
      name: form.name.trim(),
      code: form.code?.trim() || null,
      description: form.description?.trim() || null,
      status: form.status,
    });

    setCreating(false);

    if (error) {
      toast({
        title: "Error creating unit",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Unit created" });
    resetCreateForm();
    setShowCreate(false);
    loadUnits();
  };

  const updateUnit = async (id: string) => {
    if (!editForm.name.trim()) {
      toast({
        title: "Validation error",
        description: "Unit name is required.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("units")
      .update({
        name: editForm.name.trim(),
        code: editForm.code?.trim() || null,
        description: editForm.description?.trim() || null,
        status: editForm.status,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating unit",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Unit updated" });
    setEditingId(null);
    loadUnits();
  };

  const deleteUnit = async (id: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) return;

    const { error } = await supabase.from("units").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting unit",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Unit deleted" });
    loadUnits();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Unit Management</span>
            <Button variant={showCreate ? "outline" : "default"} onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? (
                <span className="inline-flex items-center gap-2">
                  <X className="h-4 w-4" /> Cancel
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> New Unit
                </span>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        {showCreate && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., North Wing"
                />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="e.g., NW-01"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description..."
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={createUnit} disabled={creating}>
                <Save className="h-4 w-4 mr-2" />
                Create Unit
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Units</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No units found. Create your first unit to get started.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <div key={u.id} className="p-4 border rounded-lg">
                    {!isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">{u.name}</div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(u)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteUnit(u.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {u.code && <div className="text-sm text-gray-600">Code: {u.code}</div>}
                        {u.description && <div className="text-sm text-gray-600">{u.description}</div>}
                        <div className="text-xs text-gray-500">Status: {u.status}</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input
                            value={editForm.code}
                            onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={editForm.description}
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => updateUnit(u.id)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UnitManager;
