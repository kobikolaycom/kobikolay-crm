const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/(authenticated)/agents/AgentsTableClient.tsx',
  'src/app/(authenticated)/agents/actions.ts',
  'src/app/(authenticated)/agents/[id]/actions.ts',
  'src/app/(authenticated)/agents/[id]/page.tsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Prop updates in AgentsTableClient
  content = content.replace(/sectors: any\[\];/g, 'categories: any[];');
  content = content.replace(/initialSector\?: string;/g, 'initialCategoryId?: string;');
  content = content.replace(/sectors,/g, 'categories,');
  content = content.replace(/initialSector = "all"/g, 'initialCategoryId = "all"');

  // State updates
  content = content.replace(/importSectorId/g, 'importCategoryId');
  content = content.replace(/setImportSectorId/g, 'setImportCategoryId');
  content = content.replace(/newSectorIds/g, 'newCategoryId');
  content = content.replace(/setNewSectorIds/g, 'setNewCategoryId');
  content = content.replace(/editSectorIds/g, 'editCategoryId');
  content = content.replace(/setEditSectorIds/g, 'setEditCategoryId');
  content = content.replace(/selectedSectorIds/g, 'selectedCategoryId');
  content = content.replace(/setSelectedSectorIds/g, 'setSelectedCategoryId');

  // Update initial states from array to string
  content = content.replace(/useState<string\[\]>\(\[\]\)/g, 'useState<string>("")');
  
  // Search params
  content = content.replace(/params\.delete\("sector"\)/g, 'params.delete("categoryId")');
  content = content.replace(/params\.set\("sector"/g, 'params.set("categoryId"');
  
  // Mappings
  content = content.replace(/agency\.sectors/g, 'agency.category');
  content = content.replace(/sectors\.map/g, 'categories.map');
  content = content.replace(/sectors\.filter/g, 'categories.filter');
  content = content.replace(/sectorIds:/g, 'categoryId:');
  
  // TURSAB and BTK logic
  // The user requested: "tursab no acenteler dısında gizlensin btk acenteler dısında gizlensin"
  // So we should add a check: if category is 'Acenteler' then show TURSAB and BTK.
  
  // Let's write the file back
  fs.writeFileSync(fullPath, content);
  console.log('Updated', file);
});
