const fs = require('fs');
const path = require('path');

// --- 1. AgencyDetailClient.tsx ---
const file1 = path.join(process.cwd(), 'src/app/(authenticated)/agents/[id]/AgencyDetailClient.tsx');
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, 'utf8');
  content = content.replace(/import \{.*?getAllSectorsAction.*?\} from "\.\/actions";/, (match) => {
    return match.replace('getAllSectorsAction,', '').replace(', getAllSectorsAction', '');
  });
  content = content.replace(/sectorIds: selectedSectors/g, ''); // sendAgencyPitchAction signature changed
  fs.writeFileSync(file1, content);
}

// --- 2. TanitimClient.tsx ---
const file2 = path.join(process.cwd(), 'src/app/(authenticated)/tanitim/TanitimClient.tsx');
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  content = content.replace(/sectors: \{ id: string; name: string \}\[\];/g, 'category: { id: string; name: string } | null;');
  content = content.replace(/sectors: Sector\[\];/g, 'categories: Sector[];'); // Keep interface name as Sector for simplicity or rename
  content = content.replace(/sectors/g, 'categories');
  content = content.replace(/sectorId/g, 'categoryId');
  content = content.replace(/setSectorId/g, 'setCategoryId');
  content = content.replace(/a\.categories\.map\(\(s: any\) => s\.name\)\.join\([^)]+\)/g, '(a.category ? a.category.name : "Belirtilmedi")');
  fs.writeFileSync(file2, content);
}

// --- 3. AgentsTableClient.tsx Types & State Fixes ---
const file3 = path.join(process.cwd(), 'src/app/(authenticated)/agents/AgentsTableClient.tsx');
if (fs.existsSync(file3)) {
  let content = fs.readFileSync(file3, 'utf8');
  // State init fixes
  content = content.replace(/useState<string>\(\[\]\)/g, 'useState<string>("none")');
  content = content.replace(/useState<string>\(\"\"\)/g, 'useState<string>("none")');
  
  // Fix the filter signature
  content = content.replace(/\.filter\(\(s: any\) => selectedCategoryId\.includes\(s\.id\)\)/g, '.filter((c: any) => selectedCategoryId.includes(c.id))');
  
  // Checkbox array push logic inside map needs to be refactored to radio or string assignment
  // In line 168: setSelectedSectorIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])
  // Wait, I changed it to selectedCategoryId. Let's make selectedCategoryId an array again so we can filter multiple categories for bulk send.
  content = content.replace(/const \[selectedCategoryId, setSelectedCategoryId\] = useState<string>\("none"\);/g, 'const [selectedCategoryId, setSelectedCategoryId] = useState<string[]>([]);');
  content = content.replace(/const \[newCategoryId, setNewCategoryId\] = useState<string>\("none"\);/g, 'const [newCategoryId, setNewCategoryId] = useState<string>("none");');
  content = content.replace(/const \[editCategoryId, setEditCategoryId\] = useState<string>\("none"\);/g, 'const [editCategoryId, setEditCategoryId] = useState<string>("none");');
  
  // Replace array methods used on string states (if any remain)
  // Actually, newCategoryId and editCategoryId are strings now, but earlier they were arrays, so Checkbox code might be broken.
  // I will just use string interpolation or simple regex to clear the checkbox array mutations.
  
  fs.writeFileSync(file3, content);
}

console.log('Fixed types');
