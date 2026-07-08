const fs = require('fs');
const path = require('path');

// 1. Update actions.ts to take targetCategoryId
const actionsPath = path.join(process.cwd(), 'src/app/(authenticated)/categories/actions.ts');
let actionsContent = fs.readFileSync(actionsPath, 'utf8');

const newAction = `
export async function migrateAgenciesAction(targetCategoryId: string) {
  if (!targetCategoryId) throw new Error("Kategori seçilmedi");
  const result = await prisma.agency.updateMany({
    where: { categoryId: null },
    data: { categoryId: targetCategoryId }
  });
  revalidatePath("/categories");
  revalidatePath("/agents");
  return result.count;
}
`;

actionsContent = actionsContent.replace(/export async function migrateAgenciesAction\(\) \{[\s\S]*?return result\.count;\s*\}/, newAction.trim());
fs.writeFileSync(actionsPath, actionsContent);

// 2. Update CategoriesClient.tsx to show a modal for selecting the target category
const clientPath = path.join(process.cwd(), 'src/app/(authenticated)/categories/CategoriesClient.tsx');
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Ensure Select components are imported
if (!clientContent.includes('SelectContent')) {
  clientContent = clientContent.replace(
    /import \{ Dialog,[\s\S]*?from "@\/components\/ui\/dialog";/,
    `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";`
  );
}

// Add state for migration modal
if (!clientContent.includes('showMigrateModal')) {
  clientContent = clientContent.replace(
    /const \[showDeleteModal, setShowDeleteModal\] = useState\(false\);/,
    `const [showDeleteModal, setShowDeleteModal] = useState(false);\n  const [showMigrateModal, setShowMigrateModal] = useState(false);\n  const [migrateTargetId, setMigrateTargetId] = useState("");`
  );
}

// Update handleMigrate
const newHandleMigrate = `
  const handleMigrate = () => {
    if (!migrateTargetId) return toast.error("Lütfen aktarılacak kategoriyi seçin.");
    startTransition(async () => {
      try {
        const count = await migrateAgenciesAction(migrateTargetId);
        toast.success(count + " adet kayıt seçilen kategoriye taşındı.");
        setShowMigrateModal(false);
        window.location.reload();
      } catch (err: any) {
        toast.error("Taşıma başarısız: " + err.message);
      }
    });
  };
`;
clientContent = clientContent.replace(/const handleMigrate = \(\) => \{[\s\S]*?^\s*\};\s*$/m, newHandleMigrate.trim());

// Update Migrate Button to open modal
clientContent = clientContent.replace(
  /onClick=\{handleMigrate\} disabled=\{isPending\}/,
  'onClick={() => setShowMigrateModal(true)}'
);

// Add Migrate Modal UI
const migrateModalUI = `
      {/* Migrate Modal */}
      <Dialog open={showMigrateModal} onOpenChange={setShowMigrateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eski Kayıtları Aktar</DialogTitle>
            <DialogDescription>
              Sistemdeki <strong>Kategorisiz</strong> tüm işletmeleri (eski kayıtları) aşağıdaki kategoriye aktarmak üzeresiniz. Lütfen hedef kategoriyi seçin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Hedef Kategori</Label>
            <Select value={migrateTargetId} onValueChange={setMigrateTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori Seçin" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrateModal(false)}>İptal</Button>
            <Button onClick={handleMigrate} disabled={isPending || !migrateTargetId}>Aktarımı Başlat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

if (!clientContent.includes('Eski Kayıtları Aktar</DialogTitle>')) {
  clientContent = clientContent.replace(/<\/div>\s*\);\s*\}\s*$/, migrateModalUI + '\n    </div>\n  );\n}\n');
}

fs.writeFileSync(clientPath, clientContent);
console.log('Fixed Migrate Modal UI');
