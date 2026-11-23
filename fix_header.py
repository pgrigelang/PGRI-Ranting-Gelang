with open("src/components/Header.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "import { Calendar, User, ChevronDown, Menu, Users, UserCheck, Lock, X } from 'lucide-react';" in line:
        new_lines.append("import { Calendar, User, ChevronDown, Menu, Users, UserCheck, Lock, X, RefreshCw } from 'lucide-react';\n")
    elif "currentUser: { name: string; school: string; role: string   onSync?: () => void;" in line:
        new_lines.append("  currentUser: { name: string; school: string; role: string };\n")
        new_lines.append("  onSync?: () => void;\n")
    else:
        new_lines.append(line)

with open("src/components/Header.tsx", "w") as f:
    f.writelines(new_lines)

