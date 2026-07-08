const fs = require('fs');
const path = require('path');

const file1 = path.join(process.cwd(), 'src/app/(authenticated)/agents/AgentsTableClient.tsx');
let content1 = fs.readFileSync(file1, 'utf8');

// 1. Props
content1 = content1.replace(/sectors: any\[\];/g, 'categories: any[];');
content1 = content1.replace(/initialSector\?: string;/g, 'initialCategoryId?: string;');
content1 = content1.replace(/sectors,/g, 'categories,');
content1 = content1.replace(/initialSector = "all"/g, 'initialCategoryId = "all"');

// 2. States
content1 = content1.replace(/importSectorId/g, 'importCategoryId');
content1 = content1.replace(/setImportSectorId/g, 'setImportCategoryId');
content1 = content1.replace(/newSectorIds/g, 'newCategoryId');
content1 = content1.replace(/setNewSectorIds/g, 'setNewCategoryId');
content1 = content1.replace(/editSectorIds/g, 'editCategoryId');
content1 = content1.replace(/setEditSectorIds/g, 'setEditCategoryId');
content1 = content1.replace(/selectedSectorIds/g, 'selectedCategoryId');
content1 = content1.replace(/setSelectedSectorIds/g, 'setSelectedCategoryId');
content1 = content1.replace(/useState<string\[\]>\(\[\]\)/g, 'useState<string>("none")');

// 3. Edit logic
content1 = content1.replace(/const sectorIds = agency\.sectors\?\.map\(\(s: any\) => s\.id\) \|\| \[\];/g, 'const catId = agency.categoryId || "none";');
content1 = content1.replace(/setEditCategoryId\(sectorIds\);/g, 'setEditCategoryId(catId);');
content1 = content1.replace(/sectorIds: editCategoryId,/g, 'categoryId: editCategoryId !== "none" ? editCategoryId : undefined,');

// 4. Create logic
content1 = content1.replace(/sectorIds: newCategoryId,/g, 'categoryId: newCategoryId !== "none" ? newCategoryId : undefined,');

// 5. URL params
content1 = content1.replace(/params\.delete\("sector"\)/g, 'params.delete("categoryId")');
content1 = content1.replace(/params\.set\("sector"/g, 'params.set("categoryId"');
content1 = content1.replace(/searchParams\.get\("sector"\)/g, 'searchParams.get("categoryId")');

// 6. Rendering agency categories (was mapping over sectors)
content1 = content1.replace(/\{agency\.sectors\?\.map\(\(s: any\) => \([\s\S]*?<\/Badge>\n\s*\)\)}/g, '{agency.category ? <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100">{agency.category.name}</Badge> : <span className="text-slate-400 text-xs">—</span>}');

// 7. Checkboxes to Radios/Selects in forms
// For create/edit form, it's mapping over sectors with Checkbox. We need to change it to Select.
// We'll replace the whole Checkbox section with a Select.
const selectReplacementForCreate = `
<div className="space-y-2">
  <Label className="text-xs font-semibold text-slate-600">Kategori</Label>
  <Select value={newCategoryId} onValueChange={setNewCategoryId}>
    <SelectTrigger><SelectValue placeholder="Kategori Seçin" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Belirtilmedi</SelectItem>
      {categories.map((c: any) => (
        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
`;
content1 = content1.replace(/<div className="space-y-3">[\s\S]*?<Label className="text-xs font-semibold text-slate-600">Faaliyet Alanları<\/Label>[\s\S]*?<div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 max-h-\[200px\] overflow-y-auto">[\s\S]*?\{categories\.map\(\(s: any\) => \{[\s\S]*?<\/div>[\s\S]*?<\/div>/g, selectReplacementForCreate);

// I'll manually handle the replacement by running the code and inspecting it, because regex on 1900 lines of JSX is error prone.
fs.writeFileSync(file1, content1);
console.log('Done script 1');
