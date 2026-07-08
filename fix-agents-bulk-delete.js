const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/app/(authenticated)/agents/AgentsTableClient.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add bulkDeleteAgenciesAction to imports
if (!content.includes('bulkDeleteAgenciesAction')) {
  content = content.replace(
    /import \{ createAgencyAction, updateAgencyAction, deleteAgencyAction, deleteTestAgenciesAction \} from "\.\/actions";/,
    'import { createAgencyAction, updateAgencyAction, deleteAgencyAction, deleteTestAgenciesAction, bulkDeleteAgenciesAction } from "./actions";'
  );
}

// 2. Add showBulkDeleteConfirm state
if (!content.includes('showBulkDeleteConfirm')) {
  content = content.replace(
    /const \[showResetConfirmDialog, setShowResetConfirmDialog\] = useState\(false\);/,
    'const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);\n  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);'
  );
}

// 3. Add handleBulkDelete
if (!content.includes('handleBulkDelete')) {
  const handler = `
  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        await bulkDeleteAgenciesAction(selectedIds);
        toast.success(selectedIds.length + " adet kayıt silindi");
        setSelectedIds([]);
        setShowBulkDeleteConfirm(false);
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız");
      }
    });
  };
`;
  content = content.replace(
    /const handleDelete = \(\) => \{/,
    handler + '\n  const handleDelete = () => {'
  );
}

// 4. Update the bulk actions UI
const bulkDeleteBtn = `
            <>
              <Button
                variant="destructive"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="gap-1.5 rounded-xl text-xs sm:text-sm"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Seçilenleri Sil</span>
              </Button>
              <Button
                onClick={openBulkSendModal}
                className="gap-1.5 rounded-xl text-xs sm:text-sm"
              >
                <Send size={16} />
                {selectedIds.length} <span className="hidden sm:inline">İşletmeye Tanıtım Gönder</span><span className="sm:hidden">Gönder</span>
              </Button>
            </>
`;
content = content.replace(
  /<Button\s*onClick=\{openBulkSendModal\}[\s\S]*?<\/Button>/,
  bulkDeleteBtn
);

// 5. Add Bulk Delete Dialog at the bottom
const bulkDeleteDialog = `
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 size={20} />
              Toplu Silme Onayı
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            Seçili <strong>{selectedIds.length}</strong> işletmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isPending}>
              {isPending ? "Siliniyor..." : "Evet, Hepsini Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

if (!content.includes('Toplu Silme Onayı')) {
  content = content.replace(
    /<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/g,
    bulkDeleteDialog + '\n    </div>\n  );\n}\n'
  );
}

fs.writeFileSync(file, content);
console.log('Fixed AgentsTableClient bulk delete UI');
