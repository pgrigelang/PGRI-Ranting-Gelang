import os

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    block = """      const fileName = `Semua_Barcode_Anggota_${new Date().toISOString().split('T')[0]}.zip`;
      const file = new File([content], fileName, { type: 'application/zip' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }"""

    new_block = """      const fileName = `Semua_Barcode_Anggota_${new Date().toISOString().split('T')[0]}.zip`;
      await safeDownloadBlob(content, fileName);"""

    if block in content:
        content = content.replace(block, new_block)
        print(f"Replaced ZIP block in {filepath}")
    else:
        print(f"ZIP Block not found in {filepath}")
        
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/views/AnggotaView.tsx')
