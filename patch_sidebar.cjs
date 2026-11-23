const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

// 1. Add imports
code = code.replace("import { ActiveTab } from '../types';", "import { ActiveTab } from '../types';\nimport { doc, setDoc, onSnapshot } from 'firebase/firestore';\nimport { db } from '../lib/firebase';");

code = code.replace("Lock,", "Lock,\n  Unlock,");

// 2. Add state
const stateInjection = `
  const [lockedTabs, setLockedTabs] = useState<Record<string, boolean>>({});
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedMenuName, setLockedMenuName] = useState('');
`;

code = code.replace("const [isShaking, setIsShaking] = useState(false);", "const [isShaking, setIsShaking] = useState(false);" + stateInjection);

// 3. Add useEffect and toggleLock
const logicInjection = `
  // Sinkronisasi status kunci menu
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'locked-menus'), (snap) => {
      if (snap.exists()) {
        setLockedTabs(snap.data() as Record<string, boolean>);
      }
    }, (err) => {
      console.warn("Gagal mengambil status menu:", err);
    });
    return () => unsub();
  }, []);

  const toggleLock = async (id: string) => {
    const newState = { ...lockedTabs, [id]: !lockedTabs[id] };
    setLockedTabs(newState); // Optimistic UI
    try {
      await setDoc(doc(db, 'settings', 'locked-menus'), { [id]: !lockedTabs[id] }, { merge: true });
    } catch (err) {
      console.warn("Gagal mengunci menu:", err);
      // Revert if failed
      setLockedTabs(lockedTabs);
    }
  };
`;
code = code.replace("const handleCloseAdminModal = () => {", logicInjection + "\n  const handleCloseAdminModal = () => {");

// 4. Update handleTabClick
code = code.replace(
`  const handleTabClick = (id: ActiveTab) => {
    onTabChange(id);
    onCloseMobile();
  };`,
`  const handleTabClick = (id: ActiveTab, label: string) => {
    if (lockedTabs[id]) {
      setLockedMenuName(label);
      setShowLockedModal(true);
      return;
    }
    onTabChange(id);
    onCloseMobile();
  };`
);

// 5. Update onClick mapping
code = code.replace(
"onClick={() => handleTabClick(item.id)}",
"onClick={() => handleTabClick(item.id, item.label)}"
);

// 6. Update badge area to add Padlock
const padlockHtml = `
                    <div className="flex items-center shrink-0">
                      {item.badge && (
                        <span className={\`text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 transition-all duration-200 group-hover/item:scale-105 \${
                          isActive
                            ? 'bg-indigo-200/40 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 group-hover/item:bg-indigo-200/60 dark:group-hover/item:bg-indigo-500/40'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover/item:bg-slate-200/80 dark:group-hover/item:bg-slate-700/80 group-hover/item:text-slate-700 dark:group-hover/item:text-slate-200'
                        }\`}>
                          {item.badge}
                        </span>
                      )}

                      {/* Padlock Icon */}
                      {(lockedTabs[item.id] || isAdminActive) && (
                        <div
                          role={isAdminActive ? "button" : "presentation"}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAdminActive) {
                              toggleLock(item.id);
                            }
                          }}
                          className={\`ml-2 p-1 rounded-md transition-all \${
                            !isAdminActive
                              ? 'cursor-default opacity-90'
                              : 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 active:scale-95'
                          } \${
                            lockedTabs[item.id]
                              ? 'text-fuchsia-500' // magenta
                              : 'text-emerald-500' // green
                          }\`}
                          title={lockedTabs[item.id] ? "Menu Terkunci" : "Kunci Menu"}
                        >
                          {lockedTabs[item.id] ? <Lock size={15} /> : <Unlock size={15} />}
                        </div>
                      )}
                    </div>
`;

code = code.replace(
`                    {/* Badge dengan Dynamic Hover Contrast Effect */}
                    {item.badge && (
                      <span className={\`text-[11px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-2 transition-all duration-200 group-hover/item:scale-105 \${
                        isActive
                          ? 'bg-indigo-200/40 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-200 group-hover/item:bg-indigo-200/60 dark:group-hover/item:bg-indigo-500/40'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover/item:bg-slate-200/80 dark:group-hover/item:bg-slate-700/80 group-hover/item:text-slate-700 dark:group-hover/item:text-slate-200'
                      }\`}>
                        {item.badge}
                      </span>
                    )}`,
padlockHtml
);

// 7. Add Modal to the bottom
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
code = code.replace("    </>\n  );\n};\n", modalHtml);

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log("Patched!");
