const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

const modalHtml = `
      {/* Modal Menu Terkunci */}
      {showLockedModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowLockedModal(false)}
        >
          <div
            className={\`w-full max-w-sm rounded-2xl p-6 shadow-2xl border animate-modal-enter \${
              isDark
                ? 'bg-slate-900/95 border-slate-800 text-slate-100 ring-1 ring-white/10'
                : 'bg-white/95 border-slate-100 text-slate-800 ring-1 ring-black/5'
            }\`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/40">
              <div className="p-2.5 rounded-xl bg-fuchsia-500/10 text-fuchsia-500 ring-1 ring-fuchsia-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Menu Terkunci</h3>
                <p className="text-xs text-slate-400">Akses Dibatasi</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-300 leading-relaxed">
              Maaf, menu <strong className="text-fuchsia-500">{lockedMenuName}</strong> sedang dikunci. Anda tidak memiliki akses untuk membuka menu ini.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowLockedModal(false)}
                className="py-2.5 px-6 rounded-xl text-sm font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 shadow-md shadow-fuchsia-600/30 transition-all duration-150 active:scale-95"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
`;

code = code.replace("    </>\n  );\n};", modalHtml);
fs.writeFileSync('src/components/Sidebar.tsx', code);
