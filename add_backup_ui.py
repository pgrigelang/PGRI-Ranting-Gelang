import re

with open('src/components/views/PengaturanView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add handlers
handlers = """
  const handleBackup = async () => {
    try {
      const data = await backupAllFirebaseData();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        const dString = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
        a.download = `backup_kombel_data_${dString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup data berhasil diunduh.');
      } else {
        alert('Gagal membuat backup data.');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat membackup data.');
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e2) => {
        try {
          const jsonStr = e2.target?.result as string;
          const data = JSON.parse(jsonStr);
          if (window.confirm('PERINGATAN: Mengembalikan data (Restore) akan menimpa semua data aplikasi saat ini dengan data dari file backup. Apakah Anda yakin ingin melanjutkan?')) {
            const success = await restoreAllFirebaseData(data);
            if (success) {
              alert('Data berhasil direstore. Aplikasi akan dimuat ulang.');
              window.location.reload();
            } else {
              alert('Gagal merestore data.');
            }
          }
        } catch (error) {
          console.error(error);
          alert('File backup tidak valid atau rusak.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
"""

content = content.replace(
    '  return (',
    handlers + '\n  return ('
)

# Add UI at the bottom
ui = """
      </div>

      {activeRole === 'admin' && (
        <div className="bg-white [.dark_&]:bg-slate-900 dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 [.dark_&]:border-slate-800 dark:border-slate-800 p-6 sm:p-8 space-y-6 mt-6">
          <div>
            <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Manajemen Data Sistem</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fasilitas untuk mencadangkan (Backup) seluruh data aplikasi ke file dan mengembalikan (Restore) data dari file cadangan.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleBackup} className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <Download className="w-5 h-5" />
              Backup Data
            </button>
            <button onClick={handleRestore} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <UploadCloud className="w-5 h-5" />
              Restore Data
            </button>
          </div>
        </div>
      )}
    </div>
"""

content = content.replace(
    '      </div>\n    </div>',
    ui
)

with open('src/components/views/PengaturanView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

