import os

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    block = """        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsDownloadingBarcode(false);
            return;
          }
          const safeFileName = (selectedBarcodeTeacher.name || 'guru').replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Barcode_${safeFileName}.png`;
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fileName });
          } else {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          }
          setIsDownloadingBarcode(false);
        }, 'image/png');"""

    new_block = """        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsDownloadingBarcode(false);
            return;
          }
          const safeFileName = (selectedBarcodeTeacher.name || 'guru').replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `Barcode_${safeFileName}.png`;
          await safeDownloadBlob(blob, fileName);
          setIsDownloadingBarcode(false);
        }, 'image/png');"""

    if block in content:
        content = content.replace(block, new_block)
        print(f"Replaced PNG block in {filepath}")
    else:
        print(f"PNG Block not found in {filepath}")
        
    with open(filepath, 'w') as f:
        f.write(content)

process_file('src/components/views/AnggotaView.tsx')
