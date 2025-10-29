
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit, FileInput } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

interface DataEntryProps {
  data: any[];
  onDataUpdate: (data: any[]) => void;
}

interface FlockData {
  hatchery: string;
  name: string;
  flock: number;
  age: number;
  fertility: number;
  ifDev: number;
  hatch: number;
  hoi: number;
  hof: number;
  earlyDead: number;
}

const DataEntry = ({ data, onDataUpdate }: DataEntryProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<FlockData>({
    defaultValues: {
      hatchery: "",
      name: "",
      flock: 0,
      age: 0,
      fertility: 0,
      ifDev: 0,
      hatch: 0,
      hoi: 0,
      hof: 0,
      earlyDead: 0,
    },
  });

  const hatcheries = ["DHN", "SAM", "ENT", "NEW"];

  const onSubmit = (formData: FlockData) => {
    console.log("Form submitted with data:", formData);
    
    let updatedData = [...data];
    
    if (editingIndex !== null) {
      // Edit existing record
      updatedData[editingIndex] = formData;
      toast({
        title: "Record Updated",
        description: `Flock ${formData.flock} has been updated successfully.`,
      });
      setEditingIndex(null);
    } else {
      // Add new record
      updatedData.push(formData);
      toast({
        title: "Record Added",
        description: `New flock ${formData.flock} has been added successfully.`,
      });
    }
    
    onDataUpdate(updatedData);
    form.reset();
    setShowForm(false);
  };

  const handleEdit = (index: number) => {
    const record = data[index];
    form.reset(record);
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index: number) => {
    const updatedData = data.filter((_, i) => i !== index);
    onDataUpdate(updatedData);
    toast({
      title: "Record Deleted",
      description: "The record has been deleted successfully.",
      variant: "destructive",
    });
  };

  const handleNewEntry = () => {
    form.reset();
    setEditingIndex(null);
    setShowForm(true);
  };

  const handleCancel = () => {
    form.reset();
    setEditingIndex(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Entry</h2>
          <p className="text-gray-600">Add or edit hatchery performance data</p>
        </div>
        <Button onClick={handleNewEntry} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Record
        </Button>
      </div>

      {/* Data Entry Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileInput className="h-5 w-5" />
              {editingIndex !== null ? "Edit Record" : "Add New Record"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="hatchery"
                    rules={{ required: "Hatchery is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hatchery</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select hatchery" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hatcheries.map((hatchery) => (
                              <SelectItem key={hatchery} value={hatchery}>
                                {hatchery}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Farm name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Farm Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter farm name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flock"
                    rules={{ required: "Flock number is required", min: { value: 1, message: "Must be greater than 0" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flock Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter flock number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="age"
                    rules={{ required: "Age is required", min: { value: 1, message: "Must be greater than 0" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age (weeks)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter age in weeks" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fertility"
                    rules={{ 
                      required: "Fertility is required", 
                      min: { value: 0, message: "Must be 0 or greater" },
                      max: { value: 100, message: "Cannot exceed 100%" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fertility (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter fertility percentage" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ifDev"
                    rules={{ required: "I/F dev. is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>I/F Dev.</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter I/F deviation" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hatch"
                    rules={{ 
                      required: "Hatch rate is required", 
                      min: { value: 0, message: "Must be 0 or greater" },
                      max: { value: 100, message: "Cannot exceed 100%" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hatch Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter hatch rate percentage" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hoi"
                    rules={{ 
                      required: "HOI is required", 
                      min: { value: 0, message: "Must be 0 or greater" },
                      max: { value: 100, message: "Cannot exceed 100%" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HOI (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter HOI percentage" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hof"
                    rules={{ 
                      required: "HOF is required", 
                      min: { value: 0, message: "Must be 0 or greater" },
                      max: { value: 100, message: "Cannot exceed 100%" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HOF (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter HOF percentage" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="earlyDead"
                    rules={{ 
                      required: "Early Dead is required", 
                      min: { value: 0, message: "Must be 0 or greater" }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Early Dead (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Enter early mortality percentage" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {editingIndex !== null ? "Update Record" : "Save Record"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Data ({data.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-2 text-left font-medium">Hatchery</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Name</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Flock</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Age</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Fertility</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">I/F Dev.</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Hatch</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">HOI</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">HOF</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Early Dead</th>
                  <th className="border border-gray-200 p-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2">{record.hatchery}</td>
                    <td className="border border-gray-200 p-2">{record.name}</td>
                    <td className="border border-gray-200 p-2">{record.flock}</td>
                    <td className="border border-gray-200 p-2">{record.age}</td>
                    <td className="border border-gray-200 p-2">{record.fertility}%</td>
                    <td className="border border-gray-200 p-2">{record.ifDev}</td>
                    <td className="border border-gray-200 p-2">{record.hatch}%</td>
                    <td className="border border-gray-200 p-2">{record.hoi}%</td>
                    <td className="border border-gray-200 p-2">{record.hof}%</td>
                    <td className="border border-gray-200 p-2">{record.earlyDead}%</td>
                    <td className="border border-gray-200 p-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No data available. Add your first record to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataEntry;
