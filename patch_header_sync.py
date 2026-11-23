import re

with open("src/components/Header.tsx", "r") as f:
    content = f.read()

# Add props
props_match = r'interface HeaderProps \{([\s\S]*?)\}'
if "onSync?: () => void;" not in content:
    content = re.sub(props_match, r'interface HeaderProps {\1  onSync?: () => void;\n  isSyncing?: boolean;\n}', content)

# Add destruction
destruct_match = r'export const Header: React\.FC<HeaderProps> = \(\{([\s\S]*?)\}\) => \{'
if "onSync" not in content.split("export const Header: React.FC<HeaderProps> = ({")[1].split("}) => {")[0]:
    content = re.sub(destruct_match, r'export const Header: React.FC<HeaderProps> = ({\1, onSync, isSyncing}) => {', content)

# Add icon import
if "RefreshCw" not in content:
    content = content.replace("Moon,", "Moon, RefreshCw,")

# Add button
sync_btn = """
          <button
            onClick={() => onSync && onSync()}
            disabled={isSyncing}
            className={`p-2 rounded-xl transition-all flex items-center justify-center gap-2 ${
              theme === 'dark'
                ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
            title="Sync Data dengan Server"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold hidden sm:inline">Sync Data</span>
          </button>
"""

content = content.replace("{/* Theme Switch Toggle Button */}", sync_btn + "\n          {/* Theme Switch Toggle Button */}")

with open("src/components/Header.tsx", "w") as f:
    f.write(content)

