import re

with open('src/components/views/PengaturanView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
imports = "import { Settings, Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, RotateCw, ZoomIn, Droplets, Download, UploadCloud } from 'lucide-react';\nimport { backupAllFirebaseData, restoreAllFirebaseData } from '../../lib/sync';"
content = re.sub(
    r"import { Settings, Upload, Image as ImageIcon, CheckCircle, Save, RotateCcw, RotateCw, ZoomIn, Droplets } from 'lucide-react';",
    imports,
    content
)

# Modify signature
content = content.replace(
    'export const PengaturanView: React.FC = () => {',
    'export const PengaturanView: React.FC<{ activeRole?: string }> = ({ activeRole }) => {'
)

with open('src/components/views/PengaturanView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

