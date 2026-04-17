import { useEffect, useState } from 'react';
import { client } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Clock,
  ChefHat,
  Eye,
  Pencil,
  Trash2,
  X,
  FlaskConical,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Product, BomRecipe, BomLine } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';

const CATEGORIES = ['main', 'sauce', 'dough', 'dessert', 'side', 'beverage'];

export default function BomRecipes() {
  const [recipes, setRecipes] = useState<BomRecipe[]>([]);
  const [bomLines, setBomLines] = useState<BomLine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // View mode
  const [selectedRecipe, setSelectedRecipe] = useState<BomRecipe | null>(null);
  const [recipeLines, setRecipeLines] = useState<BomLine[]>([]);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<BomRecipe | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formYieldQty, setFormYieldQty] = useState('');
  const [formYieldUnit, setFormYieldUnit] = useState('');
  const [formPrepTime, setFormPrepTime] = useState('');
  const [formCookTime, setFormCookTime] = useState('');
  const [formVersion, setFormVersion] = useState('1');
  const [formStatus, setFormStatus] = useState('draft');
  const [formNotes, setFormNotes] = useState('');

  // Ingredient lines for create/edit
  const [formLines, setFormLines] = useState<Array<{
    product_id: string;
    quantity: string;
    unit: string;
    is_optional: boolean;
    substitution_allowed: boolean;
    wastage_factor: string;
    notes: string;
  }>>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [recipeRes, lineRes, prodRes] = await Promise.all([
        client.entities.bom_recipes.query({ limit: 200 }),
        client.entities.bom_lines.query({ limit: 500 }),
        client.entities.products.query({ limit: 200 }),
      ]);
      setRecipes(recipeRes.data?.items || []);
      setBomLines(lineRes.data?.items || []);
      setProducts(prodRes.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch BOM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProduct = (id: number) => products.find((p) => p.id === id);
  const getLinesForRecipe = (recipeId: number) => bomLines.filter((l) => l.recipe_id === recipeId);

  // Filter recipes
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Summary stats
  const activeCount = recipes.filter((r) => r.status === 'active').length;
  const draftCount = recipes.filter((r) => r.status === 'draft').length;
  const totalIngredients = new Set(bomLines.map((l) => l.product_id)).size;

  // View recipe detail
  const handleViewRecipe = (recipe: BomRecipe) => {
    setSelectedRecipe(recipe);
    setRecipeLines(getLinesForRecipe(recipe.id));
  };

  // Open create/edit form
  const openForm = (recipe?: BomRecipe) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setFormName(recipe.name);
      setFormCode(recipe.code);
      setFormProductId(String(recipe.product_id || ''));
      setFormCategory(recipe.category || '');
      setFormYieldQty(String(recipe.yield_quantity || ''));
      setFormYieldUnit(recipe.yield_unit || '');
      setFormPrepTime(String(recipe.prep_time_minutes || ''));
      setFormCookTime(String(recipe.cook_time_minutes || ''));
      setFormVersion(String(recipe.version || 1));
      setFormStatus(recipe.status || 'draft');
      setFormNotes(recipe.notes || '');
      const lines = getLinesForRecipe(recipe.id);
      setFormLines(
        lines.map((l) => ({
          product_id: String(l.product_id),
          quantity: String(l.quantity),
          unit: l.unit || '',
          is_optional: l.is_optional || false,
          substitution_allowed: l.substitution_allowed || false,
          wastage_factor: String(l.wastage_factor || 0),
          notes: l.notes || '',
        }))
      );
    } else {
      setEditingRecipe(null);
      setFormName('');
      setFormCode('');
      setFormProductId('');
      setFormCategory('');
      setFormYieldQty('');
      setFormYieldUnit('');
      setFormPrepTime('');
      setFormCookTime('');
      setFormVersion('1');
      setFormStatus('draft');
      setFormNotes('');
      setFormLines([]);
    }
    setDialogOpen(true);
  };

  const addIngredientLine = () => {
    setFormLines([
      ...formLines,
      { product_id: '', quantity: '', unit: '', is_optional: false, substitution_allowed: false, wastage_factor: '0', notes: '' },
    ]);
  };

  const removeIngredientLine = (idx: number) => {
    setFormLines(formLines.filter((_, i) => i !== idx));
  };

  const updateIngredientLine = (idx: number, field: string, value: string | boolean) => {
    const updated = [...formLines];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormLines(updated);
  };

  const handleSaveRecipe = async () => {
    if (!formName || !formCode) {
      toast.error('Name and Code are required');
      return;
    }
    try {
      const recipeData = {
        name: formName,
        code: formCode,
        product_id: parseInt(formProductId) || 0,
        category: formCategory,
        yield_quantity: parseFloat(formYieldQty) || 0,
        yield_unit: formYieldUnit,
        prep_time_minutes: parseInt(formPrepTime) || 0,
        cook_time_minutes: parseInt(formCookTime) || 0,
        version: parseInt(formVersion) || 1,
        status: formStatus,
        notes: formNotes,
      };

      let recipeId: number;
      if (editingRecipe) {
        await client.entities.bom_recipes.update({ id: String(editingRecipe.id), data: recipeData });
        recipeId = editingRecipe.id;
        // Delete existing lines
        const existingLines = getLinesForRecipe(editingRecipe.id);
        for (const line of existingLines) {
          await client.entities.bom_lines.delete({ id: String(line.id) });
        }
        toast.success('Recipe updated');
      } else {
        const res = await client.entities.bom_recipes.create({ data: recipeData });
        recipeId = res.data?.id;
        toast.success('Recipe created');
      }

      // Create new lines
      for (const line of formLines) {
        if (line.product_id && line.quantity) {
          await client.entities.bom_lines.create({
            data: {
              recipe_id: recipeId,
              product_id: parseInt(line.product_id),
              quantity: parseFloat(line.quantity),
              unit: line.unit,
              is_optional: line.is_optional,
              substitution_allowed: line.substitution_allowed,
              wastage_factor: parseFloat(line.wastage_factor) || 0,
              notes: line.notes,
            },
          });
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save recipe:', err);
      toast.error('Failed to save recipe');
    }
  };

  const handleDeleteRecipe = async (recipe: BomRecipe) => {
    try {
      const lines = getLinesForRecipe(recipe.id);
      for (const line of lines) {
        await client.entities.bom_lines.delete({ id: String(line.id) });
      }
      await client.entities.bom_recipes.delete({ id: String(recipe.id) });
      toast.success('Recipe deleted');
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe(null);
      }
      fetchData();
    } catch (err) {
      console.error('Failed to delete recipe:', err);
      toast.error('Failed to delete recipe');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Detail view
  if (selectedRecipe) {
    const product = getProduct(selectedRecipe.product_id);
    const totalTime = (selectedRecipe.prep_time_minutes || 0) + (selectedRecipe.cook_time_minutes || 0);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedRecipe(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Recipes
          </Button>
        </div>

        {/* Recipe Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-800">{selectedRecipe.name}</h2>
                  <Badge className={`text-xs ${STATUS_COLORS[selectedRecipe.status] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedRecipe.status}
                  </Badge>
                  <Badge className={`text-xs ${STATUS_COLORS[selectedRecipe.category] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedRecipe.category}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 font-mono">{selectedRecipe.code} &middot; Version {selectedRecipe.version}</p>
                {selectedRecipe.notes && (
                  <p className="text-sm text-slate-600 mt-2">{selectedRecipe.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openForm(selectedRecipe)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteRecipe(selectedRecipe)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>

            {/* Recipe Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Output Product</p>
                <p className="text-sm font-medium text-slate-800">{product?.name || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Yield</p>
                <p className="text-sm font-medium text-slate-800">
                  {selectedRecipe.yield_quantity} {selectedRecipe.yield_unit}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Prep Time</p>
                <p className="text-sm font-medium text-slate-800">{selectedRecipe.prep_time_minutes} min</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Total Time</p>
                <p className="text-sm font-medium text-slate-800">{totalTime} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-blue-600" />
              Ingredients ({recipeLines.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Ingredient</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Quantity</th>
                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Unit</th>
                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">Optional</th>
                    <th className="text-center py-2.5 px-3 text-slate-500 font-medium">Substitution</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 font-medium">Wastage %</th>
                    <th className="text-left py-2.5 px-3 text-slate-500 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeLines.map((line, idx) => {
                    const ingredient = getProduct(line.product_id);
                    return (
                      <tr
                        key={line.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      >
                        <td className="py-2.5 px-3">
                          <div>
                            <p className="font-medium text-slate-800">{ingredient?.name || `Product #${line.product_id}`}</p>
                            <p className="text-xs text-slate-400">{ingredient?.sku}</p>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-800">{line.quantity}</td>
                        <td className="py-2.5 px-3 text-slate-600">{line.unit}</td>
                        <td className="py-2.5 px-3 text-center">
                          {line.is_optional ? (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">Optional</Badge>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {line.substitution_allowed ? (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">Allowed</Badge>
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {((line.wastage_factor || 0) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs">{line.notes || '-'}</td>
                      </tr>
                    );
                  })}
                  {recipeLines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No ingredients defined for this recipe
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Active Recipes</p>
            <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-slate-400">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Draft Recipes</p>
            <p className="text-2xl font-bold text-slate-800">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Unique Ingredients</p>
            <p className="text-2xl font-bold text-slate-800">{totalIngredients}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">BOM / Recipe Management</h3>
          <p className="text-sm text-slate-500">Manage kitchen recipes, ingredients, and bill of materials</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openForm()}>
          <Plus className="w-4 h-4 mr-2" />
          New Recipe
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((recipe) => {
          const product = getProduct(recipe.product_id);
          const lines = getLinesForRecipe(recipe.id);
          const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
          return (
            <Card key={recipe.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold text-slate-800 truncate">{recipe.name}</CardTitle>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{recipe.code} &middot; v{recipe.version}</p>
                  </div>
                  <Badge className={`text-xs ml-2 flex-shrink-0 ${STATUS_COLORS[recipe.status] || 'bg-gray-100 text-gray-800'}`}>
                    {recipe.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${STATUS_COLORS[recipe.category] || 'bg-gray-100 text-gray-800'}`}>
                    {recipe.category}
                  </Badge>
                  {product && (
                    <span className="text-xs text-slate-500 truncate">→ {product.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <ChefHat className="w-3.5 h-3.5" />
                    {recipe.yield_quantity} {recipe.yield_unit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {totalTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FlaskConical className="w-3.5 h-3.5" />
                    {lines.length} items
                  </span>
                </div>

                {/* Ingredient preview */}
                <div className="flex flex-wrap gap-1">
                  {lines.slice(0, 3).map((line) => {
                    const ing = getProduct(line.product_id);
                    return (
                      <span key={line.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {ing?.name || `#${line.product_id}`}
                      </span>
                    );
                  })}
                  {lines.length > 3 && (
                    <span className="text-xs text-slate-400">+{lines.length - 3} more</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewRecipe(recipe)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openForm(recipe)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteRecipe(recipe)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredRecipes.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <ChefHat className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No recipes found</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Recipe Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Teriyaki Chicken Bowl" />
              </div>
              <div>
                <Label>Recipe Code *</Label>
                <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="e.g. BOM-007" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Output Product</Label>
                <Select value={formProductId} onValueChange={setFormProductId}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Yield Qty</Label>
                <Input type="number" value={formYieldQty} onChange={(e) => setFormYieldQty(e.target.value)} placeholder="10" />
              </div>
              <div>
                <Label>Yield Unit</Label>
                <Input value={formYieldUnit} onChange={(e) => setFormYieldUnit(e.target.value)} placeholder="portions" />
              </div>
              <div>
                <Label>Prep (min)</Label>
                <Input type="number" value={formPrepTime} onChange={(e) => setFormPrepTime(e.target.value)} placeholder="30" />
              </div>
              <div>
                <Label>Cook (min)</Label>
                <Input type="number" value={formCookTime} onChange={(e) => setFormCookTime(e.target.value)} placeholder="25" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Version</Label>
                <Input type="number" value={formVersion} onChange={(e) => setFormVersion(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes / Instructions</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Recipe preparation instructions..." />
            </div>

            {/* Ingredients Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredientLine}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Ingredient
                </Button>
              </div>
              {formLines.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No ingredients added yet. Click "Add Ingredient" to start.</p>
              )}
              {formLines.map((line, idx) => (
                <div key={idx} className="border rounded-lg p-3 mb-2 bg-slate-50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Product</Label>
                        <Select value={line.product_id} onValueChange={(v) => updateIngredientLine(idx, 'product_id', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-8 text-xs"
                          value={line.quantity}
                          onChange={(e) => updateIngredientLine(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Input
                          className="h-8 text-xs"
                          value={line.unit}
                          onChange={(e) => updateIngredientLine(idx, 'unit', e.target.value)}
                          placeholder="kg"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-5 text-red-500" onClick={() => removeIngredientLine(idx)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={line.is_optional}
                        onChange={(e) => updateIngredientLine(idx, 'is_optional', e.target.checked)}
                        className="rounded"
                      />
                      Optional
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={line.substitution_allowed}
                        onChange={(e) => updateIngredientLine(idx, 'substitution_allowed', e.target.checked)}
                        className="rounded"
                      />
                      Substitution OK
                    </label>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs">Wastage %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 w-16 text-xs"
                        value={line.wastage_factor}
                        onChange={(e) => updateIngredientLine(idx, 'wastage_factor', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSaveRecipe} className="w-full bg-blue-600 hover:bg-blue-700">
              {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}